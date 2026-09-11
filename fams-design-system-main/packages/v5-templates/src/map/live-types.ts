import type { VehicleStatusTone } from '@fams/ui-kit'
import type { LngLat } from './MapPanel.types'

/**
 * live-types.ts — the live-monitoring vehicle vocabulary shared by
 * `LiveMapView` / `LiveVehiclePopup` (this heavy `./map` entry) and the
 * light-barrel record derivation (`views/live-data.ts`, which imports these
 * TYPE-ONLY — erased at build time, so the lazy-weight split holds).
 */

/** Mobility status (figma live-monitoring spec §1.3). */
export type LiveVehicleStatus = 'moving' | 'idling' | 'stopped' | 'non-reporting'

/** Status → DS tone: Moving=success · Idling=warning · Stopped=error ·
 *  Non-Reporting=muted (grey) — spec §2 status colors, tokens only. */
export const LIVE_STATUS_TONE: Record<LiveVehicleStatus, VehicleStatusTone> = {
  moving: 'success',
  idling: 'warning',
  stopped: 'error',
  'non-reporting': 'muted',
}

/** Display label per status (popup status line). */
export const LIVE_STATUS_LABEL: Record<LiveVehicleStatus, string> = {
  moving: 'Moving',
  idling: 'Idling',
  stopped: 'Stopped',
  'non-reporting': 'Non-Reporting',
}

/** One live vehicle as the map surfaces consume it — derived from an
 *  `EntityRecord` via `uiConfig.map`'s column bindings (`views/live-data.ts`)
 *  or supplied directly by an app. */
export interface LiveVehicleDatum {
  id: string
  /** `[lng, lat]` — GeoJSON order, same as everything else under `map/`. */
  position: LngLat
  status: LiveVehicleStatus
  /**
   * @deprecated The popup title now renders `model` (make + model, e.g.
   * "Mitsubishi X6734", Figma 16:21392) — this stayed the asset's
   * descriptive title (the `title` column, e.g. "Tanker 07"). Kept for API
   * compatibility; new callers want `model`.
   */
  name?: string
  /** Make + model, e.g. "Mitsubishi X6734" — the popup TITLE (A22: one
   *  plate identity everywhere; title is the model, the tag/list/marker text
   *  is the plate, never the internal record id). */
  model?: string
  /** Plate — the ONE identity shown in the list VEHICLE cell, the marker
   *  capsule's leading chip, and the popup header's tag chip. Never the
   *  internal record id (`uniqueidentifier`/`id`). */
  plate?: string
  /** Current speed in km/h — the trailing chip while moving. */
  speedKmh?: number
  /** Pre-formatted dwell duration (e.g. "12 mins") — trailing chip while idle/stopped. */
  dwell?: string
  /** Heading in degrees (0 = north, clockwise) — moving marker's arrow. */
  heading?: number
  /**
   * @deprecated Vehicle photos are no longer rendered anywhere in Live
   * Monitoring (2026-08-24 parity run, P0-1) — every surface renders the 3D
   * vehicle art (`VehicleIcon3D`). The field stays accepted for API
   * compatibility (FAMS Desk vendors these types) and is ignored.
   */
  photoUrl?: string
  driver?: string
  location?: string
  /** Pre-formatted status-since detail, e.g. "since 2 minutes". */
  statusSince?: string
  /**
   * 0-100 tank/load reading (`uiConfig.map.fillLevelCol`). When bound it is
   * what the marker capsule's TRAILING slot shows — the designer's marker
   * exports (13:17558) put the plate on the left and the fill level on the
   * right. Unbound, the capsule falls back to speed/dwell.
   */
  fillLevel?: number
  /** Arbitrary passthrough (the source `EntityRecord`) — never read here. */
  record?: unknown
}

/** A map zone as the zones drawer + map consume it (spec §1.4) — the
 *  `uiConfig.map.zones[]` shape; `points` are `[lng, lat]`. Structurally a
 *  `MapZoneDatum` plus the drawer's PARENT column. */
