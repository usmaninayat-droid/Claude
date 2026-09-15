/**
 * @fams/v5-templates — v5-family product patterns. [tier 2]
 *
 * Opt-in compositions of `@fams/ui-kit` for products in the v5 family
 * (IWMP, DMT, MM, EAD apps built on the v5 platform). This is where the
 * v5-signature patterns live — the multi-tab pinned profile drawer, the v5
 * side-sheet behavior, asset/task detail scaffolds — so the core stays
 * strictly product-agnostic and new tools are never forced into v5's shapes.
 *
 * Laws of this package (see docs/BOUNDARIES.md § The patterns tier):
 *  - Depends on `@fams/ui-kit` + `@fams/tokens`; the core NEVER imports this.
 *  - Composes core components — never forks or re-implements them. A pattern
 *    that needs to fork a core component has found a core API gap: fix core.
 *  - Business vocabulary is allowed here (`AssetProfileShell` is a fine name);
 *    it stays banned in the core.
 *  - Same quality gates as the core: tokens-only, RTL, axe test per component,
 *    API grammar per docs/API-GRAMMAR.md.
 *  - Rule of three still applies across tiers: adopted by a second product
 *    family → generalize and PROMOTE to core; turns out single-module → demote
 *    to app code.
 *
 * Membership test (the 4-question cascade, docs/BOUNDARIES.md):
 *  fetch/store/route? → app · second FAMS product family unchanged? → core ·
 *  second v5-family module unchanged? → HERE · otherwise → app code.
 *
 * DRAFT EXEMPLARS below — the two seed patterns built to make this tier
 * concrete for the design review (multi-tab profile drawer + saved-view module
 * shell). Everything past these enters only after the design team adjudicates
 * each candidate against the cascade above.
 */
export { EntityProfileShell } from './EntityProfileShell'
export type {
  EntityProfileRecord,
  EntityProfileRecordTab,
  EntityProfileShellProps,
} from './EntityProfileShell.types'

export { ModuleViewShell } from './ModuleViewShell'
export type {
  ModuleView as ModuleViewTab,
  ModuleViewMenuItem,
  ModuleViewShellProps,
  ModuleViewType,
} from './ModuleViewShell'

/* ── Task 2.3 — EntityProfile (30/70 blueprint-driven profile) ──────────────── */
export { EntityProfile } from './entity-profile/EntityProfile'
export type {
  EntityProfileProps,
  EntityProfileTab,
  EntityProfileTabContext,
  EntityProfileTag,
  ProfileTabRenderer,
} from './entity-profile/EntityProfile.types'
export { EntityIdentityPanel, type EntityIdentityPanelProps } from './entity-profile/EntityIdentityPanel'
export { ProfileSectionsPanel, type ProfileSectionsPanelProps } from './entity-profile/ProfileSectionsPanel'
export { ProfileStack, type ProfileStackProps, type ProfileStackItem } from './entity-profile/ProfileStack'
export { ProfileTabRegistry, profileTabRegistry } from './entity-profile/ProfileTabRegistry'
export { isProfileTabVisible } from './entity-profile/tab-visibility'

/**
 * TAB-level named-component registry (see `entity-profile/tab-components.ts`)
 * — the tab-body sibling of `registerSectionComponent` below. `EntityProfile`
 * checks this before falling back to its own `tabRenderers` prop.
 */
export {
  registerTabComponent,
  getTabComponentRenderer,
  listRegisteredTabComponents,
} from './entity-profile/tab-components'
export type { TabComponentProps, TabComponentRenderer } from './entity-profile/tab-components'

/**
 * Generic, metadata-driven profile-tab components — registered under their
 * own names ("OverviewWidgets"/"RecordTable") on every `EntityProfile`
 * (see `entity-profile/EntityProfile.tsx`'s top-level `registerTabComponent`
 * calls), and exported here too for direct/bespoke use.
 */
