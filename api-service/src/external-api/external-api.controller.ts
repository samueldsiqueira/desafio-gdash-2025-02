import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ExternalApiService } from './external-api.service';
import { QueryExternalDto } from './dto/query-external.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('External')
@ApiBearerAuth('JWT-auth')
@Controller('external')
@UseGuards(JwtAuthGuard)
export class ExternalApiController {
  constructor(private readonly externalApiService: ExternalApiService) {}

  // GET endpoint to list items with pagination (protected)
  // Requirements: 9.1, 9.2
  @Get('items')
  @ApiOperation({ 
    summary: 'List Pokémon', 
    description: 'Get a paginated list of Pokémon from PokéAPI' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of Pokémon with pagination info',
    schema: {
      type: 'object',
      properties: {
        data: { 
          type: 'array', 
          items: { 
            type: 'object',
            properties: {
              name: { type: 'string' },
              url: { type: 'string' },
            },
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: QueryExternalDto) {
    return this.externalApiService.findAll(query.page, query.limit);
  }

  // GET endpoint to get item details (protected)
  // Requirements: 9.3
  @Get('items/:id')
  @ApiOperation({ 
    summary: 'Get Pokémon details', 
    description: 'Get detailed information about a specific Pokémon' 
  })
  @ApiParam({ name: 'id', description: 'Pokémon ID or name', example: '25' })
  @ApiResponse({ 
    status: 200, 
    description: 'Pokémon details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        height: { type: 'number' },
        weight: { type: 'number' },
        types: { type: 'array', items: { type: 'object' } },
        abilities: { type: 'array', items: { type: 'object' } },
        sprites: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Pokémon not found' })
  findOne(@Param('id') id: string) {
    return this.externalApiService.findOne(id);
  }
}
