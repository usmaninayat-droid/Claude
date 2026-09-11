/**
 * FieldRegistry + compiler + SchemaForm — the v5 metadata-driven form layer.
 *
 * ONE `FieldType → { read, edit, cell }` registry (built from `@fams/ui-kit`),
 * a compiler that turns blueprint field metadata into a cached Zod schema +
 * layout plan + descriptors, and a react-hook-form `SchemaForm` / headless
 * `useSchemaForm` that render from that output. See `types.ts` for the contracts.
 */

/* ── Compiler ───────────────────────────────────────────────────────────────── */
export { compileFieldSet, clearCompileCache, getCompileCacheStats } from './compiler'
export type { FieldSetInput, CompileOptions } from './compiler'

/* ── Shared contracts ───────────────────────────────────────────────────────── */
export type {
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
} from './types'

/* ── Registry ───────────────────────────────────────────────────────────────── */
export {
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
} from './registry'

/* ── Identity display names (React) ────────────────────────────────────────── */
export { DisplayNameProvider, useDisplayName } from './display-names'
export type { DisplayNameResolver, DisplayNameProviderProps } from './display-names'

/* ── Linked-record activation (React) ──────────────────────────────────────── */
export { LinkedRecordProvider, useLinkedRecordOpener } from './linked-records'
export type { LinkedRecordTarget, LinkedRecordOpener, LinkedRecordProviderProps } from './linked-records'
/* ── Named-icon vocabulary (shared by every icon-bearing renderer) ──────────── */
export { FIELD_ICON_VOCABULARY, FIELD_ICON_NAMES, resolveFieldIcon, resolveDefaultFieldIcon } from './renderers'
// The ONE date format, the ONE machine-token humanizer, and the ONE
// progress-meter threshold-tone computation, exported so a consumer outside
// the field registry (e.g. v5-templates' RecordTable) renders dates, enum
// keys and threshold-driven tones identically instead of growing a second
// implementation.
export { formatFigmaDate, humanizeEnumValue, computeThresholdTone } from './renderers'

/* ── SchemaForm (React) ─────────────────────────────────────────────────────── */
export { SchemaForm, SchemaFormField, useSchemaForm, mapSchemaFormOut } from './SchemaForm'
export type { SchemaFormProps, SchemaFormFieldProps, UseSchemaFormOptions, UseSchemaFormResult } from './SchemaForm'