export { OverviewWidgets } from './entity-profile/OverviewWidgets'
export type {
  OverviewWidgetsProps,
  OverviewWidget,
  OverviewWidgetColumn,
  OverviewTone,
  OverviewMetaField,
  OverviewAlertBannerWidget,
  OverviewPlanBannerWidget,
  OverviewStatusCardWidget,
  OverviewKpiTilesWidget,
  OverviewKpiTileConfig,
  OverviewBarChartWidget,
  OverviewEventListWidget,
  OverviewLocationMapWidget,
  OverviewLocationCardStrings,
  OverviewTrendChartWidget,
  OverviewDailyTimelineWidget,
  OverviewDailyTimelineSegment,
  OverviewDailyTimelineStrings,
} from './entity-profile/OverviewWidgets'
export { RecordSectionsGrid } from './entity-profile/RecordSectionsGrid'
export type {
  RecordSectionsGridProps,
  RecordSectionsGridGroup,
  RecordSectionsGridField,
  RecordSectionsGridRender,
  RecordSectionsGridTone,
} from './entity-profile/RecordSectionsGrid'
export { RecordTable } from './entity-profile/RecordTable'
export type { RecordTableProps, RecordTableColumn, RecordTableColumnType } from './entity-profile/RecordTable'
export { ComplianceTable } from './entity-profile/ComplianceTable'
export type { ComplianceTableProps, ComplianceBucketKey } from './entity-profile/ComplianceTable'
export { ScopedLinkedRecords } from './entity-profile/ScopedLinkedRecords'
export type { ScopedLinkedRecordsProps } from './entity-profile/ScopedLinkedRecords.types'
export { LinkedRecordDetailSection } from './entity-profile/LinkedRecordDetailSection'
/**
 * The cross-module "read another module's records" seam
 * (`entity-profile/module-records.tsx`) — mirrors `@fams/v5-composer`'s
 * `LinkedRecordProvider`/`useLinkedRecordOpener` shape for a registry-resolved
 * tab body that needs bulk records rather than a single reference activation.
 */
export { ModuleRecordsProvider, useModuleRecords } from './entity-profile/module-records'
export type { ModuleRecordsResolver, ModuleRecordsProviderProps } from './entity-profile/module-records'
export { InteractiveReplay } from './entity-profile/InteractiveReplay'
export type {
  InteractiveReplayProps,
  InteractiveReplayStat,
  InteractiveReplaySeries,
  InteractiveReplayPoint,
  InteractiveReplayBand,
  InteractiveReplayFilterField,
} from './entity-profile/InteractiveReplay.types'
export { TripsOverview } from './entity-profile/TripsOverview'
export type {
  TripsOverviewProps,
  TripsOverviewTripRow,
  TripsOverviewLayer,
  TripsOverviewStrings,
} from './entity-profile/TripsOverview.types'
export { EventsOverview } from './entity-profile/EventsOverview'
export type {
  EventsOverviewProps,
  EventsOverviewRow,
  EventsOverviewStrings,
} from './entity-profile/EventsOverview.types'
export { EntityCardHistory } from './entity-profile/EntityCardHistory'
export type {
  EntityCardHistoryProps,
  EntityCardField,
  EntityCardHistoryStrings,
} from './entity-profile/EntityCardHistory.types'
export { DocumentsList } from './entity-profile/DocumentsList'
export type { DocumentsListProps, DocumentsListRow, DocumentsListStrings } from './entity-profile/DocumentsList.types'
export { SearchableRecordList } from './entity-profile/SearchableRecordList'
export type {
  SearchableRecordListProps,
  SearchableRecordMeta,
  SearchableRecordListStrings,
} from './entity-profile/SearchableRecordList.types'
export {
  useDetailStack,
  type DetailStackApi,
  type DetailStackItem,
  type UseDetailStackOptions,
} from './entity-profile/useDetailStack'

/* ── Task 2.3 — CreationSheet (decision #10 grouping + stepper) ─────────────── */
export { CreationSheet } from './creation-sheet/CreationSheet'
export type { CreationSheetProps } from './creation-sheet/CreationSheet.types'
export { computeCreationGroups, type CreationGroup } from './creation-sheet/grouping'

/* ── Task 2.4 — View templates (ModuleView / ListView / KanbanView / HybridView / TaskDetail) ── */
export { ModuleView } from './views/ModuleView'
/** First-frame app skeleton — see the component's header for why an app-entry
 *  level skeleton is required to satisfy UX D.17 / F.27(c). */
