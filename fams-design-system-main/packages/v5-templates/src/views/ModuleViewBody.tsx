import type { ReactNode } from 'react'
import type { EntityConfig, EntityRecord, UserContext } from '@fams/v5-composer'
import type { BadgeVariant, SortState } from '@fams/ui-kit'
import type { ProfileTabRenderer } from '../entity-profile/EntityProfile.types'
import { ListView, type ListViewHeaderAction, type ListViewSummaryTile } from './ListView'
import { KanbanView } from './KanbanView'
import { CalendarView } from './calendar/CalendarView'
import { HybridView } from './HybridView'
import { LiveHybridView } from './LiveHybridView'
import { MapHybridView } from './hybrid/MapHybridView'
import { hasRecordMap } from './hybrid/record-map-model'
import { dayPrefill } from './create-prefill'
import { MapView } from './MapView'
import { hasLiveMap } from './live-data'
import { CockpitView } from './cockpit/CockpitView'
import { hasCockpit } from './cockpit/cockpit-model'
import { DispatcherCockpitView } from './consoles/DispatcherCockpitView'
import { FleetConsoleView } from './consoles/FleetConsoleView'
import { TriageConsoleView } from './consoles/TriageConsoleView'
import { WorkforcePulseView } from './consoles/WorkforcePulseView'
import { LiveListOnlyView } from './live/LiveListOnlyView'
import type { CustomizeViewState } from './live/CustomizeViewDrawer'
import type { LiveViewStateSnapshot } from './live/live-view-state'
import { toDisplayMode } from './kanban/kanban-display'
import type { SavedView } from './saved-views'
import type { ViewStateBody } from './use-saved-view-tabs'
import type { CanMove } from './kanban/kanban-model'
import type { ModuleViewActions } from './actions/use-module-view-actions'

/**
 * Everything the active lens needs to render. Every field is documented on
 * `ModuleViewProps` (`ModuleView.tsx`) — this is the internal seam, not a
 * public API, so the docs are not duplicated here.
 */
export interface ModuleViewBodyProps {
  config: EntityConfig
  /** All records — used to resolve a card/row id back to its record. */
  records: EntityRecord[]
  /** The records passing search + filters — what every lens actually renders. */
  filtered: EntityRecord[]
  activeView?: SavedView
  activeState: ViewStateBody
  emit: (state: ViewStateBody) => void
  /** The "Select Preferred View" takeover; when present it replaces the lens entirely. */
  pickerBody: ReactNode
  /** The shared row/bulk/export chrome (`use-module-view-actions`). */
  viewActions: ModuleViewActions
  resolvedSelectable: boolean
  resolvedHeaderAction?: ListViewHeaderAction
  customizeOpen: boolean
  setCustomizeOpen: (open: boolean) => void
  hasDeletableView: boolean
  deleteView: (id: string) => void
  onOpenRecord?: (record: EntityRecord) => void
  /** The live monitoring map's Incidents overlay — see `ModuleView`'s prop doc. */
  incidentsConfig?: EntityConfig
  incidentsRecords?: EntityRecord[]
  onOpenIncident?: (record: EntityRecord) => void
  onCreateRecord?: (prefill?: Record<string, unknown>) => void
  editableCols?: string[]
  onRecordChange?: (col: string, value: unknown, record: EntityRecord) => void
  canMove?: CanMove
  onMove?: (recordId: string, fromStage: string, toStage: string) => void
  tabRenderers?: Record<string, ProfileTabRenderer>
  statusTone?: BadgeVariant
  userContext?: UserContext
  summaryTiles?: ListViewSummaryTile[]
  groupedColumnOrder?: string[]
  /**
   * Overrides the lens's "clear what is narrowing this view" action (G.62).
   * `ModuleView` passes its ONE shared `Clear all` handler while the v2
   * filter panel is mounted, so the panel's header button and the lens's
   * zero-results action dispatch the identical state change. Omitted (every
   * legacy view) → the search+filters reset below, unchanged.
   */
  onClearFilters?: () => void
  /* Live-monitoring seams (merged from the 2026-08-24 live-monitoring cycle).
     `ModuleView` owns this state so it survives a view-tab unmount. */
  loading?: boolean
  customizeFor?: (id: string, label: string) => CustomizeViewState
  setActiveCustomize?: (next: CustomizeViewState) => void
  setDirtyByView?: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void
  saveSignal?: number
  liveStateFor?: (id: string) => LiveViewStateSnapshot
  setLiveStateFor?: (id: string, next: LiveViewStateSnapshot) => void
  /**
   * The page-level "create record" action `ModuleView` builds for
   * `ModuleViewFilters` (2026-08-31 P0 fix) — threaded through here too
   * because a live-gated module's LIST body (`LiveListOnlyView`) renders its
   * OWN in-card toolbar instead (`ModuleView` withholds `ModuleViewFilters`
   * entirely for live modules), and that toolbar had no create/export slot at
   * all until this fix. `viewActions.exportAction` already carries the export
   * side of the same pair.
   */
  createAction?: ReactNode
}

