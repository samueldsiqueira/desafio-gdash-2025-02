# Design Document - Weather Monitoring System

## Overview

O Weather Monitoring System é uma aplicação distribuída que implementa um pipeline de dados completo para coleta, processamento, armazenamento e visualização de informações climáticas. A arquitetura segue o padrão de microserviços com comunicação assíncrona via message broker, garantindo desacoplamento, escalabilidade e resiliência.

O fluxo principal de dados segue este caminho:
1. **Python Weather Collector** coleta dados de APIs climáticas externas periodicamente
2. Dados são publicados em uma **fila do Message Broker** (RabbitMQ)
3. **Go Queue Worker** consome mensagens, valida e encaminha para a API
4. **NestJS API Service** persiste dados no MongoDB e expõe endpoints REST
5. **React Dashboard** consome a API e apresenta visualizações interativas
6. **AI Insights** são gerados a partir dos dados históricos para fornecer análises inteligentes

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  Weather APIs   │
│ (Open-Meteo/    │
│  OpenWeather)   │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│     Python      │
│Weather Collector│
└────────┬────────┘
         │ AMQP
         ▼
┌─────────────────┐
│  RabbitMQ/Redis │
│ Message Broker  │
└────────┬────────┘
         │ AMQP
         ▼
┌─────────────────┐      ┌─────────────┐
│   Go Worker     │─────▶│   MongoDB   │
│  Queue Consumer │ HTTP │             │
└────────┬────────┘      └──────▲──────┘
         │                       │
         │ HTTP                  │ MongoDB
         ▼                       │ Protocol
┌─────────────────┐             │
│   NestJS API    │─────────────┘
│     Service     │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐
│  React + Vite   │
│    Dashboard    │
└─────────────────┘
```

### Service Responsibilities

**Python Weather Collector**
- Executa em intervalos configuráveis (cron-like)
- Faz requisições HTTP para APIs climáticas
- Normaliza dados em formato JSON padronizado
- Publica mensagens no Message Broker
- Implementa retry e error handling

**Message Broker (RabbitMQ)**
- Gerencia fila de mensagens climáticas
- Garante entrega confiável com ack/nack
- Permite desacoplamento temporal entre produtor e consumidor
- Suporta múltiplos workers para escalabilidade

**Go Queue Worker**
- Consome mensagens da fila
- Valida estrutura e tipos de dados
- Transforma dados se necessário
- Envia requisições HTTP POST para API
- Implementa retry logic e circuit breaker
- Registra logs estruturados

**NestJS API Service**
- Gerencia autenticação JWT
- Implementa CRUD de usuários
- Persiste weather logs no MongoDB
- Gera AI insights a partir de dados históricos
- Expõe endpoints REST para frontend
- Implementa exportação CSV/XLSX
- (Opcional) Integra com APIs públicas paginadas

**MongoDB**
- Armazena weather logs
- Armazena usuários e credenciais (hash)
- Suporta queries com filtros e agregações
- Indexação para performance

**React Dashboard**
- Interface responsiva com Tailwind CSS
- Componentes reutilizáveis do shadcn/ui
- Autenticação com JWT storage
- Visualizações com gráficos (recharts ou similar)
- Tabelas interativas com paginação
- Download de arquivos CSV/XLSX

## Components and Interfaces

### 1. Python Weather Collector

**Tecnologias:**
- Python 3.11+
- `requests` ou `httpx` para HTTP
- `pika` para RabbitMQ ou `redis-py` para Redis
- `schedule` ou `APScheduler` para agendamento
- `python-dotenv` para configuração

**Estrutura:**
```
weather-collector/
├── src/
│   ├── collector.py      # Lógica principal de coleta
│   ├── api_client.py     # Cliente para APIs climáticas
│   ├── queue_publisher.py # Publicador de mensagens
│   └── config.py         # Configurações
├── requirements.txt
├── Dockerfile
└── .env.example
```

**Interface de Saída (Mensagem JSON):**
```json
{
  "timestamp": "2025-12-03T14:30:00Z",
  "location": {
    "city": "São Paulo",
    "latitude": -23.5505,
    "longitude": -46.6333
  },
  "weather": {
    "temperature": 28.5,
    "humidity": 65,
    "wind_speed": 12.3,
    "condition": "partly_cloudy",
    "rain_probability": 30
  },
  "source": "open-meteo"
}
```

### 2. Go Queue Worker

**Tecnologias:**
- Go 1.21+
- `github.com/rabbitmq/amqp091-go` para RabbitMQ
- `encoding/json` para parsing
- `net/http` para requisições

**Estrutura:**
```
queue-worker/
├── cmd/
│   └── worker/
│       └── main.go
├── internal/
│   ├── consumer/
│   │   └── consumer.go
│   ├── validator/
│   │   └── validator.go
│   ├── api_client/
│   │   └── client.go
│   └── config/
│       └── config.go
├── go.mod
├── go.sum
└── Dockerfile
```

**Interface de Entrada:** Consome mensagens JSON do formato acima

**Interface de Saída:** HTTP POST para API Service
```
POST /api/weather/logs
Content-Type: application/json

