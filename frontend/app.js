/**
 * E-RideX AI 2.0 — Production Core Application Controller
 * Brand: E-RideX | "Smarter Rides. Greener Tomorrow."
 */

// ============================================================
// 1. CONFIGURATION & STATE
// ============================================================

const API_BASE = (window.location.origin && window.location.origin.startsWith("http") && !window.location.origin.includes(":5500"))
    ? window.location.origin
    : "http://127.0.0.1:8000";

const CAMPUS_LOCATIONS = {
    "Main Gate": { lat: 31.250844, lon: 75.705091 },
    "Library": { lat: 31.253000, lon: 75.707000 },
    "Hostel": { lat: 31.247500, lon: 75.709000 },
    "Academic Block": { lat: 31.255000, lon: 75.703000 },
    "Canteen": { lat: 31.249000, lon: 75.702500 }
};

const state = {
    currentTab: "overview",
    currentRole: "admin", // "admin" | "passenger" | "driver"
    vehicles: [],
    drivers: [],
    rides: [],
    routeAnalytics: [],
    modelInfo: null,
    recommendations: [],
    forecastData: [],
    simulation: {
        running: false,
        interval_seconds: 3.0,
        step_count: 0
    },
    // Passenger Booking State
    pendingPassengerRide: null,
    activePassengerTrip: null,
    // Driver Console State
    currentDriverId: "DR01"
};

// Map instances & marker stores
let dashboardMap = null;
let fullMap = null;
let passengerMap = null;
let driverMap = null;

let dashboardMarkers = {};
let fullMapMarkers = {};
let passengerMarkers = {};
let driverMarkers = {};

let forecastChartInstance = null;
let refreshTimer = null;

// ============================================================
// 2. INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    initClock();
    initPopulateSelects();
    initMaps();
    initForecastChart();
    loadAllData();
    updatePassengerFarePreview();

    // Auto-refresh data every 8 seconds
    refreshTimer = setInterval(() => {
        loadAllData(true);
    }, 8000);

    if (window.lucide) {
        lucide.createIcons();
    }
});

function initClock() {
    function updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const clockElem = document.getElementById("liveClockText");
        if (clockElem) {
            clockElem.textContent = `${dateStr}, ${timeStr}`;
        }
    }
    updateClock();
    setInterval(updateClock, 1000);
}

function initPopulateSelects() {
    const dispatchSelect = document.getElementById("dispatchHourSelect");
    const predHourSelect = document.getElementById("predHourSelect");
    const currentHour = new Date().getHours();

    for (let h = 0; h < 24; h++) {
        const label = `${h.toString().padStart(2, '0')}:00 ${h >= 12 ? 'PM' : 'AM'}`;
        if (dispatchSelect && h >= 7 && h <= 22) {
            const opt = document.createElement("option");
            opt.value = h;
            opt.textContent = label;
            if (h === currentHour) opt.selected = true;
            dispatchSelect.appendChild(opt);
        }
        if (predHourSelect) {
            const opt = document.createElement("option");
            opt.value = h;
            opt.textContent = label;
            if (h === currentHour) opt.selected = true;
            predHourSelect.appendChild(opt);
        }
    }

    const daySelect = document.getElementById("predDaySelect");
    if (daySelect) {
        const todayWeekday = (new Date().getDay() + 6) % 7; // Monday = 0
        daySelect.value = todayWeekday;
    }
}

// ============================================================
// 3. NAVIGATION & ROLE SWITCHER
// ============================================================

