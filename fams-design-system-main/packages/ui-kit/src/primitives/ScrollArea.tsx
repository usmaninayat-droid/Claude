import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'
import { cn } from '../lib/cn'

/**
 * ScrollArea — themed scroll container with a custom thin scrollbar. [L1 primitive]
 * Renders both vertical and horizontal scrollbars + corner; Radix auto-hides
 * whichever axis has no overflow, so one component covers both cases.
 *
 * @usage-v5
 *   Replaces two parallel mechanisms across v5 (packages/{shared,iwmp,fams,ead}):
 *   - `q-scroll-area` (Quasar) — 51 files (menus, tab panels, modals, chart legends).
 *   - Hand-rolled `::-webkit-scrollbar` CSS — 19 files, e.g.
 *     shared/components/tables/BaseTable.vue (hardcoded `#9c9c9c57` thumb color,
 *     Webkit-only so no Firefox styling).
 *   Forms needed: vertical list, horizontal strip, dir="rtl".
 * @usage-index scroll-area
 */
export const ScrollArea = forwardRef<
  ElementRef<typeof ScrollAreaPrimitive.Root>,
  ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    data-slot="scroll-area"
    className={cn('relative overflow-hidden', className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport data-slot="scroll-area-viewport" className="size-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar orientation="vertical" />
    <ScrollBar orientation="horizontal" />
    <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" className="bg-border" />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = 'ScrollArea'

export const ScrollBar = forwardRef<
  ElementRef<typeof ScrollAreaPrimitive.Scrollbar>,
  ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Scrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitive.Scrollbar
    ref={ref}
    orientation={orientation}
    data-slot="scroll-area-scrollbar"
    className={cn(
      'flex touch-none select-none p-0.5 transition-colors',
      orientation === 'vertical' && 'h-full w-2.5',
      orientation === 'horizontal' && 'h-2.5 w-full flex-col',
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.Thumb data-slot="scroll-area-thumb" className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.Scrollbar>
))
ScrollBar.displayName = 'ScrollBar'
