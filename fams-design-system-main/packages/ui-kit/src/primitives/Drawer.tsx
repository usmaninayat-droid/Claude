import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes } from 'react'
import { Drawer as DrawerPrimitive } from 'vaul'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from '../icons'
import { cn } from '../lib/cn'

/**
 * Drawer — gesture-driven bottom sheet built on vaul. [L1 primitive]
 * Ported from `FAMS-Design-System-By-Shaheer` (`src/components/primitives/drawer.tsx`),
 * restyled onto tokens (phase 1 §6).
 *
 * Distinct from `Sheet` (Radix Dialog anchored to an edge, no gestures):
 * `Drawer` is for the drag-to-dismiss, swipe-to-close overlay case — mobile
 * quick-action panels, bottom-anchored pickers. See `docs/COMPONENT-GUIDE.md`.
 *
 * `direction` is scoped to `'bottom' | 'top'` only (vaul's underlying API
 * also accepts `'left' | 'right'`, deliberately not exposed here): those are
 * PHYSICAL values on vaul's side — it computes its drag axis and translate
 * transform directly from them and has no `'start'/'end'` concept, so a
 * left/right Drawer would not auto-flip under `dir="rtl"` the way `Sheet`'s
 * logical `side` prop does (hard rule 4). Reach for `Sheet` for any
 * side-anchored panel; `Drawer` stays limited to the directions that carry
 * no RTL ambiguity.
 */
export const Drawer = ({
  shouldScaleBackground = false,
  ...props
}: ComponentPropsWithoutRef<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
)
Drawer.displayName = 'Drawer'

// Explicit `typeof DrawerPrimitive.X` annotations below (rather than letting
// TS infer the exported type) are load-bearing, not decoration: `vaul`
// depends on `@radix-ui/react-dialog` as its OWN private transitive
// dependency (not a direct `ui-kit` dependency — decision #7 bans adding one
// just for this), so the raw inferred type lives at a pnpm store path that
// isn't a stable/portable name for `ui-kit`'s emitted `.d.ts` (TS2742). The
// annotation makes the emitted declaration reference the public `vaul`
// export instead.
export const DrawerTrigger: typeof DrawerPrimitive.Trigger = DrawerPrimitive.Trigger
export const DrawerPortal = DrawerPrimitive.Portal
export const DrawerClose: typeof DrawerPrimitive.Close = DrawerPrimitive.Close

export const DrawerOverlay: typeof DrawerPrimitive.Overlay = forwardRef<
  ElementRef<typeof DrawerPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    data-slot="drawer-overlay"
    className={cn('fixed inset-0 z-drawer bg-black/50 backdrop-blur-sm', className)}
    {...props}
  />
))
DrawerOverlay.displayName = 'DrawerOverlay'

const drawerVariants = cva(
  'fixed inset-x-0 z-drawer flex max-h-[85vh] flex-col border-border bg-card text-card-foreground shadow-elevation outline-none',
  {
    variants: {
      direction: {
        bottom: 'bottom-0 rounded-t-md border-t',
        top: 'top-0 rounded-b-md border-b',
      },
    },
    defaultVariants: { direction: 'bottom' },
  },
)

export interface DrawerContentProps
  extends Omit<ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>, 'ref'>,
    VariantProps<typeof drawerVariants> {
  /** Hide the built-in drag handle (e.g. when the caller wants a plain header only). */
  hideHandle?: boolean
  /** Hide the built-in close button. */
  hideClose?: boolean
}

export const DrawerContent = forwardRef<ElementRef<typeof DrawerPrimitive.Content>, DrawerContentProps>(
  ({ direction, className, children, hideHandle, hideClose, ...props }, ref) => (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        data-slot="drawer-content"
        className={cn(drawerVariants({ direction }), className)}
        {...props}
      >
        {hideHandle ? null : (
          <DrawerPrimitive.Handle className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-muted" />
        )}
        {children}
        {hideClose ? null : (
          <DrawerPrimitive.Close
            aria-label="Close"
            className="absolute end-4 top-4 rounded-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
          >
            <X className="size-4" />
          </DrawerPrimitive.Close>
        )}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  ),
)
DrawerContent.displayName = 'DrawerContent'

export function DrawerHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn('flex flex-col gap-1.5 p-6 pb-2 text-start', className)}
      {...props}
    />
  )
}

export function DrawerFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn('mt-auto flex flex-col-reverse gap-2 border-t border-border p-6 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

export const DrawerTitle: typeof DrawerPrimitive.Title = forwardRef<
  ElementRef<typeof DrawerPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    data-slot="drawer-title"
    className={cn('text-base font-semibold text-foreground', className)}
    {...props}
  />
))
DrawerTitle.displayName = 'DrawerTitle'

export const DrawerDescription: typeof DrawerPrimitive.Description = forwardRef<
  ElementRef<typeof DrawerPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    data-slot="drawer-description"
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DrawerDescription.displayName = 'DrawerDescription'

export { drawerVariants }
