import { forwardRef, useId, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface InsetFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Small muted caption rendered INSIDE the box, above the value (the
   *  figma-spec-create-sheet.md §2 field anatomy — label lives inside the
   *  shared outline, not floated above the border like `Input`'s
   *  floating-label mode). */
  label: ReactNode
  /** The value/control — plain text, or a `bare` Input/Select/Combobox
   *  trigger stripped of its own border/background so it sits flush inside
   *  this shell. */
  children: ReactNode
  /** Icon at the box's logical start, vertically centered across the WHOLE
   *  box (not just the value line) — e.g. a leading service-type glyph. */
  leadingIcon?: ReactNode
  /** Icon/control at the box's logical end (e.g. a chevron-down). */
  trailingIcon?: ReactNode
  /** Computed/readonly presentation — muted fill, no border (vs. the
   *  default outlined box). Pairs with a `readOnly` inner control. */
  filled?: boolean
  hasError?: boolean
  disabled?: boolean
  /** Binds the visible label to the inner control's id (pass the same id
   *  given to the nested Input/Select/etc). */
  htmlFor?: string
  /** Renders the required asterisk after the label (platform field-states
   *  spec: DEFAULT/FILLED both show it, next to whichever line the label is
   *  drawn on). */
  required?: boolean
  /**
   * Whether the inner control currently holds a value — the shell's
   * DEFAULT/FILLED state switch (platform field-states spec): `false` draws
   * the label at placeholder position (centered, full size) with the value
   * row invisible-but-focusable underneath; `true` (the default, so every
   * existing caller that doesn't pass this prop keeps today's rendering)
   * floats the label to the small top caption and reveals the value below
   * it. Also floats on keyboard focus (`:focus-within`) regardless of this
   * prop, so an empty-but-focused field previews the FILLED anatomy while
   * typing.
   */
  hasValue?: boolean
}

/**
 * InsetField — the "outlined box with an inline label" field shell.
 * [L1 primitive]
 *
 * One rounded border containing, stacked vertically, a small gray caption
 * above the value — as opposed to `Input`'s floating-label mode where the
 * label starts centered and floats up to the top edge. Generic and
 * content-agnostic: the value slot accepts plain text or a `bare`-mode
 * Input/Select/Combobox trigger (no border/background of its own) so this
 * shell supplies the single outline. Consumed by `@fams/v5-composer`'s edit
 * widgets via a `chrome="inset-label"` opt-in (see `EditWidgetProps.chrome`).
 */
export const InsetField = forwardRef<HTMLDivElement, InsetFieldProps>(
  (
    {
      label,
      children,
      leadingIcon,
      trailingIcon,
      filled = false,
      hasError = false,
      disabled = false,
      htmlFor,
      required = false,
      hasValue = true,
      className,
      ...props
    },
    ref,
  ) => {
    const reactId = useId()
    const labelId = htmlFor ? `${htmlFor}-label` : reactId
    // DEFAULT state (empty, unfocused): the label sits at placeholder
    // position — full size, vertically centered — and the value row is
    // invisible (but still present/focusable) underneath it. FILLED state
    // (has a value, or focused): the label floats to the small top caption
    // and the value row becomes visible. `group-focus-within` covers the
    // "empty but focused" case with pure CSS, same convention `Input`'s own
    // floating label already uses (peer-focus).
    const asterisk = required ? (
      <span aria-hidden className="text-xs font-medium text-destructive-emphasis">
        *
      </span>
    ) : null
    return (
      <div
        ref={ref}
        data-slot="inset-field"
        className={cn(
          'group flex w-full items-center gap-2 rounded-sm p-3 transition-colors',
          // The shell owns the focus ring for its `bare` inner controls (fix3):
          // bare Inputs/Select triggers/pickers deliberately carry no ring of
          // their own (this box supplies the one outline), so keyboard focus
          // anywhere inside lights the whole field card — same `has-[]`
          // technique as FileUploader. Mouse focus is untouched
          // (`:focus-visible` only).
          'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
          // Fields never carry a grey/muted fill (consumer parity report
          // 2026-09-01): `bg-background` resolves to the page's off-white
          // (#f9fafb), which read as "grey" against `bg-card`'s pure white
          // (#ffffff) — the token every other field-shaped surface in the DS
          // uses. `filled` (readonly/computed display) keeps its intentional
          // muted fill; the editable default now sits on `bg-card` with its
          // border unchanged for delineation.
          filled ? 'border border-transparent bg-muted' : 'border bg-card',
          !filled && (hasError ? 'border-destructive' : 'border-border'),
          disabled && 'opacity-60',
          className,
        )}
        {...props}
      >
        {leadingIcon ? (
          <span className="flex shrink-0 items-center justify-center text-muted-foreground" aria-hidden>
            {leadingIcon}
          </span>
        ) : null}
        <div className="relative flex min-h-9 min-w-0 flex-1 flex-col justify-center">
          <label
            id={labelId}
            htmlFor={htmlFor}
            className={cn(
              'pointer-events-none absolute start-0 flex items-center gap-1 font-medium text-muted-foreground transition-all duration-fast',
              hasValue
                ? 'top-0 translate-y-0 text-caption'
                : 'top-1/2 -translate-y-1/2 text-sm group-focus-within:top-0 group-focus-within:translate-y-0 group-focus-within:text-caption',
              hasError && 'text-destructive-emphasis',
            )}
          >
            {label}
            {asterisk}
          </label>
          <div
            className={cn(
              'min-w-0 text-sm font-semibold text-foreground transition-opacity duration-fast',
              hasValue ? 'pt-4 opacity-100' : 'pt-4 opacity-0 group-focus-within:opacity-100',
            )}
          >
            {children}
          </div>
        </div>
        {trailingIcon ? (
          <span className="flex shrink-0 items-center justify-center text-muted-foreground" aria-hidden>
            {trailingIcon}
          </span>
        ) : null}
      </div>
    )
  },
)

InsetField.displayName = 'InsetField'
