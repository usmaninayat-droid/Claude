import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

/**
 * Derives a very light background tint from a runtime accent color via
 * `color-mix` — for a stage/column's count chip (and, in `Kanban.tsx`, its
 * column body gutter) to mirror the stage's own `accentColor` (genuine
 * per-tenant RUNTIME data threaded through at render time, not a literal in
 * component source — `docs/history/PORT-LEDGER.md` § policy 1). The
 * `var(--color-card, white)` fallback is the token-lint-allowed form (a raw
 * `var(--token, fallback)` call, not a bare hex). Exported so `Kanban.tsx`'s
 * column body tint and this chip's own bg tint share one implementation
 * instead of two copies.
 *
 * 3% (fix7, run-2026-09-05, P1-C): figma-spec-kanban.md's lane body tint is
 * `rgba(<lane hex>, 0.03)` — a barely-there wash. This used to mix at 12%,
 * four times the spec strength, which is what made every lane render as a
 * solid saturated slab (Scheduled a solid pink, Ongoing solid blue, Under
 * Inspection solid lavender) instead of near-white. `color-mix(in srgb,
 * <hex> 3%, white)` and CSS `rgba(<hex>, 0.03)` painted over an opaque white
 * ground are the same visual result, so this stays the one shared
 * derivation rather than switching to a literal `rgba()` in component
 * source (which `lint:tokens` would flag as a raw color anyway).
 */
export function tintFromAccent(accentColor: string): string {
  return `color-mix(in srgb, ${accentColor} 3%, var(--color-card, white))`
}

/**
 * CountChip — small numeric pill for column/group headers. [L3 composite]
 *
 * ONE neutral treatment, always (fix7, P1-1 gate blocker — UX round 6):
 * `#344054` text on `#f2f4f7` fill (`text-gray-700`/`bg-gray-100`), the same
 * pixel-exact pairing for both contexts this chip serves (figma-spec-kanban.md
 * §2 kanban column header counter, figma-spec-list.md §4 grouped-list
 * group-header counter).
 *
 * Previously this chip tinted itself from a caller-supplied `accentColor`
 * (a kanban column's per-stage `statusList[].color`) — a light `color-mix`
 * wash behind text painted in the accent hue ITSELF. That put every one of
 * the four fixed job-order status hues back into a text-on-tint pairing
 * (measured 4.11–4.32:1, all four short of 4.5:1 — the same status hues this
 * cycle already fixed for their WHITE-ON-FILL pill use, reused here in a
 * pairing nobody re-checked). The plain neutral default (`bg-border
 * text-muted-foreground`, #667085 on #eaecf0) measured only 4.21:1 too —
 * marginally short, and the SAME shared component, so raising it in the same
 * pass closes both readings at once rather than fixing the tinted path and
 * leaving the neutral one still failing.
 *
 * Deliberate judgment call, not silent: a stage's count is not itself a
 * status, and the UX ruling this run follows ("Figma wins on look, heuristics
 * win on behavior/legibility") is that the count should never compete with
 * the lane label for attention or borrow the lane's status colour. This is a
 * visible change to every kanban board on the platform — the count bubble no
 * longer tints per lane — recorded here rather than left implicit. The
 * `KanbanColumn`'s own top-border accent and body-gutter tint (both still
 * driven by `accentColor`, both genuine per-tenant runtime data, `docs/
 * history/PORT-LEDGER.md` § policy 1) are UNCHANGED — only this chip's own
 * fill/text stopped keying off it.
 *
 * `tintFromAccent` stays exported: `Kanban.tsx`'s `KanbanColumn` body-gutter
 * tint is a different, still-valid consumer of the same derivation.
 *
 * @usage-index count-chip
 */
export type CountChipProps = HTMLAttributes<HTMLSpanElement>

export const CountChip = forwardRef<HTMLSpanElement, CountChipProps>(
  ({ className, children, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="count-chip"
      className={cn(
        'inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-100 px-1.5 text-caption font-semibold text-gray-700',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  ),
)

CountChip.displayName = 'CountChip'