function switchNav(tabId) {
    state.currentTab = tabId;

    document.querySelectorAll(".nav-link").forEach(btn => {
        if (btn.getAttribute("data-tab") === tabId) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    document.querySelectorAll(".view-panel").forEach(panel => {
        panel.classList.remove("active");
    });

    const activePanel = document.getElementById(`view-${tabId}`);
    if (activePanel) {
        activePanel.classList.add("active");
    }

    const titles = {
        "overview": { title: "Operations Dashboard", breadcrumb: "Overview" },
        "map": { title: "Live Fleet Spatial Operations", breadcrumb: "Live Fleet Map" },
        "ai-demand": { title: "AI Demand Intelligence", breadcrumb: "Demand Forecast" },
        "vehicles": { title: "Fleet Management & Telemetry", breadcrumb: "Vehicles" },
        "drivers": { title: "Driver Partner Network", breadcrumb: "Drivers" },
        "passengers": { title: "Campus Passenger Directory", breadcrumb: "Passengers" },
        "rides": { title: "Campus Ride Operations", breadcrumb: "Rides" },
        "analytics": { title: "Route Analytics & Service Gaps", breadcrumb: "Route Analytics" },
        "reports": { title: "Fleet Utilization Reports", breadcrumb: "Reports" },
        "settings": { title: "System & Campus Settings", breadcrumb: "Settings" }
    };

    const info = titles[tabId] || { title: "E-RideX AI 2.0", breadcrumb: tabId };
    document.getElementById("topbarTitle").textContent = info.title;
    document.getElementById("topbarBreadcrumb").textContent = info.breadcrumb;

    if (tabId === "overview" && dashboardMap) {
        setTimeout(() => dashboardMap.invalidateSize(), 150);
    } else if (tabId === "map" && fullMap) {
        setTimeout(() => fullMap.invalidateSize(), 150);
    }

    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (sidebar) sidebar.classList.remove("mobile-open");
    if (backdrop) backdrop.classList.remove("active");

    if (window.lucide) lucide.createIcons();
}

function switchRole(role) {
    state.currentRole = role;

    document.getElementById("roleBtnAdmin").classList.toggle("active", role === "admin");
    document.getElementById("roleBtnPassenger").classList.toggle("active", role === "passenger");
    document.getElementById("roleBtnDriver").classList.toggle("active", role === "driver");

    document.querySelectorAll(".view-panel").forEach(panel => panel.classList.remove("active"));

    if (role === "admin") {
        switchNav(state.currentTab || "overview");
    } else if (role === "passenger") {
        document.getElementById("view-passenger-mode").classList.add("active");
        document.getElementById("topbarTitle").textContent = "Campus Passenger App";
        document.getElementById("topbarBreadcrumb").textContent = "Ride Booking";
        if (passengerMap) {
            setTimeout(() => passengerMap.invalidateSize(), 150);
        }
    } else if (role === "driver") {
        document.getElementById("view-driver-mode").classList.add("active");
        document.getElementById("topbarTitle").textContent = "Driver Partner Console";
        document.getElementById("topbarBreadcrumb").textContent = "Shift Management";
        renderDriverConsole();
        if (driverMap) {
            setTimeout(() => driverMap.invalidateSize(), 150);
        }
    }

    if (window.lucide) lucide.createIcons();
}

function toggleSidebarCollapse() {
    const sidebar = document.getElementById("sidebar");
    const icon = document.getElementById("collapseIcon");
    if (sidebar) {
        sidebar.classList.toggle("collapsed");
        const isCollapsed = sidebar.classList.contains("collapsed");
        if (icon) {
            icon.setAttribute("data-lucide", isCollapsed ? "chevrons-right" : "chevrons-left");
            if (window.lucide) lucide.createIcons();
        }
        setTimeout(() => {
            if (dashboardMap) dashboardMap.invalidateSize();
            if (fullMap) fullMap.invalidateSize();
            if (passengerMap) passengerMap.invalidateSize();
            if (driverMap) driverMap.invalidateSize();
        }, 250);
    }
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (sidebar) sidebar.classList.toggle("mobile-open");
    if (backdrop) backdrop.classList.toggle("active");
}

// ============================================================
// 4. MAP INITIALIZATION & SMOOTH MARKER UPDATES
// ============================================================

function initMaps() {
    const center = [31.2510, 75.7050];

    // 1. Dashboard Overview Map
    const dashElem = document.getElementById("dashboardVehicleMap");
    if (dashElem && !dashboardMap) {
        dashboardMap = L.map("dashboardVehicleMap", { zoomControl: true }).setView(center, 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; OpenStreetMap contributors | E-RideX',
            maxZoom: 19
        }).addTo(dashboardMap);
        addCampusPOIs(dashboardMap);
    }

    // 2. Full Live Fleet Map
    const fullElem = document.getElementById("fullVehicleMap");
    if (fullElem && !fullMap) {
        fullMap = L.map("fullVehicleMap", { zoomControl: true }).setView(center, 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; OpenStreetMap contributors | E-RideX',
            maxZoom: 19
        }).addTo(fullMap);
        addCampusPOIs(fullMap);
    }

    // 3. Passenger Booking Map (Section 4)
    const passElem = document.getElementById("passengerBookingMap");
    if (passElem && !passengerMap) {
        passengerMap = L.map("passengerBookingMap", { zoomControl: true }).setView(center, 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; OpenStreetMap contributors | E-RideX Passenger',
            maxZoom: 19
        }).addTo(passengerMap);
        addCampusPOIs(passengerMap);
    }

    // 4. Driver Partner Console Map (Section 5)
    const driverElem = document.getElementById("driverConsoleMap");
    if (driverElem && !driverMap) {
        driverMap = L.map("driverConsoleMap", { zoomControl: true }).setView(center, 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; OpenStreetMap contributors | E-RideX Driver',
            maxZoom: 19
        }).addTo(driverMap);
        addCampusPOIs(driverMap);
    }
}

function addCampusPOIs(mapInstance) {
    if (!mapInstance) return;

    for (const [name, loc] of Object.entries(CAMPUS_LOCATIONS)) {
        const poiIcon = L.divIcon({
            className: 'custom-poi-marker',
            html: `
                <div style="
                    background: #101828;
                    color: #FFFFFF;
                    font-size: 10px;
                    font-weight: 700;
                    padding: 2px 7px;
                    border-radius: 4px;
                    border: 1px solid #13C9B7;
                    white-space: nowrap;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                ">📍 ${name}</div>
            `,
            iconAnchor: [30, 20]
        });

        L.marker([loc.lat, loc.lon], { icon: poiIcon })
            .bindPopup(`<strong>Campus Stand: ${name}</strong><br>Designated E-Rickshaw Pickup Hub`)
            .addTo(mapInstance);
    }
}