export { AppBootSkeleton, type AppBootSkeletonProps } from './views/AppBootSkeleton'
export type { ModuleViewProps } from './views/ModuleView'
export { ListView } from './views/ListView'
export type { ListViewProps, ListViewSummaryTile, ListViewHeaderAction } from './views/ListView'
export { KanbanView } from './views/KanbanView'
export type { KanbanViewProps } from './views/KanbanView'
export { HybridView } from './views/HybridView'
export type { HybridViewProps } from './views/HybridView'
export { TaskDetail } from './views/TaskDetail'
export type { TaskDetailProps, TaskDetailTabRenderer } from './views/TaskDetail'
export { TaskDetailAdditionalInfo } from './views/TaskDetailAdditionalInfo'
export type {
  TaskDetailAdditionalInfoProps,
  TaskDetailChecklistProps,
  TaskDetailAttachmentsProps,
} from './views/TaskDetailAdditionalInfo'
export { TaskDetailHeader } from './views/TaskDetailHeader'
export type { TaskDetailHeaderProps } from './views/TaskDetailHeader'
export { DescriptionCard } from './views/DescriptionCard'
export { NotesSection, BeforePhotosSection } from './views/section-renderers'
export type { NotesSectionConfig, BeforePhotosSectionConfig } from './views/section-renderers'
export { ViewEmptyState } from './views/ViewEmptyState'
export type { ViewEmptyStateProps } from './views/ViewEmptyState'
export { ViewTypePicker, viewTypeOptionsFromKinds } from './views/ViewTypePicker'
export type { ViewTypePickerProps, ViewTypeOption } from './views/ViewTypePicker'
export { ViewTypePreview } from './views/ViewTypePreviews'
export type { ViewTypePreviewProps } from './views/ViewTypePreviews'
export { EditableCell, renderReadCell, descriptorFor } from './views/field-cell'
export type { EditableCellProps } from './views/field-cell'
export { ModuleViewFilters, isFilterPanelV2Active, panelOwnedFilterCols } from './views/ModuleViewFilters'

/* ── FAMILY C — the "All Filters" panel stack (WAVE C4/C5/C6) ── */
export { FilterPanelV2, appliedCount } from './views/filters/FilterPanelV2'
export type { FilterPanelV2Props } from './views/filters/FilterPanelV2'
export { FilterField, facetOptions, selectedIdsOf, triggerLabelLine } from './views/filters/FilterField'
export type { FilterFieldProps } from './views/filters/FilterField'
export {
  ExpandableSelectorSheet,
  COLUMN_MIN_WIDTH,
  VIRTUALIZE_THRESHOLD,
  visibleColumns,
  columnMinWidth,
  cellText,
  orderSelectedToTop,
  rowWindow,
} from './views/filters/ExpandableSelectorSheet'
export type { ExpandableSelectorSheetProps, SelectorRow } from './views/filters/ExpandableSelectorSheet'
export { useFilterSession, buildFrozenOrder } from './views/filters/use-filter-session'
export type { FilterSession, FilterSessionState, FilterFieldSession } from './views/filters/use-filter-session'
export type {
  ModuleViewFiltersProps,
  ModuleViewAssigneeFacet,
  ModuleViewGroupByFacet,
  ModuleViewGroupByOption,
  ModuleViewSortOption,
} from './views/ModuleViewFilters'

/* Saved-views contract + serializable view state. */
export {
  InMemorySavedViewsAdapter,
  applyViewState,
} from './views/saved-views'
export type {
  SavedView,
  SavedViewsAdapter,
  SavedViewsContext,
  ViewState,
  ViewSort,
} from './views/saved-views'

/* ── MapHybridView — the generic list + record-map hybrid lens (SPEC §1.3) ── */
export { MapHybridView } from './views/hybrid/MapHybridView'
export type { MapHybridViewProps, MapHybridViewToolbarConfig } from './views/hybrid/MapHybridView'
export { RecordMapListToolbar } from './views/hybrid/RecordMapListToolbar'
export type { RecordMapListToolbarProps } from './views/hybrid/RecordMapListToolbar'
export { RecordMapCard } from './views/hybrid/RecordMapCard'
export type { RecordMapCardProps, RecordMapCardLeadingControls } from './views/hybrid/RecordMapCard'
export {
  colorKeyTotals,
  deriveRecordGeometry,
  fanOutCollisions,
  hasRecordMap,
  recordMapConfig,
  toMapData,
  visibleOnMap,
} from './views/hybrid/record-map-model'
export type { RecordGeometry, RecordMapConfig, RecordMapLegendEntry } from './views/hybrid/record-map-model'
export { LegendFilter } from './views/legend/LegendFilter'
export type { LegendFilterEntry, LegendFilterProps } from './views/legend/LegendFilter'

