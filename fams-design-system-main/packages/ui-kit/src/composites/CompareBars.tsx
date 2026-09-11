import { useCallback, useMemo, useRef, useState, type HTMLAttributes } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ECharts, EChartsOption, TooltipComponentFormatterCallbackParams } from 'echarts'
import type { CallbackDataParams } from 'echarts/types/dist/shared'
import chartTheme from '@fams/tokens/theme.echarts.json'
import { cn } from '../lib/cn'
import type { BadgeColorIndex } from '../primitives/Badge'
import { ChartContainer } from './ChartContainer'
import { ChartLegend, type ChartLegendItem } from './ChartLegend'
import { ChartTooltip, type ChartTooltipItem } from './ChartTooltip'

/**
 * CompareBars — horizontal per-category comparison chart (e.g. target vs.
 * actual), on ECharts. [L3 composite]
 *
 * Owns nothing about the ECharts engine itself — it builds a domain-agnostic
 * `EChartsOption` from `categories`/`series` and renders it through
 * `ChartContainer`, the one place in the system that touches `echarts`
 * directly. Tooltip content is produced by mapping the hover event to
 * `ChartTooltipItem[]` and rendering `ChartTooltip` through it (via
 * `renderToStaticMarkup`, so ECharts' `tooltip.formatter` can stay
 * synchronous) — the same "chart adapter" role documented on `BarChart`/
 * `AreaChart`. An optional legend row reuses `ChartLegend`, wired to ECharts'
 * own (visually hidden) legend model via `legendToggleSelect`/
 * `legendselectchanged` so series visibility stays owned by the chart
 * instance, not duplicated state.
 *
 * **Always horizontal, always grouped:** unlike `BarChart`, orientation and
 * stacking are not configurable — a comparison chart's whole point is
 * side-by-side bars per category (categories on the value-free axis), so
 * these two axes of `BarChart`'s flexibility are collapsed to the one shape
 * this component exists for.
 *
 * **End-of-bar value labels:** each bar renders its formatted value past its
 * tip (`label.position = 'end'`), matching the "value at a glance" reading
 * pattern a comparison widget needs — no separate label layer to keep in
 * sync with the bars.
 *
 * **Color:** each series' fill comes from its resolved `--color-chart-1..5`
 * swatch, read from the same compiled `@fams/tokens/theme.echarts.json` that
 * `ChartContainer` registers as the chart theme — canvas paint operations
 * cannot resolve CSS `var()` at draw time, so this is the sanctioned bridge
 * from token to renderer, never a literal hex (matches `BarChart`/`AreaChart`).
 *
 * **State-agnostic (rule 8):** legend hidden/shown state is read from the
 * live ECharts instance (`legendselectchanged`), not tracked independently —
 * toggling always round-trips through the chart via `dispatchAction`.
 *
 * No business vocabulary: `categories`/`series` are the only inputs — no
 * fetch, no stores, no domain-specific field names.
 */
export interface CompareBarsSeries {
  /** Stable id — falls back to the series' index. Drives legend toggling and ECharts series identity. */
  id?: string
  /** Series label — shown in the legend and tooltip (e.g. "Target", "Actual"). */
  label: string
  /** Numeric values, aligned 1:1 with `categories`. */
  data: number[]
  /** Categorical swatch — cycles through the `--color-chart-1..5` palette by series index when omitted. */
  colorIndex?: BadgeColorIndex
}

export interface CompareBarsProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'aria-label'> {
  /** Category values — one per row, placed on the category axis. */
  categories: Array<string | number>
  /** Two or more series rendered as grouped, side-by-side bars per category. */
  series: CompareBarsSeries[]
  /** Shows a toggleable legend row below the chart. Defaults to `true` when more than one series is given. */
  legend?: boolean
  /** Formats numeric values for the value axis, end-of-bar labels, and tooltip. Default: `value.toLocaleString()`. */
  valueFormatter?: (value: number) => string
  /** Fixed container height — number is px, any string is used verbatim. Default `320`. */
  height?: number | string
  /** Shows a loading overlay via `ChartContainer`. Default `false`. */
  loading?: boolean
  /** `'canvas'` (default) or `'svg'` — forwarded to `ChartContainer`. */
  renderer?: 'canvas' | 'svg'
  /** Escape hatch invoked once with the live ECharts instance, after this component wires its own legend-sync handler. Forwarded from `ChartContainer`. */
  onChartReady?: (chart: ECharts) => void
  /** Required accessible description of what the chart shows. */
  'aria-label': string
}

const PALETTE: string[] = chartTheme.color
const CATEGORICAL_SPAN = 5
/** Rounds the trailing (value-axis) corners of each horizontal bar. CSS-order
 *  tuple (topLeft, topRight, bottomRight, bottomLeft), same as ECharts expects. */
