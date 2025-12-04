import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Dashboard } from './Dashboard'
import { WeatherLog, PaginatedResponse } from '@/types'

// Mock the weather service
const mockGetLogs = vi.fn()
const mockGetInsights = vi.fn()
const mockExportCsv = vi.fn()
const mockExportXlsx = vi.fn()

const mockInsightsData = {
  period: {
    start: '2025-12-03T00:00:00Z',
    end: '2025-12-03T23:59:59Z',
  },
  statistics: {
    avgTemperature: 27.75,
    avgHumidity: 67.5,
    avgWindSpeed: 11.4,
    maxTemperature: 28.5,
    minTemperature: 27.0,
  },
  trends: {
    temperatureTrend: 'rising' as const,
    humidityTrend: 'stable' as const,
  },
  classification: 'warm' as const,
  alerts: [],
  comfortScore: 75,
  summary: 'Condições climáticas agradáveis com temperatura amena.',
}

vi.mock('@/services/weather', () => ({
  default: {
    getLogs: () => mockGetLogs(),
    getInsights: () => mockGetInsights(),
    exportCsv: () => mockExportCsv(),
    exportXlsx: () => mockExportXlsx(),
  },
  weatherService: {
    getLogs: () => mockGetLogs(),
    getInsights: () => mockGetInsights(),
    exportCsv: () => mockExportCsv(),
    exportXlsx: () => mockExportXlsx(),
  },
}))

const mockWeatherLogs: WeatherLog[] = [
  {
    _id: '1',
    timestamp: '2025-12-03T14:30:00Z',
    location: { city: 'São Paulo', latitude: -23.5505, longitude: -46.6333 },
    weather: {
      temperature: 28.5,
      humidity: 65,
      windSpeed: 12.3,
      condition: 'partly_cloudy',
      rainProbability: 30,
    },
    source: 'open-meteo',
    createdAt: '2025-12-03T14:30:00Z',
  },
  {
    _id: '2',
    timestamp: '2025-12-03T13:30:00Z',
    location: { city: 'São Paulo', latitude: -23.5505, longitude: -46.6333 },
    weather: {
      temperature: 27.0,
      humidity: 70,
      windSpeed: 10.5,
      condition: 'cloudy',
      rainProbability: 45,
    },
    source: 'open-meteo',
    createdAt: '2025-12-03T13:30:00Z',
  },
]

const mockPaginatedResponse: PaginatedResponse<WeatherLog> = {
  data: mockWeatherLogs,
  total: 2,
  page: 1,
  limit: 10,
  totalPages: 1,
}

function renderDashboard() {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLogs.mockResolvedValue(mockPaginatedResponse)
    mockGetInsights.mockResolvedValue(mockInsightsData)
  })

  describe('Weather Cards', () => {
    it('should render weather cards with data', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('temperature-card')).toBeInTheDocument()
        expect(screen.getByTestId('humidity-card')).toBeInTheDocument()
        expect(screen.getByTestId('wind-card')).toBeInTheDocument()
        expect(screen.getByTestId('condition-card')).toBeInTheDocument()
      })
    })

    it('should display latest temperature value', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('temperature-value')).toHaveTextContent('28.5°C')
      })
    })

    it('should display latest humidity value', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('humidity-value')).toHaveTextContent('65%')
      })
    })

    it('should display latest wind speed value', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('wind-value')).toHaveTextContent('12.3 km/h')
      })
    })
  })


  describe('Weather Charts', () => {
    it('should render temperature chart', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('temperature-chart-card')).toBeInTheDocument()
      })
    })

    it('should render rain probability chart', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('rain-chart-card')).toBeInTheDocument()
      })
    })
  })

  describe('Weather Table', () => {
    it('should render weather table with data', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('weather-table')).toBeInTheDocument()
      })
    })

    it('should display weather log rows', async () => {
      renderDashboard()

      await waitFor(() => {
        const rows = screen.getAllByTestId('weather-table-row')
        expect(rows.length).toBe(2)
      })
    })

    it('should display location in table rows', async () => {
      renderDashboard()

      await waitFor(() => {
        const locations = screen.getAllByTestId('row-location')
        expect(locations[0]).toHaveTextContent('São Paulo')
      })
    })
  })

  describe('Table Pagination', () => {
    it('should not show pagination when only one page', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('weather-table')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('prev-page-btn')).not.toBeInTheDocument()
      expect(screen.queryByTestId('next-page-btn')).not.toBeInTheDocument()
    })

    it('should show pagination when multiple pages exist', async () => {
      mockGetLogs.mockResolvedValue({
        ...mockPaginatedResponse,
        totalPages: 3,
      })

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('prev-page-btn')).toBeInTheDocument()
        expect(screen.getByTestId('next-page-btn')).toBeInTheDocument()
      })
    })

    it('should disable previous button on first page', async () => {
      mockGetLogs.mockResolvedValue({
        ...mockPaginatedResponse,
        page: 1,
        totalPages: 3,
      })

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('prev-page-btn')).toBeDisabled()
      })
    })

    it('should enable next button when not on last page', async () => {
      mockGetLogs.mockResolvedValue({
        ...mockPaginatedResponse,
        page: 1,
        totalPages: 3,
      })

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('next-page-btn')).not.toBeDisabled()
      })
    })
  })

  describe('Export Buttons', () => {
    it('should render export buttons', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('export-csv-btn')).toBeInTheDocument()
        expect(screen.getByTestId('export-xlsx-btn')).toBeInTheDocument()
      })
    })

    it('should call exportCsv when CSV button is clicked', async () => {
      mockExportCsv.mockResolvedValue(new Blob(['test'], { type: 'text/csv' }))
      
      // Mock URL.createObjectURL and revokeObjectURL
      const mockCreateObjectURL = vi.fn(() => 'blob:test')
      const mockRevokeObjectURL = vi.fn()
      global.URL.createObjectURL = mockCreateObjectURL
      global.URL.revokeObjectURL = mockRevokeObjectURL

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('export-csv-btn')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('export-csv-btn'))

      await waitFor(() => {
        expect(mockExportCsv).toHaveBeenCalled()
      })
    })

    it('should call exportXlsx when XLSX button is clicked', async () => {
      mockExportXlsx.mockResolvedValue(new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      
      // Mock URL.createObjectURL and revokeObjectURL
      const mockCreateObjectURL = vi.fn(() => 'blob:test')
      const mockRevokeObjectURL = vi.fn()
      global.URL.createObjectURL = mockCreateObjectURL
      global.URL.revokeObjectURL = mockRevokeObjectURL

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('export-xlsx-btn')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('export-xlsx-btn'))

      await waitFor(() => {
        expect(mockExportXlsx).toHaveBeenCalled()
      })
    })
  })

  describe('Refresh Functionality', () => {
    it('should render refresh button', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('refresh-btn')).toBeInTheDocument()
      })
    })

    it('should call getLogs when refresh button is clicked', async () => {
      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('refresh-btn')).toBeInTheDocument()
      })

      // Clear the initial call
      mockGetLogs.mockClear()

      fireEvent.click(screen.getByTestId('refresh-btn'))

      await waitFor(() => {
        expect(mockGetLogs).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      mockGetLogs.mockRejectedValue(new Error('Network error'))

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
        expect(screen.getByTestId('error-message')).toHaveTextContent('Erro ao carregar dados climáticos')
      })
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no logs', async () => {
      mockGetLogs.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      })

      renderDashboard()

      await waitFor(() => {
        expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument()
      })
    })
  })
})
