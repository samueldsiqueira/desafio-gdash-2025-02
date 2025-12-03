package api_client

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"queue-worker/internal/validator"
)

// Unit tests for HTTP client with mocked responses
// _Requirements: 2.4, 2.5, 2.6_

func createTestMessage() *validator.WeatherMessage {
	return &validator.WeatherMessage{
		Timestamp: "2025-12-03T14:30:00Z",
		Location: validator.Location{
			City:      "São Paulo",
			Latitude:  -23.5505,
			Longitude: -46.6333,
		},
		Weather: validator.Weather{
			Temperature:     28.5,
			Humidity:        65.0,
			WindSpeed:       12.3,
			Condition:       "partly_cloudy",
			RainProbability: 30.0,
		},
		Source: "open-meteo",
	}
}

func TestSendWeatherData_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("Expected POST method, got %s", r.Method)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("Expected Content-Type application/json, got %s", r.Header.Get("Content-Type"))
		}
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"id": "test-id"}`))
	}))
	defer server.Close()

	client := NewClient(server.URL)
	msg := createTestMessage()

	resp := client.SendWeatherData(msg)

	if resp.Error != nil {
		t.Errorf("Expected no error, got: %v", resp.Error)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Errorf("Expected status 201, got %d", resp.StatusCode)
	}
	if !resp.IsSuccess() {
		t.Error("Expected IsSuccess to return true")
	}
}

func TestSendWeatherData_ClientError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error": "bad request"}`))
	}))
	defer server.Close()

	client := NewClient(server.URL)
	msg := createTestMessage()

	resp := client.SendWeatherData(msg)

	if resp.Error != nil {
		t.Errorf("Expected no error, got: %v", resp.Error)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", resp.StatusCode)
	}
	if !resp.IsClientError() {
		t.Error("Expected IsClientError to return true")
	}
	if resp.IsSuccess() {
		t.Error("Expected IsSuccess to return false")
	}
}


func TestSendWeatherData_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error": "internal server error"}`))
	}))
	defer server.Close()

	client := NewClient(server.URL)
	msg := createTestMessage()

	resp := client.SendWeatherData(msg)

	if resp.Error != nil {
		t.Errorf("Expected no error, got: %v", resp.Error)
	}
	if resp.StatusCode != http.StatusInternalServerError {
		t.Errorf("Expected status 500, got %d", resp.StatusCode)
	}
	if !resp.IsServerError() {
		t.Error("Expected IsServerError to return true")
	}
	if resp.IsSuccess() {
		t.Error("Expected IsSuccess to return false")
	}
}

func TestSendWeatherData_ConnectionError(t *testing.T) {
	client := NewClient("http://localhost:99999")
	msg := createTestMessage()

	resp := client.SendWeatherData(msg)

	if resp.Error == nil {
		t.Error("Expected connection error")
	}
	if resp.IsSuccess() {
		t.Error("Expected IsSuccess to return false for connection error")
	}
}

func TestNewClient(t *testing.T) {
	client := NewClient("http://example.com")
	if client == nil {
		t.Error("Expected non-nil client")
	}
}

func TestNewClientWithHTTP(t *testing.T) {
	customClient := &http.Client{}
	client := NewClientWithHTTP("http://example.com", customClient)
	if client == nil {
		t.Error("Expected non-nil client")
	}
}

func TestResponse_IsSuccess(t *testing.T) {
	testCases := []struct {
		name       string
		statusCode int
		err        error
		expected   bool
	}{
		{"200 OK", 200, nil, true},
		{"201 Created", 201, nil, true},
		{"204 No Content", 204, nil, true},
		{"299 edge case", 299, nil, true},
		{"300 redirect", 300, nil, false},
		{"400 bad request", 400, nil, false},
		{"500 server error", 500, nil, false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			resp := &Response{StatusCode: tc.statusCode, Error: tc.err}
			if resp.IsSuccess() != tc.expected {
				t.Errorf("Expected IsSuccess=%v for status %d", tc.expected, tc.statusCode)
			}
		})
	}
}

func TestResponse_IsClientError(t *testing.T) {
	testCases := []struct {
		name       string
		statusCode int
		expected   bool
	}{
		{"400 bad request", 400, true},
		{"401 unauthorized", 401, true},
		{"404 not found", 404, true},
		{"499 edge case", 499, true},
		{"200 OK", 200, false},
		{"500 server error", 500, false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			resp := &Response{StatusCode: tc.statusCode}
			if resp.IsClientError() != tc.expected {
				t.Errorf("Expected IsClientError=%v for status %d", tc.expected, tc.statusCode)
			}
		})
	}
}

func TestResponse_IsServerError(t *testing.T) {
	testCases := []struct {
		name       string
		statusCode int
		expected   bool
	}{
		{"500 internal server error", 500, true},
		{"502 bad gateway", 502, true},
		{"503 service unavailable", 503, true},
		{"599 edge case", 599, true},
		{"200 OK", 200, false},
		{"400 bad request", 400, false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			resp := &Response{StatusCode: tc.statusCode}
			if resp.IsServerError() != tc.expected {
				t.Errorf("Expected IsServerError=%v for status %d", tc.expected, tc.statusCode)
			}
		})
	}
}