const TRAILING_RADIUS: [number, number, number, number] = [0, 4, 4, 0]

function seriesColorIndex(explicit: BadgeColorIndex | undefined, index: number): BadgeColorIndex {
  return explicit ?? ((index % CATEGORICAL_SPAN) + 1) as BadgeColorIndex
}

function resolveHex(colorIndex: BadgeColorIndex): string {
  return PALETTE[(colorIndex - 1) % PALETTE.length]
}

const defaultValueFormatter = (value: number): string => value.toLocaleString()

export function CompareBars({
  categories,
  series,
  legend,
  valueFormatter = defaultValueFormatter,
  height = 320,
  loading = false,
  renderer = 'canvas',
  onChartReady,
  className,
  'aria-label': ariaLabel,
  ...rest
}: CompareBarsProps) {
  const chartRef = useRef<ECharts | null>(null)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])

  const seriesIds = useMemo(() => series.map((s, i) => s.id ?? String(i)), [series])
  const showLegend = legend ?? series.length > 1

  const legendItems: ChartLegendItem[] = useMemo(
    () =>
      series.map((s, i) => ({
        id: seriesIds[i],
        label: s.label,
        colorIndex: seriesColorIndex(s.colorIndex, i),
      })),
    [series, seriesIds],
  )

  const seriesMetaById = useMemo(
    () =>
      Object.fromEntries(
        series.map((s, i) => [seriesIds[i], { label: s.label, colorIndex: seriesColorIndex(s.colorIndex, i) }]),
      ),
    [series, seriesIds],
  )

  const tooltipFormatter = useCallback(
    (raw: TooltipComponentFormatterCallbackParams): string => {
      const list = Array.isArray(raw) ? raw : [raw]
      const items: ChartTooltipItem[] = list.map((param) => {
        const meta = seriesMetaById[param.seriesId ?? '']
        return {
          label: meta?.label ?? param.seriesName ?? '',
          value: valueFormatter(Number(param.value)),
          colorIndex: meta?.colorIndex,
        }
      })
      const title = list[0]?.name
      return renderToStaticMarkup(<ChartTooltip title={title} items={items} />)
    },
    [seriesMetaById, valueFormatter],
  )

  const echartsSeries = useMemo(
    () =>
      series.map((s, i) => {
        const id = seriesIds[i]
        const hex = resolveHex(seriesColorIndex(s.colorIndex, i))
        return {
          id,
          name: id,
          type: 'bar' as const,
          data: s.data,
          itemStyle: { color: hex, borderRadius: TRAILING_RADIUS },
          label: {
            show: true,
            position: 'right' as const,
            formatter: (params: CallbackDataParams) => valueFormatter(Number(params.value)),
          },
        }
      }),
    [series, seriesIds, valueFormatter],
  )

  const legendSelected = useMemo(
    () => Object.fromEntries(seriesIds.map((id) => [id, !hiddenIds.includes(id)])),
    [seriesIds, hiddenIds],
  )

  const option: EChartsOption = useMemo(
    () => ({
      xAxis: { type: 'value', axisLabel: { formatter: (value: number) => valueFormatter(value) } },
      yAxis: { type: 'category', data: categories },
      grid: { top: 16, right: 56, bottom: 16, left: 16, containLabel: true },
      legend: { show: false, data: seriesIds, selected: legendSelected },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: tooltipFormatter },
      series: echartsSeries,
    }),
    [categories, valueFormatter, seriesIds, legendSelected, tooltipFormatter, echartsSeries],
  )

  const handleChartReady = useCallback(
    (chart: ECharts) => {
      chartRef.current = chart
      chart.on('legendselectchanged', (raw: unknown) => {
        const { selected } = raw as { selected: Record<string, boolean> }
        setHiddenIds(Object.entries(selected).filter(([, isSelected]) => !isSelected).map(([id]) => id))
      })
      onChartReady?.(chart)
    },
    [onChartReady],
  )

  const handleLegendToggle = useCallback((id: string) => {
    chartRef.current?.dispatchAction({ type: 'legendToggleSelect', name: id })
  }, [])

  return (
    <div data-slot="compare-bars" className={cn('flex flex-col gap-2', className)} {...rest}>
      <ChartContainer
        option={option}
        loading={loading}
        height={height}
        renderer={renderer}
        aria-label={ariaLabel}
        onChartReady={handleChartReady}
      />
      {showLegend ? (
        <ChartLegend items={legendItems} hiddenIds={hiddenIds} onToggle={handleLegendToggle} />
      ) : null}
    </div>
  )
}

CompareBars.displayName = 'CompareBars'
