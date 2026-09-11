// MUST be the first import — see `test/map-mocks.ts`'s header.
import './test/map-mocks'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LiveMapView } from './LiveMapView'
import { MAPLIBRE_POPUP_CHROMELESS_CLASS } from './maplibre-popup-reset'
import { __resetSingleMapGuardForTests } from './mount-guard'
import { reactMapGlTestState } from './test/map-mocks'
import { BRIGHT_MAP_STYLE, MUTED_MAP_STYLE } from './constants'
import { setGlobalBasemapId } from './global-basemap-store'
import type { LiveVehicleDatum } from './live-types'

afterEach(() => {
  __resetSingleMapGuardForTests()
  vi.restoreAllMocks()
})

const VEHICLES: LiveVehicleDatum[] = [
  {
    id: 'V-1',
    position: [10.001, 10.001],
    status: 'moving',
    name: 'Mitsubishi X6734',
    plate: 'Y 31022',
    speedKmh: 100,
    heading: 45,
    driver: 'Jhon Doe',
    location: 'West Bay – Doha',
    statusSince: 'since 2 minutes',
  },
  { id: 'V-2', position: [10.002, 10.002], status: 'idling', plate: 'D 88451', dwell: '12 mins' },
]

describe('LiveMapView', () => {
  it('renders a DOM VehicleMarker per vehicle named plate · status · speed/dwell (UX-9)', () => {
    // The mocked map reports zoom 3 with a wide bbox; two nearby points
    // cluster at that zoom — so disable clustering to see both markers.
    render(<LiveMapView vehicles={VEHICLES} cluster={false} aria-label="Fleet live map" />)
    const markers = screen.getAllByTestId('fake-map-marker')
    expect(markers).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Y 31022 · Moving · 100 km/h' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'D 88451 · Idling · 12 mins' })).toBeInTheDocument()
  })

  it('shows an explicit "0 km/h" chip for a moving vehicle at standstill (P0-3#31)', () => {
    render(
      <LiveMapView
        vehicles={[{ id: 'V-0', position: [10, 10], status: 'moving', plate: 'X 1', speedKmh: 0 }]}
        cluster={false}
        aria-label="Fleet live map"
      />,
    )
    expect(screen.getByRole('button', { name: 'X 1 · Moving · 0 km/h' })).toBeInTheDocument()
    // Chip text + the sr-only table cell both carry "0 km/h".
    expect(screen.getAllByText('0 km/h').length).toBeGreaterThanOrEqual(2)
  })

  it('flanks every individual marker with BOTH chips at the default zoom — no zoom gate (SPEC §2.3)', () => {
    // Default camera (zoom 10) — the chips must still be there; a
    // `showPill={zoom >= 13}` gate here silently hid them (round-4 P0).
    render(<LiveMapView vehicles={VEHICLES} cluster={false} aria-label="Fleet live map" />)
    const marker = screen.getByRole('button', { name: 'Y 31022 · Moving · 100 km/h' })
    const chips = [...marker.querySelectorAll('span')].map((el) => el.textContent)
    expect(chips).toContain('Y 31022')
    expect(chips).toContain('100 km/h')
  })

  it('clusters nearby vehicles into a segmented ClusterBadge with a status-mix label and eases to the expansion zoom on click (UX-8)', () => {
    render(<LiveMapView vehicles={VEHICLES} aria-label="Fleet live map" />)
    // zoom 3 → the two vehicles aggregate into one cluster of 2; the click
    // target's accessible name carries the status mix (UX-8).
    const clusterButton = screen.getByRole('button', { name: '2 vehicles, 1 moving, 1 idling' })
    expect(clusterButton).toBeInTheDocument()
    // Segment arcs reflect the status mix (1 moving + 1 idling).
    const badge = screen.getByRole('img', { name: 'Cluster of 2' })
    expect(badge.querySelectorAll('circle[data-tone="success"]')).toHaveLength(1)
    expect(badge.querySelectorAll('circle[data-tone="warning"]')).toHaveLength(1)

    fireEvent.click(clusterButton)
    expect(reactMapGlTestState.lastFakeMap?.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({ zoom: expect.any(Number), center: expect.any(Array) }),
    )
  })

  it('opens the vehicle popup on marker click and closes it back through onSelect', () => {
    const onSelect = vi.fn()
    render(<LiveMapView vehicles={VEHICLES} cluster={false} onSelect={onSelect} aria-label="Fleet live map" />)
    fireEvent.click(screen.getByRole('button', { name: 'Y 31022 · Moving · 100 km/h' }))
    expect(onSelect).toHaveBeenCalledWith('V-1')
    // Uncontrolled selection → the default LiveVehiclePopup opens in the fake popup.
    expect(screen.getByTestId('fake-map-popup')).toBeInTheDocument()
    expect(screen.getAllByText('Mitsubishi X6734').length).toBeGreaterThan(1)
    expect(screen.getAllByText('Moving').length).toBeGreaterThan(0)
    expect(screen.getByText('since 2 minutes')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onSelect).toHaveBeenLastCalledWith(null)
    expect(screen.queryByTestId('fake-map-popup')).not.toBeInTheDocument()
  })

  it('anchors the card with MapLibre’s OWN tip so the pointer follows the computed anchor (UX-11)', () => {
    render(<LiveMapView vehicles={VEHICLES} cluster={false} selectedId="V-1" aria-label="Fleet live map" />)
    const popup = screen.getByTestId('fake-map-popup')
    // The card does NOT draw its own bottom-edge triangle on the map — that
    // one is fixed to the card's bottom and aims at empty map the moment
    // MapLibre flips the card below/aside the marker.
    expect(popup.querySelector('[data-slot="vehicle-popup-pointer"]')).toBeNull()
    // MapLibre's tip IS present and tinted per anchor — one rule per anchor,
    // so the triangle points DOWN when the card sits above the marker and UP
    // when it flips below.
    expect(popup.querySelector('.maplibregl-popup-tip')).not.toBeNull()
    // The per-anchor rules now ship in the INJECTED sheet (they were dead
    // Tailwind arbitrary variants — Phase 7 code review finding 1); the popup
    // carries the scope class that keys them, and the rule text itself is
    // asserted in `maplibre-popup-reset.test.ts`.
    expect(popup.className).toContain(MAPLIBRE_POPUP_CHROMELESS_CLASS)
    const sheet = document.getElementById('fams-maplibre-popup-reset')!.textContent!
    expect(sheet).toContain('.maplibregl-popup-anchor-bottom .maplibregl-popup-tip{border-top-color:var(--color-card)')
    expect(sheet).toContain('.maplibregl-popup-anchor-top .maplibregl-popup-tip{border-bottom-color:var(--color-card)')
    // …and the tail's apex lands exactly on the marker's TOP edge. The offset
    // IS where the tip sits, and the marker measures 66px tall (circle 40 +
    // badge overhang + leader line); at the old 62 the apex landed 4px inside
    // the pin's circle and read as overlapping it (QA A6).
    expect(popup.getAttribute('data-offset')).toBe('66')
  })

  it('honours controlled selection', () => {
    render(<LiveMapView vehicles={VEHICLES} cluster={false} selectedId="V-2" aria-label="Fleet live map" />)
    expect(screen.getByTestId('fake-map-popup')).toBeInTheDocument()
    expect(screen.getAllByText('D 88451').length).toBeGreaterThan(0)
  })

  it('track/focus (card locate action) recenters the camera on the vehicle', () => {
    render(<LiveMapView vehicles={VEHICLES} cluster={false} selectedId="V-1" aria-label="Fleet live map" />)
    fireEvent.click(screen.getByRole('button', { name: 'Center on vehicle' }))
    // MapPanel's focusPosition effect eases to the followed vehicle.
    expect(reactMapGlTestState.lastFakeMap?.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [10.001, 10.001] }),
    )
  })

  /*
   * Selection framing (P0-2 carry-over). The HYBRID host derives its own
   * `focusPosition` from the active row; the MAP-ONLY view has no such host,
   * so a marker click used to reach `MapPanel` with no focus at all — no
   * camera ease, and `computePopupAnchor`'s flip logic left the card BELOW a
   * marker high in the pane.
   */
  it('eases the camera to a marker selected with NO host-supplied focusPosition (P0-2)', () => {
    render(<LiveMapView vehicles={VEHICLES} cluster={false} aria-label="Fleet live map" />)
    fireEvent.click(screen.getByRole('button', { name: 'D 88451 · Idling · 12 mins' }))
    expect(reactMapGlTestState.lastFakeMap?.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [10.002, 10.002], offset: expect.any(Array) }),
    )
  })

  it('lets a host-supplied focusPosition keep winning over the derived one (hybrid unchanged)', () => {
    render(
      <LiveMapView
        vehicles={VEHICLES}
        cluster={false}
        selectedId="V-1"
        focusPosition={[10.001, 10.001]}
        aria-label="Fleet live map"
      />,
    )
    expect(reactMapGlTestState.lastFakeMap?.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [10.001, 10.001] }),
    )
  })

  it('uses the Figma bottom-end control cluster: zoom PILL + detached fit, no bearing control (SPEC §2.3)', () => {
    render(<LiveMapView vehicles={VEHICLES} cluster={false} aria-label="Fleet live map" />)
    const controls = document.querySelector('[data-slot="map-controls"]')!
    expect(controls.getAttribute('data-variant')).toBe('figma')
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fullscreen' })).toBeInTheDocument()
    // Figma has no compass — the stacked variant's bearing control is gone.
    expect(screen.queryByRole('button', { name: 'Reset bearing' })).not.toBeInTheDocument()
    // +/− share ONE rounded pill; the fit control is a separate tile.
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' })
    const zoomOut = screen.getByRole('button', { name: 'Zoom out' })
    expect(zoomIn.parentElement).toBe(zoomOut.parentElement)
    expect(screen.getByRole('button', { name: 'Fullscreen' }).parentElement).not.toBe(zoomIn.parentElement)
  })

  it('renders the sr-only text alternative table of every vehicle', () => {
    render(<LiveMapView vehicles={VEHICLES} cluster={false} aria-label="Fleet live map" />)
    const table = screen.getByRole('table', { name: 'Vehicles on the map' })
    expect(table).toBeInTheDocument()
    expect(table.querySelectorAll('tbody tr')).toHaveLength(2)
  })
})

