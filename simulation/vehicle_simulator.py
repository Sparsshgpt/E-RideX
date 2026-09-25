import sys
from pathlib import Path
import random

PROJECT_ROOT = Path(__file__).resolve().parent.parent

sys.path.insert(0, str(PROJECT_ROOT))

from database.database import get_all_vehicles, get_connection


def move_vehicles():

    vehicles = get_all_vehicles()

    connection = get_connection()
    cursor = connection.cursor()

    for vehicle in vehicles:

        if vehicle["status"] == "maintenance":
            continue

        latitude = vehicle["latitude"]
        longitude = vehicle["longitude"]

        latitude += random.uniform(-0.0002, 0.0002)
        longitude += random.uniform(-0.0002, 0.0002)

        cursor.execute(
            """
            UPDATE vehicles
            SET latitude = ?, longitude = ?
            WHERE id = ?
            """,
            (
                latitude,
                longitude,
                vehicle["id"]
            )
        )

    connection.commit()
    connection.close()

    print("Vehicle locations updated.")


if __name__ == "__main__":
    move_vehicles()