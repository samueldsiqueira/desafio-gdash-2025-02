package validator

import (
	"encoding/json"
	"testing"
)

// Unit tests for message validation
// _Requirements: 2.2, 2.3_

func TestValidateMessage_ValidMessage(t *testing.T) {
	msg := map[string]interface{}{
		"timestamp": "2025-12-03T14:30:00Z",
		"location": map[string]interface{}{
			"city":      "São Paulo",
			"latitude":  -23.5505,
			"longitude": -46.6333,
		},
		"weather": map[string]interface{}{
			"temperature":     28.5,
			"humidity":        65.0,
			"windSpeed":       12.3,
			"condition":       "partly_cloudy",
			"rainProbability": 30.0,
		},
		"source": "open-meteo",
	}

	data, _ := json.Marshal(msg)
	result, err := ValidateMessage(data)

	if err != nil {
		t.Errorf("Expected valid message to pass validation, got error: %v", err)
	}
	if result == nil {
		t.Error("Expected non-nil result for valid message")
	}
	if result.Location.City != "São Paulo" {
		t.Errorf("Expected city 'São Paulo', got '%s'", result.Location.City)
	}
}

func TestValidateMessage_EmptyMessage(t *testing.T) {
	_, err := ValidateMessage([]byte{})

	if err == nil {
		t.Error("Expected error for empty message")
	}
	if err.Error() != "empty message" {
		t.Errorf("Expected 'empty message' error, got: %v", err)
	}
}


func TestValidateMessage_InvalidJSON(t *testing.T) {
	_, err := ValidateMessage([]byte("not valid json"))

	if err == nil {
		t.Error("Expected error for invalid JSON")
	}
}

func TestValidateMessage_MissingTimestamp(t *testing.T) {
	msg := map[string]interface{}{
		"location": map[string]interface{}{
			"city":      "São Paulo",
			"latitude":  -23.5505,
			"longitude": -46.6333,
		},
		"weather": map[string]interface{}{
			"temperature":     28.5,
			"humidity":        65.0,
			"windSpeed":       12.3,
			"condition":       "partly_cloudy",
			"rainProbability": 30.0,
		},
		"source": "open-meteo",
	}

	data, _ := json.Marshal(msg)
	_, err := ValidateMessage(data)

	if err == nil {
		t.Error("Expected error for missing timestamp")
	}
	validationErr, ok := err.(ValidationError)
	if !ok {
		t.Errorf("Expected ValidationError, got %T", err)
	}
	if validationErr.Field != "timestamp" {
		t.Errorf("Expected field 'timestamp', got '%s'", validationErr.Field)
	}
}

func TestValidateMessage_InvalidTimestampFormat(t *testing.T) {
	msg := map[string]interface{}{
		"timestamp": "2025-12-03 14:30:00",
		"location": map[string]interface{}{
			"city":      "São Paulo",
			"latitude":  -23.5505,
			"longitude": -46.6333,
		},
		"weather": map[string]interface{}{
			"temperature":     28.5,
			"humidity":        65.0,
			"windSpeed":       12.3,
			"condition":       "partly_cloudy",
			"rainProbability": 30.0,
		},
		"source": "open-meteo",
	}

	data, _ := json.Marshal(msg)
	_, err := ValidateMessage(data)

	if err == nil {
		t.Error("Expected error for invalid timestamp format")
	}
}

func TestValidateMessage_MissingCity(t *testing.T) {
	msg := map[string]interface{}{
		"timestamp": "2025-12-03T14:30:00Z",
		"location": map[string]interface{}{
			"latitude":  -23.5505,
			"longitude": -46.6333,
		},
		"weather": map[string]interface{}{
			"temperature":     28.5,
			"humidity":        65.0,
			"windSpeed":       12.3,
			"condition":       "partly_cloudy",
			"rainProbability": 30.0,
		},
		"source": "open-meteo",
	}

	data, _ := json.Marshal(msg)
	_, err := ValidateMessage(data)

	if err == nil {
		t.Error("Expected error for missing city")
	}
}

func TestValidateMessage_InvalidLatitude(t *testing.T) {
	testCases := []struct {
		name     string
		latitude float64
	}{
		{"too low", -91.0},
		{"too high", 91.0},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			msg := map[string]interface{}{
				"timestamp": "2025-12-03T14:30:00Z",
				"location": map[string]interface{}{
					"city":      "São Paulo",
					"latitude":  tc.latitude,
					"longitude": -46.6333,
				},
				"weather": map[string]interface{}{
					"temperature":     28.5,
					"humidity":        65.0,
					"windSpeed":       12.3,
					"condition":       "partly_cloudy",
					"rainProbability": 30.0,
				},
				"source": "open-meteo",
			}

			data, _ := json.Marshal(msg)
			_, err := ValidateMessage(data)

			if err == nil {
				t.Errorf("Expected error for latitude %f", tc.latitude)
			}
		})
	}
}

func TestValidateMessage_InvalidLongitude(t *testing.T) {
	testCases := []struct {
		name      string
		longitude float64
	}{
		{"too low", -181.0},
		{"too high", 181.0},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			msg := map[string]interface{}{
				"timestamp": "2025-12-03T14:30:00Z",
				"location": map[string]interface{}{
					"city":      "São Paulo",
					"latitude":  -23.5505,
					"longitude": tc.longitude,
				},
				"weather": map[string]interface{}{
					"temperature":     28.5,
					"humidity":        65.0,
					"windSpeed":       12.3,
					"condition":       "partly_cloudy",
					"rainProbability": 30.0,
				},
				"source": "open-meteo",
			}

			data, _ := json.Marshal(msg)
			_, err := ValidateMessage(data)

			if err == nil {
				t.Errorf("Expected error for longitude %f", tc.longitude)
			}
		})
	}
}

