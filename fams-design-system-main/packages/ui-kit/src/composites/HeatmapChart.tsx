import { useCallback, useMemo, type HTMLAttributes, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ECharts, EChartsOption, TooltipComponentFormatterCallbackParams } from 'echarts'
import chartTheme from '@fams/tokens/theme.echarts.json'
import { cn } from '../lib/cn'
import { ChartContainer } from './ChartContainer'
import { ChartTooltip, type ChartTooltipItem } from './ChartTooltip'
import { axisTitleOptions, chartGrid, foregroundInk, resolveToken, trackSurface } from './chart-axis'
import { mirroredAxisOptions, useChartDirection } from './chart-direction'
import { resolveCssColor, useThemeVersion } from './chart-color'
import { buildMatrixDataTable } from './chart-data-table'
import { buildBinPieces, fillMissingCells, noDataValueFor, NO_DATA_GLYPH, type HeatmapChartBin } from './heatmap-bins'

export type { HeatmapChartBin } from './heatmap-bins'

/**
 * HeatmapChart — matrix/calendar-style intensity grid on ECharts. [L3 composite]
 *
 * Owns nothing about the ECharts engine itself — it builds a domain-agnostic
 * `EChartsOption` from `xCategories`/`yCategories`/`cells` and renders it
 * through `ChartContainer`, the one place in the system that touches
 * `echarts` directly. Tooltip content is produced by mapping the hover event
 * to a `ChartTooltipItem[]` and rendering `ChartTooltip` through it (via
 * `renderToStaticMarkup`, so ECharts' `tooltip.formatter` can stay
 * synchronous) — the same "chart adapter" role documented on
 * `BarChart`/`AreaChart`.
 *
 * **Color scale:** cell intensity comes from ECharts' native `visualMap`
 * component (continuous), not `ChartLegend` — a continuous gradient has no
 * discrete series to toggle, so there is nothing for `ChartLegend`'s
 * toggle-button model to mirror. The gradient stops are the pre-resolved
 * `heat.sequential`/`heat.cool` ramps from the same compiled
 * `@fams/tokens/theme.echarts.json` that `ChartContainer` registers as the
 * chart theme — canvas paint operations cannot resolve CSS `var()` at draw
 * time, so this is the sanctioned bridge from token to renderer, never a
 * literal hex (matches `BarChart`/`AreaChart`/`DonutChart`). `legend={false}`
 * hides the on-canvas color-bar widget while the mapping itself stays active,
 * mirroring how `BarChart`/`AreaChart` hide ECharts' native `legend` component
 * without disabling series visibility.
 *
 * **Discrete bins:** `bins` swaps the continuous ramp for a `piecewise`
 * visualMap whose every class states its numeric range in text. One entry may
 * set `noData: true`; unmeasured coordinates are then painted with it *and*
 * glyphed, and the data-table twin names them — so "unmeasured" is never
 * distinguishable by colour alone.
 *
 * **Row order:** `yCategories` is documented top-to-bottom; ECharts' category
 * axis defaults to bottom-to-top, so the y-axis is rendered `inverse` to match.
 *
 * **Sparse data:** `cells` need not cover every `(x, y)` pair — coordinates
 * with no matching cell are left unpainted rather than forced to a `0` value,
 * so "no data" stays visually distinct from "measured zero".
 *
 * No business vocabulary: `xCategories`/`yCategories`/`cells` are the only
 * inputs — no fetch, no stores, no domain-specific field names.
 */
/**
 * One label spanning several consecutive columns of the x-axis — the outer
 * tier of a two-tier axis (16 weekly columns reading under four month labels).
 *
 * Stated as a run length rather than as a per-column label so the grouping is
 * declarative and the renderer can place each label at its own run's CENTRE
 * without the caller doing index arithmetic. Runs are consumed in order from
 * the first column; a total `span` shorter than `xCategories` simply leaves
 * the tail ungrouped, and a longer one is clipped.
 */
export interface HeatmapChartGroup {
  label: string
  /** How many consecutive `xCategories` columns this label covers. Must be ≥ 1. */
  span: number
}

export interface HeatmapChartCell {
  /** Column coordinate — matched against `xCategories` by string equality. */
  x: string | number
  /** Row coordinate — matched against `yCategories` by string equality. */
  y: string | number
  /** Numeric intensity driving the cell's color. */
  value: number
}

