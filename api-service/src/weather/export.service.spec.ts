import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import * as fc from 'fast-check';
import * as ExcelJS from 'exceljs';
import { ExportService, ExportData } from './export.service';
import { WeatherLog } from './schemas/weather-log.schema';

describe('ExportService', () => {
  // Helper to create a mock model
  const createMockModel = () => {
    const mockModel: any = jest.fn();
    mockModel.find = jest.fn();
    return mockModel;
  };

  const createTestModule = async (mockModel: any) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: getModelToken(WeatherLog.name),
          useValue: mockModel,
        },
      ],
    }).compile();
    return module.get<ExportService>(ExportService);
  };

  // Arbitrary for generating valid weather log data
  const weatherLogArbitrary = fc.record({
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    location: fc.record({
      city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1 && !s.includes(',') && !s.includes('"')),
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

  // Helper to load XLSX buffer (handles type compatibility)
  const loadXlsxBuffer = async (workbook: ExcelJS.Workbook, buffer: Buffer) => {
    await workbook.xlsx.load(buffer as any);
  };


  /**
   * Feature: weather-monitoring-system, Property 18: CSV export contains all fields
   * Validates: Requirements 5.1, 5.3
   * 
   * For any set of weather logs exported to CSV format, all relevant fields 
   * should be present as columns in the output file.
   */
  describe('Property 18: CSV export contains all fields', () => {
    it('should include all required fields as columns in CSV output for any weather logs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(weatherLogArbitrary, { minLength: 1, maxLength: 20 }),
          async (weatherLogs) => {
            const mockModel = createMockModel();
            const service = await createTestModule(mockModel);

            // Generate CSV from the weather logs
            const csv = service.generateCsv(weatherLogs as unknown as WeatherLog[]);

            // Parse CSV header
            const lines = csv.split('\n');
            const headerLine = lines[0];

            // Verify all required column headers are present
            expect(headerLine).toContain('Timestamp');
            expect(headerLine).toContain('City');
            expect(headerLine).toContain('Latitude');
            expect(headerLine).toContain('Longitude');
            expect(headerLine).toContain('Temperature');
            expect(headerLine).toContain('Humidity');
            expect(headerLine).toContain('Wind Speed');
            expect(headerLine).toContain('Condition');
            expect(headerLine).toContain('Rain Probability');
            expect(headerLine).toContain('Source');

            // Verify each data row has the correct number of columns
            const headerColumns = headerLine.split(',').length;
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim()) {
                // Count columns (handling potential commas in quoted strings)
                const dataColumns = lines[i].split(',').length;
                expect(dataColumns).toBe(headerColumns);
              }
            }

            // Verify the number of data rows matches the input
            const dataRows = lines.filter((line, idx) => idx > 0 && line.trim()).length;
            expect(dataRows).toBe(weatherLogs.length);
          }
        ),
        { numRuns: 100 },
      );
    }, 30000);

    it('should include all field values from each weather log in CSV output', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(weatherLogArbitrary, { minLength: 1, maxLength: 10 }),
          async (weatherLogs) => {
            const mockModel = createMockModel();
            const service = await createTestModule(mockModel);

            // Transform to export data for comparison
            const exportData = service.transformToExportData(weatherLogs as unknown as WeatherLog[]);

            // Generate CSV
            const csv = service.generateCsv(weatherLogs as unknown as WeatherLog[]);

            // Verify each record's data is present in the CSV
            for (const data of exportData) {
              expect(csv).toContain(data.city);
              expect(csv).toContain(data.condition);
              expect(csv).toContain(data.source);
              expect(csv).toContain(String(data.humidity));
              expect(csv).toContain(String(data.rainProbability));
            }
          }
        ),
        { numRuns: 100 },
      );
    }, 30000);
  });


  /**
   * Feature: weather-monitoring-system, Property 19: XLSX export contains all fields
   * Validates: Requirements 5.2, 5.3
   * 
   * For any set of weather logs exported to XLSX format, all relevant fields 
   * should be present as columns in the output file.
   */
  describe('Property 19: XLSX export contains all fields', () => {
    it('should include all required fields as columns in XLSX output for any weather logs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(weatherLogArbitrary, { minLength: 1, maxLength: 20 }),
          async (weatherLogs) => {
            const mockModel = createMockModel();
            const service = await createTestModule(mockModel);

            // Generate XLSX buffer from the weather logs
            const buffer = await service.generateXlsx(weatherLogs as unknown as WeatherLog[]);

            // Parse the XLSX buffer
            const workbook = new ExcelJS.Workbook();
            await loadXlsxBuffer(workbook, buffer);

            const worksheet = workbook.getWorksheet('Weather Logs');
            expect(worksheet).toBeDefined();

            // Get header row
            const headerRow = worksheet!.getRow(1);
            const headers: string[] = [];
            headerRow.eachCell((cell) => {
              headers.push(String(cell.value));
            });

            // Verify all required column headers are present
            expect(headers).toContain('Timestamp');
            expect(headers).toContain('City');
            expect(headers).toContain('Latitude');
            expect(headers).toContain('Longitude');
            expect(headers.some(h => h.includes('Temperature'))).toBe(true);
            expect(headers.some(h => h.includes('Humidity'))).toBe(true);
            expect(headers.some(h => h.includes('Wind Speed'))).toBe(true);
            expect(headers).toContain('Condition');
            expect(headers.some(h => h.includes('Rain Probability'))).toBe(true);
            expect(headers).toContain('Source');

            // Verify the number of data rows matches the input (header + data rows)
            expect(worksheet!.rowCount).toBe(weatherLogs.length + 1);
          }
        ),
        { numRuns: 100 },
      );
    }, 60000);

    it('should include all field values from each weather log in XLSX output', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(weatherLogArbitrary, { minLength: 1, maxLength: 10 }),
          async (weatherLogs) => {
            const mockModel = createMockModel();
            const service = await createTestModule(mockModel);

            // Transform to export data for comparison
            const exportData = service.transformToExportData(weatherLogs as unknown as WeatherLog[]);

            // Generate XLSX buffer
            const buffer = await service.generateXlsx(weatherLogs as unknown as WeatherLog[]);

            // Parse the XLSX buffer
            const workbook = new ExcelJS.Workbook();
            await loadXlsxBuffer(workbook, buffer);

            const worksheet = workbook.getWorksheet('Weather Logs');
            expect(worksheet).toBeDefined();

            // Verify each record's data is present in the worksheet
            for (let i = 0; i < exportData.length; i++) {
              const dataRow = worksheet!.getRow(i + 2); // +2 because row 1 is header
              const rowValues: (string | number | null)[] = [];
              dataRow.eachCell((cell) => {
                rowValues.push(cell.value as string | number | null);
              });

              // Check that key values are present in the row
              expect(rowValues).toContain(exportData[i].city);
              expect(rowValues).toContain(exportData[i].condition);
              expect(rowValues).toContain(exportData[i].source);
            }
          }
        ),
        { numRuns: 100 },
      );
    }, 60000);
  });


  /**
   * Unit tests for export service
   * Requirements: 5.1, 5.2, 5.3
   */
  describe('Unit Tests - CSV generation', () => {
    it('should generate valid CSV with header and data rows', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const sampleLogs = [
        {
          timestamp: new Date('2025-12-03T14:00:00Z'),
          location: { city: 'São Paulo', latitude: -23.5505, longitude: -46.6333 },
          weather: { temperature: 28, humidity: 65, windSpeed: 12, condition: 'sunny', rainProbability: 10 },
          source: 'open-meteo',
        },
        {
          timestamp: new Date('2025-12-03T13:00:00Z'),
          location: { city: 'Rio de Janeiro', latitude: -22.9068, longitude: -43.1729 },
          weather: { temperature: 32, humidity: 70, windSpeed: 8, condition: 'cloudy', rainProbability: 40 },
          source: 'openweather',
        },
      ];

      const csv = service.generateCsv(sampleLogs as unknown as WeatherLog[]);

      // Verify header
      expect(csv).toContain('Timestamp,City,Latitude,Longitude');
      
      // Verify data rows
      expect(csv).toContain('São Paulo');
      expect(csv).toContain('Rio de Janeiro');
      expect(csv).toContain('sunny');
      expect(csv).toContain('cloudy');
    });

    it('should handle empty array', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const csv = service.generateCsv([]);

      // Should still have header
      expect(csv).toContain('Timestamp');
      expect(csv).toContain('City');
      
      // Should only have header line
      const lines = csv.split('\n').filter(l => l.trim());
      expect(lines.length).toBe(1);
    });
  });

  describe('Unit Tests - XLSX generation', () => {
    it('should generate valid XLSX with header and data rows', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const sampleLogs = [
        {
          timestamp: new Date('2025-12-03T14:00:00Z'),
          location: { city: 'São Paulo', latitude: -23.5505, longitude: -46.6333 },
          weather: { temperature: 28, humidity: 65, windSpeed: 12, condition: 'sunny', rainProbability: 10 },
          source: 'open-meteo',
        },
      ];

      const buffer = await service.generateXlsx(sampleLogs as unknown as WeatherLog[]);

      // Verify it's a valid buffer
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      // Parse and verify content
      const workbook = new ExcelJS.Workbook();
      await loadXlsxBuffer(workbook, buffer);

      const worksheet = workbook.getWorksheet('Weather Logs');
      expect(worksheet).toBeDefined();
      expect(worksheet!.rowCount).toBe(2); // header + 1 data row
    });

    it('should handle empty array', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const buffer = await service.generateXlsx([]);

      // Should still generate valid XLSX
      expect(buffer).toBeInstanceOf(Buffer);

      const workbook = new ExcelJS.Workbook();
      await loadXlsxBuffer(workbook, buffer);

      const worksheet = workbook.getWorksheet('Weather Logs');
      expect(worksheet).toBeDefined();
      expect(worksheet!.rowCount).toBe(1); // only header
    });

    it('should style header row as bold', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const sampleLogs = [
        {
          timestamp: new Date('2025-12-03T14:00:00Z'),
          location: { city: 'Test City', latitude: 0, longitude: 0 },
          weather: { temperature: 25, humidity: 50, windSpeed: 10, condition: 'sunny', rainProbability: 0 },
          source: 'open-meteo',
        },
      ];

      const buffer = await service.generateXlsx(sampleLogs as unknown as WeatherLog[]);

      const workbook = new ExcelJS.Workbook();
      await loadXlsxBuffer(workbook, buffer);

      const worksheet = workbook.getWorksheet('Weather Logs');
      const headerRow = worksheet!.getRow(1);
      
      expect(headerRow.font?.bold).toBe(true);
    });
  });

  describe('Unit Tests - Data transformation', () => {
    it('should transform weather logs to flat export data format', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      const log = {
        timestamp: new Date('2025-12-03T14:00:00Z'),
        location: { city: 'São Paulo', latitude: -23.5505, longitude: -46.6333 },
        weather: { temperature: 28, humidity: 65, windSpeed: 12, condition: 'sunny', rainProbability: 10 },
        source: 'open-meteo',
      };

      const exportData = service.transformToExportData([log] as unknown as WeatherLog[]);

      expect(exportData).toHaveLength(1);
      expect(exportData[0]).toEqual({
        timestamp: '2025-12-03T14:00:00.000Z',
        city: 'São Paulo',
        latitude: -23.5505,
        longitude: -46.6333,
        temperature: 28,
        humidity: 65,
        windSpeed: 12,
        condition: 'sunny',
        rainProbability: 10,
        source: 'open-meteo',
      });
    });
  });

  describe('Unit Tests - Export with filters', () => {
    it('should fetch logs with date range filter for export', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      mockModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      await service.getLogsForExport({
        startDate: '2025-12-01T00:00:00Z',
        endDate: '2025-12-03T23:59:59Z',
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

    it('should fetch logs with city filter for export', async () => {
      const mockModel = createMockModel();
      const service = await createTestModule(mockModel);

      mockModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      await service.getLogsForExport({ city: 'São Paulo' });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'location.city': expect.objectContaining({
            $regex: 'São Paulo',
            $options: 'i',
          }),
        })
      );
    });
  });
});
