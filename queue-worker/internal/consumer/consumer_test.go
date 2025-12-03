package consumer

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"queue-worker/internal/api_client"
	"queue-worker/internal/config"
	"queue-worker/internal/logger"
)

// Unit tests for consumer ack/nack logic
// _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

func createTestConfig(apiURL string) *config.Config {
	return &config.Config{
		RabbitMQURL:   "amqp://guest:guest@localhost:5672",
		QueueName:     "test-queue",
		APIServiceURL: apiURL,
		RetryAttempts: 3,
		RetryDelay:    10 * time.Millisecond,
	}
}

func createValidMessageJSON() []byte {
	msg := map[string]interface{}{
		"timestamp": "2025-12-03T14:30:00Z",
		"location": map[string]interface{}{
			"city":      "São Paulo",
			"latitude":  -23.5505,
			"longitude": -46.6333,
		},
		"weather": map[string]interface{}{
			"temperature":      28.5,
			"humidity":         65.0,
			"wind_speed":       12.3,
			"condition":        "partly_cloudy",
			"rain_probability": 30.0,
		},
		"source": "open-meteo",
	}
	data, _ := json.Marshal(msg)
	return data
}

func TestProcessSingleMessage_ValidMessage_APISuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"id": "test-id"}`))
	}))
	defer server.Close()

	cfg := createTestConfig(server.URL)
	log := logger.New("test")
	client := api_client.NewClient(server.URL)
	cons := New(cfg, client, log)

	validated, apiSuccess := cons.ProcessSingleMessage(createValidMessageJSON())

	if !validated {
		t.Error("Expected message to be validated")
	}
	if !apiSuccess {
		t.Error("Expected API call to succeed")
	}
}


func TestProcessSingleMessage_ValidMessage_APIFailure(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error": "server error"}`))
	}))
	defer server.Close()

	cfg := createTestConfig(server.URL)
	cfg.RetryAttempts = 1 // Reduce retries for faster test
	log := logger.New("test")
	client := api_client.NewClient(server.URL)
	cons := New(cfg, client, log)

	validated, apiSuccess := cons.ProcessSingleMessage(createValidMessageJSON())

	if !validated {
		t.Error("Expected message to be validated")
	}
	if apiSuccess {
		t.Error("Expected API call to fail")
	}
}

func TestProcessSingleMessage_InvalidMessage(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("API should not be called for invalid messages")
	}))
	defer server.Close()

	cfg := createTestConfig(server.URL)
	log := logger.New("test")
	client := api_client.NewClient(server.URL)
	cons := New(cfg, client, log)

	validated, apiSuccess := cons.ProcessSingleMessage([]byte("invalid json"))

	if validated {
		t.Error("Expected message validation to fail")
	}
	if apiSuccess {
		t.Error("Expected API success to be false for invalid message")
	}
}

func TestProcessSingleMessage_EmptyMessage(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("API should not be called for empty messages")
	}))
	defer server.Close()

	cfg := createTestConfig(server.URL)
	log := logger.New("test")
	client := api_client.NewClient(server.URL)
	cons := New(cfg, client, log)

	validated, apiSuccess := cons.ProcessSingleMessage([]byte{})

	if validated {
		t.Error("Expected message validation to fail for empty message")
	}
	if apiSuccess {
		t.Error("Expected API success to be false for empty message")
	}
}

func TestProcessSingleMessage_ClientError_NoRetry(t *testing.T) {
	callCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error": "bad request"}`))
	}))
	defer server.Close()

	cfg := createTestConfig(server.URL)
	cfg.RetryAttempts = 3
	log := logger.New("test")
	client := api_client.NewClient(server.URL)
	cons := New(cfg, client, log)

	validated, apiSuccess := cons.ProcessSingleMessage(createValidMessageJSON())

	if !validated {
		t.Error("Expected message to be validated")
	}
	if apiSuccess {
		t.Error("Expected API call to fail for client error")
	}
	if callCount != 1 {
		t.Errorf("Expected 1 API call (no retry for 4xx), got %d", callCount)
	}
}

