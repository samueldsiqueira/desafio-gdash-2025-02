"""Unit tests for data normalization module.

Tests data normalization and error handling.
_Requirements: 1.3_
"""

import json
from datetime import datetime, timezone

import pytest

from src.normalizer import (
    normalize_weather_data,
    to_json,
    validate_normalized_structure,
)


class TestNormalizeWeatherData:
    """Unit tests for normalize_weather_data function."""

    def test_normalize_complete_data(self):
        """Test normalization of complete weather data."""
        weather_data = {
            "temperature": 25.5,
            "humidity": 60,
            "wind_speed": 15.0,
            "condition": "partly_cloudy",
            "rain_probability": 30,
        }

        result = normalize_weather_data(
            weather_data=weather_data,
            city="São Paulo",
            latitude=-23.5505,
            longitude=-46.6333,
        )

        assert "timestamp" in result
        assert result["location"]["city"] == "São Paulo"
        assert result["location"]["latitude"] == -23.5505
        assert result["location"]["longitude"] == -46.6333
        assert result["weather"]["temperature"] == 25.5
        assert result["weather"]["humidity"] == 60
        assert result["weather"]["windSpeed"] == 15.0
        assert result["weather"]["condition"] == "partly_cloudy"
        assert result["weather"]["rainProbability"] == 30
        assert result["source"] == "open-meteo"

    def test_normalize_custom_source(self):
        """Test normalization with custom source."""
        weather_data = {
            "temperature": 20.0,
            "humidity": 50,
            "wind_speed": 10.0,
            "condition": "clear",
            "rain_probability": 0,
        }

        result = normalize_weather_data(
            weather_data=weather_data,
            city="Test City",
            latitude=0.0,
            longitude=0.0,
            source="openweather",
        )

        assert result["source"] == "openweather"

    def test_normalize_missing_temperature(self):
        """Test error when temperature is missing."""
        weather_data = {
            "humidity": 60,
            "wind_speed": 15.0,
            "condition": "clear",
            "rain_probability": 30,
        }

        with pytest.raises(ValueError) as exc_info:
            normalize_weather_data(
                weather_data=weather_data,
                city="Test",
                latitude=0,
                longitude=0,
            )
        
        assert "temperature" in str(exc_info.value)

    def test_normalize_missing_humidity(self):
        """Test error when humidity is missing."""
        weather_data = {
            "temperature": 25.0,
            "wind_speed": 15.0,
            "condition": "clear",
            "rain_probability": 30,
        }

        with pytest.raises(ValueError) as exc_info:
            normalize_weather_data(
                weather_data=weather_data,
                city="Test",
                latitude=0,
                longitude=0,
            )
        
        assert "humidity" in str(exc_info.value)

    def test_normalize_invalid_temperature_type(self):
        """Test error when temperature has invalid type."""
        weather_data = {
            "temperature": "hot",
            "humidity": 60,
            "wind_speed": 15.0,
            "condition": "clear",
            "rain_probability": 30,
        }

        with pytest.raises(ValueError) as exc_info:
            normalize_weather_data(
                weather_data=weather_data,
                city="Test",
                latitude=0,
                longitude=0,
            )
        
        assert "temperature" in str(exc_info.value).lower()

    def test_normalize_humidity_out_of_range_high(self):
        """Test error when humidity exceeds 100."""
        weather_data = {
            "temperature": 25.0,
            "humidity": 150,
            "wind_speed": 15.0,
            "condition": "clear",
            "rain_probability": 30,
        }

        with pytest.raises(ValueError) as exc_info:
            normalize_weather_data(
                weather_data=weather_data,
                city="Test",
                latitude=0,
                longitude=0,
            )
        
        assert "humidity" in str(exc_info.value).lower()

    def test_normalize_humidity_out_of_range_low(self):
        """Test error when humidity is negative."""
        weather_data = {
            "temperature": 25.0,
            "humidity": -10,
            "wind_speed": 15.0,
            "condition": "clear",
            "rain_probability": 30,
        }

        with pytest.raises(ValueError) as exc_info:
            normalize_weather_data(
                weather_data=weather_data,
                city="Test",
                latitude=0,
                longitude=0,
            )
        
        assert "humidity" in str(exc_info.value).lower()

    def test_normalize_negative_wind_speed(self):
        """Test error when wind speed is negative."""
        weather_data = {
            "temperature": 25.0,
            "humidity": 60,
            "wind_speed": -5.0,
            "condition": "clear",
            "rain_probability": 30,
        }

        with pytest.raises(ValueError) as exc_info:
            normalize_weather_data(
                weather_data=weather_data,
                city="Test",
                latitude=0,
                longitude=0,
            )
        
        assert "wind_speed" in str(exc_info.value).lower()

    def test_normalize_empty_condition(self):
        """Test error when condition is empty string."""
        weather_data = {
            "temperature": 25.0,
            "humidity": 60,
            "wind_speed": 15.0,
            "condition": "",
            "rain_probability": 30,
        }

        with pytest.raises(ValueError) as exc_info:
            normalize_weather_data(
                weather_data=weather_data,
                city="Test",
                latitude=0,
                longitude=0,
            )
        
        assert "condition" in str(exc_info.value).lower()

    def test_normalize_rain_probability_out_of_range(self):
        """Test error when rain probability exceeds 100."""
        weather_data = {
            "temperature": 25.0,
            "humidity": 60,
            "wind_speed": 15.0,
            "condition": "clear",
            "rain_probability": 120,
        }

        with pytest.raises(ValueError) as exc_info:
            normalize_weather_data(
                weather_data=weather_data,
                city="Test",
                latitude=0,
                longitude=0,
            )
        
        assert "rain_probability" in str(exc_info.value).lower()

    def test_normalize_timestamp_is_utc(self):
        """Test that timestamp is in UTC."""
        weather_data = {
            "temperature": 25.0,
            "humidity": 60,
            "wind_speed": 15.0,
            "condition": "clear",
            "rain_probability": 30,
        }

        result = normalize_weather_data(
            weather_data=weather_data,
            city="Test",
            latitude=0,
            longitude=0,
        )

        # Parse timestamp and verify it's valid ISO format
        timestamp = result["timestamp"]
        parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        assert parsed.tzinfo is not None


