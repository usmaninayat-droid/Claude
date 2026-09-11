import type { LngLat } from '../map/MapPanel.types'

/**
 * Onwani picker — the DEMO geo layer. [tier-2 internal]
 *
 * Presentation data plus pure, deterministic derivations that stand in for a
 * geocoding backend, which the demo has none of and the DS must never fetch
 * from (root CLAUDE.md rule 8: state-agnostic presenters). Split out of
 * `OnwaniLocationPickerWidget.tsx` to keep that component inside the ~300-line
 * budget (rule 12) — every entry here is data or a pure function, no JSX and
 * no React.
 *
 * The municipality/area/POI tables are the demo's Qatar reference set; a
 * blueprint overrides any of them through the widget's own
 * `municipalityOptions` / `areaOptions` props, so nothing here is a hardcoded
 * business special case.
 */

/** Demo municipality centres — used only to CENTRE the preview map (Rule 8:
 *  no geocoding backend in the demo). Generic lookup, keyed by the option
 *  labels the blueprint's municipality field already lists. */
export const MUNICIPALITY_CENTER: Record<string, LngLat> = {
  Doha: [51.531, 25.2854],
  'Al Rayyan': [51.4241, 25.2919],
  'Al Wakrah': [51.6035, 25.1712],
  'Umm Salal': [51.4, 25.4167],
  'Al Daayen': [51.4833, 25.5783],
}
export const DEFAULT_CENTER: LngLat = [51.531, 25.2854]
export const DEFAULT_MUNICIPALITIES = Object.keys(MUNICIPALITY_CENTER)

/** Demo area suggestions per municipality (same convention as
 *  `MUNICIPALITY_CENTER` — presentation data, overridable via the blueprint's
 *  `areaOptions` prop). Free text outside the list is always allowed. */
export const MUNICIPALITY_AREAS: Record<string, string[]> = {
  Doha: ['West Bay', 'Corniche', 'Al Sadd', 'Musheireb', 'Old Airport', 'Industrial Area'],
  'Al Rayyan': ['Al Aziziya', 'Education City', 'Al Gharrafa', 'Muaither'],
  'Al Wakrah': ['Al Wakrah Corniche', 'Al Wukair', 'Mesaieed'],
  'Umm Salal': ['Umm Salal Ali', 'Umm Salal Mohammed', 'Al Kharaitiyat'],
  'Al Daayen': ['Lusail', 'Lusail Marina', 'Al Khisah'],
}
export const DEFAULT_AREAS = [...new Set(Object.values(MUNICIPALITY_AREAS).flat())]

/** Demo POI suggestions per municipality — all inside Qatar, fed to the map
 *  search overlay so its results match the operator's selected zone. Same
 *  presentation-data convention as `MUNICIPALITY_AREAS`. */
export const MUNICIPALITY_POIS: Record<string, { label: string; area?: string }[]> = {
  Doha: [
    { label: 'West Bay Lagoon Park', area: 'West Bay' },
    { label: 'Doha Corniche Promenade', area: 'Corniche' },
    { label: 'Souq Waqif', area: 'Musheireb' },
    { label: 'City Center Mall', area: 'West Bay' },
    { label: 'Hamad General Hospital', area: 'Al Sadd' },
    { label: 'Doha Industrial Area Gate 1', area: 'Industrial Area' },
  ],
  'Al Rayyan': [
    { label: 'Mall of Qatar', area: 'Al Gharrafa' },
    { label: 'Education City Stadium', area: 'Education City' },
    { label: 'Aspire Park', area: 'Al Aziziya' },
  ],
  'Al Wakrah': [
    { label: 'Al Wakrah Souq', area: 'Al Wakrah Corniche' },
    { label: 'Al Janoub Stadium', area: 'Al Wukair' },
    { label: 'Mesaieed Industrial City', area: 'Mesaieed' },
  ],
  'Umm Salal': [
    { label: 'Barzan Towers', area: 'Umm Salal Mohammed' },
    { label: 'Umm Salal Ali Park', area: 'Umm Salal Ali' },
  ],
  'Al Daayen': [
    { label: 'Lusail Marina Promenade', area: 'Lusail Marina' },
    { label: 'Lusail Stadium', area: 'Lusail' },
    { label: 'Place Vendôme Mall', area: 'Lusail' },
  ],
}
export const DEFAULT_POIS = Object.entries(MUNICIPALITY_POIS).flatMap(([m, pois]) =>
  pois.map((p) => ({ ...p, municipality: m })),
)


export function parseLatLng(value: unknown): LngLat | null {
  const s = typeof value === 'string' ? value.trim() : ''
  if (!s) return null
  const parts = s.split(',').map((p) => Number(p.trim()))
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null
  const [lat, lng] = parts
  return [lng, lat]
}

