import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Cloud, Droplets, Wind, Thermometer, Sun, CloudRain, Snowflake } from 'lucide-react'
import { WeatherLog } from '@/types'

export interface WeatherCardProps {
  weatherLog: WeatherLog | null
  isLoading?: boolean
}



function getConditionLabel(condition: string): string {
  switch (condition) {
    case 'sunny': return 'Ensolarado'
    case 'clear': return 'Céu Limpo'
    case 'mainly_clear': return 'Limpo'
    case 'cloudy': return 'Nublado'
    case 'partly_cloudy': return 'Parcialmente Nublado'
    case 'overcast': return 'Encoberto'
    case 'fog': return 'Neblina'
    case 'depositing_rime_fog': return 'Neblina com Geada'
    case 'rainy': return 'Chuvoso'
    case 'rain': return 'Chuva'
    case 'light_drizzle': return 'Garoa Leve'
    case 'moderate_drizzle': return 'Garoa Moderada'
    case 'dense_drizzle': return 'Garoa Intensa'
    case 'slight_rain': return 'Chuva Leve'
    case 'moderate_rain': return 'Chuva Moderada'
    case 'heavy_rain': return 'Chuva Forte'
    case 'slight_rain_showers': return 'Pancadas Leves'
    case 'moderate_rain_showers': return 'Pancadas Moderadas'
    case 'violent_rain_showers': return 'Pancadas Intensas'
    case 'snow': return 'Neve'
    case 'slight_snow': return 'Neve Leve'
    case 'moderate_snow': return 'Neve Moderada'
    case 'heavy_snow': return 'Neve Forte'
    case 'thunderstorm': return 'Tempestade'
    case 'thunderstorm_with_hail': return 'Tempestade com Granizo'
    case 'thunderstorm_with_heavy_hail': return 'Tempestade com Granizo Forte'
    default: return condition || '--'
  }
}

function getConditionIcon(condition: string): React.ReactNode {
  switch (condition) {
    case 'sunny':
    case 'clear':
      return <Sun className="h-4 w-4 text-yellow-500" />
    case 'mainly_clear':
      return <Sun className="h-4 w-4 text-yellow-400" />
    case 'cloudy':
      return <Cloud className="h-4 w-4 text-gray-500" />
    case 'partly_cloudy':
      return <Cloud className="h-4 w-4 text-gray-400" />
    case 'overcast':
      return <Cloud className="h-4 w-4 text-gray-600" />
    case 'fog':
    case 'depositing_rime_fog':
      return <Cloud className="h-4 w-4 text-gray-400" />
    case 'rainy':
    case 'rain':
    case 'moderate_rain':
    case 'moderate_drizzle':
      return <CloudRain className="h-4 w-4 text-blue-500" />
    case 'light_drizzle':
    case 'slight_rain':
    case 'slight_rain_showers':
      return <CloudRain className="h-4 w-4 text-blue-400" />
    case 'dense_drizzle':
    case 'heavy_rain':
    case 'moderate_rain_showers':
      return <CloudRain className="h-4 w-4 text-blue-600" />
    case 'violent_rain_showers':
      return <CloudRain className="h-4 w-4 text-blue-700" />
    case 'snow':
    case 'moderate_snow':
      return <Snowflake className="h-4 w-4 text-blue-200" />
    case 'slight_snow':
      return <Snowflake className="h-4 w-4 text-blue-100" />
    case 'heavy_snow':
      return <Snowflake className="h-4 w-4 text-blue-300" />
    case 'thunderstorm':
      return <CloudRain className="h-4 w-4 text-purple-500" />
    case 'thunderstorm_with_hail':
      return <CloudRain className="h-4 w-4 text-purple-600" />
    case 'thunderstorm_with_heavy_hail':
      return <CloudRain className="h-4 w-4 text-purple-700" />
    default:
      return <Cloud className="h-4 w-4 text-muted-foreground" />
  }
}

export function TemperatureCard({ weatherLog, isLoading }: WeatherCardProps) {
  return (
    <Card data-testid="temperature-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Temperatura</CardTitle>
        <Thermometer className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid="temperature-value">
          {isLoading ? '--' : weatherLog?.weather.temperature.toFixed(1) ?? '--'}°C
        </div>
        <CardDescription>
          {isLoading ? 'Carregando...' : weatherLog?.location.city ?? 'Aguardando dados...'}
        </CardDescription>
      </CardContent>
    </Card>
  )
}


export function HumidityCard({ weatherLog, isLoading }: WeatherCardProps) {
  return (
    <Card data-testid="humidity-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Umidade</CardTitle>
        <Droplets className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid="humidity-value">
          {isLoading ? '--' : weatherLog?.weather.humidity ?? '--'}%
        </div>
        <CardDescription>
          {isLoading ? 'Carregando...' : 'Umidade relativa do ar'}
        </CardDescription>
      </CardContent>
    </Card>
  )
}

export function WindCard({ weatherLog, isLoading }: WeatherCardProps) {
  return (
    <Card data-testid="wind-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Vento</CardTitle>
        <Wind className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid="wind-value">
          {isLoading ? '--' : weatherLog?.weather.windSpeed.toFixed(1) ?? '--'} km/h
        </div>
        <CardDescription>
          {isLoading ? 'Carregando...' : 'Velocidade do vento'}
        </CardDescription>
      </CardContent>
    </Card>
  )
}

export function ConditionCard({ weatherLog, isLoading }: WeatherCardProps) {
  const condition = weatherLog?.weather.condition || ''

  return (
    <Card data-testid="condition-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Condição</CardTitle>
        {isLoading ? <Cloud className="h-4 w-4 text-muted-foreground" /> : getConditionIcon(condition)}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid="condition-value">
          {isLoading ? '--' : getConditionLabel(condition)}
        </div>
        <CardDescription>
          {isLoading ? 'Carregando...' : `Chuva: ${weatherLog?.weather.rainProbability ?? '--'}%`}
        </CardDescription>
      </CardContent>
    </Card>
  )
}

export function WeatherCards({ weatherLog, isLoading }: WeatherCardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="weather-cards">
      <TemperatureCard weatherLog={weatherLog} isLoading={isLoading} />
      <HumidityCard weatherLog={weatherLog} isLoading={isLoading} />
      <WindCard weatherLog={weatherLog} isLoading={isLoading} />
      <ConditionCard weatherLog={weatherLog} isLoading={isLoading} />
    </div>
  )
}
