import type { ReactNode } from 'react'
import { AssetGlyph } from '@ds/icons'
import { cn } from '@fams/design-system'
import {
  MapPin, Frame, Flag,
  AlertTriangle as ActivityAlertIcon, Route as RouteIcon, Gauge as SpeedIcon,
  Navigation as NavigationIcon, Pause as PauseIcon, Square as SquareIcon,
} from 'lucide-react'
import type { InspectorRow, VehicleRowData, DutyStatus, VehicleActivity } from './gisTabsData'

/* ── Live Monitoring's ACTUAL list tables, extracted VERBATIM ───────────────
 * PROVENANCE (2026-09-01, user directive: "i told you to use actual list/
 * table with columns"): the Inspectors/Vehicles tabs used to render CARD
 * rows (`gisTabCards.tsx`'s `InspectorRowCell`/`VehicleRowCell` — a bordered
 * icon-tile + two-line text block). Live Monitoring renders neither: it
 * renders a real `DataTable` with column headers. This module reproduces
 * that table, anatomy for anatomy, from LM's own source:
 *
 *  - Table shell + rhythm: `fams-design-system/packages/v5-templates/src/
 *    views/live/LiveListPanel.tsx`'s `className` overrides — 32px header row
 *    (`[&_thead_th]:h-8`) with 10px/bold/uppercase/0.08em grey-400/70
 *    captions, sticky on `bg-card`; 48px body rows (`[&_tbody_tr]:h-12`,
 *    `LIVE_ROW_HEIGHT_PX = 48`); `hover:bg-muted/50`; selected row =
 *    `bg-primary/10` (the Figma blue tint, NOT the table default's neutral
 *    wash). Rows are focusable and click-to-select, exactly as
 *    `hasFocusableRows` + `onRowClick` make them in LM.
 *  - Inspectors columns: `live-mixed-columns.tsx`'s `LIVE_MIXED_COLUMNS` /
 *    `LIVE_MIXED_COLUMN_LABELS` — the mixed Workforce/All view's fixed
 *    NAME · ID · TYPE · LOCATION shape — with `LiveMixedNameCell`'s
 *    workforce branch (28×31 avatar art + name, `min-h-[1.9375rem]`,
 *    `gap-2.5`) and `LiveMixedLocationCell`'s lead glyph per location kind.
 *  - The avatar art is LM's own `workforce-avatar-art.ts` payload, decoded
 *    from its five base64 data URIs into `/assets/workforce/*.svg` (same
 *    41×45 source exports, byte-identical). `resolveWorkforceArtStatus`
 *    (commit 5d6e426) is copied verbatim below: a FIELD role that is merely
 *    `clocked-in` still gets the GREEN field coin; the blue office coin is
 *    reserved for office staff.
 *  - Vehicles columns: LM's own blueprint set for this tenant
 *    (`tenants/uccp/modules/live-monitoring/blueprint.json`
 *    `uiConfig.hybrid.listColumns` = `fld_title` · `fld_filllevel` ·
 *    `fld_activity` · `fld_speed`, whose labels are VEHICLE · FILL LEVEL ·
 *    ACTIVITY OVERVIEW · SPEED), rendered through LM's own cells:
 *    `LiveVehicleCell` (3D tanker art in a 39×29 box + the 15px status coin
 *    overlapping bottom-start, `insetInlineStart:-2 / insetBlockEnd:-2`,
 *    `ring-2 ring-white` — `VehicleIcon3D`'s `size="sm"` geometry — then the
 *    plate at 12px), `FillLevelCell` (72×8 track = `h-2 w-18`, `bg-gray-50`,
 *    `min-w-2` floor, 6px gap, then the percentage at 10px semibold
 *    grey-600), and `ReadActivityOverview` (`v5-composer/src/fields/
 *    renderers.tsx` — `gap-1` between groups, `gap-0.5` inside one, a 12px
 *    glyph then the count at 12px medium, each pair carrying its metric name
 *    as `title` + an `sr-only` label).
 * Only the DATA source is adapted (`gisTabsData.ts`, itself already a
 * verbatim mirror of `live-monitoring.seed.json`).
 */

/* ── table shell (LiveListPanel's DataTable overrides) ─────────────────── */

