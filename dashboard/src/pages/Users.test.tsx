import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Users } from './Users'
import { User } from '@/types'

// Mock the users service module
const mockGetAll = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/services/users', () => ({
  default: {
    getAll: () => mockGetAll(),
    create: (data: unknown) => mockCreate(data),
    update: (id: string, data: unknown) => mockUpdate(id, data),
    delete: (id: string) => mockDelete(id),
  },
  usersService: {
    getAll: () => mockGetAll(),
    create: (data: unknown) => mockCreate(data),
    update: (id: string, data: unknown) => mockUpdate(id, data),
    delete: (id: string) => mockDelete(id),
  },
}))

const mockUsers: User[] = [
  {
    _id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    _id: '2',
    email: 'user@example.com',
    name: 'Regular User',
    role: 'user',
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
]

function renderUsers() {
  return render(
    <BrowserRouter>
      <Users />
    </BrowserRouter>
  )
}

describe('Users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAll.mockResolvedValue([])
  })

  describe('User Table Rendering', () => {
    it('should render page title', async () => {
      mockGetAll.mockResolvedValue([])
      renderUsers()
      
      await waitFor(() => {
        expect(screen.getByText('Usuários')).toBeInTheDocument()
      })
    })

    it('should render users table after loading', async () => {
      mockGetAll.mockResolvedValue(mockUsers)
      renderUsers()

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
        expect(screen.getByText('Regular User')).toBeInTheDocument()
      })
    })

    it('should display user email in table', async () => {
      mockGetAll.mockResolvedValue(mockUsers)
      renderUsers()

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument()
        expect(screen.getByText('user@example.com')).toBeInTheDocument()
      })
    })

    it('should display user role badges', async () => {
      mockGetAll.mockResolvedValue(mockUsers)
      renderUsers()

      await waitFor(() => {
        expect(screen.getByText('Administrador')).toBeInTheDocument()
        expect(screen.getByText('Usuário')).toBeInTheDocument()
      })
    })

    it('should show empty state when no users', async () => {
      mockGetAll.mockResolvedValue([])
      renderUsers()

      await waitFor(() => {
        expect(screen.getByText('Nenhum usuário cadastrado')).toBeInTheDocument()
      })
    })

    it('should show error state on fetch failure', async () => {
      mockGetAll.mockRejectedValue(new Error('Network error'))
      renderUsers()

      await waitFor(() => {
        expect(screen.getByText('Erro ao carregar usuários')).toBeInTheDocument()
      })
    })
  })

  describe('User Form Validation', () => {
    it('should open create dialog when clicking new user button', async () => {
      mockGetAll.mockResolvedValue(mockUsers)
      renderUsers()

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /novo usuário/i }))

      await waitFor(() => {
        expect(screen.getByText('Preencha os dados para criar um novo usuário')).toBeInTheDocument()
      })
    })

    it('should show validation error for empty name', async () => {
      mockGetAll.mockResolvedValue(mockUsers)
      renderUsers()

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /novo usuário/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /criar/i }))

      await waitFor(() => {
        expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument()
      })
    })

    it('should show validation error for empty email', async () => {
      mockGetAll.mockResolvedValue(mockUsers)
      renderUsers()

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /novo usuário/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Test User' } })
      fireEvent.click(screen.getByRole('button', { name: /criar/i }))

      await waitFor(() => {
        expect(screen.getByText('Email é obrigatório')).toBeInTheDocument()
      })
    })

    it('should show validation error for empty password on create', async () => {
      mockGetAll.mockResolvedValue(mockUsers)
      renderUsers()

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /novo usuário/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Test User' } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
      fireEvent.click(screen.getByRole('button', { name: /criar/i }))

      await waitFor(() => {
        expect(screen.getByText('Senha é obrigatória')).toBeInTheDocument()
      })
    })
  })

  describe('CRUD Operations', () => {
    it('should create user successfully', async () => {
      mockGetAll.mockResolvedValue(mockUsers)
      mockCreate.mockResolvedValue({
        _id: '3',
        email: 'new@example.com',
        name: 'New User',
        role: 'user',
        createdAt: '2025-01-03T00:00:00Z',
        updatedAt: '2025-01-03T00:00:00Z',
      })
      renderUsers()

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /novo usuário/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'New User' } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'new@example.com' } })
      fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'password123' } })
      fireEvent.click(screen.getByRole('button', { name: /criar/i }))

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          email: 'new@example.com',
          password: 'password123',
          name: 'New User',
          role: 'user',
        })
      })
    })

    it('should open edit dialog with user data', async () => {
      mockGetAll.mockResolvedValue(mockUsers)
      renderUsers()

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByLabelText('Editar Admin User'))

      await waitFor(() => {
        expect(screen.getByText('Editar Usuário')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Admin User')).toBeInTheDocument()
        expect(screen.getByDisplayValue('admin@example.com')).toBeInTheDocument()
      })
    })

    it('should update user successfully', async () => {
      mockGetAll.mockResolvedValue(mockUsers)
      mockUpdate.mockResolvedValue({
        ...mockUsers[0],
        name: 'Updated Admin',
      })
      renderUsers()

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByLabelText('Editar Admin User'))

      await waitFor(() => {
        expect(screen.getByDisplayValue('Admin User')).toBeInTheDocument()
      })

      const nameInput = screen.getByDisplayValue('Admin User')
      fireEvent.change(nameInput, { target: { value: 'Updated Admin' } })
      fireEvent.click(screen.getByRole('button', { name: /salvar/i }))

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith('1', {
          email: 'admin@example.com',
          name: 'Updated Admin',
          role: 'admin',
        })
      })
    })

    it('should open delete confirmation dialog', async () => {
      mockGetAll.mockResolvedValue(mockUsers)
      renderUsers()

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByLabelText('Deletar Admin User'))

      await waitFor(() => {
        expect(screen.getByText('Confirmar Exclusão')).toBeInTheDocument()
        expect(screen.getByText(/tem certeza que deseja excluir o usuário "Admin User"/i)).toBeInTheDocument()
      })
    })

    it('should delete user successfully', async () => {
      mockGetAll.mockResolvedValue(mockUsers)
      mockDelete.mockResolvedValue(undefined)
      renderUsers()

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByLabelText('Deletar Admin User'))

      await waitFor(() => {
        expect(screen.getByText('Confirmar Exclusão')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /excluir/i }))

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith('1')
      })
    })

    it('should close create dialog on cancel', async () => {
      mockGetAll.mockResolvedValue(mockUsers)
      renderUsers()

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /novo usuário/i }))

      await waitFor(() => {
        expect(screen.getByText('Preencha os dados para criar um novo usuário')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))

      await waitFor(() => {
        expect(screen.queryByText('Preencha os dados para criar um novo usuário')).not.toBeInTheDocument()
      })
    })
  })
})
