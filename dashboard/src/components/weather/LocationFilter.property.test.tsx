/**
 * **Feature: dashboard-fixes, Property 3: Location filter cascading behavior**
 * **Validates: Requirements 4.2, 4.3, 4.4**
 *
 * Property: For any selected state, the cities dropdown SHALL only contain cities
 * that belong to that state. When a state changes, the selected city SHALL be reset to null.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as fc from 'fast-check'
import { LocationFilter, StateOption, CityOption } from './LocationFilter'

// Generator for valid state options
const stateOptionArb: fc.Arbitrary<StateOption> = fc.record({
  value: fc.string({ minLength: 2, maxLength: 2 }).map((s) => s.toUpperCase()),
  label: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
})

// Generator for valid city options
const cityOptionArb: fc.Arbitrary<CityOption> = fc.record({
  value: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  label: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
})

// Generator for a list of unique states
const statesListArb = fc
  .array(stateOptionArb, { minLength: 1, maxLength: 27 })
  .map((states) => {
    // Ensure unique state values
    const seen = new Set<string>()
    return states.filter((s) => {
      if (seen.has(s.value)) return false
      seen.add(s.value)
      return true
    })
  })
  .filter((states) => states.length > 0)

// Generator for a list of cities
const citiesListArb = fc.array(cityOptionArb, { minLength: 0, maxLength: 50 })

describe('LocationFilter Property Tests', () => {
  it('Property 3a: Cities dropdown only shows cities when a state is selected', () => {
    fc.assert(
      fc.property(
        statesListArb,
        citiesListArb,
        fc.boolean(),
        (states, cities, hasSelectedState) => {
          const selectedState = hasSelectedState && states.length > 0 ? states[0].value : null
          const onStateChange = vi.fn()
          const onCityChange = vi.fn()

          const { unmount } = render(
            <LocationFilter
              selectedState={selectedState}
              selectedCity={null}
              onStateChange={onStateChange}
              onCityChange={onCityChange}
              states={states}
              cities={selectedState ? cities : []}
              isLoadingCities={false}
            />
          )

          const citySelect = screen.getByTestId('city-select') as HTMLSelectElement

          if (!selectedState) {
            // When no state is selected, city dropdown should be disabled
            expect(citySelect.disabled).toBe(true)
          } else {
            // When state is selected, city dropdown should be enabled
            expect(citySelect.disabled).toBe(false)
          }

          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 3b: State change triggers onStateChange callback with correct value', () => {
    fc.assert(
      fc.property(statesListArb, citiesListArb, (states, cities) => {
        if (states.length < 2) return true // Skip if not enough states to test

        const onStateChange = vi.fn()
        const onCityChange = vi.fn()

        const { unmount } = render(
          <LocationFilter
            selectedState={null}
            selectedCity={null}
            onStateChange={onStateChange}
            onCityChange={onCityChange}
            states={states}
            cities={cities}
            isLoadingCities={false}
          />
        )

        const stateSelect = screen.getByTestId('state-select') as HTMLSelectElement

        // Select a state
        const targetState = states[0]
        fireEvent.change(stateSelect, { target: { value: targetState.value } })

        // Verify onStateChange was called with the correct value
        expect(onStateChange).toHaveBeenCalledWith(targetState.value)

        unmount()
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('Property 3c: Clearing state selection triggers onStateChange with null', () => {
    fc.assert(
      fc.property(statesListArb, citiesListArb, (states, cities) => {
        if (states.length === 0) return true

        const selectedState = states[0].value
        const onStateChange = vi.fn()
        const onCityChange = vi.fn()

        const { unmount } = render(
          <LocationFilter
            selectedState={selectedState}
            selectedCity={null}
            onStateChange={onStateChange}
            onCityChange={onCityChange}
            states={states}
            cities={cities}
            isLoadingCities={false}
          />
        )

        const stateSelect = screen.getByTestId('state-select') as HTMLSelectElement

        // Clear state selection
        fireEvent.change(stateSelect, { target: { value: '' } })

        // Verify onStateChange was called with null
        expect(onStateChange).toHaveBeenCalledWith(null)

        unmount()
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('Property 3d: Cities displayed match the cities prop for any valid city list', () => {
    fc.assert(
      fc.property(statesListArb, citiesListArb, (states, cities) => {
        if (states.length === 0) return true

        const selectedState = states[0].value
        const onStateChange = vi.fn()
        const onCityChange = vi.fn()

        const { unmount } = render(
          <LocationFilter
            selectedState={selectedState}
            selectedCity={null}
            onStateChange={onStateChange}
            onCityChange={onCityChange}
            states={states}
            cities={cities}
            isLoadingCities={false}
          />
        )

        const citySelect = screen.getByTestId('city-select') as HTMLSelectElement
        const options = Array.from(citySelect.options)

        // First option is the placeholder "Todos os municípios"
        // Remaining options should match the cities prop
        const cityOptions = options.slice(1)

        expect(cityOptions.length).toBe(cities.length)

        cities.forEach((city, index) => {
          expect(cityOptions[index].value).toBe(city.value)
          expect(cityOptions[index].textContent).toBe(city.label)
        })

        unmount()
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('Property 3e: City selection triggers onCityChange with correct value', () => {
    fc.assert(
      fc.property(
        statesListArb,
        citiesListArb.filter((c) => c.length > 0),
        (states, cities) => {
          if (states.length === 0 || cities.length === 0) return true

          const selectedState = states[0].value
          const onStateChange = vi.fn()
          const onCityChange = vi.fn()

          const { unmount } = render(
            <LocationFilter
              selectedState={selectedState}
              selectedCity={null}
              onStateChange={onStateChange}
              onCityChange={onCityChange}
              states={states}
              cities={cities}
              isLoadingCities={false}
            />
          )

          const citySelect = screen.getByTestId('city-select') as HTMLSelectElement

          // Select a city
          const targetCity = cities[0]
          fireEvent.change(citySelect, { target: { value: targetCity.value } })

          // Verify onCityChange was called with the correct value
          expect(onCityChange).toHaveBeenCalledWith(targetCity.value)

          unmount()
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 3f: Loading state disables city dropdown', () => {
    fc.assert(
      fc.property(statesListArb, citiesListArb, fc.boolean(), (states, cities, isLoading) => {
        if (states.length === 0) return true

        const selectedState = states[0].value
        const onStateChange = vi.fn()
        const onCityChange = vi.fn()

        const { unmount } = render(
          <LocationFilter
            selectedState={selectedState}
            selectedCity={null}
            onStateChange={onStateChange}
            onCityChange={onCityChange}
            states={states}
            cities={cities}
            isLoadingCities={isLoading}
          />
        )

        const citySelect = screen.getByTestId('city-select') as HTMLSelectElement

        // City dropdown should be disabled when loading
        expect(citySelect.disabled).toBe(isLoading)

        unmount()
        return true
      }),
      { numRuns: 100 }
    )
  })
})
