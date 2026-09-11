def dispatch_vehicles(predicted_demand, vehicles):
    """
    Select the best available e-rickshaws based on distance.

    predicted_demand: number of vehicles required
    vehicles: list of vehicle dictionaries
    """

    # Only available vehicles can be dispatched
    available = [
        vehicle for vehicle in vehicles
        if vehicle["status"] == "available"
    ]

    # Nearest vehicles get priority
    available.sort(key=lambda vehicle: vehicle["distance"])

    # Select required number of vehicles
    selected = available[:predicted_demand]

    return selected
if __name__ == "__main__":

    vehicles = [
        {"id": "ER01", "status": "available", "distance": 0.8},
        {"id": "ER02", "status": "available", "distance": 1.2},
        {"id": "ER03", "status": "busy", "distance": 0.4},
        {"id": "ER04", "status": "available", "distance": 2.1},
        {"id": "ER05", "status": "available", "distance": 1.5}
    ]

    result = dispatch_vehicles(3, vehicles)

    print("Dispatched vehicles:")

    for vehicle in result:
        print(
            vehicle["id"],
            "-",
            vehicle["distance"],
            "km"
        )