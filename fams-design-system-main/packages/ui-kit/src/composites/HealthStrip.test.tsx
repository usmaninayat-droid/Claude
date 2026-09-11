import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Fuel } from '../icons'
import { HealthStrip, type HealthStripItem, type HealthStripStatus } from './HealthStrip'

const baseItems: HealthStripItem[] = [
  { label: 'GPS', value: '98%', status: 'success' },
  { label: 'Fuel', value: '24 L', status: 'warning' },
  { label: 'Ignition', value: 'Offline', status: 'danger' },
  { label: 'Uplink', value: 'Stale', status: 'info' },
]

describe('HealthStrip', () => {
  it('renders one cell per item with its label and value', () => {
    render(<HealthStrip items={baseItems} />)
    for (const item of baseItems) {
      expect(screen.getByText(item.label as string)).toBeInTheDocument()
      expect(screen.getByText(item.value as string)).toBeInTheDocument()
    }
  })

  it('defaults an item with no status to neutral', () => {
    render(<HealthStrip items={[{ label: 'Speed', value: '62 km/h' }]} data-testid="strip" />)
    const dot = screen.getByTestId('strip').querySelector('[data-slot="health-strip-dot"]')
    expect(dot).toHaveClass('bg-muted-foreground/50')
  })

  it('applies each status as a token-based dot tint, never a raw hex or CSS var', () => {
    const statuses: HealthStripStatus[] = ['neutral', 'success', 'warning', 'danger', 'info']
    for (const status of statuses) {
      const { unmount } = render(
        <HealthStrip items={[{ label: 'Metric', value: '1', status }]} data-testid="strip" />,
      )
      const dot = screen.getByTestId('strip').querySelector('[data-slot="health-strip-dot"]')
      expect(dot).not.toBeNull()
      expect(dot?.className).not.toMatch(/#|rgb\(|hsl\(|var\(--status-/)
      unmount()
    }
  })

  it('renders an IconBadge toned to the status instead of a dot when icon is given', () => {
    render(
      <HealthStrip
        items={[{ label: 'Fuel', value: '24 L', status: 'warning', icon: Fuel }]}
        data-testid="strip"
      />,
    )
    const strip = screen.getByTestId('strip')
    expect(strip.querySelector('[data-slot="health-strip-dot"]')).not.toBeInTheDocument()
    const badge = strip.querySelector('[data-slot="icon-badge"]')
    expect(badge).toHaveClass('bg-warning/10', 'text-warning')
    expect(badge?.querySelector('svg')).toBeInTheDocument()
  })

  it('applies the responsive 2-col mobile / 4-col desktop grid', () => {
    render(<HealthStrip items={baseItems} data-testid="strip" />)
    expect(screen.getByTestId('strip')).toHaveClass('grid-cols-2', 'sm:grid-cols-4')
  })

  it('forwards the ref to the underlying div', () => {
    const ref = createRef<HTMLDivElement>()
    render(<HealthStrip items={baseItems} ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('merges a consumer className with the variant classes', () => {
    render(<HealthStrip items={baseItems} className="mt-4" data-testid="strip" />)
    expect(screen.getByTestId('strip')).toHaveClass('mt-4', 'grid')
  })
})
