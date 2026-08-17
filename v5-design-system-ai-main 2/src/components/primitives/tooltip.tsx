import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../utils/cn';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * TooltipContent — dark by default, matching Figma "Tooltips" (Color Mode = Dark):
 * neutral/darkest #101828 surface, Gilroy 12px, 8px radius, 12px padding,
 * Shadows/Standard/lg, with a pointing arrow.
 */
export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & { showArrow?: boolean }
>(({ className, sideOffset = 6, showArrow = true, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 max-w-xs overflow-hidden rounded-lg bg-popover p-3 text-caption font-semibold leading-[18px] text-popover-foreground shadow-lg',
        'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        'data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1',
        className,
      )}
      {...props}
    >
      {children}
      {showArrow && <TooltipPrimitive.Arrow className="fill-popover" width={12} height={6} />}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = 'TooltipContent';

/** Optional support line under the tooltip title (Figma "support text"). */
export function TooltipSupport({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 font-medium text-popover-foreground/90">{children}</p>;
}
