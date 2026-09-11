import { useEffect, type HTMLAttributes, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { DefaultLabelFormatterCallbackParams, EChartsOption } from 'echarts'
import chartTheme from '@fams/tokens/theme.echarts.json'
import { cn } from '../lib/cn'
import { ChartContainer } from './ChartContainer'
import { ChartLegend, type ChartLegendItem } from './ChartLegend'
import { ChartTooltip, type ChartTooltipItem } from './ChartTooltip'
import { foregroundInk, seriesColorIndex, warnOnUnsafePalette } from './chart-axis'
import { resolveCssColor, useThemeVersion } from './chart-color'
import { buildShareDataTable } from './chart-data-table'
import type { BadgeColorIndex } from '../primitives/Badge'

/**
 * DonutChart — proportional-share donut/pie built on `ChartContainer`. [L3 composite]
 *
 * Composes the shared ECharts chassis (`ChartContainer`) with `ChartLegend`
 * (series key) and `ChartTooltip` (hover content) — it never touches
 * `echarts.init`/`dispose` itself. Segment color is `colorIndex` → the
 * `--color-chart-1..5` categorical palette (matches `ChartLegend`/`Badge`);
 * the *pixel* color fed into the ECharts `itemStyle` comes from the same
 * pre-resolved `@fams/tokens/theme.echarts.json` that `ChartContainer`
 * already registers as the `'fams'` theme — canvas/SVG paint operations
 * cannot resolve `var(--color-chart-N)` at draw time, so this is the one
 * sanctioned bridge from token to renderer, not a hardcoded palette.
 *
 * Rounded segment corners + visual gaps both come from a single
 * `itemStyle.borderRadius` — with no border color/width set, the chart
 * canvas behind the pie is transparent, so rounding a sector's corners
 * carves a real gap to whatever sits behind it (the page/card), not a
 * neighboring sector. No border-color-matches-background trick needed.
 *
 * **Segment values are never drawn inside the arc.** White numerals on a
 * categorical fill measure 2.3–2.6:1 — below 3:1-large, let alone 4.5:1 — so
 * that treatment is not offered at all: the legend's count chips carry the
 * numbers by default (`showCounts`), and `valueLabels="outside"` puts them on a
 * leader line in primary ink when the legend is not enough. `centerLabel` is a
 * free `ReactNode`, so a value + caption + `TrendIndicator` stack composes into
 * the hole; its box is constrained to the hole's diameter so a composed stack
 * cannot spill over the arc at small `innerRadius` values.
 *
 * State-agnostic (rule 8): `hiddenIds`/`onToggle` mirror `ChartLegend`'s own
 * controlled model — the caller owns which segments are hidden, this
 * component only renders the current `data` minus whatever's hidden.
 */
export interface DonutChartDatum {
  /** Stable id for `onToggle`/`hiddenIds` matching. Falls back to the item's index — supply one whenever items can reorder. */
  id?: string
  /** Segment label, shown in the legend and tooltip. */
  label: string
  /** Segment value — the raw magnitude, not a pre-computed percentage. */
  value: number
  /** Pins the segment to a specific categorical swatch. Omit to cycle 1→5 by original array position. */
  colorIndex?: BadgeColorIndex
  /**
   * Raw color override — the same blueprint-driven escape hatch
   * `AreaChartSeries.color`/`StatusPill.color` document (a slice a blueprint
   * bound to a NON-categorical token: `"var(--color-primary)"`, a semantic
   * status hue). Takes precedence over `colorIndex` for the arc, the legend
   * swatch and the tooltip dot; resolved through `resolveCssColor`.
   */
  color?: string
}

export interface DonutChartProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'aria-label' | 'onToggle'> {
  /** Segments to render — chart-agnostic, no business vocabulary. */
  data: DonutChartDatum[]
  /** Required accessible description of what the chart shows, forwarded to `ChartContainer`. */
  'aria-label': string
  /** Fixed chart height — number is px, any string is used verbatim. Default `320`. */
  height?: number | string
  /** Shows the `ChartContainer` loading overlay. Default `false`. */
  loading?: boolean
  /** Content rendered centered over the donut hole — a free `ReactNode`, so a value + caption + `TrendIndicator` stack composes here. Its box is clamped to the hole diameter. Omit for none. */
  centerLabel?: ReactNode
  /** Legend placement, or `'none'` to omit it entirely. Default `'bottom'`. */
  legend?: 'bottom' | 'end' | 'none'
  /** Renders each legend item's value as a trailing count chip. Default `true` — the legend is where segment values live, because in-arc numerals fail contrast. */
  showCounts?: boolean
  /** `'none'` (default) draws no on-canvas segment values; `'outside'` puts them on a leader line beyond the arc in primary ink. There is deliberately no in-arc option. */
  valueLabels?: 'none' | 'outside'
  /** Ids currently hidden from the donut and dimmed in the legend. Controlled — the caller owns this state. */
  hiddenIds?: string[]
  /** Presence makes the legend interactive. Omit for a static legend. */
  onToggle?: (id: string) => void
  /** Donut hole radius, percent of the chart's bounding box. Default `60`. */
  innerRadius?: number
  /** Outer segment radius, percent of the chart's bounding box. Default `90`. */
  outerRadius?: number
  /** `'canvas'` (default) or `'svg'` — forwarded to `ChartContainer`. */
  renderer?: 'canvas' | 'svg'
  /** Message rendered in place of the arc when every slice is hidden or there is nothing to draw. Without it, hiding every slice paints a solid placeholder disc. */
  emptyText?: ReactNode
}

const CHART_COLORS = chartTheme.color

function colorForIndex(colorIndex: BadgeColorIndex): string {
  return CHART_COLORS[(colorIndex - 1) % CHART_COLORS.length]
}

function idOf(datum: DonutChartDatum, index: number): string {
  return datum.id ?? String(index)
}

interface DonutSliceExtra {
  sliceId: string
  colorIndex: BadgeColorIndex
  sliceColor?: string
}

function isDonutSliceParams(
  params: DefaultLabelFormatterCallbackParams,
): params is DefaultLabelFormatterCallbackParams & { data: DonutSliceExtra } {
  const data = params.data as Partial<DonutSliceExtra> | undefined
  return typeof data?.sliceId === 'string' && typeof data?.colorIndex === 'number'
}

const OUTSIDE_LABEL_FONT_SIZE = 12

function buildOption(
  data: DonutChartDatum[],
  hiddenIds: string[],
  innerRadius: number,
  outerRadius: number,
  valueLabels: 'none' | 'outside',
): EChartsOption {
  const slices = data
    .map((datum, index) => ({
      id: idOf(datum, index),
      label: datum.label,
      value: datum.value,
      colorIndex: seriesColorIndex(datum.colorIndex, index),
      // `color` is DATA — an ECharts canvas cannot resolve a live CSS var, so
      // the override becomes a literal before it reaches the arc.
      sliceColor: datum.color ? resolveCssColor(datum.color, colorForIndex(seriesColorIndex(datum.colorIndex, index))) : undefined,
    }))
    .filter((slice) => !hiddenIds.includes(slice.id))
  const outside = valueLabels === 'outside'

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const single = Array.isArray(params) ? params[0] : params
        if (!single || !isDonutSliceParams(single)) return ''
        const items: ChartTooltipItem[] = [
          {
            label: single.name,
            value: `${single.value} (${single.percent ?? 0}%)`,
            colorIndex: single.data.colorIndex,
            color: single.data.sliceColor,
          },
        ]
        return renderToStaticMarkup(<ChartTooltip items={items} />)
      },
    },
    series: [
      {
        type: 'pie',
        radius: [`${innerRadius}%`, `${outerRadius}%`],
        avoidLabelOverlap: outside,
        itemStyle: { borderRadius: 8 },
        label: outside
          ? {
              show: true,
              position: 'outside' as const,
              color: foregroundInk(),
              fontSize: OUTSIDE_LABEL_FONT_SIZE,
              formatter: '{c}',
            }
          : { show: false },
        labelLine: { show: outside, length: 8, length2: 8 },
        data: slices.map((slice) => ({
          name: slice.label,
          value: slice.value,
          sliceId: slice.id,
          colorIndex: slice.colorIndex,
          sliceColor: slice.sliceColor,
          itemStyle: { color: slice.sliceColor ?? colorForIndex(slice.colorIndex) },
        })),
      },
    ],
  }
}