/* ── CalendarView — the generic config-driven calendar lens (SPEC §1.4/§1.5) ── */
export { CalendarView } from './views/calendar/CalendarView'
export type { CalendarViewProps } from './views/calendar/CalendarView'
export { CalendarEventChip } from './views/calendar/CalendarEventChip'
export type { CalendarEventChipProps } from './views/calendar/CalendarEventChip'
export { CalendarLegend } from './views/calendar/CalendarLegend'
export type { CalendarLegendProps } from './views/calendar/CalendarLegend'
export { CalendarMonthGrid } from './views/calendar/CalendarMonthGrid'
export type { CalendarMonthGridProps } from './views/calendar/CalendarMonthGrid'
export { CalendarWeekGrid } from './views/calendar/CalendarWeekGrid'
export type { CalendarWeekGridProps } from './views/calendar/CalendarWeekGrid'
export { CalendarPeriodNav } from './views/calendar/CalendarPeriodNav'
export type { CalendarPeriodNavProps } from './views/calendar/CalendarPeriodNav'
export { DayOverflowPopover } from './views/calendar/DayOverflowPopover'
export type { DayOverflowPopoverProps } from './views/calendar/DayOverflowPopover'
/* Calendar model + label helpers (pure, React-free). */
export {
  dateFieldsFromConfig,
  dayKeyFromValue,
  dayKeyOf,
  eventsInPeriod,
  filterByStatus,
  monthGrid,
  startOfWeek,
  statusTotals,
  stepPeriod,
  toCalendarEvents,
  weekGrid,
} from './views/calendar/calendar-model'
export type {
  CalendarDateField,
  CalendarDay,
  CalendarEvent,
  CalendarMode,
} from './views/calendar/calendar-model'
export {
  dayCellLabel,
  dayLabel,
  periodLabel,
  periodLabelShort,
  resolveChipCap,
  weekdayNames,
} from './views/calendar/calendar-format'
export type { CalendarDensity } from './views/calendar/calendar-format'

/* Kanban model helpers (pure, React-free). */
export { groupCardsByStage, resolveMove, groupCellRows, extractAssigneeAvatars } from './views/kanban/kanban-model'
export type { CanMove, CellRow, CellAvatar } from './views/kanban/kanban-model'
export { isDescriptionCell } from './views/kanban/kanban-model'
export {
  canCardEnterStage,
  makeAllowedStageIds,
  makeCanDropCard,
  orderStagesByPinned,
  togglePinned,
} from './views/kanban/move-rules'
export {
  DEFAULT_KANBAN_DISPLAY_MODE,
  KANBAN_DISPLAY_MODE_LABEL,
  toDisplayMode,
} from './views/kanban/kanban-display'
export type { KanbanDisplayMode } from './views/kanban/kanban-display'

/* ── DashboardGrid — the `dashboard` module type's renderer + its widget map ── */
export { DashboardView, DashboardModuleSurface } from './views/DashboardView'
export type { DashboardViewProps, DashboardModuleSurfaceProps } from './views/DashboardView'
export { DashboardWidgetView, DASHBOARD_WIDGET_RENDERERS } from './views/dashboard-widgets'
/**
 * Reference blueprint data — one valid widget per `DashboardWidgetType`, plus a
 * complete dashboard config built from them. Public so the showcase demo
 * (`workshop/showcase/src/demos/DashboardViewDemo.tsx`) documents the template
 * against the SAME fixtures the package's own tests and axe sweep use, rather
 * than a parallel set that can drift from the schema. Pure data, tree-shaken
 * out of any consumer that does not name it.
 */
export { dashboardWidgetFixtures, dashboardConfigFixture } from './views/dashboard-fixtures'
export type {
  DashboardFilterValues,
  DashboardWidgetRenderer,
  DashboardWidgetRenderProps,
} from './views/dashboard-widget-shell'

/* ── Task 2.7 — default composer renderer registry (the composer→templates wiring) ── */
export {
  v5TemplateRenderers,
  createV5TemplateRenderers,
  V5ModuleSurface,
} from './renderers/v5-module-renderers'
export type { V5ModuleSurfaceProps, V5TemplateRendererOptions } from './renderers/v5-module-renderers'

