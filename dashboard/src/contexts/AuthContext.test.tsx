import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import api from '@/services/api'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

// Create a proper localStorage mock that tracks state
let localStorageStore: Record<string, string> = {}

const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = value
  },
  removeItem: (key: string) => {
    delete localStorageStore[key]
  },
  clear: () => {
    localStorageStore = {}
  },
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

function TestComponent() {
  const { isAuthenticated, user, login, logout, isLoading } = useAuth()
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'loading' : 'ready'}</span>
      <span data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="user">{user?.email || 'none'}</span>
      <button onClick={() => login({ email: 'test@test.com', password: 'pass' })}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageStore = {}
  })

  afterEach(() => {
    vi.resetAllMocks()
    localStorageStore = {}
  })


  it('should start with unauthenticated state when no token exists', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('No token'))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('no')
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })

  it('should restore auth state from stored token', async () => {
    const mockUser = { _id: '1', email: 'test@test.com', name: 'Test', role: 'user' }
    // Set token BEFORE rendering
    localStorageStore['token'] = 'valid-token'
    vi.mocked(api.get).mockResolvedValue({ data: mockUser })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes')
    })
    expect(screen.getByTestId('user')).toHaveTextContent('test@test.com')
  })

  it('should clear auth state when stored token is invalid', async () => {
    // Set token BEFORE rendering
    localStorageStore['token'] = 'invalid-token'
    vi.mocked(api.get).mockRejectedValue(new Error('Invalid token'))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('no')
    // Token should be removed from store after failed validation
    await waitFor(() => {
      expect(localStorageStore['token']).toBeUndefined()
    })
  })

  it('should login successfully and store token', async () => {
    const mockUser = { _id: '1', email: 'test@test.com', name: 'Test', role: 'user' }
    const mockResponse = { access_token: 'new-token', user: mockUser }
    vi.mocked(api.get).mockRejectedValue(new Error('No token'))
    vi.mocked(api.post).mockResolvedValue({ data: mockResponse })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    await act(async () => {
      screen.getByText('Login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes')
    })

    expect(localStorageStore['token']).toBe('new-token')
    expect(screen.getByTestId('user')).toHaveTextContent('test@test.com')
  })

  it('should logout and clear token', async () => {
    const mockUser = { _id: '1', email: 'test@test.com', name: 'Test', role: 'user' }
    // Set token BEFORE rendering
    localStorageStore['token'] = 'valid-token'
    vi.mocked(api.get).mockResolvedValue({ data: mockUser })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes')
    })

    await act(async () => {
      screen.getByText('Logout').click()
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('no')
    expect(localStorageStore['token']).toBeUndefined()
  })

  it('should throw error when useAuth is used outside AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within an AuthProvider')
    
    consoleError.mockRestore()
  })
})
