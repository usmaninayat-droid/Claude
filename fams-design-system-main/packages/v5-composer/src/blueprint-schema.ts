import type { FieldType, ReferenceKind } from './types'
import type { ModuleType, ViewKind, ViewSpec } from './composition'
import type { DashboardModuleConfigBlueprint } from './blueprint-schema.dashboard'

/**
 * Blueprint authoring contract — the hand-written TS types that match the JSON
 * Schemas in `packages/v5-composer/schemas/` (draft 2020-12). These are the
 * shapes a blueprint author writes on disk; `validateBlueprint` (see
 * `validate.ts`) enforces them at runtime.
 *
 * The one structural difference from the runtime shapes in `types.ts`: EVERY
 * NODE CARRIES A REQUIRED STABLE `id` (tenant-model requirement — typed ops key
 * on these). For entity fields the `col` remains the storage slot; `id` is the
 * stable identity.
 *
 * Stable-ID default conventions (documented; the validator requires a non-empty
 * `id`, not a specific format):
 *   field   → `fld_<col>`      status → `sts_<key>`      filter  → `flt_<col>`
 *   section → `sec_<slug>`     tab    → `tab_<key>`      module  → the module id
 *
 * Field-type note (v5 mapping): `Color` and `Assignee` are not first-class v5
 * types — v5 derives them from a field's name / `refModule=Users`. They are
 * modeled here as OPTIONAL explicit types because the blueprint is the
 * forward-looking contract; a v5 backend export maps `Assignee` → a
 * `SingleReference`/`MultiReference` with `refModule: 'Users'`, and `Color` →
 * a `SmallText` slot interpreted as a color by the renderer.
 */

export type { FieldType, ReferenceKind, ViewKind, ModuleType }

/* ── Field-level nodes ──────────────────────────────────────────────────────── */

export interface FieldComponentRef {
  name: string
  props?: Record<string, unknown>
}

/** A column/field descriptor. `col` is the storage slot; `id` is the identity. */
export interface AuthoredSystemColumn {
  id: string
  col: string
  name: string
  type: FieldType
  required?: boolean
  unique?: boolean
  default?: unknown
  listValues?: string[]
  /** Reference domain for Single/MultiReference (Entity | Tag | Users). */
  refModule?: ReferenceKind
  /** For `refModule: 'Entity'` — the referenced entity code, e.g. `crm/companies`. */
  entityType?: string
  append?: boolean
  min?: number
  max?: number
  /** Display unit appended after a numeric read value — see `SystemColumn.unit` in `types.ts`. */
  unit?: string
  component?: FieldComponentRef
  /** Field-level creation-form visibility — see `SystemColumn.creation` in `types.ts`. */
  creation?: {
    hidden?: boolean
    autofill?: { whenCol: string; equals?: unknown; value?: unknown; map?: Record<string, unknown>; template?: string }
  }
}

export interface AuthoredFieldPlacement {
  id: string
  col: string
  pos?: 'left' | 'right'
  order?: number
  showLabel?: boolean
  name?: string
  component?: FieldComponentRef
}

export interface AuthoredStatusDef {
  id: string
  key: string
  label: string
  color: string
  bgColor?: string
  chipColor?: string
  /** Semantic lifecycle tone — see `StatusDef.tone` in `types.ts`. */
  tone?: 'neutral' | 'info' | 'warning' | 'success' | 'danger'
  /** Contrast-safe text override for `color` — see `StatusDef.textColor`. */
  textColor?: string
}