export function DonutChart({
  data,
  height = 320,
  loading = false,
  centerLabel,
  legend = 'bottom',
  showCounts = true,
  valueLabels = 'none',
  hiddenIds = [],
  onToggle,
  innerRadius = 60,
  outerRadius = 90,
  renderer = 'canvas',
  emptyText,
  className,
  'aria-label': ariaLabel,
  ...rest
}: DonutChartProps) {
  // `datum.color` is DATA (a blueprint may author `"var(--color-primary)"`);
  // an ECharts canvas cannot resolve a live CSS var, so every override becomes
  // a literal here and must re-resolve on a theme/tenant change.
  const themeVersion = useThemeVersion()
  void themeVersion

  useEffect(() => {
    warnOnUnsafePalette(data.map((datum, index) => seriesColorIndex(datum.colorIndex, index)), 'DonutChart')
  }, [data])

  const legendItems: ChartLegendItem[] = data.map((datum, index) => ({
    id: idOf(datum, index),
    label: datum.label,
    value: datum.value,
    colorIndex: seriesColorIndex(datum.colorIndex, index),
    color: datum.color
      ? resolveCssColor(datum.color, colorForIndex(seriesColorIndex(datum.colorIndex, index)))
      : undefined,
  }))

  const visibleCount = data.filter((datum, index) => !hiddenIds.includes(idOf(datum, index))).length
  const isEmpty = visibleCount === 0
  const option = buildOption(data, hiddenIds, innerRadius, outerRadius, valueLabels)
  const dataTable = buildShareDataTable(ariaLabel, data, (value) => value.toLocaleString())

  return (
    <div
      data-slot="donut-chart"
      className={cn(
        'flex gap-4',
        legend === 'end' ? 'flex-row items-center' : 'flex-col',
        className,
      )}
      {...rest}
    >
      <div data-slot="donut-chart-plot" className="relative min-w-0 flex-1">
        <ChartContainer
          option={option}
          loading={loading}
          height={height}
          renderer={renderer}
          aria-label={ariaLabel}
          dataTable={dataTable}
          isEmpty={isEmpty}
          emptyText={emptyText}
        />
        {centerLabel != null && !isEmpty ? (
          <div
            data-slot="donut-chart-center-label"
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-center"
          >
            {/* Clamped to the hole so a composed stack (value + caption +
                trend) wraps inside it rather than spilling over the arc — the
                hole's diameter IS innerRadius% of the plot box. */}
            <div
              data-slot="donut-chart-center-stack"
              className="flex min-w-0 flex-col items-center justify-center gap-0.5"
              style={{ maxInlineSize: `${innerRadius}%`, maxBlockSize: `${innerRadius}%` }}
            >
              {centerLabel}
            </div>
          </div>
        ) : null}
      </div>
      {legend !== 'none' ? (
        <ChartLegend
          items={legendItems}
          orientation={legend === 'end' ? 'vertical' : 'horizontal'}
          showCounts={showCounts}
          hiddenIds={hiddenIds}
          onToggle={onToggle}
          className={legend === 'end' ? 'shrink-0' : undefined}
        />
      ) : null}
    </div>
  )
}

DonutChart.displayName = 'DonutChart'
