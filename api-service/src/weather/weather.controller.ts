import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { InsightsService } from './insights.service';
import { ExportService } from './export.service';
import { CreateWeatherLogDto } from './dto/create-weather-log.dto';
import { QueryWeatherLogDto } from './dto/query-weather-log.dto';
import { QueryInsightsDto } from './dto/query-insights.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Weather')
@Controller('weather')
export class WeatherController {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly insightsService: InsightsService,
    private readonly exportService: ExportService,
  ) {}

  // POST endpoint to receive weather data from worker (internal, no auth required)
  @Post('logs')
  @ApiOperation({ 
    summary: 'Create weather log', 
    description: 'Internal endpoint to receive weather data from the Go worker. No authentication required.' 
  })
  @ApiResponse({ status: 201, description: 'Weather log created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  create(@Body() createWeatherLogDto: CreateWeatherLogDto) {
    return this.weatherService.create(createWeatherLogDto);
  }

  // GET endpoint to list weather logs with pagination and filters (protected)
  @Get('logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'List weather logs', 
    description: 'Get weather logs with optional filters and pagination' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of weather logs with pagination info',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: QueryWeatherLogDto) {
    return this.weatherService.findAll(query);
  }

  // GET endpoint to get a single weather log by ID (protected)
  @Get('logs/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get weather log', description: 'Get a single weather log by ID' })
  @ApiParam({ name: 'id', description: 'Weather log ID' })
  @ApiResponse({ status: 200, description: 'Weather log found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Weather log not found' })
  findOne(@Param('id') id: string) {
    return this.weatherService.findOne(id);
  }

  // GET endpoint to retrieve AI insights for a time period (protected)
  @Get('insights')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get AI insights', 
    description: 'Generate AI insights from historical weather data including statistics, trends, classification, and alerts' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'AI insights generated successfully',
    schema: {
      type: 'object',
      properties: {
        period: { 
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' },
          },
        },
        statistics: {
          type: 'object',
          properties: {
            avgTemperature: { type: 'number' },
            avgHumidity: { type: 'number' },
            avgWindSpeed: { type: 'number' },
            maxTemperature: { type: 'number' },
            minTemperature: { type: 'number' },
          },
        },
        trends: {
          type: 'object',
          properties: {
            temperatureTrend: { type: 'string', enum: ['rising', 'falling', 'stable'] },
            humidityTrend: { type: 'string', enum: ['rising', 'falling', 'stable'] },
          },
        },
        classification: { type: 'string', enum: ['cold', 'cool', 'pleasant', 'warm', 'hot'] },
        alerts: { type: 'array', items: { type: 'string' } },
        comfortScore: { type: 'number', minimum: 0, maximum: 100 },
        summary: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getInsights(@Query() query: QueryInsightsDto) {
    return this.insightsService.getInsights(query);
  }

  // GET endpoint for CSV export (protected)
  // Requirements: 5.1, 5.3
  @Get('export/csv')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Header('Content-Type', 'text/csv')
  @ApiOperation({ summary: 'Export to CSV', description: 'Export weather logs to CSV format' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportCsv(
    @Query() query: QueryWeatherLogDto,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.exportService.exportToCsv(query);
    const filename = `weather-logs-${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // GET endpoint for XLSX export (protected)
  // Requirements: 5.2, 5.3
  @Get('export/xlsx')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiOperation({ summary: 'Export to XLSX', description: 'Export weather logs to Excel format' })
  @ApiResponse({ status: 200, description: 'XLSX file download' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportXlsx(
    @Query() query: QueryWeatherLogDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.exportService.exportToXlsx(query);
    const filename = `weather-logs-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
