"""Unit tests for weather collector module.

Tests the main collector service with mocked dependencies and error handling.
_Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
"""

import pytest
from unittest.mock import MagicMock, patch, PropertyMock

from src.collector import WeatherCollector
from src.api_client import WeatherAPIError
from src.queue_publisher import QueuePublisherError


class TestWeatherCollector:
    """Unit tests for WeatherCollector class."""

    @patch("src.collector.QueuePublisher")
    @patch("src.collector.WeatherAPIClient")
    def test_init_creates_components(self, mock_api_client_class, mock_publisher_class):
        """Test initialization creates API client and publisher."""
        collector = WeatherCollector()

        mock_api_client_class.assert_called_once()
        mock_publisher_class.assert_called_once()
        assert collector.api_client is not None
        assert collector.publisher is not None

    @patch("src.collector.QueuePublisher")
    @patch("src.collector.WeatherAPIClient")
    def test_collect_and_publish_success(self, mock_api_client_class, mock_publisher_class):
        """Test successful data collection and publishing."""
        # Setup mocks
        mock_api_client = MagicMock()
        mock_api_client.fetch_weather.return_value = {
            "current": {
                "temperature_2m": 25.5,
                "relative_humidity_2m": 60,
                "wind_speed_10m": 15.0,
                "weather_code": 2,
            },
            "hourly": {"precipitation_probability": [30]},
        }
        mock_api_client_class.return_value = mock_api_client

        mock_publisher = MagicMock()
        mock_publisher_class.return_value = mock_publisher

        collector = WeatherCollector()
        result = collector.collect_and_publish()

        assert result is True
        mock_api_client.fetch_weather.assert_called_once()
        mock_publisher.publish.assert_called_once()

    @patch("src.collector.QueuePublisher")
    @patch("src.collector.WeatherAPIClient")
    def test_collect_and_publish_api_error(self, mock_api_client_class, mock_publisher_class):
        """Test handling of API errors during collection."""
        mock_api_client = MagicMock()
        mock_api_client.fetch_weather.side_effect = WeatherAPIError("API unavailable")
        mock_api_client_class.return_value = mock_api_client

        mock_publisher = MagicMock()
        mock_publisher_class.return_value = mock_publisher

        collector = WeatherCollector()
        result = collector.collect_and_publish()

        assert result is False
        mock_publisher.publish.assert_not_called()

    @patch("src.collector.QueuePublisher")
    @patch("src.collector.WeatherAPIClient")
    def test_collect_and_publish_queue_error(self, mock_api_client_class, mock_publisher_class):
        """Test handling of queue publisher errors."""
        mock_api_client = MagicMock()
        mock_api_client.fetch_weather.return_value = {
            "current": {
                "temperature_2m": 25.5,
                "relative_humidity_2m": 60,
                "wind_speed_10m": 15.0,
                "weather_code": 2,
            },
            "hourly": {"precipitation_probability": [30]},
        }
        mock_api_client_class.return_value = mock_api_client

        mock_publisher = MagicMock()
        mock_publisher.publish.side_effect = QueuePublisherError("Queue unavailable")
        mock_publisher_class.return_value = mock_publisher

        collector = WeatherCollector()
        result = collector.collect_and_publish()

        assert result is False

    @patch("src.collector.QueuePublisher")
    @patch("src.collector.WeatherAPIClient")
    def test_collect_and_publish_data_processing_error(self, mock_api_client_class, mock_publisher_class):
        """Test handling of data processing errors."""
        mock_api_client = MagicMock()
        # Return incomplete data that will cause extraction to fail
        mock_api_client.fetch_weather.return_value = {
            "current": {},  # Missing required fields
            "hourly": {},
        }
        mock_api_client_class.return_value = mock_api_client

        mock_publisher = MagicMock()
        mock_publisher_class.return_value = mock_publisher

        collector = WeatherCollector()
        result = collector.collect_and_publish()

        assert result is False
        mock_publisher.publish.assert_not_called()

    @patch("src.collector.QueuePublisher")
    @patch("src.collector.WeatherAPIClient")
    def test_collect_and_publish_unexpected_error(self, mock_api_client_class, mock_publisher_class):
        """Test handling of unexpected errors."""
        mock_api_client = MagicMock()
        mock_api_client.fetch_weather.side_effect = RuntimeError("Unexpected error")
        mock_api_client_class.return_value = mock_api_client

        mock_publisher = MagicMock()
        mock_publisher_class.return_value = mock_publisher

        collector = WeatherCollector()
        result = collector.collect_and_publish()

        assert result is False

    @patch("src.collector.QueuePublisher")
    @patch("src.collector.WeatherAPIClient")
    def test_stop_disconnects_publisher(self, mock_api_client_class, mock_publisher_class):
        """Test stop method disconnects from RabbitMQ."""
        mock_publisher = MagicMock()
        mock_publisher_class.return_value = mock_publisher

        collector = WeatherCollector()
        collector.stop()

        mock_publisher.disconnect.assert_called_once()

    @patch("src.collector.QueuePublisher")
    @patch("src.collector.WeatherAPIClient")
    def test_collect_publishes_json_message(self, mock_api_client_class, mock_publisher_class):
        """Test that collected data is published as JSON."""
        import json

        mock_api_client = MagicMock()
        mock_api_client.fetch_weather.return_value = {
            "current": {
                "temperature_2m": 25.5,
                "relative_humidity_2m": 60,
                "wind_speed_10m": 15.0,
                "weather_code": 0,
            },
            "hourly": {"precipitation_probability": [30]},
        }
        mock_api_client_class.return_value = mock_api_client

        mock_publisher = MagicMock()
        mock_publisher_class.return_value = mock_publisher

        collector = WeatherCollector()
        collector.collect_and_publish()

        # Verify publish was called with valid JSON
        call_args = mock_publisher.publish.call_args
        message = call_args[0][0]
        
        # Should be valid JSON
        parsed = json.loads(message)
        assert "timestamp" in parsed
        assert "location" in parsed
        assert "weather" in parsed
        assert "source" in parsed

    @patch("src.collector.QueuePublisher")
    @patch("src.collector.WeatherAPIClient")
    def test_collect_extracts_all_weather_fields(self, mock_api_client_class, mock_publisher_class):
        """Test that all weather fields are extracted and published."""
        import json

        mock_api_client = MagicMock()
        mock_api_client.fetch_weather.return_value = {
            "current": {
                "temperature_2m": 28.5,
                "relative_humidity_2m": 65,
                "wind_speed_10m": 12.3,
                "weather_code": 2,
            },
            "hourly": {"precipitation_probability": [45]},
        }
        mock_api_client_class.return_value = mock_api_client

        mock_publisher = MagicMock()
        mock_publisher_class.return_value = mock_publisher

        collector = WeatherCollector()
        collector.collect_and_publish()

        call_args = mock_publisher.publish.call_args
        message = call_args[0][0]
        parsed = json.loads(message)

        weather = parsed["weather"]
        assert weather["temperature"] == 28.5
        assert weather["humidity"] == 65
        assert weather["windSpeed"] == 12.3
        assert weather["condition"] == "partly_cloudy"
        assert weather["rainProbability"] == 45


