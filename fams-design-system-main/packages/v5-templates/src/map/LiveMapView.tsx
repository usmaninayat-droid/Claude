import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ClusterBadge,
  VehicleMarker,
  type ClusterBadgeSegment,
  type VehicleIcon3DArt,
  type VehicleStatusTone,
} from '@fams/ui-kit'
import { cn } from '../lib/cn'
import { MapPanel } from './MapPanel'
import type {
  LngLat,
  MapClusterDatum,
  MapMarkerDatum,
  MapMarkerRenderState,
  MapPanelClusterOptions,
  MapPathDatum,
  MapViewState,
  MapZoneDatum,
} from './MapPanel.types'
import {
  LIVE_STATUS_LABEL,
  LIVE_STATUS_TONE,
  LIVE_WORKFORCE_STATUS_TONE,
  liveVehicleMeta,
  liveMarkerPillMeta,
  LIVE_MARKER_DETAIL_ZOOM,
  type LiveIncidentDatum,
  type LiveMapPlace,
  type LiveMapUnavailableTool,
  type LivePoiDatum,
  type LiveVehicleDatum,
  type LiveVehicleStatus,
  type LiveWorkforceDatum,
  type LiveWorkforceStatus,
  type LiveZoneDatum,
} from './live-types'
import { WorkforceMarker } from './WorkforceMarker'
import { LiveWorkforcePopup } from './LiveWorkforcePopup'
import { BRIGHT_MAP_STYLE, MAP_TOOL_DRAWER_WIDTH } from './constants'
import { useMutedBasemapStyle } from './muted-basemap'
import {
  DEFAULT_GLOBAL_BASEMAP_ID,
  resolveGlobalBasemapCanvasFilter,
  useGlobalBasemapId,
} from './global-basemap-store'
import { useClusterEnabled } from './cluster-toggle-store'
import { useTrafficOverlayEnabled } from './traffic-overlay-store'
import { TrafficLegend } from './chrome/TrafficLegend'
import type { MapLabelOverride } from './label-overrides'
import { LIVE_MAP_DEFAULT_TOOL_IDS, LIVE_MAP_MUTED_STYLE_ID, LiveMapTools, type LiveMapToolId } from './chrome/LiveMapTools'
import { PoiPin, poiRadiusZone } from './PoiPin'
import { IncidentPin } from './IncidentPin'
import { SearchHighlightPin } from './SearchHighlightPin'
import { createDefaultSearchProviders, type MapSearchShortcut } from './search/search-providers'
import type { MapGazetteerEntry } from './search/qatar-gazetteer'
import type { MapSearchProvider, MapSearchHighlight, MapSearchResult } from './search/search-types'
import { searchHighlightZone, vehiclesWithinRadius } from './search/highlight-geo'
import { LiveVehiclePopup, type LiveVehiclePopupData } from './LiveVehiclePopup'
import { WeatherForecastPanel } from './WeatherForecastPanel'
import { WeatherStationDrawer } from './WeatherStationDrawer'
import { WeatherStationMarker } from './WeatherStationMarker'
import { nearestWeatherStation, stationForecastPanelData, stationRainMm } from './weather-types'
import type { WeatherForecastPanelData, WeatherStationDatum } from './weather-types'

/** Pin-id namespace for the weather layer, so `renderPin` can tell a station
 *  apart from a POI or the search highlight without a type guess. */
const WEATHER_PIN_PREFIX = 'weather-station-'
/** Pin-id namespace for incident pins, so `renderPin` can tell one apart
 *  from a POI/weather-station/search-highlight pin sharing the same channel. */
const INCIDENT_PIN_PREFIX = 'incident-pin-'

/**
 * LiveMapView — the live-monitoring map surface (SPEC §2.3): 3D-art
 * `VehicleMarker`s (status ring + badge + leader line + plate/speed-dwell
 * chips), segmented `ClusterBadge` aggregates (click → expansion zoom,
 * status-mix aria-label), and the anchored `LiveVehiclePopup` vehicle card —
 * pointer triangle, chrome-less MapPanel popup — for the selected vehicle,
 * all on `MapPanel`'s DOM-marker channel. Ships from the heavy `./map` entry
 * only; the light barrel reaches it through `views/MapView.tsx`'s
 * `React.lazy` slot (same mechanism as `LocationMapSectionSlot`).
 *
 * Selection is controlled or uncontrolled (`selectedId`/`onSelect`) so the
 * hybrid view can sync it with its list panel. The card's track/focus action
 * recenters on the vehicle and FOLLOWS it (position updates keep easing the
 * camera) until the selection clears. State-agnostic throughout — vehicles,
 * popup data, and every mutation hook come in as props (rule 8).
 */
export interface LiveMapViewProps {
  vehicles: LiveVehicleDatum[]
  /**
   * Workforce members (task "add WORKFORCE alongside vehicles" enhancement) —
   * plotted on the SAME clustered marker channel as `vehicles` (reusing the
   * existing marker/cluster/popup machinery per the task's scope call), told
   * apart at render time by `isWorkforceStatus` since the two datum kinds'
   * `status` enums never overlap. `selectedId`/`onSelect` work off either
   * kind's id interchangeably (`EntityRecord` ids are already globally
   * unique). Omit for the vehicle-only experience, byte-identical to before
   * this enhancement.
   */
  workforce?: LiveWorkforceDatum[]
  /** Controlled selected vehicle id (popup + marker emphasis). */
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  /** Popup body override; omit for the default `LiveVehiclePopup`. */
  renderPopup?: (vehicle: LiveVehicleDatum) => ReactNode
  /** Feeds the default popup's Critical Events / Trips / Devices tabs. */
  getPopupData?: (vehicle: LiveVehicleDatum) => LiveVehiclePopupData | undefined
  /** Workforce popup tab data (2026-08-31 workforce-popup task) — same
   *  contract as `getPopupData`, keyed off the member's record; the Shifts
   *  tab rides the trip keys (`deriveLiveWorkforcePopupData`). */
  getWorkforcePopupData?: (member: LiveWorkforceDatum) => LiveVehiclePopupData | undefined
  /** Header open-in-new on the workforce popup — navigate to the member. */
  onOpenWorkforce?: (member: LiveWorkforceDatum) => void
  /** Default popup's open-in-new — navigate to the vehicle's profile. */
  onOpenVehicle?: (vehicle: LiveVehicleDatum) => void
  /** Default popup's footer CTA row (status-driven CTAs — cockpit lens). */
  popupFooter?: (vehicle: LiveVehicleDatum) => ReactNode
  /** Default popup's header overflow menu (remote commands — cockpit lens). */
  popupOverflow?: (vehicle: LiveVehicleDatum) => ReactNode
  /** Popup width cap override (CSS length). Default the live-monitoring 34.875rem. */
  popupMaxWidth?: string
  /** Default popup card class override (e.g. a narrower width). */
  popupClassName?: string
  zones?: MapZoneDatum[]
  /** Route polylines (e.g. the selected vehicle's actual solid + planned
   *  dashed pair) — `MapPanel.paths` passthrough. */
  paths?: MapPathDatum[]
  /** Checked POIs — plotted as `PoiPin`s with hover tooltip + radius circle
   *  (spec §1.4); never clustered with the vehicle markers. */
  pois?: LivePoiDatum[]
  /**
   * The Incidents panel's currently VISIBLE incidents (eye-on ∩
   * search∩filter — the caller narrows the set, this view only paints it) —
   * plotted as `IncidentPin`s, severity-coloured, never clustered with the
   * vehicle markers (same non-clustered DOM channel `pois` rides).
   */
  incidents?: LiveIncidentDatum[]
  /** Selected incident (its pin gets the emphasis ring); omit for none. */
  selectedIncidentId?: string | null
  /** A pin was clicked — opens the incident's card in the panel / detail sheet. */
  onSelectIncident?: (incident: LiveIncidentDatum) => void
  /**
   * Clustering on by default (spec §1.3 zoomed-out state), and the toggle
   * `showTools`'s cluster button flips (map-features-video-analysis.md §2).
   * Omit for the persisted, cross-tab-synced default
   * (`useClusterEnabled`/`defaultClusterEnabled` below); pass it to run fully
   * controlled with no persistence.
   */
  cluster?: boolean
  clusterOptions?: MapPanelClusterOptions
  /**
   * Reports which cluster a click expanded (AC-4 / SPEC interaction #11) —
   * the camera's own zoom-in-and-decluster move already happens inside
   * `DomMarkers.tsx`'s `expand()` regardless of this prop; this is only the
   * secondary "the app learned about it" callback (analytics, own state).
   */
  onClusterClick?: (clusterId: number, position: LngLat, expansionZoom: number) => void
  viewState?: MapViewState
  defaultViewState?: MapViewState
  onViewStateChange?: (viewState: MapViewState) => void
  /** Map bounds + zoom on load and on every camera move (`MapPanel`'s
   *  `onViewportChange`) — the seam behind Customize View's "Sync list with
   *  Map" (SPEC §3.22). */
  onViewportChange?: (bbox: [number, number, number, number], zoom: number) => void
  /** Camera nudge passthrough (`MapPanel.focusPosition`) — the hybrid view's
   *  "row click → map pans to the marker" sync. */
  focusPosition?: LngLat | null
  /** Fit-to-bounds passthrough (`MapPanel.fitBounds`) — the cockpit frames the
   *  selected route's polyline instead of diving onto its single pin. */
  fitBounds?: [LngLat, LngLat] | null
  /** Fit-to-fleet passthrough (`MapPanel.fitToMarkersNonce`) — the tool
   *  stack's refresh recenter. */
  fitToMarkersNonce?: number
  /**
   * Basemap style passthrough (`MapPanel.styleUrl`). OMIT IT: the default is
   * now the SPEC §1 muted-but-COLOURED Figma basemap (land #F9F5ED, water
   * #AEE0F4), resolved by `useMutedBasemapStyle`. Round 1 left this
   * undefined on the map-only view, which fell through to raw Positron —
   * the fully de-saturated grey that SPEC reserves for the LOADING state
   * (visual #8 / UX finding 2).
   */
  styleUrl?: string
  /** The layers control's alternate (bright) basemap. */
  brightStyleUrl?: string