{
  "timestamp": "2025-12-03T14:30:00Z",
  "location": {...},
  "weather": {...},
  "source": "open-meteo"
}
```

### 3. NestJS API Service

**Tecnologias:**
- NestJS 10+
- TypeScript 5+
- Mongoose para MongoDB
- Passport + JWT para autenticação
- class-validator para validação
- ExcelJS para exportação XLSX
- csv-writer para exportação CSV

**Estrutura:**
```
api-service/
├── src/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   ├── jwt.strategy.ts
│   │   └── dto/
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   ├── users.controller.ts
│   │   ├── schemas/
│   │   └── dto/
│   ├── weather/
│   │   ├── weather.module.ts
│   │   ├── weather.service.ts
│   │   ├── weather.controller.ts
│   │   ├── insights.service.ts
│   │   ├── export.service.ts
│   │   ├── schemas/
│   │   └── dto/
│   ├── external-api/  (opcional)
│   │   ├── external-api.module.ts
│   │   ├── external-api.service.ts
│   │   └── external-api.controller.ts
│   ├── app.module.ts
│   └── main.ts
├── package.json
├── tsconfig.json
└── Dockerfile
```

**Endpoints Principais:**

**Auth:**
- `POST /api/auth/login` - Autenticação
- `POST /api/auth/register` - Registro (opcional)

**Users:**
- `GET /api/users` - Listar usuários (protegido)
- `POST /api/users` - Criar usuário (protegido)
- `GET /api/users/:id` - Obter usuário (protegido)
- `PATCH /api/users/:id` - Atualizar usuário (protegido)
- `DELETE /api/users/:id` - Deletar usuário (protegido)

**Weather:**
- `POST /api/weather/logs` - Criar weather log (interno, do Go worker)
- `GET /api/weather/logs` - Listar logs com filtros e paginação (protegido)
- `GET /api/weather/insights` - Obter AI insights (protegido)
- `GET /api/weather/export/csv` - Exportar CSV (protegido)
- `GET /api/weather/export/xlsx` - Exportar XLSX (protegido)

**External API (opcional):**
- `GET /api/external/items` - Listar itens paginados (protegido)
- `GET /api/external/items/:id` - Obter detalhes de item (protegido)

### 4. React Dashboard

**Tecnologias:**
- React 18+
- Vite 5+
- TypeScript 5+
- Tailwind CSS 3+
- shadcn/ui components
- React Router para navegação
- Recharts ou Chart.js para gráficos
- Axios ou Fetch API para requisições
- Zustand ou Context API para state management

**Estrutura:**
```
dashboard/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Layout.tsx
│   │   ├── weather/
│   │   │   ├── WeatherCard.tsx
│   │   │   ├── WeatherChart.tsx
│   │   │   ├── WeatherTable.tsx
│   │   │   └── InsightsPanel.tsx
│   │   └── auth/
│   │       └── LoginForm.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Login.tsx
│   │   ├── Users.tsx
│   │   └── Explore.tsx  (opcional)
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── weather.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useWeather.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── Dockerfile
```

**Páginas:**
- `/login` - Autenticação
- `/dashboard` - Dashboard principal com dados climáticos e insights
- `/users` - Gerenciamento de usuários
- `/explore` - (Opcional) Exploração de API pública

## Data Models

### User Schema (MongoDB)

```typescript
{
  _id: ObjectId,
  email: string,           // unique, required
  password: string,        // hashed with bcrypt
  name: string,            // required
  role: string,            // 'admin' | 'user'
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `email`: unique index

### Weather Log Schema (MongoDB)

```typescript
{
  _id: ObjectId,
  timestamp: Date,         // required, indexed
  location: {
    city: string,
    latitude: number,
    longitude: number
  },
  weather: {
    temperature: number,   // Celsius
    humidity: number,      // percentage
    windSpeed: number,     // km/h
    condition: string,     // 'sunny', 'cloudy', 'rainy', etc.
    rainProbability: number // percentage
  },
  source: string,          // 'open-meteo' | 'openweather'
  createdAt: Date
}
```

**Indexes:**
- `timestamp`: descending index for time-series queries
- `location.city`: index for location-based queries

### AI Insights Model (Computed)

```typescript
{
  period: {
    start: Date,
    end: Date
  },
  statistics: {
    avgTemperature: number,
    avgHumidity: number,
    avgWindSpeed: number,
    maxTemperature: number,
    minTemperature: number
  },
  trends: {
    temperatureTrend: 'rising' | 'falling' | 'stable',
    humidityTrend: 'rising' | 'falling' | 'stable'
  },
  classification: 'cold' | 'cool' | 'pleasant' | 'warm' | 'hot',
  alerts: string[],        // ['High rain probability', 'Extreme heat']
  comfortScore: number,    // 0-100
  summary: string          // Natural language summary
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Complete data extraction from API responses

*For any* valid API response from weather services, the Weather Collector should extract all required fields (temperature, humidity, wind speed, condition, rain probability) and include them in the normalized output.

**Validates: Requirements 1.2**

### Property 2: Valid JSON structure from normalization

*For any* weather data processed by the Weather Collector, the normalized output should be valid JSON that conforms to the expected schema with all required fields present.

**Validates: Requirements 1.3**

### Property 3: Message delivery to broker

*For any* normalized weather data, the Weather Collector should successfully publish a message to the Message Broker queue.

**Validates: Requirements 1.4**

### Property 4: Queue worker validates message structure

*For any* message consumed from the queue, the Queue Worker should perform validation and correctly identify whether the message structure is valid or invalid.

**Validates: Requirements 2.3**

### Property 5: Valid messages trigger API calls

*For any* valid message processed by the Queue Worker, an HTTP POST request should be sent to the API Service with the weather data.

**Validates: Requirements 2.4**

### Property 6: Successful API responses trigger acknowledgment

*For any* successful response from the API Service (2xx status), the Queue Worker should send an acknowledgment (ack) to the Message Broker.

**Validates: Requirements 2.5**

### Property 7: Failed API responses trigger negative acknowledgment

*For any* error response from the API Service (4xx, 5xx status) or connection failure, the Queue Worker should send a negative acknowledgment (nack) to the Message Broker.

**Validates: Requirements 2.6**

### Property 8: Message processing generates logs

*For any* message processed by the Queue Worker (success or failure), log entries should be created with relevant operation details.

**Validates: Requirements 2.7**

### Property 9: Weather data persistence

*For any* valid weather data received by the API Service, a corresponding Weather Log document should be created and stored in MongoDB.

**Validates: Requirements 3.1**

### Property 10: Weather logs returned in chronological order

*For any* request to list weather logs, the API Service should return results ordered by timestamp in descending order (newest first).

**Validates: Requirements 3.3**

### Property 11: Dashboard cards contain all required fields

*For any* weather data displayed in dashboard cards, all required fields (temperature, humidity, wind speed, condition) should be present in the rendered output.

**Validates: Requirements 3.4**

### Property 12: Weather table rows contain complete data

*For any* weather log displayed in the dashboard table, the row should include all required fields (date/time, location, condition, temperature, humidity).

**Validates: Requirements 3.6**

### Property 13: Insights generation from historical data

*For any* non-empty set of historical weather logs, the API Service should generate AI Insights containing statistics, trends, and classification.

**Validates: Requirements 4.1**

### Property 14: Statistical calculations are valid

*For any* set of weather data used for insights, calculated statistics (averages, min, max) should be mathematically correct and within valid ranges.

**Validates: Requirements 4.2**

### Property 15: Weather classification assignment

*For any* weather data processed for insights, a valid classification category (cold, cool, pleasant, warm, hot) should be assigned based on temperature.

**Validates: Requirements 4.3**

### Property 16: Extreme conditions generate alerts

*For any* weather data with extreme values (very high/low temperature, high rain probability), appropriate alert messages should be included in the insights.

**Validates: Requirements 4.4**

### Property 17: Insights displayed in dashboard

*For any* AI Insights data received by the Dashboard, the insights should be rendered in both textual and visual format.

**Validates: Requirements 4.5**

### Property 18: CSV export contains all fields

*For any* set of weather logs exported to CSV format, all relevant fields should be present as columns in the output file.

**Validates: Requirements 5.1, 5.3**

### Property 19: XLSX export contains all fields

*For any* set of weather logs exported to XLSX format, all relevant fields should be present as columns in the output file.

**Validates: Requirements 5.2, 5.3**

### Property 20: Valid credentials produce valid JWT

*For any* valid user credentials submitted to the login endpoint, the API Service should return a valid JWT token that can be decoded and verified.

**Validates: Requirements 6.1, 6.2**

### Property 21: User CRUD round-trip consistency

*For any* user created through the API, retrieving that user by ID should return data matching the original input (excluding password hash).

**Validates: Requirements 6.4**

### Property 22: Protected endpoints reject invalid tokens

*For any* protected endpoint accessed without a valid JWT token, the API Service should return a 401 Unauthorized response.

**Validates: Requirements 6.5**

### Property 23: Error logging completeness

*For any* error that occurs in any service, a log entry should be created containing sufficient context (error message, stack trace, timestamp, service name).

**Validates: Requirements 8.5**

### Property 24: Input validation rejects invalid data

*For any* invalid input data sent to API endpoints, the validation layer should reject the request and return appropriate error messages.

**Validates: Requirements 8.7**

### Property 25: Paginated results respect page boundaries

*For any* paginated API request (optional external API feature), the returned results should contain exactly the requested page size (or fewer on the last page) and correct pagination metadata.

**Validates: Requirements 9.2**

## Error Handling

### Python Weather Collector

**Error Scenarios:**
- API unavailable or timeout
- Invalid API response format
- Message broker connection failure
- Authentication errors with external APIs

**Handling Strategy:**
- Implement exponential backoff for API retries
- Log all errors with full context
- Continue operation on next scheduled interval
- Use circuit breaker pattern for repeated failures
- Validate API responses before processing

### Go Queue Worker

**Error Scenarios:**
- Invalid message format
- API Service unavailable
- Message broker connection loss
- Validation failures

**Handling Strategy:**
- Send nack for invalid messages (with requeue limit)
- Implement retry logic with exponential backoff for API calls
- Use dead letter queue for permanently failed messages
- Graceful shutdown on connection loss
- Structured logging for all error paths

### NestJS API Service

**Error Scenarios:**
- MongoDB connection failures
- Invalid input data
- Authentication/authorization failures
- External API failures (optional feature)
- File generation errors (CSV/XLSX)

**Handling Strategy:**
- Use NestJS exception filters for consistent error responses
- Validate all inputs with class-validator
- Return appropriate HTTP status codes
- Log errors with request context
- Implement database connection retry logic
- Use transactions where appropriate

### React Dashboard

**Error Scenarios:**
- API request failures
- Network errors
- Invalid token/session expiration
- Data parsing errors

**Handling Strategy:**
- Display user-friendly error messages with Toast components
- Implement automatic token refresh
- Redirect to login on 401 errors
- Show loading states during async operations
- Implement error boundaries for component errors
- Retry failed requests with user feedback

## Testing Strategy

### Unit Testing

**Python Weather Collector:**
- Test API client with mocked responses
- Test data normalization logic
- Test message formatting
- Test error handling paths

**Go Queue Worker:**
- Test message validation logic
- Test API client with mocked HTTP responses
- Test ack/nack logic
- Test retry mechanisms

**NestJS API Service:**
- Test service layer business logic
- Test DTO validation
- Test authentication guards
- Test insights calculation algorithms
- Test export generation
- Test CRUD operations

**React Dashboard:**
- Test component rendering with React Testing Library
- Test hooks logic
- Test utility functions
- Test form validation

### Property-Based Testing

Property-based testing will be implemented using:
- **Python:** `hypothesis` library
- **Go:** `gopter` or `rapid` library
- **TypeScript/NestJS:** `fast-check` library
- **TypeScript/React:** `fast-check` library

Each property-based test will:
- Run a minimum of 100 iterations
- Be tagged with a comment referencing the design document property
- Use the format: `**Feature: weather-monitoring-system, Property {number}: {property_text}**`

**Key Property Tests:**

1. **Data Extraction (Python):** Generate various API response formats and verify all required fields are extracted
2. **JSON Normalization (Python):** Generate random weather data and verify output is valid JSON with correct schema
3. **Message Validation (Go):** Generate valid and invalid messages and verify validation correctly identifies them
4. **API Persistence (NestJS):** Generate random weather data and verify round-trip consistency (save then retrieve)
5. **Insights Calculations (NestJS):** Generate random weather datasets and verify statistical calculations are mathematically correct
6. **Classification Logic (NestJS):** Generate weather data across temperature ranges and verify correct classification
7. **Export Completeness (NestJS):** Generate random weather logs and verify all fields present in CSV/XLSX
8. **JWT Validation (NestJS):** Generate random user credentials and verify JWT can be created and validated
9. **Input Validation (NestJS):** Generate invalid inputs and verify they are rejected with appropriate errors
10. **Pagination (NestJS):** Generate random datasets and verify pagination boundaries are respected

### Integration Testing

**End-to-End Flow:**
- Test complete pipeline: Python → RabbitMQ → Go → NestJS → MongoDB
- Test authentication flow: Login → Token → Protected endpoint access
- Test export flow: Request → Generate → Download
- Test dashboard data flow: API request → Display → User interaction

**API Integration:**
- Test all REST endpoints with Supertest
- Test authentication middleware
- Test error responses
- Test pagination and filtering

**Database Integration:**
- Test MongoDB operations with test database
- Test indexes and query performance
- Test data integrity constraints

### Testing Tools

- **Python:** pytest, hypothesis, pytest-mock, responses
- **Go:** testing package, testify, gopter, httptest
- **NestJS:** Jest, Supertest, fast-check, mongodb-memory-server
- **React:** Vitest, React Testing Library, fast-check, MSW (Mock Service Worker)

### CI/CD Testing

- Run linters (ESLint, Prettier, gofmt, black, flake8)
- Run unit tests on all services
- Run property-based tests
- Run integration tests
- Generate coverage reports (target: >80%)
- Run type checking (TypeScript, mypy for Python)

## Deployment and Infrastructure

### Docker Compose Configuration

**Services:**
1. **mongodb** - MongoDB 7.0
2. **rabbitmq** - RabbitMQ 3.12 with management plugin
3. **api** - NestJS API Service
4. **worker** - Go Queue Worker
5. **collector** - Python Weather Collector
6. **dashboard** - React Frontend (Nginx)

**Networks:**
- `backend` - Internal network for services
- `frontend` - Network for dashboard access

**Volumes:**
- `mongodb-data` - Persistent MongoDB storage
- `rabbitmq-data` - Persistent RabbitMQ storage

**Environment Variables:**
```
# MongoDB
MONGO_URI=mongodb://mongodb:27017/weather-monitoring

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
RABBITMQ_QUEUE=weather-data

# API Service
JWT_SECRET=<random-secret>
JWT_EXPIRATION=24h
DEFAULT_USER_EMAIL=admin@example.com
DEFAULT_USER_PASSWORD=admin123
API_PORT=3000

# Weather Collector
WEATHER_API_URL=https://api.open-meteo.com/v1/forecast
WEATHER_API_KEY=<optional>
COLLECTION_INTERVAL=3600
LOCATION_LAT=-23.5505
LOCATION_LON=-46.6333
LOCATION_CITY=São Paulo

# Dashboard
VITE_API_URL=http://localhost:3000/api

# Optional External API
EXTERNAL_API_URL=https://pokeapi.co/api/v2
```

### Service Dependencies

```
dashboard → api → mongodb
worker → api
worker → rabbitmq
collector → rabbitmq
```

### Health Checks

Each service should implement health check endpoints:
- API: `GET /health`
- Worker: Internal health check
- Collector: Internal health check

### Monitoring and Logging

**Logging Strategy:**
- Structured JSON logs from all services
- Log levels: DEBUG, INFO, WARN, ERROR
- Include correlation IDs for request tracing
- Centralized logging (optional: ELK stack)

**Metrics to Monitor:**
- API response times
- Queue message processing rate
- Database query performance
- Error rates per service
- Weather data collection success rate

## Security Considerations

1. **Authentication:**
   - JWT tokens with expiration
   - Password hashing with bcrypt (salt rounds: 10)
   - Secure token storage in frontend (httpOnly cookies or secure localStorage)

2. **API Security:**
   - Rate limiting on public endpoints
   - Input validation and sanitization
   - CORS configuration
   - Helmet.js for security headers

3. **Data Security:**
   - Environment variables for secrets
   - No sensitive data in logs
   - MongoDB authentication enabled
   - RabbitMQ authentication

4. **Network Security:**
   - Internal Docker network for service communication
   - Only expose necessary ports
   - HTTPS in production (reverse proxy)

## Performance Considerations

1. **Database:**
   - Index on timestamp for time-series queries
   - Index on location for location-based queries
   - Consider TTL index for old data cleanup
   - Use aggregation pipeline for insights

2. **API:**
   - Implement caching for insights (Redis optional)
   - Pagination for large datasets
   - Compression for responses
   - Connection pooling for MongoDB

3. **Frontend:**
   - Code splitting and lazy loading
   - Memoization for expensive computations
   - Debouncing for search/filter inputs
   - Virtual scrolling for large tables

4. **Message Queue:**
   - Prefetch limit for worker
   - Multiple worker instances for scaling
   - Message TTL to prevent queue buildup

## Future Enhancements

1. **Real-time Updates:**
   - WebSocket support for live weather updates
   - Server-Sent Events for notifications

2. **Advanced Analytics:**
   - Machine learning models for weather prediction
   - Anomaly detection
   - Historical trend analysis

3. **Multi-location Support:**
   - Support multiple cities/locations
   - Location management UI
   - Comparative analysis between locations

4. **Notifications:**
   - Email/SMS alerts for extreme weather
   - Webhook support for integrations
   - Custom alert rules

5. **Data Visualization:**
   - Interactive maps
   - Advanced charting options
   - Custom dashboard layouts

6. **API Enhancements:**
   - GraphQL support
   - Webhook endpoints
   - Public API with rate limiting
