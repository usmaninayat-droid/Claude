import { resolveToken } from './color'

/**
 * constants.ts — `MapPanel` defaults.
 *
 * `DEFAULT_MAP_STYLE` points at OpenFreeMap's "Positron" style — a free,
 * unrestricted (no API key, no usage cap, self-hostable), OSM-data-backed
 * MapLibre vector style whose light, de-saturated look matches the Live
 * Monitoring Figma basemap (SPEC v2 2026-08-24 §1: muted warm-light land,
 * white roads, no saturated orange motorways / deep blue water). The
 * previous default — OpenFreeMap "Liberty", saturated — stays available as
 * `BRIGHT_MAP_STYLE` (the layers control's alternate). Injectable via
 * `styleUrl` for any product that wants its own basemap. For the EXACT Figma
 * tint on top of Positron, see `applyMutedBasemapPaint` below.
 */
export const MUTED_MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'
export const BRIGHT_MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
export const DEFAULT_MAP_STYLE = MUTED_MAP_STYLE

/** Default camera when a consumer supplies neither `viewState` nor
 *  `defaultViewState`. Centered near null island's nearest populated
 *  reference point is meaningless for a product map — a low zoom over the
 *  whole world is a safer "nothing selected yet" default than picking an
 *  arbitrary city. */
export const DEFAULT_VIEW_STATE = { longitude: 0, latitude: 20, zoom: 1.5, pitch: 0, bearing: 0 }

/** supercluster defaults — a visually reasonable pixel radius at common
 *  screen densities and a max zoom past which points always render
 *  individually (avoids clustering once the user is zoomed in close enough
 *  that clusters would occlude real detail). */
export const DEFAULT_CLUSTER_RADIUS = 60
export const DEFAULT_CLUSTER_MAX_ZOOM = 16
export const DEFAULT_CLUSTER_MIN_POINTS = 2

/* ── Muted basemap paint transform (SPEC v2 §1) ─────────────────────────────
 * The Figma basemap palette — land #F9F5ED, water #AEE0F4, white roads with
 * a #D0D0D0 casing, muted grey labels — is a TINT of the Positron style, not
 * a hosted style anyone serves. `applyMutedBasemapPaint` patches a fetched
 * MapLibre style JSON's paint properties toward that palette: pure
 * (input never mutated), dependency-free, resilient to unknown layers (it
 * matches by layer type/source-layer/id substring, leaving anything
 * unrecognized untouched). Consumers fetch the style, patch, and hand
 * MapLibre the result (e.g. as a Blob URL) — see `useMutedBasemapStyle` in
 * `views/live/use-muted-basemap.ts`.
 *
 * Colors resolve through `resolveToken` (the established literal-color
 * escape hatch for non-CSS renderers — see `./color.ts`'s header): the
 * `--fams-map-*` custom properties are optional theme overrides a tenant may
 * define; absent, the pixel-verified Figma fallbacks apply.
 */
interface MutableStyleLayer {
  id?: string
  type?: string
  paint?: Record<string, unknown>
  [key: string]: unknown
}

/** The SPEC §1 basemap palette (tenant-overridable via `--fams-map-*`). */
export function mutedBasemapPalette() {
  return {
    land: resolveToken('--fams-map-land', '#F9F5ED'),
    water: resolveToken('--fams-map-water', '#AEE0F4'),
    road: resolveToken('--fams-map-road', '#FFFFFF'),
    casing: resolveToken('--fams-map-road-casing', '#D0D0D0'),
    label: resolveToken('--color-muted-foreground', '#667085'),
    halo: resolveToken('--fams-map-label-halo', '#FFFFFF'),
  }
}

/**
 * Returns a copy of a MapLibre style JSON with its paint properties patched
 * to the muted Figma palette. Anything that isn't a recognizable style
 * object passes through unchanged.
 */
