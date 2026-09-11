import { VehicleIcon3D, type VehicleStatusTone } from '@fams/ui-kit'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { liveStatusTone, parseLiveStatus } from '../live-data'
import { matchSegments } from './live-filter-model'

/**
 * LiveVehicleCell — the VEHICLE column's row anatomy (SPEC v2 P0-1.1 /
 * §2.2), shared by BOTH live list surfaces so the hybrid panel and the
 * list-only table render one identical cell:
 *
 * - the 3D isometric vehicle art (`VehicleIcon3D size="sm"` = the Figma
 *   39×29 "Car (List)" box) with the 15×15 status-dot badge overlapping its
 *   bottom-START corner, tinted by the record's live status exactly as the
 *   map markers are — never a photograph (P0-1 bans them module-wide). The
 *   `badge="start"` request below is only honored by `VehicleIcon3D` for a
 *   mobility-capable `art` (car/tanker) — a stationary-asset art like
 *   `'weather-station'` (A24) never shows this dot, so this cell stays
 *   correct for both moving-fleet AND stationary-asset modules without a
 *   per-module special-case here,
 * - the record's PLATE (`uiConfig.map.plateCol`, e.g. "849 993") — the SAME
 *   identity the marker capsule and the popup header's tag chip show (A22:
 *   one plate identity, everywhere). This REPLACES the pre-A22 contract,
 *   which rendered the internal `uniqueidentifier` here ("Z-7764") — that id
 *   is never user-visible now; a record whose plate isn't bound falls back
 *   to `uniqueidentifier` then `title` so the cell is never blank,
 * - with the active search query's matched substring highlighted behind the
 *   unchanged near-black text (551:18786 + UX A9).
 */
export interface LiveVehicleCellProps {
  config: EntityConfig
  record: EntityRecord
  /** Active list search — highlights its match inside the plate. */
  search?: string
}

/** Search-highlight text — matched substrings get the yellow/warning wash
 *  BEHIND the unchanged near-black text (SPEC 551:18786 + UX A9: never
 *  recolor the id itself at 12px). */
export function HighlightedText({ text, query }: { text: string; query: string }) {
  const segments = matchSegments(text, query)
  return (
    <>
      {segments.map((seg, i) =>
        seg.match ? (
          // Round-1 visual #38: the highlight is the FULL warning-500 amber
          // (#F79009 ≈ Figma's #F59E0B), not a 40% wash of it (#FCD39D).
          <mark key={i} className="rounded-xs bg-warning font-semibold text-foreground">
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  )
}

/** The record's rendered vehicle identity — the bound plate column first
 *  (A22: the one identity shown everywhere), then `uniqueidentifier`, then
 *  `title`, so the cell is never blank for a blueprint with no plate bound. */
export function liveVehicleId(record: EntityRecord, plateCol?: string): string {
  const plate = plateCol ? record[plateCol] : undefined
  if (plate != null && plate !== '') return String(plate)
  const uid = record.uniqueidentifier
  if (uid != null && uid !== '') return String(uid)
  const title = record.title
  return title != null && title !== '' ? String(title) : '—'
}

/**
 * A25: the ENTITY status vocabulary (Active/Inactive) is a separate closed
 * set from the vehicle MOBILITY vocabulary (moving/idling/stopped) that
 * `parseLiveStatus` owns — recognized here ONLY for the badge dot's tone
 * (never the popup/marker mobility LABEL, which stays untouched) so a
 * stationary-asset module's badge still tints by its own status instead of
 * always reading the mobility-vocabulary fallback (muted/grey).
 */
function entityStatusTone(raw: unknown): VehicleStatusTone | undefined {
  const v = String(raw ?? '').trim().toLowerCase()
  if (v === 'active') return 'success'
  if (v === 'inactive') return 'muted'
  return undefined
}

export function LiveVehicleCell({ config, record, search = '' }: LiveVehicleCellProps) {
  const statusCol = config.uiConfig.map?.statusCol
  const rawStatus = statusCol ? record[statusCol] : undefined
  const tone = entityStatusTone(rawStatus) ?? liveStatusTone(parseLiveStatus(rawStatus))
  const plateCol = config.uiConfig.map?.plateCol
  const id = liveVehicleId(record, plateCol)
  const art = config.uiConfig.map?.vehicleArt ?? 'car'
  // A24: a module with no plate binding (stationary-asset domains like
  // Weather Stations) shows its descriptive TITLE as the primary line — the
  // human name (e.g. "Qatar University") — with the record's own short id
  // (e.g. "RSN-01") as a secondary caption underneath, so the code stays
  // visible without displacing the name. Plate-bound modules (vehicles,
  // A22) are unaffected — one line, the plate, exactly as before.
  const title = record.title != null && record.title !== '' ? String(record.title) : undefined
  const uid = record.uniqueidentifier != null && record.uniqueidentifier !== '' ? String(record.uniqueidentifier) : undefined
  const showSecondaryId = !plateCol && !!title && !!uid && uid !== title
  const primary = showSecondaryId ? title! : id
  return (
    <span className="flex min-h-[1.9375rem] min-w-0 items-center gap-2.5">
      <VehicleIcon3D size="sm" art={art} tone={tone} badge="start" className="shrink-0" />
      <span className="flex min-w-0 flex-col justify-center">
        <span className="truncate text-caption font-medium text-foreground" title={primary}>
          <HighlightedText text={primary} query={search} />
        </span>
        {showSecondaryId ? (
          // gray-500 (not gray-400/AA's 1.75:1 measured contrast) — a
          // deliberate readability-over-strict-Figma-parity call (QA audit
          // decision), applied HERE in the one shared cell every list
          // surface's secondary caption renders through, not as a per-call
          // inline override.
          <span className="truncate text-[0.625rem] leading-none text-gray-500" title={uid}>
            {uid}
          </span>
        ) : null}
      </span>
    </span>
  )
}

LiveVehicleCell.displayName = 'LiveVehicleCell'
