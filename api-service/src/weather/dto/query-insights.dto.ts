import { IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryInsightsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => value?.trim())
  city?: string;
}
