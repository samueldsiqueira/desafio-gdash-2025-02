/**
 * Unit tests for LocationFilter component
 * **Validates: Requirements 4.1, 4.2**
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationFilter, StateOption, CityOption } from './LocationFilter'

// Sample test data
const mockStates: StateOption[] = [
  { value: 'SP', label: 'São Paulo' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'MG', label: 'Minas Gerais' },
]

const mockCities: CityOption[] = [
  { value: 'Campinas', label: 'Campinas' },
  { value: 'Santos', label: 'Santos' },
  { value: 'Ribeirão Preto', label: 'Ribeirão Preto' },
]

describe('LocationFilter', () => {
  let onStateChange: ReturnType<typeof vi.fn>
  let onCityChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onStateChange = vi.fn()
    onCityChange = vi.fn()
  })

  describe('Dropdown Rendering', () => {
    it('renders the location filter container', () => {
      render(
        <LocationFilter
          selectedState={null}
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={[]}
        />
      )

      expect(screen.getByTestId('location-filter')).toBeInTheDocument()
    })

    it('renders the state dropdown with all states', () => {
      render(
        <LocationFilter
          selectedState={null}
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={[]}
        />
      )

      const stateSelect = screen.getByTestId('state-select') as HTMLSelectElement
      expect(stateSelect).toBeInTheDocument()

      // Check all states are rendered (plus the placeholder option)
      const options = Array.from(stateSelect.options)
      expect(options).toHaveLength(mockStates.length + 1)

      mockStates.forEach((state) => {
        expect(screen.getByText(state.label)).toBeInTheDocument()
      })
    })

    it('renders the city dropdown', () => {
      render(
        <LocationFilter
          selectedState="SP"
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={mockCities}
        />
      )

      const citySelect = screen.getByTestId('city-select') as HTMLSelectElement
      expect(citySelect).toBeInTheDocument()

      // Check all cities are rendered (plus the placeholder option)
      const options = Array.from(citySelect.options)
      expect(options).toHaveLength(mockCities.length + 1)
    })

    it('renders labels for both dropdowns', () => {
      render(
        <LocationFilter
          selectedState={null}
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={[]}
        />
      )

      expect(screen.getByText('Estado')).toBeInTheDocument()
      expect(screen.getByText('Município')).toBeInTheDocument()
    })

    it('renders the location filter icon and label', () => {
      render(
        <LocationFilter
          selectedState={null}
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={[]}
        />
      )

      expect(screen.getByText('Filtrar por localização:')).toBeInTheDocument()
    })
  })

  describe('State Selection Behavior', () => {
    it('calls onStateChange when a state is selected', () => {
      render(
        <LocationFilter
          selectedState={null}
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={[]}
        />
      )

      const stateSelect = screen.getByTestId('state-select')
      fireEvent.change(stateSelect, { target: { value: 'SP' } })

      expect(onStateChange).toHaveBeenCalledWith('SP')
    })

    it('calls onStateChange with null when state is cleared', () => {
      render(
        <LocationFilter
          selectedState="SP"
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={mockCities}
        />
      )

      const stateSelect = screen.getByTestId('state-select')
      fireEvent.change(stateSelect, { target: { value: '' } })

      expect(onStateChange).toHaveBeenCalledWith(null)
    })

    it('displays the selected state value', () => {
      render(
        <LocationFilter
          selectedState="RJ"
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={[]}
        />
      )

      const stateSelect = screen.getByTestId('state-select') as HTMLSelectElement
      expect(stateSelect.value).toBe('RJ')
    })

    it('disables state dropdown when loading states', () => {
      render(
        <LocationFilter
          selectedState={null}
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={[]}
          isLoadingStates={true}
        />
      )

      const stateSelect = screen.getByTestId('state-select') as HTMLSelectElement
      expect(stateSelect.disabled).toBe(true)
    })

    it('shows loading text when states are loading', () => {
      render(
        <LocationFilter
          selectedState={null}
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={[]}
          cities={[]}
          isLoadingStates={true}
        />
      )

      expect(screen.getByText('Carregando...')).toBeInTheDocument()
    })
  })

  describe('City Loading on State Change', () => {
    it('disables city dropdown when no state is selected', () => {
      render(
        <LocationFilter
          selectedState={null}
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={[]}
        />
      )

      const citySelect = screen.getByTestId('city-select') as HTMLSelectElement
      expect(citySelect.disabled).toBe(true)
    })

    it('enables city dropdown when a state is selected', () => {
      render(
        <LocationFilter
          selectedState="SP"
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={mockCities}
        />
      )

      const citySelect = screen.getByTestId('city-select') as HTMLSelectElement
      expect(citySelect.disabled).toBe(false)
    })

    it('shows placeholder text when no state is selected', () => {
      render(
        <LocationFilter
          selectedState={null}
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={[]}
        />
      )

      const citySelect = screen.getByTestId('city-select') as HTMLSelectElement
      expect(citySelect.options[0].text).toBe('Selecione um estado')
    })

    it('shows loading text when cities are loading', () => {
      render(
        <LocationFilter
          selectedState="SP"
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={[]}
          isLoadingCities={true}
        />
      )

      const citySelect = screen.getByTestId('city-select') as HTMLSelectElement
      expect(citySelect.options[0].text).toBe('Carregando...')
    })

    it('disables city dropdown when cities are loading', () => {
      render(
        <LocationFilter
          selectedState="SP"
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={[]}
          isLoadingCities={true}
        />
      )

      const citySelect = screen.getByTestId('city-select') as HTMLSelectElement
      expect(citySelect.disabled).toBe(true)
    })

    it('displays cities when state is selected and cities are loaded', () => {
      render(
        <LocationFilter
          selectedState="SP"
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={mockCities}
        />
      )

      mockCities.forEach((city) => {
        expect(screen.getByText(city.label)).toBeInTheDocument()
      })
    })

    it('calls onCityChange when a city is selected', () => {
      render(
        <LocationFilter
          selectedState="SP"
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={mockCities}
        />
      )

      const citySelect = screen.getByTestId('city-select')
      fireEvent.change(citySelect, { target: { value: 'Campinas' } })

      expect(onCityChange).toHaveBeenCalledWith('Campinas')
    })

    it('calls onCityChange with null when city is cleared', () => {
      render(
        <LocationFilter
          selectedState="SP"
          selectedCity="Campinas"
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={mockCities}
        />
      )

      const citySelect = screen.getByTestId('city-select')
      fireEvent.change(citySelect, { target: { value: '' } })

      expect(onCityChange).toHaveBeenCalledWith(null)
    })

    it('displays the selected city value', () => {
      render(
        <LocationFilter
          selectedState="SP"
          selectedCity="Campinas"
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={mockCities}
        />
      )

      const citySelect = screen.getByTestId('city-select') as HTMLSelectElement
      expect(citySelect.value).toBe('Campinas')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty states array', () => {
      render(
        <LocationFilter
          selectedState={null}
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={[]}
          cities={[]}
        />
      )

      const stateSelect = screen.getByTestId('state-select') as HTMLSelectElement
      // Only placeholder option should be present
      expect(stateSelect.options).toHaveLength(1)
    })

    it('handles empty cities array when state is selected', () => {
      render(
        <LocationFilter
          selectedState="SP"
          selectedCity={null}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          states={mockStates}
          cities={[]}
        />
      )

      const citySelect = screen.getByTestId('city-select') as HTMLSelectElement
      // Only placeholder option should be present
      expect(citySelect.options).toHaveLength(1)
    })
  })
})
