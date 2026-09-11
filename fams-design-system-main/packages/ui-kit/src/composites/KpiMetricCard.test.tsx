import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KpiMetricCard } from './KpiMetricCard'

describe('KpiMetricCard', () => {
  it('renders value and label', () => {
    render(<KpiMetricCard value="128" label="Scheduled Jobs" />)
    expect(screen.getByText('128')).toBeInTheDocument()
    expect(screen.getByText('Scheduled Jobs')).toBeInTheDocument()
  })

  it('renders no accent bar when accent is omitted', () => {
    const { container } = render(<KpiMetricCard value="12" label="Ongoing" />)
    expect(container.querySelector('[data-slot="kpi-metric-card-accent"]')).not.toBeInTheDocument()
  })

  it('renders the accent bar with the tone fill', () => {
    const { container } = render(<KpiMetricCard value="4" label="Delayed" accent="warning" />)
    const bar = container.querySelector('[data-slot="kpi-metric-card-accent"]')
    expect(bar).toBeInTheDocument()
    expect(bar).toHaveClass('bg-warning')
    expect(bar).toHaveAttribute('aria-hidden')
  })

  it('renders an up badge as a TrendIndicator', () => {
    const { container } = render(
      <KpiMetricCard value="96%" label="Fulfillment Rate" badge={{ label: '+12 vs Yest.', tone: 'up' }} />,
    )
    expect(screen.getByText('+12 vs Yest.')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="trend-indicator"]')).toBeInTheDocument()
  })

  it('renders a link-tone badge as primary-toned text, not a chip', () => {
    render(<KpiMetricCard value="3" label="Action Required" badge={{ label: 'View Details', tone: 'link' }} />)
    const badge = screen.getByText('View Details')
    expect(badge).toHaveClass('text-primary')
  })

  it('is inert without clickable', () => {
    const { container } = render(<KpiMetricCard value="1" label="A" />)
    const card = container.querySelector('[data-slot="kpi-metric-card"]')
    expect(card).not.toHaveAttribute('role')
    expect(card).not.toHaveAttribute('tabindex')
  })

  it('activates onClick via mouse and keyboard when clickable', () => {
    const onClick = vi.fn()
    render(<KpiMetricCard value="1" label="A" clickable onClick={onClick} />)
    const card = screen.getByRole('button')
    fireEvent.click(card)
    fireEvent.keyDown(card, { key: 'Enter' })
    fireEvent.keyDown(card, { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(3)
  })

  it('keeps the value non-wrapping and lets the badge truncate first', () => {
    const { container } = render(
      <KpiMetricCard value="1,204" label="A" badge={{ label: 'a very long comparison badge', tone: 'neutral' }} />,
    )
    const value = container.querySelector('[data-slot="kpi-metric-card-value"]')
    expect(value).toHaveClass('whitespace-nowrap')
    const badge = container.querySelector('[data-slot="kpi-metric-card-badge"]')
    expect(badge).toHaveClass('truncate')
  })
})
