/**
 * Named edit-widget overrides for the CreationSheet's richer field anatomy
 * (figma-spec-create-sheet.md §3) — `IconSelect` and `Dropzone`. Registered
 * into `@fams/v5-composer`'s edit-widget-by-`component.name` registry (see
 * `registry.tsx`'s `registerEditWidget`), which starts EMPTY there by
 * design: business/product-aware named widgets live here, in the tier-2
 * patterns package, never in the core composer.
 *
 * `LocationPicker` (the third named widget the spec needs) is NOT in this
 * file — it lazy-loads the `./map` entry's `maplibre-gl` chain, so it gets
 * its own file (`LocationPickerWidget.tsx`) to keep that boundary obvious.
 *
 * Registration is exposed as CALLABLE FUNCTIONS, not a bare side-effect
 * import — `@fams/v5-templates`'s `package.json` declares `"sideEffects":
 * false`, and a bare `import './widgets'` with no consumed binding is
 * exactly the shape tsup/esbuild are licensed to drop entirely at build
 * time (verified: an existing bare side-effect import in this same package
 * gets an "ignored-bare-import" warning and is absent from `dist/index.js`
 * — see `CreationSheet.tsx`'s own registration call for how this file
 * avoids that trap: `register-widgets.ts`'s aggregator is CALLED, not just
 * imported).
 */
import { useRef, type ReactNode } from 'react'
import { Flag, Languages, MapPin, User, Wrench, type LucideIcon } from '@fams/ui-kit/icons'
import { IconSelect, InsetField, FileUploader, type IconSelectOption, type UploadedFile } from '@fams/ui-kit'
import { registerEditWidget, resolveDefaultFieldIcon, type EditWidget } from '@fams/v5-composer'

/* ── IconSelect ──────────────────────────────────────────────────────────────
 * A `SingleSelect` field opts in via `component: { name: 'IconSelect', props }`.
 * `props` is plain JSON (blueprint-authorable), never a React node:
 *   - `icon?: string`            — named leading glyph shown in the TRIGGER
 *                                  (e.g. `"wrench"` for Service Type). Omit
 *                                  for a flush-left trigger (Ticket Source/
 *                                  Ticket Type/KPI).
 *   - `sectionLabel?: string`    — the popover's gray title row. Defaults to
 *                                  the field's own label.
 *   - `optionTone?: Record<string, 'error'|'warning'|'success'>` — maps an
 *     OPTION VALUE to a severity tone, rendered as a colored flag icon in
 *     the popover row (Priority Level's Critical/Medium/Minor). Omit for a
 *     plain-text option list (Ticket Source, Ticket Type, Service Type, KPI,
 *     Customer Language).
 * ────────────────────────────────────────────────────────────────────────── */

/** Small, generic named-icon vocabulary — extend as new fields need one. Never business-specific (the NAMES are generic UI glyphs; what they're attached to is the blueprint's business). */
const NAMED_ICON: Record<string, LucideIcon> = {
  wrench: Wrench,
  flag: Flag,
  translate: Languages,
  person: User,
  pin: MapPin,
}

const TONE_CLASS: Record<'error' | 'warning' | 'success', string> = {
  error: 'text-destructive',
  warning: 'text-warning',
  success: 'text-success',
}

interface IconSelectProps {
  icon?: string
  sectionLabel?: string
  optionTone?: Record<string, 'error' | 'warning' | 'success'>
}

function resolveIcon(name: string | undefined, className: string): ReactNode {
  if (!name) return null
  const Icon = NAMED_ICON[name]
  return Icon ? <Icon className={className} aria-hidden /> : null
}

