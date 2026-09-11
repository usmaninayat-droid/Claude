import type { LiveMapPlace, LivePoiDatum, LiveVehicleDatum, LiveZoneDatum } from '../live-types'
import type { LngLat } from '../MapPanel.types'
import type { MapSearchProvider, MapSearchResult } from './search-types'
import { createGazetteerSearchProvider, type MapGazetteerEntry } from './qatar-gazetteer'

/**
 * search-providers.ts — the default `MapSearchProvider[]` built from data
 * the live view already holds (map-features-video-analysis.md §1).
 *
 * Every provider here is synchronous filtering wrapped in `Promise.resolve`
 * — a real async provider (a geocoder call, a fleet search API) is a drop-in
 * replacement with the exact same `{ id, search(query) }` shape, which is why
 * `MapSearchPanel` never special-cases these three: it awaits whatever
 * `searchProviders` names, default or not.
 */

/** A "quick-jump" app shortcut result (clip: "Dashboard" / "Assets" rows with capability chips + "+N more" overflow). Purely navigational — no map position. */
export interface MapSearchShortcut {
  id: string
  title: string
  /** Capability/label chips (e.g. ['Dashboard', 'Assets', 'Reports', …]). */
  chips: string[]
  onActivate: () => void
}

function matches(query: string, ...fields: (string | undefined)[]): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return fields.some((field) => field?.toLowerCase().includes(q))
}

/**
 * Turns a raw tag token into the chip label the clip shows ("parked-zone" →
 * "Parked Zone"). Cosmetic only, and deliberately here rather than in the
 * panel: the panel renders whatever chip strings a provider hands it, so an
 * app supplying already-formatted tags gets them through untouched.
 */
