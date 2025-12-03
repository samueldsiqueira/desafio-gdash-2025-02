package main

import (
	"os"
	"os/signal"
	"syscall"

	"queue-worker/internal/api_client"
	"queue-worker/internal/config"
	"queue-worker/internal/consumer"
	"queue-worker/internal/logger"
)

func main() {
	log := logger.New("queue-worker")

	log.Info("Starting queue worker", nil)

	cfg := config.Load()

	log.Info("Configuration loaded", map[string]interface{}{
		"rabbitmq_url":   cfg.RabbitMQURL,
		"queue_name":     cfg.QueueName,
		"api_url":        cfg.APIServiceURL,
		"retry_attempts": cfg.RetryAttempts,
	})

	apiClient := api_client.NewClient(cfg.APIServiceURL)

	cons := consumer.New(cfg, apiClient, log)

	if err := cons.Connect(); err != nil {
		log.Error("Failed to connect to RabbitMQ", map[string]interface{}{
			"error": err.Error(),
		})
		os.Exit(1)
	}
	defer cons.Close()

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Info("Received shutdown signal", nil)
		cons.Close()
		os.Exit(0)
	}()

	if err := cons.Start(); err != nil {
		log.Error("Consumer error", map[string]interface{}{
			"error": err.Error(),
		})
		os.Exit(1)
	}
}