func TestProcessSingleMessage_ServerError_WithRetry(t *testing.T) {
	callCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error": "server error"}`))
	}))
	defer server.Close()

	cfg := createTestConfig(server.URL)
	cfg.RetryAttempts = 3
	cfg.RetryDelay = 1 * time.Millisecond
	log := logger.New("test")
	client := api_client.NewClient(server.URL)
	cons := New(cfg, client, log)

	validated, apiSuccess := cons.ProcessSingleMessage(createValidMessageJSON())

	if !validated {
		t.Error("Expected message to be validated")
	}
	if apiSuccess {
		t.Error("Expected API call to fail")
	}
	if callCount != 3 {
		t.Errorf("Expected 3 API calls (with retries), got %d", callCount)
	}
}

func TestProcessSingleMessage_RetryThenSuccess(t *testing.T) {
	callCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		if callCount < 3 {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error": "server error"}`))
		} else {
			w.WriteHeader(http.StatusCreated)
			w.Write([]byte(`{"id": "test-id"}`))
		}
	}))
	defer server.Close()

	cfg := createTestConfig(server.URL)
	cfg.RetryAttempts = 3
	cfg.RetryDelay = 1 * time.Millisecond
	log := logger.New("test")
	client := api_client.NewClient(server.URL)
	cons := New(cfg, client, log)

	validated, apiSuccess := cons.ProcessSingleMessage(createValidMessageJSON())

	if !validated {
		t.Error("Expected message to be validated")
	}
	if !apiSuccess {
		t.Error("Expected API call to eventually succeed")
	}
	if callCount != 3 {
		t.Errorf("Expected 3 API calls, got %d", callCount)
	}
}

func TestProcessSingleMessage_LogsGenerated(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	cfg := createTestConfig(server.URL)
	log := logger.New("test")
	client := api_client.NewClient(server.URL)
	cons := New(cfg, client, log)

	cons.ProcessSingleMessage(createValidMessageJSON())

	entries := log.GetEntries()
	if len(entries) == 0 {
		t.Error("Expected log entries to be generated")
	}
}

func TestProcessSingleMessage_ValidationFailure_LogsError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	cfg := createTestConfig(server.URL)
	log := logger.New("test")
	client := api_client.NewClient(server.URL)
	cons := New(cfg, client, log)

	cons.ProcessSingleMessage([]byte("invalid"))

	if !log.HasLogWithLevel(logger.ERROR) {
		t.Error("Expected error log for validation failure")
	}
}

func TestNew(t *testing.T) {
	cfg := createTestConfig("http://example.com")
	log := logger.New("test")
	client := api_client.NewClient("http://example.com")

	cons := New(cfg, client, log)

	if cons == nil {
		t.Error("Expected non-nil consumer")
	}
}

func TestProcessSingleMessage_MissingRequiredField(t *testing.T) {
	msg := map[string]interface{}{
		"timestamp": "2025-12-03T14:30:00Z",
		"location": map[string]interface{}{
			"city":      "São Paulo",
			"latitude":  -23.5505,
			"longitude": -46.6333,
		},
		"weather": map[string]interface{}{
			"temperature":      28.5,
			"humidity":         65.0,
			"wind_speed":       12.3,
			"rain_probability": 30.0,
			// Missing "condition"
		},
		"source": "open-meteo",
	}
	data, _ := json.Marshal(msg)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("API should not be called for invalid messages")
	}))
	defer server.Close()

	cfg := createTestConfig(server.URL)
	log := logger.New("test")
	client := api_client.NewClient(server.URL)
	cons := New(cfg, client, log)

	validated, apiSuccess := cons.ProcessSingleMessage(data)

	if validated {
		t.Error("Expected validation to fail for missing condition")
	}
	if apiSuccess {
		t.Error("Expected API success to be false")
	}
}
