CAMPUS_LOCATIONS = {
    "Main Gate": {
        "latitude": 28.6139,
        "longitude": 77.2090
    },
    "Library": {
        "latitude": 28.6150,
        "longitude": 77.2105
    },
    "Hostel": {
        "latitude": 28.6170,
        "longitude": 77.2120
    },
    "Academic Block": {
        "latitude": 28.6200,
        "longitude": 77.2150
    },
    "Canteen": {
        "latitude": 28.6115,
        "longitude": 77.2075
    }
}


def get_location_name(latitude, longitude):
    for name, location in CAMPUS_LOCATIONS.items():
        if (
            abs(latitude - location["latitude"]) < 0.001
            and abs(longitude - location["longitude"]) < 0.001
        ):
            return name

    return "Unknown Location"