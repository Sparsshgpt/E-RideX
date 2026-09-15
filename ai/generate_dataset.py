from pathlib import Path
import random
import csv


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_PATH = DATA_DIR / "demand_data.csv"


random.seed(42)


def calculate_demand(hour, day, weather):

    demand = 4

    # Morning peak
    if 7 <= hour <= 10:
        demand += 10

    # Lunch / afternoon movement
    elif 11 <= hour <= 14:
        demand += 6

    # Evening peak
    elif 16 <= hour <= 19:
        demand += 12

    # Low activity during late night
    elif 21 <= hour <= 23:
        demand -= 2

    # Weekend effect
    if day >= 5:
        demand -= 4
    else:
        demand += 4

    # Bad weather increases ride demand
    if weather == 1:
        demand += 5

    # Random variation
    demand += random.randint(-3, 3)

    return max(demand, 0)


def generate_dataset(days=90):

    DATA_DIR.mkdir(
        exist_ok=True
    )

    rows = []

    for day_number in range(days):

        day = day_number % 7

        for hour in range(24):

            weather = random.choices(
                [0, 1],
                weights=[0.8, 0.2]
            )[0]

            demand = calculate_demand(
                hour,
                day,
                weather
            )

            rows.append([
                hour,
                day,
                weather,
                demand
            ])


    with open(
        DATA_PATH,
        "w",
        newline=""
    ) as file:

        writer = csv.writer(file)

        writer.writerow([
            "hour",
            "day",
            "weather",
            "demand"
        ])

        writer.writerows(rows)


    print("Dataset generated successfully.")
    print(f"Rows created: {len(rows)}")
    print(f"Dataset location: {DATA_PATH}")


if __name__ == "__main__":

    generate_dataset(90)