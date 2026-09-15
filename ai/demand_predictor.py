from pathlib import Path

import joblib
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score


BASE_DIR = Path(__file__).resolve().parent

DATA_PATH = BASE_DIR / "data" / "demand_data.csv"
MODEL_PATH = BASE_DIR / "demand_model.pkl"


MODEL_INFO = {
    "algorithm": "Random Forest Regressor",
    "dataset_rows": 0,
    "training_rows": 0,
    "testing_rows": 0,
    "mae": 0,
    "r2_score": 0,
    "features": [
        "hour",
        "day",
        "weather",
        "is_weekend",
        "is_morning_peak",
        "is_afternoon_peak",
        "is_evening_peak",
        "is_peak_hour"
    ]
}


def create_features(data):
    data = data.copy()

    data["is_weekend"] = (
        data["day"] >= 5
    ).astype(int)

    data["is_morning_peak"] = (
        data["hour"].between(8, 10)
    ).astype(int)

    data["is_afternoon_peak"] = (
        data["hour"].between(12, 14)
    ).astype(int)

    data["is_evening_peak"] = (
        data["hour"].between(16, 18)
    ).astype(int)

    data["is_peak_hour"] = (
        (
            data["hour"].between(8, 10)
        )
        |
        (
            data["hour"].between(16, 18)
        )
    ).astype(int)

    return data


def train_model():

    global MODEL_INFO

    data = pd.read_csv(DATA_PATH)

    data = create_features(data)

    features = MODEL_INFO["features"]

    X = data[features]
    y = data["demand"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42
    )

    model = RandomForestRegressor(
        n_estimators=150,
        random_state=42
    )

    model.fit(
        X_train,
        y_train
    )

    predictions = model.predict(
        X_test
    )

    mae = mean_absolute_error(
        y_test,
        predictions
    )

    r2 = r2_score(
        y_test,
        predictions
    )

    MODEL_INFO = {
        "algorithm": "Random Forest Regressor",
        "dataset_rows": len(data),
        "training_rows": len(X_train),
        "testing_rows": len(X_test),
        "mae": round(float(mae), 2),
        "r2_score": round(float(r2), 2),
        "features": features
    }

    joblib.dump(
        model,
        MODEL_PATH
    )

    print("Model trained successfully.")
    print(f"Dataset rows: {len(data)}")
    print(f"Training rows: {len(X_train)}")
    print(f"Testing rows: {len(X_test)}")
    print(f"Mean Absolute Error: {mae:.2f}")
    print(f"R2 Score: {r2:.2f}")

    return model


def load_model():

    if not MODEL_PATH.exists():
        train_model()

    return joblib.load(
        MODEL_PATH
    )


def prepare_input(
    hour,
    day,
    weather
):

    data = pd.DataFrame(
        [[
            hour,
            day,
            weather
        ]],
        columns=[
            "hour",
            "day",
            "weather"
        ]
    )

    data = create_features(
        data
    )

    return data[
        MODEL_INFO["features"]
    ]


def predict_demand(
    hour: int,
    day: int,
    weather: int = 0
):

    model = load_model()

    input_data = prepare_input(
        hour,
        day,
        weather
    )

    prediction = model.predict(
        input_data
    )[0]

    return max(
        round(float(prediction)),
        0
    )


def get_model_info():

    if MODEL_INFO["dataset_rows"] == 0:
        train_model()

    return MODEL_INFO


if __name__ == "__main__":

    train_model()

    print("\nSample Predictions:")

    test_cases = [
        (8, 0, 0),
        (13, 2, 0),
        (17, 4, 0),
        (18, 2, 1)
    ]

    for hour, day, weather in test_cases:

        demand = predict_demand(
            hour,
            day,
            weather
        )

        print(
            f"Hour={hour}, "
            f"Day={day}, "
            f"Weather={weather} "
            f"-> Predicted Demand={demand}"
        )