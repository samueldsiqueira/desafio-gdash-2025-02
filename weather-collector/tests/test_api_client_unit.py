"""Unit tests for API client module.

Tests API client with mocked responses and error handling.
_Requirements: 1.1, 1.2, 1.5_
"""

import pytest
import responses
from requests.exceptions import Timeout, ConnectionError

from src.api_client import (
    WeatherAPIClient,
    WeatherAPIError,
    extract_weather_data,
    _map_weather_code,
)


class TestWeatherAPIClient:
    """Unit tests for WeatherAPIClient class."""

    @responses.activate
    def test_fetch_weather_success(self):
        """Test successful weather data fetch."""
        base_url = "https://api.open-meteo.com/v1/forecast"
        responses.add(
            responses.GET,
            base_url,
            json={
                "current": {
                    "temperature_2m": 25.5,
                    "relative_humidity_2m": 60,
                    "wind_speed_10m": 15.0,
                    "weather_code": 2,
                },
                "hourly": {"precipitation_probability": [30, 35, 40]},
            },
            status=200,
        )

        client = WeatherAPIClient(base_url=base_url)
        result = client.fetch_weather(latitude=-23.5505, longitude=-46.6333)

        assert result["current"]["temperature_2m"] == 25.5
        assert result["current"]["relative_humidity_2m"] == 60
        assert result["hourly"]["precipitation_probability"][0] == 30

    @responses.activate
    def test_fetch_weather_with_api_key(self):
        """Test fetch includes API key when provided."""
        base_url = "https://api.open-meteo.com/v1/forecast"
        responses.add(
            responses.GET,
            base_url,
            json={"current": {}, "hourly": {}},
            status=200,
        )

        client = WeatherAPIClient(base_url=base_url, api_key="test-key")
        client.fetch_weather(latitude=0, longitude=0)

        assert "apikey=test-key" in responses.calls[0].request.url

    @responses.activate
    def test_fetch_weather_timeout_error(self):
        """Test timeout error handling."""
        base_url = "https://api.open-meteo.com/v1/forecast"
        responses.add(
            responses.GET,
            base_url,
            body=Timeout("Connection timed out"),
        )

        client = WeatherAPIClient(base_url=base_url)
        
        with pytest.raises(WeatherAPIError) as exc_info:
            client.fetch_weather(latitude=0, longitude=0)
        
        assert "timed out" in str(exc_info.value).lower()

    @responses.activate
    def test_fetch_weather_connection_error(self):
        """Test connection error handling."""
        base_url = "https://api.open-meteo.com/v1/forecast"
        responses.add(
            responses.GET,
            base_url,
            body=ConnectionError("Failed to connect"),
        )

        client = WeatherAPIClient(base_url=base_url)
        
        with pytest.raises(WeatherAPIError) as exc_info:
            client.fetch_weather(latitude=0, longitude=0)
        
        assert "connect" in str(exc_info.value).lower()

    @responses.activate
    def test_fetch_weather_http_error(self):
        """Test HTTP error response handling."""
        base_url = "https://api.open-meteo.com/v1/forecast"
        responses.add(
            responses.GET,
            base_url,
            json={"error": "Bad request"},
            status=400,
        )

        client = WeatherAPIClient(base_url=base_url)
        
        with pytest.raises(WeatherAPIError) as exc_info:
            client.fetch_weather(latitude=0, longitude=0)
        
        assert "error" in str(exc_info.value).lower()

    @responses.activate
    def test_fetch_weather_invalid_json_response(self):
        """Test invalid JSON response handling."""
        base_url = "https://api.open-meteo.com/v1/forecast"
        responses.add(
            responses.GET,
            base_url,
            body="not valid json",
            status=200,
        )

        client = WeatherAPIClient(base_url=base_url)
        
        with pytest.raises(WeatherAPIError) as exc_info:
            client.fetch_weather(latitude=0, longitude=0)
        
        assert "failed" in str(exc_info.value).lower()

    @responses.activate
    def test_fetch_weather_server_error(self):
        """Test server error (5xx) handling."""
        base_url = "https://api.open-meteo.com/v1/forecast"
        responses.add(
            responses.GET,
            base_url,
            json={"error": "Internal server error"},
            status=500,
        )

        client = WeatherAPIClient(base_url=base_url)
        
        with pytest.raises(WeatherAPIError):
            client.fetch_weather(latitude=0, longitude=0)


