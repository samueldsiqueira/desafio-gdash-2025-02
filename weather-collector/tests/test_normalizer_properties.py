"""Property-based tests for data normalization.

**Feature: weather-monitoring-system, Property 2: Valid JSON structure from normalization**
**Validates: Requirements 1.3**
"""

import json
from datetime import datetime

import pytest
from hypothesis import given, strategies as st, settings

from src.normalizer import normalize_weather_data, to_json, validate_normalized_structure


# Strategy for generating valid weather data
@st.composite
def valid_weather_data(draw):
    """Generate valid extracted weather data."""
    return {
        "temperature": draw(st.floats(min_value=-50, max_value=60, allow_nan=False)),
        "humidity": draw(st.integers(min_value=0, max_value=100)),
        "wind_speed": draw(st.floats(min_value=0, max_value=200, allow_nan=False)),
        "condition": draw(
            st.sampled_from(
                [
                    "clear",
                    "partly_cloudy",
                    "cloudy",
                    "rain",
                    "snow",
                    "thunderstorm",
                    "fog",
                ]
            )
        ),
        "rain_probability": draw(st.integers(min_value=0, max_value=100)),
    }


# Strategy for generating valid location data
@st.composite
def valid_location(draw):
    """Generate valid location data."""
    return {
        "city": draw(st.text(min_size=1, max_size=100, alphabet=st.characters(whitelist_categories=("L", "N", "Z")))),
        "latitude": draw(st.floats(min_value=-90, max_value=90, allow_nan=False)),
        "longitude": draw(st.floats(min_value=-180, max_value=180, allow_nan=False)),
    }


class TestJSONNormalizationProperty:
    """
    **Feature: weather-monitoring-system, Property 2: Valid JSON structure from normalization**
    **Validates: Requirements 1.3**

    For any weather data processed by the Weather Collector, the normalized output
    should be valid JSON that conforms to the expected schema with all required
    fields present.
    """

    @given(weather_data=valid_weather_data(), location=valid_location())
    @settings(max_examples=100)
    def test_normalized_output_is_valid_json(self, weather_data, location):
        """Property: Normalized output can be serialized to valid JSON."""
        normalized = normalize_weather_data(
            weather_data=weather_data,
            city=location["city"],
            latitude=location["latitude"],
            longitude=location["longitude"],
        )

        # Should be serializable to JSON
        json_str = to_json(normalized)
        assert isinstance(json_str, str)

        # Should be parseable back to dict
        parsed = json.loads(json_str)
        assert isinstance(parsed, dict)

    @given(weather_data=valid_weather_data(), location=valid_location())
    @settings(max_examples=100)
    def test_normalized_has_all_required_fields(self, weather_data, location):
        """Property: Normalized output contains all required top-level fields."""
        normalized = normalize_weather_data(
            weather_data=weather_data,
            city=location["city"],
            latitude=location["latitude"],
            longitude=location["longitude"],
        )

        # Check top-level fields
        assert "timestamp" in normalized
        assert "location" in normalized
        assert "weather" in normalized
        assert "source" in normalized

    @given(weather_data=valid_weather_data(), location=valid_location())
    @settings(max_examples=100)
    def test_normalized_location_has_all_fields(self, weather_data, location):
        """Property: Normalized location contains all required fields."""
        normalized = normalize_weather_data(
            weather_data=weather_data,
            city=location["city"],
            latitude=location["latitude"],
            longitude=location["longitude"],
        )

        loc = normalized["location"]
        assert "city" in loc
        assert "latitude" in loc
        assert "longitude" in loc
        assert loc["city"] == location["city"]
        assert loc["latitude"] == location["latitude"]
        assert loc["longitude"] == location["longitude"]

    @given(weather_data=valid_weather_data(), location=valid_location())
    @settings(max_examples=100)
    def test_normalized_weather_has_all_fields(self, weather_data, location):
        """Property: Normalized weather contains all required fields."""
        normalized = normalize_weather_data(
            weather_data=weather_data,
            city=location["city"],
            latitude=location["latitude"],
            longitude=location["longitude"],
        )

        weather = normalized["weather"]
        assert "temperature" in weather
        assert "humidity" in weather
        assert "windSpeed" in weather
        assert "condition" in weather
        assert "rainProbability" in weather

    @given(weather_data=valid_weather_data(), location=valid_location())
    @settings(max_examples=100)
    def test_normalized_timestamp_is_valid_iso(self, weather_data, location):
        """Property: Timestamp is valid ISO 8601 format."""
        normalized = normalize_weather_data(
            weather_data=weather_data,
            city=location["city"],
            latitude=location["latitude"],
            longitude=location["longitude"],
        )

        timestamp = normalized["timestamp"]
        # Should be parseable as ISO datetime
        parsed_dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        assert isinstance(parsed_dt, datetime)

    @given(weather_data=valid_weather_data(), location=valid_location())
    @settings(max_examples=100)
    def test_normalized_passes_validation(self, weather_data, location):
        """Property: Normalized output passes structure validation."""
        normalized = normalize_weather_data(
            weather_data=weather_data,
            city=location["city"],
            latitude=location["latitude"],
            longitude=location["longitude"],
        )

        # Should pass validation without raising
        assert validate_normalized_structure(normalized) is True