/**
 * renderModuleViewBody — resolves the active view kind to its lens body.
 * [tier-2 internal]
 *
 * Extracted verbatim from `ModuleView`'s own `renderBody` closure (root rule
 * 12's decompose-on-touch: wave A5 added the shared row/bulk chrome to every
 * branch and pushed that file past its budget). Behaviour is unchanged — this
 * is a move, not a rewrite. The kind → body mapping, the metadata-only
 * switches (`hasCockpit`, `hasLiveMap`) and every passthrough are exactly as
 * they were.
 */
export function renderModuleViewBody({
  config,
  records,
  filtered,
  activeView,
  activeState,
  emit,
  pickerBody,
  viewActions,
  resolvedSelectable,
  resolvedHeaderAction,
  customizeOpen,
  setCustomizeOpen,
  hasDeletableView,
  deleteView,
  onOpenRecord,
  incidentsConfig,
  incidentsRecords,
  onOpenIncident,
  onCreateRecord,
  editableCols,
  onRecordChange,
  canMove,
  onMove,
  tabRenderers,
  statusTone,
  userContext,
  summaryTiles,
  groupedColumnOrder,
  onClearFilters,
  loading = false,
  customizeFor,
  setActiveCustomize,
  setDirtyByView,
  saveSignal,
  liveStateFor,
  setLiveStateFor,
  createAction,
}: ModuleViewBodyProps): ReactNode {
    if (pickerBody) return pickerBody
    if (!activeView) return null
    /*
     * The J.57 state seam, resolved ONCE for every lens: the same "is a filter
     * in play" answer, the same record noun, and the same reset. Passing these
     * per lens is what stops a filtered-to-zero board from claiming the module
     * is empty and leaving no way back (round 1's Kanban copy + missing
     * `Clear filters`).
     */
    const lensState = {
      isFiltered: viewActions.isFiltered,
      recordNoun: viewActions.recordNoun,
      onClearFilters: onClearFilters ?? (() => emit({ ...activeState, search: '', filters: {} })),
      onCreateRecord,
      // The `M` in every lens's one "Showing N of M" row (UX E.30) — resolved
      // here because this is the only seam that holds BOTH the full set and the
      // narrowed one.
      totalCount: records.length,
    }
    switch (activeView.kind) {
      case 'kanban': {
        /*
         * Group By (SPEC Addendum AC-6.1..6.4, generalized to Kanban lanes —
         * fix-wave gap: the popover regrouped only the hybrid list's cards,
         * never the Kanban board). Config-driven, reusing the SAME metadata
         * block a module already declares for its Hybrid lens's in-panel
         * toolbar (`uiConfig.map.records.toolbar.groupBy`) rather than
         * inventing a second groupByOptions surface — any module that offers
         * Group By on its Hybrid view now offers the identical options
         * (same fields, same default, same labels) on its Kanban view too,
         * with zero per-module code. A module that never declared that block
         * renders no Kanban Group By control at all (every existing caller
         * unchanged).
         */
        const recordMapGroupBy = config.uiConfig.map?.records?.toolbar?.groupBy
        const kanbanGroupByOptions = recordMapGroupBy?.cols.map((col) => ({
          key: col,
          label: config.systemcolumns.find((c) => c.col === col)?.name ?? col,
        }))
        return (
          <KanbanView
            config={config}
            records={filtered}
            // `kanbanReadOnly: true` (FM-6271 — UCCP Requests & Complaints:
            // "Kanban is READ-ONLY for status — no drag-to-change"; all
            // transitions happen from the detail view instead) overrides the
            // module's own `canMove` to a constant deny, same withholding
            // pattern as `kanbanSelectable` just below — every other
            // kanban-lens module (flag omitted) keeps its existing behavior.
            canMove={config.uiConfig.kanbanReadOnly ? () => false : canMove}
            onMove={onMove}
            onCardClick={(id) => {
              const rec = records.find((r) => r.id === id)
              if (rec) onOpenRecord?.(rec)
            }}
            // Both live in the active view's `ViewState`, so they round-trip
            // through `onStateChange` exactly like filters/search/sort — which
            // is what makes the display mode and the pinned lanes STICKY per
            // view (and survive a lens switch and back).
            displayMode={toDisplayMode(activeState.displayMode)}
            pinnedStages={activeState.pinnedColumns ?? []}
            onPinnedStagesChange={(pinnedColumns) => emit({ ...activeState, pinnedColumns })}
            groupByOptions={kanbanGroupByOptions}
            groupByDefaultKey={recordMapGroupBy?.defaultCol}
            // FM-6271 — the board's grouping is CONTROLLED from the shared
            // `ViewState.groupBy` (module-wide query, see `use-saved-view-tabs`'s
            // `QueryBody`), so switching Kanban⇄List keeps the active grouping
            // exactly like filters/search/sort. `null`/unset falls back to the
            // configured default column (the real pipeline-stage lanes).
            groupBy={activeState.groupBy ?? recordMapGroupBy?.defaultCol ?? 'status'}
            onGroupByChange={(groupBy) => emit({ ...activeState, groupBy })}
            // ONE flat selection set across every column (UX note G.45) — the
            // same set the list lens uses, so the bulk bar's count is the same
            // number on every lens and a bulk delete spanning three stages is
            // one action. `kanbanSelectable: false` (2026-08-31 P0 — pipeline
            // kanban has no bulk actions) withholds BOTH props entirely rather
            // than passing an empty/no-op pair — `KanbanCard` only renders its
            // checkbox when `onSelectedChange` is defined at all (see
            // `KanbanView`'s own docblock), so omission is what actually hides
            // it; the list lens's own `listSelectable` column is untouched.
            selectedIds={
              config.uiConfig.kanbanSelectable === false ? undefined : viewActions.selection?.selectedIds
            }
            onSelectedIdsChange={
              config.uiConfig.kanbanSelectable === false ? undefined : viewActions.selection?.setSelectedIds
            }
            renderCardActions={viewActions.renderCardActions}
            {...lensState}
          />
        )
      }
      /*
       * The three operations-console lenses (2026-09-08). Each is a VIEW
       * KIND over the module's existing type, resolved here exactly like
       * `kanban`/`calendar` — no new module type, no per-module code. Their
       * bodies derive everything from the blueprint the module already
       * carries (`views/consoles/console-model.ts`), so a pipeline opts in
       * by naming the kind in its `views` array and nothing else.
       */
      case 'dispatcher-cockpit':
        return (
          <DispatcherCockpitView
            config={config}
            records={filtered}
            onOpenRecord={onOpenRecord}
            onMove={onMove}
            renderRowActions={viewActions.renderRowActions}
            recordNoun={viewActions.recordNoun}
            isFiltered={viewActions.isFiltered}
            totalCount={records.length}
            onClearFilters={lensState.onClearFilters}
            loading={loading}
            className="h-full min-h-0"
          />
        )
      case 'triage-console':
        return (
          <TriageConsoleView
            config={config}
            records={filtered}
            onOpenRecord={onOpenRecord}
            onMove={onMove}
            onCreateRecord={onCreateRecord ? () => onCreateRecord() : undefined}
            className="h-full min-h-0"
          />
        )
      case 'fleet-console':
        return (
          <FleetConsoleView
            config={config}
            records={filtered}
            onOpenRecord={onOpenRecord}
            onMove={onMove}
            canMove={canMove}
            renderRowActions={viewActions.renderRowActions}
            loading={loading}
            className="h-full min-h-0"
          />
        )
      case 'workforce-pulse':
        // The people lens. `incidentsConfig`/`incidentsRecords` is the
        // existing cross-module seam this surface has; the workforce roster
        // seam (`peopleConfig`/`peopleRecords`) is on the template for a host
        // to wire and deliberately not invented here — the lens derives its
        // roster from the module's own person-bearing column until one is.
        return (
          <WorkforcePulseView
            config={config}
            records={filtered}
            onOpenRecord={onOpenRecord}
            loading={loading}
            className="h-full min-h-0"
          />
        )
      case 'calendar':
        // The generic config-driven calendar lens (SPEC §1.4/§1.5). Which
        // column supplies the date is the view's own `View By` menu over the
        // config's date-typed fields, so nothing is wired per module here.
        return (
          <CalendarView
            config={config}
            records={filtered}
            onOpenRecord={onOpenRecord}
            onCreateRecord={onCreateRecord}
            // A day-cell click starts a create PRE-FILLED with that date
            // (SPEC row 33). The calendar hands back both the day and the
            // column it is currently laid out by, so the prefill targets the
            // field the user was actually looking at — no lens here needs to
            // know which column that is. With no create hook wired, no create
            // affordance is rendered at all rather than a dead cell.
            onCreateAtDate={
              onCreateRecord
                ? (dayKey, dateCol) => onCreateRecord(dayPrefill(config, dateCol, dayKey))
                : undefined
            }
            filtered={Boolean(activeState.search) || Object.keys(activeState.filters ?? {}).length > 0}
            onClearFilters={() => emit({ ...activeState, search: '', filters: {} })}
            className="h-full min-h-0"
          />
        )
      case 'map':
        // The live vehicle map (lazy — maplibre never enters this barrel).
        // A blueprint without coordinate bindings gets MapView's own
        // explanatory empty state rather than a silent ListView.
        return (
          <MapView
            config={config}
            records={filtered}
            onOpenRecord={onOpenRecord}
            // Map View owns the SPEC §2.3 tool set and its Zones/POI drawers
            // itself (round-1 visual #9 / UX finding 2: the map-only view
            // rendered a bare canvas — no search/pin/refresh, no eye-off, no
            // layers/traffic/POI/zones stack).
            showTools
            className="h-full min-h-0"
          />
        )
      case 'hybrid':
        // Cockpit-lens modules (a `uiConfig.cockpit` block ON TOP of the
        // coordinate bindings) get the operations-cockpit hybrid — KPI strip
        // + card queue + live map + status panels (target-7 spec). Same
        // metadata-only switch pattern as `hasLiveMap` below; never a new
        // module type.
        if (hasCockpit(config)) {
          // `onMove` is the flow sheets' guarded status path (report →
          // attention status, replace → resolve status) — the same contract
          // the kanban body uses.
          return (
            <CockpitView
              config={config}
              records={filtered}
              onOpenRecord={onOpenRecord}
              onMove={onMove}
              className="h-full"
            />
          )
        }
        // Modules declaring their RECORDS as the map's subjects
        // (`uiConfig.map.records`, SPEC §1.3) get the generic list+record-map
        // hybrid: priority-keyed pins AND zone polygons per record, the
        // dual-purpose legend, and the two-way map↔list sync. Checked BEFORE
        // `hasLiveMap` because the live hybrid's remaining `*Col` bindings are
        // the fleet-telemetry vocabulary — same metadata-only switch pattern,
        // never a new module type.
        if (hasRecordMap(config)) {
          return (
            <MapHybridView
              config={config}
              records={filtered}
              onOpenRecord={onOpenRecord}
              // ONE flat selection set across every lens (UX note G.45) — the
              // map↔list highlight is a separate question and stays internal.
              selectedIds={viewActions.selection?.selectedIds}
              onSelectedIdsChange={viewActions.selection?.setSelectedIds}
              renderRowActions={viewActions.renderRowActions}
              {...lensState}
              className="h-full min-h-0"
            />
          )
        }
        // Coordinate-bound modules get the live list+MAP hybrid (figma
        // live-monitoring spec §1.2); everything else keeps the original
        // list+detail split. Metadata-driven: the blueprint's
        // `uiConfig.map.latCol/lngCol` is the whole switch.
        if (hasLiveMap(config)) {
          return (
            <LiveHybridView
              config={config}
              records={filtered}
              onOpenRecord={onOpenRecord}
              incidentsConfig={incidentsConfig}
              incidentsRecords={incidentsRecords}
              onOpenIncident={onOpenIncident}
              customizeOpen={customizeOpen}
              onCustomizeOpenChange={setCustomizeOpen}
              viewName={activeView.label}
              customizeState={customizeFor?.(activeView.id, String(activeView.label))}
              onCustomizeStateChange={setActiveCustomize}
              onDirtyChange={(dirty) =>
                setDirtyByView?.((prev) => (prev[activeView.id] === dirty ? prev : { ...prev, [activeView.id]: dirty }))
              }
              saveSignal={saveSignal}
              viewState={liveStateFor?.(activeView.id)}
              onViewStateChange={(next) => setLiveStateFor?.(activeView.id, next)}
              onDeleteView={hasDeletableView ? () => deleteView(activeView.id) : undefined}
              loading={loading}
            />
          )
        }
        return (
          <HybridView
            config={config}
            records={filtered}
            detailMode={onOpenRecord ? 'external' : 'inline'}
            onSelect={(id) => {
              const rec = records.find((r) => r.id === id)
              if (rec) onOpenRecord?.(rec)
            }}
            tabRenderers={tabRenderers}
            userContext={userContext}
            statusTone={statusTone}
            editableCols={editableCols}
            onRecordChange={onRecordChange}
            rowActions={viewActions.renderRowActions}
          />
        )
      default: {
        const listBodyProps = {
          config,
          records: filtered,
          editableCols,
          onRecordChange,
          onRowClick: onOpenRecord,
          sort: activeState.sort ?? null,
          onSortChange: (sort: SortState | null) => emit({ ...activeState, sort }),
          summaryTiles,
          groupByCol: activeState.groupBy ?? null,
          groupedColumnOrder,
          selectable: resolvedSelectable,
          // The bulk bar is wired to the SHIPPED list selection model
          // (`ListView.selectable`/`selectedRowIds`), never a second idiom
          // (UX note L.75).
          selectedRowIds: viewActions.selection?.selectedIds,
          onSelectedRowIdsChange: viewActions.selection?.setSelectedIds,
          rowActions: viewActions.renderRowActions,
          rowHeight: config.uiConfig.listRowHeight,
          loading,
          ...lensState,
        }
        // Live modules' list-only view carries the columns-customization
        // pencil + popover (spec §1.10, round-1 QA `columns-listview-missing`)
        // — same ListView underneath, wrapped with the affordance (it owns
        // its own headerAction, so the metadata fallback doesn't apply).
        //
        // `hasRecordMap` is checked FIRST here too — same precedence the
        // `hybrid` case above already gives it (line ~285) — because a
        // module can bind `uiConfig.map.latCol/lngCol` purely to plot its
        // OWN records on a map (`uiConfig.map.records`, e.g. Incidents'
        // severity-colored pins) without being a live-fleet module. Before
        // this check, ANY coordinate-bound module's default list view fell
        // through to `LiveListOnlyView`, which renders every row's identity
        // cell as `LiveVehicleCell` — 3D vehicle art fused into the
        // title/id cell, plus its mobility status-dot badge (found on
        // Incidents' list: a car icon and a stopped-mobility badge leaking
        // onto a module with no fleet-telemetry vocabulary bound at all).
        // `hasLiveMap` alone stays the right gate for the MAP view itself
        // (`MapView.tsx`) and for the fleet-flavoured `LiveHybridView` —
        // this is narrowly about which body renders the LIST.
        if (hasLiveMap(config) && !hasRecordMap(config))
          return (
            <LiveListOnlyView
              {...listBodyProps}
              customizeOpen={customizeOpen}
              onCustomizeOpenChange={setCustomizeOpen}
              viewName={activeView.label}
              customizeState={customizeFor?.(activeView.id, String(activeView.label))}
              onCustomizeStateChange={setActiveCustomize}
              onDirtyChange={(dirty) =>
                setDirtyByView?.((prev) => (prev[activeView.id] === dirty ? prev : { ...prev, [activeView.id]: dirty }))
              }
              saveSignal={saveSignal}
              viewState={liveStateFor?.(activeView.id)}
              onViewStateChange={(next) => setLiveStateFor?.(activeView.id, next)}
              onDeleteView={hasDeletableView ? () => deleteView(activeView.id) : undefined}
              exportAction={viewActions.exportAction}
              createAction={createAction}
            />
          )
        return (
          <ListView
            {...listBodyProps}
            headerAction={resolvedHeaderAction}
            // UX ruling A6 (run 2026-09-05, W9/P0-1b): the standard module
            // list/grouped-list body must never silently drop a column as
            // the container narrows (C1) — scoped to exactly this render
            // path, NOT `listBodyProps` itself, so `LiveListOnlyView` above
            // (which spreads the SAME `listBodyProps`) keeps its own
            // existing auto-hide behavior unchanged.
            disableColumnAutoHide
            // A6's other half, and the half that matters more. Turning
            // auto-hide off is what MAKES these tables scroll horizontally
            // (PM: scrollWidth 1508 vs clientWidth 1184 @1280) — and a
            // scrolled row whose identity column has left the viewport is
            // anonymous (measured SERVICE at x = -213 @1280 after
            // scrollLeft = 324). Both leading columns pin, in their own
            // lanes. Scoped to this render path only, exactly like
            // `disableColumnAutoHide` above.
            stickyLeadingCols
            // NOT `stickyTrailingCol`. An inset-inline-end pin inside an
            // overflowing scroller sits at the scrollport's end edge at
            // EVERY scroll offset, so at rest it necessarily covers whatever
            // column occupies the last P pixels of the scrollport —
            // measured: the actions cell started at x = 1199 over a STATUS
            // pill spanning 1112→1253, i.e. 54px of `JOB ORDER CREATED`
            // covered at 1280, defeating A7's whole reason for widening that
            // column. Reserving width after the pinned column does not help
            // (the scrollport still shows data across its full width), and
            // the real fix — lifting the pinned lane out of the scrollable
            // track — needs a split-pane table this single-`<table>` build
            // does not have. Until then the `⋮` rides the scroll to the
            // row's end; see `qa/UX-NOTES.md` A6/A7 (amended 2026-09-05).
          />
        )
      }
    }
}
