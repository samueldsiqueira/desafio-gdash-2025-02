import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WeatherService } from './weather.service';
import { InsightsService } from './insights.service';
import { WeatherController } from './weather.controller';
import { WeatherLog, WeatherLogSchema } from './schemas/weather-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WeatherLog.name, schema: WeatherLogSchema }]),
  ],
  controllers: [WeatherController],
  providers: [WeatherService, InsightsService],
  exports: [WeatherService, InsightsService],
})
export class WeatherModule {}
