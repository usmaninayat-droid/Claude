import { useState } from 'react'
import { LiveMapView } from '@fams/v5-templates/map'
import { deriveLiveVehicles, liveMonitoringConfig, liveVehicleRecords, liveVehiclePopupData } from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

const VEHICLES = deriveLiveVehicles(liveMonitoringConfig, liveVehicleRecords)

/** Neutral demo places/zones — never real geography, matching the pattern
 *  every other map demo in this showcase already follows. */
const DEMO_PLACES = [
  {
    id: 'p1',
    name: 'North Terminal',
    position: [10.05, 10.05] as [number, number],
    category: 'Terminal',
    address: 'North Terminal, Sample District, Demoland',
  },
  {
    id: 'p2',
    name: 'South Yard',
    position: [15.02, -4.98] as [number, number],
    category: 'Yard',
    address: 'South Yard, Lower District, Demoland',
  },
]
/** Saved zones — the search's dotted-quad row template (colour swatch + type pill + "+N more"). */
const DEMO_ZONES = [
  {
    id: 'z1',
    label: 'North Terminal',
    color: '#F04438',
    tags: ['parked-zone', 'restricted', 'customer-site', 'depot'],
    points: [
      [10.0, 10.0],
      [10.1, 10.0],
      [10.1, 10.1],
      [10.0, 10.1],
    ] as [number, number][],
  },
]
/** POIs — the search's flag row template. */
const DEMO_POIS = [
  {
    id: 'poi1',
    name: 'North Fuel Point',
    position: [10.07, 10.03] as [number, number],
    color: '#F79009',
    radiusMeters: 80,
    tags: ['fuel', 'rest-stop', 'workshop'],
  },
]
const DEMO_SHORTCUTS = [
  { id: 's1', title: 'Fleet Tools', chips: ['Dashboard', 'Assets', 'Reports'], onActivate: () => {} },
]

/**
 * LiveMapViewDemo — the live-monitoring map surface. Real WebGL in the
 * browser: like MapPanelDemo, this page imports the heavy
 * `@fams/v5-templates/map` entry directly (every other consumer goes through
 * `MapView`'s lazy slot).
 */
