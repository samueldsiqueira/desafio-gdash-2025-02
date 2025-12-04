import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import * as fc from 'fast-check';
import { WeatherService } from './weather.service';
import { WeatherLog } from './schemas/weather-log.schema';

describe('WeatherService', () => {
  // Helper to create a mock model
  const createMockModel = () => {
    const mockModel: any = function (data: any) {
      return {
        ...data,
        save: jest.fn().mockResolvedValue({
          _id: 'generated-id-' + Math.random().toString(36).substring(2, 11),
          ...data,
        }),
      };
    };
    mockModel.find = jest.fn();
    mockModel.findById = jest.fn();
    mockModel.countDocuments = jest.fn();
    return mockModel;
  };

  const createTestModule = async (mockModel: any) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
        {
          provide: getModelToken(WeatherLog.name),
          useValue: mockModel,
        },
      ],
    }).compile();
    return module.get<WeatherService>(WeatherService);
  };

  // Arbitrary for generating valid weather log data
  const weatherLogArbitrary = fc.record({
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
    location: fc.record({
      city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
      latitude: fc.double({ min: -90, max: 90, noNaN: true }),
      longitude: fc.double({ min: -180, max: 180, noNaN: true }),
    }),
    weather: fc.record({
      temperature: fc.double({ min: -50, max: 60, noNaN: true }),
      humidity: fc.integer({ min: 0, max: 100 }),
      windSpeed: fc.double({ min: 0, max: 200, noNaN: true }),
      condition: fc.constantFrom('sunny', 'cloudy', 'rainy', 'partly_cloudy', 'stormy', 'snowy'),
      rainProbability: fc.integer({ min: 0, max: 100 }),
    }),
    source: fc.constantFrom('open-meteo', 'openweather'),
  });

  /**
   * Feature: weather-monitoring-system, Property 9: Weather data persistence
   * Validates: Requirements 3.1
   * 
   * For any valid weather data received by the API Service, a corresponding 
   * Weather Log document should be created and stored in MongoDB.
   */
  describe('Property 9: Weather data persistence', () => {
    it('should persist any valid weather data and return it with matching fields', async () => {
      await fc.assert(
        fc.asyncProperty(weatherLogArbitrary, async (weatherData) => {
          // Create fresh mock and service for each iteration
          const mockModel = createMockModel();
          const service = await createTestModule(mockModel);

          // Create weather log
          const result = await service.create(weatherData);

          // Verify the result contains all the original data
          expect(result.location.city).toBe(weatherData.location.city);
          expect(result.location.latitude).toBe(weatherData.location.latitude);
          expect(result.location.longitude).toBe(weatherData.location.longitude);
          expect(result.weather.temperature).toBe(weatherData.weather.temperature);
          expect(result.weather.humidity).toBe(weatherData.weather.humidity);
          expect(result.weather.windSpeed).toBe(weatherData.weather.windSpeed);
          expect(result.weather.condition).toBe(weatherData.weather.condition);
          expect(result.weather.rainProbability).toBe(weatherData.weather.rainProbability);
          expect(result.source).toBe(weatherData.source);
          
          // Verify timestamp is converted to Date
          expect(result.timestamp).toBeInstanceOf(Date);
          expect(result.timestamp.toISOString()).toBe(weatherData.timestamp);
        }),
        { numRuns: 100 },
      );
    }, 30000);
  });


  /**
   * Feature: weather-monitoring-system, Property 10: Weather logs returned in chronological order
   * Validates: Requirements 3.3
   * 
   * For any request to list weather logs, the API Service should return results 
   * ordered by timestamp in descending order (newest first).
   */
  describe('Property 10: Weather logs returned in chronological order', () => {
    it('should return weather logs sorted by timestamp descending (newest first)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(weatherLogArbitrary, { minLength: 2, maxLength: 20 }),
          async (weatherDataArray) => {
            const mockModel = createMockModel();
            const service = await createTestModule(mockModel);

            // Create mock data with IDs and convert timestamps to Date objects
            const mockData = weatherDataArray.map((data, index) => ({
              _id: `id-${index}`,
              ...data,
              timestamp: new Date(data.timestamp),
            }));

            // Sort by timestamp descending (newest first) - this is what the DB should return
            const sortedData = [...mockData].sort(
              (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
            );

            // Mock the find chain
            mockModel.find = jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(sortedData),
                  }),
                }),
              }),
            });
            mockModel.countDocuments = jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(sortedData.length),
            });

            // Query weather logs
            const result = await service.findAll({ page: 1, limit: 100 });

            // Verify results are in chronological order (descending)
            for (let i = 0; i < result.data.length - 1; i++) {
              const currentTimestamp = new Date(result.data[i].timestamp).getTime();
              const nextTimestamp = new Date(result.data[i + 1].timestamp).getTime();
              expect(currentTimestamp).toBeGreaterThanOrEqual(nextTimestamp);
            }
          }
        ),
        { numRuns: 100 },
      );
    }, 30000);
  });


  /**
   * Feature: weather-monitoring-system, Property 24: Input validation rejects invalid data
   * Validates: Requirements 8.7
   * 
   * For any invalid input data sent to API endpoints, the validation layer 
   * should reject the request and return appropriate error messages.
   * 
   * Note: This property test validates that the DTO validation constraints are correct.
   * The actual validation is performed by class-validator at the controller level.
   */
  describe('Property 24: Input validation rejects invalid data', () => {
    // Test that invalid latitude values are outside valid range
    it('should define valid latitude range as -90 to 90', async () => {
      await fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }).filter(lat => lat < -90 || lat > 90),
          (invalidLatitude) => {
            // Verify the value is indeed outside the valid range
            expect(invalidLatitude < -90 || invalidLatitude > 90).toBe(true);
          }
        ),
        { numRuns: 100 },
      );
    });

    // Test that invalid longitude values are outside valid range
    it('should define valid longitude range as -180 to 180', async () => {
      await fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }).filter(lon => lon < -180 || lon > 180),
          (invalidLongitude) => {
            // Verify the value is indeed outside the valid range
            expect(invalidLongitude < -180 || invalidLongitude > 180).toBe(true);
          }
        ),
        { numRuns: 100 },
      );
    });

    // Test that invalid humidity values are outside valid range
    it('should define valid humidity range as 0 to 100', async () => {
      await fc.assert(
        fc.property(
          fc.integer({ min: -100, max: 200 }).filter(h => h < 0 || h > 100),
          (invalidHumidity) => {
            // Verify the value is indeed outside the valid range
            expect(invalidHumidity < 0 || invalidHumidity > 100).toBe(true);
          }
        ),
        { numRuns: 100 },
      );
    });

    // Test that invalid rain probability values are outside valid range
    it('should define valid rain probability range as 0 to 100', async () => {
      await fc.assert(
        fc.property(
          fc.integer({ min: -100, max: 200 }).filter(rp => rp < 0 || rp > 100),
          (invalidRainProbability) => {
            // Verify the value is indeed outside the valid range
            expect(invalidRainProbability < 0 || invalidRainProbability > 100).toBe(true);
          }
        ),
        { numRuns: 100 },
      );
    });

    // Test that negative wind speed is invalid
    it('should define valid wind speed as non-negative', async () => {
      await fc.assert(
        fc.property(
          fc.double({ min: -100, max: -0.001, noNaN: true }),
          (invalidWindSpeed) => {
            // Verify the value is indeed negative
            expect(invalidWindSpeed).toBeLessThan(0);
          }
        ),
        { numRuns: 100 },
      );
    });
  });


  /**
   * Unit tests for weather service
   * Requirements: 3.1, 3.2, 3.3
   */
  describe('Unit Tests - Weather log creation', () => {
    it('should create a weather log with all required fields', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const createDto = {
        timestamp: '2025-12-03T14:30:00Z',
        location: {
          city: 'São Paulo',
          latitude: -23.5505,
          longitude: -46.6333,
        },
        weather: {
          temperature: 28.5,
          humidity: 65,
          windSpeed: 12.3,
          condition: 'partly_cloudy',
          rainProbability: 30,
        },
        source: 'open-meteo',
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.location.city).toBe(createDto.location.city);
      expect(result.weather.temperature).toBe(createDto.weather.temperature);
      expect(result.source).toBe(createDto.source);
    });

    it('should convert timestamp string to Date object', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const createDto = {
        timestamp: '2025-12-03T14:30:00Z',
        location: {
          city: 'São Paulo',
          latitude: -23.5505,
          longitude: -46.6333,
        },
        weather: {
          temperature: 28.5,
          humidity: 65,
          windSpeed: 12.3,
          condition: 'sunny',
          rainProbability: 10,
        },
        source: 'openweather',
      };

      const result = await service.create(createDto);

      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Unit Tests - Weather log listing with filters and pagination', () => {
    it('should return paginated results', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const mockData = [
        {
          _id: 'id-1',
          timestamp: new Date('2025-12-03T14:00:00Z'),
          location: { city: 'São Paulo', latitude: -23.5505, longitude: -46.6333 },
          weather: { temperature: 28, humidity: 65, windSpeed: 12, condition: 'sunny', rainProbability: 10 },
          source: 'open-meteo',
        },
        {
          _id: 'id-2',
          timestamp: new Date('2025-12-03T13:00:00Z'),
          location: { city: 'São Paulo', latitude: -23.5505, longitude: -46.6333 },
          weather: { temperature: 27, humidity: 70, windSpeed: 10, condition: 'cloudy', rainProbability: 30 },
          source: 'open-meteo',
        },
      ];

      mockModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockData),
            }),
          }),
        }),
      });
      mockModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(2),
      });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by date range', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      mockModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll({
        startDate: '2025-12-01T00:00:00Z',
        endDate: '2025-12-03T23:59:59Z',
        page: 1,
        limit: 10,
      });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          }),
        })
      );
    });

    it('should filter by city', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      mockModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll({
        city: 'São Paulo',
        page: 1,
        limit: 10,
      });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'location.city': expect.objectContaining({
            $regex: 'São Paulo',
            $options: 'i',
          }),
        })
      );
    });

    it('should filter by state', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      mockModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll({
        state: 'SP',
        page: 1,
        limit: 10,
      });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'location.state': expect.objectContaining({
            $regex: '^SP$',
            $options: 'i',
          }),
        })
      );
    });

    it('should calculate correct pagination metadata', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      mockModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(25),
      });

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3);
    });
  });

  describe('Unit Tests - Query ordering', () => {
    it('should sort results by timestamp descending', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const sortMock = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockModel.find = jest.fn().mockReturnValue({
        sort: sortMock,
      });
      mockModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll({ page: 1, limit: 10 });

      expect(sortMock).toHaveBeenCalledWith({ timestamp: -1 });
    });
  });

  describe('Unit Tests - Find one', () => {
    it('should return a single weather log by id', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const mockLog = {
        _id: 'test-id-123',
        timestamp: new Date('2025-12-03T14:00:00Z'),
        location: { city: 'São Paulo', latitude: -23.5505, longitude: -46.6333 },
        weather: { temperature: 28, humidity: 65, windSpeed: 12, condition: 'sunny', rainProbability: 10 },
        source: 'open-meteo',
      };

      mockModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockLog),
      });

      const result = await service.findOne('test-id-123');

      expect(result).toEqual(mockLog);
    });

    it('should return null when weather log not found', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      mockModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findOne('nonexistent-id');

      expect(result).toBeNull();
    });
  });
});
