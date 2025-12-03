import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WeatherService } from './weather.service';
import { CreateWeatherLogDto } from './dto/create-weather-log.dto';
import { QueryWeatherLogDto } from './dto/query-weather-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

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
}