/* ── WP4 — Inbox module (date-grouped notification feed) ── */
export { InboxView } from './inbox/InboxView'
export type { InboxViewProps } from './inbox/InboxView'
export { InboxNotificationCard } from './inbox/InboxNotificationCard'
export type { InboxNotificationCardProps } from './inbox/InboxNotificationCard'
export { InboxToolbar, applyInboxFilters } from './inbox/InboxToolbar'
export type { InboxToolbarProps, InboxFilterState } from './inbox/InboxToolbar'
export { InboxModuleSurface, toInboxNotification } from './inbox/InboxModuleSurface'
export type { InboxModuleSurfaceProps } from './inbox/InboxModuleSurface'
export { INBOX_TABS, inTab, formatTabCount, dateGroupLabel, groupByDate } from './inbox/types'
export { inboxNotificationFixtures, INBOX_FIXTURE_NOW } from './inbox/fixtures'
export type { InboxNotification, InboxNotificationKind, InboxSeverity, InboxTabId } from './inbox/types'

/**
 * SECTION-level named-component registry (figma-spec-detail.md §§4–7's
 * `LocationMapSection`/`NotesSection`/`BeforePhotosSection` blueprint-driven
 * profile sections) — see `lib/section-components.ts`. `TaskDetail` checks
 * this by a section's `component.name` before falling back to a `FieldGrid`
 * of `fields`; an app registers its own named renderer the same way.
 */
export {
  registerSectionComponent,
  getSectionComponentRenderer,
  listRegisteredSectionComponents,
} from './lib/section-components'
export type { SectionComponentProps, SectionComponentRenderer } from './lib/section-components'

/**
 * Convenience re-exports of the v5-composer shapes these templates consume, so
 * a consumer that only depends on `@fams/v5-templates` can type its blueprint
 * inputs without also importing `@fams/v5-composer` directly.
 */
export type { EntityConfig, EntityRecord, UserContext, FieldOptionContext } from '@fams/v5-composer'

/* ── WP2 — Login split screen (tenant brand pane + layout-fixed auth pane) ── */
export { LoginPage } from './login/LoginPage'
export type { LoginPageProps, LoginFooterConfig } from './login/LoginPage'
export { LoginBrandPanel, LoginBrandIllustration } from './login/LoginBrandPanel'
export type { LoginBrandPanelProps } from './login/LoginBrandPanel'

/**
 * Live-monitoring view bodies (figma live-monitoring spec). LIGHT-BARREL
 * SLOTS: the actual map surface (`LiveMapView`) ships from the heavy
 * `@fams/v5-templates/map` entry and is reached only through `MapView`'s
 * runtime `import()` — importing these adds zero map bytes.
 */
export { MapView, MapViewFallback } from './views/MapView'
export type { MapViewProps } from './views/MapView'
export { LiveHybridView } from './views/LiveHybridView'
export type { LiveHybridViewProps } from './views/LiveHybridView'
/* ── Operations consoles (the `dispatcher-cockpit` / `triage-console` /
 *    `fleet-console` view kinds — `@fams/v5-composer`'s module registry
 *    binds those kinds to these template refs) ─────────────────────────── */
