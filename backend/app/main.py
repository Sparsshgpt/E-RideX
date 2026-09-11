from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from ai.demand_predictor import predict_demand
from database.vehicle_data import (
    get_all_vehicles,
    get_available_vehicles,
    get_vehicle
)
from dispatch.dispatch_engine import dispatch_vehicles


app = FastAPI(
    title="AI Campus E-Rickshaw System",
    description="AI-based campus e-rickshaw demand prediction and intelligent dispatch system",
    version="1.0.0"
)


# ============================================================
# REQUEST MODELS
# ============================================================

class DemandRequest(BaseModel):
    hour: int
    day: int
    weather: int = 0


class DispatchRequest(BaseModel):
    hour: int
    day: int
    weather: int = 0


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "message": "AI Campus E-Rickshaw System is running!"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "system": "AI Campus E-Rickshaw"
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


# ============================================================
# GET ALL VEHICLES
# ============================================================

@app.get("/vehicles")
def get_vehicles():

    vehicles = get_all_vehicles()

    return {
        "count": len(vehicles),
        "vehicles": vehicles
    }


# ============================================================
# GET AVAILABLE VEHICLES
# ============================================================

@app.get("/vehicles/available")
def available_vehicles():

    vehicles = get_available_vehicles()

    return {
        "count": len(vehicles),
        "vehicles": vehicles
    }


# ============================================================
# GET VEHICLE BY ID
# ============================================================

@app.get("/vehicles/{vehicle_id}")
def vehicle_details(vehicle_id: str):

    vehicle = get_vehicle(vehicle_id)

    if vehicle is None:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found"
        )

    return vehicle


# ============================================================
# INTELLIGENT DISPATCH
# ============================================================

@app.post("/dispatch")
def intelligent_dispatch(request: DispatchRequest):

    # --------------------------------------------------------
    # STEP 1: Predict demand using AI
    # --------------------------------------------------------

    predicted_demand = predict_demand(
        hour=request.hour,
        day=request.day,
        weather=request.weather
    )

    # --------------------------------------------------------
    # STEP 2: Get currently available vehicles
    # --------------------------------------------------------

    available = get_available_vehicles()

    # --------------------------------------------------------
    # STEP 3: Dispatch best vehicles
    # --------------------------------------------------------

    dispatched = dispatch_vehicles(
        predicted_demand,
        available
    )

    # --------------------------------------------------------
    # STEP 4: Return dispatch decision
    # --------------------------------------------------------

    return {
        "input": {
            "hour": request.hour,
            "day": request.day,
            "weather": request.weather
        },

        "predicted_demand": predicted_demand,

        "available_vehicles_before_dispatch": len(available),

        "vehicles_dispatched": len(dispatched),

        "dispatch_status": (
            "fully_dispatched"
            if len(dispatched) >= predicted_demand
            else "partial_dispatch"
        ),

        "dispatched_vehicles": dispatched
    }