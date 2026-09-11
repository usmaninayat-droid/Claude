import { forwardRef, type HTMLAttributes } from 'react'
import { Progress } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

/**
 * RadialProgress — single-value circular progress ring. [L1 primitive]
 *
 * Pure inline SVG, no charting engine — a progress indicator, not a donut
 * chart. Wrapped in Radix's `Progress` primitive for `role="progressbar"`
 * plus `aria-valuemin/max/now/text`. Color is a closed `tone` enum resolved
 * to a token text-color class, painted onto the arc via `stroke-current`;
 * omit `tone` to auto-resolve from `value` against fixed thresholds
 * (<40 danger, 40-79 warning, >=80 success). Center label shows the rounded
 * percentage; pass `hideLabel` for a bare ring (e.g. a dense table cell).
 *
 * @usage-v5
 *   No dedicated ring primitive exists; the same "single score, 0-100" ring
 *   is hand-built per-package on ApexCharts `radialBar`:
 *   - {iwmp,fams,ead}/components/charts/SemiPieChart.vue (byte-similar x3)
 *     — value/title/centerLabel/unit props, consumed 8x incl.
 *     shared/components/profile/DriverSafetyOverview.vue (safety score) and
 *     shared/.../vehicle/FuelMonitoring.vue (fuel level ring)
 *   Forms needed: value 0-100, size/strokeWidth, status tone or auto by
 *   threshold, optional hidden label for table-cell density.
 * @usage-index radial-progress
 */
const radialProgressVariants = cva('', {
  variants: {
    tone: {
      primary: 'text-primary',
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-destructive',
      neutral: 'text-muted-foreground',
    },
  },
  defaultVariants: { tone: 'primary' },
})

export type RadialProgressTone = NonNullable<VariantProps<typeof radialProgressVariants>['tone']>

export interface RadialProgressProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'color' | 'children'> {
  /** Progress value, 0-100. Out-of-range values are clamped. */
  value: number
  /** Ring diameter in px (square). Default 40. */
  size?: number
  /** Ring stroke width in px. Default 4. */
  strokeWidth?: number
  /**
   * Status color. Omit to auto-resolve from `value`: <40 danger,
   * 40-79 warning, >=80 success. An explicit tone always wins.
   */
  tone?: RadialProgressTone
  /** Hide the centered percentage label; the ring itself still renders. */
  hideLabel?: boolean
}

function resolveTone(value: number): RadialProgressTone {
  if (value >= 80) return 'success'
  if (value >= 40) return 'warning'
  return 'danger'
}

export const RadialProgress = forwardRef<HTMLDivElement, RadialProgressProps>(
  ({ className, value, size = 40, strokeWidth = 4, tone, hideLabel, ...props }, ref) => {
    const clamped = Math.min(100, Math.max(0, value))
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const dashOffset = circumference * (1 - clamped / 100)
    const resolvedTone = tone ?? resolveTone(clamped)

    return (
      <Progress.Root
        ref={ref}
        value={clamped}
        data-slot="radial-progress"
        className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
        style={{ width: size, height: size }}
        {...props}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-border"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={cn(
              radialProgressVariants({ tone: resolvedTone }),
              'stroke-current transition-[stroke-dashoffset] duration-300 ease-out',
            )}
          />
        </svg>
        {!hideLabel ? (
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center text-caption font-semibold tabular-nums text-foreground"
          >
            {Math.round(clamped)}%
          </span>
        ) : null}
      </Progress.Root>
    )
  },
)

RadialProgress.displayName = 'RadialProgress'

export { radialProgressVariants }
