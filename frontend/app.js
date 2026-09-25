const API = "http://127.0.0.1:8000";

let pendingRide = null;
let vehicleMap = null;
let vehicleMarkers = {};


// ======================================================
// LIVE VEHICLE MAP
// ======================================================

function initializeVehicleMap() {

    const mapContainer =
        document.getElementById("vehicleMap");

    if (!mapContainer) {
        return;
    }

    if (vehicleMap) {
        return;
    }

    vehicleMap = L.map("vehicleMap").setView(
        [31.250844, 75.705091],
        15
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(vehicleMap);
}


function updateVehicleMap(vehicles) {

    initializeVehicleMap();

    if (!vehicleMap) {
        return;
    }

    vehicles.forEach(vehicle => {

        const latitude =
            Number(vehicle.latitude);

        const longitude =
            Number(vehicle.longitude);

        const position = [
            latitude,
            longitude
        ];

        const status =
            vehicle.status;

        const iconColor =
            status === "available"
                ? "green"
                : "red";

        const markerIcon =
            L.divIcon({

                className:
                    "vehicle-marker",

                html: `
                    <div
                        style="
                            width:18px;
                            height:18px;
                            border-radius:50%;
                            background:${iconColor};
                            border:3px solid white;
                            box-shadow:0 1px 5px rgba(0,0,0,0.35);
                        "
                    ></div>
                `,

                iconSize: [
                    18,
                    18
                ],

                iconAnchor: [
                    9,
                    9
                ]
            });


        if (vehicleMarkers[vehicle.id]) {

            vehicleMarkers[
                vehicle.id
            ].setLatLng(position);

            vehicleMarkers[
                vehicle.id
            ].setIcon(markerIcon);

        } else {

            const marker =
                L.marker(
                    position,
                    {
                        icon: markerIcon
                    }
                ).addTo(vehicleMap);


            marker.bindPopup(`
                <strong>
                    ${vehicle.id}
                </strong>

                <br>

                Status:
                ${vehicle.status}

                <br>

                Battery:
                ${vehicle.battery}%

                <br>

                Capacity:
                ${vehicle.capacity}
            `);


            vehicleMarkers[
                vehicle.id
            ] = marker;
        }
    });
}


// ======================================================
// DASHBOARD
// ======================================================

async function loadDashboard() {

    const status =
        document.getElementById(
            "routeAnalytics"
        );

    try {

        status.innerHTML =
            "<p>Loading dashboard data...</p>";


        // VEHICLES
        const vehiclesResponse =
            await fetch(
                `${API}/vehicles`
            );


        if (!vehiclesResponse.ok) {

            throw new Error(
                `Vehicles API returned ${vehiclesResponse.status}`
            );
        }


        const vehiclesData =
            await vehiclesResponse.json();


        // RIDE REQUESTS
        const requestsResponse =
            await fetch(
                `${API}/ride-requests`
            );


        if (!requestsResponse.ok) {

            throw new Error(
                `Requests API returned ${requestsResponse.status}`
            );
        }


        const requestsData =
            await requestsResponse.json();


        // ROUTE ANALYTICS
        const analyticsResponse =
            await fetch(
                `${API}/analytics/routes`
            );


        if (!analyticsResponse.ok) {

            throw new Error(
                `Analytics API returned ${analyticsResponse.status}`
            );
        }


        const analyticsData =
            await analyticsResponse.json();


        // MODEL INFORMATION
        const modelResponse =
            await fetch(
                `${API}/model-info`
            );


        if (!modelResponse.ok) {

            throw new Error(
                `Model API returned ${modelResponse.status}`
            );
        }


        const modelData =
            await modelResponse.json();


        // CURRENT TIME
        const now =
            new Date();


        const hour =
            now.getHours();


        const javascriptDay =
            now.getDay();


        const day =
            javascriptDay === 0
                ? 6
                : javascriptDay - 1;


        const weather = 0;


        // DEMAND PREDICTION
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
                        hour: hour,
                        day: day,
                        weather: weather
                    })
                }
            );


        if (!demandResponse.ok) {

            throw new Error(
                `Demand API returned ${demandResponse.status}`
            );
        }


        const demandData =
            await demandResponse.json();


        // UPDATE DASHBOARD
        updateVehicleStats(
            vehiclesData.vehicles
        );


        updateVehicleMap(
            vehiclesData.vehicles
        );


        updateRequestStats(
            requestsData.requests
        );


        updatePredictedDemand(
            demandData.predicted_demand
        );


        updateModelInfo(
            modelData
        );


        updateRouteAnalytics(
            analyticsData.routes
        );


    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );


        status.innerHTML = `
            <p>
                Dashboard connection error:
                ${error.message}
            </p>
        `;
    }
}


