/**
 * **Feature: weather-monitoring-system, Property 17: Insights displayed in dashboard**
 * **Validates: Requirements 4.5**
 *
 * Property: For any AI Insights data received by the Dashboard, the insights should be
 * rendered in both textual and visual format.
 *
 * **Feature: dashboard-fixes, Property 1: InsightsPanel renders all required data fields**
 * **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**
 *
 * Property: For any valid WeatherInsights object, the InsightsPanel component SHALL render
 * all required fields: statistics (avgTemperature, maxTemperature, minTemperature, avgHumidity,
 * avgWindSpeed), trends (temperatureTrend, humidityTrend), classification, alerts array,
 * comfortScore, and summary.
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

// Generator for valid ISO date strings (using integer timestamps to avoid invalid date issues)
const minTimestamp = new Date('2020-01-01').getTime()
const maxTimestamp = new Date('2030-12-31').getTime()
const validISODateArb = fc
  .integer({ min: minTimestamp, max: maxTimestamp })
  .map((ts) => new Date(ts).toISOString())

// Generator for valid WeatherInsights
const weatherInsightsArb: fc.Arbitrary<WeatherInsights> = fc.record({
  period: fc.record({
    start: validISODateArb,
    end: validISODateArb,
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

  /**
   * **Feature: dashboard-fixes, Property 1: InsightsPanel renders all required data fields**
   * **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**
   */
  it('Property 1: InsightsPanel renders all required data fields', () => {
    fc.assert(
      fc.property(weatherInsightsArb, (insights) => {
        const { unmount } = render(<InsightsPanel insights={insights} isLoading={false} />)

        // Requirement 2.2: Statistics (avgTemperature, maxTemperature, minTemperature, avgHumidity, avgWindSpeed)
        const statisticsContent = screen.getByTestId('statistics-content')
        expect(statisticsContent).toBeInTheDocument()

        // Verify all statistics fields are rendered with correct values
        const avgTemp = screen.getByTestId('avg-temperature')
        expect(avgTemp).toBeInTheDocument()
        expect(avgTemp.textContent).toContain(insights.statistics.avgTemperature.toFixed(1))

        const maxTemp = screen.getByTestId('max-temperature')
        expect(maxTemp).toBeInTheDocument()
        expect(maxTemp.textContent).toContain(insights.statistics.maxTemperature.toFixed(1))

        const minTemp = screen.getByTestId('min-temperature')
        expect(minTemp).toBeInTheDocument()
        expect(minTemp.textContent).toContain(insights.statistics.minTemperature.toFixed(1))

        const avgHumidity = screen.getByTestId('avg-humidity')
        expect(avgHumidity).toBeInTheDocument()
        expect(avgHumidity.textContent).toContain(insights.statistics.avgHumidity.toFixed(1))

        const avgWindSpeed = screen.getByTestId('avg-wind-speed')
        expect(avgWindSpeed).toBeInTheDocument()
        expect(avgWindSpeed.textContent).toContain(insights.statistics.avgWindSpeed.toFixed(1))

        // Requirement 2.3: Trends (temperatureTrend, humidityTrend)
        const trendsContent = screen.getByTestId('trends-content')
        expect(trendsContent).toBeInTheDocument()

        const tempTrend = screen.getByTestId('temperature-trend')
        expect(tempTrend).toBeInTheDocument()

        const humidityTrend = screen.getByTestId('humidity-trend')
        expect(humidityTrend).toBeInTheDocument()

        // Requirement 2.4: Classification badge
        const classificationBadge = screen.getByTestId('classification-badge')
        expect(classificationBadge).toBeInTheDocument()
        expect(classificationBadge.textContent?.length).toBeGreaterThan(0)

        // Requirement 2.5: Alerts array
        const alertsContent = screen.getByTestId('alerts-content')
        expect(alertsContent).toBeInTheDocument()

        if (insights.alerts.length > 0) {
          const alertsList = screen.getByTestId('alerts-list')
          expect(alertsList).toBeInTheDocument()
          // Verify each alert is rendered
          insights.alerts.forEach((alert, index) => {
            const alertItem = screen.getByTestId(`alert-item-${index}`)
            expect(alertItem).toBeInTheDocument()
            expect(alertItem.textContent).toContain(alert)
          })
        } else {
          const noAlerts = screen.getByTestId('no-alerts')
          expect(noAlerts).toBeInTheDocument()
        }

        // Requirement 2.6: ComfortScore and summary
        const comfortScoreContent = screen.getByTestId('comfort-score-content')
        expect(comfortScoreContent).toBeInTheDocument()

        const comfortScoreValue = screen.getByTestId('comfort-score-value')
        expect(comfortScoreValue).toBeInTheDocument()
        expect(comfortScoreValue.textContent).toBe(insights.comfortScore.toString())

        const comfortScoreLabel = screen.getByTestId('comfort-score-label')
        expect(comfortScoreLabel).toBeInTheDocument()
        expect(comfortScoreLabel.textContent?.length).toBeGreaterThan(0)

        const comfortScoreGauge = screen.getByTestId('comfort-score-gauge')
        expect(comfortScoreGauge).toBeInTheDocument()

        const summaryText = screen.getByTestId('summary-text')
        expect(summaryText).toBeInTheDocument()
        expect(summaryText.textContent).toBe(insights.summary)

        unmount()
      }),
      { numRuns: 100 }
    )
  })
})
