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
            estimated_wait_minutes REAL,
            fare REAL DEFAULT 25.0,
            created_at TEXT
        )
    """)

    # Check and add optional columns if table already existed without them
    cursor.execute("PRAGMA table_info(ride_requests)")
    existing_cols = [row["name"] for row in cursor.fetchall()]
    if "fare" not in existing_cols:
        cursor.execute("ALTER TABLE ride_requests ADD COLUMN fare REAL DEFAULT 25.0")
    if "created_at" not in existing_cols:
        cursor.execute("ALTER TABLE ride_requests ADD COLUMN created_at TEXT")

    # --------------------------------------------------------
    # DRIVERS TABLE
    # --------------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS drivers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            vehicle_id TEXT,
            status TEXT NOT NULL DEFAULT 'online',
            rating REAL DEFAULT 4.8,
            total_trips INTEGER DEFAULT 0,
            earnings REAL DEFAULT 0.0
        )
    """)

    # Seed initial drivers if empty
    cursor.execute("SELECT COUNT(*) AS count FROM drivers")
    if cursor.fetchone()["count"] == 0:
        seed_drivers = [
            ("DR01", "Rajesh Kumar", "+91 98765 43210", "ER01", "online", 4.9, 124, 3420.0),
            ("DR02", "Amit Singh", "+91 98765 43211", "ER02", "online", 4.7, 98, 2650.0),
            ("DR03", "Priya Sharma", "+91 98765 43212", "ER03", "online", 4.95, 156, 4210.0),
            ("DR04", "Vikram Patel", "+91 98765 43213", "ER04", "online", 4.8, 110, 2980.0),
            ("DR05", "Suresh Verma", "+91 98765 43214", "ER05", "online", 4.6, 84, 2150.0),
        ]
        cursor.executemany("""
            INSERT INTO drivers (id, name, phone, vehicle_id, status, rating, total_trips, earnings)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, seed_drivers)

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
    estimated_wait_minutes=None,
    fare=25.0,
    created_at=None
):
    import datetime
    if not created_at:
        created_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

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
            estimated_wait_minutes,
            fare,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        passenger_id,
        pickup_latitude,
        pickup_longitude,
        destination,
        status,
        assigned_vehicle_id,
        search_radius_km,
        estimated_wait_minutes,
        fare,
        created_at
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


def get_ride_request(request_id):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("SELECT * FROM ride_requests WHERE id = ?", (request_id,))
    row = cursor.fetchone()
    connection.close()
    return dict(row) if row else None


def update_ride_status(request_id, status):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE ride_requests
        SET status = ?
        WHERE id = ?
    """, (status, request_id))

    connection.commit()
    connection.close()


# ============================================================
# DRIVER FUNCTIONS
# ============================================================

def get_all_drivers():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("SELECT * FROM drivers ORDER BY id ASC")
    rows = cursor.fetchall()
    connection.close()
    return [dict(row) for row in rows]


def get_driver(driver_id):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("SELECT * FROM drivers WHERE id = ?", (driver_id,))
    row = cursor.fetchone()
    connection.close()
    return dict(row) if row else None


def get_driver_by_vehicle(vehicle_id):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("SELECT * FROM drivers WHERE vehicle_id = ?", (vehicle_id,))
    row = cursor.fetchone()
    connection.close()
    return dict(row) if row else None


def update_driver_status(driver_id, status):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("UPDATE drivers SET status = ? WHERE id = ?", (status, driver_id))
    connection.commit()
    connection.close()


def record_driver_completion(vehicle_id, fare):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE drivers
        SET total_trips = total_trips + 1,
            earnings = earnings + ?,
            status = 'online'
        WHERE vehicle_id = ?
    """, (fare, vehicle_id))

    connection.commit()
    connection.close()


def delete_vehicle(vehicle_id):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("DELETE FROM vehicles WHERE id = ?", (vehicle_id,))
    cursor.execute("UPDATE drivers SET vehicle_id = NULL WHERE vehicle_id = ?", (vehicle_id,))
    connection.commit()
    connection.close()
