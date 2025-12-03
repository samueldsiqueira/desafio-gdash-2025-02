"""Data normalization module for weather data."""

import json
from datetime import datetime, timezone
from typing import Any


def normalize_weather_data(
    weather_data: dict[str, Any],
    city: str,
    latitude: float,
    longitude: float,
    source: str = "open-meteo",
) -> dict[str, Any]:
    """Normalize weather data into standard JSON structure.

    Args:
        weather_data: Extracted weather data from API
        city: City name for the location
        latitude: Location latitude
        longitude: Location longitude
        source: Data source identifier

    Returns:
        Normalized weather data dictionary

    Raises:
        ValueError: If required fields are missing or invalid
    """
    # Validate required fields
    required_fields = [
        "temperature",
        "humidity",
        "wind_speed",
        "condition",
        "rain_probability",
    ]
    for field in required_fields:
        if field not in weather_data:
            raise ValueError(f"Missing required field: {field}")

    # Validate field types and ranges
    temperature = weather_data["temperature"]
    if not isinstance(temperature, (int, float)):
        raise ValueError(f"Invalid temperature type: {type(temperature)}")

    humidity = weather_data["humidity"]
    if not isinstance(humidity, (int, float)) or not (0 <= humidity <= 100):
        raise ValueError(f"Invalid humidity value: {humidity}")

    wind_speed = weather_data["wind_speed"]
    if not isinstance(wind_speed, (int, float)) or wind_speed < 0:
        raise ValueError(f"Invalid wind_speed value: {wind_speed}")

    condition = weather_data["condition"]
    if not isinstance(condition, str) or not condition:
        raise ValueError(f"Invalid condition value: {condition}")

    rain_probability = weather_data["rain_probability"]
    if not isinstance(rain_probability, (int, float)) or not (
        0 <= rain_probability <= 100
    ):
        raise ValueError(f"Invalid rain_probability value: {rain_probability}")

    # Build normalized structure
    normalized = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "location": {
            "city": city,
            "latitude": float(latitude),
            "longitude": float(longitude),
        },
        "weather": {
            "temperature": float(temperature),
            "humidity": int(humidity),
            "wind_speed": float(wind_speed),
            "condition": str(condition),
            "rain_probability": int(rain_probability),
        },
        "source": source,
    }

    return normalized


def to_json(data: dict[str, Any]) -> str:
    """Convert normalized data to JSON string.

    Args:
        data: Normalized weather data dictionary

    Returns:
        JSON string representation

    Raises:
        ValueError: If data cannot be serialized to JSON
    """
    try:
        return json.dumps(data, ensure_ascii=False)
    except (TypeError, ValueError) as e:
        raise ValueError(f"Failed to serialize data to JSON: {e}") from e


def validate_normalized_structure(data: dict[str, Any]) -> bool:
    """Validate that normalized data has correct structure.

    Args:
        data: Data to validate

    Returns:
        True if structure is valid

    Raises:
        ValueError: If structure is invalid
    """
    # Check top-level fields
    required_top_level = ["timestamp", "location", "weather", "source"]
    for field in required_top_level:
        if field not in data:
            raise ValueError(f"Missing top-level field: {field}")

    # Check location fields
    location = data["location"]
    if not isinstance(location, dict):
        raise ValueError("location must be a dictionary")
    location_fields = ["city", "latitude", "longitude"]
    for field in location_fields:
        if field not in location:
            raise ValueError(f"Missing location field: {field}")

    # Check weather fields
    weather = data["weather"]
    if not isinstance(weather, dict):
        raise ValueError("weather must be a dictionary")
    weather_fields = [
        "temperature",
        "humidity",
        "wind_speed",
        "condition",
        "rain_probability",
    ]
    for field in weather_fields:
        if field not in weather:
            raise ValueError(f"Missing weather field: {field}")

    # Validate timestamp is ISO format
    try:
        datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
    except (ValueError, AttributeError) as e:
        raise ValueError(f"Invalid timestamp format: {e}") from e

    return True
