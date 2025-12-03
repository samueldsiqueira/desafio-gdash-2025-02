import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WeatherLog } from '@/types'

export interface WeatherChartProps {
  logs: WeatherLog[]
  isLoading?: boolean
}

interface ChartDataPoint {
  time: string
  temperature: number
  rainProbability: number
}

function formatChartData(logs: WeatherLog[]): ChartDataPoint[] {
  return logs
    .slice()
    .reverse()
    .map((log) => ({
      time: new Date(log.timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      temperature: log.weather.temperature,
      rainProbability: log.weather.rainProbability,
    }))
}

function SimpleLineChart({ data, dataKey, color, label }: {
  data: ChartDataPoint[]
  dataKey: 'temperature' | 'rainProbability'
  color: string
  label: string
}) {
  if (data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
        Sem dados para exibir
      </div>
    )
  }

  const values = data.map((d) => d[dataKey])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const width = 100
  const height = 200
  const padding = 40

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding)
    const y = height - padding - ((d[dataKey] - min) / range) * (height - 2 * padding)
    return `${x}%,${y}`
  })

  return (
    <div className="relative h-[200px]" data-testid={`chart-${dataKey}`}>
      <svg viewBox={`0 0 100 ${height}`} className="w-full h-full" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points.join(' ')}
          vectorEffect="non-scaling-stroke"
        />
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding)
          const y = height - padding - ((d[dataKey] - min) / range) * (height - 2 * padding)
          return (
            <circle
              key={i}
              cx={`${x}%`}
              cy={y}
              r="3"
              fill={color}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground px-2">
        {data.length > 0 && <span>{data[0].time}</span>}
        {data.length > 1 && <span>{data[data.length - 1].time}</span>}
      </div>
      <div className="absolute top-0 left-0 text-xs text-muted-foreground">
        {label}: {max.toFixed(1)}
      </div>
      <div className="absolute bottom-6 left-0 text-xs text-muted-foreground">
        {min.toFixed(1)}
      </div>
    </div>
  )
}


export function TemperatureChart({ logs, isLoading }: WeatherChartProps) {
  const chartData = formatChartData(logs)

  return (
    <Card data-testid="temperature-chart-card">
      <CardHeader>
        <CardTitle>Histórico de Temperatura</CardTitle>
        <CardDescription>Variação de temperatura ao longo do tempo</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <SimpleLineChart
            data={chartData}
            dataKey="temperature"
            color="#ef4444"
            label="°C"
          />
        )}
      </CardContent>
    </Card>
  )
}

export function RainProbabilityChart({ logs, isLoading }: WeatherChartProps) {
  const chartData = formatChartData(logs)

  return (
    <Card data-testid="rain-chart-card">
      <CardHeader>
        <CardTitle>Probabilidade de Chuva</CardTitle>
        <CardDescription>Chance de precipitação ao longo do tempo</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <SimpleLineChart
            data={chartData}
            dataKey="rainProbability"
            color="#3b82f6"
            label="%"
          />
        )}
      </CardContent>
    </Card>
  )
}

export function WeatherCharts({ logs, isLoading }: WeatherChartProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="weather-charts">
      <TemperatureChart logs={logs} isLoading={isLoading} />
      <RainProbabilityChart logs={logs} isLoading={isLoading} />
    </div>
  )
}
