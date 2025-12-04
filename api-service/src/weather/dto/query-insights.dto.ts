import { IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryInsightsDto {
  @ApiPropertyOptional({ description: 'Start date for insights period', example: '2025-12-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for insights period', example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by city name', example: 'São Paulo' })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  city?: string;

  @ApiPropertyOptional({ description: 'Filter by state code', example: 'SP' })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  state?: string;
}
