import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import {
  CalendarDays,
  FileLock,
  House,
  Kanban as KanbanIcon,
  LayoutGrid,
  Link2,
  List as ListIcon,
  ListTree,
  Lock,
  Map as MapIcon,
  Pin,
  Plus,
  Rows3,
  Save,
  Settings,
  Share2,
  SquarePen,
  Trash2,
  Truck,
  Users,
  Icon,
} from '@fams/ui-kit/icons'
import { viewSpecKind, type EntityConfig, type EntityRecord, type FilterFacet, type ViewKind, type ViewSpec } from '@fams/v5-composer'
import { Button, Tooltip, TooltipContent, TooltipTrigger, type BadgeVariant } from '@fams/ui-kit'
import {
  ModuleViewShell,
  type ModuleView as ShellViewTab,
  type ModuleViewMenuItem,
  type ModuleViewType,
} from '../ModuleViewShell'
import type { ProfileTabRenderer } from '../entity-profile/EntityProfile.types'
import { hasLiveMap } from './live-data'
import { hasRecordMap } from './hybrid/record-map-model'
import type { ListViewHeaderAction, ListViewSummaryTile } from './ListView'
import { ModuleViewFilters, isFilterPanelV2Active, type ModuleViewGroupByFacet } from './ModuleViewFilters'
import { useFilterSession } from './filters/use-filter-session'
import type { SelectorRow } from './filters/ExpandableSelectorSheet'
import { applyViewState, type SavedView, type SavedViewsAdapter, type SavedViewsContext, type ViewState } from './saved-views'
import { useSavedViewTabs, type ViewStateBody } from './use-saved-view-tabs'
import { useModuleViewFacets } from './use-module-view-facets'
import { defaultCustomizeViewState, type CustomizeViewState } from './live/CustomizeViewDrawer'
import { EMPTY_LIVE_VIEW_STATE, type LiveViewStateSnapshot } from './live/live-view-state'
import { ViewTypePicker, viewTypeOptionsFromKinds } from './ViewTypePicker'
import type { CanMove } from './kanban/kanban-model'
import { toDisplayMode } from './kanban/kanban-display'
import { useModuleViewActions } from './actions/use-module-view-actions'
import { renderModuleViewBody } from './ModuleViewBody'
import { kindHasGroupBy, resolveGroupByOptions, seedGroupBy } from './group-by'

export interface ModuleViewProps {
  config: EntityConfig
  records: EntityRecord[]
  /**
   * The module's view entries from the blueprint (`module.views`) — the seed
   * tab set. An entry is the bare KIND, or a `{ kind, label?, icon? }` object
   * when the module names its own lens (composer `ViewSpec`) — which is how
   * the operations-center pipeline labels its three console lenses.
   */
  views: ViewSpec[]
  /** Persistence port for the user's saved views. Defaults to none (seed-only). */
  savedViews?: SavedViewsAdapter
  /** Scopes saved-view persistence to one user + module. */
  context: SavedViewsContext

  /** Optional page title (via PageHeader). */
  title?: ReactNode
  /**
   * Header actions (e.g. a "New" button) — a fully custom slot. Takes
   * priority over `onCreateRecord` below when both are given.
   */
  actions?: ReactNode
  /**
   * Zero-boilerplate "Create New" hook for the BESPOKE `ModuleView` path
   * (no `actions` supplied): renders the same generic Button+Plus trigger
   * `V5ModuleSurface` wires for the low-code composer path, without the
   * caller re-implementing it. Fires with no args — the caller owns opening
   * its own `CreationSheet` (or any create surface) and the store write
   * (Rule 8; same "template reports intent, app owns the mutation"
   * contract as `onRecordChange`/`onMove`). Ignored when `actions` is set.
   *
   * The optional argument is a PREFILL keyed by field `col` — a calendar day
   * cell reports the date the user activated (SPEC row 33), and an empty-state
   * create reports nothing. Callers that ignore it keep working unchanged.
   */
  onCreateRecord?: (prefill?: Record<string, unknown>) => void
  /** Label for the default create button. Defaults to `"Create New"`. */
  createLabel?: string

  /**
   * Controlled active-view id (the tab bar's selection). Omit for
   * uncontrolled — the seed's first view is active initially, and the
   * component manages its own selection thereafter. When controlled, drive
   * it back from `onStateChange`'s `viewId` (same controlled/uncontrolled
   * shape as `HybridView`'s `selectedId`).
   */
  activeViewId?: string
  /**
   * Emitted whenever the active view / filters / sort / search change
   * (router wiring) — `state.viewId` is always the ViewState's active saved
   * view, so restoring a persisted `ViewState` (e.g. from a router search
   * param) via `activeViewId={state.viewId}` selects that view.
   */
  onStateChange?: (state: ViewState) => void

  /**
   * The view types the "+"-tab "Select Preferred View" takeover offers
   * (figma new-view spec: options are metadata-driven per module). Defaults
   * to the blueprint's own `views` kinds (de-duplicated) — a module offering
   * MORE creatable kinds than it seeds as tabs passes them here. The hint
   * line under the picker comes from `uiConfig.viewPickerHint` (hidden when
   * the blueprint supplies none).
   */
  availableViewKinds?: ViewKind[]
  /**
   * "Create & Customize" hook (figma new-view spec §interaction): fires with
   * the just-created view AFTER it is appended + activated, so the app can
   * open its own customize surface for the new tab. Independent of this
   * hook, when the created view is the live list+map hybrid the built-in
   * Customize View drawer (figma live-monitoring spec §1.9) opens on the
   * new tab automatically.
   */
  onCustomizeView?: (view: SavedView) => void

