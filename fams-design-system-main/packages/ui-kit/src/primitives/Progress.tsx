import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { Progress as ProgressPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

/**
 * Progress — determinate linear progress bar. [L1 primitive]
 *
 * `value` 0-100 drives a width-based indicator anchored at the logical start
 * edge (`start-0`), so the fill grows toward the end in both LTR and RTL
 * without any transform math. Radix `Root`/`Indicator` supplies
 * `role="progressbar"` + `aria-valuenow/min/max`.
 *
 * @usage-v5
 *   Replaces ~11 ad-hoc `q-linear-progress` usages in v5:
 *   - iwmp/components/charts/ProgressBar.vue, StatisticCard.vue, ContractCard.vue
 *     (value/100, custom `color`, `size="4px|7px"` per call site)
 *   - shared/components/preventiveMaintenance/ProgressIndicator.vue (4x)
 *   - iwmp/components/charts/{BreakdownTable,ComparisonChart,RmccStopLevelMonitoring,CompianceBreakdown}.vue
 *   Forms needed: value 0-100, size {sm|md}. Color was per-call-site hex/Quasar
 *   color — collapses to the single `bg-primary` token here.
 * @usage-index progress
 */
const progressVariants = cva('relative w-full overflow-hidden rounded-full bg-secondary', {
  variants: {
    size: {
      sm: 'h-1.5',
      md: 'h-2',
    },
  },
  defaultVariants: { size: 'md' },
})

export interface ProgressProps
  extends ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  /** Current progress, 0-100. */
  value?: number
}

export const Progress = forwardRef<ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, value = 0, size, ...props }, ref) => {
    const clamped = Math.min(100, Math.max(0, value))
    return (
      <ProgressPrimitive.Root
        ref={ref}
        data-slot="progress"
        value={clamped}
        className={cn(progressVariants({ size }), className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="absolute inset-y-0 start-0 h-full bg-primary transition-all"
          style={{ width: `${clamped}%` }}
        />
      </ProgressPrimitive.Root>
    )
  },
)

Progress.displayName = 'Progress'

export { progressVariants }
