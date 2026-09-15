import { useMemo, useState, type ReactNode } from 'react'
import { computeThresholdTone, formatFigmaDate, humanizeEnumValue } from '@fams/v5-composer'
import { Search, ChevronDown, Plus } from '@fams/ui-kit/icons'
import { RecordTableFilterButton, applyRecordTableFilters } from './RecordTableFilterButton'
import {
  Avatar,
  DataTable,
  IdChip,
  Input,
  KpiTile,
  Stack,
  StatusPill,
  TableCell,
  type DataTableColumn,
  type StatBarTone,
} from '@fams/ui-kit'
import type { EntityRecord } from '@fams/v5-composer'
import type { ListViewSummaryTile } from '../views/list/ListView.types'
import { cn } from '../lib/cn'

/**
 * RecordTable — a metadata-driven table over a record's own embedded array
 * field (figma-spec-attendance.md / figma-spec-incidents.md's "related
 * records live as plain arrays on the record" convention, same one
 * ticketing's `timelineEvents`/`comments` already uses). [tier-2 pattern]
 *
 * Generic column TYPES, not business columns: `columns[].type` picks a
 * presentation (`text`/`avatar`/`idChip`/`photo`/`statusPill`/`datetime`/
 * `progress`), `columns[].key` is the row-object key it reads — no module
 * vocabulary baked in here (root `CLAUDE.md` rule 10). Composes `@fams/ui-kit`'s
 * `DataTable` rather than re-implementing a table; `progress` in turn
 * delegates entirely to `@fams/ui-kit`'s `TableCell kind="progress"` — the
 * design system's one canonical progress-cell implementation — rather than
 * carrying its own bar-drawing duplicate.
 *
 * State-agnostic (Rule 8) with ONE deliberate exception: the optional
 * `search` toolbar filters ROWS ALREADY IN MEMORY (a substring match across
 * every configured column's stringified value) — local UI state, not a
 * fetch, the same category of self-contained interaction `DataTable`'s own
 * sort/selection already own. `timeframeSelect` renders the toolbar
 * affordance only (figma-spec-attendance.md's "Select Time Frame" dropdown)
 * with no wired behavior — no options/callback are part of this generic
 * contract; a caller needing a live timeframe filter composes its own
 * control alongside `RecordTable` instead.
 *
 * `rows` is a generic alternative row source to `record[field]` — for a
 * table over records that were assembled elsewhere (e.g. another module's
 * records, scoped and filtered by a caller like `ScopedLinkedRecords`) rather
 * than a record's own embedded array. Supplying `rows` bypasses `field`/
 * `record` entirely and wins when both are given; everything else about this
 * component (columns, search, `statusColors`, presentation) is unchanged, so
 * there remains ONE table implementation for both embedded-array tabs and
 * cross-module tabs.
 */
export type RecordTableColumnType =
  | 'text'
  | 'avatar'
  | 'idChip'
  | 'photo'
  | 'statusPill'
  | 'datetime'
  | 'number'
  | 'progress'

export interface RecordTableColumn {
  key: string
  label: string
  type: RecordTableColumnType
  width?: string
  /** `type: 'progress'` only — row key holding the target value for the `value / target unit` caption. Omitted, `key`'s value is read as a 0-100 percentage directly (no caption). */
  targetKey?: string
  /** Unit suffix — the `type: 'progress'` caption, and the value suffix for `type: 'number'` (e.g. `"km"`). */
  unit?: string
  /** `type: 'progress'` only — fill tone, the caller's call (which value counts as good). */
  tone?: StatBarTone
}

/** Decorative header action (no `onClick` is expressible from a JSON blueprint — same convention `DocumentsList`'s "Upload Document" action uses). */
export interface RecordTableAction {
  label: string
}