describe('LiveMapView POIs (WP7)', () => {
  it('plots a PoiPin per checked POI (non-clustered) with hover tooltip + radius circle', () => {
    render(
      <LiveMapView
        vehicles={VEHICLES}
        cluster={false}
        pois={[{ id: 'poi-1', name: 'Lake View Tower', position: [10.003, 10.003], radiusMeters: 43 }]}
        aria-label="Fleet live map"
      />,
    )
    const pin = screen.getByRole('button', { name: 'Point of interest Lake View Tower' })
    expect(pin).toBeInTheDocument()
    // Hover → tooltip with name + radius line.
    fireEvent.mouseEnter(pin)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Radius 43 meters')
    fireEvent.mouseLeave(pin)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})

describe('LiveMapView — resting basemap (round-1 visual #8 / UX finding 2)', () => {
  it('defaults to the MUTED-but-COLOURED SPEC §1 style, never raw de-saturated Positron', () => {
    render(<LiveMapView vehicles={VEHICLES} cluster={false} aria-label="Fleet live map" />)
    // jsdom has no usable fetch/Blob chain, so the hook holds its fallback —
    // which is still the muted style, not `DEFAULT_MAP_STYLE` by omission.
    expect(screen.getByTestId('fake-maplibre-map')).toHaveAttribute('data-style', MUTED_MAP_STYLE)
  })

  it('picks up an externally-set GLOBAL basemap id (app-wide sync, spec point 5)', () => {
    setGlobalBasemapId('satellite')
    try {
      render(<LiveMapView vehicles={VEHICLES} cluster={false} aria-label="Fleet live map" />)
      expect(screen.getByTestId('fake-maplibre-map')).toHaveAttribute('data-style', BRIGHT_MAP_STYLE)
    } finally {
      setGlobalBasemapId('muted')
    }
  })

  it('still honours an explicit styleUrl (the hybrid view drives its own layers cycle)', () => {
    render(
      <LiveMapView vehicles={VEHICLES} cluster={false} styleUrl="https://example.test/style.json" aria-label="Fleet live map" />,
    )
    expect(screen.getByTestId('fake-maplibre-map')).toHaveAttribute('data-style', 'https://example.test/style.json')
  })
})

describe('LiveMapView — marker → selection seam (interaction 14b)', () => {
  it('emits the clicked vehicle id upward so the list can select and scroll to its row', () => {
    const onSelect = vi.fn()
    render(<LiveMapView vehicles={VEHICLES} cluster={false} selectedId={null} onSelect={onSelect} aria-label="Fleet live map" />)
    fireEvent.click(screen.getByRole('button', { name: 'Y 31022 · Moving · 100 km/h' }))
    expect(onSelect).toHaveBeenCalledWith('V-1')
  })
})

describe('LiveMapView — floating tool chrome (SPEC §2.3)', () => {
  it('paints no tool stack by default (a host with its own chrome must not double up)', () => {
    render(<LiveMapView vehicles={VEHICLES} cluster={false} aria-label="Fleet live map" />)
    expect(screen.queryByRole('button', { name: 'Traffic overlay' })).not.toBeInTheDocument()
  })

  it('renders the full Figma control set behind showTools — the map-only view fix', () => {
    render(<LiveMapView vehicles={VEHICLES} cluster={false} showTools zonesAvailable poisAvailable aria-label="Fleet live map" />)
    for (const label of [
      'Search places on the map',
      'Switch basemap style',
      'Traffic overlay',
      'Points of interest',
      'Zones',
      // `cluster={false}` → the eye reads as the action it will perform.
      'Enable clustering',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('eye-off empties the marker set without touching the caller\'s vehicle list', () => {
    render(<LiveMapView vehicles={VEHICLES} cluster={false} markersHidden showTools aria-label="Fleet live map" />)
    expect(screen.queryByRole('button', { name: 'Y 31022 · Moving · 100 km/h' })).not.toBeInTheDocument()
    // The sr-only text alternative still lists every vehicle (UX-9).
    expect(screen.getByRole('table', { name: /vehicles on the map/i })).toBeInTheDocument()
  })

  it('drops a POI pin at a picked place and flies the camera there (SPEC 3.18)', async () => {
    render(
      <LiveMapView
        vehicles={VEHICLES}
        cluster={false}
        showTools
        tools={['search', 'pin']}
        places={[{ id: 'p1', name: 'North Terminal', position: [11, 11] }]}
        aria-label="Fleet live map"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Drop a point of interest at a place' }))
    await waitFor(() => expect(screen.getByText('North Terminal')).toBeInTheDocument(), { timeout: 3000 })
    fireEvent.click(screen.getByText('North Terminal'))
    expect(screen.getByRole('button', { name: 'Point of interest North Terminal' })).toBeInTheDocument()
    expect(reactMapGlTestState.lastFakeMap!.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [11, 11] }),
    )
  })
})
