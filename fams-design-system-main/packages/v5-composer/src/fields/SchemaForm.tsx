/**
 * SchemaForm + `useSchemaForm` — react-hook-form driven from a compiled field-set.
 *
 * Wires the compiler output (Zod schema + layout plan + descriptors) to the
 * FieldRegistry's edit widgets:
 *  - `zodResolver` validates against the compiled schema; errors surface per field.
 *  - each field is rendered by a `<FieldControl>` using `useController`, so a
 *    keystroke re-renders ONLY that field's subtree — never the whole form
 *    (scoped rerender; proven by a render-count probe in the tests).
 *  - repeating groups use `useFieldArray` (add/remove).
 *  - submit maps the parsed values back to a `{ col: value }` record.
 *
 * `useSchemaForm` is the headless core (CreationSheet in task 2.3 consumes it);
 * `SchemaForm` is the batteries-included component.
 *
 * ## Form values ↔ record shape
 * Inside the form every multi-valued field — `MultiSelect`, `MultiReference`,
 * `tags` — is an array (react-hook-form/`useFieldArray` need arrays to track
 * rows). On submit, `mapSchemaFormOut` rewrites that in-form shape into the
 * shape `InMemoryDataStore` (`../store.ts`) actually stores: a `MultiReference`
 * column becomes a CSV string (`ids.join(',')`, via the store's exported
 * `joinRefCsv` — one join convention, not two copies of it), so
 * `store.create(code, schemaFormValues)` never shape-drifts. `MultiSelect` and
 * `tags` are NOT reference-backed columns and stay arrays end-to-end (the
 * store's own `EntityRecord.tags` is `string[]`, not CSV). Repeating scalar
 * groups unwrap from rhf's `{ value }[]` rows back to a plain scalar array,
 * same as before.
 */
import { useEffect, useMemo, type ReactElement } from 'react'
import { useForm, useController, useFieldArray, type Control, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Stack, FormGrid, FormSection, Label, Button, FieldError, FieldErrorSlot } from '@fams/ui-kit'
import { joinRefCsv } from '../store'
import type { CompiledFieldSet, FieldChrome, FieldDescriptor, FieldOptionContext } from './types'
import { getEditWidget, getEditWidgetOverride } from './registry'

/**
 * Field types with an inset-chrome-capable widget (see `widgets.tsx`'s
 * `insetWrap`) — everything except the multi-line/boolean/multi-value shapes
 * whose own external label figma-spec-create-sheet.md never asks to move
 * inside a box (Note's textarea keeps its label ABOVE the field, per spec's
 * own metrics table, not inside it).
 */
const INSET_CAPABLE_TYPES = new Set<FieldDescriptor['type']>([
  'Auto',
  'SmallText',
  'Email',
  'Phone',
  'Numeric',
  'Number',
  'Currency',
  'SingleSelect',
  'SingleReference',
  'MultiReference',
  'Date',
  'DateTime',
  'Assignee',
  // Multi-line fields own their label too under inset-label chrome — the
  // `TextareaWidget` renders the Design System V2 float-label anatomy
  // (node 4808), so FieldControl must not also draw an external <Label>.
  'BigText',
  'LongText',
])

/** Resolves the edit widget for one descriptor — a `component.name` override wins, else the type-keyed default. */
function resolveWidget(descriptor: FieldDescriptor) {
  return (descriptor.component?.name && getEditWidgetOverride(descriptor.component.name)) || getEditWidget(descriptor.type)
}

/**
 * A widget "owns" its label (FieldControl must NOT also render an external
 * `<Label>`) when either: (a) it's a named `component` override — those
 * fully own their presentation, same convention as the read-side
 * `componentRegistry` (registry.tsx); or (b) `fieldChrome` requests the
 * inset anatomy AND this descriptor's type has an inset-capable widget.
 */
function ownsLabel(descriptor: FieldDescriptor, fieldChrome: FieldChrome): boolean {
  if (descriptor.component?.name) return true
  return fieldChrome === 'inset-label' && INSET_CAPABLE_TYPES.has(descriptor.type)
}

type Values = Record<string, unknown>