  /* ── Floating map chrome (SPEC §2.3) ─────────────────────────────────── */
  /**
   * Render the Figma floating tool set over the map — search / pin /
   * refresh, eye-off, layers / traffic / POI / zones (`LiveMapTools`).
   * Off by default so a surface that paints its own chrome (the hybrid
   * view's own stack) does not double up.
   */
  showTools?: boolean
  /**
   * Which tools the stack renders, by id — application-driven
   * (`uiConfig.map.tools`). Defaults to `LIVE_MAP_DEFAULT_TOOL_IDS`, the
   * reference app's set (no `pin`, no `refresh`).
   */
  tools?: LiveMapToolId[]
  /**
   * Places the map's search control filters over and flies to (SPEC 3.18).
   * ALWAYS application data (`uiConfig.map.places`) — the design system
   * ships no gazetteer and performs no geocoding.
   * @deprecated folded into the default search providers when `searchProviders` is omitted; pass `searchProviders` for new code.
   */
  places?: LiveMapPlace[]
  /**
   * Saved zones the "search anything" default providers match against
   * (map-features-video-analysis.md §1, "Parked Zone" rows) — richer than
   * the plain `zones` render prop (it carries `label`/`tags`/`parent` for
   * matching + chip display). Omit when passing a fully custom
   * `searchProviders` array.
   */
  searchableZones?: LiveZoneDatum[]
  /**
   * POIs the "search anything" default providers match against — the flag-row
   * template. SEPARATE from `pois` on purpose: `pois` is the RENDERED pin set
   * (whatever the POI drawer currently has checked), while the whole POI
   * catalogue stays findable by name whether or not its pins are on screen.
   */
  searchablePois?: LivePoiDatum[]
  /** App-shortcut quick-jump rows (spec: "Dashboard"/"Assets" rows with capability chips). */
  searchShortcuts?: MapSearchShortcut[]
  /**
   * Opt-in bundled places/districts/landmarks dataset (`uiConfig.map.search.gazetteer`)
   * matched into the default search providers as extra `place`-kind rows.
   * The design system ships no gazetteer by default — pass `qatarGazetteer`
   * (or a caller's own `MapGazetteerEntry[]`) explicitly for a deployment
   * that wants one. Ignored when `searchProviders` is supplied.
   */
  searchGazetteer?: MapGazetteerEntry[]
  /**
   * Pluggable "search anything" result sources (map-features-video-analysis.md
   * §1). Defaults to `createDefaultSearchProviders({ places, zones: searchableZones, vehicles, shortcuts: searchShortcuts, gazetteer: searchGazetteer })`
   * — built from data this view already holds.
   */
  searchProviders?: MapSearchProvider[]
  /**
   * Default "Within X km" radius the Assets Nearby panel opens at (1-50).
   * Opens at the slider's FLOOR so the highlight circle stays smaller than
   * the frame the fly-to just landed on — a wider default paints the whole
   * viewport accent-coloured and buries the pin it is supposed to mark.
   * @default 1
   */
  searchNearbyDefaultRadiusKm?: number
  /**
   * Marker clustering (map-features-video-analysis.md §2) is `cluster`,
   * ABOVE. This is only the blueprint/app DEFAULT the persisted toggle falls
   * back to before the user has ever touched it (`uiConfig.map.cluster`
   * bridges here) — pass plain `cluster` instead for a fully controlled
   * surface with no persistence.
   */
  defaultClusterEnabled?: boolean
  /**
   * Renders the traffic tool at all (`uiConfig.map.trafficOverlay`). The
   * button renders BY DEFAULT and the overlay itself defaults OFF; a
   * deployment sets this `false` to drop the control entirely.
   */
  trafficOverlay?: boolean
  /**
   * Basemap label renames (`uiConfig.map.labelOverrides`) — passed straight
   * to `MapPanel`, which re-applies them after every basemap switch.
   */
  labelOverrides?: MapLabelOverride[]
  /**
   * How the basemap attribution strip renders (`uiConfig.map.attribution`) —
   * passed straight to `MapPanel`. Defaults there to `hidden`.
   */
  attribution?: 'hidden' | 'compact' | 'visible'
  /**
   * The traffic overlay's default state before the user has ever toggled it.
   * Defaults to `false` — the overlay is opt-in, the button is not. The
   * user's own choice is persisted (`traffic-overlay-store`).
   */
  defaultTrafficEnabled?: boolean
  /**
   * Tools that render and stay interactive but have no data source in this
   * deployment; activating one raises its app-supplied `message` as a toast
   * (SPEC 3.19). No environment-specific copy ever lives in the DS.
   */
  unavailableTools?: LiveMapUnavailableTool[]
  /** Re-fetch live positions (the refresh tool); drives its spinner. */
  onRefresh?: () => void | Promise<unknown>
  /**
   * True hides every vehicle marker. Still honoured for hosts that drive it
   * programmatically; the map's own EYE button is the CLUSTERING toggle (the
   * reference app has no marker-visibility control), so no tool sets it.
   */
  markersHidden?: boolean
  /** @deprecated No tool drives marker visibility any more — see `markersHidden`. */
  onMarkersHiddenChange?: (hidden: boolean) => void
  /** Render the zones tool + reserve the drawer's inboard shift. */
  zonesAvailable?: boolean
  zonesOpen?: boolean
  onZonesOpenChange?: (open: boolean) => void
  /** Render the POI tool + reserve the drawer's inboard shift. */
  poisAvailable?: boolean
  poiOpen?: boolean
  onPoiOpenChange?: (open: boolean) => void
  /** Render the Incidents tool + reserve the drawer's inboard shift
   *  (the blueprint declares an incidents overlay). */
  incidentsAvailable?: boolean
  incidentsOpen?: boolean
  onIncidentsOpenChange?: (open: boolean) => void
  /**
   * Width (px) of the right drawer currently open over the map — the end
   * tool stack shifts inboard by it so the drawer never covers the tool that
   * opened it. Defaults to `MAP_TOOL_DRAWER_WIDTH` while `zonesOpen` or
   * `poiOpen` is true (round-1 visual #21 / interaction 21b).
   */
  drawerWidth?: number
  /**
   * Extra inboard step (px) for the END tool stack, for a right drawer the
   * HOST docks over the map rather than one of the two tool-owned drawers —
   * Customize View is the case round-3 UX #5 filed: it covers the same edge,
   * so all four tools were buried while it was open. Wins over the
   * zones/POI step when both apply.
   */
  toolEndInset?: number
  /** START-side twin of `toolEndInset`: a host-docked LEFT panel column
   *  (e.g. the command center's breakdown/chart panels) covers the default
   *  start gutter; the expanded forecast bar shifts inboard past it. */
  toolStartInset?: number
  className?: string
  'aria-label': string
  /**
   * Which `VehicleIcon3D` illustration every marker + the default popup's
   * header tile render (module config's `uiConfig.map.vehicleArt`). Generic,
   * config-driven per rule #10 — never a per-tenant fork. @default 'car'
   */
  vehicleArt?: VehicleIcon3DArt
  /**
   * Zoom at or above which markers render their info capsule (plate + fill
   * level / speed). Below it they render as plain pins — at region zooms the
   * capsules would collide into an unreadable mat. Config-driven per module
   * (`uiConfig.map.markerDetailZoom`), defaulting to the design's threshold.
   */
  markerDetailZoom?: number

