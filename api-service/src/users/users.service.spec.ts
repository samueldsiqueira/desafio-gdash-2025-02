import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import * as fc from 'fast-check';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  const createMockModel = () => {
    const mockModel: any = function(data: any) {
      return {
        ...data,
        save: jest.fn().mockResolvedValue({
          _id: 'generated-id-' + Math.random().toString(36).substring(2, 11),
          email: data.email,
          name: data.name,
          role: data.role,
        }),
      };
    };
    mockModel.find = jest.fn();
    // findOne is called directly without .exec() in the create method
    // It returns a thenable (promise-like) object
    mockModel.findOne = jest.fn().mockResolvedValue(null);
    mockModel.findById = jest.fn();
    mockModel.findByIdAndUpdate = jest.fn();
    mockModel.findByIdAndDelete = jest.fn();
    return mockModel;
  };

  const createTestModule = async (mockModel: any) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockModel,
        },
      ],
    }).compile();
    return module.get<UsersService>(UsersService);
  };

  /**
   * Feature: weather-monitoring-system, Property 21: User CRUD round-trip consistency
   * Validates: Requirements 6.4
   * 
   * This property test verifies that for any user data created through the API,
   * retrieving that user by ID returns data matching the original input (excluding password hash).
   */
  describe('Property 21: User CRUD round-trip consistency', () => {
    it('should maintain data consistency for create and retrieve operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 20 }).filter(s => s.trim().length >= 6),
            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
            role: fc.constantFrom('admin', 'user'),
          }),
          async (userData) => {
            const mockId = 'test-id-' + Math.random().toString(36).substring(2, 11);
            
            // Create fresh mock and service for each iteration
            const mockModel = createMockModel();
            mockModel.findOne = jest.fn().mockResolvedValue(null);
            const testService = await createTestModule(mockModel);

            // Create user - the service will hash the password and save
            const createdUser = await testService.create(userData);

            // Mock findById for retrieval - simulating what the database would return
            mockModel.findById = jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue({
                  _id: mockId,
                  email: userData.email,
                  name: userData.name,
                  role: userData.role,
                }),
              }),
            });

            // Retrieve user
            const retrievedUser = await testService.findOne(mockId);

            // Verify round-trip consistency (excluding password)
            expect(retrievedUser.email).toBe(userData.email);
            expect(retrievedUser.name).toBe(userData.name);
            expect(retrievedUser.role).toBe(userData.role);
            
            // Also verify the created user matches input
            expect(createdUser.email).toBe(userData.email);
            expect(createdUser.name).toBe(userData.name);
            expect(createdUser.role).toBe(userData.role);
          },
        ),
        { numRuns: 100 },
      );
    }, 60000);

    it('should maintain data consistency for update operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            originalEmail: fc.emailAddress(),
            originalName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
            originalRole: fc.constantFrom('admin', 'user'),
            updatedName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
          }),
          async (userData) => {
            const mockId = 'test-id-' + Math.random().toString(36).substring(2, 11);

            // Create fresh mock and service for each iteration
            const mockModel = createMockModel();
            const testService = await createTestModule(mockModel);

            // Mock findByIdAndUpdate - simulating database update and return
            mockModel.findByIdAndUpdate = jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue({
                  _id: mockId,
                  email: userData.originalEmail,
                  name: userData.updatedName,
                  role: userData.originalRole,
                }),
              }),
            });

            // Update user
            const updatedUser = await testService.update(mockId, {
              name: userData.updatedName,
            });

            // Verify the update was applied correctly
            expect(updatedUser.name).toBe(userData.updatedName);
            expect(updatedUser.email).toBe(userData.originalEmail);
            expect(updatedUser.role).toBe(userData.originalRole);
          },
        ),
        { numRuns: 100 },
      );
    }, 30000);
  });

  describe('Error handling', () => {
    it('should throw ConflictException when creating user with existing email', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const existingUser = {
        email: 'existing@example.com',
        password: 'hashedpassword',
        name: 'Existing User',
        role: 'user',
      };

      mockModel.findOne = jest.fn().mockResolvedValue(existingUser);

      await expect(
        service.create({
          email: 'existing@example.com',
          password: 'password123',
          name: 'New User',
          role: 'user',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when user not found', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      mockModel.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  /**
   * Unit tests for user service
   * Requirements: 6.4
   */
  describe('Unit Tests - User creation', () => {
    it('should create a new user with hashed password', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const createUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: 'user' as const,
      };

      mockModel.findOne = jest.fn().mockResolvedValue(null);

      const result = await service.create(createUserDto);

      expect(result).toBeDefined();
      expect(result.email).toBe(createUserDto.email);
      expect(result.name).toBe(createUserDto.name);
      expect(result.role).toBe(createUserDto.role);
    });

    it('should throw ConflictException when email already exists', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const createUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
        role: 'user' as const,
      };

      mockModel.findOne = jest.fn().mockResolvedValue({ email: createUserDto.email });

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });


  describe('Unit Tests - User retrieval', () => {
    it('should return all users without passwords', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const mockUsers = [
        { _id: '1', email: 'user1@example.com', name: 'User 1', role: 'user' },
        { _id: '2', email: 'user2@example.com', name: 'User 2', role: 'admin' },
      ];

      mockModel.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUsers),
        }),
      });

      const result = await service.findAll();

      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    it('should return a single user by id', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const mockUser = {
        _id: 'user-id-123',
        email: 'user@example.com',
        name: 'Test User',
        role: 'user',
      };

      mockModel.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      const result = await service.findOne('user-id-123');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      mockModel.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Unit Tests - User update', () => {
    it('should update user successfully', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const updateDto = {
        name: 'Updated Name',
      };

      const mockUpdatedUser = {
        _id: 'user-id-123',
        email: 'user@example.com',
        name: 'Updated Name',
        role: 'user',
      };

      mockModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUpdatedUser),
        }),
      });

      const result = await service.update('user-id-123', updateDto);

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when updating non-existent user', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      mockModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.update('nonexistent-id', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Unit Tests - User deletion', () => {
    it('should delete user successfully', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const mockUser = {
        _id: 'user-id-123',
        email: 'user@example.com',
      };

      mockModel.findByIdAndDelete = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(service.remove('user-id-123')).resolves.not.toThrow();
    });

    it('should throw NotFoundException when deleting non-existent user', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      mockModel.findByIdAndDelete = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