class TestToJson:
    """Unit tests for to_json function."""

    def test_to_json_valid_data(self):
        """Test JSON serialization of valid data."""
        data = {
            "timestamp": "2025-12-03T14:30:00+00:00",
            "location": {"city": "Test", "latitude": 0.0, "longitude": 0.0},
            "weather": {
                "temperature": 25.0,
                "humidity": 60,
                "windSpeed": 15.0,
                "condition": "clear",
                "rainProbability": 30,
            },
            "source": "open-meteo",
        }

        result = to_json(data)
        
        assert isinstance(result, str)
        parsed = json.loads(result)
        assert parsed == data

    def test_to_json_unicode_characters(self):
        """Test JSON serialization preserves unicode."""
        data = {
            "timestamp": "2025-12-03T14:30:00+00:00",
            "location": {"city": "São Paulo", "latitude": -23.5505, "longitude": -46.6333},
            "weather": {
                "temperature": 25.0,
                "humidity": 60,
                "windSpeed": 15.0,
                "condition": "clear",
                "rainProbability": 30,
            },
            "source": "open-meteo",
        }

        result = to_json(data)
        
        assert "São Paulo" in result
        parsed = json.loads(result)
        assert parsed["location"]["city"] == "São Paulo"


class TestValidateNormalizedStructure:
    """Unit tests for validate_normalized_structure function."""

    def test_validate_complete_structure(self):
        """Test validation of complete structure."""
        data = {
            "timestamp": "2025-12-03T14:30:00+00:00",
            "location": {"city": "Test", "latitude": 0.0, "longitude": 0.0},
            "weather": {
                "temperature": 25.0,
                "humidity": 60,
                "windSpeed": 15.0,
                "condition": "clear",
                "rainProbability": 30,
            },
            "source": "open-meteo",
        }

        assert validate_normalized_structure(data) is True

    def test_validate_missing_timestamp(self):
        """Test validation fails when timestamp is missing."""
        data = {
            "location": {"city": "Test", "latitude": 0.0, "longitude": 0.0},
            "weather": {
                "temperature": 25.0,
                "humidity": 60,
                "windSpeed": 15.0,
                "condition": "clear",
                "rainProbability": 30,
            },
            "source": "open-meteo",
        }

        with pytest.raises(ValueError) as exc_info:
            validate_normalized_structure(data)
        
        assert "timestamp" in str(exc_info.value)

    def test_validate_missing_location(self):
        """Test validation fails when location is missing."""
        data = {
            "timestamp": "2025-12-03T14:30:00+00:00",
            "weather": {
                "temperature": 25.0,
                "humidity": 60,
                "windSpeed": 15.0,
                "condition": "clear",
                "rainProbability": 30,
            },
            "source": "open-meteo",
        }

        with pytest.raises(ValueError) as exc_info:
            validate_normalized_structure(data)
        
        assert "location" in str(exc_info.value)

    def test_validate_missing_weather(self):
        """Test validation fails when weather is missing."""
        data = {
            "timestamp": "2025-12-03T14:30:00+00:00",
            "location": {"city": "Test", "latitude": 0.0, "longitude": 0.0},
            "source": "open-meteo",
        }

        with pytest.raises(ValueError) as exc_info:
            validate_normalized_structure(data)
        
        assert "weather" in str(exc_info.value)

    def test_validate_missing_source(self):
        """Test validation fails when source is missing."""
        data = {
            "timestamp": "2025-12-03T14:30:00+00:00",
            "location": {"city": "Test", "latitude": 0.0, "longitude": 0.0},
            "weather": {
                "temperature": 25.0,
                "humidity": 60,
                "windSpeed": 15.0,
                "condition": "clear",
                "rainProbability": 30,
            },
        }

        with pytest.raises(ValueError) as exc_info:
            validate_normalized_structure(data)
        
        assert "source" in str(exc_info.value)

    def test_validate_invalid_timestamp_format(self):
        """Test validation fails with invalid timestamp format."""
        data = {
            "timestamp": "not-a-timestamp",
            "location": {"city": "Test", "latitude": 0.0, "longitude": 0.0},
            "weather": {
                "temperature": 25.0,
                "humidity": 60,
                "windSpeed": 15.0,
                "condition": "clear",
                "rainProbability": 30,
            },
            "source": "open-meteo",
        }

        with pytest.raises(ValueError) as exc_info:
            validate_normalized_structure(data)
        
        assert "timestamp" in str(exc_info.value).lower()

    def test_validate_missing_location_field(self):
        """Test validation fails when location field is missing."""
        data = {
            "timestamp": "2025-12-03T14:30:00+00:00",
            "location": {"city": "Test", "latitude": 0.0},  # missing longitude
            "weather": {
                "temperature": 25.0,
                "humidity": 60,
                "windSpeed": 15.0,
                "condition": "clear",
                "rainProbability": 30,
            },
            "source": "open-meteo",
        }

        with pytest.raises(ValueError) as exc_info:
            validate_normalized_structure(data)
        
        assert "longitude" in str(exc_info.value)

    def test_validate_missing_weather_field(self):
        """Test validation fails when weather field is missing."""
        data = {
            "timestamp": "2025-12-03T14:30:00+00:00",
            "location": {"city": "Test", "latitude": 0.0, "longitude": 0.0},
            "weather": {
                "temperature": 25.0,
                "humidity": 60,
                # missing windSpeed, condition, rainProbability
            },
            "source": "open-meteo",
        }

        with pytest.raises(ValueError) as exc_info:
            validate_normalized_structure(data)
        
        assert "windSpeed" in str(exc_info.value)

    def test_validate_location_not_dict(self):
        """Test validation fails when location is not a dict."""
        data = {
            "timestamp": "2025-12-03T14:30:00+00:00",
            "location": "not a dict",
            "weather": {
                "temperature": 25.0,
                "humidity": 60,
                "windSpeed": 15.0,
                "condition": "clear",
                "rainProbability": 30,
            },
            "source": "open-meteo",
        }

        with pytest.raises(ValueError) as exc_info:
            validate_normalized_structure(data)
        
        assert "location" in str(exc_info.value).lower()

    def test_validate_weather_not_dict(self):
        """Test validation fails when weather is not a dict."""
        data = {
            "timestamp": "2025-12-03T14:30:00+00:00",
            "location": {"city": "Test", "latitude": 0.0, "longitude": 0.0},
            "weather": "not a dict",
            "source": "open-meteo",
        }

        with pytest.raises(ValueError) as exc_info:
            validate_normalized_structure(data)
        
        assert "weather" in str(exc_info.value).lower()
