import { useCallback, useMemo } from 'react'
import { RefreshCw, CloudRain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WeatherTable, WeatherCharts, ExportButtons, LocationFilter } from '@/components/weather'
import { useWeatherLogs, useAutoRefresh, useAutoRefreshInterval } from '@/hooks/useWeather'
import { useLocationFilter } from '@/hooks/useLocationFilter'

export function Weather() {
  const {
    states,
    cities,
    selectedState,
    selectedCity,
    setSelectedState,
    setSelectedCity,
    isLoadingStates,
    isLoadingCities,
    error: locationError,
  } = useLocationFilter()

  const locationFilter = useMemo(() => ({
    state: selectedState,
    city: selectedCity,
  }), [selectedState, selectedCity])

  const { logs, page, totalPages, isLoading, error, setPage, refresh } = useWeatherLogs(15, locationFilter)

  const handleRefresh = useCallback(() => {
    refresh()
  }, [refresh])

  // Auto-refresh using persisted interval from Settings
  const autoRefreshIntervalMs = useAutoRefreshInterval()
  useAutoRefresh(handleRefresh, autoRefreshIntervalMs)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CloudRain className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clima</h1>
            <p className="text-muted-foreground">
              Dados climáticos detalhados e histórico completo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ExportButtons disabled={logs.length === 0} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            data-testid="refresh-btn"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md" data-testid="error-message">
          {error}
        </div>
      )}

      {locationError && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md" data-testid="location-error-message">
          {locationError}
        </div>
      )}

      <LocationFilter
        selectedState={selectedState}
        selectedCity={selectedCity}
        onStateChange={setSelectedState}
        onCityChange={setSelectedCity}
        states={states}
        cities={cities}
        isLoadingStates={isLoadingStates}
        isLoadingCities={isLoadingCities}
        onCollectionSuccess={refresh}
      />

      <WeatherCharts logs={logs} isLoading={isLoading} />

      <WeatherTable
        logs={logs}
        page={page}
        totalPages={totalPages}
        isLoading={isLoading}
        onPageChange={setPage}
      />
    </div>
  )
}
