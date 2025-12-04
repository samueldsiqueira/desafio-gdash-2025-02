import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Types
export type Theme = 'light' | 'dark'

export interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

// Storage key constant
const THEME_STORAGE_KEY = 'theme'

// Serialization helpers for round-trip testing
export function serializeTheme(theme: Theme): string {
  return theme
}

export function deserializeTheme(value: string | null): Theme | null {
  if (value === 'light' || value === 'dark') {
    return value
  }
  return null
}

// Create context with undefined default
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

// Helper to get system preference
function getSystemPreference(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

// Helper to get initial theme
function getInitialTheme(): Theme {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    const deserialized = deserializeTheme(stored)
    if (deserialized) {
      return deserialized
    }
  }
  return getSystemPreference()
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  // Apply theme class to document and persist to localStorage
  useEffect(() => {
    const root = document.documentElement
    
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    
    try {
      localStorage.setItem(THEME_STORAGE_KEY, serializeTheme(theme))
    } catch {
      // localStorage unavailable, silently fail
    }
  }, [theme])

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Export for testing
export { THEME_STORAGE_KEY, getSystemPreference, getInitialTheme }
