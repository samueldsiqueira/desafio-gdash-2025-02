package consumer

import (
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"queue-worker/internal/api_client"
	"queue-worker/internal/config"
	"queue-worker/internal/logger"
	"queue-worker/internal/validator"
)

// Consumer handles RabbitMQ message consumption
type Consumer struct {
	config    *config.Config
	conn      *amqp.Connection
	channel   *amqp.Channel
	apiClient *api_client.Client
	logger    *logger.Logger
}

// MessageHandler is a function type for handling messages
type MessageHandler func(delivery amqp.Delivery) bool

// New creates a new Consumer instance
func New(cfg *config.Config, apiClient *api_client.Client, log *logger.Logger) *Consumer {
	return &Consumer{
		config:    cfg,
		apiClient: apiClient,
		logger:    log,
	}
}

// Connect establishes connection to RabbitMQ
func (c *Consumer) Connect() error {
	var err error
	c.conn, err = amqp.Dial(c.config.RabbitMQURL)
	if err != nil {
		c.logger.Error("Failed to connect to RabbitMQ", map[string]interface{}{
			"error": err.Error(),
			"url":   c.config.RabbitMQURL,
		})
		return err
	}

	c.channel, err = c.conn.Channel()
	if err != nil {
		c.logger.Error("Failed to open channel", map[string]interface{}{
			"error": err.Error(),
		})
		return err
	}

	c.logger.Info("Connected to RabbitMQ", map[string]interface{}{
		"queue": c.config.QueueName,
	})

	return nil
}


// DeclareQueue declares the queue if it doesn't exist
func (c *Consumer) DeclareQueue() error {
	_, err := c.channel.QueueDeclare(
		c.config.QueueName,
		true,  // durable
		false, // delete when unused
		false, // exclusive
		false, // no-wait
		nil,   // arguments
	)
	if err != nil {
		c.logger.Error("Failed to declare queue", map[string]interface{}{
			"error": err.Error(),
			"queue": c.config.QueueName,
		})
		return err
	}
	return nil
}

// Start begins consuming messages from the queue
func (c *Consumer) Start() error {
	if err := c.DeclareQueue(); err != nil {
		return err
	}

	msgs, err := c.channel.Consume(
		c.config.QueueName,
		"",    // consumer tag
		false, // auto-ack
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,   // args
	)
	if err != nil {
		c.logger.Error("Failed to register consumer", map[string]interface{}{
			"error": err.Error(),
		})
		return err
	}

	c.logger.Info("Started consuming messages", map[string]interface{}{
		"queue": c.config.QueueName,
	})

	for msg := range msgs {
		c.processMessage(msg)
	}

	return nil
}

// processMessage handles a single message
func (c *Consumer) processMessage(delivery amqp.Delivery) {
	c.logger.Info("Processing message", map[string]interface{}{
		"delivery_tag": delivery.DeliveryTag,
	})

	// Validate message
	msg, err := validator.ValidateMessage(delivery.Body)
	if err != nil {
		c.logger.Error("Message validation failed", map[string]interface{}{
			"error":        err.Error(),
			"delivery_tag": delivery.DeliveryTag,
		})
		// Nack without requeue for invalid messages
		delivery.Nack(false, false)
		return
	}

	// Send to API with retry
	success := c.sendWithRetry(msg)

	if success {
		c.logger.Info("Message processed successfully", map[string]interface{}{
			"delivery_tag": delivery.DeliveryTag,
			"timestamp":    msg.Timestamp,
			"city":         msg.Location.City,
		})
		delivery.Ack(false)
	} else {
		c.logger.Error("Failed to send message to API after retries", map[string]interface{}{
			"delivery_tag": delivery.DeliveryTag,
		})
		// Nack with requeue for API failures
		delivery.Nack(false, true)
	}
}


// sendWithRetry attempts to send the message to the API with retries
func (c *Consumer) sendWithRetry(msg *validator.WeatherMessage) bool {
	for attempt := 1; attempt <= c.config.RetryAttempts; attempt++ {
		c.logger.Debug("Sending to API", map[string]interface{}{
			"attempt":     attempt,
			"max_retries": c.config.RetryAttempts,
		})

		resp := c.apiClient.SendWeatherData(msg)

		if resp.IsSuccess() {
			return true
		}

		if resp.IsClientError() {
			// Don't retry on client errors (4xx)
			c.logger.Error("Client error from API", map[string]interface{}{
				"status_code": resp.StatusCode,
				"body":        string(resp.Body),
			})
			return false
		}

		if resp.Error != nil {
			c.logger.Warn("API request failed", map[string]interface{}{
				"error":   resp.Error.Error(),
				"attempt": attempt,
			})
		} else {
			c.logger.Warn("API returned error status", map[string]interface{}{
				"status_code": resp.StatusCode,
				"attempt":     attempt,
			})
		}

		if attempt < c.config.RetryAttempts {
			time.Sleep(c.config.RetryDelay)
		}
	}

	return false
}

// Close closes the connection and channel
func (c *Consumer) Close() {
	if c.channel != nil {
		c.channel.Close()
	}
	if c.conn != nil {
		c.conn.Close()
	}
	c.logger.Info("Consumer closed", nil)
}

// ProcessSingleMessage processes a single message (for testing)
func (c *Consumer) ProcessSingleMessage(body []byte) (validated bool, apiSuccess bool) {
	msg, err := validator.ValidateMessage(body)
	if err != nil {
		c.logger.Error("Message validation failed", map[string]interface{}{
			"error": err.Error(),
		})
		return false, false
	}

	success := c.sendWithRetry(msg)
	return true, success
}
