import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as fc from 'fast-check';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
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

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  /**
   * Feature: weather-monitoring-system, Property 20: Valid credentials produce valid JWT
   * Validates: Requirements 6.1, 6.2
   */
  describe('Property 20: Valid credentials produce valid JWT', () => {
    it('should generate a valid JWT token for any valid user credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 20 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            role: fc.constantFrom('admin', 'user'),
          }),
          async (userData) => {
            // Hash the password
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            
            // Mock user in database
            const mockUser = {
              _id: 'test-id-123',
              email: userData.email,
              password: hashedPassword,
              name: userData.name,
              role: userData.role,
            };

            // Mock the services
            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser as any);
            const mockToken = 'mock.jwt.token';
            jest.spyOn(jwtService, 'sign').mockReturnValue(mockToken);

            // Attempt login
            const result = await authService.login({
              email: userData.email,
              password: userData.password,
            });

            // Verify JWT token was generated
            expect(result).toHaveProperty('access_token');
            expect(result.access_token).toBe(mockToken);
            expect(jwtService.sign).toHaveBeenCalledWith({
              email: userData.email,
              sub: mockUser._id,
              role: userData.role,
            });

            // Verify user data is returned
            expect(result.user).toEqual({
              id: mockUser._id,
              email: mockUser.email,
              name: mockUser.name,
              role: mockUser.role,
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject invalid credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            correctPassword: fc.string({ minLength: 6, maxLength: 20 }),
            wrongPassword: fc.string({ minLength: 6, maxLength: 20 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            role: fc.constantFrom('admin', 'user'),
          }).filter(data => data.correctPassword !== data.wrongPassword),
          async (userData) => {
            const hashedPassword = await bcrypt.hash(userData.correctPassword, 10);
            
            const mockUser = {
              _id: 'test-id-123',
              email: userData.email,
              password: hashedPassword,
              name: userData.name,
              role: userData.role,
            };

            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser as any);

            // Attempt login with wrong password
            await expect(
              authService.login({
                email: userData.email,
                password: userData.wrongPassword,
              }),
            ).rejects.toThrow(UnauthorizedException);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
