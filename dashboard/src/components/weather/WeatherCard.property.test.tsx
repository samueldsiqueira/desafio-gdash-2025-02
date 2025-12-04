/**
 * **Feature: weather-monitoring-system, Property 11: Dashboard cards contain all required fields**
 * **Validates: Requirements 3.4**
 *
 * Property: For any weather data displayed in dashboard cards, all required fields
 * (temperature, humidity, wind speed, condition) should be present in the rendered output.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as fc from 'fast-check'
import { WeatherCards } from './WeatherCard'
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

// Generator for valid dates (constrained to avoid invalid date issues)
const validDateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })

// Generator for valid WeatherLog
const weatherLogArb: fc.Arbitrary<WeatherLog> = fc.record({
  _id: fc.uuid(),
  timestamp: validDateArb.map((d) => d.toISOString()),
  location: locationArb,
  weather: weatherDataArb,
  source: fc.constantFrom('open-meteo', 'openweather'),
  createdAt: validDateArb.map((d) => d.toISOString()),
})

describe('WeatherCards Property Tests', () => {
  it('Property 11: Dashboard cards contain all required fields for any valid weather data', () => {
    fc.assert(
      fc.property(weatherLogArb, (weatherLog) => {
        const { unmount } = render(<WeatherCards weatherLog={weatherLog} isLoading={false} />)

        // Check temperature card exists and contains temperature value
        const temperatureCard = screen.getByTestId('temperature-card')
        expect(temperatureCard).toBeInTheDocument()
        const temperatureValue = screen.getByTestId('temperature-value')
        expect(temperatureValue.textContent).toContain(weatherLog.weather.temperature.toFixed(1))
        expect(temperatureValue.textContent).toContain('°C')

        // Check humidity card exists and contains humidity value
        const humidityCard = screen.getByTestId('humidity-card')
        expect(humidityCard).toBeInTheDocument()
        const humidityValue = screen.getByTestId('humidity-value')
        expect(humidityValue.textContent).toContain(weatherLog.weather.humidity.toString())
        expect(humidityValue.textContent).toContain('%')

        // Check wind card exists and contains wind speed value
        const windCard = screen.getByTestId('wind-card')
        expect(windCard).toBeInTheDocument()
        const windValue = screen.getByTestId('wind-value')
        expect(windValue.textContent).toContain(weatherLog.weather.windSpeed.toFixed(1))
        expect(windValue.textContent).toContain('km/h')

        // Check condition card exists and contains condition
        const conditionCard = screen.getByTestId('condition-card')
        expect(conditionCard).toBeInTheDocument()
        const conditionValue = screen.getByTestId('condition-value')
        // Condition should be displayed (either translated or original)
        expect(conditionValue.textContent).toBeTruthy()
        expect(conditionValue.textContent?.length).toBeGreaterThan(0)

        unmount()
      }),
      { numRuns: 100 }
    )
  })
})
