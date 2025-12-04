import { useState } from 'react'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MapPin, RefreshCw } from 'lucide-react'
import { weatherService } from '@/services/weather'

export interface StateOption {
  value: string
  label: string
}

export interface CityOption {
  value: string
  label: string
}

export interface LocationFilterProps {
  selectedState: string | null
  selectedCity: string | null
  onStateChange: (state: string | null) => void
  onCityChange: (city: string | null) => void
  states: StateOption[]
  cities: CityOption[]
  isLoadingCities?: boolean
  isLoadingStates?: boolean
  onCollectionSuccess?: () => void
}

export function LocationFilter({
  selectedState,
  selectedCity,
  onStateChange,
  onCityChange,
  states,
  cities,
  isLoadingCities = false,
  isLoadingStates = false,
  onCollectionSuccess,
}: LocationFilterProps) {
  const [isCollecting, setIsCollecting] = useState(false)

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onStateChange(value === '' ? null : value)
  }

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onCityChange(value === '' ? null : value)
  }

  const handleCollect = async () => {
    if (!selectedState || !selectedCity) return

    setIsCollecting(true)
    try {
      await weatherService.fetchRealtime({
        state: selectedState,
        city: selectedCity,
      })
      onCollectionSuccess?.()
    } catch (error) {
      console.error('Erro ao coletar dados:', error)
    } finally {
      setIsCollecting(false)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-4" data-testid="location-filter">
      <div className="flex items-center gap-2 text-muted-foreground">
        <MapPin className="h-4 w-4" />
        <span className="text-sm font-medium">Filtrar por localização:</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="state-select" className="text-sm">
          Estado
        </Label>
        <Select
          id="state-select"
          data-testid="state-select"
          value={selectedState ?? ''}
          onChange={handleStateChange}
          disabled={isLoadingStates}
          className="w-48"
        >
          <option value="">
            {isLoadingStates ? 'Carregando...' : 'Todos os estados'}
          </option>
          {states.map((state) => (
            <option key={state.value} value={state.value}>
              {state.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="city-select" className="text-sm">
          Município
        </Label>
        <Select
          id="city-select"
          data-testid="city-select"
          value={selectedCity ?? ''}
          onChange={handleCityChange}
          disabled={!selectedState || isLoadingCities}
          className="w-56"
        >
          <option value="">
            {!selectedState
              ? 'Selecione um estado'
              : isLoadingCities
              ? 'Carregando...'
              : 'Todos os municípios'}
          </option>
          {cities.map((city) => (
            <option key={city.value} value={city.value}>
              {city.label}
            </option>
          ))}
        </Select>
      </div>

      <Button
        data-testid="collect-button"
        onClick={handleCollect}
        disabled={!selectedState || !selectedCity || isCollecting}
        size="sm"
      >
        <RefreshCw className={`h-4 w-4 ${isCollecting ? 'animate-spin' : ''}`} />
        {isCollecting ? 'Coletando...' : 'Coletar'}
      </Button>
    </div>
  )
}