class TestExtractWeatherData:
    """Unit tests for extract_weather_data function."""

    def test_extract_complete_response(self):
        """Test extraction from complete API response."""
        api_response = {
            "current": {
                "temperature_2m": 28.5,
                "relative_humidity_2m": 65,
                "wind_speed_10m": 12.3,
                "weather_code": 2,
            },
            "hourly": {"precipitation_probability": [30, 40, 50]},
        }

        result = extract_weather_data(api_response)

        assert result["temperature"] == 28.5
        assert result["humidity"] == 65
        assert result["wind_speed"] == 12.3
        assert result["condition"] == "partly_cloudy"
        assert result["rain_probability"] == 30

    def test_extract_missing_temperature(self):
        """Test error when temperature is missing."""
        api_response = {
            "current": {
                "relative_humidity_2m": 65,
                "wind_speed_10m": 12.3,
            },
            "hourly": {"precipitation_probability": [30]},
        }

        with pytest.raises(ValueError) as exc_info:
            extract_weather_data(api_response)
        
        assert "temperature" in str(exc_info.value).lower()

    def test_extract_missing_humidity(self):
        """Test error when humidity is missing."""
        api_response = {
            "current": {
                "temperature_2m": 25.0,
                "wind_speed_10m": 12.3,
            },
            "hourly": {"precipitation_probability": [30]},
        }

        with pytest.raises(ValueError) as exc_info:
            extract_weather_data(api_response)
        
        assert "humidity" in str(exc_info.value).lower()

    def test_extract_missing_wind_speed(self):
        """Test error when wind speed is missing."""
        api_response = {
            "current": {
                "temperature_2m": 25.0,
                "relative_humidity_2m": 65,
            },
            "hourly": {"precipitation_probability": [30]},
        }

        with pytest.raises(ValueError) as exc_info:
            extract_weather_data(api_response)
        
        assert "wind_speed" in str(exc_info.value).lower()

    def test_extract_empty_precipitation_probability(self):
        """Test extraction with empty precipitation probability list."""
        api_response = {
            "current": {
                "temperature_2m": 25.0,
                "relative_humidity_2m": 65,
                "wind_speed_10m": 10.0,
                "weather_code": 0,
            },
            "hourly": {"precipitation_probability": []},
        }

        result = extract_weather_data(api_response)
        assert result["rain_probability"] == 0

    def test_extract_missing_hourly_section(self):
        """Test extraction with missing hourly section."""
        api_response = {
            "current": {
                "temperature_2m": 25.0,
                "relative_humidity_2m": 65,
                "wind_speed_10m": 10.0,
                "weather_code": 0,
            },
        }

        result = extract_weather_data(api_response)
        assert result["rain_probability"] == 0

    def test_extract_default_weather_code(self):
        """Test extraction with missing weather code uses default."""
        api_response = {
            "current": {
                "temperature_2m": 25.0,
                "relative_humidity_2m": 65,
                "wind_speed_10m": 10.0,
            },
            "hourly": {"precipitation_probability": [20]},
        }

        result = extract_weather_data(api_response)
        assert result["condition"] == "clear"  # code 0 maps to clear


class TestMapWeatherCode:
    """Unit tests for weather code mapping."""

    def test_clear_sky(self):
        """Test clear sky code mapping."""
        assert _map_weather_code(0) == "clear"

    def test_partly_cloudy(self):
        """Test partly cloudy code mapping."""
        assert _map_weather_code(2) == "partly_cloudy"

    def test_rain_codes(self):
        """Test rain code mappings."""
        assert _map_weather_code(61) == "rain"
        assert _map_weather_code(63) == "rain"
        assert _map_weather_code(65) == "heavy_rain"

    def test_snow_codes(self):
        """Test snow code mappings."""
        assert _map_weather_code(71) == "snow"
        assert _map_weather_code(75) == "heavy_snow"

    def test_thunderstorm_codes(self):
        """Test thunderstorm code mappings."""
        assert _map_weather_code(95) == "thunderstorm"
        assert _map_weather_code(96) == "thunderstorm_hail"

    def test_unknown_code(self):
        """Test unknown weather code returns 'unknown'."""
        assert _map_weather_code(999) == "unknown"
        assert _map_weather_code(-1) == "unknown"
