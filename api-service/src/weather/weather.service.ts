import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WeatherLog, WeatherLogDocument } from './schemas/weather-log.schema';
import { CreateWeatherLogDto } from './dto/create-weather-log.dto';
import { QueryWeatherLogDto } from './dto/query-weather-log.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class WeatherService {
  constructor(
    @InjectModel(WeatherLog.name) private weatherLogModel: Model<WeatherLogDocument>,
  ) {}

  async create(createWeatherLogDto: CreateWeatherLogDto): Promise<WeatherLog> {
    const createdLog = new this.weatherLogModel({
      ...createWeatherLogDto,
      timestamp: new Date(createWeatherLogDto.timestamp),
    });
    return createdLog.save();
  }

  async findAll(query: QueryWeatherLogDto): Promise<PaginatedResult<WeatherLog>> {
    const { startDate, endDate, city, state, page = 1, limit = 10 } = query;
    
    const filter: Record<string, unknown> = {};
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        (filter.timestamp as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        (filter.timestamp as Record<string, Date>).$lte = new Date(endDate);
      }
    }
    
    if (city) {
      filter['location.city'] = { $regex: city, $options: 'i' };
    }

    if (state) {
      filter['location.state'] = { $regex: `^${state}$`, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.weatherLogModel
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.weatherLogModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<WeatherLog | null> {
    return this.weatherLogModel.findById(id).exec();
  }
}
