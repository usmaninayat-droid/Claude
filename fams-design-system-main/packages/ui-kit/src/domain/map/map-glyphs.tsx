import type { SVGProps } from 'react'

/**
 * The map/vehicle glyph vocabulary Figma names for the live-monitoring chrome
 * (`traffic-lights`, `marker-pin-05`, `zones`, `pin-01`, `search-refraction`,
 * `colors`, `thermometer-03`) plus the one device puck the canonical library
 * has no mark for.
 *
 * HISTORY: these were hand-redrawn on 2026-08-24 because the previous icon
 * dependency (lucide-react) had no faithful equivalent and its near-misses
 * shipped as visible parity diffs (an artist's palette for `colors`, a traffic
 * CONE for `traffic-lights`, a bank for `zones`). The design system now draws
 * every glyph from the canonical FAMS V5 icon library — which contains these
 * marks under exactly these names — so the seven redrawings are gone and each
 * export is a thin alias onto the vendored original. The names are kept so
 * that `MapContainer`, `VehiclePopupField.icon`, `MapIconButton` and the
 * blueprint icon table (`v5-composer/fields/renderers`) are untouched.
 *
 * They remain `currentColor` art sized by the usual `[&_svg]:size-*` slot
 * rules, so nothing about how callers colour or size them changes.
 */

type GlyphProps = SVGProps<SVGSVGElement>

/** `traffic-lights` — the map's traffic-overlay tool (Figma 495:2998 top-end #2). */
export { SvgTrafficLights as TrafficLightsIcon } from '../../icons/glyphs'
/** `marker-pin-05` — POI tool: a pennant on a pole standing on an oval base. */
export { SvgMarkerPin_05 as MarkerPin05Icon } from '../../icons/glyphs'
/** `zones` — the zone/geofence tool. */
export { SvgZone as ZonesIcon } from '../../icons/glyphs'
/** `pin-01` — the pin/unpin affordance on map cards. */
export { SvgPin_01 as Pin01Icon } from '../../icons/glyphs'
/** `search-refraction` — the map's place search. */
export { SvgSearchRefraction as SearchRefractionIcon } from '../../icons/glyphs'
/** `colors` — the vehicle-colour swatch field. */
export { SvgColors as ColorsIcon } from '../../icons/glyphs'
/** `thermometer-03` — the temperature sensor field. */
export { SvgThermometer_03 as Thermometer03Icon } from '../../icons/glyphs'
/* ── Figma 19:23006, the 2026-08-30 map control stack ─────────────────────
   The designer re-specified four of the stack's glyphs. Each names the
   canonical library mark the design actually uses, so nothing here is drawn
   by hand. */
/** `cloud-raining-06` — the weather layer tool (was a thermometer stand-in). */
export { SvgCloudRaining_06 as CloudRaining06Icon } from '../../icons/glyphs'
/** `alert-octagon` — the incidents/alerts layer tool. */
export { SvgAlertOctagon as AlertOctagonIcon } from '../../icons/glyphs'
/** `marker-pin-06` — the POI tool's NEW glyph: a pin with a ringed head. */
export { SvgMarkerPin_06 as MarkerPin06Icon } from '../../icons/glyphs'
/** `layers-three-02` — the basemap-layers trigger. */
export { SvgLayersThree_02 as LayersThree02Icon } from '../../icons/glyphs'
/** `globe-05` — the Live Monitoring module's rail glyph (Figma 19:22896). */
export { SvgGlobe_05 as Globe05Icon } from '../../icons/glyphs'

/**
 * A telematics device puck — the Devices tab's DEVICE NAME lead icon (#19).
 * The one mark in this file with no canonical-library equivalent, so it stays
 * hand-drawn (stroke art, matching the set's 2px weight).
 */
export function MapDeviceIcon({ children, ...props }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-icon="map-device"
      {...props}
    >
      <rect x="3" y="8" width="18" height="11" rx="3" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      <circle cx="8" cy="13.5" r="1.5" />
      <path d="M13 11.5h5M13 15.5h5" />
      {children}
    </svg>
  )
}
