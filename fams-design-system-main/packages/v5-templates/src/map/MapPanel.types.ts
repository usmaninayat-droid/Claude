import type { ReactNode } from 'react'
import type { Feature, Polygon } from 'geojson'
import type { MapLegendEntry } from './chrome/MapLegend'
import type { MapControlsVariant } from './chrome/MapControls'
import type { MapLabelOverride } from './label-overrides'
import type { WeatherFieldOverlayId } from './weather-overlay-layer'

/**
 * MapPanel.types.ts — the `MapPanel` prop surface.
 *
 * Coordinate order is `[longitude, latitude]` throughout (GeoJSON / MapLibre
 * / deck.gl native order) — deliberately NOT the `[lat, lng]` used by the
 * Leaflet-era reference this template ports (`FAMS-Design-System-By-Shaheer`
 * `map/types.ts`). That file kept `[lat, lng]` for Leaflet API back-compat;
 * this is a fresh port onto a GeoJSON-native stack (MapLibre, deck.gl,
 * TerraDraw, supercluster all speak `[lng, lat]`) with no back-compat
 * obligation, so the extra per-frame conversion the old file needed is
 * simply gone.
 */
export type LngLat = [number, number]

export type { MapLegendEntry }
export type { MapLabelOverride }

export interface MapMarkerDatum {
  id: string
  position: LngLat
  /** Fill color — a hex literal, named CSS color, or `var(--token)` string
   *  (business data; resolved to a literal for the GPU layer at render
   *  time). Defaults to `--color-primary` when omitted. */
  color?: string
  /** Rendered marker radius in pixels. Default 6. */
  radius?: number
  /** 0–1 fill/stroke opacity for THIS marker (e.g. de-emphasized "related" pins at 0.5). Default 1. */
  opacity?: number
  label?: string
  /** Arbitrary passthrough surfaced to `onMarkerClick`/popups — never read
   *  by MapPanel itself (state-agnostic; business shape is the caller's). */
  data?: unknown
}

/**
 * A rendered cluster in the DOM-marker channel (`renderCluster`) — the
 * visible supercluster aggregate plus its resolved member markers, so the
 * renderer can derive a status mix (e.g. `ClusterBadge` ring segments)
 * without re-querying the index.
 */
export interface MapClusterDatum {
  /** supercluster's cluster id — stable per index build. */
  id: number
  position: LngLat
  /** Total member count (sum of contained markers). */
  count: number
  /** The cluster's member markers (leaves), in index order. */
  markers: MapMarkerDatum[]
  /** Zoom level at which this cluster splits — the click-to-expand target. */
  expansionZoom: number
}

/**
 * Per-frame render hints handed to `renderMarker` alongside the datum.
 * Additive second argument — existing single-argument renderers keep working
 * unchanged.
 */
export interface MapMarkerRenderState {
  /**
   * This marker's chips would collide with a higher-priority marker or a
   * cluster badge this frame, or would be cut by the pane edge — the
   * renderer should hide them (hover/selection still reveals them, and the
   * same data stays in the marker's accessible name). UX finding 17.
   */
  chipSuppressed: boolean
  /**
   * The camera's CURRENT zoom, so a renderer can pick a detail level per
   * frame (e.g. plain pins far out, pins with their info capsule once the
   * user has zoomed in). The map layer owns the camera; the design system
   * only renders what the caller decides from this number.
   */
  zoom: number
}

export interface MapZoneDatum {
  id: string
  /** Closed ring, `[lng, lat]` points (first/last point need not already
   *  match — MapPanel closes the ring). */
  points: LngLat[]
  color?: string
  label?: string
  fillOpacity?: number
  data?: unknown
}

export interface MapPathDatum {
  id: string
  /** Open polyline, `[lng, lat]` points, in draw order. */
  points: LngLat[]
  /** Stroke color — same resolution rules as `MapMarkerDatum.color`. */
  color?: string
  /**
   * Dashed treatment. Rendered by splitting the line into short on/off
   * segments in geographic space (deck.gl's screen-space dash extension is
   * not part of the umbrella package this repo depends on) — good enough
   * for route-scale lines, and it keeps planned-vs-actual distinguishable
   * by SHAPE, never color alone (a11y: 3:1 non-text contrast still applies
   * to the stroke itself).
   */
  dashed?: boolean
  /** Stroke width in pixels. Default 4. */
  widthPx?: number
  label?: string
  /** Arbitrary passthrough — never read by MapPanel itself. */
  data?: unknown
}

