"""Unit tests for queue publisher module.

Tests RabbitMQ publisher with mocked connections and error handling.
_Requirements: 1.4, 1.5_
"""

import pytest
from unittest.mock import MagicMock, patch, PropertyMock
from pika.exceptions import AMQPConnectionError, AMQPChannelError

from src.queue_publisher import (
    QueuePublisher,
    QueuePublisherError,
    publish_weather_message,
)


class TestQueuePublisher:
    """Unit tests for QueuePublisher class."""

    def test_init_sets_properties(self):
        """Test initialization sets correct properties."""
        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="test-queue",
        )

        assert publisher.rabbitmq_url == "amqp://guest:guest@localhost:5672"
        assert publisher.queue_name == "test-queue"
        assert publisher._connection is None
        assert publisher._channel is None

    @patch("src.queue_publisher.pika.BlockingConnection")
    def test_connect_success(self, mock_connection_class):
        """Test successful connection to RabbitMQ."""
        mock_connection = MagicMock()
        mock_channel = MagicMock()
        mock_connection.channel.return_value = mock_channel
        mock_connection_class.return_value = mock_connection

        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="test-queue",
        )
        publisher.connect()

        assert publisher._connection is mock_connection
        assert publisher._channel is mock_channel
        mock_channel.queue_declare.assert_called_once_with(
            queue="test-queue", durable=True
        )

    @patch("src.queue_publisher.pika.BlockingConnection")
    def test_connect_failure(self, mock_connection_class):
        """Test connection failure raises QueuePublisherError."""
        mock_connection_class.side_effect = AMQPConnectionError("Connection refused")

        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="test-queue",
        )

        with pytest.raises(QueuePublisherError) as exc_info:
            publisher.connect()
        
        assert "Connection failed" in str(exc_info.value)

    def test_disconnect_closes_connection(self):
        """Test disconnect closes the connection."""
        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="test-queue",
        )
        
        mock_connection = MagicMock()
        mock_connection.is_open = True
        publisher._connection = mock_connection
        publisher._channel = MagicMock()

        publisher.disconnect()

        mock_connection.close.assert_called_once()
        assert publisher._connection is None
        assert publisher._channel is None

    def test_disconnect_handles_closed_connection(self):
        """Test disconnect handles already closed connection."""
        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="test-queue",
        )
        
        mock_connection = MagicMock()
        mock_connection.is_open = False
        publisher._connection = mock_connection

        # Should not raise
        publisher.disconnect()
        mock_connection.close.assert_not_called()

    def test_disconnect_handles_none_connection(self):
        """Test disconnect handles None connection."""
        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="test-queue",
        )

        # Should not raise
        publisher.disconnect()

    def test_publish_success(self):
        """Test successful message publish."""
        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="test-queue",
        )
        
        mock_channel = MagicMock()
        mock_connection = MagicMock()
        mock_connection.is_open = True
        publisher._channel = mock_channel
        publisher._connection = mock_connection

        result = publisher.publish('{"test": "message"}')

        assert result is True
        mock_channel.basic_publish.assert_called_once()

    def test_publish_not_connected(self):
        """Test publish raises error when not connected."""
        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="test-queue",
        )

        with pytest.raises(QueuePublisherError) as exc_info:
            publisher.publish('{"test": "message"}')
        
        assert "Not connected" in str(exc_info.value)

    def test_publish_connection_closed(self):
        """Test publish raises error when connection is closed."""
        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="test-queue",
        )
        
        mock_connection = MagicMock()
        mock_connection.is_open = False
        publisher._connection = mock_connection
        publisher._channel = MagicMock()

        with pytest.raises(QueuePublisherError) as exc_info:
            publisher.publish('{"test": "message"}')
        
        assert "Not connected" in str(exc_info.value)

    def test_publish_channel_error(self):
        """Test publish handles channel error."""
        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="test-queue",
        )
        
        mock_channel = MagicMock()
        mock_channel.basic_publish.side_effect = AMQPChannelError("Channel closed")
        mock_connection = MagicMock()
        mock_connection.is_open = True
        publisher._channel = mock_channel
        publisher._connection = mock_connection

        with pytest.raises(QueuePublisherError) as exc_info:
            publisher.publish('{"test": "message"}')
        
        assert "Publish failed" in str(exc_info.value)

    def test_publish_message_encoding(self):
        """Test message is properly encoded to UTF-8."""
        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="test-queue",
        )
        
        mock_channel = MagicMock()
        mock_connection = MagicMock()
        mock_connection.is_open = True
        publisher._channel = mock_channel
        publisher._connection = mock_connection

        message = '{"city": "São Paulo"}'
        publisher.publish(message)

        call_args = mock_channel.basic_publish.call_args
        assert call_args.kwargs["body"] == message.encode("utf-8")

    def test_publish_routing_key(self):
        """Test message is published to correct queue."""
        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="weather-data",
        )
        
        mock_channel = MagicMock()
        mock_connection = MagicMock()
        mock_connection.is_open = True
        publisher._channel = mock_channel
        publisher._connection = mock_connection

        publisher.publish('{"test": "message"}')

        call_args = mock_channel.basic_publish.call_args
        assert call_args.kwargs["routing_key"] == "weather-data"

    def test_publish_message_properties(self):
        """Test message has correct properties."""
        publisher = QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="test-queue",
        )
        
        mock_channel = MagicMock()
        mock_connection = MagicMock()
        mock_connection.is_open = True
        publisher._channel = mock_channel
        publisher._connection = mock_connection

        publisher.publish('{"test": "message"}')

        call_args = mock_channel.basic_publish.call_args
        properties = call_args.kwargs["properties"]
        assert properties.delivery_mode == 2  # Persistent
        assert properties.content_type == "application/json"

    @patch("src.queue_publisher.pika.BlockingConnection")
    def test_context_manager_enter(self, mock_connection_class):
        """Test context manager connects on enter."""
        mock_connection = MagicMock()
        mock_channel = MagicMock()
        mock_connection.channel.return_value = mock_channel
        mock_connection_class.return_value = mock_connection

        with QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="test-queue",
        ) as publisher:
            assert publisher._connection is mock_connection

    @patch("src.queue_publisher.pika.BlockingConnection")
    def test_context_manager_exit(self, mock_connection_class):
        """Test context manager disconnects on exit."""
        mock_connection = MagicMock()
        mock_connection.is_open = True
        mock_channel = MagicMock()
        mock_connection.channel.return_value = mock_channel
        mock_connection_class.return_value = mock_connection

        with QueuePublisher(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="test-queue",
        ):
            pass

        mock_connection.close.assert_called_once()


class TestPublishWeatherMessage:
    """Unit tests for publish_weather_message convenience function."""

    @patch("src.queue_publisher.pika.BlockingConnection")
    def test_publish_weather_message_success(self, mock_connection_class):
        """Test convenience function publishes message."""
        mock_connection = MagicMock()
        mock_connection.is_open = True
        mock_channel = MagicMock()
        mock_connection.channel.return_value = mock_channel
        mock_connection_class.return_value = mock_connection

        result = publish_weather_message(
            rabbitmq_url="amqp://guest:guest@localhost:5672",
            queue_name="test-queue",
            message='{"test": "message"}',
        )

        assert result is True
        mock_channel.basic_publish.assert_called_once()

    @patch("src.queue_publisher.pika.BlockingConnection")
    def test_publish_weather_message_connection_error(self, mock_connection_class):
        """Test convenience function handles connection error."""
        mock_connection_class.side_effect = AMQPConnectionError("Connection refused")

        with pytest.raises(QueuePublisherError):
            publish_weather_message(
                rabbitmq_url="amqp://guest:guest@localhost:5672",
                queue_name="test-queue",
                message='{"test": "message"}',
            )
