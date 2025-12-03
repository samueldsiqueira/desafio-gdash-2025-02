package api_client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"queue-worker/internal/validator"
)

// Client handles HTTP communication with the API Service
type Client struct {
	baseURL    string
	httpClient *http.Client
}

// Response represents the API response
type Response struct {
	StatusCode int
	Body       []byte
	Error      error
}

// NewClient creates a new API client
func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// NewClientWithHTTP creates a new API client with a custom HTTP client (for testing)
func NewClientWithHTTP(baseURL string, httpClient *http.Client) *Client {
	return &Client{
		baseURL:    baseURL,
		httpClient: httpClient,
	}
}

// SendWeatherData sends weather data to the API Service
func (c *Client) SendWeatherData(msg *validator.WeatherMessage) *Response {
	jsonData, err := json.Marshal(msg)
	if err != nil {
		return &Response{Error: fmt.Errorf("failed to marshal message: %w", err)}
	}

	req, err := http.NewRequest(http.MethodPost, c.baseURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return &Response{Error: fmt.Errorf("failed to create request: %w", err)}
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return &Response{Error: fmt.Errorf("failed to send request: %w", err)}
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	return &Response{
		StatusCode: resp.StatusCode,
		Body:       body,
		Error:      nil,
	}
}

// IsSuccess checks if the response indicates success (2xx status code)
func (r *Response) IsSuccess() bool {
	return r.Error == nil && r.StatusCode >= 200 && r.StatusCode < 300
}

// IsClientError checks if the response indicates a client error (4xx status code)
func (r *Response) IsClientError() bool {
	return r.Error == nil && r.StatusCode >= 400 && r.StatusCode < 500
}

// IsServerError checks if the response indicates a server error (5xx status code)
func (r *Response) IsServerError() bool {
	return r.Error == nil && r.StatusCode >= 500 && r.StatusCode < 600
}
