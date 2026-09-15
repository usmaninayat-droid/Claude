import { useId, useMemo, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import type { GaugeSize } from './Gauge'
import { Skeleton } from './Skeleton'
import { usePrefersReducedMotion } from '../wall-display/use-prefers-reduced-motion'

/**
 * ComplianceGauge — the canonical semi-circular "how compliant / how
 * healthy" reading. [L3 composite]
 *
 * Hand-drawn SVG, not `Gauge`/ECharts: the reference anatomy (Figma
 * "Tadweer — Launch Pad" node 6557:19933) — a thick ring cut into a handful
 * of flat-ended, softly-cornered annular sectors separated by a hairline of
 * card background, all painted from ONE continuous red → amber → green
 * sweep, the value sitting INSIDE the arc's mouth and a small triangular
 * marker straddling the outer edge — has no clean expression in ECharts'
 * `gauge` series. `Gauge` stays the general-purpose ECharts primitive for
 * arbitrary caller-owned sector data; this file is the opinionated,
 * pixel-exact compliance/health variant and owns its own rendering entirely.
 *
 * Because it renders as real inline SVG/HTML (not an ECharts canvas), every
 * color is a live CSS custom property (`var(--color-destructive)` etc.) —
 * the browser re-paints on theme/tenant change for free.
 *
 * Segments: `segments` (default `3`) is the number of sectors. At the
 * default `3` the two internal boundaries are
 * `criticalThreshold`/`warningThreshold` (red band ends at
 * `criticalThreshold`, amber ends at `warningThreshold`, green fills the
 * rest) and the gradient's amber/green stops sit exactly on those
 * boundaries. Any other count falls back to evenly-spaced bands, still
 * painted from the same one continuous gradient.
 *
 * `renderer`/`onChartReady` are retained, typed loosely and unused, purely
 * so source that called the previous ECharts-backed implementation still
 * compiles — this component owns no chart engine to hand back.
 *
 * @usage-v5
 *   Retires `data-viz/compliance-gauge.tsx` — a hand-rolled SVG semi-circle
 *   gauge with inline threshold logic and hand-computed arc-path
 *   trigonometry, taking a single `value`/`size`/`label` prop set.
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
  /** Muted caption rendered under the arc (the reference's "Compliance Score"). */
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
   * Number of arc segments. Default `3` — at that count the two internal
   * boundaries are `criticalThreshold`/`warningThreshold`; any other count
   * evenly spaces the bands instead. All segments share one continuous
   * red→amber→green gradient regardless of count.
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
  /** Replaces the built-in value/unit stack inside the arc with arbitrary React content. */
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
  { width: number; needleLength: number; needleWidth: number; valueClass: string; unitClass: string }
> = {
  sm: { width: 224, needleLength: 11, needleWidth: 13, valueClass: 'text-metric', unitClass: 'text-body-sm' },
  md: { width: 260, needleLength: 13, needleWidth: 15, valueClass: 'text-h2', unitClass: 'text-body-md' },
  lg: { width: 300, needleLength: 15, needleWidth: 17, valueClass: 'text-h1', unitClass: 'text-body-lg' },
}

/** Ring thickness as a share of the outer diameter — the reference's 30px on a 221px ring. */
const RING_RATIO = 0.135
/** Corner radius on each sector's flat ends, as a share of the ring thickness. */
const CORNER_RATIO = 0.14
/** Hairline of card background between adjacent sectors, in viewBox units. */
const SEAM_WIDTH = 2

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

const fmt = (n: number) => n.toFixed(2)
const pt = (p: { x: number; y: number }) => `${fmt(p.x)} ${fmt(p.y)}`

/**
 * One filled annular sector between `startDeg` (larger) and `endDeg`, with
 * every corner softened by `corner`. Corners are quadratic curves whose
 * control point is the true (sharp) corner — indistinguishable from a
 * circular fillet at these radii.
 */
function sectorPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startDeg: number,
  endDeg: number,
  corner: number,
): string | null {
  if (startDeg - endDeg <= 0.5) return null
  const dOuter = (corner / rOuter) * (180 / Math.PI)
  const dInner = (corner / rInner) * (180 / Math.PI)
  const P = (r: number, a: number) => pointOnArc(cx, cy, r, a)
  const large = startDeg - endDeg > 180 ? 1 : 0
  const outerA = P(rOuter, startDeg - dOuter)
  const outerB = P(rOuter, endDeg + dOuter)
  const endOuter = P(rOuter - corner, endDeg)
  const endInner = P(rInner + corner, endDeg)
  const innerB = P(rInner, endDeg + dInner)
  const innerA = P(rInner, startDeg - dInner)
  const startInner = P(rInner + corner, startDeg)
  const startOuter = P(rOuter - corner, startDeg)
  return [
    `M ${pt(outerA)}`,
    `A ${fmt(rOuter)} ${fmt(rOuter)} 0 ${large} 1 ${pt(outerB)}`,
    `Q ${pt(P(rOuter, endDeg))} ${pt(endOuter)}`,
    `L ${pt(endInner)}`,
    `Q ${pt(P(rInner, endDeg))} ${pt(innerB)}`,
    `A ${fmt(rInner)} ${fmt(rInner)} 0 ${large} 0 ${pt(innerA)}`,
    `Q ${pt(P(rInner, startDeg))} ${pt(startInner)}`,
    `L ${pt(startOuter)}`,
    `Q ${pt(P(rOuter, startDeg))} ${pt(outerA)}`,
    'Z',
  ].join(' ')
}

/**
 * Splits `[0, 100]` into `segments` band boundaries. `segments === 3` keeps
 * the threshold semantics as the two internal boundaries; any other count
 * evenly spaces the bands instead (see module doc).
 */
