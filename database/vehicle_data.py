# --------------------------------------------------
# E-RideX Vehicle Data
# --------------------------------------------------

vehicles = [
    {
        "id": "ER01",
        "status": "available",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "distance": 0.8,
        "battery": 92,
        "capacity": 4
    },
    {
        "id": "ER02",
        "status": "available",
        "latitude": 28.6150,
        "longitude": 77.2105,
        "distance": 1.2,
        "battery": 78,
        "capacity": 4
    },
    {
        "id": "ER03",
        "status": "busy",
        "latitude": 28.6170,
        "longitude": 77.2120,
        "distance": 0.4,
        "battery": 61,
        "capacity": 4
    },
    {
        "id": "ER04",
        "status": "available",
        "latitude": 28.6200,
        "longitude": 77.2150,
        "distance": 2.1,
        "battery": 45,
        "capacity": 4
    },
    {
        "id": "ER05",
        "status": "available",
        "latitude": 28.6115,
        "longitude": 77.2075,
        "distance": 1.5,
        "battery": 88,
        "capacity": 4
    }
]


# --------------------------------------------------
# Get all vehicles
# --------------------------------------------------

def get_all_vehicles():
    return vehicles


# --------------------------------------------------
# Get available vehicles
# --------------------------------------------------

def get_available_vehicles():
    return [
        vehicle
        for vehicle in vehicles
        if vehicle["status"] == "available"
    ]


# --------------------------------------------------
# Get vehicle by ID
# --------------------------------------------------

def get_vehicle(vehicle_id):
    for vehicle in vehicles:
        if vehicle["id"] == vehicle_id:
            return vehicle

    return None


# --------------------------------------------------
# Update vehicle status
# --------------------------------------------------

def update_vehicle_status(vehicle_id, status):

    vehicle = get_vehicle(vehicle_id)

    if vehicle is None:
        return None

    vehicle["status"] = status

    return vehicle


# --------------------------------------------------
# Mark vehicle as busy
# --------------------------------------------------

def mark_vehicle_busy(vehicle_id):

    vehicle = get_vehicle(vehicle_id)

    if vehicle is None:
        return None

    vehicle["status"] = "busy"

    return vehicle