function chipLabel(tag: string): string {
  return tag
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** `[[west, south], [east, north]]` for a zone ring — the camera fit for a selected zone. */
function ringBounds(points: LngLat[]): [LngLat, LngLat] | undefined {
  if (points.length === 0) return undefined
  let [west, south] = points[0]
  let [east, north] = points[0]
  for (const [lng, lat] of points) {
    if (lng < west) west = lng
    if (lng > east) east = lng
    if (lat < south) south = lat
    if (lat > north) north = lat
  }
  return [
    [west, south],
    [east, north],
  ]
}

/** Places provider — `uiConfig.map.places` (the same list `LiveMapTools`'s legacy inline search already filters). Title + full address subtitle. */
export function createPlacesSearchProvider(places: LiveMapPlace[]): MapSearchProvider {
  return {
    id: 'places',
    search: async (query) => {
      const results: MapSearchResult[] = places
        .filter((place) => matches(query, place.name, place.category, place.address))
        .map((place) => ({
          id: `place-${place.id}`,
          kind: 'place',
          title: place.name,
          subtitle: place.address ?? place.category,
          position: place.position,
          raw: place,
        }))
      return results
    },
  }
}

/** Saved-zones provider — `uiConfig.map.zones` (parked zones et al). Title + tag chips (clip: "Parked Zone" chip + "+N more" overflow, `chips` length drives that). */
export function createZonesSearchProvider(zones: LiveZoneDatum[]): MapSearchProvider {
  return {
    id: 'zones',
    search: async (query) => {
      const results: MapSearchResult[] = zones
        .filter((zone) => matches(query, zone.label, zone.parent, ...(zone.tags ?? [])))
        .map((zone) => {
          const centroid = zone.points.reduce<[number, number]>(
            (acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat],
            [0, 0],
          )
          const count = zone.points.length || 1
          return {
            id: `zone-${zone.id}`,
            kind: 'zone',
            title: zone.label ?? zone.id,
            chips: (zone.tags?.length ? zone.tags : ['parked-zone']).map(chipLabel),
            swatchColor: zone.color,
            position: [centroid[0] / count, centroid[1] / count],
            bounds: ringBounds(zone.points),
            polygon: zone.points,
            raw: zone,
          } satisfies MapSearchResult
        })
      return results
    },
  }
}

/** Assets/vehicles provider — the live fleet, matched by plate or name (clip: rows show plate/name only, no subtitle). */
export function createAssetsSearchProvider(vehicles: LiveVehicleDatum[]): MapSearchProvider {
  return {
    id: 'assets',
    search: async (query) => {
      const results: MapSearchResult[] = vehicles
        .filter((vehicle) => matches(query, vehicle.plate, vehicle.name, vehicle.id))
        .map((vehicle) => ({
          id: `asset-${vehicle.id}`,
          kind: 'asset',
          title: vehicle.plate ?? vehicle.name ?? vehicle.id,
          subtitle: vehicle.plate && vehicle.name ? vehicle.name : undefined,
          position: vehicle.position,
          raw: vehicle,
        }))
      return results
    },
  }
}

/**
 * POI provider — `uiConfig.map.pois` (depots, fuel points, checkpoints).
 * Flag-glyph rows: title plus the POI's own tags as chips (clip's third row
 * template), flying to the pin at place zoom like a gazetteer hit.
 */
export function createPoisSearchProvider(pois: LivePoiDatum[]): MapSearchProvider {
  return {
    id: 'pois',
    search: async (query) => {
      const results: MapSearchResult[] = pois
        .filter((poi) => matches(query, poi.name, ...(poi.tags ?? [])))
        .map((poi) => ({
          id: `poi-${poi.id}`,
          kind: 'poi',
          title: poi.name,
          chips: poi.tags?.map(chipLabel),
          swatchColor: poi.color,
          position: poi.position,
          radiusMeters: poi.radiusMeters,
          raw: poi,
        }))
      return results
    },
  }
}

/** App-shortcut provider — quick-jump navigation rows with capability chips. Always application-supplied (never a design-system default list). */
export function createShortcutsSearchProvider(shortcuts: MapSearchShortcut[]): MapSearchProvider {
  return {
    id: 'shortcuts',
    search: async (query) => {
      const results: MapSearchResult[] = shortcuts
        .filter((shortcut) => matches(query, shortcut.title, ...shortcut.chips))
        .map((shortcut) => ({
          id: `shortcut-${shortcut.id}`,
          kind: 'shortcut',
          title: shortcut.title,
          chips: shortcut.chips,
          onActivate: shortcut.onActivate,
          raw: shortcut,
        }))
      return results
    },
  }
}

/**
 * The default provider set — places + zones + assets, built straight from
 * data the live view already has, plus an optional shortcuts provider when
 * the caller supplies any. Every provider name is a plain string id so an
 * app can override just one (e.g. swap `places` for a real geocoder) by
 * passing its own `searchProviders` array instead.
 *
 * `gazetteer` is opt-in and empty by default — the design system still
 * ships no bundled place dataset unasked (see `qatar-gazetteer.ts`'s file
 * doc). A Qatar deployment passes `gazetteer: qatarGazetteer`; anything else
 * passes nothing and gets none of those rows.
 */
export function createDefaultSearchProviders(input: {
  places?: LiveMapPlace[]
  zones?: LiveZoneDatum[]
  pois?: LivePoiDatum[]
  vehicles?: LiveVehicleDatum[]
  shortcuts?: MapSearchShortcut[]
  gazetteer?: MapGazetteerEntry[]
}): MapSearchProvider[] {
  const providers: MapSearchProvider[] = []
  if (input.places?.length) providers.push(createPlacesSearchProvider(input.places))
  if (input.zones?.length) providers.push(createZonesSearchProvider(input.zones))
  if (input.pois?.length) providers.push(createPoisSearchProvider(input.pois))
  if (input.vehicles?.length) providers.push(createAssetsSearchProvider(input.vehicles))
  if (input.shortcuts?.length) providers.push(createShortcutsSearchProvider(input.shortcuts))
  if (input.gazetteer?.length) providers.push(createGazetteerSearchProvider(input.gazetteer))
  return providers
}
