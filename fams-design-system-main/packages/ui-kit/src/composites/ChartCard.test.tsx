import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Activity } from '../icons'
import { ChartCard } from './ChartCard'

describe('ChartCard', () => {
  it('renders the title', () => {
    render(<ChartCard title="Fleet utilization">chart body</ChartCard>)
    expect(screen.getByText('Fleet utilization')).toBeInTheDocument()
    expect(screen.getByText('chart body')).toBeInTheDocument()
  })

  it('renders an optional subtitle', () => {
    render(
      <ChartCard title="Fleet utilization" subtitle="Last 30 days">
        body
      </ChartCard>,
    )
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
  })

  it('renders no icon chip when icon is omitted', () => {
    const { container } = render(<ChartCard title="Trips">body</ChartCard>)
    expect(container.querySelector('[data-slot="chart-card-icon"]')).not.toBeInTheDocument()
  })

  it('renders the leading grey icon chip tinting only the glyph by tone', () => {
    const { container } = render(
      <ChartCard title="Trips" icon={Activity} iconTone="success">
        body
      </ChartCard>,
    )
    const badge = container.querySelector('[data-slot="chart-card-icon"]')
    expect(badge).toBeInTheDocument()
    // Figma 6545:15224 — neutral grey disc, tone lives on the glyph only.
    expect(badge).toHaveClass('bg-gray-100', 'text-success')
  })

  it('renders actions content in the header', () => {
    render(
      <ChartCard title="Trips" actions={<button type="button">Export</button>}>
        body
      </ChartCard>,
    )
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
  })

  it('renders no expand button when onExpand is omitted', () => {
    const { container } = render(<ChartCard title="Trips">body</ChartCard>)
    expect(container.querySelector('[data-slot="chart-card-expand"]')).not.toBeInTheDocument()
  })

  it('renders and invokes the expand button when onExpand is provided', () => {
    const onExpand = vi.fn()
    render(
      <ChartCard title="Trips" onExpand={onExpand}>
        body
      </ChartCard>,
    )
    const button = screen.getByRole('button', { name: 'Expand chart' })
    fireEvent.click(button)
    expect(onExpand).toHaveBeenCalledTimes(1)
  })

  it('supports a custom expand label', () => {
    render(
      <ChartCard title="Trips" onExpand={() => {}} expandLabel="View fullscreen">
        body
      </ChartCard>,
    )
    expect(screen.getByRole('button', { name: 'View fullscreen' })).toBeInTheDocument()
  })

  it('renders no legend row when legend is omitted', () => {
    const { container } = render(<ChartCard title="Trips">body</ChartCard>)
    expect(container.querySelector('[data-slot="chart-card-legend"]')).not.toBeInTheDocument()
  })

  it('renders the legend row when provided', () => {
    render(
      <ChartCard title="Trips" legend={<span>On time · Delayed</span>}>
        body
      </ChartCard>,
    )
    expect(screen.getByText('On time · Delayed')).toBeInTheDocument()
  })

  it('applies bodyPadding variants to the body slot', () => {
    const { container, rerender } = render(
      <ChartCard title="Trips" bodyPadding="none">
        body
      </ChartCard>,
    )
    expect(container.querySelector('[data-slot="chart-card-body"]')).toHaveClass('p-0')

    rerender(
      <ChartCard title="Trips" bodyPadding="lg">
        body
      </ChartCard>,
    )
    expect(container.querySelector('[data-slot="chart-card-body"]')).toHaveClass('p-6')
  })

  it('defaults body padding to md', () => {
    const { container } = render(<ChartCard title="Trips">body</ChartCard>)
    expect(container.querySelector('[data-slot="chart-card-body"]')).toHaveClass('p-4')
  })

  it('applies a fixed numeric bodyHeight as an inline pixel height', () => {
    const { container } = render(
      <ChartCard title="Trips" bodyHeight={320}>
        body
      </ChartCard>,
    )
    const body = container.querySelector('[data-slot="chart-card-body"]') as HTMLElement
    expect(body.style.height).toBe('320px')
  })

  it('applies a fixed string bodyHeight verbatim', () => {
    const { container } = render(
      <ChartCard title="Trips" bodyHeight="50%">
        body
      </ChartCard>,
    )
    const body = container.querySelector('[data-slot="chart-card-body"]') as HTMLElement
    expect(body.style.height).toBe('50%')
  })

  it('leaves body height unset (auto/intrinsic) when bodyHeight is omitted', () => {
    const { container } = render(<ChartCard title="Trips">body</ChartCard>)
    const body = container.querySelector('[data-slot="chart-card-body"]') as HTMLElement
    expect(body.style.height).toBe('')
  })

  it('forwards the ref to the underlying card div', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <ChartCard title="Trips" ref={ref}>
        body
      </ChartCard>,
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current).toHaveAttribute('data-slot', 'chart-card')
  })

  it('merges a consumer className with the variant classes', () => {
    render(
      <ChartCard title="Trips" className="ms-2" data-testid="card">
        body
      </ChartCard>,
    )
    expect(screen.getByTestId('card')).toHaveClass('ms-2', 'overflow-hidden')
  })
})
