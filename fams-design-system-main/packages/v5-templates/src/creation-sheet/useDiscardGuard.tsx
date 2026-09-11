import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@fams/ui-kit'

/** Marks the confirmation's own DOM so an outside-interaction handler can recognise it. */
export const DISCARD_CONFIRM_SLOT = 'creation-sheet-discard-confirm'

/**
 * How long outside-interaction dismissal stays suppressed after the
 * confirmation closes. Sized against `duration.slow` (300ms — the token that
 * governs dialog/drawer/sheet enter-exit) plus a margin, because the event
 * being suppressed is the focus restore that lands at the END of that exit.
 * It is a wall-clock window rather than a `setTimeout` deliberately: nothing
 * to clear on unmount and no stale-closure risk. If it were ever too short the
 * failure mode is the pre-fix symptom (the dialog reopens), never a silent
 * discard — `isDirty` still gates that independently.
 */
const OUTSIDE_SUPPRESSION_MS = 400

export interface DiscardGuard {
  /** Drop-in replacement for the surface's `onOpenChange`. */
  requestOpenChange: (next: boolean) => void
  /** Wire to the dismissible surface's `onInteractOutside`. */
  handleInteractOutside: (event: { target: EventTarget | null; preventDefault: () => void }) => void
  /** Render alongside the surface (it portals itself). */
  dialog: ReactNode
}

/**
 * Confirm before a dismissal throws away unsaved input.
 *
 * Lives in a hook rather than inline in `CreationSheet` for two reasons the
 * round-7 code review made concrete: `CreationSheet` has THREE render paths
 * (flat sheet, single-group `FormSheet`, stepper wizard) and an inline guard
 * was wired into only two of them, leaving the third with the same bug and no
 * test; and the inline version pushed `CreationSheet.tsx` 58% past the line
 * budget. One hook means one implementation for every dismissible surface.
 *
 * Two behaviours are load-bearing and easy to get wrong:
 *
 * 1. **Only a DIRTY surface prompts.** An untouched sheet still closes
 *    instantly, so "opened it by mistake" is not taxed with a dialog.
 *
 * 2. **The confirmation portals to `body`, i.e. OUTSIDE the sheet's DOM.** So
 *    the sheet's dismissible layer classes interacting with it as an *outside*
 *    interaction, closes the sheet, re-enters this guard and reopens the very
 *    dialog just dismissed — which presents as a "Keep editing" button that
 *    does nothing at all (no error, correct hit-testing, `data-state` going
 *    `open → closed → open` on the same node). Suppressing on the open flag
 *    alone is NOT enough: the pointer-down is caught, but the FOCUS-outside
 *    event that follows the close arrives after the flag has flipped. Hence
 *    two independent sufficient conditions — the event's own target, and a
 *    short window opened when the confirmation closes.
 */
export function useDiscardGuard(
  isDirty: boolean,
  onOpenChange: (open: boolean) => void,
  open: boolean,
): DiscardGuard {
  const [discardOpen, setDiscardOpen] = useState(false)
  const suppressOutsideUntilRef = useRef(0)

  useEffect(() => {
    if (open) setDiscardOpen(false)
  }, [open])

  const requestOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        onOpenChange(true)
        return
      }
      if (isDirty) {
        setDiscardOpen(true)
        return
      }
      onOpenChange(false)
    },
    [isDirty, onOpenChange],
  )

  const handleInteractOutside = useCallback(
    (event: { target: EventTarget | null; preventDefault: () => void }) => {
      const target = event.target
      const inConfirm =
        target instanceof Element && !!target.closest(`[data-slot="${DISCARD_CONFIRM_SLOT}"]`)
      if (inConfirm || Date.now() < suppressOutsideUntilRef.current) {
        event.preventDefault()
        return
      }
      if (isDirty) {
        event.preventDefault()
        setDiscardOpen(true)
      }
    },
    [isDirty],
  )

  const setOpen = useCallback((next: boolean) => {
    if (!next) suppressOutsideUntilRef.current = Date.now() + OUTSIDE_SUPPRESSION_MS
    setDiscardOpen(next)
  }, [])

  const confirmDiscard = useCallback(() => {
    setOpen(false)
    onOpenChange(false)
  }, [onOpenChange, setOpen])

  const dialog = (
    <AlertDialog open={discardOpen} onOpenChange={setOpen}>
      <AlertDialogContent data-slot={DISCARD_CONFIRM_SLOT}>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes on this form. If you close it now, they will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDiscard}>Discard changes</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { requestOpenChange, handleInteractOutside, dialog }
}