func TestValidateMessage_InvalidHumidity(t *testing.T) {
	testCases := []struct {
		name     string
		humidity float64
	}{
		{"negative", -1.0},
		{"over 100", 101.0},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			msg := map[string]interface{}{
				"timestamp": "2025-12-03T14:30:00Z",
				"location": map[string]interface{}{
					"city":      "São Paulo",
					"latitude":  -23.5505,
					"longitude": -46.6333,
				},
				"weather": map[string]interface{}{
					"temperature":     28.5,
					"humidity":        tc.humidity,
					"windSpeed":       12.3,
					"condition":       "partly_cloudy",
					"rainProbability": 30.0,
				},
				"source": "open-meteo",
			}

			data, _ := json.Marshal(msg)
			_, err := ValidateMessage(data)

			if err == nil {
				t.Errorf("Expected error for humidity %f", tc.humidity)
			}
		})
	}
}

func TestValidateMessage_NegativeWindSpeed(t *testing.T) {
	msg := map[string]interface{}{
		"timestamp": "2025-12-03T14:30:00Z",
		"location": map[string]interface{}{
			"city":      "São Paulo",
			"latitude":  -23.5505,
			"longitude": -46.6333,
		},
		"weather": map[string]interface{}{
			"temperature":     28.5,
			"humidity":        65.0,
			"windSpeed":       -5.0,
			"condition":       "partly_cloudy",
			"rainProbability": 30.0,
		},
		"source": "open-meteo",
	}

	data, _ := json.Marshal(msg)
	_, err := ValidateMessage(data)

	if err == nil {
		t.Error("Expected error for negative wind speed")
	}
}

func TestValidateMessage_MissingCondition(t *testing.T) {
	msg := map[string]interface{}{
		"timestamp": "2025-12-03T14:30:00Z",
		"location": map[string]interface{}{
			"city":      "São Paulo",
			"latitude":  -23.5505,
			"longitude": -46.6333,
		},
		"weather": map[string]interface{}{
			"temperature":     28.5,
			"humidity":        65.0,
			"windSpeed":       12.3,
			"rainProbability": 30.0,
		},
		"source": "open-meteo",
	}

	data, _ := json.Marshal(msg)
	_, err := ValidateMessage(data)

	if err == nil {
		t.Error("Expected error for missing condition")
	}
}

func TestValidateMessage_InvalidRainProbability(t *testing.T) {
	testCases := []struct {
		name            string
		rainProbability float64
	}{
		{"negative", -1.0},
		{"over 100", 101.0},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			msg := map[string]interface{}{
				"timestamp": "2025-12-03T14:30:00Z",
				"location": map[string]interface{}{
					"city":      "São Paulo",
					"latitude":  -23.5505,
					"longitude": -46.6333,
				},
				"weather": map[string]interface{}{
					"temperature":     28.5,
					"humidity":        65.0,
					"windSpeed":       12.3,
					"condition":       "partly_cloudy",
					"rainProbability": tc.rainProbability,
				},
				"source": "open-meteo",
			}

			data, _ := json.Marshal(msg)
			_, err := ValidateMessage(data)

			if err == nil {
				t.Errorf("Expected error for rain probability %f", tc.rainProbability)
			}
		})
	}
}

func TestValidateMessage_MissingSource(t *testing.T) {
	msg := map[string]interface{}{
		"timestamp": "2025-12-03T14:30:00Z",
		"location": map[string]interface{}{
			"city":      "São Paulo",
			"latitude":  -23.5505,
			"longitude": -46.6333,
		},
		"weather": map[string]interface{}{
			"temperature":     28.5,
			"humidity":        65.0,
			"windSpeed":       12.3,
			"condition":       "partly_cloudy",
			"rainProbability": 30.0,
		},
	}

	data, _ := json.Marshal(msg)
	_, err := ValidateMessage(data)

	if err == nil {
		t.Error("Expected error for missing source")
	}
}

func TestIsValid_ValidMessage(t *testing.T) {
	msg := map[string]interface{}{
		"timestamp": "2025-12-03T14:30:00Z",
		"location": map[string]interface{}{
			"city":      "São Paulo",
			"latitude":  -23.5505,
			"longitude": -46.6333,
		},
		"weather": map[string]interface{}{
			"temperature":     28.5,
			"humidity":        65.0,
			"windSpeed":       12.3,
			"condition":       "partly_cloudy",
			"rainProbability": 30.0,
		},
		"source": "open-meteo",
	}

	data, _ := json.Marshal(msg)
	if !IsValid(data) {
		t.Error("Expected IsValid to return true for valid message")
	}
}

func TestIsValid_InvalidMessage(t *testing.T) {
	if IsValid([]byte("invalid json")) {
		t.Error("Expected IsValid to return false for invalid message")
	}
}

func TestValidationError_Error(t *testing.T) {
	err := ValidationError{Field: "test_field", Message: "test message"}
	expected := "test_field: test message"
	if err.Error() != expected {
		t.Errorf("Expected '%s', got '%s'", expected, err.Error())
	}
}
