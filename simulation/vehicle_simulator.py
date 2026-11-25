import sys
import time
import threading
import random
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from database.database import get_all_vehicles, get_connection
from database.vehicle_data import VEHICLES as SEED_VEHICLES

CAMPUS_BOUNDS = {
    "lat_min": 31.2450,
    "lat_max": 31.2580,
    "lon_min": 75.7000,
    "lon_max": 75.7120,
    "center_lat": 31.2510,
    "center_lon": 75.7050
}


def move_vehicles():
    """
    Simulate one step of vehicle movements within campus boundaries.
    Preserves maintenance vehicles and prevents out-of-bounds drift.
    """
    vehicles = get_all_vehicles()
    connection = get_connection()
    cursor = connection.cursor()

    updated = []
    for vehicle in vehicles:
        if vehicle["status"] == "maintenance":
            continue

        lat = vehicle["latitude"]
        lon = vehicle["longitude"]
        battery = vehicle.get("battery", 80)

        # Drift delta
        d_lat = random.uniform(-0.00025, 0.00025)
        d_lon = random.uniform(-0.00025, 0.00025)

        # Re-center if vehicle is nearing campus boundary
        if lat < CAMPUS_BOUNDS["lat_min"]:
            d_lat = abs(d_lat)
        elif lat > CAMPUS_BOUNDS["lat_max"]:
            d_lat = -abs(d_lat)

        if lon < CAMPUS_BOUNDS["lon_min"]:
            d_lon = abs(d_lon)
        elif lon > CAMPUS_BOUNDS["lon_max"]:
            d_lon = -abs(d_lon)

        new_lat = round(lat + d_lat, 6)
        new_lon = round(lon + d_lon, 6)

        # Small battery drain on movement (15% chance per step, min 15%)
        if random.random() < 0.15 and battery > 15:
            battery = max(15, battery - 1)

        cursor.execute(
            """
            UPDATE vehicles
            SET latitude = ?, longitude = ?, battery = ?
            WHERE id = ?
            """,
            (new_lat, new_lon, battery, vehicle["id"])
        )
        updated.append(vehicle["id"])

    connection.commit()
    connection.close()
    return updated


class SimulationController:
    """Thread-safe background controller for automated vehicle simulation."""

    def __init__(self):
        self._running = False
        self._thread = None
        self._interval = 3.0
        self._lock = threading.Lock()
        self._step_count = 0

    def is_running(self):
        with self._lock:
            return self._running

    def get_status(self):
        with self._lock:
            return {
                "running": self._running,
                "interval_seconds": self._interval,
                "step_count": self._step_count,
                "mode": "automatic" if self._running else "manual",
                "simulated": True
            }

    def start(self, interval_seconds=3.0):
        with self._lock:
            if self._running:
                return False
            self._interval = max(1.0, float(interval_seconds))
            self._running = True
            self._thread = threading.Thread(target=self._loop, daemon=True)
            self._thread.start()
            return True

    def stop(self):
        with self._lock:
            if not self._running:
                return False
            self._running = False
            return True

    def step(self):
        with self._lock:
            self._step_count += 1
        return move_vehicles()

    def reset(self):
        """Reset vehicles to original seed coordinates."""
        connection = get_connection()
        cursor = connection.cursor()
        for seed in SEED_VEHICLES:
            cursor.execute("""
                UPDATE vehicles
                SET latitude = ?, longitude = ?, battery = ?, status = ?
                WHERE id = ?
            """, (seed["latitude"], seed["longitude"], seed["battery"], seed["status"], seed["id"]))
        connection.commit()
        connection.close()
        return True

    def _loop(self):
        while True:
            with self._lock:
                if not self._running:
                    break
                interval = self._interval
                self._step_count += 1

            try:
                move_vehicles()
            except Exception as e:
                print(f"[Simulator] Error in simulation step: {e}")

            time.sleep(interval)


simulator = SimulationController()


if __name__ == "__main__":
    move_vehicles()
    print("Single step completed:", simulator.get_status())