function updateMapMarkers(mapInstance, markerStore, vehicles) {
    if (!mapInstance) return;

    vehicles.forEach(vehicle => {
        const id = vehicle.id;
        const status = vehicle.status || "available";
        const battery = vehicle.battery ?? 80;
        const lat = vehicle.latitude;
        const lon = vehicle.longitude;

        let statusClass = "marker-avail";
        let statusBadge = "badge-success";
        if (status === "busy") {
            statusClass = "marker-busy";
            statusBadge = "badge-danger";
        } else if (status === "maintenance") {
            statusClass = "marker-maint";
            statusBadge = "badge-warning";
        }

        const customHtml = `
            <div class="marker-pin ${statusClass}" title="${id} • ${status}">
                <span>🛺</span>
                <span class="marker-battery-pill">${battery}%</span>
            </div>
        `;

        const icon = L.divIcon({
            className: "custom-rickshaw-marker",
            html: customHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const popupContent = `
            <div style="font-family:'Inter',sans-serif; min-width:180px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <strong style="font-size:14px; color:#101828;">${id}</strong>
                    <span class="badge ${statusBadge}">${status}</span>
                </div>
                <div style="font-size:12px; color:#667085; line-height:1.6;">
                    🔋 Battery Level: <strong>${battery}%</strong><br>
                    👥 Passenger Capacity: <strong>${vehicle.capacity || 4} Seater</strong><br>
                    📍 Coordinates: <strong>${lat.toFixed(4)}, ${lon.toFixed(4)}</strong>
                </div>
                <div style="margin-top:8px; display:flex; gap:6px;">
                    <button onclick="quickToggleVehicleStatus('${id}', '${status === 'available' ? 'maintenance' : 'available'}')"
                            style="flex:1; background:#101828; color:#fff; border:none; padding:4px 8px; font-size:10px; border-radius:4px; cursor:pointer;">
                        Toggle Status
                    </button>
                </div>
            </div>
        `;

        if (markerStore[id]) {
            markerStore[id].setLatLng([lat, lon]);
            markerStore[id].setIcon(icon);
            markerStore[id].setPopupContent(popupContent);
        } else {
            const marker = L.marker([lat, lon], { icon: icon }).addTo(mapInstance);
            marker.bindPopup(popupContent);
            markerStore[id] = marker;
        }
    });

    const currentIds = new Set(vehicles.map(v => v.id));
    for (const [id, marker] of Object.entries(markerStore)) {
        if (!currentIds.has(id)) {
            marker.remove();
            delete markerStore[id];
        }
    }
}

function recenterMap(mapInstance) {
    if (mapInstance) {
        mapInstance.setView([31.2510, 75.7050], 15, { animate: true });
    }
}

function filterMapVehicles(filterValue) {
    let filtered = state.vehicles;
    if (filterValue !== "all") {
        filtered = state.vehicles.filter(v => v.status === filterValue);
    }
    updateMapMarkers(fullMap, fullMapMarkers, filtered);
}

// ============================================================
// 5. CHART.JS DEMAND FORECAST (9 AM - 10 PM)
// ============================================================

function initForecastChart() {
    const ctx = document.getElementById("demandForecastChart");
    if (!ctx) return;

    const hours = ["9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM", "10 PM"];
    const initialData = [8, 12, 10, 14, 15, 11, 9, 16, 18, 17, 13, 8, 5, 4];

    forecastChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [{
                label: 'Projected Demand',
                data: initialData,
                borderColor: '#477BFF',
                backgroundColor: 'rgba(71, 123, 255, 0.10)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#101828',
                pointBorderColor: '#477BFF',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#101828',
                    titleColor: '#FFFFFF',
                    bodyColor: '#13C9B7',
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => `Demand: ${ctx.parsed.y} e-rickshaws needed`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#667085', font: { size: 11, family: 'Inter' } }
                },
                y: {
                    grid: { color: '#E4E7EC' },
                    ticks: {
                        color: '#667085',
                        font: { size: 11, family: 'Inter' },
                        stepSize: 4
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

function updateForecastChart(forecast) {
    if (!forecastChartInstance || !forecast || forecast.length === 0) return;

    const labels = forecast.map(item => {
        const h = item.hour;
        const suffix = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        return `${displayH} ${suffix}`;
    });

    const values = forecast.map(item => item.predicted_demand);

    forecastChartInstance.data.labels = labels;
    forecastChartInstance.data.datasets[0].data = values;
    forecastChartInstance.update();
}

// ============================================================
// 6. DATA FETCHING & SYNCHRONIZATION
// ============================================================

async function loadAllData(silent = false) {
    try {
        const [
            vehiclesRes,
            ridesRes,
            routesRes,
            forecastRes,
            recsRes,
            driversRes,
            simRes,
            modelRes
        ] = await Promise.all([
            fetch(`${API_BASE}/vehicles`).then(r => r.json()).catch(() => ({ vehicles: [] })),
            fetch(`${API_BASE}/ride-requests`).then(r => r.json()).catch(() => ({ requests: [] })),
            fetch(`${API_BASE}/analytics/routes`).then(r => r.json()).catch(() => ({ routes: [] })),
            fetch(`${API_BASE}/demand-forecast`).then(r => r.json()).catch(() => ({ forecast: [] })),
            fetch(`${API_BASE}/ai/recommendations`).then(r => r.json()).catch(() => ({ recommendations: [] })),
            fetch(`${API_BASE}/drivers`).then(r => r.json()).catch(() => ({ drivers: [] })),
            fetch(`${API_BASE}/simulation/status`).then(r => r.json()).catch(() => ({ running: false })),
            fetch(`${API_BASE}/model-info`).then(r => r.json()).catch(() => null)
        ]);

        state.vehicles = vehiclesRes.vehicles || [];
        state.rides = ridesRes.requests || [];
        state.routeAnalytics = routesRes.routes || [];
        state.forecastData = forecastRes.forecast || [];
        state.recommendations = recsRes.recommendations || [];
        state.drivers = driversRes.drivers || [];
        state.simulation = simRes || { running: false };
        if (modelRes) state.modelInfo = modelRes;

        renderKPIs(recsRes);
        renderMaps();
        renderRecentRides();
        renderVehiclesTable();
        renderDriversTable();
        renderPassengersTable();
        renderAllRidesTable();
        renderAIRecommendations();
        renderRouteAnalytics();
        renderModelMetadata();
        renderSimulationStatus();

        if (state.forecastData.length > 0) {
            updateForecastChart(state.forecastData);
        }

        if (state.currentRole === "driver") {
            renderDriverConsole();
        }

        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error("[E-RideX] Error loading platform data:", err);
        if (!silent) {
            showToast("Failed to fetch live platform data from API", "danger");
        }
    }
}

// ============================================================
// 7. RENDER FUNCTIONS
// ============================================================

function renderKPIs(recsRes) {
    const totalVehicles = state.vehicles.length;
    const available = state.vehicles.filter(v => v.status === "available").length;
    const busy = state.vehicles.filter(v => v.status === "busy").length;
    const maint = state.vehicles.filter(v => v.status === "maintenance").length;

    const totalRides = state.rides.length;
    const unanswered = state.rides.filter(r => r.status === "unanswered").length;

    const waitTimes = state.rides
        .filter(r => r.estimated_wait_minutes != null)
        .map(r => Number(r.estimated_wait_minutes));
    const avgWait = waitTimes.length > 0
        ? (waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length).toFixed(1)
        : "1.3";

    const predDemand = recsRes?.predicted_demand ?? (state.forecastData[0]?.predicted_demand || 7);

    safeSetText("kpiTotalVehicles", totalVehicles);
    safeSetText("kpiAvailableVehicles", available);
    safeSetText("kpiBusyVehicles", busy);
    safeSetText("kpiMaintVehicles", maint);
    safeSetText("kpiTotalRequests", totalRides);
    safeSetText("kpiUnansweredRequests", unanswered);
    safeSetText("kpiAverageWait", `${avgWait} min`);
    safeSetText("kpiPredictedDemand", `${predDemand} rides/hr`);

    safeSetText("sidebarAvailBadge", available);
    safeSetText("sidebarRidesBadge", totalRides);
    safeSetText("sidebarHealthMeta", `${available} / ${totalVehicles} Available`);
    safeSetText("passengerNearbyCountBadge", `${available} Available Nearby`);

    const avgBatt = totalVehicles > 0
        ? Math.round(state.vehicles.reduce((acc, v) => acc + (v.battery || 80), 0) / totalVehicles)
        : 80;
    safeSetText("sidebarBatteryMeta", `Avg ${avgBatt}% Batt`);

    const progressPercent = totalVehicles > 0 ? (available / totalVehicles) * 100 : 0;
    const progressFill = document.getElementById("sidebarProgressFill");
    if (progressFill) progressFill.style.width = `${progressPercent}%`;
}

function renderMaps() {
    updateMapMarkers(dashboardMap, dashboardMarkers, state.vehicles);
    updateMapMarkers(fullMap, fullMapMarkers, state.vehicles);
    updateMapMarkers(passengerMap, passengerMarkers, state.vehicles);
    updateMapMarkers(driverMap, driverMarkers, state.vehicles);
}

function renderRecentRides() {
    const tbody = document.getElementById("recentRidesTableBody");
    if (!tbody) return;

    if (state.rides.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:#667085;">No campus rides recorded yet.</td></tr>`;
        return;
    }

    const recents = state.rides.slice(0, 6);
    tbody.innerHTML = recents.map(ride => {
        const fare = ride.fare != null ? `₹${Number(ride.fare).toFixed(1)}` : "₹25.0";
        const vehicle = ride.assigned_vehicle_id || '<span style="color:#98A2B3;">Unassigned</span>';
        const badge = getStatusBadge(ride.status);

        return `
            <tr>
                <td><strong>#REQ-${ride.id}</strong></td>
                <td>${ride.passenger_id}</td>
                <td>Main Gate → ${ride.destination}</td>
                <td><strong>${vehicle}</strong></td>
                <td>${fare}</td>
                <td>${badge}</td>
            </tr>
        `;
    }).join("");
}

function renderVehiclesTable() {
    const tbody = document.getElementById("vehiclesTableBody");
    if (!tbody) return;

    tbody.innerHTML = state.vehicles.map(v => {
        const batt = v.battery ?? 80;
        let battColor = "batt-high";
        if (batt < 30) battColor = "batt-low";
        else if (batt < 70) battColor = "batt-mid";

        const driver = state.drivers.find(d => d.vehicle_id === v.id);
        const driverName = driver ? `${driver.name} (${driver.id})` : '<span style="color:#98A2B3;">Unassigned</span>';

        return `
            <tr>
                <td><strong>${v.id}</strong></td>
                <td>${getStatusBadge(v.status)}</td>
                <td>
                    <div class="battery-wrapper">
                        <div class="battery-bar"><div class="battery-fill ${battColor}" style="width:${batt}%;"></div></div>
                        <span style="font-weight:600; font-size:12px;">${batt}%</span>
                    </div>
                </td>
                <td>${v.capacity || 4} Seater</td>
                <td><code style="font-size:11.5px; color:#477BFF;">${v.latitude.toFixed(4)}, ${v.longitude.toFixed(4)}</code></td>
                <td>${driverName}</td>
                <td>
                    <select class="form-select" style="width:130px; height:32px; font-size:12px;"
                            onchange="quickToggleVehicleStatus('${v.id}', this.value)">
                        <option value="available" ${v.status === 'available' ? 'selected' : ''}>Available</option>
                        <option value="busy" ${v.status === 'busy' ? 'selected' : ''}>Busy</option>
                        <option value="maintenance" ${v.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                    </select>
                </td>
            </tr>
        `;
    }).join("");
}

function renderDriversTable() {
    const tbody = document.getElementById("driversTableBody");
    if (!tbody) return;

    tbody.innerHTML = state.drivers.map(d => {
        const isOnline = d.status === "online";
        return `
            <tr>
                <td><strong>${d.id}</strong></td>
                <td>${d.name}</td>
                <td>${d.phone}</td>
                <td><strong>${d.vehicle_id || 'N/A'}</strong></td>
                <td>${getStatusBadge(d.status)}</td>
                <td><span style="color:#F59E0B; font-weight:700;">★ ${d.rating || 4.8}</span></td>
                <td>${d.total_trips || 0}</td>
                <td><strong>₹${(d.earnings || 0).toLocaleString()}</strong></td>
                <td>
                    <button class="btn ${isOnline ? 'btn-outline' : 'btn-primary'} btn-sm"
                            onclick="toggleDriverStatus('${d.id}', '${isOnline ? 'offline' : 'online'}')">
                        ${isOnline ? 'Go Offline' : 'Go Online'}
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

function renderPassengersTable() {
    const tbody = document.getElementById("passengersTableBody");
    if (!tbody) return;

    const pMap = {};
    state.rides.forEach(r => {
        const id = r.passenger_id;
        if (!pMap[id]) {
            pMap[id] = { id, total: 0, completed: 0, unanswered: 0, lastDest: r.destination, lastActive: r.created_at || 'Recent' };
        }
        pMap[id].total++;
        if (r.status === 'completed' || r.status === 'assigned') pMap[id].completed++;
        if (r.status === 'unanswered') pMap[id].unanswered++;
    });

    const pList = Object.values(pMap);
    if (pList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#667085;">No passenger history recorded yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = pList.map(p => `
        <tr>
            <td><strong>${p.id}</strong></td>
            <td>${p.total}</td>
            <td><span class="badge badge-success">${p.completed} Completed</span></td>
            <td><span class="badge badge-danger">${p.unanswered} Unanswered</span></td>
            <td>${p.lastDest}</td>
            <td><span style="font-size:11.5px; color:#667085;">${p.lastActive}</span></td>
        </tr>
    `).join("");
}

function renderAllRidesTable() {
    const tbody = document.getElementById("allRidesTableBody");
    if (!tbody) return;

    if (state.rides.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:24px; color:#667085;">No ride requests logged in database.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.rides.map(r => {
        const fare = r.fare != null ? `₹${Number(r.fare).toFixed(1)}` : "₹25.0";
        const wait = r.estimated_wait_minutes != null ? `${r.estimated_wait_minutes} min` : "—";
        const vehicle = r.assigned_vehicle_id ? `<strong>${r.assigned_vehicle_id}</strong>` : '<span style="color:#98A2B3;">None</span>';

        let actionBtns = "";
        if (r.status === "assigned") {
            actionBtns = `
                <button class="btn btn-navy btn-sm" onclick="startRideAction(${r.id})">Start</button>
                <button class="btn btn-primary btn-sm" onclick="completeRideAction(${r.id})">Complete</button>
            `;
        } else if (r.status === "in_progress") {
            actionBtns = `
                <button class="btn btn-primary btn-sm" onclick="completeRideAction(${r.id})">Complete Drop</button>
            `;
        } else {
            actionBtns = `<span style="font-size:11px; color:#98A2B3;">Closed</span>`;
        }

        return `
            <tr>
                <td><strong>#REQ-${r.id}</strong></td>
                <td>${r.passenger_id}</td>
                <td>Main Gate</td>
                <td>${r.destination}</td>
                <td>${vehicle}</td>
                <td>${wait}</td>
                <td><strong>${fare}</strong></td>
                <td>${getStatusBadge(r.status)}</td>
                <td><div style="display:flex; gap:6px;">${actionBtns}</div></td>
            </tr>
        `;
    }).join("");
}

function renderAIRecommendations() {
    const container = document.getElementById("aiRecList");
    if (!container) return;

    if (state.recommendations.length === 0) {
        container.innerHTML = `
            <div class="rec-item">
                <span class="rec-name">All campus routes currently operating within optimal parameters.</span>
            </div>
        `;
        return;
    }

    container.innerHTML = state.recommendations.map(rec => `
        <div class="rec-item">
            <div class="rec-top">
                <span class="rec-tag ${rec.priority || 'normal'}">${rec.badge || 'Advisory'}</span>
            </div>
            <div class="rec-name">${rec.title}</div>
            <div class="rec-desc">${rec.description}</div>
            <button class="rec-action-btn" onclick="executeRecommendationAction('${rec.action}')">${rec.action}</button>
        </div>
    `).join("");
}

function renderRouteAnalytics() {
    const tbody = document.getElementById("routeAnalyticsTableBody");
    if (!tbody) return;

    if (state.routeAnalytics.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#667085;">No route analytics recorded yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.routeAnalytics.map(route => {
        let levelBadge = "badge-success";
        if (route.service_level === "poor") levelBadge = "badge-danger";
        else if (route.service_level === "moderate") levelBadge = "badge-warning";

        return `
            <tr>
                <td><strong>${route.route}</strong></td>
                <td>${route.total_requests}</td>
                <td>${route.assigned_requests}</td>
                <td>${route.unanswered_requests}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="flex:1; height:6px; background:#E4E7EC; border-radius:99px; overflow:hidden;">
                            <div style="width:${route.service_rate_percent}%; height:100%; background:${route.service_rate_percent < 50 ? '#EF4444' : '#22C55E'};"></div>
                        </div>
                        <span style="font-weight:600; font-size:12px;">${route.service_rate_percent}%</span>
                    </div>
                </td>
                <td>${route.average_wait_minutes} min</td>
                <td><span class="badge ${levelBadge}">${route.service_level}</span></td>
            </tr>
        `;
    }).join("");
}

function renderModelMetadata() {
    if (!state.modelInfo) return;
    safeSetText("metaAlgorithm", state.modelInfo.algorithm || "Random Forest Regressor");
    safeSetText("metaDataset", `${state.modelInfo.dataset_rows || 2160} rows`);
    safeSetText("metaMAE", state.modelInfo.mae ?? 1.79);
    safeSetText("metaR2", state.modelInfo.r2_score ?? 0.90);
}

function renderSimulationStatus() {
    const isRunning = state.simulation.running;
    const light = document.getElementById("simStatusLight");
    const label = document.getElementById("simStatusLabel");
    const playIcon = document.getElementById("simPlayIcon");

    if (light) light.classList.toggle("running", isRunning);
    if (label) label.textContent = isRunning ? `Sim: Running (${state.simulation.interval_seconds}s)` : "Sim: Idle";
    if (playIcon) {
        playIcon.setAttribute("data-lucide", isRunning ? "pause" : "play");
        if (window.lucide) lucide.createIcons();
    }
}

// ============================================================
// 8. SIMULATION CONTROLLER
// ============================================================

async function toggleSimulation() {
    const isRunning = state.simulation.running;
    const endpoint = isRunning ? "/simulation/stop" : "/simulation/start";

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { method: "POST" });
        const data = await res.json();
        state.simulation = data.status || { running: !isRunning };
        renderSimulationStatus();
        showToast(isRunning ? "Simulation paused." : "Simulation loop started (3s interval)", "teal");
        loadAllData(true);
    } catch (e) {
        showToast("Simulation control error: " + e.message, "danger");
    }
}

async function stepSimulation() {
    try {
        const res = await fetch(`${API_BASE}/simulation/step`, { method: "POST" });
        const data = await res.json();
        showToast(`Simulated 1 step. ${data.vehicles_updated?.length || 0} vehicles moved.`, "teal");
        loadAllData(true);
    } catch (e) {
        showToast("Simulation step error: " + e.message, "danger");
    }
}

async function resetSimulation() {
    try {
        await fetch(`${API_BASE}/simulation/reset`, { method: "POST" });
        showToast("Vehicles reset to default landmark stands.", "success");
        loadAllData(true);
    } catch (e) {
        showToast("Simulation reset error: " + e.message, "danger");
    }
}

// ============================================================
// 9. VEHICLE & RIDE LIFECYCLE ACTIONS
// ============================================================

async function quickToggleVehicleStatus(vehicleId, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/vehicles/${vehicleId}/status?status=${newStatus}`, { method: "PUT" });
        if (!res.ok) throw new Error("Status update failed");
        showToast(`Vehicle ${vehicleId} updated to ${newStatus}`, "success");
        loadAllData(true);
    } catch (err) {
        showToast(`Failed to update ${vehicleId}: ${err.message}`, "danger");
    }
}

function openAddVehicleModal() {
    const modal = document.getElementById("addVehicleModal");
    if (modal) modal.classList.add("show");
}

function closeAddVehicleModal() {
    const modal = document.getElementById("addVehicleModal");
    if (modal) modal.classList.remove("show");
}

async function handleAddVehicleSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("newVehicleId").value.trim().toUpperCase();
    const battery = parseInt(document.getElementById("newVehicleBattery").value, 10);
    const capacity = parseInt(document.getElementById("newVehicleCapacity").value, 10);
    const landmark = document.getElementById("newVehicleLocation").value;

    const coords = CAMPUS_LOCATIONS[landmark] || { lat: 31.250844, lon: 75.705091 };

    try {
        const res = await fetch(`${API_BASE}/vehicles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: id,
                status: "available",
                latitude: coords.lat,
                longitude: coords.lon,
                distance: 0.5,
                battery: battery,
                capacity: capacity
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Failed to add vehicle");
        }

        closeAddVehicleModal();
        showToast(`E-Rickshaw ${id} successfully added to fleet!`, "success");
        loadAllData();
    } catch (err) {
        showToast(err.message, "danger");
    }
}

async function startRideAction(rideId) {
    try {
        const res = await fetch(`${API_BASE}/rides/${rideId}/start`, { method: "POST" });
        if (!res.ok) throw new Error("Could not start ride");
        showToast(`Ride #REQ-${rideId} marked in progress.`, "teal");
        loadAllData(true);
    } catch (e) {
        showToast(e.message, "danger");
    }
}

async function completeRideAction(rideId) {
    try {
        const res = await fetch(`${API_BASE}/rides/${rideId}/complete`, { method: "POST" });
        if (!res.ok) throw new Error("Could not complete ride");
        showToast(`Ride #REQ-${rideId} completed. Vehicle released to available!`, "success");
        loadAllData(true);
    } catch (e) {
        showToast(e.message, "danger");
    }
}

async function toggleDriverStatus(driverId, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/drivers/${driverId}/status?status=${newStatus}`, { method: "PUT" });
        if (!res.ok) throw new Error("Could not update driver status");
        showToast(`Driver ${driverId} marked ${newStatus}`, "success");
        loadAllData(true);
    } catch (e) {
        showToast(e.message, "danger");
    }
}

// ============================================================
// 10. INTELLIGENT BATCH DISPATCH & DEMAND SIMULATION
// ============================================================

async function handleBatchDispatch(e) {
    e.preventDefault();
    const hour = parseInt(document.getElementById("dispatchHourSelect").value, 10);
    const weather = parseInt(document.getElementById("dispatchWeatherSelect").value, 10);
    const today = (new Date().getDay() + 6) % 7;

    const feedback = document.getElementById("dispatchFeedback");
    if (feedback) {
        feedback.style.display = "block";
        feedback.innerHTML = `<span style="color:#667085; font-size:12px;">Running intelligent fleet dispatch...</span>`;
    }

    try {
        const res = await fetch(`${API_BASE}/dispatch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hour, day: today, weather })
        });
        const data = await res.json();

        if (feedback) {
            feedback.innerHTML = `
                <div style="background:var(--success-subtle); color:#15803D; padding:10px 14px; border-radius:6px; font-size:12px; line-height:1.4;">
                    <strong>Dispatch Completed:</strong> ${data.vehicles_dispatched} e-rickshaws dispatched to meet predicted demand of ${data.predicted_demand}. Status: <code>${data.dispatch_status}</code>.
                </div>
            `;
        }
        showToast(`Dispatched ${data.vehicles_dispatched} vehicles for demand (${data.predicted_demand})`, "success");
        loadAllData(true);
    } catch (err) {
        if (feedback) {
            feedback.innerHTML = `<span style="color:#EF4444; font-size:12px;">Dispatch failed: ${err.message}</span>`;
        }
    }
}

async function handleDemandPrediction(e) {
    e.preventDefault();
    const hour = parseInt(document.getElementById("predHourSelect").value, 10);
    const day = parseInt(document.getElementById("predDaySelect").value, 10);
    const weather = parseInt(document.getElementById("predWeatherSelect").value, 10);

    try {
        const res = await fetch(`${API_BASE}/predict-demand`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hour, day, weather })
        });
        const data = await res.json();
        const resultVal = document.getElementById("predictionResultValue");
        if (resultVal) {
            resultVal.textContent = `${data.predicted_demand} Rides`;
        }
        showToast(`Projected demand: ${data.predicted_demand} e-rickshaws needed`, "teal");
    } catch (err) {
        showToast(err.message, "danger");
    }
}