  /* ── Weather monitoring layer (Figma section 22:41486) ───────────────── */
  /**
   * The weather stations to plot (`uiConfig.map.weather.stations`). Supplying
   * a non-empty array is what turns the whole layer on: the `weather` tool
   * button, the markers and the detail drawer all key off it. Omit it and
   * NOTHING here renders — every existing map surface is unaffected.
   *
   * Application data, always. The design system ships no weather readings and
   * calls no weather service.
   *
   * The layer has no per-overlay checkbox row or band-key legend (removed
   * 2026-08-31, fix-wave request): turning it on always shows the station
   * markers, and the rain-heatmap/clouds/precipitation field overlays stay
   * off — there is no UI control for them. See `weather-overlay-layer.ts`
   * for that still-live rendering capability, kept because `MapPanel`'s
   * `weatherOverlays` prop is a generic surface other callers may drive
   * directly.
   */
  weatherStations?: WeatherStationDatum[]
  /**
   * Whether the weather layer starts ON (e.g. `uiConfig.map.weather.defaultOn`
   * — a wall-display command center that opens with the rain layer live).
   * The weather tool still toggles it; inert without `weatherStations`.
   * @default false
   */
  defaultWeatherEnabled?: boolean
  /**
   * Hide stations whose CURRENT rainfall reads zero (or has no reading) —
   * a command-center dashboard where a field of "0" capsules is pure noise
   * (Command Center v2, layout fix #4). The weather tool still toggles the
   * layer; only which stations plot changes. @default false — every other
   * surface keeps the full network.
   */
  weatherHideDryStations?: boolean
  /**
   * `LiveMapTools.grouped` passthrough — every floating control in ONE
   * top-end column instead of the three-corner spread. @default false
   */
  groupedTools?: boolean
  /** Controlled open station (its drawer). Omit to run uncontrolled. */
  selectedStationId?: string | null
  onStationSelect?: (id: string | null) => void
  /**
   * The bottom forecast panel's data (`uiConfig.map.weather.forecast`) — the
   * Open-Meteo / QMD timeline strip that activates WITH the weather layer.
   * Omit it and no bottom panel renders; it also never renders while the
   * layer is off. Application data, always (rule 8).
   */
  weatherForecast?: WeatherForecastPanelData
}

function toMarker(vehicle: LiveVehicleDatum): MapMarkerDatum {
  return { id: vehicle.id, position: vehicle.position, label: vehicle.plate, data: vehicle }
}

function toWorkforceMarker(member: LiveWorkforceDatum): MapMarkerDatum {
  return { id: member.id, position: member.position, label: member.employeeId ?? member.name, data: member }
}

/** The vehicle/workforce status enums share no string values, so a plain
 *  membership check tells the two `MapMarkerDatum.data` shapes apart without
 *  a runtime discriminant field on either datum (neither type changes). */
const WORKFORCE_STATUSES = new Set<string>(['on-duty', 'on-break', 'in-transit', 'clocked-in', 'not-clocked-in'])
function isWorkforceStatus(status: unknown): status is LiveWorkforceStatus {
  return typeof status === 'string' && WORKFORCE_STATUSES.has(status)
}

function clusterSegments(members: MapMarkerDatum[]): ClusterBadgeSegment[] {
  const counts = new Map<VehicleStatusTone, number>()
  for (const member of members) {
    const datum = member.data as LiveVehicleDatum | LiveWorkforceDatum | undefined
    const tone = !datum ? 'muted' : isWorkforceStatus(datum.status) ? LIVE_WORKFORCE_STATUS_TONE[datum.status] : LIVE_STATUS_TONE[datum.status]
    counts.set(tone, (counts.get(tone) ?? 0) + 1)
  }
  const order: VehicleStatusTone[] = ['success', 'warning', 'error', 'muted']
  return order.filter((tone) => counts.has(tone)).map((tone) => ({ tone, count: counts.get(tone)! }))
}

/** Status-mix cluster label (UX-8): "12 vehicles, 5 moving, 4 idling, 3
 *  stopped" — extended to count workforce members separately ("2 on duty, 1
 *  on break") when a mixed cluster carries both kinds. */
