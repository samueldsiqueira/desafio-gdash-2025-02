export interface User {
  _id: string
  email: string
  name: string
  role: 'admin' | 'user'
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  user: User
}

export interface Location {
  city: string
  latitude: number
  longitude: number
}

export interface WeatherData {
  temperature: number
  humidity: number
  windSpeed: number
  condition: string
  rainProbability: number
}

export interface WeatherLog {
  _id: string
  timestamp: string
  location: Location
  weather: WeatherData
  source: string
  createdAt: string
}

export interface WeatherInsights {
  period: {
    start: string
    end: string
  }
  statistics: {
    avgTemperature: number
    avgHumidity: number
    avgWindSpeed: number
    maxTemperature: number
    minTemperature: number
  }
  trends: {
    temperatureTrend: 'rising' | 'falling' | 'stable'
    humidityTrend: 'rising' | 'falling' | 'stable'
  }
  classification: 'cold' | 'cool' | 'pleasant' | 'warm' | 'hot'
  alerts: string[]
  comfortScore: number
  summary: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
