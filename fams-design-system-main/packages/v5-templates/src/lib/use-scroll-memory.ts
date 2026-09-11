import { useCallback, useEffect, useRef } from 'react'

/**
 * Remembers a scroll container's position across UNMOUNTS, keyed by a caller
 * -supplied string. [tier-2 internal]
 *
 * The case this exists for: switching a module's lens (Kanban → Calendar →
 * Kanban) unmounts and remounts the view, so a board the user had scrolled
 * 400px into came back at 0 and they had to find their place again. That is
 * scroll position behaving like a fresh page load in the middle of one
 * continuous task.
 *
 * SESSION-scoped by design — a module-level `Map`, not `sessionStorage` and
 * not a prop the caller has to thread. Two reasons it does not belong in the
 * persisted `ViewState`: a pixel offset is not a *saved view* (it is not
 * shareable, it is not something a user names and re-opens, and it would
 * churn a persistence adapter on every scroll event), and it is meaningless
 * across a reload where the same offset may land on entirely different
 * content. Losing it when the tab closes is correct.
 *
 * Generic: nothing here knows what a lane, a lens or a module is. Any view
 * with a scroller and a stable key can use it.
 *
 * ```tsx
 * const boardRef = useScrollMemory<HTMLDivElement>(`kanban:${config.code}`)
 * return <KanbanBoard ref={boardRef} … />
 * ```
 */
const positions = new Map<string, { left: number; top: number }>()

/** Test-only reset, so one spec's remembered offsets cannot leak into the next. */
export function resetScrollMemory(): void {
  positions.clear()
}

export function useScrollMemory<T extends HTMLElement>(key: string | undefined) {
  const elementRef = useRef<T | null>(null)
  // Held in a ref so the scroll listener never has to be re-attached when the
  // key changes identity mid-life (a renamed module, a re-keyed lens).
  const keyRef = useRef(key)
  keyRef.current = key

  const attach = useCallback((node: T | null) => {
    elementRef.current = node
    if (!node || !keyRef.current) return
    const saved = positions.get(keyRef.current)
    if (!saved) return
    // Restored on the next frame, not synchronously: at ref-callback time the
    // element is in the DOM but its children have not been laid out, so its
    // scrollWidth is still its clientWidth and any `scrollLeft` assignment
    // clamps straight back to 0.
    requestAnimationFrame(() => {
      if (elementRef.current !== node) return
      node.scrollLeft = saved.left
      node.scrollTop = saved.top
    })
  }, [])

  useEffect(() => {
    const node = elementRef.current
    if (!node) return
    const onScroll = () => {
      const k = keyRef.current
      if (!k) return
      positions.set(k, { left: node.scrollLeft, top: node.scrollTop })
    }
    node.addEventListener('scroll', onScroll, { passive: true })
    return () => node.removeEventListener('scroll', onScroll)
  }, [key])

  return attach
}
