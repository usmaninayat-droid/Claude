/**
 * Edit widgets — ui-kit-based input controls, one per field type.
 *
 * Registered as DATA (Rule 8, state-agnostic): pickers that need option data
 * they cannot fetch (references, people, tags) read it from the injected
 * `context`; enums read `descriptor.options`. No Radix imports — every control
 * comes from `@fams/ui-kit`.
 */
import { useRef, type ReactElement, type Ref } from 'react'
import {
  Input,
  InsetField,
  Textarea,
  Switch,
  Combobox,
  PeoplePicker,
  TagPicker,
  ColorPicker,
  PhoneInput as UiPhoneInput,
  type ComboOption,
  type TagOption,
} from '@fams/ui-kit'
import { ChevronDown } from '@fams/ui-kit/icons'
import type { EditWidget, EditWidgetProps, FieldChrome } from './types'
import { resolveDefaultFieldIcon } from './renderers'

/** `true` for a value an empty/DEFAULT-state field shell should treat as "nothing entered yet" — an empty string/array or nullish, never `0`/`false` (a real, falsy-but-present value). */
function isEmptyValue(v: unknown): boolean {
  if (v == null || v === '') return true
  if (Array.isArray(v)) return v.length === 0
  return false
}

/**
 * Wraps `control` in `InsetField` when `chrome === 'inset-label'`, else
 * returns it unchanged — the shared plumbing every text-shaped widget below
 * uses to opt into figma-spec-create-sheet.md §2's inline-label anatomy
 * without duplicating the box chrome per widget. Widgets that have no inset
 * presentation (Textarea, Boolean, MultiSelect) simply never call this.
 *
 * Also the ONE place the platform field-states spec's DEFAULT/FILLED anatomy
 * gets wired up for every inset-capable widget: `hasValue` drives the shell's
 * placeholder-position ↔ floated-caption switch, `required` draws the
 * asterisk, `leadingIcon` resolves through the central `resolveDefaultFieldIcon`
 * type→glyph map (person/calendar/link/… per field type, or a blueprint-authored
 * override), and `dropdown: true` draws the trailing chevron for select-shaped
 * controls.
 */
function insetWrap(
  chrome: FieldChrome | undefined,
  descriptor: EditWidgetProps['descriptor'],
  value: unknown,
  opts: {
    htmlFor?: string
    hasError?: boolean
    disabled?: boolean
    filled?: boolean
    dropdown?: boolean
    /** Ref to the InsetField box — passed so a dropdown widget can anchor its
     *  popover to the full field (see `SingleSelectWidget`). */
    anchorRef?: Ref<HTMLDivElement>
  },
  control: ReactElement,
): ReactElement {
  if (chrome !== 'inset-label') return control
  const Icon = resolveDefaultFieldIcon(descriptor)
  return (
    <InsetField
      ref={opts.anchorRef}
      label={descriptor.label}
      htmlFor={opts.htmlFor}
      hasError={opts.hasError}
      disabled={opts.disabled}
      filled={opts.filled}
      required={descriptor.required}
      hasValue={!isEmptyValue(value)}
      leadingIcon={Icon ? <Icon className="size-4" aria-hidden /> : undefined}
      trailingIcon={opts.dropdown ? <ChevronDown className="size-4" aria-hidden /> : undefined}
    >
      {control}
    </InsetField>
  )
}

function strValue(v: unknown): string {
  return v == null ? '' : String(v)
}
function arrValue(v: unknown): string[] {
  if (Array.isArray(v)) return (v as unknown[]).map(String)
  return v == null || v === '' ? [] : [String(v)]
}
function enumOptions(descriptor: EditWidgetProps['descriptor']): ComboOption[] {
  return (descriptor.options ?? []).map((o) => ({ value: o, label: o }))
}

const TextWidget: EditWidget = ({ descriptor, value, onChange, onBlur, error, disabled, id, describedBy, name, chrome }) =>
  insetWrap(
    chrome,
    descriptor,
    value,
    { htmlFor: id, hasError: !!error, disabled },
    <Input
      id={id}
      name={name ?? descriptor.col}
      value={strValue(value)}
      bare={chrome === 'inset-label'}
      aria-describedby={describedBy}
      hasError={!!error}
      disabled={disabled}
      placeholder={descriptor.placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    />,
  )

const TextareaWidget: EditWidget = ({
  descriptor,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  id,
  describedBy,
  name,
  chrome,
}) => (
  // Under `inset-label` chrome, use the Textarea's float-label anatomy (Design
  // System V2 node 4808:2846) so a multi-line field matches the inset text
  // fields around it — the label sits inside the box and floats up on
  // focus/fill, instead of a bare unlabeled box.
  <Textarea
    id={id}
    name={name ?? descriptor.col}
    value={strValue(value)}
    aria-invalid={error ? true : undefined}
    aria-describedby={describedBy}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value)}
    onBlur={onBlur}
    {...(chrome === 'inset-label'
      ? { floatLabel: true, label: descriptor.label, required: descriptor.required }
      : { placeholder: descriptor.placeholder })}
  />
)

