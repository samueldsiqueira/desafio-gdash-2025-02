package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for the queue worker
type Config struct {
	RabbitMQURL   string
	QueueName     string
	APIServiceURL string
	RetryAttempts int
	RetryDelay    time.Duration
}

// Load loads configuration from environment variables
func Load() *Config {
	retryAttempts, _ := strconv.Atoi(getEnv("RETRY_ATTEMPTS", "3"))
	retryDelay, _ := strconv.Atoi(getEnv("RETRY_DELAY_MS", "1000"))

	return &Config{
		RabbitMQURL:   getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672"),
		QueueName:     getEnv("RABBITMQ_QUEUE", "weather-data"),
		APIServiceURL: getEnv("API_SERVICE_URL", "http://localhost:3000/api/weather/logs"),
		RetryAttempts: retryAttempts,
		RetryDelay:    time.Duration(retryDelay) * time.Millisecond,
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
