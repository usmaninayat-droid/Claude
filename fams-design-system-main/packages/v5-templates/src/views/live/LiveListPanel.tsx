import { useEffect, useRef, useState, useMemo, type ReactNode } from 'react'
import { Pencil } from '@fams/ui-kit/icons'
import {
  DataTable,
  Skeleton,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  type ColumnCatalogItem,
  type DataTableColumn,
} from '@fams/ui-kit'
import { getComponentRenderer, type EntityConfig, type EntityRecord } from '@fams/v5-composer'
import { cn } from '../../lib/cn'
import { handOffFocus } from '../../lib/focus-handoff'
import { deriveLiveMixedRow, parseLiveStatus } from '../live-data'
import { liveColumnLabel, LIVE_ROW_HEIGHT_PX, type LiveListWidthState } from './live-list-model'
import { LiveColumnsPopover } from './LiveColumnsPopover'
// Re-exported (`HighlightedText` is public API) — the VEHICLE cell itself now
// lives in one shared module used by BOTH live list surfaces.
import { HighlightedText, LiveVehicleCell } from './LiveVehicleCell'
import { LiveListNoResults, LiveListSkeleton } from './live-list-states'
import { LiveSearchField } from './LiveSearchField'
import {
  LIVE_MIXED_COLUMNS,
  LIVE_MIXED_COLUMN_LABELS,
  LiveMixedLocationCell,
  LiveMixedNameCell,
  LiveMixedTextCell,
} from './live-mixed-columns'

/**
 * LiveListPanel — the hybrid view's leading vehicle list panel (figma SPEC
 * v2 §2.2): search with the focus float-label + live matched-substring
 * highlight, an aria-live "Showing N items out of M" count line (filtered
 * numbers in primary), the All-Filters funnel + applied chips (injected as
 * slots so the panel stays presentational), a Columns pencil popover (290px,
 * internal scroll, `ColumnCustomizer`), and the vehicle mini-table —
 * `VehicleIcon3D` rows (P0-1.1, zero photos), fixed 48px row rhythm,
 * VIRTUALIZED through `DataTable`'s windowed body for the 1,000-record seed
 * (UX-2), per-column min-widths with the overflow scrolling INSIDE the table
 * region (UX-1).
 */
export interface LiveListPanelProps {
  config: EntityConfig
  /** Rows after the ACTIVE search+filter intersection. */
  records: EntityRecord[]
  /** The unfiltered module row count — the "out of M" half of the count line. */
  totalCount: number
  /**
   * "Sync list with Map" is active AND has produced at least one viewport
   * reading (SPEC §3.22) — `records` is then the vehicles currently inside
   * the map's bounds, not the plain search+filter intersection. Swaps the
   * count line to "N of M in view" and, when it comes up empty with no
   * active search, the empty state to "No vehicles in the current map
   * area" instead of the search-oriented "No results found!".
   */
  viewportSynced?: boolean
  /**
   * "Sync List with Map" (SPEC §3.22 / AC-2) — the SAME state
   * `CustomizeViewDrawer`'s "Sync list with Map" `ToggleRow` owns (single
   * source of truth, no dual state); this is only an additional inline
   * affordance on the list-meta row, matching the Figma screenshot's
   * placement. Omit to render no inline toggle (e.g. a caller with no
   * customize state to bind).
   */
  syncListWithMap?: boolean
  onSyncListWithMapChange?: (checked: boolean) => void
  search: string
  onSearchChange: (value: string) => void
  /** The All-Filters funnel trigger+popover (slot — see `LiveFiltersPopover`). */
  filterSlot?: ReactNode
  /**
   * The All/Vehicle/Workforce chip row (slot — see `LiveKindChips`), task
   * §1: "under the list panel's search field". Rendered ABOVE the applied-
   * filter `chipsSlot` below — a persistent kind switch reads as more
   * primary navigation than the conditional, filter-driven chips.
   */
  kindChipsSlot?: ReactNode
  /** The applied-filter chip rows (slot — see `LiveFilterChips`). */
  chipsSlot?: ReactNode
  /**
   * Renders the fixed Name·ID·Type·Location mixed columns (task §2) instead
   * of `columns`/the Columns popover — set while the All/Workforce chip is
   * active. The Vehicle chip (`false`) renders exactly as before this
   * enhancement.
   */
  mixedColumns?: boolean
  /** Ordered visible col keys the TABLE renders. */
  columns: string[]
  /**
   * The Columns popover's value (`ColumnCustomizer.value`). Decoupled from
   * `columns` per SPEC §2.6 (the popover's default Shown set is
   * `uiConfig.map.columnsShown`, not the collapsed table columns); the
   * user's first edit — reported via `onColumnsChange` — unifies both.
   * Defaults to `columns`.
   */
  shownColumns?: string[]
  onColumnsChange: (orderedVisibleKeys: string[]) => void
  catalog: ColumnCatalogItem[]
  widthState: LiveListWidthState
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  loading?: boolean
  className?: string
}

