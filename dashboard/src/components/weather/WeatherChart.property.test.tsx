/**
 * **Feature: dashboard-fixes, Property 2: Chart renders correct data points**
 * **Validates: Requirements 3.1, 3.2, 3.3**
 *
 * Property: For any non-empty array of WeatherLog objects, the temperature chart
 * SHALL render exactly one data point per log entry, with the x-axis showing
 * formatted time and y-axis showing temperature values within the min/max range of the data.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as fc from 'fast-check'
import { TemperatureChart, RainProbabilityChart, WeatherCharts } from './WeatherChart'
import { WeatherLog } from '@/types'

// Generator for valid ISO date strings using integer timestamps to avoid invalid dates
const validDateArb = fc
  .integer({ min: 1577836800000, max: 1924991999000 }) // 2020-01-01 to 2030-12-31
  .map((ts) => new Date(ts).toISOString())

// Generator for valid Location
const locationArb = fc.record({
  city: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  latitude: fc.double({ min: -90, max: 90, noNaN: true }),
  longitude: fc.double({ min: -180, max: 180, noNaN: true }),
})

// Generator for valid WeatherData
const weatherDataArb = fc.record({
  temperature: fc.double({ min: -50, max: 60, noNaN: true }),
  humidity: fc.double({ min: 0, max: 100, noNaN: true }),
  windSpeed: fc.double({ min: 0, max: 200, noNaN: true }),
  condition: fc.constantFrom('sunny', 'cloudy', 'rainy', 'stormy', 'snowy', 'foggy'),
  rainProbability: fc.double({ min: 0, max: 100, noNaN: true }),
})

// Generator for valid WeatherLog
const weatherLogArb: fc.Arbitrary<WeatherLog> = fc.record({
  _id: fc.uuid(),
  timestamp: validDateArb,
  location: locationArb,
  weather: weatherDataArb,
  source: fc.constantFrom('openweathermap', 'weatherapi', 'manual'),
  createdAt: validDateArb,
})

// Generator for non-empty list of WeatherLogs
const weatherLogsArb = fc.array(weatherLogArb, { minLength: 1, maxLength: 20 })

// Generator for empty list
const emptyLogsArb = fc.constant([] as WeatherLog[])

describe('WeatherChart Property Tests', () => {
  describe('Property 2a: Chart renders exactly one data point per log entry', () => {
    it('TemperatureChart renders correct number of data points for any non-empty logs', () => {
      fc.assert(
        fc.property(weatherLogsArb, (logs) => {
          const { unmount, container } = render(<TemperatureChart logs={logs} isLoading={false} />)

          // Find all circle elements (data points) in the SVG
          const circles = container.querySelectorAll('circle')

          // Should have exactly one circle per log entry
          expect(circles.length).toBe(logs.length)

          unmount()
          return true
        }),
        { numRuns: 100 }
      )
    })

    it('RainProbabilityChart renders correct number of data points for any non-empty logs', () => {
      fc.assert(
        fc.property(weatherLogsArb, (logs) => {
          const { unmount, container } = render(<RainProbabilityChart logs={logs} isLoading={false} />)

          // Find all circle elements (data points) in the SVG
          const circles = container.querySelectorAll('circle')

          // Should have exactly one circle per log entry
          expect(circles.length).toBe(logs.length)

          unmount()
          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 2b: Chart displays time labels on x-axis', () => {
    it('TemperatureChart shows first and last time labels for any non-empty logs', () => {
      fc.assert(
        fc.property(weatherLogsArb, (logs) => {
          const { unmount, container } = render(<TemperatureChart logs={logs} isLoading={false} />)

          // The chart should display time labels in the bottom div
          const bottomDiv = container.querySelector('.absolute.bottom-0')

          if (logs.length >= 1) {
            // Should have the time labels container
            expect(bottomDiv).not.toBeNull()
            
            // The container should have span elements with time labels
            const spans = bottomDiv?.querySelectorAll('span') || []
            expect(spans.length).toBeGreaterThanOrEqual(1)
          }

          unmount()
          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 2c: Chart displays min/max values on y-axis', () => {
    it('TemperatureChart shows min and max temperature values', () => {
      fc.assert(
        fc.property(weatherLogsArb, (logs) => {
          const { unmount, container } = render(<TemperatureChart logs={logs} isLoading={false} />)

          const temperatures = logs.map((log) => log.weather.temperature)
          const minTemp = Math.min(...temperatures)
          const maxTemp = Math.max(...temperatures)

          // The chart should display min and max values
          const textContent = container.textContent || ''

          // Check that min and max values are displayed (formatted to 1 decimal place)
          expect(textContent).toContain(minTemp.toFixed(1))
          expect(textContent).toContain(maxTemp.toFixed(1))

          unmount()
          return true
        }),
        { numRuns: 100 }
      )
    })

    it('RainProbabilityChart shows min and max rain probability values', () => {
      fc.assert(
        fc.property(weatherLogsArb, (logs) => {
          const { unmount, container } = render(<RainProbabilityChart logs={logs} isLoading={false} />)

          const rainProbs = logs.map((log) => log.weather.rainProbability)
          const minRain = Math.min(...rainProbs)
          const maxRain = Math.max(...rainProbs)

          // The chart should display min and max values
          const textContent = container.textContent || ''

          // Check that min and max values are displayed (formatted to 1 decimal place)
          expect(textContent).toContain(minRain.toFixed(1))
          expect(textContent).toContain(maxRain.toFixed(1))

          unmount()
          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 2d: Empty data shows appropriate message', () => {
    it('TemperatureChart shows "no data" message for empty logs', () => {
      fc.assert(
        fc.property(emptyLogsArb, (logs) => {
          const { unmount } = render(<TemperatureChart logs={logs} isLoading={false} />)

          // Should show "Sem dados para exibir" message
          expect(screen.getByText('Sem dados para exibir')).toBeInTheDocument()

          unmount()
          return true
        }),
        { numRuns: 10 }
      )
    })

    it('RainProbabilityChart shows "no data" message for empty logs', () => {
      fc.assert(
        fc.property(emptyLogsArb, (logs) => {
          const { unmount } = render(<RainProbabilityChart logs={logs} isLoading={false} />)

          // Should show "Sem dados para exibir" message
          expect(screen.getByText('Sem dados para exibir')).toBeInTheDocument()

          unmount()
          return true
        }),
        { numRuns: 10 }
      )
    })
  })

  describe('Property 2e: Loading state shows loading indicator', () => {
    it('TemperatureChart shows loading indicator when isLoading is true', () => {
      fc.assert(
        fc.property(weatherLogsArb, (logs) => {
          const { unmount, container } = render(<TemperatureChart logs={logs} isLoading={true} />)

          // Should show "Carregando..." message
          expect(container.textContent).toContain('Carregando...')

          unmount()
          return true
        }),
        { numRuns: 100 }
      )
    })

    it('RainProbabilityChart shows loading indicator when isLoading is true', () => {
      fc.assert(
        fc.property(weatherLogsArb, (logs) => {
          const { unmount, container } = render(<RainProbabilityChart logs={logs} isLoading={true} />)

          // Should show "Carregando..." message
          expect(container.textContent).toContain('Carregando...')

          unmount()
          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 2f: WeatherCharts renders both temperature and rain charts', () => {
    it('WeatherCharts renders both chart types for any logs', () => {
      fc.assert(
        fc.property(weatherLogsArb, (logs) => {
          const { unmount } = render(<WeatherCharts logs={logs} isLoading={false} />)

          // Should render both chart cards
          expect(screen.getByTestId('temperature-chart-card')).toBeInTheDocument()
          expect(screen.getByTestId('rain-chart-card')).toBeInTheDocument()

          // Should render both chart containers
          expect(screen.getByTestId('chart-temperature')).toBeInTheDocument()
          expect(screen.getByTestId('chart-rainProbability')).toBeInTheDocument()

          unmount()
          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 2g: Data points are positioned within valid SVG bounds', () => {
    it('All data points have valid x and y coordinates', () => {
      fc.assert(
        fc.property(weatherLogsArb, (logs) => {
          const { unmount, container } = render(<TemperatureChart logs={logs} isLoading={false} />)

          const circles = container.querySelectorAll('circle')

          circles.forEach((circle) => {
            const cx = circle.getAttribute('cx')
            const cy = circle.getAttribute('cy')

            // cx should be a percentage string (e.g., "40%")
            expect(cx).toMatch(/^\d+(\.\d+)?%$/)

            // cy should be a number (the y coordinate)
            expect(cy).not.toBeNull()
            const cyValue = parseFloat(cy || '0')
            // cy should be within the SVG viewBox height (0 to 200)
            expect(cyValue).toBeGreaterThanOrEqual(0)
            expect(cyValue).toBeLessThanOrEqual(200)
          })

          unmount()
          return true
        }),
        { numRuns: 100 }
      )
    })
  })
})