  /* Body passthrough */
  onOpenRecord?: (record: EntityRecord) => void
  /**
   * The Live Monitoring map's Incidents overlay — another module's config +
   * records, plumbed straight through to `LiveHybridView`'s Incidents panel
   * (search+filter, severity-coloured pins, eye toggles) and to the map's
   * Incidents tool. Omit and that map surface renders with no Incidents
   * overlay, exactly as before this feature existed — a composition over the
   * existing hybrid/map bodies, never a new view kind.
   */
  incidentsConfig?: EntityConfig
  incidentsRecords?: EntityRecord[]
  /** Incident card click → its detail side sheet (the caller's own opener seam). */
  onOpenIncident?: (record: EntityRecord) => void
  editableCols?: string[]
  onRecordChange?: (col: string, value: unknown, record: EntityRecord) => void
  canMove?: CanMove
  onMove?: (recordId: string, fromStage: string, toStage: string) => void
  tabRenderers?: Record<string, ProfileTabRenderer>
  statusTone?: BadgeVariant
  userContext?: import('@fams/v5-composer').UserContext
  /**
   * Resolves an Assignee-field raw value (a user id) to a display name for
   * the toolbar's Assignee split-dropdown (finding: dropdown showed raw
   * ids). Omit to show the raw stored value — generic across any module
   * with an `Assignee`-typed field, not ticketing-specific.
   */
  resolveAssigneeName?: (id: string) => string | undefined
  /**
   * Per-person display extras for the Assignee panel's rows (Figma
   * "Filter By You" `33534:26092`): `resolveAssigneeDetail` supplies the muted
   * secondary line (an email in the design), `resolveAssigneeAvatarUrl` a
   * photo. Both optional; a host that only knows names is unaffected and the
   * rows fall back to hashed initials with no second line.
   */
  resolveAssigneeDetail?: (id: string) => string | undefined
  resolveAssigneeAvatarUrl?: (id: string) => string | undefined
  /**
   * Rows for an `expandable` `kind: 'entity'` filter facet's side sheet
   * (FAMILY C / WAVE C5). The DS layer holds only THIS module's records, so
   * the default resolver hands the sheet exactly those; a host that can read
   * the referenced entity (the demo shell's relational store, a real API)
   * passes its own resolver and wins. Sync array or promise, either way.
   */
  resolveExpandRows?: (facet: FilterFacet) => SelectorRow[] | Promise<SelectorRow[]>

  /**
   * Stat cards rendered above the `list` view's table (figma-spec-list.md
   * §2). Passed straight through to `ListView.summaryTiles` — see that
   * prop's doc (on `ListView.tsx`) for the recommended blueprint-derivation
   * contract (`uiConfig.listSummary`). Ignored for non-list view kinds
   * (kanban/hybrid have no stat-card row in the spec). Omit for none.
   */
  summaryTiles?: ListViewSummaryTile[]
  /**
   * Grouped-mode-only column order for the `list` view (figma-spec-list.md
   * §4). Passed straight through to `ListView.groupedColumnOrder` — see the
   * recommended `uiConfig.listGroupedColumns` blueprint shape documented
   * there. Omit to keep the default column order while grouped.
   */
  groupedColumnOrder?: string[]
  /**
   * The list view's trailing header-only pencil/edit affordance — see
   * `ListView.headerAction`. Pass this explicitly when a real `onClick` is
   * needed; omit to fall back to `uiConfig.listHeaderAction` (renders the
   * default Pencil glyph with no click behavior, metadata-only).
   */
  headerAction?: ListViewHeaderAction
  /**
   * Leading checkbox selection column for the `list` view — see `ListView.
   * selectable`. Omit to fall back to `uiConfig.listSelectable`.
   */
  selectable?: boolean
  /**
   * The app's delete seam for the shared row menu and the bulk action bar —
   * fires with the record ids to delete, AFTER the user confirmed (the
   * confirmation dialog is the template's; the mutation is the app's, Rule 8's
   * same "template reports intent" contract as `onMove`/`onRecordChange`).
   * Without it neither Delete affordance renders at all: a menu item that
   * cannot act is exactly the defect `Archive` is explicitly labelled as, and
   * must not be created by accident.
   */
  onDeleteRecords?: (recordIds: string[]) => void

  /**
   * Data-loading flag (the app/boot layer's seam — Rule 8: the template
   * never fetches). While true, the view bodies render their skeleton
   * states: the live hybrid's skeleton list rows (SPEC v2 495:25945), the
   * live list-only skeleton table (555:39222), and `ListView`'s generic
   * skeleton elsewhere. Omit/false for the synchronous-demo default.
   */
  loading?: boolean

  /**
   * CONTROLLED live view state, keyed by saved-view id — the columns (saved
   * + draft), divider width, search, saved filters, drawer and eye-off
   * toggles of each live view body.
   *
   * `ModuleView` holds this map itself by default, which is the whole point:
   * a view-tab switch unmounts the body, and while the state lived INSIDE the
   * body `Save`, `Save View` and `Enable Autosave` silently discarded the
   * edited column set on the way back (round-4 finding F1). Holding it here
   * makes it live as long as the module does and keeps each view's state its
   * own.
   *
   * Pass it (with `onLiveViewStateChange`) to back the same state with real,
   * durable storage — this pair IS the persistence seam. The design system
   * never reads or writes storage itself (rule 8).
   */
  liveViewState?: Record<string, LiveViewStateSnapshot>
  onLiveViewStateChange?: (next: Record<string, LiveViewStateSnapshot>) => void
}

