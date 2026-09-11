import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatBar } from './StatBar'
import type { SegmentedBarSegment } from './SegmentedBar'

const SEGMENTS: SegmentedBarSegment[] = [
  { id: 'used', label: 'Used', value: 70, colorIndex: 1 },
  { id: 'free', label: 'Free', value: 30, colorIndex: 4 },
]

describe('StatBar', () => {
  it('renders the caption row and a single filled bar', () => {
    render(<StatBar label="Fleet fuel reserve" value="3,500 L of 5,000 L" percent={70} />)
    expect(screen.getByText('Fleet fuel reserve')).toBeInTheDocument()
    expect(screen.getByText('3,500 L of 5,000 L')).toBeInTheDocument()
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '70')
  })

  it('delegates to Progress rather than reimplementing the bar', () => {
    const { container } = render(<StatBar label="Charge" percent={42} />)
    expect(container.querySelector('[data-slot="progress"]')).not.toBeNull()
    expect(container.querySelector('[data-slot="progress-indicator"]')).toHaveStyle({ width: '42%' })
  })

  it('delegates to SegmentedBar when segments are given', () => {
    const { container } = render(<StatBar label="Battery" segments={SEGMENTS} aria-label="Battery" />)
    expect(container.querySelector('[data-slot="segmented-bar"]')).not.toBeNull()
    expect(container.querySelector('[data-slot="progress"]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Used: 70' })).toBeInTheDocument()
  })

  it('clamps percent into 0–100', () => {
    const { rerender } = render(<StatBar percent={150} aria-label="Over" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    rerender(<StatBar percent={-10} aria-label="Under" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('renders a trailing percentage when showPercent is set', () => {
    const { container } = render(<StatBar label="Progress" percent={62} showPercent />)
    expect(container.querySelector('[data-slot="stat-bar-trailing"]')).toHaveTextContent('62%')
  })

  it('prefers an explicit trailing node over the percentage', () => {
    const { container } = render(<StatBar percent={62} showPercent trailing="6 of 10" />)
    expect(container.querySelector('[data-slot="stat-bar-trailing"]')).toHaveTextContent('6 of 10')
  })

  it('tints the fill from tone without touching the Progress primitive', () => {
    const { container } = render(<StatBar percent={30} tone="danger" aria-label="Efficiency" />)
    expect(container.querySelector('[data-slot="progress"]')).toHaveClass(
      '[&_[data-slot=progress-indicator]]:bg-destructive',
    )
  })

  it('renders a single-line table-cell form when compact', () => {
    const { container } = render(<StatBar percent={30} value="18.7" compact aria-label="Efficiency" />)
    const root = container.querySelector('[data-slot="stat-bar"]')!
    expect(root).toHaveAttribute('data-compact', 'true')
    expect(root).toHaveTextContent('18.7')
    // The caption row (label over the bar) is not rendered in the compact form.
    expect(container.querySelector('[data-slot="stat-bar-value"]')).toBeNull()
  })

  it('renders a keyboard-reachable info affordance only when info is given', () => {
    const { rerender } = render(<StatBar label="Fleet runway" percent={40} />)
    expect(screen.queryByRole('button', { name: 'More about Fleet runway' })).not.toBeInTheDocument()
    rerender(<StatBar label="Fleet runway" percent={40} info="Days until critical." />)
    expect(screen.getByRole('button', { name: 'More about Fleet runway' })).toBeInTheDocument()
  })

  it('forwards the ref and className to the root', () => {
    const ref = createRef<HTMLDivElement>()
    const { container } = render(<StatBar ref={ref} percent={10} className="mt-2" aria-label="Bar" />)
    expect(ref.current).toBe(container.querySelector('[data-slot="stat-bar"]'))
    expect(ref.current).toHaveClass('mt-2')
  })
})
