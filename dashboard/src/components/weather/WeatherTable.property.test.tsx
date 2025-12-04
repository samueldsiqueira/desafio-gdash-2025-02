/**
 * **Feature: weather-monitoring-system, Property 12: Weather table rows contain complete data**
 * **Validates: Requirements 3.6**
 *
 * Property: For any weather log displayed in the dashboard table, the row should include
 * all required fields (date/time, location, condition, temperature, humidity).
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as fc from 'fast-check'
import { WeatherTable } from './WeatherTable'
import { WeatherLog } from '@/types'

// Generator for valid weather conditions
const weatherConditionArb = fc.constantFrom(
  'sunny',
  'clear',
  'cloudy',
  'partly_cloudy',
  'rainy',
  'rain',
  'snow'
)

// Generator for valid location data
const locationArb = fc.record({
  city: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  latitude: fc.double({ min: -90, max: 90, noNaN: true }),
  longitude: fc.double({ min: -180, max: 180, noNaN: true }),
})

// Generator for valid weather data
const weatherDataArb = fc.record({
  temperature: fc.double({ min: -50, max: 60, noNaN: true }),
  humidity: fc.integer({ min: 0, max: 100 }),
  windSpeed: fc.double({ min: 0, max: 500, noNaN: true }),
  condition: weatherConditionArb,
  rainProbability: fc.integer({ min: 0, max: 100 }),
})

// Generator for valid ISO date strings (using integer timestamps to avoid invalid date issues)
const minTimestamp = new Date('2020-01-01').getTime()
const maxTimestamp = new Date('2030-12-31').getTime()
const validISODateArb = fc
  .integer({ min: minTimestamp, max: maxTimestamp })
  .map((ts) => new Date(ts).toISOString())

// Generator for valid WeatherLog
const weatherLogArb: fc.Arbitrary<WeatherLog> = fc.record({
  _id: fc.uuid(),
  timestamp: validISODateArb,
  location: locationArb,
  weather: weatherDataArb,
  source: fc.constantFrom('open-meteo', 'openweather'),
  createdAt: validISODateArb,
})

// Generator for a non-empty array of weather logs (1-5 items for performance)
const weatherLogsArb = fc.array(weatherLogArb, { minLength: 1, maxLength: 5 })

describe('WeatherTable Property Tests', () => {
  it('Property 12: Weather table rows contain complete data for any valid weather logs', () => {
    fc.assert(
      fc.property(weatherLogsArb, (logs) => {
        const { unmount } = render(
          <WeatherTable
            logs={logs}
            page={1}
            totalPages={1}
            isLoading={false}
            onPageChange={() => {}}
          />
        )

        // Check table exists
        const table = screen.getByTestId('weather-table')
        expect(table).toBeInTheDocument()

        // Check each row contains all required fields
        const rows = screen.getAllByTestId('weather-table-row')
        expect(rows.length).toBe(logs.length)

        rows.forEach((row, index) => {
          const log = logs[index]

          // Check date/time is present
          const datetime = row.querySelector('[data-testid="row-datetime"]')
          expect(datetime).toBeInTheDocument()
          expect(datetime?.textContent).toBeTruthy()

          // Check location is present and contains city
          const location = row.querySelector('[data-testid="row-location"]')
          expect(location).toBeInTheDocument()
          expect(location?.textContent).toBe(log.location.city)

          // Check condition is present
          const condition = row.querySelector('[data-testid="row-condition"]')
          expect(condition).toBeInTheDocument()
          expect(condition?.textContent).toBeTruthy()

          // Check temperature is present and contains the value
          const temperature = row.querySelector('[data-testid="row-temperature"]')
          expect(temperature).toBeInTheDocument()
          expect(temperature?.textContent).toContain(log.weather.temperature.toFixed(1))
          expect(temperature?.textContent).toContain('°C')

          // Check humidity is present and contains the value
          const humidity = row.querySelector('[data-testid="row-humidity"]')
          expect(humidity).toBeInTheDocument()
          expect(humidity?.textContent).toContain(log.weather.humidity.toString())
          expect(humidity?.textContent).toContain('%')
        })

        unmount()
      }),
      { numRuns: 100 }
    )
  })
})
