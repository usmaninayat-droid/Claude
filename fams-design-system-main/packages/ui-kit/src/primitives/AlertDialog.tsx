import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
  type Ref,
} from 'react'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'
import { cn } from '../lib/cn'
import { buttonVariants } from './Button'

/**
 * AlertDialog — mandatory confirmation modal for actions that need explicit
 * user sign-off before proceeding. [L1 primitive]
 *
 * Unlike Dialog, this is NOT dismissible by an outside click — Radix's
 * alert-dialog semantics omit `onPointerDownOutside`/`onInteractOutside`
 * entirely, so the user must choose Cancel or Action. Same fade+zoom
 * animation and RTL logical positioning as Dialog.
 *
 * `AlertDialogAction` composes `buttonVariants({ variant: 'destructive' })`
 * and `AlertDialogCancel` composes `buttonVariants({ variant: 'tertiary' })`
 * so confirm/cancel styling can never drift from Button.
 *
 * @usage-v5
 *   116 raw `q-dialog` confirmation blocks across ~90 files in
 *   shared/iwmp/fams/ead — mostly hand-rolled per instance, not reused.
 *   Three near-duplicate shared attempts exist (98% overlapping):
 *   shared/components/cards/ConfirmDialog.vue,
 *   shared/components/pipeline/ConfirmationDialog.vue,
 *   iwmp/components/dialog/ConfirmationDialog.vue — each only 1-3 consumers.
 *   Danger styling is ad hoc (hardcoded hex, `color="negative"`).
 *   Labels seen: "Cancel"/"Yes, delete it", "Cancel"/"Confirm", "Keep
 *   Document"/"Delete". Forms needed: title, description, cancel label,
 *   destructive action label — exactly this component's slots.
 * @usage-index alert-dialog
 */
export const AlertDialog = AlertDialogPrimitive.Root
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger
export const AlertDialogPortal = AlertDialogPrimitive.Portal

export const AlertDialogOverlay = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    data-slot="alert-dialog-overlay"
    className={cn(
      'fixed inset-0 z-modal bg-black/50 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
))
AlertDialogOverlay.displayName = 'AlertDialogOverlay'

