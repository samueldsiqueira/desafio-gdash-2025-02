import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsDateString,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class WeatherDataDto {
  @IsNumber()
  temperature: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  humidity: number;

  @IsNumber()
  @Min(0)
  windSpeed: number;

  @IsString()
  @IsNotEmpty()
  condition: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  rainProbability: number;
}

export class CreateWeatherLogDto {
  @IsDateString()
  @IsNotEmpty()
  timestamp: string;

  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty()
  location: LocationDto;

  @ValidateNested()
  @Type(() => WeatherDataDto)
  @IsNotEmpty()
  weather: WeatherDataDto;

  @IsString()
  @IsNotEmpty()
  source: string;
}
