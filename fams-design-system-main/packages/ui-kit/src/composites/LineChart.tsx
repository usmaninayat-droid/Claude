import { useCallback, useEffect, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ECharts, EChartsOption, TooltipComponentFormatterCallbackParams } from 'echarts'
import { cn } from '../lib/cn'
import type { BadgeColorIndex } from '../primitives/Badge'
import { ChartContainer } from './ChartContainer'
import { ChartLegend, type ChartLegendItem } from './ChartLegend'
import { ChartTooltip, type ChartTooltipItem } from './ChartTooltip'
import { axisTitleOptions, chartGrid, resolveChartHex, seriesColorIndex, warnOnUnsafePalette } from './chart-axis'
import { resolveCssColor, useThemeVersion } from './chart-color'
import { mirroredAxisOptions, useChartDirection } from './chart-direction'
import { buildSeriesDataTable } from './chart-data-table'

/**
 * LineChart — time-series line chart (single or multi-series), on ECharts. [L3 composite]
 *
 * Owns nothing about the ECharts engine itself — it builds a domain-agnostic
 * `EChartsOption` from `categories`/`series` and renders it through
 * `ChartContainer`, the one place in the system that touches `echarts`
 * directly. Tooltip content is produced by mapping the hover event to
 * `ChartTooltipItem[]` and rendering `ChartTooltip` through it (via
 * `renderToStaticMarkup`, so ECharts' `tooltip.formatter` can stay
 * synchronous) — the same "chart adapter" role documented on `AreaChart`/
 * `BarChart`. An optional legend row reuses `ChartLegend`, wired to ECharts'
 * own (visually hidden) legend model via `legendToggleSelect`/
 * `legendselectchanged` so series visibility stays owned by the chart
 * instance, not duplicated state.
 *
 * **Relationship to `AreaChart`:** same category-axis time-series shape, but
 * unfilled — no `areaStyle`/gradient. Use `LineChart` when the values
 * themselves (not cumulative volume) are the story, or when overlapping
 * series would be obscured by fills.
 *
 * **Markers:** `markers` (default `false`) toggles per-point symbols on top
 * of the line — useful for sparse series where individual readings matter;
 * left off by default to keep dense time-series legible.
 *
 * **Color:** each series' stroke comes from its resolved `--color-chart-1..5`
 * swatch, read from the same compiled `@fams/tokens/theme.echarts.json` that
 * `ChartContainer` registers as the chart theme — canvas paint operations
 * cannot resolve CSS `var()` at draw time, so this is the sanctioned bridge
 * from token to renderer, never a literal hex (matches `AreaChart`/`BarChart`).
 *
 * **Dual value axis — a contained exception, not a pattern.** A second y-scale
 * invents a correlation the data does not contain: the alignment of the two
 * scales is arbitrary, so the crossing point is a rendering artefact. Use
 * `series[].axis = 'trailing'` ONLY when a design mandates it; prefer two
 * charts, or one chart with both series indexed to a common base. When any
 * series opts in, this component compensates for the ambiguity by force-showing
 * the legend ABOVE the plot with each item naming its series *and* its axis,
 * and by putting each series' `unit` in the tooltip.
 *
 * The axes are named `'leading'`/`'trailing'`, never left/right: which physical
 * side each lands on flips under `dir="rtl"`, so a left/right vocabulary would
 * be wrong in Arabic — the same reason the rest of the system uses logical
 * properties.
 *
 * **Relief channel:** a `ChartDataTableSpec` twin (units included) is built
 * from `categories`/`series` and handed to `ChartContainer`. Callers do nothing.
 *
 * **State-agnostic (rule 8):** legend hidden/shown state is read from the
 * live ECharts instance (`legendselectchanged`), not tracked independently —
 * toggling always round-trips through the chart via `dispatchAction`.
 *
 * No business vocabulary: `categories`/`series` are the only inputs — no
 * fetch, no stores, no domain-specific field names.
 */
