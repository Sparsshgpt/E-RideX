from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai.demand_predictor import predict_demand, get_model_info

from database.database import (
    create_tables,
    get_all_vehicles,
    get_available_vehicles,
    get_vehicle,
    create_ride_request,
    get_all_ride_requests,
    update_vehicle_status
)

from dispatch.dispatch_engine import dispatch_vehicles
from dispatch.ride_matching import find_best_driver

from analytics.route_analytics import get_route_analytics


create_tables()


app = FastAPI(
    title="E-RideX - AI Campus E-Rickshaw System",
    description="AI-based campus e-rickshaw demand prediction and intelligent vehicle dispatch system",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


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


@app.get("/")
def home():
    return {
        "system": "E-RideX",
        "message": "AI Campus E-Rickshaw System is running!",
        "version": "1.0.0"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "system": "E-RideX"
    }


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

    for hour in range(9, 23):

        demand = predict_demand(
            hour=hour,
            day=0,
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

@app.post("/dispatch")
def intelligent_dispatch(request: DispatchRequest):

    predicted_demand = predict_demand(
        hour=request.hour,
        day=request.day,
        weather=request.weather
    )

    available_before = get_available_vehicles()

    available_count = len(available_before)

    dispatched = dispatch_vehicles(
        predicted_demand
    )

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

            estimated_wait_minutes=None
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

    return {

        "system": "E-RideX",

        "passenger_id": request.passenger_id,

        "destination": request.destination,

        "status": "driver_found",

        "driver": {

            "id": driver["id"],

            "distance_km": result["distance_km"],

            "estimated_wait_minutes":
                result["estimated_wait_minutes"]
        },

        "search_radius_km":
            result["search_radius_km"]
    }


@app.post("/confirm-ride/{vehicle_id}")
def confirm_ride(
    vehicle_id: str,
    request: ConfirmRideRequest
):

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

        estimated_wait_minutes=request.estimated_wait_minutes
    )

    return {

        "system": "E-RideX",

        "status": "ride_confirmed",

        "request_id": request_id,

        "vehicle_id": vehicle_id,

        "message": "Ride confirmed successfully"
    }


@app.get("/ride-requests")
def ride_requests():

    requests = get_all_ride_requests()

    return {

        "count": len(requests),

        "requests": requests
    }


@app.get("/analytics/routes")
def route_analytics():

    analytics = get_route_analytics()

    return {

        "system": "E-RideX",

        "count": len(analytics),

        "routes": analytics
    }