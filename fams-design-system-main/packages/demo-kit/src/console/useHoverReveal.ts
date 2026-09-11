import { useCallback, useEffect, useState } from 'react'

/**
 * Hover-reveal state for the {@link DemoConsole} top handle (founder's UX spec,
 * decision #18): the pointer entering the thin hot-zone near the top edge
 * progressively reveals the handle; leaving the region hides it again. Keyboard
 * users never depend on this — a visually-hidden focusable trigger opens the
 * console without any pointer event (see `DemoConsole`).
 *
 * The hot zone is detected from a window-level `pointermove` rather than from
 * a hit-testable element pinned to the top edge, and that is a deliberate fix,
 * not a stylistic choice. A transparent strip that only needs to observe HOVER
 * still consumes CLICKS: with the old markup the top band of every demo page
 * was covered by the rail plus an `opacity: 0`, `aria-hidden`, `pointer-events:
 * auto` handle, so a click near the top edge silently opened the console
 * instead of reaching the page. That is how a QA gate lost a whole afternoon —
 * its "click outside to dismiss" at (5, 5) opened the console's full-screen
 * scrim, which then covered the control it was trying to click next, and the
 * symptom read as "this popover can never be reopened". An invisible control
 * must not be clickable; nothing in the rail is hit-testable any more, and the
 * revealed handle is the only pointer target the console owns.
 *
 * The `onPointerEnter`/`onPointerLeave` handlers are kept so the handle itself
 * holds the reveal open while the pointer is on it (it sits below the hot zone)
 * and so the behaviour stays testable with synthetic pointer events.
 */
export interface HoverReveal {
  /** True while the handle should be visible (pointer in the hot zone/handle). */
  revealed: boolean
  /** Bind to the hot-zone + handle wrapper. */
  onPointerEnter: () => void
  onPointerLeave: () => void
  /** Force-hide (e.g. after the console opens). */
  hide: () => void
}

/** Height of the top-edge hot zone, in px — mirrors the markup's `h-2`. */
const HOT_ZONE_PX = 8

/** Below the handle's own height the reveal is held open, above it, dropped. */
const KEEP_OPEN_PX = 48

export function useHoverReveal(): HoverReveal {
  const [revealed, setRevealed] = useState(false)
  const onPointerEnter = useCallback(() => setRevealed(true), [])
  const onPointerLeave = useCallback(() => setRevealed(false), [])
  const hide = useCallback(() => setRevealed(false), [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onMove = (event: PointerEvent) => {
      const y = event.clientY
      // Hysteresis: entering needs the thin hot zone, but once revealed the
      // handle (which hangs below it) keeps itself open, so the user can
      // travel down to click it without it vanishing under the pointer.
      setRevealed((was) => (was ? y <= KEEP_OPEN_PX : y <= HOT_ZONE_PX))
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return { revealed, onPointerEnter, onPointerLeave, hide }
}
