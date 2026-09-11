import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import type { VehicleStatusTone } from '@fams/ui-kit'
// TYPE-ONLY imports from the heavy map entry — erased at build time, so the
// light barrel never resolves `map/`'s maplibre/deck.gl chain (the same
// lazy-weight rule `LocationMapSectionSlot.tsx` documents).
import type {
  LiveLocationKind,
  LivePoiDatum,
  LiveVehicleDatum,
  LiveVehicleStatus,
  LiveWorkforceDatum,
  LiveWorkforceStatus,
  LiveZoneDatum,
} from '../map/live-types'

/**
 * live-data.ts — blueprint→live-vehicle derivation for the map-bearing view
 * bodies (`MapView`, `LiveHybridView`). Reads `uiConfig.map`'s column
 * bindings (`latCol`/`lngCol` + the live-monitoring `*Col` vocabulary — see
 * `@fams/v5-composer`'s `UiConfig['map']`) and maps each record onto the
 * `LiveVehicleDatum` shape the `./map` entry's `LiveMapView` consumes.
 */

/** True when the module's blueprint binds records to map positions — the
 *  switch that gives `map`/`hybrid` view kinds a live map body. */
export function hasLiveMap(config: EntityConfig): boolean {
  const map = config.uiConfig.map
  return Boolean(map?.latCol && map?.lngCol)
}

const KNOWN_STATUS: ReadonlySet<string> = new Set(['moving', 'idling', 'stopped'])

/** Case-insensitive mobility-status parse; anything unknown (or unbound)
 *  reads as non-reporting — spec §2's grey state. */
export function parseLiveStatus(value: unknown): LiveVehicleStatus {
  const normalized = String(value ?? '').trim().toLowerCase()
  return (KNOWN_STATUS.has(normalized) ? normalized : 'non-reporting') as LiveVehicleStatus
}

/** Idling floor: below this a reporting vehicle reads as stopped, not moving. */
const IDLING_SPEED_KMH = 1

/**
 * Mobility status for a record. An explicit, RECOGNIZED `statusCol` value
 * always wins. Otherwise the reading is derived from telemetry: a finite
 * speed means the vehicle IS reporting, so it can never read "non-reporting"
 * (round-1 visual P2: the popup said "Non-Reporting" beside "38 km/h" and
 * every pin rendered the neutral grey, because the bound column held a
 * lifecycle status the mobility vocabulary doesn't know). Only a record with
 * no usable speed at all stays non-reporting.
 */
export function resolveLiveStatus(rawStatus: unknown, speedKmh: number | undefined): LiveVehicleStatus {
  const parsed = parseLiveStatus(rawStatus)
  if (parsed !== 'non-reporting') return parsed
  if (speedKmh === undefined) return 'non-reporting'
  if (speedKmh >= IDLING_SPEED_KMH) return 'moving'
  return 'stopped'
}

/**
 * Status → DS tone: Moving=success · Idling=warning · Stopped=error ·
 * Non-Reporting=muted (SPEC v2 §1 status colors). Mirrors the heavy map
 * entry's `LIVE_STATUS_TONE` (`map/live-types.ts`) — duplicated as a light-
 * barrel VALUE on purpose: this module may only TYPE-import from `map/`
 * (lazy-weight rule above), and the list surfaces need the tone at runtime
 * for the `VehicleIcon3D` badge without pulling the map chain.
 */
const STATUS_TONE: Record<LiveVehicleStatus, VehicleStatusTone> = {
  moving: 'success',
  idling: 'warning',
  stopped: 'error',
  'non-reporting': 'muted',
}

export function liveStatusTone(status: LiveVehicleStatus): VehicleStatusTone {
  return STATUS_TONE[status]
}

