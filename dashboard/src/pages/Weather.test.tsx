import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Weather } from './Weather'
import { WeatherLog, PaginatedResponse } from '@/types'

// Mock the weather service
const mockGetLogs = vi.fn()
const mockExportCsv = vi.fn()
const mockExportXlsx = vi.fn()

vi.mock('@/services/weather', () => ({
  default: {
    getLogs: () => mockGetLogs(),
    exportCsv: () => mockExportCsv(),
    exportXlsx: () => mockExportXlsx(),
  },
  weatherService: {
    getLogs: () => mockGetLogs(),
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
    location: { city: 'Rio de Janeiro', latitude: -22.9068, longitude: -43.1729 },
    weather: {
      temperature: 32.0,
      humidity: 55,
      windSpeed: 8.5,
      condition: 'sunny',
      rainProbability: 10,
    },
    source: 'open-meteo',
    createdAt: '2025-12-03T13:30:00Z',
  },
]


const mockPaginatedResponse: PaginatedResponse<WeatherLog> = {
  data: mockWeatherLogs,
  total: 2,
  page: 1,
  limit: 15,
  totalPages: 1,
}

function renderWeather() {
  return render(
    <BrowserRouter>
      <Weather />
    </BrowserRouter>
  )
}

describe('Weather Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLogs.mockResolvedValue(mockPaginatedResponse)
  })

  describe('Page Header', () => {
    it('should render page title "Clima"', async () => {
      renderWeather()

      await waitFor(() => {
        expect(screen.getByText('Clima')).toBeInTheDocument()
      })
    })

    it('should render page description', async () => {
      renderWeather()

      await waitFor(() => {
        expect(screen.getByText('Dados climáticos detalhados e histórico completo')).toBeInTheDocument()
      })
    })

    it('should render refresh button', async () => {
      renderWeather()

      await waitFor(() => {
        expect(screen.getByTestId('refresh-btn')).toBeInTheDocument()
      })
    })
  })

  describe('Weather Charts', () => {
    it('should render temperature chart', async () => {
      renderWeather()

      await waitFor(() => {
        expect(screen.getByTestId('temperature-chart-card')).toBeInTheDocument()
      })
    })

    it('should render rain probability chart', async () => {
      renderWeather()

      await waitFor(() => {
        expect(screen.getByTestId('rain-chart-card')).toBeInTheDocument()
      })
    })
  })

  describe('Weather Table', () => {
    it('should render weather table with data', async () => {
      renderWeather()

      await waitFor(() => {
        expect(screen.getByTestId('weather-table')).toBeInTheDocument()
      })
    })

    it('should display weather log rows', async () => {
      renderWeather()

      await waitFor(() => {
        const rows = screen.getAllByTestId('weather-table-row')
        expect(rows.length).toBe(2)
      })
    })
  })

  describe('Export Buttons', () => {
    it('should render export CSV button', async () => {
      renderWeather()

      await waitFor(() => {
        expect(screen.getByTestId('export-csv-btn')).toBeInTheDocument()
      })
    })

    it('should render export XLSX button', async () => {
      renderWeather()

      await waitFor(() => {
        expect(screen.getByTestId('export-xlsx-btn')).toBeInTheDocument()
      })
    })

    it('should call exportCsv when CSV button is clicked', async () => {
      mockExportCsv.mockResolvedValue(new Blob(['test'], { type: 'text/csv' }))
      
      const mockCreateObjectURL = vi.fn(() => 'blob:test')
      const mockRevokeObjectURL = vi.fn()
      global.URL.createObjectURL = mockCreateObjectURL
      global.URL.revokeObjectURL = mockRevokeObjectURL

      renderWeather()

      await waitFor(() => {
        expect(screen.getByTestId('export-csv-btn')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('export-csv-btn'))

      await waitFor(() => {
        expect(mockExportCsv).toHaveBeenCalled()
      })
    })
  })

  describe('Refresh Functionality', () => {
    it('should call getLogs when refresh button is clicked', async () => {
      renderWeather()

      await waitFor(() => {
        expect(screen.getByTestId('refresh-btn')).toBeInTheDocument()
      })

      mockGetLogs.mockClear()

      fireEvent.click(screen.getByTestId('refresh-btn'))

      await waitFor(() => {
        expect(mockGetLogs).toHaveBeenCalled()
      })
    })
  })

  describe('Pagination', () => {
    it('should show pagination when multiple pages exist', async () => {
      mockGetLogs.mockResolvedValue({
        ...mockPaginatedResponse,
        totalPages: 3,
      })

      renderWeather()

      await waitFor(() => {
        expect(screen.getByTestId('prev-page-btn')).toBeInTheDocument()
        expect(screen.getByTestId('next-page-btn')).toBeInTheDocument()
      })
    })

    it('should not show pagination when only one page', async () => {
      renderWeather()

      await waitFor(() => {
        expect(screen.getByTestId('weather-table')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('prev-page-btn')).not.toBeInTheDocument()
      expect(screen.queryByTestId('next-page-btn')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      mockGetLogs.mockRejectedValue(new Error('Network error'))

      renderWeather()

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no logs', async () => {
      mockGetLogs.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 15,
        totalPages: 0,
      })

      renderWeather()

      await waitFor(() => {
        expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument()
      })
    })
  })
})
