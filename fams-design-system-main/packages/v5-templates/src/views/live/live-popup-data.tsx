import type { ComponentType, ReactNode } from 'react'
import { History, MapPin, Mountain, Radio, User } from '@fams/ui-kit/icons'
import { resolveFieldIcon, type EntityConfig, type EntityRecord } from '@fams/v5-composer'
// TYPE-ONLY imports from the heavy map entry — erased at build time (the
// lazy-weight rule live-data.ts documents).
import type { LiveVehiclePopupData } from '../../map/LiveVehiclePopup'
import { ColorsIcon, Thermometer03Icon } from '@fams/ui-kit'
import type {
  VehiclePopupField,
  VehicleStatusTone,
  VehicleWorkforceEntry,
  VehicleTripDateChip,
  VehicleTripRow,
  VehicleTripSummary,
} from '@fams/ui-kit'

/**
 * live-popup-data.tsx — blueprint→vehicle-popup derivation (SPEC P0-2). Reads
 * `uiConfig.map.popup`'s bindings and turns ONE record into the
 * `LiveVehiclePopupData` the popup's Overview grid and Critical Events /
 * Trips / Devices tab bodies consume — the metadata-only path that lets the
 * demo app light up the popup's 4-tab bar without a line of bespoke UI code.
 * An unbound tab column (or a non-array value) simply omits that tab's DATA
 * (the popup still renders the tab with an empty state, UX D28); no `popup`
 * config at all returns `undefined`, leaving the popup's built-in default
 * four-field grid untouched.
 */

/** A named-icon entry — a lucide component or a local inline SVG glyph. */
type PopupIconComponent = ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>

/** The untitled-ui `alert-square` glyph (SOS field, Figma 495:4143) — no
 *  lucide square-alert exists, so a minimal inline equivalent (the icon
 *  vocabulary allows closest-lucide OR small inline SVGs, never a new icon
 *  package). */
function AlertSquareGlyph(props: { className?: string; 'aria-hidden'?: boolean | 'true' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  )
}

/**
 * Popup-LOCAL icon overrides layered over `@fams/v5-composer`'s shared
 * `FIELD_ICON_VOCABULARY` (`resolveFieldIcon`), which already answers to every
 * untitled-ui name the SPEC card uses. Only two reasons to appear here:
 *
 * 1. `alert-square` — SPEC P0-2's SOS glyph is a SQUARE alert; the shared
 *    vocabulary's generic-cell stand-in is `OctagonAlert`, so the card keeps
 *    its own inline square (a small inline SVG, never a new icon package).
 * 2. DEPRECATED pre-2026-08-24 lucide names still emitted by blueprints in
 *    the wild that the shared vocabulary does not carry.
 */
const POPUP_FIELD_ICON: Record<string, PopupIconComponent> = {
  'alert-square': AlertSquareGlyph,
  // ── deprecated aliases (pre-2026-08-24 lucide names) — keep working ──
  user: User,
  'map-pin': MapPin,
  radio: Radio,
  history: History,
  mountain: Mountain,
  // The deprecated lucide names resolve to the REAL Figma glyphs too — an old
  // blueprint must not be the reason the card shows an artist's palette or a
  // plain thermometer (visual #32).
  thermometer: Thermometer03Icon,
  palette: ColorsIcon,
}

function fieldIcon(name: string | undefined): ReactNode {
  const Icon = (name ? POPUP_FIELD_ICON[name] : undefined) ?? resolveFieldIcon(name)
  return Icon ? <Icon aria-hidden="true" /> : undefined
}

/**
 * A plain field's DISPLAY string (QA A13). `format: 'number'` groups the
 * digits with the locale's thousands separator, so an odometer reads
 * `132,800` rather than the raw `132800` Figma never shows. Everything else
 * — and any value that is not a finite number — is stringified verbatim.
 *
 * Grouping is opt-in per field rather than inferred: an "is this numeric?"
 * test would also group years, model numbers and device serials, which are
 * identifiers, not quantities.
 */
