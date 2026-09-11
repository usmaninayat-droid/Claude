import { lazy, Suspense, type ReactNode } from 'react'
// TYPE-ONLY map-entry imports — erased at build time (lazy-weight rule; see
// `views/MapView.tsx`'s header for the package-specifier mechanism).
import type {
  LngLat,
  MapClusterDatum,
  MapMarkerDatum,
  MapMarkerRenderState,
  MapPanelProps,
  MapPathDatum,
  MapZoneDatum,
} from '../../map/MapPanel.types'
import type { MapControlsVariant } from '../../map/chrome/MapControls'
import { useGlobalBasemapStyleUrl } from '../../map/global-basemap-store'

/**
 * RecordMapSlot — the LIGHT-BARREL slot for a plain record map. [tier-2 internal]
 *
 * `views/MapView.tsx` is the same mechanism for the *fleet* map (it reaches
 * `LiveMapView`, whose whole prop surface is vehicles). The generic hybrid
 * lens needs the un-flavoured `MapPanel` instead, so this is the second — and
 * last — lazy door onto `@fams/v5-templates/map`: a package-specifier dynamic
 * `import()`, never a relative `../map`, so the light barrel still ships zero
 * bytes of maplibre/deck.gl.
 */
const LazyMapPanel = lazy(() => import('@fams/v5-templates/map').then((mod) => ({ default: mod.MapPanel })))

export interface RecordMapSlotProps {
  markers: MapMarkerDatum[]
  zones: MapZoneDatum[]
  /** Route polylines (a selected record's actual/planned path, a replay's travelled route) — straight `MapPanel.paths` passthrough. Omit for no route. */
  paths?: MapPathDatum[]
  selectedMarkerId?: string
  onMarkerClick?: (marker: MapMarkerDatum) => void
  onZoneClick?: (zone: MapZoneDatum) => void
  renderMarkerPopup?: (marker: MapMarkerDatum) => ReactNode
  onPopupClose?: () => void
  focusPosition?: MapPanelProps['focusPosition']
  /** Initial camera for the uncontrolled map (e.g. the blueprint's `uiConfig.map.center`). Omitted → MapPanel's own world default. */
  defaultViewState?: MapPanelProps['defaultViewState']
  fitToMarkersNonce?: number
  styleUrl?: string
  editable?: boolean
  onZoneDrawn?: MapPanelProps['onZoneDrawn']
  /** Pseudo-traffic overlay (SPEC 3.19) — straight `MapPanel.traffic` passthrough, so the Live-Monitoring tools stack's traffic toggle works over a record map too. */
  traffic?: boolean
  /** Camera-viewport reporting (`MapPanel.onViewportChange`) — the "Sync With Map" seam, same contract `LiveMapView` forwards for the fleet hybrid. */
  onViewportChange?: MapPanelProps['onViewportChange']
  /**
   * Opt-in marker clustering (`uiConfig.map.cluster`) — the generic lens
   * still defaults to one-circle-per-record (see the `cluster` prop's own
   * comment below); a module that opts in also supplies `renderMarker` (a
   * DOM marker needs a DOM cluster aggregate too, same as `LiveMapView`).
   * @default false
   */
  cluster?: boolean
  /** DOM marker renderer (e.g. a config-driven `vehicleArt` pin) — omitted keeps the plain GPU circle layer. */
  renderMarker?: (marker: MapMarkerDatum, state: MapMarkerRenderState) => ReactNode
  /** DOM cluster-aggregate renderer — only used when `cluster` + `renderMarker` are both set. */
  renderCluster?: (cluster: MapClusterDatum) => ReactNode
  onClusterClick?: (clusterId: number, position: LngLat, expansionZoom: number) => void
  clusterAriaLabel?: (cluster: MapClusterDatum) => string
  clusterTooltip?: (cluster: MapClusterDatum) => string
  /** Zoom/fullscreen cluster geometry (`MapPanel.controlsVariant`).
   *  @default 'figma' — Live Monitoring's zoom-pill, so every record-map
   *  hybrid speaks the same map-control language as the fleet map. */
  controlsVariant?: MapControlsVariant
  /** Suppress the detached fullscreen tile under the zoom pill (`uiConfig.map.hideFullscreenControl`) — straight `MapPanel.hideFullscreenControl` passthrough. */
  hideFullscreenControl?: boolean
  'aria-label': string
  'aria-describedby'?: string
}

/** Dimension-reserving placeholder (UX J.64 — the lens must not jump on load). */
export function RecordMapFallback({ label = 'Loading map' }: { label?: string }) {
  return <div role="status" aria-label={label} className="h-full min-h-64 w-full animate-pulse rounded-md bg-muted" />
}

export function RecordMapSlot({
  markers,
  zones,
  styleUrl,
  cluster = false,
  renderMarker,
  renderCluster,
  onClusterClick,
  clusterAriaLabel,
  clusterTooltip,
  controlsVariant = 'figma',
  ...rest
}: RecordMapSlotProps) {
  // With no explicit `styleUrl` the record map follows the APP-WIDE basemap
  // selection (map-layer-switcher spec point 5).
  const globalStyleUrl = useGlobalBasemapStyleUrl()
  return (
    <Suspense fallback={<RecordMapFallback />}>
      <LazyMapPanel
        markers={markers}
        zones={zones}
        styleUrl={styleUrl ?? globalStyleUrl}
        // One map control language app-wide (Design-Lead call, 2026-08-31):
        // every record-map hybrid (incidents at minimum — the seam is
        // generic, so any future one inherits it too) now gets the SAME
        // zoom-pill + fullscreen cluster Live Monitoring's fleet map uses,
        // not the un-flavoured four-button `'stacked'` default. Still a
        // plain passthrough prop — a caller with its own reason to keep the
        // stacked variant still can.
        controlsVariant={controlsVariant}
        // Records attached to one zone share its centroid, so the pins are
        // fanned onto a ring by `record-map-model`'s de-collision rather than
        // aggregated: SPEC §1.3 draws one circle per record, and a cluster
        // badge would hide exactly the per-record colour the legend keys —
        // UNLESS the caller opts in (`uiConfig.map.cluster`, e.g. a fixed
        // sensor network with `renderMarker` of its own), in which case this
        // mirrors `LiveMapView`'s own cluster + DOM-marker pairing verbatim.
        cluster={cluster}
        renderMarker={renderMarker}
        renderCluster={renderCluster}
        onClusterClick={onClusterClick}
        clusterAriaLabel={clusterAriaLabel}
        clusterTooltip={clusterTooltip}
        className="h-full min-h-0"
        {...rest}
      />
    </Suspense>
  )
}

RecordMapSlot.displayName = 'RecordMapSlot'
