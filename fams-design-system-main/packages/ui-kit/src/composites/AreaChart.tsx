import { useCallback, useEffect, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ECharts, EChartsOption, TooltipComponentFormatterCallbackParams } from 'echarts'
import { cn } from '../lib/cn'
import type { BadgeColorIndex } from '../primitives/Badge'
import { ChartContainer } from './ChartContainer'
import { ChartLegend, type ChartLegendItem } from './ChartLegend'
import { ChartTooltip, type ChartTooltipItem } from './ChartTooltip'
import { axisTitleOptions, chartGrid, resolveChartHex, resolveToken, seriesColorIndex, warnOnUnsafePalette } from './chart-axis'
import { resolveCssColor, useThemeVersion } from './chart-color'
import { mirroredAxisOptions, useChartDirection } from './chart-direction'
import { buildSeriesDataTable } from './chart-data-table'

/**
 * AreaChart — time-series area chart (single or stacked), gradient-filled, on ECharts. [L3 composite]
 *
 * Owns nothing about the ECharts engine itself — it builds a domain-agnostic
 * `EChartsOption` from `categories`/`series` and renders it through
 * `ChartContainer`, the one place in the system that touches `echarts`
 * directly. Tooltip content is produced by mapping the hover event to
 * `ChartTooltipItem[]` and rendering `ChartTooltip` through it (via
 * `renderToStaticMarkup`, so ECharts' `tooltip.formatter` can stay
 * synchronous) — exactly the "chart adapter" role `ChartTooltip`'s own
 * doc describes. An optional legend row reuses `ChartLegend`, wired to
 * ECharts' own (visually hidden) legend model via `legendToggleSelect`/
 * `legendselectchanged` so series visibility stays owned by the chart
 * instance, not duplicated state.
 *
 * **Gradient fill:** each series' area fades from its resolved
 * `--color-chart-1..5` swatch (35% alpha) to transparent — sourced from
 * `@fams/tokens/theme.echarts.json`, the same compiled-token file
 * `ChartContainer` registers as the chart theme, never a literal hex.
 * Canvas-rendered charts cannot resolve CSS `var()` at paint time, which is
 * why the resolved token values (not the CSS custom properties) are read
 * here — the same constraint `ChartContainer`'s registered theme already
 * works within.
 *
 * **State-agnostic (rule 8):** legend hidden/shown state is read from the
 * live ECharts instance (`legendselectchanged`), not tracked independently —
 * toggling always round-trips through the chart via `dispatchAction`, so the
 * chart instance stays the single source of truth.
 *
 * No business vocabulary: `categories`/`series` are the only inputs — no
 * fetch, no stores, no domain-specific field names.
 */
export interface AreaChartSeries {
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
   * `StatusPill.color` documents (a tenant/blueprint value with no matching
   * `--color-chart-*` token yet). Takes precedence over `colorIndex` for the
   * line/fill paint when given; the legend/tooltip swatch still reflects
   * `colorIndex` (or its index default), same tradeoff `StatusPill`'s own
   * escape hatch accepts.
   */
  color?: string
  /** Stack group id. Series sharing an id are stacked; omit for an independent (overlapping) area. */
  stackId?: string
}

/**
 * One translucent, full-height vertical band overlaid on the plot (e.g. an
 * "Overspeeding"/"Idling" event span on a replay timeline) — an ECharts
 * `markArea` on the first series, `silent` (no hover/tooltip of its own) so
 * it never competes with the real series' tooltip. `start`/`end` are
 * category-axis values (the same strings/numbers passed in `categories`);
 * omitting a y-bound on the underlying markArea data point is what makes
 * ECharts fill the full plot height automatically.
 */
export interface AreaChartMarkArea {
  id?: string
  start: string | number
  end: string | number
  /**
   * Authored solid color for the band tint — the same `var(--token)`/hex/
   * named-color escape hatch `AreaChartSeries.color` documents, resolved
   * through `resolveCssColor` and painted at a fixed low alpha (never a live
   * `var()`, which a canvas cannot read at paint time). Default a muted
   * warning tint.
   */
  color?: string
  label?: string
}

