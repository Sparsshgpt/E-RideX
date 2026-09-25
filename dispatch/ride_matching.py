import math

from database.database import (
    get_available_vehicles
)


# ============================================================
# DISTANCE CALCULATION
# ============================================================

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two GPS coordinates
    using the Haversine formula.

    Returns distance in kilometers.
    """

    R = 6371.0

    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)
    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return R * c


# ============================================================
# WAITING TIME
# ============================================================

def estimate_wait_time(distance_km):
    """
    Estimate passenger waiting time.

    Average campus e-rickshaw speed = 20 km/h.
    """

    average_speed_kmh = 20

    travel_time_minutes = (
        distance_km / average_speed_kmh
    ) * 60

    wait_time = travel_time_minutes + 1

    return round(wait_time, 1)


# ============================================================
# FIND BEST DRIVER
# ============================================================

def find_best_driver(
    pickup_latitude,
    pickup_longitude,
    initial_radius_km=1.0,
    max_radius_km=5.0,
    radius_increment_km=1.0
):
    """
    Find the nearest available e-rickshaw.

    Search starts at 1 km.
    If no driver is found, the radius expands
    automatically up to 5 km.

    IMPORTANT:
    The selected vehicle is NOT marked busy here.
    The vehicle becomes busy only after the
    passenger confirms the ride.
    """

    available_vehicles = get_available_vehicles()

    # --------------------------------------------------------
    # NO AVAILABLE VEHICLES
    # --------------------------------------------------------

    if not available_vehicles:

        return {
            "status": "no_driver",
            "message": "No available e-rickshaw",
            "search_radius_km": 0,
            "driver": None
        }

    radius = initial_radius_km

    # --------------------------------------------------------
    # SEARCH WITH EXPANDING RADIUS
    # --------------------------------------------------------

    while radius <= max_radius_km:

        candidates = []

        for vehicle in available_vehicles:

            distance = calculate_distance(
                pickup_latitude,
                pickup_longitude,
                vehicle["latitude"],
                vehicle["longitude"]
            )

            if distance <= radius:

                wait_time = estimate_wait_time(
                    distance
                )

                candidates.append({
                    "vehicle": vehicle,
                    "distance_km": round(
                        distance,
                        3
                    ),
                    "estimated_wait_minutes": wait_time
                })

        # ----------------------------------------------------
        # DRIVER FOUND
        # ----------------------------------------------------

        if candidates:

            candidates.sort(
                key=lambda x:
                x["distance_km"]
            )

            best = candidates[0]

            return {
                "status": "driver_found",
                "search_radius_km": radius,
                "driver": best["vehicle"],
                "distance_km": best["distance_km"],
                "estimated_wait_minutes":
                    best["estimated_wait_minutes"]
            }

        # ----------------------------------------------------
        # NO DRIVER → EXPAND SEARCH
        # ----------------------------------------------------

        radius += radius_increment_km

    # --------------------------------------------------------
    # NO DRIVER WITHIN MAXIMUM RADIUS
    # --------------------------------------------------------

    return {
        "status": "no_driver",
        "message": (
            "No driver found within maximum search radius"
        ),
        "search_radius_km": max_radius_km,
        "driver": None
    }