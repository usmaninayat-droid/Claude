import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { Skeleton, type SortState } from '@fams/ui-kit'
import { getComponentRenderer } from '@fams/v5-composer'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { cn } from '../../lib/cn'
import { handOffFocus } from '../../lib/focus-handoff'
import { ListView } from '../ListView'
import { SortMenuButton } from '../SortMenuButton'
import {
  deriveLiveMixedRow,
  filterLiveRecordsByKind,
  hasLiveWorkforce,
  type LiveEntityKindFilter,
} from '../live-data'
import { CustomizeViewDrawer, defaultCustomizeViewState, type CustomizeViewState } from './CustomizeViewDrawer'
import { countActiveLiveFilters } from './live-filter-model'
import { liveColumnLabel, liveListColumnCatalog } from './live-list-model'
import { LiveColumnsPopover } from './LiveColumnsPopover'
import { LiveFilterChips } from './LiveFilterChips'
import { LiveFiltersPopover } from './LiveFiltersPopover'
import { LiveKindChips } from './LiveKindChips'
import { LiveListNoResults, LiveListSkeleton } from './live-list-states'
import { LiveSearchField } from './LiveSearchField'
import { FillLevelCell, liveSpeedCellText } from './LiveListPanel'
import {
  LIVE_MIXED_COLUMNS,
  LIVE_MIXED_COLUMN_LABELS,
  LiveMixedLocationCell,
  LiveMixedNameCell,
  LiveMixedTextCell,
} from './live-mixed-columns'
import { HighlightedText, LiveVehicleCell } from './LiveVehicleCell'
import { UnsavedChangesToast } from './UnsavedChangesToast'
import { useLiveViewState } from './use-live-view-state'
import type { LiveViewStateSnapshot } from './live-view-state'

/**
 * LiveListOnlyView — the live-monitoring LIST-ONLY view body (figma SPEC v2
 * §2.10, frames 540:69908 / 582:20794–25576 / 555:39222): the generic
 * `ListView` wrapped with the live surfaces' own in-card toolbar — search
 * (focus float-label), the All-Filters funnel + applied chips, the SORT BY
 * menu button — an aria-live count line, the Columns pencil popover (290px,
 * `ColumnCustomizer`) whose edits apply live and raise the unsaved-changes
 * toast, virtualized 48px rows (UX-2), per-column min-widths with the table
 * scrolling horizontally INSIDE the card while the VEHICLE column and header
 * stay sticky (UX-5). Module-internal (used by `ModuleView` for `'list'` on
 * live modules) — not part of the public barrel.
 */
export interface LiveListOnlyViewProps extends Omit<ComponentProps<typeof ListView>, 'visibleCols' | 'headerAction'> {
  config: EntityConfig
  /**
   * Controlled Customize View drawer visibility — `ModuleView` opens it from
   * the active tab's `⋮` menu, exactly as it does for the hybrid body. The
   * list-only drawer renders `variant="list"`, which omits ALL map/widget
   * toggles and the List View State row (SPEC §2.10 / §3.27, 540:69908).
   */
  customizeOpen?: boolean
  onCustomizeOpenChange?: (open: boolean) => void
  /** The active saved view's name — seeds the drawer's name input. */
  viewName?: string
  /**
   * CONTROLLED Customize View state — same contract as `LiveHybridView`'s:
   * `ModuleView` owns it so the drawer, the active tab's `⋮` menu and the
   * pin/lock tab decorations all read ONE model. Omit for uncontrolled.
   */
  customizeState?: CustomizeViewState
  onCustomizeStateChange?: (state: CustomizeViewState) => void
  /** Reports unsaved column/customize edits (the menu's dirty-only
   *  `Save View` row, 495:59898). */
  onDirtyChange?: (dirty: boolean) => void
  /** Increment to persist pending edits (the menu's `Save View`). */
  saveSignal?: number
  /** Drawer footer Delete View — the caller removes the saved view. */
  onDeleteView?: () => void
  /**
   * The `Export` control (an icon button opening the Export CSV/Excel menu) —
   * same slot contract as `ModuleViewFilters.exportAction`. Rendered flush
   * right of the search/filter/sort row (2026-08-31 P0 fix — this live-gated
   * list body had NO export/create actions at all: `ModuleView` withholds its
   * page-level `ModuleViewFilters` for every live module, per this file's own
   * docblock, so those actions have to live HERE instead). Omit to render
   * neither slot — unchanged behavior for any existing caller.
   */
  exportAction?: ReactNode
  /** Trailing "create record" action, right-aligned after `exportAction`. */
  createAction?: ReactNode
  /**
   * CONTROLLED view state — the same per-saved-view snapshot `LiveHybridView`
   * takes, held by `ModuleView` so column edits, search and saved filters
   * survive a view-tab switch (round-4 finding F1). Omit for uncontrolled.
   */
  viewState?: LiveViewStateSnapshot
  onViewStateChange?: (state: LiveViewStateSnapshot) => void
}

