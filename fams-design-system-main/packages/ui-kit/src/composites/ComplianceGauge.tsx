import { useId, useMemo, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import type { GaugeSize } from './Gauge'
import { Skeleton } from './Skeleton'
import { usePrefersReducedMotion } from '../wall-display/use-prefers-reduced-motion'

/**
 * ComplianceGauge — the canonical semi-circular "how compliant / how
 * healthy" reading. [L3 composite]
 *
 * Hand-drawn SVG, not `Gauge`/ECharts: the reference anatomy — a handful of
 * gapped, rounded-cap arc segments all painted from ONE continuous red →
 * amber → green sweep, plus a small triangular marker riding just outside
 * the arc — has no clean expression in ECharts' `gauge` series. Its
 * `axisLine` bands are one continuous stroke (no inter-band gaps, no
 * per-band round caps) and its color stops are discrete per-band fills, not
 * a single sweep a multi-band arc could all sample from. `Gauge` stays the
 * general-purpose ECharts primitive for arbitrary caller-owned sector data;
 * this file is the opinionated, pixel-exact compliance/health variant and
 * owns its own rendering entirely.
 *
 * Because it renders as real inline SVG/HTML (not an ECharts canvas), every
 * color is a live CSS custom property (`var(--color-destructive)` etc.) —
 * no `resolveToken`/token-exempt literal-hex fallback dance is needed here;
 * the browser re-paints on theme/tenant change for free.
 *
 * Segments: `segments` (default `3`) is the number of gap-separated arcs.
 * At the default `3` the two internal boundaries are
 * `criticalThreshold`/`warningThreshold` (unchanged threshold semantics —
 * red band ends at `criticalThreshold`, amber ends at `warningThreshold`,
 * green fills the rest). Any other count falls back to evenly-spaced bands,
 * still gapped, still painted from the same one continuous gradient — an
 * opt-in escape hatch for a finer-grained ramp, not the common case.
 *
 * `renderer`/`onChartReady` are retained, typed loosely and unused, purely
 * so source that called the previous ECharts-backed implementation still
 * compiles — this component owns no chart engine to hand back.
 *
 * @usage-v5
 *   Retires `data-viz/compliance-gauge.tsx` — a hand-rolled SVG semi-circle
 *   gauge with inline `pct >= 80 ? 'var(--status-success)' : pct >= 50 ? ... :
 *   ...` threshold logic and hand-computed arc-path trigonometry, taking a
 *   single `value`/`size`/`label` prop set. Forms needed: value (0–100),
 *   size, label — this file keeps that surface and adds the threshold knobs
 *   the original hard-coded, plus the segmented-gradient anatomy design
 *   approved for the "Today's Compliance" card.
 * @usage-index compliance-gauge
 */
export interface ComplianceGaugeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'aria-label'> {
  /** Current reading. Clamped to `[min, max]`. */
  value: number
  /** Range minimum. Default `0`. */
  min?: number
  /** Range maximum. Default `100`. */
  max?: number
  /** Suffix rendered smaller beside the value, e.g. `'%'`, `' pts'`. Default `'%'`. */
  unit?: string
  /** Muted caption directly under the value (the arc's own "Overall Compliance"-style sub-label). */
  label?: ReactNode
  /**
   * Percent of the `[min, max]` range at or below which the reading renders
   * in the "critical" (red) band. Default `50`.
   */
  criticalThreshold?: number
  /**
   * Percent of the `[min, max]` range at or below which the reading renders
   * in the "at-risk" (amber) band (above `criticalThreshold`). Above this
   * value renders "on-track" (green). Default `80`.
   */
  warningThreshold?: number
  /**
   * Number of gap-separated arc segments. Default `3` — at that count the
   * two internal boundaries are `criticalThreshold`/`warningThreshold`; any
   * other count evenly spaces the bands instead. All segments share one
   * continuous red→amber→green gradient regardless of count.
   */
  segments?: number
  /** Shows the triangular needle marker riding the arc at the current value. Default `true`. */
  showNeedle?: boolean
  /** Visual scale. Default `'md'`. */
  size?: GaugeSize
  /** Shows a skeleton placeholder instead of the arc. Default `false`. */
  loading?: boolean
  /** Fixed total container height — overrides the natural size-driven layout. Number is px, any string is used verbatim. */
  height?: number | string
  /** Replaces the built-in value/unit/label stack under the arc with arbitrary React content. */
  centerContent?: ReactNode
  /** Caption rendered below everything else — the place to state the band thresholds in words, so a band is never encoded by colour alone. */
  caption?: ReactNode
  /** Required accessible description of what the gauge shows, e.g. `"Overall compliance: 54 percent, at-risk"`. Applied as `aria-label` on the `role="img"` wrapper — the arc and its labels have no text semantics of their own to assistive tech (ARIA treats an image's subtree as presentational). */
  'aria-label': string
  /** @deprecated ECharts-era escape hatch from the previous implementation. Unused — this component owns no chart engine. Kept only so old call sites still typecheck. */
  renderer?: 'canvas' | 'svg'
  /** @deprecated ECharts-era escape hatch from the previous implementation. Unused — this component owns no chart engine. Kept only so old call sites still typecheck. */
  onChartReady?: (chart: unknown) => void
}

const SIZE_CONFIG: Record<
  GaugeSize,
  { width: number; stroke: number; needleLength: number; needleWidth: number; valueClass: string; unitClass: string }
> = {
  sm: { width: 200, stroke: 14, needleLength: 9, needleWidth: 10, valueClass: 'text-h4', unitClass: 'text-body-sm' },
  md: { width: 260, stroke: 18, needleLength: 11, needleWidth: 12, valueClass: 'text-h2', unitClass: 'text-body-md' },
  lg: { width: 300, stroke: 22, needleLength: 13, needleWidth: 14, valueClass: 'text-h1', unitClass: 'text-body-lg' },
}

/** Angular gap between adjacent segments, in degrees — the reference's "small angular gap". */
const GAP_DEG = 3

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** A point at `angleDeg` (0° = right/max end, 90° = top apex, 180° = left/min end) on the circle centered at (cx, cy). */
function pointOnArc(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = toRad(angleDeg)
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
}

/** Percent (0–100 of the value range) → sweep angle: 0% is the left end (180°), 100% is the right end (0°). */
function percentToAngle(percent: number): number {
  return 180 - (Math.min(Math.max(percent, 0), 100) / 100) * 180
}

/** One arc segment's `<path>` `d`, or `null` if the (post-gap-trim) span collapsed to nothing. */
function arcPath(cx: number, cy: number, r: number, startPercent: number, endPercent: number): string | null {
  if (endPercent <= startPercent) return null
  const thetaStart = percentToAngle(startPercent)
  const thetaEnd = percentToAngle(endPercent)
  const p1 = pointOnArc(cx, cy, r, thetaStart)
  const p2 = pointOnArc(cx, cy, r, thetaEnd)
  const largeArc = thetaStart - thetaEnd > 180 ? 1 : 0
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
}

/**
 * Splits `[0, 100]` into `segments` band boundaries. `segments === 3` keeps
 * the existing threshold semantics as the two internal boundaries; any
 * other count evenly spaces the bands instead (see module doc).
 */
function segmentBoundaries(segments: number, criticalThreshold: number, warningThreshold: number): number[] {
  if (segments === 3) return [0, criticalThreshold, warningThreshold, 100]
  const count = Math.max(1, Math.round(segments))
  return Array.from({ length: count + 1 }, (_, i) => (i / count) * 100)
}

/** Isoceles triangle centered at the origin, tip pointing toward -y (rotated into place by the caller). */
function needlePoints(width: number, length: number): string {
  return `0,${(-length / 2).toFixed(2)} ${(-width / 2).toFixed(2)},${(length / 2).toFixed(2)} ${(width / 2).toFixed(2)},${(length / 2).toFixed(2)}`
}

/**
 * ComplianceGauge — see module doc above.
 */
export function ComplianceGauge({
  value,
  min = 0,
  max = 100,
  unit = '%',
  label,
  criticalThreshold = 50,
  warningThreshold = 80,
  segments = 3,
  showNeedle = true,
  size = 'md',
  loading = false,
  height,
  centerContent,
  caption,
  className,
  style,
  dir,
  renderer: _renderer,
  onChartReady: _onChartReady,
  'aria-label': ariaLabel,
  ...rest
}: ComplianceGaugeProps) {
  const gradientId = useId()
  const reducedMotion = usePrefersReducedMotion()
  const cfg = SIZE_CONFIG[size]

  const cx = cfg.width / 2
  const outerPad = Math.max(cfg.stroke / 2, cfg.needleLength) + 6
  const r = cx - outerPad
  const cy = r + outerPad
  const svgHeight = cy

  const clampedValue = Math.min(Math.max(value, min), max)
  const valuePercent = max === min ? 0 : ((clampedValue - min) / (max - min)) * 100

  const segmentPaths = useMemo(() => {
    const boundaries = segmentBoundaries(segments, criticalThreshold, warningThreshold)
    const halfGap = (GAP_DEG / 180) * 100 / 2
    const paths: string[] = []
    for (let i = 0; i < boundaries.length - 1; i++) {
      const isFirst = i === 0
      const isLast = i === boundaries.length - 2
      const start = boundaries[i] + (isFirst ? 0 : halfGap)
      const end = boundaries[i + 1] - (isLast ? 0 : halfGap)
      const d = arcPath(cx, cy, r, start, end)
      if (d) paths.push(d)
    }
    return paths
  }, [segments, criticalThreshold, warningThreshold, cx, cy, r])

  const needleTransform = useMemo(() => {
    const needleRadius = r + cfg.stroke / 2 + 5
    const angle = percentToAngle(valuePercent)
    const point = pointOnArc(cx, cy, needleRadius, angle)
    // Rotating the default "tip points -y" triangle by (inward-vector angle + 90)
    // — both measured directly in SVG's own x,y convention — always points the
    // tip back along the radius toward the arc, regardless of where on the
    // sweep the needle sits (verified at the 0%/50%/100% cardinal points).
    const inwardAngleDeg = (Math.atan2(cy - point.y, cx - point.x) * 180) / Math.PI
    const rotation = inwardAngleDeg + 90
    return `translate(${point.x.toFixed(2)}, ${point.y.toFixed(2)}) rotate(${rotation.toFixed(2)})`
  }, [valuePercent, r, cx, cy, cfg.stroke])

  const hideBuiltInContent = centerContent != null

  return (
    <div
      data-slot="compliance-gauge"
      role="img"
      aria-label={ariaLabel}
      aria-busy={loading}
      dir={dir}
      className={cn('inline-flex w-full flex-col items-center', className)}
      style={height != null ? { height, ...style } : style}
      {...rest}
    >
      {loading ? (
        <div data-slot="compliance-gauge-loading" className="flex w-full flex-col items-center" style={{ maxWidth: cfg.width }}>
          <Skeleton variant="custom" className="w-full rounded-t-full" style={{ height: svgHeight }} />
          <Skeleton variant="text" className="mt-3 h-8 w-16" />
        </div>
      ) : (
        <>
          <svg
            aria-hidden="true"
            data-slot="compliance-gauge-arc"
            viewBox={`0 0 ${cfg.width} ${svgHeight}`}
            style={{ width: '100%', maxWidth: cfg.width, height: 'auto' }}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={cx - r} y1={cy} x2={cx + r} y2={cy}>
                <stop offset="0%" style={{ stopColor: 'var(--color-destructive)' }} />
                <stop offset="50%" style={{ stopColor: 'var(--color-warning)' }} />
                <stop offset="100%" style={{ stopColor: 'var(--color-success)' }} />
              </linearGradient>
            </defs>
            {segmentPaths.map((d, i) => (
              <path key={i} d={d} fill="none" stroke={`url(#${gradientId})`} strokeWidth={cfg.stroke} strokeLinecap="round" />
            ))}
            {showNeedle ? (
              <g transform={needleTransform} className={cn(!reducedMotion && 'transition-transform duration-slow ease-decelerate')}>
                <polygon points={needlePoints(cfg.needleWidth, cfg.needleLength)} fill="var(--color-foreground)" />
              </g>
            ) : null}
          </svg>
          {hideBuiltInContent ? (
            <div data-slot="compliance-gauge-center-content" className="-mt-1 flex flex-col items-center text-center">
              {centerContent}
            </div>
          ) : (
            <div data-slot="compliance-gauge-value" className="-mt-1 flex flex-col items-center text-center">
              <div className="flex items-baseline gap-0.5">
                <span data-slot="compliance-gauge-value-number" className={cn(cfg.valueClass, 'font-bold leading-none text-foreground')}>
                  {Math.round(clampedValue)}
                </span>
                {unit ? (
                  <span className={cn(cfg.unitClass, 'font-semibold leading-none text-foreground/80')}>{unit}</span>
                ) : null}
              </div>
              {label != null ? <div className="mt-1 text-caption text-muted-foreground">{label}</div> : null}
            </div>
          )}
        </>
      )}
      {caption != null ? (
        <div data-slot="compliance-gauge-caption" className="mt-2 text-center text-caption text-muted-foreground">
          {caption}
        </div>
      ) : null}
    </div>
  )
}

ComplianceGauge.displayName = 'ComplianceGauge'
