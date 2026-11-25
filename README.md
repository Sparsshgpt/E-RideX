# E-RideX — AI-Powered Campus E-Rickshaw Management & Mobility Platform

> **"Smarter Rides. Greener Tomorrow."**  
> *A production-grade, AI-powered electric mobility, fleet management, and intelligent dispatch platform designed for university campuses and gated institutions.*

---

## 1. Overview

**E-RideX** solves critical campus transit challenges — long passenger wait times, unavailable vehicles near class changeover hubs, uncoordinated dispatching, and lack of real-time spatial visibility.

The platform unifies **three responsive portals** into a single cohesive interface:
1. **Admin Enterprise Portal**: Complete operational visibility, live GPS fleet map, 8 core KPIs, demand prediction charts, AI recommendations, and route analytics.
2. **Passenger Booking App (Uber/Rapido Style)**: Instant pickup/drop selection across campus landmarks, fare estimates, proximity driver matching with expanding search radius, and live tracking.
3. **Driver Partner Console**: Shift management (online/offline toggle), incoming trip notifications, turn-by-turn ride tracking, and earnings tracking.

---

## 2. Technology Stack

- **Backend**: Python 3.13, FastAPI, Uvicorn, SQLite
- **Machine Learning**: Scikit-Learn (`RandomForestRegressor`, 150 estimators), Pandas, NumPy, Joblib
- **Frontend**: HTML5, Modern CSS Design System, Vanilla ES6+ JavaScript
- **Mapping & Spatial**: Leaflet.js, OpenStreetMap tiles, custom SVG animated rickshaw markers
- **Data Visualization**: Chart.js (interactive demand forecast 9 AM–10 PM)
- **Iconography**: Lucide Web Icons

---

## 3. Brand Identity & Design System

The UI combines the usability of Rapido, the clean simplicity of Uber, and modern enterprise SaaS ergonomics.

- **Primary Navy**: `#101828`
- **Sidebar Background**: `#101828`
- **Electric Teal**: `#13C9B7`
- **Accent Blue**: `#477BFF`
- **Main Background**: `#F3F6FA`
- **Card Background**: `#FFFFFF`
- **Primary Text**: `#101828`
- **Secondary Text**: `#667085`
- **Success / Warning / Danger**: `#22C55E` / `#F59E0B` / `#EF4444`
- **Typography**: Inter / System Sans-Serif

---

## 4. Key Platform Features

### A. Operations Dashboard (8 KPI Metrics)
- **Total Fleet**: Active registered vehicles in campus database.
- **Available Vehicles**: Ready for instant pickup.
- **On Trips (Busy)**: Actively serving a passenger ride.
- **In Maintenance**: Offline in charging depot or workshop.
- **Total Requests & Unanswered Requests**: Real-time passenger demand tracking.
- **Average Waiting Time**: Computed dynamically from trip wait times.
- **Current Predicted Demand**: Real-time output from the Random Forest model.

### B. Live Fleet Spatial Operations
- Real-time Leaflet map tracking vehicles at campus POIs (*Main Gate, Library, Hostel, Academic Block, Canteen*).
- Status-coded markers with animated pulse rings and battery level indicators.
- Non-destructive map updates: marker coordinates and popup stats update smoothly without closing open popups.

### C. AI Demand Prediction & Dispatch Advisor
- **Random Forest Model**: Trained on 2,160 rows of synthetic campus telemetry (90 days) with peak hour and weekend feature engineering.
- **Performance**: MAE = **1.79**, $R^2$ = **0.90**.
- **9 AM–10 PM Interactive Forecast Chart**: Displays projected demand across the day with peak window highlights.
- **AI Recommendation Engine**: Dark navy panel displaying real-time allocation suggestions, shortage alerts, and solar depot charging advisories.

### D. Intelligent Proximity Dispatch Engine
- Haversine geographic distance calculation.
- Dynamic wait time estimation ($v = 20\text{ km/h} + 1\text{ min buffer}$).
- Expanding search radius ($1.0\text{ km} \rightarrow 5.0\text{ km}$) if nearest vehicles are busy.
- Transparent fare calculation: Base fare ₹20 + ₹10 per km.

### E. Real-Time Vehicle Movement Simulator
- Integrated background thread controller (`SimulationController`).
- Bounded within campus GPS coordinates ($[31.245, 75.700]$ to $[31.258, 75.712]$).
- Re-centering drift towards campus core landmarks.
- Interactive controls: **Play / Pause / Step / Reset** via UI pill or REST endpoints.