export interface MapHeatDatum {
  position: LngLat
  /** Relative weight/intensity, 0-1. Default 0.6. */
  weight?: number
}

export interface MapViewState {
  longitude: number
  latitude: number
  zoom: number
  pitch?: number
  bearing?: number
}

export interface MapPanelClusterOptions {
  radius?: number
  maxZoom?: number
  minPoints?: number
}

export interface MapPanelProps {
  /**
   * Names this map's ROLE for the one-map-per-slot guard (`mount-guard.ts`,
   * perf rule 3) — every `MapPanel` sharing a slot on the same page competes
   * for it (second-in blocks and renders the fallback card); a different
   * slot never blocks. Defaults to the shared page-primary slot
   * (`DEFAULT_MAP_SLOT`) — only pass this when composing a SECOND,
   * deliberately-concurrent map with a distinct role (e.g. `LocationMap`'s
   * small inline detail map defaults to its own `'location-map'` slot so it
   * can render alongside a page's primary record map, such as a docked
   * record-detail sheet's Address section floating over a Hybrid view's own
   * map). Two same-slot `MapPanel`s is still the bug this guard exists to
   * catch — don't invent slots to silence it, only to name a genuinely
   * different, intentional composition.
   */
  guardSlot?: string

  /** MapLibre style URL/JSON. Defaults to `DEFAULT_MAP_STYLE` (see
   *  `constants.ts`) — override per-tenant/per-product basemap. */
  styleUrl?: string

  /** Controlled camera — supply with `onViewStateChange` for a fully
   *  controlled map. Omit (use `defaultViewState` instead) for an
   *  uncontrolled map that manages its own camera. */
  viewState?: MapViewState
  /** Initial camera for an uncontrolled map. Ignored when `viewState` is set. */
  defaultViewState?: MapViewState
  onViewStateChange?: (viewState: MapViewState) => void
  /**
   * Fires with the map's CURRENT geographic bounds (`[west, south, east,
   * north]`) and zoom on load and on every camera move — the seam a
   * viewport-synced list needs (SPEC §3.22 "Sync list with Map"), which
   * `onViewStateChange`'s centre+zoom cannot supply without knowing the
   * container size. Additive; omit for no subscription.
   */
  onViewportChange?: (bbox: [number, number, number, number], zoom: number) => void

  markers?: MapMarkerDatum[]
  zones?: MapZoneDatum[]
  heat?: MapHeatDatum[]
  /** Route polylines (GPU `PathLayer`) — e.g. a selected record's actual
   *  (solid) + planned (dashed) route pair. Small sets only. */
  paths?: MapPathDatum[]

  /** Enables supercluster grouping of `markers`. Default `true` when
   *  `markers.length` crosses a few dozen is a product decision, not
   *  MapPanel's — this prop is a plain on/off switch; callers decide when. */
  cluster?: boolean
  clusterOptions?: MapPanelClusterOptions

