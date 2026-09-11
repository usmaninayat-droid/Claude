import type { Feature, FeatureCollection, LineString, MultiLineString } from 'geojson'
import { resolveToken } from './color'

/**
 * traffic.ts — the pure half of the map's traffic overlay (SPEC 3.19).
 *
 * FAMS ships no live traffic feed, and the design system must never invent
 * one or call an external service (hard rule 1 + rule 8). What the overlay
 * paints is therefore explicitly PSEUDO-traffic: the basemap's own major
 * roads, coloured by a DETERMINISTIC, SEEDED congestion value derived from
 * each road segment's identity — never `Math.random()`, never a timer.
 *
 * Determinism is the whole point. A random colour per repaint would flicker
 * on every pan and re-render, which reads as broken rather than as data. A
 * seeded hash of the segment's stable identity gives the same road the same
 * colour for the lifetime of the deployment, so panning and zooming move a
 * fixed picture instead of reshuffling it.
 *
 * SEED SOURCE, in order of preference:
 *  1. the vector tile feature's own `id` (OpenMapTiles/planetiler derives it
 *     from the OSM way id, so it is stable across tiles AND zoom levels);
 *  2. failing that, the road class plus the segment's rounded first/last
 *     coordinates — stable across a pan at a given zoom, which is what the
 *     no-flicker requirement actually asks for.
 *
 * Everything here is side-effect-free and directly unit-testable; the
 * MapLibre wiring lives in `traffic-layer.ts`.
 */

/** The four congestion states, ordinal from free-flowing to stopped. */
export const TRAFFIC_LEVELS = ['free', 'slow', 'heavy', 'stopped'] as const
export type TrafficLevel = (typeof TRAFFIC_LEVELS)[number]

/** Human labels for the legend, in the same ordinal order. */
export const TRAFFIC_LEVEL_LABELS: Record<TrafficLevel, string> = {
  free: 'Free',
  slow: 'Slow',
  heavy: 'Heavy',
  stopped: 'Stopped',
}

/**
 * The road classes the overlay paints — the basemap's MAJOR network only
 * (`transportation` source-layer `class` values). Residential/service roads
 * are deliberately excluded: colouring every lane turns the map into noise,
 * and no traffic product paints them either.
 */
export const TRAFFIC_ROAD_CLASSES = ['motorway', 'trunk', 'primary', 'secondary'] as const
export type TrafficRoadClass = (typeof TRAFFIC_ROAD_CLASSES)[number]

/**
 * Congestion palette — DS status tokens, resolved to literals because a
 * MapLibre paint property is read by WebGL and never by the CSS cascade
 * (see `color.ts`'s header for why `resolveToken` is the sanctioned escape
 * hatch, and why the fallback literals may only appear inside these calls).
 *
 *   free    → `--color-success`   (green)
 *   slow    → `--color-warning`   (orange)
 *   heavy   → `--color-destructive` (red)
 *   stopped → `--color-error-800` (dark red — the 800 stop of the same error
 *             ramp `destructive` is the 500 of, so "stopped" reads as
 *             "worse red" rather than as a second, unrelated hue)
 */
export function trafficPalette(): Record<TrafficLevel, string> {
  return {
    free: resolveToken('--color-success', '#12b76a'),
    slow: resolveToken('--color-warning', '#f79009'),
    heavy: resolveToken('--color-destructive', '#f04438'),
    stopped: resolveToken('--color-error-800', '#912018'),
  }
}

/**
 * FNV-1a (32-bit) — a tiny, dependency-free, well-distributed string hash.
 * Chosen over anything cryptographic because the only property we need is
 * "same input, same well-spread output", cheaply, thousands of times per
 * viewport change.
 */
