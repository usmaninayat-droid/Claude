import { useState } from 'react'
import { Switch, Label } from '@fams/ui-kit'
import { MapPanel, TrafficLegend, type MapZoneDatum } from '@fams/v5-templates/map'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'
import { sampleHeat, sampleMarkers, sampleZones } from './map-fixtures'

/**
 * MapPanelDemo — the MapLibre GL + deck.gl + TerraDraw map template (phase 2
 * §3). Real WebGL in the browser (unlike this package's other demos, this
 * one imports `@fams/v5-templates/map` — the heavy, separate entry — see
 * that package's README "MapPanel — a second, heavy entry point" section).
 */
export default function MapPanelDemo() {
  const [showMarkers, setShowMarkers] = useState(true)
  const [cluster, setCluster] = useState(false)
  const [showZones, setShowZones] = useState(true)
  const [showHeat, setShowHeat] = useState(false)
  const [editable, setEditable] = useState(false)
  const [traffic, setTraffic] = useState(false)
  const [drawnZones, setDrawnZones] = useState<MapZoneDatum[]>([])

  return (
    <DocPage
      title="MapPanel"
      badge="wip"
      summary="The FAMS DS map template — MapLibre GL (via react-map-gl) with deck.gl GPU layers (markers, supercluster clustering, heatmap, geo-json zones) interleaved into MapLibre's own WebGL context, and TerraDraw for geofence draw/edit. Ported from the Leaflet-era reference onto a GPU-only rendering path (perf rule 3 — never DOM markers)."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Toggle markers/clustering/zones/heat/draw below. Draw a geofence (polygon or circle) with <Code>editable</Code> on — completed
          shapes are reported below the map as GeoJSON via <Code>onZoneDrawn</Code>.
        </Prose>
        <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <label className="flex items-center gap-2">
            <Switch checked={showMarkers} onCheckedChange={setShowMarkers} />
            <Label className="text-body-sm">Markers</Label>
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={cluster} onCheckedChange={setCluster} disabled={!showMarkers} />
            <Label className="text-body-sm">Cluster</Label>
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={showZones} onCheckedChange={setShowZones} />
            <Label className="text-body-sm">Zones</Label>
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={showHeat} onCheckedChange={setShowHeat} />
            <Label className="text-body-sm">Heat</Label>
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={editable} onCheckedChange={setEditable} />
            <Label className="text-body-sm">Draw geofence</Label>
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={traffic} onCheckedChange={setTraffic} />
            <Label className="text-body-sm">Traffic overlay</Label>
          </label>
        </div>
        <div className="h-[560px] overflow-hidden rounded-md border border-border">
          <MapPanel
            aria-label="Fleet demo map"
            defaultViewState={{ longitude: 55.28, latitude: 25.2, zoom: 11 }}
            markers={showMarkers ? sampleMarkers : []}
            cluster={cluster}
            zones={showZones ? sampleZones : []}
            heat={showHeat ? sampleHeat : []}
            editable={editable}
            traffic={traffic}
            legend={[
              { label: 'Reporting', color: '#12b76a' },
              { label: 'Idle', color: '#f79009' },
            ]}
            onZoneDrawn={(geojson) => setDrawnZones((cur) => [...cur, { id: `drawn-${cur.length + 1}`, points: geojson.geometry.coordinates[0] as [number, number][] }])}
            chrome={traffic ? <TrafficLegend /> : undefined}
          />
        </div>
        {drawnZones.length > 0 && (
          <pre className="mt-3 overflow-x-auto rounded-sm bg-muted p-3 text-caption text-muted-foreground">
            {JSON.stringify(drawnZones, null, 2)}
          </pre>
        )}
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'styleUrl', type: 'string', description: 'MapLibre style URL/JSON. Defaults to DEFAULT_MAP_STYLE (OpenFreeMap Liberty).' },
            { prop: 'viewState / defaultViewState / onViewStateChange', type: 'MapViewState / fn', description: 'Controlled or uncontrolled camera.' },
            { prop: 'markers / zones / heat', type: 'MapMarkerDatum[] / MapZoneDatum[] / MapHeatDatum[]', description: 'GPU-rendered data layers (deck.gl) — never DOM markers.' },
            { prop: 'cluster / clusterOptions', type: 'boolean / MapPanelClusterOptions', description: 'supercluster grouping for markers.' },
            { prop: 'onMarkerClick / onClusterClick / onZoneClick', type: 'fn', description: 'Pick callbacks routed by id, never raw deck.gl picking info.' },
            { prop: 'editable / onZoneDrawn / onZoneChanged', type: 'boolean / fn', description: 'TerraDraw geofence draw/edit (polygon + circle).' },
            {
              prop: 'selectedMarkerId / renderMarkerPopup / onPopupClose',
              type: 'string / (marker) => ReactNode / fn',
              description:
                'Controlled marker popup — MapPanel owns the chrome and the Escape/close dismissal, the caller owns the body and what a selection means.',
            },
            {
              prop: 'aria-describedby',
              type: 'string',
              description:
                'Id of a visually-hidden table of what the surface paints — the relief channel a canvas needs, exactly as a chart does.',
            },
            {
              prop: 'traffic',
              type: 'boolean',
              description:
                'Paints the pseudo-traffic overlay — a native MapLibre line layer along the basemap’s motorway/trunk/primary/secondary roads, coloured green/orange/red/dark-red by a DETERMINISTIC seeded congestion value (FAMS ships no live feed). Sits above the basemap and below every marker/cluster; re-evaluates on viewport change, debounced. Pair it with TrafficLegend.',
            },
            { prop: 'legend / controls', type: '{label,color}[] / boolean', description: 'Token-styled chrome.' },
          ]}
        />
      </DocSection>

      <DocSection id="traffic-legend" title="TrafficLegend">
        <Prose>
          The key that appears with the traffic overlay. Four ordinal states — <Code>Free</Code>, <Code>Slow</Code>, <Code>Heavy</Code>,{' '}
          <Code>Stopped</Code> — each carrying its word as well as its colour, so the ramp is readable without colour vision. Swatches
          resolve from the same status tokens the map layer paints with (<Code>--color-success</Code>, <Code>--color-warning</Code>,{' '}
          <Code>--color-destructive</Code>, <Code>--color-error-800</Code>), so the key can never drift from the map.
        </Prose>
        <div className="relative h-40 overflow-hidden rounded-md border border-border bg-muted">
          <TrafficLegend />
        </div>
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Import from @fams/v5-templates/map, not the main barrel — this keeps the map stack out of every other consumer’s bundle.',
            'Mount at most one MapPanel per page — a second concurrent instance renders a fallback card and logs a console error (perf rule 3).',
            'Pass business colors (status→color) as plain data on markers/zones/legend — MapPanel never invents a status palette.',
          ]}
          donts={[
            'Don’t import @fams/v5-templates/map from a route that might not render a map — use a route-level lazy import instead.',
            'Don’t render MapPanel more than once on the same page.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'aria-label is required — the map region has no visible heading by default.',
            'Every control (zoom in/out, reset bearing, fullscreen, draw tools) is a real <button> with an aria-label + visible focus ring.',
            'The one-map-per-page fallback card uses role="status" so screen readers announce why no map rendered.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
