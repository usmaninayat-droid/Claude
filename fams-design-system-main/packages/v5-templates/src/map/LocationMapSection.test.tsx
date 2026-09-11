// MUST be the first import — see `test/map-mocks.ts`'s header.
import './test/map-mocks'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { LocationMapSection } from './LocationMapSection'
import { MapPanel } from './MapPanel'
import { __resetSingleMapGuardForTests } from './mount-guard'

/**
 * LocationMapSection — the `LocationMapSection`-named profile-section
 * renderer (figma-spec-detail.md §4): reads center/zoom/pins/polygons/
 * corner text off the RECORD via field-key indirection (`props`), never a
 * hardcoded business field name.
 */

afterEach(() => {
  __resetSingleMapGuardForTests()
})

const config = {} as EntityConfig // never read by this renderer

function recordWith(fields: Record<string, unknown>): EntityRecord {
  return { id: 'r1', ...fields }
}

describe('LocationMapSection', () => {
  it('renders nothing when the configured center field has no valid [lng, lat]', () => {
    const { container } = render(
      <LocationMapSection config={config} record={recordWith({})} props={{ centerField: 'loc' }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the map once the record has a valid center', () => {
    render(
      <LocationMapSection
        config={config}
        record={recordWith({ loc: [55.27, 25.2] })}
        props={{ centerField: 'loc', ariaLabel: 'Ticket location' }}
      />,
    )
    expect(screen.getByRole('region', { name: 'Ticket location' })).toBeInTheDocument()
  })

  it('renders the configured title as a heading', () => {
    render(
      <LocationMapSection
        config={config}
        record={recordWith({ loc: [55.27, 25.2] })}
        props={{ centerField: 'loc', title: 'Location' }}
      />,
    )
    expect(screen.getByText('Location')).toBeInTheDocument()
  })

  it('reads pins/polygons off the record via the configured field keys', () => {
    render(
      <LocationMapSection
        config={config}
        record={recordWith({
          loc: [55.27, 25.2],
          pins: [{ id: 'p1', position: [55.27, 25.2] }],
          zones: [{ id: 'z1', points: [[55.2, 25.1], [55.3, 25.1], [55.3, 25.2]] }],
        })}
        props={{ centerField: 'loc', pinsField: 'pins', polygonsField: 'zones' }}
      />,
    )
    // No throw + the map region still renders — the real marker/zone → deck.gl
    // layer mapping is covered by `layers.test.ts`.
    expect(screen.getByRole('region')).toBeInTheDocument()
  })

  it('renders a corner overlay from the configured label/value fields', () => {
    render(
      <LocationMapSection
        config={config}
        record={recordWith({ loc: [55.27, 25.2], sectorLabel: 'Sector', sectorValue: 'Sector A' })}
        props={{ centerField: 'loc', cornerLabelField: 'sectorLabel', cornerValueField: 'sectorValue' }}
      />,
    )
    expect(screen.getByText('Sector')).toBeInTheDocument()
    expect(screen.getByText('Sector A')).toBeInTheDocument()
  })

  it('renders no corner overlay when neither corner field is configured', () => {
    const { container } = render(
      <LocationMapSection config={config} record={recordWith({ loc: [55.27, 25.2] })} props={{ centerField: 'loc' }} />,
    )
    expect(container.querySelector('[data-slot="location-map-corner"]')).not.toBeInTheDocument()
  })

  it('ignores a malformed pins/polygons value rather than throwing', () => {
    expect(() =>
      render(
        <LocationMapSection
          config={config}
          record={recordWith({ loc: [55.27, 25.2], pins: 'not-an-array' })}
          props={{ centerField: 'loc', pinsField: 'pins' }}
        />,
      ),
    ).not.toThrow()
  })

  it('renders a real map (not the single-mount fallback) alongside a page-primary MapPanel — the docked task-detail-sheet-over-Hybrid-view regression', () => {
    // Reproduces the real defect: a Hybrid view's own primary map stays
    // mounted behind a docked, no-scrim record-detail sheet, whose Address
    // section renders THIS component. Before the mount-guard slot fix, both
    // competed for the single page-wide map slot and the second one (this
    // section's map) rendered `MapFallbackCard` plus a dev console.error.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <>
        <MapPanel defaultViewState={{ longitude: 51.53, latitude: 25.29, zoom: 11 }} aria-label="Incidents map" />
        <LocationMapSection
          config={config}
          record={recordWith({ loc: [55.27, 25.2] })}
          props={{ centerField: 'loc', ariaLabel: 'Address' }}
        />
      </>,
    )
    // Both are real MapLibre maps — no `MapFallbackCard` for either.
    expect(screen.getAllByTestId('fake-maplibre-map')).toHaveLength(2)
    expect(screen.getByRole('region', { name: 'Incidents map' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Address' })).toBeInTheDocument()
    expect(errorSpy).not.toHaveBeenCalled()
  })
})
