from pathlib import Path
import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.staticfiles import StaticFiles
from pydantic import BaseModel

from ai.demand_predictor import predict_demand, get_model_info

from database.database import (
    create_tables,
    get_all_vehicles,
    get_available_vehicles,
    get_vehicle,
    insert_vehicle,
    delete_vehicle,
    create_ride_request,
    get_all_ride_requests,
    get_ride_request,
    update_ride_status,
    update_vehicle_status,
    get_all_drivers,
    get_driver,
    get_driver_by_vehicle,
    update_driver_status,
    record_driver_completion
)

from database.campus_locations import CAMPUS_LOCATIONS
from dispatch.dispatch_engine import dispatch_vehicles
from dispatch.ride_matching import find_best_driver
from analytics.route_analytics import get_route_analytics
from simulation.vehicle_simulator import simulator


# Ensure database tables exist
create_tables()


app = FastAPI(
    title="E-RideX - AI Campus E-Rickshaw System",
    description="AI-based campus e-rickshaw demand prediction, intelligent vehicle dispatch and fleet management platform",
    version="2.0.0"
)


# Flexible CORS to allow local development on any host/port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class DemandRequest(BaseModel):
    hour: int
    day: int
    weather: int = 0


class DispatchRequest(BaseModel):
    hour: int
    day: int
    weather: int = 0


class RideRequest(BaseModel):
    passenger_id: str
    pickup_latitude: float
    pickup_longitude: float
    destination: str


class ConfirmRideRequest(BaseModel):
    passenger_id: str
    pickup_latitude: float
    pickup_longitude: float
    destination: str
    search_radius_km: float
    estimated_wait_minutes: float
    fare: float = 25.0


class NewVehicleRequest(BaseModel):
    id: str
    status: str = "available"
    latitude: float = 31.250844
    longitude: float = 75.705091
    distance: float = 0.5
    battery: int = 100
    capacity: int = 4


class SimulationConfigRequest(BaseModel):
    interval_seconds: float = 3.0


# ============================================================
# SYSTEM HEALTH & ROOT
# ============================================================

@app.get("/")
def home():
    # If frontend index.html exists, serve it for root web visitors
    frontend_index = Path(__file__).resolve().parent.parent.parent / "frontend" / "index.html"
    if frontend_index.exists():
        return FileResponse(str(frontend_index))
    return {
        "system": "E-RideX",
        "message": "AI Campus E-Rickshaw System is running!",
        "version": "2.0.0"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "system": "E-RideX",
        "timestamp": datetime.datetime.now().isoformat()
    }


# ============================================================
# AI DEMAND PREDICTION
# ============================================================

@app.post("/predict-demand")
def predict_vehicle_demand(request: DemandRequest):
    demand = predict_demand(
        hour=request.hour,
        day=request.day,
        weather=request.weather
    )

    return {
        "hour": request.hour,
        "day": request.day,
        "weather": request.weather,
        "predicted_demand": demand
    }


@app.get("/demand-forecast")
def demand_forecast():
    forecast = []
    # Project 9 AM to 10 PM (hours 9 to 22)
    today = datetime.datetime.now().weekday()

    for hour in range(9, 23):
        demand = predict_demand(
            hour=hour,
            day=today,
            weather=0
        )

        forecast.append({
            "hour": hour,
            "predicted_demand": demand
        })

    return {
        "system": "E-RideX",
        "forecast": forecast
    }


@app.get("/model-info")
def model_information():
    return get_model_info()


# ============================================================
# VEHICLE FLEET MANAGEMENT
# ============================================================

@app.get("/vehicles")
def get_vehicles():
    vehicles = get_all_vehicles()
    return {
        "count": len(vehicles),
        "vehicles": vehicles
    }


@app.get("/vehicles/available")
def available_vehicles():
    vehicles = get_available_vehicles()
    return {
        "count": len(vehicles),
        "vehicles": vehicles
    }


@app.get("/vehicles/{vehicle_id}")
def vehicle_details(vehicle_id: str):
    vehicle = get_vehicle(vehicle_id)
    if vehicle is None:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found"
        )
    return vehicle


