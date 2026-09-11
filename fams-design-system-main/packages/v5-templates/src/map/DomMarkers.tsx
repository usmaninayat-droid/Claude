import { useMemo, type ReactNode } from 'react'
import { Marker, useMap } from 'react-map-gl/maplibre'
import type Supercluster from 'supercluster'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@fams/ui-kit'
import { cameraMotion } from './camera-motion'
import { getVisibleClusters, isCluster } from './cluster'
import { suppressedChipIds, type ChipCollisionItem } from './chip-collision'
import type { LngLat, MapClusterDatum, MapMarkerDatum, MapMarkerRenderState } from './MapPanel.types'

/**
 * DomMarkers — `MapPanel`'s DOM-marker channel (the `renderMarker` /
 * `renderCluster` props). [live-monitoring spec §1.3]
 *
 * The GPU scatterplot layer (`layers.ts`) stays the default for plain dots,
 * but the live-monitoring marker anatomy — photo inside a status ring,
 * flanking plate/speed chips, segmented cluster donuts — is real DOM/SVG
 * chrome (`@fams/ui-kit`'s `VehicleMarker`/`ClusterBadge`). This component
 * renders the CURRENTLY VISIBLE supercluster features (clusters + leftover
 * points) as MapLibre `Marker`s, which MapLibre positions via CSS transform
 * on every frame (no layout, UX-note perf rule), and which stay bounded in
 * number by the viewport query — never the full 1,000-vehicle set.
 *
 * Cluster clicks ease the camera to the cluster's expansion zoom centred on
 * the cluster (spec: click → zoom until it splits), then report through
 * `onClusterClick`. Marker/cluster elements provide their own interactive
 * semantics (the ui-kit components are `<button>`-rooted) — this file only
 * anchors them.
 */
/** Stable empty set — keeps the collision memo referentially quiet. */
const EMPTY_SET: Set<string> = new Set()

export interface DomMarkersProps {
  /** Full marker set — the non-clustered fallback when `index` is absent. */
  markers: MapMarkerDatum[]
  /** supercluster index — present only when clustering is on. */
  index?: Supercluster
  bbox: [number, number, number, number]
  zoom: number
  renderMarker: (marker: MapMarkerDatum, state: MapMarkerRenderState) => ReactNode
  renderCluster?: (cluster: MapClusterDatum) => ReactNode
  onClusterClick?: (clusterId: number, position: LngLat, expansionZoom: number) => void
  /** Accessible name for the cluster click target (UX-8) — the caller
   *  composes the status-mix sentence. Defaults to "Expand cluster of N". */
  clusterAriaLabel?: (cluster: MapClusterDatum) => string
  /**
   * Hover-triggered tooltip content for a cluster badge (AC-4 / SPEC
   * interaction #11): a status breakdown ("12 vehicles · 5 moving · 4
   * idling · 3 stopped") so the user has information scent before
   * committing to the click-to-decluster zoom. Omit to render no tooltip
   * (prior behaviour — only the accessible name above). Purely a hover/
   * focus affordance — never changes the existing click-to-decluster
   * `easeTo(...)` behaviour in `expand()` below.
   */
  clusterTooltip?: (cluster: MapClusterDatum) => ReactNode
  /**
   * The marker that always keeps its chips and wins every chip collision
   * (the selected vehicle) — UX finding 17.
   */
  priorityMarkerId?: string | null
  /**
   * Run the per-frame chip-collision pass (`chip-collision.ts`) and hand the
   * result to `renderMarker` as `state.chipSuppressed`. @default true
   */
  collideChips?: boolean
}

