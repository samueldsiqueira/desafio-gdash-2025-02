import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WeatherLog, WeatherLogDocument } from './schemas/weather-log.schema';
import { QueryInsightsDto } from './dto/query-insights.dto';

export type TemperatureTrend = 'rising' | 'falling' | 'stable';
export type HumidityTrend = 'rising' | 'falling' | 'stable';
export type WeatherClassification = 'cold' | 'cool' | 'pleasant' | 'warm' | 'hot';

export interface InsightsStatistics {
  avgTemperature: number;
  avgHumidity: number;
  avgWindSpeed: number;
  maxTemperature: number;
  minTemperature: number;
  avgRainProbability: number;
}

export interface InsightsTrends {
  temperatureTrend: TemperatureTrend;
  humidityTrend: HumidityTrend;
}

export interface AIInsights {
  period: {
    start: Date;
    end: Date;
  };
  statistics: InsightsStatistics;
  trends: InsightsTrends;
  classification: WeatherClassification;
  alerts: string[];
  comfortScore: number;
  summary: string;
  dataPoints: number;
}

@Injectable()
export class InsightsService {
  constructor(
    @InjectModel(WeatherLog.name) private weatherLogModel: Model<WeatherLogDocument>,
  ) {}

  async getInsights(query: QueryInsightsDto): Promise<AIInsights | null> {
    const filter = this.buildFilter(query);
    const logs = await this.weatherLogModel.find(filter).sort({ timestamp: 1 }).exec();

    if (logs.length === 0) {
      return null;
    }

    const statistics = this.calculateStatistics(logs);
    const trends = this.calculateTrends(logs);
    const classification = this.classifyWeather(statistics.avgTemperature);
    const alerts = this.generateAlerts(logs, statistics);
    const comfortScore = this.calculateComfortScore(statistics);
    const summary = this.generateSummary(statistics, trends, classification, alerts);

    const timestamps = logs.map(log => new Date(log.timestamp).getTime());
    const period = {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps)),
    };

    return {
      period,
      statistics,
      trends,
      classification,
      alerts,
      comfortScore,
      summary,
      dataPoints: logs.length,
    };
  }

  private buildFilter(query: QueryInsightsDto): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (query.startDate || query.endDate) {
      filter.timestamp = {};
      if (query.startDate) {
        (filter.timestamp as Record<string, Date>).$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (filter.timestamp as Record<string, Date>).$lte = new Date(query.endDate);
      }
    }

    if (query.city) {
      filter['location.city'] = { $regex: query.city, $options: 'i' };
    }

    return filter;
  }

  calculateStatistics(logs: WeatherLog[]): InsightsStatistics {
    if (logs.length === 0) {
      return {
        avgTemperature: 0,
        avgHumidity: 0,
        avgWindSpeed: 0,
        maxTemperature: 0,
        minTemperature: 0,
        avgRainProbability: 0,
      };
    }

    const temperatures = logs.map(log => log.weather.temperature);
    const humidities = logs.map(log => log.weather.humidity);
    const windSpeeds = logs.map(log => log.weather.windSpeed);
    const rainProbabilities = logs.map(log => log.weather.rainProbability);

    return {
      avgTemperature: this.roundToTwo(this.average(temperatures)),
      avgHumidity: this.roundToTwo(this.average(humidities)),
      avgWindSpeed: this.roundToTwo(this.average(windSpeeds)),
      maxTemperature: Math.max(...temperatures),
      minTemperature: Math.min(...temperatures),
      avgRainProbability: this.roundToTwo(this.average(rainProbabilities)),
    };
  }

  calculateTrends(logs: WeatherLog[]): InsightsTrends {
    if (logs.length < 2) {
      return {
        temperatureTrend: 'stable',
        humidityTrend: 'stable',
      };
    }

    // Split logs into first half and second half for trend analysis
    const midpoint = Math.floor(logs.length / 2);
    const firstHalf = logs.slice(0, midpoint);
    const secondHalf = logs.slice(midpoint);

    const firstHalfAvgTemp = this.average(firstHalf.map(l => l.weather.temperature));
    const secondHalfAvgTemp = this.average(secondHalf.map(l => l.weather.temperature));

    const firstHalfAvgHumidity = this.average(firstHalf.map(l => l.weather.humidity));
    const secondHalfAvgHumidity = this.average(secondHalf.map(l => l.weather.humidity));

    // Threshold for considering a change significant (2 degrees for temp, 5% for humidity)
    const tempThreshold = 2;
    const humidityThreshold = 5;

    const tempDiff = secondHalfAvgTemp - firstHalfAvgTemp;
    const humidityDiff = secondHalfAvgHumidity - firstHalfAvgHumidity;

    return {
      temperatureTrend: this.determineTrend(tempDiff, tempThreshold),
      humidityTrend: this.determineTrend(humidityDiff, humidityThreshold),
    };
  }

  classifyWeather(avgTemperature: number): WeatherClassification {
    if (avgTemperature < 10) return 'cold';
    if (avgTemperature < 18) return 'cool';
    if (avgTemperature < 25) return 'pleasant';
    if (avgTemperature < 32) return 'warm';
    return 'hot';
  }

  generateAlerts(logs: WeatherLog[], statistics: InsightsStatistics): string[] {
    const alerts: string[] = [];

    // Check for extreme heat
    if (statistics.maxTemperature >= 35) {
      alerts.push('Extreme heat detected');
    }

    // Check for extreme cold
    if (statistics.minTemperature <= 0) {
      alerts.push('Freezing temperatures detected');
    }

    // Check for high rain probability
    const highRainLogs = logs.filter(log => log.weather.rainProbability >= 70);
    if (highRainLogs.length > 0) {
      alerts.push('High chance of rain');
    }

    // Check for strong winds
    const strongWindLogs = logs.filter(log => log.weather.windSpeed >= 50);
    if (strongWindLogs.length > 0) {
      alerts.push('Strong winds expected');
    }

    // Check for very high humidity
    if (statistics.avgHumidity >= 85) {
      alerts.push('Very high humidity');
    }

    return alerts;
  }

  calculateComfortScore(statistics: InsightsStatistics): number {
    // Comfort score based on temperature, humidity, and wind
    // Ideal: temperature 20-24°C, humidity 40-60%, wind < 20 km/h
    
    let score = 100;

    // Temperature penalty (ideal: 22°C)
    const tempDiff = Math.abs(statistics.avgTemperature - 22);
    score -= Math.min(tempDiff * 3, 40); // Max 40 points penalty

    // Humidity penalty (ideal: 50%)
    const humidityDiff = Math.abs(statistics.avgHumidity - 50);
    score -= Math.min(humidityDiff * 0.5, 25); // Max 25 points penalty

    // Wind penalty (ideal: < 10 km/h)
    if (statistics.avgWindSpeed > 10) {
      score -= Math.min((statistics.avgWindSpeed - 10) * 1.5, 25); // Max 25 points penalty
    }

    // Rain probability penalty
    score -= Math.min(statistics.avgRainProbability * 0.1, 10); // Max 10 points penalty

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  generateSummary(
    statistics: InsightsStatistics,
    trends: InsightsTrends,
    classification: WeatherClassification,
    alerts: string[],
  ): string {
    const classificationDescriptions: Record<WeatherClassification, string> = {
      cold: 'cold',
      cool: 'cool',
      pleasant: 'pleasant',
      warm: 'warm',
      hot: 'hot',
    };

    const trendDescriptions: Record<TemperatureTrend, string> = {
      rising: 'increasing',
      falling: 'decreasing',
      stable: 'stable',
    };

    let summary = `Weather conditions are ${classificationDescriptions[classification]} `;
    summary += `with an average temperature of ${statistics.avgTemperature}°C. `;
    summary += `Temperature trend is ${trendDescriptions[trends.temperatureTrend]}. `;
    summary += `Average humidity is ${statistics.avgHumidity}% `;
    summary += `with wind speeds averaging ${statistics.avgWindSpeed} km/h.`;

    if (alerts.length > 0) {
      summary += ` Alerts: ${alerts.join(', ')}.`;
    }

    return summary;
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private determineTrend(diff: number, threshold: number): 'rising' | 'falling' | 'stable' {
    if (diff > threshold) return 'rising';
    if (diff < -threshold) return 'falling';
    return 'stable';
  }
}