function executeRecommendationAction(action) {
    if (action.includes("Dispatch") || action.includes("Staging")) {
        const currentH = new Date().getHours();
        document.getElementById("dispatchHourSelect").value = currentH;
        handleBatchDispatch(new Event("submit"));
    } else if (action.includes("Charging")) {
        showToast("Routing low battery vehicles to Academic Block solar station.", "teal");
    } else {
        showToast(`Executing action: ${action}`, "success");
    }
}

// ============================================================
// 11. PASSENGER APP BOOKING EXPERIENCE (Section 4 - Uber/Rapido)
// ============================================================

function updatePassengerFarePreview() {
    const pickup = document.getElementById("passengerPickupSelect")?.value || "Main Gate";
    const dest = document.getElementById("passengerDestSelect")?.value || "Library";

    const pCoords = CAMPUS_LOCATIONS[pickup] || { lat: 31.2508, lon: 75.7051 };
    const dCoords = CAMPUS_LOCATIONS[dest] || { lat: 31.2530, lon: 75.7070 };

    // Calculate approximate Haversine distance
    const dist = calculateHaversineDistance(pCoords.lat, pCoords.lon, dCoords.lat, dCoords.lon);
    const fare = Math.max(20, Math.round(20.0 + (dist * 10.0)));
    const wait = Math.max(1, Math.round((dist / 20.0) * 60 + 1));

    safeSetText("passengerFareEstimate", `₹${fare}.0`);
    safeSetText("passengerTierInfo", `~${wait} min wait • 4 Seater Electric`);

    // Update active landmark chip styling
    document.querySelectorAll(".landmark-chip").forEach(chip => {
        chip.classList.toggle("active", chip.textContent.includes(dest));
    });
}

