import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WeatherLog, WeatherLogDocument } from './schemas/weather-log.schema';
import { QueryWeatherLogDto } from './dto/query-weather-log.dto';
import * as ExcelJS from 'exceljs';
import { createObjectCsvStringifier } from 'csv-writer';

export interface ExportData {
  timestamp: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  rainProbability: number;
  source: string;
}

@Injectable()
export class ExportService {
  constructor(
    @InjectModel(WeatherLog.name) private weatherLogModel: Model<WeatherLogDocument>,
  ) {}

  /**
   * Fetches weather logs based on query filters for export
   */
  async getLogsForExport(query: QueryWeatherLogDto): Promise<WeatherLog[]> {
    const { startDate, endDate, city, state } = query;
    
    const filter: Record<string, unknown> = {};
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        (filter.timestamp as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        (filter.timestamp as Record<string, Date>).$lte = new Date(endDate);
      }
    }
    
    if (city) {
      filter['location.city'] = { $regex: city, $options: 'i' };
    }

    if (state) {
      filter['location.state'] = { $regex: `^${state}$`, $options: 'i' };
    }

    return this.weatherLogModel
      .find(filter)
      .sort({ timestamp: -1 })
      .exec();
  }

  /**
   * Transforms weather logs into flat export data format
   */
  transformToExportData(logs: WeatherLog[]): ExportData[] {
    return logs.map(log => ({
      timestamp: log.timestamp instanceof Date 
        ? log.timestamp.toISOString() 
        : new Date(log.timestamp).toISOString(),
      city: log.location.city,
      state: log.location.state || '',
      latitude: log.location.latitude,
      longitude: log.location.longitude,
      temperature: log.weather.temperature,
      humidity: log.weather.humidity,
      windSpeed: log.weather.windSpeed,
      condition: log.weather.condition,
      rainProbability: log.weather.rainProbability,
      source: log.source,
    }));
  }


  /**
   * Generates CSV content from weather logs
   * Property 18: CSV export contains all fields
   * Validates: Requirements 5.1, 5.3
   */
  generateCsv(logs: WeatherLog[]): string {
    const exportData = this.transformToExportData(logs);
    
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'city', title: 'City' },
        { id: 'state', title: 'State' },
        { id: 'latitude', title: 'Latitude' },
        { id: 'longitude', title: 'Longitude' },
        { id: 'temperature', title: 'Temperature (°C)' },
        { id: 'humidity', title: 'Humidity (%)' },
        { id: 'windSpeed', title: 'Wind Speed (km/h)' },
        { id: 'condition', title: 'Condition' },
        { id: 'rainProbability', title: 'Rain Probability (%)' },
        { id: 'source', title: 'Source' },
      ],
    });

    const header = csvStringifier.getHeaderString();
    const records = csvStringifier.stringifyRecords(exportData);
    
    return header + records;
  }

  /**
   * Generates XLSX workbook from weather logs
   * Property 19: XLSX export contains all fields
   * Validates: Requirements 5.2, 5.3
   */
  async generateXlsx(logs: WeatherLog[]): Promise<Buffer> {
    const exportData = this.transformToExportData(logs);
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Weather Monitoring System';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Weather Logs');
    
    // Define columns with headers
    worksheet.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 25 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'State', key: 'state', width: 10 },
      { header: 'Latitude', key: 'latitude', width: 12 },
      { header: 'Longitude', key: 'longitude', width: 12 },
      { header: 'Temperature (°C)', key: 'temperature', width: 18 },
      { header: 'Humidity (%)', key: 'humidity', width: 15 },
      { header: 'Wind Speed (km/h)', key: 'windSpeed', width: 18 },
      { header: 'Condition', key: 'condition', width: 15 },
      { header: 'Rain Probability (%)', key: 'rainProbability', width: 20 },
      { header: 'Source', key: 'source', width: 15 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    exportData.forEach(data => {
      worksheet.addRow(data);
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Export weather logs to CSV format
   */
  async exportToCsv(query: QueryWeatherLogDto): Promise<string> {
    const logs = await this.getLogsForExport(query);
    return this.generateCsv(logs);
  }

  /**
   * Export weather logs to XLSX format
   */
  async exportToXlsx(query: QueryWeatherLogDto): Promise<Buffer> {
    const logs = await this.getLogsForExport(query);
    return this.generateXlsx(logs);
  }
}
