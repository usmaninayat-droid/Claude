import { forwardRef, useState, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

/**
 * A single value (one thumb) or a `[start, end]` tuple (two thumbs, range mode).
 */
export type SliderValue = number | [number, number]

const sliderTrackVariants = cva('relative w-full grow overflow-hidden rounded-full bg-secondary', {
  variants: {
    size: {
      sm: 'h-1',
      md: 'h-1.5',
      lg: 'h-2',
    },
  },
  defaultVariants: { size: 'md' },
})

const sliderThumbVariants = cva(
  'relative block shrink-0 rounded-full border-2 border-primary bg-background shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none',
  {
    variants: {
      size: {
        sm: 'size-3.5',
        md: 'size-4',
        lg: 'size-5',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

function toArray(v: SliderValue | undefined): number[] | undefined {
  if (v === undefined) return undefined
  return Array.isArray(v) ? v : [v]
}

export interface SliderProps
  extends Omit<
      ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
      'value' | 'defaultValue' | 'onValueChange' | 'min' | 'max' | 'step' | 'disabled'
    >,
    VariantProps<typeof sliderTrackVariants> {
  /**
   * Current value. A plain `number` renders a single thumb; a `[start, end]`
   * tuple renders two thumbs (range mode). Omit for uncontrolled use.
   */
  value?: SliderValue
  /** Initial value for uncontrolled use — same shape rules as `value`. */
  defaultValue?: SliderValue
  /**
   * Fires on every thumb move. Payload shape mirrors `value`/`defaultValue`:
   * a `number` in single-thumb mode, a `[start, end]` tuple in range mode.
   */
  onValueChange?: (value: SliderValue) => void
  /** Lower bound. @default 0 */
  min?: number
  /** Upper bound. @default 100 */
  max?: number
  /** Increment per step. @default 1 */
  step?: number
  /** Disables all thumbs. */
  disabled?: boolean
  /** @deprecated Alias of the native `disabled`, kept for back-compat. */
  isDisabled?: boolean
  /**
   * Formats the value shown in an always-visible label above each thumb
   * (e.g. `(v) => \`${v}%\`` or a timestamp formatter for a playback
   * scrubber). Omit to render a bare track + thumb(s) with no label.
   */
  formatLabel?: (value: number) => string
}

/**
 * Slider — draggable/keyboard-operable value picker built on Radix `Slider`. [L1 primitive]
 *
 * One flexible primitive covers both v5 shapes ported from `q-slider` (22
 * usages): a single-thumb numeric input (e.g. bin fill level %, target load
 * %) and a playback scrubber. Passing a `[start, end]` tuple instead of a
 * `number` switches to range mode (two thumbs) — nothing else changes.
 * Radix supplies `role="slider"`, `aria-valuenow/min/max`, keyboard
 * (arrow/page/home/end), and RTL-aware thumb positioning.
 *
 * @usage-v5
 *   Replaces `q-slider`, 22 usages across shared/iwmp/ead component packages
 *   and modules — two observed shapes:
 *   - Single numeric input: iwmp_smart_planning/CapacityPlanningPanel.vue
 *     (`fillLevel`/`vehicleLoadTarget`, min/max/step, value shown beside the
 *     track), asset/vehicle panels (thresholds/targets)
 *   - Playback scrubber: trip/Index.vue, livemonitoring Index.vue,
 *     AssetTrips.vue (`currentIndex` over `replay_coords`, `label-value`
 *     showing the current timestamp above the thumb while dragging)
 *   Forms needed: min/max/step, disabled, always-visible formatted label.
 *   Start/end time text flanking the track (as in the scrubber) is
 *   call-site presentation, not this primitive's concern — it composes
 *   around `Slider`, it isn't rendered by it.
 * @usage-index slider
 */
export const Slider = forwardRef<ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  (
    {
      className,
      value,
      defaultValue,
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      size,
      disabled,
      isDisabled,
      formatLabel,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      ...props
    },
    ref,
  ) => {
    const isRange = Array.isArray(value ?? defaultValue)
    const [internalValue, setInternalValue] = useState<number[]>(() => toArray(value ?? defaultValue) ?? [min])
    const currentValue = toArray(value) ?? internalValue
    const isDisabledFinal = disabled ?? isDisabled ?? false

    const handleValueChange = (next: number[]) => {
      setInternalValue(next)
      onValueChange?.(isRange ? ([next[0], next[1]] as [number, number]) : next[0])
    }

    return (
      <SliderPrimitive.Root
        ref={ref}
        data-slot="slider"
        min={min}
        max={max}
        step={step}
        disabled={isDisabledFinal}
        value={currentValue}
        onValueChange={handleValueChange}
        className={cn(
          'relative flex w-full touch-none select-none items-center data-[disabled]:opacity-50',
          className,
        )}
        {...props}
      >
        <SliderPrimitive.Track data-slot="slider-track" className={cn(sliderTrackVariants({ size }))}>
          <SliderPrimitive.Range data-slot="slider-range" className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        {currentValue.map((thumbValue, index) => (
          <SliderPrimitive.Thumb
            key={index}
            data-slot="slider-thumb"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            className={cn(sliderThumbVariants({ size }))}
          >
            {formatLabel ? (
              <span
                aria-hidden="true"
                // token-exempt: symmetric centering needs a physical `left-1/2` —
                // `start-1/2` flips to the far edge under RTL while `-translate-x-1/2`
                // stays physical, landing the label a full width off-center (see F3).
                className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-foreground px-1.5 py-0.5 text-xs text-background"
              >
                {formatLabel(thumbValue)}
              </span>
            ) : null}
          </SliderPrimitive.Thumb>
        ))}
      </SliderPrimitive.Root>
    )
  },
)

Slider.displayName = 'Slider'

export { sliderTrackVariants, sliderThumbVariants }
