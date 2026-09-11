import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Truck } from '../icons'
import { KpiTile } from './KpiTile'

describe('KpiTile', () => {
  it('renders label and value', () => {
    render(<KpiTile label="Active vehicles" value="128" />)
    expect(screen.getByText('Active vehicles')).toBeInTheDocument()
    expect(screen.getByText('128')).toBeInTheDocument()
  })

  it('renders an optional unit beside the value', () => {
    render(<KpiTile label="Distance" value="482" unit="km" />)
    expect(screen.getByText('km')).toBeInTheDocument()
  })

  it('renders no icon badge when icon is omitted', () => {
    const { container } = render(<KpiTile label="Trips" value="12" />)
    expect(container.querySelector('[data-slot="icon-badge"]')).not.toBeInTheDocument()
  })

  it('renders the leading IconBadge when icon is provided', () => {
    const { container } = render(<KpiTile label="Trips" value="12" icon={Truck} tone="success" />)
    const badge = container.querySelector('[data-slot="icon-badge"]')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-success/10', 'text-success')
  })

  it('renders no trend row when trend is omitted', () => {
    const { container } = render(<KpiTile label="Trips" value="12" />)
    expect(container.querySelector('[data-slot="trend-indicator"]')).not.toBeInTheDocument()
  })

  it('renders the TrendIndicator when trend is provided', () => {
    render(<KpiTile label="Trips" value="12" trend={{ direction: 'up', value: '+12%', note: 'vs last week' }} />)
    expect(screen.getByText('+12%')).toBeInTheDocument()
    expect(screen.getByText('vs last week')).toBeInTheDocument()
  })

  // Round-2 visual QA #8: Figma right-aligns the trend chip on the LABEL row;
  // it was rendering below the value.
  it('renders the trend chip inline at the end of the label row, not below the value', () => {
    const { container } = render(
      <KpiTile label="Total Cost" value="12" trend={{ direction: 'up', value: '+12%' }} />,
    )
    const label = container.querySelector('[data-slot="kpi-tile-label"]') as HTMLElement
    const trend = container.querySelector('[data-slot="kpi-tile-trend"]') as HTMLElement
    expect(trend.parentElement).toBe(label.parentElement)
    expect(label.parentElement).toHaveClass('justify-between')
    // …and it precedes the value row rather than following it.
    const value = container.querySelector('[data-slot="kpi-tile-value"]') as HTMLElement
    expect(trend.compareDocumentPosition(value) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('keeps the label untruncated-capable and the badge on the VALUE row when both are present', () => {
    const { container } = render(
      <KpiTile
        label="Moving Assets"
        value="12"
        badge={<span>Real Time</span>}
        trend={{ direction: 'down', value: '-4%' }}
      />,
    )
    const badge = container.querySelector('[data-slot="kpi-tile-badge"]') as HTMLElement
    const value = container.querySelector('[data-slot="kpi-tile-value"]') as HTMLElement
    const trend = container.querySelector('[data-slot="kpi-tile-trend"]') as HTMLElement
    // `badge` stays on the value row (its own earlier fix) — not regressed.
    expect(badge.parentElement).toBe(value.parentElement?.parentElement)
    expect(trend.parentElement).not.toBe(badge.parentElement)
    expect(container.querySelector('[data-slot="kpi-tile-label"]')).toHaveClass('truncate')
  })

  it('renders an optional description line', () => {
    render(<KpiTile label="Trips" value="12" description="Across all lots" />)
    expect(screen.getByText('Across all lots')).toBeInTheDocument()
  })

  it('is not a button and not keyboard-focusable when clickable is false', () => {
    render(<KpiTile label="Trips" value="12" />)
    const tile = screen.getByText('Trips').closest('[data-slot="kpi-tile"]')
    expect(tile).not.toHaveAttribute('role')
    expect(tile).not.toHaveAttribute('tabindex')
  })

  it('becomes a keyboard-operable button when clickable', () => {
    const onClick = vi.fn()
    render(<KpiTile label="Trips" value="12" clickable onClick={onClick} />)
    const tile = screen.getByRole('button')
    expect(tile).toHaveAttribute('tabindex', '0')

    fireEvent.click(tile)
    expect(onClick).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(tile, { key: 'Enter' })
    expect(onClick).toHaveBeenCalledTimes(2)

    fireEvent.keyDown(tile, { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(3)

    fireEvent.keyDown(tile, { key: 'Tab' })
    expect(onClick).toHaveBeenCalledTimes(3)
  })

  it('forwards the ref to the underlying div', () => {
    const ref = createRef<HTMLDivElement>()
    render(<KpiTile label="Trips" value="12" ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('merges a consumer className with the variant classes', () => {
    render(<KpiTile label="Trips" value="12" className="ms-2" data-testid="tile" />)
    expect(screen.getByTestId('tile')).toHaveClass('ms-2', 'rounded-md')
  })

  it('renders the label above the value in the "stat" layout (round-1 QA B1: order was reversed)', () => {
    const { container } = render(<KpiTile label="Active Tickets" value="18" layout="stat" />)
    const tile = container.querySelector('[data-slot="kpi-tile"]')
    const value = screen.getByText('18')
    const label = screen.getByText('Active Tickets')
    expect(tile?.textContent?.indexOf('Active Tickets')).toBeLessThan(tile?.textContent?.indexOf('18') ?? -1)
    expect(value).toHaveClass('text-body-md')
    expect(label).not.toHaveClass('uppercase')
  })

  it('renders a square, larger icon chip in the "stat" layout', () => {
    const { container } = render(<KpiTile label="Active Tickets" value="18" icon={Truck} layout="stat" />)
    const badge = container.querySelector('[data-slot="icon-badge"]')
    expect(badge).toHaveClass('rounded-md', 'size-12')
  })

  it('applies a raw iconColor/iconBg escape hatch over the tone classes', () => {
    const { container } = render(
      <KpiTile label="Breached 24h SLA" value="6" icon={Truck} iconColor="#e27e60" iconBg="#fcf2ef" />,
    )
    const badge = container.querySelector('[data-slot="icon-badge"]') as HTMLElement
    expect(badge.style.color).toBe('rgb(226, 126, 96)')
    expect(badge.style.backgroundColor).toBe('rgb(252, 242, 239)')
  })

  it('puts the badge at the end of the VALUE row, leaving the label its full width', () => {
    // Regression: on the label row the chip starved the label, truncating
    // real KPI names to two characters ("Moving A…") in a narrow KPI column.
    const { container } = render(
      <KpiTile layout="stat" label="Moving Assets" value="52" badge={<span>Real Time</span>} />,
    )
    const badge = container.querySelector('[data-slot="kpi-tile-badge"]') as HTMLElement
    const value = container.querySelector('[data-slot="kpi-tile-value"]') as HTMLElement
    const label = container.querySelector('[data-slot="kpi-tile-label"]') as HTMLElement
    expect(badge).toHaveTextContent('Real Time')
    // Badge and value share a row; the label is a sibling of that row, not of the badge.
    expect(badge.parentElement).toBe(value.closest('[data-slot="kpi-tile-value"]')?.parentElement?.parentElement)
    expect(label.parentElement).not.toBe(badge.parentElement)
  })

  it('renders a trailing badge chip', () => {
    const { container } = render(
      <KpiTile label="Total Assets" value="156" badge={<span>Real Time</span>} />,
    )
    expect(container.querySelector('[data-slot="kpi-tile-badge"]')).toHaveTextContent('Real Time')
  })

  it('renders a muted value suffix after the value', () => {
    const { container } = render(
      <KpiTile label="Fleet Runway" value="6.2 days" valueSuffix="until critical at current consumption" />,
    )
    const suffix = container.querySelector('[data-slot="kpi-tile-value-suffix"]')
    expect(suffix).toHaveTextContent('until critical at current consumption')
    expect(suffix).toHaveClass('text-muted-foreground')
  })

  it('expresses the stat-with-target shape through target/targetLabel', () => {
    const { container, rerender } = render(
      <KpiTile label="Fleet Fuel Reserve" value="3,500 L" target="5,000 L" />,
    )
    expect(container.querySelector('[data-slot="kpi-tile-target"]')).toHaveTextContent('of 5,000 L')
    rerender(<KpiTile label="Fleet Fuel Reserve" value="3,500" target="5,000" targetLabel="out of" />)
    expect(container.querySelector('[data-slot="kpi-tile-target"]')).toHaveTextContent('out of 5,000')
  })

  it('omits the badge/suffix/target slots entirely when not given (back-compat)', () => {
    const { container } = render(<KpiTile label="Active" value="42" />)
    expect(container.querySelector('[data-slot="kpi-tile-badge"]')).toBeNull()
    expect(container.querySelector('[data-slot="kpi-tile-value-suffix"]')).toBeNull()
    expect(container.querySelector('[data-slot="kpi-tile-target"]')).toBeNull()
  })

  describe('tone tints the value ink, not only the icon badge', () => {
    it('inks the value from the tone using the dark ramp step', () => {
      render(<KpiTile label="Fuel theft events" value="22" tone="danger" icon={Truck} />)
      expect(screen.getByText('22').className).toContain('text-error-700')
    })

    it.each([
      ['primary', 'text-primary'],
      ['success', 'text-success-scale-700'],
      ['warning', 'text-warning-scale-700'],
      ['info', 'text-info-scale-700'],
      ['neutral', 'text-foreground'],
    ] as const)('tone %s inks the value %s', (tone, expected) => {
      const { unmount } = render(<KpiTile label="L" value="9" tone={tone} />)
      expect(screen.getByText('9').className).toContain(expected)
      unmount()
    })

    it('leaves an untinted tile neutral — an icon alone must not acquire a hue', () => {
      render(<KpiTile label="Total assets" value="156" icon={Truck} />)
      expect(screen.getByText('156').className).toContain('text-foreground')
      expect(screen.getByText('156').getAttribute('data-tone')).toBeNull()
    })
  })

})
