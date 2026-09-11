import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RouteJobCard } from './RouteJobCard'

describe('RouteJobCard', () => {
  it('renders title, subtitle, and the StatusPill', () => {
    const { container } = render(
      <RouteJobCard title="JOB-1042" subtitle="Plate AB-1234" status={{ label: 'In Progress', variant: 'inProgress' }} />,
    )
    expect(screen.getByText('JOB-1042')).toBeInTheDocument()
    expect(screen.getByText('Plate AB-1234')).toBeInTheDocument()
    const pill = container.querySelector('[data-slot="status-pill"]')
    expect(pill).toBeInTheDocument()
    expect(pill).toHaveTextContent('In Progress')
  })

  it('renders the progress bar with its text pairing (never colour-only)', () => {
    const { container } = render(<RouteJobCard title="J" progressPct={66} progressLabel="12/18 · 66%" />)
    expect(container.querySelector('[data-slot="progress"]')).toBeInTheDocument()
    expect(screen.getByText('12/18 · 66%')).toBeInTheDocument()
  })

  it('defaults the progress label to the clamped percentage', () => {
    render(<RouteJobCard title="J" progressPct={140} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('renders no progress row when progressPct is omitted', () => {
    const { container } = render(<RouteJobCard title="J" />)
    expect(container.querySelector('[data-slot="route-job-card-progress"]')).not.toBeInTheDocument()
  })

  it('renders planned/actual labels in a container-responsive row that stacks by default', () => {
    const { container } = render(
      <RouteJobCard title="J" plannedLabel="Planned 06:00 – 14:00" actualLabel="Actual 06:12 · +12 min" />,
    )
    const times = container.querySelector('[data-slot="route-job-card-times"]') as HTMLElement
    expect(times.className).toContain('flex-col')
    expect(times.className).toContain('@sm/route-job-card:flex-row')
    expect(screen.getByText('Planned 06:00 – 14:00')).toBeInTheDocument()
    expect(screen.getByText('Actual 06:12 · +12 min')).toBeInTheDocument()
  })

  it('registers itself as a size container for the narrow variant', () => {
    const { container } = render(<RouteJobCard title="J" />)
    const card = container.querySelector('[data-slot="route-job-card"]') as HTMLElement
    expect(card.className).toContain('@container/route-job-card')
  })

  it('renders meta chips and the risk banner with its tone', () => {
    const { container } = render(
      <RouteJobCard
        title="J"
        meta={[{ id: 'zone', label: 'Zone 4' }, { label: 'Shift A' }]}
        banner={{ tone: 'danger', text: 'SLA at risk' }}
      />,
    )
    expect(screen.getByText('Zone 4')).toBeInTheDocument()
    expect(screen.getByText('Shift A')).toBeInTheDocument()
    const banner = container.querySelector('[data-slot="route-job-card-banner"]')
    expect(banner).toHaveAttribute('data-tone', 'danger')
    expect(banner).toHaveTextContent('SLA at risk')
  })

  it('is a keyboard-operable, pressed-tracking button when onSelect is given', () => {
    const onSelect = vi.fn()
    const { rerender } = render(<RouteJobCard title="J" onSelect={onSelect} />)
    const card = screen.getByRole('button')
    expect(card).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(card)
    fireEvent.keyDown(card, { key: 'Enter' })
    fireEvent.keyDown(card, { key: ' ' })
    expect(onSelect).toHaveBeenCalledTimes(3)
    rerender(<RouteJobCard title="J" onSelect={onSelect} selected />)
    expect(card).toHaveAttribute('aria-pressed', 'true')
    expect(card).toHaveAttribute('data-selected')
  })

  it('is inert without onSelect', () => {
    const { container } = render(<RouteJobCard title="J" />)
    const card = container.querySelector('[data-slot="route-job-card"]')
    expect(card).not.toHaveAttribute('role')
    expect(card).not.toHaveAttribute('tabindex')
  })
})
