import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div data-testid="child">Child component</div>
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Suppress console.error for cleaner test output
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Child component')).toBeInTheDocument()
  })

  it('should render fallback UI when an error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('should render custom fallback when provided', () => {
    const customFallback = <div data-testid="custom-fallback">Custom error UI</div>

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
    expect(screen.getByText('Custom error UI')).toBeInTheDocument()
  })

  it('should log error with context when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Verify console.error was called
    expect(consoleErrorSpy).toHaveBeenCalled()
    
    // Find our specific error log call (React also logs errors)
    const errorBoundaryCall = consoleErrorSpy.mock.calls.find(
      (call) => call[0] === 'ErrorBoundary caught an error:'
    )
    
    expect(errorBoundaryCall).toBeDefined()
    
    const errorLog = errorBoundaryCall![1]
    expect(errorLog).toHaveProperty('timestamp')
    expect(errorLog).toHaveProperty('service', 'dashboard')
    expect(errorLog).toHaveProperty('level', 'ERROR')
    expect(errorLog).toHaveProperty('message', 'Test error message')
    expect(errorLog).toHaveProperty('correlationId')
    expect(errorLog.correlationId).toMatch(/^err-\d+-[a-z0-9]+$/)
  })

  it('should provide Try Again button that resets error state', () => {
    // Use a stateful wrapper to control the error
    let shouldThrow = true
    
    function ControlledThrowError() {
      if (shouldThrow) {
        throw new Error('Test error message')
      }
      return <div data-testid="child">Child component</div>
    }

    const { rerender } = render(
      <ErrorBoundary>
        <ControlledThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Change the state so it won't throw on next render
    shouldThrow = false

    // Click Try Again - this resets the error boundary state
    fireEvent.click(screen.getByText('Try Again'))

    // Force re-render after state reset
    rerender(
      <ErrorBoundary>
        <ControlledThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('should provide Reload Page button', () => {
    // Mock window.location.reload
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    })

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByText('Reload Page')
    expect(reloadButton).toBeInTheDocument()

    fireEvent.click(reloadButton)
    expect(reloadMock).toHaveBeenCalled()
  })
})