function num(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function str(record: EntityRecord, col: string | undefined): string | undefined {
  if (!col) return undefined
  const value = record[col]
  return value == null || value === '' ? undefined : String(value)
}

/** The blueprint's zones (`uiConfig.map.zones`) as the zones drawer + map
 *  consume them — `points` are `[lng, lat]` per the map entry's convention. */
export function deriveLiveZones(config: EntityConfig): LiveZoneDatum[] {
  return (config.uiConfig.map?.zones ?? []) as LiveZoneDatum[]
}

/** The blueprint's POIs (`uiConfig.map.pois`) — the POI drawer's rows. */
export function deriveLivePois(config: EntityConfig): LivePoiDatum[] {
  return (config.uiConfig.map?.pois ?? []) as LivePoiDatum[]
}

/** Records → live vehicles per `uiConfig.map`'s bindings. Records without a
 *  finite lat/lng pair are dropped (they have no place on the map). A module
 *  that binds `uiConfig.map.workforce.kindCol` (2026-08-31 enhancement)
 *  shares its `records` array with workforce rows — those are skipped here
 *  (they have their own `deriveLiveWorkforce`) rather than mis-derived as
 *  vehicles with an unparseable status. A module with no `workforce` binding
 *  is completely unaffected — every record still derives exactly as before. */
export function deriveLiveVehicles(config: EntityConfig, records: EntityRecord[]): LiveVehicleDatum[] {
  const map = config.uiConfig.map
  if (!map?.latCol || !map.lngCol) return []
  const kindCol = map.workforce?.kindCol
  const vehicles: LiveVehicleDatum[] = []
  for (const record of records) {
    if (kindCol && String(record[kindCol] ?? '').trim().toLowerCase() === 'workforce') continue
    const lat = num(record[map.latCol])
    const lng = num(record[map.lngCol])
    if (lat === undefined || lng === undefined) continue
    const speedKmh = map.speedCol ? num(record[map.speedCol]) : undefined
    const name = typeof record.title === 'string' ? record.title : undefined
    // Popup TITLE is the model (Figma 16:21392 "Mitsubishi X6734"), never the
    // asset's descriptive title or its internal id (A22). `make`+`model`
    // columns win when bound; unbound blueprints fall back to `title` so a
    // vehicle without either still gets a header.
    const make = str(record, map.makeCol)
    const modelCol = str(record, map.modelCol)
    const model = make && modelCol ? `${make} ${modelCol}` : modelCol ?? name
    vehicles.push({
      id: record.id,
      position: [lng, lat],
      status: resolveLiveStatus(map.statusCol ? record[map.statusCol] : undefined, speedKmh),
      name,
      model,
      plate: str(record, map.plateCol),
      speedKmh,
      dwell: str(record, map.dwellCol),
      heading: map.headingCol ? num(record[map.headingCol]) : undefined,
      driver: str(record, map.driverCol),
      photoUrl: str(record, map.photoCol),
      location: str(record, map.locationCol),
      statusSince: str(record, map.statusSinceCol),
      fillLevel: map.fillLevelCol ? num(record[map.fillLevelCol]) : undefined,
      record,
    })
  }
  return vehicles
}

/* ── Workforce (2026-08-31 "add WORKFORCE alongside vehicles" enhancement) ──
 *
 * A single live-monitoring module's `records` can now carry BOTH vehicle and
 * workforce rows, told apart by `uiConfig.map.workforce.kindCol` (default
 * discriminator value `'workforce'`; every other/absent value — including
 * every record in a blueprint that never binds this at all — reads as a
 * vehicle, so the 18-tanker UCCP seed needs zero changes for the Vehicle
 * chip to render byte-identically to before this enhancement).
 */

/** True when the module's blueprint binds workforce columns — the switch
 *  that turns on the Workforce/All chips and the mixed list columns. */
export function hasLiveWorkforce(config: EntityConfig): boolean {
  return Boolean(config.uiConfig.map?.workforce?.kindCol)
}

/** Case-insensitive workforce-status parse; unknown/unbound reads as
 *  on-duty. Light-barrel VALUE duplicate of `map/live-types.ts`'s
 *  `parseLiveWorkforceStatus` — see `parseLiveStatus`'s docblock above for
 *  why this module may only TYPE-import from `map/`. */
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

/** Status → DS tone (on-duty=success · on-break=warning · in-transit=muted,
 *  a documented simplification — see `map/live-types.ts`). Light-barrel
 *  VALUE duplicate, same reasoning as `liveStatusTone` above. */
const WORKFORCE_STATUS_TONE: Record<LiveWorkforceStatus, VehicleStatusTone> = {
  'on-duty': 'success',
  'on-break': 'warning',
  'in-transit': 'muted',
  // 2026-09-01 build-gate sync: the canonical map/live-types.ts gained the
  // clock-in pair — mirrored here (same tones/aliases) per this constant's
  // own light-barrel-duplicate contract above.
  'clocked-in': 'muted',
  'not-clocked-in': 'muted',
}

export function liveWorkforceStatusTone(status: LiveWorkforceStatus): VehicleStatusTone {
  return WORKFORCE_STATUS_TONE[status]
}

/** Case-insensitive location-kind parse; unknown/unbound reads as plain. */
export function parseLiveLocationKind(value: unknown): LiveLocationKind {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'zone') return 'zone'
  if (normalized === 'poi') return 'poi'
  return 'plain'
}

/**
 * Splits a module's raw records into vehicle rows and workforce rows per
 * `uiConfig.map.workforce.kindCol` (a record's value there matching
 * `'workforce'`, case-insensitively, is workforce; everything else —
 * including every record when the module never binds the column at all —
 * is a vehicle). This is the ONE place the discriminator is read; every
 * other surface (chips filter, mixed list, map markers) works off these two
 * arrays rather than re-testing the raw column.
 */
export function splitLiveRecordsByKind(
  config: EntityConfig,
  records: EntityRecord[],
): { vehicles: EntityRecord[]; workforce: EntityRecord[] } {
  const kindCol = config.uiConfig.map?.workforce?.kindCol
  if (!kindCol) return { vehicles: records, workforce: [] }
  const vehicles: EntityRecord[] = []
  const workforce: EntityRecord[] = []
  for (const record of records) {
    const raw = String(record[kindCol] ?? '').trim().toLowerCase()
    ;(raw === 'workforce' ? workforce : vehicles).push(record)
  }
  return { vehicles, workforce }
}

/** Live Monitoring's All/Vehicle/Workforce chip value (`LiveKindChips`). */
export type LiveEntityKindFilter = 'all' | 'vehicle' | 'workforce'

