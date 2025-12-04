import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FetchRealtimeDto {
  @ApiProperty({ description: 'City name', example: 'São Paulo' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'State code (2 letters)', example: 'SP' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  state: string;
}
