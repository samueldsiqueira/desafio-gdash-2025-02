/**
 * **Feature: weather-monitoring-system, Property 17: Insights displayed in dashboard**
 * **Validates: Requirements 4.5**
 *
 * Property: For any AI Insights data received by the Dashboard, the insights should be
 * rendered in both textual and visual format.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as fc from 'fast-check'
import { InsightsPanel } from './InsightsPanel'
import { WeatherInsights } from '@/types'

// Generator for valid trend values
const trendArb = fc.constantFrom('rising', 'falling', 'stable') as fc.Arbitrary<
  'rising' | 'falling' | 'stable'
>

// Generator for valid classification values
const classificationArb = fc.constantFrom('cold', 'cool', 'pleasant', 'warm', 'hot') as fc.Arbitrary<
  'cold' | 'cool' | 'pleasant' | 'warm' | 'hot'
>

// Generator for valid statistics
const statisticsArb = fc.record({
  avgTemperature: fc.double({ min: -50, max: 60, noNaN: true }),
  avgHumidity: fc.double({ min: 0, max: 100, noNaN: true }),
  avgWindSpeed: fc.double({ min: 0, max: 500, noNaN: true }),
  maxTemperature: fc.double({ min: -50, max: 60, noNaN: true }),
  minTemperature: fc.double({ min: -50, max: 60, noNaN: true }),
})

// Generator for valid trends
const trendsArb = fc.record({
  temperatureTrend: trendArb,
  humidityTrend: trendArb,
})

// Generator for alert messages
const alertArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0)

// Generator for valid WeatherInsights
const weatherInsightsArb: fc.Arbitrary<WeatherInsights> = fc.record({
  period: fc.record({
    start: fc.date().map((d) => d.toISOString()),
    end: fc.date().map((d) => d.toISOString()),
  }),
  statistics: statisticsArb,
  trends: trendsArb,
  classification: classificationArb,
  alerts: fc.array(alertArb, { minLength: 0, maxLength: 5 }),
  comfortScore: fc.integer({ min: 0, max: 100 }),
  summary: fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
})

describe('InsightsPanel Property Tests', () => {
  it('Property 17: Insights displayed in dashboard - all components render with valid data', () => {
    fc.assert(
      fc.property(weatherInsightsArb, (insights) => {
        const { unmount } = render(<InsightsPanel insights={insights} isLoading={false} />)

        // Check insights panel exists
        const insightsPanel = screen.getByTestId('insights-panel')
        expect(insightsPanel).toBeInTheDocument()

        // Check statistics card renders with all required values (textual format)
        const statisticsCard = screen.getByTestId('statistics-card')
        expect(statisticsCard).toBeInTheDocument()
        const statisticsContent = screen.getByTestId('statistics-content')
        expect(statisticsContent).toBeInTheDocument()

        // Verify statistics values are displayed
        expect(screen.getByTestId('avg-temperature').textContent).toContain(
          insights.statistics.avgTemperature.toFixed(1)
        )
        expect(screen.getByTestId('max-temperature').textContent).toContain(
          insights.statistics.maxTemperature.toFixed(1)
        )
        expect(screen.getByTestId('min-temperature').textContent).toContain(
          insights.statistics.minTemperature.toFixed(1)
        )
        expect(screen.getByTestId('avg-humidity').textContent).toContain(
          insights.statistics.avgHumidity.toFixed(1)
        )
        expect(screen.getByTestId('avg-wind-speed').textContent).toContain(
          insights.statistics.avgWindSpeed.toFixed(1)
        )

        // Check trends card renders (visual format with icons)
        const trendsCard = screen.getByTestId('trends-card')
        expect(trendsCard).toBeInTheDocument()
        const trendsContent = screen.getByTestId('trends-content')
        expect(trendsContent).toBeInTheDocument()
        expect(screen.getByTestId('temperature-trend')).toBeInTheDocument()
        expect(screen.getByTestId('humidity-trend')).toBeInTheDocument()

        // Check classification badge renders (visual format)
        const classificationCard = screen.getByTestId('classification-card')
        expect(classificationCard).toBeInTheDocument()
        const classificationBadge = screen.getByTestId('classification-badge')
        expect(classificationBadge).toBeInTheDocument()
        expect(classificationBadge.textContent?.length).toBeGreaterThan(0)

        // Check alerts card renders
        const alertsCard = screen.getByTestId('alerts-card')
        expect(alertsCard).toBeInTheDocument()
        const alertsContent = screen.getByTestId('alerts-content')
        expect(alertsContent).toBeInTheDocument()

        // Check comfort score gauge renders (visual format)
        const comfortScoreCard = screen.getByTestId('comfort-score-card')
        expect(comfortScoreCard).toBeInTheDocument()
        const comfortScoreContent = screen.getByTestId('comfort-score-content')
        expect(comfortScoreContent).toBeInTheDocument()
        const comfortScoreValue = screen.getByTestId('comfort-score-value')
        expect(comfortScoreValue.textContent).toBe(insights.comfortScore.toString())
        const comfortScoreGauge = screen.getByTestId('comfort-score-gauge')
        expect(comfortScoreGauge).toBeInTheDocument()

        // Check summary card renders (textual format)
        const summaryCard = screen.getByTestId('summary-card')
        expect(summaryCard).toBeInTheDocument()
        const summaryText = screen.getByTestId('summary-text')
        expect(summaryText).toBeInTheDocument()
        expect(summaryText.textContent).toBe(insights.summary)

        unmount()
      }),
      { numRuns: 100 }
    )
  })

  it('Property 17: Alerts are displayed when present', () => {
    fc.assert(
      fc.property(
        weatherInsightsArb.filter((i) => i.alerts.length > 0),
        (insights) => {
          const { unmount } = render(<InsightsPanel insights={insights} isLoading={false} />)

          const alertsList = screen.getByTestId('alerts-list')
          expect(alertsList).toBeInTheDocument()

          // Each alert should be rendered
          insights.alerts.forEach((alert, index) => {
            const alertItem = screen.getByTestId(`alert-item-${index}`)
            expect(alertItem).toBeInTheDocument()
            expect(alertItem.textContent).toContain(alert)
          })

          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 17: No alerts message displayed when alerts array is empty', () => {
    fc.assert(
      fc.property(
        weatherInsightsArb.map((i) => ({ ...i, alerts: [] })),
        (insights) => {
          const { unmount } = render(<InsightsPanel insights={insights} isLoading={false} />)

          const noAlerts = screen.getByTestId('no-alerts')
          expect(noAlerts).toBeInTheDocument()

          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })
})
