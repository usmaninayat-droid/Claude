import type { ReactNode } from 'react'
import { Check } from '../icons'

export interface PickerListOption<T extends string> {
  value: T
  label: ReactNode
}

export interface PickerListProps<T extends string> {
  options: PickerListOption<T>[]
  onPick: (value: T) => void
  /**
   * The current value, if any. When it matches an option's `value`, that
   * item shows a trailing checkmark and carries `aria-selected` (the list's
   * items take `role="option"` once `selected` is passed, so `aria-selected`
   * — not `aria-checked` — is the correct selection state per the ARIA
   * spec). Additive and default-off: omit it and `PickerList` renders
   * exactly as before, with no `option`/`listbox` roles added.
   */
  selected?: T | string
  /**
   * Accessible name for the list, required by ARIA whenever `role="listbox"`
   * is in play (i.e. whenever `selected` is passed) — a `role="option"`
   * item must live inside a named `listbox`. Ignored when `selected` is
   * omitted.
   */
  ariaLabel?: string
}

/**
 * PickerList — the flat, scrollable option list that goes inside a popover.
 *
 * The body half of the "click a value, pick a replacement" pattern: pair it
 * with `InlineEditField` (or any `Popover`) which owns the trigger and the
 * anchoring. It deliberately has no search box and no multi-select —
 * `IconSelect` and `Combobox` already cover richer pickers; this is the
 * plain one, capped at `max-h-64` so a long roster scrolls instead of
 * pushing the popover off screen. Pass `selected` (+ `ariaLabel`) to
 * checkmark the option matching the current value.
 */
export function PickerList<T extends string>({
  options,
  onPick,
  selected,
  ariaLabel,
}: PickerListProps<T>) {
  const hasSelection = selected !== undefined

  return (
    <div
      data-slot="picker-list"
      role={hasSelection ? 'listbox' : undefined}
      aria-label={hasSelection ? ariaLabel : undefined}
      className="flex max-h-64 flex-col gap-0.5 overflow-y-auto"
    >
      {options.map((opt) => {
        const isSelected = hasSelection && opt.value === selected
        return (
          <button
            key={opt.value}
            type="button"
            role={hasSelection ? 'option' : undefined}
            aria-selected={hasSelection ? isSelected : undefined}
            onClick={() => onPick(opt.value)}
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-start text-body-sm text-foreground hover:bg-muted"
          >
            <span className="min-w-0 flex-1 truncate">{opt.label}</span>
            {isSelected ? <Check className="size-4 shrink-0 text-primary" aria-hidden /> : null}
          </button>
        )
      })}
    </div>
  )
}
