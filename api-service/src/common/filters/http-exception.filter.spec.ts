import * as fc from 'fast-check';
import { Request } from 'express';
import { createErrorLogEntry, ErrorLogEntry } from './http-exception.filter';

/**
 * Feature: weather-monitoring-system, Property 23: Error logging completeness
 * Validates: Requirements 8.5
 *
 * For any error that occurs in any service, a log entry should be created
 * containing sufficient context (error message, stack trace, timestamp, service name).
 */
describe('Property 23: Error logging completeness', () => {
  // Arbitrary for generating HTTP methods
  const httpMethodArbitrary = fc.constantFrom('GET', 'POST', 'PUT', 'PATCH', 'DELETE');

  // Arbitrary for generating URL paths
  const urlPathArbitrary = fc
    .array(fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z0-9-_]+$/.test(s)), {
      minLength: 1,
      maxLength: 5,
    })
    .map((parts) => '/' + parts.join('/'));

  // Arbitrary for generating HTTP status codes
  const statusCodeArbitrary = fc.constantFrom(400, 401, 403, 404, 500, 502, 503);

  // Arbitrary for generating error messages
  const errorMessageArbitrary = fc.string({ minLength: 1, maxLength: 200 });

  // Arbitrary for generating stack traces
  const stackTraceArbitrary = fc.option(
    fc.string({ minLength: 10, maxLength: 500 }),
    { nil: undefined },
  );

  // Arbitrary for generating context objects
  const contextArbitrary = fc.option(
    fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z]+$/.test(s)),
      fc.oneof(fc.string(), fc.integer(), fc.boolean()),
    ),
    { nil: undefined },
  );

  // Helper to create a mock request
  const createMockRequest = (method: string, url: string): Request =>
    ({
      method,
      url,
    }) as Request;

  it('should create error log entries with all required fields for any error', async () => {
    await fc.assert(
      fc.property(
        httpMethodArbitrary,
        urlPathArbitrary,
        statusCodeArbitrary,
        errorMessageArbitrary,
        stackTraceArbitrary,
        contextArbitrary,
        (method, path, status, message, stack, context) => {
          const request = createMockRequest(method, path);

          const logEntry = createErrorLogEntry(request, status, message, stack, context);

          // Verify all required fields are present
          expect(logEntry).toHaveProperty('timestamp');
          expect(logEntry).toHaveProperty('level');
          expect(logEntry).toHaveProperty('service');
          expect(logEntry).toHaveProperty('correlationId');
          expect(logEntry).toHaveProperty('method');
          expect(logEntry).toHaveProperty('path');
          expect(logEntry).toHaveProperty('statusCode');
          expect(logEntry).toHaveProperty('message');

          // Verify field values match input
          expect(logEntry.level).toBe('ERROR');
          expect(logEntry.service).toBe('api-service');
          expect(logEntry.method).toBe(method);
          expect(logEntry.path).toBe(path);
          expect(logEntry.statusCode).toBe(status);
          expect(logEntry.message).toBe(message);

          // Verify timestamp is valid ISO string
          expect(() => new Date(logEntry.timestamp)).not.toThrow();
          expect(new Date(logEntry.timestamp).toISOString()).toBe(logEntry.timestamp);

          // Verify correlation ID format
          expect(logEntry.correlationId).toMatch(/^req-\d+-[a-z0-9]+$/);

          // Verify optional fields
          if (stack !== undefined) {
            expect(logEntry.stack).toBe(stack);
          }
          if (context !== undefined) {
            expect(logEntry.context).toEqual(context);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should generate unique correlation IDs for each error', async () => {
    const correlationIds = new Set<string>();

    await fc.assert(
      fc.property(
        httpMethodArbitrary,
        urlPathArbitrary,
        statusCodeArbitrary,
        errorMessageArbitrary,
        (method, path, status, message) => {
          const request = createMockRequest(method, path);
          const logEntry = createErrorLogEntry(request, status, message);

          // Each correlation ID should be unique
          expect(correlationIds.has(logEntry.correlationId)).toBe(false);
          correlationIds.add(logEntry.correlationId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should include stack trace when provided', async () => {
    await fc.assert(
      fc.property(
        httpMethodArbitrary,
        urlPathArbitrary,
        statusCodeArbitrary,
        errorMessageArbitrary,
        fc.string({ minLength: 10, maxLength: 500 }), // Always provide stack
        (method, path, status, message, stack) => {
          const request = createMockRequest(method, path);
          const logEntry = createErrorLogEntry(request, status, message, stack);

          expect(logEntry.stack).toBe(stack);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should include context when provided', async () => {
    await fc.assert(
      fc.property(
        httpMethodArbitrary,
        urlPathArbitrary,
        statusCodeArbitrary,
        errorMessageArbitrary,
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z]+$/.test(s)),
          fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        ),
        (method, path, status, message, context) => {
          const request = createMockRequest(method, path);
          const logEntry = createErrorLogEntry(request, status, message, undefined, context);

          expect(logEntry.context).toEqual(context);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Unit tests for error handling
 * Requirements: 8.5
 */
describe('Unit Tests - Error log entry creation', () => {
  it('should create a valid error log entry with minimal input', () => {
    const request = { method: 'GET', url: '/api/test' } as Request;
    const logEntry = createErrorLogEntry(request, 500, 'Test error');

    expect(logEntry.timestamp).toBeDefined();
    expect(logEntry.level).toBe('ERROR');
    expect(logEntry.service).toBe('api-service');
    expect(logEntry.correlationId).toBeDefined();
    expect(logEntry.method).toBe('GET');
    expect(logEntry.path).toBe('/api/test');
    expect(logEntry.statusCode).toBe(500);
    expect(logEntry.message).toBe('Test error');
    expect(logEntry.stack).toBeUndefined();
    expect(logEntry.context).toBeUndefined();
  });

  it('should include stack trace when provided', () => {
    const request = { method: 'POST', url: '/api/users' } as Request;
    const stack = 'Error: Test\n    at Object.<anonymous>';
    const logEntry = createErrorLogEntry(request, 400, 'Validation error', stack);

    expect(logEntry.stack).toBe(stack);
  });

  it('should include context when provided', () => {
    const request = { method: 'DELETE', url: '/api/users/123' } as Request;
    const context = { userId: '123', action: 'delete' };
    const logEntry = createErrorLogEntry(request, 404, 'User not found', undefined, context);

    expect(logEntry.context).toEqual(context);
  });

  it('should generate valid ISO timestamp', () => {
    const request = { method: 'GET', url: '/api/test' } as Request;
    const logEntry = createErrorLogEntry(request, 500, 'Test error');

    const timestamp = new Date(logEntry.timestamp);
    expect(timestamp.toISOString()).toBe(logEntry.timestamp);
  });

  it('should generate correlation ID with correct format', () => {
    const request = { method: 'GET', url: '/api/test' } as Request;
    const logEntry = createErrorLogEntry(request, 500, 'Test error');

    expect(logEntry.correlationId).toMatch(/^req-\d+-[a-z0-9]+$/);
  });
});
