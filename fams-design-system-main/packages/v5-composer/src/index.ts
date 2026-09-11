/**
 * @fams/v5-composer — the v5 low-code composer. [v5 tier]
 *
 * Reads **blueprints** (a tenant's module configuration) and composes
 * **modules** from templates + config. Ships:
 *  - the React-free runtime core (blueprint → runtime with RBAC + rule-enforced
 *    moves, config → view-model bridge, safe rules evaluator, in-memory store);
 *  - the blueprint authoring types + JSON Schemas (`schemas/`) + a dependency-
 *    free `validateBlueprint` that enforces the stable-ID contract;
 *  - the non-React module-type registry (the composer's fixed menu + brain);
 *  - the discriminated-union composer entry (`ComposedModule` / `composeModule`).
 *
 * Data adapters and the React template components are injected at the app level
 * (templates live in `@fams/v5-templates`, later tasks). Persistence is
 * injectable and NEVER defaults to the browser — the composer is pure
 * in-memory unless an adapter is supplied (phase 3's demo-kit provides those).
 *
 * Tier laws (see docs/BOUNDARIES.md): may import from the core tier; the core
 * tier NEVER imports this (decision #13, lint-enforced).
 */

/* ── Runtime core (React-free) ──────────────────────────────────────────────── */
export { InMemoryDataStore, joinRefCsv } from './store'
export type { Persistence, FilterValue, AppliedFilters, ListQuery } from './store'

export { evalCondition, resolvePermissions, isTaskVisible, allowedTransitions } from './rules'

export { evalRecordAutomations } from './automation'

export { createAppRuntime } from './composition'
export type {
  ModuleType,
  ViewKind,
  ViewSpec,
  ViewSpecObject,
  ResolvedView,
  DataSourceBinding,
  CreateSpec,
  ModuleSpec,
  TenantBrand,
  Blueprint,
  AppRuntimeOptions,
  ModuleHandle,
  AppRuntime,
} from './composition'

export {
  deriveColumns,
  deriveCard,
  deriveFilters,
  deriveSummaryTiles,
  deriveDetail,
  buildEntityModuleData,
  buildPipelineModuleData,
} from './config-render'
export type {
  Column,
  Cell,
  CardModel,
  FilterFacet,
  SummaryTileModel,
  DetailModel,
  EntityModuleData,
  PipelineStage,
  MapZoneShape,
  PipelineModuleData,
} from './config-render'

export { instantiateBlueprint, toEntityConfig } from './blueprint-loader'
export type {
  BlueprintJson,
  ModuleConfigJson,
  BlueprintBundle,
  InstantiatedBlueprint,
  InstantiateOptions,
} from './blueprint-loader'

/* ── Core data shapes ───────────────────────────────────────────────────────── */
export type {
  FieldType,
  ReferenceKind,
  SystemColumn,
  StatusDef,
  FieldPlacement,
  ProfileSection,
  FilterDef,
  FilterKind,
  FilterOptionsSource,
  FilterOption,
  FilterExpandColumn,
  FilterExpandView,
  FilterExpandRowTemplate,
  FilterRowTemplate,
  FilterRowBadgeTone,
  FilterCreateFromSearch,
  FilterOptionDot,
  FiltersPanelConfig,
  ProfileTab,
  UiConfig,
  RecordAutomation,
  RecordAutomationEffect,
  EntityConfig,
  EntityRecord,
  Condition,
  PipelineRules,
  ResolvedPermissions,
  UserContext,
} from './types'

/* ── Module-type registry (the composer's brain) ────────────────────────────── */
export {
  getModuleType,
  registerModuleType,
  listModuleTypes,
  resolveModuleViews,
  resolveModuleViewSpecs,
  viewSpecKind,
  viewLabel,
  viewLabelIn,
} from './module-registry'
export type { ModuleTemplateRefs, ModuleTypeDef } from './module-registry'

