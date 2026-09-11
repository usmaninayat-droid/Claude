import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import type { BadgeColorIndex } from '../primitives/Badge'

/**
 * ChartTooltip — presentational tooltip content shell for chart hover states. [L3 composite]
 *
 * NOT bound to Recharts (or any chart engine) — no `active`/`payload` shape
 * matching, no engine import. A chart adapter reads its own library's hover
 * event, maps it to `items`, and renders this as the tooltip content; the
 * adapter owns "when" and "what," this component owns "how it looks."
 *
 * Series color is `colorIndex` → the `--color-chart-1..5` categorical palette
 * (matches `Badge` and `ChartLegend`). `item.color` is the one sanctioned
 * override, for a series a blueprint bound to a NON-categorical token — the
 * caller resolves the token, this file never writes a hex (hard rule 2).
 *
 * State-agnostic (rule 8): pure presenter over the `items`/`title` it is
 * given — no formatting logic, no payload lookup, no visibility timing.
 *
 * Dark-surface popover: `bg-foreground`/`text-background`, the same
 * inverse-surface pairing `TooltipContent` already uses for its dark chrome
 * (not `bg-popover`, which resolves to a light surface in this system).
 *
 * @usage-v5
 *   No chart-agnostic tooltip shell exists in v5 — the one custom-tooltip
 *   chart wraps ApexCharts' `tooltip.custom` callback in a hand-built HTML
 *   string, this component's exact shape:
 *   - `shared/components/charts/AnalyticAreaChart.vue` — `customTooltip`
 *     prop toggles a `tooltip.custom` returning
 *     `background:#1c1c2d` + time-header row + `<span style="background:${color}">`
 *     dot + series name + a count badge (`background:#344054`) — i.e. this
 *     component's title/dot/label/value rows, built as a raw template string
 *     with inline hex per call instead of tokens.
 *   - `iwmp/components/charts/IncidentsMapLibre.vue` — same `#1c1c2d` dark
 *     tooltip chrome, duplicated independently for a map popup, not a chart.
 *   All other ApexCharts wrappers (`AplBarChart`, `AreaChart`, `AreaChart2`,
 *   `SensorTimelineChart`, `AnalyticsPieChart` — 7 files) rely on ApexCharts'
 *   default tooltip (no custom shell), so `customTooltip: true` is the
 *   escape hatch this component should replace, not the norm.
 *   Forms needed: optional title row, per-series dot + label + value,
 *   colorIndex only (no hex).
 * @usage-index chart-tooltip
 */

/** Categorical index → `--color-chart-1..5` dot, cycling every 5 (1→1, …, 5→5,
 *  6→1, …). Static lookup (not a template literal) so Tailwind's compiler sees
 *  every class name at build time. */
const DOT_COLOR_CLASSES: Record<BadgeColorIndex, string> = {
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

export interface ChartTooltipItem {
  label: ReactNode
  value: ReactNode
  /** Series swatch — categorical index. Omit (with `color`) to skip the dot entirely (e.g. a single-series tooltip). */
  colorIndex?: BadgeColorIndex
  /**
   * Token-resolved swatch override, for a series bound to a NON-categorical
   * token. Same escape hatch `ChartLegendItem.color` documents — the caller
   * resolves the token, this file never writes a hex (hard rule 2).
   */
  color?: string
}

export interface ChartTooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** One row per series/category, in display order. */
  items: ChartTooltipItem[]
  /** Optional heading row — typically the hovered x-axis label or timestamp. */
  title?: ReactNode
}

export const ChartTooltip = forwardRef<HTMLDivElement, ChartTooltipProps>(
  ({ className, items, title, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="tooltip"
        data-slot="chart-tooltip"
        className={cn(
          'min-w-32 rounded-sm bg-foreground px-3 py-2 text-background shadow-elevation',
          className,
        )}
        {...props}
      >
        {title != null ? (
          <div data-slot="chart-tooltip-title" className="mb-1 text-caption font-medium text-background/70">
            {title}
          </div>
        ) : null}
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {items.map((item, index) => (
            <li
              key={index}
              data-slot="chart-tooltip-item"
              className="flex items-center justify-between gap-3 text-body-xs"
            >
              <span className="inline-flex min-w-0 items-center gap-1.5">
                {item.colorIndex || item.color ? (
                  <span
                    aria-hidden="true"
                    style={item.color ? { backgroundColor: item.color } : undefined}
                    className={cn(
                      'size-2 shrink-0 rounded-full',
                      item.colorIndex ? DOT_COLOR_CLASSES[item.colorIndex] : undefined,
                    )}
                  />
                ) : null}
                <span className="truncate">{item.label}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{item.value}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  },
)

ChartTooltip.displayName = 'ChartTooltip'
