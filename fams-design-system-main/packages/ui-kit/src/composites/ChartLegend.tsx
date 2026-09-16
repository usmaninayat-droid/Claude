import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Badge, type BadgeColorIndex } from '../primitives/Badge'

/**
 * ChartLegend — labeled color-swatch list for chart series. [L3 composite]
 *
 * Consolidates three competing reference shapes into one component:
 * `chart-legend.tsx`'s hover/toggle behavior, `figma-charts.tsx`'s
 * `background`+`counter` variant, and its static `HeatLegend` bucket strip.
 * A legend rendered with no `onToggle` covers the HeatLegend case for free —
 * there is no separate static component.
 *
 * Swatches are colored via `colorIndex` → the `--color-chart-1..5`
 * categorical palette (cycling every 5; hard rule 2). `item.color` is the one
 * sanctioned override, for a series a blueprint bound to a NON-categorical
 * token (`--color-primary`, a semantic status hue, a magnitude ramp stop) —
 * the caller resolves the token, this file never writes a hex.
 * The trailing count chip reuses
 * `Badge` (`size="xs"`) instead of re-implementing a pill.
 *
 * State-agnostic (rule 8): toggling is fully controlled. The caller owns
 * which series are hidden (`hiddenIds`) and reacts to `onToggle` to flip it,
 * in lockstep with the chart's own series-visibility state — this component
 * never tracks hidden state itself.
 *
 * @usage-v5
 *   No `<ChartLegend>`-shaped component exists in v5 — every chart hand-rolls
 *   its own legend:
 *   - `iwmp/components/tabs/panels/asset/bin/BinOverviewTab.vue` —
 *     `heatmapLegendItems` array (`{label, color}`) rendered via `v-for` with
 *     `:style="{ background: legendItem.color }"` (raw hex inline, exactly
 *     what `colorIndex` retires).
 *   - `shared/components/charts/AnalyticBarChart.vue` (+ AreaChart/PieChart/
 *     AplBarChart siblings, ~8 files) — legend handed to ApexCharts via a
 *     `legend: {...}` config object; toggling/markers not reusable outside it.
 *   - `shared/components/profile/DriverSafetyOverview.vue` — boolean
 *     `show-legend`/`hide-legend-icon` props threaded through per chart,
 *     no shared presenter.
 *   Forms needed: colorIndex swatches (no hex), optional count, toggle.
 * @usage-index chart-legend
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

export interface ChartLegendItem {
  /** Stable id for `onToggle`/`hiddenIds` matching. Falls back to the item's index — supply one whenever items can reorder or repeat labels. */
  id?: string
  label: ReactNode
  /** Swatch color — categorical series index. Always supply one: it is the fallback whenever `color` is absent. */
  colorIndex: BadgeColorIndex
  /**
   * Token-resolved swatch override, for a series bound to a NON-categorical
   * token (`"var(--color-primary)"`, a semantic status hue, a magnitude ramp
   * stop). Same blueprint-driven runtime-value escape hatch `StatusPill.color`
   * and `AreaChartSeries.color` document — a value threaded in from the
   * caller's data at render time, never a literal hex in this file (hard rule
   * 2). Omit for the categorical palette, which stays the default.
   */
  color?: string
  /** Optional trailing value, shown as a count chip when `showCounts` is set. */
  value?: ReactNode
  /** Free content pinned to the end of the row (a delta, a unit, an axis note). Rendered after the count chip and pushed to the row end, so it stays on the inline-end side under RTL. */
  trailing?: ReactNode
}

