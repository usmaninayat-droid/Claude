import { useState } from 'react'
import { Layers } from '@fams/ui-kit/icons'
import { IconControl, Popover, PopoverContent, RadioGroup, RadioGroupItem } from '@fams/ui-kit'
import { cn } from '../lib/cn'

/**
 * GroupByMenuButton — a generic "GROUP BY" single-select popover behind an
 * icon button (SPEC `pipelines-hybrid-29-41808` Addendum, "Group By popup" /
 * qa/UX-NOTES.md AC-6.1..6.4). Options are caller-supplied `{key, label}`
 * pairs — never a hardcoded field list — so the SAME control drives any
 * groupable pipeline/kanban lens from blueprint metadata.
 *
 * Contract (verbatim from the addendum's behavior ACs):
 * - True single-select radio list; picking an option commits it LIVE (no
 *   separate Apply) and regroups the caller's lanes in the same interaction.
 * - `Reset` (top-right, primary-token text) restores `defaultValue` — NOT "no
 *   grouping" (AC-6.2: a kanban/pipeline lens always has some grouping
 *   dimension). Hidden once `value` already equals `defaultValue`, matching
 *   `SortMenuButton`'s own "hidden when there's nothing to reset" convention.
 * - Popover dismisses on outside click AND Escape (Radix `Popover` default —
 *   no custom dismiss logic needed); since selection is already committed live
 *   (AC-6.1), dismissing never needs to discard a pending choice (AC-6.3).
 *
 * Styling note: the header/Reset/active-option colour is the `primary` design
 * token throughout — never a hardcoded hex — so it resolves to whatever a
 * tenant's brand colour is (Qatar MME maroon `#6e112d` here, per the run's own
 * branding-adaptation rule).
 */
export interface GroupByMenuOption {
  /** The groupable column/field key. */
  key: string
  label: string
}

/**
 * Lane/group ordering WITHIN the active grouping (2026-08-31 pipeline-actions
 * reference recording: the popup's "ORDER · WITHIN <X> GROUPS" segmented row —
 * Default | A–Z | Z–A | By count).
 */
export type GroupByOrder = 'default' | 'asc' | 'desc' | 'count'

export const GROUP_BY_ORDER_OPTIONS: { value: GroupByOrder; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'asc', label: 'A–Z' },
  { value: 'desc', label: 'Z–A' },
  { value: 'count', label: 'By count' },
]

export interface GroupByMenuButtonProps {
  options: GroupByMenuOption[]
  /** The active grouping key. Always one of `options` (or `defaultValue`) — this control has no "ungrouped" state. */
  value: string
  /** Restored by `Reset`. */
  defaultValue: string
  onChange: (value: string) => void
  /**
   * The active lane order. Supplying `onOrderChange` is what renders the
   * "ORDER" segmented row (reference recording) — omit both and the popup is
   * exactly the radio list it always was (every existing caller unchanged).
   */
  order?: GroupByOrder
  onOrderChange?: (order: GroupByOrder) => void
  /** Trigger accessible name. */
  ariaLabel?: string
  className?: string
}

const ICON_BUTTON =
  'flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring'

export function GroupByMenuButton({
  options,
  value,
  defaultValue,
  onChange,
  order = 'default',
  onOrderChange,
  ariaLabel = 'Group by',
  className,
}: GroupByMenuButtonProps) {
  const [open, setOpen] = useState(false)
  const isDefault = value === defaultValue && order === 'default'
  const activeLabel = options.find((o) => o.key === value)?.label ?? value

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <IconControl tip="Group by" name={ariaLabel} popoverTrigger>
        <button
          type="button"
          className={cn(ICON_BUTTON, (!isDefault || open) && 'border-primary text-primary', className)}
        >
          <Layers className="size-4" aria-hidden="true" />
        </button>
      </IconControl>
      <PopoverContent align="start" aria-label="Group by" data-slot="group-by-menu" className="w-56 p-1.5">
        <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-1.5">
          <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Group by</p>
          {!isDefault ? (
            <button
              type="button"
              onClick={() => {
                onChange(defaultValue)
                onOrderChange?.('default')
              }}
              className="rounded-sm text-caption font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Reset
            </button>
          ) : null}
        </div>
        <RadioGroup
          value={value}
          onValueChange={onChange}
          aria-label="Group by"
          className="flex flex-col gap-0"
        >
          {options.map((option) => (
            <label
              key={option.key}
              data-slot="group-by-option"
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 outline-none hover:bg-muted"
            >
              <RadioGroupItem value={option.key} aria-label={option.label} />
              <span className="flex-1 truncate text-body-sm text-foreground">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
        {onOrderChange ? (
          /*
           * "ORDER · WITHIN <ACTIVE> GROUPS" segmented row (reference
           * recording): a mutually-exclusive four-way choice rendered as a
           * radiogroup of small segments. LIVE-APPLY like the radio list.
           */
          <div data-slot="group-by-order" className="mt-1 border-t border-border px-2 pb-1 pt-2">
            <p className="pb-1.5 text-caption font-semibold uppercase tracking-wide text-primary">
              Order · within {activeLabel} groups
            </p>
            <div role="radiogroup" aria-label="Group order" className="inline-flex items-center gap-0.5 rounded-sm border border-border p-0.5">
              {GROUP_BY_ORDER_OPTIONS.map((opt) => {
                const active = order === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    tabIndex={active ? 0 : -1}
                    data-slot={`group-by-order-${opt.value}`}
                    onClick={() => onOrderChange(opt.value)}
                    className={cn(
                      'rounded-xs px-2 py-1 text-caption outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                      active ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted/60',
                    )}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

GroupByMenuButton.displayName = 'GroupByMenuButton'
