"""Main weather collector module with scheduling."""

import logging
import signal
import sys
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger

from .config import config
from .api_client import WeatherAPIClient, WeatherAPIError, extract_weather_data
from .normalizer import normalize_weather_data, to_json
from .queue_publisher import QueuePublisher, QueuePublisherError

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.log_level.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class WeatherCollector:
    """Main weather data collector service."""

    def __init__(self):
        """Initialize the weather collector."""
        self.api_client = WeatherAPIClient(
            base_url=config.weather_api_url,
            api_key=config.weather_api_key,
        )
        self.publisher = QueuePublisher(
            rabbitmq_url=config.rabbitmq_url,
            queue_name=config.rabbitmq_queue,
        )
        self.scheduler = BlockingScheduler()
        self._running = False

    def collect_and_publish(self) -> bool:
        """Collect weather data and publish to queue.

        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info("Starting weather data collection...")

            # Fetch weather data from API
            api_response = self.api_client.fetch_weather(
                latitude=config.location_lat,
                longitude=config.location_lon,
            )

            # Extract required fields
            weather_data = extract_weather_data(api_response)
            logger.debug(f"Extracted weather data: {weather_data}")

            # Normalize data
            normalized = normalize_weather_data(
                weather_data=weather_data,
                city=config.location_city,
                latitude=config.location_lat,
                longitude=config.location_lon,
            )

            # Convert to JSON
            message = to_json(normalized)
            logger.debug(f"Normalized message: {message}")

            # Publish to queue
            self.publisher.publish(message)
            logger.info("Weather data collected and published successfully")
            return True

        except WeatherAPIError as e:
            logger.error(f"Weather API error: {e}")
            logger.info("Will retry on next scheduled interval")
            return False
        except QueuePublisherError as e:
            logger.error(f"Queue publisher error: {e}")
            logger.info("Will retry on next scheduled interval")
            return False
        except ValueError as e:
            logger.error(f"Data processing error: {e}")
            return False
        except Exception as e:
            logger.exception(f"Unexpected error during collection: {e}")
            return False

    def start(self) -> None:
        """Start the collector with scheduled execution."""
        logger.info(
            f"Starting Weather Collector service "
            f"(interval: {config.collection_interval}s)"
        )

        # Connect to RabbitMQ
        try:
            self.publisher.connect()
        except QueuePublisherError as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            logger.info("Will retry connection on first collection")

        # Run immediately on startup
        self.collect_and_publish()

        # Schedule periodic collection
        self.scheduler.add_job(
            self.collect_and_publish,
            trigger=IntervalTrigger(seconds=config.collection_interval),
            id="weather_collection",
            name="Weather Data Collection",
            replace_existing=True,
        )

        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        self._running = True
        logger.info("Scheduler started. Press Ctrl+C to exit.")

        try:
            self.scheduler.start()
        except (KeyboardInterrupt, SystemExit):
            self.stop()

    def stop(self) -> None:
        """Stop the collector gracefully."""
        logger.info("Stopping Weather Collector service...")
        self._running = False

        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)

        self.publisher.disconnect()
        logger.info("Weather Collector service stopped")

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down...")
        self.stop()
        sys.exit(0)


def main():
    """Main entry point."""
    collector = WeatherCollector()
    collector.start()


if __name__ == "__main__":
    main()