export function LiveListOnlyView({
  config,
  records,
  sort,
  onSortChange,
  customizeOpen = false,
  onCustomizeOpenChange,
  viewName = 'List View',
  customizeState,
  onCustomizeStateChange,
  onDirtyChange,
  saveSignal = 0,
  onDeleteView,
  viewState,
  onViewStateChange,
  exportAction,
  createAction,
  ...listProps
}: LiveListOnlyViewProps) {
  // All/Vehicle/Workforce chips (task §1) — same uncontrolled, per-mount
  // local state `LiveHybridView` uses (see that component's docblock for the
  // full reasoning: deliberately outside `viewState`'s saved-view snapshot).
  // The List View tab is its OWN mounted component, so this is independent
  // of the Hybrid tab's chip selection, exactly like every other piece of
  // this view's own local state already is.
  const workforceAvailable = hasLiveWorkforce(config)
  const [kindFilter, setKindFilter] = useState<LiveEntityKindFilter>('all')
  const kindFilteredRecords = useMemo(
    () => (workforceAvailable ? filterLiveRecordsByKind(config, records, kindFilter) : records),
    [workforceAvailable, config, records, kindFilter],
  )
  const mixedColumns = workforceAvailable && kindFilter !== 'vehicle'

  // The in-card search + All Filters + column state (SPEC §2.10 carries the
  // hybrid's items 5–11 behaviors; the page-level toolbar is suppressed for
  // live modules) — the SAME snapshot the hybrid panel uses, so `ModuleView`
  // can hold one per saved view and nothing is lost on a tab switch (F1).
  const live = useLiveViewState(config, kindFilteredRecords, { state: viewState, onStateChange: onViewStateChange })
  const columns = live.state.draftColumns
  const setColumns = (next: string[] | null) =>
    next === null ? live.revertColumns() : live.setColumns(next)
  const dirty = live.columnsDirty || live.customizeDirty
  const customizeBaseline = live.state.customizeBaseline

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
  if (kindFilteredRecords.length > 0) seenRecords.current = true
  const showSkeleton = listProps.loading || (!seenRecords.current && kindFilteredRecords.length === 0)

  /** Round-6 UX gate U1 — hand-off target for both self-removing clears. */
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const catalog = useMemo(() => liveListColumnCatalog(config), [config])
  const defaultColumns = useMemo(() => config.listcolumns.map((p) => p.col), [config])
  // `deriveColumns` only derives from `listcolumns` — augment the config with
  // a bare placement per remaining systemcolumn so the popover can toggle ON
  // any blueprint field (spec §2.6's grouped off-by-default catalog), with
  // `visibleCols` as the actual whitelist+order.
  const augmentedConfig = useMemo<EntityConfig>(() => {
    const listed = new Set(config.listcolumns.map((p) => p.col))
    const extras = config.systemcolumns.filter((c) => !listed.has(c.col))
    if (extras.length === 0) return config
    return {
      ...config,
      listcolumns: [...config.listcolumns, ...extras.map((c) => ({ id: c.id, col: c.col }))],
    }
  }, [config])
  // The mixed "All"/Workforce columns (task §2): a SEPARATE synthetic config
  // whose `systemcolumns` PREPEND the four mixed cols (so `.find()`'s
  // first-match wins over the real `title` systemcolumn's own "Vehicle"
  // label) — this is what makes `ListView`'s native header row, and
  // `liveColumnLabel`'s `sortOptions` labels below, read "Name" instead of
  // "Vehicle" while the mixed shape is showing, with no changes to either.
  const mixedConfig = useMemo<EntityConfig>(() => {
    const mixedSystemColumns = LIVE_MIXED_COLUMNS.map((col) => ({
      id: col,
      col,
      name: LIVE_MIXED_COLUMN_LABELS[col],
      type: 'SmallText' as const,
    }))
    return {
      ...config,
      systemcolumns: [...mixedSystemColumns, ...config.systemcolumns],
      listcolumns: mixedSystemColumns.map((c) => ({ id: c.id, col: c.col })),
    }
  }, [config])
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [internalCustomize, setInternalCustomize] = useState<CustomizeViewState>(() =>
    defaultCustomizeViewState(viewName),
  )
  const customize = customizeState ?? internalCustomize
  const setCustomize = (next: CustomizeViewState) => {
    if (customizeState === undefined) setInternalCustomize(next)
    onCustomizeStateChange?.(next)
  }
  useEffect(() => {
    onDirtyChange?.(dirty)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report on change
  }, [dirty])
  const savedSignalRef = useRef(saveSignal)
  useEffect(() => {
    if (saveSignal === savedSignalRef.current) return
    savedSignalRef.current = saveSignal
    live.saveColumns()
    live.patch({ customizeBaseline: null, customizeDirty: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce seam
  }, [saveSignal])

  // Controlled sort (ModuleView round-trips it through ViewState) with a
  // local fallback for standalone use.
  const [localSort, setLocalSort] = useState<SortState | null>(null)
  const resolvedSort = sort !== undefined ? sort : localSort
  const changeSort = (next: SortState | null) => {
    setLocalSort(next)
    onSortChange?.(next)
  }

  const visibleCols = useMemo(
    () => (mixedColumns ? [...LIVE_MIXED_COLUMNS] : (columns ?? defaultColumns)),
    [mixedColumns, columns, defaultColumns],
  )
  const sortOptions = useMemo(
    () => visibleCols.map((col) => ({ key: col, label: liveColumnLabel(mixedColumns ? mixedConfig : config, col) })),
    [visibleCols, config, mixedColumns, mixedConfig],
  )

  /*
   * Cell rendering for the list-only table (SPEC §2.10 / 540:69908):
   *  - VEHICLE  → the shared 3D vehicle cell (P0-1.1), never a photo.
   *  - SPEED    → the same one-line dwell/speed pattern the hybrid renders
   *               ("48 km/h · Just Now" / "for 5 mins"), never a bare number
   *               with no unit (visual #26 / UX finding 9).
   *  - a column whose OWN listcolumns placement opts into a named, REGISTERED
   *    component (`LinkView`/`PersonView`/`StatusList`/…, checked via
   *    `getComponentRenderer` — the same field registry `ListView`'s
   *    `EditableCell` resolves through) → falls through to that shared
   *    path below instead of this view's own override, so the placement's
   *    real renderer (an activatable link, an avatar chip, a colored status
   *    pill) draws exactly as it does on every other list surface.
   *
   *    `hasLiveMap` (`ModuleViewBody.tsx`) routes ANY module with
   *    `uiConfig.map.latCol`/`lngCol` through this view — not just true
   *    fleet-telemetry "live monitoring" modules but any coordinate-bound
   *    entity module (Plan Monitoring, incidents, Smart Planning all have map
   *    pins). Before this check, EVERY one of those modules' non-vehicle/
   *    speed/fillLevel columns — including a `LinkView` "Source Plan",
   *    `PersonView` "Driver"/"Reported By", and `StatusList` "Status" — fell
   *    into the blanket text override below and rendered as inert text: no
   *    link, no avatar, no pill (platform bug, 2026-08-31).
   *  - everything else → PLAIN TEXT. Figma renders `Sedan`, `Patrol`, `Blue`
   *    as text; the generic SingleSelect reader drew them as light-blue
   *    dot-chips (visual #27), whose `primary` on `primary-lightest` label
   *    also measures 4.22:1 — under the AA floor (UX finding 10). This
   *    module's own placements name `TextView` — unregistered, so the check
   *    above never matches them — keeping this fix byte-identical for the
   *    original live-monitoring fleet module.
   */
  const map = config.uiConfig.map
  const placementByCol = useMemo(
    () => new Map(config.listcolumns.map((p) => [p.col, p])),
    [config],
  )
  const cellOverrides = useMemo(() => {
    // The mixed "All"/Workforce columns (task §2) — a fixed shape, entirely
    // independent of the blueprint's own listcolumns/component placements.
    if (mixedColumns) {
      const mixed: Record<string, (row: EntityRecord) => ReactNode> = {
        title: (row) => <LiveMixedNameCell config={config} record={row} search={live.search} />,
        mixedId: (row) => <LiveMixedTextCell value={deriveLiveMixedRow(config, row).idLabel} />,
        mixedType: (row) => <LiveMixedTextCell value={deriveLiveMixedRow(config, row).typeLabel} />,
        mixedLocation: (row) => <LiveMixedLocationCell row={deriveLiveMixedRow(config, row)} />,
      }
      return mixed
    }
    const speedBindings = {
      speedCol: map?.speedCol,
      statusCol: map?.statusCol,
      dwellCol: map?.dwellCol,
      statusSinceCol: map?.statusSinceCol,
    }
    const overrides: Record<string, (row: EntityRecord) => ReactNode> = {
      title: (row) => <LiveVehicleCell config={config} record={row} search={live.search} />,
    }
    for (const col of visibleCols) {
      if (col === 'title' || col === map?.activityCol) continue
      if (map?.fillLevelCol && col === map.fillLevelCol) {
        // The SAME bar the hybrid list draws — one cell component, so the two
        // surfaces of one module can never disagree about what a fill level
        // looks like (the list-only view used to print the bare number).
        overrides[col] = (row) => {
          const numeric = Number(row[col])
          if (!Number.isFinite(numeric)) return <span className="text-caption text-foreground">—</span>
          return <FillLevelCell value={numeric} />
        }
        continue
      }
      if (map?.speedCol && col === map.speedCol) {
        overrides[col] = (row) => (
          <span className="block truncate whitespace-nowrap text-caption text-gray-700">
            {liveSpeedCellText(row, speedBindings, 'summary')}
          </span>
        )
        continue
      }
      const componentName = placementByCol.get(col)?.component?.name
      if (componentName && getComponentRenderer(componentName)) continue
      overrides[col] = (row) => {
        const raw = row[col]
        const text = raw == null || raw === '' ? '-' : String(raw)
        return (
          <span className="truncate text-caption text-foreground" title={text}>
            <HighlightedText text={text} query={live.search} />
          </span>
        )
      }
    }
    return overrides
  }, [config, map, visibleCols, live.search, placementByCol, mixedColumns])

  const filtered = live.filtered
  const isFiltered = live.search.trim() !== '' || filtered.length !== kindFilteredRecords.length
  const shown = filtered.length.toLocaleString()
  const total = kindFilteredRecords.length.toLocaleString()

  return (
    /*
     * SPEC §2.10 / 540:69908: the list-only view is a full-width white CARD
     * inset from the shell on a grey-50 page — card left border at 1024-x78
     * against the shell's x62, i.e. a ~28px gutter, with a border and radius
     * on all four sides. Round 2 rendered it full-bleed (white from x119 to
     * x1919, no border). The module body is `bodyInset="flush"` for live
     * modules because the HYBRID map must reach the viewport, so the inset
     * belongs here, on the list-only body itself — and on an INNER wrapper,
     * so the Customize View drawer and the Columns popover keep docking
     * against the body's real edges.
     */
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-7">
      <div className="flex items-center gap-2">
        <LiveSearchField
          value={live.search}
          onChange={live.setSearch}
          placeholder="Search anything here"
          inputRef={searchInputRef}
          className="w-64"
        />
        <LiveFiltersPopover
          open={live.filtersOpen}
          onOpenChange={live.setFiltersOpen}
          groups={live.groups}
          value={live.filterValue}
          onChange={live.setFilterValue}
          tagGroups={live.tagGroups}
          saved={live.savedFilters}
          onSaveFilter={live.saveFilter}
          onRenameFilter={live.renameFilter}
          onDeleteFilter={live.deleteFilter}
        />
        <SortMenuButton options={sortOptions} sort={resolvedSort ?? null} onSortChange={changeSort} />
        {exportAction || createAction ? (
          // Flush-right primary group — same `ms-auto` pattern
          // `ModuleViewFilters`'s own primary group and
          // `hybrid/RecordMapListToolbar.tsx`'s row1 use (WP4 parity).
          <div data-slot="live-list-toolbar-primary-group" className="ms-auto flex shrink-0 items-center gap-2">
            {exportAction}
            {createAction}
          </div>
        ) : null}
      </div>

      {workforceAvailable ? <LiveKindChips value={kindFilter} onChange={setKindFilter} /> : null}

      <LiveFilterChips groups={live.groups} value={live.filterValue} onChange={live.setFilterValue} />

      {/* A skeleton bar, never a number, while the rows are still loading —
          this is an `aria-live` region and "Showing 0 items" for an unknown
          fleet is announced as fact (round-6 UX gate U3). Same treatment as
          the hybrid panel's count line; see `LiveListPanel` for the full
          reasoning and for why the element is a `<div>`. */}
      {/* 2026-08-31 P0 — `uiConfig.hideResultsCount` (the SAME per-module knob
          `ListView`/`KanbanView`/`MapHybridView` already honor) suppresses
          this row too. It rendered unconditionally before: a live-gated
          module (like incidents, bound only for its map pins) had no way to
          opt out of the "Showing N items" line the way every other lens
          already can. */}
      {!config.uiConfig.hideResultsCount ? (
        <div
          data-slot="live-list-count"
          aria-live="polite"
          aria-busy={showSkeleton || undefined}
          className="text-caption text-muted-foreground"
        >
          {showSkeleton ? (
            <Skeleton variant="custom" data-slot="live-list-count-skeleton" className="my-0.5 h-3 w-28 rounded-xs" />
          ) : isFiltered ? (
            <>
              Showing <span className="font-semibold text-primary">{shown} items</span> out of{' '}
              <span className="font-semibold text-primary">{total}</span>
            </>
          ) : (
            // Figma's unfiltered string carries no thousands separator
            // ("Showing 1000 items"); only the filtered line comma-formats.
            <>Showing {kindFilteredRecords.length} items</>
          )}
        </div>
      ) : null}

      <ListView
        {...listProps}
        // QA A10 — the live List View prints its OWN rule-compliant count
        // line above the card ("Showing N items", widening to "Showing N
        // items out of M" only when narrowed). `ListView`'s generic
        // `RecordCountRow` printed a SECOND count inside the card in a
        // different, non-compliant format ("Showing 18 of 18 live
        // monitoring"). Suppressing `totalCount` drops the generic row and
        // leaves exactly one count on the screen.
        totalCount={undefined}
        records={filtered}
        sort={resolvedSort ?? null}
        onSortChange={changeSort}
        config={mixedColumns ? mixedConfig : augmentedConfig}
        visibleCols={visibleCols}
        rowHeight={listProps.rowHeight ?? 'md'}
        // P0-1.1: the VEHICLE column renders the 3D vehicle art + status dot
        // + the record's plate (A22 — never the internal uniqueidentifier)
        // — the SAME cell the hybrid panel uses, never a photo and never
        // the Make-Model title.
        cellOverrides={cellOverrides}
        virtualized
        estimateRowHeight={48}
        stickyFirstCol
        columnMinWidth="7rem"
        loading={showSkeleton}
        loadingState={<LiveListSkeleton rows={14} columns={Math.max(visibleCols.length - 1, 2)} />}
        // U1: the empty-state clear unmounts itself on success, so it hands
        // focus to the search input — the same target as the in-field ✕.
        emptyState={
          <LiveListNoResults
            onClearSearch={
              live.search !== ''
                ? () => {
                    live.setSearch('')
                    handOffFocus(searchInputRef.current)
                  }
                : undefined
            }
          />
        }
        // No Columns popover while the mixed shape is showing (task §2) —
        // a fixed Name·ID·Type·Location set, nothing to customize.
        headerAction={mixedColumns ? undefined : { ariaLabel: 'Customize columns', onClick: () => setPopoverOpen((v) => !v) }}
        // Fixed 48px row rhythm (UX-2), identifiers never wrap mid-number
        // (UX-5), the Activity Overview triplet stays on one line (SPEC
        // §2.2), and the active sort arrow reads primary (582:25576).
        // The trailing `[&_th[aria-sort=none]_svg]:hidden` kills the
        // persistent ↑↓ glyph Figma shows on NO header by default — only the
        // sorted column carries an arrow, and it reads primary (582:25576,
        // visual #28). The glyph itself is `DataTable`'s (ui-kit).
        // The `[&_table]:h-full` half applies only while the body is EMPTY:
        // it stretches the table to the scroll viewport so the empty-state
        // `<td>` fills it and the block centres in the real available height
        // (round-3 UX #3).
        className={cn(
          filtered.length === 0 && '[&_table]:h-full',
          "overflow-hidden rounded-lg border border-border bg-card [&_tbody_tr]:h-12 [&_tbody_td]:whitespace-nowrap [&_[data-slot=activity-overview]]:flex-nowrap [&_th[aria-sort=ascending]_svg]:text-primary [&_th[aria-sort=descending]_svg]:text-primary [&_th[aria-sort=none]_svg]:hidden",
        )}
      />
      </div>

      {!mixedColumns ? (
        <LiveColumnsPopover
          open={popoverOpen}
          onOpenChange={setPopoverOpen}
          catalog={catalog}
          // List-only's popover mirrors ITS OWN nine-column table (540:26784) —
          // the §2.6 `columnsShown` decoupling is a HYBRID-panel concern (the
          // collapsed 3-column table vs the popover's Shown group).
          value={visibleCols}
          onChange={(next) => {
            setColumns(next)
          }}
          className="end-4 top-24 max-h-[calc(100%-7rem)]"
        />
      ) : null}


      <CustomizeViewDrawer
        open={customizeOpen}
        onClose={() => onCustomizeOpenChange?.(false)}
        // §3.27: the list-only drawer omits map + widget toggles entirely.
        variant="list"
        state={{ ...customize, name: customize.name || viewName }}
        onStateChange={(next) => {
          if (!customizeBaseline) {
            live.patch({ customizeBaseline: { ...customize, name: customize.name || viewName } })
          }
          setCustomize(next)
          if (!next.autosave) live.setCustomizeDirty(true)
        }}
        // The drawer's Fields sub-panel edits the SAME visible column set the
        // header pencil does (one source of truth for the table).
        columns={visibleCols}
        onColumnsChange={(next) => {
          setColumns(next)
        }}
        catalog={catalog}
        filterCount={countActiveLiveFilters(live.filterValue)}
        onEditFilters={() => {
          onCustomizeOpenChange?.(false)
          live.setFiltersOpen(true)
        }}
        onDelete={onDeleteView}
      />

      {dirty ? (
        <UnsavedChangesToast
          onRevert={() => {
            live.revertColumns()
            if (customizeBaseline) setCustomize(customizeBaseline)
            live.patch({ customizeBaseline: null, customizeDirty: false })
          }}
          onSave={() => {
            live.saveColumns()
            live.patch({ customizeBaseline: null, customizeDirty: false })
          }}
          onEnableAutosave={() => {
            live.enableAutosave()
            setCustomize({ ...customize, autosave: true })
            live.patch({ customizeBaseline: null, customizeDirty: false })
          }}
        />
      ) : null}
    </div>
  )
}

LiveListOnlyView.displayName = 'LiveListOnlyView'
