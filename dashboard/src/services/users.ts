import api from './api'
import { User } from '@/types'

export interface CreateUserDto {
  email: string
  password: string
  name: string
  role: 'admin' | 'user'
}

export interface UpdateUserDto {
  email?: string
  password?: string
  name?: string
  role?: 'admin' | 'user'
}

export const usersService = {
  async getAll(): Promise<User[]> {
    const response = await api.get<User[]>('/users')
    return response.data
  },

  async getById(id: string): Promise<User> {
    const response = await api.get<User>(`/users/${id}`)
    return response.data
  },

  async create(data: CreateUserDto): Promise<User> {
    const response = await api.post<User>('/users', data)
    return response.data
  },

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const response = await api.patch<User>(`/users/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`)
  },
}

export default usersService
