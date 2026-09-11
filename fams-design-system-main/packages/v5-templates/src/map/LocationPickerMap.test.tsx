// MUST be the first import — see `test/map-mocks.ts`'s header.
import './test/map-mocks'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationPickerMap } from './LocationPickerMap'

/**
 * LocationPickerMap — the base click-to-drop picker plus its three opt-in
 * affordances (`draggable` pin, `locationCard` readout, `relatedPins` context
 * toggle). Each must be OFF by default so an existing caller is unchanged.
 */
describe('LocationPickerMap — opt-in affordances', () => {
  const PIN: [number, number] = [51.531, 25.2854]

  it('renders neither the related-pins toggle nor the readout card by default', () => {
    render(<LocationPickerMap value={PIN} onChange={vi.fn()} aria-label="Pick a location" />)
    expect(document.querySelector('[data-slot="location-picker-related-toggle"]')).toBeNull()
    expect(document.querySelector('[data-slot="location-picker-card"]')).toBeNull()
  })

  it('renders the readout card label over its value when `locationCard` is given', () => {
    render(
      <LocationPickerMap
        value={PIN}
        onChange={vi.fn()}
        locationCard={{ label: 'Incident Location', value: 'West Bay, Doha' }}
        aria-label="Pick a location"
      />,
    )
    const card = document.querySelector('[data-slot="location-picker-card"]') as HTMLElement
    expect(card).toBeInTheDocument()
    expect(card).toHaveTextContent('Incident Location')
    expect(card).toHaveTextContent('West Bay, Doha')
    // Presentation only — it must never eat a map click meant to move the pin.
    expect(card.className).toContain('pointer-events-none')
  })

  it('renders no toggle for an EMPTY related-pins list (the creation flow’s case)', () => {
    render(<LocationPickerMap value={PIN} onChange={vi.fn()} relatedPins={[]} aria-label="Pick a location" />)
    expect(document.querySelector('[data-slot="location-picker-related-toggle"]')).toBeNull()
  })

  it('gates related pins behind the toggle, using the caller’s label', () => {
    render(
      <LocationPickerMap
        value={PIN}
        onChange={vi.fn()}
        relatedPins={[{ id: 'c1', position: [51.5, 25.3], label: 'Complaint 1' }]}
        relatedPinsLabel="Linked Complaints"
        aria-label="Pick a location"
      />,
    )
    const toggle = screen.getByRole('checkbox', { name: 'Linked Complaints' })
    // Hidden until asked for — linked records are context, not the subject.
    expect(document.querySelector('[title="Complaint 1"]')).toBeNull()
    fireEvent.click(toggle)
    const pin = document.querySelector('[title="Complaint 1"]') as HTMLElement
    expect(pin).toBeInTheDocument()
    expect(pin.className).toContain('opacity-50')
  })

  it('keeps the toggle’s hit area at the touch minimum (logical-property safe)', () => {
    render(
      <LocationPickerMap
        value={PIN}
        onChange={vi.fn()}
        relatedPins={[{ id: 'c1', position: [51.5, 25.3] }]}
        aria-label="Pick a location"
      />,
    )
    const label = document.querySelector('[data-slot="location-picker-related-toggle"]') as HTMLElement
    expect(label.className).toContain('before:-inset-2.5')
    // RTL-safe: logical inset only, never `right-`/`left-`.
    expect(label.className).toContain('end-3')
    expect(label.className).not.toMatch(/\b(left|right)-/)
  })
})
