import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
} from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from '../icons'
import { cn } from '../lib/cn'

/**
 * Dialog — modal overlay built on Radix Dialog. [L1 primitive]
 * Wraps Root/Trigger/Portal/Close plus a styled, centered, focus-trapped
 * Overlay + Content for confirmations, forms, and detail modals.
 */
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

export const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, onPointerDown, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-slot="dialog-overlay"
    className={cn(
      'fixed inset-0 z-modal bg-black/50 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
    onPointerDown={(event) => {
      onPointerDown?.(event)
      // The scrim is a pure dismiss affordance — cancel the BROWSER default of
      // pointerdown (focus moves to the nearest focusable ancestor → <body>) so
      // focus never leaves the dialog mid-dismissal (fix4; round-4 P1
      // `dialog-scrim-close-drops-focus`). Dismissal is unaffected: Radix
      // defers outside-pointerdown dismissal to the `click` event
      // (`deferPointerDownOutside`), and `click` still fires for a canceled
      // pointerdown. Content is untouched — text selection inside stays possible.
      event.preventDefault()
    }}
  />
))
DialogOverlay.displayName = 'DialogOverlay'

export const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideClose?: boolean }
>(({ className, children, hideClose, onCloseAutoFocus, onPointerDownOutside, ...props }, ref) => {
  // Focus-return guarantee (UX-NOTES §7: "focus returns to trigger on close").
  // Radix's modal content ALWAYS prevent-defaults its close-auto-focus and
  // focuses `triggerRef` — for a dialog opened programmatically (controlled
  // `open`, no DialogTrigger, e.g. the login forgot-password stub) that ref
  // is null, so focus is silently dropped to <body> on every close path.
  // Fix: capture the element that had focus at the closed→open transition
  // (the content ref callback fires in the commit phase, before any Radix
  // effect moves focus into the dialog) and restore it on close.
  //
  // The ref callback is NOT a reliable "fresh mount" signal: unstable composed
  // refs up the Radix chain make React detach (ref(null)) and re-attach the
  // ref on re-renders — including the dismissal re-render itself (round-4
  // forensics). So a re-attach may observe focus inside the dialog (StrictMode
  // remount, mid-open re-render) or on <body> (scrim pointerdown already ran
  // the browser's focus-on-mousedown default). In BOTH cases the previous
  // capture is kept — <body> carries no ownership information, and nulling the
  // capture here is exactly what dropped focus on scrim-close (fix4 root
  // cause). A fresh capture happens only when a real outside opener has focus.
  const openerRef = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLElement | null>(null)
  const composedRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && !contentRef.current) {
        const active = document.activeElement
        if (active instanceof HTMLElement && active !== document.body && !node.contains(active)) {
          openerRef.current = active
        }
      }
      contentRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )
  // Consumer opt-out (Radix semantics kept): when the consumer's
  // onCloseAutoFocus prevent-defaults, every restore layer stands down.
  const restoreOptOutRef = useRef(false)
  // Path-independent safety net: whatever close path unmounted the content,
  // if focus ended up dropped (on <body>, or on a node the unmount removed)
  // once Radix's own FocusScope unmount handling has run (it defers via
  // setTimeout(0), so this cleanup's own timeout runs in the same task-queue
  // turn — before or after it, both orders converge), return it to the
  // captured opener. Never fights a consumer/app that deliberately moved
  // focus to a live element elsewhere.
  useEffect(() => {
    restoreOptOutRef.current = false
    return () => {
      const opener = openerRef.current
      setTimeout(() => {
        if (restoreOptOutRef.current || !opener?.isConnected) return
        const active = document.activeElement
        const focusDropped =
          active === null ||
          active === document.body ||
          !(active instanceof HTMLElement) ||
          !active.isConnected
        if (focusDropped) opener.focus()
      }, 0)
    }
  }, [])
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={composedRef}
        data-slot="dialog-content"
        aria-modal="true"
        className={cn(
          // token-exempt: symmetric centering needs a physical `left-1/2` — `start-1/2`
          // flips to the far edge under RTL while `-translate-x-1/2` stays physical,
          // landing the modal a full width off-center (see F3). Vertical `top-1/2` is
          // already physical (no logical inset-block equivalent used), so it's untouched.
          'fixed left-1/2 top-1/2 z-modal grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-md border border-border bg-card p-6 text-card-foreground shadow-elevation outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className,
        )}
        {...props}
        // NOTE (fix4): fix3 called `event.detail.originalEvent.preventDefault()`
        // here — a structural no-op: this Radix version defers outside-pointerdown
        // dismissal to the `click` event (`deferPointerDownOutside`), so the
        // original pointerdown has fully dispatched (and the browser's
        // focus-on-mousedown default has run) long before this handler fires.
        // The browser default is now canceled at the source instead — see the
        // overlay's onPointerDown above.
        onPointerDownOutside={onPointerDownOutside}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event)
          if (event.defaultPrevented) {
            restoreOptOutRef.current = true
            return
          }
          const opener = openerRef.current
          if (opener?.isConnected) {
            event.preventDefault()
            opener.focus()
            // Belt and braces for engines that still run a late default click
            // after the restore: if focus fell to <body>, re-assert once on
            // the next frame. Never fights a consumer/app that deliberately
            // moved focus elsewhere (only corrects the <body> drop).
            requestAnimationFrame(() => {
              if (document.activeElement === document.body && opener.isConnected) opener.focus()
            })
          }
        }}
      >
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close
            aria-label="Close"
            // ≥40x40 hit area around the 16px glyph (icon-button standard,
            // UX-NOTES §7 — same treatment as the Input eye toggle). end-1/top-1
            // + size-10 keeps the glyph's visual center exactly where the old
            // end-4/top-4 bare icon sat (4 + 20 = 16 + 8 = 24px from the corner).
            className="absolute end-1 top-1 flex size-10 items-center justify-center rounded-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = 'DialogContent'

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1.5 text-start', className)}
      {...props}
    />
  )
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

export const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    data-slot="dialog-title"
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
))
DialogTitle.displayName = 'DialogTitle'

export const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    data-slot="dialog-description"
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = 'DialogDescription'
