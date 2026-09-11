from fastapi import FastAPI
from pydantic import BaseModel

from ai.demand_predictor import predict_demand
from dispatch.dispatch_engine import dispatch_vehicles

from database.vehicle_data import (
    get_all_vehicles,
    get_available_vehicles,
    get_vehicle,
    mark_vehicle_busy
)


# --------------------------------------------------
# FastAPI Application
# --------------------------------------------------

app = FastAPI(
    title="E-RideX - AI Campus E-Rickshaw System",
    description="AI-based campus e-rickshaw demand prediction and intelligent dispatch system",
    version="1.0.0"
)


# --------------------------------------------------
# Request Models
# --------------------------------------------------

class DemandRequest(BaseModel):
    hour: int
    day: int
    weather: int = 0


class DispatchRequest(BaseModel):
    predicted_demand: int


# --------------------------------------------------
# Home
# --------------------------------------------------

@app.get("/")
def home():

    return {
        "message": "E-RideX AI Campus E-Rickshaw System is running!"
    }


# --------------------------------------------------
# Health Check
# --------------------------------------------------

@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


# --------------------------------------------------
# AI Demand Prediction
# --------------------------------------------------

@app.post("/predict-demand")
def predict_vehicle_demand(request: DemandRequest):

    demand = predict_demand(
        request.hour,
        request.day,
        request.weather
    )

    return {
        "predicted_demand": demand
    }


# --------------------------------------------------
# Get all vehicles
# --------------------------------------------------

@app.get("/vehicles")
def get_vehicles():

    return {
        "vehicles": get_all_vehicles()
    }


# --------------------------------------------------
# Get available vehicles
# --------------------------------------------------

@app.get("/vehicles/available")
def get_available():

    return {
        "vehicles": get_available_vehicles()
    }


# --------------------------------------------------
# Get vehicle by ID
# --------------------------------------------------

@app.get("/vehicles/{vehicle_id}")
def get_vehicle_details(vehicle_id: str):

    vehicle = get_vehicle(vehicle_id)

    if vehicle is None:

        return {
            "error": "Vehicle not found"
        }

    return vehicle


# --------------------------------------------------
# Intelligent Vehicle Dispatch
# --------------------------------------------------

@app.post("/dispatch")
def dispatch(request: DispatchRequest):

    # Get currently available vehicles
    available_vehicles = get_available_vehicles()

    # Select nearest vehicles
    selected = dispatch_vehicles(
        request.predicted_demand,
        available_vehicles
    )

    # Mark selected vehicles as busy
    for vehicle in selected:

        mark_vehicle_busy(vehicle["id"])

    return {
        "predicted_demand": request.predicted_demand,
        "available_vehicles": len(available_vehicles),
        "dispatched_vehicles": selected,
        "count": len(selected)
    }