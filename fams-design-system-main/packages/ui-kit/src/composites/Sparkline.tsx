import { useMemo, type HTMLAttributes } from 'react'
import type { ECharts, EChartsOption } from 'echarts'
import chartTheme from '@fams/tokens/theme.echarts.json'
import type { BadgeColorIndex } from '../primitives/Badge'
import { ChartContainer } from './ChartContainer'

/**
 * Sparkline — tiny inline trend indicator, on ECharts. [L3 composite]
 *
 * Built directly on `ChartContainer` (the sole ECharts owner), same
 * thin-wrapper shape as `Gauge` — no legend, no axis/tooltip chrome, just a
 * single-series `option` built from `data`. Meant to embed inside dense
 * contexts (`KpiTile`, a table cell) where a full `LineChart`/`AreaChart`
 * would be visual noise: axes, grid lines, and the tooltip are always off,
 * and the value axis is scaled to `[min(data), max(data)]` rather than a
 * `0`-based range so small trends stay legible at a few dozen pixels tall.
 *
 * **`variant`:** `'line'` (default, stroke only) or `'area'` (gradient fill
 * beneath the line) — the same stroke/fill relationship `LineChart` and
 * `AreaChart` have at full chart scale, collapsed into one component since a
 * sparkline never carries the multi-series/legend/stack machinery those two
 * need.
 *
 * **Color:** resolved from `colorIndex`'s `--color-chart-1..5` swatch, read
 * from the same compiled `@fams/tokens/theme.echarts.json` `ChartContainer`
 * registers as the chart theme — never a literal hex (matches
 * `BarChart`/`AreaChart`/`LineChart`).
 *
 * No business vocabulary: `data` is a plain `number[]` — no fetch, no
 * stores, no domain-specific field names.
 */
export interface SparklineProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'aria-label'> {
  /** Numeric values plotted left to right, evenly spaced (no explicit x-axis categories). */
  data: number[]
  /** `'line'` (default, stroke only) or `'area'` (gradient-filled beneath the line). */
  variant?: 'line' | 'area'
  /** Categorical swatch — one of `--color-chart-1..5`. Default `1`. */
  colorIndex?: BadgeColorIndex
  /** Smooths the line curve. Default `true`. */
  smooth?: boolean
  /** Fixed container height — number is px, any string is used verbatim. Default `32`. */
  height?: number | string
  /** Shows the `ChartContainer` loading overlay. Default `false`. */
  loading?: boolean
  /** `'canvas'` (default) or `'svg'` — forwarded to `ChartContainer`. */
  renderer?: 'canvas' | 'svg'
  /** Escape hatch invoked once with the live ECharts instance — forwarded from `ChartContainer`. */
  onChartReady?: (chart: ECharts) => void
  /** Required accessible description of the trend shown, e.g. `"Trips, last 7 days, trending up"`. */
  'aria-label': string
}

const PALETTE: string[] = chartTheme.color
const CATEGORICAL_SPAN = 5

function resolveHex(colorIndex: BadgeColorIndex): string {
  return PALETTE[(colorIndex - 1) % CATEGORICAL_SPAN]
}

/** `#rrggbb` (from the compiled token palette, never a literal here) → `rgba(...)` for the area gradient stops. */
function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const int = parseInt(value, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function buildOption(data: number[], variant: 'line' | 'area', smooth: boolean, hex: string): EChartsOption {
  return {
    xAxis: { type: 'category', show: false, boundaryGap: false, data: data.map((_, i) => i) },
    yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
    grid: { top: 2, right: 2, bottom: 2, left: 2 },
    tooltip: { show: false },
    series: [
      {
        type: 'line',
        data,
        smooth,
        symbol: 'none',
        lineStyle: { width: 1.5, color: hex },
        itemStyle: { color: hex },
        ...(variant === 'area'
          ? {
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
            }
          : null),
      },
    ],
  }
}

export function Sparkline({
  data,
  variant = 'line',
  colorIndex = 1,
  smooth = true,
  height = 32,
  loading = false,
  className,
  style,
  dir,
  renderer = 'canvas',
  onChartReady,
  'aria-label': ariaLabel,
  ...rest
}: SparklineProps) {
  const hex = useMemo(() => resolveHex(colorIndex), [colorIndex])
  const option = useMemo(() => buildOption(data, variant, smooth, hex), [data, variant, smooth, hex])

  return (
    <ChartContainer
      option={option}
      loading={loading}
      height={height}
      className={className}
      style={style}
      dir={dir}
      renderer={renderer}
      onChartReady={onChartReady}
      aria-label={ariaLabel}
      {...rest}
    />
  )
}

Sparkline.displayName = 'Sparkline'
