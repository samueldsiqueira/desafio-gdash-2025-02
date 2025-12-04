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
    // Pre-compute hashed passwords to avoid bcrypt overhead in property tests
    let preHashedPassword: string;
    const testPassword = 'testPassword123';

    beforeAll(async () => {
      preHashedPassword = await bcrypt.hash(testPassword, 10);
    });

    it('should generate a valid JWT token for any valid user credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            role: fc.constantFrom('admin', 'user'),
          }),
          async (userData) => {
            // Use pre-hashed password to avoid bcrypt overhead
            const mockUser = {
              _id: 'test-id-123',
              email: userData.email,
              password: preHashedPassword,
              name: userData.name,
              role: userData.role,
            };

            // Mock the services
            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser as any);
            const mockToken = 'mock.jwt.token';
            jest.spyOn(jwtService, 'sign').mockReturnValue(mockToken);

            // Attempt login with the known password
            const result = await authService.login({
              email: userData.email,
              password: testPassword,
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
    }, 30000);

    it('should reject invalid credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            wrongPassword: fc.string({ minLength: 6, maxLength: 20 }).filter(p => p !== testPassword),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            role: fc.constantFrom('admin', 'user'),
          }),
          async (userData) => {
            const mockUser = {
              _id: 'test-id-123',
              email: userData.email,
              password: preHashedPassword,
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
    }, 30000);
  });

  /**
   * Unit tests for auth service
   * Requirements: 6.1, 6.2, 6.3
   */
  describe('Unit Tests - Login functionality', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash(loginDto.password, 10);
      const mockUser = {
        _id: 'user-id-123',
        email: loginDto.email,
        password: hashedPassword,
        name: 'Test User',
        role: 'user',
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser as any);
      jest.spyOn(jwtService, 'sign').mockReturnValue('mock.jwt.token');

      const result = await authService.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('mock.jwt.token');
      expect(result.user).toEqual({
        id: mockUser._id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      const mockUser = {
        _id: 'user-id-123',
        email: loginDto.email,
        password: hashedPassword,
        name: 'Test User',
        role: 'user',
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser as any);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Unit Tests - Token validation', () => {
    it('should validate a valid token', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload = {
        email: 'test@example.com',
        sub: 'user-id-123',
        role: 'user',
      };

      jest.spyOn(jwtService, 'verify').mockReturnValue(mockPayload);

      const result = await authService.validateToken(mockToken);

      expect(result).toEqual(mockPayload);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const mockToken = 'invalid.jwt.token';

      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.validateToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Unit Tests - Get Profile', () => {
    it('should return user profile for valid email', async () => {
      const mockUser = {
        _id: 'user-id-123',
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        role: 'user',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser as any);

      const result = await authService.getProfile('test@example.com');

      expect(result).toEqual({
        _id: mockUser._id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      await expect(authService.getProfile('nonexistent@example.com')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
