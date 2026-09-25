const API = "http://127.0.0.1:8000";

let vehicleMap = null;
let vehicleMarkers = {};
let pendingRide = null;


function initializeVehicleMap() {

    const mapElement =
        document.getElementById("vehicleMap");

    if (!mapElement) {
        return;
    }

    vehicleMap = L.map("vehicleMap").setView(
        [31.250844, 75.705091],
        15
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:
                '&copy; OpenStreetMap contributors'
        }
    ).addTo(vehicleMap);
}


function updateVehicleMap(vehicles) {

    if (!vehicleMap) {
        return;
    }

    Object.values(vehicleMarkers).forEach(
        marker => marker.remove()
    );

    vehicleMarkers = {};

    vehicles.forEach(vehicle => {

        let markerColor = "green";

        if (vehicle.status === "busy") {
            markerColor = "red";
        }

        if (vehicle.status === "maintenance") {
            markerColor = "orange";
        }

        const icon =
            L.divIcon({
                className: "vehicle-marker",
                html: `
                    <div style="
                        width: 18px;
                        height: 18px;
                        background: ${markerColor};
                        border: 3px solid white;
                        border-radius: 50%;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                    "></div>
                `,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

        const marker =
            L.marker(
                [
                    vehicle.latitude,
                    vehicle.longitude
                ],
                {
                    icon: icon
                }
            ).addTo(vehicleMap);

        marker.bindPopup(`
            <div>
                <strong>${vehicle.id}</strong>
                <br>
                Status: ${vehicle.status}
                <br>
                Battery: ${vehicle.battery}%
                <br>
                Capacity: ${vehicle.capacity}
            </div>
        `);

        vehicleMarkers[vehicle.id] = marker;

    });
}


function updateVehicleStats(vehicles) {

    const total =
        vehicles.length;

    const available =
        vehicles.filter(
            vehicle =>
                vehicle.status === "available"
        ).length;

    const busy =
        vehicles.filter(
            vehicle =>
                vehicle.status === "busy"
        ).length;

    document.getElementById(
        "totalVehicles"
    ).textContent = total;

    document.getElementById(
        "availableVehicles"
    ).textContent = available;

    document.getElementById(
        "busyVehicles"
    ).textContent = busy;
}


function updateVehicleStatusList(vehicles) {

    const container =
        document.getElementById(
            "vehicleStatusList"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    vehicles.forEach(vehicle => {

        const card =
            document.createElement("div");

        card.className =
            "vehicle-status-card";

        card.innerHTML = `

            <div class="vehicle-status-info">

                <strong>
                    ${vehicle.id}
                </strong>

                <p>
                    Battery:
                    ${vehicle.battery}%
                </p>

                <p>
                    Capacity:
                    ${vehicle.capacity}
                </p>

                <p>
                    Current Status:
                    ${vehicle.status}
                </p>

            </div>

            <div class="vehicle-status-control">

                <select
                    onchange="changeVehicleStatus(
                        '${vehicle.id}',
                        this.value
                    )"
                >

                    <option
                        value="available"
                        ${
                            vehicle.status === "available"
                                ? "selected"
                                : ""
                        }
                    >
                        Available
                    </option>

                    <option
                        value="busy"
                        ${
                            vehicle.status === "busy"
                                ? "selected"
                                : ""
                        }
                    >
                        Busy
                    </option>

                    <option
                        value="maintenance"
                        ${
                            vehicle.status === "maintenance"
                                ? "selected"
                                : ""
                        }
                    >
                        Maintenance
                    </option>

                </select>

            </div>

        `;

        container.appendChild(card);

    });
}


async function changeVehicleStatus(
    vehicleId,
    status
) {

    try {

        const response =
            await fetch(
                `${API}/vehicles/${vehicleId}/status?status=${status}`,
                {
                    method: "PUT"
                }
            );

        if (!response.ok) {

            const error =
                await response.json();

            throw new Error(
                error.detail ||
                "Failed to update vehicle status"
            );
        }

        await loadDashboard();

    } catch (error) {

        console.error(
            "Vehicle status update error:",
            error
        );

        alert(
            `Failed to update ${vehicleId}: ${error.message}`
        );
    }
}


function updateRequestStats(requests) {

    const totalRequests =
        requests.length;

    const unanswered =
        requests.filter(
            request =>
                request.status === "unanswered"
        ).length;

    const assigned =
        requests.filter(
            request =>
                request.status === "assigned"
        ).length;

    const waitTimes =
        requests
            .filter(
                request =>
                    request.estimated_wait_minutes !== null &&
                    request.estimated_wait_minutes !== undefined
            )
            .map(
                request =>
                    Number(
                        request.estimated_wait_minutes
                    )
            );

    let averageWait = 0;

    if (waitTimes.length > 0) {

        const totalWait =
            waitTimes.reduce(
                (sum, value) =>
                    sum + value,
                0
            );

        averageWait =
            totalWait /
            waitTimes.length;
    }

    document.getElementById(
        "totalRequests"
    ).textContent =
        totalRequests;

    document.getElementById(
        "unansweredRequests"
    ).textContent =
        unanswered;

    document.getElementById(
        "averageWait"
    ).textContent =
        averageWait.toFixed(1);

    return {
        totalRequests,
        unanswered,
        assigned,
        averageWait
    };
}


function updatePredictedDemand(demand) {

    const element =
        document.getElementById(
            "predictedDemand"
        );

    if (!element) {
        return;
    }

    element.textContent =
        demand;
}


function updateModelInfo(model) {

    if (!model) {
        return;
    }

    const algorithm =
        document.getElementById(
            "modelAlgorithm"
        );

    const dataset =
        document.getElementById(
            "modelDataset"
        );

    const training =
        document.getElementById(
            "modelTraining"
        );

    const testing =
        document.getElementById(
            "modelTesting"
        );

    const mae =
        document.getElementById(
            "modelMAE"
        );

    const r2 =
        document.getElementById(
            "modelR2"
        );

    if (algorithm) {
        algorithm.textContent =
            model.algorithm || "-";
    }

    if (dataset) {
        dataset.textContent =
            model.dataset_rows || "-";
    }

    if (training) {
        training.textContent =
            model.training_rows || "-";
    }

    if (testing) {
        testing.textContent =
            model.testing_rows || "-";
    }

    if (mae) {
        mae.textContent =
            model.mae ?? "-";
    }

    if (r2) {
        r2.textContent =
            model.r2_score ?? "-";
    }
}


function updateRouteAnalytics(routes) {

    const container =
        document.getElementById(
            "routeAnalytics"
        );

    if (!container) {
        return;
    }

    if (!routes || routes.length === 0) {

        container.innerHTML = `
            <p>
                No route analytics available yet.
            </p>
        `;

        return;
    }

    container.innerHTML = "";

    routes.forEach(route => {

        const card =
            document.createElement("div");

        card.className =
            "route-card";

        card.innerHTML = `

            <div>

                <strong>
                    ${route.route}
                </strong>

                <p>
                    Requests:
                    ${route.total_requests}
                </p>

                <p>
                    Assigned:
                    ${route.assigned_requests}
                </p>

                <p>
                    Unanswered:
                    ${route.unanswered_requests}
                </p>

            </div>

            <div>

                <p>
                    Service Rate:
                    ${route.service_rate_percent}%
                </p>

                <p>
                    Average Wait:
                    ${route.average_wait_minutes} min
                </p>

                <strong>
                    ${route.service_level}
                </strong>

            </div>

        `;

        container.appendChild(card);

    });
}


async function submitRideRequest() {

    const passengerId =
        document.getElementById(
            "passengerId"
        ).value.trim();

    const pickupLocation =
        document.getElementById(
            "pickupLocation"
        ).value;

    const destination =
        document.getElementById(
            "destination"
        ).value;

    const resultElement =
        document.getElementById(
            "rideResult"
        );

    if (
        !passengerId ||
        !pickupLocation ||
        !destination
    ) {

        resultElement.innerHTML = `
            <p>
                Please fill all fields.
            </p>
        `;

        return;
    }


    const locations = {

        "Main Gate": {
            latitude: 31.250844,
            longitude: 75.705091
        },

        "Library": {
            latitude: 31.253000,
            longitude: 75.707000
        },

        "Hostel": {
            latitude: 31.247500,
            longitude: 75.709000
        },

        "Academic Block": {
            latitude: 31.255000,
            longitude: 75.703000
        },

        "Canteen": {
            latitude: 31.249000,
            longitude: 75.702500
        }

    };


    const pickup =
        locations[pickupLocation];


    if (!pickup) {

        resultElement.innerHTML = `
            <p>
                Invalid pickup location.
            </p>
        `;

        return;
    }


    try {

        resultElement.innerHTML = `
            <p>
                Searching for nearby driver...
            </p>
        `;


        const response =
            await fetch(
                `${API}/ride-request`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        passenger_id:
                            passengerId,

                        pickup_latitude:
                            pickup.latitude,

                        pickup_longitude:
                            pickup.longitude,

                        destination:
                            destination

                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Ride request failed"
            );
        }


        if (
            data.status ===
            "driver_found"
        ) {

            pendingRide = {

                passenger_id:
                    passengerId,

                pickup_latitude:
                    pickup.latitude,

                pickup_longitude:
                    pickup.longitude,

                destination:
                    destination,

                vehicle_id:
                    data.driver.id,

                search_radius_km:
                    data.search_radius_km,

                estimated_wait_minutes:
                    data.driver.estimated_wait_minutes

            };


            resultElement.innerHTML = `

                <div class="ride-success">

                    <h3>
                        Driver Found
                    </h3>

                    <p>
                        Vehicle:
                        <strong>
                            ${data.driver.id}
                        </strong>
                    </p>

                    <p>
                        Distance:
                        ${data.driver.distance_km}
                        km
                    </p>

                    <p>
                        Estimated Wait:
                        ${data.driver.estimated_wait_minutes}
                        minutes
                    </p>

                    <p>
                        Search Radius:
                        ${data.search_radius_km}
                        km
                    </p>

                    <button
                        onclick="confirmRide()"
                    >
                        Confirm Ride
                    </button>

                    <button
                        onclick="cancelRide()"
                    >
                        Cancel
                    </button>

                </div>

            `;

        } else {

            pendingRide = null;

            resultElement.innerHTML = `

                <div class="ride-error">

                    <h3>
                        No Driver Available
                    </h3>

                    <p>
                        ${data.message}
                    </p>

                    <p>
                        Search Radius:
                        ${data.search_radius_km}
                        km
                    </p>

                </div>

            `;
        }

    } catch (error) {

        console.error(
            "Ride request error:",
            error
        );

        resultElement.innerHTML = `

            <div class="ride-error">

                <h3>
                    Request Failed
                </h3>

                <p>
                    ${error.message}
                </p>

            </div>

        `;
    }
}


async function confirmRide() {

    if (!pendingRide) {
        return;
    }


    const resultElement =
        document.getElementById(
            "rideResult"
        );


    try {

        resultElement.innerHTML = `
            <p>
                Confirming ride...
            </p>
        `;


        const response =
            await fetch(
                `${API}/confirm-ride/${pendingRide.vehicle_id}`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        passenger_id:
                            pendingRide.passenger_id,

                        pickup_latitude:
                            pendingRide.pickup_latitude,

                        pickup_longitude:
                            pendingRide.pickup_longitude,

                        destination:
                            pendingRide.destination,

                        search_radius_km:
                            pendingRide.search_radius_km,

                        estimated_wait_minutes:
                            pendingRide.estimated_wait_minutes

                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Ride confirmation failed"
            );
        }


        resultElement.innerHTML = `

            <div class="ride-success">

                <h3>
                    Ride Confirmed
                </h3>

                <p>
                    Vehicle:
                    <strong>
                        ${data.vehicle_id}
                    </strong>
                </p>

                <p>
                    Request ID:
                    ${data.request_id}
                </p>

                <p>
                    ${data.message}
                </p>

            </div>

        `;


        pendingRide = null;


        await loadDashboard();

    } catch (error) {

        console.error(
            "Ride confirmation error:",
            error
        );

        resultElement.innerHTML = `

            <div class="ride-error">

                <h3>
                    Confirmation Failed
                </h3>

                <p>
                    ${error.message}
                </p>

            </div>

        `;
    }
}


function cancelRide() {

    pendingRide = null;

    const resultElement =
        document.getElementById(
            "rideResult"
        );

    resultElement.innerHTML = `
        <p>
            Ride request cancelled.
        </p>
    `;
}


async function loadDashboard() {

    try {

        const vehiclesResponse =
            await fetch(
                `${API}/vehicles`
            );

        const requestsResponse =
            await fetch(
                `${API}/ride-requests`
            );

        const analyticsResponse =
            await fetch(
                `${API}/analytics/routes`
            );

        const modelResponse =
            await fetch(
                `${API}/model-info`
            );


        const vehiclesData =
            await vehiclesResponse.json();

        const requestsData =
            await requestsResponse.json();

        const analyticsData =
            await analyticsResponse.json();

        const modelData =
            await modelResponse.json();


        updateVehicleStats(
            vehiclesData.vehicles
        );


        updateVehicleStatusList(
            vehiclesData.vehicles
        );


        updateVehicleMap(
            vehiclesData.vehicles
        );


        updateRequestStats(
            requestsData.requests
        );


        updateModelInfo(
            modelData
        );


        updateRouteAnalytics(
            analyticsData.routes
        );


        const now =
            new Date();


        const hour =
            now.getHours();


        const day =
            now.getDay();


        const demandResponse =
            await fetch(
                `${API}/predict-demand`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        hour:
                            hour,

                        day:
                            day,

                        weather:
                            0

                    })
                }
            );


        const demandData =
            await demandResponse.json();


        updatePredictedDemand(
            demandData.predicted_demand
        );

    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );
    }
}


initializeVehicleMap();

loadDashboard();


setInterval(
    loadDashboard,
    10000
);