import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import * as fc from 'fast-check';
import { InsightsService, WeatherClassification } from './insights.service';
import { WeatherLog } from './schemas/weather-log.schema';

describe('InsightsService', () => {
  // Helper to create a mock model
  const createMockModel = () => {
    const mockModel: any = jest.fn();
    mockModel.find = jest.fn();
    return mockModel;
  };

  // Helper to create a mock ConfigService
  const createMockConfigService = () => ({
    get: jest.fn().mockReturnValue(undefined), // No Gemini API key by default
  });

  const createTestModule = async (mockModel: any) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsightsService,
        {
          provide: getModelToken(WeatherLog.name),
          useValue: mockModel,
        },
        {
          provide: ConfigService,
          useValue: createMockConfigService(),
        },
      ],
    }).compile();
    return module.get<InsightsService>(InsightsService);
  };

  // Arbitrary for generating valid weather log data
  const weatherLogArbitrary = fc.record({
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
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
   * Feature: weather-monitoring-system, Property 13: Insights generation from historical data
   * Validates: Requirements 4.1
   * 
   * For any non-empty set of historical weather logs, the API Service should generate 
   * AI Insights containing statistics, trends, and classification.
   */
  describe('Property 13: Insights generation from historical data', () => {
    it('should generate insights with statistics, trends, and classification for any non-empty weather log set', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(weatherLogArbitrary, { minLength: 1, maxLength: 20 }),
          async (weatherLogs) => {
            const mockModel = createMockModel();
            const service = await createTestModule(mockModel);

            // Mock the find chain
            mockModel.find = jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(weatherLogs),
              }),
            });

            const result = await service.getInsights({});

            // Verify insights are generated
            expect(result).not.toBeNull();
            
            // Verify statistics are present
            expect(result!.statistics).toBeDefined();
            expect(typeof result!.statistics.avgTemperature).toBe('number');
            expect(typeof result!.statistics.avgHumidity).toBe('number');
            expect(typeof result!.statistics.avgWindSpeed).toBe('number');
            expect(typeof result!.statistics.maxTemperature).toBe('number');
            expect(typeof result!.statistics.minTemperature).toBe('number');

            // Verify trends are present
            expect(result!.trends).toBeDefined();
            expect(['rising', 'falling', 'stable']).toContain(result!.trends.temperatureTrend);
            expect(['rising', 'falling', 'stable']).toContain(result!.trends.humidityTrend);

            // Verify classification is present and valid
            expect(result!.classification).toBeDefined();
            expect(['cold', 'cool', 'pleasant', 'warm', 'hot']).toContain(result!.classification);

            // Verify other required fields
            expect(result!.period).toBeDefined();
            expect(result!.alerts).toBeDefined();
            expect(Array.isArray(result!.alerts)).toBe(true);
            expect(typeof result!.comfortScore).toBe('number');
            expect(typeof result!.summary).toBe('string');
            expect(result!.dataPoints).toBe(weatherLogs.length);
          }
        ),
        { numRuns: 100 },
      );
    }, 30000);
  });

  /**
   * Feature: weather-monitoring-system, Property 14: Statistical calculations are valid
   * Validates: Requirements 4.2
   * 
   * For any set of weather data used for insights, calculated statistics (averages, min, max) 
   * should be mathematically correct and within valid ranges.
   */
  describe('Property 14: Statistical calculations are valid', () => {
    // Use integer-based temperatures to avoid floating point precision issues
    // Real-world temperatures are typically measured to 1 decimal place at most
    const realisticWeatherLogArbitrary = fc.record({
      timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
      location: fc.record({
        city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
        latitude: fc.integer({ min: -90, max: 90 }),
        longitude: fc.integer({ min: -180, max: 180 }),
      }),
      weather: fc.record({
        // Use integer divided by 10 for realistic 1-decimal precision temperatures
        temperature: fc.integer({ min: -500, max: 600 }).map(n => n / 10),
        humidity: fc.integer({ min: 0, max: 100 }),
        windSpeed: fc.integer({ min: 0, max: 2000 }).map(n => n / 10),
        condition: fc.constantFrom('sunny', 'cloudy', 'rainy', 'partly_cloudy', 'stormy', 'snowy'),
        rainProbability: fc.integer({ min: 0, max: 100 }),
      }),
      source: fc.constantFrom('open-meteo', 'openweather'),
    });

    it('should calculate mathematically correct statistics for any weather log set', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(realisticWeatherLogArbitrary, { minLength: 1, maxLength: 20 }),
          async (weatherLogs) => {
            const mockModel = createMockModel();
            const service = await createTestModule(mockModel);

            // Calculate expected values manually
            const temperatures = weatherLogs.map(log => log.weather.temperature);
            const humidities = weatherLogs.map(log => log.weather.humidity);
            const windSpeeds = weatherLogs.map(log => log.weather.windSpeed);

            const expectedAvgTemp = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
            const expectedAvgHumidity = humidities.reduce((a, b) => a + b, 0) / humidities.length;
            const expectedAvgWindSpeed = windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length;
            const expectedMaxTemp = Math.max(...temperatures);
            const expectedMinTemp = Math.min(...temperatures);

            // Use the service's calculateStatistics method directly
            const stats = service.calculateStatistics(weatherLogs as any);

            // Verify averages are correct (with small tolerance for floating point)
            expect(stats.avgTemperature).toBeCloseTo(expectedAvgTemp, 1);
            expect(stats.avgHumidity).toBeCloseTo(expectedAvgHumidity, 1);
            expect(stats.avgWindSpeed).toBeCloseTo(expectedAvgWindSpeed, 1);

            // Verify min/max are correct
            expect(stats.maxTemperature).toBe(expectedMaxTemp);
            expect(stats.minTemperature).toBe(expectedMinTemp);

            // Verify averages are within the range of min/max
            expect(stats.avgTemperature).toBeGreaterThanOrEqual(stats.minTemperature);
            expect(stats.avgTemperature).toBeLessThanOrEqual(stats.maxTemperature);
          }
        ),
        { numRuns: 100 },
      );
    }, 30000);
  });

  /**
   * Feature: weather-monitoring-system, Property 15: Weather classification assignment
   * Validates: Requirements 4.3
   * 
   * For any weather data processed for insights, a valid classification category 
   * (cold, cool, pleasant, warm, hot) should be assigned based on temperature.
   */
  describe('Property 15: Weather classification assignment', () => {
    it('should assign correct classification based on average temperature', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      await fc.assert(
        fc.property(
          fc.double({ min: -50, max: 60, noNaN: true }),
          (avgTemperature) => {
            const classification = service.classifyWeather(avgTemperature);

            // Verify classification is valid
            expect(['cold', 'cool', 'pleasant', 'warm', 'hot']).toContain(classification);

            // Verify classification matches temperature ranges
            if (avgTemperature < 10) {
              expect(classification).toBe('cold');
            } else if (avgTemperature < 18) {
              expect(classification).toBe('cool');
            } else if (avgTemperature < 25) {
              expect(classification).toBe('pleasant');
            } else if (avgTemperature < 32) {
              expect(classification).toBe('warm');
            } else {
              expect(classification).toBe('hot');
            }
          }
        ),
        { numRuns: 100 },
      );
    });

    // Test boundary conditions
    it('should handle classification boundary values correctly', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      // Test exact boundaries
      expect(service.classifyWeather(9.99)).toBe('cold');
      expect(service.classifyWeather(10)).toBe('cool');
      expect(service.classifyWeather(17.99)).toBe('cool');
      expect(service.classifyWeather(18)).toBe('pleasant');
      expect(service.classifyWeather(24.99)).toBe('pleasant');
      expect(service.classifyWeather(25)).toBe('warm');
      expect(service.classifyWeather(31.99)).toBe('warm');
      expect(service.classifyWeather(32)).toBe('hot');
    });
  });

  /**
   * Feature: weather-monitoring-system, Property 16: Extreme conditions generate alerts
   * Validates: Requirements 4.4
   * 
   * For any weather data with extreme values (very high/low temperature, high rain probability), 
   * appropriate alert messages should be included in the insights.
   */
  describe('Property 16: Extreme conditions generate alerts', () => {
    it('should generate extreme heat alert when max temperature >= 35°C', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      await fc.assert(
        fc.property(
          fc.double({ min: 35, max: 60, noNaN: true }),
          (extremeTemp) => {
            const logs = [{
              weather: {
                temperature: extremeTemp,
                humidity: 50,
                windSpeed: 10,
                rainProbability: 20,
              },
            }] as any;

            const stats = service.calculateStatistics(logs);
            const alerts = service.generateAlerts(logs, stats);

            expect(alerts).toContain('Extreme heat detected');
          }
        ),
        { numRuns: 100 },
      );
    });

    it('should generate freezing alert when min temperature <= 0°C', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      await fc.assert(
        fc.property(
          fc.double({ min: -50, max: 0, noNaN: true }),
          (freezingTemp) => {
            const logs = [{
              weather: {
                temperature: freezingTemp,
                humidity: 50,
                windSpeed: 10,
                rainProbability: 20,
              },
            }] as any;

            const stats = service.calculateStatistics(logs);
            const alerts = service.generateAlerts(logs, stats);

            expect(alerts).toContain('Freezing temperatures detected');
          }
        ),
        { numRuns: 100 },
      );
    });

    it('should generate high rain alert when rain probability >= 70%', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      await fc.assert(
        fc.property(
          fc.integer({ min: 70, max: 100 }),
          (highRainProb) => {
            const logs = [{
              weather: {
                temperature: 20,
                humidity: 50,
                windSpeed: 10,
                rainProbability: highRainProb,
              },
            }] as any;

            const stats = service.calculateStatistics(logs);
            const alerts = service.generateAlerts(logs, stats);

            expect(alerts).toContain('High chance of rain');
          }
        ),
        { numRuns: 100 },
      );
    });

    it('should generate strong wind alert when wind speed >= 50 km/h', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      await fc.assert(
        fc.property(
          fc.double({ min: 50, max: 200, noNaN: true }),
          (strongWind) => {
            const logs = [{
              weather: {
                temperature: 20,
                humidity: 50,
                windSpeed: strongWind,
                rainProbability: 20,
              },
            }] as any;

            const stats = service.calculateStatistics(logs);
            const alerts = service.generateAlerts(logs, stats);

            expect(alerts).toContain('Strong winds expected');
          }
        ),
        { numRuns: 100 },
      );
    });

    it('should not generate alerts for normal conditions', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      await fc.assert(
        fc.property(
          fc.record({
            temperature: fc.double({ min: 10, max: 30, noNaN: true }),
            humidity: fc.integer({ min: 30, max: 80 }),
            windSpeed: fc.double({ min: 0, max: 40, noNaN: true }),
            rainProbability: fc.integer({ min: 0, max: 60 }),
          }),
          (normalWeather) => {
            const logs = [{
              weather: normalWeather,
            }] as any;

            const stats = service.calculateStatistics(logs);
            const alerts = service.generateAlerts(logs, stats);

            // Should not have extreme alerts
            expect(alerts).not.toContain('Extreme heat detected');
            expect(alerts).not.toContain('Freezing temperatures detected');
            expect(alerts).not.toContain('High chance of rain');
            expect(alerts).not.toContain('Strong winds expected');
          }
        ),
        { numRuns: 100 },
      );
    });
  });


  /**
   * Unit tests for insights service
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  describe('Unit Tests - Statistical calculations with known datasets', () => {
    it('should calculate correct statistics for a known dataset', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const knownLogs = [
        { weather: { temperature: 20, humidity: 60, windSpeed: 10, rainProbability: 20 } },
        { weather: { temperature: 25, humidity: 70, windSpeed: 15, rainProbability: 30 } },
        { weather: { temperature: 30, humidity: 80, windSpeed: 20, rainProbability: 40 } },
      ] as any;

      const stats = service.calculateStatistics(knownLogs);

      expect(stats.avgTemperature).toBe(25);
      expect(stats.avgHumidity).toBe(70);
      expect(stats.avgWindSpeed).toBe(15);
      expect(stats.maxTemperature).toBe(30);
      expect(stats.minTemperature).toBe(20);
      expect(stats.avgRainProbability).toBe(30);
    });

    it('should handle single data point', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const singleLog = [
        { weather: { temperature: 22, humidity: 55, windSpeed: 12, rainProbability: 25 } },
      ] as any;

      const stats = service.calculateStatistics(singleLog);

      expect(stats.avgTemperature).toBe(22);
      expect(stats.maxTemperature).toBe(22);
      expect(stats.minTemperature).toBe(22);
    });

    it('should return zeros for empty dataset', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const stats = service.calculateStatistics([]);

      expect(stats.avgTemperature).toBe(0);
      expect(stats.avgHumidity).toBe(0);
      expect(stats.avgWindSpeed).toBe(0);
      expect(stats.maxTemperature).toBe(0);
      expect(stats.minTemperature).toBe(0);
    });
  });

  describe('Unit Tests - Classification logic across temperature ranges', () => {
    it('should classify temperatures correctly across all ranges', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const testCases: [number, WeatherClassification][] = [
        [-10, 'cold'],
        [5, 'cold'],
        [10, 'cool'],
        [15, 'cool'],
        [18, 'pleasant'],
        [22, 'pleasant'],
        [25, 'warm'],
        [30, 'warm'],
        [32, 'hot'],
        [40, 'hot'],
      ];

      for (const [temp, expected] of testCases) {
        expect(service.classifyWeather(temp)).toBe(expected);
      }
    });
  });

  describe('Unit Tests - Alert generation for extreme values', () => {
    it('should generate multiple alerts when multiple extreme conditions exist', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const extremeLogs = [
        { weather: { temperature: 40, humidity: 90, windSpeed: 60, rainProbability: 80 } },
      ] as any;

      const stats = service.calculateStatistics(extremeLogs);
      const alerts = service.generateAlerts(extremeLogs, stats);

      expect(alerts).toContain('Extreme heat detected');
      expect(alerts).toContain('High chance of rain');
      expect(alerts).toContain('Strong winds expected');
      expect(alerts).toContain('Very high humidity');
    });

    it('should not generate alerts for moderate conditions', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const moderateLogs = [
        { weather: { temperature: 22, humidity: 50, windSpeed: 15, rainProbability: 30 } },
      ] as any;

      const stats = service.calculateStatistics(moderateLogs);
      const alerts = service.generateAlerts(moderateLogs, stats);

      expect(alerts).toHaveLength(0);
    });
  });

  describe('Unit Tests - Trend calculation', () => {
    it('should detect rising temperature trend', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const risingLogs = [
        { weather: { temperature: 15, humidity: 50 } },
        { weather: { temperature: 16, humidity: 50 } },
        { weather: { temperature: 17, humidity: 50 } },
        { weather: { temperature: 22, humidity: 50 } },
        { weather: { temperature: 23, humidity: 50 } },
        { weather: { temperature: 24, humidity: 50 } },
      ] as any;

      const trends = service.calculateTrends(risingLogs);
      expect(trends.temperatureTrend).toBe('rising');
    });

    it('should detect falling temperature trend', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const fallingLogs = [
        { weather: { temperature: 30, humidity: 50 } },
        { weather: { temperature: 29, humidity: 50 } },
        { weather: { temperature: 28, humidity: 50 } },
        { weather: { temperature: 22, humidity: 50 } },
        { weather: { temperature: 21, humidity: 50 } },
        { weather: { temperature: 20, humidity: 50 } },
      ] as any;

      const trends = service.calculateTrends(fallingLogs);
      expect(trends.temperatureTrend).toBe('falling');
    });

    it('should detect stable temperature trend', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const stableLogs = [
        { weather: { temperature: 22, humidity: 50 } },
        { weather: { temperature: 22, humidity: 50 } },
        { weather: { temperature: 23, humidity: 50 } },
        { weather: { temperature: 22, humidity: 50 } },
      ] as any;

      const trends = service.calculateTrends(stableLogs);
      expect(trends.temperatureTrend).toBe('stable');
    });

    it('should return stable for single data point', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const singleLog = [
        { weather: { temperature: 22, humidity: 50 } },
      ] as any;

      const trends = service.calculateTrends(singleLog);
      expect(trends.temperatureTrend).toBe('stable');
      expect(trends.humidityTrend).toBe('stable');
    });
  });

  describe('Unit Tests - Comfort score calculation', () => {
    it('should return high comfort score for ideal conditions', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const idealStats = {
        avgTemperature: 22,
        avgHumidity: 50,
        avgWindSpeed: 5,
        maxTemperature: 24,
        minTemperature: 20,
        avgRainProbability: 10,
      };

      const score = service.calculateComfortScore(idealStats);
      expect(score).toBeGreaterThanOrEqual(80);
    });

    it('should return low comfort score for extreme conditions', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const extremeStats = {
        avgTemperature: 40,
        avgHumidity: 95,
        avgWindSpeed: 50,
        maxTemperature: 45,
        minTemperature: 35,
        avgRainProbability: 90,
      };

      const score = service.calculateComfortScore(extremeStats);
      expect(score).toBeLessThanOrEqual(30);
    });

    it('should return score between 0 and 100', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const stats = {
        avgTemperature: 25,
        avgHumidity: 60,
        avgWindSpeed: 20,
        maxTemperature: 30,
        minTemperature: 20,
        avgRainProbability: 40,
      };

      const score = service.calculateComfortScore(stats);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Unit Tests - Summary generation', () => {
    it('should generate a summary with all required information', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const stats = {
        avgTemperature: 22,
        avgHumidity: 55,
        avgWindSpeed: 12,
        maxTemperature: 25,
        minTemperature: 18,
        avgRainProbability: 20,
      };

      const trends = {
        temperatureTrend: 'stable' as const,
        humidityTrend: 'rising' as const,
      };

      const classification = 'pleasant' as const;
      const alerts: string[] = [];

      const summary = service.generateSummary(stats, trends, classification, alerts);

      expect(summary).toContain('pleasant');
      expect(summary).toContain('22');
      expect(summary).toContain('stable');
      expect(summary).toContain('55%');
      expect(summary).toContain('12');
    });

    it('should include alerts in summary when present', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const stats = {
        avgTemperature: 38,
        avgHumidity: 90,
        avgWindSpeed: 60,
        maxTemperature: 42,
        minTemperature: 35,
        avgRainProbability: 80,
      };

      const trends = {
        temperatureTrend: 'rising' as const,
        humidityTrend: 'stable' as const,
      };

      const classification = 'hot' as const;
      const alerts = ['Extreme heat detected', 'High chance of rain'];

      const summary = service.generateSummary(stats, trends, classification, alerts);

      expect(summary).toContain('Alerts:');
      expect(summary).toContain('Extreme heat detected');
      expect(summary).toContain('High chance of rain');
    });
  });

  describe('Unit Tests - Full insights generation', () => {
    it('should return null for empty dataset', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      mockModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getInsights({});
      expect(result).toBeNull();
    });

    it('should generate complete insights for valid dataset', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const mockLogs = [
        {
          timestamp: new Date('2025-12-01T10:00:00Z'),
          location: { city: 'São Paulo', latitude: -23.5505, longitude: -46.6333 },
          weather: { temperature: 25, humidity: 60, windSpeed: 15, condition: 'sunny', rainProbability: 20 },
          source: 'open-meteo',
        },
        {
          timestamp: new Date('2025-12-02T10:00:00Z'),
          location: { city: 'São Paulo', latitude: -23.5505, longitude: -46.6333 },
          weather: { temperature: 28, humidity: 65, windSpeed: 12, condition: 'partly_cloudy', rainProbability: 30 },
          source: 'open-meteo',
        },
      ];

      mockModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockLogs),
        }),
      });

      const result = await service.getInsights({});

      expect(result).not.toBeNull();
      expect(result!.period.start).toEqual(new Date('2025-12-01T10:00:00Z'));
      expect(result!.period.end).toEqual(new Date('2025-12-02T10:00:00Z'));
      expect(result!.statistics.avgTemperature).toBe(26.5);
      expect(result!.classification).toBe('warm');
      expect(result!.dataPoints).toBe(2);
    });
  });
});
