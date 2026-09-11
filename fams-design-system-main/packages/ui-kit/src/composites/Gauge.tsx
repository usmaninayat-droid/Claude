import { useMemo, type HTMLAttributes, type ReactNode } from 'react'
import type { ECharts, EChartsOption, GaugeSeriesOption } from 'echarts'
import { cn } from '../lib/cn'
import { ChartContainer } from './ChartContainer'
import { axisInk, foregroundInk, resolveToken } from './chart-axis'
import { buildReadingDataTable } from './chart-data-table'
import { resolveCssColor, useThemeVersion } from './chart-color'

/**
 * Gauge — semi-circular radial gauge with colored range bands and a needle. [L3 composite]
 *
 * Built on `ChartContainer` (the sole ECharts owner) via a native `gauge`
 * series — `startAngle: 180, endAngle: 0` renders v5's half-arc "speedometer"
 * shape without any hand-rolled SVG path math. Chart-agnostic: `sectors` are
 * plain `{ to, color }` ranges and `value`/`min`/`max`/`unit`/`label` are
 * generic numeric/text config — no business vocabulary in or out.
 *
 * Bands are a magnitude ramp (e.g. red→green "how good is this reading"),
 * not a categorical series axis — that is why sectors take a literal `color`
 * rather than the `colorIndex` (`--color-chart-1..5`) idiom `ChartLegend`/
 * `ChartTooltip`/`SegmentedBar` use for categorical swatches; the two are
 * different color vocabularies (categorical hue vs. sequential status) and
 * this composite only ever needs the latter. The needle, anchor, and value
 * text all use ECharts' built-in `'auto'` coloring, which reads whichever
 * sector currently contains the value — zero additional literal colors
 * needed for that chrome.
 *
 * **Centre + caption slots:** ECharts' own gauge `detail`/`title` are plain
 * canvas text with no rich content. `centerContent` therefore takes over the
 * hole with real React (suppressing that canvas text so the two cannot
 * overlap), and `caption` renders under the arc — the place to state the band
 * thresholds in words, so a band is never encoded by colour alone.
 *
 * @usage-v5
 *   Retires two competing hand-rolled SVG gauges, both computing arc geometry
 *   manually and taking raw hex/CSS-var sector colors as props:
 *   - `data-viz/gauge-chart.tsx` — 4-band sectors + needle, pure SVG `<path>`
 *     arithmetic (`arcPath`/`polar` helpers), `var(--chart-accent-*)` colors
 *     passed straight into `fill`.
 *   - `data-viz/compliance-gauge.tsx` — single-band variant, inline
 *     `pct >= 80 ? 'var(--status-success)' : ...` threshold logic baked into
 *     the component instead of being caller-supplied bands.
 *   Forms needed: value/min/max/unit, sector bands (threshold + color),
 *   optional needle, optional sub-label, size sm|md|lg.
 * @usage-index gauge
 */

export interface GaugeSector {
  /** Upper bound of this band, as a percent (0–100) of the min–max range. Sectors must be supplied in ascending `to` order. */
  to: number
  /** Band fill — any ECharts-valid color string. Caller-owned (this is data, not a design decision made by this file). */
  color: string
}

const SIZE_CONFIG = {
  sm: { height: 200, thickness: 10, valueFontSize: 20, labelFontSize: 11 },
  md: { height: 260, thickness: 14, valueFontSize: 26, labelFontSize: 12 },
  lg: { height: 320, thickness: 18, valueFontSize: 34, labelFontSize: 14 },
} as const

export type GaugeSize = keyof typeof SIZE_CONFIG

