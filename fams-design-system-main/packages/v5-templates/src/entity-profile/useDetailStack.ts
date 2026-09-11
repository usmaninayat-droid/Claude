import { useCallback, useMemo, useState } from 'react'

/**
 * `useDetailStack` — the headless port of v5's per-module "browser-tab
 * stacking" state (Shaheer's `AppShell.tsx` `detailsByModule` /
 * `activeDetailByModule` / `minimizedByModule`, ~ln 243-382).
 *
 * A stack holds MANY records open at once, browser-tab style, for ONE module.
 * The four behaviors ported verbatim:
 *  - `pushDetail` dedupes by id (re-opening a record replaces it in place),
 *    activates it, and un-minimizes the stack.
 *  - `closeDetail` removes a tab and, when it was the active one, falls back to
 *    the last remaining tab (null when the stack empties).
 *  - `minimize` hides the surface but KEEPS the stack (Esc / amber control).
 *  - `closeAll` clears the whole stack (red control).
 *
 * State-agnostic (Rule 8): the hook is pure UI memory — the items it holds are
 * whatever descriptor the caller pushes (`{ id, … }`); opening/fetching records
 * is the app's concern. A page that needs the per-module keying of the original
 * AppShell composes one `useDetailStack()` per module id.
 */
export interface DetailStackItem {
  /** Stable id — the dedupe key across the stack and `activeId`. */
  id: string
}

export interface DetailStackApi<T extends DetailStackItem> {
  /** Open records, in the order they were first pushed. */
  items: T[]
  /** The active record's id, or `null` when the stack is empty. */
  activeId: string | null
  /** Whether the surface is minimized (the stack is preserved). */
  minimized: boolean
  /** The active item resolved from `items`/`activeId`. */
  activeItem: T | null
  /** Add (or replace-in-place by id), activate, and un-minimize. */
  pushDetail: (item: T) => void
  /** Remove a tab; if it was active, fall back to the last remaining tab. */
  closeDetail: (id: string) => void
  /** Clear the entire stack. */
  closeAll: () => void
  /** Hide the surface but keep the stack. */
  minimize: () => void
  /** Activate a tab and un-minimize (the browser-tab click). */
  activate: (id: string) => void
  /** Un-minimize without changing the active tab. */
  restore: () => void
}

export interface UseDetailStackOptions<T extends DetailStackItem> {
  /** Seed the stack (e.g. a deep-link opening a record). */
  initialItems?: T[]
  initialActiveId?: string | null
}

export function useDetailStack<T extends DetailStackItem>(
  options: UseDetailStackOptions<T> = {},
): DetailStackApi<T> {
  const [items, setItems] = useState<T[]>(options.initialItems ?? [])
  const [activeId, setActiveId] = useState<string | null>(
    options.initialActiveId ?? options.initialItems?.[0]?.id ?? null,
  )
  const [minimized, setMinimized] = useState(false)

  const pushDetail = useCallback((item: T) => {
    setItems((prev) =>
      prev.some((x) => x.id === item.id) ? prev.map((x) => (x.id === item.id ? item : x)) : [...prev, item],
    )
    setActiveId(item.id)
    setMinimized(false)
  }, [])

  const closeDetail = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((x) => x.id !== id)
      setActiveId((cur) => (cur === id ? (next[next.length - 1]?.id ?? null) : cur))
      return next
    })
  }, [])

  const closeAll = useCallback(() => {
    setItems([])
    setActiveId(null)
    setMinimized(false)
  }, [])

  const minimize = useCallback(() => setMinimized(true), [])

  const activate = useCallback((id: string) => {
    setActiveId(id)
    setMinimized(false)
  }, [])

  const restore = useCallback(() => setMinimized(false), [])

  const activeItem = useMemo(
    () => items.find((x) => x.id === activeId) ?? null,
    [items, activeId],
  )

  return { items, activeId, minimized, activeItem, pushDetail, closeDetail, closeAll, minimize, activate, restore }
}
