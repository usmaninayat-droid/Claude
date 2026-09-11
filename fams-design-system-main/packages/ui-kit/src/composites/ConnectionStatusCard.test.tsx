import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Radio } from '../icons'
import { ConnectionStatusCard } from './ConnectionStatusCard'

describe('ConnectionStatusCard', () => {
  it('renders a default status label derived from status', () => {
    render(<ConnectionStatusCard status="online" />)
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('renders a caller-supplied statusLabel instead of the default', () => {
    render(<ConnectionStatusCard status="online" statusLabel="Connected" />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.queryByText('Online')).not.toBeInTheDocument()
  })

  it.each([
    ['online', 'bg-success', 'text-success-text'],
    ['offline', 'bg-destructive', 'text-destructive-emphasis'],
    ['pending', 'bg-warning', 'text-warning-text'],
  ] as const)('applies the %s status token classes to the dot (fill) and the accessible text alias to the label', (status, dotClass, textClass) => {
    const { container } = render(<ConnectionStatusCard status={status} />)
    expect(container.querySelector('[data-slot="connection-status-dot"]')).toHaveClass(dotClass)
    expect(container.querySelector('[data-slot="connection-status-card-status-label"]')).toHaveClass(
      textClass,
    )
  })

  it('pulses the dot only when status is pending', () => {
    const { container, rerender } = render(<ConnectionStatusCard status="online" />)
    expect(container.querySelector('[data-slot="connection-status-dot"]')).not.toHaveClass(
      'animate-pulse',
    )

    rerender(<ConnectionStatusCard status="pending" />)
    expect(container.querySelector('[data-slot="connection-status-dot"]')).toHaveClass('animate-pulse')
  })

  it('renders no caption row when label is omitted', () => {
    const { container } = render(<ConnectionStatusCard status="online" />)
    expect(container.querySelector('[data-slot="connection-status-card-label"]')).not.toBeInTheDocument()
  })

  it('renders the caption row when label is provided', () => {
    render(<ConnectionStatusCard status="online" label="GPS" />)
    expect(screen.getByText('GPS')).toBeInTheDocument()
  })

  it('renders no icon badge when icon is omitted', () => {
    const { container } = render(<ConnectionStatusCard status="online" />)
    expect(container.querySelector('[data-slot="icon-badge"]')).not.toBeInTheDocument()
  })

  it('renders the leading IconBadge with the given tone when icon is provided', () => {
    const { container } = render(<ConnectionStatusCard status="online" icon={Radio} iconTone="info" />)
    const badge = container.querySelector('[data-slot="icon-badge"]')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-info/10', 'text-info')
  })

  it('defaults the icon tone to neutral', () => {
    const { container } = render(<ConnectionStatusCard status="online" icon={Radio} />)
    expect(container.querySelector('[data-slot="icon-badge"]')).toHaveClass('bg-muted', 'text-muted-foreground')
  })

  it('renders no subtitle when omitted, and renders it when provided', () => {
    const { container, rerender } = render(<ConnectionStatusCard status="online" />)
    expect(
      container.querySelector('[data-slot="connection-status-card-subtitle"]'),
    ).not.toBeInTheDocument()

    rerender(<ConnectionStatusCard status="online" subtitle="Device IMEI 861234" />)
    expect(screen.getByText('Device IMEI 861234')).toBeInTheDocument()
  })

  it('renders no timestamp when omitted, and renders it when provided', () => {
    const { container, rerender } = render(<ConnectionStatusCard status="online" />)
    expect(
      container.querySelector('[data-slot="connection-status-card-timestamp"]'),
    ).not.toBeInTheDocument()

    rerender(<ConnectionStatusCard status="online" timestamp="Last 5 min ago" />)
    expect(screen.getByText('Last 5 min ago')).toBeInTheDocument()
  })

  it('is not a button and has no tabIndex when onClick is omitted', () => {
    render(<ConnectionStatusCard status="online" data-testid="card" />)
    const card = screen.getByTestId('card')
    expect(card).not.toHaveAttribute('role')
    expect(card).not.toHaveAttribute('tabindex')
  })

  it('becomes a keyboard-operable button and invokes onClick on click', () => {
    const onClick = vi.fn()
    render(<ConnectionStatusCard status="online" onClick={onClick} data-testid="card" />)
    const card = screen.getByTestId('card')
    expect(card).toHaveAttribute('role', 'button')
    expect(card).toHaveAttribute('tabindex', '0')

    fireEvent.click(card)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it.each(['Enter', ' '])('invokes onClick on %s keydown', (key) => {
    const onClick = vi.fn()
    render(<ConnectionStatusCard status="online" onClick={onClick} data-testid="card" />)
    fireEvent.keyDown(screen.getByTestId('card'), { key })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('forwards the ref to the underlying card div', () => {
    const ref = createRef<HTMLDivElement>()
    render(<ConnectionStatusCard status="online" ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current).toHaveAttribute('data-slot', 'connection-status-card')
  })

  it('merges a consumer className with the variant classes', () => {
    render(<ConnectionStatusCard status="online" className="ms-2" data-testid="card" />)
    expect(screen.getByTestId('card')).toHaveClass('ms-2', 'items-center')
  })
})