export function formatPopupValue(raw: unknown, format: 'number' | undefined): string {
  if (format !== 'number') return String(raw)
  const numeric = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isFinite(numeric) || String(raw).trim() === '') return String(raw)
  return numeric.toLocaleString()
}

function asArray<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) && value.length > 0 ? (value as T[]) : undefined
}

/* ── Trips tab: per-day data (round-1 interaction 16a) ────────────────────
   Round 1 shipped ONE trip list for every date chip, so clicking a chip left
   the card body byte-identical. The blueprint binds a flat `tripsCol`, so the
   per-day sets are derived HERE (the app/template layer) rather than invented
   inside the design-system panel: each chip gets a deterministic slice of the
   record's own trips plus a summary computed from that slice. No string is
   authored — every value comes from the record. */

/** Leading numeric magnitude + its unit suffix ("30 KM" → [30, "KM"]). */
function splitMeasure(value: string): [number, string] | undefined {
  const match = /^\s*([\d.]+)\s*(.*)$/.exec(value)
  if (!match) return undefined
  const magnitude = Number(match[1])
  return Number.isFinite(magnitude) ? [magnitude, match[2].trim()] : undefined
}

/** "2h 43m" → 163 minutes; `undefined` when the string is not a duration. */
function parseDuration(value: string): number | undefined {
  const hours = /(\d+)\s*h/i.exec(value)
  const minutes = /(\d+)\s*m/i.exec(value)
  if (!hours && !minutes) return undefined
  return (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0)
}

function formatDuration(total: number): string {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}

/**
 * The SUMMARY line lower-cases a known distance unit — 495:8937 reads
 * `Distance: 43 km` in the summary while the trip ROWS keep the uppercase
 * `30 KM` the record carries (round-3 visual #19). Only the three units the
 * blueprint can bind are normalised; anything else passes through verbatim
 * rather than being mangled (`NM`, `Nm`, a localized unit...).
 */
function summaryUnit(unit: string): string {
  return /^(km|mi|m)$/i.test(unit) ? unit.toLowerCase() : unit
}

/** Sums a day's rows; `undefined` when the record's strings do not parse (the
 *  panel then falls back to the blueprint's own `tripSummaryCol` value). */
function summariseTrips(rows: VehicleTripRow[]): VehicleTripSummary | undefined {
  if (rows.length === 0) return undefined
  let distance = 0
  let unit = ''
  let duration = 0
  for (const row of rows) {
    const measure = splitMeasure(row.distance)
    const minutes = parseDuration(row.duration)
    if (!measure || minutes === undefined) return undefined
    distance += measure[0]
    unit ||= measure[1]
    duration += minutes
  }
  return {
    distance: unit
      ? `${Math.round(distance * 10) / 10} ${summaryUnit(unit)}`
      : `${Math.round(distance * 10) / 10}`,
    trips: rows.length,
    duration: formatDuration(duration),
  }
}

/**
 * Attach per-day `trips` + `summary` to each date chip, and mark the chip that
 * carries the PICKED date (`calendar`) — the Figma's solid blue chip with the
 * calendar glyph and the white ✕ (visual #15 found it inverted with `Today`).
 *
 * A blueprint may declare `calendar: true` itself; when none does, the chip
 * strip's TRAILING non-`today` chip is the picked date, which is exactly the
 * Figma order (day chips · `Today` · the dated chip).
 */