/**
 * Every confirm dialog restores focus to whatever opened it, on EVERY close
 * path — Escape, Cancel, and the destructive action alike. This is done here,
 * once, rather than in each caller, so no confirmation surface in the system
 * can ship without it.
 *
 * Radix does not reliably do this for a CONTROLLED `AlertDialog` — the shape
 * every caller here uses, an `open`/`onOpenChange` pair with no
 * `AlertDialogTrigger` inside the Root. With no Trigger element to hand back
 * to, its close-time restore was a no-op: measured live, closing the bulk
 * delete confirm emitted a `focusout` from `Cancel` and NO `focusin` at all,
 * leaving `document.activeElement === document.body` — a keyboard or
 * screen-reader user dumped at the top of the document, mid-task, with the
 * `Delete` button they had just pressed still sitting on screen.
 *
 * The capture has to happen in `onOpenAutoFocus`, not in an effect: Radix's
 * `FocusScope` dispatches that event BEFORE it moves focus into the dialog,
 * so `document.activeElement` is still the opener. By the time any effect of
 * ours could run, focus is already on `Cancel`.
 *
 * Capturing `document.activeElement` verbatim is NOT enough, and that is the
 * subtle part. The overwhelmingly common opener of a confirm dialog is a
 * `[role="menuitem"]` in a `DropdownMenu` — and that menu unmounts the instant
 * the dialog opens. By close time the captured element's `isConnected` is
 * `false`, the restore bails, and the user lands on `<body>` (Escape / the
 * destructive action) or on whatever Radix's own fallback happens to reach
 * (measured live: an unrelated `"Close all records"` button, three rows away).
 *
 * So the opener is RESOLVED, not merely recorded, in two steps:
 *
 *  1. If the active element sits inside a TRANSIENT LAYER — a `role="menu"` or
 *     `role="listbox"` popup that closes behind the dialog — the layer's own
 *     opener is recorded instead, because that one survives. The relationship
 *     is read explicitly, never guessed from DOM position: Radix stamps the
 *     popup's `aria-labelledby` with its trigger's id, and the trigger also
 *     carries `aria-haspopup` + `aria-expanded="true"` while the layer is up.
 *     The walk repeats (bounded) so a submenu item resolves through its parent
 *     menu item all the way out to the root trigger. Nothing about this is
 *     menu-specific in spirit: any dialog opened from any transient layer
 *     restores to whatever opened that layer.
 *
 *  2. Some openers legitimately CEASE TO EXIST on the happy path. The bulk
 *     action bar's `Delete` is the case that proved it: a successful delete
 *     clears the selection, the bar unmounts, and there is no button left to
 *     return to. Restoring to a vanished node is impossible and `<body>` is the
 *     bug, so the dialog falls back to the nearest SURVIVING landmark ancestor
 *     of the opener — the records region / grid the user was working in. That
 *     chain is captured at open time (while the opener is still in the tree)
 *     and the first still-connected entry wins at close time. A landmark is
 *     usually not focusable, so it is given `tabindex="-1"` before being
 *     focused; that is the standard "move focus to a region" technique and
 *     leaves it out of the Tab order.
 *
 * Callers that know better than this heuristic can name the fallback with
 * `focusRestoreFallback` (a selector or a getter). It is deliberately generic —
 * this is an L1 primitive and nothing about any one product may leak into it.
 *
 * ---
 *
 * WHEN the restore happens turned out to matter as much as WHERE, and that is
 * the third bug this block has had to absorb.
 *
 * `onCloseAutoFocus` is an UNMOUNT-time event. Radix keeps the Content mounted
 * for the whole exit animation (`Presence` waits on `animationend`), and this
 * component's own `data-[state=closed]:animate-out` is ~300ms long. So for
 * ~300ms after the user has closed the dialog — after it is visually gone —
 * the resolved restore has not run yet, and `document.activeElement` is still
 * the `Cancel`/`Delete` button INSIDE the corpse.
 *
 * That window is not merely a lag; it is actively defended. Instrumented live
 * (every `focusin` plus a patched `HTMLElement.prototype.focus` logging its
 * stack), the close of a row-menu confirm reads:
 *
 *   t+0ms    focus()  "More actions for IMS-12301"   ← Radix's own restore
 *   t+0ms    focus()  alert-dialog-cancel            ← FocusScope.handleFocusOut
 *   t+336ms  focus()  "More actions for IMS-12301"   ← our onCloseAutoFocus
 *
 * Radix's `FocusScope` is still TRAPPED while the closed dialog animates out,
 * so any attempt to leave it — Radix's own included — is immediately clawed
 * back. Where focus is claimed to during that window depends on what other
 * layers are on screen: measured readings included the dialog's own `Cancel`
 * and, with a stacked record sheet behind, that sheet's first tabbable —
 * `"Close all records"`, the unrelated control the gate kept reporting.
 *
 * This also explains the shape that looked like a pointer-vs-keyboard split:
 * nothing about the close GESTURE differs. `Escape` merely takes a couple more
 * event-loop turns to dispatch than `click()` does, so an assertion taken
 * immediately after sometimes lands past the window and sometimes inside it.
 * The keyboard path was never correct — it was early enough, sometimes.
 *
 * So the restore is moved off unmount and onto the moment the dialog actually
 * CLOSES: a `MutationObserver` on the Content's own `data-state` fires the
 * instant it flips to `closed`, and the closing Content is marked `inert`
 * first. `inert` is the honest description of a dialog that is shut and merely
 * fading — not interactive, not focusable, out of the a11y tree — and it is
 * also what disarms `FocusScope`'s claw-back, so the restore lands and STAYS.
 * `onCloseAutoFocus` is kept as the fallback for environments with no exit
 * animation (jsdom, `prefers-reduced-motion`), where unmount IS the close.
 */