const VIEW_KIND_TO_TYPE: Partial<Record<ViewKind, ModuleViewType>> = {
  list: 'list',
  // Same list-shaped tab as `list` — the two kinds share one lens body and
  // differ only in whether grouping is seeded (`group-by.ts`).
  'grouped-list': 'list',
  kanban: 'kanban',
  hybrid: 'hybrid',
  grid: 'grid',
  map: 'map',
  // The operations-console lenses are hybrid-SHAPED tabs (a split surface,
  // not a plain table) — `ModuleViewType` is the shell's tab-shape
  // vocabulary, and none of the three warrants a new shape.
  'dispatcher-cockpit': 'hybrid',
  'triage-console': 'hybrid',
  'fleet-console': 'hybrid',
  'workforce-pulse': 'hybrid',
}

/**
 * Leading icon per view-tab kind (figma-spec-kanban.md §3 view-tabs row —
 * every tab carries a leading glyph). `'calendar'` IS a real `ViewKind`
 * (`composition.ts`) and now has a real body — `views/calendar/CalendarView`,
 * resolved by `renderBody` below.
 */
const VIEW_TAB_ICON: Partial<Record<ViewKind | 'calendar', ComponentType<{ className?: string }>>> = {
  list: ListIcon,
  'grouped-list': ListTree,
  kanban: KanbanIcon,
  hybrid: Rows3,
  grid: LayoutGrid,
  map: MapIcon,
  calendar: CalendarDays,
  // Defaults only — a blueprint's `ViewSpec.icon` overrides these per module
  // (see `tabIconFor` below).
  'dispatcher-cockpit': Rows3,
  'triage-console': ListTree,
  'fleet-console': Truck,
  'workforce-pulse': Users,
}

/**
 * The tab's leading glyph: the blueprint's OWN `ViewSpec.icon` name when the
 * module named one, else the kind's default component above.
 *
 * The blueprint side is a NAME (it travels through JSON), so it resolves
 * through the generic `Icon` component; the returned wrapper matches the
 * `ComponentType<{ className?: string }>` shape the shell's tab strip
 * already expects, so nothing downstream branches on which side won.
 */
function tabIconFor(view: SavedView): ComponentType<{ className?: string }> | undefined {
  const name = view.icon
  if (!name) return VIEW_TAB_ICON[view.kind]
  return function ViewTabIcon({ className }: { className?: string }) {
    return <Icon name={name} className={className} />
  }
}

/**
 * ModuleView — the ClickUp-style module container. [tier-2 pattern]
 *
 * Toolbar (search + blueprint filter facets + actions) · a view-tab bar (the
 * module's `views` kinds, plus any user-saved views) · the active view body
 * (`ListView` / `KanbanView` / `HybridView`), all rendered from the crm-golden
 * blueprint. Saved views persist through an injected `SavedViewsAdapter` scoped
 * per user+module — the template NEVER fetches or stores on its own (Rule 8);
 * the in-memory adapter is the demo/test default. The active view + filters +
 * sort + search live in a serializable `ViewState` reported via `onStateChange`
 * so a TanStack Router search param can hold it (wiring is app-side).
 *
 * The view-tab strip's "+" opens the "Select Preferred View" content-area
 * takeover (`ViewTypePicker`, figma new-view spec) instead of instant-creating:
 * the option set derives from the module's metadata (`availableViewKinds`,
 * defaulting to the blueprint `views` kinds), clicking any existing tab or
 * pressing Escape is the implicit cancel, and a module with ZERO views yet
 * shows the picker as its undismissable initial state. State machinery lives
 * in `useSavedViewTabs`; toolbar derivations in `useModuleViewFacets` (both
 * extracted per root rule 12's decompose-on-touch).
 */