@app.post("/vehicles")
def add_new_vehicle(payload: NewVehicleRequest):
    existing = get_vehicle(payload.id)
    if existing:
        raise HTTPException(status_code=400, detail=f"Vehicle {payload.id} already exists")

    insert_vehicle(
        vehicle_id=payload.id,
        status=payload.status,
        latitude=payload.latitude,
        longitude=payload.longitude,
        distance=payload.distance,
        battery=payload.battery,
        capacity=payload.capacity
    )
    return {
        "system": "E-RideX",
        "message": f"Vehicle {payload.id} added successfully",
        "vehicle": payload.model_dump()
    }


@app.delete("/vehicles/{vehicle_id}")
def remove_vehicle(vehicle_id: str):
    existing = get_vehicle(vehicle_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    delete_vehicle(vehicle_id)
    return {
        "system": "E-RideX",
        "message": f"Vehicle {vehicle_id} deleted successfully"
    }


@app.put("/vehicles/{vehicle_id}/status")
def change_vehicle_status(vehicle_id: str, status: str):
    vehicle = get_vehicle(vehicle_id)
    if vehicle is None:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found"
        )

    allowed_statuses = [
        "available",
        "busy",
        "maintenance"
    ]

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Use available, busy, or maintenance"
        )

    update_vehicle_status(
        vehicle_id,
        status
    )

    return {
        "system": "E-RideX",
        "vehicle_id": vehicle_id,
        "status": status,
        "message": "Vehicle status updated successfully"
    }


# ============================================================
# DRIVERS MANAGEMENT
# ============================================================

@app.get("/drivers")
def list_drivers():
    drivers = get_all_drivers()
    return {
        "system": "E-RideX",
        "count": len(drivers),
        "drivers": drivers
    }


@app.put("/drivers/{driver_id}/status")
def change_driver_status(driver_id: str, status: str):
    driver = get_driver(driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    allowed = ["online", "offline", "on_trip"]
    if status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid driver status. Use online, offline, or on_trip")

    update_driver_status(driver_id, status)
    return {
        "system": "E-RideX",
        "driver_id": driver_id,
        "status": status,
        "message": "Driver status updated successfully"
    }


# ============================================================
# PASSENGERS DIRECTORY
# ============================================================

@app.get("/passengers")
def list_passengers():
    requests = get_all_ride_requests()
    passengers_map = {}

    for req in requests:
        pid = req["passenger_id"]
        if pid not in passengers_map:
            passengers_map[pid] = {
                "passenger_id": pid,
                "total_rides": 0,
                "completed_rides": 0,
                "unanswered_rides": 0,
                "last_destination": req["destination"],
                "last_active": req.get("created_at") or "Recent"
            }
        passengers_map[pid]["total_rides"] += 1
        if req["status"] in ["assigned", "completed"]:
            passengers_map[pid]["completed_rides"] += 1
        elif req["status"] == "unanswered":
            passengers_map[pid]["unanswered_rides"] += 1

    return {
        "system": "E-RideX",
        "count": len(passengers_map),
        "passengers": list(passengers_map.values())
    }


# ============================================================
# INTELLIGENT DISPATCH & RIDE REQUESTS
# ============================================================

@app.post("/dispatch")
def intelligent_dispatch(request: DispatchRequest):
    predicted_demand = predict_demand(
        hour=request.hour,
        day=request.day,
        weather=request.weather
    )

    available_before = get_available_vehicles()
    available_count = len(available_before)

    dispatched = dispatch_vehicles(predicted_demand)
    dispatched_count = len(dispatched)

    if dispatched_count >= predicted_demand:
        dispatch_status = "fully_dispatched"
    else:
        dispatch_status = "partial_dispatch"

    return {
        "system": "E-RideX",
        "input": {
            "hour": request.hour,
            "day": request.day,
            "weather": request.weather
        },
        "predicted_demand": predicted_demand,
        "available_vehicles_before_dispatch": available_count,
        "vehicles_dispatched": dispatched_count,
        "vehicles_remaining": max(
            available_count - dispatched_count,
            0
        ),
        "dispatch_status": dispatch_status,
        "dispatched_vehicles": dispatched
    }


@app.post("/ride-request")
def create_passenger_ride_request(request: RideRequest):
    result = find_best_driver(
        pickup_latitude=request.pickup_latitude,
        pickup_longitude=request.pickup_longitude
    )

    if result["status"] == "no_driver":
        request_id = create_ride_request(
            passenger_id=request.passenger_id,
            pickup_latitude=request.pickup_latitude,
            pickup_longitude=request.pickup_longitude,
            destination=request.destination,
            status="unanswered",
            assigned_vehicle_id=None,
            search_radius_km=result["search_radius_km"],
            estimated_wait_minutes=None,
            fare=0.0
        )

        return {
            "system": "E-RideX",
            "request_id": request_id,
            "passenger_id": request.passenger_id,
            "destination": request.destination,
            "status": "unanswered",
            "message": result["message"],
            "search_radius_km": result["search_radius_km"]
        }

    driver = result["driver"]

    # Calculate dynamic fare (Base ₹20 + ₹10 per km, rounded)
    distance = result.get("distance_km", 0.5)
    fare = round(20.0 + (distance * 10.0), 1)

    return {
        "system": "E-RideX",
        "passenger_id": request.passenger_id,
        "destination": request.destination,
        "status": "driver_found",
        "driver": {
            "id": driver["id"],
            "distance_km": result["distance_km"],
            "estimated_wait_minutes": result["estimated_wait_minutes"],
            "battery": driver.get("battery", 85)
        },
        "fare": fare,
        "search_radius_km": result["search_radius_km"]
    }


@app.post("/confirm-ride/{vehicle_id}")
def confirm_ride(vehicle_id: str, request: ConfirmRideRequest):
    vehicle = get_vehicle(vehicle_id)

    if vehicle is None:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found"
        )

    if vehicle["status"] != "available":
        raise HTTPException(
            status_code=400,
            detail="Vehicle is no longer available"
        )

    update_vehicle_status(
        vehicle_id,
        "busy"
    )

    request_id = create_ride_request(
        passenger_id=request.passenger_id,
        pickup_latitude=request.pickup_latitude,
        pickup_longitude=request.pickup_longitude,
        destination=request.destination,
        status="assigned",
        assigned_vehicle_id=vehicle_id,
        search_radius_km=request.search_radius_km,
        estimated_wait_minutes=request.estimated_wait_minutes,
        fare=request.fare
    )

    return {
        "system": "E-RideX",
        "status": "ride_confirmed",
        "request_id": request_id,
        "vehicle_id": vehicle_id,
        "fare": request.fare,
        "message": "Ride confirmed successfully"
    }


