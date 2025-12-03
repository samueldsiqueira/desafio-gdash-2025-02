import { useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WeatherCards, WeatherTable, WeatherCharts, ExportButtons, InsightsPanel } from '@/components/weather'
import { useWeatherLogs, useWeatherInsights, useAutoRefresh } from '@/hooks/useWeather'

export function Dashboard() {
  const { logs, page, totalPages, isLoading, error, setPage, refresh } = useWeatherLogs(10)
  const { insights, isLoading: insightsLoading, error: insightsError, refresh: refreshInsights } = useWeatherInsights()

  const latestLog = logs.length > 0 ? logs[0] : null

  const handleRefresh = useCallback(() => {
    refresh()
    refreshInsights()
  }, [refresh, refreshInsights])

  // Auto-refresh every 60 seconds
  useAutoRefresh(handleRefresh, 60000)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral das condições climáticas
          </p>
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

      {insightsError && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md" data-testid="insights-error-message">
          {insightsError}
        </div>
      )}

      <WeatherCards weatherLog={latestLog} isLoading={isLoading} />

      <InsightsPanel insights={insights} isLoading={insightsLoading} />

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
