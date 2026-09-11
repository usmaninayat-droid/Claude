/**
 * FieldRegistry + compiler shared contracts (React-free types only).
 *
 * The unification the port needs (task 2.2): Shaheer's four parallel field-type
 * vocabularies (`SystemColumn.type` data types, the `renderCellValue()` read
 * component names, the `FormFieldType` edit widgets, and settings `Field.kind`)
 * collapse into ONE `FieldType` → `{ read, edit, cell }` mapping. Everything a
 * renderer needs travels on a `FieldDescriptor`; the compiler derives the
 * descriptors, a Zod schema, and a layout plan from blueprint field metadata.
 *
 * This file is pure TS — the renderer/widget/cell function *types* reference
 * React via `ReactElement`, but no React value is imported here.
 */
import type { ReactElement } from 'react'
import type { z } from 'zod'
import type { FieldType, ReferenceKind, EntityRecord } from '../types'

/**
 * Everything a renderer needs to present one field — derived once by the
 * compiler from a blueprint column (`SystemColumn` / `AuthoredSystemColumn`).
 * Keyed off `col` (the storage slot) because that is the shape the form emits
 * and records are stored in.
 */
export interface FieldDescriptor {
  /** Stable identity (`fld_<col>`). */
  id: string
  /** Storage slot key — also the react-hook-form field name. */
  col: string
  label: string
  type: FieldType
  required: boolean
  /** `true` for MultiSelect / MultiReference / tags — the value is an array. */
  multiple: boolean
  /** listValues for Single/MultiSelect (the enum members). */
  options?: string[]
  /**
   * Storage key → authored label, for the `status` column ONLY — populated
   * by the compiler from the module's own `uiConfig.statusList` when `col`
   * is literally `"status"` (fix7, run-2026-09-05, P1-d: the PM detail
   * sheet's Details panel and Overview tab printed the raw `scheduled`
   * storage key on the same sheet as the header pill's correct "Scheduled",
   * because a read renderer is handed the descriptor, never the pipeline
   * config, so it had no way to reach `statusList`). `ReadEnum` consults
   * this BEFORE falling back to `humanizeEnumValue` — that generic
   * machine-token humanizer (fix4) is deliberately narrow (no separator, no
   * camelCase hump → left untouched, so `hazmat`/`fired` survive) and
   * therefore CANNOT repair a single lowercase word like `scheduled`; it is
   * indistinguishable from a legitimately-lowercase value. Reading the
   * SAME `statusList` the header badge already reads (rather than teaching
   * `humanizeEnumValue` a second, wider heuristic) means the badge and
   * every other placement of the same status column can never label the
   * same key two different ways.
   */
  statusLabels?: Record<string, string>
  /** Reference domain for Single/MultiReference (Entity | Tag | Users). */
  refModule?: ReferenceKind
  /** Referenced entity code for `refModule: 'Entity'`. */
  entityType?: string
  /** Unit appended after a numeric read value (e.g. "kg", "AED"). */
  unit?: string
  /** Numeric bounds. */
  min?: number
  max?: number
  /** Placeholder for the edit widget. */
  placeholder?: string
  /** Authored per-field component override (name + props). */
  component?: { name: string; props?: Record<string, unknown> }
  /**
   * The blueprint column's authored default value (`SystemColumn.default`).
   * A CREATION form seeds this into the field's initial value so it shows
   * pre-selected/pre-filled from the first render — the store's own
   * `applyDefaults` already fills this in at save time for an omitted field,
   * so without this the saved record was already right but the widget
   * rendered blank/unselected until the user touched it.
   */
  default?: unknown
  /**
   * Field-level creation-form visibility — see `SystemColumn.creation` in
   * `../types.ts`. Consulted ONLY by `@fams/v5-templates`'s
   * `computeCreationGroups`; every other consumer of this descriptor ignores
   * it.
   *
   * `autofill` is a second, independent creation-form behavior on the same
   * knob: when the field named `whenCol` is edited, THIS field's value is
   * set — a one-way "preselect", still freely editable afterward. Three
   * modes (see `useSchemaForm`'s effect in `SchemaForm.tsx` for the exact
   * precedence): `equals`/`value` (UCCP Source=NCC preselecting Priority=
   * Critical), `map` (a whenCol-value → target-value lookup table, e.g.
   * Municipality → auto-assigned Inspector), or `template` (a `"{col} ·
   * {col}"` string built from current form values, e.g. UCCP's
   * auto-generated Title). Consulted ONLY by `useSchemaForm`; purely
   * additive and opt-in, so a field without it behaves exactly as before.
   */
  creation?: {
    hidden?: boolean
    autofill?: { whenCol: string; equals?: unknown; value?: unknown; map?: Record<string, unknown>; template?: string }
  }
  /**
   * Repeating group / list field — the value is an array rendered with add/
   * remove controls (react-hook-form `useFieldArray`).
   * TODO(blueprint): the blueprint schema has no first-class repeating-group
   * authoring yet; today this is only set via `compileFieldSet`'s `repeating`
   * option. When the schema gains repeating groups, derive it here.
   */
  repeating?: boolean
}