export interface ChartLegendProps
  extends Omit<HTMLAttributes<HTMLUListElement>, 'onToggle' | 'children'> {
  items: ChartLegendItem[]
  /** Row (default) or stacked column — stacked suits tall sidebars/panels. */
  orientation?: 'horizontal' | 'vertical'
  /** Tinted surface strip behind the whole legend (reference's `background` variant). */
  tinted?: boolean
  /** Render each item's `value` as a trailing count chip. */
  showCounts?: boolean
  /** Ids currently hidden (dimmed + struck through). Controlled — the caller owns this state. */
  hiddenIds?: string[]
  /** Presence makes the legend interactive: items become toggle buttons. Omit for a static display (e.g. a fixed legend key). */
  onToggle?: (id: string) => void
  /**
   * `'compact'` is the Figma DS V2 chart-side legend (node 5186:15669): rows
   * 8px apart, 4px dot→label→counter gap, label 14px Medium in the strong
   * muted ink, no 44px hit floor — it sits beside a donut, not in a toolbar.
   * Default `'default'` keeps the toolbar rhythm and the hit floor.
   */
  density?: 'default' | 'compact'
}

export const ChartLegend = forwardRef<HTMLUListElement, ChartLegendProps>(
  (
    {
      className,
      items,
      orientation = 'horizontal',
      tinted = false,
      showCounts = false,
      hiddenIds = [],
      onToggle,
      density = 'default',
      ...props
    },
    ref,
  ) => {
    const interactive = Boolean(onToggle)
    const compact = density === 'compact'

    return (
      <ul
        ref={ref}
        data-slot="chart-legend"
        aria-label="Chart legend"
        className={cn(
          'm-0 flex list-none gap-x-4 gap-y-2 p-0',
          orientation === 'vertical' ? 'flex-col items-start' : 'flex-wrap items-center',
          tinted && 'rounded-md bg-muted px-3 py-2',
          className,
        )}
        {...props}
      >
        {items.map((item, index) => {
          const id = item.id ?? String(index)
          const hidden = hiddenIds.includes(id)
          const inner = (
            <>
              <span
                aria-hidden="true"
                // An inline background always wins over the token class, so an
                // overridden swatch needs no conditional class swap (same
                // "color always wins" precedent as `KpiTile.iconColor`).
                style={item.color ? { backgroundColor: item.color } : undefined}
                className={cn('size-2.5 shrink-0 rounded-full', DOT_COLOR_CLASSES[item.colorIndex])}
              />
              <span
                className={cn(
                  'truncate text-body-sm',
                  compact ? 'font-medium leading-5 text-muted-foreground-strong' : 'text-foreground',
                  hidden && 'text-muted-foreground line-through',
                )}
              >
                {item.label}
              </span>
              {showCounts && item.value != null ? (
                <Badge
                  size="xs"
                  variant="muted"
                  // Figma DS V2 counter (5122:12340): h16 · px8 · r40 · 10/12 SemiBold on surface/low_contrast.
                  className={cn('shrink-0', compact && 'bg-surface-low-contrast px-2 text-[10px] font-semibold leading-3 text-muted-foreground-strong')}
                >
                  {item.value}
                </Badge>
              ) : null}
              {item.trailing != null ? (
                <span
                  data-slot="chart-legend-trailing"
                  className="ms-auto shrink-0 ps-2 text-body-sm text-muted-foreground"
                >
                  {item.trailing}
                </span>
              ) : null}
            </>
          )

          return (
            <li
              key={id}
              data-slot="chart-legend-item"
              // A toggle row is a real control, so it carries the 44px hit
              // floor (verdict V11) — the map legend already does; this is the
              // one legend that did not. A static key keeps its compact height.
              className={cn('flex min-w-0 items-center', interactive && !compact && 'min-h-11')}
            >
              {interactive ? (
                <button
                  type="button"
                  onClick={() => onToggle?.(id)}
                  aria-pressed={!hidden}
                  data-slot="chart-legend-toggle"
                  className={cn(
                    'flex min-w-0 items-center rounded-xs outline-none transition-opacity',
                    compact ? 'gap-1 px-0' : 'min-h-11 gap-1.5 px-1',
                    'hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring',
                    hidden && 'opacity-50',
                  )}
                >
                  {inner}
                </button>
              ) : (
                <span
                  data-slot="chart-legend-static"
                  className={cn('flex min-w-0 items-center', compact ? 'gap-1 px-0' : 'gap-1.5 px-1', hidden && 'opacity-50')}
                >
                  {inner}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    )
  },
)

ChartLegend.displayName = 'ChartLegend'