export function deriveTripDateChips(
  dates: VehicleTripDateChip[] | undefined,
  trips: VehicleTripRow[] | undefined,
): VehicleTripDateChip[] | undefined {
  if (!dates?.length) return dates
  const declared = dates.some((date) => date.calendar)
  const trailing = [...dates].reverse().find((date) => !date.today)
  return dates.map((date, index) => {
    const calendar = date.calendar || (!declared && date === trailing)
    if (!trips?.length) return calendar === date.calendar ? date : { ...date, calendar }
    const rows = Array.from({ length: 1 + (index % trips.length) }, (_, offset) => {
      const trip = trips[(index + offset) % trips.length]
      return { ...trip, id: `${date.id}-${trip.id}` }
    })
    return {
      ...date,
      calendar,
      trips: date.trips ?? rows,
      summary: date.summary ?? summariseTrips(rows),
    }
  })
}

/** True when the blueprint authors a popup contract at all. */
export function hasLivePopup(config: EntityConfig): boolean {
  return Boolean(config.uiConfig.map?.popup)
}

/**
 * Workforce tab (board 16:22182) — the blueprint's `popup.workforce` bindings
 * read off ONE record. Entries whose column is empty are dropped, so a vehicle
 * with no crew assigned falls through to the tab's own empty state rather than
 * showing a grid of em-dashes.
 */
function deriveWorkforce(
  config: { photoCol?: string; entries?: { col: string; label: string; icon?: string }[] } | undefined,
  record: EntityRecord,
): { photo?: ReactNode; entries?: VehicleWorkforceEntry[] } | undefined {
  if (!config) return undefined
  const entries: VehicleWorkforceEntry[] = []
  for (const entry of config.entries ?? []) {
    const raw = record[entry.col]
    if (raw == null || raw === '') continue
    entries.push({ icon: fieldIcon(entry.icon), label: entry.label, value: String(raw) })
  }
  const photoUrl = config.photoCol ? record[config.photoCol] : undefined
  const photo =
    typeof photoUrl === 'string' && photoUrl
      ? <img src={photoUrl} alt="" className="size-full object-cover" />
      : undefined
  if (!photo && entries.length === 0) return undefined
  return { photo, entries }
}