export interface GaugeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'aria-label'> {
  /** Current reading. Clamped to `[min, max]`. */
  value: number
  /** Range minimum. Default `0`. */
  min?: number
  /** Range maximum. Default `100`. */
  max?: number
  /** Suffix appended to the rounded value, e.g. `'%'`, `' km/h'`. Default `''`. */
  unit?: string
  /** Sub-label rendered under the value (ECharts gauge titles are plain text — no rich `ReactNode` support). */
  label?: string
  /** Color bands drawn along the arc. Defaults to a four-band token ramp (see `DEFAULT_SECTORS`). */
  sectors?: GaugeSector[]
  /** Shows the needle (and its pivot anchor) indicating the current value. Default `true`. */
  showNeedle?: boolean
  /** Visual scale — also drives the default container height. Default `'md'`. */
  size?: GaugeSize
  /** Shows the `ChartContainer` loading overlay. Default `false`. */
  loading?: boolean
  /** Fixed container height — overrides the `size`-driven default. Number is px, any string is used verbatim. */
  height?: number | string
  /** Replaces the built-in value/label stack drawn in the arc's centre with arbitrary React content (a composed KPI stack, a unit split across two lines, a trend chip). When set, ECharts' own `detail`/`title` text is suppressed so the two never overlap. */
  centerContent?: ReactNode
  /** Caption rendered below the arc, inside the gauge's own box — the place to state the band thresholds in text, so the band is not encoded by colour alone. */
  caption?: ReactNode
  /** Required accessible description of what the gauge shows, e.g. `"Fuel level: 81 percent"`. */
  'aria-label': string
  /** `'canvas'` (default) or `'svg'` — see `ChartContainer`. */
  renderer?: 'canvas' | 'svg'
  /** Escape hatch invoked once right after ECharts init — see `ChartContainer`. */
  onChartReady?: (chart: ECharts) => void
}

function defaultSectors(): GaugeSector[] {
  return [
    { to: 30, color: resolveToken('--color-chart-accent-red', '#f04438') }, // token-exempt: echarts canvas/svg renderer needs a literal color, not a live CSS var
    { to: 60, color: resolveToken('--color-chart-accent-orange', '#f79009') }, // token-exempt: see above
    { to: 80, color: resolveToken('--color-chart-accent-yellow', '#f5bb2a') }, // token-exempt: see above
    { to: 100, color: resolveToken('--color-chart-accent-green', '#12b76a') }, // token-exempt: see above
  ]
}

/**
 * The needle is a small triangle MARKER riding on the arc, not ECharts'
 * default hub-anchored wedge.
 *
 * The default pointer is a filled wedge drawn from the centre outward: at any
 * reading it sweeps straight across the gauge's own centre stack, which is
 * where the value and its caption live — measured on both dashboard gauges,
 * the caption was unreadable. Anchoring a short triangle at ~88% of the radius
 * puts the marker ON the band it is reading and leaves the hole clear.
 */
const POINTER_ICON = 'path://M0,0 L10,0 L5,9 Z'
const POINTER_OFFSET: [number, string] = [0, '-88%']
const POINTER_LENGTH = 12
const POINTER_WIDTH = 14

/**
 * ECharts' `axisLine.lineStyle.color` is a list of `[stopFraction, color]`
 * pairs it walks in order — a band whose stop is not strictly greater than its
 * predecessor is silently swallowed, and a final stop below 1 leaves the rest
 * of the arc unpainted. Explicit sectors therefore get normalised here (clamp,
 * sort, drop non-advancing stops, extend the last band to the end of the arc)
 * so a multi-band ramp renders exactly as authored regardless of input order.
 */
function normalizeSectors(sectors: GaugeSector[]): [number, string][] {
  const stops: [number, string][] = []
  const sorted = [...sectors].sort((a, b) => a.to - b.to)
  for (const sector of sorted) {
    const stop = Math.min(Math.max(sector.to, 0), 100) / 100
    if (stops.length > 0 && stop <= stops[stops.length - 1][0]) continue
    stops.push([stop, sector.color])
  }
  if (stops.length === 0) return stops
  const last = stops[stops.length - 1]
  if (last[0] < 1) stops.push([1, last[1]])
  return stops
}