export interface HeatmapChartProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'aria-label'> {
  /** Column categories, left to right. */
  xCategories: Array<string | number>
  /** Row categories, top to bottom. */
  yCategories: Array<string | number>
  /** Sparse cell list — an `(x, y)` pair with no matching cell renders unpainted. */
  cells: HeatmapChartCell[]
  /** Lower bound of the color scale. Default `0`. */
  min?: number
  /** Upper bound of the color scale. Default: the highest value in `cells` (or `1` when empty). */
  max?: number
  /** Color ramp sourced from tokens — `'sequential'` (warm, default) or `'cool'` (blue). Ignored when `bins` is given. */
  colorScale?: 'sequential' | 'cool'
  /** Switches the continuous ramp for a DISCRETE binned scale (ECharts `piecewise` visualMap). Past ~7 bins adjacent classes blur, so keep the list short; include one `noData: true` entry to give unmeasured coordinates a named, glyphed treatment. */
  bins?: HeatmapChartBin[]
  /**
   * Outer tier of the x-axis — group labels drawn UNDER the column labels, each
   * centred on its own run of columns. Use it when the columns are a fine
   * period (weeks) that reads as a coarser one (months): sixteen `Jan W1 …
   * Apr W4` ticks are unreadable, `W1 W2 W3 W4` under `Jan` is not. Omit for a
   * single-tier axis.
   */
  xGroups?: HeatmapChartGroup[]
  /**
   * Display labels for the column axis, parallel to `xCategories`. Omit to
   * label each column with its own category value.
   *
   * WHY IT EXISTS: `xCategories` are IDENTIFIERS — `cells[].x` is matched
   * against them by string equality, so they must stay unique. A two-tier axis
   * wants the opposite of unique: sixteen weekly columns read as `W1 W2 W3 W4`
   * repeated under four month labels. This is the one seam that lets the ids
   * stay unique while the ticks repeat.
   */
  xTickLabels?: Array<string | number>
  /** X-axis title, rendered as the ECharts axis `name` in muted ink. */
  xAxisTitle?: string
  /** Y-axis title, rotated 90° so it reads correctly in both directions. */
  yAxisTitle?: string
  /** Renders each cell's formatted value as an on-cell label. Default `false`. */
  showValues?: boolean
  /** Shows the continuous color-scale bar below the grid. Default `true`. */
  legend?: boolean
  /** Formats numeric values for cell labels, the color-scale bar, and the tooltip. Default: `value.toLocaleString()`. */
  valueFormatter?: (value: number) => string
  /** Fixed container height — number is px, any string is used verbatim. Default `320`. */
  height?: number | string
  /** Shows a loading overlay via `ChartContainer`. Default `false`. */
  loading?: boolean
  /** `'canvas'` (default) or `'svg'` — forwarded to `ChartContainer`. */
  renderer?: 'canvas' | 'svg'
  /** Escape hatch invoked once with the live ECharts instance. Forwarded from `ChartContainer`. */
  onChartReady?: (chart: ECharts) => void
  /** Message rendered in place of the grid when there is nothing to draw. */
  emptyText?: ReactNode
  /** Required accessible description of what the chart shows. */
  'aria-label': string
}

const HEAT_SEQUENTIAL: string[] = chartTheme.heat.sequential
const HEAT_COOL: string[] = chartTheme.heat.cool
/** Band reserved ABOVE the grid for the bin legend (inline-end aligned). */
const LEGEND_BAND = 40
const CELL_LABEL_FONT_SIZE = 11
/**
 * Half the gap between adjacent cells, painted as a card-coloured border, plus
 * the cell corner radius. Without them each row renders as one unbroken colour
 * band and the individual periods stop being legible.
 */
const CELL_GAP_BORDER = 2
const CELL_RADIUS = 4
/** Vertical offset of the group tier below the column tier, and the extra plot inset it costs. */
const GROUP_AXIS_OFFSET = 22
const GROUP_AXIS_BAND = 44
const GROUP_LABEL_FONT_SIZE = 12

const defaultValueFormatter = (value: number): string => value.toLocaleString()

/**
 * Group runs → one entry PER COLUMN, carrying the group label at the run's
 * centre and `''` everywhere else.
 *
 * WHY PER-COLUMN and not a second category axis of four entries: a category
 * axis spreads its entries evenly, so four group entries only line up with the
 * grid while every run happens to be the same length. Emitting one entry per
 * column pins each label to a real column boundary, which keeps unequal runs
 * (a 5-week month) honest.
 */
export function buildGroupTicks(
  groups: ReadonlyArray<HeatmapChartGroup>,
  columnCount: number,
): string[] {
  const ticks = new Array<string>(columnCount).fill('')
  let cursor = 0
  for (const group of groups) {
    const span = Math.max(1, Math.round(group.span))
    if (cursor >= columnCount) break
    const end = Math.min(columnCount, cursor + span)
    // Centre of the run, biased to the earlier column on an even-length run so
    // the label never drifts past its own last column.
    ticks[cursor + Math.floor((end - cursor - 1) / 2)] = group.label
    cursor = end
  }
  return ticks
}

