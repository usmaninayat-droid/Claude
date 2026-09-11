import { useId, useState, type ReactNode, type RefObject } from 'react'
import { Check, ChevronDown } from '../icons'
import { cn } from '../lib/cn'
import { Popover, PopoverAnchor, PopoverTrigger, PopoverContent } from '../primitives/Popover'

export interface IconSelectOption {
  value: string
  label: ReactNode
  /** Per-option leading glyph — e.g. a severity-toned flag (Priority Level's
   *  red/amber/green flag icons). Omit for a plain text row. */
  icon?: ReactNode
  disabled?: boolean
}

export interface IconSelectProps {
  id?: string
  value: string | null
  onChange: (value: string) => void
  options: IconSelectOption[]
  /** Static leading glyph shown in the TRIGGER regardless of selection (e.g.
   *  a wrench for "Service Type") — distinct from a per-option `icon`, which
   *  only ever appears inside the popover list. Falls back to the selected
   *  option's own `icon` when omitted. */
  leadingIcon?: ReactNode
  /** Small gray caption at the top of the popover list (figma-spec-create-
   *  sheet.md §3's "Priority Le...", "Customer..." section-title row).
   *  Defaults to `ariaLabel`. */
  sectionLabel?: ReactNode
  placeholder?: string
  disabled?: boolean
  hasError?: boolean
  ariaLabel?: string
  /**
   * Strips the trigger's own border/background/height so it can nest inside
   * a shell that already supplies the outline (e.g. `InsetField`). The
   * popover content is unaffected.
   */
  bare?: boolean
  /**
   * Anchors the popover to an OUTER shell (e.g. the `InsetField` box a bare
   * trigger sits inside) so the dropdown spans the full field width and
   * left-aligns to it (Design System V2 dropdown node 4834:5573) instead of
   * matching the narrower inner trigger — same contract as `Combobox`'s
   * `popoverAnchorRef`.
   */
  popoverAnchorRef?: RefObject<HTMLElement | null>
  className?: string
}

/**
 * IconSelect — a non-searchable single-select popover whose trigger and
 * option rows can each carry a leading icon. [L3 composite]
 *
 * Sibling to `Combobox` (which always has a search box) for the simpler case
 * figma-spec-create-sheet.md §3 needs: a short, static option list rendered
 * as a card (gray section-title row + hairline-divided rows, no search),
 * with an optional icon in the trigger (a fixed field glyph) and/or per-row
 * (a severity-toned flag, etc). State-agnostic (Rule 8) — `options` is
 * always caller-supplied.
 */
export function IconSelect({
  id,
  value,
  onChange,
  options,
  leadingIcon,
  sectionLabel,
  placeholder = 'Select…',
  disabled = false,
  hasError = false,
  ariaLabel,
  bare = false,
  popoverAnchorRef,
  className,
}: IconSelectProps) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const selected = options.find((o) => o.value === value) ?? null
  const triggerIcon = selected?.icon ?? leadingIcon

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      {popoverAnchorRef ? (
        // Radix's `virtualRef` wants a non-null `RefObject<Measurable>`; a real
        // element ref (current: HTMLElement | null) satisfies it at runtime —
        // Radix guards the null internally — so cast past the nullability.
        // Keyed by `open`: PopperAnchor only re-registers a virtual anchor when
        // its ref VALUE changes, so a stale registration (e.g. the trigger's
        // own unmounted anchor from a remount race) would otherwise win
        // forever. Remounting on open re-asserts the shell as the anchor.
        <PopoverAnchor key={open ? 'open' : 'closed'} virtualRef={popoverAnchorRef as RefObject<HTMLElement>} />
      ) : null}
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          className={cn(
            'flex w-full min-w-0 items-center gap-2 text-start text-sm font-semibold text-foreground outline-none transition-colors',
            bare
              ? 'border-0 bg-transparent p-0'
              : cn(
                  'h-11 rounded-sm border bg-background px-3',
                  hasError ? 'border-destructive' : 'border-border',
                  'focus-visible:ring-2 focus-visible:ring-primary/25',
                ),
            disabled && 'pointer-events-none cursor-not-allowed opacity-60',
            className,
          )}
        >
          {triggerIcon ? (
            <span className="flex shrink-0 items-center justify-center text-muted-foreground" aria-hidden>
              {triggerIcon}
            </span>
          ) : null}
          <span className={cn('min-w-0 flex-1 truncate', !selected && 'font-normal text-muted-foreground')}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            className={cn('size-3 shrink-0 text-muted-foreground transition-transform duration-fast', open && 'rotate-180')}
            aria-hidden
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        // Dropdown menu width follows the field it belongs to (Design System
        // V2 node 4834:5573) — the trigger-width var reflects the virtual
        // anchor when one is set, so both plain and inset-shell uses match.
        className="w-[var(--radix-popover-trigger-width)] p-0"
        aria-label={ariaLabel}
      >
        {sectionLabel ? (
          <div className="px-4 pt-3 pb-1 text-caption font-medium text-muted-foreground">{sectionLabel}</div>
        ) : null}
        <div id={listId} role="listbox" aria-label={ariaLabel} className="py-1">
          {options.map((option, i) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2 px-4 py-2.5 text-start text-sm text-foreground outline-none transition-colors',
                i > 0 && 'border-t border-border',
                'hover:bg-muted focus-visible:bg-muted',
                option.disabled && 'pointer-events-none opacity-50',
              )}
            >
              {option.icon ? (
                <span className="flex shrink-0 items-center justify-center" aria-hidden>
                  {option.icon}
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.value === value ? <Check className="size-4 shrink-0 text-primary" aria-hidden /> : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

IconSelect.displayName = 'IconSelect'
