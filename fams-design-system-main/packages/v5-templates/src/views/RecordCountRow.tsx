import type { RecordNoun } from './RecordViewStates'

export interface RecordCountRowProps {
  /** How many records the lens is currently rendering. */
  shown: number
  /** How many it would render with no narrowing in play. */
  total: number
  /** Record noun for the copy — the caller owns the vocabulary (Rule 10). */
  noun: RecordNoun
  /**
   * Overrides the generated sentence when the lens has a more specific truth to
   * tell (e.g. "all statuses hidden", "mapped tasks"). Keep it one short line.
   * Only consulted while `shown < total` — see the module doc's "only when
   * narrowed" rule; a caller cannot force the row to show at rest via this.
   */
  children?: React.ReactNode
  /** `data-slot` for the lens, so a probe can tell the four rows apart. */
  slot: string
  /**
   * "Clear filters" text action, rendered next to the count once shown. Omit
   * to render the count with no affordance (e.g. a lens with no filter
   * session to clear — Kanban/Calendar/MapHybrid today).
   */
  onClearFilters?: () => void
}

/**
 * RecordCountRow — the ONE "N of M shown" row a lens is allowed (UX E.30).
 * [tier-2 internal]
 *
 * E.30 asks for exactly one `aria-live="polite"` count row per lens, never
 * nested. Round 1 found the convention on half the family: Calendar and Hybrid
 * each had their own hand-rolled paragraph and List and Kanban had nothing. So
 * this is the single implementation all four now render — the two that already
 * had one keep their more specific copy through `children` rather than gaining a
 * SECOND row, which is what "one place per lens" actually forbids.
 *
 * **Only when narrowed** (UX ruling A4, run 2026-09-05 — supersedes this
 * row's own prior "always render a sentence" behavior, which produced the
 * "Showing 24 of 24 rules" tautology C5 found on THREE separate lenses —
 * List, the map-hybrid pane, and (via its own children ternary) even a
 * lens with zero active narrowing): the sentence renders ONLY while `shown <
 * total`; at rest (nothing narrowed) this paragraph is empty, matching
 * Figma exactly. The `<p>` itself still always mounts when the CALLER
 * renders this component at all so `aria-live` has a stable host for
 * narrowing announcements — but its height is NO LONGER reserved: an empty
 * row collapses via `empty:hidden` so the space between the filters row
 * and the first content stays tight (the alternative — a permanent 20px
 * dead band on every list module — read as broken layout to reviewers).
 * A small vertical shift when a search term is typed is accepted as the
 * lesser evil vs. that permanent dead band.
 *
 * `polite`, not `assertive`: the number changing is the consequence of the
 * user's own search/filter keystroke, so it must not interrupt them.
 */
export function RecordCountRow({ shown, total, noun, children, slot, onClearFilters }: RecordCountRowProps) {
  const isNarrowed = shown < total
  return (
    <p
      data-slot={slot}
      aria-live="polite"
      // The row still mounts (aria-live needs a stable host so a filter
      // narrowing announcement fires when the count changes) but its height
      // is no longer reserved — an empty row collapses to zero so the space
      // between the toolbar/filters and the first content stays tight. The
      // small layout jump when a search term is typed is preferred over a
      // permanent 20px dead band above the KPIs on every module.
      className="flex shrink-0 items-center gap-2 px-1 text-body-sm text-muted-foreground empty:hidden"
    >
      {isNarrowed ? (
        <>
          <span>{children ?? `Showing ${shown} of ${total} ${total === 1 ? noun.one : noun.many}`}</span>
          {onClearFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-xs font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear filters
            </button>
          ) : null}
        </>
      ) : null}
    </p>
  )
}

RecordCountRow.displayName = 'RecordCountRow'
