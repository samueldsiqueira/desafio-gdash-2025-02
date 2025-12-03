"""API client for weather data collection from Open-Meteo."""

import logging
from typing import Any
import requests

logger = logging.getLogger(__name__)


class WeatherAPIError(Exception):
    """Exception raised when weather API request fails."""

    pass


class WeatherAPIClient:
    """Client for fetching weather data from Open-Meteo API."""

    def __init__(self, base_url: str, api_key: str = ""):
        """Initialize the API client.

        Args:
            base_url: Base URL for the weather API
            api_key: Optional API key for authentication
        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.session = requests.Session()
        self.timeout = 30

    def fetch_weather(self, latitude: float, longitude: float) -> dict[str, Any]:
        """Fetch current weather data for a location.

        Args:
            latitude: Location latitude
            longitude: Location longitude

        Returns:
            Raw API response as dictionary

        Raises:
            WeatherAPIError: If the API request fails
        """
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
            "hourly": "precipitation_probability",
            "timezone": "auto",
        }

        if self.api_key:
            params["apikey"] = self.api_key

        try:
            logger.info(f"Fetching weather data for lat={latitude}, lon={longitude}")
            response = self.session.get(
                self.base_url, params=params, timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            logger.debug(f"Received weather data: {data}")
            return data
        except requests.exceptions.Timeout as e:
            logger.error(f"Weather API timeout: {e}")
            raise WeatherAPIError(f"API request timed out: {e}") from e
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Weather API connection error: {e}")
            raise WeatherAPIError(f"Failed to connect to API: {e}") from e
        except requests.exceptions.HTTPError as e:
            logger.error(f"Weather API HTTP error: {e}")
            raise WeatherAPIError(f"API returned error: {e}") from e
        except requests.exceptions.RequestException as e:
            logger.error(f"Weather API request failed: {e}")
            raise WeatherAPIError(f"API request failed: {e}") from e
        except ValueError as e:
            logger.error(f"Failed to parse API response: {e}")
            raise WeatherAPIError(f"Invalid API response: {e}") from e


def extract_weather_data(api_response: dict[str, Any]) -> dict[str, Any]:
    """Extract required weather fields from API response.

    Args:
        api_response: Raw response from Open-Meteo API

    Returns:
        Dictionary with extracted weather data

    Raises:
        ValueError: If required fields are missing
    """
    try:
        current = api_response.get("current", {})
        hourly = api_response.get("hourly", {})

        # Extract temperature
        temperature = current.get("temperature_2m")
        if temperature is None:
            raise ValueError("Missing temperature_2m in response")

        # Extract humidity
        humidity = current.get("relative_humidity_2m")
        if humidity is None:
            raise ValueError("Missing relative_humidity_2m in response")

        # Extract wind speed
        wind_speed = current.get("wind_speed_10m")
        if wind_speed is None:
            raise ValueError("Missing wind_speed_10m in response")

        # Extract weather code and map to condition
        weather_code = current.get("weather_code", 0)
        condition = _map_weather_code(weather_code)

        # Extract rain probability (first hourly value or 0)
        precipitation_probs = hourly.get("precipitation_probability", [])
        rain_probability = precipitation_probs[0] if precipitation_probs else 0

        return {
            "temperature": float(temperature),
            "humidity": int(humidity),
            "wind_speed": float(wind_speed),
            "condition": condition,
            "rain_probability": int(rain_probability),
        }
    except (KeyError, TypeError, IndexError) as e:
        raise ValueError(f"Failed to extract weather data: {e}") from e


def _map_weather_code(code: int) -> str:
    """Map Open-Meteo weather code to condition string.

    Args:
        code: WMO weather code

    Returns:
        Human-readable condition string
    """
    # WMO Weather interpretation codes
    # https://open-meteo.com/en/docs
    code_map = {
        0: "clear",
        1: "mainly_clear",
        2: "partly_cloudy",
        3: "overcast",
        45: "fog",
        48: "fog",
        51: "drizzle",
        53: "drizzle",
        55: "drizzle",
        56: "freezing_drizzle",
        57: "freezing_drizzle",
        61: "rain",
        63: "rain",
        65: "heavy_rain",
        66: "freezing_rain",
        67: "freezing_rain",
        71: "snow",
        73: "snow",
        75: "heavy_snow",
        77: "snow_grains",
        80: "rain_showers",
        81: "rain_showers",
        82: "heavy_rain_showers",
        85: "snow_showers",
        86: "heavy_snow_showers",
        95: "thunderstorm",
        96: "thunderstorm_hail",
        99: "thunderstorm_hail",
    }
    return code_map.get(code, "unknown")