export { DispatcherCockpitView } from './views/consoles/DispatcherCockpitView'
export type { DispatcherCockpitViewProps } from './views/consoles/DispatcherCockpitView'
export { TriageConsoleView } from './views/consoles/TriageConsoleView'
export type { TriageConsoleViewProps } from './views/consoles/TriageConsoleView'
export { FleetConsoleView } from './views/consoles/FleetConsoleView'
export type { FleetConsoleViewProps } from './views/consoles/FleetConsoleView'
export { WorkforcePulseView } from './views/consoles/WorkforcePulseView'
export type { WorkforcePulseViewProps } from './views/consoles/WorkforcePulseView'
export { WorkforcePulseRoster } from './views/consoles/WorkforcePulseRoster'
export type { WorkforcePulseRosterProps } from './views/consoles/WorkforcePulseRoster'
export {
  personCol,
  presenceCol,
  breakdownCols,
  coverageCol,
  workforceEntityCode,
  pulseRoster,
  pulseBreakdowns,
  pulseCoverage,
} from './views/consoles/workforce-model'
export type { PulsePerson, PulseBreakdown } from './views/consoles/workforce-model'
export { ConsoleDrillSheet } from './views/consoles/ConsoleDrillSheet'
export type { ConsoleDrillSheetProps, ConsoleDrill } from './views/consoles/ConsoleDrillSheet'
export { ConsoleKpiRow } from './views/consoles/ConsoleKpiRow'
export type { ConsoleKpiRowProps } from './views/consoles/ConsoleKpiRow'
export { ConsoleRecordSummary } from './views/consoles/ConsoleRecordSummary'
export type { ConsoleRecordSummaryProps } from './views/consoles/ConsoleRecordSummary'
export {
  consoleKpis,
  consoleStages,
  identityCol,
  classificationCol,
  listColumnKeys,
  columnLabel,
  ageCol,
  ageMinutes,
  formatAge,
  stageOf,
  stageDef,
} from './views/consoles/console-model'
export type { ConsoleKpi, ConsoleStage } from './views/consoles/console-model'
export { consoleQueueColumns, supportingCols } from './views/consoles/console-queue-columns'
export type { ConsoleQueueColumnOptions } from './views/consoles/console-queue-columns'
export { fleetKpis, unitStateCol } from './views/consoles/fleet-model'

export { CockpitView } from './views/cockpit/CockpitView'
export type { CockpitViewProps } from './views/cockpit/CockpitView'
export { CockpitQueue } from './views/cockpit/CockpitQueue'
export type { CockpitQueueProps } from './views/cockpit/CockpitQueue'
export { CockpitSplit } from './views/cockpit/CockpitSplit'
export type { CockpitSplitProps, CockpitSplitState } from './views/cockpit/CockpitSplit'
export {
  hasCockpit,
  deriveCockpitKpis,
  deriveCockpitPanels,
  deriveCockpitPaths,
  deriveCockpitQueue,
} from './views/cockpit/cockpit-model'
export type {
  CockpitConfig,
  CockpitKpiModel,
  CockpitPanelModel,
  CockpitQueueItemModel,
} from './views/cockpit/cockpit-model'
export { registerCockpitComponents } from './views/cockpit/register-cockpit'
export { deriveLivePois, deriveLiveVehicles, deriveLiveZones, hasLiveMap, parseLiveStatus } from './views/live-data'