export interface AuthoredFilterDef {
  id: string
  col: string
  order?: number
  name?: string
  boolean?: boolean
  booleanOptions?: { trueLabel: string; falseLabel: string }
  /** See `FilterKind` in `types.ts`. Omitted ⇒ derived from the column metadata. */
  kind?: 'single-select' | 'multi-select' | 'status' | 'tags' | 'entity' | 'date' | 'checkbox-group'
  /** See `FilterOptionsSource` in `types.ts`. Omitted ⇒ derived alongside kind. */
  optionsFrom?: 'listValues' | 'statusList' | 'records' | 'inline'
  /** Render the per-option record-count pill — see `FilterDef.showCounts` in `types.ts`. */
  showCounts?: boolean
  /** See `FilterOptionDot` in `types.ts`. */
  optionDot?: 'status' | 'tone' | false
  /** Kebab-case lucide icon for the field's 24px slot — see `FilterDef.icon` in `types.ts`. Falls back to `filter`. */
  icon?: string
  /** Multi vs. single selection — see `FilterDef.multiple` in `types.ts`. */
  multiple?: boolean
  /** The option list, for `optionsFrom: 'inline'` only — see `FilterOption` in `types.ts`. */
  options?: { value: string; label: string; category?: string; color?: string; count?: number }[]
  /** For `kind: 'tags'` — the option field carrying the chip's category — see `FilterDef.categoryCol` in `types.ts`. */
  categoryCol?: string
  /** Legal only for `kind: 'entity'` — see `FilterDef.expandable` in `types.ts`. */
  expandable?: boolean
  /** The side-sheet table config — see `FilterExpandView` in `types.ts`. */
  expandView?: {
    columns: { col: string; label: string; sortable?: boolean; hidden?: boolean; minWidth?: number }[]
    searchable?: boolean
    sortable?: boolean
    columnSettings?: boolean
    selectedToTop?: boolean
    rowTemplate?:
      | 'plain'
      | 'avatar-id-status'
      | {
          avatar?: string
          title: string
          subtitle?: string
          idPill?: string
          statusBadge?: { col: string; colors?: Record<string, 'success' | 'warning' | 'info' | 'destructive' | 'muted'> }
        }
  }
  /** Create-a-record-from-the-search-query affordance — see `FilterCreateFromSearch` in `types.ts`. */
  createFromSearch?: { enabled: boolean; entity: string; requirePrivilege?: string }
}

export interface AuthoredProfileSection {
  id: string
  name: string
  order: number
  fields: AuthoredFieldPlacement[]
  /** Opt this section into a named section renderer instead of a `FieldGrid` of `fields` — see `ProfileSection.component` in `types.ts`. */
  component?: FieldComponentRef
  /** Per-section `FieldGrid` layout override — see `ProfileSection.layout` in `types.ts`. */
  layout?: { labelWidth?: string; fieldEmphasis?: 'regular' | 'strong' }
  /** Show this section's name as a heading in the CREATE sheet — see `ProfileSection.showLabel` in `types.ts`. */
  showLabel?: boolean
  /** Exclude this section from the DETAIL page's accordion list — see `ProfileSection.detailHidden` in `types.ts`. */
  detailHidden?: boolean
  /** Show this section only when this rule-evaluator `Condition` holds against `{ user, task: record }` on the DETAIL page — see `ProfileSection.visibleWhen` in `types.ts`. */
  visibleWhen?: import('./types').Condition
}

export interface AuthoredProfileTab {
  id: string
  key: string
  title: string
  order: number
  component: FieldComponentRef
}

