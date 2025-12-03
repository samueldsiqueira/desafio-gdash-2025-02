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
import { WeatherService } from './weather.service';
import { InsightsService } from './insights.service';
import { ExportService } from './export.service';
import { CreateWeatherLogDto } from './dto/create-weather-log.dto';
import { QueryWeatherLogDto } from './dto/query-weather-log.dto';
import { QueryInsightsDto } from './dto/query-insights.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('weather')
export class WeatherController {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly insightsService: InsightsService,
    private readonly exportService: ExportService,
  ) {}

  // POST endpoint to receive weather data from worker (internal, no auth required)
  @Post('logs')
  create(@Body() createWeatherLogDto: CreateWeatherLogDto) {
    return this.weatherService.create(createWeatherLogDto);
  }

  // GET endpoint to list weather logs with pagination and filters (protected)
  @Get('logs')
  @UseGuards(JwtAuthGuard)
  findAll(@Query() query: QueryWeatherLogDto) {
    return this.weatherService.findAll(query);
  }

  // GET endpoint to get a single weather log by ID (protected)
  @Get('logs/:id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.weatherService.findOne(id);
  }

  // GET endpoint to retrieve AI insights for a time period (protected)
  @Get('insights')
  @UseGuards(JwtAuthGuard)
  getInsights(@Query() query: QueryInsightsDto) {
    return this.insightsService.getInsights(query);
  }

  // GET endpoint for CSV export (protected)
  // Requirements: 5.1, 5.3
  @Get('export/csv')
  @UseGuards(JwtAuthGuard)
  @Header('Content-Type', 'text/csv')
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
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
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