class TestWeatherCollectorIntegration:
    """Integration-style unit tests for collector flow."""

    @patch("src.collector.QueuePublisher")
    @patch("src.collector.WeatherAPIClient")
    def test_full_collection_flow(self, mock_api_client_class, mock_publisher_class):
        """Test complete flow from API fetch to queue publish."""
        import json

        # Setup API client mock
        mock_api_client = MagicMock()
        mock_api_client.fetch_weather.return_value = {
            "current": {
                "temperature_2m": 22.0,
                "relative_humidity_2m": 70,
                "wind_speed_10m": 8.5,
                "weather_code": 61,  # rain
            },
            "hourly": {"precipitation_probability": [80, 75, 70]},
        }
        mock_api_client_class.return_value = mock_api_client

        # Setup publisher mock
        mock_publisher = MagicMock()
        mock_publisher_class.return_value = mock_publisher

        # Execute collection
        collector = WeatherCollector()
        result = collector.collect_and_publish()

        # Verify success
        assert result is True

        # Verify API was called
        mock_api_client.fetch_weather.assert_called_once()

        # Verify message was published
        mock_publisher.publish.assert_called_once()

        # Verify message content
        call_args = mock_publisher.publish.call_args
        message = call_args[0][0]
        parsed = json.loads(message)

        assert parsed["weather"]["temperature"] == 22.0
        assert parsed["weather"]["humidity"] == 70
        assert parsed["weather"]["windSpeed"] == 8.5
        assert parsed["weather"]["condition"] == "rain"
        assert parsed["weather"]["rainProbability"] == 80
        assert parsed["source"] == "open-meteo"

    @patch("src.collector.QueuePublisher")
    @patch("src.collector.WeatherAPIClient")
    def test_retry_on_next_interval_after_api_error(self, mock_api_client_class, mock_publisher_class):
        """Test that API errors don't crash the collector."""
        mock_api_client = MagicMock()
        # First call fails, second succeeds
        mock_api_client.fetch_weather.side_effect = [
            WeatherAPIError("Temporary failure"),
            {
                "current": {
                    "temperature_2m": 25.0,
                    "relative_humidity_2m": 60,
                    "wind_speed_10m": 10.0,
                    "weather_code": 0,
                },
                "hourly": {"precipitation_probability": [20]},
            },
        ]
        mock_api_client_class.return_value = mock_api_client

        mock_publisher = MagicMock()
        mock_publisher_class.return_value = mock_publisher

        collector = WeatherCollector()
        
        # First attempt fails
        result1 = collector.collect_and_publish()
        assert result1 is False
        
        # Second attempt succeeds
        result2 = collector.collect_and_publish()
        assert result2 is True

    @patch("src.collector.QueuePublisher")
    @patch("src.collector.WeatherAPIClient")
    def test_retry_on_next_interval_after_queue_error(self, mock_api_client_class, mock_publisher_class):
        """Test that queue errors don't crash the collector."""
        mock_api_client = MagicMock()
        mock_api_client.fetch_weather.return_value = {
            "current": {
                "temperature_2m": 25.0,
                "relative_humidity_2m": 60,
                "wind_speed_10m": 10.0,
                "weather_code": 0,
            },
            "hourly": {"precipitation_probability": [20]},
        }
        mock_api_client_class.return_value = mock_api_client

        mock_publisher = MagicMock()
        # First call fails, second succeeds
        mock_publisher.publish.side_effect = [
            QueuePublisherError("Queue unavailable"),
            True,
        ]
        mock_publisher_class.return_value = mock_publisher

        collector = WeatherCollector()
        
        # First attempt fails
        result1 = collector.collect_and_publish()
        assert result1 is False
        
        # Second attempt succeeds
        result2 = collector.collect_and_publish()
        assert result2 is True
