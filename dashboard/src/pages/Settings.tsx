import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Sun, Moon, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/contexts/ThemeContext'

// Storage key for auto-refresh interval
const AUTO_REFRESH_STORAGE_KEY = 'autoRefreshInterval'

// Available refresh intervals in seconds
const REFRESH_INTERVALS = [
  { value: 30, label: '30 segundos' },
  { value: 60, label: '1 minuto' },
  { value: 120, label: '2 minutos' },
  { value: 300, label: '5 minutos' },
  { value: 0, label: 'Desativado' },
]

// Helper to get stored refresh interval
function getStoredRefreshInterval(): number {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(AUTO_REFRESH_STORAGE_KEY)
    if (stored !== null) {
      const parsed = parseInt(stored, 10)
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed
      }
    }
  }
  return 60 // Default: 1 minute
}

export function Settings() {
  const { theme, setTheme } = useTheme()
  const [refreshInterval, setRefreshInterval] = useState<number>(getStoredRefreshInterval)

  // Persist refresh interval to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, String(refreshInterval))
    } catch {
      // localStorage unavailable, silently fail
    }
  }, [refreshInterval])

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
  }

  const handleRefreshIntervalChange = (interval: number) => {
    setRefreshInterval(interval)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Personalize sua experiência no painel
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Theme Settings */}
        <Card data-testid="theme-settings-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              Tema
            </CardTitle>
            <CardDescription>
              Escolha entre tema claro ou escuro para o painel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                onClick={() => handleThemeChange('light')}
                className="flex items-center gap-2"
                data-testid="theme-light-btn"
              >
                <Sun className="h-4 w-4" />
                Claro
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                onClick={() => handleThemeChange('dark')}
                className="flex items-center gap-2"
                data-testid="theme-dark-btn"
              >
                <Moon className="h-4 w-4" />
                Escuro
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Tema atual: <span className="font-medium" data-testid="current-theme">{theme === 'dark' ? 'Escuro' : 'Claro'}</span>
            </p>
          </CardContent>
        </Card>

        {/* Auto-Refresh Settings */}
        <Card data-testid="refresh-settings-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Atualização Automática
            </CardTitle>
            <CardDescription>
              Configure o intervalo de atualização automática dos dados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {REFRESH_INTERVALS.map((interval) => (
                <Button
                  key={interval.value}
                  variant={refreshInterval === interval.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleRefreshIntervalChange(interval.value)}
                  data-testid={`refresh-interval-${interval.value}`}
                >
                  {interval.label}
                </Button>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Intervalo atual:{' '}
              <span className="font-medium" data-testid="current-refresh-interval">
                {refreshInterval === 0
                  ? 'Desativado'
                  : refreshInterval < 60
                  ? `${refreshInterval} segundos`
                  : `${refreshInterval / 60} minuto${refreshInterval > 60 ? 's' : ''}`}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Export for external use
export { AUTO_REFRESH_STORAGE_KEY, REFRESH_INTERVALS, getStoredRefreshInterval }
