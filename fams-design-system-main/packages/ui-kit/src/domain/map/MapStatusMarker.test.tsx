import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MapStatusMarker, type MapMarkerStatus } from './MapStatusMarker'
import { MOBILITY_STATUS_LABELS } from './mobility-status'

const STATUSES: MapMarkerStatus[] = ['moving', 'idle', 'stopped', 'non-moving', 'non-reporting', 'immobilized']

describe('MapStatusMarker', () => {
  it('renders as a button with the status label as its accessible name by default', () => {
    render(<MapStatusMarker status="moving" />)
    expect(screen.getByRole('button', { name: 'Moving' })).toBeInTheDocument()
  })

  it('accepts a custom accessible label', () => {
    render(<MapStatusMarker status="stopped" label="Truck 12 · Stopped" />)
    expect(screen.getByRole('button', { name: 'Truck 12 · Stopped' })).toBeInTheDocument()
  })

  it.each(STATUSES)('renders every status (%s) with its label mapping', (status) => {
    render(<MapStatusMarker status={status} />)
    expect(screen.getByRole('button', { name: MOBILITY_STATUS_LABELS[status] })).toBeInTheDocument()
  })

  it('calls onClick when pressed', () => {
    const onClick = vi.fn()
    render(<MapStatusMarker status="moving" onClick={onClick} />)
    screen.getByRole('button').click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders a plain (white) ring by default and a tinted ring when variant="tinted"', () => {
    const { container, rerender } = render(<MapStatusMarker status="stopped" />)
    expect(container.querySelector('[data-variant="plain"] .bg-white, .bg-white')).not.toBeNull()

    rerender(<MapStatusMarker status="stopped" variant="tinted" />)
    expect(container.querySelector('.bg-error-50')).not.toBeNull()
  })

  it('applies the status ring color', () => {
    const { container, rerender } = render(<MapStatusMarker status="stopped" />)
    expect(container.querySelector('.border-error-500')).not.toBeNull()

    rerender(<MapStatusMarker status="non-moving" />)
    expect(container.querySelector('.border-info-scale-500')).not.toBeNull()
  })

  it('renders arbitrary center art via the icon slot (vehicle/asset/workforce/bin swap)', () => {
    render(<MapStatusMarker status="moving" icon={<img data-testid="center-icon" src="/vehicle.svg" alt="" />} />)
    expect(screen.getByTestId('center-icon')).toBeInTheDocument()
  })

  it('renders no center art by default (empty ring, matching the reference SVGs)', () => {
    render(<MapStatusMarker status="moving" />)
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('scales the marker footprint per size while keeping bottom-anchored transform origin', () => {
    const { container, rerender } = render(<MapStatusMarker status="moving" size="md" />)
    const mdButton = container.querySelector('button') as HTMLButtonElement
    expect(mdButton.style.width).toBe('40px')

    rerender(<MapStatusMarker status="moving" size="lg" />)
    const lgButton = container.querySelector('button') as HTMLButtonElement
    expect(lgButton.style.transform).toContain('scale(1.25)')
    expect(lgButton.style.transformOrigin).toBe('bottom center')
  })

  it('adds a selected halo ring when selected', () => {
    const { container } = render(<MapStatusMarker status="moving" selected />)
    expect(container.querySelector('.ring-ring')).not.toBeNull()
  })

  it('allows overriding a status color via statusStyles', () => {
    const { container } = render(
      <MapStatusMarker status="moving" statusStyles={{ moving: { border: 'border-accent-family-plum-normal' } }} />,
    )
    expect(container.querySelector('.border-accent-family-plum-normal')).not.toBeNull()
  })
})