export interface LiveZoneDatum {
  id: string
  points: LngLat[]
  color?: string
  label?: string
  parent?: string
  fillOpacity?: number
  /** Free-form tag labels backing the zones drawer's tag-filter buttons (spec 3.20). */
  tags?: string[]
}

/** A point of interest (spec §1.4) — the `uiConfig.map.pois[]` shape. */
export interface LivePoiDatum {
  id: string
  name: string
  /** `[lng, lat]` — GeoJSON order. */
  position: LngLat
  color?: string
  /** Hover radius circle, in meters (spec: "Radius 43 meters"). */
  radiusMeters?: number
  /**
   * Lead-glyph kind for the POI drawer's tinted row tile (SPEC §2.8 /
   * 495:36403, which mixes a filled pin, a flag and a place glyph across the
   * rows). Optional and additive: with no `kind` the drawer picks a stable
   * glyph from the id, so existing blueprints keep rendering unchanged.
   */
  kind?: 'pin' | 'flag' | 'place'
  /** Free-form tag labels backing the POI drawer's tag-filter buttons (spec 3.21). */
  tags?: string[]
  /**
   * DS POI category id (`@fams/ui-kit`'s `POI_CATEGORIES`, e.g. `'port'` /
   * `'fuel-station'` / `'hospital'` / `'mosque'` / `'government'` — see
   * `assets/icons/poi/*.svg`). Drives the category-glyphed `PoiMarker` on
   * the map and `PoiCategoryChip` in the POI drawer. Optional and additive:
   * a POI without a recognized `category` falls back to the legacy
   * `kind`-based glyph so existing blueprints keep rendering unchanged.
   */
  category?: string
}

/**
 * An incident plotted on the live map (Incidents panel overlay) — reuses the
 * incidents hybrid's own severity `colorBy` treatment (`recordMapConfig` /
 * `deriveRecordGeometry` in `views/hybrid/record-map-model.ts`) rather than
 * inventing a second colour vocabulary. `color`/`colorKey` come straight from
 * that derivation; this type only adds the map-pin shape (`position`,
 * `label`) `IncidentPin`/`LiveMapView` need.
 */
export interface LiveIncidentDatum {
  id: string
  label: string
  /** `[lng, lat]` — GeoJSON order. */
  position: LngLat
  /** Severity colour (`uiConfig.map.records.colorBy`), resolved upstream. */
  color?: string
  colorKey?: string
  /**
   * Renders a pulsing halo behind the pin (Command Center v2 "wow" — a
   * critical-priority request demanding dispatch). Purely presentational,
   * caller-decided; suppressed under `prefers-reduced-motion`.
   */
  pulse?: boolean
}

/**
 * A named place the map's place-search filters over and flies to (spec 3.18).
 *
 * The design system ships NO gazetteer and performs NO geocoding: the map
 * takes the place list as a GENERIC search source supplied by the application
 * (the demo env binds `uiConfig.map.places`), so no place names live here.
 */
export interface LiveMapPlace {
  id: string
  name: string
  /** `[lng, lat]` - GeoJSON order. */
  position: LngLat
  /** Optional grouping/secondary label, e.g. "Landmark". */
  category?: string
  /**
   * Full "District, Municipality, Country" line shown as the muted subtitle
   * of a gazetteer row in the map search (spec §1, place row template).
   * Application data like every other field here — the design system ships
   * no gazetteer and geocodes nothing; it only renders what a module's
   * `uiConfig.map.places[]` already authors. Falls back to `category`.
   */
  address?: string
}

/**
 * A map tool that renders and stays interactive but has no live data source in
 * this deployment: activating it raises `message` as a toast instead of
 * toggling (spec 3.19). The message text is always application-supplied - the
 * design system never hardcodes environment-specific copy.
 */
export interface LiveMapUnavailableTool {
  tool: string
  message: string
}

/** The marker's trailing chip: speed while moving — INCLUDING an explicit
 *  "0 km/h" (SPEC P0-3#31, 517:11759) — and dwell while idle/stopped when
 *  present (SPEC §2.3). */
