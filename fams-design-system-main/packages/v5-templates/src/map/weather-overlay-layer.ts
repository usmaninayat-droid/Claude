import { useEffect } from 'react'
import type maplibregl from 'maplibre-gl'
import { resolveToken } from './color'
import { firstSymbolLayerId } from './traffic-layer'
import { buildWeatherField } from './weather-overlay'
import type { WeatherOverlayId } from './weather-types'

/**
 * weather-overlay-layer.ts — the MapLibre half of the rain / cloud /
 * precipitation overlays (19:25255), the direct sibling of
 * `traffic-layer.ts` and built on the same three decisions:
 *
 *  - NATIVE MapLibre layers, not deck.gl ones, so stacking is free: they are
 *    inserted before the style's first symbol layer, which puts them above
 *    the basemap and below every label, marker and cluster.
 *  - Data from `weather-overlay.ts`'s deterministic seeded field, rebuilt
 *    (debounced) as the camera settles. No feed, no tiles, no network.
 *  - Every map call optional-chained, so the hook is inert against jsdom's
 *    stub map instead of throwing.
 *
 * Each overlay is one geojson source plus one paint layer, torn down when its
 * checkbox is cleared so the style never carries a dead source.
 */

export type WeatherFieldOverlayId = Exclude<WeatherOverlayId, 'stations'>

/** The field overlays, in the checkbox row's order. */
export const WEATHER_FIELD_OVERLAY_IDS: WeatherFieldOverlayId[] = ['rain-heatmap', 'clouds', 'precipitation']

export const weatherSourceId = (overlay: WeatherFieldOverlayId): string => `fams-weather-${overlay}`
export const weatherLayerId = (overlay: WeatherFieldOverlayId): string => `fams-weather-${overlay}-field`

/** Debounce for re-seeding after a camera change (ms) — matched to traffic's. */
export const WEATHER_REFRESH_DEBOUNCE_MS = 220

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

/**
 * Each overlay's paint spec.
 *
 * Rain is a true `heatmap` (the reference's "Rain Heat-map" label is literal),
 * ramped through the status palette so it reads hot-spot-over-basemap. Clouds
 * and precipitation are soft blurred `circle` washes — a heatmap's normalising
 * ramp makes an overcast field look like a hotspot map, which is wrong for
 * cloud cover; a low-opacity circle field is the honest shape for "how much
 * of the sky is covered here".
 *
 * The colour literals below live only inside `resolveToken` fallbacks, the
 * documented `lint:tokens` exemption (see `color.ts`'s header).
 */
export function weatherLayerSpec(overlay: WeatherFieldOverlayId, beforeId?: string) {
  const reduced = prefersReducedMotion()
  const id = weatherLayerId(overlay)
  const source = weatherSourceId(overlay)
  const transition = { duration: reduced ? 0 : 200 }

  if (overlay === 'rain-heatmap') {
    const cool = resolveToken('--color-primary', '#0072d6')
    const warm = resolveToken('--color-warning', '#f79009')
    return {
      spec: {
        id,
        type: 'heatmap' as const,
        source,
        paint: {
          'heatmap-weight': ['get', 'value'],
          'heatmap-intensity': 0.9,
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 6, 18, 10, 34, 14, 60],
          'heatmap-opacity': 0.55,
          'heatmap-opacity-transition': transition,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(0,0,0,0)',
            0.4,
            cool,
            1,
            warm,
          ],
        },
      },
      beforeId,
    }
  }

  const fill =
    overlay === 'clouds'
      ? resolveToken('--color-muted-foreground', '#667085')
      : resolveToken('--color-primary', '#0072d6')
  return {
    spec: {
      id,
      type: 'circle' as const,
      source,
      paint: {
        'circle-color': fill,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 22, 10, 44, 14, 80],
        'circle-blur': 1,
        'circle-opacity': ['interpolate', ['linear'], ['get', 'value'], 0.35, 0.05, 1, overlay === 'clouds' ? 0.4 : 0.3],
        'circle-opacity-transition': transition,
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
  getBounds?: () => { getWest(): number; getSouth(): number; getEast(): number; getNorth(): number }
  isStyleLoaded?: () => boolean
}

/** The camera's current `[west, south, east, north]`, or null under a stub map. */
export function mapFieldBbox(map: AnyMap): [number, number, number, number] | null {
  try {
    const bounds = map.getBounds?.()
    if (!bounds) return null
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ]
    return bbox.every((n) => typeof n === 'number' && isFinite(n)) ? bbox : null
  } catch {
    return null
  }
}

function teardown(m: AnyMap, overlay: WeatherFieldOverlayId) {
  try {
    if (m.getLayer?.(weatherLayerId(overlay))) m.removeLayer?.(weatherLayerId(overlay))
    if (m.getSource?.(weatherSourceId(overlay))) m.removeSource?.(weatherSourceId(overlay))
  } catch {
    /* style already torn down */
  }
}

/**
 * useWeatherOverlayLayers — paints the field overlays whose ids are `active`
 * and tears down the rest, keeping each in step with the camera (debounced).
 *
 * `active` is joined into the effect key rather than passed by reference so a
 * caller re-rendering with a fresh array of the same ids does not thrash the
 * style.
 */
export function useWeatherOverlayLayers(map: maplibregl.Map | null, active: WeatherFieldOverlayId[]): void {
  const key = [...active].sort().join(',')
  useEffect(() => {
    if (!map) return undefined
    const m = map as AnyMap
    const on = key ? (key.split(',') as WeatherFieldOverlayId[]) : []
    for (const overlay of WEATHER_FIELD_OVERLAY_IDS) {
      if (!on.includes(overlay)) teardown(m, overlay)
    }
    if (on.length === 0) return undefined

    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const refresh = () => {
      if (disposed) return
      if (m.isStyleLoaded && !m.isStyleLoaded()) return
      const bbox = mapFieldBbox(m)
      if (!bbox) return
      for (const overlay of on) {
        try {
          if (!m.getSource?.(weatherSourceId(overlay))) {
            m.addSource?.(weatherSourceId(overlay), { type: 'geojson', data: EMPTY_DATA })
          }
          if (!m.getLayer?.(weatherLayerId(overlay))) {
            const { spec, beforeId } = weatherLayerSpec(overlay, firstSymbolLayerId(m.getStyle?.()))
            m.addLayer?.(spec, beforeId)
          }
          const source = m.getSource?.(weatherSourceId(overlay)) as { setData?: (data: unknown) => void } | undefined
          source?.setData?.(buildWeatherField(overlay, bbox))
        } catch {
          /* style not ready / transient swap — the next event refreshes */
        }
      }
    }

    const scheduleRefresh = () => {
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(refresh, WEATHER_REFRESH_DEBOUNCE_MS)
    }

    refresh()
    const events = ['moveend', 'zoomend', 'idle', 'styledata'] as const
    for (const event of events) m.on?.(event, scheduleRefresh)

    return () => {
      disposed = true
      if (timer !== undefined) clearTimeout(timer)
      for (const event of events) m.off?.(event, scheduleRefresh)
      for (const overlay of on) teardown(m, overlay)
    }
  }, [map, key])
}
