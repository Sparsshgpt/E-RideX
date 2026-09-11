from dispatch.dispatch_engine import dispatch_vehicles
from fastapi import FastAPI
from pydantic import BaseModel
from ai.demand_predictor import predict_demand

app = FastAPI(
    title="AI Campus E-Rickshaw System",
    description="AI-based campus e-rickshaw demand and intelligent dispatch system",
    version="1.0.0"
)
class DemandRequest(BaseModel):
    hour: int
    day: int
    weather: int = 0
class DispatchRequest(BaseModel):
    predicted_demand: int
    vehicles: list


@app.get("/")
def home():
    return {
        "message": "AI Campus E-Rickshaw System is running!"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }

@app.post("/predict-demand")
def demand_prediction(request: DemandRequest):

    demand = predict_demand(
        hour=request.hour,
        day=request.day,
        weather=request.weather
    )

    return {
        "predicted_demand": demand
    }
@app.post("/dispatch")
def dispatch(request: DispatchRequest):

    selected = dispatch_vehicles(
        request.predicted_demand,
        request.vehicles
    )

    return {
        "dispatched_vehicles": selected,
        "count": len(selected)
    }