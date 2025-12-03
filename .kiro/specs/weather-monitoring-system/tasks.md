# Implementation Plan

- [x] 1. Setup project structure and Docker infrastructure
  - Create root directory structure with folders for each service
  - Create docker-compose.yml with all services (MongoDB, RabbitMQ, API, Worker, Collector, Dashboard)
  - Create .env.example with all required environment variables
  - Configure Docker networks and volumes
  - Add health checks for each service
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [-] 2. Implement NestJS API Service foundation
  - Initialize NestJS project with TypeScript
  - Configure MongoDB connection with Mongoose
  - Set up project structure (modules, controllers, services, DTOs, schemas)
  - Configure environment variables and validation
  - Add global exception filters and validation pipes
  - Implement health check endpoint
  - _Requirements: 8.1, 8.7_

- [x] 2.1 Implement authentication and user management
  - Create User schema with email, password (hashed), name, role fields
  - Implement JWT strategy with Passport
  - Create auth module with login endpoint
  - Create users module with CRUD endpoints
  - Add JWT guards for protected routes
  - Implement default user creation on startup
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 2.2 Write property test for JWT validation
  - **Property 20: Valid credentials produce valid JWT**
  - **Validates: Requirements 6.1, 6.2**

- [x] 2.3 Write property test for user CRUD round-trip
  - **Property 21: User CRUD round-trip consistency**
  - **Validates: Requirements 6.4**

- [x] 2.4 Write property test for protected endpoint authorization
  - **Property 22: Protected endpoints reject invalid tokens**
  - **Validates: Requirements 6.5**

- [x] 2.5 Write unit tests for auth and user services
  - Test login with valid/invalid credentials
  - Test user creation, update, deletion
  - Test JWT token generation and validation
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Implement weather data management in API
  - Create Weather Log schema with timestamp, location, weather data fields
  - Create weather module with service and controller
  - Implement POST endpoint to receive weather data from worker
  - Implement GET endpoint to list weather logs with pagination and filters
  - Add indexes on timestamp and location fields
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3.1 Write property test for weather data persistence
  - **Property 9: Weather data persistence**
  - **Validates: Requirements 3.1**

- [x] 3.2 Write property test for chronological ordering
  - **Property 10: Weather logs returned in chronological order**
  - **Validates: Requirements 3.3**

- [x] 3.3 Write property test for input validation
  - **Property 24: Input validation rejects invalid data**
  - **Validates: Requirements 8.7**

- [x] 3.4 Write unit tests for weather service
  - Test weather log creation
  - Test listing with filters and pagination
  - Test query ordering
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Implement AI insights generation
  - Create insights service with statistical calculation methods
  - Implement calculation of averages, min, max, trends
  - Implement weather classification logic (cold, cool, pleasant, warm, hot)
  - Implement extreme condition detection and alert generation
  - Implement comfort score calculation
  - Create GET endpoint to retrieve insights for a time period
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

- [x] 4.1 Write property test for insights generation
  - **Property 13: Insights generation from historical data**
  - **Validates: Requirements 4.1**

- [x] 4.2 Write property test for statistical calculations
  - **Property 14: Statistical calculations are valid**
  - **Validates: Requirements 4.2**

- [x] 4.3 Write property test for weather classification
  - **Property 15: Weather classification assignment**
  - **Validates: Requirements 4.3**

- [x] 4.4 Write property test for extreme condition alerts
  - **Property 16: Extreme conditions generate alerts**
  - **Validates: Requirements 4.4**

- [x] 4.5 Write unit tests for insights service
  - Test statistical calculations with known datasets
  - Test classification logic across temperature ranges
  - Test alert generation for extreme values
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Implement data export functionality
  - Install ExcelJS and csv-writer libraries
  - Create export service with CSV generation method
  - Create export service with XLSX generation method
  - Implement GET endpoint for CSV export
  - Implement GET endpoint for XLSX export
  - Add proper headers for file downloads
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 5.1 Write property test for CSV export completeness
  - **Property 18: CSV export contains all fields**
  - **Validates: Requirements 5.1, 5.3**

- [x] 5.2 Write property test for XLSX export completeness
  - **Property 19: XLSX export contains all fields**
  - **Validates: Requirements 5.2, 5.3**

- [x] 5.3 Write unit tests for export service
  - Test CSV generation with sample data
  - Test XLSX generation with sample data
  - Test file format validity
  - _Requirements: 5.1, 5.2, 5.3_

- [-] 6. Implement Python Weather Collector
  - Initialize Python project with requirements.txt
  - Implement API client for Open-Meteo or OpenWeather
  - Implement data extraction and normalization logic
  - Implement RabbitMQ publisher with pika library
  - Add scheduling logic with APScheduler
  - Implement error handling and logging
  - Configure via environment variables
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6.1 Write property test for data extraction
  - **Property 1: Complete data extraction from API responses**
  - **Validates: Requirements 1.2**

- [x] 6.2 Write property test for JSON normalization
  - **Property 2: Valid JSON structure from normalization**
  - **Validates: Requirements 1.3**

- [x] 6.3 Write property test for message delivery
  - **Property 3: Message delivery to broker**
  - **Validates: Requirements 1.4**

- [x] 6.4 Write unit tests for collector
  - Test API client with mocked responses
  - Test data normalization
  - Test error handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 7. Implement Go Queue Worker
  - Initialize Go project with go.mod
  - Implement RabbitMQ consumer with amqp091-go
  - Implement message validation logic
  - Implement HTTP client for API Service
  - Implement ack/nack logic with retry mechanism
  - Add structured logging
  - Configure via environment variables
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 7.1 Write property test for message validation
  - **Property 4: Queue worker validates message structure**
  - **Validates: Requirements 2.3**

