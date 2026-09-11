import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Truck } from '../icons'
import { StatusBreakdownCard } from './StatusBreakdownCard'

const ROWS = [
  { id: 'available', label: 'Available', count: 128, tone: 'success' as const },
  { id: 'in-service', label: 'In Service', count: 34, tone: 'warning' as const },
  { id: 'down', label: 'Down', count: 38, tone: 'danger' as const },
]

describe('StatusBreakdownCard', () => {
  it('renders title, rows, and counts as text', () => {
    render(<StatusBreakdownCard title="Fleet Availability" icon={Truck} rows={ROWS} />)
    expect(screen.getByText('Fleet Availability')).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
    expect(screen.getByText('128')).toBeInTheDocument()
    expect(screen.getByText('38')).toBeInTheDocument()
  })

  it('sizes each fill to its share of the summed counts', () => {
    const { container } = render(<StatusBreakdownCard title="T" rows={ROWS} />)
    const fills = container.querySelectorAll<HTMLElement>('[data-slot="status-breakdown-card-row-fill"]')
    expect(fills).toHaveLength(3)
    expect(fills[0].style.width).toBe('64%') // 128/200
    expect(fills[1].style.width).toBe('17%')
    expect(fills[0].getAttribute('data-tone')).toBe('success')
    expect(fills[0]).toHaveClass('bg-success')
  })

  it('honours an explicit total denominator', () => {
    const { container } = render(
      <StatusBreakdownCard title="T" total={400} rows={[{ label: 'A', count: 100, tone: 'info' }]} />,
    )
    const fill = container.querySelector<HTMLElement>('[data-slot="status-breakdown-card-row-fill"]')
    expect(fill?.style.width).toBe('25%')
  })

  it('keeps a 4px minimum fill for tiny non-zero counts (MUST 44)', () => {
    const { container } = render(
      <StatusBreakdownCard title="T" rows={[{ label: 'A', count: 1 }, { label: 'B', count: 199 }]} />,
    )
    const fill = container.querySelector<HTMLElement>('[data-slot="status-breakdown-card-row-fill"]')
    expect(fill?.style.minWidth).toBe('4px')
  })

  it('gives a zero-count row no segment at all, not a 4px sliver', () => {
    // With the single segmented bar, a zero row simply contributes no
    // segment (it keeps its legend entry) — there is no 0px fill to render.
    const { container } = render(
      <StatusBreakdownCard title="T" rows={[{ label: 'A', count: 0 }, { label: 'B', count: 10 }]} />,
    )
    const fills = container.querySelectorAll<HTMLElement>('[data-slot="status-breakdown-card-row-fill"]')
    expect(fills).toHaveLength(1)
    expect(fills[0].style.width).toBe('100%')
    expect(container.querySelectorAll('[data-slot="status-breakdown-card-row-label"]')).toHaveLength(2)
  })

  it('renders the muted empty state when all rows are zero (MUST 45)', () => {
    const { container } = render(
      <StatusBreakdownCard title="T" rows={[{ label: 'A', count: 0 }]} />,
    )
    expect(container.querySelector('[data-slot="status-breakdown-card-empty"]')).toBeInTheDocument()
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="status-breakdown-card-rows"]')).not.toBeInTheDocument()
  })

  it('renders optional stats and the trailing action slot', () => {
    render(
      <StatusBreakdownCard
        title="T"
        rows={ROWS}
        stats={[{ label: 'Total Vehicles', value: '200' }]}
        action={<button type="button">All Vehicles</button>}
      />,
    )
    expect(screen.getByText('Total Vehicles')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All Vehicles' })).toBeInTheDocument()
  })
})

describe('StatusBreakdownCard — single segmented proportion bar', () => {
  it('renders ONE stacked bar whose segments carry a hover title, plus a legend', () => {
    // Round 1 rendered a separate mini-bar per row; SPEC §1.1 wants one
    // segmented proportion bar (visual P1) with per-segment hover counts
    // (interaction P2 #34).
    render(
      <StatusBreakdownCard
        title="Fleet Availability"
        rows={[
          { id: 'a', label: 'Available', count: 18, tone: 'success' },
          { id: 'b', label: 'In Maintenance', count: 4, tone: 'warning' },
          { id: 'c', label: 'Out of Service', count: 0, tone: 'danger' },
        ]}
      />,
    )
    expect(document.querySelectorAll('[data-slot="status-breakdown-card-bar"]')).toHaveLength(1)
    const fills = document.querySelectorAll('[data-slot="status-breakdown-card-row-fill"]')
    // Zero-count rows leave the bar (but keep their legend entry).
    expect(fills).toHaveLength(2)
    expect(fills[0]).toHaveAttribute('title', 'Available 18')
    expect(document.querySelectorAll('[data-slot="status-breakdown-card-row-label"]')).toHaveLength(3)
  })
})
