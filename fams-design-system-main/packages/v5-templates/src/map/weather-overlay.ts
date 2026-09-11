import type { WeatherOverlayId } from './weather-types'

/**
 * weather-overlay.ts — the DATA half of the map's rain / cloud / precipitation
 * field overlays (19:25255's checkbox row).
 *
 * FAMS ships no weather feed and calls no weather service (repo rule 1 + this
 * run's hard constraint: no OpenWeatherMap tiles, no Open-Meteo requests), so
 * these three overlays are generated the same way `traffic.ts` generates its
 * congestion: a DETERMINISTIC seeded field over the map's current viewport.
 * Same viewport always yields the same field, so the overlay does not shimmer
 * as the camera settles and a test can assert exact values.
 *
 * The result is a point grid whose `weight`/`value` property MapLibre's own
 * `heatmap` and `circle` layers interpolate into the continuous, raster-like
 * wash the reference shows — no raster tiles, no images, no network.
 */

/** A single grid sample. `[lng, lat]` — GeoJSON order, like everything here. */
export interface WeatherFieldPoint {
  position: [number, number]
  /** Field intensity, 0-1. */
  value: number
}

/** GeoJSON `FeatureCollection` of `Point`s, the shape a geojson source takes. */
export interface WeatherFieldCollection {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: { type: 'Point'; coordinates: [number, number] }
    properties: { value: number }
  }>
}

/** Grid resolution per axis. 24×24 = 576 points — dense enough for a smooth
 *  heatmap gradient, small enough to rebuild on every camera settle. */
export const WEATHER_FIELD_RESOLUTION = 24

/**
 * A stable hash of a grid cell + overlay id, in `[0, 1)`. Integer arithmetic
 * only, so it is identical in every JS engine (the same reason `traffic.ts`
 * hashes rather than calling `Math.random`).
 */
export function weatherFieldHash(seed: number, x: number, y: number): number {
  let h = (seed ^ (x * 0x27d4eb2d) ^ (y * 0x165667b1)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x2545f491) >>> 0
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2d) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000
}

/** Each overlay gets its own seed so the three fields never coincide. */
const OVERLAY_SEED: Record<Exclude<WeatherOverlayId, 'stations'>, number> = {
  'rain-heatmap': 0x9e3779b9,
  clouds: 0x85ebca6b,
  precipitation: 0xc2b2ae35,
}

/**
 * Smooths the raw per-cell hash into blobs rather than television static, by
 * averaging a cell with its neighbours' hashes — a cheap one-pass value-noise
 * approximation. Weather fields are large and continuous; unsmoothed noise
 * reads as a defect.
 */
export function weatherFieldValue(seed: number, x: number, y: number): number {
  let total = 0
  let weight = 0
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      const w = 1 / (1 + dx * dx + dy * dy)
      total += weatherFieldHash(seed, x + dx, y + dy) * w
      weight += w
    }
  }
  const raw = total / weight
  // Re-expand the averaged range (smoothing pulls everything toward 0.5)
  // and clamp, so the overlay still has real highs and real gaps.
  return Math.min(1, Math.max(0, (raw - 0.5) * 2.6 + 0.5))
}

/**
 * Builds one overlay's field over a `[west, south, east, north]` bounding box.
 * The grid is anchored to the BOX, not to absolute coordinates, so a settled
 * camera always produces the same picture for the same view.
 */
export function buildWeatherField(
  overlay: Exclude<WeatherOverlayId, 'stations'>,
  bbox: [number, number, number, number],
  resolution = WEATHER_FIELD_RESOLUTION,
): WeatherFieldCollection {
  const seed = OVERLAY_SEED[overlay]
  const [west, south, east, north] = bbox
  const stepLng = (east - west) / Math.max(1, resolution - 1)
  const stepLat = (north - south) / Math.max(1, resolution - 1)
  const features: WeatherFieldCollection['features'] = []
  for (let x = 0; x < resolution; x++) {
    for (let y = 0; y < resolution; y++) {
      const value = weatherFieldValue(seed, x, y)
      // Below the floor the cell contributes nothing — dropping it keeps the
      // source small and gives the wash real holes instead of a flat mat.
      if (value < 0.35) continue
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [west + x * stepLng, south + y * stepLat] },
        properties: { value: Number(value.toFixed(4)) },
      })
    }
  }
  return { type: 'FeatureCollection', features }
}
