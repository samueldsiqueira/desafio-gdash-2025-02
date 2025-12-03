import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Cloud, Droplets, Wind, Thermometer, Sun, CloudRain, Snowflake } from 'lucide-react'
import { WeatherLog } from '@/types'

export interface WeatherCardProps {
  weatherLog: WeatherLog | null
  isLoading?: boolean
}

const conditionIcons: Record<string, React.ReactNode> = {
  sunny: <Sun className="h-4 w-4 text-yellow-500" />,
  clear: <Sun className="h-4 w-4 text-yellow-500" />,
  cloudy: <Cloud className="h-4 w-4 text-gray-500" />,
  partly_cloudy: <Cloud className="h-4 w-4 text-gray-400" />,
  rainy: <CloudRain className="h-4 w-4 text-blue-500" />,
  rain: <CloudRain className="h-4 w-4 text-blue-500" />,
  snow: <Snowflake className="h-4 w-4 text-blue-200" />,
}

const conditionLabels: Record<string, string> = {
  sunny: 'Ensolarado',
  clear: 'Limpo',
  cloudy: 'Nublado',
  partly_cloudy: 'Parcialmente Nublado',
  rainy: 'Chuvoso',
  rain: 'Chuva',
  snow: 'Neve',
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
  const icon = conditionIcons[condition] || <Cloud className="h-4 w-4 text-muted-foreground" />
  const label = conditionLabels[condition] || condition || '--'

  return (
    <Card data-testid="condition-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Condição</CardTitle>
        {isLoading ? <Cloud className="h-4 w-4 text-muted-foreground" /> : icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid="condition-value">
          {isLoading ? '--' : label}
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
