import type { ReactNode } from 'react'
import type { LngLat } from '../MapPanel.types'

/**
 * search-types.ts — the map search vocabulary
 * (map-features-video-analysis.md §1, "Search on Map").
 *
 * The clip's flat result list mixes heterogeneous row shapes — places
 * (title + full address subtitle), saved zones (title + "Parked Zone"-style
 * chip + "+N more" overflow), assets/vehicles (plate/name only) and app
 * shortcuts (title + capability chips + overflow) — all in ONE list, not
 * grouped by type. `MapSearchResult` is the shape every row template reads;
 * `kind` selects which template renders (`MapSearchPanel`'s row switch),
 * `subtitle` backs the address-style rows and `chips` backs the tag/
 * capability rows (its LENGTH decides the "+N more" overflow — see
 * `OVERFLOW_CHIP_LIMIT` in `MapSearchPanel.tsx`).
 *
 * Providers are pluggable (`MapSearchProvider[]`) so the design system ships
 * NO gazetteer and performs NO geocoding (the same non-negotiable that
 * governs `LiveMapPlace`/`MapPlace`): `createDefaultSearchProviders` in
 * `search-providers.ts` is only ONE default built from data the live view
 * already holds (vehicles-with-coordinates, the blueprint's places/zones);
 * an app may swap in a real geocoder/search API by replacing the `places`/
 * `assets` providers or by passing its own list through `searchProviders`.
 */

export type MapSearchResultKind = 'place' | 'zone' | 'asset' | 'poi' | 'shortcut'

export interface MapSearchResult {
  id: string
  kind: MapSearchResultKind
  /** Bold primary line. */
  title: string
  /** Muted secondary line — places/assets. Mutually exclusive with `chips` in practice. */
  subtitle?: string
  /** Inline pill/tag row — zones ("Parked Zone") and shortcuts (capability names). Overflow ("+N more") is derived from length, not authored here. */
  chips?: string[]
  /** `[lng, lat]` — present for anything the map can fly to (place/zone/asset). Absent for a pure navigation shortcut. */
  position?: LngLat
  /** Leading type glyph override; `MapSearchPanel` falls back to a per-`kind` default. */
  icon?: ReactNode
  /**
   * Zone-colour dot rendered as the FIRST chip of a zone row (the clip's
   * unlabeled grey circle swatch ahead of the "Parked Zone" pill). Any CSS
   * colour the source record already carries — the panel never invents one,
   * and with no swatch the chip row simply starts at the first label.
   */
  swatchColor?: string
  /**
   * `[[west, south], [east, north]]` — a zone's own extent, so selecting it
   * FITS the polygon instead of dropping a fixed-zoom pin on its centroid
   * (spec: "fit-bounds for a zone with its polygon highlighted"). Places and
   * POIs carry no bounds and fly to `position` at `flyToZoom` instead.
   */
  bounds?: [LngLat, LngLat]
  /** The zone's own ring, drawn as the highlight polygon while the result is selected. */
  polygon?: LngLat[]
  /** Radius (meters) this zone/asset should seed the "Assets Nearby" circle at, when different from the panel's own default. */
  radiusMeters?: number
  /** A shortcut result's own navigation — called instead of the default fly-to when present. */
  onActivate?: () => void
  /** Arbitrary passthrough (the source record/place/zone) — never read by the panel itself. */
  raw?: unknown
}

export interface MapSearchProvider {
  id: string
  /** Resolves this provider's matches for `query`. Always async — the panel debounces the call and renders a loading state while any provider's promise is in flight (spec: "Loading…" spinner). */
  search: (query: string) => Promise<MapSearchResult[]>
}

/** A result was picked — the map flies to it and drops the highlight. */
export interface MapSearchHighlight {
  id: string
  title: string
  position: LngLat
  /** "Assets Nearby" radius, kilometers — 1 to 50 (spec: "Within X km" slider). */
  radiusKm: number
  /** A zone result's ring — drawn alongside the radius circle so the selected geofence stays legible. */
  polygon?: LngLat[]
  /** A zone result's extent — the camera FITS this instead of flying to `position`. */
  bounds?: [LngLat, LngLat]
}