const EmailWidget: EditWidget = (p) => <TypedInput {...p} type="email" />
const DateWidget: EditWidget = (p) => (
  <TypedInput {...p} type={p.descriptor.type === 'DateTime' ? 'datetime-local' : 'date'} />
)

/**
 * PhoneWidget — figma-spec-create-sheet.md §2.8's country-flag + dial-code +
 * number field, for every `Phone`-typed field (no per-field `component`
 * override needed — the rich control is the type's default now).
 */
const PhoneWidget: EditWidget = ({ descriptor, value, onChange, onBlur, error, disabled, id, name, chrome }) =>
  insetWrap(
    chrome,
    descriptor,
    value,
    { htmlFor: id, hasError: !!error, disabled },
    <UiPhoneInput
      id={id}
      name={name ?? descriptor.col}
      // Metadata-driven dial-code default: a blueprint authors
      // `component: { props: { defaultCountry: 'QA' } }` on its Phone field
      // (tenant vocabulary lives in the blueprint, never here — rule 10);
      // omitted keeps PhoneInput's own default.
      defaultCountry={(descriptor.component?.props as { defaultCountry?: string } | undefined)?.defaultCountry}
      value={strValue(value)}
      bare={chrome === 'inset-label'}
      hasError={!!error}
      disabled={disabled}
      placeholder={descriptor.placeholder}
      ariaLabel={descriptor.label}
      onChange={onChange}
      onBlur={onBlur}
    />,
  )

