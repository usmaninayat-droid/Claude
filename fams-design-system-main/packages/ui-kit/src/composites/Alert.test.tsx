import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Alert } from './Alert'

describe('Alert', () => {
  it('renders info severity as a status region with the given title/description', () => {
    render(<Alert severity="info" title="Heads up" description="Something to know." />)
    const region = screen.getByRole('status')
    expect(region).toBeInTheDocument()
    expect(screen.getByText('Heads up')).toBeInTheDocument()
    expect(screen.getByText('Something to know.')).toBeInTheDocument()
  })

  it('renders warning and error severities as an alert region', () => {
    const { rerender } = render(<Alert severity="warning" title="Careful" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()

    rerender(<Alert severity="error" title="Failed" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('falls back to children for the description when `description` is omitted', () => {
    render(<Alert severity="success">Saved successfully.</Alert>)
    expect(screen.getByText('Saved successfully.')).toBeInTheDocument()
  })

  it('prefers the explicit `description` prop over children', () => {
    render(<Alert description="Explicit description">Fallback children</Alert>)
    expect(screen.getByText('Explicit description')).toBeInTheDocument()
    expect(screen.queryByText('Fallback children')).not.toBeInTheDocument()
  })

  it('renders an actions slot', () => {
    render(<Alert title="Update available" actions={<button>Refresh</button>} />)
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })

  it('omits the dismiss button by default and shows it with onDismiss, firing the callback on click', () => {
    const onDismiss = vi.fn()
    const { rerender } = render(<Alert title="No dismiss" />)
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()

    rerender(<Alert title="Dismissible" onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('supports a custom dismiss label for i18n', () => {
    render(<Alert title="Custom" onDismiss={() => {}} dismissLabel="إغلاق" />)
    expect(screen.getByRole('button', { name: 'إغلاق' })).toBeInTheDocument()
  })

  it('lets the caller override the leading icon, or omit it entirely with `icon={null}`', () => {
    const { rerender } = render(<Alert title="Custom icon" icon={<span data-testid="custom-icon" />} />)
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()

    rerender(<Alert title="No icon" icon={null} />)
    expect(screen.queryByTestId('custom-icon')).not.toBeInTheDocument()
  })

  it('forwards the ref to the root element', () => {
    let node: HTMLDivElement | null = null
    render(
      <Alert
        title="Ref test"
        ref={(el) => {
          node = el
        }}
      />,
    )
    expect(node).toBeInstanceOf(HTMLDivElement)
  })
})
