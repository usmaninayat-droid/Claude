import { Check, ListFilter } from '@fams/ui-kit/icons'
import { Button, Popover, PopoverTrigger, PopoverContent } from '@fams/ui-kit'
import { cn } from '../../lib/cn'

export interface LegendFilterEntry {
  /** Stable key for `visible`/`onToggle` matching. */
  key: string
  label: string
  /**
   * Swatch colour — runtime DATA (a blueprint `statusList[].color`, a
   * `uiConfig.map.records.colorBy` entry). A hex literal or a `var(--token)`
   * string both work here: this is DOM chrome, so the browser resolves the
   * token itself (only the GPU map layer needs `map/color.ts`'s resolution).
   */
  color?: string
}

export interface LegendFilterProps {
  entries: LegendFilterEntry[]
  /** Currently checked keys. Ignored when `readOnly`. */
  visible: string[]
  /** Omit (or pass `readOnly`) for the static colour-KEY shape. */
  onToggle?: (key: string, checked: boolean) => void
  /** Per-entry TOTALS — never filtered counts (Dev Note 32273 / UX E.29). */
  totals?: Map<string, number>
  /** Hide the `(14)` counts and fold them into the accessible name (UX I.54.2). */
  hideCounts?: boolean
  /** Collapse the whole fieldset into a `<label> · N` popover (UX I.54.4). */
  collapsed?: boolean
  /**
   * A legend with filtering turned OFF renders as static swatches rather than
   * disabled checkboxes — it is dual-purpose (colour key AND filter) and must
   * render either way (UX note E.32 / `INTERACTIONS.md` rows 23/24).
   */
  readOnly?: boolean
  /** The `<legend>` text, e.g. `"Filter by status"`. */
  title: string
  /** The collapsed trigger's label, e.g. `"Status"`. Defaults to `title`. */
  collapsedLabel?: string
  /** `data-slot` prefix — `<prefix>` on the fieldset, `<prefix>-item` per row. */
  slot: string
  className?: string
}

/**
 * LegendFilter — the shared legend that is BOTH a colour key and a filter.
 * [tier-2 internal]
 *
 * One implementation behind two lenses: the calendar's status legend (SPEC
 * §1.4) and the hybrid map's priority legend (SPEC §1.3). `REFERENCE-MINING.md`
 * §4.3 argues for exactly this — the reference's `StatusLegend` is a finished
 * legend-as-filter (declared order, dimmed swatch when off, right-aligned
 * `tabular-nums` totals, controlled `enabled` set, a graceful read-only mode)
 * and the only thing wrong with it is its hand-rolled checkbox.
 *
 * Bindings, all from UX notes E.27–E.32 / K.65:
 *  - a labelled `<fieldset>`; each row is ONE `role="checkbox"` control
 *    spanning box + swatch + label + count, so the effective target is the
 *    whole row (what makes a 20px box acceptable) and Space toggles it. The
 *    box glyph is `aria-hidden` decoration, not a nested `Checkbox` primitive
 *    (a checkbox inside a checkbox is not a valid tree).
 *  - the label text ALWAYS renders, so colour is never load-bearing.
 *  - unchecking every entry is allowed; the caller renders the zero state.
 *  - totals are totals: they move with search/filters/period, never with a
 *    sibling's checkbox.
 */
export function LegendFilter({
  entries,
  visible,
  onToggle,
  totals,
  hideCounts,
  collapsed,
  readOnly,
  title,
  collapsedLabel,
  slot,
  className,
}: LegendFilterProps) {
  if (entries.length === 0) return null
  const interactive = Boolean(onToggle) && !readOnly

  const rows = (
    <fieldset
      data-slot={slot}
      className={cn(
        'min-w-0 border-0 p-0',
        collapsed ? 'flex flex-col gap-1' : 'flex flex-wrap items-center gap-2',
        className,
      )}
    >
      <legend className="sr-only">{title}</legend>
      {entries.map((entry) => {
        const checked = !interactive || visible.includes(entry.key)
        const total = totals?.get(entry.key)
        const count = total === undefined || hideCounts ? null : <span className="shrink-0 tabular-nums text-muted-foreground">({total})</span>
        const inner = (
          <>
            {interactive ? (
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-xs border',
                  checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-input-background',
                )}
              >
                {checked ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
            ) : null}
            {/* The entry colour is runtime DATA, applied inline exactly like the
                calendar chip's leading border. Off → dimmed, never removed. */}
            <span
              aria-hidden="true"
              className={cn('size-2.5 shrink-0 rounded-xs bg-border', !checked && 'opacity-30')}
              style={entry.color ? { backgroundColor: entry.color } : undefined}
            />
            <span className="truncate font-medium text-foreground">{entry.label}</span>
            {count}
          </>
        )
        const rowClass = cn(
          'flex min-h-8 min-w-0 items-center gap-2 rounded-sm px-1 text-body-sm',
          collapsed && 'w-full',
        )
        if (!interactive) {
          return (
            <span key={entry.key} data-slot={`${slot}-item`} className={rowClass}>
              {inner}
            </span>
          )
        }
        return (
          <button
            key={entry.key}
            type="button"
            role="checkbox"
            aria-checked={checked}
            data-slot={`${slot}-item`}
            className={cn(rowClass, 'outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring')}
            aria-label={hideCounts && total !== undefined ? `${entry.label} (${total})` : undefined}
            onClick={() => onToggle?.(entry.key, !checked)}
          >
            {inner}
          </button>
        )
      })}
    </fieldset>
  )

  if (!collapsed) return rows

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="tertiary" size="sm" className="h-10 shrink-0 gap-2">
          <ListFilter className="size-4" aria-hidden="true" />
          {`${collapsedLabel ?? title} · ${interactive ? visible.length : entries.length}`}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        {rows}
      </PopoverContent>
    </Popover>
  )
}

LegendFilter.displayName = 'LegendFilter'