function clusterStatusLabel(cluster: MapClusterDatum): string {
  const counts: Record<LiveVehicleStatus, number> = { moving: 0, idling: 0, stopped: 0, 'non-reporting': 0 }
  const workforceCounts: Record<LiveWorkforceStatus, number> = {
    'on-duty': 0,
    'on-break': 0,
    'in-transit': 0,
    'clocked-in': 0,
    'not-clocked-in': 0,
  }
  let workforceTotal = 0
  for (const member of cluster.markers) {
    const datum = member.data as LiveVehicleDatum | LiveWorkforceDatum | undefined
    if (!datum) continue
    if (isWorkforceStatus(datum.status)) {
      workforceCounts[datum.status] += 1
      workforceTotal += 1
    } else if (datum.status in counts) {
      counts[datum.status as LiveVehicleStatus] += 1
    }
  }
  const vehicleTotal = cluster.count - workforceTotal
  const parts = (
    [
      [counts.moving, 'moving'],
      [counts.idling, 'idling'],
      [counts.stopped, 'stopped'],
      [counts['non-reporting'], 'non-reporting'],
    ] as const
  )
    .filter(([n]) => n > 0)
    .map(([n, word]) => `${n} ${word}`)
  const workforceParts = (
    [
      [workforceCounts['on-duty'], 'on duty'],
      [workforceCounts['on-break'], 'on break'],
      [workforceCounts['in-transit'], 'in transit'],
      [workforceCounts['clocked-in'], 'clocked in'],
      [workforceCounts['not-clocked-in'], 'not clocked in'],
    ] as const
  )
    .filter(([n]) => n > 0)
    .map(([n, word]) => `${n} ${word}`)
  const head =
    workforceTotal > 0 && vehicleTotal > 0
      ? `${vehicleTotal} vehicles, ${workforceTotal} workforce`
      : workforceTotal > 0
        ? `${workforceTotal} workforce`
        : `${cluster.count} vehicles`
  return [head, ...parts, ...workforceParts].join(', ')
}

/** Status-tone → hover-tooltip swatch class, same tone vocabulary as
 *  `ClusterBadge`'s ring arcs (`success`/`warning`/`error`/`muted`). */
const STATUS_TONE_DOT_CLASS: Record<VehicleStatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
  muted: 'bg-gray-400',
}

/**
 * Cluster hover tooltip content (AC-4 / SPEC interaction #11): the same
 * status breakdown `clusterSegments` already computes for the badge's own
 * ring arcs, rendered as a small legend list so a user gets information
 * scent ("N red / N orange / N green") before committing to the click-to-
 * decluster zoom. Purely a hover affordance — `clusterStatusLabel` above
 * remains the accessible name.
 */
