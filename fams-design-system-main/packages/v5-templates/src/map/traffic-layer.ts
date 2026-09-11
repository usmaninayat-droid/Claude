import { useEffect } from 'react'
import type maplibregl from 'maplibre-gl'
import {
  TRAFFIC_LEVELS,
  TRAFFIC_ROAD_CLASSES,
  buildTrafficFeatureCollection,
  trafficPalette,
  type TrafficSourceFeature,
} from './traffic'

/**
 * traffic-layer.ts — the MapLibre half of the traffic overlay (SPEC 3.19).
 *
 * A NATIVE MapLibre `line` layer, not a deck.gl layer, and that choice does
 * the stacking for free: `MapboxOverlay({ interleaved: true })` attaches
 * deck's markers/clusters at the TOP of the style, while this layer is
 * inserted *before the style's first symbol layer* — so traffic paints
 * ABOVE the basemap's road ribbons and BELOW both the basemap's own labels
 * and every vehicle marker/cluster, with no z-index bookkeeping.
 *
 * The data comes from the basemap itself. `querySourceFeatures` on the
 * vector source's `transportation` layer returns the major roads already
 * loaded for the current viewport; `traffic.ts` seeds each one to a
 * congestion level. No feed, no network call, no timer — see that file's
 * header for why the seeding is deterministic.
 *
 * REDUCED MOTION: the layer's only animation is MapLibre's own paint
 * transition when the overlay appears. Under `prefers-reduced-motion` that
 * transition is set to zero so the overlay simply *is* there rather than
 * fading in; nothing else here moves.
 */

export const TRAFFIC_SOURCE_ID = 'fams-traffic'
export const TRAFFIC_LAYER_ID = 'fams-traffic-lines'

/** Debounce for re-seeding after a camera change (ms). Long enough that a
 *  continuous pan re-queries once at the end, short enough to feel immediate. */
export const TRAFFIC_REFRESH_DEBOUNCE_MS = 220

const EMPTY_DATA = { type: 'FeatureCollection' as const, features: [] }

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  } catch {
    return false
  }
}

interface RoadSource {
  source: string
  sourceLayer: string
}

/**
 * The vector source(s) carrying the basemap's road network. Derived from the
 * live style rather than hardcoded to `openmaptiles`, so any MapLibre style
 * with a `transportation` source-layer works (and a style with none simply
 * paints nothing instead of throwing).
 */
export function findRoadSources(style: maplibregl.StyleSpecification | undefined): RoadSource[] {
  const layers = style?.layers
  if (!Array.isArray(layers)) return []
  const found = new Map<string, RoadSource>()
  for (const layer of layers) {
    if (layer.type !== 'line') continue
    const source = (layer as { source?: unknown }).source
    const sourceLayer = (layer as { 'source-layer'?: unknown })['source-layer']
    if (typeof source !== 'string' || sourceLayer !== 'transportation') continue
    found.set(`${source}/${sourceLayer}`, { source, sourceLayer })
  }
  return [...found.values()]
}

/** The style's first symbol layer — the insertion point (see header). */
export function firstSymbolLayerId(style: maplibregl.StyleSpecification | undefined): string | undefined {
  const layers = style?.layers
  if (!Array.isArray(layers)) return undefined
  for (const layer of layers) {
    if (layer.type === 'symbol' && typeof layer.id === 'string') return layer.id
  }
  return undefined
}

/** The `line-color` match expression, one arm per congestion level. */
export function trafficColorExpression(): unknown[] {
  const palette = trafficPalette()
  const expression: unknown[] = ['match', ['get', 'level']]
  for (const level of TRAFFIC_LEVELS) expression.push(level, palette[level])
  expression.push(palette.free) // fallback arm
  return expression
}

/**
 * `line-width` — scales with zoom (a motorway ribbon is a hairline at z9 and
 * a lane-wide band at z17) and is weighted by road class so the trunk
 * network reads above the secondary network at every zoom.
 */
export function trafficWidthExpression(): unknown[] {
  const classWeight: unknown[] = [
    'match',
    ['get', 'klass'],
    'motorway',
    1.6,
    'trunk',
    1.35,
    'primary',
    1.1,
    'secondary',
    0.85,
    1,
  ]
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    8,
    ['*', 1.2, classWeight],
    11,
    ['*', 2.2, classWeight],
    13,
    ['*', 3.4, classWeight],
    15,
    ['*', 5, classWeight],
    18,
    ['*', 9, classWeight],
  ]
}

