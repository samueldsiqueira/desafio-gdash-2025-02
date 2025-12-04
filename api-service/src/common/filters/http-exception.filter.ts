import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Structured error log entry for consistent logging across the service.
 * Requirements: 8.5 - Error logging with sufficient context for debugging
 */
export interface ErrorLogEntry {
  timestamp: string;
  level: 'ERROR';
  service: string;
  correlationId: string;
  method: string;
  path: string;
  statusCode: number;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}

/**
 * Generates a unique correlation ID for request tracing.
 */
function generateCorrelationId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Creates a structured error log entry with all required context.
 * Property 23: Error logging completeness
 */
export function createErrorLogEntry(
  request: Request,
  status: number,
  message: string,
  stack?: string,
  context?: Record<string, unknown>,
): ErrorLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    service: 'api-service',
    correlationId: generateCorrelationId(),
    method: request.method,
    path: request.url,
    statusCode: status,
    message,
    ...(stack && { stack }),
    ...(context && { context }),
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown = null;
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as Record<string, unknown>).message as string || message;
        errors = (exceptionResponse as Record<string, unknown>).errors || null;
      } else {
        message = exceptionResponse as string;
      }
      stack = exception.stack;
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
    }

    // Create structured error log entry
    const errorLog = createErrorLogEntry(
      request,
      status,
      message,
      stack,
      errors ? { validationErrors: errors } : undefined,
    );

    // Log the structured error
    this.logger.error(JSON.stringify(errorLog));

    // Include correlation ID in response for client-side debugging
    const errorResponse = {
      statusCode: status,
      timestamp: errorLog.timestamp,
      correlationId: errorLog.correlationId,
      path: request.url,
      method: request.method,
      message,
      ...(errors && { errors }),
    };

    response.status(status).json(errorResponse);
  }
}
