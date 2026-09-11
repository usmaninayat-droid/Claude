import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * The drag ghost + origin placeholder for `KanbanCard` — split out of
 * `KanbanCard.tsx` per the ~300-line soft budget (root CLAUDE.md rule 12).
 *
 * While a card is in flight the source card ELEVATES and follows the cursor,
 * and the slot it came from is left as a tinted placeholder. Two rules govern
 * the implementation:
 *
 * 1. **The origin slot keeps the card's exact height.** The real card content
 *    stays mounted and is hidden with `visibility` (not unmounted, not
 *    `display:none`), so it still occupies its full box — the column cannot
 *    reflow mid-drag, and the ghost being rendered in a CONDENSED form (no
 *    description) can never change the placeholder's height.
 * 2. **No motion.** The ghost carries a static drop shadow (an affordance, not
 *    decoration) and `transition-none` — nothing to lift, scale, ease or
 *    cross-fade — so `prefers-reduced-motion` needs no special case and this
 *    file adds no animation for the tokens' reduced-motion gate to catch.
 *
 * Pointer tracking uses the native `dragover` event on `document` (the HTML5
 * drag source of truth for cursor position — `pointermove` is not dispatched
 * during a native drag), and the platform's own drag image is suppressed by
 * the caller via `disableNativeDragPreview` so this is the only visual.
 */

export interface KanbanCardGhostProps {
  /** Condensed card content — the caller decides what survives the condense. */
  children: ReactNode
  /** The width to render at — the source card's own width, so the ghost matches the lane. */
  width: number
}

/** Cursor offset so the ghost sits under, not exactly on, the pointer. */
const GHOST_OFFSET = 12

export function KanbanCardGhost({ children, width }: KanbanCardGhostProps) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const onDragOver = (event: DragEvent) => setPoint({ x: event.clientX, y: event.clientY })
    document.addEventListener('dragover', onDragOver)
    return () => document.removeEventListener('dragover', onDragOver)
  }, [])

  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      data-slot="kanban-card-ghost"
      aria-hidden="true"
      className="pointer-events-none fixed start-0 top-0 z-50 flex flex-col gap-2 rounded-md border border-border bg-card p-3 text-start shadow-lg transition-none"
      style={{
        width,
        // `translate` (not `inset`) so the browser composites the follow
        // without a layout pass per `dragover`.
        transform: point ? `translate(${point.x + GHOST_OFFSET}px, ${point.y + GHOST_OFFSET}px)` : undefined,
        // Off-screen until the first `dragover` reports a real cursor position,
        // so the ghost never flashes at the viewport origin.
        visibility: point ? undefined : 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  )
}

KanbanCardGhost.displayName = 'KanbanCardGhost'

export interface KanbanCardPlaceholderProps {
  /** Accessible-name-free decoration — the live region carries the drag state. */
  className?: string
}

/**
 * The tinted origin slot left behind by a card in flight. Absolutely
 * positioned over the (still-mounted, `visibility:hidden`) real card, so it
 * inherits that card's exact height for free.
 */
export function KanbanCardPlaceholder({ className }: KanbanCardPlaceholderProps) {
  return (
    <div
      data-slot="kanban-card-placeholder"
      aria-hidden="true"
      className={
        'pointer-events-none absolute inset-0 rounded-md border-2 border-dashed border-primary/40 bg-primary/10 ' +
        (className ?? '')
      }
    />
  )
}

KanbanCardPlaceholder.displayName = 'KanbanCardPlaceholder'
