import { forwardRef, type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'
import { Tooltip, TooltipTrigger, TooltipContent } from '../primitives/Tooltip'
import type { BadgeColorIndex } from '../primitives/Badge'

/**
 * SegmentedBar — a whole broken into categorical shares, rendered as one
 * proportional stacked bar (not a chart-engine widget). [L3 composite]
 *
 * Each segment's width is `value / total(segments)` — a data-driven
 * percentage, not a design value, so it's the one place a `style` width is
 * legitimate under hard rule 2. Fill color is `colorIndex`-only (never a raw
 * hex), mapped onto the `--color-chart-1..5` categorical palette — same
 * categorical vocabulary as `Badge`/`ChartLegend`. Every segment
 * gets a keyboard-reachable `Tooltip` (label + value + share) — Radix shows
 * it on both hover and focus, so this is accessible without extra wiring.
 * An inline label renders once a segment is wide enough to hold it, in a
 * `bg-card` chip rather than colored text — the categorical hues vary widely
 * in lightness (see `@fams/tokens`), so no single text color reads on all of
 * them; a neutral surface chip sidesteps that instead of guessing a variant
 * per index. All-zero (or empty) `segments` renders a muted empty track.
 *
 * @usage-v5
 *   Retires two hand-rolled proportional bars, both with raw hex + per-item
 *   `q-tooltip`:
 *   - `iwmp/components/charts/DashboardTable.vue` `barField` column — flex
 *     `.status-segment` divs, `backgroundColor` from a status→hex map,
 *     tooltip shows status/count/percentage per segment.
 *   - `iwmp/components/charts/BreakdownTable.vue` `segmented` prop —
 *     fixed 3-state washed/not-washed/untouched bar, one combined tooltip.
 *   Forms needed: segments[] (label/value/colorIndex), per-segment tooltip,
 *   inline labels, empty state.
 * @usage-index segmented-bar
 */

/** Categorical index → `--color-chart-1..5` fill, cycling every 5 (1→1, …, 5→5,
 *  6→1, …). Static lookup so Tailwind's compiler sees every class name at build time. */
const FILL_COLOR_CLASSES: Record<BadgeColorIndex, string> = {
  1: 'bg-chart-1',
  2: 'bg-chart-2',
  3: 'bg-chart-3',
  4: 'bg-chart-4',
  5: 'bg-chart-5',
  6: 'bg-chart-1',
  7: 'bg-chart-2',
  8: 'bg-chart-3',
  9: 'bg-chart-4',
  10: 'bg-chart-5',
}

const barVariants = cva('flex w-full overflow-hidden rounded-full bg-muted', {
  variants: {
    size: {
      sm: 'h-1.5',
      md: 'h-2.5',
      lg: 'h-4',
    },
  },
  defaultVariants: { size: 'md' },
})

/** Minimum share (%) a segment needs before its inline label chip is worth rendering. */
const MIN_INLINE_LABEL_PCT = 12

export interface SegmentedBarSegment {
  /** Stable id for the React key. Falls back to index — supply one whenever segments can reorder. */
  id?: string
  label: string
  value: number
  /** Categorical fill — maps (cycling every 5) onto `--color-chart-1..5`. Never a raw color (hard rule 2). */
  colorIndex: BadgeColorIndex
}

export interface SegmentedBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof barVariants> {
  segments: SegmentedBarSegment[]
  /** Render each segment's own label in a small chip once its share is wide enough to hold it. Default false. */
  showLabels?: boolean
  /** Accessible name for the bar as a whole. */
  'aria-label'?: string
  /** Copy used as the accessible name when every segment's value is zero (or the array is empty). */
  emptyLabel?: string
}

export const SegmentedBar = forwardRef<HTMLDivElement, SegmentedBarProps>(
  (
    {
      className,
      segments,
      size,
      showLabels = false,
      emptyLabel = 'No data',
      'aria-label': ariaLabel = 'Breakdown',
      ...props
    },
    ref,
  ) => {
    const total = segments.reduce((sum, segment) => sum + segment.value, 0)

    if (total <= 0) {
      return (
        <div
          ref={ref}
          data-slot="segmented-bar"
          data-state="empty"
          role="img"
          aria-label={emptyLabel}
          className={cn(barVariants({ size }), className)}
          {...props}
        />
      )
    }

    return (
      <div
        ref={ref}
        data-slot="segmented-bar"
        role="group"
        aria-label={ariaLabel}
        className={cn(barVariants({ size }), className)}
        {...props}
      >
        {segments.map((segment, index) => {
          if (segment.value <= 0) return null
          const id = segment.id ?? String(index)
          const pct = (segment.value / total) * 100
          const isLast = index === segments.length - 1

          return (
            <Tooltip key={id}>
              <TooltipTrigger
                type="button"
                data-slot="segmented-bar-segment"
                aria-label={`${segment.label}: ${segment.value}`}
                style={{ width: `${pct}%` }}
                className={cn(
                  'relative flex h-full items-center justify-center outline-none transition-opacity',
                  'hover:opacity-90 focus-visible:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  FILL_COLOR_CLASSES[segment.colorIndex],
                  !isLast && 'border-e border-card',
                )}
              >
                {showLabels && pct >= MIN_INLINE_LABEL_PCT ? (
                  <span className="truncate rounded-xs bg-card/90 px-1 text-caption font-medium text-foreground">
                    {segment.label}
                  </span>
                ) : null}
              </TooltipTrigger>
              <TooltipContent>
                {segment.label}: {segment.value} ({Math.round(pct)}%)
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    )
  },
)

SegmentedBar.displayName = 'SegmentedBar'

export { barVariants as segmentedBarVariants }
