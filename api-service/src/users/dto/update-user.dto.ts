import { IsEmail, IsString, IsEnum, MinLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'User password (minimum 6 characters)',
    example: 'newpassword123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'User role',
    enum: ['admin', 'user'],
    example: 'user',
  })
  @IsEnum(['admin', 'user'])
  @IsOptional()
  role?: string;
}