  onMarkerClick?: (marker: MapMarkerDatum) => void
  /**
   * Id of the marker whose popup is open. Controlled — MapPanel never decides
   * what a selection means (rule 8); pair it with `onMarkerClick` (to open)
   * and `onPopupClose` (Escape / the close control).
   */
  selectedMarkerId?: string
  /**
   * Popup body for the selected marker. Presence is what makes markers
   * popup-bearing at all — omit it and a click only fires `onMarkerClick`.
   * The chrome (surface, close button, tip) is MapPanel's; the content is
   * the caller's (e.g. `VehiclePopupCard`).
   */
  renderMarkerPopup?: (marker: MapMarkerDatum) => ReactNode
  /** Fires when the popup is dismissed — Escape, the close control, or a click on the basemap. */
  onPopupClose?: () => void
  /**
   * Fires when a click lands on the BASEMAP itself — not a marker, cluster,
   * pin, popup or control — with the clicked `[lng, lat]`. The same target
   * discrimination the popup-dismiss contract uses; `onPopupClose` (when
   * both are supplied) still fires on the same click. Callers use it for
   * "inspect this location" interactions (e.g. the weather layer's
   * per-location panel).
   */
  onBasemapClick?: (lngLat: LngLat) => void
  /** Max width of the marker popup (any CSS length). Default `'20rem'`; the
   *  live-monitoring vehicle card needs its full 558px (`'34.875rem'`). */
  popupMaxWidth?: string
  /**
   * Whether MapPanel dresses the popup itself (surface, border, shadow and
   * MapLibre's default tip). Default `true`. Pass `false` when the rendered
   * body brings its OWN chrome — e.g. `VehiclePopupCard` with its bottom
   * pointer triangle (SPEC P0-2 geometry): the wrapper then goes transparent
   * and the default tip is hidden so the card's pointer is the only anchor.
   */
  popupChrome?: boolean
  /**
   * Radial pixel offset between the marker coordinate and the popup (MapLibre
   * `Popup#offset`, single-number form — applied per computed anchor).
   * Default `0`. The live-monitoring card passes the vehicle marker's ~62px
   * visual height so the card floats ABOVE the marker with its pointer at the
   * marker's top (Figma 495:2998), and still clears it when flipped below.
   */
  popupOffset?: number
  /**
   * Declarative camera nudge: whenever this changes to a position, the map
   * EASES to it (keeping the current zoom, floored at street level) — the
   * "row click → map pans to the marker" sync without handing out the raw
   * map handle. `null`/`undefined` never moves the camera.
   */
  focusPosition?: LngLat | null
  /**
   * Declarative fit-to-fleet: whenever this changes to a new positive value,
   * the camera eases to the bounds of ALL current markers (the map tool
   * stack's "refresh" recenter, live-monitoring spec §1.4 — no raw map
   * handle handed out, same pattern as `focusPosition`).
   */
  fitToMarkersNonce?: number
  /**
   * Declarative fit-to-bounds: whenever these SW/NE corners change, the
   * camera eases to frame them with generous padding.
   *
   * Why this exists (UX G.35 finding 5): selecting a route used to `easeTo`
   * the vehicle's single pin at street zoom, which threw away every other
   * vehicle on the map — the dispatcher lost the spatial context the map is
   * on the screen for, and the `dimmed` treatment for unselected pins became
   * literally unreachable. Fitting the selected ROUTE's polyline instead
   * keeps neighbours co-visible. Takes precedence over `focusPosition`.
   */
  fitBounds?: [LngLat, LngLat] | null
  onClusterClick?: (clusterId: number, position: LngLat, expansionZoom: number) => void
  onZoneClick?: (zone: MapZoneDatum) => void