export default function LiveMapViewDemo() {
  const [selectedId, setSelectedId] = useState<string | null>('V-103')
  return (
    <DocPage
      title="LiveMapView"
      badge="wip"
      summary="Live-monitoring map surface (DRAFT) — 3D-art status-ring VehicleMarkers with plate + speed/dwell chips, segmented ClusterBadge aggregates with click-to-expansion-zoom, and the anchored 4-tab LiveVehiclePopup vehicle card, all on MapPanel's DOM-marker channel. Ships from @fams/v5-templates/map; ModuleView reaches it lazily through MapView."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Zoom out to watch markers aggregate into segmented cluster badges; click a cluster to zoom
          until it splits. Click a marker to select it (ring emphasis + chips) and open the vehicle
          card — its Critical Events / Trips / Devices tabs are fed here via{' '}
          <Code>getPopupData</Code>. Selection is controlled in this demo (<Code>V-103</Code> starts
          selected). <Code>showTools</Code> below also enables the floating chrome: the top-left
          magnifier expands into the "search anything" dropdown — one FLAT list mixing all three
          row templates: gazetteer places (pin glyph, address subtitle), saved zones (geofence
          glyph, colour swatch + type pill + "+N more"), POIs (flag glyph, tag chips), plus app
          shortcuts and every vehicle — <Code>searchProviders</Code> defaults to <Code>createDefaultSearchProviders</Code>{' '}
          built from this demo's own data) — pick a result to fly to it and drop the accent-colour
          highlight + "Assets Nearby" radius slider. The bottom-left stack also gets the cluster
          toggle next to eye-off, persisted to <Code>localStorage</Code>.
        </Prose>
        <div className="h-[32rem]">
          <LiveMapView
            vehicles={VEHICLES}
            selectedId={selectedId}
            onSelect={setSelectedId}
            getPopupData={() => liveVehiclePopupData}
            showTools
            places={DEMO_PLACES}
            searchableZones={DEMO_ZONES}
            pois={DEMO_POIS}
            searchShortcuts={DEMO_SHORTCUTS}
            aria-label="Live monitoring demo map"
          />
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'vehicles', type: 'LiveVehicleDatum[]', required: true, description: 'The fleet — id, [lng,lat] position, status, plate/speed/dwell/heading/driver facets (photoUrl is deprecated and never rendered).' },
            { prop: 'selectedId', type: 'string | null', description: 'Controlled selection (popup + marker emphasis); omit for uncontrolled.' },
            { prop: 'onSelect', type: '(id: string | null) => void', description: 'Selection intent — marker click, popup close (null).' },
            { prop: 'renderPopup', type: '(v: LiveVehicleDatum) => ReactNode', description: 'Popup body override; default is LiveVehiclePopup.' },
            { prop: 'getPopupData', type: '(v) => LiveVehiclePopupData | undefined', description: 'Feeds the default popup’s Critical Events / Trips / Devices tabs.' },
            { prop: 'onOpenVehicle', type: '(v: LiveVehicleDatum) => void', description: 'Default popup’s open-in-new (vehicle profile navigation).' },
            { prop: 'cluster', type: 'boolean', description: 'Fully-controlled clustering override. Omit for the persisted, cross-tab-synced default the tool stack’s cluster-toggle button drives.' },
            { prop: 'searchProviders', type: 'MapSearchProvider[]', description: 'Pluggable "search anything" result sources. Defaults to createDefaultSearchProviders({ places, zones: searchableZones, vehicles, shortcuts: searchShortcuts }).' },
            { prop: 'searchableZones', type: 'LiveZoneDatum[]', description: 'Saved zones ("Parked Zone" rows) for the default search providers.' },
            { prop: 'searchShortcuts', type: 'MapSearchShortcut[]', description: 'App-shortcut quick-jump rows with capability chips.' },
            { prop: 'focusPosition', type: 'LngLat | null', description: 'Declarative camera nudge — pans/zooms to a position (list⇄map sync).' },
            { prop: 'onViewportChange', type: '(bbox: [number,number,number,number], zoom: number) => void', description: 'Map bounds + zoom on load and on every camera move — the seam behind “Sync list with Map”.' },
            { prop: 'zones', type: 'MapZoneDatum[]', description: 'GPU zone polygons (passthrough to MapPanel).' },
            { prop: "'aria-label'", type: 'string', required: true, description: 'Accessible name of the map region.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Derive vehicles from blueprint records with deriveLiveVehicles(config, records) — uiConfig.map names the columns.',
            'Keep selection state above this component when a list panel must stay in sync (LiveHybridView does exactly that).',
            'Feed getPopupData from your store — the surface never fetches (rule 8).',
          ]}
          donts={[
            'Don’t import @fams/v5-templates/map from app code that might not render a map — go through MapView’s lazy slot.',
            'Don’t re-map statuses to custom colors — Moving/Idling/Stopped/Non-Reporting map to success/warning/error/muted tokens.',
            'Don’t mount two maps on one page (MapPanel’s one-map guard will render a fallback card).',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Every marker and cluster is a real button — plate + speed/dwell in the marker’s aria-label, "Expand cluster of N" on clusters.',
            'The canvas carries the aria-label and is described by a visually-hidden table of every vehicle (name / status / speed-or-dwell).',
            'The popup card closes on Escape and its header actions are labeled buttons.',
            'Status is never colour alone — the popup states it in text and the sr table repeats it.',
            'The search dropdown is a combobox (aria-activedescendant) — arrow keys move the active row, Enter selects it, Escape clears/closes.',
            'The bottom-start EYE button IS the clustering toggle — its accessible name always names the action that will happen ("Disable clustering" while on) and the glyph flips eye / eye-off.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
