import type { LngLat, MapZoneDatum } from '../MapPanel.types'
import type { LiveVehicleDatum } from '../live-types'

/**
 * highlight-geo.ts — geometry for the search-result highlight
 * (map-features-video-analysis.md §1: "pink/magenta circular highlight …
 * plus a matching pin" and the "Assets Nearby" radius slider that
 * "live-resizes the circle").
 *
 * The circle generator is the exact same 48-segment equirectangular
 * approximation `PoiPin.tsx`'s `poiRadiusZone` already uses for the hovered-
 * POI radius circle — reused rather than re-derived so the two radius
 * circles in this module share one, already-reviewed piece of math.
 */

const EARTH_RADIUS_M = 6371008.8

/** A translucent circle polygon (`MapZoneDatum`) centered on `position` with radius `radiusKm` kilometers — the search highlight's accent-colour circle. Tokenized: `color` defaults to the primary/accent CSS var, never a hardcoded hex. */
export function searchHighlightZone(
  id: string,
  position: LngLat,
  radiusKm: number,
  color = 'var(--color-primary)',
): MapZoneDatum | null {
  if (!(radiusKm > 0)) return null
  const radiusMeters = radiusKm * 1000
  const [lng, lat] = position
  const latRad = (lat * Math.PI) / 180
  const dLat = (radiusMeters / EARTH_RADIUS_M) * (180 / Math.PI)
  const dLng = dLat / Math.max(Math.cos(latRad), 1e-6)
  const points: LngLat[] = []
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * 2 * Math.PI
    points.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)])
  }
  return { id, points, color, fillOpacity: 0.18 }
}

/** Great-circle distance between two `[lng, lat]` points, in kilometers. */
export function haversineKm(a: LngLat, b: LngLat): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLng * sinLng
  return (2 * Math.asin(Math.min(1, Math.sqrt(h))) * EARTH_RADIUS_M) / 1000
}

/** Vehicles within `radiusKm` of `center` — feeds the "Assets Nearby" panel's live count as the slider is dragged. */
export function vehiclesWithinRadius(
  vehicles: LiveVehicleDatum[],
  center: LngLat,
  radiusKm: number,
): LiveVehicleDatum[] {
  return vehicles.filter((vehicle) => haversineKm(center, vehicle.position) <= radiusKm)
}
