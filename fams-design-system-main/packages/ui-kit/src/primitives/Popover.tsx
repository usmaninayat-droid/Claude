import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { cn } from '../lib/cn'

/**
 * Popover — Radix-backed floating panel anchored to a trigger. [L1 primitive]
 * Wraps Root/Trigger/Anchor plus a styled, portalled Content for filters,
 * inline pickers, and lightweight non-modal overlays.
 */
export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverAnchor = PopoverPrimitive.Anchor

export const PopoverContent = forwardRef<
  ElementRef<typeof PopoverPrimitive.Content>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      data-slot="popover-content"
      align={align}
      sideOffset={sideOffset}
      className={cn(
        // FIX WAVE C-2 / P0-1 — the semantic z-scale, never a raw `z-50`.
        // Popovers sit ABOVE sheets/drawers on purpose: a sort or
        // column-settings popover opened from inside a sheet must paint over
        // it. Callers that need a LOWER layer (the filter panel's own field
        // dropdown, which a sheet must cover) pass their own `z-*` token and
        // `cn` now resolves the conflict.
        'z-popover w-72 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-elevation outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = 'PopoverContent'