/** The complete layer spec — exported so it is directly assertable in tests. */
export function trafficLayerSpec(beforeId?: string) {
  const reduced = prefersReducedMotion()
  return {
    spec: {
      id: TRAFFIC_LAYER_ID,
      type: 'line' as const,
      source: TRAFFIC_SOURCE_ID,
      layout: { 'line-cap': 'round' as const, 'line-join': 'round' as const },
      paint: {
        'line-color': trafficColorExpression(),
        'line-width': trafficWidthExpression(),
        'line-opacity': 0.9,
        // Reduced-motion safe: no fade for users who asked for none.
        'line-opacity-transition': { duration: reduced ? 0 : 200 },
      },
    },
    beforeId,
  }
}

type AnyMap = maplibregl.Map & {
  getStyle?: () => maplibregl.StyleSpecification
  getSource?: (id: string) => unknown
  getLayer?: (id: string) => unknown
  addSource?: (id: string, source: unknown) => void
  addLayer?: (layer: unknown, beforeId?: string) => void
  removeLayer?: (id: string) => void
  removeSource?: (id: string) => void
  querySourceFeatures?: (source: string, options?: unknown) => TrafficSourceFeature[]
  isStyleLoaded?: () => boolean
}

/**
 * Queries the live basemap for the viewport's major roads and returns the
 * seeded overlay GeoJSON. Exported for tests; `useTrafficLayer` calls it.
 */
export function collectTrafficFeatures(map: AnyMap) {
  const style = map.getStyle?.()
  const sources = findRoadSources(style)
  const raw: TrafficSourceFeature[] = []
  for (const { source, sourceLayer } of sources) {
    try {
      const features = map.querySourceFeatures?.(source, {
        sourceLayer,
        filter: ['in', ['get', 'class'], ['literal', [...TRAFFIC_ROAD_CLASSES]]],
      })
      if (Array.isArray(features)) raw.push(...features)
    } catch {
      /* a source not yet loaded throws — the next debounce picks it up */
    }
  }
  return buildTrafficFeatureCollection(raw)
}

/**
 * useTrafficLayer — adds/removes the pseudo-traffic line layer on a live
 * MapLibre map and keeps it in step with the camera (debounced).
 *
 * Every map call is optional-chained: under jsdom the map is a stub, and the
 * hook must be inert rather than throwing (the same contract
 * `disableMapRotation` honours).
 */
export function useTrafficLayer(map: maplibregl.Map | null, enabled: boolean): void {
  useEffect(() => {
    if (!map) return undefined
    const m = map as AnyMap
    if (!enabled) {
      // Turning OFF: tear the layer down so the style carries no dead source.
      try {
        if (m.getLayer?.(TRAFFIC_LAYER_ID)) m.removeLayer?.(TRAFFIC_LAYER_ID)
        if (m.getSource?.(TRAFFIC_SOURCE_ID)) m.removeSource?.(TRAFFIC_SOURCE_ID)
      } catch {
        /* style already torn down */
      }
      return undefined
    }

    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const ensure = (): boolean => {
      try {
        if (!m.getSource?.(TRAFFIC_SOURCE_ID)) {
          m.addSource?.(TRAFFIC_SOURCE_ID, { type: 'geojson', data: EMPTY_DATA })
        }
        if (!m.getLayer?.(TRAFFIC_LAYER_ID)) {
          const { spec, beforeId } = trafficLayerSpec(firstSymbolLayerId(m.getStyle?.()))
          m.addLayer?.(spec, beforeId)
        }
        return true
      } catch {
        // Style not ready yet — `style.load`/`styledata` re-runs this.
        return false
      }
    }

    const refresh = () => {
      if (disposed) return
      if (m.isStyleLoaded && !m.isStyleLoaded()) return
      if (!ensure()) return
      try {
        const source = m.getSource?.(TRAFFIC_SOURCE_ID) as { setData?: (data: unknown) => void } | undefined
        source?.setData?.(collectTrafficFeatures(m))
      } catch {
        /* transient style swap — the next event refreshes */
      }
    }

    const scheduleRefresh = () => {
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(refresh, TRAFFIC_REFRESH_DEBOUNCE_MS)
    }

    refresh()
    // `styledata` covers a basemap SWITCH (the whole style is replaced and
    // our layer goes with it); the camera events cover pan/zoom; `idle`
    // catches the frame where late tiles finally arrive.
    const events = ['moveend', 'zoomend', 'idle', 'styledata', 'sourcedata'] as const
    for (const event of events) m.on?.(event, scheduleRefresh)

    return () => {
      disposed = true
      if (timer !== undefined) clearTimeout(timer)
      for (const event of events) m.off?.(event, scheduleRefresh)
      try {
        if (m.getLayer?.(TRAFFIC_LAYER_ID)) m.removeLayer?.(TRAFFIC_LAYER_ID)
        if (m.getSource?.(TRAFFIC_SOURCE_ID)) m.removeSource?.(TRAFFIC_SOURCE_ID)
      } catch {
        /* map already destroyed */
      }
    }
  }, [map, enabled])
}
