import chartTheme from '@fams/tokens/theme.echarts.json'
import type { BadgeColorIndex } from '../primitives/Badge'

/**
 * chart-axis — the shared axis/palette vocabulary every ECharts composite
 * builds its `option` from. Internal helper module: NOT exported from
 * `src/index.ts` (it is implementation detail of the chart composites, not a
 * public surface).
 *
 * It exists so `BarChart`/`LineChart`/`AreaChart`/`HeatmapChart` cannot drift
 * on the three things they must agree about:
 * 1. **Axis titles** — one `name`/`nameGap`/`nameRotate`/`nameTextStyle`
 *    recipe, so a y-axis title reads the same way (and rotates the same way
 *    under RTL) in every chart form.
 * 2. **Grid insets** — reserving the extra band an axis title needs, so a
 *    titled axis never clips against the card edge.
 * 3. **Categorical color** — the `colorIndex` → `--color-chart-1..5` bridge,
 *    plus the CVD safety guard below.
 *
 * **Color, not hex:** every literal below is either a `resolveToken(...)`
 * fallback or comes from the compiled `@fams/tokens/theme.echarts.json`.
 * Canvas/SVG paint operations cannot resolve CSS `var()` at draw time, so
 * this is the sanctioned token→renderer bridge — never a hand-written hex.
 */

export const CHART_PALETTE: string[] = chartTheme.color

/** Number of distinct categorical slots before `colorIndex` wraps. */
const CATEGORICAL_SPAN = 5

/**
 * The two palette slots that collapse under deuteranopia (measured ΔE 2.4 —
 * `--color-chart-4` green vs `--color-chart-5` rose). A chart that resolves
 * both is unreadable for a deuteranope, so the DEV guard below flags it.
 */
const CVD_UNSAFE_SLOTS: readonly BadgeColorIndex[] = [4, 5]

/** Axis-title type scale + the band each orientation reserves for it. */
const AXIS_TITLE_FONT_SIZE = 12
const AXIS_TITLE_FONT_WEIGHT = 500
const X_AXIS_NAME_GAP = 32
/** Fallback y-axis `nameGap` when the tick labels cannot be measured. */
const Y_AXIS_NAME_GAP = 44

/** Base plot inset. */
const BASE_INSET = 16
/**
 * Band reserved at a titled edge for the rotated axis TITLE ONLY.
 *
 * BUG B: `grid.containLabel` reserves room for an axis' tick LABELS but knows
 * nothing about its `name`, so a fixed `nameGap` smaller than the label band
 * paints the rotated title straight on top of the category labels (measured on
 * every horizontal-bar chart and the heatmap). The fix is two-part and lives
 * entirely here: the grid reserves only this narrow band at the titled edge
 * (`containLabel` then adds the real label width on top of it), and `nameGap`
 * is pushed out past the MEASURED label band so the title lands inside the
 * reserved gutter instead of inside the labels.
 */
const AXIS_TITLE_BAND = 24
/** Clear space between the widest tick label and the axis title. */
const AXIS_TITLE_CLEARANCE = 12
/** Inset at an edge carrying x-axis title + tick row. */
const TITLED_INSET = 48

/** Reused 2D context for `measureLabelBand`; `null` where none is available. */
let measureContext: CanvasRenderingContext2D | null | undefined

function labelTextWidth(text: string, fontSize: number): number {
  if (measureContext === undefined) {
    measureContext =
      typeof document === 'undefined' ? null : (document.createElement('canvas').getContext('2d') ?? null)
  }
  if (measureContext) {
    measureContext.font = `${AXIS_TITLE_FONT_WEIGHT} ${fontSize}px sans-serif`
    const measured = measureContext.measureText(text).width
    if (measured > 0) return measured
  }
  // jsdom / SSR: no text metrics. A per-character estimate is enough to keep
  // the title clear of the labels; it is never used in a real browser.
  return text.length * fontSize * 0.62
}

/**
 * Width in px of the widest tick label in `labels` — the band an axis title
 * must clear. Returns `0` for an empty list, so an untitled or label-less axis
 * falls back to the fixed gap.
 */
export function measureLabelBand(labels: ReadonlyArray<string | number> = [], fontSize = AXIS_TITLE_FONT_SIZE): number {
  let widest = 0
  for (const label of labels) {
    const width = labelTextWidth(String(label), fontSize)
    if (width > widest) widest = width
  }
  return widest
}

