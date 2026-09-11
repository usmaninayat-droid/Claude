import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronsUpDown } from '@fams/ui-kit/icons'
import { Popover, PopoverContent, PopoverTrigger, type SortState } from '@fams/ui-kit'
import { cn } from '../lib/cn'

/**
 * SortMenuButton — a generic "SORT BY" single-select menu behind an icon
 * button (figma live-monitoring SPEC v2 §2.10 / P0-3#30, frames
 * 582:22893/25576, generalized: options are caller-supplied column
 * descriptors, never module strings). The menu offers `None (default)` plus
 * one entry per option; picking a column sets ascending sort on it (the
 * matching table header then shows the primary ↑), picking `None` clears.
 * Controlled: `sort` in, `onSortChange` out — pairs with any `SortState`
 * consumer (`ListView`/`DataTable`).
 *
 * ## `variant="toggle"` — the pipelines-hybrid Addendum's SORT popover
 *
 * SPEC `pipelines-hybrid-29-41808` Addendum ("Sort popup") / qa/UX-NOTES.md
 * AC-7.1..7.4 asks for a DIFFERENT interaction than the `'menu'` variant
 * above: header "SORT" + a `Reset`, and each row is a single TRI-STATE
 * off/asc/desc toggle (tap cycles the direction) rather than a row you click
 * to select plus a separate `None` entry. Reconciled against the sort menu
 * already built on `parity/pipeline-list-kanban` (`wt-pipeline-ds` commit
 * `b6f172b`, which this addendum's own RECONCILE note says to reuse/extend):
 * that component splits the row into two hit targets (label click =
 * set-ascending/clear, a nested arrow = flip asc↔desc, never clearing) — this
 * frame's own transcription ("arrow tap cycles direction") and AC-7.1's "three
 * visually DISTINCT states" call for ONE tri-state toggle per row instead, so
 * per the addendum's own tie-break rule ("on design conflict THIS frame
 * wins") this variant implements the single-toggle cycle, not the split
 * hit-target design — logged here as the conflict, per the run's own
 * instruction, rather than silently diverging.
 *
 * Kept as a `variant` on the SAME component (opt-in, defaults to the
 * unchanged `'menu'` behavior) rather than a second component: every existing
 * `'menu'` consumer (`LiveListOnlyView`, its a11y suite) is byte-for-byte
 * unaffected; `RecordMapListToolbar`/`MapHybridView` pass `variant="toggle"`.
 */
export interface SortMenuOption {
  /** The sortable column key (a `DataTableColumn.key`). */
  key: string
  label: string
}

export interface SortMenuButtonProps {
  options: SortMenuOption[]
  sort: SortState | null
  onSortChange: (sort: SortState | null) => void
  /** Trigger accessible name. */
  ariaLabel?: string
  className?: string
  /**
   * `'menu'` (default, unchanged): a single-select list — click an option to
   * sort ascending, click `None` to clear.
   * `'toggle'`: the Addendum's SORT popover — see docblock above.
   */
  variant?: 'menu' | 'toggle'
}

const OPTION_CLASS =
  'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-start text-caption text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring'

const ICON_BUTTON_BASE =
  'flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring'

export function SortMenuButton({
  options,
  sort,
  onSortChange,
  ariaLabel = 'Sort',
  className,
  variant = 'menu',
}: SortMenuButtonProps) {
  const [open, setOpen] = useState(false)

  if (variant === 'toggle') {
    /**
     * Tap-to-cycle direction (AC-7.1/7.2): tapping a row NOT currently active
     * sets it ascending — which, since `sort` carries at most one key, also
     * clears whatever was previously active in the SAME write (single-active
     * sort, never multi-column). Tapping the ACTIVE row's toggle cycles
     * asc → desc → off. `Reset` (header) is the only way to jump straight to
     * off without stepping through the cycle.
     */
    const cycle = (key: string) => {
      if (sort?.key !== key) {
        onSortChange({ key, direction: 'asc' })
      } else if (sort.direction === 'asc') {
        onSortChange({ key, direction: 'desc' })
      } else {
        onSortChange(null)
      }
    }
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className={cn(ICON_BUTTON_BASE, (sort || open) && 'border-primary text-primary', className)}
          >
            <ChevronsUpDown className="size-4" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" aria-label="Sort" data-slot="sort-toggle-menu" className="w-64 p-1.5">
          <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-1.5">
            <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Sort</p>
            {/* Hidden while there is nothing to reset — same convention as
                the 'menu' variant's own (former) Reset affordance. */}
            {sort ? (
              <button
                type="button"
                onClick={() => onSortChange(null)}
                className="rounded-sm text-caption font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                Reset
              </button>
            ) : null}
          </div>
          <div className="flex flex-col">
            {options.map((option) => {
              const activeDir = sort?.key === option.key ? sort.direction : null
              return (
                <div
                  key={option.key}
                  data-slot="sort-toggle-row"
                  className={cn('flex items-center justify-between gap-2 rounded-sm px-2 py-2', activeDir && 'bg-muted/60')}
                >
                  <span className="flex-1 truncate text-body-sm text-foreground">{option.label}</span>
                  <button
                    type="button"
                    aria-label={
                      activeDir === 'asc'
                        ? `Sorting ${option.label} ascending — tap for descending`
                        : activeDir === 'desc'
                          ? `Sorting ${option.label} descending — tap to clear`
                          : `Sort ${option.label}`
                    }
                    data-active-direction={activeDir ?? 'off'}
                    onClick={() => cycle(option.key)}
                    className="flex shrink-0 flex-col items-center justify-center gap-px rounded-sm p-1 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ArrowUp
                      aria-hidden="true"
                      className={cn('size-3', activeDir === 'asc' ? 'text-primary' : 'text-muted-foreground')}
                    />
                    <ArrowDown
                      aria-hidden="true"
                      className={cn('size-3', activeDir === 'desc' ? 'text-primary' : 'text-muted-foreground')}
                    />
                  </button>
                </div>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  const pick = (next: SortState | null) => {
    onSortChange(next)
    // Single-select menu: picking closes it (582:25576 shows the menu gone
    // once the sort lands).
    setOpen(false)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            ICON_BUTTON_BASE,
            // Active sort OR an open menu reads primary, border included
            // (582:22893 shows the trigger blue while the menu is up).
            (sort || open) && 'border-primary text-primary',
            className,
          )}
        >
          <ChevronsUpDown className="size-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label="Sort by" data-slot="sort-menu" className="w-56 p-1.5">
        <p className="px-2 pb-1 pt-1.5 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
          Sort by
        </p>
        <div role="listbox" aria-label="Sort by" className="flex flex-col">
          <button
            type="button"
            role="option"
            aria-selected={!sort}
            className={cn(OPTION_CLASS, !sort && 'bg-muted/60')}
            onClick={() => pick(null)}
          >
            <span>
              None <span className="text-muted-foreground">(default)</span>
            </span>
            {!sort ? <Check className="size-3.5 text-primary" aria-hidden="true" /> : null}
          </button>
          {options.map((option) => {
            const active = sort?.key === option.key
            return (
              <button
                key={option.key}
                type="button"
                role="option"
                aria-selected={active}
                className={cn(OPTION_CLASS, active && 'bg-muted/60 text-primary')}
                onClick={() => pick({ key: option.key, direction: 'asc' })}
              >
                <span className="truncate">{option.label}</span>
                {active ? <ArrowUp className="size-3.5 text-primary" aria-hidden="true" /> : null}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

SortMenuButton.displayName = 'SortMenuButton'
