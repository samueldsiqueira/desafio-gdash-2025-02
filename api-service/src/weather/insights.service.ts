import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  locationName: string | null;
  statistics: InsightsStatistics;
  trends: InsightsTrends;
  classification: WeatherClassification;
  alerts: string[];
  comfortScore: number;
  summary: string;
  aiAnalysis: string | null;
  recommendations: string[];
  dataPoints: number;
}

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    @InjectModel(WeatherLog.name) private weatherLogModel: Model<WeatherLogDocument>,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.logger.log('Gemini AI initialized successfully');
    } else {
      this.logger.warn('GEMINI_API_KEY not configured - AI insights will be disabled');
    }
  }

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

    // Determina o nome da localização
    let locationName: string | null = null;
    if (query.city && query.state) {
      locationName = `${query.city}, ${query.state}`;
    } else if (query.state) {
      locationName = query.state;
    } else if (logs.length > 0 && logs[0].location) {
      const loc = logs[0].location;
      locationName = loc.state ? `${loc.city}, ${loc.state}` : loc.city;
    }

    return {
      period,
      locationName,
      statistics,
      trends,
      classification,
      alerts,
      comfortScore,
      summary,
      aiAnalysis: null,
      recommendations: [],
      dataPoints: logs.length,
    };
  }

  async generateAIInsights(query: QueryInsightsDto): Promise<{ analysis: string | null; recommendations: string[] }> {
    const filter = this.buildFilter(query);
    const logs = await this.weatherLogModel.find(filter).sort({ timestamp: 1 }).exec();

    if (logs.length === 0) {
      return { analysis: null, recommendations: [] };
    }

    const statistics = this.calculateStatistics(logs);
    const trends = this.calculateTrends(logs);

    return this.generateAIAnalysis(logs, statistics, trends);
  }

  private async generateAIAnalysis(
    logs: WeatherLog[],
    statistics: InsightsStatistics,
    trends: InsightsTrends,
  ): Promise<{ analysis: string | null; recommendations: string[] }> {
    if (!this.genAI) {
      return { analysis: null, recommendations: [] };
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const recentLogs = logs.slice(-10).map(log => ({
        timestamp: log.timestamp,
        city: log.location?.city,
        temperature: log.weather.temperature,
        humidity: log.weather.humidity,
        windSpeed: log.weather.windSpeed,
        rainProbability: log.weather.rainProbability,
      }));

      const prompt = `Você é um meteorologista especialista. Analise os seguintes dados climáticos e forneça insights úteis.

DADOS ESTATÍSTICOS:
- Temperatura média: ${statistics.avgTemperature}°C
- Temperatura máxima: ${statistics.maxTemperature}°C
- Temperatura mínima: ${statistics.minTemperature}°C
- Umidade média: ${statistics.avgHumidity}%
- Velocidade do vento média: ${statistics.avgWindSpeed} km/h
- Probabilidade média de chuva: ${statistics.avgRainProbability}%

TENDÊNCIAS:
- Temperatura: ${trends.temperatureTrend}
- Umidade: ${trends.humidityTrend}

ÚLTIMAS LEITURAS:
${JSON.stringify(recentLogs, null, 2)}

Responda em JSON com este formato exato:
{
  "analysis": "Uma análise detalhada do clima em 2-3 frases",
  "recommendations": ["recomendação 1", "recomendação 2", "recomendação 3"]
}

Forneça recomendações práticas para o dia-a-dia baseadas nos dados.`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          analysis: parsed.analysis || null,
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        };
      }

      return { analysis: response, recommendations: [] };
    } catch (error) {
      this.logger.error('Failed to generate AI analysis', error);
      return { analysis: null, recommendations: [] };
    }
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

    if (query.state) {
      filter['location.state'] = { $regex: `^${query.state}$`, $options: 'i' };
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
      alerts.push('Calor extremo detectado');
    }

    // Check for extreme cold
    if (statistics.minTemperature <= 0) {
      alerts.push('Temperaturas congelantes detectadas');
    }

    // Check for high rain probability
    const highRainLogs = logs.filter(log => log.weather.rainProbability >= 70);
    if (highRainLogs.length > 0) {
      alerts.push('Alta chance de chuva');
    }

    // Check for strong winds
    const strongWindLogs = logs.filter(log => log.weather.windSpeed >= 50);
    if (strongWindLogs.length > 0) {
      alerts.push('Ventos fortes esperados');
    }

    // Check for very high humidity
    if (statistics.avgHumidity >= 85) {
      alerts.push('Umidade muito alta');
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
      cold: 'frio',
      cool: 'fresco',
      pleasant: 'agradável',
      warm: 'quente',
      hot: 'muito quente',
    };

    const trendDescriptions: Record<TemperatureTrend, string> = {
      rising: 'em elevação',
      falling: 'em queda',
      stable: 'estável',
    };

    let summary = `O clima está ${classificationDescriptions[classification]} `;
    summary += `com temperatura média de ${statistics.avgTemperature}°C. `;
    summary += `A tendência de temperatura está ${trendDescriptions[trends.temperatureTrend]}. `;
    summary += `A umidade média é de ${statistics.avgHumidity}% `;
    summary += `com ventos de ${statistics.avgWindSpeed} km/h em média.`;

    if (alerts.length > 0) {
      summary += ` Alertas: ${alerts.join(', ')}.`;
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