/**
 * The two numbers a rotated y-axis title needs, derived from ONE measurement so
 * they cannot disagree.
 *
 * The geometry ECharts actually uses: with `grid.containLabel: true` the axis
 * LINE lands at `grid.left + labelBand`, and `nameGap` then places the rotated
 * title that many pixels further OUT. So the title's distance from the card
 * edge is `inset + labelBand - nameGap` — and it is only ever correct if the
 * inset and the gap are computed from the same `labelBand`.
 *
 * BUG B (round 1) fixed the case where `labelBand` is WIDE: horizontal bar
 * charts, whose y ticks are plate names (~80px), so `nameGap = 80 + 12` easily
 * cleared the fixed `AXIS_TITLE_BAND` inset.
 *
 * ROUND-2 QA #11/#4 is the opposite case, and the fixed `Y_AXIS_NAME_GAP = 44`
 * FLOOR was the cause: a VERTICAL chart's y axis is the value axis, so its
 * ticks are short numerals ("10", measured ~13px). The floor pushed the title
 * 44px out from an axis line sitting only `24 + 13 = 37px` from the card edge,
 * i.e. to x ≈ -7 — off-canvas, which ECharts renders as the single stray glyph
 * QA photographed on Telematics' "Overspeeding Over Time" and Fuel's
 * "Refueling Over Time". Neither chart was narrow-specific; both simply had
 * short value ticks.
 *
 * So the gap is now `labelBand + clearance` whenever the band is measurable,
 * and the inset absorbs exactly the overhang: the title lands a constant
 * `AXIS_TITLE_BAND` px from the card edge for ANY label width, short or long.
 */
export interface YAxisTitleMetrics {
  /** `yAxis.nameGap` — distance from the axis line out to the rotated title. */
  nameGap: number
  /** `grid.left` (or `grid.right` under RTL) — the reserved gutter. */
  inset: number
  /** Measured width of the widest tick label; `0` when unmeasurable. */
  labelBand: number
}

export function yAxisTitleMetrics(
  labels: ReadonlyArray<string | number> = [],
): YAxisTitleMetrics {
  const labelBand = Math.round(measureLabelBand(labels))
  // No measurable labels (an empty series): fall back to the fixed gap — there
  // is nothing to derive the real band from, and `containLabel` will still add
  // whatever ECharts measures on top of the inset.
  const nameGap = labelBand > 0 ? labelBand + AXIS_TITLE_CLEARANCE : Y_AXIS_NAME_GAP
  return { nameGap, inset: AXIS_TITLE_BAND + nameGap - labelBand, labelBand }
}

/**
 * Distance from the card edge at which the rotated title will paint, given the
 * grid inset and gap that will be used. Exists so the invariant "the title is
 * inside the reserved gutter" is assertable rather than eyeballed.
 */
export function rotatedTitleOffset(metrics: YAxisTitleMetrics, inset = metrics.inset): number {
  return inset + metrics.labelBand - metrics.nameGap
}

export function seriesColorIndex(explicit: BadgeColorIndex | undefined, index: number): BadgeColorIndex {
  return explicit ?? (((index % CATEGORICAL_SPAN) + 1) as BadgeColorIndex)
}

export function resolveChartHex(colorIndex: BadgeColorIndex): string {
  return CHART_PALETTE[(colorIndex - 1) % CHART_PALETTE.length]
}

/**
 * Resolves a CSS custom property to a literal color string. ECharts paints via
 * an imperative canvas/SVG API it evaluates itself — unlike a DOM `className`,
 * it cannot resolve `var(--x)` through the browser's CSS cascade. Falls back to
 * the token's current literal value when no style engine is available (SSR, or
 * a test environment with no stylesheet loaded).
 */
