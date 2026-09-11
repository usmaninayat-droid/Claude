/**
 * App-Shell — the FAMS V5 App → Module → View composition layer.
 *
 * `AppShell` assembles a branded app from an `AppConfig` (brand + chosen
 * modules). The module-type registry supplies default Views and renderers for
 * the fixed menu of module types (entity, pipeline, dashboard, live-monitoring,
 * reports, inbox, settings, calendar, forms).
 */
export { AppShell } from './AppShell';
export type { AppShellProps } from './AppShell';

export { ModuleToolbar } from './module-toolbar';
export type { ModuleToolbarProps } from './module-toolbar';

export { UserMenu } from './user-menu';
export type { UserMenuProps } from './user-menu';

export { Dashboard } from './dashboard';
export type { DashboardProps, DashboardKpi, DashboardSection, DashboardFilterField, DashboardFilterOption } from './dashboard';
export { RecordDetail, DetailSection, FieldGrid, EditableField, EditableFieldGrid } from './record-detail';
export type { RecordDetailProps, EditableFieldDef } from './record-detail';

export {
  EntityDetail,
  EntityDetailRow,
  EntityMetricCard,
  EntityChartCard,
  EntityListItem,
} from './entity-detail';
export type { EntityDetailProps, EntityDetailTab, EntityTag } from './entity-detail';

export {
  TaskDetail,
  TaskSection,
  TaskInfoRow,
  TaskToggleRow,
  BoxedField,
  BoxedTextarea,
  CollapsibleNote,
  AttachmentDrop,
} from './task-detail';
export type { TaskDetailProps, TaskInfoRowDef, TaskDetailRightTab, TaskDetailGroup } from './task-detail';

export { DetailSheet, FormSheet, SchemaForm, SteppedSchemaForm, FieldControl } from './side-sheet';
export type {
  DetailSheetTab,
  DetailSheetProps,
  FormSheetProps,
  FormField,
  FormFieldType,
  FormSchema,
  FormStep,
  SteppedFormSchema,
  PickerOption,
} from './side-sheet';

export {
  renderCellValue,
  renderCell,
  toShellColumns,
  toShellCard,
  bindEntityModuleData,
  bindPipelineModuleData,
} from './config-bridge';
export type { CellRenderContext, BindEntityOptions, BindPipelineOptions } from './config-bridge';

export { createRuntimeAppConfig } from './runtime-app';
export type { RuntimeAppOptions } from './runtime-app';

export {
  getModuleType,
  registerModuleType,
  listModuleTypes,
  resolveModuleTabs,
} from './module-registry';
export type { ModuleTypeDef } from './module-registry';

export {
  ListView,
  GroupedListView,
  KanbanView,
  PipelineListView,
  PipelineCalendarView,
  PipelineHybridView,
  MapView,
  HybridView,
  InboxView,
  ReportsHome,
  ReportsTopNav,
  CalendarView,
  // (SavedReport type exported below)
  SettingsView,
  FormsView,
  PlaceholderView,
} from './view-renderers';

export { LiveMonitoringView } from './live-monitoring-view';
export { TripCard } from './trip-card';
export type { TripCardProps } from './trip-card';
export { DashboardWidgetGrid } from './dashboard-widgets';
export type { DashboardWidget, RagLevel } from './dashboard-widgets';
export type { SavedReport } from './view-renderers';
export { CustomReportBuilder, ReportTemplateView, AssetSelectSideSheet, parseDateFilterValue, encodeDateFilterValue } from './report-builder';
export type { ReportTemplateConfig } from './report-builder';
export { ReportTable, ReportPersonCell } from './report-table';
export type { ReportColumn, ReportKpi, ReportTableProps, ReportSubscription } from './report-table';

export type {
  IconType,
  ModuleType,
  ModuleTab,
  FilterField,
  DetailDescriptor,
  ShellActions,
  ModuleRenderContext,
  ModuleRenderer,
  ModuleConfig,
  BrandConfig,
  UserConfig,
  AppConfig,
  ReportsModuleData,
  ReportBuilderConfig,
  ReportBuilderValues,
  ReportFilterField,
  ReportFilterEntity,
  ReportFilterAsset,
  ReportResult,
  EntityModuleData,
  PipelineCardModel,
  PipelineModuleData,
  InboxModuleData,
  MonitoringEntity,
  MonitoringRoute,
  MonitoringModuleData,
  MonitoringZone,
  MonitoringPoi,
  CalendarModuleData,
  SettingsModuleData,
  SettingsItem,
  FormsModuleData,
  ZonesModuleData,
  PoisModuleData,
  Facet,
  InboxCategory,
} from './types';