// ======================================================
// VEHICLE STATISTICS
// ======================================================

function updateVehicleStats(
    vehicles
) {

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
    ).textContent =
        total;


    document.getElementById(
        "availableVehicles"
    ).textContent =
        available;


    document.getElementById(
        "busyVehicles"
    ).textContent =
        busy;
}


// ======================================================
// REQUEST STATISTICS
// ======================================================

function updateRequestStats(
    requests
) {

    const total =
        requests.length;


    const unanswered =
        requests.filter(
            request =>
                request.status === "unanswered"
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
                (sum, wait) =>
                    sum + wait,
                0
            );


        averageWait =
            totalWait /
            waitTimes.length;
    }


    document.getElementById(
        "totalRequests"
    ).textContent =
        total;


    document.getElementById(
        "unansweredRequests"
    ).textContent =
        unanswered;


    document.getElementById(
        "averageWait"
    ).textContent =
        `${averageWait.toFixed(1)} min`;
}


// ======================================================
// DEMAND
// ======================================================

function updatePredictedDemand(
    demand
) {

    document.getElementById(
        "predictedDemand"
    ).textContent =
        `${demand} rides`;
}


// ======================================================
// MODEL INFORMATION
// ======================================================

function updateModelInfo(
    model
) {

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
            model.algorithm;
    }


    if (dataset) {

        dataset.textContent =
            model.dataset_rows;
    }


    if (training) {

        training.textContent =
            model.training_rows;
    }


    if (testing) {

        testing.textContent =
            model.testing_rows;
    }


    if (mae) {

        mae.textContent =
            model.mae;
    }


    if (r2) {

        r2.textContent =
            model.r2_score;
    }
}


// ======================================================
// LPU CAMPUS LOCATIONS
// ======================================================

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


// ======================================================
// RIDE REQUEST
// ======================================================