  /**
   * DOM-marker channel: renders each visible (unclustered) marker as a real
   * DOM element anchored to its coordinate (MapLibre `Marker`,
   * `anchor="bottom"` so a pin-shaped marker stands on the point) INSTEAD of
   * the GPU scatterplot layer. For rich marker anatomy the GPU layer cannot
   * draw — photo-in-ring vehicle pins, flanking chips, segmented cluster
   * badges (live-monitoring spec §1.3). Positioning is transform-only (no
   * layout), and with `cluster` on, the rendered element count is bounded by
   * the viewport's visible cluster features — never the full marker set.
   * Clicks fire `onMarkerClick`; the rendered element supplies its own
   * button/labels (e.g. `VehicleMarker`).
   */
  renderMarker?: (marker: MapMarkerDatum, state: MapMarkerRenderState) => ReactNode
  /**
   * DOM renderer for cluster aggregates (requires `cluster` + `renderMarker`).
   * Clicking a rendered cluster eases the camera to the cluster's expansion
   * zoom (spec: cluster click → zoom until it splits) and then fires
   * `onClusterClick`. Omit to fall back to a plain count badge.
   */
  renderCluster?: (cluster: MapClusterDatum) => ReactNode
  /**
   * Bottom-end control-cluster layout: `'stacked'` (default, the original
   * four-in-one column) or `'figma'` — the Live Monitoring zoom PILL
   * (`plus` / divider / `minus`) with the fit control detached below it and
   * no bearing control (SPEC §2.3). Additive; every other map is unaffected.
   */
  controlsVariant?: MapControlsVariant
  /**
   * Suppress the detached fullscreen tile in the `'figma'` control cluster
   * (`uiConfig.map.hideFullscreenControl`) — the zoom pill stays, only the
   * separate fullscreen button below it is omitted. Per-module opt-out, not a
   * DS-wide change: a module whose blueprint sets this stays exactly as it is
   * today. No effect on the `'stacked'` variant's own combined stack.
   */
  hideFullscreenControl?: boolean
  /**
   * Whether the user may rotate/pitch the camera. Default `true` — MapLibre's
   * own behaviour, which is what dashboard map widgets, `LocationMapSection`,
   * the asset/ticketing location maps and FAMS Desk have always had (they
   * also keep a compass control to undo a rotation).
   *
   * `false` shuts EVERY rotation path: `dragRotate`, ctrl/right-drag,
   * `pitchWithRotate`, `touchPitch`, twist-to-rotate, shift+arrow keyboard
   * rotate, and it forces the bearing to 0 on load (see
   * `disableMapRotation`). Live Monitoring passes `false` because Figma's
   * control stack has no compass, so a rotated camera would be an un-undoable
   * state (UX finding 9, RATIFIED) — that decision is LM's, not MapPanel's,
   * which is why it is a prop rather than a default.
   */
  rotatable?: boolean
  /**
   * The shallowest zoom the camera may reach (QA A2). Defaults to
   * `MAP_MIN_ZOOM` (4) — see that constant for why a floor exists at all:
   * a wheel/pinch fling can overshoot MapLibre's own floor of 0 in one
   * gesture and unload every basemap tile, leaving a void the map never
   * recovers from. A caller that genuinely needs a world view passes its
   * own lower value; nothing in the product currently does.
   */
  minZoom?: number
  /**
   * How the basemap ATTRIBUTION strip renders.
   *
   * - `visible` — the full, never-truncated credit line, bottom-START. This
   *   is the licence-compliant setting and the only one that satisfies the
   *   OSM/ODbL credit obligation on screen.
   * - `compact` — MapLibre's collapsed "i" affordance; the credit is one
   *   click away rather than always painted.
   * - `hidden` (default) — no attribution control at all. UCCP product
   *   decision 2026-08-31: every UCCP map hides the credit line by default:
   *   the design system offers the switch and takes no position on whether
   *   a given deployment may use it, but a deployment now has to opt back
   *   INTO `visible`/`compact` rather than opt out of it — the OSM/ODbL
   *   credit obligation is that deployment's responsibility to discharge
   *   elsewhere (an About screen, a printed placard) if it stays hidden.
   */
  attribution?: 'hidden' | 'compact' | 'visible'
  /**
   * CSS `filter` applied directly to the MapLibre canvas element — the
   * mechanism the CSS-swatch-only basemap variants (Satellite/Terrain/
   * Hybrid/OSM, see `global-basemap-store.ts`'s
   * `resolveGlobalBasemapCanvasFilter`) use to look genuinely distinct from
   * the plain bright style they all otherwise share (repo rule 1 forbids a
   * paid tile provider, so there is no independent tile source for them).
   * Applied to the canvas itself (not a wrapping div) so it never tints the
   * floating chrome, popups, or markers layered above it. Omit/empty string
   * for no filter.
   */
  canvasFilter?: string
  /**
   * Paints the pseudo-traffic overlay (SPEC 3.19) — a native MapLibre line
   * layer along the basemap's major roads, coloured by a DETERMINISTIC,
   * seeded congestion value (see `traffic.ts`; FAMS ships no live traffic
   * feed and the DS never calls one). It sits above the basemap's road
   * ribbons and below every marker/cluster. Defaults to `false`.
   */
  traffic?: boolean
  /**
   * Basemap label renames (`uiConfig.map.labelOverrides`) — e.g. a
   * deployment whose users know a sea by a different name than the OSM
   * tiles carry. Applied to the loaded style's water/marine label layers and
   * RE-applied after every basemap switch. See `label-overrides.ts`.
   */
  labelOverrides?: MapLabelOverride[]
  /**
   * Field overlays painted over the basemap (19:25255's checkbox row) — rain
   * heat-map, cloud cover, precipitation. Native MapLibre heatmap/circle
   * layers fed by a DETERMINISTIC seeded field (`weather-overlay.ts`); FAMS
   * ships no weather feed and the DS never calls one. They stack exactly
   * where `traffic` does: above the basemap, below every label and marker.
   * Defaults to none.
   */
  weatherOverlays?: WeatherFieldOverlayId[]
  /**
   * Extra floating chrome painted over the map (e.g. the live-monitoring
   * tool stack). Rendered inside the region wrapper, so it travels into
   * fullscreen with the map instead of being stranded under the backdrop.
   */
  chrome?: ReactNode

  /**
   * Accessible name for a rendered cluster's click target (UX-8) — the caller
   * composes the status-mix sentence ("12 vehicles, 5 moving, 4 idling,
   * 3 stopped") because only it knows what the members mean. Defaults to
   * "Expand cluster of {count}".
   */
  clusterAriaLabel?: (cluster: MapClusterDatum) => string

