import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WeatherService } from './weather.service';
import { InsightsService } from './insights.service';
import { ExportService } from './export.service';
import { RealtimeService } from './realtime.service';
import { WeatherController } from './weather.controller';
import { WeatherLog, WeatherLogSchema } from './schemas/weather-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WeatherLog.name, schema: WeatherLogSchema }]),
  ],
  controllers: [WeatherController],
  providers: [WeatherService, InsightsService, ExportService, RealtimeService],
  exports: [WeatherService, InsightsService, ExportService, RealtimeService],
})
export class WeatherModule {}