function TypedInput({ descriptor, value, onChange, onBlur, error, disabled, id, describedBy, name, type, chrome }: EditWidgetProps & { type: string }) {
  return insetWrap(
    chrome,
    descriptor,
    value,
    { htmlFor: id, hasError: !!error, disabled },
    <Input
      id={id}
      type={type}
      name={name ?? descriptor.col}
      value={strValue(value)}
      bare={chrome === 'inset-label'}
      aria-describedby={describedBy}
      hasError={!!error}
      disabled={disabled}
      placeholder={descriptor.placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    />,
  )
}

const NumberWidget: EditWidget = ({ descriptor, value, onChange, onBlur, error, disabled, id, describedBy, name, chrome }) =>
  insetWrap(
    chrome,
    descriptor,
    value,
    { htmlFor: id, hasError: !!error, disabled },
    <Input
      id={id}
      type="number"
      name={name ?? descriptor.col}
      value={strValue(value)}
      bare={chrome === 'inset-label'}
      aria-describedby={describedBy}
      hasError={!!error}
      disabled={disabled}
      min={descriptor.min}
      max={descriptor.max}
      placeholder={descriptor.placeholder}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      onBlur={onBlur}
    />,
  )

const BooleanWidget: EditWidget = ({ value, onChange, disabled, id }) => (
  <Switch id={id} checked={value === true || value === 'true'} disabled={disabled} onCheckedChange={onChange} />
)

const SingleSelectWidget: EditWidget = ({ descriptor, value, onChange, disabled, id, describedBy, error, chrome }) => {
  // Searchable by itself (FAMS portal spec 33223:10031, 2026-08-25 fields
  // cycle): enum dropdowns are the searchable `Combobox`, not a plain Select —
  // typing on the closed field filters the options; X clears the selection.
  // Under inset-label chrome the Combobox trigger is bare INSIDE the InsetField
  // shell, so its popover would match the narrower inner trigger. Anchoring the
  // popover to the field box (`fieldRef`) makes the menu span the full field
  // width and left-aligns it to the field (Design System V2 dropdown node
  // 4834:5573).
  const fieldRef = useRef<HTMLDivElement>(null)
  const inset = chrome === 'inset-label'
  const control = (
    <Combobox
      id={id}
      ariaLabel={descriptor.label}
      options={enumOptions(descriptor)}
      value={value != null && value !== '' ? String(value) : null}
      disabled={disabled}
      hasError={!!error}
      clearable
      placeholder={descriptor.placeholder ?? `Select ${descriptor.label}`}
      onChange={(v) => onChange(v ?? undefined)}
      popoverAnchorRef={inset ? fieldRef : undefined}
      triggerProps={{
        'aria-describedby': describedBy,
        // `focus-visible:ring-0` too (fix3): the InsetField shell renders the
        // keyboard ring for the whole card — the bare trigger must not add an
        // inner second ring.
        className: inset
          ? 'h-auto w-full border-0 bg-transparent p-0 font-semibold focus:ring-0 focus-visible:ring-0'
          : undefined,
      }}
    />
  )
  // No `dropdown: true` here — `Combobox` already draws its own
  // `ChevronsUpDown` unconditionally (bare trigger or not), so a second
  // box-level chevron from the shell would double it up.
  return insetWrap(chrome, descriptor, value, { htmlFor: id, hasError: !!error, disabled, anchorRef: fieldRef }, control)
}

const MultiSelectWidget: EditWidget = ({ descriptor, value, onChange, disabled, error, id }) => (
  <Combobox
    id={id}
    ariaLabel={descriptor.label}
    options={enumOptions(descriptor)}
    value={arrValue(value)}
    multiple
    disabled={disabled}
    hasError={!!error}
    placeholder={descriptor.placeholder ?? `Select ${descriptor.label}`}
    onChange={(v) => onChange(v ?? [])}
  />
)

const ReferenceWidget: EditWidget = ({ descriptor, value, onChange, disabled, error, context, id, describedBy, chrome }) => {
  // See `SingleSelectWidget` — the popover anchors to the whole InsetField box.
  const fieldRef = useRef<HTMLDivElement>(null)
  const inset = chrome === 'inset-label'
  const control = (
    <Combobox
      id={id}
      ariaLabel={descriptor.label}
      options={context?.referenceOptions ?? []}
      value={descriptor.multiple ? arrValue(value) : value != null && value !== '' ? String(value) : null}
      multiple={descriptor.multiple}
      disabled={disabled}
      hasError={!!error}
      // The field's own LABEL, never its `entityType`. `entityType` is a
      // machine code (`asset/vehicle`, `crm/companies`), and preferring it put
      // that code in front of users on every reference picker on the platform
      // — the job-order wizard's vehicle step read "Search asset/vehicle".
      // The label is the human name the blueprint already authored for this
      // field, so it is the correct source for user-facing copy; `entityType`
      // stays only as a last-resort fallback for a descriptor with no label.
      placeholder={descriptor.placeholder ?? `Search ${descriptor.label ?? descriptor.entityType}`}
      onChange={(v) => onChange(v ?? (descriptor.multiple ? [] : null))}
      popoverAnchorRef={inset ? fieldRef : undefined}
      triggerProps={{
        'aria-describedby': describedBy,
        // See SingleSelectWidget — shell owns the keyboard ring in inset chrome.
        className: inset
          ? 'h-auto w-full border-0 bg-transparent p-0 font-semibold focus:ring-0 focus-visible:ring-0'
          : undefined,
      }}
    />
  )
  // No `dropdown: true` — same reason as SingleSelectWidget above (`Combobox`
  // already draws its own chevron unconditionally).
  return insetWrap(chrome, descriptor, value, { htmlFor: id, hasError: !!error, disabled, anchorRef: fieldRef }, control)
}

const AssigneeWidget: EditWidget = ({ descriptor, value, onChange, disabled, context, id, chrome }) => {
  const control = (
    <PeoplePicker
      id={id}
      people={context?.people ?? []}
      value={descriptor.multiple ? arrValue(value) : value != null && value !== '' ? String(value) : null}
      multiple={descriptor.multiple}
      disabled={disabled}
      sectionLabel={descriptor.label}
      className={
        // See SingleSelectWidget — shell owns the keyboard ring in inset chrome.
        chrome === 'inset-label' ? 'h-auto border-0 bg-transparent p-0 font-semibold focus:ring-0 focus-visible:ring-0' : undefined
      }
      onChange={(v) => onChange(v ?? (descriptor.multiple ? [] : null))}
    />
  )
  return insetWrap(chrome, descriptor, value, { htmlFor: id, disabled, dropdown: true }, control)
}

const TagsWidget: EditWidget = ({ descriptor, value, onChange, disabled, context, id }) => {
  const options: TagOption[] = context?.tagOptions ?? (descriptor.options ?? []).map((o) => ({ value: o, label: o }))
  return (
    <TagPicker
      id={id}
      options={options}
      value={arrValue(value)}
      disabled={disabled}
      placeholder={descriptor.placeholder ?? 'Select tags…'}
      onChange={onChange}
    />
  )
}

const ColorWidget: EditWidget = ({ value, onChange }) => (
  // Empty until the user picks — no hardcoded hex default (hard rule 2 / token lint).
  <ColorPicker value={value ? String(value) : ''} onChange={onChange} />
)

/**
 * AutoWidget — the computed/system-generated field. `readOnly` (not
 * `disabled`, so the value stays selectable/copyable) with a muted `filled`
 * fill and no border — figma-spec-create-sheet.md §2.6's Compliance Time
 * ("distinct light gray-blue fill... signaling non-interactive", not the
 * dimmed/grayed-out look a `disabled` control implies).
 */
const AutoWidget: EditWidget = ({ descriptor, value, id, name, chrome }) =>
  insetWrap(
    chrome,
    descriptor,
    value,
    { htmlFor: id, filled: true },
    <Input id={id} name={name ?? descriptor.col} value={strValue(value)} bare={chrome === 'inset-label'} filled readOnly />,
  )

export const widgets = {
  TextWidget,
  TextareaWidget,
  EmailWidget,
  PhoneWidget,
  DateWidget,
  NumberWidget,
  BooleanWidget,
  SingleSelectWidget,
  MultiSelectWidget,
  ReferenceWidget,
  AssigneeWidget,
  TagsWidget,
  ColorWidget,
  AutoWidget,
}