function selectDestinationChip(landmark) {
    const destSelect = document.getElementById("passengerDestSelect");
    if (destSelect) {
        destSelect.value = landmark;
        updatePassengerFarePreview();
    }
}

async function submitPassengerRideRequest() {
    const passengerId = document.getElementById("passengerIdInput").value.trim() || "STU-2026";
    const pickupLocName = document.getElementById("passengerPickupSelect").value;
    const destLocName = document.getElementById("passengerDestSelect").value;

    if (pickupLocName === destLocName) {
        showToast("Pickup and Drop locations cannot be identical", "warning");
        return;
    }

    const pickupCoords = CAMPUS_LOCATIONS[pickupLocName];
    const btn = document.getElementById("btnFindRickshaw");
    if (btn) btn.innerHTML = `<i data-lucide="loader" class="spin"></i> Matching Nearest E-Rickshaw...`;

    try {
        const res = await fetch(`${API_BASE}/ride-request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                passenger_id: passengerId,
                pickup_latitude: pickupCoords.lat,
                pickup_longitude: pickupCoords.lon,
                destination: destLocName
            })
        });

        const data = await res.json();
        if (btn) btn.innerHTML = `<i data-lucide="search"></i> Find Nearby E-Rickshaw`;

        if (data.status === "driver_found") {
            state.pendingPassengerRide = {
                passenger_id: passengerId,
                pickup_latitude: pickupCoords.lat,
                pickup_longitude: pickupCoords.lon,
                destination: destLocName,
                vehicle_id: data.driver.id,
                search_radius_km: data.search_radius_km,
                estimated_wait_minutes: data.driver.estimated_wait_minutes,
                fare: data.fare || 25.0
            };

            document.getElementById("passengerBookingStep1").style.display = "none";
            document.getElementById("passengerBookingStep2").style.display = "block";

            safeSetText("matchedVehicleId", data.driver.id);
            safeSetText("matchedVehicleFare", `₹${data.fare || 25.0}`);
            safeSetText("matchedDistance", `${data.driver.distance_km} km`);
            safeSetText("matchedWaitTime", `${data.driver.estimated_wait_minutes} min`);
            safeSetText("matchedRadius", `${data.search_radius_km} km`);
            safeSetText("matchedBattery", `${data.driver.battery || 85}% Batt`);

            showToast(`Driver found nearby! E-Rickshaw ${data.driver.id}`, "success");
        } else {
            showToast(data.message || "No driver found within campus range", "warning");
        }

        if (window.lucide) lucide.createIcons();
    } catch (err) {
        if (btn) btn.innerHTML = `<i data-lucide="search"></i> Find Nearby E-Rickshaw`;
        showToast("Ride request error: " + err.message, "danger");
    }
}

async function confirmPassengerRide() {
    const ride = state.pendingPassengerRide;
    if (!ride) return;

    try {
        const res = await fetch(`${API_BASE}/confirm-ride/${ride.vehicle_id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ride)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Confirmation failed");

        state.activePassengerTrip = {
            ...ride,
            request_id: data.request_id
        };

        document.getElementById("passengerBookingStep2").style.display = "none";
        document.getElementById("passengerBookingStep3").style.display = "block";

        safeSetText("activeVehiclePlate", ride.vehicle_id);
        safeSetText("activeRideIdTag", `#REQ-${data.request_id}`);
        safeSetText("activeRideFareDisplay", `₹${ride.fare.toFixed(1)}`);

        showToast("Ride confirmed! Your e-rickshaw is arriving.", "success");
        loadAllData(true);
        if (window.lucide) lucide.createIcons();
    } catch (err) {
        showToast(err.message, "danger");
    }
}

function cancelPassengerMatch() {
    state.pendingPassengerRide = null;
    document.getElementById("passengerBookingStep2").style.display = "none";
    document.getElementById("passengerBookingStep1").style.display = "block";
    showToast("Ride search cancelled.", "teal");
}

function passengerCompleteRideMock() {
    if (state.activePassengerTrip) {
        completeRideAction(state.activePassengerTrip.request_id);
    }
    document.getElementById("passengerBookingStep3").style.display = "none";
    document.getElementById("passengerBookingStep4").style.display = "block";
    showToast("Trip finished! Hope you had a smooth ride.", "success");
}

function resetPassengerView() {
    state.pendingPassengerRide = null;
    state.activePassengerTrip = null;
    document.getElementById("passengerBookingStep4").style.display = "none";
    document.getElementById("passengerBookingStep1").style.display = "block";
}

function setRating(stars) {
    const starsContainer = document.getElementById("ratingStars");
    if (starsContainer) {
        starsContainer.innerHTML = [1, 2, 3, 4, 5].map(i =>
            `<span onclick="setRating(${i})" style="color:${i <= stars ? '#F59E0B' : '#E4E7EC'};">★</span>`
        ).join("");
    }
    showToast(`Thank you for rating ${stars} stars!`, "success");
}

// ============================================================
// 12. DRIVER PARTNER CONSOLE (Section 5)
// ============================================================

function renderDriverConsole() {
    const driver = state.drivers.find(d => d.id === state.currentDriverId) || state.drivers[0];
    if (!driver) return;

    safeSetText("driverHeroName", driver.name);
    safeSetText("driverVehicleId", driver.vehicle_id || "ER01");
    safeSetText("driverTodayEarnings", `₹${(driver.earnings || 3420).toLocaleString()}`);
    safeSetText("driverTotalTrips", driver.total_trips || 124);

    const isOnline = driver.status === "online";
    const badge = document.getElementById("driverShiftBadge");
    const toggleBtn = document.getElementById("btnToggleDriverOnline");

    if (badge) {
        badge.textContent = isOnline ? "Online" : "Offline";
        badge.className = isOnline ? "badge badge-teal" : "badge badge-navy";
    }

    if (toggleBtn) {
        toggleBtn.textContent = isOnline ? "Switch Offline" : "Go Online";
    }

    // Check active assigned ride for this vehicle
    const activeRide = state.rides.find(r => r.assigned_vehicle_id === driver.vehicle_id && (r.status === "assigned" || r.status === "in_progress"));
    const contentBox = document.getElementById("driverTripContent");

    if (contentBox) {
        if (activeRide) {
            contentBox.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="badge ${activeRide.status === 'in_progress' ? 'badge-teal' : 'badge-warning'}">
                            ${activeRide.status === 'in_progress' ? 'Trip In Progress' : 'New Assignment'}
                        </span>
                        <strong style="color:var(--text-primary); font-size:15px;">₹${activeRide.fare || 25.0}</strong>
                    </div>
                    <div style="font-size:12.5px; line-height:1.6; color:var(--text-secondary);">
                        <strong style="color:var(--text-primary);">Passenger:</strong> ${activeRide.passenger_id}<br>
                        <strong style="color:var(--text-primary);">Pickup:</strong> Main Gate Stand<br>
                        <strong style="color:var(--text-primary);">Drop:</strong> ${activeRide.destination}
                    </div>
                    <div style="display:flex; gap:8px; margin-top:6px;">
                        ${activeRide.status === 'assigned'
                            ? `<button class="btn btn-navy btn-sm" style="flex:1;" onclick="startRideAction(${activeRide.id})">Start Trip</button>`
                            : ''
                        }
                        <button class="btn btn-primary btn-sm" style="flex:1;" onclick="completeRideAction(${activeRide.id})">
                            Complete Trip & Collect Fare
                        </button>
                    </div>
                </div>
            `;
        } else {
            contentBox.innerHTML = `
                <p style="font-size:12.5px; color:var(--text-secondary); text-align:center; padding:12px;">
                    No pending trips assigned to <strong>${driver.vehicle_id}</strong>. You are on standby at designated campus stand.
                </p>
            `;
        }
    }
}

function toggleDriverOnlineStatus() {
    const driver = state.drivers.find(d => d.id === state.currentDriverId) || state.drivers[0];
    if (!driver) return;
    const newStatus = driver.status === "online" ? "offline" : "online";
    toggleDriverStatus(driver.id, newStatus);
}

// ============================================================
// 13. UTILITIES & CSV EXPORT
// ============================================================

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371.0;
    const dLat = (lat2 - lat1) * Math.PI / 180.0;
    const dLon = (lon2 - lon1) * Math.PI / 180.0;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180.0) * Math.cos(lat2 * Math.PI / 180.0) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
}

function exportRidesCSV() {
    if (state.rides.length === 0) {
        showToast("No rides available to export.", "warning");
        return;
    }

    const headers = ["Request_ID", "Passenger_ID", "Pickup_Lat", "Pickup_Lon", "Destination", "Assigned_Vehicle", "Status", "Wait_Time_Min", "Fare_INR", "Created_At"];
    const rows = state.rides.map(r => [
        r.id,
        `"${r.passenger_id}"`,
        r.pickup_latitude,
        r.pickup_longitude,
        `"${r.destination}"`,
        `"${r.assigned_vehicle_id || ''}"`,
        `"${r.status}"`,
        r.estimated_wait_minutes ?? '',
        r.fare ?? 25.0,
        `"${r.created_at || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `E-RideX_Campus_Rides_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Campus rides CSV report downloaded.", "success");
}

function filterVehiclesTable() {
    const search = (document.getElementById("vehicleSearchInput")?.value || "").toLowerCase();
    const status = document.getElementById("vehicleStatusFilter")?.value || "all";

    const filtered = state.vehicles.filter(v => {
        const matchesSearch = v.id.toLowerCase().includes(search);
        const matchesStatus = status === "all" || v.status === status;
        return matchesSearch && matchesStatus;
    });

    const tbody = document.getElementById("vehiclesTableBody");
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#667085;">No vehicles matching filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(v => {
        const batt = v.battery ?? 80;
        let battColor = "batt-high";
        if (batt < 30) battColor = "batt-low";
        else if (batt < 70) battColor = "batt-mid";

        const driver = state.drivers.find(d => d.vehicle_id === v.id);
        const driverName = driver ? `${driver.name} (${driver.id})` : '<span style="color:#98A2B3;">Unassigned</span>';

        return `
            <tr>
                <td><strong>${v.id}</strong></td>
                <td>${getStatusBadge(v.status)}</td>
                <td>
                    <div class="battery-wrapper">
                        <div class="battery-bar"><div class="battery-fill ${battColor}" style="width:${batt}%;"></div></div>
                        <span style="font-weight:600; font-size:12px;">${batt}%</span>
                    </div>
                </td>
                <td>${v.capacity || 4} Seater</td>
                <td><code style="font-size:11.5px; color:#477BFF;">${v.latitude.toFixed(4)}, ${v.longitude.toFixed(4)}</code></td>
                <td>${driverName}</td>
                <td>
                    <select class="form-select" style="width:130px; height:32px; font-size:12px;"
                            onchange="quickToggleVehicleStatus('${v.id}', this.value)">
                        <option value="available" ${v.status === 'available' ? 'selected' : ''}>Available</option>
                        <option value="busy" ${v.status === 'busy' ? 'selected' : ''}>Busy</option>
                        <option value="maintenance" ${v.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                    </select>
                </td>
            </tr>
        `;
    }).join("");
}

