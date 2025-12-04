import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS
  app.enableCors();

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Weather Monitoring System API')
    .setDescription(
      `API for the Weather Monitoring System that collects, processes, and visualizes weather data.
      
## Features
- **Authentication**: JWT-based authentication
- **User Management**: CRUD operations for users
- **Weather Data**: Store and retrieve weather logs
- **AI Insights**: Generate insights from historical weather data
- **Data Export**: Export weather data in CSV and XLSX formats
- **External API**: Optional integration with PokéAPI

## Authentication
Most endpoints require JWT authentication. Use the \`/api/auth/login\` endpoint to obtain a token, then include it in the Authorization header as \`Bearer <token>\`.

## Default User
- Email: admin@example.com
- Password: admin123
`,
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Weather', 'Weather data and insights endpoints')
    .addTag('External', 'External API integration (PokéAPI)')
    .addTag('Health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.API_PORT || 3000;
  await app.listen(port);
  console.log(`API Service running on port ${port}`);
  console.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
