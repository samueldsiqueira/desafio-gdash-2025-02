/**
 * Property-based tests for ThemeContext
 * Tests the correctness properties defined in the design document
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import * as fc from 'fast-check'
import {
  ThemeProvider,
  useTheme,
  Theme,
  serializeTheme,
  deserializeTheme,
  THEME_STORAGE_KEY,
} from './ThemeContext'

// Generator for valid theme values
const themeArb: fc.Arbitrary<Theme> = fc.constantFrom('light', 'dark')

// Test component to access theme context
function TestComponent() {
  const { theme, toggleTheme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button data-testid="toggle" onClick={toggleTheme}>
        Toggle
      </button>
      <button data-testid="set-light" onClick={() => setTheme('light')}>
        Light
      </button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>
        Dark
      </button>
    </div>
  )
}

// localStorage mock
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

// matchMedia mock
let mockSystemPreference: 'light' | 'dark' = 'light'

const matchMediaMock = (query: string) => ({
  matches: query === '(prefers-color-scheme: dark)' ? mockSystemPreference === 'dark' : false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})

describe('ThemeContext Property Tests', () => {
  beforeEach(() => {
    localStorageStore = {}
    mockSystemPreference = 'light'
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
    Object.defineProperty(window, 'matchMedia', {
      value: matchMediaMock,
      writable: true,
    })
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    localStorageStore = {}
    document.documentElement.classList.remove('dark')
  })

  /**
   * **Feature: dark-theme-toggle, Property 1: Alternância inverte o tema**
   * **Validates: Requirements 1.1**
   *
   * For any theme state (light or dark), calling toggleTheme should result in the opposite state.
   */
  it('Property 1: Toggle inverts the theme for any initial theme', () => {
    fc.assert(
      fc.property(themeArb, (initialTheme) => {
        localStorageStore[THEME_STORAGE_KEY] = initialTheme

        const { unmount } = render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        )

        // Verify initial theme
        expect(screen.getByTestId('theme').textContent).toBe(initialTheme)

        // Toggle theme
        act(() => {
          screen.getByTestId('toggle').click()
        })

        // Verify theme is inverted
        const expectedTheme = initialTheme === 'light' ? 'dark' : 'light'
        expect(screen.getByTestId('theme').textContent).toBe(expectedTheme)

        unmount()
        localStorageStore = {}
        document.documentElement.classList.remove('dark')
      }),
      { numRuns: 100 }
    )
  })


  /**
   * **Feature: dark-theme-toggle, Property 2: Classe CSS reflete o estado do tema**
   * **Validates: Requirements 1.2, 4.1**
   *
   * For any theme set, the document root element should have the 'dark' class
   * if and only if the theme is dark.
   */
  it('Property 2: CSS class reflects theme state for any theme', () => {
    fc.assert(
      fc.property(themeArb, (theme) => {
        localStorageStore[THEME_STORAGE_KEY] = theme

        const { unmount } = render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        )

        // Verify CSS class matches theme
        const hasDarkClass = document.documentElement.classList.contains('dark')
        expect(hasDarkClass).toBe(theme === 'dark')

        unmount()
        localStorageStore = {}
        document.documentElement.classList.remove('dark')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: dark-theme-toggle, Property 3: Round-trip de persistência**
   * **Validates: Requirements 2.1, 2.2**
   *
   * For any theme saved to localStorage, when initializing ThemeProvider,
   * the restored theme should be equivalent to the saved theme.
   */
  it('Property 3: Persistence round-trip for any theme', () => {
    fc.assert(
      fc.property(themeArb, (theme) => {
        // Save theme to localStorage
        localStorageStore[THEME_STORAGE_KEY] = theme

        // Initialize provider (simulates page reload)
        const { unmount } = render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        )

        // Verify theme is restored correctly
        expect(screen.getByTestId('theme').textContent).toBe(theme)

        unmount()
        localStorageStore = {}
        document.documentElement.classList.remove('dark')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: dark-theme-toggle, Property 4: Preferência do sistema como padrão**
   * **Validates: Requirements 2.3**
   *
   * For any system theme preference (light or dark), when there is no value
   * in localStorage, the initial theme should match the system preference.
   */
  it('Property 4: System preference as default for any system theme', () => {
    fc.assert(
      fc.property(themeArb, (systemTheme) => {
        // Clear localStorage to ensure no stored preference
        localStorageStore = {}
        mockSystemPreference = systemTheme

        const { unmount } = render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        )

        // Verify theme matches system preference
        expect(screen.getByTestId('theme').textContent).toBe(systemTheme)

        unmount()
        document.documentElement.classList.remove('dark')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: dark-theme-toggle, Property 5: Serialização round-trip**
   * **Validates: Requirements 4.3**
   *
   * For any valid theme value, serializing to string and deserializing
   * should produce the same value.
   */
  it('Property 5: Serialization round-trip for any theme', () => {
    fc.assert(
      fc.property(themeArb, (theme) => {
        const serialized = serializeTheme(theme)
        const deserialized = deserializeTheme(serialized)

        expect(deserialized).toBe(theme)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Additional test: deserializeTheme returns null for invalid values
   */
  it('deserializeTheme returns null for invalid values', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s !== 'light' && s !== 'dark'),
        (invalidValue) => {
          const result = deserializeTheme(invalidValue)
          expect(result).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test: useTheme throws error when used outside provider
   */
  it('useTheme throws error when used outside ThemeProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useTheme must be used within a ThemeProvider')

    consoleError.mockRestore()
  })
})
