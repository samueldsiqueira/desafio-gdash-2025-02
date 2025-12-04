import api from './api'
import { PaginatedResponse, PokemonListItem, PokemonDetail } from '@/types'

export const externalService = {
  async getItems(page: number = 1, limit: number = 20): Promise<PaginatedResponse<PokemonListItem>> {
    const response = await api.get<PaginatedResponse<PokemonListItem>>('/external/items', {
      params: { page, limit },
    })
    return response.data
  },

  async getItemDetail(id: string | number): Promise<PokemonDetail> {
    const response = await api.get<PokemonDetail>(`/external/items/${id}`)
    return response.data
  },
}

export default externalService