function buildOption(
  value: number,
  min: number,
  max: number,
  unit: string,
  label: string | undefined,
  sectors: GaugeSector[],
  showNeedle: boolean,
  size: GaugeSize,
  hideCenterText: boolean,
): EChartsOption {
  const clamped = Math.min(Math.max(value, min), max)
  const { thickness, valueFontSize, labelFontSize } = SIZE_CONFIG[size]
  const bandColors = normalizeSectors(sectors)

  const series: GaugeSeriesOption = {
    type: 'gauge',
    startAngle: 180,
    endAngle: 0,
    min,
    max,
    radius: '100%',
    center: ['50%', '75%'],
    progress: { show: false },
    axisLine: { lineStyle: { width: thickness, color: bandColors } },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { show: false },
    pointer: {
      show: showNeedle,
      icon: POINTER_ICON,
      keepAspect: true,
      offsetCenter: POINTER_OFFSET,
      length: POINTER_LENGTH,
      width: POINTER_WIDTH,
      itemStyle: { color: foregroundInk() },
    },
    anchor: { show: false },
    title: label && !hideCenterText
      ? { show: true, offsetCenter: [0, '35%'], fontSize: labelFontSize, color: resolveToken('--color-muted-foreground', '#667085') } // token-exempt: echarts canvas/svg renderer needs a literal color, not a live CSS var
      : { show: false },
    detail: {
      show: !hideCenterText,
      valueAnimation: true,
      offsetCenter: [0, '0%'],
      fontSize: valueFontSize,
      fontWeight: 600,
      color: 'auto',
      formatter: (val: number) => `${Math.round(val)}${unit}`,
    },
    data: [{ value: clamped, name: label ?? '' }],
  }

  return { series: [series] }
}

/**
 * Gauge — see module doc above.
 */
export function Gauge({
  value,
  min = 0,
  max = 100,
  unit = '',
  label,
  sectors,
  showNeedle = true,
  size = 'md',
  loading = false,
  height,
  centerContent,
  caption,
  className,
  style,
  dir,
  renderer = 'canvas',
  onChartReady,
  'aria-label': ariaLabel,
  ...rest
}: GaugeProps) {
  // `sectors` is DATA (a blueprint may author `"var(--color-error-500)"`),
  // and ECharts paints on a canvas the CSS cascade never touches — every band
  // colour is resolved to a literal here, and re-resolved when the theme or
  // tenant changes.
  const themeVersion = useThemeVersion()
  const resolvedSectors = useMemo(() => {
    void themeVersion
    return (sectors ?? defaultSectors()).map((sector) => ({
      ...sector,
      color: resolveCssColor(sector.color, axisInk()),
    }))
  }, [sectors, themeVersion])
  const hideCenterText = centerContent != null
  const option = useMemo(
    () => buildOption(value, min, max, unit, label, resolvedSectors, showNeedle, size, hideCenterText),
    [value, min, max, unit, label, resolvedSectors, showNeedle, size, hideCenterText],
  )

  // The relief channel every other chart form already ships (verdict V2): a
  // gauge's whole content — the reading AND the band it falls in — is otherwise
  // canvas pixels only.
  const dataTable = useMemo(
    () =>
      buildReadingDataTable(
        ariaLabel,
        { label: label ?? 'Reading', value: `${value}${unit}` },
        { min: `${min}${unit}`, max: `${max}${unit}` },
        (sectors ?? []).map((sector, index) => ({
          label: `Band ${index + 1}`,
          value: `up to ${Math.round(min + ((max - min) * sector.to) / 100)}${unit}`,
        })),
      ),
    [ariaLabel, label, value, unit, min, max, sectors],
  )

  return (
    <div data-slot="gauge" className={cn('flex w-full flex-col', className)} style={style} dir={dir} {...rest}>
      <div data-slot="gauge-plot" className="relative w-full">
        <ChartContainer
          option={option}
          loading={loading}
          height={height ?? SIZE_CONFIG[size].height}
          renderer={renderer}
          onChartReady={onChartReady}
          aria-label={ariaLabel}
          dataTable={dataTable}
        />
        {centerContent != null ? (
          // The half-arc's centre sits at 75% of the plot box (see `center`
          // above), so the overlay is anchored to the same point rather than
          // to the box's geometric middle.
          <div
            data-slot="gauge-center-content"
            className="pointer-events-none absolute inset-x-0 bottom-0 flex h-3/4 flex-col items-center justify-center text-center"
          >
            {centerContent}
          </div>
        ) : null}
      </div>
      {caption != null ? (
        <div data-slot="gauge-caption" className="text-center text-caption text-muted-foreground">
          {caption}
        </div>
      ) : null}
    </div>
  )
}

Gauge.displayName = 'Gauge'
