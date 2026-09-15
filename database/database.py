import sqlite3
from pathlib import Path


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "eridex.db"


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


# ============================================================
# CREATE TABLES
# ============================================================

def create_tables():
    connection = get_connection()
    cursor = connection.cursor()

    # --------------------------------------------------------
    # VEHICLES TABLE
    # --------------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vehicles (
            id TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            distance REAL NOT NULL,
            battery INTEGER NOT NULL,
            capacity INTEGER NOT NULL
        )
    """)

    # --------------------------------------------------------
    # RIDE REQUESTS TABLE
    # --------------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ride_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            passenger_id TEXT NOT NULL,
            pickup_latitude REAL NOT NULL,
            pickup_longitude REAL NOT NULL,
            destination TEXT NOT NULL,
            status TEXT NOT NULL,
            assigned_vehicle_id TEXT,
            search_radius_km REAL,
            estimated_wait_minutes REAL
        )
    """)

    connection.commit()
    connection.close()


# ============================================================
# VEHICLE FUNCTIONS
# ============================================================

def insert_vehicle(
    vehicle_id,
    status,
    latitude,
    longitude,
    distance,
    battery,
    capacity
):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT OR REPLACE INTO vehicles
        (id, status, latitude, longitude, distance, battery, capacity)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        vehicle_id,
        status,
        latitude,
        longitude,
        distance,
        battery,
        capacity
    ))

    connection.commit()
    connection.close()


def get_all_vehicles():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("SELECT * FROM vehicles")

    rows = cursor.fetchall()

    connection.close()

    return [dict(row) for row in rows]


def get_available_vehicles():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT * FROM vehicles
        WHERE status = 'available'
        ORDER BY distance ASC
    """)

    rows = cursor.fetchall()

    connection.close()

    return [dict(row) for row in rows]


def update_vehicle_status(vehicle_id, status):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE vehicles
        SET status = ?
        WHERE id = ?
    """, (status, vehicle_id))

    connection.commit()
    connection.close()


def get_vehicle(vehicle_id):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT * FROM vehicles
        WHERE id = ?
    """, (vehicle_id,))

    row = cursor.fetchone()

    connection.close()

    if row:
        return dict(row)

    return None


# ============================================================
# RIDE REQUEST FUNCTIONS
# ============================================================

def create_ride_request(
    passenger_id,
    pickup_latitude,
    pickup_longitude,
    destination,
    status,
    assigned_vehicle_id=None,
    search_radius_km=0,
    estimated_wait_minutes=None
):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO ride_requests (
            passenger_id,
            pickup_latitude,
            pickup_longitude,
            destination,
            status,
            assigned_vehicle_id,
            search_radius_km,
            estimated_wait_minutes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        passenger_id,
        pickup_latitude,
        pickup_longitude,
        destination,
        status,
        assigned_vehicle_id,
        search_radius_km,
        estimated_wait_minutes
    ))

    request_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return request_id


def get_all_ride_requests():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM ride_requests
        ORDER BY id DESC
    """)

    rows = cursor.fetchall()

    connection.close()

    return [dict(row) for row in rows]