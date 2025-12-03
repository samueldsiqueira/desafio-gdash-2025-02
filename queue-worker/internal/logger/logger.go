package logger

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"time"
)

// Level represents log levels
type Level string

const (
	DEBUG Level = "DEBUG"
	INFO  Level = "INFO"
	WARN  Level = "WARN"
	ERROR Level = "ERROR"
)

// LogEntry represents a structured log entry
type LogEntry struct {
	Timestamp string                 `json:"timestamp"`
	Level     Level                  `json:"level"`
	Message   string                 `json:"message"`
	Service   string                 `json:"service"`
	Context   map[string]interface{} `json:"context,omitempty"`
}

// Logger provides structured logging functionality
type Logger struct {
	service string
	mu      sync.Mutex
	entries []LogEntry // For testing purposes
}

// New creates a new logger instance
func New(service string) *Logger {
	return &Logger{
		service: service,
		entries: make([]LogEntry, 0),
	}
}

// log creates and outputs a log entry
func (l *Logger) log(level Level, message string, context map[string]interface{}) {
	entry := LogEntry{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Level:     level,
		Message:   message,
		Service:   l.service,
		Context:   context,
	}

	l.mu.Lock()
	l.entries = append(l.entries, entry)
	l.mu.Unlock()

	jsonBytes, err := json.Marshal(entry)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to marshal log entry: %v\n", err)
		return
	}

	fmt.Println(string(jsonBytes))
}


// Debug logs a debug message
func (l *Logger) Debug(message string, context map[string]interface{}) {
	l.log(DEBUG, message, context)
}

// Info logs an info message
func (l *Logger) Info(message string, context map[string]interface{}) {
	l.log(INFO, message, context)
}

// Warn logs a warning message
func (l *Logger) Warn(message string, context map[string]interface{}) {
	l.log(WARN, message, context)
}

// Error logs an error message
func (l *Logger) Error(message string, context map[string]interface{}) {
	l.log(ERROR, message, context)
}

// GetEntries returns all logged entries (for testing)
func (l *Logger) GetEntries() []LogEntry {
	l.mu.Lock()
	defer l.mu.Unlock()
	return append([]LogEntry{}, l.entries...)
}

// ClearEntries clears all logged entries (for testing)
func (l *Logger) ClearEntries() {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.entries = make([]LogEntry, 0)
}

// HasLogWithMessage checks if a log entry with the given message exists (for testing)
func (l *Logger) HasLogWithMessage(message string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	for _, entry := range l.entries {
		if entry.Message == message {
			return true
		}
	}
	return false
}

// HasLogWithLevel checks if a log entry with the given level exists (for testing)
func (l *Logger) HasLogWithLevel(level Level) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	for _, entry := range l.entries {
		if entry.Level == level {
			return true
		}
	}
	return false
}