export interface RecordTableProps {
  /** `record[field]` — the row array this table renders. Ignored when `rows` is supplied. */
  field?: string
  record?: EntityRecord
  /** Row array to render directly, bypassing `record[field]` — see the module doc's `rows` paragraph. Wins over `field`/`record` when both are given. */
  rows?: Record<string, unknown>[]
  columns: RecordTableColumn[]
  /** Shows a search input above the table, filtering rows client-side across every column's value. Default `false`. */
  search?: boolean
  /** Search input placeholder/accessible label. Default `"Search anything here"`. */
  searchPlaceholder?: string
  /** Shows a decorative "Select Time Frame" toolbar affordance (no wired behavior — see the module doc). Default `false`. */
  timeframeSelect?: boolean
  /** Shows a decorative primary action button (e.g. "Report Issue") end-aligned in the toolbar. */
  action?: RecordTableAction
  /**
   * Optional KPI/summary stat cards rendered ABOVE the table — the same
   * `KpiTile` row `ListView.summaryTiles` renders, brought to the profile
   * RecordTable so a detail tab can show a competency/status summary over its
   * own record list without a second tab. Omit for none (the default, table
   * only). Icons here are already resolved `LucideIcon`s — a JSON blueprint
   * tab authors string names and the tab adapter maps them (same contract as
   * `ListView`'s `useSummaryTiles`).
   */
  summaryTiles?: ListViewSummaryTile[]
  /** `statusPill` column color lookup, keyed by the raw cell value — the same blueprint-driven hex escape hatch `StatusPill.color` documents. */
  statusColors?: Record<string, string>
  /**
   * `statusPill` column LABEL lookup, keyed by the raw stored value — the
   * owning module's `uiConfig.statusList` key -> label map. Without it a pill
   * prints the stored key (`jobOrderCreated` -> `JOBORDERCREATED`), which is
   * the same record reading differently here than in its own module's list.
   * `ScopedLinkedRecords` derives this automatically from the target module's
   * resolved config, so a blueprint never has to restate it.
   */
  statusLabels?: Record<string, string>
  /**
   * Let `DataTable` auto-hide lower-tier columns as the container narrows.
   * Default `false` — i.e. every authored column stays rendered and the table
   * region scrolls horizontally instead.
   *
   * Why the default is off: a `RecordTable` caller authors a SHORT, explicit
   * column list, so silently dropping some of it contradicts the author. In a
   * narrow detail-sheet tab this dropped the leading, identifying columns
   * first — the asset profile's Preventive Maintenance tab lost SERVICE (the
   * column that says WHICH rule each row is) plus four others, leaving rows
   * that could not be told apart. Hiding the identifying column is a
   * correctness bug, not a density preference (UX-NOTES A6/B2: never crush or
   * drop columns, scroll the region).
   */
  responsiveHide?: boolean
  /**
   * Row activation, threaded straight through to `DataTable`'s own
   * `onRowClick` — the ONE seam that also brings a clickable row's cursor,
   * hover affordance, and keyboard Enter/Space activation (DataTable's
   * `hasFocusableRows` machinery), so a caller wiring row-click never has to
   * reinvent that accessibility contract outside this component. Omit to
   * keep every row inert, exactly as before this prop existed.
   */
  onRowClick?: (row: Record<string, unknown>, index: number) => void
  className?: string
}

const EMPTY = '—'

function cellText(value: unknown): string | undefined {
  return value == null || value === '' ? undefined : String(value)
}

function toFiniteNumber(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined
}