export const IconSelectWidget: EditWidget = ({ descriptor, value, onChange, disabled, error, id, chrome }) => {
  const props = (descriptor.component?.props ?? {}) as IconSelectProps
  // Under inset-label chrome the bare trigger sits INSIDE the InsetField
  // shell, so the popover would match the narrower inner trigger. Anchoring
  // it to the field box makes the menu span the full field width and
  // left-align to it (Design System V2 dropdown node 4834:5573) — same
  // pattern as v5-composer's SingleSelectWidget.
  const fieldRef = useRef<HTMLDivElement>(null)
  const options: IconSelectOption[] = (descriptor.options ?? []).map((o) => {
    const tone = props.optionTone?.[o]
    return {
      value: o,
      label: o,
      icon: tone ? <Flag className={`size-4 ${TONE_CLASS[tone]}`} aria-hidden /> : undefined,
    }
  })
  // An authored `props.icon` (this widget's own small vocabulary above) wins;
  // otherwise fall back to the SAME central type→glyph default every other
  // inset-capable widget uses (`resolveDefaultFieldIcon` — v5-composer's
  // `insetWrap`), so an IconSelect field with no explicit icon still gets the
  // platform field-states spec's dynamic leading glyph instead of a flush-left
  // trigger by omission.
  const DefaultIcon = resolveDefaultFieldIcon(descriptor)
  const leadingIcon =
    resolveIcon(props.icon, 'size-5') ?? (DefaultIcon ? <DefaultIcon className="size-5" aria-hidden /> : null)
  const hasValue = value != null && value !== ''

  const control = (
    <IconSelect
      id={id}
      ariaLabel={descriptor.label}
      value={value != null && value !== '' ? String(value) : null}
      onChange={onChange}
      options={options}
      leadingIcon={leadingIcon}
      sectionLabel={props.sectionLabel ?? descriptor.label}
      placeholder={descriptor.placeholder ?? `Select ${descriptor.label}`}
      disabled={disabled}
      hasError={!!error}
      bare={chrome === 'inset-label'}
      popoverAnchorRef={chrome === 'inset-label' ? fieldRef : undefined}
    />
  )
  // `bare` strips IconSelect's own outline on the assumption that a shell
  // supplies it — under inset-label chrome that shell is `InsetField`, which
  // default widgets get from v5-composer's `insetWrap` but override widgets
  // must add themselves (they fully own their presentation). No
  // `trailingIcon` here — `IconSelect`'s own trigger already draws its own
  // chevron unconditionally (bare or not), so adding InsetField's box-level
  // one too would double it up.
  if (chrome !== 'inset-label') return control
  return (
    <InsetField
      ref={fieldRef}
      label={descriptor.label}
      htmlFor={id}
      hasError={!!error}
      disabled={disabled}
      required={descriptor.required}
      hasValue={hasValue}
    >
      {control}
    </InsetField>
  )
}

/* ── Dropzone ────────────────────────────────────────────────────────────────
 * A field opts in via `component: { name: 'Dropzone', props }`. `props`:
 *   - `accept?: string`, `maxFiles?: number`, `maxFileSizeMB?: number` — same
 *     contract as `FileUploader`.
 *   - `acceptedFormatsCaption?: string` — the small caption below the CTA
 *     text (figma-spec-create-sheet.md §2.13's "Accepted formats: …").
 *
 * Field-shape note (a real gap, called out for the metadata agent/schema
 * owner rather than papered over): the blueprint `FieldType` enum has no
 * array-of-files type yet. Until it does, author this field as `tags`
 * (array-of-string, closest existing shape) — the form value is the list of
 * locally-picked `File.name`s; a real upload/store integration is the
 * consuming app's job (same Rule-8 contract `FileUploader` itself uses),
 * this widget only adapts that array to `FileUploader`'s `files` prop.
 * ────────────────────────────────────────────────────────────────────────── */

interface DropzoneProps {
  accept?: string
  maxFiles?: number
  maxFileSizeMB?: number
  acceptedFormatsCaption?: string
  /** FileUploader layout — `'bar'` (compact, the default) or `'panel'` (the tall illustrated dropzone, DS V2 node 5518:1777). */
  layout?: 'bar' | 'panel'
}

export const DropzoneWidget: EditWidget = ({ descriptor, value, onChange, disabled }) => {
  const props = (descriptor.component?.props ?? {}) as DropzoneProps
  const names: string[] = Array.isArray(value) ? (value as unknown[]).map(String) : []
  const files: UploadedFile[] = names.map((name) => ({ id: name, name, status: 'done' }))

  return (
    <FileUploader
      files={files}
      onAdd={(added) => onChange([...names, ...added.map((f) => f.name)])}
      onRemove={(id) => onChange(names.filter((n) => n !== id))}
      accept={props.accept ?? '.docx,.png,.jpeg,.pdf,.jpg'}
      maxFiles={props.maxFiles}
      maxFileSizeMB={props.maxFileSizeMB}
      disabled={disabled}
      layout={props.layout ?? 'bar'}
      addMoreText="Drag & drop here, or Choose files"
      ctaHighlight={['Drag & drop', 'Choose files']}
      hint={props.acceptedFormatsCaption ?? 'Accepted formats: .docx, .png, .jpeg, .pdf, .jpg'}
    />
  )
}

/** Registers `IconSelect` + `Dropzone`. Called explicitly (never a bare side-effect import) — see file header. */
export function registerCreationSheetFieldWidgets(): void {
  registerEditWidget('IconSelect', IconSelectWidget)
  registerEditWidget('Dropzone', DropzoneWidget)
}
