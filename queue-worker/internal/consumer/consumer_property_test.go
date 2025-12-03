package consumer

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/leanovate/gopter"
	"github.com/leanovate/gopter/gen"
	"github.com/leanovate/gopter/prop"
	"queue-worker/internal/api_client"
	"queue-worker/internal/config"
	"queue-worker/internal/logger"
)

// **Feature: weather-monitoring-system, Property 5: Valid messages trigger API calls**
// **Validates: Requirements 2.4**

func TestProperty5_ValidMessagesTriggerAPICalls(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 100
	properties := gopter.NewProperties(parameters)

	properties.Property("valid messages trigger API calls", prop.ForAll(
		func(city string, lat, lon, temp, humidity, windSpeed, rainProb float64, condition, source string) bool {
			var apiCalled atomic.Bool

			// Create test server that tracks if it was called
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				apiCalled.Store(true)
				w.WriteHeader(http.StatusCreated)
				w.Write([]byte(`{"id": "test-id"}`))
			}))
			defer server.Close()

			cfg := &config.Config{
				APIServiceURL: server.URL,
				RetryAttempts: 1,
				RetryDelay:    0,
			}

			log := logger.New("test")
			client := api_client.NewClient(server.URL)
			cons := New(cfg, client, log)

			msg := createValidMessage(city, lat, lon, temp, humidity, windSpeed, rainProb, condition, source)
			data, _ := json.Marshal(msg)

			validated, _ := cons.ProcessSingleMessage(data)

			// If message is valid, API should be called
			return validated && apiCalled.Load()
		},
		gen.AlphaString().SuchThat(func(s string) bool { return len(s) > 0 }),
		gen.Float64Range(-90, 90),
		gen.Float64Range(-180, 180),
		gen.Float64Range(-50, 60),
		gen.Float64Range(0, 100),
		gen.Float64Range(0, 200),
		gen.Float64Range(0, 100),
		gen.OneConstOf("sunny", "cloudy", "rainy"),
		gen.OneConstOf("open-meteo", "openweather"),
	))

	properties.TestingRun(t)
}

// **Feature: weather-monitoring-system, Property 6: Successful API responses trigger acknowledgment**
// **Validates: Requirements 2.5**

func TestProperty6_SuccessfulAPIResponsesTriggerAck(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 100
	properties := gopter.NewProperties(parameters)

	properties.Property("successful API responses return success", prop.ForAll(
		func(city string, statusCode int) bool {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(statusCode)
				w.Write([]byte(`{"id": "test-id"}`))
			}))
			defer server.Close()

			cfg := &config.Config{
				APIServiceURL: server.URL,
				RetryAttempts: 1,
				RetryDelay:    0,
			}

			log := logger.New("test")
			client := api_client.NewClient(server.URL)
			cons := New(cfg, client, log)

			msg := createValidMessage(city, -23.5, -46.6, 25.0, 60.0, 10.0, 20.0, "sunny", "open-meteo")
			data, _ := json.Marshal(msg)

			_, apiSuccess := cons.ProcessSingleMessage(data)

			// Success should be true for 2xx status codes
			return apiSuccess == true
		},
		gen.AlphaString().SuchThat(func(s string) bool { return len(s) > 0 }),
		gen.IntRange(200, 299),
	))

	properties.TestingRun(t)
}

// **Feature: weather-monitoring-system, Property 7: Failed API responses trigger negative acknowledgment**
// **Validates: Requirements 2.6**

func TestProperty7_FailedAPIResponsesTriggerNack(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 100
	properties := gopter.NewProperties(parameters)

	properties.Property("failed API responses return failure", prop.ForAll(
		func(city string, statusCode int) bool {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(statusCode)
				w.Write([]byte(`{"error": "server error"}`))
			}))
			defer server.Close()

			cfg := &config.Config{
				APIServiceURL: server.URL,
				RetryAttempts: 1,
				RetryDelay:    0,
			}

			log := logger.New("test")
			client := api_client.NewClient(server.URL)
			cons := New(cfg, client, log)

			msg := createValidMessage(city, -23.5, -46.6, 25.0, 60.0, 10.0, 20.0, "sunny", "open-meteo")
			data, _ := json.Marshal(msg)

			_, apiSuccess := cons.ProcessSingleMessage(data)

			// Success should be false for 4xx and 5xx status codes
			return apiSuccess == false
		},
		gen.AlphaString().SuchThat(func(s string) bool { return len(s) > 0 }),
		gen.OneGenOf(
			gen.IntRange(400, 499),
			gen.IntRange(500, 599),
		),
	))

	properties.TestingRun(t)
}

// **Feature: weather-monitoring-system, Property 8: Message processing generates logs**
// **Validates: Requirements 2.7**

func TestProperty8_MessageProcessingGeneratesLogs(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 100
	properties := gopter.NewProperties(parameters)

	properties.Property("message processing generates logs", prop.ForAll(
		func(city string, statusCode int) bool {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(statusCode)
			}))
			defer server.Close()

			cfg := &config.Config{
				APIServiceURL: server.URL,
				RetryAttempts: 1,
				RetryDelay:    0,
			}

			log := logger.New("test")
			client := api_client.NewClient(server.URL)
			cons := New(cfg, client, log)

			msg := createValidMessage(city, -23.5, -46.6, 25.0, 60.0, 10.0, 20.0, "sunny", "open-meteo")
			data, _ := json.Marshal(msg)

			cons.ProcessSingleMessage(data)

			// Should have at least one log entry after processing
			entries := log.GetEntries()
			return len(entries) > 0
		},
		gen.AlphaString().SuchThat(func(s string) bool { return len(s) > 0 }),
		gen.OneGenOf(
			gen.IntRange(200, 299),
			gen.IntRange(400, 599),
		),
	))

	properties.TestingRun(t)
}

func createValidMessage(city string, lat, lon, temp, humidity, windSpeed, rainProb float64, condition, source string) map[string]interface{} {
	return map[string]interface{}{
		"timestamp": "2025-12-03T14:30:00Z",
		"location": map[string]interface{}{
			"city":      city,
			"latitude":  lat,
			"longitude": lon,
		},
		"weather": map[string]interface{}{
			"temperature":      temp,
			"humidity":         humidity,
			"wind_speed":       windSpeed,
			"condition":        condition,
			"rain_probability": rainProb,
		},
		"source": source,
	}
}
