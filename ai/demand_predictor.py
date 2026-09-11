def predict_demand(hour: int, day: int, weather: int = 0):
    """
    Baseline e-rickshaw demand prediction.

    hour:
        0-23

    day:
        0 = Monday
        1 = Tuesday
        ...
        6 = Sunday

    weather:
        0 = Normal weather
        1 = Bad weather
    """

    demand = 5

    # Morning peak
    if 8 <= hour <= 10:
        demand += 10

    # Afternoon movement
    elif 12 <= hour <= 14:
        demand += 6

    # Evening peak
    elif 16 <= hour <= 18:
        demand += 12

    # More demand on weekdays
    if day < 5:
        demand += 5
    else:
        demand -= 3

    # Bad weather increases vehicle demand
    if weather == 1:
        demand += 4

    return max(demand, 0)