async function submitRideRequest() {

    const passengerId =
        document
            .getElementById("passengerId")
            .value
            .trim();


    const pickupLocation =
        document.getElementById(
            "pickupLocation"
        ).value;


    const destination =
        document.getElementById(
            "destination"
        ).value;


    const result =
        document.getElementById(
            "rideResult"
        );


    if (!passengerId) {

        result.innerHTML =
            "<p>Please enter a Passenger ID.</p>";

        return;
    }


    const pickup =
        locations[pickupLocation];


    if (!pickup) {

        result.innerHTML =
            "<p>Invalid pickup location.</p>";

        return;
    }


    result.innerHTML =
        "<p>Finding the best available e-rickshaw...</p>";


    try {

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


        if (!response.ok) {

            throw new Error(
                `Ride API returned ${response.status}`
            );
        }


        const data =
            await response.json();


        if (
            data.status ===
            "driver_found"
        ) {

            pendingRide = {

                passengerId:
                    passengerId,

                pickupLatitude:
                    pickup.latitude,

                pickupLongitude:
                    pickup.longitude,

                destination:
                    destination,

                vehicleId:
                    data.driver.id,

                distance:
                    data.driver.distance_km,

                waitTime:
                    data.driver.estimated_wait_minutes,

                searchRadius:
                    data.search_radius_km
            };


            result.innerHTML = `

                <div>

                    <strong>
                        Driver Found
                    </strong>

                    <p>
                        Vehicle:
                        ${data.driver.id}
                    </p>

                    <p>
                        Distance:
                        ${data.driver.distance_km}
                        km
                    </p>

                    <p>
                        Estimated Wait:
                        ${data.driver.estimated_wait_minutes}
                        min
                    </p>

                    <p>
                        Search Radius:
                        ${data.search_radius_km}
                        km
                    </p>


                    <div class="ride-actions">

                        <button
                            id="confirmRideButton"
                            onclick="confirmRide()"
                        >
                            Confirm Ride
                        </button>


                        <button
                            id="cancelRideButton"
                            onclick="cancelRide()"
                        >
                            Cancel
                        </button>

                    </div>

                </div>
            `;

        } else {

            result.innerHTML = `

                <div>

                    <strong>
                        No Driver Available
                    </strong>

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


        result.innerHTML =
            `<p>Ride request failed: ${error.message}</p>`;
    }
}


// ======================================================
// CONFIRM RIDE
// ======================================================

async function confirmRide() {

    if (!pendingRide) {
        return;
    }


    const result =
        document.getElementById(
            "rideResult"
        );


    result.innerHTML =
        "<p>Confirming ride...</p>";


    try {

        const response =
            await fetch(
                `${API}/confirm-ride/${pendingRide.vehicleId}`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        passenger_id:
                            pendingRide.passengerId,

                        pickup_latitude:
                            pendingRide.pickupLatitude,

                        pickup_longitude:
                            pendingRide.pickupLongitude,

                        destination:
                            pendingRide.destination,

                        search_radius_km:
                            pendingRide.searchRadius,

                        estimated_wait_minutes:
                            pendingRide.waitTime
                    })
                }
            );


        if (!response.ok) {

            const errorData =
                await response.json();


            throw new Error(
                errorData.detail ||
                `Confirmation failed: ${response.status}`
            );
        }


        const data =
            await response.json();


        result.innerHTML = `

            <div>

                <strong>
                    Ride Confirmed
                </strong>

                <p>
                    Vehicle:
                    ${data.vehicle_id}
                </p>

                <p>
                    Distance:
                    ${pendingRide.distance}
                    km
                </p>

                <p>
                    Estimated Wait:
                    ${pendingRide.waitTime}
                    min
                </p>

                <p>
                    Destination:
                    ${pendingRide.destination}
                </p>

            </div>
        `;


        pendingRide = null;


        await loadDashboard();


    } catch (error) {

        console.error(
            "Confirmation error:",
            error
        );


        result.innerHTML =
            `<p>Ride confirmation failed: ${error.message}</p>`;
    }
}


// ======================================================
// CANCEL RIDE
// ======================================================

function cancelRide() {

    const result =
        document.getElementById(
            "rideResult"
        );


    pendingRide = null;


    result.innerHTML =
        "<p>Ride request cancelled.</p>";
}


// ======================================================
// ROUTE ANALYTICS
// ======================================================

function updateRouteAnalytics(
    routes
) {

    const container =
        document.getElementById(
            "routeAnalytics"
        );


    container.innerHTML = "";


    if (routes.length === 0) {

        container.innerHTML =
            "<p>No route data available.</p>";

        return;
    }


    routes.forEach(
        route => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "route-card";


            card.innerHTML = `

                <h3>
                    ${route.route}
                </h3>


                <div class="route-info">

                    <div>
                        Requests

                        <strong>
                            ${route.total_requests}
                        </strong>
                    </div>


                    <div>
                        Assigned

                        <strong>
                            ${route.assigned_requests}
                        </strong>
                    </div>


                    <div>
                        Unanswered

                        <strong>
                            ${route.unanswered_requests}
                        </strong>
                    </div>


                    <div>
                        Service Rate

                        <strong>
                            ${route.service_rate_percent}%
                        </strong>
                    </div>

                </div>


                <span
                    class="service-level service-${route.service_level}"
                >
                    ${route.service_level.toUpperCase()}
                </span>

            `;


            container.appendChild(
                card
            );
        }
    );
}


// ======================================================
// START APPLICATION
// ======================================================

initializeVehicleMap();

loadDashboard();


// ======================================================
// AUTO REFRESH
// ======================================================

setInterval(
    loadDashboard,
    10000
);