function buildDefaults(compiled: CompiledFieldSet, provided?: Values): Values {
  const out: Values = {}
  for (const d of compiled.descriptors) {
    if (provided && d.col in provided) {
      out[d.col] = provided[d.col]
    } else if (d.default !== undefined) {
      // Mirrors the store's own `applyDefaults` (save-time fallback) so a
      // creation form's initial render already shows the blueprint default —
      // e.g. a SingleSelect field pre-selects visually instead of only
      // resolving to the right value once the record is saved.
      out[d.col] = d.default
    } else if (d.multiple || d.repeating) {
      out[d.col] = []
    } else if (d.type === 'Boolean') {
      out[d.col] = false
    } else {
      out[d.col] = ''
    }
  }
  return out
}

export interface UseSchemaFormOptions {
  defaultValues?: Values
  /** Validation trigger mode (default `onBlur`). */
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all'
}

export interface UseSchemaFormResult {
  form: UseFormReturn<Values>
  compiled: CompiledFieldSet
}

export function useSchemaForm(compiled: CompiledFieldSet, opts: UseSchemaFormOptions = {}): UseSchemaFormResult {
  const defaults = useMemo(() => buildDefaults(compiled, opts.defaultValues), [compiled, opts.defaultValues])
  const form = useForm<Values>({
    resolver: zodResolver(compiled.schema as never),
    defaultValues: defaults,
    mode: opts.mode ?? 'onBlur',
  })

  // Field-level creation `autofill` (see `FieldDescriptor.creation` in
  // `./types.ts`): when a watched field (`whenCol`) is edited, the target
  // field's value is set — a one-way "preselect" the operator can still
  // freely change afterward. Three modes, tried in this order per rule:
  //   1. `equals`/`value` — set to `value` when `whenCol` matches `equals`
  //      exactly (UCCP Source=NCC → Priority=Critical).
  //   2. `map` — a `{ [whenCol value]: target value }` lookup table (UCCP
  //      Municipality → auto-assigned Inspector roster); no match, no-op.
  //   3. `template` — a `"{col} · {col}"` string built from CURRENT form
  //      values at fire time (placeholders reference other cols, not
  //      necessarily `whenCol` itself) — UCCP's auto-generated Title. Blank
  //      placeholders resolve to `''` (never leave the literal token).
  // Purely additive: a compiled field-set with no `autofill` descriptors
  // subscribes no watcher at all.
  const autofillTargets = useMemo(() => compiled.descriptors.filter((d) => d.creation?.autofill != null), [compiled])
  useEffect(() => {
    if (autofillTargets.length === 0) return
    const sub = form.watch((values, { name }) => {
      for (const d of autofillTargets) {
        const rule = d.creation!.autofill!
        if (name !== rule.whenCol) continue
        if (rule.template != null) {
          const filled = rule.template.replace(/\{(\w+)\}/g, (_m, col: string) => {
            const v = values[col]
            return v == null ? '' : String(v)
          })
          form.setValue(d.col, filled, { shouldDirty: true })
        } else if (rule.map != null) {
          const key = values[rule.whenCol]
          const mapped = key == null ? undefined : (rule.map as Record<string, unknown>)[String(key)]
          if (mapped !== undefined) form.setValue(d.col, mapped, { shouldDirty: true })
        } else if (values[rule.whenCol] === rule.equals) {
          form.setValue(d.col, rule.value, { shouldDirty: true })
        }
      }
    })
    return () => sub.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `form` identity is stable for the component's lifetime
  }, [autofillTargets])

  return { form, compiled }
}

/* ── Field-level renderers (scoped subscriptions) ───────────────────────────── */

interface FieldControlProps {
  descriptor: FieldDescriptor
  control: Control<Values>
  context?: FieldOptionContext
  disabled?: boolean
  /** Test probe — called on every render of THIS field (render-count guard). */
  onRender?: (col: string) => void
  /** Requested field-chrome variant (default `'default'`) — see `FieldChrome`. */
  fieldChrome?: FieldChrome
  /**
   * Whether to always reserve a blank error row under the field (default
   * `true`, the zero-shift contract). Set `false` for surfaces whose spec has
   * no reserved row (e.g. a create wizard's exact 16px field rhythm) — the
   * error then renders only when present, pushing content below it.
   */
  reserveError?: boolean
}

