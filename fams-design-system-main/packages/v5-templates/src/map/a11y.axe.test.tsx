// MUST be the first import — see `test/map-mocks.ts`'s header.
import { reactMapGlTestState } from './test/map-mocks'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { MapPanel } from './MapPanel'
import { LocationMap } from './LocationMap'
import { LocationMapSection } from './LocationMapSection'
import { LocationPickerMap } from './LocationPickerMap'
import { LiveMapView } from './LiveMapView'
import { LiveVehiclePopup } from './LiveVehiclePopup'
import { PoiPin } from './PoiPin'
import { MapSearchPanel } from './chrome/MapSearchPanel'
import { SearchHighlightPin } from './SearchHighlightPin'
import { WeatherStationDrawer } from './WeatherStationDrawer'
import { WeatherStationMarker } from './WeatherStationMarker'
import { MapOverlayLayersPanel } from './chrome/MapOverlayLayersPanel'
import { WEATHER_OVERLAY_IDS, WEATHER_OVERLAY_LABELS } from './weather-types'
import { sampleWeatherStations } from './weather-fixtures'
import type { LiveVehicleDatum } from './live-types'
import type { MapSearchResult } from './search/search-types'
import { __resetSingleMapGuardForTests } from './mount-guard'
import { sampleHeat, sampleMarkers, sampleZones } from './fixtures'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'

/**
 * a11y.axe.test.tsx — package-local axe sweep scoped to `map/`, mirroring
 * `src/a11y.axe.test.tsx`'s pattern (task 2.3) but kept separate: this
 * folder's tests need `test/map-mocks.ts` (no real WebGL in jsdom), which
 * the rest of the package's tests don't carry.
 */

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion extends AxeMatchers {}
}

expect.extend({ toHaveNoViolations })

const axe = configureAxe({ rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })

afterEach(() => {
  __resetSingleMapGuardForTests()
  reactMapGlTestState.suppressLoad = false
  reactMapGlTestState.lastOnError = null
  vi.restoreAllMocks()
})

