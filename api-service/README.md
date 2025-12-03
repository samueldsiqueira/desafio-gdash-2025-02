# Weather API Service

NestJS-based API service for the Weather Monitoring System.

## Features

- RESTful API endpoints
- MongoDB integration with Mongoose
- JWT authentication
- Global validation and error handling
- Health check endpoint

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run in development mode:
```bash
npm run start:dev
```

4. Run tests:
```bash
npm test
```

## API Endpoints

- `GET /api/health` - Health check endpoint

## Environment Variables

See `.env.example` for required configuration.