/** A single scalar field. `useController` scopes re-renders to this field only. */
function FieldControl({ descriptor, control, context, disabled, onRender, fieldChrome = 'default', reserveError = true }: FieldControlProps): ReactElement {
  const { field, fieldState } = useController({ name: descriptor.col, control })
  onRender?.(descriptor.col)
  const id = `sf-${descriptor.col}`
  const errorId = `${id}-error`
  const error = fieldState.error?.message
  const widget = resolveWidget(descriptor)
  const labelOwnedByWidget = ownsLabel(descriptor, fieldChrome)
  return (
    <div className="flex flex-col gap-1">
      {labelOwnedByWidget ? null : (
        <Label htmlFor={id}>
          {descriptor.label}
          {descriptor.required ? <span className="ms-0.5 text-destructive-emphasis">*</span> : null}
        </Label>
      )}
      {widget({
        descriptor,
        value: field.value,
        onChange: field.onChange,
        onBlur: field.onBlur,
        error,
        disabled,
        id,
        describedBy: error ? errorId : undefined,
        name: field.name,
        context,
        chrome: fieldChrome,
        control,
      })}
      {/* 12px below the field box (the DS-wide field→error spacing token —
          see `FieldError`'s spacing contract): the wrapper's 4px gap + 8px.
          The row is ALWAYS-RESERVED via `FieldErrorSlot` (fix3, zero-shift):
          mounting the bare 18px `FieldError` moved everything below the field
          by 30px (18px row + 12px gap) on error appear AND clear inside sheet
          bodies — same contract the login form already carries. */}
      {reserveError ? (
        <FieldErrorSlot className="mt-2">
          {error ? <FieldError id={errorId}>{error}</FieldError> : null}
        </FieldErrorSlot>
      ) : error ? (
        <FieldError id={errorId} className="mt-2">
          {error}
        </FieldError>
      ) : null}
    </div>
  )
}

/** A repeating list field — `useFieldArray` add/remove over the scalar widget. */
function RepeatingControl({ descriptor, control, context, disabled, onRender }: FieldControlProps): ReactElement {
  const { fields, append, remove } = useFieldArray({ name: descriptor.col, control } as never)
  onRender?.(descriptor.col)
  const itemDescriptor: FieldDescriptor = { ...descriptor, repeating: false, multiple: false }
  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className="text-sm font-medium text-foreground">
        {descriptor.label}
        {descriptor.required ? <span className="ms-0.5 text-destructive-emphasis">*</span> : null}
      </legend>
      {fields.map((f, index) => (
        <ItemControl
          key={f.id}
          descriptor={itemDescriptor}
          control={control}
          name={`${descriptor.col}.${index}.value`}
          context={context}
          disabled={disabled}
          onRemove={() => remove(index)}
        />
      ))}
      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => append({ value: '' } as never)}
        >
          Add {descriptor.label}
        </Button>
      </div>
    </fieldset>
  )
}

interface ItemControlProps {
  descriptor: FieldDescriptor
  control: Control<Values>
  name: string
  context?: FieldOptionContext
  disabled?: boolean
  onRemove: () => void
}

function ItemControl({ descriptor, control, name, context, disabled, onRemove }: ItemControlProps): ReactElement {
  const { field, fieldState } = useController({ name, control })
  const error = fieldState.error?.message
  const errorId = `sf-${name}-error`
  const widget = getEditWidget(descriptor.type)
  return (
    <div className="flex items-start gap-2">
      <div className="flex flex-1 flex-col gap-1">
        {widget({
          descriptor,
          value: field.value,
          onChange: field.onChange,
          onBlur: field.onBlur,
          error,
          disabled,
          describedBy: error ? errorId : undefined,
          name: field.name,
          context,
        })}
        {/* Same 12px field→error spacing AND the same always-reserved
            zero-shift slot as `FieldControl` above. */}
        <FieldErrorSlot className="mt-2">
          {error ? <FieldError id={errorId}>{error}</FieldError> : null}
        </FieldErrorSlot>
      </div>
      <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onRemove} aria-label="Remove">
        Remove
      </Button>
    </div>
  )
}

/**
 * Reference-family field types whose OUTPUT is a CSV string, matching
 * `InMemoryDataStore.writeRefs`'s convention for `MultiReference` columns.
 * `MultiSelect` is deliberately excluded — it is a plain enum, not a
 * reference, and the store keeps it (like `tags`) as an array.
 */
const CSV_REF_TYPES: ReadonlySet<FieldDescriptor['type']> = new Set(['MultiReference'])

/**
 * Maps parsed rhf values back to the `{ col: value }` shape `store.create`
 * expects: unwraps repeating `{ value }[]` rows to a scalar array, and joins
 * `MultiReference` arrays to the CSV string the store's `writeRefs` produces
 * (via the shared `joinRefCsv` helper — single source of truth for the join).
 * Exported standalone so the submit-mapping contract is unit-testable without
 * driving the full rendered form.
 */