- [ ] 7.2 Write property test for API call triggering
  - **Property 5: Valid messages trigger API calls**
  - **Validates: Requirements 2.4**

- [ ] 7.3 Write property test for acknowledgment on success
  - **Property 6: Successful API responses trigger acknowledgment**
  - **Validates: Requirements 2.5**

- [ ] 7.4 Write property test for nack on failure
  - **Property 7: Failed API responses trigger negative acknowledgment**
  - **Validates: Requirements 2.6**

- [ ] 7.5 Write property test for logging
  - **Property 8: Message processing generates logs**
  - **Validates: Requirements 2.7**

- [ ] 7.6 Write unit tests for worker
  - Test message validation with valid/invalid messages
  - Test HTTP client with mocked responses
  - Test ack/nack logic
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 8. Checkpoint - Verify backend pipeline
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement React Dashboard foundation
  - Initialize Vite + React + TypeScript project
  - Configure Tailwind CSS
  - Install and configure shadcn/ui components
  - Set up React Router for navigation
  - Create layout components (Header, Sidebar, Layout)
  - Configure API client with axios
  - Set up authentication context and hooks
  - _Requirements: 8.2_

- [ ] 10. Implement authentication UI
  - Create login page with form (email, password)
  - Implement login form validation
  - Create auth service for API calls
  - Implement JWT token storage
  - Create protected route wrapper
  - Add logout functionality
  - Implement automatic redirect on 401 errors
  - _Requirements: 6.6, 6.7_

- [ ] 10.1 Write unit tests for auth components
  - Test login form validation
  - Test auth hooks
  - Test protected route logic
  - _Requirements: 6.6, 6.7_

- [ ] 11. Implement user management UI
  - Create users page with table listing all users
  - Implement user creation dialog/form
  - Implement user edit dialog/form
  - Implement user deletion with confirmation
  - Add proper error handling and loading states
  - Use shadcn/ui components (Table, Dialog, Button, Input, Toast)
  - _Requirements: 6.8_

- [ ] 11.1 Write unit tests for user management components
  - Test user table rendering
  - Test user form validation
  - Test CRUD operations
  - _Requirements: 6.8_

- [ ] 12. Implement weather dashboard main page
  - Create dashboard page layout
  - Implement weather data fetching hook
  - Create weather cards for current conditions (temperature, humidity, wind, condition)
  - Implement weather charts (temperature over time, rain probability)
  - Create weather logs table with pagination
  - Add export buttons (CSV, XLSX) with download functionality
  - Implement auto-refresh for real-time updates
  - _Requirements: 3.4, 3.5, 3.6, 5.4, 5.5_

- [ ] 12.1 Write property test for weather card rendering
  - **Property 11: Dashboard cards contain all required fields**
  - **Validates: Requirements 3.4**

- [ ] 12.2 Write property test for weather table rendering
  - **Property 12: Weather table rows contain complete data**
  - **Validates: Requirements 3.6**

- [ ] 12.3 Write unit tests for dashboard components
  - Test weather cards with sample data
  - Test charts rendering
  - Test table pagination
  - Test export button functionality
  - _Requirements: 3.4, 3.5, 3.6, 5.4, 5.5_

- [ ] 13. Implement AI insights display
  - Create insights panel component
  - Fetch insights data from API
  - Display statistics (averages, min, max)
  - Display trends with visual indicators
  - Display classification badge
  - Display alerts with appropriate styling
  - Display comfort score with visual gauge
  - Display natural language summary
  - _Requirements: 4.5_

- [ ] 13.1 Write property test for insights rendering
  - **Property 17: Insights displayed in dashboard**
  - **Validates: Requirements 4.5**

- [ ] 13.2 Write unit tests for insights components
  - Test insights panel rendering
  - Test statistics display
  - Test alerts display
  - _Requirements: 4.5_

- [ ] 14. Implement optional external API integration (Optional)
  - Add external API module to NestJS API
  - Implement service to consume PokéAPI or SWAPI
  - Create endpoints for listing items with pagination
  - Create endpoint for item details
  - Create explore page in dashboard
  - Implement item list with pagination controls
  - Implement item detail view
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 14.1 Write property test for pagination
  - **Property 25: Paginated results respect page boundaries**
  - **Validates: Requirements 9.2**

- [ ] 14.2 Write unit tests for external API integration
  - Test API client with mocked responses
  - Test pagination logic
  - Test detail fetching
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 15. Add comprehensive error handling and logging
  - Implement error boundaries in React
  - Add toast notifications for all error scenarios
  - Implement structured logging in all services
  - Add error context (correlation IDs, timestamps)
  - Test error scenarios across all services
  - _Requirements: 8.5_

- [ ] 15.1 Write property test for error logging
  - **Property 23: Error logging completeness**
  - **Validates: Requirements 8.5**

- [ ] 15.2 Write unit tests for error handling
  - Test error boundaries
  - Test toast notifications
  - Test logging in each service
  - _Requirements: 8.5_

- [ ] 16. Final integration and documentation
  - Test complete end-to-end flow via Docker Compose
  - Verify all services start correctly
  - Test data flow from collector to dashboard
  - Create comprehensive README with setup instructions
  - Document all environment variables
  - Add API documentation (Swagger)
  - Create video demonstration (max 5 minutes)
  - _Requirements: 7.6_

- [ ] 17. Final checkpoint - Complete system verification
  - Ensure all tests pass, ask the user if questions arise.
