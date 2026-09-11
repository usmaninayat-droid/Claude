// MUST be the first import — see `test/map-mocks.ts`'s header.
import './test/map-mocks'
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LocationMap } from './LocationMap'
import { __resetSingleMapGuardForTests } from './mount-guard'

/**
 * LocationMap — the generic DISPLAY map template (figma-spec-detail.md §4):
 * a read-only `MapPanel` composition with pins/polygons/corner-overlay
 * slots. Behavior over the mocked map (no real WebGL, see `map-mocks.ts`).
 */

afterEach(() => {
  __resetSingleMapGuardForTests()
})

describe('LocationMap', () => {
  it('renders the map region with the given accessible label', () => {
    render(<LocationMap center={[55.27, 25.2]} aria-label="Ticket location" />)
    expect(screen.getByRole('region', { name: 'Ticket location' })).toBeInTheDocument()
  })

  it('renders MapPanel controls by default and hides them when controls={false}', () => {
    const { rerender } = render(<LocationMap center={[55.27, 25.2]} aria-label="Map" />)
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument()

    rerender(<LocationMap center={[55.27, 25.2]} aria-label="Map" controls={false} />)
    expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument()
  })

  it('is read-only — never renders the draw toolbar regardless of pins/polygons', () => {
    render(
      <LocationMap
        center={[55.27, 25.2]}
        aria-label="Map"
        pins={[{ id: 'p1', position: [55.27, 25.2] }]}
        polygons={[{ id: 'z1', points: [[55.2, 25.1], [55.3, 25.1], [55.3, 25.2]] }]}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Draw polygon' })).not.toBeInTheDocument()
  })

  it('renders no corner overlay by default', () => {
    const { container } = render(<LocationMap center={[55.27, 25.2]} aria-label="Map" />)
    expect(container.querySelector('[data-slot="location-map-corner"]')).not.toBeInTheDocument()
  })

  it('renders a corner overlay when given, defaulting to the bottom-start corner (MapPanel\'s own controls occupy bottom-end)', () => {
    const { container } = render(
      <LocationMap center={[55.27, 25.2]} aria-label="Map" cornerOverlay={<span>Sector A</span>} />,
    )
    expect(screen.getByText('Sector A')).toBeInTheDocument()
    const corner = container.querySelector('[data-slot="location-map-corner"]')
    expect(corner).toHaveClass('bottom-4', 'start-4')
  })

  it('positions the corner overlay per cornerPosition', () => {
    const { container } = render(
      <LocationMap center={[55.27, 25.2]} aria-label="Map" cornerOverlay={<span>Sector A</span>} cornerPosition="top-end" />,
    )
    const corner = container.querySelector('[data-slot="location-map-corner"]')
    expect(corner).toHaveClass('top-4', 'end-4')
  })
})