export function liveVehicleMeta(vehicle: LiveVehicleDatum): string | undefined {
  if (vehicle.status === 'moving') return vehicle.speedKmh != null ? `${vehicle.speedKmh} km/h` : undefined
  return vehicle.dwell
}

/**
 * The marker capsule's TRAILING value (13:17558's right-hand slot): the
 * fill-level percentage when the module binds one, else the same speed/dwell
 * `liveVehicleMeta` gives every other surface. Generic — nothing here knows
 * what the fleet carries, only whether a 0-100 reading exists.
 */
export function liveMarkerPillMeta(vehicle: LiveVehicleDatum): string | undefined {
  if (vehicle.fillLevel != null && Number.isFinite(vehicle.fillLevel)) {
    return `${Math.round(Math.min(100, Math.max(0, vehicle.fillLevel)))}%`
  }
  return liveVehicleMeta(vehicle)
}

/**
 * Zoom at or above which markers swap from the plain pin to the pin WITH its
 * info capsule (the designer's two marker variants). Below it the map is
 * showing a region, labels would collide, and the plain pin is the readable
 * choice. Overridable per module via `uiConfig.map.markerDetailZoom`.
 */
export const LIVE_MARKER_DETAIL_ZOOM = 12

/* ── Workforce (2026-08-31 "add WORKFORCE alongside vehicles" enhancement) ──
 *
 * A SEPARATE, PARALLEL datum/derivation from the vehicle vocabulary above —
 * deliberately not folded into `LiveVehicleDatum` so the vehicle-only
 * experience stays byte-identical (no new optional fields on a type every
 * existing vehicle marker/popup/cell already destructures). The map/list
 * surfaces render both datum kinds side by side; see `views/live-data.ts`'s
 * `deriveLiveWorkforce` and `LiveMapView.tsx`'s marker/popup `kind` branch.
 */

/** Workforce duty status (pixel reference: FAMS Workforce Management App,
 *  Figma 6Twj2L7KPGP5y8unBP9KS6, nodes 3439:4860/6849/9590). Three states,
 *  not the vehicle mobility vocabulary's four — a person doesn't "stop" or
 *  go "non-reporting", they go on/off duty or step away. */
export type LiveWorkforceStatus = 'on-duty' | 'on-break' | 'in-transit' | 'clocked-in' | 'not-clocked-in'

/** Display label per status (list cell caption + marker card status line).
 *  2026-08-31 workforce-popup task added the spec's three live states:
 *  In Transit (moving), Clocked In (static, blue) and the grey Not Clocked
 *  In; the two legacy labels stay for compatibility. */
export const LIVE_WORKFORCE_STATUS_LABEL: Record<LiveWorkforceStatus, string> = {
  'on-duty': 'On Duty',
  'on-break': 'On Break',
  'in-transit': 'In Transit',
  'clocked-in': 'Clocked In',
  'not-clocked-in': 'Not Clocked In',
}

/**
 * Status → DS tone, for the few UI bits that must run through the shared
 * 4-tone `VehicleStatusTone` vocabulary (success/warning/error/muted — no
 * "info"/blue member). `on-duty`→success and `on-break`→warning land on
 * their exact semantic match; `in-transit` has no blue equivalent in that
 * vocabulary, so it falls back to `muted` — a deliberate, documented
 * simplification (see `workforce-icon-art.ts`'s docblock) rather than
 * expanding the shared enum for one caller. The MARKER pin and list-row
 * avatar never use this map at all — their ring/tint colour (including the
 * real blue) is baked into the vendored art per status.
 */
export const LIVE_WORKFORCE_STATUS_TONE: Record<LiveWorkforceStatus, VehicleStatusTone> = {
  'on-duty': 'success',
  'on-break': 'warning',
  'in-transit': 'muted',
  // Blue has no member in the shared 4-tone vocabulary — `muted` is the
  // documented fallback (see docblock above); the marker/avatar art carries
  // the real blue itself.
  'clocked-in': 'muted',
  'not-clocked-in': 'muted',
}

