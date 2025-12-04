import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { ToastProvider, useToast, showErrorToast } from './toast'

// Test component that uses the toast hook
function TestComponent() {
  const { addToast, toasts } = useToast()

  return (
    <div>
      <span data-testid="toast-count">{toasts.length}</span>
      <button
        data-testid="add-success"
        onClick={() => addToast({ type: 'success', title: 'Success', message: 'Operation completed' })}
      >
        Add Success
      </button>
      <button
        data-testid="add-error"
        onClick={() => addToast({ type: 'error', title: 'Error', message: 'Something went wrong' })}
      >
        Add Error
      </button>
      <button
        data-testid="add-warning"
        onClick={() => addToast({ type: 'warning', title: 'Warning', message: 'Be careful' })}
      >
        Add Warning
      </button>
      <button
        data-testid="add-info"
        onClick={() => addToast({ type: 'info', title: 'Info', message: 'Just so you know' })}
      >
        Add Info
      </button>
      <button
        data-testid="add-persistent"
        onClick={() => addToast({ type: 'info', title: 'Persistent', duration: 0 })}
      >
        Add Persistent
      </button>
    </div>
  )
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should throw error when useToast is used outside ToastProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useToast must be used within a ToastProvider')

    consoleError.mockRestore()
  })

  it('should render success toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('add-success'))
    })

    expect(screen.getByTestId('toast-success')).toBeInTheDocument()
    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('Operation completed')).toBeInTheDocument()
  })

  it('should render error toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('add-error'))
    })

    expect(screen.getByTestId('toast-error')).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should render warning toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('add-warning'))
    })

    expect(screen.getByTestId('toast-warning')).toBeInTheDocument()
    expect(screen.getByText('Warning')).toBeInTheDocument()
    expect(screen.getByText('Be careful')).toBeInTheDocument()
  })

  it('should render info toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('add-info'))
    })

    expect(screen.getByTestId('toast-info')).toBeInTheDocument()
    expect(screen.getByText('Info')).toBeInTheDocument()
    expect(screen.getByText('Just so you know')).toBeInTheDocument()
  })

  it('should auto-remove toast after default duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('add-success'))
    })

    expect(screen.getByTestId('toast-success')).toBeInTheDocument()

    // Fast-forward past the default duration (5000ms)
    await act(async () => {
      vi.advanceTimersByTime(5001)
    })

    expect(screen.queryByTestId('toast-success')).not.toBeInTheDocument()
  })

  it('should not auto-remove toast when duration is 0', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('add-persistent'))
    })

    expect(screen.getByText('Persistent')).toBeInTheDocument()

    // Fast-forward a long time
    await act(async () => {
      vi.advanceTimersByTime(60000)
    })

    // Toast should still be there
    expect(screen.getByText('Persistent')).toBeInTheDocument()
  })

  it('should remove toast when close button is clicked', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('add-success'))
    })

    expect(screen.getByTestId('toast-success')).toBeInTheDocument()

    // Click the close button
    const closeButton = screen.getByLabelText('Close')
    await act(async () => {
      fireEvent.click(closeButton)
    })

    expect(screen.queryByTestId('toast-success')).not.toBeInTheDocument()
  })

  it('should display multiple toasts', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('add-success'))
      fireEvent.click(screen.getByTestId('add-error'))
      fireEvent.click(screen.getByTestId('add-warning'))
    })

    expect(screen.getByTestId('toast-success')).toBeInTheDocument()
    expect(screen.getByTestId('toast-error')).toBeInTheDocument()
    expect(screen.getByTestId('toast-warning')).toBeInTheDocument()
    expect(screen.getByTestId('toast-count')).toHaveTextContent('3')
  })
})

describe('showErrorToast', () => {
  it('should show error toast from Error object', () => {
    const addToast = vi.fn()
    const error = new Error('Test error message')

    showErrorToast(addToast, error)

    expect(addToast).toHaveBeenCalledWith({
      type: 'error',
      title: 'Error',
      message: 'Test error message',
    })
  })

  it('should show error toast from API error response', () => {
    const addToast = vi.fn()
    const error = {
      response: {
        data: {
          message: 'API error message',
        },
      },
    }

    showErrorToast(addToast, error)

    expect(addToast).toHaveBeenCalledWith({
      type: 'error',
      title: 'Error',
      message: 'API error message',
    })
  })

  it('should show default message for unknown error', () => {
    const addToast = vi.fn()
    const error = null

    showErrorToast(addToast, error, 'Custom default message')

    expect(addToast).toHaveBeenCalledWith({
      type: 'error',
      title: 'Error',
      message: 'Custom default message',
    })
  })

  it('should show error toast from object with message property', () => {
    const addToast = vi.fn()
    const error = { message: 'Object error message' }

    showErrorToast(addToast, error)

    expect(addToast).toHaveBeenCalledWith({
      type: 'error',
      title: 'Error',
      message: 'Object error message',
    })
  })
})
