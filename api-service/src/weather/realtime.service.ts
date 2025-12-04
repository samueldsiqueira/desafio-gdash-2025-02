import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WeatherLog, WeatherLogDocument } from './schemas/weather-log.schema';

interface IBGECity {
  id: number;
  nome: string;
  microrregiao: {
    mesorregiao: {
      UF: {
        sigla: string;
      };
    };
  };
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    precipitation_probability?: number;
  };
  latitude: number;
  longitude: number;
}

// Cache para coordenadas de cidades (evita chamadas repetidas ao Nominatim)
const coordinatesCache = new Map<string, { latitude: number; longitude: number; cityName: string }>();

// Cache para municípios por estado (evita chamadas repetidas ao IBGE)
const ibgeCitiesCache = new Map<string, IBGECity[]>();

const WEATHER_CODE_MAP: Record<number, string> = {
  0: 'clear',
  1: 'mainly_clear',
  2: 'partly_cloudy',
  3: 'overcast',
  45: 'fog',
  48: 'depositing_rime_fog',
  51: 'light_drizzle',
  53: 'moderate_drizzle',
  55: 'dense_drizzle',
  61: 'slight_rain',
  63: 'moderate_rain',
  65: 'heavy_rain',
  71: 'slight_snow',
  73: 'moderate_snow',
  75: 'heavy_snow',
  80: 'slight_rain_showers',
  81: 'moderate_rain_showers',
  82: 'violent_rain_showers',
  95: 'thunderstorm',
  96: 'thunderstorm_with_hail',
  99: 'thunderstorm_with_heavy_hail',
};

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(
    @InjectModel(WeatherLog.name) private weatherLogModel: Model<WeatherLogDocument>,
  ) {}

  async fetchWeatherByCity(city: string, state: string): Promise<WeatherLog> {
    // 1. Get city coordinates from IBGE
    const coordinates = await this.getCityCoordinates(city, state);
    
    // 2. Fetch weather from Open-Meteo
    const weatherData = await this.fetchOpenMeteoWeather(coordinates.latitude, coordinates.longitude);
    
    // 3. Create and save weather log
    const weatherLog = new this.weatherLogModel({
      timestamp: new Date(),
      location: {
        city: coordinates.cityName,
        state: state.toUpperCase(),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
      weather: {
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        windSpeed: weatherData.windSpeed,
        condition: weatherData.condition,
        rainProbability: weatherData.rainProbability,
      },
      source: 'open-meteo-realtime',
    });

    return weatherLog.save();
  }

  private async getCityCoordinates(city: string, state: string): Promise<{
    latitude: number;
    longitude: number;
    cityName: string;
  }> {
    const cacheKey = `${state.toUpperCase()}-${city.toLowerCase()}`;
    
    // Verifica cache primeiro
    if (coordinatesCache.has(cacheKey)) {
      return coordinatesCache.get(cacheKey)!;
    }

    try {
      // Verifica cache de municípios do IBGE
      let cities: IBGECity[];
      const stateUpper = state.toUpperCase();
      
      if (ibgeCitiesCache.has(stateUpper)) {
        cities = ibgeCitiesCache.get(stateUpper)!;
      } else {
        // Search for city in IBGE API
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state}/municipios`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new HttpException('Failed to fetch city data from IBGE', HttpStatus.BAD_GATEWAY);
        }

        cities = await response.json();
        ibgeCitiesCache.set(stateUpper, cities);
      }
      
      // Find the city (case-insensitive)
      const foundCity = cities.find(
        c => c.nome.toLowerCase() === city.toLowerCase()
      );

      if (!foundCity) {
        throw new HttpException(`City "${city}" not found in state "${state}"`, HttpStatus.NOT_FOUND);
      }

      // Get coordinates using Nominatim (OpenStreetMap) com timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const nominatimResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(foundCity.nome)}&state=${encodeURIComponent(state)}&country=Brazil&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'WeatherMonitoringSystem/1.0',
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!nominatimResponse.ok) {
        throw new HttpException('Failed to fetch coordinates', HttpStatus.BAD_GATEWAY);
      }

      const nominatimData = await nominatimResponse.json();

      let result: { latitude: number; longitude: number; cityName: string };

      if (!nominatimData || nominatimData.length === 0) {
        // Fallback: use approximate coordinates based on state capital
        const stateCoordinates = this.getStateCapitalCoordinates(state);
        result = {
          latitude: stateCoordinates.latitude,
          longitude: stateCoordinates.longitude,
          cityName: foundCity.nome,
        };
      } else {
        result = {
          latitude: parseFloat(nominatimData[0].lat),
          longitude: parseFloat(nominatimData[0].lon),
          cityName: foundCity.nome,
        };
      }

      // Salva no cache
      coordinatesCache.set(cacheKey, result);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // Se timeout, usa coordenadas da capital como fallback
      if (error.name === 'AbortError') {
        this.logger.warn(`Timeout fetching coordinates for ${city}, ${state}. Using state capital.`);
        const stateCoordinates = this.getStateCapitalCoordinates(state);
        const result = {
          latitude: stateCoordinates.latitude,
          longitude: stateCoordinates.longitude,
          cityName: city,
        };
        coordinatesCache.set(cacheKey, result);
        return result;
      }
      this.logger.error('Error fetching city coordinates:', error);
      throw new HttpException('Failed to get city coordinates', HttpStatus.BAD_GATEWAY);
    }
  }

  private async fetchOpenMeteoWeather(latitude: number, longitude: number): Promise<{
    temperature: number;
    humidity: number;
    windSpeed: number;
    condition: string;
    rainProbability: number;
  }> {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation_probability&timezone=America/Sao_Paulo`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new HttpException('Failed to fetch weather data', HttpStatus.BAD_GATEWAY);
      }

      const data: OpenMeteoResponse = await response.json();

      return {
        temperature: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        condition: WEATHER_CODE_MAP[data.current.weather_code] || 'unknown',
        rainProbability: data.current.precipitation_probability || 0,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error fetching weather from Open-Meteo:', error);
      throw new HttpException('Failed to fetch weather data', HttpStatus.BAD_GATEWAY);
    }
  }

  private getStateCapitalCoordinates(state: string): { latitude: number; longitude: number } {
    const capitals: Record<string, { latitude: number; longitude: number }> = {
      AC: { latitude: -9.9754, longitude: -67.8249 },
      AL: { latitude: -9.6658, longitude: -35.735 },
      AP: { latitude: 0.035, longitude: -51.0694 },
      AM: { latitude: -3.119, longitude: -60.0217 },
      BA: { latitude: -12.9714, longitude: -38.5014 },
      CE: { latitude: -3.7172, longitude: -38.5433 },
      DF: { latitude: -15.7942, longitude: -47.8822 },
      ES: { latitude: -20.3155, longitude: -40.3128 },
      GO: { latitude: -16.6869, longitude: -49.2648 },
      MA: { latitude: -2.5297, longitude: -44.3028 },
      MT: { latitude: -15.601, longitude: -56.0974 },
      MS: { latitude: -20.4697, longitude: -54.6201 },
      MG: { latitude: -19.9167, longitude: -43.9345 },
      PA: { latitude: -1.4558, longitude: -48.4902 },
      PB: { latitude: -7.1195, longitude: -34.845 },
      PR: { latitude: -25.4284, longitude: -49.2733 },
      PE: { latitude: -8.0476, longitude: -34.877 },
      PI: { latitude: -5.0892, longitude: -42.8019 },
      RJ: { latitude: -22.9068, longitude: -43.1729 },
      RN: { latitude: -5.7945, longitude: -35.211 },
      RS: { latitude: -30.0346, longitude: -51.2177 },
      RO: { latitude: -8.7612, longitude: -63.9004 },
      RR: { latitude: 2.8235, longitude: -60.6758 },
      SC: { latitude: -27.5954, longitude: -48.548 },
      SP: { latitude: -23.5505, longitude: -46.6333 },
      SE: { latitude: -10.9472, longitude: -37.0731 },
      TO: { latitude: -10.1689, longitude: -48.3317 },
    };

    return capitals[state.toUpperCase()] || { latitude: -15.7942, longitude: -47.8822 }; // Default to Brasília
  }
}