export interface LiveSpeedBindings {
  speedCol?: string
  statusCol?: string
  dwellCol?: string
  /** @deprecated The card's long-form stamp; the cell reads `dwellCol`. */
  statusSinceCol?: string
}

/**
 * The SPEED cell's text (SPEC §2.2 / visual #13, #14, #26).
 *
 * The BINDING supplies bare values — `speedCol` a number in km/h, `dwellCol`
 * a bare duration (`5 mins`, `1 hr 35 mins`) or, while moving, a short
 * since-last-fix label (`Just Now`, `12 secs`). Bare is deliberate: the map's
 * marker chips render `dwellCol` raw (SPEC §2.3), so the unit and the
 * `for`/`since` preposition are FORMATTING and live here.
 *
 * `'summary'` — the collapsed hybrid panel and the list-only table
 * (495:2998 / 540:69908):
 *   moving                  → `48 km/h · Just Now`
 *   idling                  → `for 5 mins`
 *   stopped / non-reporting → `since 1 hr 35 mins`
 * `'speed'` — the EXPANDED hybrid columns (495:16050), where TIMESTAMP owns
 * the dwell: `48 km/h` when moving at speed, else `-`.
 * No data → `-`. A dwell that already reads as a phrase is passed through, so
 * a blueprint that pre-formats never yields "for for 5 mins".
 *
 * Pure; exported for the panel test and shared with `LiveListOnlyView`.
 */
export function liveSpeedCellText(
  record: EntityRecord,
  bindings: LiveSpeedBindings,
  mode: 'summary' | 'speed' = 'summary',
): string {
  const status = parseLiveStatus(bindings.statusCol ? record[bindings.statusCol] : undefined)
  const rawSpeed = bindings.speedCol ? record[bindings.speedCol] : undefined
  const speedNumber = rawSpeed == null || rawSpeed === '' ? null : Number(rawSpeed)
  const speedText = speedNumber != null && Number.isFinite(speedNumber) ? `${speedNumber} km/h` : null
  if (mode === 'speed') return speedText && speedNumber! > 0 ? speedText : '-'

  const rawDwell = bindings.dwellCol ? record[bindings.dwellCol] : undefined
  const dwell = rawDwell == null || rawDwell === '' ? null : String(rawDwell).trim()

  if (status === 'moving') {
    if (!speedText) return dwell ?? '-'
    return dwell ? `${speedText} · ${dwell}` : speedText
  }
  if (!dwell) return '-'
  if (/^(for|since|just)\b/i.test(dwell)) return dwell
  return status === 'idling' ? `for ${dwell}` : `since ${dwell}`
}

/** @deprecated Use {@link liveSpeedCellText}; kept as the original name. */
export function liveSpeedSummary(record: EntityRecord, bindings: LiveSpeedBindings): string {
  return liveSpeedCellText(record, bindings, 'summary')
}

/** SPEC §2.2 column min-widths (VEHICLE ≥119 / FILL LEVEL ≥122 / ACTIVITY
 *  ≥140 / SPEED ≥150 — UX-1: columns never crush; overflow scrolls inside
 *  the table region). */
