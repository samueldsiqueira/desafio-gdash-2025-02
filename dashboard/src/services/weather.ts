import api from './api'
import { WeatherLog, WeatherInsights, PaginatedResponse } from '@/types'

export interface WeatherLogsQuery {
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
  city?: string
}

export interface InsightsQuery {
  startDate?: string
  endDate?: string
}

export const weatherService = {
  async getLogs(query: WeatherLogsQuery = {}): Promise<PaginatedResponse<WeatherLog>> {
    const params = new URLSearchParams()
    if (query.page) params.append('page', query.page.toString())
    if (query.limit) params.append('limit', query.limit.toString())
    if (query.startDate) params.append('startDate', query.startDate)
    if (query.endDate) params.append('endDate', query.endDate)
    if (query.city) params.append('city', query.city)

    const response = await api.get<PaginatedResponse<WeatherLog>>(`/weather/logs?${params.toString()}`)
    return response.data
  },

  async getInsights(query: InsightsQuery = {}): Promise<WeatherInsights> {
    const params = new URLSearchParams()
    if (query.startDate) params.append('startDate', query.startDate)
    if (query.endDate) params.append('endDate', query.endDate)

    const response = await api.get<WeatherInsights>(`/weather/insights?${params.toString()}`)
    return response.data
  },

  async exportCsv(): Promise<Blob> {
    const response = await api.get('/weather/export/csv', {
      responseType: 'blob',
    })
    return response.data
  },

  async exportXlsx(): Promise<Blob> {
    const response = await api.get('/weather/export/xlsx', {
      responseType: 'blob',
    })
    return response.data
  },
}

export default weatherService
