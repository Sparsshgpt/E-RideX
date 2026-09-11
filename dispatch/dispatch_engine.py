from database.database import (
    get_available_vehicles,
    update_vehicle_status
)


def dispatch_vehicles(predicted_demand):
    """
    Dispatch the nearest available e-rickshaws.

    Vehicles are fetched from the SQLite database.
    """

    # Get available vehicles sorted by distance
    available = get_available_vehicles()

    # Select vehicles according to predicted demand
    selected = available[:predicted_demand]

    # Update dispatched vehicles to busy
    for vehicle in selected:
        update_vehicle_status(vehicle["id"], "busy")

        # Reflect updated status in response
        vehicle["status"] = "busy"

    return selected