export interface AreaChartProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'aria-label'> {
  /** X-axis category values (e.g. dates, labels) — one per data point. */
  categories: Array<string | number>
  /** One or more series to render as filled areas. */
  series: AreaChartSeries[]
  /** Stacks every series lacking its own `stackId` under one shared group. Default `false`. */
  stacked?: boolean
  /** Smooths the line/area curve. Default `true`. */
  smooth?: boolean
  /** Shows a toggleable legend row below the chart. Defaults to `true` when more than one series is given. */
  legend?: boolean
  /** Lower bound of the value (y) axis. Omit to let ECharts fit the data; pin it to zero-base a scale. */
  valueAxisMin?: number
  /** Upper bound of the value (y) axis. Omit to let ECharts fit the data. */
  valueAxisMax?: number
  /** X-axis title, rendered as the ECharts axis `name` in muted ink. */
  xAxisTitle?: string
  /** Y-axis title, rotated 90° so it reads correctly in both directions. */
  yAxisTitle?: string
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
  /** Translucent full-height bands overlaid on the plot — see `AreaChartMarkArea`. */
  markAreas?: AreaChartMarkArea[]
  /**
   * Turns the chart into its own mini-chart brush: an ECharts `dataZoom`
   * slider (with `showDataShadow`) rendered below the plot — a small
   * area-chart-shaped strip of the full series with a draggable window and
   * the axis' own category labels, rather than a plain scrollbar. Pair with
   * `zoomStart`/`zoomEnd`/`onZoomChange` to keep the window controlled (e.g.
   * synced with external zoom in/out buttons).
   */
  dataZoom?: boolean
  /** Controlled brush window start, percent 0–100. Default `0`. */
  zoomStart?: number
  /** Controlled brush window end, percent 0–100. Default `100`. */
  zoomEnd?: number
  /** Fires on every drag/pan of the `dataZoom` brush, percent 0–100 each. */
  onZoomChange?: (start: number, end: number) => void
  /** Required accessible description of what the chart shows. */
  'aria-label': string
}