function liveColumnMinWidth(col: string, map: EntityConfig['uiConfig']['map']): string {
  if (col === 'title') return '7.4375rem'
  if (map?.fillLevelCol && col === map.fillLevelCol) return '7.625rem'
  // ACTIVITY nudged 140→148 and SPEED 150→140 (run 2026-09-07): at the
  // pane's real ~412px content width the SPEC's 140/150 split left the
  // ACTIVITY caption 4px short and it wrapped to two lines, while SPEED's
  // 150 was ~40px wider than its longest string ("since 1 hr 35 mins").
  // Same total, so the three columns still fit with no horizontal scroll and
  // no truncation fade — page-fit, which `VALUES-CROSSCHECK.md` ruling #4
  // ("product wins — padding is page-fit/density, not anatomy") assigns to
  // the product screen rather than the DS spec.
  if (map?.activityCol && col === map.activityCol) return '9.25rem'
  if (map?.speedCol && col === map.speedCol) return '8.75rem'
  return '5rem'
}

/**
 * FILL LEVEL cell (figma live-monitoring spec §1 "FILL LEVEL" column) — a
 * colored progress bar + percentage, generic and column-config-driven
 * (`uiConfig.map.fillLevelCol`, 0-100). No tenant/entity wording is
 * hardcoded here — the header label comes from the bound systemcolumn's own
 * `name` via `liveColumnLabel`, same as every other column.
 *
 * Not built on `@fams/ui-kit`'s `Progress` primitive: that component's fill
 * is a fixed `bg-primary` (no tone/color prop), and this cell needs the
 * fixed red/orange/green thresholds the Figma bars show — a plain
 * accent-colored bar would lose that signal. Kept visually consistent with
 * `Progress` (same track/fill shape) rather than inventing a new look.
 */
function fillLevelTone(value: number): string {
  if (value < 20) return 'bg-destructive'
  if (value < 80) return 'bg-warning'
  return 'bg-success'
}

export function FillLevelCell({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    // Figma 12:14684: 72x8 track (r-18 = fully round), 6px gap, then the
    // percentage at 10px/18px semibold in grey-600.
    <div className="flex items-center gap-1.5">
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-2 w-18 shrink-0 overflow-hidden rounded-full bg-gray-50"
      >
        <div
          // `min-w-2` (= the 8px bar height, i.e. one round stub) so a very
          // low reading is still LEGIBLE. Figma's mock draws three hand-set
          // widths per tone (27/42/70px for 10/49/100%), which is not a rule
          // a real 0-100 binding can follow — the bar stays proportional and
          // only guarantees a floor.
          className={cn('absolute inset-y-0 start-0 h-full min-w-2 rounded-full transition-all', fillLevelTone(clamped))}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="shrink-0 text-[0.625rem]/[1.125rem] font-semibold tabular-nums text-gray-600">{clamped}%</span>
    </div>
  )
}

export { HighlightedText }