export function resolveToken(name: string, fallback: string): string {
  if (typeof document === 'undefined' || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return fallback
  }
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

/** Muted ink used for axis titles — the same token every axis label uses. */
export function axisInk(): string {
  return resolveToken('--color-muted-foreground', '#667085') // token-exempt: echarts needs a literal color, not a live CSS var
}

/** Low-contrast surface used for bar background tracks. */
export function trackSurface(): string {
  return resolveToken('--color-border', '#eaecf0') // token-exempt: see resolveToken above
}

/** Primary ink, for on-canvas value labels that must clear 4.5:1 on the card. */
export function foregroundInk(): string {
  return resolveToken('--color-foreground', '#101828') // token-exempt: see resolveToken above
}

export interface AxisTitleOptions {
  name?: string
  nameLocation?: 'middle'
  nameGap?: number
  nameRotate?: number
  nameTextStyle?: { color: string; fontSize: number; fontWeight: number }
}

export interface AxisTitleContext {
  /** The axis' own tick labels, used to measure the band the title must clear (bug B). */
  labels?: ReadonlyArray<string | number>
  /** Rotation of a y-axis title. `-90` when the axis is mirrored to the physical right under RTL. */
  nameRotate?: number
}

/**
 * Axis-title fragment to spread into an ECharts axis object. Empty when no
 * title is given, so the caller never has to branch.
 *
 * `nameGap` for a y-axis is pushed past the widest measured tick label (see
 * `AXIS_TITLE_BAND` — bug B), and `nameRotate` is set explicitly rather than
 * left to ECharts' default, which renders the title upside-down once the axis
 * mirrors to the inline-end side under `dir="rtl"`.
 */
export function axisTitleOptions(
  title: string | undefined,
  orientation: 'x' | 'y',
  context: AxisTitleContext = {},
): AxisTitleOptions {
  if (!title) return {}
  return {
    name: title,
    nameLocation: 'middle',
    nameGap:
      orientation === 'x' ? X_AXIS_NAME_GAP : yAxisTitleMetrics(context.labels).nameGap,
    nameRotate: orientation === 'y' ? (context.nameRotate ?? 90) : 0,
    nameTextStyle: { color: axisInk(), fontSize: AXIS_TITLE_FONT_SIZE, fontWeight: AXIS_TITLE_FONT_WEIGHT },
  }
}

export interface ChartGridOptions {
  xAxisTitle?: string
  yAxisTitle?: string
  yAxisTitleTrailing?: string
  /**
   * The y axis' own tick labels — the SAME array handed to `axisTitleOptions`.
   * The reserved gutter and the title's `nameGap` are both derived from it, so
   * the rotated title always lands inside the gutter (see `yAxisTitleMetrics`).
   * Omit only when the axis has no measurable labels.
   */
  yLabels?: ReadonlyArray<string | number>
  /** Tick labels of the trailing (dual-axis) y axis; defaults to `yLabels`. */
  yLabelsTrailing?: ReadonlyArray<string | number>
  bottom?: number
  top?: number
  /** Mirrors the leading/trailing insets — the y-axis sits on the physical right under RTL. */
  rtl?: boolean
}

/**
 * Plot insets that reserve room for whichever axis titles are present.
 *
 * A titled y edge reserves `yAxisTitleMetrics().inset` — the gutter that puts
 * the rotated title exactly `AXIS_TITLE_BAND` px inside the card edge for any
 * tick-label width. `containLabel: true` then adds the real label band on top,
 * so the labels are never double-counted (bug B) and a short-label value axis
 * no longer pushes its title off-canvas (round-2 QA #11/#4).
 */
export function chartGrid(options: ChartGridOptions = {}) {
  const leadingInset = options.yAxisTitle
    ? yAxisTitleMetrics(options.yLabels).inset
    : BASE_INSET
  const trailingInset = options.yAxisTitleTrailing
    ? yAxisTitleMetrics(options.yLabelsTrailing ?? options.yLabels).inset
    : BASE_INSET
  return {
    top: options.top ?? BASE_INSET,
    right: options.rtl ? leadingInset : trailingInset,
    bottom: options.bottom ?? (options.xAxisTitle ? TITLED_INSET : BASE_INSET),
    left: options.rtl ? trailingInset : leadingInset,
    containLabel: true,
  }
}

/**
 * DEV-only palette guard (never throws, silent in production builds).
 *
 * `--color-chart-4` (#12b76a green) and `--color-chart-5` (#f63d68 rose)
 * measure ΔE 2.4 apart under deuteranopia — a red/green pair a deuteranope
 * cannot separate. Any single chart resolving both is a colour-safety defect,
 * so the categorical ceiling is 4 series; a 5th category should fold to
 * "Other".
 */
export function warnOnUnsafePalette(colorIndexes: BadgeColorIndex[], componentName: string): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return
  const used = new Set(colorIndexes)
  if (!CVD_UNSAFE_SLOTS.every((slot) => used.has(slot))) return
  console.warn(
    `[${componentName}] uses chart palette slots 4 and 5 in the same chart. Those two swatches are indistinguishable under deuteranopia — use at most 4 categorical series and fold the rest into an "Other" category.`,
  )
}
