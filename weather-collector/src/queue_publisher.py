"""RabbitMQ message publisher module."""

import logging
from typing import Any
import pika
from pika.exceptions import AMQPConnectionError, AMQPChannelError

logger = logging.getLogger(__name__)


class QueuePublisherError(Exception):
    """Exception raised when message publishing fails."""

    pass


class QueuePublisher:
    """Publisher for sending messages to RabbitMQ queue."""

    def __init__(self, rabbitmq_url: str, queue_name: str):
        """Initialize the queue publisher.

        Args:
            rabbitmq_url: AMQP connection URL
            queue_name: Name of the queue to publish to
        """
        self.rabbitmq_url = rabbitmq_url
        self.queue_name = queue_name
        self._connection = None
        self._channel = None

    def connect(self) -> None:
        """Establish connection to RabbitMQ.

        Raises:
            QueuePublisherError: If connection fails
        """
        try:
            logger.info(f"Connecting to RabbitMQ...")
            params = pika.URLParameters(self.rabbitmq_url)
            self._connection = pika.BlockingConnection(params)
            self._channel = self._connection.channel()

            # Declare queue to ensure it exists
            self._channel.queue_declare(queue=self.queue_name, durable=True)
            logger.info(f"Connected to RabbitMQ, queue: {self.queue_name}")
        except AMQPConnectionError as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            raise QueuePublisherError(f"Connection failed: {e}") from e

    def disconnect(self) -> None:
        """Close connection to RabbitMQ."""
        try:
            if self._connection and self._connection.is_open:
                self._connection.close()
                logger.info("Disconnected from RabbitMQ")
        except Exception as e:
            logger.warning(f"Error during disconnect: {e}")
        finally:
            self._connection = None
            self._channel = None

    def publish(self, message: str) -> bool:
        """Publish a message to the queue.

        Args:
            message: JSON string message to publish

        Returns:
            True if message was published successfully

        Raises:
            QueuePublisherError: If publishing fails
        """
        if not self._channel or not self._connection or not self._connection.is_open:
            raise QueuePublisherError("Not connected to RabbitMQ")

        try:
            self._channel.basic_publish(
                exchange="",
                routing_key=self.queue_name,
                body=message.encode("utf-8"),
                properties=pika.BasicProperties(
                    delivery_mode=pika.DeliveryMode.Persistent,
                    content_type="application/json",
                ),
            )
            logger.info(f"Published message to queue: {self.queue_name}")
            return True
        except AMQPChannelError as e:
            logger.error(f"Failed to publish message: {e}")
            raise QueuePublisherError(f"Publish failed: {e}") from e

    def __enter__(self):
        """Context manager entry."""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.disconnect()
        return False


def publish_weather_message(
    rabbitmq_url: str, queue_name: str, message: str
) -> bool:
    """Convenience function to publish a single weather message.

    Args:
        rabbitmq_url: AMQP connection URL
        queue_name: Name of the queue
        message: JSON message to publish

    Returns:
        True if successful

    Raises:
        QueuePublisherError: If publishing fails
    """
    with QueuePublisher(rabbitmq_url, queue_name) as publisher:
        return publisher.publish(message)
