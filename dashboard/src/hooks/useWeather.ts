import { useState, useEffect, useCallback } from 'react'
import { WeatherLog, WeatherInsights, PaginatedResponse } from '@/types'
import weatherService, { WeatherLogsQuery } from '@/services/weather'

export interface LocationFilter {
  state?: string | null
  city?: string | null
}

export interface UseWeatherLogsResult {
  logs: WeatherLog[]
  total: number
  page: number
  totalPages: number
  isLoading: boolean
  isFetchingRealtime: boolean
  error: string | null
  setPage: (page: number) => void
  refresh: () => void
}

export interface UseWeatherInsightsResult {
  insights: WeatherInsights | null
  isLoading: boolean
  error: string | null
  refresh: () => void
}

export function useWeatherLogs(limit: number = 10, filter?: LocationFilter): UseWeatherLogsResult {
  const [data, setData] = useState<PaginatedResponse<WeatherLog> | null>(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingRealtime] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [filter?.state, filter?.city])

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const query: WeatherLogsQuery = { 
        page, 
        limit,
        ...(filter?.state && { state: filter.state }),
        ...(filter?.city && { city: filter.city }),
      }
      const response = await weatherService.getLogs(query)
      setData(response)
    } catch (err) {
      setError('Erro ao carregar dados climáticos')
      console.error('Error fetching weather logs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [page, limit, filter?.state, filter?.city])

  // Fetch logs when filter changes
  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return {
    logs: data?.data || [],
    total: data?.total || 0,
    page: data?.page || page,
    totalPages: data?.totalPages || 0,
    isLoading,
    isFetchingRealtime,
    error,
    setPage,
    refresh: fetchLogs,
  }
}


export function useWeatherInsights(filter?: LocationFilter): UseWeatherInsightsResult {
  const [insights, setInsights] = useState<WeatherInsights | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await weatherService.getInsights({
        ...(filter?.state && { state: filter.state }),
        ...(filter?.city && { city: filter.city }),
      })
      setInsights(response)
    } catch (err) {
      setError('Erro ao carregar insights')
      console.error('Error fetching insights:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filter?.state, filter?.city])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  return {
    insights,
    isLoading,
    error,
    refresh: fetchInsights,
  }
}

export function useAutoRefresh(callback: () => void, intervalMs: number = 60000) {
  useEffect(() => {
    // If interval is 0 or negative, auto-refresh is disabled
    if (intervalMs <= 0) {
      return
    }
    const interval = setInterval(callback, intervalMs)
    return () => clearInterval(interval)
  }, [callback, intervalMs])
}

// Storage key for auto-refresh interval (must match Settings.tsx)
const AUTO_REFRESH_STORAGE_KEY = 'autoRefreshInterval'

/**
 * Hook to get the persisted auto-refresh interval from localStorage.
 * Returns the interval in milliseconds, or 0 if disabled.
 */
export function useAutoRefreshInterval(): number {
  const [intervalMs, setIntervalMs] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(AUTO_REFRESH_STORAGE_KEY)
      if (stored !== null) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed) && parsed >= 0) {
          return parsed * 1000 // Convert seconds to milliseconds
        }
      }
    }
    return 60000 // Default: 60 seconds
  })

  // Listen for storage changes (e.g., from Settings page)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTO_REFRESH_STORAGE_KEY && e.newValue !== null) {
        const parsed = parseInt(e.newValue, 10)
        if (!isNaN(parsed) && parsed >= 0) {
          setIntervalMs(parsed * 1000)
        }
      }
    }

    // Also poll localStorage periodically for same-tab updates
    const pollInterval = setInterval(() => {
      const stored = localStorage.getItem(AUTO_REFRESH_STORAGE_KEY)
      if (stored !== null) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed) && parsed >= 0) {
          setIntervalMs(parsed * 1000)
        }
      }
    }, 1000)

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(pollInterval)
    }
  }, [])

  return intervalMs
}
