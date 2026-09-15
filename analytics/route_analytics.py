from database.database import get_all_ride_requests
from database.campus_locations import get_location_name


def get_route_analytics():
    requests = get_all_ride_requests()

    routes = {}

    for request in requests:
        pickup_name = get_location_name(
            request["pickup_latitude"],
            request["pickup_longitude"]
        )

        route = f"{pickup_name} -> {request['destination']}"

        if route not in routes:
            routes[route] = {
                "route": route,
                "total_requests": 0,
                "unanswered_requests": 0,
                "assigned_requests": 0,
                "total_wait_time": 0,
                "wait_time_count": 0
            }

        routes[route]["total_requests"] += 1

        if request["status"] == "unanswered":
            routes[route]["unanswered_requests"] += 1

        if request["status"] == "assigned":
            routes[route]["assigned_requests"] += 1

        if request["estimated_wait_minutes"] is not None:
            routes[route]["total_wait_time"] += (
                request["estimated_wait_minutes"]
            )
            routes[route]["wait_time_count"] += 1

    analytics = []

    for route_data in routes.values():
        total = route_data["total_requests"]
        assigned = route_data["assigned_requests"]

        service_rate = (
            assigned / total * 100
            if total > 0
            else 0
        )

        average_wait = (
            route_data["total_wait_time"]
            / route_data["wait_time_count"]
            if route_data["wait_time_count"] > 0
            else 0
        )

        if service_rate < 50:
            service_level = "poor"
        elif service_rate < 80:
            service_level = "moderate"
        else:
            service_level = "good"

        analytics.append({
            "route": route_data["route"],
            "total_requests": total,
            "assigned_requests": assigned,
            "unanswered_requests": route_data["unanswered_requests"],
            "service_rate_percent": round(service_rate, 2),
            "average_wait_minutes": round(average_wait, 2),
            "service_level": service_level
        })

    analytics.sort(
        key=lambda x: x["total_requests"],
        reverse=True
    )

    return analytics