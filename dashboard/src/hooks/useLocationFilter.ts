import { useState, useEffect, useCallback, useMemo } from 'react'
import { StateOption, CityOption } from '@/components/weather/LocationFilter'

// Brazilian states data (static)
const BRAZILIAN_STATES: StateOption[] = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
]

// IBGE API for cities
const IBGE_API_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades'

interface IBGECity {
  id: number
  nome: string
}

export interface UseLocationFilterResult {
  states: StateOption[]
  cities: CityOption[]
  selectedState: string | null
  selectedCity: string | null
  setSelectedState: (state: string | null) => void
  setSelectedCity: (city: string | null) => void
  isLoadingStates: boolean
  isLoadingCities: boolean
  error: string | null
}

export function useLocationFilter(): UseLocationFilterResult {
  const [selectedState, setSelectedStateInternal] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [cities, setCities] = useState<CityOption[]>([])
  const [isLoadingCities, setIsLoadingCities] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // States are static, so no loading needed
  const states = useMemo(() => BRAZILIAN_STATES, [])
  const isLoadingStates = false

  // Fetch cities when state changes
  const fetchCities = useCallback(async (stateCode: string) => {
    setIsLoadingCities(true)
    setError(null)
    try {
      const response = await fetch(
        `${IBGE_API_BASE}/estados/${stateCode}/municipios?orderBy=nome`
      )
      if (!response.ok) {
        throw new Error('Erro ao carregar municípios')
      }
      const data: IBGECity[] = await response.json()
      const cityOptions: CityOption[] = data.map((city) => ({
        value: city.nome,
        label: city.nome,
      }))
      setCities(cityOptions)
    } catch (err) {
      setError('Erro ao carregar municípios')
      console.error('Error fetching cities:', err)
      setCities([])
    } finally {
      setIsLoadingCities(false)
    }
  }, [])

  // Handle state change with cascading behavior
  const setSelectedState = useCallback((state: string | null) => {
    setSelectedStateInternal(state)
    // Reset city when state changes (cascading behavior)
    setSelectedCity(null)
    setCities([])
  }, [])

  // Fetch cities when state is selected
  useEffect(() => {
    if (selectedState) {
      fetchCities(selectedState)
    }
  }, [selectedState, fetchCities])

  return {
    states,
    cities,
    selectedState,
    selectedCity,
    setSelectedState,
    setSelectedCity,
    isLoadingStates,
    isLoadingCities,
    error,
  }
}