export function applyMutedBasemapPaint(style: unknown): unknown {
  if (style == null || typeof style !== 'object' || !Array.isArray((style as { layers?: unknown }).layers)) {
    return style
  }
  const palette = mutedBasemapPalette()
  const source = style as { layers: unknown[] }
  const layers = source.layers.map((raw): unknown => {
    if (raw == null || typeof raw !== 'object') return raw
    const layer = raw as MutableStyleLayer
    const paint: Record<string, unknown> = { ...(layer.paint ?? {}) }
    const id = String(layer.id ?? '').toLowerCase()
    const sourceLayer = String((layer as Record<string, unknown>)['source-layer'] ?? '').toLowerCase()
    switch (layer.type) {
      case 'background':
        paint['background-color'] = palette.land
        break
      case 'raster':
        // Positron's low-zoom shaded-relief underlay — hidden so the land
        // reads as the uniform warm tint at every zoom.
        paint['raster-opacity'] = 0
        break
      case 'fill':
        if (sourceLayer === 'water') paint['fill-color'] = palette.water
        else if (['park', 'landcover', 'landuse'].includes(sourceLayer) || id.includes('pier')) {
          paint['fill-color'] = palette.land
        }
        break
      case 'line':
        if (sourceLayer === 'waterway') paint['line-color'] = palette.water
        else if (sourceLayer === 'boundary') paint['line-color'] = palette.casing
        else if (['transportation', 'aeroway'].includes(sourceLayer)) {
          paint['line-color'] = id.includes('casing') ? palette.casing : palette.road
        }
        break
      case 'symbol':
        if ('text-color' in paint || sourceLayer.includes('name') || sourceLayer.includes('place') || sourceLayer.includes('label')) {
          paint['text-color'] = palette.label
          paint['text-halo-color'] = palette.halo
        }
        break
      default:
        return raw
    }
    return { ...layer, paint }
  })
  return { ...(style as Record<string, unknown>), layers }
}

/**
 * Right-docked map tool drawer width (SPEC §2.7/§2.8: the Figma drawers are
 * 347px — `frame 1984078823` measures 347×1033, and the Zones/POI drawers
 * dock the same way). Shared so the drawer and the map's own end-side tool
 * stack agree on how far inboard the stack shifts while a drawer is open
 * (round-1 visual #21 / UX finding 3: the drawer sat ON TOP of the tool that
 * opened it).
 */
export const MAP_TOOL_DRAWER_WIDTH = 347

/**
 * Height (px) of the reserved strip along the map pane's bottom edge that
 * belongs to the MapLibre attribution pill. Floating chrome on the pane's
 * bottom-START edge sits ABOVE this strip so the OSM/ODbL credit is never
 * overlapped or clipped (UX finding 6, an ODbL obligation — round 1 painted
 * the 40x40 fullscreen button straight over its right end).
 */
export const MAP_ATTRIBUTION_STRIP = 28

/**
 * MAP_MIN_ZOOM — the floor the camera may never go below (QA A2).
 *
 * MapLibre's own default floor is 0. The OpenFreeMap styles this repo uses
 * stop serving usable tiles well before that, and a WHEEL gesture (unlike the
 * zoom-out BUTTON, which steps one integer level at a time) can overshoot the
 * floor in a single inertial fling: the basemap then unloads every tile and
 * the pane is left as a flat void with the markers floating on it, with no
 * event that would bring the tiles back. Clamping the camera is the only fix
 * that closes the wheel, pinch and keyboard paths at once — `scrollZoom`
 * rate-limiting only slows the overshoot down.
 *
 * 4 is the shallowest level at which the styles still render a coherent
 * basemap (a whole country plus its neighbours in frame), which is deeper
 * than any framing the product actually offers.
 */
export const MAP_MIN_ZOOM = 4

/** deck.gl layer ids — stable strings so `MapboxOverlay.setProps` can diff
 *  layers by id across renders instead of recreating the whole GL state. */
export const LAYER_ID = {
  zonesFill: 'fams-map-zones-fill',
  markersCluster: 'fams-map-markers-cluster',
  markersPoint: 'fams-map-markers-point',
  heat: 'fams-map-heat',
  paths: 'fams-map-paths',
} as const
