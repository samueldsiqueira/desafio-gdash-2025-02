"""Configuration module for Weather Collector."""

import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    """Application configuration loaded from environment variables."""

    # Weather API
    weather_api_url: str = os.getenv(
        "WEATHER_API_URL", "https://api.open-meteo.com/v1/forecast"
    )
    weather_api_key: str = os.getenv("WEATHER_API_KEY", "")

    # Location
    location_lat: float = float(os.getenv("LOCATION_LAT", "-23.5505"))
    location_lon: float = float(os.getenv("LOCATION_LON", "-46.6333"))
    location_city: str = os.getenv("LOCATION_CITY", "São Paulo")
    location_state: str = os.getenv("LOCATION_STATE", "SP")

    # Collection
    collection_interval: int = int(os.getenv("COLLECTION_INTERVAL", "3600"))

    # RabbitMQ
    rabbitmq_url: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")
    rabbitmq_queue: str = os.getenv("RABBITMQ_QUEUE", "weather-data")

    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "INFO")


config = Config()
