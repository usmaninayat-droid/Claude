import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MapChip, VehicleMarker } from '../../index'

describe('MapChip', () => {
  it('renders the glass variant as the black-40% marker chip (SPEC §2.3)', () => {
    render(<MapChip variant="glass">41m</MapChip>)
    const chip = screen.getByText('41m')
    expect(chip).toBeInTheDocument()
    expect(chip.className).toContain('bg-overlay-black-40')
    expect(chip.className).toContain('text-white')
    expect(chip.className).toContain('rounded-full')
    expect(chip.className).toContain('h-5') // 20px height
    // 10px Figma chip type — component-scoped rem (below the token scale).
    expect(chip.style.fontSize).toBe('0.625rem')
  })

  it('renders the light variant on the card surface', () => {
    render(<MapChip variant="light">AUH-12345</MapChip>)
    const chip = screen.getByText('AUH-12345')
    expect(chip.className).toContain('bg-card')
  })
})

describe('VehicleMarker pills', () => {
  const pill = () => document.querySelector('[data-slot="vehicle-marker-pill"]') as HTMLElement

  it('shows the ONE plate + trailing-value capsule by default (13:17558)', () => {
    render(<VehicleMarker label="AUH-1" meta="41m" tone="success" />)
    expect(pill().className).toContain('opacity-100')
    expect(pill()).toHaveTextContent('AUH-1')
    expect(pill()).toHaveTextContent('41m')
  })

  it('hides it in the dense treatment (showPill={false}) until hover', () => {
    render(<VehicleMarker label="AUH-1" meta="41m" tone="success" showPill={false} />)
    expect(pill().className).toContain('opacity-0')
    expect(pill().className).toContain('group-hover:opacity-100')
  })

  it('drops the capsule entirely while selected (13:18868 — the popup carries the data)', () => {
    render(<VehicleMarker label="AUH-1" meta="41m" tone="success" selected />)
    expect(document.querySelector('[data-slot="vehicle-marker-pill"]')).toBeNull()
  })

  it('rotates the moving badge arrow to the heading', () => {
    const { container } = render(<VehicleMarker label="AUH-1" tone="success" moving heading={90} />)
    const arrow = container.querySelector('[data-icon="navigation-pointer-01"]')
    expect(arrow).not.toBeNull()
    expect(arrow?.parentElement?.getAttribute('style') ?? '').toContain('rotate(90deg)')
  })

  /* Round-1 UX finding 17 — chip collision suppression. */
  it('hides a suppressed chip from sight and from the a11y tree, keeping it mounted', () => {
    const { container } = render(
      <MapChip variant="glass" suppressed>
        Z-7764
      </MapChip>,
    )
    const chip = container.querySelector<HTMLElement>('[data-slot="map-chip"]')!
    expect(chip).toHaveAttribute('data-suppressed', 'true')
    expect(chip).toHaveAttribute('aria-hidden', 'true')
    expect(chip.className).toContain('invisible')
    expect(chip.className).toContain('pointer-events-none')
    // Still mounted, so a hover/selection reveal needs no remount.
    expect(chip).toHaveTextContent('Z-7764')
  })

  it('is visible and in the a11y tree by default', () => {
    const { container } = render(<MapChip>Z-7764</MapChip>)
    const chip = container.querySelector<HTMLElement>('[data-slot="map-chip"]')!
    expect(chip).not.toHaveAttribute('data-suppressed')
    expect(chip).not.toHaveAttribute('aria-hidden')
    expect(chip.className).not.toContain('invisible')
  })
})
