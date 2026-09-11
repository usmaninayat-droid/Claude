import { forwardRef, type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Minus, TrendingDown, TrendingUp } from '../icons'
import { cn } from '../lib/cn'

/**
 * TrendIndicator — directional delta label (arrow + value + optional note). [L1 primitive]
 *
 * The one shared trend primitive: `direction` picks the arrow (TrendingUp/TrendingDown/Minus)
 * and its semantic color (`text-success` / `text-destructive` / `text-muted-foreground`).
 * `value` and `note` are pre-formatted strings from the caller — no numeric formatting,
 * sign-prefixing, or "good vs bad" business logic lives here (e.g. a KPI where "down" is
 * good stays the caller's call on which `direction` to pass).
 *
 * @usage-v5
 *   Recreates a pattern currently commented-out / hand-rolled per screen, never shared:
 *   - iwmp/components/tabs/panels/listing/company/Overview.vue — disabled
 *     `<q-icon name="fams:arrow-up" color="positive" />` + `text-positive` trend span
 *   - shared/components/cards/TileCard.vue — scoped `.text-positive1`/`.text-negative1`
 *     (hardcoded hex, not the `positive`/`negative` tokens) for KPI deltas
 *   - shared/components/profile/DriverSafetyOverview.vue — safety-score trend series
 *     feeding a chart, no compact label equivalent
 *   Forms needed: direction {up|down|flat}, size {sm|md}, optional trailing note.
 * @usage-index trend-indicator
 */

const trendIndicatorVariants = cva('inline-flex items-center gap-1 font-medium', {
  variants: {
    // The DARK steps of each status ramp, not the 500s: measured on the live
    // page, `--color-success` (#12b76a) reads 2.38–2.62:1 and
    // `--color-destructive` (#f04438) 3.76:1 against the card and podium
    // surfaces — both below the 4.5:1 a 12px numeral needs.
    // `--color-success-scale-700` is 4.99:1 and `--color-error-700` 6.64:1.
    direction: {
      up: 'text-success-scale-700',
      down: 'text-error-700',
      flat: 'text-muted-foreground',
    },
    size: {
      sm: 'text-body-xs',
      md: 'text-body-sm',
    },
  },
  defaultVariants: { size: 'md' },
})

const trendIconVariants = cva('shrink-0', {
  variants: {
    size: {
      sm: 'size-3',
      md: 'size-3.5',
    },
  },
  defaultVariants: { size: 'md' },
})

const TREND_ICONS = { up: TrendingUp, down: TrendingDown, flat: Minus } as const

/**
 * Default accessible DIRECTION word, read before the value.
 *
 * The arrow is `aria-hidden` (it is decoration for a sighted reader) and the
 * tint is colour — so without this word a rank-up-of-1 and a rank-down-of-1
 * both expose the accessible name `"1"`. Measured on the vehicle-behaviour
 * leaderboard: rank cells read `"1 1"` (rank 1, up 1) and `"4 2"` (rank 4,
 * down 2) — indistinguishable in sign (verdict V12: colour is never the only
 * encoding, and that holds for the non-visual reading too).
 */
const TREND_DIRECTION_LABELS: Record<'up' | 'down' | 'flat', string> = {
  up: 'up',
  down: 'down',
  flat: 'no change',
}

export interface TrendIndicatorProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'>,
    Pick<VariantProps<typeof trendIndicatorVariants>, 'size'> {
  /** Trend direction — selects the arrow icon and its semantic color. */
  direction: 'up' | 'down' | 'flat'
  /** The delta to display, pre-formatted by the caller (e.g. `"12%"`, `"+4"`, `"-1.2 pts"`). */
  value: string | number
  /** Optional trailing context, e.g. `"vs last month"`. Always rendered muted. */
  note?: string
  /**
   * The DIRECTION word exposed to assistive tech (visually hidden — the arrow
   * carries it for a sighted reader). Defaults to `'up'` / `'down'` /
   * `'no change'`. Override to localise or to say what the movement means in
   * context, e.g. `"up 1 place"` → `directionLabel="up"` plus `value="1 place"`,
   * or `directionLabel="improved"`. Pass `''` only when the surrounding text
   * already states the direction.
   */
  directionLabel?: string
}

/**
 * TrendIndicator — see module doc above.
 */
export const TrendIndicator = forwardRef<HTMLSpanElement, TrendIndicatorProps>(
  ({ className, direction, size, value, note, directionLabel, ...props }, ref) => {
    const Icon = TREND_ICONS[direction]
    const srDirection = directionLabel ?? TREND_DIRECTION_LABELS[direction]
    return (
      <span
        ref={ref}
        data-slot="trend-indicator"
        className={cn(trendIndicatorVariants({ direction, size }), className)}
        {...props}
      >
        <Icon className={cn(trendIconVariants({ size }))} aria-hidden="true" />
        {/* The direction WORD — visually hidden, read before the numeral, so
            "up 1" and "down 1" are distinguishable without the arrow or the
            tint. Trailing space keeps it a separate word in the flattened
            accessible name. */}
        {srDirection ? (
          <span data-slot="trend-indicator-direction" className="sr-only">{`${srDirection} `}</span>
        ) : null}
        {/* `<bdi>`: a delta is a number followed by a unit/qualifier, and an
            RTL line otherwise reorders the pair into "vs last week 11.2% ↗". */}
        <bdi data-slot="trend-indicator-value" className="font-semibold">
          {value}
        </bdi>
        {note ? (
          <bdi data-slot="trend-indicator-note" className="font-normal text-muted-foreground">
            {note}
          </bdi>
        ) : null}
      </span>
    )
  },
)

TrendIndicator.displayName = 'TrendIndicator'

export { trendIndicatorVariants }
