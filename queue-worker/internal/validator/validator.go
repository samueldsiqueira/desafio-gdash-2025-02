package validator

import (
	"encoding/json"
	"errors"
	"time"
)

// Location represents the location data in a weather message
type Location struct {
	City      string  `json:"city"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// Weather represents the weather data in a message
type Weather struct {
	Temperature     float64 `json:"temperature"`
	Humidity        float64 `json:"humidity"`
	WindSpeed       float64 `json:"windSpeed"`
	Condition       string  `json:"condition"`
	RainProbability float64 `json:"rainProbability"`
}

// WeatherMessage represents the complete weather message structure
type WeatherMessage struct {
	Timestamp string   `json:"timestamp"`
	Location  Location `json:"location"`
	Weather   Weather  `json:"weather"`
	Source    string   `json:"source"`
}

// ValidationError represents a validation error with details
type ValidationError struct {
	Field   string
	Message string
}

func (e ValidationError) Error() string {
	return e.Field + ": " + e.Message
}

// ValidateMessage validates a raw JSON message and returns the parsed WeatherMessage
func ValidateMessage(data []byte) (*WeatherMessage, error) {
	if len(data) == 0 {
		return nil, errors.New("empty message")
	}

	var msg WeatherMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		return nil, errors.New("invalid JSON format: " + err.Error())
	}

	if err := validateWeatherMessage(&msg); err != nil {
		return nil, err
	}

	return &msg, nil
}


// validateWeatherMessage validates all fields of a WeatherMessage
func validateWeatherMessage(msg *WeatherMessage) error {
	// Validate timestamp
	if msg.Timestamp == "" {
		return ValidationError{Field: "timestamp", Message: "required field is missing"}
	}
	if _, err := time.Parse(time.RFC3339, msg.Timestamp); err != nil {
		return ValidationError{Field: "timestamp", Message: "invalid format, expected RFC3339"}
	}

	// Validate location
	if msg.Location.City == "" {
		return ValidationError{Field: "location.city", Message: "required field is missing"}
	}
	if msg.Location.Latitude < -90 || msg.Location.Latitude > 90 {
		return ValidationError{Field: "location.latitude", Message: "must be between -90 and 90"}
	}
	if msg.Location.Longitude < -180 || msg.Location.Longitude > 180 {
		return ValidationError{Field: "location.longitude", Message: "must be between -180 and 180"}
	}

	// Validate weather data
	if msg.Weather.Humidity < 0 || msg.Weather.Humidity > 100 {
		return ValidationError{Field: "weather.humidity", Message: "must be between 0 and 100"}
	}
	if msg.Weather.WindSpeed < 0 {
		return ValidationError{Field: "weather.windSpeed", Message: "must be non-negative"}
	}
	if msg.Weather.Condition == "" {
		return ValidationError{Field: "weather.condition", Message: "required field is missing"}
	}
	if msg.Weather.RainProbability < 0 || msg.Weather.RainProbability > 100 {
		return ValidationError{Field: "weather.rainProbability", Message: "must be between 0 and 100"}
	}

	// Validate source
	if msg.Source == "" {
		return ValidationError{Field: "source", Message: "required field is missing"}
	}

	return nil
}

// IsValid checks if a message is valid without returning the parsed message
func IsValid(data []byte) bool {
	_, err := ValidateMessage(data)
	return err == nil
}
