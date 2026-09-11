import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { Checkbox as RadixCheckbox } from 'radix-ui'
import { Check } from '../icons'
import { cn } from '../lib/cn'

export interface CheckboxProps
  extends ComponentPropsWithoutRef<typeof RadixCheckbox.Root> {
  /** @deprecated Alias of the native `disabled`, kept for back-compat. */
  isDisabled?: boolean
}

/**
 * Checkbox — aligned to the GH reference DS (`checkbox.tsx`).
 * Fill = bg-input-background; checked = bg-primary; indicator = lucide Check
 * (strokeWidth 3, size-3.5) identical to the Vue package.
 */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, disabled, isDisabled, ...props }, ref) => (
    <RadixCheckbox.Root
      ref={ref}
      data-slot="checkbox"
      disabled={disabled ?? isDisabled}
      className={cn(
        'peer size-4 shrink-0 rounded-xs border border-border bg-input-background outline-none transition-shadow',
        'focus-visible:ring-2 focus-visible:ring-ring',
        'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadixCheckbox.Indicator className="flex items-center justify-center text-current">
        <Check className="size-3.5" strokeWidth={3} />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  ),
)

Checkbox.displayName = 'Checkbox'