export function hashSeed(key: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    // 32-bit FNV prime multiply, kept in uint32 via Math.imul.
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/** Seeded congestion in `[0, 1)` — pure, stable, no RNG. */
export function congestionFor(key: string): number {
  return (hashSeed(key) % 10_000) / 10_000
}

/*
 * Distribution thresholds. Weighted the way a real city reads at rush hour —
 * mostly moving, a visible minority slow, a handful red, a few stopped —
 * so the overlay is informative instead of a uniform wash:
 *   free 52% · slow 26% · heavy 15% · stopped 7%
 */
const SLOW_AT = 0.52
const HEAVY_AT = 0.78
const STOPPED_AT = 0.93

/** Maps a `[0,1)` congestion value onto its ordinal level. */
export function levelForCongestion(congestion: number): TrafficLevel {
  if (congestion < SLOW_AT) return 'free'
  if (congestion < HEAVY_AT) return 'slow'
  if (congestion < STOPPED_AT) return 'heavy'
  return 'stopped'
}

/** The seeded level for a segment key. */
export function trafficLevelFor(key: string): TrafficLevel {
  return levelForCongestion(congestionFor(key))
}

/** A road segment as the MapLibre source query hands it to us. */
export interface TrafficSourceFeature {
  id?: string | number
  properties?: Record<string, unknown> | null
  geometry?: { type?: string; coordinates?: unknown } | null
}

/** Rounds a coordinate to ~1m so tile-boundary jitter can't reseed a road. */
function roundCoord(value: number): string {
  return value.toFixed(5)
}

function endpointKey(coordinates: unknown): string {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return ''
  const first = coordinates[0]
  const last = coordinates[coordinates.length - 1]
  const part = (point: unknown): string =>
    Array.isArray(point) && typeof point[0] === 'number' && typeof point[1] === 'number'
      ? `${roundCoord(point[0])},${roundCoord(point[1])}`
      : ''
  // MultiLineString: descend one level into the first/last ring.
  if (Array.isArray(first) && Array.isArray(first[0])) {
    return `${part(first[0])}|${part((last as unknown[])[(last as unknown[]).length - 1])}`
  }
  return `${part(first)}|${part(last)}`
}

/**
 * The stable identity a segment is seeded from — see this file's header for
 * why the feature id is preferred and what the coordinate fallback buys.
 */
export function trafficSegmentKey(feature: TrafficSourceFeature): string {
  const klass = String(feature.properties?.class ?? '')
  if (feature.id !== undefined && feature.id !== null && feature.id !== '') {
    return `${klass}#${String(feature.id)}`
  }
  return `${klass}@${endpointKey(feature.geometry?.coordinates)}`
}

/** True when a queried feature is a major road line we should paint. */
export function isTrafficRoad(feature: TrafficSourceFeature): boolean {
  const type = feature.geometry?.type
  if (type !== 'LineString' && type !== 'MultiLineString') return false
  const klass = feature.properties?.class
  return typeof klass === 'string' && (TRAFFIC_ROAD_CLASSES as readonly string[]).includes(klass)
}

/** Properties every emitted traffic feature carries. */
export interface TrafficFeatureProperties {
  level: TrafficLevel
  /** The road class, so line width can weight motorways over secondaries. */
  klass: string
}

export type TrafficFeature = Feature<LineString | MultiLineString, TrafficFeatureProperties>

/**
 * Turns raw queried road features into the overlay's GeoJSON — filtered to
 * the major classes, de-duplicated across tile fragments, and seeded.
 * Pure: same input, same output, always.
 */
export function buildTrafficFeatureCollection(
  features: readonly TrafficSourceFeature[],
): FeatureCollection<LineString | MultiLineString, TrafficFeatureProperties> {
  const seen = new Set<string>()
  const out: TrafficFeature[] = []
  for (const feature of features) {
    if (!isTrafficRoad(feature)) continue
    const key = trafficSegmentKey(feature)
    // A road crossing several tiles arrives once per tile; each fragment has
    // its own geometry and must be drawn, so the dedupe key includes the
    // fragment's own endpoints while the SEED stays the road-level key.
    const fragmentKey = `${key}~${endpointKey(feature.geometry?.coordinates)}`
    if (seen.has(fragmentKey)) continue
    seen.add(fragmentKey)
    out.push({
      type: 'Feature',
      id: typeof feature.id === 'number' ? feature.id : undefined,
      properties: { level: trafficLevelFor(key), klass: String(feature.properties?.class ?? '') },
      geometry: feature.geometry as LineString | MultiLineString,
    })
  }
  return { type: 'FeatureCollection', features: out }
}