/** Applies the chip selection: `'all'` returns `records` untouched, otherwise
 *  the matching half of `splitLiveRecordsByKind`. The ONE place the chip's
 *  filtering logic lives — `LiveHybridView`/`LiveListOnlyView` narrow their
 *  incoming `records` through this before anything else in the existing
 *  pipeline (search, saved filters, map derivation, list rendering) runs, so
 *  every downstream surface stays kind-agnostic and automatically correct. */
export function filterLiveRecordsByKind(
  config: EntityConfig,
  records: EntityRecord[],
  filter: LiveEntityKindFilter,
): EntityRecord[] {
  if (filter === 'all') return records
  const split = splitLiveRecordsByKind(config, records)
  return filter === 'vehicle' ? split.vehicles : split.workforce
}

/**
 * One row of the mixed "All" list (task §2): Name · ID (Employee ID or
 * Vehicle Plate Number) · Type (Vehicle Type or Employee Designation) ·
 * Location (plain/Zone/POI, differentiated by `locationKind`).
 */
export interface LiveMixedRow {
  id: string
  kind: 'vehicle' | 'workforce'
  name: string
  status: LiveVehicleStatus | LiveWorkforceStatus
  idLabel?: string
  typeLabel?: string
  locationLabel?: string
  locationKind: LiveLocationKind
}

/** One record (either kind) → its mixed-list row, per `uiConfig.map`'s
 *  vehicle bindings (`plateCol`/`vehicleTypeCol`/`locationCol`) and
 *  `uiConfig.map.workforce`'s workforce bindings. */
export function deriveLiveMixedRow(config: EntityConfig, record: EntityRecord): LiveMixedRow {
  const map = config.uiConfig.map
  const kindCol = map?.workforce?.kindCol
  const isWorkforce = Boolean(kindCol && String(record[kindCol!] ?? '').trim().toLowerCase() === 'workforce')
  const name = typeof record.title === 'string' && record.title !== '' ? record.title : String(record.id)
  if (isWorkforce) {
    const workforce = map!.workforce!
    return {
      id: record.id,
      kind: 'workforce',
      name,
      status: parseLiveWorkforceStatus(workforce.statusCol ? record[workforce.statusCol] : undefined),
      idLabel: str(record, workforce.employeeIdCol),
      typeLabel: str(record, workforce.designationCol),
      locationLabel: str(record, workforce.locationLabelCol),
      locationKind: parseLiveLocationKind(workforce.locationKindCol ? record[workforce.locationKindCol] : undefined),
    }
  }
  const speedKmh = map?.speedCol ? num(record[map.speedCol]) : undefined
  return {
    id: record.id,
    kind: 'vehicle',
    name,
    status: resolveLiveStatus(map?.statusCol ? record[map.statusCol] : undefined, speedKmh),
    idLabel: str(record, map?.plateCol),
    typeLabel: str(record, map?.vehicleTypeCol),
    locationLabel: str(record, map?.locationCol),
    // A vehicle's location is always a plain address in this module — the
    // Zone/POI location-kind distinction is a workforce-only concept
    // (task §6's seed data), so every vehicle row shows the plain-address
    // glyph.
    locationKind: 'plain',
  }
}

/** Workforce records → `LiveWorkforceDatum[]` per `uiConfig.map`'s shared
 *  `latCol`/`lngCol` position bindings and `uiConfig.map.workforce`'s
 *  identity/status/location bindings. Records without a finite lat/lng pair
 *  are dropped, same rule `deriveLiveVehicles` follows. */
export function deriveLiveWorkforce(config: EntityConfig, records: EntityRecord[]): LiveWorkforceDatum[] {
  const map = config.uiConfig.map
  const workforce = map?.workforce
  if (!map?.latCol || !map.lngCol || !workforce) return []
  const out: LiveWorkforceDatum[] = []
  for (const record of records) {
    /* Only records the discriminator marks as workforce derive here — the
       mirror of `deriveLiveVehicles`' skip, so a caller handing the module's
       FULL mixed records array (the standalone Map View path) never gets a
       vehicle row re-derived as a defaulted on-duty member (2026-08-31
       workforce-popup task fix). */
    if (String(record[workforce.kindCol] ?? '').trim().toLowerCase() !== 'workforce') continue
    const lat = num(record[map.latCol])
    const lng = num(record[map.lngCol])
    if (lat === undefined || lng === undefined) continue
    const name = typeof record.title === 'string' ? record.title : str(record, workforce.employeeIdCol) ?? '—'
    out.push({
      id: record.id,
      position: [lng, lat],
      status: parseLiveWorkforceStatus(workforce.statusCol ? record[workforce.statusCol] : undefined),
      name,
      employeeId: str(record, workforce.employeeIdCol),
      designation: str(record, workforce.designationCol),
      locationLabel: str(record, workforce.locationLabelCol),
      locationKind: parseLiveLocationKind(workforce.locationKindCol ? record[workforce.locationKindCol] : undefined),
      statusSince: str(record, map.statusSinceCol),
      record,
    })
  }
  return out
}