/* ── Blueprint authoring contract + validator ───────────────────────────────── */
export type {
  FieldComponentRef,
  AuthoredSystemColumn,
  AuthoredFieldPlacement,
  AuthoredStatusDef,
  AuthoredFilterDef,
  AuthoredProfileSection,
  AuthoredProfileTab,
  AuthoredUiConfig,
  EntityModuleConfigBlueprint,
  PipelineModuleConfigBlueprint,
  InboxModuleConfigBlueprint,
  ModuleCreateSpec,
  ModuleBlueprint,
  BlueprintBrand,
  BlueprintDoc,
} from './blueprint-schema'

/* ── Dashboard blueprint authoring contract (DashboardModuleConfig.schema.json) ── */
export type {
  DashboardColorIndex,
  DashboardColorToken,
  DashboardDimensionValues,
  DashboardSourceVariant,
  DashboardMedia,
  DashboardWidgetType,
  DashboardSeries,
  DashboardSlice,
  DashboardSeverity,
  DashboardMetaItem,
  DashboardListItem,
  DashboardRow,
  DashboardColumn,
  DashboardCounterKey,
  DashboardScopeFilter,
  DashboardListRail,
  DashboardHeatCell,
  DashboardBin,
  DashboardLegendEntry,
  DashboardGaugeSector,
  DashboardCenterLabel,
  DashboardAxisSpec,
  DashboardWidgetDataSource,
  DashboardWidget,
  DashboardKpiTile,
  DashboardFilterPill,
  DashboardSavedView,
  DashboardModuleConfigBlueprint,
} from './blueprint-schema.dashboard'
export {
  DASHBOARD_WIDGET_TYPES,
  DASHBOARD_KPI_TYPES,
  DASHBOARD_FILTER_PILL_TYPES,
} from './blueprint-schema.dashboard'

export {
  validateBlueprint,
  validateEntityModuleConfig,
  validatePipelineModuleConfig,
  validateDashboardModuleConfig,
} from './validate'
export type { ValidationError, ValidationResult } from './validate'

/* ── FieldRegistry + compiler + SchemaForm (phase 2 §2) ─────────────────────── */
export {
  compileFieldSet,
  clearCompileCache,
  getCompileCacheStats,
  defaultFieldRegistry,
  registerFieldType,
  resetFieldRegistry,
  getFieldTypeEntry,
  getReadRenderer,
  getEditWidget,
  getCellEditor,
  listRegisteredFieldTypes,
  registerComponent,
  getComponentRenderer,
  registerEditWidget,
  getEditWidgetOverride,
  resetEditWidgetRegistry,
  FIELD_ICON_VOCABULARY,
  FIELD_ICON_NAMES,
  resolveFieldIcon,
  resolveDefaultFieldIcon,
  SchemaForm,
  SchemaFormField,
  useSchemaForm,
  mapSchemaFormOut,
  DisplayNameProvider,
  useDisplayName,
  LinkedRecordProvider,
  useLinkedRecordOpener,
  formatFigmaDate,
  humanizeEnumValue,
  computeThresholdTone,
} from './fields'
export type {
  FieldSetInput,
  CompileOptions,
  FieldDescriptor,
  LayoutRow,
  LayoutGroup,
  LayoutPlan,
  CompiledFieldSet,
  ReadRenderer,
  ReadRendererProps,
  EditWidget,
  EditWidgetProps,
  CellEditor,
  CellEditorProps,
  FieldTypeEntry,
  FieldTypeKey,
  FieldOptionContext,
  FieldChrome,
  SchemaFormProps,
  SchemaFormFieldProps,
  UseSchemaFormOptions,
  UseSchemaFormResult,
  DisplayNameResolver,
  DisplayNameProviderProps,
  LinkedRecordTarget,
  LinkedRecordOpener,
  LinkedRecordProviderProps,
} from './fields'

/* ── Composer entry (React) ─────────────────────────────────────────────────── */
export { composeModule, ComposedModule, resolvePrimaryTemplateRef } from './composer'
export type {
  DataAdapter,
  ModuleRenderContext,
  ModuleRenderer,
  RendererRegistry,
  LowCodeModuleProps,
  BespokeModuleProps,
  ComposedModuleProps,
} from './composer'