export function DomMarkers({
  markers,
  index,
  bbox,
  zoom,
  renderMarker,
  renderCluster,
  onClusterClick,
  clusterAriaLabel,
  clusterTooltip,
  priorityMarkerId,
  collideChips = true,
}: DomMarkersProps) {
  const { current: map } = useMap()
  const byId = useMemo(() => new Map(markers.map((m) => [m.id, m])), [markers])

  const features = useMemo(() => {
    if (!index) return null
    return getVisibleClusters(index, bbox, zoom)
  }, [index, bbox, zoom])

  /* Chip collision (UX finding 17) — projected in screen space for the
     CURRENT camera frame (`bbox`/`zoom` change on every move, which is the
     memo's trigger). Clusters go in as blockers; the selected marker gets
     the winning priority so its chips never disappear. */
  const suppressed = useMemo<Set<string>>(() => {
    const gl = map?.getMap?.()
    if (!collideChips || !gl || typeof gl.project !== 'function') return EMPTY_SET
    const paneWidth = gl.getContainer?.()?.clientWidth ?? 0
    if (!paneWidth) return EMPTY_SET
    const items: ChipCollisionItem[] = []
    const push = (id: string, position: LngLat, chips: boolean, priority: number) => {
      let point: { x: number; y: number }
      try {
        point = gl.project(position)
      } catch {
        return
      }
      if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return
      items.push({ id, x: point.x, y: point.y, chips, priority })
    }
    if (!features) {
      for (const marker of markers) push(marker.id, marker.position, true, marker.id === priorityMarkerId ? 2 : 1)
    } else {
      for (const feature of features) {
        const position = feature.geometry.coordinates as LngLat
        if (isCluster(feature)) {
          push(`cluster-${feature.properties.cluster_id as number}`, position, false, 3)
          continue
        }
        const id = (feature.properties as { markerId: string }).markerId
        push(id, position, true, id === priorityMarkerId ? 2 : 1)
      }
    }
    return suppressedChipIds(items, { paneWidth })
    // `bbox`/`zoom` are the CAMERA-FRAME trigger: the projection reads live
    // map state the linter cannot see through, so the viewport props are what
    // tell this memo the screen positions moved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collideChips, map, features, markers, priorityMarkerId, bbox, zoom])

  const stateFor = (id: string): MapMarkerRenderState => ({ chipSuppressed: suppressed.has(id), zoom })

  if (!features) {
    return (
      <>
        {markers.map((marker) => (
          <Marker key={marker.id} longitude={marker.position[0]} latitude={marker.position[1]} anchor="bottom">
            {renderMarker(marker, stateFor(marker.id))}
          </Marker>
        ))}
      </>
    )
  }

  return (
    <>
      {features.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates as LngLat
        if (isCluster(feature)) {
          const clusterId = feature.properties.cluster_id as number
          const count = feature.properties.point_count as number
          const expansionZoom = index!.getClusterExpansionZoom(clusterId)
          const leaves = index!
            .getLeaves(clusterId, Infinity)
            .map((leaf) => byId.get((leaf.properties as { markerId: string }).markerId))
            .filter((m): m is MapMarkerDatum => Boolean(m))
          const datum: MapClusterDatum = { id: clusterId, position: [lng, lat], count, markers: leaves, expansionZoom }
          const expand = () => {
            // Spec: cluster click → smooth zoom into the cluster until it
            // splits. The camera move is owned here (the one place that has
            // the map handle); the callback reports intent to the caller.
            // U4: `cameraMotion()` collapses this to an instant jump under
            // `prefers-reduced-motion: reduce` — it is the largest motion the
            // module produces (the whole pane pans AND zooms).
            map?.getMap().easeTo({ center: [lng, lat], zoom: expansionZoom, ...cameraMotion() })
            onClusterClick?.(clusterId, [lng, lat], expansionZoom)
          }
          const clusterLabel = clusterAriaLabel?.(datum) ?? `Expand cluster of ${count}`
          const tooltipContent = clusterTooltip?.(datum)
          const button = renderCluster ? (
            <button
              type="button"
              onClick={expand}
              aria-label={clusterLabel}
              // An AGGREGATE, not a vehicle — MapLibre's own generic
              // `aria-label="Map marker"` on the container cannot tell
              // them apart (see `VehicleMarker`'s `data-slot`).
              data-slot="map-cluster"
              className="block cursor-pointer rounded-full outline-none transition-transform hover:scale-105 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
            >
              {renderCluster(datum)}
            </button>
          ) : (
            <button
              type="button"
              onClick={expand}
              aria-label={clusterLabel}
              // An AGGREGATE, not a vehicle — MapLibre's own generic
              // `aria-label="Map marker"` on the container cannot tell
              // them apart (see `VehicleMarker`'s `data-slot`).
              data-slot="map-cluster"
              className="grid size-8 cursor-pointer place-items-center rounded-full bg-foreground text-xs font-bold text-background shadow-md outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {count}
            </button>
          )
          return (
            <Marker key={`cluster-${clusterId}`} longitude={lng} latitude={lat} anchor="center">
              {tooltipContent ? (
                // AC-4 hover state: a status-breakdown tooltip, reusing the
                // same ~120ms TooltipProvider convention as `NavRail` — see
                // `LiveMapView.tsx`'s `clusterSegments`/`clusterStatusLabel`
                // for the data this renders. Purely additive — `expand()`'s
                // click-to-decluster `easeTo(...)` above is untouched.
                <TooltipProvider delayDuration={120}>
                  <Tooltip>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="top">{tooltipContent}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                button
              )}
            </Marker>
          )
        }
        const marker = byId.get((feature.properties as { markerId: string }).markerId)
        if (!marker) return null
        return (
          <Marker key={marker.id} longitude={lng} latitude={lat} anchor="bottom">
            {renderMarker(marker, stateFor(marker.id))}
          </Marker>
        )
      })}
    </>
  )
}