---

## 5. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` or `/app` | Serves the single-page application frontend |
| `GET` | `/health` | Health check endpoint |
| `GET` | `/vehicles` | List all vehicles with battery, coordinates, and status |
| `GET` | `/vehicles/available` | List available vehicles sorted by distance |
| `POST` | `/vehicles` | Add a new e-rickshaw to the fleet |
| `PUT` | `/vehicles/{id}/status?status=...` | Update vehicle status (`available`, `busy`, `maintenance`) |
| `GET` | `/drivers` | List driver profiles, ratings, assigned vehicles, and earnings |
| `PUT` | `/drivers/{id}/status?status=...` | Update driver duty status (`online`, `offline`, `on_trip`) |
| `POST` | `/predict-demand` | Predict demand for specific `{hour, day, weather}` |
| `GET` | `/demand-forecast` | Get 9 AM–10 PM demand projection |
| `GET` | `/model-info` | Return ML algorithm, dataset rows, MAE, and $R^2$ score |
| `POST` | `/ride-request` | Find nearest driver or log unanswered request |
| `POST` | `/confirm-ride/{vehicle_id}` | Confirm driver match, mark vehicle busy, log assigned request |
| `POST` | `/rides/{id}/start` | Transition ride to `in_progress` |
| `POST` | `/rides/{id}/complete` | Complete ride, release vehicle to `available`, log driver earnings |
| `POST` | `/rides/{id}/cancel` | Cancel ride and free assigned vehicle |
| `GET` | `/ride-requests` | Return all ride history logs |
| `GET` | `/analytics/routes` | Aggregated route service rates and performance |
| `GET` | `/ai/recommendations` | Real-time fleet allocation recommendations |
| `GET` | `/simulation/status` | Current simulator state (`running`, `interval_seconds`, `step_count`) |
| `POST` | `/simulation/start` | Start periodic vehicle coordinate updates |
| `POST` | `/simulation/stop` | Pause vehicle simulation |
| `POST` | `/simulation/step` | Manually step vehicle coordinates once |
| `POST` | `/simulation/reset` | Reset vehicles to seed landmark positions |

---

## 6. Getting Started

### 1. Prerequisites
- Python 3.10+ (installed in virtual environment `.venv`)

### 2. Run the Platform
Run the unified FastAPI server:
```bash
# Activate virtual environment
.venv\Scripts\activate

# Start Uvicorn server on port 8000
python -m uvicorn backend.app.main:app --reload --port 8000
```

### 3. Open the Dashboard
Navigate your web browser to:
```
http://localhost:8000
```
or
```
http://127.0.0.1:8000/app
```

The application will load directly with live fleet telematics, active maps, and simulation controls.

---

## 7. Project Architecture

```
E-RideX/
├── ai/
│   ├── data/demand_data.csv          # Telemetry dataset (2,160 rows)
│   ├── demand_model.pkl              # Serialized Random Forest model
│   ├── model_info.json               # Cached model evaluation metrics
│   ├── demand_predictor.py           # ML training & inference pipeline
│   └── generate_dataset.py           # Campus demand generator
├── analytics/
│   └── route_analytics.py            # Route aggregation & service metrics
├── backend/
│   └── app/main.py                   # FastAPI application & REST endpoints
├── database/
│   ├── campus_locations.py           # Campus landmark POIs
│   ├── database.py                   # SQLite tables (vehicles, ride_requests, drivers)
│   ├── eridex.db                     # Active database file
│   └── vehicle_data.py               # Fleet seed data
├── dispatch/
│   ├── dispatch_engine.py            # Batch vehicle dispatch
│   └── ride_matching.py              # Haversine proximity & radius expansion matching
├── frontend/
│   ├── index.html                    # Redesigned UI shell (Admin, Passenger, Driver)
│   ├── style.css                     # Premium design system stylesheet
│   └── app.js                        # Client state, Leaflet maps & Chart.js integration
├── simulation/
│   └── vehicle_simulator.py          # Bounded campus coordinate simulator
├── backup_v1/                        # Original codebase checkpoint backup
└── requirements.txt                  # Python dependencies
```

---

## 8. License & Acknowledgments
Built with ❤️ for sustainable, zero-emission campus transit.  
© 2026 E-RideX Mobility Platform.