/** Deterministic demo point for an Onwani, so the preview map MOVES as the
 *  operator types (no real geocoder in the demo). Small, stable offsets from
 *  the municipality centre keyed off the numeric zone/street. */
export function deriveOnwaniPoint(center: LngLat, zone: string, street: string): LngLat | null {
  if (!zone && !street) return null
  const z = Number(zone) || 0
  const s = Number(street) || 0
  const [lng, lat] = center
  return [lng + ((s % 50) - 25) * 0.0009, lat + ((z % 50) - 25) * 0.0009]
}

/** Deterministic demo nudge for a typed Area — a stable, small offset from the
 *  municipality centre keyed off the text (no geocoder in the demo, same
 *  convention as `deriveOnwaniPoint`). */
export function deriveAreaCenter(center: LngLat, area: string): LngLat {
  if (!area) return center
  let hash = 0
  for (let i = 0; i < area.length; i += 1) hash = (hash * 31 + area.charCodeAt(i)) | 0
  const [lng, lat] = center
  return [lng + ((Math.abs(hash) % 21) - 10) * 0.002, lat + ((Math.abs(hash >> 8) % 21) - 10) * 0.002]
}

export function composeOnwani(zone: string, street: string, bldg: string): string {
  const parts: string[] = []
  if (zone) parts.push(`Zone ${zone}`)
  if (street) parts.push(`Street ${street}`)
  if (bldg) parts.push(`Bldg ${bldg}`)
  return parts.join(', ')
}


/** One segment of an already-composed Onwani ("Zone 90, Street 200, Bldg 4"). */
export function parseOnwaniPart(composed: unknown, re: RegExp): string {
  return typeof composed === 'string' ? (re.exec(composed)?.[1] ?? '') : ''
}

/** The three part-extraction patterns, shared with any adapter that has to
 *  round-trip a stored Onwani (e.g. `views/onwani-location-section.tsx`). */
export const ONWANI_PART_RE = {
  zone: /Zone\s+(\w+)/i,
  street: /Street\s+(\w+)/i,
  bldg: /Bldg\.?\s+(\w+)/i,
} as const

/**
 * Demo FORWARD geocoder — typed place text → a stable point, so committing the
 * Location field drops the pin somewhere sensible (MME/FRMS Figma
 * `cWjEbSNpZCC7tNhZc2CikU` · 328-36271). Resolution order: a literal
 * "lat, lng" pair, then a known POI, then a known area, then a municipality,
 * else a deterministic nudge off `fallbackCenter` so unknown text still moves
 * the map instead of doing nothing.
 */
export function locatePlaceText(text: string, fallbackCenter: LngLat): LngLat | null {
  const t = text.trim()
  if (!t) return null
  const coords = parseLatLng(t)
  if (coords) return coords
  const key = t.toLowerCase()
  for (const [m, pois] of Object.entries(MUNICIPALITY_POIS)) {
    const hit = pois.find((p) => key.includes(p.label.toLowerCase()) || p.label.toLowerCase().includes(key))
    if (hit) return deriveAreaCenter(deriveAreaCenter(MUNICIPALITY_CENTER[m], hit.area ?? ''), hit.label)
  }
  for (const [m, areas] of Object.entries(MUNICIPALITY_AREAS)) {
    const hit = areas.find((a) => key.includes(a.toLowerCase()) || a.toLowerCase().includes(key))
    if (hit) return deriveAreaCenter(MUNICIPALITY_CENTER[m], hit)
  }
  const muni = Object.keys(MUNICIPALITY_CENTER).find((m) => key.includes(m.toLowerCase()))
  if (muni) return MUNICIPALITY_CENTER[muni]
  return deriveAreaCenter(fallbackCenter, t)
}

/**
 * Demo REVERSE geocoder — the nearest named place (area, else municipality)
 * for a clicked or dragged pin, so moving the marker auto-fills the Location
 * field with a NAME rather than coordinates. The other half of the two-way
 * sync `locatePlaceText` starts.
 */
export function describePoint([lng, lat]: LngLat): string {
  let bestLabel = 'Doha, Qatar'
  let bestD = Number.POSITIVE_INFINITY
  for (const [m, c] of Object.entries(MUNICIPALITY_CENTER)) {
    const dm = (c[0] - lng) ** 2 + (c[1] - lat) ** 2
    if (dm < bestD) {
      bestD = dm
      bestLabel = `${m}, Qatar`
    }
    for (const a of MUNICIPALITY_AREAS[m] ?? []) {
      const pt = deriveAreaCenter(c, a)
      const da = (pt[0] - lng) ** 2 + (pt[1] - lat) ** 2
      if (da < bestD) {
        bestD = da
        bestLabel = `${a}, ${m}`
      }
    }
  }
  return bestLabel
}
