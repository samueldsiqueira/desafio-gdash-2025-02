import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './Layout'
import { ThemeProvider } from '@/contexts/ThemeContext'
import * as AuthContext from '@/contexts/AuthContext'

const mockUseAuth = vi.fn()
vi.spyOn(AuthContext, 'useAuth').mockImplementation(mockUseAuth)

function renderWithRouter(initialRoute = '/') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/" element={<Layout />}>
            <Route index element={<div>Dashboard Content</div>} />
            <Route path="dashboard" element={<div>Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  )
}

describe('Layout - Protected Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading spinner while checking auth', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
    })

    renderWithRouter('/dashboard')

    // Check for loading spinner (the animate-spin class element)
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('should redirect to login when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
    })

    renderWithRouter('/dashboard')

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument()
  })

  it('should render protected content when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { _id: '1', email: 'test@test.com', name: 'Test User', role: 'admin' },
      token: 'valid-token',
      login: vi.fn(),
      logout: vi.fn(),
    })

    renderWithRouter('/dashboard')

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })

  it('should not redirect while loading even if not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
    })

    renderWithRouter('/dashboard')

    // Should show loading, not redirect to login
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument()
  })
})
