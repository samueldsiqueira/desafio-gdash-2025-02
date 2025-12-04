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

  const svgWidth = 400
  const svgHeight = 160
  const paddingLeft = 35
  const paddingRight = 10
  const paddingTop = 10
  const paddingBottom = 25
  const chartWidth = svgWidth - paddingLeft - paddingRight
  const chartHeight = svgHeight - paddingTop - paddingBottom

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1 || 1)) * chartWidth
    const y = paddingTop + chartHeight - ((d[dataKey] - min) / range) * chartHeight
    return { x, y }
  })

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ')

  // Gerar labels do eixo Y
  const yLabels = [min, min + range / 2, max]

  return (
    <div className="h-[200px]" data-testid={`chart-${dataKey}`}>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full">
        {/* Grid lines horizontais */}
        {yLabels.map((val, i) => {
          const y = paddingTop + chartHeight - ((val - min) / range) * chartHeight
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={svgWidth - paddingRight}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeDasharray="4"
              />
              <text
                x={paddingLeft - 5}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize="10"
              >
                {val.toFixed(0)}
              </text>
            </g>
          )
        })}

        {/* Linha do gráfico */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={polylinePoints}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Pontos */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill={color}
            stroke="white"
            strokeWidth="1"
          />
        ))}

        {/* Labels do eixo X */}
        {data.length > 0 && (
          <text
            x={paddingLeft}
            y={svgHeight - 5}
            textAnchor="start"
            className="fill-muted-foreground"
            fontSize="10"
          >
            {data[0].time}
          </text>
        )}
        {data.length > 1 && (
          <text
            x={svgWidth - paddingRight}
            y={svgHeight - 5}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize="10"
          >
            {data[data.length - 1].time}
          </text>
        )}

        {/* Label da unidade */}
        <text
          x={paddingLeft - 5}
          y={paddingTop - 2}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize="9"
        >
          {label}
        </text>
      </svg>
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
