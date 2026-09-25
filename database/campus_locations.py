CAMPUS_LOCATIONS = {
    "Main Gate": {
        "latitude": 31.250844,
        "longitude": 75.705091
    },
    "Library": {
        "latitude": 31.253000,
        "longitude": 75.707000
    },
    "Hostel": {
        "latitude": 31.247500,
        "longitude": 75.709000
    },
    "Academic Block": {
        "latitude": 31.255000,
        "longitude": 75.703000
    },
    "Canteen": {
        "latitude": 31.249000,
        "longitude": 75.702500
    }
}


def get_location_name(latitude, longitude):

    for name, location in CAMPUS_LOCATIONS.items():

        if (
            abs(latitude - location["latitude"]) < 0.001
            and
            abs(longitude - location["longitude"]) < 0.001
        ):
            return name

    return "Unknown Location"