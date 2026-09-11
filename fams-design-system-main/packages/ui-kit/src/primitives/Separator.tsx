import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { Separator as SeparatorPrimitive } from 'radix-ui'
import { cn } from '../lib/cn'

/**
 * Separator — thin visual/semantic divider between content. [L1 primitive]
 *
 * Orientation-aware: horizontal rule (full width, hairline tall) or vertical
 * rule (full height, hairline wide) for inline groupings. `decorative` (default `true`)
 * marks it purely visual for a11y — set `false` when it separates distinct
 * sections a screen reader should announce (`role="separator"`).
 *
 * @usage-v5
 *   Replaces `q-separator`, used 131× across shared/iwmp/fams/ead component
 *   packages (mostly horizontal, ~31 files use the vertical variant):
 *   - shared/components/cards/{TripDetailCard,ExpansionCard}.vue — card section dividers
 *   - iwmp/components/pipeline/PipelineProfile.vue — both orientations, incl.
 *     `q-separator vertical` between inline stat groups
 *   Forms needed: orientation {horizontal|vertical}, decorative boolean.
 *   No color/size variants observed beyond the border-color token itself.
 * @usage-index separator
 */
export const Separator = forwardRef<
  ElementRef<typeof SeparatorPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    data-slot="separator"
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'shrink-0 bg-border',
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      className,
    )}
    {...props}
  />
))
Separator.displayName = 'Separator'