/** SPEC P0-2 coordinate format: 3 decimals, spaced comma — "30.037 , 72.324". */
function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(3)} , ${lng.toFixed(3)}`
}

/**
 * Derive one record's popup data from `uiConfig.map.popup`. Returns
 * `undefined` when the blueprint authors no popup section (the popup then
 * renders its own default Overview grid).
 */
export function deriveLivePopupData(config: EntityConfig, record: EntityRecord): LiveVehiclePopupData | undefined {
  const map = config.uiConfig.map
  const popup = map?.popup
  if (!popup) return undefined
  return derivePopupCore(map, popup, record)
}

/** The shared field/tab bindings both popup blocks author (the workforce
 *  block renames the trip keys to the shift vocabulary — see
 *  `deriveLiveWorkforcePopupData`). */
type PopupBindings = NonNullable<NonNullable<EntityConfig['uiConfig']['map']>['popup']>
type MapBindings = NonNullable<EntityConfig['uiConfig']['map']>

/** True when the blueprint authors a WORKFORCE popup contract
 *  (`uiConfig.map.workforce.popup`, 2026-08-31 workforce-popup task). */
export function hasLiveWorkforcePopup(config: EntityConfig): boolean {
  return Boolean(config.uiConfig.map?.workforce?.popup)
}

/**
 * Derive one WORKFORCE record's popup data from `uiConfig.map.workforce.popup`
 * — the same metadata-only path `deriveLivePopupData` gives vehicles, with
 * the workforce block's `shifts*` keys feeding the Trips-shaped machinery
 * (the Shifts tab is the workforce analogue of Trips). Returns `undefined`
 * when the blueprint authors no workforce popup section.
 */
export function deriveLiveWorkforcePopupData(
  config: EntityConfig,
  record: EntityRecord,
): LiveVehiclePopupData | undefined {
  const map = config.uiConfig.map
  const wf = map?.workforce?.popup
  if (!wf) return undefined
  return derivePopupCore(
    map!,
    {
      fields: wf.fields,
      eventsCol: wf.eventsCol,
      tripsCol: wf.shiftsCol,
      tripDatesCol: wf.shiftDatesCol,
      tripSummaryCol: wf.shiftSummaryCol,
      visibleTabs: wf.visibleTabs,
      maxVisibleTabs: wf.maxVisibleTabs,
    },
    record,
  )
}

function derivePopupCore(
  map: MapBindings,
  popup: PopupBindings,
  record: EntityRecord,
): LiveVehiclePopupData {

  let fields: VehiclePopupField[] | undefined
  if (popup.fields?.length) {
    fields = popup.fields.map((f) => {
      if (f.kind === 'progress') {
        /* 0-100 bar + percentage (board 16:21739). The tone comes from the
           blueprint's own thresholds, highest match first — the design system
           never decides what "low fuel" means for a deployment. */
        const raw = f.col ? Number(record[f.col]) : Number.NaN
        if (!Number.isFinite(raw)) {
          return { icon: fieldIcon(f.icon), label: f.label, value: '—' }
        }
        const percent = Math.max(0, Math.min(100, raw))
        const tone = [...(f.thresholds ?? [])]
          .sort((a, b) => b.min - a.min)
          .find((t) => percent >= t.min)?.tone
        return {
          icon: fieldIcon(f.icon),
          label: f.label,
          value: `${Math.round(percent)}%`,
          percent,
          percentTone: (tone ?? 'success') as VehicleStatusTone,
        }
      }
      if (f.kind === 'tags') {
        /* Array or comma-separated string → the board's tinted chip row. */
        const raw = f.col ? record[f.col] : undefined
        const labels = Array.isArray(raw)
          ? raw.map((t) => String(t))
          : typeof raw === 'string' && raw.trim()
            ? raw.split(',').map((t) => t.trim())
            : []
        if (labels.length === 0) {
          return { icon: fieldIcon(f.icon), label: f.label, value: '—' }
        }
        return {
          icon: fieldIcon(f.icon),
          label: f.label,
          value: labels.join(', '),
          chips: labels.map((label) => ({
            label,
            tone: (f.tagTones?.[label] ?? 'muted') as VehicleStatusTone,
          })),
        }
      }
      if (f.kind === 'coordinates' && map?.latCol && map.lngCol) {
        const lat = Number(record[map.latCol])
        const lng = Number(record[map.lngCol])
        const coords = Number.isFinite(lat) && Number.isFinite(lng) ? formatCoordinates(lat, lng) : '—'
        return {
          icon: fieldIcon(f.icon ?? 'marker-pin-02'),
          label: f.label,
          value: coords,
          // Copies exactly the DISPLAYED string (P0-2 #11).
          onCopy: () => void navigator.clipboard?.writeText(coords),
        }
      }
      const raw = f.col ? record[f.col] : undefined
      const value =
        raw == null || raw === '' ? '—' : `${formatPopupValue(raw, f.format)}${f.suffix ?? ''}`
      return { icon: fieldIcon(f.icon), label: f.label, value }
    })
  }

  const trips = popup.tripsCol ? asArray<VehicleTripRow>(record[popup.tripsCol]) : undefined

  return {
    fields,
    events: popup.eventsCol ? asArray(record[popup.eventsCol]) : undefined,
    trips,
    tripDates: deriveTripDateChips(
      popup.tripDatesCol ? asArray<VehicleTripDateChip>(record[popup.tripDatesCol]) : undefined,
      trips,
    ),
    tripSummary:
      popup.tripSummaryCol && record[popup.tripSummaryCol] && typeof record[popup.tripSummaryCol] === 'object'
        ? (record[popup.tripSummaryCol] as { distance: string; trips: number; duration: string })
        : undefined,
    devices: popup.devicesCol ? asArray(record[popup.devicesCol]) : undefined,
    workforce: deriveWorkforce(popup.workforce, record),
    visibleTabs: popup.visibleTabs,
    maxVisibleTabs: popup.maxVisibleTabs,
  }
}
