import { useState } from 'react'
import { MapContainer, VehicleMarker, VehiclePopupCard, type MapControlConfig } from '@fams/ui-kit'
import { Gauge, Navigation, Clock } from '@fams/ui-kit/icons'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, CodeBlock, Code } from '../docs'

/** Stand-in for the real map canvas (MapLibre/Mapbox) — a flat tinted surface
 * is enough to demo the chrome; no tile dependency needed. */
function FakeMapSurface() {
  return (
    <div
      className="absolute inset-0 bg-muted"
      style={{
        backgroundImage:
          'linear-gradient(0deg, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    >
      <div className="absolute left-[18%] top-[38%]">
        <VehicleMarker label="45213" meta="12 mins" tone="success" showPill />
      </div>
      <div className="absolute left-[52%] top-[62%]">
        <VehicleMarker label="30188" meta="idle" tone="warning" />
      </div>
      <div className="absolute left-[74%] top-[24%]">
        <VehicleMarker label="77104" meta="stopped" tone="error" />
      </div>
    </div>
  )
}

function InteractiveContainer() {
  const [layersActive, setLayersActive] = useState(true)
  const [trafficActive, setTrafficActive] = useState(false)
  const [geofenceActive, setGeofenceActive] = useState(false)
  const [markersHidden, setMarkersHidden] = useState(false)
  const [showPopup, setShowPopup] = useState(true)

  const controls: MapControlConfig = {
    onSearch: () => {},
    onDropPin: () => {},
    onRecenter: () => {},
    onToggleLayers: () => setLayersActive((v) => !v),
    layersActive,
    onToggleTraffic: () => setTrafficActive((v) => !v),
    trafficActive,
    onToggleGeofence: () => setGeofenceActive((v) => !v),
    geofenceActive,
    onToggleMarkers: () => setMarkersHidden((v) => !v),
    markersHidden,
    onZoomIn: () => {},
    onZoomOut: () => {},
    onFullscreen: () => setShowPopup((v) => !v),
  }

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-md border border-border">
      <MapContainer
        controls={controls}
        overlay={
          showPopup ? (
            <div className="absolute bottom-4 start-4 max-w-[calc(100%-2rem)]">
              <VehiclePopupCard
                model="Isuzu FVR — Compactor"
                plate="AUH 45213"
                driver="Rashid Al Mansoori"
                location="Al Ain — Zakher"
                status="Moving"
                statusTone="success"
                statusSince="since 12 minutes"
                fields={[
                  { icon: <Gauge />, label: 'Speed', value: '38 km/h' },
                  { icon: <Navigation />, label: 'Heading', value: 'North-east' },
                  { icon: <Clock />, label: 'On trip', value: '1h 42m' },
                ]}
                onClose={() => setShowPopup(false)}
              />
            </div>
          ) : undefined
        }
      >
        {markersHidden ? <div className="absolute inset-0 bg-muted" /> : <FakeMapSurface />}
      </MapContainer>
    </div>
  )
}

const USAGE = `<MapContainer
  controls={{
    onSearch, onDropPin, onRecenter,
    onToggleLayers, layersActive,
    onToggleTraffic, trafficActive,
    onToggleGeofence, geofenceActive,
    onToggleMarkers, markersHidden,
    onZoomIn, onZoomOut, onFullscreen,
  }}
  overlay={<VehiclePopupCard ... />}
>
  <MapCanvas />
</MapContainer>`

/**
 * MapContainerDemo — standalone showcase for the MapContainer domain component
 * (the reusable map chrome shell: four corner control clusters + overlay slot).
 * Belongs under the "Map" showcase page (`showcase/MapKit.tsx`) once wired by the orchestrator.
 */
export default function MapContainerDemo() {
  return (
    <DocPage
      title="MapContainer"
      badge="stable"
      summary="Engine-agnostic map chrome shell — lays out the four corner control clusters (top-start: search/pin/recenter · top-end: layers/traffic/geofence · bottom-start: hide/show markers · bottom-end: zoom/fullscreen) around a caller-supplied map canvas. Every control is opt-in: pass a handler to render its tile, omit it to hide it."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Click any control tile — state is wired locally in this demo; fullscreen toggles the{' '}
          <Code>VehiclePopupCard</Code> overlay off/on. The map canvas itself (MapLibre in
          production) is supplied as <Code>children</Code>; here a flat tinted surface with three{' '}
          <Code>VehicleMarker</Code>s stands in for the live tile layer.
        </Prose>
        <InteractiveContainer />
        <CodeBlock code={USAGE} lang="tsx" />
      </DocSection>

      <DocSection id="composition" title="Corner cluster composition">
        <Prose>
          Every control is opt-in — pass a handler to render its tile, omit it to hide the whole
          cluster. Composes <Code>MapControlGroup</Code> / <Code>MapIconButton</Code> /{' '}
          <Code>MapZoomControl</Code> for the chrome.
        </Prose>
        <Gallery
          minColRem={28}
          maxCols={2}
          items={[
            {
              label: 'All clusters',
              caption: 'search/pin/recenter · layers/traffic/geofence · markers · zoom/fullscreen',
              node: (
                <div className="relative h-[200px] w-full overflow-hidden rounded-md border border-border">
                  <MapContainer
                    controls={{
                      onSearch: () => {},
                      onDropPin: () => {},
                      onRecenter: () => {},
                      onToggleLayers: () => {},
                      layersActive: true,
                      onToggleTraffic: () => {},
                      onToggleGeofence: () => {},
                      onToggleMarkers: () => {},
                      onZoomIn: () => {},
                      onZoomOut: () => {},
                      onFullscreen: () => {},
                    }}
                  >
                    <FakeMapSurface />
                  </MapContainer>
                </div>
              ),
            },
            {
              label: 'Zoom only',
              caption: 'omitting the other handlers hides those clusters entirely',
              node: (
                <div className="relative h-[200px] w-full overflow-hidden rounded-md border border-border">
                  <MapContainer controls={{ onZoomIn: () => {}, onZoomOut: () => {} }}>
                    <FakeMapSurface />
                  </MapContainer>
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <div className="text-body-sm font-semibold text-foreground">MapContainer</div>
        <PropsTable
          rows={[
            {
              prop: 'children',
              type: 'ReactNode',
              required: true,
              description: 'The map canvas / engine element (e.g. a MapLibre map or a div).',
            },
            {
              prop: 'controls',
              type: 'MapControlConfig',
              description: 'Which corner controls to render + their handlers. See below.',
            },
            {
              prop: 'overlay',
              type: 'ReactNode',
              description: 'Extra overlay content — an already-positioned popup, drawing tool, etc.',
            },
            {
              prop: 'className',
              type: 'string',
              description: 'Extra classes on the outer relative wrapper.',
            },
          ]}
        />

        <div className="text-body-sm font-semibold text-foreground">MapControlConfig</div>
        <PropsTable
          rows={[
            { prop: 'onSearch', type: '() => void', description: 'Renders the search tile (top-start).' },
            { prop: 'onDropPin', type: '() => void', description: 'Renders the drop-pin tile (top-start).' },
            { prop: 'onRecenter', type: '() => void', description: 'Renders the recenter tile (top-start).' },
            { prop: 'onToggleLayers', type: '() => void', description: 'Renders the layers tile (top-end).' },
            { prop: 'layersActive', type: 'boolean', default: 'false', description: 'Tints the layers tile active.' },
            { prop: 'onToggleTraffic', type: '() => void', description: 'Renders the traffic tile (top-end).' },
            { prop: 'trafficActive', type: 'boolean', default: 'false', description: 'Tints the traffic tile active.' },
            { prop: 'onToggleGeofence', type: '() => void', description: 'Renders the geofence tile (top-end).' },
            { prop: 'geofenceActive', type: 'boolean', default: 'false', description: 'Tints the geofence tile active.' },
            { prop: 'onToggleMarkers', type: '() => void', description: 'Renders the hide/show-markers tile (bottom-start).' },
            {
              prop: 'markersHidden',
              type: 'boolean',
              default: 'false',
              description: 'True when markers are currently hidden — flips the eye icon + active tint.',
            },
            { prop: 'onZoomIn', type: '() => void', description: 'Renders the zoom pill’s + half (bottom-end).' },
            { prop: 'onZoomOut', type: '() => void', description: 'Renders the zoom pill’s − half (bottom-end).' },
            { prop: 'onFullscreen', type: '() => void', description: 'Renders the detached fullscreen tile below the zoom pill.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Pass only the control handlers a page actually supports — an omitted handler cleanly hides its cluster.',
            'Keep the *Active flags in sync with real toggle state so the tint reflects reality.',
            'Position overlay content (popups, drawing tools) yourself — MapContainer only renders the slot.',
            'Reuse this shell for every map page instead of re-implementing the corner chrome per module.',
          ]}
          donts={[
            'Don’t pass a no-op handler just to force a tile to render — that reads as a broken control.',
            'Don’t assume a specific map engine; children is a plain ReactNode, so any canvas works.',
            'Don’t render more than one overlay slot — compose multiple pieces into a single overlay node.',
            'Don’t restyle the corner offsets per page; they are fixed to match the Live Monitoring spec.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Each rendered control is a native, labeled MapIconButton — full keyboard reachability and focus rings.',
            'Corner chrome is pointer-events: none by default so it never blocks map panning where no tile is rendered.',
            'The overlay slot only becomes interactive (pointer-events: auto) when content is actually supplied.',
            'Corner clusters use logical start/end offsets, so top-start/bottom-start flip to the visual right under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
