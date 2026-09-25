const API = "http://127.0.0.1:8000";

let pendingRide = null;


async function loadDashboard() {

    const status =
        document.getElementById("routeAnalytics");

    try {

        status.innerHTML =
            "<p>Loading dashboard data...</p>";


        const vehiclesResponse =
            await fetch(`${API}/vehicles`);

        if (!vehiclesResponse.ok) {
            throw new Error(
                `Vehicles API returned ${vehiclesResponse.status}`
            );
        }

        const vehiclesData =
            await vehiclesResponse.json();


        const requestsResponse =
            await fetch(`${API}/ride-requests`);

        if (!requestsResponse.ok) {
            throw new Error(
                `Requests API returned ${requestsResponse.status}`
            );
        }

        const requestsData =
            await requestsResponse.json();


        const analyticsResponse =
            await fetch(`${API}/analytics/routes`);

        if (!analyticsResponse.ok) {
            throw new Error(
                `Analytics API returned ${analyticsResponse.status}`
            );
        }

        const analyticsData =
            await analyticsResponse.json();


        const modelResponse =
            await fetch(`${API}/model-info`);

        if (!modelResponse.ok) {
            throw new Error(
                `Model API returned ${modelResponse.status}`
            );
        }

        const modelData =
            await modelResponse.json();


        const now = new Date();

        const hour =
            now.getHours();

        const javascriptDay =
            now.getDay();

        const day =
            javascriptDay === 0
                ? 6
                : javascriptDay - 1;

        const weather = 0;


        const demandResponse =
            await fetch(`${API}/predict-demand`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    hour: hour,
                    day: day,
                    weather: weather
                })
            });


        if (!demandResponse.ok) {
            throw new Error(
                `Demand API returned ${demandResponse.status}`
            );
        }


        const demandData =
            await demandResponse.json();


        updateVehicleStats(
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


function updateRequestStats(requests) {

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


function updatePredictedDemand(demand) {

    document.getElementById(
        "predictedDemand"
    ).textContent =
        `${demand} rides`;
}


function updateModelInfo(model) {

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


    const result =
        document.getElementById(
            "rideResult"
        );


    if (!passengerId) {

        result.innerHTML =
            "<p>Please enter a Passenger ID.</p>";

        return;
    }


    const locations = {

        "Main Gate": {
            latitude: 28.6139,
            longitude: 77.2090
        },

        "Library": {
            latitude: 28.6150,
            longitude: 77.2105
        },

        "Hostel": {
            latitude: 28.6170,
            longitude: 77.2120
        },

        "Academic Block": {
            latitude: 28.6200,
            longitude: 77.2150
        },

        "Canteen": {
            latitude: 28.6115,
            longitude: 77.2075
        }
    };


    const pickup =
        locations[pickupLocation];


    result.innerHTML =
        "<p>Finding the best available e-rickshaw...</p>";


    try {

        const response =
            await fetch(`${API}/ride-request`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
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
            });


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
                        ${data.driver.distance_km} km
                    </p>

                    <p>
                        Estimated Wait:
                        ${data.driver.estimated_wait_minutes} min
                    </p>

                    <p>
                        Search Radius:
                        ${data.search_radius_km} km
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
                        ${data.search_radius_km} km
                    </p>

                </div>
            `;
        }


    } catch (error) {

        console.error(
            "Ride request error:",
            error
        );


        result.innerHTML = `

            <p>
                Ride request failed:
                ${error.message}
            </p>

        `;
    }
}


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
                        "Content-Type": "application/json"
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
                    ${pendingRide.distance} km
                </p>

                <p>
                    Estimated Wait:
                    ${pendingRide.waitTime} min
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


        result.innerHTML = `

            <p>
                Ride confirmation failed:
                ${error.message}
            </p>

        `;
    }
}


function cancelRide() {

    const result =
        document.getElementById(
            "rideResult"
        );


    pendingRide = null;


    result.innerHTML = `
        <p>
            Ride request cancelled.
        </p>
    `;
}


function updateRouteAnalytics(routes) {

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


    routes.forEach(route => {

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

    });
}


loadDashboard();


setInterval(
    loadDashboard,
    10000
);