  /**
   * Hover-triggered tooltip content for a rendered cluster's badge (AC-4) —
   * a visible status breakdown, distinct from `clusterAriaLabel`'s
   * accessible name. Only takes effect on the DOM-marker channel
   * (`renderMarker`/`renderCluster`); omit for no hover tooltip.
   */
  clusterTooltip?: (cluster: MapClusterDatum) => ReactNode

  /**
   * A second, NON-clustered DOM-marker channel for overlay points that must
   * never aggregate with `markers` (live-monitoring POI pins, spec §1.4).
   * Each pin renders via `renderPin` anchored bottom on its position;
   * ignored without `renderPin`. Keep the set small (checked POIs), it is
   * not viewport-bounded like the clustered channel.
   */
  pins?: MapMarkerDatum[]
  renderPin?: (pin: MapMarkerDatum) => ReactNode

  /** Enables the TerraDraw geofence toolbar (polygon + circle draw/edit). */
  editable?: boolean
  /** Fires once a shape is completed (polygon closed, circle radius set). */
  onZoneDrawn?: (geojson: Feature<Polygon>) => void
  /** Fires on every edit to a drawn/selected shape (vertex drag, etc). */
  onZoneChanged?: (geojson: Feature<Polygon>) => void

  /** Legend entries rendered as bottom-inline-start chrome — a static chip
   *  list, or (with `onLegendToggle`) a titled checkbox group. `id` defaults
   *  to `label`. */
  legend?: MapLegendEntry[]
  /** Heading above the legend entries — the `<fieldset>`'s `<legend>` when the
   *  legend is toggleable (e.g. `"Events"`). */
  legendTitle?: string
  /** Legend ids currently hidden. Controlled by the caller; MapPanel never
   *  filters `markers`/`heat` itself (rule 8 — the caller decides what a
   *  hidden category means for its data). */
  hiddenLegendIds?: string[]
  /** Presence makes the legend a checkbox group. Omit to keep the original
   *  read-only chip list (back-compatible). */
  onLegendToggle?: (id: string) => void

  /** Shows the standard zoom/reset/fullscreen control stack. Default `true`. */
  controls?: boolean

  /*
   * Basemap-failure surface (UX-NOTES C16 / UX-6 [MUST]). All four are
   * ADDITIVE and OPTIONAL: a consumer that passes none gets the generic
   * English defaults, and a healthy map renders none of it at all.
   *
   * The design system ships GENERIC copy only. Anything environment-specific
   * — a tenant's offline message, a support contact, a proxy hint — belongs
   * to the consuming app and arrives through these props / its metadata.
   */
  /** Failure headline. @default "Map couldn't load" */
  errorTitle?: string
  /** Failure body copy. @default a generic connection/retry sentence. */
  errorDescription?: string
  /** Retry control label. @default "Retry" */
  errorRetryLabel?: string
  /**
   * Notified for every MapLibre `error` event (style fetch, tile fetch, source
   * failure). Purely observational — `MapPanel` shows its own surface either
   * way; this is the seam for a host that wants to log or degrade further.
   */
  onMapError?: (error: Error) => void

  className?: string
  /** Accessible label for the map region (required — there is no visible
   *  heading by default). */
  'aria-label': string
  /**
   * Id of a text alternative for the surface — a visually-hidden table of the
   * points/areas the canvas paints. A map encodes everything in position and
   * colour, exactly like a chart canvas, so it needs the same relief channel
   * (verdict V10); the CALLER owns the table because only it knows what the
   * points mean.
   */
  'aria-describedby'?: string
}

/**
 * One CONTEXT pin drawn behind `LocationPickerMap`'s picked pin (its
 * `relatedPins` prop). Declared here, in the types-only module, rather than
 * in `LocationPickerMap.tsx`: the light-barrel `OnwaniLocationPicker` widget
 * needs this shape in its own prop contract, and importing it from the
 * component file would put `maplibre-gl` / `react-map-gl` on that file's
 * dependency graph — the exact lazy-weight boundary `LocationPickerMap`'s
 * docstring guards (and `registry.json` records).
 */
export interface LocationPickerRelatedPin {
  id: string
  position: LngLat
  /** Native hover title for the pin. Optional — the pins are context, not targets. */
  label?: string
}
