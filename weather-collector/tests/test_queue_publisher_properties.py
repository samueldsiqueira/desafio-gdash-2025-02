"""Property-based tests for message delivery to broker.

**Feature: weather-monitoring-system, Property 3: Message delivery to broker**
**Validates: Requirements 1.4**
"""

import json
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from hypothesis import given, strategies as st, settings

from src.queue_publisher import QueuePublisher, QueuePublisherError, publish_weather_message
from src.normalizer import normalize_weather_data, to_json


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
        "city": draw(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=("L", "N")))),
        "latitude": draw(st.floats(min_value=-90, max_value=90, allow_nan=False)),
        "longitude": draw(st.floats(min_value=-180, max_value=180, allow_nan=False)),
    }


# Strategy for generating valid normalized messages
@st.composite
def valid_normalized_message(draw):
    """Generate valid normalized weather message JSON."""
    weather = draw(valid_weather_data())
    location = draw(valid_location())
    
    normalized = normalize_weather_data(
        weather_data=weather,
        city=location["city"],
        latitude=location["latitude"],
        longitude=location["longitude"],
    )
    return to_json(normalized)


class TestMessageDeliveryProperty:
    """
    **Feature: weather-monitoring-system, Property 3: Message delivery to broker**
    **Validates: Requirements 1.4**

    For any normalized weather data, the Weather Collector should successfully
    publish a message to the Message Broker queue.
    """

    @given(message=valid_normalized_message())
    @settings(max_examples=100)
    def test_publish_accepts_valid_normalized_messages(self, message):
        """Property: Publisher accepts any valid normalized JSON message."""
        # Verify the message is valid JSON
        parsed = json.loads(message)
        assert isinstance(parsed, dict)
        
        # Verify message has required structure for broker
        assert "timestamp" in parsed
        assert "location" in parsed
        assert "weather" in parsed
        assert "source" in parsed

    @given(message=valid_normalized_message())
    @settings(max_examples=100)
    def test_publish_delivers_message_to_channel(self, message):
        """Property: For any valid normalized message, publish delivers to channel."""
        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="test-weather-queue"
        )
        
        # Mock the channel and connection
        mock_channel = MagicMock()
        mock_connection = MagicMock()
        mock_connection.is_open = True
        
        publisher._channel = mock_channel
        publisher._connection = mock_connection
        
        # Publish should succeed
        result = publisher.publish(message)
        
        assert result is True
        mock_channel.basic_publish.assert_called_once()
        
        # Verify the message was passed correctly
        call_args = mock_channel.basic_publish.call_args
        assert call_args.kwargs["body"] == message.encode("utf-8")
        assert call_args.kwargs["routing_key"] == "test-weather-queue"

    @given(message=valid_normalized_message())
    @settings(max_examples=100)
    def test_publish_sets_correct_message_properties(self, message):
        """Property: Published messages have correct delivery properties."""
        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="weather-queue"
        )
        
        # Mock the channel and connection
        mock_channel = MagicMock()
        mock_connection = MagicMock()
        mock_connection.is_open = True
        
        publisher._channel = mock_channel
        publisher._connection = mock_connection
        
        publisher.publish(message)
        
        # Verify message properties
        call_args = mock_channel.basic_publish.call_args
        properties = call_args.kwargs["properties"]
        
        # Message should be persistent (delivery_mode=2)
        assert properties.delivery_mode == 2
        # Content type should be JSON
        assert properties.content_type == "application/json"

    @given(message=valid_normalized_message())
    @settings(max_examples=100)
    def test_publish_preserves_message_content(self, message):
        """Property: Message content is preserved during publish."""
        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="weather-queue"
        )
        
        # Mock the channel and connection
        mock_channel = MagicMock()
        mock_connection = MagicMock()
        mock_connection.is_open = True
        
        publisher._channel = mock_channel
        publisher._connection = mock_connection
        
        publisher.publish(message)
        
        # Get the published body
        call_args = mock_channel.basic_publish.call_args
        published_body = call_args.kwargs["body"]
        
        # Decode and verify content matches original
        decoded = published_body.decode("utf-8")
        assert decoded == message
        
        # Verify JSON structure is preserved
        original_parsed = json.loads(message)
        published_parsed = json.loads(decoded)
        assert original_parsed == published_parsed

    def test_publish_raises_when_not_connected(self):
        """Publisher raises error when not connected."""
        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="weather-queue"
        )
        
        with pytest.raises(QueuePublisherError) as exc_info:
            publisher.publish('{"test": "message"}')
        
        assert "Not connected" in str(exc_info.value)

    @given(weather_data=valid_weather_data(), location=valid_location())
    @settings(max_examples=100)
    def test_end_to_end_message_flow(self, weather_data, location):
        """Property: Complete flow from normalization to publish works for any valid data."""
        # Normalize the data
        normalized = normalize_weather_data(
            weather_data=weather_data,
            city=location["city"],
            latitude=location["latitude"],
            longitude=location["longitude"],
        )
        
        # Convert to JSON
        message = to_json(normalized)
        
        # Verify message is valid JSON
        parsed = json.loads(message)
        
        # Create publisher with mocked connection
        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="weather-data"
        )
        
        mock_channel = MagicMock()
        mock_connection = MagicMock()
        mock_connection.is_open = True
        
        publisher._channel = mock_channel
        publisher._connection = mock_connection
        
        # Publish should succeed
        result = publisher.publish(message)
        assert result is True
        
        # Verify the complete message was delivered
        call_args = mock_channel.basic_publish.call_args
        delivered_body = call_args.kwargs["body"].decode("utf-8")
        delivered_data = json.loads(delivered_body)
        
        # All original data should be present
        assert delivered_data["location"]["city"] == location["city"]
        assert delivered_data["weather"]["temperature"] == weather_data["temperature"]
        assert delivered_data["weather"]["humidity"] == weather_data["humidity"]
        assert delivered_data["weather"]["condition"] == weather_data["condition"]