export function ModuleView({
  config,
  records,
  views,
  savedViews,
  context,
  title,
  actions,
  onCreateRecord,
  createLabel = 'Create New',
  activeViewId,
  onStateChange,
  availableViewKinds,
  onCustomizeView,
  onOpenRecord,
  incidentsConfig,
  incidentsRecords,
  onOpenIncident,
  editableCols,
  onRecordChange,
  canMove,
  onMove,
  tabRenderers,
  statusTone,
  userContext,
  resolveAssigneeName,
  resolveAssigneeDetail,
  resolveAssigneeAvatarUrl,
  resolveExpandRows,
  summaryTiles,
  groupedColumnOrder,
  headerAction,
  selectable,
  onDeleteRecords,
  loading = false,
  liveViewState,
  onLiveViewStateChange,
}: ModuleViewProps) {
  // Metadata-only fallbacks (figma-spec-list.md §2's selection column +
  // header pencil): an explicit prop always wins (lets an app wire a REAL
  // `headerAction.onClick`), `uiConfig` is the schema-first default so a
  // blueprint alone can turn both on with zero app-layer code.
  const resolvedSelectable = selectable ?? config.uiConfig.listSelectable ?? false
  const resolvedHeaderAction = headerAction ?? (config.uiConfig.listHeaderAction ? {} : undefined)
  // Live modules (coordinate-bound blueprints) carry their search/funnel
  // INSIDE the view bodies (SPEC v2 §2.2/§2.10) — the page-level toolbar row
  // is suppressed for them (P0-3 "extra toolbar row" root cause); every
  // other module keeps it unchanged.
  const liveModule = hasLiveMap(config)
  // Record-map modules that declared the IN-PANEL toolbar
  // (`uiConfig.map.records.toolbar`, SPEC pipelines-hybrid Addendum) get the
  // same page-level toolbar suppression as live modules — but only while the
  // HYBRID lens is active, since that is where the in-panel controls live;
  // their list/kanban lenses keep the page toolbar unchanged.
  const recordMapToolbarModule = hasRecordMap(config) && Boolean(config.uiConfig.map?.records?.toolbar)
  /**
   * 2026-08-31 P0 fix (toolbar unification pass) — a record-map module's
   * `list` view renders through the STANDARD `ListView` body
   * (`ModuleViewBody`'s `hasRecordMap` check takes precedence over
   * `hasLiveMap` for the `default:`/list case), which — unlike
   * `LiveListOnlyView` — owns no toolbar of its own. The blanket
   * `liveModule && kind !== 'kanban'` withholding below predates that
   * routing change and still suppressed the page-level toolbar there too,
   * leaving Incidents' list view with no search/filter/sort/export/create
   * row at all (KPI tiles straight into the table). Only a record-map
   * module's `hybrid` lens has an in-panel replacement toolbar
   * (`RecordMapListToolbar`, gated by `recordMapToolbarModule` below); its
   * `list` lens needs the SAME page-level `ModuleViewFilters` row every
   * non-live module gets — same "All Filters" panel, same Group By icon
   * button, same Sort/Export/Create — for design-lead consistency across
   * list/kanban/hybrid.
   */
  const recordMapModule = hasRecordMap(config)

  const {
    facets,
    searchColumns,
    searchPlaceholder,
    sortOptions,
    groupableOptions,
    listedColumnOptions,
    assigneeFacet,
  } = useModuleViewFacets(
    config,
    records,
    resolveAssigneeName,
    resolveAssigneeDetail,
    resolveAssigneeAvatarUrl,
    // The "Filter for your Tasks" quick-toggle needs to know who "you" is; it
    // comes from the same `userContext` the rules engine already uses, so no
    // new identity source is introduced.
    userContext?.id,
  )

  const {
    tabs,
    activeId,
    activeView,
    activeState,
    emit,
    switchActiveView,
    createView,
    deleteView,
    hasDeletableView,
  } = useSavedViewTabs({ views, savedViews, context, activeViewId, onStateChange })

  /*
   * D-2 — the filter view-session, mounted ONCE per view instance, ABOVE
   * `ModuleViewFilters` (the panel unmounts on every close; `openedBefore` and
   * the frozen option order must survive that). Keyed by module code + active
   * view id, so switching module OR lens resets it, exactly as D-2 specifies.
   */
  const filterSession = useFilterSession(`${config.code}:${activeId}`)
  const filtersPanelConfig = config.uiConfig.filtersPanel
  const filterPanelActive = isFilterPanelV2Active(facets, filtersPanelConfig)
  /*
   * G.62 — ONE `Clear all` handler, shared by the panel's header button and
   * the view's zero-results empty state, so the two can never drift.
   *
   * FIX WAVE C-2 / P1-2: it now clears the SEARCH TERM as well. The zero-results
   * lens action is labelled "Clear the search and filters to see everything in
   * this view", and it left the search box's text — and therefore the empty
   * state itself — exactly as it found them. Because the panel's `Clear all`
   * and the lens action are deliberately the same handler (G.62), both clear
   * both; a view whose search is empty is unaffected either way.
   */
  const clearAllFilters = useCallback(
    () => emit({ ...activeState, filters: {}, search: '' }),
    [emit, activeState],
  )
  /*
   * The expandable-entity sheet's SOURCE rows. Default: this view's OWN
   * records — the only record set the DS layer holds. That default is correct
   * for BOTH facet shapes because `entity-facet.ts` reads it per shape (FIX
   * WAVE C-3 / P0): a same-entity facet takes the records themselves, while a
   * reference facet (`Assignee`, `Single`/`MultiReference`) takes only the ids
   * its own column stores on them and resolves each to the referenced entity's
   * display name through `resolveAssigneeName` — so no second module's record
   * list has to reach this layer. A host that CAN hand over the referenced
   * entity's real rows still passes `resolveExpandRows` and wins.
   */
  const resolveSheetRows = useCallback(
    (facet: FilterFacet): SelectorRow[] | Promise<SelectorRow[]> =>
      resolveExpandRows ? resolveExpandRows(facet) : (records as SelectorRow[]),
    [resolveExpandRows, records],
  )

  /*
   * The "Select Preferred View" takeover (figma new-view spec). `+` opens it;
   * a module with zero views shows it as its initial state (undismissable —
   * no `onCancel`, so Escape is a no-op and there's no dead end). Clicking an
   * existing tab while it's open is the implicit cancel — `handleViewChange`
   * closes it on every switch.
   */
  const [pickerOpen, setPickerOpen] = useState(false)
  const [creatingView, setCreatingView] = useState(false)
  /*
   * Customize View drawer (figma live-monitoring spec §1.9) — opened from
   * the active tab's `⋮` menu; the drawer itself lives inside
   * `LiveHybridView` (it owns the columns/filters/width state the drawer
   * edits), so this is only the open flag + menu entry, and only for the
   * live list+map hybrid body.
   */
  const [customizeOpen, setCustomizeOpen] = useState(false)
  /*
   * ONE Customize View model per saved view, held HERE (SPEC §2.9): the
   * drawer, the active tab's `⋮` menu and the pin/lock tab decorations are
   * three surfaces onto the same state, so growing a second model in the
   * menu would immediately drift. The bodies stay controlled off this map.
   */
  const [customizeByView, setCustomizeByView] = useState<Record<string, CustomizeViewState>>({})
  /*
   * ONE live view-state snapshot per saved view, held HERE for the same
   * reason (F1): `LiveHybridView` / `LiveListOnlyView` are unmounted by a tab
   * switch, so anything they own is destroyed with them. Controlled by the
   * app when `liveViewState` is supplied — that is the durable-storage seam.
   */
  const [internalLiveState, setInternalLiveState] = useState<Record<string, LiveViewStateSnapshot>>({})
  const liveStateMap = liveViewState ?? internalLiveState
  const setLiveStateFor = (id: string, next: LiveViewStateSnapshot) => {
    const merged = { ...liveStateMap, [id]: next }
    if (liveViewState === undefined) setInternalLiveState(merged)
    onLiveViewStateChange?.(merged)
  }
  const liveStateFor = (id: string): LiveViewStateSnapshot => liveStateMap[id] ?? EMPTY_LIVE_VIEW_STATE
  const [dirtyByView, setDirtyByView] = useState<Record<string, boolean>>({})
  const [saveSignal, setSaveSignal] = useState(0)
  const [copiedLink, setCopiedLink] = useState(false)
  useEffect(() => {
    if (!copiedLink) return
    const timer = setTimeout(() => setCopiedLink(false), 2000)
    return () => clearTimeout(timer)
  }, [copiedLink])
  const showPicker = pickerOpen || tabs.length === 0
  // Options are metadata-driven per module: the blueprint's own view kinds
  // (or the explicit `availableViewKinds` override). A zero-metadata module
  // still gets the minimum viable `list` option rather than an empty picker.
  const pickerKinds = availableViewKinds ?? (views.length ? views.map(viewSpecKind) : (['list'] as ViewKind[]))
  const pickerOptions = viewTypeOptionsFromKinds(pickerKinds)

  const handleCreateView = () => setPickerOpen(true)

  const handlePickerCreate = (optionId: string, mode: 'create' | 'customize') => {
    if (creatingView) return
    setCreatingView(true)
    createView(optionId as ViewKind)
      .then((view) => {
        setPickerOpen(false)
        if (mode === 'customize') {
          onCustomizeView?.(view)
          // WP5→WP7 seam: the live hybrid body carries the Customize View
          // drawer (spec §1.9), so Create & Customize lands on the new tab
          // with the drawer already open.
          if (view.kind === 'hybrid' && liveModule) setCustomizeOpen(true)
        }
      })
      .finally(() => setCreatingView(false))
  }

  const handleViewChange = (id: string) => {
    setPickerOpen(false)
    switchActiveView(id)
  }

  const filtered = useMemo(
    () => applyViewState(records, activeState, searchColumns),
    [records, activeState, searchColumns],
  )

  /*
   * The SHARED row/bulk/export chrome (Figma section `33534:29713`'s generic
   * module-view chrome — the `…` row menu, multi-select + bulk bar, and Export
   * as a menu). Assembled once here, for EVERY lens, gated by `uiConfig` +
   * privileges — never per lens and never per module, which is what makes the
   * already-shipped Tickets list gain the bulk bar from this same code path
   * (UX note L.75). Machinery lives in `actions/use-module-view-actions.tsx`.
   */
  const viewActions = useModuleViewActions({
    config,
    filtered,
    userContext,
    viewId: activeId,
    search: activeState.search,
    filters: activeState.filters,
    selectable: resolvedSelectable,
    onDeleteRecords,
  })

  /*
   * Group-by lives in the active view's `ViewState` (round-trips through
   * `onStateChange`, same as filters/search/sort) so a persisted/shared view
   * remembers its grouping. Offered for the two list-shaped kinds — `list`
   * and `grouped-list` (kanban has no group-by; figma-spec-list.md §1 is
   * list-only) — and only when the module actually has a groupable column.
   *
   * The designer's curated option set (overlay `33534:31649`: `Status` /
   * `Service Type` / `None`) is CONFIG, not a new control: the whole
   * `ModuleViewGroupByFacet` → `ViewState.groupBy` → `ListView.groupByCol`
   * chain already exists, and `uiConfig.groupByOptions` only narrows,
   * re-labels, and (via an entry's `default`) SEEDS it. All three decisions
   * live in `group-by.ts`; the contract they hold is that nothing here
   * changes for a `list` view — it still opens ungrouped.
   */
  const curatedGroupBy = config.uiConfig.groupByOptions
  const groupByOptions = resolveGroupByOptions(curatedGroupBy, groupableOptions, listedColumnOptions)
  const seededGroupBy = seedGroupBy(activeView?.kind, activeState.groupBy, groupByOptions, curatedGroupBy)
  // The seed is a DEFAULT, not a write: it is folded into the state the
  // toolbar and the lens body read, and only becomes persisted state once the
  // user changes the grouping themselves (`emit` below).
  const groupedState: ViewStateBody =
    seededGroupBy === activeState.groupBy ? activeState : { ...activeState, groupBy: seededGroupBy }

  const groupByFacet: ModuleViewGroupByFacet | undefined =
    kindHasGroupBy(activeView?.kind) && groupByOptions.length
      ? {
          value: groupedState.groupBy ?? null,
          options: groupByOptions,
          onChange: (value) => emit({ ...groupedState, groupBy: value }),
        }
      : undefined

  const customizeFor = (id: string, label: string): CustomizeViewState =>
    customizeByView[id] ?? defaultCustomizeViewState(label)
  const activeCustomize = activeView ? customizeFor(activeView.id, String(activeView.label)) : null
  const setActiveCustomize = (next: CustomizeViewState) => {
    if (!activeView) return
    setCustomizeByView((prev) => ({ ...prev, [activeView.id]: next }))
  }

  const shellTabs: ShellViewTab[] = tabs.map((v) => {
    const state = customizeByView[v.id]
    return {
      id: v.id,
      label: v.label,
      type: VIEW_KIND_TO_TYPE[v.kind] ?? 'list',
      icon: tabIconFor(v),
      // Tab decorations read the SAME Customize View model the menu writes
      // (495:51049 pinned+locked / 495:53979 locked).
      pinned: state ? state.pinView !== 'off' : undefined,
      locked: state?.protectView,
    }
  })

  /**
   * The active tab's `⋮` menu (SPEC §2.9 / 495:45132), in Figma's order and
   * grouping. Every toggle/dropdown row writes the Customize View model
   * above; `Save View` only exists while the view is dirty (495:59898) and
   * `Copy Link to View` flips to `Copied!` for ~2s (495:56908).
   */
  const liveViewMenuItems = (): ModuleViewMenuItem[] | undefined => {
    if (showPicker || !liveModule || !activeView || !activeCustomize) return undefined
    /*
     * SPEC §2.1 puts the ⋮ on THE active tab whatever its kind, and ratified
     * deviation 5 made it persistent so the menu stays keyboard-reachable —
     * gating it to hybrid/list left Map View with no Rename, Customize,
     * Pin, Protect, Copy Link, Sharing or Delete at all, by pointer or
     * keyboard (round-2 visual #27, UX finding 4).
     *
     * Three rows genuinely have no surface on a map-only view: Rename,
     * Customize View and Sharing & Permissions all land on the Customize View
     * drawer, which lives inside the LIST-bearing bodies (`LiveHybridView` /
     * `LiveListOnlyView`) — `MapView` has no drawer to open. They stay in the
     * row set and render DISABLED with a reason rather than disappearing, so
     * the menu is the same ten rows on every tab.
     */
    const drawerless = activeView.kind !== 'hybrid' && activeView.kind !== 'list'
    const drawerReason = 'Available on the Hybrid and List views for this module'
    const state = activeCustomize
    const set = <K extends keyof CustomizeViewState>(key: K, value: CustomizeViewState[K]) =>
      setActiveCustomize({ ...state, [key]: value })
    const items: ModuleViewMenuItem[] = []
    if (dirtyByView[activeView.id]) {
      items.push({
        id: 'save-view',
        label: 'Save View',
        icon: <Save aria-hidden="true" />,
        onSelect: () => setSaveSignal((n) => n + 1),
      })
    }
    /* Row order, lead glyphs and grouping are Figma 495:45132 read row by row
       (SPEC §2.9): Rename · Customize View │ Autosave · Private · Protect ·
       Pin View `None ›` · Set as Default View `No ›` │ Copy Link · Sharing ·
       Delete View. Every row carries a 16px grey glyph. */
    items.push(
      // Rename lands on the drawer's 307×32 name input (SPEC §2.7).
      {
        id: 'rename',
        label: 'Rename',
        icon: <SquarePen aria-hidden="true" />,
        disabled: drawerless,
        disabledReason: drawerReason,
        onSelect: () => setCustomizeOpen(true),
      },
      {
        id: 'customize',
        label: 'Customize View',
        icon: <Settings aria-hidden="true" />,
        disabled: drawerless,
        disabledReason: drawerReason,
        onSelect: () => setCustomizeOpen(true),
      },
      { kind: 'separator', id: 'sep-1' },
      {
        kind: 'toggle',
        id: 'autosave',
        label: 'Autosave for Me',
        icon: <Save aria-hidden="true" />,
        checked: state.autosave,
        onCheckedChange: (checked) => set('autosave', checked),
      },
      {
        kind: 'toggle',
        id: 'private',
        label: 'Private View',
        icon: <Lock aria-hidden="true" />,
        checked: state.privateView,
        onCheckedChange: (checked) => set('privateView', checked),
      },
      {
        kind: 'toggle',
        id: 'protect',
        label: 'Protect View',
        icon: <FileLock aria-hidden="true" />,
        checked: state.protectView,
        onCheckedChange: (checked) => set('protectView', checked),
      },
      {
        kind: 'submenu',
        id: 'pin-view',
        label: 'Pin View',
        icon: <Pin aria-hidden="true" />,
        value: state.pinView,
        options: [
          { value: 'off', label: 'None' },
          { value: 'for-me', label: 'For Me' },
          { value: 'for-all', label: 'For All' },
        ],
        onValueChange: (value) => set('pinView', value as CustomizeViewState['pinView']),
      },
      {
        kind: 'submenu',
        id: 'default-view',
        label: 'Set as Default View',
        icon: <House aria-hidden="true" />,
        value: state.defaultView ? 'yes' : 'no',
        options: [
          { value: 'no', label: 'No' },
          { value: 'yes', label: 'Yes' },
        ],
        onValueChange: (value) => set('defaultView', value === 'yes'),
      },
      { kind: 'separator', id: 'sep-2' },
      {
        id: 'copy-link',
        label: copiedLink ? 'Copied!' : 'Copy Link to View',
        icon: <Link2 aria-hidden="true" />,
        // 495:56908 flips this row's own label to `Copied!` for ~2s. Closing
        // the menu on select made that confirmation unobservable (round-2
        // interaction 2e) — the row keeps the menu open, exactly as the
        // Customize View drawer's equivalent row already behaves.
        closeOnSelect: false,
        onSelect: () => {
          if (typeof navigator !== 'undefined') void navigator.clipboard?.writeText(window.location.href)
          setCopiedLink(true)
        },
      },
      {
        id: 'sharing',
        label: 'Sharing & Permissions',
        icon: <Share2 aria-hidden="true" />,
        disabled: drawerless,
        disabledReason: drawerReason,
        onSelect: () => setCustomizeOpen(true),
      },
      /*
       * SPEC §2.9 row 10 — the menu used to end at `Sharing & Permissions`,
       * and Delete View has no other entry point in the app (round-2 visual
       * #1, UX finding 5). Grey with a trash icon, NOT red: SPEC §2.7 says so
       * explicitly and 495:45132 renders it in the same grey as its
       * neighbours. A system view cannot be deleted, so on those the row is
       * disabled with the reason rather than dropped.
       */
      {
        id: 'delete-view',
        label: 'Delete View',
        icon: <Trash2 aria-hidden="true" />,
        disabled: !hasDeletableView,
        disabledReason: 'This view is provided by the module and cannot be deleted',
        onSelect: (id) => deleteView(id),
      },
    )
    return items
  }

  const createAction =
    actions ??
    (onCreateRecord ? (
      // UX ruling A3 (run 2026-09-05, W9/P0-2) SUPERSEDES the prior UX note
      // I.54 collapse-order item 3 this comment used to describe: I.54 had
      // the label drop to glyph-only below 1300px, keeping only the
      // accessible name + a tooltip. Measured baseline: at exactly 1280px
      // (this platform's own minimum supported width) that collapsed the
      // single most important action on the screen to a bare `+` — `aria-
      // label`/tooltip stayed intact, so axe never flagged it, but sighted
      // discoverability was gone (C2, P0). A3 is explicit: "the primary
      // create button keeps its text at every width ≥1280px… icon-only
      // primary actions are not permitted on this platform's list headers."
      // `79.9375rem` is 1279px (the token-lint-accepted `rem` form of the
      // largest width still BELOW 1280) — so the label survives at 1280 and
      // above; the collapse mechanism stays in place, retuned, for any
      // narrower width this platform does not yet support/test.
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="lg" onClick={() => onCreateRecord()} aria-label={createLabel}>
            <Plus className="size-4" aria-hidden="true" />
            <span className="max-[79.9375rem]:sr-only">{createLabel}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{createLabel}</TooltipContent>
      </Tooltip>
    ) : undefined)

  // Built once, used from BOTH body seams below: `renderView` (a live active
  // view exists — the "+"-opened takeover) and `emptyState` (zero views yet,
  // so the shell has no active view to call `renderView` with — the picker is
  // then the module's undismissable initial state).
  const pickerBody = showPicker ? (
    <ViewTypePicker
      options={pickerOptions}
      hint={config.uiConfig.viewPickerHint}
      creating={creatingView}
      onCreate={handlePickerCreate}
      // Zero views yet → the picker IS the module (spec: cannot be
      // dismissed); otherwise Escape returns to the active view.
      onCancel={tabs.length > 0 ? () => setPickerOpen(false) : undefined}
    />
  ) : null

  /**
   * The lens body, with the bulk action bar stuck to the TOP of it.
   *
   * UX note G.41 is binding about the placement: the bar is "anchored to the
   * top of the lens body, directly under the toolbar rows, and is sticky within
   * that body's scroller" — not viewport-fixed (it would escape the module and
   * cover the rail's flyouts) and not bottom-docked (it would cover cards and
   * fight the map chrome). `ModuleViewShell`'s body IS that scroller, so the
   * bar is simply its first child with `sticky top-0`: its rect stays put while
   * the lens scrolls under it. The wrapper is only introduced when this module
   * HAS bulk chrome, so every other module's body layout is untouched, and the
   * bar renders nothing at all while the selection is empty (no orphan strip).
   */
  const withBulkBar = (body: ReactNode): ReactNode =>
    viewActions.bulkBar ? (
      <div data-slot="module-view-body" className="flex h-full min-h-0 flex-col gap-3">
        {viewActions.bulkBar}
        <div className="min-h-0 flex-1">{body}</div>
      </div>
    ) : (
      body
    )

  const renderBody = (): ReactNode =>
    renderModuleViewBody({
      config,
      records,
      filtered,
      activeView,
      activeState: groupedState,
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
      // G.62 — while the v2 panel is mounted, the lens's zero-results action
      // IS the panel's `Clear all`. Legacy views keep the body's own reset.
      onClearFilters: filterPanelActive ? clearAllFilters : undefined,
      // Live-monitoring seams — held by `ModuleView` so a view-tab switch
      // cannot discard an edited column set (round-4 finding F1).
      loading,
      customizeFor,
      setActiveCustomize,
      setDirtyByView,
      saveSignal,
      liveStateFor,
      setLiveStateFor,
      createAction,
    })

  return (
    <ModuleViewShell
      title={title}
      views={shellTabs}
      activeViewId={activeId}
      onViewChange={handleViewChange}
      // Clicking the ALREADY-ACTIVE tab while the picker takeover is up is
      // also an implicit cancel (spec: "click any existing view tab") — Radix
      // never fires `onViewChange` for an unchanged value, so this seam
      // closes the pointer-only dead end (round-1 QA `tab-click cancel`).
      onActiveViewClick={pickerOpen ? () => setPickerOpen(false) : undefined}
      onCreateView={handleCreateView}
      /* F4: deletability is a property of the tab being hovered, not of the
         ACTIVE view — gating the handler on the active view is what made the
         hover `x` appear on system tabs and vanish from user ones. */
      onDeleteView={showPicker ? undefined : deleteView}
      canDeleteView={(id) => !tabs.find((v) => v.id === id)?.system}
      viewMenuItems={liveViewMenuItems()}
      // The per-tab hover pencil (SPEC §2.1) renames through the same
      // Customize View name input the menu's `Rename` row opens.
      onEditView={
        !showPicker && liveModule && (activeView?.kind === 'hybrid' || activeView?.kind === 'list')
          ? () => setCustomizeOpen(true)
          : undefined
      }
      // The live map is flush to the viewport (SPEC §2.1/§2.3, visual #10);
      // every other module keeps the 24px module-body frame. A RECORD-MAP
      // module's `list` lens renders the STANDARD `ListView` body (see
      // `ModuleViewBody`'s hasRecordMap-first precedence), which owns no
      // inset of its own — so it keeps the default 24px frame; only lenses
      // that own their chrome (live hybrid/map/list-only, kanban's padded
      // board) stay flush. 2026-09-03 gutter fix: a record-map module's list
      // rendered edge-to-edge because the blanket `liveModule` check flushed it.
      bodyInset={liveModule && !(recordMapModule && activeView?.kind === 'list') ? 'flush' : 'default'}
      renderView={() => withBulkBar(renderBody())}
      emptyState={pickerBody}
      // The takeover replaces EVERYTHING below the top nav (figma new-view
      // spec §visual: no toolbar row between the bar and the heading) — the
      // filters row is withheld while the picker is up, and withheld for a
      // live module's 'hybrid'/'list' views (their search/funnel live inside
      // the view bodies instead — SPEC v2 §§2.2/2.10; Figma LM has no
      // page-level toolbar row for those two). 2026-08-31 P0 fix: Kanban has
      // no such alternate in-body toolbar of its own — `KanbanView` is the
      // SAME generic board for a live-gated pipeline module (e.g. incidents,
      // bound only for its map pins) as for any other, so it was silently
      // losing its ENTIRE search/filter/sort/export/create row under the old
      // blanket `liveModule` check, leaving only the density-toggle icon.
      search={
        showPicker ||
        (liveModule && !recordMapModule && activeView?.kind !== 'kanban') ||
        (recordMapToolbarModule && activeView?.kind === 'hybrid') ? undefined : (
          <ModuleViewFilters
            facets={facets}
            filters={activeState.filters ?? {}}
            onFilterChange={(col, value) =>
              emit({ ...activeState, filters: { ...activeState.filters, [col]: value } })
            }
            search={activeState.search ?? ''}
            onSearchChange={(search) => emit({ ...activeState, search })}
            searchPlaceholder={searchPlaceholder}
            sortOptions={sortOptions}
            sort={activeState.sort}
            onSortChange={(sort) => emit({ ...activeState, sort })}
            assigneeFacet={assigneeFacet}
            groupByFacet={groupByFacet}
            // figma-spec-kanban.md §1 has a density toggle; figma-spec-list.md
            // §1 does not (round-1 design QA A4) — this one shared toolbar
            // renders for every view kind, so it opts the control in only for
            // the kind that actually specs it, rather than showing it
            // everywhere by default.
            densityToggle={activeView?.kind === 'kanban' && config.uiConfig.viewSwitcher !== false}
            displayMode={toDisplayMode(activeState.displayMode)}
            onDisplayModeChange={(displayMode) => emit({ ...activeState, displayMode })}
            exportAction={viewActions.exportAction}
            createAction={createAction}
            session={filterSession}
            filtersPanel={filtersPanelConfig}
            onClearAllFilters={clearAllFilters}
            resolveExpandRows={resolveSheetRows}
            /*
             * FIX WAVE C-3 / P0 — the SAME id→name resolver the list cells and
             * the toolbar's Assignee control use. An entity facet on a
             * reference column (`Assignee`, `Single`/`MultiReference`) stores
             * ids; this is what turns them into the names the dropdown and the
             * sheet must show.
             */
            resolveEntityLabel={resolveAssigneeName}
            /*
             * R-37 — the create-from-search CTA (compact dropdown AND sheet
             * empty state) routes into the module's own create flow, with the
             * typed text as a prefill for the facet's own column. No new
             * host wiring: `onCreateRecord` is the seam every other create
             * affordance in this view already uses.
             */
            onCreateFromSearch={
              onCreateRecord ? (facet, query) => onCreateRecord({ [facet.col]: query }) : undefined
            }
          />
        )
      }
    />
  )
}

ModuleView.displayName = 'ModuleView'