/** One row inside a layout group — an ordered set of descriptor `col`s. */
export interface LayoutRow {
  cols: string[]
}

/** A titled group of rows (a profile section, or the default "details" group). */
export interface LayoutGroup {
  id: string
  name?: string
  rows: LayoutRow[]
}

/** The ordered layout plan. v1 default = a single flat group, one field per row. */
export interface LayoutPlan {
  groups: LayoutGroup[]
}

/** The compiled, cacheable field-set: schema + layout + descriptors. */
export interface CompiledFieldSet {
  /** Cache identity — `<code>@<version|hash>`. */
  key: string
  /** Zod v4 object schema, keyed by `col`. */
  schema: z.ZodType<Record<string, unknown>>
  /** Ordered descriptors (also indexable via `byCol`). */
  descriptors: FieldDescriptor[]
  byCol: Record<string, FieldDescriptor>
  layout: LayoutPlan
}

/* ── Renderer / widget / cell-editor function contracts ─────────────────────── */

export interface ReadRendererProps {
  descriptor: FieldDescriptor
  value: unknown
  /** The whole record, when a renderer needs sibling values. */
  record?: EntityRecord
}
export type ReadRenderer = (props: ReadRendererProps) => ReactElement | null

/**
 * Option data a widget cannot fetch itself (Rule 8, state-agnostic): reference
 * targets, assignable people, tag options. The app/SchemaForm injects it.
 */
export interface FieldOptionContext {
  people?: import('@fams/ui-kit').PersonOption[]
  referenceOptions?: import('@fams/ui-kit').ComboOption[]
  tagOptions?: import('@fams/ui-kit').TagOption[]
}

/**
 * Field-chrome variant: `'default'` is today's shape (an external `<Label>`
 * rendered by the caller, above a normally-outlined control). `'inset-label'`
 * is figma-spec-create-sheet.md §2's anatomy — a small muted caption drawn
 * INSIDE the same outline as the value, one shared border — opted into by a
 * caller (e.g. `CreationSheet`) and honored per-widget (a widget that has no
 * inset presentation simply ignores it and renders its default shape).
 */
export type FieldChrome = 'default' | 'inset-label'

export interface EditWidgetProps {
  descriptor: FieldDescriptor
  value: unknown
  onChange: (value: unknown) => void
  onBlur?: () => void
  /** Field-level validation message (already resolved from the form state). */
  error?: string
  disabled?: boolean
  /** DOM id to bind a label to. */
  id?: string
  /** id of the field's error message element (`FieldError`) — the widget puts
   *  it on the control as `aria-describedby` while errored. */
  describedBy?: string
  /** react-hook-form field name (defaults to `descriptor.col`). */
  name?: string
  /** Injected option data for pickers/selects. */
  context?: FieldOptionContext
  /** Requested field-chrome variant — see `FieldChrome`. Defaults to `'default'`. */
  chrome?: FieldChrome
  /**
   * The react-hook-form `Control` for the whole form, passed through so a
   * COMPOSITE widget can read/write SIBLING columns (not just its own
   * `value`/`onChange`) — e.g. a location picker that also fills structured
   * address parts, or a mode toggle that clears the other branch's fields.
   * `unknown` here to avoid a react-hook-form type dependency in this contract
   * (the composer already depends on it; consumers cast to `Control`). Simple
   * single-column widgets ignore this.
   */
  control?: unknown
}
export type EditWidget = (props: EditWidgetProps) => ReactElement

/** Single-cell inline-edit contract that ListView (task 2.4) consumes. */
export interface CellEditorProps {
  descriptor: FieldDescriptor
  value: unknown
  onCommit: (value: unknown) => void
  onCancel: () => void
  context?: FieldOptionContext
}
export type CellEditor = (props: CellEditorProps) => ReactElement

/** A registry entry: how to read, edit, and inline-edit one field type. */
export interface FieldTypeEntry {
  read: ReadRenderer
  edit: EditWidget
  cell?: CellEditor
}

/** Registry keys are the blueprint field types, but extensions may add new keys. */
export type FieldTypeKey = FieldType | (string & {})