function clusterStatusBreakdown(cluster: MapClusterDatum): ReactNode {
  const segments = clusterSegments(cluster.markers)
  /* Mixed-kind header (2026-08-31 workforce-popup task): a cluster carrying
     both kinds reads "N vehicles · M workforce" — the cheap two-count line
     the tooltip machinery already affords; single-kind clusters keep their
     original wording. */
  const workforceTotal = cluster.markers.filter((m) =>
    isWorkforceStatus((m.data as LiveVehicleDatum | LiveWorkforceDatum | undefined)?.status),
  ).length
  const vehicleTotal = cluster.count - workforceTotal
  const heading =
    workforceTotal > 0 && vehicleTotal > 0
      ? `${vehicleTotal} vehicles · ${workforceTotal} workforce`
      : workforceTotal > 0
        ? `${workforceTotal} workforce`
        : `${cluster.count} vehicles`
  return (
    <div className="flex flex-col gap-1">
      <span className="font-semibold">{heading}</span>
      <ul className="flex flex-col gap-0.5">
        {segments.map((segment) => (
          <li key={segment.tone} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${STATUS_TONE_DOT_CLASS[segment.tone]}`} />
            <span>
              {segment.count} {LIVE_STATUS_LABEL[TONE_STATUS_WORD[segment.tone]]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Reverse of `LIVE_STATUS_TONE` — one representative status per tone, for
 *  the tooltip's per-segment word (`clusterStatusBreakdown`). */
const TONE_STATUS_WORD: Record<VehicleStatusTone, LiveVehicleStatus> = {
  success: 'moving',
  warning: 'idling',
  error: 'stopped',
  muted: 'non-reporting',
}

/**
 * The vehicle marker's full visual height above its coordinate — circle 40 +
 * badge overhang + leader line, measured at 66px in the live app.
 *
 * MapLibre applies this as the popup's offset from the anchor point, and the
 * popup's TIP is the popup's own bottom edge, so this number IS where the
 * triangle tail's apex lands. QA A6: at 62 the apex landed 4px INSIDE the
 * marker's circle, so the tail read as overlapping the pin rather than
 * pointing at it. 66 puts the apex exactly on the marker's top edge, which
 * is the contact Figma 16:22894 draws.
 */
const MARKER_POPUP_OFFSET = 66

export function LiveMapView({
  vehicles,
  workforce = [],
  selectedId,
  onSelect,
  renderPopup,
  getPopupData,
  getWorkforcePopupData,
  onOpenWorkforce,
  onOpenVehicle,
  popupFooter,
  popupOverflow,
  popupMaxWidth,
  popupClassName,
  zones,
  paths,
  pois,
  incidents,
  selectedIncidentId,
  onSelectIncident,
  cluster,
  clusterOptions,
  onClusterClick,
  viewState,
  defaultViewState,
  onViewStateChange,
  onViewportChange,
  focusPosition,
  fitBounds,
  fitToMarkersNonce,
  styleUrl,
  brightStyleUrl = BRIGHT_MAP_STYLE,
  showTools = false,
  tools,
  places,
  searchableZones,
  searchablePois,
  searchShortcuts,
  searchGazetteer,
  searchProviders,
  searchNearbyDefaultRadiusKm = 1,
  defaultClusterEnabled,
  trafficOverlay = true,
  labelOverrides,
  attribution,
  defaultTrafficEnabled,
  unavailableTools,
  onRefresh,
  markersHidden = false,
  zonesAvailable = false,
  zonesOpen = false,
  onZonesOpenChange,
  poisAvailable = false,
  poiOpen = false,
  onPoiOpenChange,
  incidentsAvailable = false,
  incidentsOpen = false,
  onIncidentsOpenChange,
  drawerWidth = MAP_TOOL_DRAWER_WIDTH,
  toolEndInset,
  toolStartInset,
  className,
  'aria-label': ariaLabel,
  vehicleArt = 'car',
  markerDetailZoom = LIVE_MARKER_DETAIL_ZOOM,
  weatherStations,
  defaultWeatherEnabled = false,
  weatherHideDryStations = false,
  groupedTools = false,
  selectedStationId,
  onStationSelect,
  weatherForecast,
}: LiveMapViewProps) {
  const [internalId, setInternalId] = useState<string | null>(null)
  const activeId = selectedId !== undefined ? selectedId : internalId
  // Track/focus (card header action, UX): the followed vehicle keeps the
  // camera on itself through position updates until the selection changes.
  const [followedId, setFollowedId] = useState<string | null>(null)
  const select = (id: string | null) => {
    if (selectedId === undefined) setInternalId(id)
    if (id !== followedId) setFollowedId(null)
    // A selection supersedes an earlier place-search nudge — otherwise the
    // stale place focus would keep out-ranking the selection framing below.
    setPlaceFocus(null)
    onSelect?.(id)
  }

  const markers = useMemo(
    () => (markersHidden ? [] : [...vehicles.map(toMarker), ...workforce.map(toWorkforceMarker)]),
    [vehicles, workforce, markersHidden],
  )
  const tableId = useId()

  /* Basemap: the SPEC §1 muted-but-coloured Figma palette is the RESTING
     state; de-saturated grey is the loading treatment only. An explicit
     `styleUrl` still wins, and the layers tool flips to the bright
     alternate when the caller left the style to us. */
  const mutedStyleUrl = useMutedBasemapStyle()
  // Global-sync (map-layer-switcher spec point 5): the basemap id is shared
  // app-wide via `useGlobalBasemapId` — Live Monitoring, dashboard map
  // widgets, record-detail maps, and the standalone `MapContainer` all read/
  // write the SAME id, persisted to localStorage and replicated cross-tab.
  // Only `muted` resolves the real muted style URL; every other id
  // (including the CSS-swatch-only extras `LiveMapTools` now offers)
  // resolves to the bright style URL — see the doc comment on
  // `LIVE_MAP_BASEMAP_STYLES` for why only two are real tile styles.
  const [globalBasemapId, setGlobalBasemapId] = useGlobalBasemapId(DEFAULT_GLOBAL_BASEMAP_ID)
  const bright = globalBasemapId !== LIVE_MAP_MUTED_STYLE_ID
  const resolvedStyleUrl = styleUrl ?? (bright ? brightStyleUrl : mutedStyleUrl)
  // Only applies to the CSS-swatch-only variants (Satellite/Terrain/Hybrid/
  // OSM) — muted/bright resolve to '' (no filter), and an explicit `styleUrl`
  // override bypasses the global id entirely, so it gets no filter either.
  const resolvedCanvasFilter = styleUrl ? '' : resolveGlobalBasemapCanvasFilter(globalBasemapId)

  /* Traffic (SPEC 3.19). The overlay is REAL now — a deterministic
     pseudo-traffic line layer over the basemap's major roads (`traffic.ts`),
     not a placeholder — so the tool toggles rather than raising a toast,
     unless a deployment still lists it in `unavailableTools` (the guard in
     `LiveMapTools` is untouched). The choice is persisted app-wide the same
     way the basemap id and the clustering toggle are. */
  const [persistedTrafficOn, setPersistedTrafficOn] = useTrafficOverlayEnabled(defaultTrafficEnabled ?? false)
  // The control can be dropped entirely by config; with no control there is
  // no way back OFF, so a hidden tool also forces the paint off.
  const trafficOn = trafficOverlay && persistedTrafficOn
  /* `trafficOverlay: false` drops the CONTROL, not just the paint — a tool
     that can never do anything must not render (the `unavailableTools` toast
     path is the other, deliberately-visible case). */
  const resolvedTools = useMemo<LiveMapToolId[] | undefined>(() => {
    const needsFilter = !trafficOverlay || !incidentsAvailable
    const base = tools ?? (needsFilter ? LIVE_MAP_DEFAULT_TOOL_IDS : undefined)
    if (!needsFilter || !base) return tools
    return base.filter((tool) => (tool === 'traffic' ? trafficOverlay : tool === 'incidents' ? incidentsAvailable : true))
  }, [tools, trafficOverlay, incidentsAvailable])

  /* Cluster toggle (map-features-video-analysis.md §2): persisted + cross-
     tab synced the same way the basemap id is, unless the caller passes
     `cluster` for a fully controlled surface. */
  const [persistedClusterEnabled, setPersistedClusterEnabled] = useClusterEnabled(defaultClusterEnabled ?? true)
  const clusterEnabled = cluster ?? persistedClusterEnabled

  /* Search anything (spec §1): the default provider set is built from data
     this view already holds — no gazetteer, no geocoding shipped here. An
     explicit `searchProviders` always wins. */
  const defaultSearchProviders = useMemo(
    () =>
      createDefaultSearchProviders({
        places,
        zones: searchableZones,
        pois: searchablePois ?? pois,
        vehicles,
        shortcuts: searchShortcuts,
        gazetteer: searchGazetteer,
      }),
    [places, searchableZones, searchablePois, pois, vehicles, searchShortcuts, searchGazetteer],
  )
  const effectiveSearchProviders = searchProviders ?? defaultSearchProviders

  /* The selected search result's highlight (accent circle + pin) and its
     "Assets Nearby" radius — cleared on Escape/clear/close (spec: "removes
     the highlight"), replanted on every new selection. */
  const [searchHighlight, setSearchHighlight] = useState<MapSearchHighlight | null>(null)
  /* A zone selection FITS its ring; everything else flies to the point (spec
     §1: "zoom ~14 for places/POIs, fit-bounds for a zone"). Kept separate
     from the caller's own `fitBounds` so clearing the search restores it. */
  const [searchFit, setSearchFit] = useState<[LngLat, LngLat] | null>(null)
  /* Owned here, not inside the pin: DOM pins re-render (and can remount) on
     every live position tick, which would blink a pin-local panel shut. */
  const [assetsNearbyOpen, setAssetsNearbyOpen] = useState(false)
  const clearSearchHighlight = () => {
    setSearchHighlight(null)
    setSearchFit(null)
    setAssetsNearbyOpen(false)
  }
  const selectSearchResult = (result: MapSearchResult) => {
    if (!result.position) return
    setSearchHighlight({
      id: result.id,
      title: result.title,
      position: result.position,
      radiusKm: searchNearbyDefaultRadiusKm,
      polygon: result.polygon,
      bounds: result.bounds,
    })
    if (result.bounds) {
      setSearchFit(result.bounds)
      setPlaceFocus(null)
    } else {
      setSearchFit(null)
      setPlaceFocus([...result.position])
    }
  }
  const searchHighlightZoneDatum = useMemo(
    () => (searchHighlight ? searchHighlightZone(`search-highlight-${searchHighlight.id}`, searchHighlight.position, searchHighlight.radiusKm) : null),
    [searchHighlight],
  )
  const assetsNearbyCount = useMemo(
    () => (searchHighlight ? vehiclesWithinRadius(vehicles, searchHighlight.position, searchHighlight.radiusKm).length : 0),
    [searchHighlight, vehicles],
  )

  /* Place search + POI drop (SPEC 3.18): picking a place flies the camera
     there; picking one with `pin-01` armed also drops a POI pin. Both lists
     are application data — no place name is ever authored here. */
  const [placeFocus, setPlaceFocus] = useState<LngLat | null>(null)
  const [droppedPois, setDroppedPois] = useState<LivePoiDatum[]>([])

  // SPEC §2.3: an INDIVIDUAL marker always flanks itself with both chips
  // (plate on the start side, speed/dwell on the end side) — 495:2998 and
  // 495:22361 show them on every un-clustered marker at every zoom, so this
  // deliberately does NOT pass `showPill`: `VehicleMarker`'s own default is
  // true, and a zoom gate here silently re-hid them (round-4 P0).

  /* ── Weather monitoring layer ─────────────────────────────────────────
     Every piece below is inert without `weatherStations`, so this whole
     block costs an existing surface one falsy check. The layer's two
     remaining states — is the tool ON, which station's drawer is open —
     each accept a controlled prop and otherwise run from local state,
     matching how `cluster`/`selectedId` already behave here. There is no
     third "which overlays are checked" state any more: the per-overlay
     checkbox row was removed (2026-08-31, fix-wave request), so turning the
     layer on always shows the stations and never paints the rain-heatmap/
     clouds/precipitation field overlays — that capability has no UI control
     left to reach it (kept in `weather-overlay-layer.ts` regardless, since
     `MapPanel`'s `weatherOverlays` prop is a generic surface other callers
     may still drive directly). */
  const weatherAvailable = (weatherStations?.length ?? 0) > 0
  const [weatherOn, setWeatherOn] = useState(defaultWeatherEnabled)
  const [stationIdState, setStationIdState] = useState<string | null>(null)
  const activeStationId = selectedStationId !== undefined ? selectedStationId : stationIdState
  const selectStation = (id: string | null) => {
    onStationSelect?.(id)
    if (selectedStationId === undefined) setStationIdState(id)
  }
  const stationsVisible = weatherAvailable && weatherOn
  const activeStation = useMemo(
    () => (activeStationId ? (weatherStations ?? []).find((s) => s.id === activeStationId) ?? null : null),
    [activeStationId, weatherStations],
  )
  /* The bottom forecast panel (`weatherForecast`): its expansion is OWNED
     here so a clicked LOCATION — a station marker, or any basemap point
     (resolved to its nearest station) — opens the EXPANDED view with that
     location's data. With no location focused the panel shows the seed-wide
     default (the About Location rail's own place). Closing the panel clears
     the focus, so reopening from the chevron shows the default again. */
  const forecastAvailable = stationsVisible && Boolean(weatherForecast)
  const [forecastExpanded, setForecastExpanded] = useState(false)
  const [forecastStationId, setForecastStationId] = useState<string | null>(null)
  const focusForecastStation = (station: WeatherStationDatum) => {
    setForecastStationId(station.id)
    setForecastExpanded(true)
  }
  const forecastStation = useMemo(
    () => (forecastStationId ? (weatherStations ?? []).find((s) => s.id === forecastStationId) ?? null : null),
    [forecastStationId, weatherStations],
  )
  const forecastPanelData = useMemo<WeatherForecastPanelData | undefined>(() => {
    if (!weatherForecast) return undefined
    return forecastStation ? stationForecastPanelData(forecastStation, weatherForecast) : weatherForecast
  }, [weatherForecast, forecastStation])
  /* Selection dimming (product requirement 2026-08-31): active only while
     the expanded forecast panel is showing ONE SPECIFIC station — i.e. a
     marker or basemap click actually focused a location, not just the
     panel's default "collapsed" or "expanded-with-no-location" state.
     Closing the panel (its own X, or the chevron collapse — both clear
     `forecastStationId`, see the panel's `onExpandedChange` below) drops
     this back to `false`, which is exactly "restores all to 100%". */
  const weatherSelectionDimming = forecastExpanded && Boolean(forecastStationId)
  /* Turning the layer off closes any open drawer: a detail panel outliving
     the marker that opened it reads as stale data the user cannot get back
     to (spec 19:25255, interaction 5). Same rule for the forecast panel. */
  useEffect(() => {
    if (!stationsVisible && activeStationId) selectStation(null)
    if (!stationsVisible) {
      setForecastExpanded(false)
      setForecastStationId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationsVisible])

  // Hovered POI → its translucent radius circle joins the zones layer.
  const [hoveredPoiId, setHoveredPoiId] = useState<string | null>(null)
  const allPois = useMemo(() => [...(pois ?? []), ...droppedPois], [pois, droppedPois])
  const poiPins = useMemo<MapMarkerDatum[]>(() => {
    const pins: MapMarkerDatum[] = allPois.map((poi) => ({ id: poi.id, position: poi.position, data: poi }))
    if (searchHighlight) {
      pins.push({ id: `search-highlight-pin-${searchHighlight.id}`, position: searchHighlight.position, data: searchHighlight })
    }
    /* Weather stations ride the PIN channel, not the marker channel, and that
       is the whole point: `pins` bypasses the supercluster pipeline, so a
       fixed ~40-station network stays individually readable at every zoom
       instead of collapsing into aggregate badges the reference never shows
       (19:25255). Tanker markers keep clustering, unchanged. */
    if (stationsVisible) {
      for (const station of weatherStations ?? []) {
        /* Dry-station suppression (Command Center v2): a wall display opts
           out of plotting the zero-rain "0" capsules — signal only. */
        if (weatherHideDryStations && !((stationRainMm(station) ?? 0) > 0)) continue
        pins.push({ id: `${WEATHER_PIN_PREFIX}${station.id}`, position: station.position, data: station })
      }
    }
    // Incidents ride the same non-clustered pin channel as POIs/weather — the
    // caller (`MapView`/`LiveHybridView`) already narrowed `incidents` to the
    // eye-on ∩ search∩filter set, so this view only paints exactly that.
    for (const incident of incidents ?? []) {
      pins.push({ id: `${INCIDENT_PIN_PREFIX}${incident.id}`, position: incident.position, data: incident })
    }
    return pins
  }, [allPois, searchHighlight, stationsVisible, weatherStations, weatherHideDryStations, incidents])
  const effectiveZones = useMemo<MapZoneDatum[] | undefined>(() => {
    const hovered = hoveredPoiId ? allPois.find((p) => p.id === hoveredPoiId) : undefined
    const radius = hovered ? poiRadiusZone(hovered) : null
    /* A selected ZONE also re-draws its own ring in the accent colour, on top
       of the radius circle, so the geofence itself reads as "the thing you
       picked" and not just its centroid. */
    const selectedRing: MapZoneDatum | null =
      searchHighlight?.polygon?.length
        ? {
            id: `search-highlight-ring-${searchHighlight.id}`,
            points: searchHighlight.polygon,
            color: 'var(--color-primary)',
            fillOpacity: 0.28,
          }
        : null
    const extra = [radius, searchHighlightZoneDatum, selectedRing].filter((z): z is MapZoneDatum => Boolean(z))
    if (extra.length === 0) return zones
    return [...(zones ?? []), ...extra]
  }, [zones, allPois, hoveredPoiId, searchHighlightZoneDatum, searchHighlight])

  // Every plotted position (vehicle + workforce) — the shared pool the
  // camera-fallback average, the followed-position lookup, and the selection
  // focus effect below all draw from, so a workforce-only view (the Workforce
  // chip, `vehicles` empty) still centers and frames correctly.
  const allPositions = useMemo(
    () => [...vehicles.map((v) => ({ id: v.id, position: v.position })), ...workforce.map((w) => ({ id: w.id, position: w.position }))],
    [vehicles, workforce],
  )

  // Camera derives its start from the fleet when the caller gives none.
  const fallbackViewState = useMemo<MapViewState | undefined>(() => {
    if (defaultViewState || viewState || allPositions.length === 0) return defaultViewState
    const [lng, lat] = allPositions
      .reduce<LngLat>((acc, p) => [acc[0] + p.position[0], acc[1] + p.position[1]], [0, 0])
      .map((sum) => sum / allPositions.length) as LngLat
    return { longitude: lng, latitude: lat, zoom: 10 }
  }, [defaultViewState, viewState, allPositions])

  // Following a vehicle (or workforce member) overrides the caller's focus
  // nudge — recomputed from the live position pool so position ticks keep
  // the camera attached.
  const followedPosition = useMemo<LngLat | null>(() => {
    if (!followedId) return null
    return allPositions.find((p) => p.id === followedId)?.position ?? null
  }, [followedId, allPositions])

  /*
   * Selection framing (run acceptance P0-2). A selection with NO caller-
   * supplied focus nudge still has to frame the marker AND its card, so the
   * card opens ABOVE the marker (`computeFocusOffset` in `popup-anchor.ts`,
   * applied by `MapPanel`'s focus effect). The hybrid host derives its own
   * `focusPosition` from the active list row; the MAP-ONLY view has no such
   * host, so a marker click there used to reach `MapPanel` with no focus at
   * all and fell back to `computePopupAnchor`'s flip logic — a marker high in
   * the pane got its card BELOW it, contradicting Figma.
   *
   * Captured ONCE per selection through a ref: reading the LIVE position each
   * render would re-ease the camera on every position tick, which is
   * `followedPosition`'s job (the card's explicit track/focus action), not
   * plain selection's.
   */
  const positionsRef = useRef(allPositions)
  positionsRef.current = allPositions
  const [selectionFocus, setSelectionFocus] = useState<LngLat | null>(null)
  useEffect(() => {
    if (!activeId) {
      setSelectionFocus(null)
      return
    }
    const position = positionsRef.current.find((p) => p.id === activeId)?.position
    setSelectionFocus(position ? [position[0], position[1]] : null)
  }, [activeId])

  /* The drawer DOCKS: it takes real layout width beside the map rather than
     floating over it behind a scrim, so the map stays pannable and a click on
     another station swaps the panel's contents in place (19:27942,
     interaction 5). With no station open the tree is exactly what it was. */
  return (
    <div className={cn('flex min-w-0', className ?? 'h-full min-h-0')}>
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
      <MapPanel
        aria-label={ariaLabel}
        aria-describedby={tableId}
        /* Live Monitoring ships no compass, because Figma's control stack has
           none — so rotation is disabled outright rather than leaving a
           rotated state the user cannot undo. Every OTHER MapPanel consumer
           (dashboard widgets, asset/ticketing location maps, FAMS Desk) keeps
           MapPanel's default `rotatable`, which is why this is a prop and not
           a hardcoded behaviour. */
        rotatable={false}
        markers={markers}
        zones={effectiveZones}
        paths={paths}
        pins={poiPins}
        renderPin={(pin) => {
          if (searchHighlight && pin.id === `search-highlight-pin-${searchHighlight.id}`) {
            return (
              <SearchHighlightPin
                highlight={searchHighlight}
                assetsNearbyCount={assetsNearbyCount}
                onRadiusChange={(radiusKm) => setSearchHighlight((prev) => (prev ? { ...prev, radiusKm } : prev))}
                onClear={clearSearchHighlight}
                open={assetsNearbyOpen}
                onOpenChange={setAssetsNearbyOpen}
              />
            )
          }
          if (pin.id.startsWith(WEATHER_PIN_PREFIX)) {
            const station = pin.data as WeatherStationDatum
            const stationSelected = forecastAvailable ? station.id === forecastStationId : station.id === activeStationId
            return (
              <WeatherStationMarker
                station={station}
                selected={stationSelected}
                /* Selection dimming (product requirement 2026-08-31): only
                   while the EXPANDED forecast panel is showing one specific
                   location (`weatherSelectionDimming` below) does every
                   OTHER station recede to 40% opacity — the default "layer
                   on, nothing focused" state and the docked-drawer path (no
                   forecast data) both leave every marker at full strength. */
                dimmed={weatherSelectionDimming && !stationSelected}
                /* With forecast data present the temperature markers ARE the
                   clickable locations: a click opens the EXPANDED bottom view
                   with that station's data (user refinement 2026-08-31 — no
                   side panel). Without forecast data the original docked
                   station drawer keeps its click, unchanged. */
                onClick={() =>
                  forecastAvailable
                    ? focusForecastStation(station)
                    : selectStation(station.id === activeStationId ? null : station.id)
                }
              />
            )
          }
          if (pin.id.startsWith(INCIDENT_PIN_PREFIX)) {
            const incident = pin.data as LiveIncidentDatum
            return (
              <IncidentPin
                incident={incident}
                selected={incident.id === selectedIncidentId}
                onClick={() => onSelectIncident?.(incident)}
              />
            )
          }
          const poi = pin.data as LivePoiDatum
          return <PoiPin poi={poi} onHoverChange={(h) => setHoveredPoiId(h ? poi.id : null)} />
        }}
        cluster={clusterEnabled}
        traffic={trafficOn}
        labelOverrides={labelOverrides}
        attribution={attribution}
        clusterOptions={clusterOptions}
        styleUrl={resolvedStyleUrl}
        canvasFilter={resolvedCanvasFilter}
        viewState={viewState}
        defaultViewState={fallbackViewState}
        onViewStateChange={onViewStateChange}
        onViewportChange={onViewportChange}
        controlsVariant="figma"
        focusPosition={followedPosition ?? placeFocus ?? focusPosition ?? selectionFocus}
        chrome={
          showTools ? (
            <>
            <LiveMapTools
              tools={resolvedTools}
              grouped={groupedTools}
              places={places}
              searchProviders={effectiveSearchProviders}
              onSearchResultSelect={selectSearchResult}
              onSearchClear={clearSearchHighlight}
              unavailableTools={unavailableTools}
              onPlacePick={(place) => setPlaceFocus([...place.position])}
              onDropPin={(place) =>
                setDroppedPois((prev) =>
                  prev.some((poi) => poi.id === `place-${place.id}`)
                    ? prev
                    : [...prev, { id: `place-${place.id}`, name: place.name, position: [...place.position] }],
                )
              }
              onRefresh={onRefresh}
              clusterEnabled={clusterEnabled}
              onClusterToggle={() => setPersistedClusterEnabled(!clusterEnabled)}
              // Layers is a STYLE SWITCHER (SPEC 3.19): the tool lists the
              // basemap styles and the picked id resolves the style URL. The
              // id itself lives in the GLOBAL store (`useGlobalBasemapId`
              // above), so a change here replicates to every other map
              // surface app-wide.
              activeBasemapId={globalBasemapId}
              onBasemapChange={styleUrl === undefined ? setGlobalBasemapId : undefined}
              weatherActive={weatherOn}
              onWeatherToggle={() => setWeatherOn((prev) => !prev)}
              trafficActive={trafficOn}
              onTrafficToggle={() => setPersistedTrafficOn(!trafficOn)}
              zonesAvailable={zonesAvailable}
              zonesOpen={zonesOpen}
              onZonesToggle={() => onZonesOpenChange?.(!zonesOpen)}
              poiAvailable={poisAvailable}
              poiOpen={poiOpen}
              onPoiToggle={() => onPoiOpenChange?.(!poiOpen)}
              // The Incidents control (Figma 19:23006 #4) — same "open the
              // matching right drawer" contract as zones/POI, so it reads as
              // one system with them rather than a bespoke fourth control.
              incidentsActive={incidentsOpen}
              onIncidentsToggle={
                incidentsAvailable ? () => onIncidentsOpenChange?.(!incidentsOpen) : undefined
              }
              // The open drawer docks flush to the pane's end edge, so the
              // stack steps inboard by exactly its width — the tool that
              // opened it stays visible AND clickable, and Zones<->POI<->
              // Incidents can be switched directly (interaction 21b).
              endInset={Math.max(toolEndInset ?? 0, zonesOpen || poiOpen || incidentsOpen ? drawerWidth : 0)}
            />
              {/* The key appears and disappears WITH the overlay — a legend
                  for a layer that is not painted would be noise. */}
              {trafficOn ? <TrafficLegend /> : null}
              {/* The weather overlay checkbox row and the temperature-band
                  legend card were removed (2026-08-31, fix-wave request):
                  the layer now paints unconditionally at its sensible
                  default (stations visible, no per-band key) rather than
                  through either piece of chrome. */}
            </>
          ) : undefined
        }
        fitBounds={searchFit ?? fitBounds}
        fitToMarkersNonce={fitToMarkersNonce}
        selectedMarkerId={activeId ?? undefined}
        onPopupClose={() => select(null)}
        /* Weather layer on (with forecast data) → a basemap click inspects
           that location's weather in the EXPANDED bottom view, resolved to
           the nearest station. Off → the prop is absent and a basemap click
           behaves exactly as before. */
        onBasemapClick={
          forecastAvailable
            ? (lngLat) => {
                const hit = nearestWeatherStation(lngLat, weatherStations ?? [])
                if (hit) focusForecastStation(hit.station)
              }
            : undefined
        }
        popupMaxWidth={popupMaxWidth ?? '34.875rem'}
        popupChrome={false}
        popupOffset={MARKER_POPUP_OFFSET}
        onClusterClick={onClusterClick}
        clusterAriaLabel={clusterStatusLabel}
        clusterTooltip={clusterStatusBreakdown}
        renderMarker={(marker: MapMarkerDatum, state: MapMarkerRenderState) => {
          const datum = marker.data as LiveVehicleDatum | LiveWorkforceDatum
          if (isWorkforceStatus(datum.status)) {
            const member = datum as LiveWorkforceDatum
            return (
              <WorkforceMarker
                name={member.name}
                status={member.status}
                designation={member.designation}
                selected={member.id === activeId}
                dimmed={Boolean(activeId) && member.id !== activeId}
                onClick={() => select(member.id === activeId ? null : member.id)}
              />
            )
          }
          const vehicle = datum as LiveVehicleDatum
          return (
            <VehicleMarker
              label={vehicle.plate ?? vehicle.id}
              meta={liveMarkerPillMeta(vehicle)}
              statusLabel={LIVE_STATUS_LABEL[vehicle.status]}
              art={vehicleArt}
              tone={LIVE_STATUS_TONE[vehicle.status]}
              moving={vehicle.status === 'moving'}
              heading={vehicle.heading}
              selected={vehicle.id === activeId}
              // Unselected pins recede once a route is picked (UX G.35) —
              // without this the selection is carried by the polylines alone.
              dimmed={Boolean(activeId) && vehicle.id !== activeId}
              // Chip collision + pane-edge clamp (UX finding 17). Suppression
              // only drops the RESTING chips — `VehicleMarker` still reveals
              // them on hover and always paints them while `selected`, and
              // the plate/speed stay in the marker's accessible name, so no
              // data channel is lost. (`VehicleMarker` exposes no dedicated
              // `suppressed`/`collisionPriority` prop as of this run — this
              // is the suppression its current props allow.)
              // Zoom-driven detail level (designer's two marker variants):
              // plain pins while the camera is showing a region, pins WITH
              // their plate/fill capsule once the user has zoomed in past the
              // threshold. Collision suppression still applies on top, and a
              // suppressed capsule is still revealed on hover.
              showPill={state.zoom >= markerDetailZoom && !state.chipSuppressed}
              onClick={() => select(vehicle.id === activeId ? null : vehicle.id)}
            />
          )
        }}
        renderCluster={(clusterDatum) => (
          <ClusterBadge count={clusterDatum.count} segments={clusterSegments(clusterDatum.markers)} />
        )}
        renderMarkerPopup={(marker) => {
          const datum = marker.data as LiveVehicleDatum | LiveWorkforceDatum
          if (isWorkforceStatus(datum.status)) {
            const member = datum as LiveWorkforceDatum
            return (
              <LiveWorkforcePopup
                member={member}
                data={getWorkforcePopupData?.(member)}
                onClose={() => select(null)}
                onExpand={onOpenWorkforce ? () => onOpenWorkforce(member) : undefined}
                onLocate={() => setFollowedId(member.id)}
                className={popupClassName}
                // Same anchor rule as the vehicle card: MapLibre's own tip is
                // the pointer, so the card's baked triangle stays off.
                pointer={false}
              />
            )
          }
          const vehicle = datum as LiveVehicleDatum
          if (renderPopup) return renderPopup(vehicle)
          return (
            <LiveVehiclePopup
              vehicle={vehicle}
              data={getPopupData?.(vehicle)}
              art={vehicleArt}
              onClose={() => select(null)}
              onExpand={onOpenVehicle ? () => onOpenVehicle(vehicle) : undefined}
              footer={popupFooter?.(vehicle)}
              overflow={popupOverflow?.(vehicle)}
              className={popupClassName}
              onLocate={() => setFollowedId(vehicle.id)}
              // The anchor pointer comes from MapLibre's own tip (tinted to
              // the card by `MapPanel`'s chrome-less popup class) so it
              // FOLLOWS the computed anchor — above the marker by default
              // (Figma 495:2998), flipped below/aside at a map edge (UX-11).
              // The card's own bottom-edge triangle would aim at empty map.
              pointer={false}
            />
          )
        }}
      />
      {/* The weather layer's bottom forecast strip (Open-Meteo / QMD) —
          activates and deactivates WITH the layer, floats over the map's
          bottom edge, end-aligned clear of the control column when collapsed
          and full-width when expanded (the panel manages that itself). */}
      {forecastAvailable && forecastPanelData ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-x-3 z-10 flex justify-end',
            forecastExpanded
              ? // Expanded: a full-width card, so its bottom edge has to read
                // as part of the SAME floating-action row as the bottom-END
                // zoom/fullscreen stack (`MapControls`'s `'figma'` variant
                // sits at a flat `bottom-4`, 16px off the pane floor) rather
                // than at the collapsed pills' own resting height (user
                // report 2026-08-31: the panel floated higher, leaving a
                // dead gap below it). The end gutter (`pe-14` + this
                // wrapper's `inset-x-3`, 68px total) already clears the
                // zoom/fullscreen column; mirroring it with `ps-14` gives
                // the bottom-START cluster-toggle stack (`LiveMapTools`,
                // 44px wide at `start-4`) the same 68px clearance instead of
                // the ~12px it had, which let the panel's edge sit on top of
                // the button.
                'bottom-4 ps-14 pe-14'
              : // Collapsed pills — unchanged (commit f4d4525): right-aligned,
                // content-sized, resting 32px off the floor.
                'bottom-8 pe-14',
          )}
          /* A host-docked right panel (`toolEndInset` — e.g. the command
             center's live-activity column) covers the default 56px end
             gutter; the forecast bar shifts inboard with the tool stack. */
          style={
            toolEndInset || toolStartInset
              ? {
                  ...(toolEndInset ? { paddingInlineEnd: toolEndInset + 12 } : {}),
                  ...(toolStartInset ? { paddingInlineStart: toolStartInset + 12 } : {}),
                }
              : undefined
          }
        >
          <WeatherForecastPanel
            data={forecastPanelData}
            expanded={forecastExpanded}
            onExpandedChange={(open) => {
              setForecastExpanded(open)
              if (!open) setForecastStationId(null)
            }}
          />
        </div>
      ) : null}
      {/* The canvas encodes everything in position + colour — this table is
          its text alternative (MapPanel's aria-describedby channel).

          Round-5 UX gate N2 asks for this to stop materialising 1,000 static
          rows. DELIBERATELY UNCHANGED, because every available route is a
          design decision rather than a tweak, and each has a cost that
          outweighs the nit:
          - Truncating the table removes information sighted users still have
            (SC 1.1.1), and no gate has profiled the live-tick cost the finding
            assumes.
          - Mirroring the map VIEWPORT instead would re-render this subtree on
            every camera frame — more cost than it saves, next to a WebGL
            canvas.
          - Mirroring the PAINTED set (empty while `markersHidden`) contradicts
            an explicit, tested decision: `LiveMapView.test.tsx`'s "the sr-only
            text alternative still lists every vehicle (UX-9)".
          - Making each row a button would add 1,000 focusables, which is worse
            on both of the costs N2 names.
          Owner's call, per the gate's own "can wait for a planning
          conversation". */}
      <table id={tableId} className="sr-only">
        <caption>Vehicles on the map</caption>
        <thead>
          <tr>
            <th scope="col">Vehicle</th>
            <th scope="col">Status</th>
            <th scope="col">Speed or dwell</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((vehicle) => (
            <tr key={vehicle.id}>
              <td>{vehicle.name ?? vehicle.plate ?? vehicle.id}</td>
              <td>{LIVE_STATUS_LABEL[vehicle.status]}</td>
              <td>{liveVehicleMeta(vehicle) ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <WeatherStationDrawer station={activeStation} onClose={() => selectStation(null)} />
    </div>
  )
}

LiveMapView.displayName = 'LiveMapView'