export interface AuthoredUiConfig {
  /**
   * Optional lucide icon name in kebab-case (e.g. `"map-pin"`), resolved
   * dynamically by the consuming app's module rail (e.g. the demo env's
   * `seams.tsx`) instead of its default per-module-id icon.
   */
  icon?: string
  statusList: AuthoredStatusDef[]
  statusChangeRule?: Record<string, string[]>
  kanbanCard?: {
    header: AuthoredFieldPlacement[]
    body: AuthoredFieldPlacement[]
    footer: AuthoredFieldPlacement[]
    image?: { col: string }
    /** Card-level highlight color column — see `UiConfig.kanbanCard.highlight` in `types.ts`. */
    highlight?: { col: string }
  }
  profile?: {
    title: AuthoredFieldPlacement
    details: AuthoredFieldPlacement[]
    sections: AuthoredProfileSection[]
    overview?: unknown[]
    rightPanel?: { type: 'tab'; tabs: AuthoredProfileTab[] }
    /** Section label above the identity-pane detail rows — see `UiConfig.profile.infoTitle` in `types.ts`. */
    infoTitle?: string
    /** Top-level `details` `FieldGrid` layout override — see `UiConfig.profile.layout` in `types.ts`. */
    layout?: { labelWidth?: string; fieldEmphasis?: 'regular' | 'strong' }
    /** Named-icon vocabulary for the identity panel's placeholder graphic — see `UiConfig.profile.placeholderIcon` in `types.ts`. */
    placeholderIcon?: string
  }
  filters?: AuthoredFilterDef[]
  /** Panel-level chrome for the All Filters panel — see `UiConfig.filtersPanel`/`FiltersPanelConfig` in `types.ts`. */
  filtersPanel?: { title?: string; clearAll?: boolean; width?: number; height?: number; sheetWidth?: number }
  /** Toolbar search — see `UiConfig.search` in `types.ts` (`placeholder` is the searchbox's placeholder text). */
  search?: { columns: string[]; placeholder?: string }
  /** List-view stat-card tiles — see `UiConfig.listSummary` in `types.ts`. */
  listSummary?: {
    id: string
    label: string
    icon?: string
    tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
    iconColor?: string
    iconBg?: string
    filter?: { col: string; equals?: unknown; in?: unknown[] }
  }[]
  /** Grouped-mode column order — see `UiConfig.listGroupedColumns` in `types.ts`. */
  listGroupedColumns?: string[]
  /** Singular/plural record noun for generated copy — see `UiConfig.recordNoun` in `types.ts`. */
  recordNoun?: { one: string; many: string }
  /** List-view row-height density — see `UiConfig.listRowHeight` in `types.ts`. */
  listRowHeight?: 'md' | 'lg'
  /** Hides the toolbar's Sort control when `false` — see `UiConfig.listSort` in `types.ts`. */
  listSort?: boolean
  /** Leading checkbox selection column — see `UiConfig.listSelectable` in `types.ts`. */
  listSelectable?: boolean
  /** Curated Group By option set — see `UiConfig.groupByOptions` in `types.ts`. */
  groupByOptions?: { col: string; label?: string; icon?: string; default?: boolean }[]
  /** Per-record `…` row/card options menu — see `UiConfig.rowActions` in `types.ts`. */
  rowActions?: { delete?: boolean; archive?: boolean; requiredPrivilege?: string; alwaysVisible?: boolean }
  /** Bulk action bar for multi-selection — see `UiConfig.bulkActions` in `types.ts`. */
  bulkActions?: { delete?: boolean; export?: boolean; requiredPrivilege?: string }
  /** Trailing header-only pencil affordance — see `UiConfig.listHeaderAction` in `types.ts`. */
  listHeaderAction?: boolean
  /** New-view picker hint line — see `UiConfig.viewPickerHint` in `types.ts`. */
  viewPickerHint?: string
  /** Create-sheet layout/chrome knobs — see `UiConfig.creation` in `types.ts`. */
  creation?: {
    layout?: 'auto' | 'flat' | 'wizard'
    fieldChrome?: 'default' | 'inset-label'
    label?: string
    /** Suppresses the trailing catch-all "Details" group — see `UiConfig.creation.explicit` in `types.ts`. */
    explicit?: boolean
    /** Size of the implicit first "Basic Info" group — see `UiConfig.creation.basicCount` in `types.ts`. */
    basicCount?: number
  }
  /** Hybrid (split list + profile) view options — see `UiConfig.hybrid` in `types.ts`. */
  hybrid?: { listColumns?: string[]; stageTabs?: boolean }
  /** Map/live-monitoring bindings — see `UiConfig.map` in `types.ts` (authored 1:1). */
  map?: import('./types').UiConfig['map']
  /** Operations-cockpit lens options for the hybrid view — see `UiConfig.cockpit` in `types.ts` (authored 1:1). */
  cockpit?: import('./types').UiConfig['cockpit']
  /** Declarative cross-module side effects — see `UiConfig.recordAutomation`/`RecordAutomation` in `types.ts` (authored 1:1, already id-bearing). */
  recordAutomation?: import('./types').RecordAutomation[]
}

