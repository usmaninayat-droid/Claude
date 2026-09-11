import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { Label as RadixLabel } from 'radix-ui'
import { cn } from '../lib/cn'

/**
 * Label — form field label built on Radix Label. [L1 primitive]
 * Pairs with any input via native `htmlFor`; dims automatically when the
 * associated control carries `peer-disabled`.
 */
export type LabelProps = ComponentPropsWithoutRef<typeof RadixLabel.Root>

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <RadixLabel.Root
      ref={ref}
      className={cn(
        'flex items-center gap-2 text-sm font-medium leading-none text-foreground select-none',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)

Label.displayName = 'Label'