/** Which "kind" of place a workforce member's location line names — the
 *  small lead glyph that differentiates a plain address from a named Zone
 *  or a POI in the mixed Name·ID·Type·Location list (task requirement §2). */
export type LiveLocationKind = 'plain' | 'zone' | 'poi'

/** Case-insensitive workforce-status parse; anything unknown (or unbound)
 *  reads as on-duty — the least alarming default for an unrecognized value,
 *  mirroring `parseLiveStatus`'s "no signal ≠ alarm" stance. */
export function parseLiveWorkforceStatus(value: unknown): LiveWorkforceStatus {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/\s+/g, '-')
  if (normalized === 'on-break' || normalized === 'break') return 'on-break'
  if (normalized === 'in-transit' || normalized === 'transit' || normalized === 'traveling' || normalized === 'travelling')
    return 'in-transit'
  if (normalized === 'clocked-in' || normalized === 'clockedin') return 'clocked-in'
  if (normalized === 'not-clocked-in' || normalized === 'clocked-out' || normalized === 'off-duty')
    return 'not-clocked-in'
  return 'on-duty'
}

/** Field vs office designation classifier (2026-09-01 workforce-coin fix):
 *  a "Clocked In" duty status is DATA about attendance, not about where the
 *  person works — the vendored art's blue "clocked-in" coin is only correct
 *  for an office/monitoring role. A field-facing designation ("Field
 *  Inspector", "Senior Field Inspector", driver/patrol roles, …) stays
 *  location-based and must show the green send-arrow coin even while
 *  clocked in (finding: EMP-QA-107/108, both "Field Inspector"-family
 *  designations, rendered the office-blue pin coin — wrong per the
 *  reference Dev Notes matrix). Case-insensitive substring match on the
 *  designation string; unrecognized/missing designation defaults to
 *  office (`false`) so an unbound designation doesn't silently repaint an
 *  actually-office member green. */
export function isFieldDesignation(designation?: string | null): boolean {
  return /field|inspector|patrol|driver|technician|crew/i.test(designation ?? '')
}

/**
 * Resolves which AVATAR ART KEY to look up (`WORKFORCE_AVATAR_ART` /
 * `WORKFORCE_MARKER_ART`, either the map or list light-barrel copy) for a
 * member — distinct from the member's own `status` used for the status
 * LABEL/TONE/filter-count bucket, which stays "Clocked In" unchanged. Only
 * `clocked-in` is ambiguous (office-blue vs field-green); every other
 * status has exactly one coin regardless of designation.
 */
export function resolveWorkforceArtStatus(
  status: LiveWorkforceStatus,
  designation?: string | null,
): LiveWorkforceStatus {
  if (status === 'clocked-in' && isFieldDesignation(designation)) return 'on-duty'
  return status
}

/** One workforce member as the map/list surfaces consume it — derived from
 *  an `EntityRecord` via `uiConfig.map.workforce`'s column bindings
 *  (`views/live-data.ts`'s `deriveLiveWorkforce`). */
export interface LiveWorkforceDatum {
  id: string
  /** `[lng, lat]` — GeoJSON order, same as everything else under `map/`. */
  position: LngLat
  status: LiveWorkforceStatus
  /** Full name — the marker/list/card title. */
  name: string
  /** Employee ID — the list's ID column and the card's identity chip. */
  employeeId?: string
  /** Job title / designation — the list's Type column and the card subtitle. */
  designation?: string
  /** Human-readable location line (plain address, Zone label, or POI name). */
  locationLabel?: string
  /** Which glyph the location line's lead icon resolves to. @default 'plain' */
  locationKind?: LiveLocationKind
  /** Pre-formatted status-since detail (e.g. "since 2 minutes") — the tabbed
   *  popup's status line (2026-08-31 workforce-popup task). */
  statusSince?: string
  /** Arbitrary passthrough (the source `EntityRecord`) — never read here. */
  record?: unknown
}