export function LiveTable({
  ariaLabel, head, children,
}: {
  ariaLabel: string
  head: ReactNode
  children: ReactNode
}) {
  return (
    // `w-max min-w-full` + per-column min widths, not `table-fixed`: the
    // column set overflows the panel by design and scrolls INSIDE the list's
    // own scroll region (LM UX-1 / AC-4 — columns keep their min-widths and
    // never crush). `liveColumnMinWidth` supplies the exact rem values.
    <table
      className="w-max min-w-full border-collapse"
      aria-label={ariaLabel}
      data-slot="live-table"
    >
      {/* 32px header row, sticky on bg-card, grey-400/70 captions at
          10px/bold/uppercase/0.08em (LiveListPanel visual #36, #40). */}
      <thead className="sticky top-0 z-10 bg-card">
        <tr className="border-b border-border">{head}</tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

export function LiveTh({ children, minWidth, className }: { children: ReactNode; minWidth: string; className?: string }) {
  return (
    <th
      scope="col"
      style={{ minWidth }}
      className={cn(
        'sticky top-0 z-10 h-8 bg-card px-3 py-0 text-start text-[0.625rem] font-bold uppercase tracking-[0.08em] text-gray-400/70',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function LiveTr({
  selected, onClick, ariaLabel, children,
}: {
  selected: boolean
  onClick: () => void
  ariaLabel: string
  children: ReactNode
}) {
  return (
    <tr
      tabIndex={0}
      aria-selected={selected}
      aria-label={ariaLabel}
      data-selected={selected ? '' : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'h-12 cursor-pointer border-b border-border/60 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        // Hover is distinct from — and never overrides — the selected tint.
        'hover:bg-muted/50',
        selected && 'bg-primary/10 hover:bg-primary/10',
      )}
    >
      {children}
    </tr>
  )
}

export function LiveTd({ children, className }: { children: ReactNode; className?: string }) {
  // `max-w-0` + the header's `min-width` is what lets a cell truncate inside
  // an auto-layout table (LM's cells rely on `table-fixed` + a min-width; the
  // column set here scrolls instead, so the constraint moves onto the cell).
  return <td className={cn('max-w-0 overflow-hidden px-3', className)}>{children}</td>
}

/* ── Inspectors table (LM's mixed Workforce columns) ───────────────────── */

/** `workforce-avatar-art.ts` `WorkforceStatusKey` — the five illustrated
 *  states, decoded to real SVG files under /assets/workforce/. */
type WorkforceStatusKey = 'on-duty' | 'on-break' | 'in-transit' | 'clocked-in' | 'not-clocked-in'

const WORKFORCE_AVATAR_ART: Record<WorkforceStatusKey, string> = {
  'on-duty': '/assets/workforce/on-duty.svg',
  'on-break': '/assets/workforce/on-break.svg',
  'in-transit': '/assets/workforce/in-transit.svg',
  'clocked-in': '/assets/workforce/clocked-in.svg',
  'not-clocked-in': '/assets/workforce/not-clocked-in.svg',
}

/** `workforce-avatar-art.ts` `isFieldDesignation` — copied verbatim. */
export function isFieldDesignation(designation?: string | null): boolean {
  return /field|inspector|patrol|driver|technician|crew/i.test(designation ?? '')
}

/** `workforce-avatar-art.ts` `resolveWorkforceArtStatus` — copied verbatim
 *  (commit 5d6e426): a field role that is merely clocked in still gets the
 *  GREEN field coin; blue is office staff only. */
export function resolveWorkforceArtStatus(
  status: WorkforceStatusKey,
  designation?: string | null,
): WorkforceStatusKey {
  if (status === 'clocked-in' && isFieldDesignation(designation)) return 'on-duty'
  return status
}

/** The cockpit's `DutyStatus` words → LM's own `LiveWorkforceStatus` keys
 *  (the same 3-value vocabulary `gisTabsData.ts` already mirrors). */
const DUTY_TO_ART_STATUS: Record<DutyStatus, WorkforceStatusKey> = {
  'In Transit': 'in-transit',
  'Clocked In': 'clocked-in',
  'Not Clocked In': 'not-clocked-in',
}

/** `LiveMixedLocationCell`'s per-kind lead glyph + sr-only kind label. */
const MIXED_LOCATION_ICON = { plain: MapPin, zone: Frame, poi: Flag } as const
const MIXED_LOCATION_LABEL = { plain: 'Address', zone: 'Zone', poi: 'Point of interest' } as const
type LocationKind = keyof typeof MIXED_LOCATION_ICON

/** LM derives `locationKind` off the record's zone/POI binding; the cockpit
 *  roster carries a single free-text location, so a named Zone reads as a
 *  zone and a named depot/station/fuel point reads as a POI — the same three
 *  glyphs, resolved from the one field this data has. */
function locationKindOf(location: string): LocationKind {
  if (/\bzone\b/i.test(location)) return 'zone'
  if (/depot|station|checkpoint|point|marina|terminal/i.test(location)) return 'poi'
  return 'plain'
}

/** `LiveMixedNameCell`'s workforce branch, verbatim. */
export function WorkforceNameCell({ row }: { row: InspectorRow }) {
  const art = resolveWorkforceArtStatus(DUTY_TO_ART_STATUS[row.status], row.designation)
  return (
    <span className="flex min-h-[1.9375rem] min-w-0 items-center gap-2.5">
      <img
        src={WORKFORCE_AVATAR_ART[art]}
        width={28}
        height={31}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="block shrink-0"
      />
      <span className="truncate text-xs font-medium text-foreground" title={row.name}>
        {row.name}
      </span>
    </span>
  )
}

/** `LiveMixedTextCell`, verbatim. */
export function MixedTextCell({ value }: { value?: string }) {
  const text = value == null || value === '' ? '—' : value
  return (
    <span className="block truncate text-xs text-foreground" title={text}>
      {text}
    </span>
  )
}

/** `LiveMixedLocationCell`, verbatim (glyph + sr-only kind + truncated line). */
export function MixedLocationCell({ location }: { location: string }) {
  const kind = locationKindOf(location)
  const Icon = MIXED_LOCATION_ICON[kind]
  const text = location || '—'
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">{MIXED_LOCATION_LABEL[kind]}: </span>
      <span className="truncate text-xs text-foreground" title={text}>
        {text}
      </span>
    </span>
  )
}

export function InspectorsTable({
  rows, selectedId, onSelect,
}: {
  rows: InspectorRow[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <LiveTable
      ariaLabel="Inspectors"
      head={
        <>
          {/* LM's mixed-column min-widths (`LiveListPanel.mixedTableColumns`:
              identity 7.4375rem, the rest 6rem), widened for this tenant's
              longer values — Arabic-transliterated names and full addresses
              where LM's fixture data is short. Data-only adaptation; the
              scroll-inside-the-region behaviour is unchanged. */}
          <LiveTh minWidth="9rem">Name</LiveTh>
          <LiveTh minWidth="6.5rem">ID</LiveTh>
          <LiveTh minWidth="7.5rem">Type</LiveTh>
          <LiveTh minWidth="9rem">Location</LiveTh>
        </>
      }
    >
      {rows.map((row) => (
        <LiveTr
          key={row.id}
          selected={selectedId === row.id}
          onClick={() => onSelect(row.id)}
          ariaLabel={`${row.name}, ${row.designation}, ${row.status}`}
        >
          <LiveTd><WorkforceNameCell row={row} /></LiveTd>
          <LiveTd><MixedTextCell value={row.employeeId} /></LiveTd>
          <LiveTd><MixedTextCell value={row.designation} /></LiveTd>
          <LiveTd><MixedLocationCell location={row.zone} /></LiveTd>
        </LiveTr>
      ))}
      {rows.length === 0 ? (
        <tr>
          <td colSpan={4} className="px-3 py-8 text-center text-xs text-muted-foreground">
            No results found!
          </td>
        </tr>
      ) : null}
    </LiveTable>
  )
}

/* ── Vehicles table (LM's own blueprint columns + cells) ───────────────── */

/** `VehicleIcon3D`'s `TONE_DOT` tones, keyed by the cockpit's activity union
 *  (same mapping `LiveGisMap`'s `ACTIVITY_STATE` already uses for markers). */
const ACTIVITY_DOT: Record<VehicleActivity, string> = {
  moving: 'var(--status-success, #12b76a)',
  idle: 'var(--status-warning, #f79009)',
  stopped: 'var(--status-error, #f04438)',
  'non-reporting': 'var(--gray-400, #98a2b3)',
}

/** `VehicleIcon3D`'s `TONE_GLYPH` — arrow / pause / square, verbatim. */
function activityBadgeGlyph(activity: VehicleActivity) {
  if (activity === 'moving') return <NavigationIcon className="size-2 fill-current" strokeWidth={0} />
  if (activity === 'idle') return <PauseIcon className="size-2 fill-current" strokeWidth={0} />
  return <SquareIcon className="size-2 fill-current" strokeWidth={0} />
}

/** `LiveVehicleCell` — `VehicleIcon3D size="sm"` (39×29 box, art 38.8px wide)
 *  with the 15px status coin overlapping bottom-start, then the plate at
 *  12px near-black. */
export function VehicleNameCell({ row }: { row: VehicleRowData }) {
  return (
    <span className="flex min-h-[1.9375rem] min-w-0 items-center gap-2.5">
      <span
        aria-hidden="true"
        className="relative inline-flex shrink-0 items-center justify-center"
        style={{ width: 39, height: 29 }}
      >
        <AssetGlyph name="Tanker" variant="list" size={29} />
        <span
          data-slot="vehicle-icon-3d-badge"
          className="absolute flex items-center justify-center rounded-full text-white ring-2 ring-white"
          style={{
            width: 15,
            height: 15,
            insetInlineStart: -2,
            insetBlockEnd: -2,
            background: ACTIVITY_DOT[row.activity],
          }}
        >
          {activityBadgeGlyph(row.activity)}
        </span>
      </span>
      <span className="truncate text-xs font-medium text-foreground" title={row.plate}>
        {row.plate}
      </span>
    </span>
  )
}

/** `LiveListPanel.fillLevelTone` — copied verbatim (<20 red / <80 amber). */
function fillLevelTone(value: number): string {
  if (value < 20) return 'bg-destructive'
  if (value < 80) return 'bg-warning'
  return 'bg-success'
}

/** `LiveListPanel.FillLevelCell` — copied verbatim (72×8 track, `min-w-2`
 *  floor, 6px gap, percentage at 10px/18px semibold grey-600). */
export function FillLevelCell({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className="flex items-center gap-1.5">
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-2 w-18 shrink-0 overflow-hidden rounded-full bg-gray-50"
      >
        <div
          className={cn('absolute inset-y-0 start-0 h-full min-w-2 rounded-full transition-all', fillLevelTone(clamped))}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="shrink-0 text-[0.625rem]/[1.125rem] font-semibold tabular-nums text-gray-600">{clamped}%</span>
    </div>
  )
}

/** `ReadActivityOverview` (v5-composer renderers.tsx) — the icon+count
 *  triplet SPEC v2 §2.2 authors as `alert-triangle` · `route` ·
 *  `speedometer-04`, pinned to one line the way LiveListPanel wraps it. */
export function ActivityOverviewCell({ row }: { row: VehicleRowData }) {
  const pairs: { Icon: typeof ActivityAlertIcon; count: number | string; tone: string; label: string }[] = [
    { Icon: ActivityAlertIcon, count: row.criticalEvents, tone: 'text-destructive', label: 'Critical events' },
    { Icon: RouteIcon, count: row.trips, tone: 'text-muted-foreground', label: 'Trips today' },
    { Icon: SpeedIcon, count: row.speedLabel, tone: 'text-muted-foreground', label: 'Current speed' },
  ]
  return (
    <span data-slot="activity-overview" className="flex flex-nowrap items-center gap-1 whitespace-nowrap">
      {pairs.map(({ Icon, count, tone, label }) => (
        <span key={label} className="flex items-center gap-0.5" title={label}>
          <Icon aria-hidden="true" className={cn('size-3 shrink-0', tone)} />
          <span className="sr-only">{label}: </span>
          <span className="text-xs font-medium text-foreground">{count}</span>
        </span>
      ))}
    </span>
  )
}

export function VehiclesTable({
  rows, selectedPlate, onSelect,
}: {
  rows: VehicleRowData[]
  selectedPlate: string | null
  onSelect: (plate: string) => void
}) {
  return (
    <LiveTable
      ariaLabel="Vehicles"
      head={
        <>
          <LiveTh minWidth="9rem">Vehicle</LiveTh>
          <LiveTh minWidth="7.625rem">Fill Level</LiveTh>
          <LiveTh minWidth="8.75rem">Activity Overview</LiveTh>
          <LiveTh minWidth="9.375rem">Speed</LiveTh>
        </>
      }
    >
      {rows.map((row) => (
        <LiveTr
          key={row.plate}
          selected={selectedPlate === row.plate}
          onClick={() => onSelect(row.plate)}
          ariaLabel={`${row.plate}, ${row.model}, ${row.status}`}
        >
          <LiveTd><VehicleNameCell row={row} /></LiveTd>
          <LiveTd><FillLevelCell value={row.fillPct} /></LiveTd>
          <LiveTd><ActivityOverviewCell row={row} /></LiveTd>
          {/* Collapsed SPEED cell (SPEC §2.2): the one-line speed/dwell
              summary — LM's `liveSpeedCellText(..., 'summary')` pattern
              ("48 km/h · Just Now" while moving, the status word otherwise). */}
          <LiveTd>
            <span
              className="block truncate text-xs text-foreground"
              title={row.activity === 'moving' ? `${row.speedLabel} · Just Now` : row.status}
            >
              {row.activity === 'moving' ? `${row.speedLabel} · Just Now` : row.status}
            </span>
          </LiveTd>
        </LiveTr>
      ))}
      {rows.length === 0 ? (
        <tr>
          <td colSpan={4} className="px-3 py-8 text-center text-xs text-muted-foreground">
            No results found!
          </td>
        </tr>
      ) : null}
    </LiveTable>
  )
}
