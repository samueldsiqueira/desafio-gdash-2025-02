import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { WeatherLog } from '@/types'

export interface WeatherTableProps {
  logs: WeatherLog[]
  page: number
  totalPages: number
  isLoading?: boolean
  onPageChange: (page: number) => void
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getConditionLabel(condition: string): string {
  switch (condition) {
    case 'sunny': return 'Ensolarado'
    case 'clear': return 'Céu Limpo'
    case 'mainly_clear': return 'Limpo'
    case 'cloudy': return 'Nublado'
    case 'partly_cloudy': return 'Parc. Nublado'
    case 'overcast': return 'Encoberto'
    case 'fog': return 'Neblina'
    case 'depositing_rime_fog': return 'Neblina/Geada'
    case 'rainy': return 'Chuvoso'
    case 'rain': return 'Chuva'
    case 'light_drizzle': return 'Garoa Leve'
    case 'moderate_drizzle': return 'Garoa'
    case 'dense_drizzle': return 'Garoa Forte'
    case 'slight_rain': return 'Chuva Leve'
    case 'moderate_rain': return 'Chuva'
    case 'heavy_rain': return 'Chuva Forte'
    case 'slight_rain_showers': return 'Pancadas'
    case 'moderate_rain_showers': return 'Pancadas'
    case 'violent_rain_showers': return 'Temporal'
    case 'snow': return 'Neve'
    case 'slight_snow': return 'Neve Leve'
    case 'moderate_snow': return 'Neve'
    case 'heavy_snow': return 'Neve Forte'
    case 'thunderstorm': return 'Tempestade'
    case 'thunderstorm_with_hail': return 'Granizo'
    case 'thunderstorm_with_heavy_hail': return 'Granizo Forte'
    default: return condition
  }
}

function formatLocation(location: { city: string; state?: string }): string {
  if (location.state) {
    return `${location.state}, ${location.city}`
  }
  return location.city
}

export function WeatherTable({ logs, page, totalPages, isLoading, onPageChange }: WeatherTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Dados Climáticos</CardTitle>
        <CardDescription>
          Registros de condições meteorológicas coletados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table data-testid="weather-table">
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Condição</TableHead>
              <TableHead className="text-right">Temperatura</TableHead>
              <TableHead className="text-right">Umidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log._id} data-testid="weather-table-row">
                  <TableCell data-testid="row-datetime">{formatDate(log.timestamp)}</TableCell>
                  <TableCell data-testid="row-location">{formatLocation(log.location)}</TableCell>
                  <TableCell data-testid="row-condition">{getConditionLabel(log.weather.condition)}</TableCell>
                  <TableCell className="text-right" data-testid="row-temperature">
                    {log.weather.temperature.toFixed(1)}°C
                  </TableCell>
                  <TableCell className="text-right" data-testid="row-humidity">
                    {log.weather.humidity}%
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              data-testid="prev-page-btn"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground" data-testid="page-info">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              data-testid="next-page-btn"
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
