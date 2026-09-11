import { VehicleIcon3D } from '@fams/ui-kit'
import { Flag, Frame, MapPin } from '@fams/ui-kit/icons'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
// TYPE-ONLY import from the heavy map entry — erased at build time (the same
// lazy-weight rule `live-data.ts`'s docblock documents); the runtime avatar
// art comes from this module's own light-barrel `workforce-avatar-art.ts`.
import type { LiveVehicleStatus, LiveWorkforceStatus } from '../../map/live-types'
import { deriveLiveMixedRow, liveStatusTone, type LiveMixedRow } from '../live-data'
import { HighlightedText } from './LiveVehicleCell'
import { resolveWorkforceArtStatus, WORKFORCE_AVATAR_ART, type WorkforceStatusKey } from './workforce-avatar-art'

/**
 * The light-barrel avatar art now vendors all five illustrated states
 * (2026-08-31 workforce-popup task: `clocked-in` blue, `not-clocked-in`
 * grey), so every status indexes its own art — this identity map is what
 * keeps the index checked by `tsc` if either union drifts again.
 */
const AVATAR_ART_STATUS: Record<LiveWorkforceStatus, WorkforceStatusKey> = {
  'on-duty': 'on-duty',
  'on-break': 'on-break',
  'in-transit': 'in-transit',
  'clocked-in': 'clocked-in',
  'not-clocked-in': 'not-clocked-in',
}

/**
 * live-mixed-columns.tsx — the mixed "All" view's Name·ID·Type·Location
 * columns (task §2), shared by `LiveListPanel` (hybrid) and
 * `LiveListOnlyView` (list-only) so both live-list surfaces render the
 * identical mixed row when the Workforce/All chips are active. A vehicle row
 * reuses the SAME `VehicleIcon3D` cell art `LiveVehicleCell` (the Vehicle-
 * only column) renders; a workforce row uses the vendored avatar art
 * (`workforce-avatar-art.ts`) — one column, two datum kinds, per the task's
 * "compositions, never new primitives" scope call.
 */

const MIXED_LOCATION_ICON = { plain: MapPin, zone: Frame, poi: Flag } as const
const MIXED_LOCATION_LABEL = { plain: 'Address', zone: 'Zone', poi: 'Point of interest' } as const

/** The four mixed-column keys (a synthetic column set — task §2's mixed
 *  list is NOT the blueprint's own `listcolumns`, it's a fixed shape shown
 *  only while the All/Workforce chip narrows to a mixed or workforce-only
 *  row set). */
export const LIVE_MIXED_COLUMNS = ['title', 'mixedId', 'mixedType', 'mixedLocation'] as const
export type LiveMixedColumn = (typeof LIVE_MIXED_COLUMNS)[number]

export const LIVE_MIXED_COLUMN_LABELS: Record<LiveMixedColumn, string> = {
  title: 'Name',
  mixedId: 'ID',
  mixedType: 'Type',
  mixedLocation: 'Location',
}

/** NAME cell — vehicle 3D-icon identity (same art as the Vehicle-only
 *  column) or the workforce avatar, both search-highlighted. */
export function LiveMixedNameCell({
  config,
  record,
  search = '',
}: {
  config: EntityConfig
  record: EntityRecord
  search?: string
}) {
  const row = deriveLiveMixedRow(config, record)
  if (row.kind === 'workforce') {
    const status = row.status as LiveWorkforceStatus
    return (
      <span className="flex min-h-[1.9375rem] min-w-0 items-center gap-2.5">
        <img
          src={WORKFORCE_AVATAR_ART[resolveWorkforceArtStatus(AVATAR_ART_STATUS[status], row.typeLabel)]}
          width={28}
          height={31}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="block shrink-0"
        />
        <span className="truncate text-caption font-medium text-foreground" title={row.name}>
          <HighlightedText text={row.name} query={search} />
        </span>
      </span>
    )
  }
  const status = row.status as LiveVehicleStatus
  const art = config.uiConfig.map?.vehicleArt ?? 'car'
  return (
    <span className="flex min-h-[1.9375rem] min-w-0 items-center gap-2.5">
      <VehicleIcon3D size="sm" art={art} tone={liveStatusTone(status)} badge="start" className="shrink-0" />
      <span className="truncate text-caption font-medium text-foreground" title={row.name}>
        <HighlightedText text={row.name} query={search} />
      </span>
    </span>
  )
}

/** Plain-text cell for ID/Type — `deriveLiveMixedRow`'s `idLabel`/`typeLabel`. */
export function LiveMixedTextCell({ value }: { value?: string }) {
  const text = value == null || value === '' ? '—' : value
  return (
    <span className="truncate text-caption text-foreground" title={text}>
      {text}
    </span>
  )
}

/** LOCATION cell — a small lead glyph differentiated by `locationKind` (task
 *  §2: "plain location, Zone, or POI — differentiated by a small icon per
 *  kind"), then the human-readable location line. */
export function LiveMixedLocationCell({ row }: { row: LiveMixedRow }) {
  const Icon = MIXED_LOCATION_ICON[row.locationKind]
  const text = row.locationLabel ?? '—'
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">{MIXED_LOCATION_LABEL[row.locationKind]}: </span>
      <span className="truncate text-caption text-foreground" title={text}>
        {text}
      </span>
    </span>
  )
}
