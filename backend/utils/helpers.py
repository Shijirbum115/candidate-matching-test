def calculate_experience_multiplier(years: float) -> float:
    if years <= 1:
        return 1.0
    elif years <= 2:
        return 1.2
    elif years <= 3:
        return 1.4
    elif years <= 4:
        return 1.6
    elif years <= 5:
        return 1.8
    else:
        return 2.0