function renderCell(
  row: Record<string, unknown>,
  column: RecordTableColumn,
  statusColors?: Record<string, string>,
  statusLabels?: Record<string, string>,
): ReactNode {
  if (column.type === 'progress') {
    // Delegates entirely to `TableCell kind="progress"` (the DS's one
    // canonical progress-cell implementation). Tone: an explicit
    // `column.tone` wins; otherwise shares `ReadProgressMeter`'s
    // `computeThresholdTone` (exported from `@fams/v5-composer`) so this
    // table's bars vary by value the same way the standalone PM detail's
    // do, rather than falling through to `TableCell`'s fixed `primary`
    // default (fix7 wave 6, P1 — wave 4c's threshold-tone fix missed this
    // call site).
    const value = toFiniteNumber(row[column.key])
    const target = column.targetKey ? toFiniteNumber(row[column.targetKey]) : undefined
    const tone = column.tone ?? computeThresholdTone(value, target)
    return <TableCell kind="progress" value={value} target={target} unit={column.unit} tone={tone} size="sm" />
  }

  const text = cellText(row[column.key])
  if (text == null) return <span className="text-body-sm text-muted-foreground">{EMPTY}</span>

  switch (column.type) {
    case 'avatar':
      return (
        <span className="inline-flex items-center gap-2">
          <Avatar name={text} size="xs" />
          <span className="text-body-sm text-foreground">{text}</span>
        </span>
      )
    case 'idChip':
      return <IdChip>{text}</IdChip>
    case 'photo':
      // Content, not decorative — a photo cell IS the data (e.g. incident
      // evidence) — so it gets a real accessible name, not `alt=""`.
      return <img src={text} alt={column.label} loading="lazy" className="size-8 rounded-sm object-cover" />
    case 'statusPill':
      // The stored value is a KEY (`jobOrderCreated`), the pill must show the
      // blueprint's LABEL ("Job Order Created"). Rendering the raw key made a
      // scoped tab print `JOBORDERCREATED` — a camelCase key uppercased — while
      // the owning module's own list showed the label for the same record.
      // Falls back to the raw value when no label is supplied, so a caller
      // that has no status vocabulary is unaffected.
      // …and with no `statusLabels` at all, humanize the key rather than print it:
      // round 5's visual gate found `reported-issues` / `jobOrderCreated` reaching
      // the user verbatim wherever a caller supplied colours but no vocabulary.
      return <StatusPill color={statusColors?.[text]}>{statusLabels?.[text] ?? humanizeEnumValue(text)}</StatusPill>
    case 'datetime': {
      // Dates/times render on one line (Figma: "01 May, 25 | 08:05 AM") —
      // wrapping a timestamp over rows reads as multiple values.
      // A `datetime` column was previously printed VERBATIM, so a stored ISO
      // date surfaced as "2026-08-28" next to the "28 Aug, 2026" the rest of
      // the app renders for the same value (round 5 visual gate). Formatting
      // goes through the composer's single `formatFigmaDate`, never a second
      // local implementation. Time is shown only when the value carries one,
      // so a date-only column does not gain a spurious "00:00".
      // Narrow on purpose: only an ISO-shaped STORED value is reformatted. A
      // column already carrying a display string ("01 May, 25") is left exactly
      // as authored — reformatting whatever `new Date()` happens to accept
      // would rewrite values that were already correct.
      const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(text)
      const parsed = iso ? new Date(text) : null
      const display = parsed && !Number.isNaN(parsed.getTime())
        ? formatFigmaDate(parsed, Boolean(iso?.[4]))
        : text
      return <span className="text-body-sm whitespace-nowrap text-foreground">{display}</span>
    }
    case 'number': {
      // A measurement rendered as a bare digit string ("113452") reads as an
      // id, not a quantity — round 5's visual gate caught odometers doing
      // exactly that beside the grouped list's own "113,452 km". Grouping is
      // `en-US` for the same reason `formatFigmaDate` fixes its month: a
      // consistent render regardless of the viewer's OS locale.
      const n = Number(text)
      if (!Number.isFinite(n)) return <span className="text-body-sm text-foreground">{text}</span>
      return (
        <span className="text-body-sm whitespace-nowrap text-foreground">
          {n.toLocaleString('en-US')}
          {column.unit ? <span className="ms-1 text-muted-foreground">{column.unit}</span> : null}
        </span>
      )
    }
    case 'text':
    default:
      return <span className="text-body-sm text-foreground">{text}</span>
  }
}

