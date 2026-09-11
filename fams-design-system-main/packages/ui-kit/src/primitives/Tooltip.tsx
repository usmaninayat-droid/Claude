import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes } from 'react'
import { Tooltip as TooltipPrimitive } from 'radix-ui'
import { cn } from '../lib/cn'

export const TooltipProvider = TooltipPrimitive.Provider
export const TooltipTrigger = TooltipPrimitive.Trigger

/**
 * Tooltip — wraps Root + Provider so callers don't have to mount a
 * TooltipProvider per-usage. Nest under one app-level `<TooltipProvider>`
 * for shared `delayDuration` if many tooltips are on one screen.
 */
export function Tooltip(props: ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root {...props} />
    </TooltipPrimitive.Provider>
  )
}

export interface TooltipContentProps
  extends ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  /**
   * Renders a token-filled pointing arrow toward the trigger, on the side
   * facing it. On by default — every tooltip consumer should point at its
   * trigger; pass `false` only for the rare case that can't accommodate one.
   */
  showArrow?: boolean
}

export const TooltipContent = forwardRef<ElementRef<typeof TooltipPrimitive.Content>, TooltipContentProps>(
  ({ className, sideOffset = 6, showArrow = true, children, ...props }, ref) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'z-tooltip rounded-sm bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-elevation',
          'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:zoom-in-95',
          className,
        )}
        {...props}
      >
        {children}
        {showArrow && (
          <TooltipPrimitive.Arrow data-slot="tooltip-arrow" className="fill-foreground" width={12} height={8} />
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  ),
)
TooltipContent.displayName = 'TooltipContent'

/**
 * TooltipSupport — optional secondary line for multi-line hints, rendered
 * under the primary tooltip text at reduced emphasis. Purely presentational;
 * place inside `TooltipContent` after the main message.
 */
export function TooltipSupport({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="tooltip-support"
      className={cn('mt-1 text-body-xs font-normal text-background/80', className)}
      {...props}
    />
  )
}
