import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from './theme-toggle'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Mock localStorage
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

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' ? false : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorageStore = {}
    document.documentElement.classList.remove('dark')
  })

  it('should render moon icon when theme is light', () => {
    localStorageStore['theme'] = 'light'
    
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    expect(screen.getByTestId('moon-icon')).toBeInTheDocument()
    expect(screen.queryByTestId('sun-icon')).not.toBeInTheDocument()
  })

  it('should render sun icon when theme is dark', () => {
    localStorageStore['theme'] = 'dark'
    
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    expect(screen.getByTestId('sun-icon')).toBeInTheDocument()
    expect(screen.queryByTestId('moon-icon')).not.toBeInTheDocument()
  })

  it('should call toggleTheme when clicked', () => {
    localStorageStore['theme'] = 'light'
    
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    // Initially shows moon (light theme)
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument()

    // Click to toggle
    fireEvent.click(screen.getByTestId('theme-toggle'))

    // Now should show sun (dark theme)
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument()
    expect(screen.queryByTestId('moon-icon')).not.toBeInTheDocument()
  })

  it('should have accessible aria-label', () => {
    localStorageStore['theme'] = 'light'
    
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const button = screen.getByTestId('theme-toggle')
    expect(button).toHaveAttribute('aria-label', 'Mudar para tema escuro')
  })

  it('should update aria-label when theme changes', () => {
    localStorageStore['theme'] = 'light'
    
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const button = screen.getByTestId('theme-toggle')
    expect(button).toHaveAttribute('aria-label', 'Mudar para tema escuro')

    fireEvent.click(button)

    expect(button).toHaveAttribute('aria-label', 'Mudar para tema claro')
  })
})
