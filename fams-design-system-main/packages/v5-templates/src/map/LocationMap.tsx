import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { MapPanel } from './MapPanel'
import type { LngLat, MapMarkerDatum, MapZoneDatum } from './MapPanel.types'

/**
 * LocationMap — the generic DISPLAY map (figma-spec-detail.md §4's "Location"
 * section): a single center/zoom camera, pins, polygon overlays, and a
 * caller-supplied corner overlay slot (the spec's "Sector A" card) — all on
 * top of `MapPanel` (composed, never forked, per `v5-templates/CLAUDE.md`).
 * Read-only by design: `editable`/draw are not exposed here — a record
 * detail page shows a location, it does not edit a geofence.
 *
 * `MapPanel`'s own zoom/compass/fullscreen control cluster is fixed at
 * `bottom-end` (its generic, product-agnostic convention, shared by every
 * `MapPanel` consumer) — so `cornerOverlay` defaults to `bottom-start` to
 * avoid sitting on top of it. A caller happy to share the corner (or with a
 * `controls={false}` map) can move it via `cornerPosition`.
 *
 * SLOT: this is a small, SECONDARY, inline map (a record's "Address" section,
 * a station sidesheet's mini map, etc.) — deliberately meant to coexist with
 * a page's PRIMARY map (a Hybrid view's `LiveMapView`/`RecordMapSlot`) when
 * one is open behind it, e.g. a docked, no-scrim record-detail sheet's
 * Address section floating over the Hybrid view it was opened from. It
 * therefore claims its own `LOCATION_MAP_GUARD_SLOT` (`mount-guard.ts`)
 * rather than the page's default slot, so `MapPanel`'s one-map-PER-SLOT guard
 * never blocks it just because a different, primary map is also mounted —
 * fixes the "Address map renders as a single-mount fallback with a
 * console.error" defect when a task-detail sheet docks over the incidents
 * Hybrid view. Two concurrent `LocationMap` instances (a genuine duplicate)
 * still guard against each other, since they share this same slot.
 */
export const LOCATION_MAP_GUARD_SLOT = 'location-map'
export interface LocationMapPin {
  id: string
  position: LngLat
  label?: string
  /** Marker fill — a token CSS var (`var(--color-destructive)`) or hex; passed straight through to `MapPanel`. Defaults to `--color-primary`. */
  color?: string
  /** Optional named class (e.g. `"refill"`, `"theft"`) a caller can filter pins by (see `OverviewLocationMapWidget.pinFilters`). Purely descriptive — never read by this component itself. */
  category?: string
  /** Rendered radius in pixels — passed through to the marker layer (default 6). */
  radius?: number
  /** 0–1 opacity for de-emphasized pins (e.g. related records at 0.5). Default 1. */
  opacity?: number
}

export interface LocationMapPolygon {
  id: string
  /** Closed ring, `[lng, lat]` points (first/last point need not already match). */
  points: LngLat[]
  color?: string
  label?: string
  fillOpacity?: number
}

export interface LocationMapProps {
  /** `[lng, lat]` camera center — GeoJSON/MapLibre order, matching `MapPanel`. */
  center: LngLat
  zoom?: number
  pins?: LocationMapPin[]
  polygons?: LocationMapPolygon[]
  /** Arbitrary overlay pinned to a map corner (figma-spec-detail.md §4's "Sector A" card) — content is a slot, this component has no opinion about it. Omit for no corner overlay. */
  cornerOverlay?: ReactNode
  cornerPosition?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'
  /** Shows `MapPanel`'s standard zoom/compass/fullscreen control stack. Default `true`. */
  controls?: boolean
  styleUrl?: string
  className?: string
  /** Accessible label for the map region (required — there is no visible heading by default). */
  'aria-label': string
}

const CORNER_CLASSES: Record<NonNullable<LocationMapProps['cornerPosition']>, string> = {
  'top-start': 'top-4 start-4',
  'top-end': 'top-4 end-4',
  'bottom-start': 'bottom-4 start-4',
  'bottom-end': 'bottom-4 end-4',
}

export function LocationMap({
  center,
  zoom = 14,
  pins = [],
  polygons = [],
  cornerOverlay,
  cornerPosition = 'bottom-start',
  controls = true,
  styleUrl,
  className,
  'aria-label': ariaLabel,
}: LocationMapProps) {
  const markers: MapMarkerDatum[] = pins.map((pin) => ({
    id: pin.id,
    position: pin.position,
    label: pin.label,
    color: pin.color,
    radius: pin.radius,
    opacity: pin.opacity,
  }))
  const zones: MapZoneDatum[] = polygons.map((polygon) => ({
    id: polygon.id,
    points: polygon.points,
    color: polygon.color,
    label: polygon.label,
    fillOpacity: polygon.fillOpacity,
  }))

  // Fit the camera to the actual pin/polygon SPREAD rather than always
  // trusting the caller's single `center`/`zoom` — a multi-pin map (the
  // tanker Fill Level "Events" map's Refill/Empty/Theft pins) otherwise
  // renders zoomed in on just one point with the rest off-frame. Only
  // kicks in with 2+ points; a single pin (or none) keeps the explicit
  // center/zoom camera, which is still the right call for a one-location map.
  const allPoints: LngLat[] = [
    ...pins.map((pin) => pin.position),
    ...polygons.flatMap((polygon) => polygon.points),
  ]
  const fitBounds: [LngLat, LngLat] | null =
    allPoints.length >= 2
      ? [
          [Math.min(...allPoints.map((p) => p[0])), Math.min(...allPoints.map((p) => p[1]))],
          [Math.max(...allPoints.map((p) => p[0])), Math.max(...allPoints.map((p) => p[1]))],
        ]
      : null

  return (
    <div data-slot="location-map" className={cn('relative h-full w-full', className)}>
      <MapPanel
        guardSlot={LOCATION_MAP_GUARD_SLOT}
        styleUrl={styleUrl}
        defaultViewState={{ longitude: center[0], latitude: center[1], zoom }}
        fitBounds={fitBounds}
        markers={markers}
        zones={zones}
        controls={controls}
        // DS V2 "Map Controls" (node 5330:17645): the zoom pill + detached
        // fullscreen tile — the same `MapZoomControl` cluster Live Monitoring
        // uses — not the legacy four-in-one bordered column.
        controlsVariant="figma"
        editable={false}
        aria-label={ariaLabel}
      />
      {cornerOverlay ? (
        <div data-slot="location-map-corner" className={cn('absolute z-10', CORNER_CLASSES[cornerPosition])}>
          {cornerOverlay}
        </div>
      ) : null}
    </div>
  )
}

LocationMap.displayName = 'LocationMap'
