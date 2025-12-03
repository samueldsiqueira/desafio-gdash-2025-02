"""Property-based tests for API client data extraction.

**Feature: weather-monitoring-system, Property 1: Complete data extraction from API responses**
**Validates: Requirements 1.2**
"""

import pytest
from hypothesis import given, strategies as st, settings

from src.api_client import extract_weather_data


# Strategy for generating valid Open-Meteo API responses
@st.composite
def valid_api_response(draw):
    """Generate valid Open-Meteo API response structures."""
    temperature = draw(st.floats(min_value=-50, max_value=60, allow_nan=False))
    humidity = draw(st.integers(min_value=0, max_value=100))
    wind_speed = draw(st.floats(min_value=0, max_value=200, allow_nan=False))
    weather_code = draw(
        st.sampled_from([0, 1, 2, 3, 45, 48, 51, 53, 55, 61, 63, 65, 71, 73, 75, 80, 95])
    )
    rain_probability = draw(st.integers(min_value=0, max_value=100))

    return {
        "current": {
            "temperature_2m": temperature,
            "relative_humidity_2m": humidity,
            "wind_speed_10m": wind_speed,
            "weather_code": weather_code,
        },
        "hourly": {
            "precipitation_probability": [rain_probability] + draw(
                st.lists(st.integers(min_value=0, max_value=100), max_size=23)
            ),
        },
    }


class TestDataExtractionProperty:
    """
    **Feature: weather-monitoring-system, Property 1: Complete data extraction from API responses**
    **Validates: Requirements 1.2**

    For any valid API response from weather services, the Weather Collector should
    extract all required fields (temperature, humidity, wind speed, condition,
    rain probability) and include them in the normalized output.
    """

    @given(api_response=valid_api_response())
    @settings(max_examples=100)
    def test_extracts_all_required_fields(self, api_response):
        """Property: All required fields are extracted from valid API responses."""
        result = extract_weather_data(api_response)

        # Verify all required fields are present
        assert "temperature" in result, "temperature field missing"
        assert "humidity" in result, "humidity field missing"
        assert "wind_speed" in result, "wind_speed field missing"
        assert "condition" in result, "condition field missing"
        assert "rain_probability" in result, "rain_probability field missing"

    @given(api_response=valid_api_response())
    @settings(max_examples=100)
    def test_extracted_values_match_input(self, api_response):
        """Property: Extracted values match the input API response values."""
        result = extract_weather_data(api_response)

        # Verify values match input
        assert result["temperature"] == float(
            api_response["current"]["temperature_2m"]
        )
        assert result["humidity"] == int(
            api_response["current"]["relative_humidity_2m"]
        )
        assert result["wind_speed"] == float(
            api_response["current"]["wind_speed_10m"]
        )
        assert result["rain_probability"] == int(
            api_response["hourly"]["precipitation_probability"][0]
        )

    @given(api_response=valid_api_response())
    @settings(max_examples=100)
    def test_condition_is_valid_string(self, api_response):
        """Property: Condition is always a non-empty string."""
        result = extract_weather_data(api_response)

        assert isinstance(result["condition"], str)
        assert len(result["condition"]) > 0

    @given(api_response=valid_api_response())
    @settings(max_examples=100)
    def test_extracted_types_are_correct(self, api_response):
        """Property: Extracted values have correct types."""
        result = extract_weather_data(api_response)

        assert isinstance(result["temperature"], float)
        assert isinstance(result["humidity"], int)
        assert isinstance(result["wind_speed"], float)
        assert isinstance(result["condition"], str)
        assert isinstance(result["rain_probability"], int)
