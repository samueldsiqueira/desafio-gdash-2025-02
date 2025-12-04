import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsDateString,
  ValidateNested,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocationDto {
  @ApiProperty({ description: 'City name', example: 'São Paulo' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ description: 'State code', example: 'SP' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ description: 'Latitude coordinate', example: -23.5505, minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate', example: -46.6333, minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class WeatherDataDto {
  @ApiProperty({ description: 'Temperature in Celsius', example: 28.5 })
  @IsNumber()
  temperature: number;

  @ApiProperty({ description: 'Humidity percentage', example: 65, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity: number;

  @ApiProperty({ description: 'Wind speed in km/h', example: 12.3, minimum: 0 })
  @IsNumber()
  @Min(0)
  windSpeed: number;

  @ApiProperty({ description: 'Weather condition', example: 'partly_cloudy' })
  @IsString()
  @IsNotEmpty()
  condition: string;

  @ApiProperty({ description: 'Rain probability percentage', example: 30, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  rainProbability: number;
}

export class CreateWeatherLogDto {
  @ApiProperty({ description: 'Timestamp of the weather reading', example: '2025-12-03T14:30:00Z' })
  @IsDateString()
  @IsNotEmpty()
  timestamp: string;

  @ApiProperty({ description: 'Location information', type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty()
  location: LocationDto;

  @ApiProperty({ description: 'Weather data', type: WeatherDataDto })
  @ValidateNested()
  @Type(() => WeatherDataDto)
  @IsNotEmpty()
  weather: WeatherDataDto;

  @ApiProperty({ description: 'Data source', example: 'open-meteo' })
  @IsString()
  @IsNotEmpty()
  source: string;
}
