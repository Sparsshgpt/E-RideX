import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "eridex.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def create_tables():
    connection = get_connection()
    cursor = connection.cursor()

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

    connection.commit()
    connection.close()


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