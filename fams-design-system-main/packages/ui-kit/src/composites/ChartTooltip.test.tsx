import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChartTooltip, type ChartTooltipItem } from './ChartTooltip'

const ITEMS: ChartTooltipItem[] = [
  { label: 'Lot 1', value: 384, colorIndex: 1 },
  { label: 'Lot 2', value: 281, colorIndex: 2 },
]

describe('ChartTooltip', () => {
  it('renders every item label and value', () => {
    render(<ChartTooltip items={ITEMS} />)
    expect(screen.getByText('Lot 1')).toBeInTheDocument()
    expect(screen.getByText('384')).toBeInTheDocument()
    expect(screen.getByText('Lot 2')).toBeInTheDocument()
    expect(screen.getByText('281')).toBeInTheDocument()
  })

  it('applies the colorIndex token class to each dot', () => {
    const { container } = render(<ChartTooltip items={ITEMS} />)
    const dots = container.querySelectorAll('[aria-hidden="true"]')
    expect(dots[0]).toHaveClass('bg-chart-1')
    expect(dots[1]).toHaveClass('bg-chart-2')
  })

  it('does not render a dot when colorIndex is omitted', () => {
    render(<ChartTooltip items={[{ label: 'Solo series', value: 10 }]} />)
    const row = screen.getByText('Solo series').closest('[data-slot="chart-tooltip-item"]')
    expect(row?.querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('does not render a title row by default', () => {
    render(<ChartTooltip items={ITEMS} />)
    expect(screen.queryByText('2026-06-08')).not.toBeInTheDocument()
  })

  it('renders the title row when provided', () => {
    render(<ChartTooltip items={ITEMS} title="2026-06-08" />)
    expect(screen.getByText('2026-06-08')).toBeInTheDocument()
  })

  it('renders as a tooltip role', () => {
    render(<ChartTooltip items={ITEMS} />)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })

  it('applies the dark-surface popover styling', () => {
    render(<ChartTooltip items={ITEMS} />)
    expect(screen.getByRole('tooltip')).toHaveClass('bg-foreground', 'text-background')
  })

  it('forwards a ref to the underlying div', () => {
    const ref = createRef<HTMLDivElement>()
    render(<ChartTooltip items={ITEMS} ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('merges a consumer className with the base classes', () => {
    render(<ChartTooltip items={ITEMS} className="ms-2" />)
    expect(screen.getByRole('tooltip')).toHaveClass('ms-2', 'bg-foreground')
  })
})
