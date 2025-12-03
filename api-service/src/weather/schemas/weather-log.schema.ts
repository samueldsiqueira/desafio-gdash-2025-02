import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WeatherLogDocument = WeatherLog & Document;

@Schema({ _id: false })
export class Location {
  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;
}

@Schema({ _id: false })
export class WeatherData {
  @Prop({ required: true })
  temperature: number;

  @Prop({ required: true })
  humidity: number;

  @Prop({ required: true })
  windSpeed: number;

  @Prop({ required: true })
  condition: string;

  @Prop({ required: true })
  rainProbability: number;
}

@Schema({ timestamps: true })
export class WeatherLog {
  @Prop({ required: true })
  timestamp: Date;

  @Prop({ type: Location, required: true })
  location: Location;

  @Prop({ type: WeatherData, required: true })
  weather: WeatherData;

  @Prop({ required: true })
  source: string;
}

export const WeatherLogSchema = SchemaFactory.createForClass(WeatherLog);

// Add indexes for performance
WeatherLogSchema.index({ timestamp: -1 });
WeatherLogSchema.index({ 'location.city': 1 });
