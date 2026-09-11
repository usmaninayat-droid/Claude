import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from '../icons'
import { cn } from '../lib/cn'

/**
 * Sheet — side-anchored overlay panel, sibling of Dialog. [L1 primitive]
 *
 * Same Radix Dialog primitive as `Dialog`, anchored to an edge (`side`) instead
 * of centered. `left`/`right` are expressed as logical `start`/`end` positions
 * so the panel — and its slide direction — flips automatically under `dir="rtl"`.
 * `top`/`bottom` are direction-neutral. Width beyond the default is a className override.
 *
 * @usage-v5
 *   Consolidates ~25 hand-forked `*Drawer.vue` components in v5, most wrapping the
 *   same `shared/components/drawers/ConfigDrawer.vue` chrome (title/subtitle/content/footer slots):
 *   - iwmp/ead/fams `components/dialog/EntityLinkingDrawer.vue` — 3 near-identical copies
 *   - iwmp/components/drawers/{ApiSelectDrawer,DispatchDrawer,EditScopeDrawer,EntitySelectDrawer,KpiSelectDrawer,DocumentUploadDrawer}.vue
 *   - shared/components/drawers/{AssetListDrawer,ConfigDrawer,EntityDrawer,OdometerDrawer,ProfileDrawer,SubscribeReportDrawer}.vue
 *   - iwmp/components/ticketing/TicketCreateDrawer.vue
 *   Forms needed: side right (default, most common), left, header/footer chrome, hideClose.
 * @usage-index sheet
 */
export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetPortal = DialogPrimitive.Portal
export const SheetClose = DialogPrimitive.Close

export const SheetOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-slot="sheet-overlay"
    className={cn(
      // Flat, uniform dim — no `backdrop-blur`: a blurred scrim samples a
      // DIFFERENT pixel value depending on what's directly behind it (finding,
      // figma-spec-create-sheet.md §1: the Figma scrim samples one flat value
      // everywhere regardless of underlying content, "crisp edge, no blur";
      // the blurred version measurably varied pixel-to-pixel over the board).
      // FIX WAVE C-2 / P0-1 — token z-scale, not a raw `z-50`. `drawer`
      // (1300) sits above the filter panel (1000) and above a filter field's
      // own dropdown (`overlay`, 1200), and below `popover` (1500) so a
      // popover opened INSIDE the sheet still paints over it.
      'fixed inset-0 z-drawer bg-black/60',
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      // Reduced motion is handled PLATFORM-WIDE in `@fams/tokens/animations.css`,
      // NOT with a `motion-reduce:animate-none` utility here: that utility is a
      // single class (0-1-0) and loses to Radix's own
      // `.data-\[state\=open\]\:animate-in[data-state="open"]` (0-2-0) at every
      // source order — it compiled fine and did nothing (UX MUST L.60).
      className,
    )}
    {...props}
  />
))
SheetOverlay.displayName = 'SheetOverlay'

const sheetVariants = cva(
  // Reduced motion: see `SheetOverlay` above — collapsed platform-wide in
  // `@fams/tokens/animations.css`, never with a `motion-reduce:` utility here
  // (it loses on specificity to the `data-[state]` rule it must beat, L.60).
  'fixed z-drawer flex flex-col gap-4 border-border bg-card text-card-foreground shadow-elevation outline-none data-[state=open]:animate-in data-[state=closed]:animate-out',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom: 'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 start-0 h-full w-3/4 border-e sm:max-w-sm ltr:data-[state=closed]:slide-out-to-left ltr:data-[state=open]:slide-in-from-left rtl:data-[state=closed]:slide-out-to-right rtl:data-[state=open]:slide-in-from-right',
        right: 'inset-y-0 end-0 h-full w-3/4 border-s sm:max-w-sm ltr:data-[state=closed]:slide-out-to-right ltr:data-[state=open]:slide-in-from-right rtl:data-[state=closed]:slide-out-to-left rtl:data-[state=open]:slide-in-from-left',
      },
    },
    defaultVariants: { side: 'right' },
  },
)

export interface SheetContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /** Hide the built-in close button (e.g. when the caller supplies its own). */
  hideClose?: boolean
  /**
   * Classes merged onto the `SheetOverlay` scrim — the seam for a surface whose
   * design specifies a different dim than the platform default `bg-black/60`
   * (e.g. the entity-profile side sheet's `Transparent/Black/40` scrim, which
   * `ProfileStack` passes as `bg-black/40`). Scoped per call site on purpose:
   * the platform default stays unchanged for every other sheet, so one
   * surface's measured scrim never silently re-tints all ~25 of them.
   */
  overlayClassName?: string
}

export const SheetContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  ({ side, className, children, hideClose, overlayClassName, ...props }, ref) => (
    <SheetPortal>
      <SheetOverlay className={overlayClassName} />
      <DialogPrimitive.Content
        ref={ref}
        data-slot="sheet-content"
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute end-4 top-4 rounded-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </SheetPortal>
  ),
)
SheetContent.displayName = 'SheetContent'

export function SheetHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1.5 border-b border-border p-6 text-start', className)}
      {...props}
    />
  )
}

export function SheetFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col-reverse gap-2 border-t border-border p-6 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

export const SheetTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    data-slot="sheet-title"
    className={cn('text-base font-semibold text-foreground', className)}
    {...props}
  />
))
SheetTitle.displayName = 'SheetTitle'

export const SheetDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    data-slot="sheet-description"
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
SheetDescription.displayName = 'SheetDescription'

export { sheetVariants }
