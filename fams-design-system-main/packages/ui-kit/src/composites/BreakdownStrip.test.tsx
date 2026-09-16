import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BreakdownStrip } from './BreakdownStrip'

const FLEET = [
  { id: 'on-route', label: 'On Route', value: 271, tone: 'success' as const },
  { id: 'idle', label: 'Idle', value: 19, tone: 'lavender' as const },
  { id: 'standby', label: 'Standby', value: 24, tone: 'info' as const },
  { id: 'maintenance', label: 'Maintenance', value: 10, tone: 'yellow' as const },
  { id: 'breakdown', label: 'Breakdown', value: 3, tone: 'danger' as const, display: '03' },
  { id: 'inactive', label: 'Inactive', value: 1, tone: 'neutral' as const, display: '01' },
]

describe('BreakdownStrip', () => {
  it('renders every label and value as text, honouring a pre-formatted display', () => {
    render(<BreakdownStrip aria-label="Fleet availability" items={FLEET} />)
    expect(screen.getByRole('group', { name: 'Fleet availability' })).toBeInTheDocument()
    expect(screen.getByText('On Route')).toBeInTheDocument()
    expect(screen.getByText('271')).toBeInTheDocument()
    expect(screen.getByText('03')).toBeInTheDocument()
    expect(screen.getByText('01')).toBeInTheDocument()
  })

  it('inks each value in its tone and separates columns with hairlines', () => {
    const { container } = render(<BreakdownStrip items={FLEET} />)
    const stats = container.querySelectorAll('[data-slot="breakdown-strip-stat"]')
    expect(stats).toHaveLength(6)
    expect(stats[0].querySelector('bdi')).toHaveClass('text-success')
    expect(stats[1].querySelector('bdi')).toHaveClass('text-accent-family-lavender-normal')
    expect(container.querySelectorAll('[data-slot="breakdown-strip-stats"] > .contents > span[aria-hidden]')).toHaveLength(5)
  })

  it('stacks cumulative segments with descending z-order and the design overlap', () => {
    const { container } = render(<BreakdownStrip items={[{ label: 'A', value: 50, tone: 'success' }, { label: 'B', value: 30, tone: 'info' }, { label: 'C', value: 20 }]} />)
    const segments = container.querySelectorAll<HTMLElement>('[data-slot="breakdown-strip-segment"]')
    expect(segments).toHaveLength(3)
    expect(segments[0].style.width).toBe('calc(50% + 30px)')
    expect(segments[0].style.zIndex).toBe('3')
    expect(segments[1].style.width).toBe('calc(80% + 30px)')
    expect(segments[2].style.width).toBe('100%')
    expect(segments[2].style.zIndex).toBe('1')
    expect(segments[0]).toHaveClass('bg-success')
  })

  it('leaves a zero item in the stat row but out of the bar', () => {
    const { container } = render(<BreakdownStrip items={[{ label: 'A', value: 0 }, { label: 'B', value: 10, tone: 'info' }]} />)
    expect(container.querySelectorAll('[data-slot="breakdown-strip-stat"]')).toHaveLength(2)
    expect(container.querySelectorAll('[data-slot="breakdown-strip-segment"]')).toHaveLength(1)
  })

  it('honours an explicit total and shows the remainder as a muted track', () => {
    const { container } = render(<BreakdownStrip total={200} items={[{ label: 'A', value: 50, tone: 'success' }]} />)
    const segment = container.querySelector<HTMLElement>('[data-slot="breakdown-strip-segment"]')
    expect(segment?.style.width).toBe('calc(25% + 30px)')
    expect(container.querySelector('[data-slot="breakdown-strip-bar"]')).toHaveClass('bg-muted')
  })

  it('renders the muted empty state when everything is zero (MUST 45)', () => {
    const { container } = render(<BreakdownStrip items={[{ label: 'A', value: 0 }]} />)
    expect(container.querySelector('[data-slot="breakdown-strip-empty"]')).toBeInTheDocument()
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="breakdown-strip-bar"]')).not.toBeInTheDocument()
  })
})