@app.get("/ride-requests")
def ride_requests():
    requests = get_all_ride_requests()
    return {
        "count": len(requests),
        "requests": requests
    }


# ============================================================
# RIDE LIFECYCLE (START, COMPLETE, CANCEL)
# ============================================================

@app.post("/rides/{request_id}/start")
def start_ride(request_id: int):
    req = get_ride_request(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Ride request not found")

    update_ride_status(request_id, "in_progress")
    return {
        "system": "E-RideX",
        "request_id": request_id,
        "status": "in_progress",
        "message": "Ride is now in progress"
    }


@app.post("/rides/{request_id}/complete")
def complete_ride(request_id: int):
    req = get_ride_request(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Ride request not found")

    update_ride_status(request_id, "completed")

    # Release vehicle back to available
    vid = req.get("assigned_vehicle_id")
    if vid:
        update_vehicle_status(vid, "available")
        fare = req.get("fare") or 25.0
        record_driver_completion(vid, fare)

    return {
        "system": "E-RideX",
        "request_id": request_id,
        "status": "completed",
        "message": "Ride completed successfully. Vehicle released to available."
    }


@app.post("/rides/{request_id}/cancel")
def cancel_ride_endpoint(request_id: int):
    req = get_ride_request(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Ride request not found")

    update_ride_status(request_id, "cancelled")

    vid = req.get("assigned_vehicle_id")
    if vid and req.get("status") in ["assigned", "in_progress"]:
        update_vehicle_status(vid, "available")

    return {
        "system": "E-RideX",
        "request_id": request_id,
        "status": "cancelled",
        "message": "Ride cancelled."
    }


# ============================================================
# ROUTE ANALYTICS & AI RECOMMENDATIONS
# ============================================================

@app.get("/analytics/routes")
def route_analytics():
    analytics = get_route_analytics()
    return {
        "system": "E-RideX",
        "count": len(analytics),
        "routes": analytics
    }


@app.get("/ai/recommendations")
def ai_fleet_recommendations():
    now = datetime.datetime.now()
    hour = now.hour
    day = now.weekday()
    predicted = predict_demand(hour=hour, day=day, weather=0)

    vehicles = get_all_vehicles()
    available = [v for v in vehicles if v["status"] == "available"]
    busy = [v for v in vehicles if v["status"] == "busy"]
    maintenance = [v for v in vehicles if v["status"] == "maintenance"]
    low_battery = [v["id"] for v in vehicles if v.get("battery", 100) < 30 and v["status"] != "maintenance"]

    recs = []

    # 1. Supply vs Demand Recommendation
    if predicted > len(available):
        deficit = predicted - len(available)
        recs.append({
            "id": "REC-01",
            "type": "surge_capacity",
            "badge": "High Demand Alert",
            "title": f"Mobilize +{deficit} E-Rickshaws for Peak Demand",
            "description": f"Predicted campus demand is {predicted} rides this hour vs {len(available)} available. Expedite turnarounds and position standby units at Main Gate.",
            "priority": "high",
            "action": "Dispatch Standby"
        })
    else:
        recs.append({
            "id": "REC-02",
            "type": "balanced_fleet",
            "badge": "Optimal Staging",
            "title": "Stage Vehicles Across High-Density Hubs",
            "description": f"Available fleet ({len(available)}) comfortably meets predicted demand ({predicted}). Maintain 2 vehicles at Library and 2 at Hostel block.",
            "priority": "normal",
            "action": "Maintain Staging"
        })

    # 2. Battery & Charging Recommendation
    if low_battery:
        recs.append({
            "id": "REC-03",
            "type": "charging_alert",
            "badge": "Depot Charging",
            "title": f"Schedule Low Battery Charging ({', '.join(low_battery)})",
            "description": f"Vehicle(s) {', '.join(low_battery)} report under 30% battery. Route to Academic Block solar station before battery drops below 20%.",
            "priority": "high",
            "action": "Route to Charger"
        })

    # 3. Maintenance Fleet Notice
    if maintenance:
        recs.append({
            "id": "REC-04",
            "type": "maintenance_alert",
            "badge": "Fleet Maintenance",
            "title": f"{len(maintenance)} Rickshaw(s) in Workshop",
            "description": f"Unit(s) {', '.join([v['id'] for v in maintenance])} currently offline for servicing. Complete safety checks prior to evening transit window.",
            "priority": "medium",
            "action": "Check Workshop"
        })

    # 4. Route optimization recommendation based on historical analytics
    analytics = get_route_analytics()
    poor_routes = [r for r in analytics if r.get("service_level") == "poor"]
    if poor_routes:
        recs.append({
            "id": "REC-05",
            "type": "route_service",
            "badge": "Service Level Gap",
            "title": f"Reinforce Route: {poor_routes[0]['route']}",
            "description": f"Route has a low service rate of {poor_routes[0]['service_rate_percent']}%. Dedicate 1 available e-rickshaw to clear passenger backlog.",
            "priority": "medium",
            "action": "Assign Priority"
        })

    return {
        "system": "E-RideX",
        "current_hour": hour,
        "predicted_demand": predicted,
        "available_count": len(available),
        "busy_count": len(busy),
        "maintenance_count": len(maintenance),
        "recommendations": recs
    }


# ============================================================
# VEHICLE SIMULATOR ENDPOINTS
# ============================================================

@app.get("/simulation/status")
def simulation_status():
    return simulator.get_status()


@app.post("/simulation/start")
def simulation_start(config: SimulationConfigRequest = None):
    interval = config.interval_seconds if config else 3.0
    started = simulator.start(interval)
    return {
        "system": "E-RideX",
        "started": started,
        "status": simulator.get_status(),
        "message": "Simulation started" if started else "Simulation already running"
    }


@app.post("/simulation/stop")
def simulation_stop():
    stopped = simulator.stop()
    return {
        "system": "E-RideX",
        "stopped": stopped,
        "status": simulator.get_status(),
        "message": "Simulation stopped" if stopped else "Simulation was not running"
    }


@app.post("/simulation/step")
def simulation_step():
    updated = simulator.step()
    return {
        "system": "E-RideX",
        "step_completed": True,
        "vehicles_updated": updated,
        "status": simulator.get_status()
    }


@app.post("/simulation/reset")
def simulation_reset():
    simulator.reset()
    return {
        "system": "E-RideX",
        "reset": True,
        "message": "Vehicles reset to seed coordinates"
    }


# ============================================================
# STATIC FILES SERVING (FRONTEND)
# ============================================================

frontend_path = Path(__file__).resolve().parent.parent.parent / "frontend"
if frontend_path.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_path)), name="static")

    @app.get("/app")
    def serve_frontend_app():
        return FileResponse(str(frontend_path / "index.html"))