/* ── WP7 — Live monitoring panels (list panel, filters, drawers) ── */
export { LiveListPanel, HighlightedText } from './views/live/LiveListPanel'
export type { LiveListPanelProps } from './views/live/LiveListPanel'
export { LiveVehicleCell, liveVehicleId } from './views/live/LiveVehicleCell'
export type { LiveVehicleCellProps } from './views/live/LiveVehicleCell'
export { LiveSearchField } from './views/live/LiveSearchField'
export type { LiveSearchFieldProps } from './views/live/LiveSearchField'
export { LiveListSkeleton, LiveListNoResults } from './views/live/live-list-states'
export type { LiveListSkeletonProps } from './views/live/live-list-states'
export { LiveColumnsPopover } from './views/live/LiveColumnsPopover'
export type { LiveColumnsPopoverProps } from './views/live/LiveColumnsPopover'
export { OnwaniLocationSectionLazy } from './views/OnwaniLocationSectionSlot'
export { FieldTilesSection, NotesProofsSection } from './views/section-renderers'
export type { FieldTilesSectionConfig, NotesProofsSectionConfig } from './views/section-renderers'
export { ActivityCommentFeed } from './views/task-detail/ActivityCommentFeed'
export type { ActivityCommentFeedProps } from './views/task-detail/ActivityCommentFeed'
export { GroupByMenuButton } from './views/GroupByMenuButton'
export type { GroupByMenuButtonProps, GroupByMenuOption } from './views/GroupByMenuButton'
export { SortMenuButton } from './views/SortMenuButton'
export type { SortMenuButtonProps, SortMenuOption } from './views/SortMenuButton'
export { LiveFiltersPopover } from './views/live/LiveFiltersPopover'
export type { LiveFiltersPopoverProps } from './views/live/LiveFiltersPopover'
export { LiveFilterChips } from './views/live/LiveFilterChips'
export type { LiveFilterChipsProps } from './views/live/LiveFilterChips'
export { SavedLiveFilters } from './views/live/SavedLiveFilters'
export type { SavedLiveFiltersProps } from './views/live/SavedLiveFilters'
export { LivePanelDivider, LivePanelReopenButton } from './views/live/LivePanelDivider'
export type { LivePanelDividerProps } from './views/live/LivePanelDivider'
export { ZonesDrawer, PoiDrawer } from './views/live/ZonesDrawer'
export type { ZonesDrawerProps, PoiDrawerProps, LiveZoneDatum, LivePoiDatum } from './views/live/ZonesDrawer'
export { IncidentsDrawer, incidentMapPins } from './views/live/IncidentsDrawer'
export type { IncidentsDrawerProps } from './views/live/IncidentsDrawer'
export { CustomizeViewDrawer, defaultCustomizeViewState } from './views/live/CustomizeViewDrawer'
export type { CustomizeViewDrawerProps, CustomizeViewState, PinViewValue } from './views/live/CustomizeViewDrawer'
export { UnsavedChangesToast } from './views/live/UnsavedChangesToast'
export type { UnsavedChangesToastProps } from './views/live/UnsavedChangesToast'
export {
  applyLiveFilters,
  buildLiveFilterGroups,
  conditionCount,
  countActiveLiveFilters,
  deriveTagGroups,
  emptyLiveFilterValue,
  matchSegments,
  orderLiveFilterGroups,
  toggleLiveFilter,
} from './views/live/live-filter-model'
export type {
  LiveFilterGroup,
  LiveFilterOption,
  LiveFilterValue,
  LiveTagGroup,
  MatchSegment,
  SavedLiveFilter,
} from './views/live/live-filter-model'
export {
  LIVE_LIST_WIDTH_CLASS,
  LIVE_LIST_WIDTH_STATES,
  defaultLiveListColumns,
  defaultLiveShownColumns,
  liveColumnLabel,
  liveListColumnCatalog,
  stepWidthState,
} from './views/live/live-list-model'
export type { LiveListWidthState } from './views/live/live-list-model'
export { useLiveViewState, useLiveSearchFilters } from './views/live/use-live-view-state'
export {
  EMPTY_LIVE_VIEW_STATE,
  emptyLiveViewState,
  useLiveViewStateStore,
  type LiveViewStateSnapshot,
  type LiveViewStateOptions,
  type LiveViewStatePatch,
} from './views/live/live-view-state'
export { useMutedBasemapStyle } from './views/live/use-muted-basemap'
/* App-wide basemap selection (map-layer-switcher spec) — light: no maplibre. */
export {
  GLOBAL_BASEMAP_IDS,
  DEFAULT_GLOBAL_BASEMAP_ID,
  resolveGlobalBasemapStyleUrl,
  setGlobalBasemapId,
  useGlobalBasemapId,
  useGlobalBasemapStyleUrl,
  type GlobalBasemapId,
} from './map/global-basemap-store'
export { useCompactListConfig } from './views/use-compact-list-config'
export { liveMonitoringConfig, liveVehicleRecords, liveVehiclePopupData } from './views/live-fixtures'
export { cockpitConfig, cockpitRecords } from './views/cockpit/cockpit-fixtures'
export { HomeLaunchPad } from './home/HomeLaunchPad'
export type { HomeLaunchPadProps, LaunchPadGroup, LaunchPadModule } from './home/HomeLaunchPad'
export { usePinnedIds } from './home/usePinnedIds'
/* Staged, step-up-verified critical settings saves (dispatcher prototype). */
export { StagedSaveBar } from './settings/StagedSaveBar'
export type { StagedSaveBarProps } from './settings/StagedSaveBar'
export { StepUpVerifyDialog } from './settings/StepUpVerifyDialog'
export type { StepUpVerifyDialogProps } from './settings/StepUpVerifyDialog'
export { VerificationCodeInput } from './settings/VerificationCodeInput'
export type { VerificationCodeInputProps } from './settings/VerificationCodeInput'
export { LaunchPadTopBar, LaunchPadWave } from './home/LaunchPadChrome'
export type { LaunchPadTopBarProps } from './home/LaunchPadChrome'
export {
  useAppSwitcherPreference,
  setAppSwitcherPreference,
  type AppSwitcherMode,
} from './home/useAppSwitcherPreference'
