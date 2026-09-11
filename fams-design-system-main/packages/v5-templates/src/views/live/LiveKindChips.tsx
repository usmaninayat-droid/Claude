import { badgeVariants } from '@fams/ui-kit'
import { cn } from '../../lib/cn'

/**
 * LiveKindChips — the "All / Vehicle / Workforce" single-select FILTER-CHIP
 * row (task "add WORKFORCE alongside vehicles" §1, revised per designer
 * feedback round 2), rendered under the list panel's search field
 * (`LiveListPanel`/`LiveListOnlyView`'s `kindChipsSlot`). Filters BOTH the
 * map markers and the list — the caller (`LiveHybridView`) applies the
 * selection by narrowing `records` to the matching kind before anything else
 * in the existing pipeline runs, so this component is pure presentation with
 * no filtering logic of its own.
 *
 * THREE SEPARATE ROUNDED PILLS with a gap between them (not a single
 * segmented track) — the DS's ordinary filter-chip convention: active =
 * `Badge`'s `default` variant (solid primary fill, white/on-primary text);
 * inactive = `Badge`'s `outline` variant (subtle bordered, dark text), with
 * a muted hover per the same convention every other DS toggle-chip uses.
 * Built on `badgeVariants` (the `Badge` primitive's own class recipe,
 * `@fams/ui-kit`) rather than a hand-rolled div so this stays visually
 * identical to every other chip in the system — only the shape (`rounded-full`
 * pill, overriding Badge's default `rounded-xs`) and the interactive/
 * `radio` semantics are added here.
 */
export type LiveEntityKindFilter = 'all' | 'vehicle' | 'workforce'

export interface LiveKindChipsProps {
  value: LiveEntityKindFilter
  onChange: (value: LiveEntityKindFilter) => void
  /** Per-option counts (e.g. "Vehicle 18") — omit for plain labels. */
  counts?: Partial<Record<LiveEntityKindFilter, number>>
  className?: string
}

const OPTIONS: { value: LiveEntityKindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'workforce', label: 'Workforce' },
]

export function LiveKindChips({ value, onChange, counts, className }: LiveKindChipsProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Filter by kind"
      data-slot="live-kind-chips"
      className={cn('flex w-fit items-center gap-1.5', className)}
    >
      {OPTIONS.map((option) => {
        const active = option.value === value
        const count = counts?.[option.value]
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            data-slot="live-kind-chip"
            data-active={active || undefined}
            className={cn(
              badgeVariants({ variant: active ? 'default' : 'outline', size: 'md' }),
              'rounded-full font-medium outline-none transition-colors',
              'focus-visible:ring-2 focus-visible:ring-ring',
              !active && 'text-foreground hover:bg-muted',
            )}
          >
            {option.label}
            {count != null ? <span className="ms-1 tabular-nums opacity-70">{count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

LiveKindChips.displayName = 'LiveKindChips'
