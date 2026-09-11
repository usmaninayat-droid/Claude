import { Button } from '@fams/ui-kit'
import { Skeleton } from '@fams/ui-kit'

/**
 * live-list-states.tsx — the live-monitoring list surfaces' shared loading
 * and empty presentations (figma SPEC v2, frames 495:25945 hybrid skeleton /
 * 555:39222 list-only skeleton / 551:22013 no-results). Module-internal,
 * shared by `LiveListPanel` (hybrid) and `LiveListOnlyView` so both render
 * the same anatomy at their own column counts.
 */

export interface LiveListSkeletonProps {
  /** Skeleton row count — enough to fill the visible viewport. */
  rows?: number
  /** Bars per row AFTER the leading circle+bar identity cell. */
  columns?: number
}

/**
 * Skeleton rows per 495:25945 / 555:39222: a leading circle (the vehicle
 * thumb) + one grey bar per column, 48px row rhythm, radius 4 bars — never a
 * spinner, never a blank pane (UX-2).
 */
export function LiveListSkeleton({ rows = 12, columns = 3 }: LiveListSkeletonProps) {
  return (
    <div data-slot="live-list-skeleton" aria-hidden="true" className="flex flex-col">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex h-12 items-center gap-3 border-b border-muted px-1 last:border-b-0">
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <Skeleton className="h-3 w-16 shrink-0 rounded-xs" />
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1 rounded-xs" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Figma's no-results illustration (551:22013): THREE offset rounded cards,
 * each carrying a circular status glyph and two text lines, with scatter dots
 * around them (round-3 visual #11 — round 2 shipped a bare 3-layer card stack
 * with neither the status circles nor the dots). No icon in the lucide set
 * draws it, so it is inline SVG: `currentColor` only (tokens via the parent's
 * text color), decorative, sized in rem.
 */
function StackedCardsIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 96"
      fill="none"
      className="h-16 w-20 text-gray-300"
      data-slot="live-list-empty-art"
    >
      {/* Scatter dots */}
      <g fill="currentColor" opacity="0.5">
        <circle cx="8" cy="30" r="2.5" />
        <circle cx="112" cy="26" r="2" />
        <circle cx="100" cy="76" r="2.5" />
        <circle cx="16" cy="82" r="2" />
      </g>
      {/* Three offset cards, back to front */}
      {[
        { x: 26, y: 6, ok: false },
        { x: 12, y: 34, ok: true },
        { x: 26, y: 62, ok: false },
      ].map((card, index) => (
        <g key={card.x + '-' + card.y} opacity={index === 1 ? 1 : 0.6}>
          <rect
            x={card.x}
            y={card.y}
            width="82"
            height="26"
            rx="6"
            fill="var(--color-card, #fff)"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {/* Circular status glyph: a cross, or a tick on the middle card. */}
          <circle cx={card.x + 14} cy={card.y + 13} r="7" fill="currentColor" />
          {card.ok ? (
            <path
              d={`M${card.x + 11} ${card.y + 13.5} l2.2 2.2 l4.2 -4.6`}
              stroke="var(--color-card, #fff)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : (
            <path
              d={`M${card.x + 11.2} ${card.y + 10.2} l5.6 5.6 M${card.x + 16.8} ${card.y + 10.2} l-5.6 5.6`}
              stroke="var(--color-card, #fff)"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />
          )}
          {/* Two text lines */}
          <rect x={card.x + 28} y={card.y + 7} width="44" height="4" rx="2" fill="currentColor" opacity="0.75" />
          <rect x={card.x + 28} y={card.y + 15} width="30" height="4" rx="2" fill="currentColor" opacity="0.45" />
        </g>
      ))}
    </svg>
  )
}

/**
 * No-results empty state (551:22013): stacked-cards illustration, "No results
 * found!" 13px semibold, the search hint 11px grey — vertically CENTRED in the
 * available list height rather than top-anchored (round-3 UX #3).
 *
 * `h-full` is what does the centring, and it only bites because the two live
 * list surfaces stretch the table itself to the scroll viewport while the body
 * is empty (`[&_table]:h-full`): `DataTable` renders the empty state in a
 * single `<td>`, whose height is content-driven, so without a full-height
 * table the block stranded itself ~200px above the centre of ~900px of white.
 */
export interface LiveListNoResultsProps {
  /**
   * Recovery action (round-5 UX gate N3, carried from round-4 N6). Omit and
   * the state renders exactly as Figma draws it; pass it when there IS
   * something to clear, and the empty state gains the one control an empty
   * state exists to provide. The caller decides — `LiveListPanel` and
   * `LiveListOnlyView` pass it only while the search box is non-empty.
   */
  onClearSearch?: () => void
  /** @default "Clear search" */
  clearLabel?: string
  /**
   * Heading override — e.g. "No vehicles in the current map area" (SPEC
   * §3.22, "Sync list with Map" turned up an empty viewport rather than an
   * empty search). @default "No results found!"
   */
  title?: string
  /** Sub-line override, paired with `title`. */
  hint?: string
}

export function LiveListNoResults({
  onClearSearch,
  clearLabel = 'Clear search',
  title = 'No results found!',
  hint = 'Hint: Try using search for vehicle id, driver id etc.',
}: LiveListNoResultsProps = {}) {
  return (
    <div
      data-slot="live-list-empty"
      className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center"
    >
      <StackedCardsIllustration />
      <p className="text-body-sm font-semibold text-foreground">{title}</p>
      <p className="text-caption text-muted-foreground">{hint}</p>
      {onClearSearch ? (
        <Button variant="tertiary" size="sm" data-slot="live-list-empty-clear" onClick={onClearSearch}>
          {clearLabel}
        </Button>
      ) : null}
    </div>
  )
}
