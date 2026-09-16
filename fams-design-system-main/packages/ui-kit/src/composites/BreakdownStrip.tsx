import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'

/**
 * BreakdownStrip — a whole broken into status shares, read two ways at once:
 * a row of headline counts (label over a tone-coloured value, divided by
 * hairlines) and, under it, ONE proportional bar whose segments overlap with
 * rounded ends so each share reads as a pill peeking out from the one before.
 * [L3 composite]
 *
 * This is the body of the Figma "Progress Overview" widget (Tadweer June
 * Release 2227:76502 — Fleet Availability / Workforce Readiness). It carries
 * NO card chrome: the dashboard shell (`ChartCard` via `WidgetCard`) owns the
 * header, so the same strip can also sit inside a profile section or a wall
 * panel. Module-agnostic: items are `{label, value, tone}` — no domain words.
 *
 * Distinct from `StatusBreakdownCard` (a compact card with a legend list and a
 * thin gapped bar) and `SegmentedBar` (categorical chart hues, tooltips): this
 * strip is the large stat-row form, semantic tones only.
 *
 * Rules honoured: every value renders as text in the stat row, so colour and
 * length are never the sole carrier (UX MUST 44); an all-zero strip renders a
 * muted track with a visible "No data" reading (MUST 45); the bar itself is
 * `aria-hidden` decoration — the stat row IS the accessible reading.
 *
 * @usage-index breakdown-strip
 */
export type BreakdownTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'lavender' | 'yellow' | 'neutral'

/** Static lookups so Tailwind sees every class name at build time. */
const FILL_CLASSES: Record<BreakdownTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
  lavender: 'bg-accent-family-lavender-normal',
  yellow: 'bg-accent-family-yellow-normal',
  neutral: 'bg-muted-foreground',
}
const INK_CLASSES: Record<BreakdownTone, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-info',
  lavender: 'text-accent-family-lavender-normal',
  yellow: 'text-accent-family-yellow-normal',
  neutral: 'text-gray-600',
}

/**
 * How far (px) each segment's rounded end reaches under the previous one.
 * Figma draws every segment with `mr:-30px`; expressed as a fixed overlap so
 * a segment's visible share is its true width, not width-minus-overlap.
 */
const OVERLAP_PX = 30

export interface BreakdownStripItem {
  /** Stable id for the React key. Falls back to index. */
  id?: string
  label: ReactNode
  value: number
  /** Semantic fill + value ink. Default `'neutral'`. */
  tone?: BreakdownTone
  /** Pre-formatted display of `value` (e.g. `"03"`). Falls back to the number. */
  display?: ReactNode
}

export interface BreakdownStripProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  items: BreakdownStripItem[]
  /**
   * Proportion denominator. Defaults to the sum of `items[].value` — pass it
   * when the items are a subset of a larger whole (the remainder shows as the
   * muted track).
   */
  total?: number
  /** Text shown when every item is zero. Default `"No data"`. */
  emptyLabel?: ReactNode
  /** Accessible name of the strip as a whole. Default `"Breakdown"`. */
  'aria-label'?: string
}

export const BreakdownStrip = forwardRef<HTMLDivElement, BreakdownStripProps>(
  ({ className, items, total, emptyLabel = 'No data', 'aria-label': ariaLabel = 'Breakdown', ...props }, ref) => {
    const sum = items.reduce((acc, item) => acc + Math.max(0, item.value), 0)
    const denominator = total !== undefined && total > 0 ? total : sum

    // Cumulative shares: segment k spans from the start to the end of its own
    // share, stacked with DESCENDING z-order, so the earlier segment's rounded
    // end sits on top of the next one — the overlapping-pill look of the design
    // without any negative margins.
    let running = 0
    const segments = items
      .map((item, index) => {
        const value = Math.max(0, item.value)
        if (value === 0 || denominator === 0) return null
        running += value
        return { key: item.id ?? String(index), tone: item.tone ?? 'neutral', end: Math.min(100, (running / denominator) * 100), z: items.length - index }
      })
      .filter((segment): segment is NonNullable<typeof segment> => segment !== null)

    return (
      <div
        ref={ref}
        data-slot="breakdown-strip"
        role="group"
        aria-label={ariaLabel}
        className={cn('flex min-w-0 flex-col gap-7', className)}
        {...props}
      >
        <div data-slot="breakdown-strip-stats" className="flex w-full items-center">
          {items.map((item, index) => (
            <div key={item.id ?? index} className="contents">
              {index > 0 ? <span aria-hidden className="h-[3.125rem] w-px shrink-0 bg-border" /> : null}
              <div
                data-slot="breakdown-strip-stat"
                data-tone={item.tone ?? 'neutral'}
                className={cn(
                  'flex min-w-0 flex-1 flex-col gap-1 text-center',
                  // Outer columns hug their edge as the design draws them.
                  index === 0 && 'items-start text-start',
                  index === items.length - 1 && items.length > 1 && 'items-end text-end',
                )}
              >
                <span className="w-full truncate text-body-sm font-medium leading-5 text-muted-foreground">{item.label}</span>
                <bdi className={cn('w-full text-h6 font-semibold leading-[1.3] tabular-nums', INK_CLASSES[item.tone ?? 'neutral'])}>
                  {item.display ?? Math.max(0, item.value)}
                </bdi>
              </div>
            </div>
          ))}
        </div>

        {segments.length === 0 ? (
          <div data-slot="breakdown-strip-empty" className="flex flex-col gap-1.5">
            <div aria-hidden className="h-3 w-full rounded-full bg-muted" />
            <span className="text-body-xs text-muted-foreground">{emptyLabel}</span>
          </div>
        ) : (
          <div
            data-slot="breakdown-strip-bar"
            aria-hidden
            className={cn('relative isolate h-3 w-full overflow-hidden rounded-full', total !== undefined && total > sum ? 'bg-muted' : 'bg-transparent')}
          >
            {segments.map((segment) => (
              <span
                key={segment.key}
                data-slot="breakdown-strip-segment"
                data-tone={segment.tone}
                className={cn('absolute inset-y-0 start-0 rounded-full', FILL_CLASSES[segment.tone])}
                // Data-driven width (legit `style` under hard rule 2). Every
                // segment but the last extends under its successor by the
                // design's overlap so the rounded end reads as a pill.
                style={{
                  width: segment.end >= 100 ? '100%' : `calc(${segment.end}% + ${OVERLAP_PX}px)`,
                  maxWidth: '100%',
                  zIndex: segment.z,
                }}
              />
            ))}
          </div>
        )}
      </div>
    )
  },
)

BreakdownStrip.displayName = 'BreakdownStrip'
