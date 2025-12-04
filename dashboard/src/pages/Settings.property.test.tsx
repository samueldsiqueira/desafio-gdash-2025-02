/**
 * Property-based tests for Settings persistence
 * **Feature: dashboard-fixes, Property 4: Settings persistence**
 * **Validates: Requirements 6.3**
 *
 * For any setting change (theme, auto-refresh interval), the change SHALL be
 * persisted to localStorage and immediately reflected in the UI without
 * requiring a page refresh.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import * as fc from 'fast-check'
import { ThemeProvider, THEME_STORAGE_KEY, Theme } from '@/contexts/ThemeContext'
import { Settings, AUTO_REFRESH_STORAGE_KEY, REFRESH_INTERVALS } from './Settings'

// Generators for valid setting values
const themeArb: fc.Arbitrary<Theme> = fc.constantFrom('light', 'dark')
const refreshIntervalArb: fc.Arbitrary<number> = fc.constantFrom(
  ...REFRESH_INTERVALS.map((i) => i.value)
)

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
const matchMediaMock = (query: string) => ({
  matches: query === '(prefers-color-scheme: dark)' ? false : false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})

describe('Settings Property Tests', () => {
  beforeEach(() => {
    localStorageStore = {}
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
    cleanup()
    localStorageStore = {}
    document.documentElement.classList.remove('dark')
  })


  /**
   * **Feature: dashboard-fixes, Property 4: Settings persistence - Theme**
   * **Validates: Requirements 6.3**
   *
   * For any theme value, when the user changes the theme setting,
   * the change is persisted to localStorage and immediately reflected in the UI.
   */
  it('Property 4a: Theme changes are persisted to localStorage and reflected in UI', () => {
    fc.assert(
      fc.property(themeArb, themeArb, (initialTheme, newTheme) => {
        // Set initial theme
        localStorageStore[THEME_STORAGE_KEY] = initialTheme

        const { unmount } = render(
          <ThemeProvider>
            <Settings />
          </ThemeProvider>
        )

        // Verify initial theme is displayed
        const currentThemeDisplay = screen.getByTestId('current-theme')
        expect(currentThemeDisplay.textContent).toBe(
          initialTheme === 'dark' ? 'Escuro' : 'Claro'
        )

        // Change theme by clicking the appropriate button
        const buttonTestId = newTheme === 'dark' ? 'theme-dark-btn' : 'theme-light-btn'
        act(() => {
          screen.getByTestId(buttonTestId).click()
        })

        // Verify UI is immediately updated
        expect(currentThemeDisplay.textContent).toBe(
          newTheme === 'dark' ? 'Escuro' : 'Claro'
        )

        // Verify localStorage is updated
        expect(localStorageStore[THEME_STORAGE_KEY]).toBe(newTheme)

        unmount()
        localStorageStore = {}
        document.documentElement.classList.remove('dark')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: dashboard-fixes, Property 4: Settings persistence - Auto-refresh interval**
   * **Validates: Requirements 6.3**
   *
   * For any valid refresh interval, when the user changes the auto-refresh setting,
   * the change is persisted to localStorage and immediately reflected in the UI.
   */
  it('Property 4b: Auto-refresh interval changes are persisted to localStorage and reflected in UI', () => {
    fc.assert(
      fc.property(refreshIntervalArb, refreshIntervalArb, (initialInterval, newInterval) => {
        // Set initial interval
        localStorageStore[AUTO_REFRESH_STORAGE_KEY] = String(initialInterval)

        const { unmount } = render(
          <ThemeProvider>
            <Settings />
          </ThemeProvider>
        )

        // Change interval by clicking the appropriate button
        act(() => {
          screen.getByTestId(`refresh-interval-${newInterval}`).click()
        })

        // Verify localStorage is updated
        expect(localStorageStore[AUTO_REFRESH_STORAGE_KEY]).toBe(String(newInterval))

        // Verify UI reflects the change
        const currentIntervalDisplay = screen.getByTestId('current-refresh-interval')
        const expectedLabel = REFRESH_INTERVALS.find((i) => i.value === newInterval)?.label
        
        if (newInterval === 0) {
          expect(currentIntervalDisplay.textContent).toBe('Desativado')
        } else if (newInterval < 60) {
          expect(currentIntervalDisplay.textContent).toBe(`${newInterval} segundos`)
        } else {
          const minutes = newInterval / 60
          expect(currentIntervalDisplay.textContent).toBe(
            `${minutes} minuto${minutes > 1 ? 's' : ''}`
          )
        }

        unmount()
        localStorageStore = {}
        document.documentElement.classList.remove('dark')
      }),
      { numRuns: 100 }
    )
  })


  /**
   * **Feature: dashboard-fixes, Property 4: Settings persistence - Round-trip**
   * **Validates: Requirements 6.3**
   *
   * For any settings values, saving to localStorage and then re-initializing
   * the Settings component should restore the same values.
   */
  it('Property 4c: Settings round-trip persistence', () => {
    fc.assert(
      fc.property(themeArb, refreshIntervalArb, (theme, refreshInterval) => {
        // Set values in localStorage (simulating previous session)
        localStorageStore[THEME_STORAGE_KEY] = theme
        localStorageStore[AUTO_REFRESH_STORAGE_KEY] = String(refreshInterval)

        // Render Settings (simulates page load)
        const { unmount } = render(
          <ThemeProvider>
            <Settings />
          </ThemeProvider>
        )

        // Verify theme is restored
        const currentThemeDisplay = screen.getByTestId('current-theme')
        expect(currentThemeDisplay.textContent).toBe(
          theme === 'dark' ? 'Escuro' : 'Claro'
        )

        // Verify refresh interval is restored - check that the correct button is selected
        const intervalButton = screen.getByTestId(`refresh-interval-${refreshInterval}`)
        // The selected button should have the 'default' variant (not 'outline')
        // We can verify by checking the current interval display
        const currentIntervalDisplay = screen.getByTestId('current-refresh-interval')
        
        if (refreshInterval === 0) {
          expect(currentIntervalDisplay.textContent).toBe('Desativado')
        } else if (refreshInterval < 60) {
          expect(currentIntervalDisplay.textContent).toBe(`${refreshInterval} segundos`)
        } else {
          const minutes = refreshInterval / 60
          expect(currentIntervalDisplay.textContent).toBe(
            `${minutes} minuto${minutes > 1 ? 's' : ''}`
          )
        }

        unmount()
        localStorageStore = {}
        document.documentElement.classList.remove('dark')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: dashboard-fixes, Property 4: Settings persistence - Immediate UI update**
   * **Validates: Requirements 6.3**
   *
   * For any sequence of setting changes, each change should be immediately
   * reflected in the UI without requiring any additional action.
   */
  it('Property 4d: Multiple setting changes are immediately reflected', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(
          fc.record({ type: fc.constant('theme' as const), value: themeArb }),
          fc.record({ type: fc.constant('refresh' as const), value: refreshIntervalArb })
        ), { minLength: 1, maxLength: 5 }),
        (changes) => {
          localStorageStore[THEME_STORAGE_KEY] = 'light'
          localStorageStore[AUTO_REFRESH_STORAGE_KEY] = '60'

          const { unmount } = render(
            <ThemeProvider>
              <Settings />
            </ThemeProvider>
          )

          let expectedTheme: Theme = 'light'
          let expectedInterval = 60

          // Apply each change and verify immediate UI update
          for (const change of changes) {
            if (change.type === 'theme') {
              const newTheme = change.value as Theme
              act(() => {
                screen.getByTestId(newTheme === 'dark' ? 'theme-dark-btn' : 'theme-light-btn').click()
              })
              expectedTheme = newTheme

              // Verify immediate UI update
              expect(screen.getByTestId('current-theme').textContent).toBe(
                expectedTheme === 'dark' ? 'Escuro' : 'Claro'
              )
              // Verify localStorage update
              expect(localStorageStore[THEME_STORAGE_KEY]).toBe(expectedTheme)
            } else {
              const newInterval = change.value as number
              act(() => {
                screen.getByTestId(`refresh-interval-${newInterval}`).click()
              })
              expectedInterval = newInterval

              // Verify localStorage update
              expect(localStorageStore[AUTO_REFRESH_STORAGE_KEY]).toBe(String(expectedInterval))
            }
          }

          unmount()
          localStorageStore = {}
          document.documentElement.classList.remove('dark')
        }
      ),
      { numRuns: 100 }
    )
  })
})
