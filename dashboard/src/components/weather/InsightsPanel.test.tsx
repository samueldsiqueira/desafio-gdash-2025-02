/**
 * Unit tests for InsightsPanel components
 * **Validates: Requirements 4.5**
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  InsightsPanel,
  StatisticsCard,
  TrendsCard,
  ClassificationBadge,
  AlertsCard,
  ComfortScoreGauge,
  SummaryCard,
} from './InsightsPanel'
import { WeatherInsights } from '@/types'

const mockInsights: WeatherInsights = {
  period: {
    start: '2025-12-01T00:00:00Z',
    end: '2025-12-03T23:59:59Z',
  },
  statistics: {
    avgTemperature: 25.5,
    avgHumidity: 65.0,
    avgWindSpeed: 12.3,
    maxTemperature: 32.0,
    minTemperature: 18.0,
  },
  trends: {
    temperatureTrend: 'rising',
    humidityTrend: 'stable',
  },
  classification: 'warm',
  alerts: ['Alta chance de chuva', 'Calor extremo'],
  comfortScore: 75,
  summary: 'O clima está quente com tendência de aumento de temperatura.',
}

describe('InsightsPanel Unit Tests', () => {
  describe('StatisticsCard', () => {
    it('renders statistics with correct values', () => {
      render(<StatisticsCard insights={mockInsights} isLoading={false} />)

      expect(screen.getByTestId('statistics-card')).toBeInTheDocument()
      expect(screen.getByTestId('avg-temperature')).toHaveTextContent('25.5°C')
      expect(screen.getByTestId('max-temperature')).toHaveTextContent('32.0°C')
      expect(screen.getByTestId('min-temperature')).toHaveTextContent('18.0°C')
      expect(screen.getByTestId('avg-humidity')).toHaveTextContent('65.0%')
      expect(screen.getByTestId('avg-wind-speed')).toHaveTextContent('12.3 km/h')
    })

    it('shows loading state', () => {
      render(<StatisticsCard insights={null} isLoading={true} />)
      expect(screen.getByText('Carregando...')).toBeInTheDocument()
    })
  })


  describe('TrendsCard', () => {
    it('renders trends with correct labels', () => {
      render(<TrendsCard insights={mockInsights} isLoading={false} />)

      expect(screen.getByTestId('trends-card')).toBeInTheDocument()
      expect(screen.getByTestId('temperature-trend')).toHaveTextContent('Subindo')
      expect(screen.getByTestId('humidity-trend')).toHaveTextContent('Estável')
    })

    it('renders falling trend correctly', () => {
      const fallingInsights = {
        ...mockInsights,
        trends: { temperatureTrend: 'falling' as const, humidityTrend: 'falling' as const },
      }
      render(<TrendsCard insights={fallingInsights} isLoading={false} />)

      expect(screen.getByTestId('temperature-trend')).toHaveTextContent('Caindo')
      expect(screen.getByTestId('humidity-trend')).toHaveTextContent('Caindo')
    })
  })

  describe('ClassificationBadge', () => {
    it('renders classification badge with correct label', () => {
      render(<ClassificationBadge insights={mockInsights} isLoading={false} />)

      expect(screen.getByTestId('classification-card')).toBeInTheDocument()
      const badge = screen.getByTestId('classification-badge')
      expect(badge).toHaveTextContent('Quente')
    })

    it('renders different classifications correctly', () => {
      const coldInsights = { ...mockInsights, classification: 'cold' as const }
      const { rerender } = render(<ClassificationBadge insights={coldInsights} isLoading={false} />)
      expect(screen.getByTestId('classification-badge')).toHaveTextContent('Frio')

      const pleasantInsights = { ...mockInsights, classification: 'pleasant' as const }
      rerender(<ClassificationBadge insights={pleasantInsights} isLoading={false} />)
      expect(screen.getByTestId('classification-badge')).toHaveTextContent('Agradável')
    })
  })

  describe('AlertsCard', () => {
    it('renders alerts list when alerts exist', () => {
      render(<AlertsCard insights={mockInsights} isLoading={false} />)

      expect(screen.getByTestId('alerts-card')).toBeInTheDocument()
      expect(screen.getByTestId('alerts-list')).toBeInTheDocument()
      expect(screen.getByTestId('alert-item-0')).toHaveTextContent('Alta chance de chuva')
      expect(screen.getByTestId('alert-item-1')).toHaveTextContent('Calor extremo')
    })

    it('renders no alerts message when alerts array is empty', () => {
      const noAlertsInsights = { ...mockInsights, alerts: [] }
      render(<AlertsCard insights={noAlertsInsights} isLoading={false} />)

      expect(screen.getByTestId('no-alerts')).toBeInTheDocument()
      expect(screen.getByText('Nenhum alerta no momento')).toBeInTheDocument()
    })
  })

  describe('ComfortScoreGauge', () => {
    it('renders comfort score with correct value and label', () => {
      render(<ComfortScoreGauge insights={mockInsights} isLoading={false} />)

      expect(screen.getByTestId('comfort-score-card')).toBeInTheDocument()
      expect(screen.getByTestId('comfort-score-value')).toHaveTextContent('75')
      expect(screen.getByTestId('comfort-score-label')).toHaveTextContent('Bom')
      expect(screen.getByTestId('comfort-score-gauge')).toBeInTheDocument()
    })

    it('renders different score labels correctly', () => {
      const excellentInsights = { ...mockInsights, comfortScore: 90 }
      const { rerender } = render(<ComfortScoreGauge insights={excellentInsights} isLoading={false} />)
      expect(screen.getByTestId('comfort-score-label')).toHaveTextContent('Excelente')

      const poorInsights = { ...mockInsights, comfortScore: 15 }
      rerender(<ComfortScoreGauge insights={poorInsights} isLoading={false} />)
      expect(screen.getByTestId('comfort-score-label')).toHaveTextContent('Ruim')
    })
  })

  describe('SummaryCard', () => {
    it('renders summary text', () => {
      render(<SummaryCard insights={mockInsights} isLoading={false} />)

      expect(screen.getByTestId('summary-card')).toBeInTheDocument()
      expect(screen.getByTestId('summary-text')).toHaveTextContent(mockInsights.summary)
    })
  })

  describe('InsightsPanel', () => {
    it('renders all insight components', () => {
      render(<InsightsPanel insights={mockInsights} isLoading={false} />)

      expect(screen.getByTestId('insights-panel')).toBeInTheDocument()
      expect(screen.getByTestId('statistics-card')).toBeInTheDocument()
      expect(screen.getByTestId('trends-card')).toBeInTheDocument()
      expect(screen.getByTestId('classification-card')).toBeInTheDocument()
      expect(screen.getByTestId('alerts-card')).toBeInTheDocument()
      expect(screen.getByTestId('comfort-score-card')).toBeInTheDocument()
      expect(screen.getByTestId('summary-card')).toBeInTheDocument()
    })

    it('shows loading state for all components', () => {
      render(<InsightsPanel insights={null} isLoading={true} />)

      const loadingTexts = screen.getAllByText('Carregando...')
      expect(loadingTexts.length).toBeGreaterThan(0)
    })
  })
})
