import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

/**
 * Pointer-event drag-to-move for roster cells.
 *
 * POINTER events, deliberately not HTML5 drag-and-drop: the source
 * prototype's handoff (§6, bug 3) found the browser hijacks a drag that
 * contains an <img> into an image drag, and the DS's own Kanban reached the
 * same conclusion. Pointer events also give us the drop-target hit-test on
 * every move, which is what lets the target cell show a green/red ring BEFORE
 * the drop (ELG-05's "see the constraint instead of hitting an error").
 *
 * The hook is data-agnostic: it carries an opaque `payload`, reports the
 * `data-cell` element under the pointer, and asks the caller whether that
 * target is acceptable. A small movement threshold separates a click from a
 * drag so single-click assignment keeps working.
 */

export interface DragState<P> {
  payload: P
  /** Client coords of the pointer, for the ghost. */
  x: number
  y: number
  /** `data-cell` value of the element under the pointer, if any. */
  overKey: string | null
  overOk: boolean | null
}

export interface PointerDragOptions<P> {
  /** Return `true` if `payload` may be dropped on `targetKey`. */
  canDrop: (payload: P, targetKey: string) => boolean
  onDrop: (payload: P, targetKey: string) => void
  /** A drop released over a target `canDrop` refused — so the refusal can be explained. */
  onReject?: (payload: P, targetKey: string) => void
  /** Pixels of movement before a press becomes a drag. */
  threshold?: number
}

export function usePointerDrag<P>({ canDrop, onDrop, onReject, threshold = 6 }: PointerDragOptions<P>) {
  const [drag, setDrag] = useState<DragState<P> | null>(null)
  const press = useRef<{ payload: P; x: number; y: number; pointerId: number } | null>(null)
  const dragging = useRef(false)

  const targetUnder = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y)
    const cell = el?.closest<HTMLElement>('[data-cell]')
    return cell?.dataset.cell ?? null
  }

  const onPointerDown = useCallback((payload: P) => (ev: ReactPointerEvent) => {
    if (ev.button !== 0) return
    press.current = { payload, x: ev.clientX, y: ev.clientY, pointerId: ev.pointerId }
    dragging.current = false
  }, [])

  useEffect(() => {
    const move = (ev: PointerEvent) => {
      const p = press.current
      if (!p) return
      if (!dragging.current) {
        if (Math.hypot(ev.clientX - p.x, ev.clientY - p.y) < threshold) return
        dragging.current = true
      }
      const overKey = targetUnder(ev.clientX, ev.clientY)
      setDrag({ payload: p.payload, x: ev.clientX, y: ev.clientY, overKey, overOk: overKey ? canDrop(p.payload, overKey) : null })
    }
    const up = (ev: PointerEvent) => {
      const p = press.current
      press.current = null
      // A release far from the press is a drag even if no move event arrived in between.
      const moved = p ? Math.hypot(ev.clientX - p.x, ev.clientY - p.y) >= threshold : false
      if (!p || (!dragging.current && !moved)) { setDrag(null); return }
      dragging.current = false
      const overKey = targetUnder(ev.clientX, ev.clientY)
      setDrag(null)
      if (!overKey) return
      if (canDrop(p.payload, overKey)) onDrop(p.payload, overKey)
      else onReject?.(p.payload, overKey)
    }
    const cancel = () => { press.current = null; dragging.current = false; setDrag(null) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') cancel() }
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', esc)
    }
  }, [canDrop, onDrop, onReject, threshold])

  /** True while a real drag (past threshold) is in progress — lets click handlers bail. */
  const isDragging = useCallback(() => dragging.current, [])

  return { drag, onPointerDown, isDragging }
}