export interface LineChartSeries {
  /** Stable id — falls back to the series' index. Drives legend toggling and ECharts series identity. */
  id?: string
  /** Series label — shown in the legend and tooltip. */
  label: string
  /** Numeric values, aligned 1:1 with `categories`. */
  data: number[]
  /** Categorical swatch — cycles through the `--color-chart-1..5` palette by series index when omitted. */
  colorIndex?: BadgeColorIndex
  /**
   * Raw color override — the same blueprint-driven escape hatch
   * `AreaChartSeries.color`/`StatusPill.color` document (a series a blueprint
   * bound to a NON-categorical token: `"var(--color-primary)"`, a semantic
   * status hue). Takes precedence over `colorIndex` for the stroke, the legend
   * swatch and the tooltip dot; resolved through `resolveCssColor`.
   */
  color?: string
  /** Renders this series' line dashed instead of solid — useful for forecast/target overlays. Default `false`. */
  dashed?: boolean
  /** Which value axis this series is measured against. `'leading'` (default) is the single shared scale; `'trailing'` opts into a SECOND scale on the mirrored edge — see the dual-axis note in the module doc before using it. */
  axis?: 'leading' | 'trailing'
  /** Unit suffix for this series, shown in the tooltip and the data-table twin (e.g. `'L'`, `'km'`). Required in practice whenever `axis` is used — two scales are unreadable without units. */
  unit?: string
}

export interface LineChartProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'aria-label'> {
  /** X-axis category values (e.g. dates, labels) — one per data point. */
  categories: Array<string | number>
  /** One or more series to render as lines. */
  series: LineChartSeries[]
  /** Smooths the line curve. Default `true`. */
  smooth?: boolean
  /** Shows a symbol at every data point. Default `false` (bare line). */
  markers?: boolean
  /** Shows a toggleable legend row below the chart. Defaults to `true` when more than one series is given, and is forced on (above the plot) whenever a trailing axis is in use. */
  legend?: boolean
  /** Where the legend row sits relative to the plot. Default `'bottom'`. A dual-axis chart always forces `'top'` — the legend is the reader's only key to which axis a line belongs to. */
  legendPlacement?: 'top' | 'bottom'
  /** Lower bound of the LEADING value axis. Omit to let ECharts fit the data. */
  yAxisMin?: number
  /** Upper bound of the LEADING value axis. Omit to let ECharts fit the data. */
  yAxisMax?: number
  /** Lower bound of the TRAILING value axis. Zero-base both scales rather than letting two independent fits pin unrelated traces together (verdict V4). */
  yAxisTrailingMin?: number
  /** Upper bound of the TRAILING value axis. */
  yAxisTrailingMax?: number
  /** X-axis title, rendered as the ECharts axis `name` in muted ink. */
  xAxisTitle?: string
  /** Leading (primary) value-axis title, rotated 90° so it reads correctly in both directions. */
  yAxisTitle?: string
  /** Trailing (secondary) value-axis title. Only rendered when at least one series sets `axis: 'trailing'`. */
  yAxisTitleTrailing?: string
  /** Formats numeric values for the y-axis and tooltip. Default: `value.toLocaleString()`. */
  valueFormatter?: (value: number) => string
  /** Fixed container height — number is px, any string is used verbatim. Default `320`. */
  height?: number | string
  /** Shows a loading overlay via `ChartContainer`. Default `false`. */
  loading?: boolean
  /** `'canvas'` (default) or `'svg'` — forwarded to `ChartContainer`. */
  renderer?: 'canvas' | 'svg'
  /** Escape hatch invoked once with the live ECharts instance, after this component wires its own legend-sync handler. Forwarded from `ChartContainer`. */
  onChartReady?: (chart: ECharts) => void
  /** Message rendered in place of the plot when every series is hidden or there is nothing to draw. */
  emptyText?: ReactNode
  /** Required accessible description of what the chart shows. */
  'aria-label': string
}

const MARKER_SIZE = 6
const AXIS_WORDING: Record<'leading' | 'trailing', string> = {
  leading: 'leading axis',
  trailing: 'trailing axis',
}

const defaultValueFormatter = (value: number): string => value.toLocaleString()

