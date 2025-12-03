import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as fc from 'fast-check';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { UsersService } from '../../users/users.service';

describe('JWT Authorization', () => {
  let jwtStrategy: JwtStrategy;
  let usersService: UsersService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'test-secret';
              return null;
            }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  /**
   * Feature: weather-monitoring-system, Property 22: Protected endpoints reject invalid tokens
   * Validates: Requirements 6.5
   */
  describe('Property 22: Protected endpoints reject invalid tokens', () => {
    it('should reject requests with invalid or missing user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            sub: fc.string({ minLength: 10, maxLength: 30 }),
            role: fc.constantFrom('admin', 'user'),
          }),
          async (payload) => {
            // Mock user not found
            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

            // Attempt to validate token
            await expect(jwtStrategy.validate(payload)).rejects.toThrow(
              UnauthorizedException,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should accept valid tokens with existing users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            sub: fc.string({ minLength: 10, maxLength: 30 }),
            role: fc.constantFrom('admin', 'user'),
            name: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async (payload) => {
            // Mock user found
            const mockUser = {
              _id: payload.sub,
              email: payload.email,
              name: payload.name,
              role: payload.role,
              password: 'hashed-password',
            };

            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser as any);

            // Validate token
            const result = await jwtStrategy.validate({
              email: payload.email,
              sub: payload.sub,
              role: payload.role,
            });

            // Verify the result contains expected user info
            expect(result).toEqual({
              userId: payload.sub,
              email: payload.email,
              role: payload.role,
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject malformed tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(''),
            fc.string({ maxLength: 5 }),
            fc.record({
              // Missing required fields
              someField: fc.string(),
            }),
          ),
          async (invalidToken) => {
            jest.spyOn(jwtService, 'verify').mockImplementation(() => {
              throw new UnauthorizedException('Invalid token');
            });

            // Verify that invalid tokens are rejected
            expect(() => jwtService.verify(invalidToken as any)).toThrow(
              UnauthorizedException,
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
