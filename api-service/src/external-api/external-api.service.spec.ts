import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fc from 'fast-check';
import { ExternalApiService } from './external-api.service';

describe('ExternalApiService', () => {
  let service: ExternalApiService;
  let originalFetch: typeof global.fetch;

  const createTestModule = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalApiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('https://pokeapi.co/api/v2'),
          },
        },
      ],
    }).compile();
    return module.get<ExternalApiService>(ExternalApiService);
  };

  beforeEach(async () => {
    service = await createTestModule();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // Helper to create mock Pokemon list response
  const createMockListResponse = (page: number, limit: number, totalCount: number) => {
    const offset = (page - 1) * limit;
    const results = [];
    const actualCount = Math.min(limit, Math.max(0, totalCount - offset));
    
    for (let i = 0; i < actualCount; i++) {
      const id = offset + i + 1;
      results.push({
        name: `pokemon-${id}`,
        url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
      });
    }
    
    return {
      count: totalCount,
      next: offset + limit < totalCount ? `https://pokeapi.co/api/v2/pokemon?offset=${offset + limit}&limit=${limit}` : null,
      previous: offset > 0 ? `https://pokeapi.co/api/v2/pokemon?offset=${Math.max(0, offset - limit)}&limit=${limit}` : null,
      results,
    };
  };

  /**
   * Feature: weather-monitoring-system, Property 25: Paginated results respect page boundaries
   * Validates: Requirements 9.2
   * 
   * For any paginated API request (optional external API feature), the returned results 
   * should contain exactly the requested page size (or fewer on the last page) and 
   * correct pagination metadata.
   */
  describe('Property 25: Paginated results respect page boundaries', () => {
    it('should return exactly the requested page size or fewer on last page', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }),  // page
          fc.integer({ min: 1, max: 100 }), // limit
          fc.integer({ min: 0, max: 1500 }), // totalCount (PokéAPI has ~1300 Pokemon)
          async (page, limit, totalCount) => {
            // Mock fetch to return controlled data
            const mockResponse = createMockListResponse(page, limit, totalCount);
            global.fetch = jest.fn().mockResolvedValue({
              ok: true,
              json: jest.fn().mockResolvedValue(mockResponse),
            });

            const result = await service.findAll(page, limit);

            // Calculate expected values
            const offset = (page - 1) * limit;
            const expectedItemsOnPage = Math.min(limit, Math.max(0, totalCount - offset));
            const expectedTotalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 0;

            // Property 1: Data length should be exactly the expected count
            expect(result.data.length).toBe(expectedItemsOnPage);

            // Property 2: Data length should never exceed the limit
            expect(result.data.length).toBeLessThanOrEqual(limit);

            // Property 3: Total should match the mock total count
            expect(result.total).toBe(totalCount);

            // Property 4: Page should match the requested page
            expect(result.page).toBe(page);

            // Property 5: Limit should match the requested limit
            expect(result.limit).toBe(limit);

            // Property 6: Total pages should be correctly calculated
            expect(result.totalPages).toBe(expectedTotalPages);

            // Property 7: Each item should have an id extracted from URL
            result.data.forEach((item) => {
              expect(typeof item.id).toBe('number');
              expect(item.id).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 },
      );
    }, 30000);

    it('should return empty data array when page exceeds total pages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // limit
          fc.integer({ min: 1, max: 500 }), // totalCount
          async (limit, totalCount) => {
            const totalPages = Math.ceil(totalCount / limit);
            const pageExceedingTotal = totalPages + 1;

            const mockResponse = createMockListResponse(pageExceedingTotal, limit, totalCount);
            global.fetch = jest.fn().mockResolvedValue({
              ok: true,
              json: jest.fn().mockResolvedValue(mockResponse),
            });

            const result = await service.findAll(pageExceedingTotal, limit);

            // When page exceeds total pages, data should be empty
            expect(result.data.length).toBe(0);
            expect(result.total).toBe(totalCount);
          }
        ),
        { numRuns: 100 },
      );
    }, 30000);
  });

  /**
   * Unit tests for external API service
   * Requirements: 9.1, 9.2, 9.3
   */
  describe('Unit Tests - API client with mocked responses', () => {
    it('should fetch list of items successfully', async () => {
      const mockResponse = createMockListResponse(1, 20, 100);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.findAll(1, 20);

      expect(result.data).toHaveLength(20);
      expect(result.total).toBe(100);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(5);
    });

    it('should extract ID from URL for each item', async () => {
      const mockResponse = {
        count: 3,
        results: [
          { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
          { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
          { name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon/3/' },
        ],
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.findAll(1, 20);

      expect(result.data[0].id).toBe(1);
      expect(result.data[1].id).toBe(2);
      expect(result.data[2].id).toBe(3);
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(service.findAll(1, 20)).rejects.toThrow('External API error');
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.findAll(1, 20)).rejects.toThrow('Failed to fetch data from external API');
    });
  });

  describe('Unit Tests - Pagination logic', () => {
    it('should calculate correct offset for different pages', async () => {
      const mockResponse = createMockListResponse(3, 20, 100);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await service.findAll(3, 20);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=40&limit=20')
      );
    });

    it('should use default values when not provided', async () => {
      const mockResponse = createMockListResponse(1, 20, 100);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.findAll();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('Unit Tests - Detail fetching', () => {
    it('should fetch item details successfully', async () => {
      const mockPokemon = {
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        types: [{ type: { name: 'electric' } }],
        sprites: { front_default: 'https://example.com/pikachu.png' },
        stats: [{ base_stat: 35, stat: { name: 'hp' } }],
        abilities: [{ ability: { name: 'static' }, is_hidden: false }],
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPokemon),
      });

      const result = await service.findOne('25');

      expect(result.id).toBe(25);
      expect(result.name).toBe('pikachu');
      expect(result.types[0].type.name).toBe('electric');
    });

    it('should handle 404 for non-existent item', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(service.findOne('99999')).rejects.toThrow('Pokemon not found');
    });

    it('should handle API errors when fetching details', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.findOne('1')).rejects.toThrow('External API error');
    });
  });
});