/** `#rrggbb` (from the compiled token palette, never a literal here) → `rgba(...)` for gradient stops. */
function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const int = parseInt(value, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const defaultValueFormatter = (value: number): string => value.toLocaleString()

export function AreaChart({
  categories,
  series,
  stacked = false,
  smooth = true,
  legend,
  valueAxisMin,
  valueAxisMax,
  xAxisTitle,
  yAxisTitle,
  valueFormatter = defaultValueFormatter,
  height = 320,
  loading = false,
  renderer = 'canvas',
  emptyText,
  markAreas,
  dataZoom = false,
  zoomStart = 0,
  zoomEnd = 100,
  onZoomChange,
  onChartReady,
  className,
  'aria-label': ariaLabel,
  ...rest
}: AreaChartProps) {
  const chartRef = useRef<ECharts | null>(null)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  // `series[].color` is DATA (a blueprint may author `"var(--color-primary)"`);
  // an ECharts canvas cannot resolve a live CSS var, so every override becomes
  // a literal here and re-resolves on a theme/tenant change.
  const themeVersion = useThemeVersion()
  const [rootRef, direction] = useChartDirection<HTMLDivElement>()
  const mirrored = mirroredAxisOptions(direction)
  const isEmpty = series.length === 0 || categories.length === 0 || hiddenIds.length >= series.length

  const seriesIds = useMemo(() => series.map((s, i) => s.id ?? String(i)), [series])
  const showLegend = legend ?? series.length > 1

  /** One resolved fill per series — the single place `color` beats `colorIndex`. */
  const seriesHexes = useMemo(() => {
    void themeVersion
    return series.map((s, i) => resolveCssColor(s.color, resolveChartHex(seriesColorIndex(s.colorIndex, i))))
  }, [series, themeVersion])

  const legendItems: ChartLegendItem[] = useMemo(
    () =>
      series.map((s, i) => ({
        id: seriesIds[i],
        label: s.label,
        colorIndex: seriesColorIndex(s.colorIndex, i),
        color: s.color ? seriesHexes[i] : undefined,
      })),
    [series, seriesIds, seriesHexes],
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
          },
        ]),
      ),
    [series, seriesIds, seriesHexes],
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
          color: meta?.color,
        }
      })
      const title = list[0]?.name
      return renderToStaticMarkup(<ChartTooltip title={title} items={items} />)
    },
    [seriesMetaById, valueFormatter],
  )

  useEffect(() => {
    warnOnUnsafePalette(series.map((s, i) => seriesColorIndex(s.colorIndex, i)), 'AreaChart')
  }, [series])

  const dataTable = useMemo(
    () => buildSeriesDataTable(ariaLabel, categories, series, valueFormatter),
    [ariaLabel, categories, series, valueFormatter],
  )

  const markAreaOption = useMemo(() => {
    void themeVersion
    if (!markAreas?.length) return undefined
    const fallbackHex = resolveToken('--color-warning', '#f59e0b')
    return {
      silent: true,
      itemStyle: { opacity: 1 },
      label: { show: false },
      data: markAreas.map(
        (band) =>
          [
            {
              name: band.label,
              xAxis: band.start,
              itemStyle: { color: hexToRgba(resolveCssColor(band.color, fallbackHex), 0.16) },
            },
            { xAxis: band.end },
          ] as [Record<string, unknown>, Record<string, unknown>],
      ),
    }
  }, [markAreas, themeVersion])

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
          smooth,
          // See LineChart: monotone smoothing cannot overshoot the observed range.
          smoothMonotone: smooth ? ('x' as const) : undefined,
          symbol: 'none' as const,
          stack: s.stackId ?? (stacked ? '__area-chart-stack__' : undefined),
          lineStyle: { width: 2, color: hex },
          itemStyle: { color: hex },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: hexToRgba(hex, 0.35) },
                { offset: 1, color: hexToRgba(hex, 0) },
              ],
            },
          },
          ...(i === 0 && markAreaOption ? { markArea: markAreaOption } : null),
        }
      }),
    [series, seriesIds, seriesHexes, smooth, stacked, markAreaOption],
  )

  const legendSelected = useMemo(
    () => Object.fromEntries(seriesIds.map((id) => [id, !hiddenIds.includes(id)])),
    [seriesIds, hiddenIds],
  )

  const option: EChartsOption = useMemo(() => {
    const values = series.flatMap((s) => s.data)
    const yLabels = values.length > 0 ? [valueFormatter(Math.max(...values))] : []
    return {
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: categories,
        inverse: mirrored.categoryInverse,
        ...axisTitleOptions(xAxisTitle, 'x'),
      },
      yAxis: {
        type: 'value',
        // Spread in only when authored: ECharts drops a `min`/`max` key whose
        // value is `undefined`, so an explicit `undefined` is not a no-op.
        ...(valueAxisMin === undefined ? null : { min: valueAxisMin }),
        ...(valueAxisMax === undefined ? null : { max: valueAxisMax }),
        axisLabel: { formatter: (value: number) => valueFormatter(value) },
        position: mirrored.valueAxisPosition,
        ...axisTitleOptions(yAxisTitle, 'y', { labels: yLabels, nameRotate: mirrored.nameRotate }),
      },
      grid: { ...chartGrid({ xAxisTitle, yAxisTitle, yLabels, rtl: mirrored.rtl }), ...(dataZoom ? { bottom: 44 } : null) },
      legend: { show: false, data: seriesIds, selected: legendSelected },
      tooltip: { trigger: 'axis', formatter: tooltipFormatter },
      series: echartsSeries,
      ...(dataZoom
        ? {
            dataZoom: [
              { type: 'inside' as const, start: zoomStart, end: zoomEnd },
              {
                type: 'slider' as const,
                show: true,
                showDataShadow: true,
                start: zoomStart,
                end: zoomEnd,
                height: 32,
                bottom: 4,
                labelFormatter: (_value: number, valueStr: string) => valueStr,
              },
            ],
          }
        : null),
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
    valueAxisMin,
    valueAxisMax,
    mirrored,
    dataZoom,
    zoomStart,
    zoomEnd,
  ])

  const handleChartReady = useCallback(
    (chart: ECharts) => {
      chartRef.current = chart
      chart.on('legendselectchanged', (raw: unknown) => {
        const { selected } = raw as { selected: Record<string, boolean> }
        setHiddenIds(Object.entries(selected).filter(([, isSelected]) => !isSelected).map(([id]) => id))
      })
      chart.on('datazoom', (raw: unknown) => {
        const event = raw as { batch?: Array<{ start?: number; end?: number }>; start?: number; end?: number }
        const first = event.batch?.[0] ?? event
        if (first?.start != null && first?.end != null) onZoomChange?.(first.start, first.end)
      })
      onChartReady?.(chart)
    },
    [onChartReady, onZoomChange],
  )

  // Optimistic, THEN round-trip — see BarChart.
  const handleLegendToggle = useCallback((id: string) => {
    setHiddenIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
    chartRef.current?.dispatchAction({ type: 'legendToggleSelect', name: id })
  }, [])

  return (
    <div ref={rootRef} data-slot="area-chart" className={cn('flex flex-col gap-2', className)} {...rest}>
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
      {showLegend ? (
        <ChartLegend items={legendItems} hiddenIds={hiddenIds} onToggle={handleLegendToggle} />
      ) : null}
    </div>
  )
}

AreaChart.displayName = 'AreaChart'
