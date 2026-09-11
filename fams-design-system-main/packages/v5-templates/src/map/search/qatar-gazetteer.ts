import type { LngLat } from '../MapPanel.types'
import type { MapSearchProvider, MapSearchResult } from './search-types'

/**
 * qatar-gazetteer.ts — a static Qatar places/districts/landmarks dataset
 * (search-video-spec.md: "a Qatar gazetteer of places/districts/landmarks
 * (metadata, no geocoder)").
 *
 * This is METADATA, not a geocoder: a fixed, hand-authored list of Qatar
 * municipalities, districts and well-known landmarks with a name, a
 * "Name, Municipality, Qatar"-style subtitle (the admin-region row template
 * `map-features-video-analysis.md` §1 describes — "Adam Province, Al Wusta
 * Governorate, Oman") and a `[lng, lat]` centroid. No network call, no
 * fuzzy/prefix index service, no third-party geocoding API — it is filtered
 * client-side by `createGazetteerSearchProvider` exactly like every other
 * default provider in this module.
 *
 * DELIBERATELY NOT included in `createDefaultSearchProviders`'s output
 * unless the caller passes `gazetteer` — the design system still ships no
 * gazetteer BY DEFAULT (the standing decision documented on `MapSearchProvider`
 * / `LiveMapPlace`: no product ships a bundled dataset it did not ask for).
 * `qatarGazetteer` is this ONE deployment's opt-in dataset; a non-Qatar
 * deployment passes nothing and gets none of these rows.
 */

export interface MapGazetteerEntry {
  id: string
  /** Bold title line (e.g. "Al Wakrah Municipality"). */
  name: string
  /** Municipality/region the entry belongs to, omitted for the municipality entries themselves. */
  municipality?: string
  /** Country name — always "Qatar" here, kept explicit so the subtitle-builder needs no hardcoded suffix. */
  country?: string
  position: LngLat
}

/**
 * Qatar's municipalities plus a set of widely-known districts/landmarks
 * inside them. Coordinates are approximate centroids, sufficient for a
 * fly-to at the place zoom level (~14) this dataset backs — not
 * survey-grade geodesy.
 */
export const qatarGazetteer: MapGazetteerEntry[] = [
  // Municipalities (Qatar's 8 baladiyat) — title == subtitle, mirroring the
  // clip's "Adam Province, Al Wusta Governorate, Oman" duplicated-string rows.
  { id: 'qa-doha', name: 'Doha Municipality', country: 'Qatar', position: [51.531, 25.2854] },
  { id: 'qa-al-rayyan', name: 'Al Rayyan Municipality', country: 'Qatar', position: [51.4241, 25.2919] },
  { id: 'qa-al-wakrah', name: 'Al Wakrah Municipality', country: 'Qatar', position: [51.6033, 25.1715] },
  { id: 'qa-umm-salal', name: 'Umm Salal Municipality', country: 'Qatar', position: [51.4064, 25.4067] },
  { id: 'qa-al-khor', name: 'Al Khor Municipality', country: 'Qatar', position: [51.4969, 25.6804] },
  { id: 'qa-al-shamal', name: 'Al Shamal Municipality', country: 'Qatar', position: [51.2144, 26.1288] },
  { id: 'qa-al-daayen', name: 'Al Daayen Municipality', country: 'Qatar', position: [51.55, 25.45] },
  { id: 'qa-al-shahaniya', name: 'Al Shahaniya Municipality', country: 'Qatar', position: [51.0333, 25.3667] },
  // Districts / landmarks — subtitle carries the parent municipality.
  { id: 'qa-west-bay', name: 'West Bay', municipality: 'Doha Municipality', country: 'Qatar', position: [51.5303, 25.3223] },
  { id: 'qa-al-dafna', name: 'Al Dafna', municipality: 'Doha Municipality', country: 'Qatar', position: [51.5266, 25.3186] },
  { id: 'qa-msheireb', name: 'Msheireb', municipality: 'Doha Municipality', country: 'Qatar', position: [51.5296, 25.2867] },
  { id: 'qa-souq-waqif', name: 'Souq Waqif', municipality: 'Doha Municipality', country: 'Qatar', position: [51.5316, 25.2867] },
  { id: 'qa-the-pearl', name: 'The Pearl-Qatar', municipality: 'Doha Municipality', country: 'Qatar', position: [51.5514, 25.3695] },
  { id: 'qa-lusail', name: 'Lusail', municipality: 'Al Daayen Municipality', country: 'Qatar', position: [51.49, 25.4297] },
  { id: 'qa-education-city', name: 'Education City', municipality: 'Al Rayyan Municipality', country: 'Qatar', position: [51.438, 25.3132] },
  { id: 'qa-industrial-area', name: 'Industrial Area', municipality: 'Doha Municipality', country: 'Qatar', position: [51.4736, 25.2138] },
  { id: 'qa-mesaieed', name: "Mesaieed Industrial City", municipality: 'Al Wakrah Municipality', country: 'Qatar', position: [51.5486, 24.9928] },
  { id: 'qa-ras-laffan', name: 'Ras Laffan Industrial City', municipality: 'Al Khor Municipality', country: 'Qatar', position: [51.5722, 25.9083] },
  { id: 'qa-hamad-port', name: 'Hamad Port', municipality: 'Al Wakrah Municipality', country: 'Qatar', position: [51.6083, 24.9556] },
  { id: 'qa-hamad-airport', name: 'Hamad International Airport', municipality: 'Doha Municipality', country: 'Qatar', position: [51.6081, 25.2609] },
]

function gazetteerSubtitle(entry: MapGazetteerEntry): string {
  const region = entry.municipality
  const country = entry.country ?? 'Qatar'
  return region ? `${entry.name}, ${region}, ${country}` : `${entry.name}, ${country}`
}

function matchesGazetteer(query: string, entry: MapGazetteerEntry): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    entry.name.toLowerCase().includes(q) ||
    (entry.municipality?.toLowerCase().includes(q) ?? false)
  )
}

/**
 * The Qatar gazetteer provider — `place`-kind rows (pin-drop icon, bold
 * title, muted "Name, Municipality, Qatar" subtitle), flying to the entry's
 * centroid at place zoom like any other place result. Pass `qatarGazetteer`
 * (or a caller's own `MapGazetteerEntry[]`) explicitly; `createDefaultSearchProviders`
 * only includes it when its `gazetteer` input is supplied.
 */
export function createGazetteerSearchProvider(entries: MapGazetteerEntry[]): MapSearchProvider {
  return {
    id: 'gazetteer',
    search: async (query) => {
      const results: MapSearchResult[] = entries
        .filter((entry) => matchesGazetteer(query, entry))
        .map((entry) => ({
          id: `gazetteer-${entry.id}`,
          kind: 'place',
          title: entry.name,
          subtitle: gazetteerSubtitle(entry),
          position: entry.position,
          raw: entry,
        }))
      return results
    },
  }
}