function segmentBoundaries(segments: number, criticalThreshold: number, warningThreshold: number): number[] {
  if (segments === 3) return [0, criticalThreshold, warningThreshold, 100]
  const count = Math.max(1, Math.round(segments))
  return Array.from({ length: count + 1 }, (_, i) => (i / count) * 100)
}

/** Horizontal gradient offset (0–1) of the arc point at `percent`, so a colour stop lands on a band boundary. */
function boundaryStop(percent: number): number {
  return (1 + Math.cos(toRad(percentToAngle(percent)))) / 2
}

/** Isoceles triangle centered at the origin, tip pointing toward -y (rotated into place by the caller). */
function needlePoints(width: number, length: number): string {
  return `0,${fmt(-length / 2)} ${fmt(-width / 2)},${fmt(length / 2)} ${fmt(width / 2)},${fmt(length / 2)}`
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

  // The ring fills the viewBox edge to edge (a 1-unit bleed for the seam
  // stroke); the needle is allowed to overflow it, as in the reference.
  const cx = cfg.width / 2
  const rOuter = cx - 1
  const cy = rOuter + 1
  const svgHeight = cy
  const thickness = cfg.width * RING_RATIO
  const rInner = rOuter - thickness
  const corner = thickness * CORNER_RATIO

  const clampedValue = Math.min(Math.max(value, min), max)
  const valuePercent = max === min ? 0 : ((clampedValue - min) / (max - min)) * 100

  const boundaries = useMemo(
    () => segmentBoundaries(segments, criticalThreshold, warningThreshold),
    [segments, criticalThreshold, warningThreshold],
  )

  const segmentPaths = useMemo(() => {
    const paths: string[] = []
    for (let i = 0; i < boundaries.length - 1; i++) {
      const d = sectorPath(cx, cy, rOuter, rInner, percentToAngle(boundaries[i]), percentToAngle(boundaries[i + 1]), corner)
      if (d) paths.push(d)
    }
    return paths
  }, [boundaries, cx, cy, rOuter, rInner, corner])

  // Amber/green stops ride the band boundaries when there are three bands, so
  // each sector reads as "its" colour while still sampling one sweep.
  const gradientStops = useMemo(() => {
    const amber = boundaries.length === 4 ? boundaryStop(boundaries[1]) : 0.5
    const green = boundaries.length === 4 ? boundaryStop(boundaries[2]) : 1
    return { amber: Math.min(Math.max(amber, 0.01), 0.98), green: Math.min(Math.max(green, amber + 0.01), 1) }
  }, [boundaries])

  const needleTransform = useMemo(() => {
    const angle = percentToAngle(valuePercent)
    const point = pointOnArc(cx, cy, rOuter, angle)
    // Rotating the default "tip points -y" triangle by (inward-vector angle + 90)
    // always points the tip back along the radius toward the arc's centre.
    const inwardAngleDeg = (Math.atan2(cy - point.y, cx - point.x) * 180) / Math.PI
    return `translate(${fmt(point.x)}, ${fmt(point.y)}) rotate(${fmt(inwardAngleDeg + 90)})`
  }, [valuePercent, rOuter, cx, cy])

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
          <Skeleton variant="text" className="mt-3 h-5 w-24" />
        </div>
      ) : (
        <>
          <div className="relative w-full" style={{ maxWidth: cfg.width }}>
            <svg
              aria-hidden="true"
              data-slot="compliance-gauge-arc"
              viewBox={`0 0 ${cfg.width} ${svgHeight}`}
              className="block h-auto w-full overflow-visible"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={cx - rOuter} y1={cy} x2={cx + rOuter} y2={cy}>
                  <stop offset="0%" style={{ stopColor: 'var(--color-destructive)' }} />
                  <stop offset={`${(gradientStops.amber * 100).toFixed(1)}%`} style={{ stopColor: 'var(--color-warning)' }} />
                  <stop offset={`${(gradientStops.green * 100).toFixed(1)}%`} style={{ stopColor: 'var(--color-success)' }} />
                </linearGradient>
              </defs>
              {segmentPaths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill={`url(#${gradientId})`}
                  stroke="var(--color-card)"
                  strokeWidth={SEAM_WIDTH}
                  strokeLinejoin="round"
                />
              ))}
              {showNeedle ? (
                <g
                  transform={needleTransform}
                  className={cn('drop-shadow-sm', !reducedMotion && 'transition-transform duration-slow ease-decelerate')}
                >
                  <polygon
                    points={needlePoints(cfg.needleWidth, cfg.needleLength)}
                    fill="var(--color-foreground)"
                    stroke="var(--color-background)"
                    strokeWidth={SEAM_WIDTH}
                    strokeLinejoin="round"
                  />
                </g>
              ) : null}
            </svg>
            {/* Sits in the arc's mouth: the reference centres the value ~26% of the radius above the baseline. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-[10%] flex justify-center">
              {hideBuiltInContent ? (
                <div data-slot="compliance-gauge-center-content" className="flex flex-col items-center text-center">
                  {centerContent}
                </div>
              ) : (
                <div data-slot="compliance-gauge-value" className="flex items-baseline gap-0.5 text-center">
                  <span data-slot="compliance-gauge-value-number" className={cn(cfg.valueClass, 'font-semibold leading-none text-foreground')}>
                    {Math.round(clampedValue)}
                  </span>
                  {unit ? (
                    <span className={cn(cfg.unitClass, 'font-semibold leading-none text-foreground/80')}>{unit}</span>
                  ) : null}
                </div>
              )}
            </div>
          </div>
          {label != null ? (
            <div data-slot="compliance-gauge-label" className="mt-3 text-center text-body-sm font-semibold leading-none text-muted-foreground">
              {label}
            </div>
          ) : null}
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
