import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PokemonListItem {
  name: string;
  url: string;
  id: number;
}

export interface PokemonDetail {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { type: { name: string } }[];
  sprites: {
    front_default: string;
    other?: {
      'official-artwork'?: {
        front_default: string;
      };
    };
  };
  stats: { base_stat: number; stat: { name: string } }[];
  abilities: { ability: { name: string }; is_hidden: boolean }[];
}

export interface PaginatedExternalResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ExternalApiService {
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('EXTERNAL_API_URL') || 'https://pokeapi.co/api/v2';
  }

  async findAll(page: number = 1, limit: number = 20): Promise<PaginatedExternalResult<PokemonListItem>> {
    const offset = (page - 1) * limit;
    
    try {
      const response = await fetch(`${this.baseUrl}/pokemon?offset=${offset}&limit=${limit}`);
      
      if (!response.ok) {
        throw new HttpException(
          `External API error: ${response.statusText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = await response.json();
      const total = data.count;
      const totalPages = Math.ceil(total / limit);

      // Extract ID from URL and add to each item
      const items: PokemonListItem[] = data.results.map((item: { name: string; url: string }) => {
        const urlParts = item.url.split('/').filter(Boolean);
        const id = parseInt(urlParts[urlParts.length - 1], 10);
        return { ...item, id };
      });

      return {
        data: items,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch data from external API',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async findOne(id: string): Promise<PokemonDetail> {
    try {
      const response = await fetch(`${this.baseUrl}/pokemon/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new HttpException('Pokemon not found', HttpStatus.NOT_FOUND);
        }
        throw new HttpException(
          `External API error: ${response.statusText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch data from external API',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
