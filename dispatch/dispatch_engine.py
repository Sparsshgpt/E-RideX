def dispatch_vehicles(predicted_demand, vehicles):
    """
    Intelligent vehicle dispatch engine.

    Selection criteria:
    1. Vehicle must be available.
    2. Battery must be at least 30%.
    3. Vehicle must have passenger capacity.
    4. Nearest vehicles get priority.
    5. Higher battery is preferred when distance is similar.
    """

    MIN_BATTERY = 30
    MIN_CAPACITY = 1

    # Step 1: Filter suitable vehicles
    suitable_vehicles = [
        vehicle
        for vehicle in vehicles
        if vehicle["status"] == "available"
        and vehicle["battery"] >= MIN_BATTERY
        and vehicle["capacity"] >= MIN_CAPACITY
    ]

    # Step 2: Rank vehicles
    # Distance is the primary factor.
    # Battery is secondary.
    suitable_vehicles.sort(
        key=lambda vehicle: (
            vehicle["distance"],
            -vehicle["battery"]
        )
    )

    # Step 3: Select required vehicles
    selected = suitable_vehicles[:predicted_demand]

    # Step 4: Mark selected vehicles as busy
    for vehicle in selected:
        vehicle["status"] = "busy"

    return selected