function matchesSearch(row: Record<string, unknown>, columns: RecordTableColumn[], query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return columns.some((column) => (cellText(row[column.key]) ?? '').toLowerCase().includes(needle))
}

export function RecordTable({
  field,
  record,
  rows: rowsProp,
  columns,
  search = false,
  searchPlaceholder = 'Search anything here',
  timeframeSelect = false,
  action,
  summaryTiles,
  statusColors,
  statusLabels,
  responsiveHide = false,
  onRowClick,
  className,
}: RecordTableProps) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const rows = useMemo(() => {
    if (rowsProp) return rowsProp
    const raw = field ? record?.[field] : undefined
    return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : []
  }, [rowsProp, record, field])
  // The Filter popover derives its distinct-value groups from rows AFTER
  // search has narrowed them — so a search term shrinks the checkbox list to
  // match what the user is currently looking at, rather than always showing
  // the full column vocabulary. The filter selection itself then narrows
  // those rows further.
  const searchedRows = useMemo(
    () => (search && query ? rows.filter((row) => matchesSearch(row, columns, query)) : rows),
    [rows, columns, search, query],
  )
  const visibleRows = useMemo(
    () => applyRecordTableFilters(searchedRows, filters),
    [searchedRows, filters],
  )

  const dataColumns = useMemo<DataTableColumn<Record<string, unknown>>[]>(
    () =>
      columns.map((column) => ({
        key: column.key,
        label: column.label,
        width: column.width,
        render: (row: Record<string, unknown>) => renderCell(row, column, statusColors, statusLabels),
      })),
    [columns, statusColors, statusLabels],
  )

  return (
    <div data-slot="record-table" className={cn('flex flex-col gap-3', className)}>
      {summaryTiles?.length ? (
        <Stack data-slot="record-table-summary" direction="row" wrap gap="field">
          {summaryTiles.map((tile) => (
            <KpiTile
              key={tile.id}
              layout="stat"
              label={tile.label}
              value={tile.value}
              icon={tile.icon}
              tone={tile.tone}
              iconColor={tile.iconColor}
              iconBg={tile.iconBg}
              className="min-w-[13rem] flex-1"
            />
          ))}
        </Stack>
      ) : null}
      {search || timeframeSelect || action ? (
        <div data-slot="record-table-toolbar" className="flex items-center gap-3">
          {search ? (
            <>
              <div className="relative max-w-sm flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="search"
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="ps-9"
                  aria-label={searchPlaceholder}
                />
              </div>
              <RecordTableFilterButton
                columns={columns}
                rows={searchedRows}
                value={filters}
                onChange={setFilters}
                statusLabels={statusLabels}
              />
            </>
          ) : null}
          {timeframeSelect ? (
            <button
              type="button"
              className="ms-auto flex h-9 items-center gap-2 rounded-sm border border-border px-3 text-body-sm font-semibold text-muted-foreground"
            >
              Select Time Frame
              <ChevronDown className="size-4" aria-hidden="true" />
            </button>
          ) : null}
          {action ? (
            <button
              type="button"
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-sm bg-primary px-3 text-body-sm font-semibold text-primary-foreground outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring',
                !search && !timeframeSelect ? 'ms-auto' : '',
              )}
            >
              <Plus className="size-4" aria-hidden="true" />
              {action.label}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-border">
        <DataTable<Record<string, unknown>>
          columns={dataColumns}
          data={visibleRows}
          getRowId={(row, index) => cellText(row.id) ?? String(index)}
          isCustomizable={false}
          ariaLabel="Records"
          disableResponsiveHide={!responsiveHide}
          onRowClick={onRowClick}
          hasFocusableRows={Boolean(onRowClick)}
        />
      </div>
    </div>
  )
}

RecordTable.displayName = 'RecordTable'
