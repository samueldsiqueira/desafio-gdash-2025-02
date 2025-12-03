import { useState, useEffect, useCallback } from 'react'
import { WeatherLog, WeatherInsights, PaginatedResponse } from '@/types'
import weatherService, { WeatherLogsQuery } from '@/services/weather'

export interface UseWeatherLogsResult {
  logs: WeatherLog[]
  total: number
  page: number
  totalPages: number
  isLoading: boolean
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

export function useWeatherLogs(limit: number = 10): UseWeatherLogsResult {
  const [data, setData] = useState<PaginatedResponse<WeatherLog> | null>(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const query: WeatherLogsQuery = { page, limit }
      const response = await weatherService.getLogs(query)
      setData(response)
    } catch (err) {
      setError('Erro ao carregar dados climáticos')
      console.error('Error fetching weather logs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return {
    logs: data?.data || [],
    total: data?.total || 0,
    page: data?.page || page,
    totalPages: data?.totalPages || 0,
    isLoading,
    error,
    setPage,
    refresh: fetchLogs,
  }
}


export function useWeatherInsights(): UseWeatherInsightsResult {
  const [insights, setInsights] = useState<WeatherInsights | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await weatherService.getInsights()
      setInsights(response)
    } catch (err) {
      setError('Erro ao carregar insights')
      console.error('Error fetching insights:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

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
    const interval = setInterval(callback, intervalMs)
    return () => clearInterval(interval)
  }, [callback, intervalMs])
}
