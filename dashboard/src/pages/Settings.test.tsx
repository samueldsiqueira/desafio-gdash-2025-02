import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Settings, AUTO_REFRESH_STORAGE_KEY, REFRESH_INTERVALS } from './Settings'
import * as ThemeContext from '@/contexts/ThemeContext'

const mockSetTheme = vi.fn()
const mockToggleTheme = vi.fn()
const mockUseTheme = vi.fn()

vi.spyOn(ThemeContext, 'useTheme').mockImplementation(mockUseTheme)

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

function renderSettings() {
  return render(
    <BrowserRouter>
      <Settings />
    </BrowserRouter>
  )
}

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      toggleTheme: mockToggleTheme,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })


  describe('Page Header', () => {
    it('should render page title "Configurações"', () => {
      renderSettings()

      expect(screen.getByText('Configurações')).toBeInTheDocument()
    })

    it('should render page description', () => {
      renderSettings()

      expect(screen.getByText('Personalize sua experiência no painel')).toBeInTheDocument()
    })
  })

  describe('Theme Settings Card', () => {
    it('should render theme settings card', () => {
      renderSettings()

      expect(screen.getByTestId('theme-settings-card')).toBeInTheDocument()
    })

    it('should render theme title', () => {
      renderSettings()

      expect(screen.getByText('Tema')).toBeInTheDocument()
    })

    it('should render light theme button', () => {
      renderSettings()

      expect(screen.getByTestId('theme-light-btn')).toBeInTheDocument()
      expect(screen.getByTestId('theme-light-btn')).toHaveTextContent('Claro')
    })

    it('should render dark theme button', () => {
      renderSettings()

      expect(screen.getByTestId('theme-dark-btn')).toBeInTheDocument()
      expect(screen.getByTestId('theme-dark-btn')).toHaveTextContent('Escuro')
    })

    it('should display current theme as "Claro" when light theme is active', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
        toggleTheme: mockToggleTheme,
      })

      renderSettings()

      expect(screen.getByTestId('current-theme')).toHaveTextContent('Claro')
    })

    it('should display current theme as "Escuro" when dark theme is active', () => {
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
        toggleTheme: mockToggleTheme,
      })

      renderSettings()

      expect(screen.getByTestId('current-theme')).toHaveTextContent('Escuro')
    })

    it('should call setTheme with "light" when light button is clicked', () => {
      renderSettings()

      fireEvent.click(screen.getByTestId('theme-light-btn'))

      expect(mockSetTheme).toHaveBeenCalledWith('light')
    })

    it('should call setTheme with "dark" when dark button is clicked', () => {
      renderSettings()

      fireEvent.click(screen.getByTestId('theme-dark-btn'))

      expect(mockSetTheme).toHaveBeenCalledWith('dark')
    })
  })

  describe('Auto-Refresh Settings Card', () => {
    it('should render refresh settings card', () => {
      renderSettings()

      expect(screen.getByTestId('refresh-settings-card')).toBeInTheDocument()
    })

    it('should render auto-refresh title', () => {
      renderSettings()

      expect(screen.getByText('Atualização Automática')).toBeInTheDocument()
    })

    it('should render all refresh interval options', () => {
      renderSettings()

      REFRESH_INTERVALS.forEach((interval) => {
        expect(screen.getByTestId(`refresh-interval-${interval.value}`)).toBeInTheDocument()
      })
    })

    it('should display current refresh interval', () => {
      renderSettings()

      expect(screen.getByTestId('current-refresh-interval')).toBeInTheDocument()
    })

    it('should update refresh interval when button is clicked', () => {
      renderSettings()

      fireEvent.click(screen.getByTestId('refresh-interval-30'))

      expect(screen.getByTestId('current-refresh-interval')).toHaveTextContent('30 segundos')
    })

    it('should display "Desativado" when refresh interval is 0', () => {
      renderSettings()

      fireEvent.click(screen.getByTestId('refresh-interval-0'))

      expect(screen.getByTestId('current-refresh-interval')).toHaveTextContent('Desativado')
    })

    it('should persist refresh interval to localStorage', () => {
      renderSettings()

      fireEvent.click(screen.getByTestId('refresh-interval-120'))

      expect(localStorageMock.setItem).toHaveBeenCalledWith(AUTO_REFRESH_STORAGE_KEY, '120')
    })
  })

  describe('Settings Persistence', () => {
    it('should load refresh interval from localStorage on mount', () => {
      localStorageMock.getItem.mockReturnValue('300')

      renderSettings()

      expect(screen.getByTestId('current-refresh-interval')).toHaveTextContent('5 minutos')
    })

    it('should default to 1 minute when localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null)

      renderSettings()

      expect(screen.getByTestId('current-refresh-interval')).toHaveTextContent('1 minuto')
    })
  })
})