export function LiveListPanel({
  config,
  records,
  totalCount,
  viewportSynced = false,
  syncListWithMap,
  onSyncListWithMapChange,
  search,
  onSearchChange,
  filterSlot,
  kindChipsSlot,
  chipsSlot,
  mixedColumns = false,
  columns,
  shownColumns,
  onColumnsChange,
  catalog,
  widthState,
  selectedId,
  onSelect,
  loading = false,
  className,
}: LiveListPanelProps) {
  /*
   * "No data yet" is NOT "no results" (UX-2 / SPEC §3.28, round-4 finding F2).
   * A live surface that has NEVER been handed a record and carries no query is
   * still loading, and must show the Figma skeleton (495:25945 / 555:39222)
   * rather than the "No results found!" empty state — blank-then-pop, or a
   * false "nothing matches", on a 1,000-row surface is exactly the failure
   * UX-2 names.
   *
   * The `loading` prop stays the app's explicit seam and always wins; this is
   * the derived floor under it, keyed on the UNFILTERED total so a search that
   * legitimately matches nothing still gets the empty state.
   */
  const seenRecords = useRef(false)
  if (totalCount > 0) seenRecords.current = true
  const showSkeleton = loading || (!seenRecords.current && totalCount === 0)

  /** U1's hand-off target for both self-removing clear controls. */
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const map = config.uiConfig.map
  const activityCol = map?.activityCol
  const speedCol = map?.speedCol
  const statusCol = map?.statusCol
  const dwellCol = map?.dwellCol
  const statusSinceCol = map?.statusSinceCol
  const fillLevelCol = map?.fillLevelCol
  const ReadActivity = getComponentRenderer('ActivityOverviewView')
  // NOTE: `uiConfig.map.photoCol` data is still ACCEPTED on records/config
  // (deprecated binding, back-compat) but deliberately not rendered — SPEC v2
  // P0-1 bans vehicle photos everywhere; the 3D icon below replaces them.

  const tableColumns = useMemo<DataTableColumn<EntityRecord>[]>(
    () =>
      columns.map((col) => ({
        key: col,
        label: liveColumnLabel(config, col),
        isSortable: false,
        minWidth: liveColumnMinWidth(col, map),
        render: (row: EntityRecord) => {
          const raw = row[col]
          const text = raw == null || raw === '' ? '—' : String(raw)
          // Activity Overview cell (SPEC §2.2): one-line icon+count triplet,
          // via the same registered reader the list-only ListView resolves by
          // name — the nowrap override pins the renderer to a single line.
          if (activityCol && col === activityCol && ReadActivity) {
            const descriptor = {
              id: col,
              col,
              label: liveColumnLabel(config, col),
              type: 'SmallText' as const,
              required: false,
              multiple: true,
            }
            return (
              <span className="flex min-w-0 [&_[data-slot=activity-overview]]:flex-nowrap [&_[data-slot=activity-overview]]:whitespace-nowrap">
                <ReadActivity descriptor={descriptor} value={raw} record={row} />
              </span>
            )
          }
          // Collapsed SPEED cell (SPEC §2.2): the one-line dwell/speed
          // summary ("since 1 hr" / "for 5 mins" / "48 km/h · Just Now").
          if (speedCol && col === speedCol) {
            const summary = liveSpeedCellText(
              row,
              { speedCol, statusCol, dwellCol, statusSinceCol },
              // Expanded splits speed and dwell into SPEED + TIMESTAMP
              // columns (495:16050) — the summary pattern is collapsed-only.
              widthState === 'collapsed' ? 'summary' : 'speed',
            )
            return (
              // `title` so the full pattern stays readable even at the
              // column's 150px floor (UX-1: truncate, never crush).
              // grey-700, not grey-900 (visual #37).
              <span className="block truncate whitespace-nowrap text-caption text-foreground" title={summary}>
                {summary}
              </span>
            )
          }
          if (col === 'title') {
            // P0-1.1 row anatomy — one shared cell with the list-only table.
            return <LiveVehicleCell config={config} record={row} search={search} />
          }
          // FILL LEVEL cell (figma live-monitoring spec §1): colored
          // progress bar + %, generic column-config-driven field — never a
          // hardcoded "tanker"/"vehicle" binding (the header label itself
          // comes from the bound systemcolumn's own name, above `columns`).
          if (fillLevelCol && col === fillLevelCol) {
            const numeric = raw == null || raw === '' ? null : Number(raw)
            if (numeric == null || !Number.isFinite(numeric)) return <span className="text-muted-foreground">—</span>
            return <FillLevelCell value={numeric} />
          }
          return (
            <span className="truncate text-caption text-foreground" title={text}>
              <HighlightedText text={text} query={search} />
            </span>
          )
        },
      })),
    [
      columns,
      config,
      map,
      search,
      activityCol,
      speedCol,
      statusCol,
      dwellCol,
      statusSinceCol,
      fillLevelCol,
      ReadActivity,
      widthState,
    ],
  )

  // The mixed "All"/Workforce columns (task §2) — a fixed Name·ID·Type·
  // Location shape, ignoring `columns`/the Columns popover entirely (there
  // is nothing to customize while it's active).
  const mixedTableColumns = useMemo<DataTableColumn<EntityRecord>[]>(
    () =>
      LIVE_MIXED_COLUMNS.map((col) => ({
        key: col,
        label: LIVE_MIXED_COLUMN_LABELS[col],
        isSortable: false,
        minWidth: col === 'title' ? '7.4375rem' : '6rem',
        render: (row: EntityRecord) => {
          if (col === 'title') return <LiveMixedNameCell config={config} record={row} search={search} />
          const mixedRow = deriveLiveMixedRow(config, row)
          if (col === 'mixedId') return <LiveMixedTextCell value={mixedRow.idLabel} />
          if (col === 'mixedType') return <LiveMixedTextCell value={mixedRow.typeLabel} />
          return <LiveMixedLocationCell row={mixedRow} />
        },
      })),
    [config, search],
  )
  const effectiveColumns = mixedColumns ? mixedTableColumns : tableColumns
  const effectiveColumnKeys = mixedColumns ? [...LIVE_MIXED_COLUMNS] : columns

  const shown = records.length.toLocaleString()
  const total = totalCount.toLocaleString()
  /* NARROWED = the rows on screen are fewer than the module's total, whatever
     did the narrowing (a filter, the search box, or the sync-with-map
     viewport). Only then does the count name both numbers — the designer's
     rule: never "Showing 1,000 items out of 1,000". */
  const narrowed = records.length !== totalCount
  const [columnsOpen, setColumnsOpen] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)
  /** Whether the table region still has columns to scroll to (drives the
   *  trailing fade). Re-measured on scroll and on resize. */
  const [scrollFade, setScrollFade] = useState(false)
  useEffect(() => {
    const region = tableRef.current?.querySelector<HTMLElement>('[role="region"], .overflow-auto')
    if (!region) return
    const measure = () => setScrollFade(region.scrollWidth - region.clientWidth - region.scrollLeft > 1)
    measure()
    region.addEventListener('scroll', measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(region)
    return () => {
      region.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [columns, mixedColumns, records.length, widthState])
  // The row a keyboard user opened the card FROM (UX-13 / interaction E12):
  // Escape closes the card, selection clears, and focus must land back on
  // that row — not on `<body>`.
  const originRowRef = useRef<HTMLElement | null>(null)

  /*
   * Marker → row sync (interaction 14b). The map emits its selection through
   * the SAME `selectedId` seam a row click uses, so the panel only has to
   * make the row visible: scroll it into view when it is already rendered,
   * and — because the body is VIRTUALIZED for the 1,000-row seed — scroll the
   * region to the row's index when it is not mounted at all, which is why a
   * marker click looked like it did nothing. `block: 'nearest'` keeps the
   * user's scroll position when the row is already on screen (UX A8).
   */
  useEffect(() => {
    if (!selectedId) {
      const origin = originRowRef.current
      originRowRef.current = null
      if (!origin?.isConnected) return
      // Only RECLAIM focus that the card took: if the user has since moved
      // focus somewhere real, yanking it back would be the worse bug.
      const active = document.activeElement
      const cameFromTheCard = !active || active === document.body || Boolean(active.closest('[role="dialog"]'))
      if (cameFromTheCard) origin.focus()
      return
    }
    const region = tableRef.current?.querySelector<HTMLElement>('[role="region"], .overflow-auto')
    const row = tableRef.current?.querySelector<HTMLElement>(`tr[data-row-id="${CSS.escape(selectedId)}"]`)
    if (row) {
      row.scrollIntoView({ block: 'nearest' })
      if (document.activeElement === row) originRowRef.current = row
      return
    }
    const index = records.findIndex((record) => record.id === selectedId)
    if (index >= 0 && region) region.scrollTop = index * LIVE_ROW_HEIGHT_PX
  }, [selectedId, records])

  return (
    <div
      data-slot="live-list-panel"
      data-width-state={widthState}
      // Figma's panel is WHITE, not the page's grey-50 (visual #11), and the
      // vertical rhythm is tighter than the previous gap-2 (visual #40:
      // search y64 · count y107 · table card y122).
      // 16px inline padding (designer round 5): at px-3 the meta row's
      // "Sync With Map" switch sat flush against the panel's trailing edge
      // and the knob was clipped by the panel's own overflow.
      className={className ?? 'relative flex h-full min-h-0 flex-col gap-1.5 bg-card px-4 pt-4 pb-3'}
    >
      <div className="flex items-center gap-2">
        <LiveSearchField
          value={search}
          onChange={onSearchChange}
          placeholder="Search"
          inputRef={searchInputRef}
          className="flex-1"
        />
        {filterSlot}
      </div>

      {kindChipsSlot}

      {chipsSlot}

      {/* Count line (SPEC §2.2 + reference-video rule 2). ONE string in
          every state: "Showing 6 items out of 1,000" — comma-formatted, both
          numbers in primary.

          While the skeleton is up the line renders a SKELETON BAR, never a
          number (round-6 UX gate U3): the records have not arrived, so the
          fleet is not empty — it is unknown, and this is an `aria-live`
          region, so a rendered "Showing 0 items" is ANNOUNCED to a screen
          reader before the real count replaces it. Announcing an empty fleet
          to a fleet manager, even for the 1.3s the skeleton is up, is the one
          thing this line must never do. `aria-busy` holds the region while
          the placeholder is in it, and the placeholder carries no text, so
          nothing is announced until the count is true.

          The element is a `<div>` rather than a `<p>` purely so the DS
          `Skeleton` (a block element) nests legally; Tailwind's preflight
          zeroes `p` margins, so the settled state's box is unchanged. */}
      {/* The meta row lives OUTSIDE the table's horizontal scroll container
          (below) and never overflows the panel: the count line is the only
          shrinkable child (`min-w-0` + truncation), so the switch keeps its
          intrinsic width inside the panel's 16px padding at every viewport
          (designer round 5 clipping fix). */}
      <div data-slot="live-list-meta" className="flex w-full max-w-full items-center justify-between gap-2">
        <div
          data-slot="live-list-count"
          aria-live="polite"
          aria-busy={showSkeleton || undefined}
          className="min-w-0 flex-1 truncate text-caption text-gray-400"
        >
          {showSkeleton ? (
            <Skeleton variant="custom" data-slot="live-list-count-skeleton" className="my-0.5 h-3 w-28 rounded-xs" />
          ) : (
            /* Default: `Showing {M} items`. Narrowed by a filter, the
               search box or the sync-with-map viewport: `Showing {N} items
               out of {M}`. Never the redundant "out of" form when nothing is
               narrowing (designer, round 5). */
            narrowed ? (
              <>
                Showing <span className="font-semibold text-primary">{shown} items</span> out of{' '}
                <span className="font-semibold text-primary">{total}</span>
              </>
            ) : (
              <>
                Showing <span className="font-semibold text-primary">{total} items</span>
              </>
            )
          )}
        </div>

        {/* "Sync With Map" inline toggle (figma live-monitoring spec §1
            list-meta row / AC-2) — reads/writes the SAME
            `customize.syncListWithMap` state `CustomizeViewDrawer` already
            owns (threaded in by `LiveHybridView`), just surfaced where the
            Figma screenshot shows it. Default stays whatever the caller's
            state defaults to (unchanged by this row). When OFF, a tooltip on
            hover/focus explains the consequence (UX-NOTES #3) instead of a
            silent no-op — reusing the same ~120ms `TooltipProvider`
            convention as `NavRail`, not a second tooltip pattern. */}
        {onSyncListWithMapChange ? (
          <div data-slot="live-list-sync" className="flex shrink-0 items-center gap-1.5">
            <span id="live-list-sync-label" className="whitespace-nowrap text-caption font-semibold text-gray-400">
              Sync With Map
            </span>
            {syncListWithMap ? (
              <Switch
                size="md"
                checked={syncListWithMap}
                onCheckedChange={onSyncListWithMapChange}
                aria-labelledby="live-list-sync-label"
              />
            ) : (
              <TooltipProvider delayDuration={120}>
                <Tooltip>
                  {/*
                   * QA A4 — the Switch is WRAPPED, never `asChild`-merged
                   * into the trigger. `TooltipTrigger asChild` clones its
                   * child and writes its OWN `data-state` (open/closed) onto
                   * it, clobbering the Switch's `checked`/`unchecked` state
                   * attribute. Every one of the Switch's
                   * `data-[state=unchecked]:*` rules — the grey track and its
                   * hairline outline — therefore matched nothing, and the OFF
                   * switch painted as a bare white knob on a white panel with
                   * no track at all, reading as a dead control. Giving the
                   * trigger a plain wrapper element keeps the two state
                   * machines on two different nodes.
                   */}
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Switch
                        size="md"
                        checked={syncListWithMap ?? false}
                        onCheckedChange={onSyncListWithMapChange}
                        aria-labelledby="live-list-sync-label"
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    List selection won&apos;t move the map. Turn on to sync.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ) : null}
      </div>

      {/* The pencil is pinned OUTSIDE the table's scrolling column set (UX
          finding 1 / visual #12): as a header CELL it was auto-grown past the
          card border by the SPEED column and clipped away, leaving the
          Columns popover with no trigger in the default view. It keeps
          Figma's look — a 12×12 glyph in a 26px cell at the header's right
          end — but is now present at every viewport whenever rows render. */}
      <div ref={tableRef} className="relative flex min-h-0 flex-1 flex-col">
        {/* Figma 12:14956 ("Rectangle 17991"): a 92px white fade over the
            table's trailing edge, telling the reader the column set continues
            past the panel. Rendered ONLY while the region can actually scroll
            further inline — a permanent veil over content that has nowhere to
            go reads as a rendering bug, not an affordance. Purely decorative
            and click-through. */}
        {scrollFade ? (
          <div
            aria-hidden="true"
            data-slot="live-list-scroll-fade"
            className="pointer-events-none absolute inset-y-0 end-0 z-10 w-23 bg-gradient-to-l from-card via-card/85 to-transparent rtl:bg-gradient-to-r"
          />
        ) : null}
        <DataTable<EntityRecord>
        columns={effectiveColumns}
        data={records}
        getRowId={(row) => row.id}
        isCustomizable={false}
        columnOrder={effectiveColumnKeys}
        onColumnOrderChange={() => {}}
        onRowClick={
          onSelect
            ? (row) => {
                const active = document.activeElement as HTMLElement | null
                originRowRef.current = active?.closest('tr') ?? null
                onSelect(row.id === selectedId ? null : row.id)
              }
            : undefined
        }
        hasFocusableRows
        selectedIds={selectedId ? [selectedId] : undefined}
        rowHeight="md"
        // Figma's dense list pane (F1 `540:11164`): a 32px header row and
        // tighter cell padding so three real columns fit the ~440px pane
        // instead of crushing into truncation. A generic `DataTable` density,
        // not a pane-specific override.
        density="compact"
        stickyFirstCol
        // UX-2: windowed rows for the 1,000-record seed at a fixed 48px
        // rhythm (`h-12` on every body row + a 48px virtual estimate).
        virtualized
        estimateRowHeight={48}
        loading={showSkeleton}
        loadingState={<LiveListSkeleton rows={12} columns={Math.max(effectiveColumnKeys.length - 1, 2)} />}
        // U1: this button unmounts the moment it succeeds (the empty state
        // is replaced by rows), so it hands focus to the search input — the
        // same target the in-field ✕ uses.
        emptyState={
          viewportSynced && search === '' ? (
            <LiveListNoResults
              title="No vehicles in the current map area"
              hint="Pan or zoom out the map to bring vehicles into view."
            />
          ) : (
            <LiveListNoResults
              onClearSearch={
                search !== ''
                  ? () => {
                      onSearchChange('')
                      handOffFocus(searchInputRef.current)
                    }
                  : undefined
              }
            />
          )
        }
        ariaLabel={`${config.name} vehicles`}
        scrollRegionLabel={`${config.name} vehicle table`}
        className={cn(
          'min-h-0 flex-1 [&_tbody_tr]:h-12',
          // 32px header row with grey-400 captions (visual #36, #40).
          '[&_thead_th]:h-8 [&_thead_th]:py-0 [&_thead]:text-gray-400',
          // Figma 11:6054 header captions: 10px Bold, uppercase, 0.8px tracking,
          // grey-400 at 70% opacity.
          '[&_thead_th]:text-[0.625rem] [&_thead_th]:font-bold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.08em] [&_thead_th]:text-gray-400/70',
          // Figma's captions are single-line (`540:11164`); a wrapped
          // caption also pushed the header row past its 32px density.
          '[&_thead_th]:whitespace-nowrap',
          // Reserve the pinned pencil's 26px gutter so no caption runs under it.
          '[&_thead_th:last-child]:pe-8',
          // QA A5 — the pencil is pinned to the CARD's trailing edge, i.e.
          // OVER the scroll region, so it painted on top of whatever column
          // happened to be scrolled under it: at the default width that was
          // the SPEED caption, which read as a truncated "SPE". The scroll
          // region now carries a trailing gutter the width of the pencil, so
          // the column set ends before the pencil starts and no caption can
          // ever run beneath it. The columns themselves keep their SPEC
          // min-widths and still scroll inside the region (A20).
          '[&_[role=region]]:pe-6.5',
          // QA A5 — the header row sticks to the top of the vertical scroll
          // so the captions stay legible while the rows scroll under them.
          // `bg-card` is required: a transparent sticky header lets rows
          // show through it.
          '[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-card',
          // QA A5 — a THIN but VISIBLE scrollbar on the region: the column
          // set overflows by design, and on overlay-scrollbar platforms
          // there was no resting affordance at all telling the reader more
          // columns existed.
          '[&_[role=region]]:[scrollbar-width:thin]',
          // Row hover (AC-3): distinct from the selected tint below, and
          // does not override it when both apply — `:hover` and
          // `[data-selected]` target the SAME element and Tailwind emits
          // both declarations, so a selected+hovered row keeps the
          // selected tint (later `bg-primary/10` rule wins in the cascade
          // by source order, both being single-class-specificity).
          '[&_tbody_tr:hover]:bg-muted/50',
          // Selected row = the Figma blue tint (primary-lightest), not the
          // table default's neutral wash (SPEC §2.2, row 1 of 495:2998).
          '[&_tbody_tr[data-selected]]:bg-primary/10',
          // UX-1 / AC-4: the table's own region already scrolls
          // horizontally (`overflow-auto` on `DataTable`'s scroll wrapper) —
          // columns keep their min-widths and never crush. The VEHICLE
          // identity column (always first — `defaultLiveListColumns` puts
          // the identity col first) stays pinned via `stickyFirstCol` above,
          // which owns the sticky positioning + opaque/state-driven
          // background natively (A23 — a fixed `bg-card` here used to defeat
          // the row tint, reading as two blocks with a seam at the sticky
          // boundary). This panel's tint is its own Figma-specific colour
          // (`bg-muted/50` hover / `bg-primary/10` selected, not the table's
          // plain default) so the sticky cell needs the SAME override,
          // scoped to the sticky cell with a compound selector so it wins
          // over the base `DataTable` sticky tint regardless of cascade
          // order.
          // ...via the sticky cell's `::before` overlay, never its own
          // background: these tints are ALPHA, and a sticky cell painted with
          // an alpha background lets the columns scrolling underneath it show
          // through. `DataTable`'s `STICKY_CELL_BASE` keeps `bg-card` on the
          // element and puts the tint on the overlay for exactly this reason;
          // overriding the overlay keeps that guarantee intact.
          '[&_tbody_tr:hover>td:first-child]:before:bg-muted/50',
          '[&_tbody_tr[data-selected]>td:first-child]:before:bg-primary/10',
          // Empty body only: stretch the TABLE to the scroll viewport so the
          // single empty-state `<td>` fills it and `LiveListNoResults`' own
          // `h-full` can centre inside the real available height (round-3
          // UX #3 — the block stranded ~200px above centre because a `<td>`
          // is content-height).
          records.length === 0 && !showSkeleton && '[&_table]:h-full',
        )}
        />
        {/* The Columns popover has nothing to customize while the mixed
            Name·ID·Type·Location columns are showing (task §2) — a fixed
            shape, not a `columns`-driven set — so the trigger is withheld
            rather than opening a popover that edits a column set the table
            isn't even rendering. */}
        {!mixedColumns ? (
          <button
            type="button"
            aria-label="Customize columns"
            title="Customize columns"
            onClick={() => setColumnsOpen((open) => !open)}
            data-slot="live-columns-trigger"
            style={{ insetInlineEnd: '1px' }}
            className="absolute top-px z-20 flex h-8 w-6.5 items-center justify-center border-b border-border bg-card text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="size-3" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {!mixedColumns ? (
        <LiveColumnsPopover
          open={columnsOpen}
          onOpenChange={setColumnsOpen}
          catalog={catalog}
          value={shownColumns ?? columns}
          onChange={onColumnsChange}
        />
      ) : null}
    </div>
  )
}

LiveListPanel.displayName = 'LiveListPanel'
