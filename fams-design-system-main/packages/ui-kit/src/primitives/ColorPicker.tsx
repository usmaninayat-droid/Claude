import { forwardRef, useId, type ComponentPropsWithoutRef } from 'react'
import { HexColorPicker, HexColorInput } from 'react-colorful'
import { Check } from '../icons'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'
import { Popover, PopoverTrigger, PopoverContent } from './Popover'
import { Label } from './Label'

/**
 * ColorPicker — swatch trigger that opens a Popover hosting a color canvas,
 * a validated hex field, and an optional preset row. [L1 primitive]
 *
 * The canvas itself is `react-colorful`'s `HexColorPicker` — we style the
 * chrome around it (swatch, popover, hex field, presets), never the canvas
 * internals. Fully controlled via `value`/`onChange`: no internal color
 * state, no fetch, no persistence — the caller owns the value.
 *
 * @usage-v5
 *   Consolidates the "avatar swatch + q-popup-proxy + q-color" pattern in:
 *   - shared/components/pickers/ColorPickerPopup.vue — swatch avatar opens a
 *     `q-popup-proxy` hosting `q-color` (canvas) plus a nested picker component
 *   - shared/components/pickers/ColorPicker.vue — palette row (hardcoded hex
 *     array) with a "+" swatch that opens its own `q-color` popup
 *   - shared/components/pickers/AssetColorPicker.vue, views/settings/Appearance.vue,
 *     views/settings/Notifications.vue, views/settings/Tags.vue — same shape
 *     re-implemented per feature with a different hardcoded palette each time
 *   Forms needed: swatch trigger (sizes), canvas + hex input, optional preset
 *   row supplied by the caller (no built-in default palette), disabled.
 * @usage-index color-picker
 */

const swatchVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-sm border border-border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'size-7',
        md: 'size-9',
        lg: 'size-11',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

export interface ColorPickerProps extends VariantProps<typeof swatchVariants> {
  /** Current color as a hex string. */
  value: string
  /** Fires with the new hex string — canvas drag, hex typing, or a preset click. */
  onChange: (value: string) => void
  /** Quick-pick swatches rendered above the canvas. Omit to hide the row — there is no built-in default palette. */
  presets?: string[]
  /** Disables the trigger and prevents opening the popover. */
  disabled?: boolean
  /** Accessible name for the swatch trigger (it carries no visible text). */
  label?: string
  /** Controlled open state, forwarded to the underlying Popover. */
  open?: boolean
  /** Uncontrolled initial open state, forwarded to the underlying Popover. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Popover content alignment relative to the trigger. */
  align?: ComponentPropsWithoutRef<typeof PopoverContent>['align']
  /** Class applied to the popover content shell. */
  className?: string
  /** Class applied to the swatch trigger button. */
  triggerClassName?: string
}

export const ColorPicker = forwardRef<HTMLButtonElement, ColorPickerProps>(
  (
    {
      value,
      onChange,
      presets = [],
      disabled,
      label = 'Pick a color',
      size,
      open,
      defaultOpen,
      onOpenChange,
      align = 'start',
      className,
      triggerClassName,
    },
    ref,
  ) => {
    const hexInputId = useId()

    return (
      <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            aria-label={label}
            data-slot="color-picker-trigger"
            className={cn(swatchVariants({ size }), triggerClassName)}
            style={{ backgroundColor: value }}
          />
        </PopoverTrigger>

        <PopoverContent
          align={align}
          aria-label={label}
          data-slot="color-picker-content"
          className={cn('w-56 space-y-3', className)}
        >
          {presets.length > 0 ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Presets">
              {presets.map((preset) => {
                const active = preset.toLowerCase() === value.toLowerCase()
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onChange(preset)}
                    aria-label={`Use preset ${preset}`}
                    aria-pressed={active}
                    data-slot="color-picker-preset"
                    className="relative size-6 shrink-0 rounded-xs border border-border outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring hover:scale-105"
                    style={{ backgroundColor: preset }}
                  >
                    {active ? (
                      <Check
                        aria-hidden="true"
                        className="absolute inset-0 m-auto size-3.5 text-white mix-blend-difference"
                      />
                    ) : null}
                  </button>
                )
              })}
            </div>
          ) : null}

          <HexColorPicker color={value} onChange={onChange} className="!w-full" />

          <div className="space-y-1">
            <Label htmlFor={hexInputId}>Hex</Label>
            <HexColorInput
              id={hexInputId}
              color={value}
              onChange={onChange}
              prefixed
              className={cn(
                'h-9 w-full rounded-sm border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary',
              )}
            />
          </div>
        </PopoverContent>
      </Popover>
    )
  },
)

ColorPicker.displayName = 'ColorPicker'

export { swatchVariants as colorPickerSwatchVariants }