/**
 * Popup roles that unmount behind a dialog. Their contents are never a valid
 * focus-restore target; the element that OPENED them is.
 */
const TRANSIENT_LAYER_SELECTOR = '[role="menu"],[role="listbox"]'

/**
 * Surviving containers worth returning focus to when the opener itself is
 * gone. `[data-focus-restore-landmark]` is the explicit opt-in for surfaces
 * whose container is none of the standard roles.
 */
const LANDMARK_SELECTOR =
  '[data-focus-restore-landmark],[role="grid"],[role="table"],table,[role="region"],main,[role="main"],dialog,[role="dialog"]'

/** Bounded so a pathological (or cyclic) aria graph cannot spin. */
const MAX_LAYER_DEPTH = 4

/**
 * Last element that genuinely held focus, tracked document-wide.
 *
 * `onOpenAutoFocus` fires before Radix moves focus INTO the dialog, but it does
 * NOT fire before the layer the opener lived in tears itself down. A
 * `DropdownMenu` closing in the same commit that opens the dialog can hand
 * focus back to `<body>` first, and then `document.activeElement` at capture
 * time is worth nothing. One passive, capture-phase `focusin` listener keeps
 * the last real focus target, so the capture has something truthful to fall
 * back on. Cheap (one listener for the whole app), and it never retains the
 * dialog's own contents — those would be a circular restore target.
 */
let lastFocusedElement: HTMLElement | null = null
if (typeof document !== 'undefined') {
  document.addEventListener(
    'focusin',
    (event) => {
      const target = event.target
      if (!(target instanceof HTMLElement) || target === document.body) return
      // The role is matched alongside our `data-slot` because a caller may
      // pass its own `data-slot` (the props spread wins), and losing this
      // guard would let the dialog's own buttons become the restore target.
      if (target.closest('[role="alertdialog"],[data-slot="alert-dialog-content"]')) return
      lastFocusedElement = target
    },
    true,
  )
}

/**
 * The element that opened `layer`, read from the explicit ARIA relationship
 * Radix (and correct hand-rolled markup) already publishes.
 *
 * There is no unqualified page-wide guess. A prior version's last resort was
 * a bare `document.querySelector('[aria-haspopup][aria-expanded="true"]')` —
 * whichever trigger matched FIRST in document order, with no check that it
 * had anything to do with `layer` at all. With a second popup expanded
 * elsewhere on the page (a filter popover left open behind a record sheet is
 * a real shape on these screens), that could hand focus back to a totally
 * unrelated control — the exact class of bug this function exists to kill.
 * So the final fallback below is still a page-wide scan (`aria-controls`/
 * `aria-labelledby` are ID LISTS, and a trigger may legitimately control more
 * than one region, which defeats an exact-string `[aria-controls="…"]`
 * match), but every candidate is required to carry the SAME explicit
 * relationship the two steps above already trust — its own `aria-controls`
 * or `aria-labelledby` must name `layer`'s id. A candidate that merely
 * happens to be expanded, with no relationship to `layer`, is never
 * accepted; `null` is returned instead and the caller's landmark fallback
 * takes over.
 */
function layerOpener(layer: Element): HTMLElement | null {
  const labelledBy = layer.getAttribute('aria-labelledby')
  if (labelledBy) {
    // `aria-labelledby` is an id LIST; the trigger is whichever entry actually
    // claims to control a popup.
    for (const id of labelledBy.split(/\s+/)) {
      const candidate = document.getElementById(id)
      if (candidate instanceof HTMLElement && candidate.hasAttribute('aria-haspopup')) return candidate
    }
  }
  if (!layer.id) return null
  const byControls = document.querySelector(`[aria-haspopup][aria-controls="${CSS.escape(layer.id)}"]`)
  if (byControls instanceof HTMLElement) return byControls
  for (const candidate of document.querySelectorAll('[aria-haspopup][aria-expanded="true"]')) {
    if (!(candidate instanceof HTMLElement)) continue
    const controls = candidate.getAttribute('aria-controls')?.split(/\s+/) ?? []
    const labels = candidate.getAttribute('aria-labelledby')?.split(/\s+/) ?? []
    if (controls.includes(layer.id) || labels.includes(layer.id)) return candidate
  }
  return null
}