function filterRidesTable() {
    const search = (document.getElementById("rideSearchInput")?.value || "").toLowerCase();
    const status = document.getElementById("rideStatusFilter")?.value || "all";

    const filtered = state.rides.filter(r => {
        const matchesSearch = r.passenger_id.toLowerCase().includes(search) || String(r.id).includes(search);
        const matchesStatus = status === "all" || r.status === status;
        return matchesSearch && matchesStatus;
    });

    const tbody = document.getElementById("allRidesTableBody");
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:24px; color:#667085;">No rides matching filter criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(r => {
        const fare = r.fare != null ? `₹${Number(r.fare).toFixed(1)}` : "₹25.0";
        const wait = r.estimated_wait_minutes != null ? `${r.estimated_wait_minutes} min` : "—";
        const vehicle = r.assigned_vehicle_id ? `<strong>${r.assigned_vehicle_id}</strong>` : '<span style="color:#98A2B3;">None</span>';

        let actionBtns = "";
        if (r.status === "assigned") {
            actionBtns = `
                <button class="btn btn-navy btn-sm" onclick="startRideAction(${r.id})">Start</button>
                <button class="btn btn-primary btn-sm" onclick="completeRideAction(${r.id})">Complete</button>
            `;
        } else if (r.status === "in_progress") {
            actionBtns = `
                <button class="btn btn-primary btn-sm" onclick="completeRideAction(${r.id})">Complete Drop</button>
            `;
        } else {
            actionBtns = `<span style="font-size:11px; color:#98A2B3;">Closed</span>`;
        }

        return `
            <tr>
                <td><strong>#REQ-${r.id}</strong></td>
                <td>${r.passenger_id}</td>
                <td>Main Gate</td>
                <td>${r.destination}</td>
                <td>${vehicle}</td>
                <td>${wait}</td>
                <td><strong>${fare}</strong></td>
                <td>${getStatusBadge(r.status)}</td>
                <td><div style="display:flex; gap:6px;">${actionBtns}</div></td>
            </tr>
        `;
    }).join("");
}

function getStatusBadge(status) {
    switch (status) {
        case "available":
        case "completed":
        case "online":
            return `<span class="badge badge-success">${status}</span>`;
        case "busy":
        case "in_progress":
        case "on_trip":
            return `<span class="badge badge-teal">${status}</span>`;
        case "maintenance":
        case "pending":
            return `<span class="badge badge-warning">${status}</span>`;
        case "unanswered":
        case "cancelled":
        case "offline":
            return `<span class="badge badge-danger">${status}</span>`;
        default:
            return `<span class="badge badge-navy">${status}</span>`;
    }
}

function safeSetText(elemId, text) {
    const el = document.getElementById(elemId);
    if (el) el.textContent = text;
}

function showToast(message, type = "teal") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
