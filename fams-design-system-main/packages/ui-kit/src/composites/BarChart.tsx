import { useCallback, useEffect, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ECharts, EChartsOption, TooltipComponentFormatterCallbackParams } from 'echarts'
import { cn } from '../lib/cn'
import type { BadgeColorIndex } from '../primitives/Badge'
import { ChartContainer } from './ChartContainer'
import { ChartLegend, type ChartLegendItem } from './ChartLegend'
import { ChartTooltip, type ChartTooltipItem } from './ChartTooltip'
import { resolveCssColor, useThemeVersion } from './chart-color'
import type { AreaChartMarkArea } from './AreaChart'
import {
  axisTitleOptions,
  chartGrid,
  foregroundInk,
  resolveChartHex,
  resolveToken,
  seriesColorIndex,
  trackSurface,
  warnOnUnsafePalette,
} from './chart-axis'
import { mirroredAxisOptions, useChartDirection } from './chart-direction'
import { buildSeriesDataTable } from './chart-data-table'

/**
 * BarChart — categorical comparison chart (vertical or horizontal, stacked or
 * grouped), on ECharts. [L3 composite]
 *
 * Owns nothing about the ECharts engine itself — it builds a domain-agnostic
 * `EChartsOption` from `categories`/`series` and renders it through
 * `ChartContainer`, the one place in the system that touches `echarts`
 * directly. Tooltip content is produced by mapping the hover event to
 * `ChartTooltipItem[]` and rendering `ChartTooltip` through it (via
 * `renderToStaticMarkup`, so ECharts' `tooltip.formatter` can stay
 * synchronous) — the same "chart adapter" role documented on `AreaChart`. An
 * optional legend row reuses `ChartLegend`, wired to ECharts' own (visually
 * hidden) legend model via `legendToggleSelect`/`legendselectchanged` so
 * series visibility stays owned by the chart instance, not duplicated state.
 *
 * **Grouped vs. stacked:** ECharts places same-axis bar series side-by-side
 * automatically whenever none of them share a `stack` id — that native
 * behavior *is* "grouped," so no extra layout code is needed for it. Setting
 * `stacked` (or a per-series `stackId`) opts a series into a shared stack
 * group instead.
 *
 * **Orientation:** `'vertical'` (default) puts categories on the x-axis and
 * values on the y-axis (columns); `'horizontal'` swaps the two axis roles
 * (bars). Only the axis `type`/`data` assignment changes — the series list
 * and stacking logic are orientation-agnostic.
 *
 * **Color:** each series' fill comes from its resolved `--color-chart-1..5`
 * swatch, read from the same compiled `@fams/tokens/theme.echarts.json` that
 * `ChartContainer` registers as the chart theme — canvas paint operations
 * cannot resolve CSS `var()` at draw time, so this is the sanctioned bridge
 * from token to renderer, never a literal hex (matches `AreaChart`/`DonutChart`).
 *
 * **Axis titles + track:** `xAxisTitle`/`yAxisTitle` render through the shared
 * `chart-axis` recipe (muted ink, explicit `nameRotate` so a value-axis title
 * reads correctly when the axis mirrors under RTL), and the plot inset grows to
 * reserve their band. `showTrack` paints ECharts' native `showBackground` in a
 * token-derived muted surface — the scale affordance a ranked bar list needs,
 * with no meaning of its own (the bar and its value carry the encoding).
 *
 * **Relief channel:** a `ChartDataTableSpec` twin is built from
 * `categories`/`series` on every render and handed to `ChartContainer`, so the
 * values are readable without seeing the plot. Callers do nothing.
 *
 * **State-agnostic (rule 8):** legend hidden/shown state is read from the
 * live ECharts instance (`legendselectchanged`), not tracked independently —
 * toggling always round-trips through the chart via `dispatchAction`.
 *
 * No business vocabulary: `categories`/`series` are the only inputs — no
 * fetch, no stores, no domain-specific field names.
 */
