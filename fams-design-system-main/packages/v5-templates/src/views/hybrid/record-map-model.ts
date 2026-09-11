import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
// TYPE-ONLY import from the heavy map entry — erased at build time, so this
// light-barrel module never resolves maplibre/deck.gl (`live-data.ts`'s rule).
import type { LngLat, MapMarkerDatum, MapZoneDatum } from '../../map/MapPanel.types'

/**
 * record-map-model.ts — blueprint → record-geometry derivation for the generic
 * hybrid (list + map) lens. [tier-2 internal]
 *
 * THE DOCTRINE POINT (SPEC §1.3 vs `REFERENCE-MINING.md` §4.2): the two Figma
 * frames — "Only Task Locations" (pins) and "Zone Based Tasks" (polygons) —
 * are ONE lens over two DATA shapes, never two lenses and never an exclusive
 * mode flag. Geometry is a property of each RECORD: a `latCol`/`lngCol` pair
 * gives it a point, a `zoneCol` value naming one of `uiConfig.map.zones` gives
 * it a polygon, and a record carrying both contributes both, in the same
 * render, simultaneously. A blueprint whose records only carry coordinates
 * renders frame A; one whose records only carry zone ids renders frame B — for
 * free, with no switch anywhere in the code. That is what stops this from
 * silently becoming a second view kind (PLATFORM-MODEL.md's fixed 9 types:
 * compositions, never new primitives).
 */

/** One record's map presence — its colour key plus whatever geometry it has. */
export interface RecordGeometry {
  id: string
  record: EntityRecord
  /** Human handle for accessible names — `uniqueidentifier`, else title, else id. */
  label: string
  /** The raw `colorBy` value, or `undefined` when the record has none. */
  colorKey?: string
  /** The colour this record paints with (token or hex — DOM-safe, layer-resolved downstream). */
  color?: string
  /** Point geometry (`[lng, lat]`), when the record binds coordinates. */
  point?: LngLat
  /** Polygon ring (`[lng, lat]` points), when the record's `zoneCol` names a zone. */
  polygon?: LngLat[]
}

/** A legend row: one `colorBy` value, its label, colour and TOTAL. */
export interface RecordMapLegendEntry {
  key: string
  label: string
  color?: string
}

export interface RecordMapConfig {
  colorCol?: string
  legendTitle: string
  filterable: boolean
  fillOpacity: number
  radius: number
  entries: RecordMapLegendEntry[]
  fallbackColor?: string
}

/**
 * True when the module's blueprint declares its RECORDS as the map's subjects
 * (`uiConfig.map.records`) — the switch that gives the `hybrid` view kind the
 * generic list+record-map body instead of the fleet-flavoured live hybrid,
 * whose remaining `*Col` bindings are vehicle telemetry.
 */
export function hasRecordMap(config: EntityConfig): boolean {
  return Boolean(config.uiConfig.map?.records)
}

const DEFAULT_FILL_OPACITY = 0.12
const DEFAULT_RADIUS = 7

/** The colour-key axis, in authored legend order. Never derived from a name. */
export function recordMapConfig(config: EntityConfig): RecordMapConfig {
  const map = config.uiConfig.map
  const records = map?.records
  const colorBy = records?.colorBy
  const field = colorBy ? config.systemcolumns.find((c) => c.col === colorBy.col) : undefined
  // An authored `values` list wins (it carries the colours); otherwise the
  // column's own `listValues` still give a legend — colourless, but a real
  // key + filter, which is better than no legend at all.
  const entries: RecordMapLegendEntry[] = colorBy
    ? (colorBy.values?.map((v) => ({ key: v.value, label: v.label ?? v.value, color: v.color })) ??
      (field?.listValues ?? []).map((v) => ({ key: v, label: v })))
    : []
  return {
    colorCol: colorBy?.col,
    legendTitle: colorBy?.legendTitle ?? field?.name ?? 'Legend',
    filterable: colorBy?.filterable !== false,
    fillOpacity: records?.fillOpacity ?? DEFAULT_FILL_OPACITY,
    radius: records?.radius ?? DEFAULT_RADIUS,
    entries,
    fallbackColor: colorBy?.fallbackColor,
  }
}

