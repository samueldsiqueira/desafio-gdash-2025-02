package validator

import (
	"encoding/json"
	"testing"

	"github.com/leanovate/gopter"
	"github.com/leanovate/gopter/gen"
	"github.com/leanovate/gopter/prop"
)

// **Feature: weather-monitoring-system, Property 4: Queue worker validates message structure**
// **Validates: Requirements 2.3**

// TestProperty4_ValidMessagesAreAccepted tests that valid messages pass validation
func TestProperty4_ValidMessagesAreAccepted(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 100
	properties := gopter.NewProperties(parameters)

	properties.Property("valid messages are accepted", prop.ForAll(
		func(city string, lat, lon, temp, humidity, windSpeed, rainProb float64, condition, source string) bool {
			msg := map[string]interface{}{
				"timestamp": "2025-12-03T14:30:00Z",
				"location": map[string]interface{}{
					"city":      city,
					"latitude":  lat,
					"longitude": lon,
				},
				"weather": map[string]interface{}{
					"temperature":     temp,
					"humidity":        humidity,
					"windSpeed":       windSpeed,
					"condition":       condition,
					"rainProbability": rainProb,
				},
				"source": source,
			}

			data, err := json.Marshal(msg)
			if err != nil {
				return false
			}

			_, validationErr := ValidateMessage(data)
			return validationErr == nil
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

// TestProperty4_InvalidMessagesAreRejected tests that invalid messages fail validation
func TestProperty4_InvalidMessagesAreRejected(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 100
	properties := gopter.NewProperties(parameters)

	// Test invalid latitude (out of range)
	properties.Property("invalid latitude is rejected", prop.ForAll(
		func(lat float64) bool {
			msg := createBaseMessage()
			msg["location"].(map[string]interface{})["latitude"] = lat

			data, _ := json.Marshal(msg)
			_, err := ValidateMessage(data)
			return err != nil
		},
		gen.OneGenOf(
			gen.Float64Range(-180, -90.01),
			gen.Float64Range(90.01, 180),
		),
	))

	// Test invalid longitude (out of range)
	properties.Property("invalid longitude is rejected", prop.ForAll(
		func(lon float64) bool {
			msg := createBaseMessage()
			msg["location"].(map[string]interface{})["longitude"] = lon

			data, _ := json.Marshal(msg)
			_, err := ValidateMessage(data)
			return err != nil
		},
		gen.OneGenOf(
			gen.Float64Range(-360, -180.01),
			gen.Float64Range(180.01, 360),
		),
	))

	// Test invalid humidity (out of range)
	properties.Property("invalid humidity is rejected", prop.ForAll(
		func(humidity float64) bool {
			msg := createBaseMessage()
			msg["weather"].(map[string]interface{})["humidity"] = humidity

			data, _ := json.Marshal(msg)
			_, err := ValidateMessage(data)
			return err != nil
		},
		gen.OneGenOf(
			gen.Float64Range(-100, -0.01),
			gen.Float64Range(100.01, 200),
		),
	))

	// Test invalid rain probability (out of range)
	properties.Property("invalid rain probability is rejected", prop.ForAll(
		func(rainProb float64) bool {
			msg := createBaseMessage()
			msg["weather"].(map[string]interface{})["rainProbability"] = rainProb

			data, _ := json.Marshal(msg)
			_, err := ValidateMessage(data)
			return err != nil
		},
		gen.OneGenOf(
			gen.Float64Range(-100, -0.01),
			gen.Float64Range(100.01, 200),
		),
	))

	properties.TestingRun(t)
}

func createBaseMessage() map[string]interface{} {
	return map[string]interface{}{
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
}