export interface BarChartSeries {
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
   * status hue). Takes precedence over `colorIndex` for the fill, the legend
   * swatch and the tooltip dot; resolved through `resolveCssColor`, so a live
   * `var(...)` reaches the canvas as a literal.
   */
  color?: string
  /** Stack group id. Series sharing an id are stacked; omit for an independent (grouped, side-by-side) bar. */
  stackId?: string
}

export interface BarChartProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'aria-label'> {
  /** Category values — one per bar/group, placed on the category axis. */
  categories: Array<string | number>
  /** One or more series to render as bars. */
  series: BarChartSeries[]
  /** `'vertical'` (default, columns — categories on the x-axis) or `'horizontal'` (bars — categories on the y-axis). */
  orientation?: 'vertical' | 'horizontal'
  /** Stacks every series lacking its own `stackId` under one shared group. Default `false` (grouped, side-by-side). */
  stacked?: boolean
  /** Shows a toggleable legend row below the chart. Defaults to `true` when more than one series is given. */
  legend?: boolean
  /** Axis title for the rendered x-axis (the value axis when `orientation="horizontal"`). Rendered as the ECharts axis `name` in muted ink. */
  xAxisTitle?: string
  /** Axis title for the rendered y-axis (the category axis when `orientation="horizontal"`). Rotated 90° so it reads correctly in both directions. */
  yAxisTitle?: string
  /** Where the legend row sits relative to the plot. Default `'bottom'`. `'top'` matches a card whose donut/line siblings key above the plot. */
  legendPlacement?: 'top' | 'bottom'
  /** Lower bound of the VALUE axis (the y-axis when vertical, the x-axis when horizontal). Omit to let ECharts fit the data. Pin it to zero-base a scale, or to hold one range across a refilter. */
  valueAxisMin?: number
  /** Upper bound of the VALUE axis. Omit to let ECharts fit the data. Widen it so the tallest bar is not flush with the top gridline. */
  valueAxisMax?: number
  /** Draws a muted full-height track behind every bar (ECharts `showBackground`) — the "how far along the scale is this" affordance a ranked bar list needs. Default `false`. */
  showTrack?: boolean
  /** Renders each bar's formatted value at the bar end. Use whenever the track is meaning-free, so the label — not the fill length against an unlabelled track — carries the reading. Default `false`. */
  showValues?: boolean
  /** Caps a bar's thickness in px, so a sparse series does not paint slabs that dominate the page. Default `40`. */
  maxBarWidth?: number
  /** Message rendered in place of the plot when every series is hidden or there is nothing to draw. */
  emptyText?: ReactNode
  /** Formats numeric values for the value axis and tooltip. Default: `value.toLocaleString()`. */
  valueFormatter?: (value: number) => string
  /** Fixed container height — number is px, any string is used verbatim. Default `320`. */
  height?: number | string
  /** Shows a loading overlay via `ChartContainer`. Default `false`. */
  loading?: boolean
  /** `'canvas'` (default) or `'svg'` — forwarded to `ChartContainer`. */
  renderer?: 'canvas' | 'svg'
  /** Escape hatch invoked once with the live ECharts instance, after this component wires its own legend-sync handler. Forwarded from `ChartContainer`. */
  onChartReady?: (chart: ECharts) => void
  /** Translucent full-height bands overlaid on the plot — see `AreaChart`'s `AreaChartMarkArea`. */
  markAreas?: AreaChartMarkArea[]
  /** Same `dataZoom` mini-chart-brush escape hatch `AreaChart` documents. */
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

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const int = parseInt(value, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const STACK_GROUP = '__bar-chart-stack__'
/** Rounds the far edge of each bar: top corners for vertical columns, the
 *  trailing (value-axis) corners for horizontal bars. CSS-order tuple
 *  (topLeft, topRight, bottomRight, bottomLeft), same as ECharts expects. */
const VERTICAL_RADIUS: [number, number, number, number] = [4, 4, 0, 0]
const HORIZONTAL_RADIUS: [number, number, number, number] = [0, 4, 4, 0]
const DEFAULT_MAX_BAR_WIDTH = 40
/**
 * Half the surface gap between adjacent stacked segments. Painted as a
 * card-coloured border, so each boundary reads as a 2px break: with a
 * four-hue set sitting in the CVD floor band the gap is the required
 * secondary encoding, not a cosmetic nicety (UX verdict V1/V2).
 */
const STACK_GAP_BORDER = 1

const defaultValueFormatter = (value: number): string => value.toLocaleString()

export function BarChart({
  categories,
  series,
  orientation = 'vertical',
  stacked = false,
  legend,
  legendPlacement = 'bottom',
  valueAxisMin,
  valueAxisMax,
  xAxisTitle,
  yAxisTitle,
  showTrack = false,
  showValues = false,
  maxBarWidth = DEFAULT_MAX_BAR_WIDTH,
  emptyText,
  valueFormatter = defaultValueFormatter,
  height = 320,
  loading = false,
  renderer = 'canvas',
  markAreas,
  dataZoom = false,
  zoomStart = 0,
  zoomEnd = 100,
  onZoomChange,
  onChartReady,
  className,
  'aria-label': ariaLabel,
  ...rest
}: BarChartProps) {
  const chartRef = useRef<ECharts | null>(null)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  // `series[].color` is DATA (a blueprint may author `"var(--color-primary)"`);
  // an ECharts canvas cannot resolve a live CSS var, so every override becomes
  // a literal here and re-resolves on a theme/tenant change.
  const themeVersion = useThemeVersion()
  const [rootRef, direction] = useChartDirection<HTMLDivElement>()
  const mirrored = mirroredAxisOptions(direction)

  const seriesIds = useMemo(() => series.map((s, i) => s.id ?? String(i)), [series])
  const showLegend = legend ?? series.length > 1
  const isHorizontal = orientation === 'horizontal'
  const isEmpty = series.length === 0 || categories.length === 0 || hiddenIds.length >= series.length

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
    warnOnUnsafePalette(series.map((s, i) => seriesColorIndex(s.colorIndex, i)), 'BarChart')
  }, [series])

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
            { name: band.label, xAxis: band.start, itemStyle: { color: hexToRgba(resolveCssColor(band.color, fallbackHex), 0.16) } },
            { xAxis: band.end },
          ] as [Record<string, unknown>, Record<string, unknown>],
      ),
    }
  }, [markAreas, themeVersion])

  const echartsSeries = useMemo(() => {
    const radius = isHorizontal ? HORIZONTAL_RADIUS : VERTICAL_RADIUS
    // token-exempt: an ECharts canvas cannot resolve a live CSS var — the
    // stack-gap border is painted in the card's own surface so the break reads
    // as a gap rather than as a stroke.
    const surface = resolveToken('--color-card', '#ffffff')
    return series.map((s, i) => {
      const id = seriesIds[i]
      const hex = seriesHexes[i]
      const isStacked = Boolean(s.stackId ?? (stacked ? STACK_GROUP : undefined))
      return {
        id,
        name: id,
        type: 'bar' as const,
        data: s.data,
        stack: s.stackId ?? (stacked ? STACK_GROUP : undefined),
        barMaxWidth: maxBarWidth,
        showBackground: showTrack,
        backgroundStyle: { color: trackSurface(), borderRadius: radius },
        itemStyle: {
          color: hex,
          borderRadius: radius,
          ...(isStacked ? { borderColor: surface, borderWidth: STACK_GAP_BORDER } : null),
        },
        label: showValues
          ? {
              show: true,
              position: (isHorizontal ? 'right' : 'top') as 'right' | 'top',
              color: foregroundInk(),
              fontSize: 11,
              formatter: (params: { value: unknown }) => valueFormatter(Number(params.value)),
            }
          : { show: false },
        ...(i === 0 && markAreaOption ? { markArea: markAreaOption } : null),
      }
    })
  }, [series, seriesIds, seriesHexes, stacked, isHorizontal, showTrack, showValues, maxBarWidth, valueFormatter, markAreaOption])

  const dataTable = useMemo(
    () => buildSeriesDataTable(ariaLabel, categories, series, valueFormatter),
    [ariaLabel, categories, series, valueFormatter],
  )

  const legendSelected = useMemo(
    () => Object.fromEntries(seriesIds.map((id) => [id, !hiddenIds.includes(id)])),
    [seriesIds, hiddenIds],
  )

  const option: EChartsOption = useMemo(() => {
    // RTL (verdict V12b): the CATEGORY axis reverses so the first category
    // reads first in the inline direction, and the VALUE axis moves to the
    // mirrored edge — which for a horizontal bar chart is also what makes the
    // bars grow from the inline-start edge.
    const categoryAxis = { type: 'category' as const, data: categories, inverse: mirrored.categoryInverse }
    const valueAxis = {
      type: 'value' as const,
      // An authored bound must survive as a bound: ECharts drops `min`/`max`
      // when the key is present with `undefined`, so each is spread in only
      // when the author gave one.
      ...(valueAxisMin === undefined ? null : { min: valueAxisMin }),
      ...(valueAxisMax === undefined ? null : { max: valueAxisMax }),
      axisLabel: { formatter: (value: number) => valueFormatter(value) },
      inverse: isHorizontal && mirrored.categoryInverse,
      position: (isHorizontal ? undefined : mirrored.valueAxisPosition) as 'left' | 'right' | undefined,
    }
    // The y-axis title must clear its own tick labels (bug B) — for a
    // horizontal chart those are the categories, for a vertical one the
    // formatted value ticks, estimated from the series extremes.
    const yLabels = isHorizontal
      ? categories
      : series.flatMap((s) => s.data).length > 0
        ? [valueFormatter(Math.max(...series.flatMap((s) => s.data)))]
        : []
    return {
      xAxis: {
        ...(isHorizontal ? valueAxis : categoryAxis),
        ...axisTitleOptions(xAxisTitle, 'x'),
      },
      yAxis: {
        ...(isHorizontal ? { ...categoryAxis, position: mirrored.valueAxisPosition } : valueAxis),
        ...axisTitleOptions(yAxisTitle, 'y', { labels: yLabels, nameRotate: mirrored.nameRotate }),
      },
      grid: { ...chartGrid({ xAxisTitle, yAxisTitle, yLabels, rtl: mirrored.rtl }), ...(dataZoom ? { bottom: 44 } : null) },
      legend: { show: false, data: seriesIds, selected: legendSelected },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: tooltipFormatter },
      series: echartsSeries,
      ...(dataZoom
        ? {
            dataZoom: [
              { type: 'inside' as const, start: zoomStart, end: zoomEnd },
              { type: 'slider' as const, show: true, showDataShadow: true, start: zoomStart, end: zoomEnd, height: 32, bottom: 4 },
            ],
          }
        : null),
    }
  }, [
    categories,
    series,
    isHorizontal,
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

  // Optimistic, THEN round-trip: while the chart is in its empty state the
  // ECharts instance holds a blank option with no legend model, so a
  // `dispatchAction` alone could never bring the last series back.
  const handleLegendToggle = useCallback((id: string) => {
    setHiddenIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
    chartRef.current?.dispatchAction({ type: 'legendToggleSelect', name: id })
  }, [])

  const legendNode = showLegend ? (
    <ChartLegend items={legendItems} hiddenIds={hiddenIds} onToggle={handleLegendToggle} />
  ) : null

  return (
    <div ref={rootRef} data-slot="bar-chart" className={cn('flex flex-col gap-2', className)} {...rest}>
      {legendPlacement === 'top' ? legendNode : null}
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
      {legendPlacement === 'top' ? null : legendNode}
    </div>
  )
}

BarChart.displayName = 'BarChart'