/** Walk an element out of any transient layer(s) it is nested in. */
function resolveOpener(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element
  for (let depth = 0; current && depth <= MAX_LAYER_DEPTH; depth += 1) {
    const layer = current.closest(TRANSIENT_LAYER_SELECTOR)
    if (!layer) return current
    const opener = layerOpener(layer)
    if (!opener || opener === current) return null
    current = opener
  }
  return null
}

/** Landmark ancestors of `element`, nearest first, captured while it exists. */
function landmarkChain(element: HTMLElement): HTMLElement[] {
  const chain: HTMLElement[] = []
  let node: HTMLElement | null = element.parentElement
  while (node) {
    if (node.matches(LANDMARK_SELECTOR)) chain.push(node)
    node = node.parentElement
  }
  return chain
}

/** Focus a container that is not itself in the Tab order. */
function focusLandmark(element: HTMLElement) {
  if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1')
  element.focus({ preventScroll: true })
}

export interface AlertDialogContentProps
  extends ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> {
  /**
   * Where focus goes when the element that opened the dialog no longer exists
   * on close (a bulk action bar that unmounts once the selection clears, a row
   * menu whose row was the thing deleted). A CSS selector or a getter; the
   * default is the nearest surviving landmark ancestor of the opener.
   */
  focusRestoreFallback?: string | (() => HTMLElement | null)
}

export const AlertDialogContent = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Content>,
  AlertDialogContentProps