function num(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

/** A record's human handle — never a hardcoded column. */
export function recordLabel(record: EntityRecord): string {
  const id = record.uniqueidentifier
  if (typeof id === 'string' && id) return id
  return record.title ?? record.id
}

/**
 * Records → per-record geometry. Records with NO geometry at all are still
 * returned (UX J.61: an ungeocoded record must not vanish from the product
 * because it lacks coordinates) — the list renders every entry, the map only
 * the ones that have somewhere to go.
 */
export function deriveRecordGeometry(config: EntityConfig, records: EntityRecord[]): RecordGeometry[] {
  const map = config.uiConfig.map
  const meta = recordMapConfig(config)
  const colorOf = new Map(meta.entries.map((e) => [e.key, e.color]))
  const zones = new Map((map?.zones ?? []).map((z) => [z.id, z]))
  return records.map((record) => {
    const lat = map?.latCol ? num(record[map.latCol]) : undefined
    const lng = map?.lngCol ? num(record[map.lngCol]) : undefined
    const zoneRaw = map?.zoneCol ? record[map.zoneCol] : undefined
    const zone = zoneRaw != null && zoneRaw !== '' ? zones.get(String(zoneRaw)) : undefined
    const rawKey = meta.colorCol ? record[meta.colorCol] : undefined
    const colorKey = rawKey == null || rawKey === '' ? undefined : String(rawKey)
    return {
      id: record.id,
      record,
      label: recordLabel(record),
      colorKey,
      // A record's own colour wins over the zone's authored one — the legend
      // is the colour key, so a polygon that ignored it would be a lie.
      color: (colorKey !== undefined ? colorOf.get(colorKey) : undefined) ?? meta.fallbackColor ?? zone?.color,
      point: lat !== undefined && lng !== undefined ? [lng, lat] : undefined,
      polygon: zone ? (zone.points as LngLat[]) : undefined,
    }
  })
}

/** TOTALS per colour-key value — never filtered counts (UX E.29). */
export function colorKeyTotals(items: RecordGeometry[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const item of items) {
    if (item.colorKey === undefined) continue
    totals.set(item.colorKey, (totals.get(item.colorKey) ?? 0) + 1)
  }
  return totals
}

/**
 * The records the MAP paints: legend-visible, not individually eye-hidden.
 * Legend filtering only ever removes records whose key is a legend entry — a
 * record with no key (or an unlisted one) has no legend row to be hidden by,
 * so it stays visible rather than disappearing into an unreachable state.
 */
export function visibleOnMap(
  items: RecordGeometry[],
  options: { visibleKeys: string[]; keyed: Set<string>; hiddenIds: Set<string>; filterable: boolean },
): RecordGeometry[] {
  return items.filter((item) => {
    if (options.hiddenIds.has(item.id)) return false
    if (!options.filterable) return true
    if (item.colorKey === undefined || !options.keyed.has(item.colorKey)) return true
    return options.visibleKeys.includes(item.colorKey)
  })
}

/**
 * De-collides points sharing (near-)identical coordinates by fanning each
 * group onto an even, deterministic ring — stolen outright from
 * `REFERENCE-MINING.md` §4.1's `IncidentMap` cell-grouping, because records
 * attached to the same zone share that zone's centroid and would otherwise
 * stack into one unclickable pile. Deterministic: same input, same output, so
 * a pin never wanders between renders.
 */
const CELL_PRECISION = 2
const FAN_RADIUS_DEG = 0.004

export function fanOutCollisions(points: Map<string, LngLat>): Map<string, LngLat> {
  const cells = new Map<string, string[]>()
  for (const [id, [lng, lat]] of points) {
    const cell = `${lng.toFixed(CELL_PRECISION)},${lat.toFixed(CELL_PRECISION)}`
    const bucket = cells.get(cell)
    if (bucket) bucket.push(id)
    else cells.set(cell, [id])
  }
  const out = new Map<string, LngLat>()
  for (const ids of cells.values()) {
    if (ids.length === 1) {
      out.set(ids[0], points.get(ids[0])!)
      continue
    }
    ids.forEach((id, index) => {
      const [lng, lat] = points.get(id)!
      const angle = (index / ids.length) * 2 * Math.PI
      out.set(id, [lng + Math.cos(angle) * FAN_RADIUS_DEG, lat + Math.sin(angle) * FAN_RADIUS_DEG])
    })
  }
  return out
}

/** Geometry → `MapPanel` markers (points) and zones (polygons), both at once. */
export function toMapData(
  items: RecordGeometry[],
  meta: RecordMapConfig,
  selectedId?: string | null,
): { markers: MapMarkerDatum[]; zones: MapZoneDatum[] } {
  const raw = new Map<string, LngLat>()
  for (const item of items) if (item.point) raw.set(item.id, item.point)
  const fanned = fanOutCollisions(raw)
  const markers: MapMarkerDatum[] = []
  const zones: MapZoneDatum[] = []
  for (const item of items) {
    const selected = selectedId === item.id
    if (item.point) {
      markers.push({
        id: item.id,
        position: fanned.get(item.id) ?? item.point,
        color: item.color,
        radius: selected ? meta.radius + 4 : meta.radius,
        label: item.label,
        // Passthrough (never read by MapPanel itself) — lets a caller's own
        // `renderMarker` (e.g. a `vehicleArt`-keyed DOM pin) read the full
        // record/colour-key without a second id→record lookup.
        data: item,
      })
    }
    if (item.polygon) {
      zones.push({
        id: item.id,
        points: item.polygon,
        color: item.color,
        label: item.label,
        fillOpacity: selected ? Math.min(meta.fillOpacity * 2, 0.5) : meta.fillOpacity,
      })
    }
  }
  return { markers, zones }
}

/** A polygon's centroid — the camera target for a zone-only record. */
export function polygonCentroid(points: LngLat[]): LngLat | undefined {
  if (points.length === 0) return undefined
  let lng = 0
  let lat = 0
  for (const [x, y] of points) {
    lng += x
    lat += y
  }
  return [lng / points.length, lat / points.length]
}

const EARTH_RADIUS_KM = 6371

/** Great-circle distance in km — the measure tool's readout. */
export function haversineKm(a: LngLat, b: LngLat): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Cumulative length of a measured path in km. */
export function pathLengthKm(points: LngLat[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1], points[i])
  return total
}

/** Where the camera should go for a record — its pin, else its zone's centre. */
export function focusOf(item: RecordGeometry | undefined): LngLat | null {
  if (!item) return null
  if (item.point) return item.point
  return item.polygon ? (polygonCentroid(item.polygon) ?? null) : null
}

/**
 * "Sync With Map" narrowing (Live-Monitoring parity, 2026-09-01): the record
 * items whose anchor position sits inside the camera's `[west, south, east,
 * north]` bbox. The anchor is `focusOf` — the point, else the polygon
 * centroid — so a zone-only record syncs by the same position the camera
 * itself eases to. Records with NO geometry are kept (the list never hides a
 * record just because it cannot be mapped; the ungeocoded notice owns that
 * story), mirroring `LiveHybridView`'s viewport-scoping contract.
 */
export function itemsInBbox(items: RecordGeometry[], bbox: [number, number, number, number]): RecordGeometry[] {
  const [west, south, east, north] = bbox
  return items.filter((item) => {
    const anchor = focusOf(item)
    if (!anchor) return true
    const [lng, lat] = anchor
    return lng >= west && lng <= east && lat >= south && lat <= north
  })
}