export function LineChart({
  categories,
  series,
  smooth = true,
  markers = false,
  legend,
  legendPlacement = 'bottom',
  yAxisMin,
  yAxisMax,
  yAxisTrailingMin,
  yAxisTrailingMax,
  xAxisTitle,
  yAxisTitle,
  yAxisTitleTrailing,
  emptyText,
  valueFormatter = defaultValueFormatter,
  height = 320,
  loading = false,
  renderer = 'canvas',
  onChartReady,
  className,
  'aria-label': ariaLabel,
  ...rest
}: LineChartProps) {
  const chartRef = useRef<ECharts | null>(null)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  // `series[].color` is DATA — an ECharts canvas cannot resolve a live CSS
  // var, so every override becomes a literal here and re-resolves on a
  // theme/tenant change.
  const themeVersion = useThemeVersion()
  const [rootRef, direction] = useChartDirection<HTMLDivElement>()
  const mirrored = mirroredAxisOptions(direction)
  const isEmpty = series.length === 0 || categories.length === 0 || hiddenIds.length >= series.length

  const seriesIds = useMemo(() => series.map((s, i) => s.id ?? String(i)), [series])
  /** Dual scale in play — drives the forced, axis-naming legend above the plot. */
  const dualAxis = series.some((s) => s.axis === 'trailing')
  const showLegend = dualAxis || (legend ?? series.length > 1)

  useEffect(() => {
    warnOnUnsafePalette(series.map((s, i) => seriesColorIndex(s.colorIndex, i)), 'LineChart')
  }, [series])

  /** One resolved stroke per series — the single place `color` beats `colorIndex`. */
  const seriesHexes = useMemo(() => {
    void themeVersion
    return series.map((s, i) => resolveCssColor(s.color, resolveChartHex(seriesColorIndex(s.colorIndex, i))))
  }, [series, themeVersion])

  const legendItems: ChartLegendItem[] = useMemo(
    () =>
      series.map((s, i) => ({
        id: seriesIds[i],
        // With two scales the series label alone is ambiguous — which number
        // it belongs to is exactly what the reader cannot infer from the plot.
        label: dualAxis ? `${s.label} · ${AXIS_WORDING[s.axis ?? 'leading']}` : s.label,
        colorIndex: seriesColorIndex(s.colorIndex, i),
        color: s.color ? seriesHexes[i] : undefined,
      })),
    [series, seriesIds, seriesHexes, dualAxis],
  )

  const seriesMetaById = useMemo(
    () =>
      Object.fromEntries(
        series.map((s, i) => [
          seriesIds[i],
          {
            label: s.label,
            colorIndex: seriesColorIndex(s.colorIndex, i),
            color: s.color ? seriesHexes[i] : undefined,
            unit: s.unit,
          },
        ]),
      ),
    [series, seriesIds, seriesHexes],
  )

  const dataTable = useMemo(
    () => buildSeriesDataTable(ariaLabel, categories, series, valueFormatter),
    [ariaLabel, categories, series, valueFormatter],
  )

  const tooltipFormatter = useCallback(
    (raw: TooltipComponentFormatterCallbackParams): string => {
      const list = Array.isArray(raw) ? raw : [raw]
      const items: ChartTooltipItem[] = list.map((param) => {
        const meta = seriesMetaById[param.seriesId ?? '']
        const formatted = valueFormatter(Number(param.value))
        return {
          label: meta?.label ?? param.seriesName ?? '',
          value: meta?.unit ? `${formatted} ${meta.unit}` : formatted,
          colorIndex: meta?.colorIndex,
          color: meta?.color,
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
        const hex = seriesHexes[i]
        return {
          id,
          name: id,
          type: 'line' as const,
          data: s.data,
          yAxisIndex: s.axis === 'trailing' ? 1 : 0,
          smooth,
          // Monotone smoothing: a plain spline overshoots its own observations
          // between points (a daily series dipping below its own minimum),
          // which invents readings the data never contains.
          smoothMonotone: smooth ? ('x' as const) : undefined,
          symbol: markers ? ('circle' as const) : ('none' as const),
          symbolSize: MARKER_SIZE,
          lineStyle: { width: 2, color: hex, type: s.dashed ? ('dashed' as const) : ('solid' as const) },
          itemStyle: { color: hex },
        }
      }),
    [series, seriesIds, seriesHexes, smooth, markers],
  )

  const legendSelected = useMemo(
    () => Object.fromEntries(seriesIds.map((id) => [id, !hiddenIds.includes(id)])),
    [seriesIds, hiddenIds],
  )

  const option: EChartsOption = useMemo(() => {
    const valueAxis = { type: 'value' as const, axisLabel: { formatter: (value: number) => valueFormatter(value) } }
    // RTL (V12b): the leading value axis moves to the mirrored edge, the
    // trailing one takes the edge it vacated, and the category axis reverses.
    const values = series.flatMap((s) => s.data)
    const yLabels = values.length > 0 ? [valueFormatter(Math.max(...values))] : []
    const leadingAxis = {
      ...valueAxis,
      // Spread in only when authored: ECharts drops a `min`/`max` key whose
      // value is `undefined`, so an explicit `undefined` is not a no-op.
      ...(yAxisMin === undefined ? null : { min: yAxisMin }),
      ...(yAxisMax === undefined ? null : { max: yAxisMax }),
      position: mirrored.valueAxisPosition,
      ...axisTitleOptions(yAxisTitle, 'y', { labels: yLabels, nameRotate: mirrored.nameRotate }),
    }
    const trailingAxis = {
      ...valueAxis,
      ...(yAxisTrailingMin === undefined ? null : { min: yAxisTrailingMin }),
      ...(yAxisTrailingMax === undefined ? null : { max: yAxisTrailingMax }),
      position: (mirrored.rtl ? 'left' : 'right') as 'left' | 'right',
      ...axisTitleOptions(yAxisTitleTrailing, 'y', { labels: yLabels, nameRotate: mirrored.nameRotate }),
      splitLine: { show: false },
    }
    return {
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: categories,
        inverse: mirrored.categoryInverse,
        ...axisTitleOptions(xAxisTitle, 'x'),
      },
      yAxis: dualAxis ? [leadingAxis, trailingAxis] : leadingAxis,
      grid: chartGrid({
        xAxisTitle,
        yAxisTitle,
        yAxisTitleTrailing: dualAxis ? yAxisTitleTrailing : undefined,
        yLabels,
        rtl: mirrored.rtl,
      }),
      legend: { show: false, data: seriesIds, selected: legendSelected },
      tooltip: { trigger: 'axis', formatter: tooltipFormatter },
      series: echartsSeries,
    }
  }, [
    categories,
    series,
    valueFormatter,
    seriesIds,
    legendSelected,
    tooltipFormatter,
    echartsSeries,
    xAxisTitle,
    yAxisTitle,
    yAxisTitleTrailing,
    yAxisMin,
    yAxisMax,
    yAxisTrailingMin,
    yAxisTrailingMax,
    dualAxis,
    mirrored,
  ])

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

  // Optimistic, THEN round-trip — see BarChart: the empty state clears the
  // ECharts legend model, so a dispatch alone could not restore the last series.
  const handleLegendToggle = useCallback((id: string) => {
    setHiddenIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
    chartRef.current?.dispatchAction({ type: 'legendToggleSelect', name: id })
  }, [])

  // With two scales the legend is the reader's only key to which axis a line
  // belongs to, so a dual-axis chart pins it above the plot regardless of the
  // authored placement.
  const legendOnTop = dualAxis || legendPlacement === 'top'
  const legendNode = showLegend ? (
    <ChartLegend items={legendItems} hiddenIds={hiddenIds} onToggle={handleLegendToggle} />
  ) : null

  return (
    <div ref={rootRef} data-slot="line-chart" className={cn('flex flex-col gap-2', className)} {...rest}>
      {legendOnTop ? legendNode : null}
      <ChartContainer
        option={option}
        loading={loading}
        height={height}
        renderer={renderer}
        aria-label={ariaLabel}
        dataTable={dataTable}
        isEmpty={isEmpty}
        emptyText={emptyText}
        onChartReady={handleChartReady}
      />
      {legendOnTop ? null : legendNode}
    </div>
  )
}

LineChart.displayName = 'LineChart'