/** `[xIndex, yIndex, value]` triples ECharts' heatmap series consumes, built
 *  by matching `cells` against the category arrays — coordinates with no
 *  match in either axis are dropped rather than coerced to an index. */
function buildHeatmapData(
  xCategories: Array<string | number>,
  yCategories: Array<string | number>,
  cells: HeatmapChartCell[],
): Array<[number, number, number]> {
  const xIndex = new Map(xCategories.map((category, index) => [String(category), index]))
  const yIndex = new Map(yCategories.map((category, index) => [String(category), index]))
  const data: Array<[number, number, number]> = []
  for (const cell of cells) {
    const xi = xIndex.get(String(cell.x))
    const yi = yIndex.get(String(cell.y))
    if (xi === undefined || yi === undefined) continue
    data.push([xi, yi, cell.value])
  }
  return data
}

export function HeatmapChart({
  xCategories,
  yCategories,
  cells,
  min = 0,
  max,
  colorScale = 'sequential',
  bins,
  xGroups,
  xTickLabels,
  xAxisTitle,
  yAxisTitle,
  showValues = false,
  legend = true,
  valueFormatter = defaultValueFormatter,
  height = 320,
  loading = false,
  renderer = 'canvas',
  onChartReady,
  emptyText,
  className,
  'aria-label': ariaLabel,
  ...rest
}: HeatmapChartProps) {
  // `bins[].color` is DATA (a blueprint may author `"var(--color-warning)"`);
  // the piecewise visualMap paints on a canvas that cannot resolve a live CSS
  // var, so every bin fill becomes a literal here and re-resolves on a
  // theme/tenant change.
  const themeVersion = useThemeVersion()
  const [rootRef, direction] = useChartDirection<HTMLDivElement>()
  const mirrored = mirroredAxisOptions(direction)
  const resolvedBins = useMemo(() => {
    void themeVersion
    return bins?.map((bin) => ({ ...bin, color: resolveCssColor(bin.color, trackSurface()) }))
  }, [bins, themeVersion])

  const noDataBin = resolvedBins?.find((bin) => bin.noData)
  const noDataValue = noDataValueFor(min)

  const measuredData = useMemo(
    () => buildHeatmapData(xCategories, yCategories, cells),
    [xCategories, yCategories, cells],
  )

  const heatmapData = useMemo(
    () =>
      noDataBin
        ? fillMissingCells(measuredData, xCategories.length, yCategories.length, noDataValue)
        : measuredData,
    [measuredData, noDataBin, noDataValue, xCategories.length, yCategories.length],
  )

  const resolvedMax = useMemo(() => {
    if (max !== undefined) return max
    if (measuredData.length === 0) return 1
    return Math.max(...measuredData.map((point) => point[2]))
  }, [max, measuredData])

  const colors = colorScale === 'cool' ? HEAT_COOL : HEAT_SEQUENTIAL

  const dataTable = useMemo(
    () =>
      buildMatrixDataTable(
        ariaLabel,
        xCategories,
        yCategories,
        cells,
        valueFormatter,
        noDataBin?.label ?? 'No data',
        yAxisTitle ?? 'Row',
      ),
    [ariaLabel, xCategories, yCategories, cells, valueFormatter, noDataBin, yAxisTitle],
  )

  const tooltipFormatter = useCallback(
    (raw: TooltipComponentFormatterCallbackParams): string => {
      const single = Array.isArray(raw) ? raw[0] : raw
      const point = single?.value as [number, number, number] | undefined
      if (!point) return ''
      const [xi, yi, value] = point
      const isMissing = noDataBin !== undefined && value === noDataValue
      const items: ChartTooltipItem[] = [
        { label: 'Value', value: isMissing ? (noDataBin?.label ?? 'No data') : valueFormatter(value) },
      ]
      return renderToStaticMarkup(
        <ChartTooltip title={`${yCategories[yi]} × ${xCategories[xi]}`} items={items} />,
      )
    },
    [xCategories, yCategories, valueFormatter, noDataBin, noDataValue],
  )

  /** Discrete `piecewise` pieces when `bins` is given, else the continuous ramp. */
  const visualMap = useMemo(() => {
    // Inline-end aligned ABOVE the grid: a scale key belongs beside the thing
    // it keys, not stranded under the x-axis title.
    const shared = {
      show: legend,
      orient: 'horizontal' as const,
      ...(mirrored.rtl ? { left: 0 } : { right: 0 }),
      top: 0,
      itemGap: 8,
    }
    if (!resolvedBins || resolvedBins.length === 0) {
      return {
        ...shared,
        type: 'continuous' as const,
        min,
        max: resolvedMax,
        calculable: false,
        inRange: { color: colors },
        text: [valueFormatter(resolvedMax), valueFormatter(min)],
      }
    }
    return { ...shared, type: 'piecewise' as const, pieces: buildBinPieces(resolvedBins, min) }
  }, [resolvedBins, legend, min, resolvedMax, colors, valueFormatter, mirrored])

  const groupTicks = useMemo(
    () => (xGroups?.length ? buildGroupTicks(xGroups, xCategories.length) : undefined),
    [xGroups, xCategories.length],
  )

  /** Column-tier tick labels — the display twin of the id-bearing categories. */
  const columnAxisLabel = useMemo(
    () =>
      xTickLabels
        ? { axisLabel: { formatter: (_value: string, index: number) => String(xTickLabels[index] ?? '') } }
        : null,
    [xTickLabels],
  )

  const option: EChartsOption = useMemo(() => {
    // `foregroundInk()` and `resolveToken('--color-card', …)` below read live
    // CSS vars, so the whole option must be rebuilt on a theme/tenant flip.
    // Named here (not only in the dep array) so the exhaustive-deps rule can
    // see the dependency is real — same idiom as BarChart/LineChart/Gauge.
    void themeVersion
    return {
      grid: chartGrid({
        xAxisTitle,
        yAxisTitle,
        yLabels: yCategories,
        top: legend ? LEGEND_BAND : undefined,
        // The group tier is drawn below the column tier, so the plot has to
        // give up the band it occupies or it paints over the axis title.
        bottom: groupTicks ? (xAxisTitle ? GROUP_AXIS_BAND + GROUP_AXIS_OFFSET : GROUP_AXIS_BAND) : undefined,
        rtl: mirrored.rtl,
      }),
      xAxis: groupTicks
        ? [
            {
              type: 'category' as const,
              data: xCategories,
              inverse: mirrored.categoryInverse,
              splitArea: { show: true },
              ...columnAxisLabel,
            },
            {
              // Outer tier: same columns, same direction, labels only at run
              // centres. Chrome-free (no line, no ticks) so it reads as a
              // caption band rather than a second scale.
              type: 'category' as const,
              data: groupTicks,
              inverse: mirrored.categoryInverse,
              position: 'bottom' as const,
              offset: GROUP_AXIS_OFFSET,
              axisLine: { show: false },
              axisTick: { show: false },
              splitLine: { show: false },
              axisLabel: {
                color: foregroundInk(),
                fontSize: GROUP_LABEL_FONT_SIZE,
                fontWeight: 500,
                interval: 0,
              },
              ...axisTitleOptions(xAxisTitle, 'x'),
            },
          ]
        : {
            type: 'category' as const,
            data: xCategories,
            inverse: mirrored.categoryInverse,
            splitArea: { show: true },
            ...columnAxisLabel,
            ...axisTitleOptions(xAxisTitle, 'x'),
          },
      yAxis: {
        type: 'category',
        data: yCategories,
        inverse: true,
        position: mirrored.valueAxisPosition,
        splitArea: { show: true },
        ...axisTitleOptions(yAxisTitle, 'y', { labels: yCategories, nameRotate: mirrored.nameRotate }),
      },
      tooltip: { position: 'top', formatter: tooltipFormatter },
      visualMap,
      series: [
        {
          type: 'heatmap',
          data: heatmapData,
          itemStyle: {
            borderRadius: CELL_RADIUS,
            borderWidth: CELL_GAP_BORDER,
            // token-exempt: an ECharts canvas cannot resolve a live CSS var.
            borderColor: resolveToken('--color-card', '#ffffff'),
          },
          label: {
            // A "no data" cell must be readable without colour, so its glyph is
            // painted whether or not on-cell values were asked for.
            show: showValues || noDataBin !== undefined,
            color: foregroundInk(),
            fontSize: CELL_LABEL_FONT_SIZE,
            formatter: (params) => {
              const value = Number((params.value as number[])[2])
              if (noDataBin !== undefined && value === noDataValue) return NO_DATA_GLYPH
              return showValues ? valueFormatter(value) : ''
            },
          },
        },
      ],
    }
  }, [
    xCategories,
    yCategories,
    heatmapData,
    groupTicks,
    columnAxisLabel,
    legend,
    showValues,
    valueFormatter,
    tooltipFormatter,
    visualMap,
    xAxisTitle,
    yAxisTitle,
    noDataBin,
    noDataValue,
    mirrored,
    themeVersion,
  ])

  return (
    <div ref={rootRef} data-slot="heatmap-chart" className={cn('flex flex-col gap-2', className)} {...rest}>
      <ChartContainer
        option={option}
        loading={loading}
        height={height}
        renderer={renderer}
        aria-label={ariaLabel}
        dataTable={dataTable}
        isEmpty={cells.length === 0 || xCategories.length === 0}
        emptyText={emptyText}
        onChartReady={onChartReady}
      />
    </div>
  )
}

HeatmapChart.displayName = 'HeatmapChart'