/* ── Module config docs (entity / pipeline) ─────────────────────────────────── */

export interface EntityModuleConfigBlueprint {
  $schema?: string
  kind?: 'entity'
  code: string
  name: string
  /**
   * Optional definition version — the cache key for `compileFieldSet` (phase 2
   * §2, perf rule 4). Bump it whenever the field/placement metadata changes to
   * invalidate the compiled schema/layout cache. When absent, the compiler
   * falls back to a content hash of the field defs.
   */
  version?: string | number
  uidPrefix?: string
  systemcolumns: AuthoredSystemColumn[]
  /** v5 column families — optional. */
  streamcolumns?: AuthoredSystemColumn[]
  datacolumns?: AuthoredSystemColumn[]
  usercolumns?: AuthoredSystemColumn[]
  validation_columns?: AuthoredSystemColumn[]
  uiConfig: AuthoredUiConfig
  listcolumns: AuthoredFieldPlacement[]
  /**
   * Optional explicit view-kind list for the module's view tabs (e.g.
   * `["list", "hybrid"]`). Wins over the module-type's default views when
   * present — see `resolveModuleViews` in `module-registry.ts`. A consuming
   * app threads this into the composer's `ModuleBlueprint.views` (e.g. the
   * demo env's `toModuleNode()` passes it as `resolveModuleViews`'s
   * `explicit` arg).
   *
   * An entry may be the bare KIND string, or a `{ kind, label?, icon? }`
   * object when the module names its own lens (`ViewSpec` in
   * `composition.ts`) — e.g. the operations-center pipeline's three console
   * lenses. Bare strings behave exactly as before.
   */
  views?: ViewSpec[]
}

export interface PipelineModuleConfigBlueprint extends Omit<EntityModuleConfigBlueprint, 'kind'> {
  kind?: 'pipeline'
}

/**
 * An inbox module config is ENTITY-SHAPED (its notifications are records: they
 * live in the store, are seeded, and reference-integrity applies to their
 * `SingleReference` columns), but its `kind` selects the `inbox` module type —
 * so the composer resolves it to the `InboxView` template ref instead of the
 * generic entity list surface. Same relationship pipeline has to entity.
 */
export interface InboxModuleConfigBlueprint extends Omit<EntityModuleConfigBlueprint, 'kind'> {
  kind: 'inbox'
}

/* ── Module node + app blueprint ────────────────────────────────────────────── */

export interface ModuleCreateSpec {
  fields?: { id: string; label: string; type?: string; required?: boolean }[]
  steps?: { id: string; title: string; fields: string[] }[]
}

/** A single module node in a blueprint (what `composeModule` consumes). */
export interface ModuleBlueprint {
  id: string
  type: ModuleType
  label: string
  icon?: string
  /** Bare kinds or `{ kind, label?, icon? }` objects — see `ViewSpec`. */
  views?: ViewSpec[]
  dataSource?: { code: string; rulesRef?: string }
  /** Inline module config, or a path string resolved by the bundle loader. */
  config?:
    | EntityModuleConfigBlueprint
    | PipelineModuleConfigBlueprint
    | DashboardModuleConfigBlueprint
    | InboxModuleConfigBlueprint
    | Record<string, unknown>
    | string
  create?: ModuleCreateSpec
}

export interface BlueprintBrand {
  name: string
  logo?: string
  theme?: Record<string, string>
}

/** The top-level authored app blueprint document. */
export interface BlueprintDoc {
  $schema?: string
  id: string
  tenant: string
  brand: BlueprintBrand
  user?: { id: string; roles: string[] }
  modules: ModuleBlueprint[]
  rules?: Record<string, string | Record<string, unknown>>
  seeds?: Record<string, string | unknown[]>
}