>(({ className, children, focusRestoreFallback, onOpenAutoFocus, onCloseAutoFocus, ...props }, ref) => {
  const openerRef = useRef<HTMLElement | null>(null)
  const landmarksRef = useRef<HTMLElement[]>([])
  /** One restore per open→close cycle, whichever trigger gets there first. */
  const restoredRef = useRef(false)
  const observerRef = useRef<MutationObserver | null>(null)

  /** Move focus to the resolved target. Returns whether anything was focused. */
  const restoreFocus = useCallback(() => {
    const target = (() => {
      const opener = openerRef.current
      if (opener?.isConnected) return { element: opener, isLandmark: false }
      if (typeof focusRestoreFallback === 'function') {
        const named = focusRestoreFallback()
        if (named?.isConnected) return { element: named, isLandmark: true }
      } else if (typeof focusRestoreFallback === 'string') {
        const named = document.querySelector(focusRestoreFallback)
        if (named instanceof HTMLElement) return { element: named, isLandmark: true }
      }
      const surviving = landmarksRef.current.find((node) => node.isConnected)
      return surviving ? { element: surviving, isLandmark: true } : null
    })()
    if (!target) return false
    // `preventScroll` stops the page jumping back to an opener that has since
    // scrolled out of view.
    if (target.isLandmark) focusLandmark(target.element)
    else target.element.focus({ preventScroll: true })
    return true
  }, [focusRestoreFallback])

  /**
   * The close-time half. Marking the shut-but-still-animating Content `inert`
   * BEFORE moving focus is load-bearing, not tidiness: it is what stops the
   * still-trapped `FocusScope` from dragging focus straight back inside.
   */
  const releaseAndRestore = useCallback(
    (node: HTMLElement) => {
      if (restoredRef.current) return
      restoredRef.current = true
      node.setAttribute('inert', '')
      restoreFocus()
    },
    [restoreFocus],
  )

  /**
   * Watch the Content's own `data-state`. It flips to `closed` the instant the
   * dialog closes; unmount comes a whole exit animation later.
   *
   * The observer is keyed to the NODE, not to this callback's invocations, and
   * that is not defensive coding — it is the whole reason the first attempt at
   * this failed. Radix composes our ref with its own via `useComposedRefs`,
   * which returns a FRESH function every render, so React detaches (`null`)
   * and re-attaches on every single render. Disconnecting on the `null` leg
   * threw away the pending mutation record for the very `data-state` flip we
   * are here to catch — measured: the callback ran ten times per close and the
   * observer never once delivered. So a re-attach of the same node is a no-op,
   * and teardown happens on a genuinely different node or on unmount.
   */
  const observedRef = useRef<HTMLElement | null>(null)
  useEffect(() => () => observerRef.current?.disconnect(), [])
  const setContentRef = useCallback(
    (node: HTMLElement | null) => {
      if (typeof ref === 'function') ref(node as never)
      else if (ref) (ref as { current: HTMLElement | null }).current = node
      if (!node || node === observedRef.current) return
      observerRef.current?.disconnect()
      observedRef.current = node
      if (typeof MutationObserver === 'undefined') return
      const observer = new MutationObserver(() => {
        if (node.getAttribute('data-state') === 'closed') releaseAndRestore(node)
        else {
          restoredRef.current = false
          node.removeAttribute('inert')
        }
      })
      observer.observe(node, { attributes: true, attributeFilter: ['data-state'] })
      observerRef.current = observer
    },
    [ref, releaseAndRestore],
  )

  return (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={setContentRef as Ref<ElementRef<typeof AlertDialogPrimitive.Content>>}
      data-slot="alert-dialog-content"
      onOpenAutoFocus={(event) => {
        restoredRef.current = false
        const active = document.activeElement
        const raw =
          active instanceof HTMLElement && active !== document.body ? active : lastFocusedElement
        // Resolve BEFORE the layer unmounts — `aria-labelledby`/`aria-expanded`
        // are only readable while the menu is still up, which is exactly now.
        const opener = raw ? resolveOpener(raw) : null
        openerRef.current = opener
        landmarksRef.current = landmarkChain(opener ?? raw ?? document.body)
        onOpenAutoFocus?.(event)
      }}
      onCloseAutoFocus={(event) => {
        onCloseAutoFocus?.(event)
        if (event.defaultPrevented) return
        // `preventDefault` stops Radix's own (here ineffective) restore from
        // racing this one — including when the close-time observer already got
        // there, in which case there is nothing left to do but hold the line.
        if (restoredRef.current) {
          event.preventDefault()
          return
        }
        if (!restoreFocus()) return
        restoredRef.current = true
        event.preventDefault()
      }}
      className={cn(
        // token-exempt: symmetric centering needs a physical `left-1/2` — `start-1/2`
        // flips to the far edge under RTL while `-translate-x-1/2` stays physical,
        // landing the modal a full width off-center (see F3). Vertical `top-1/2` is
        // already physical (no logical inset-block equivalent used), so it's untouched.
        'fixed left-1/2 top-1/2 z-modal grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-md border border-border bg-card p-6 text-card-foreground shadow-elevation outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    >
      {children}
    </AlertDialogPrimitive.Content>
  </AlertDialogPortal>
  )
})
AlertDialogContent.displayName = 'AlertDialogContent'

export function AlertDialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn('flex flex-col gap-1.5 text-start', className)}
      {...props}
    />
  )
}

export function AlertDialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

export const AlertDialogTitle = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    data-slot="alert-dialog-title"
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
))
AlertDialogTitle.displayName = 'AlertDialogTitle'

export const AlertDialogDescription = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    data-slot="alert-dialog-description"
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
AlertDialogDescription.displayName = 'AlertDialogDescription'

export const AlertDialogAction = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Action>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    data-slot="alert-dialog-action"
    className={cn(buttonVariants({ variant: 'destructive' }), className)}
    {...props}
  />
))
AlertDialogAction.displayName = 'AlertDialogAction'

export const AlertDialogCancel = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Cancel>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    data-slot="alert-dialog-cancel"
    className={cn(buttonVariants({ variant: 'tertiary' }), className)}
    {...props}
  />
))
AlertDialogCancel.displayName = 'AlertDialogCancel'