export function mapSchemaFormOut(compiled: CompiledFieldSet, values: Values): Values {
  const out: Values = { ...values }
  for (const d of compiled.descriptors) {
    if (d.repeating && Array.isArray(out[d.col])) {
      out[d.col] = (out[d.col] as { value: unknown }[]).map((row) => row?.value)
    } else if (d.multiple && CSV_REF_TYPES.has(d.type) && Array.isArray(out[d.col])) {
      out[d.col] = joinRefCsv((out[d.col] as unknown[]).map(String))
    }
  }
  return out
}

/* ── Public single-field renderer ───────────────────────────────────────────── */

export interface SchemaFormFieldProps {
  compiled: CompiledFieldSet
  /** The `col` of the descriptor to render (must exist in `compiled.byCol`). */
  col: string
  control: Control<Values>
  context?: FieldOptionContext
  disabled?: boolean
  onRender?: (col: string) => void
  /** Requested field-chrome variant (default `'default'`) — see `FieldChrome`. */
  fieldChrome?: FieldChrome
  /** Reserve a blank error row under the field (default `true`) — see `FieldControlProps.reserveError`. */
  reserveError?: boolean
}

/**
 * SchemaFormField — render ONE compiled field (label + registry edit widget +
 * error) against an external `useSchemaForm` `form.control`. Picks the repeating
 * vs scalar control the same way `SchemaForm` does internally.
 *
 * Exists so a tier-2 template that lays fields out itself (e.g. a stepped
 * create wizard) can reuse the exact field rendering `SchemaForm` uses, driving
 * one shared `useSchemaForm` form, without re-importing react-hook-form or
 * forking the field control. Returns `null` for an unknown `col`.
 */
export function SchemaFormField({
  compiled,
  col,
  control,
  context,
  disabled,
  onRender,
  fieldChrome,
  reserveError,
}: SchemaFormFieldProps): ReactElement | null {
  const descriptor = compiled.byCol[col]
  if (!descriptor) return null
  if (descriptor.repeating) {
    return <RepeatingControl descriptor={descriptor} control={control} context={context} disabled={disabled} onRender={onRender} />
  }
  return (
    <FieldControl descriptor={descriptor} control={control} context={context} disabled={disabled} onRender={onRender} fieldChrome={fieldChrome} reserveError={reserveError} />
  )
}

/* ── SchemaForm ─────────────────────────────────────────────────────────────── */

export interface SchemaFormProps {
  compiled: CompiledFieldSet
  onSubmit: (values: Values) => void
  defaultValues?: Values
  context?: FieldOptionContext
  disabled?: boolean
  submitLabel?: string
  mode?: UseSchemaFormOptions['mode']
  id?: string
  /** Test probe forwarded to every field's render (render-count guard). */
  onFieldRender?: (col: string) => void
}

export function SchemaForm({
  compiled,
  onSubmit,
  defaultValues,
  context,
  disabled,
  submitLabel = 'Save',
  mode,
  id,
  onFieldRender,
}: SchemaFormProps): ReactElement {
  const { form } = useSchemaForm(compiled, { defaultValues, mode })
  const { byCol, layout } = compiled

  const renderField = (col: string): ReactElement | null => {
    const d = byCol[col]
    if (!d) return null
    const Comp = d.repeating ? RepeatingControl : FieldControl
    return (
      <Comp
        key={col}
        descriptor={d}
        control={form.control}
        context={context}
        disabled={disabled}
        onRender={onFieldRender}
      />
    )
  }

  return (
    <form id={id} noValidate onSubmit={form.handleSubmit((values) => onSubmit(mapSchemaFormOut(compiled, values)))}>
      <Stack gap="section">
        {layout.groups.map((group) => {
          const rows = group.rows.map((row, i) => (
            <FormGrid key={i} columns={(Math.min(row.cols.length, 2) || 1) as 1 | 2}>
              {row.cols.map(renderField)}
            </FormGrid>
          ))
          return group.name ? (
            <FormSection key={group.id} title={group.name}>
              {rows}
            </FormSection>
          ) : (
            <Stack key={group.id} gap="field">
              {rows}
            </Stack>
          )
        })}
        <div>
          <Button type="submit" disabled={disabled}>
            {submitLabel}
          </Button>
        </div>
      </Stack>
    </form>
  )
}