describe('MapPanel — axe', () => {
  /* The basemap-failure surface (UX-NOTES C16) — a state the sweep can only
     reach by modelling a style that never loads. */
  it('the tile-failure error state has no violations', async () => {
    reactMapGlTestState.suppressLoad = true
    const { container } = render(<MapPanel aria-label="Fleet map" markers={sampleMarkers} />)
    await act(async () => {
      reactMapGlTestState.lastOnError?.({ error: new Error('AJAXError') })
    })
    expect(container.querySelector('[data-slot="map-error-notice"]')).not.toBeNull()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('the default chrome (controls + legend) has no violations', async () => {
    const { container } = render(
      <MapPanel
        aria-label="Fleet map"
        markers={sampleMarkers}
        zones={sampleZones}
        heat={sampleHeat}
        legend={[{ label: 'Reporting', color: '#12b76a' }, { label: 'Stopped', color: '#f04438' }]}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('the toggleable legend (checkbox group) chrome has no violations', async () => {
    const { container } = render(
      <MapPanel
        aria-label="Fleet map"
        heat={sampleHeat}
        legendTitle="Events"
        legend={[
          { id: 'braking', label: 'Harsh Braking', color: '#f79009' },
          { id: 'overspeeding', label: 'Overspeeding', color: '#06b6d4' },
        ]}
        hiddenLegendIds={['overspeeding']}
        onLegendToggle={() => {}}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('the editable (draw toolbar) chrome has no violations', async () => {
    const { container } = render(<MapPanel aria-label="Fleet map" editable markers={sampleMarkers} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('the one-map-per-page fallback card has no violations', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(
      <>
        <MapPanel aria-label="First map" />
        <MapPanel aria-label="Second map" />
      </>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LocationMap, with pins/polygons + a corner overlay, has no violations', async () => {
    const { container } = render(
      <LocationMap
        aria-label="Ticket location"
        center={[55.27, 25.2]}
        pins={[{ id: 'p1', position: [55.27, 25.2] }]}
        polygons={[{ id: 'z1', points: [[55.2, 25.1], [55.3, 25.1], [55.3, 25.2]] }]}
        cornerOverlay={<span>Sector A</span>}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LiveMapView (markers + cluster + popup open) has no violations', async () => {
    const vehicles: LiveVehicleDatum[] = [
      {
        id: 'V-1',
        position: [10.001, 10.001],
        status: 'moving',
        name: 'Mitsubishi X6734',
        plate: 'Y 31022',
        speedKmh: 100,
        driver: 'Jhon Doe',
        location: 'West Bay - Doha',
        statusSince: 'since 2 minutes',
      },
      { id: 'V-2', position: [10.002, 10.002], status: 'idling', plate: 'D 88451', dwell: '12 mins' },
      { id: 'V-3', position: [15.0, -5.0], status: 'stopped', plate: 'A 10930', dwell: '37 mins' },
    ]
    const { container } = render(
      <LiveMapView vehicles={vehicles} selectedId="V-3" aria-label="Fleet live map" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LiveVehiclePopup (fully populated) has no violations', async () => {
    const vehicle: LiveVehicleDatum = {
      id: 'V-1',
      position: [55.271, 25.204],
      status: 'stopped',
      name: 'Mitsubishi X6734',
      plate: 'GFU47893',
      driver: 'Jhon Doe',
      location: 'West Bay - Doha',
      dwell: '37 mins',
      statusSince: 'since 2 minutes',
    }
    const { container } = render(
      <LiveVehiclePopup
        vehicle={vehicle}
        data={{
          events: [
            { id: 'ev1', name: 'Black Spot', subtype: 'Camera obstructed', location: 'West Bay - Doha', time: '07 Oct, 24 | 02:49 PM' },
          ],
          tripDates: [
            { id: 'today', label: 'Today', today: true },
            { id: 'd15', label: '15 Oct 2024' },
          ],
          tripSummary: { distance: '43 km', trips: 30, duration: '2h43m' },
          trips: [
            { id: 't1', startTime: '15:30', endTime: '11:21', origin: 'Cluster M', events: 2, distance: '30 KM', duration: '2h 43m' },
          ],
          devices: [
            { id: 'dv1', name: 'Temp Sensor', imei: '356938035643809', dataRec: '12:32', value: '54C', valueTone: 'error', trend: true },
          ],
        }}
        onClose={() => {}}
        onExpand={() => {}}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LiveVehiclePopup (no data — every tab still reachable with empty states, UX D28) has no violations', async () => {
    const vehicle: LiveVehicleDatum = {
      id: 'V-9',
      position: [55.271, 25.204],
      status: 'idling',
      name: 'Toyota Hilux',
      plate: 'D 88451',
      dwell: '12 mins',
    }
    const { container, getByRole } = render(<LiveVehiclePopup vehicle={vehicle} onClose={() => {}} />)
    // A labelled dialog whose bar carries three pinned tabs plus the ⋯ slot
    // that reaches the rest, even with no data.
    expect(getByRole('dialog', { name: 'Toyota Hilux' })).toBeInTheDocument()
    expect(getByRole('tab', { name: 'Critical Events' })).toBeInTheDocument()
    expect(getByRole('button', { name: 'More tabs' })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LiveMapView cluster targets carry the status-mix label (UX-8) with no violations', async () => {
    const vehicles: LiveVehicleDatum[] = [
      { id: 'C-1', position: [10.001, 10.001], status: 'moving', plate: 'A 1', speedKmh: 40 },
      { id: 'C-2', position: [10.002, 10.002], status: 'stopped', plate: 'A 2', dwell: '5 mins' },
    ]
    const { container, getByRole } = render(
      <LiveMapView vehicles={vehicles} aria-label="Fleet live map (clustered)" />,
    )
    expect(getByRole('button', { name: '2 vehicles, 1 moving, 1 stopped' })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LocationMapSection has no violations', async () => {
    const record: EntityRecord = {
      id: 'r1',
      loc: [55.27, 25.2],
      sectorLabel: 'Sector',
      sectorValue: 'Sector A',
    }
    const { container } = render(
      <LocationMapSection
        config={{} as EntityConfig}
        record={record}
        props={{ centerField: 'loc', cornerLabelField: 'sectorLabel', cornerValueField: 'sectorValue', title: 'Location' }}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('LocationPickerMap (readout card + related-pins toggle on) has no violations', async () => {
    const { container, getByRole } = render(
      <LocationPickerMap
        value={[51.531, 25.2854]}
        onChange={() => {}}
        draggable
        locationCard={{ label: 'Incident Location', value: 'West Bay, Doha' }}
        relatedPins={[{ id: 'c1', position: [51.5, 25.3], label: 'Complaint 1' }]}
        relatedPinsLabel="Linked Complaints"
        aria-label="Pick the incident location"
      />,
    )
    // Swept with the context pins REVEALED — the toggle's checked state is
    // where the extra markers (and their labels) enter the tree.
    fireEvent.click(getByRole('checkbox', { name: 'Linked Complaints' }))
    expect(await axe(container)).toHaveNoViolations()
  })

  it('PoiPin (hover tooltip open) has no violations', async () => {
    const { container, getByRole } = render(
      <PoiPin poi={{ id: 'poi-1', name: 'Lake View Tower', position: [10, 10], radiusMeters: 43 }} />,
    )
    getByRole('button', { name: 'Point of interest Lake View Tower' }).focus()
    expect(await axe(container)).toHaveNoViolations()
  })
})

const TOOLS_VEHICLES: LiveVehicleDatum[] = [
  { id: 'V-1', position: [10, 10], status: 'moving', plate: 'Y 31022', speedKmh: 100 },
]

describe('LiveMapTools — axe', () => {
  it('the full floating tool set (search + cluster toggle) has no violations', async () => {
    const { container } = render(
      <LiveMapView
        vehicles={TOOLS_VEHICLES}
        cluster={false}
        showTools
        zonesAvailable
        poisAvailable
        places={[{ id: 'p1', name: 'North Terminal', position: [11, 11], category: 'Terminal' }]}
        unavailableTools={[{ tool: 'traffic', message: 'No traffic feed here.' }]}
        aria-label="Fleet live map"
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('MapSearchPanel — axe', () => {
  const RESULTS: MapSearchResult[] = [
    { id: 'place-1', kind: 'place', title: 'Al Khor', subtitle: 'Al Khor Municipality, Qatar', position: [51.2, 25.68] },
    { id: 'zone-1', kind: 'zone', title: 'AUH EXIT 3', chips: ['Parked Zone', 'North', 'South', 'East'], position: [55.1, 25.1] },
    { id: 'shortcut-1', kind: 'shortcut', title: 'Fleet Tools', chips: ['Dashboard', 'Assets', 'Reports', 'Alerts'] },
  ]

  it('the open dropdown, with mixed place/zone/shortcut rows + chip overflow, has no violations', async () => {
    const { container } = render(
      <MapSearchPanel
        open
        onOpenChange={() => {}}
        providers={[{ id: 'p', search: async () => RESULTS }]}
        debounceMs={0}
      />,
    )
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
    expect(await axe(container)).toHaveNoViolations()
  })

  it('the "no matching results" empty state has no violations', async () => {
    const { container } = render(
      <MapSearchPanel open onOpenChange={() => {}} providers={[{ id: 'p', search: async () => [] }]} debounceMs={0} />,
    )
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('SearchHighlightPin — axe', () => {
  it('the hovered pin with the Assets Nearby panel + radius slider open has no violations', async () => {
    const { container, getByRole } = render(
      <SearchHighlightPin
        highlight={{ id: 'h1', title: 'Lusail, Al Daayen Municipality, Qatar', position: [51.49, 25.43], radiusKm: 5 }}
        assetsNearbyCount={3}
        onRadiusChange={() => {}}
        onClear={() => {}}
        open
        onOpenChange={() => {}}
      />,
    )
    expect(getByRole('slider')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })
})


describe('Weather monitoring layer — axe', () => {
  it('the overlay checkbox row has no violations', async () => {
    const { container } = render(
      <MapOverlayLayersPanel
        label="Weather overlays"
        entries={WEATHER_OVERLAY_IDS.map((id) => ({ id, label: WEATHER_OVERLAY_LABELS[id] }))}
        checkedIds={['stations']}
        onToggle={() => {}}
        meta="40 stations · 15:20"
        onRefresh={() => {}}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('a station marker, hover tooltip open, has no violations', async () => {
    const { container, getByRole } = render(<WeatherStationMarker station={sampleWeatherStations[0]} selected />)
    getByRole('button').focus()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('the docked station drawer has no violations', async () => {
    const { container } = render(<WeatherStationDrawer station={sampleWeatherStations[0]} onClose={() => {}} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('the drawer for a non-reporting station has no violations', async () => {
    const { container } = render(<WeatherStationDrawer station={sampleWeatherStations[3]} onClose={() => {}} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('the drawer for an INACTIVE station (active: false, the "No recent data" notice) has no violations', async () => {
    const { container } = render(<WeatherStationDrawer station={sampleWeatherStations[4]} onClose={() => {}} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
