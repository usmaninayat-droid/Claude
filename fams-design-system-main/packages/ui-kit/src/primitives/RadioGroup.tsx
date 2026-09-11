import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { RadioGroup as RadixRadioGroup } from 'radix-ui'
import { Circle } from '../icons'
import { cn } from '../lib/cn'

/**
 * RadioGroup / RadioGroupItem — exclusive single-choice control. [L1 primitive]
 * Dot-in-circle treatment: a filled primary dot inside a size-5 bordered
 * item — border and dot both go `primary` when checked (2px ring look),
 * matching the Checkbox fill/outline language (bg-input-background,
 * border-border) while keeping the selected state unmistakably branded.
 * Focus ring is a soft primary tint, not the generic `ring` token, so the
 * control never flashes an off-brand color inside a tenant theme.
 *
 * @usage-v5
 *   Consolidates ~11 raw `q-radio` / `q-option-group` uses in v5:
 *   - shared/components/cards/ReportAssetList.vue (single-select entity row, `q-radio :val`)
 *   - iwmp/components/inspector/planning/RecurrenceInput.vue (exclusive "ends on" mode, `q-radio v-model`)
 *   - shared/components/preventiveMaintenance/steps/SelectVehicleStep.vue, AssetSelectorDrawer.vue (picker rows)
 *   - fams/ead components/pickers/DatePicker.vue (`q-option-group`, exclusive mode)
 *   Forms needed: plain group (label + item), disabled item, disabled group, RTL label placement.
 * @usage-index radio-group
 */
export const RadioGroup = forwardRef<
  ElementRef<typeof RadixRadioGroup.Root>,
  ComponentPropsWithoutRef<typeof RadixRadioGroup.Root>
>(({ className, ...props }, ref) => (
  <RadixRadioGroup.Root
    ref={ref}
    data-slot="radio-group"
    className={cn('grid gap-2', className)}
    {...props}
  />
))
RadioGroup.displayName = 'RadioGroup'

export const RadioGroupItem = forwardRef<
  ElementRef<typeof RadixRadioGroup.Item>,
  ComponentPropsWithoutRef<typeof RadixRadioGroup.Item>
>(({ className, ...props }, ref) => (
  <RadixRadioGroup.Item
    ref={ref}
    data-slot="radio-group-item"
    className={cn(
      'aspect-square size-5 shrink-0 rounded-full border border-border bg-input-background outline-none transition-shadow',
      'hover:border-primary/50',
      'focus-visible:ring-2 focus-visible:ring-primary/25',
      'data-[state=checked]:border-2 data-[state=checked]:border-primary',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <RadixRadioGroup.Indicator className="flex items-center justify-center">
      <Circle className="size-2.5 fill-primary text-primary" />
    </RadixRadioGroup.Indicator>
  </RadixRadioGroup.Item>
))
RadioGroupItem.displayName = 'RadioGroupItem'
