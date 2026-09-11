import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * use-filter-session — the FAMILY C view-session state model (WAVES.md D-2,
 * UX verdicts F.47/F.49/F.50).
 *
 * Two facts per filter field, and nothing else:
 *
 * - `openedBefore` — has this field's dropdown ever been opened AND closed in
 *   this view session (R-15/R-16, F.50). It is what turns the flat option list
 *   into the `Selected` / `Available` split, and it deliberately survives the
 *   PANEL closing: only leaving the view resets it.
 * - `frozenOrder` — the OPEN-TIME snapshot of the option order (F.47/F.49).
 *   Rendering maps over this array, so a row never moves while the dropdown is
 *   open: untick a row in `Selected` and it stays exactly where it is,
 *   unticked, until the next open takes a fresh snapshot.
 *
 * The hook is deliberately owned by `ModuleView` (one instance per module view,
 * mounted ABOVE the panel), not by the panel and never by a ui-kit component:
 * ui-kit is state-agnostic, and state living in the panel would reset on every
 * panel close — the exact thing F.50 forbids.
 *
 * Pure and DOM-free. `viewKey` is the session identity (`moduleCode + viewId`
 * by convention): changing it resets everything, which is D-2's "resets on
 * module/view change".
 *
 * NOTE (scope): D-2's state block also names `lastCleared` (the `Clear all`
 * undo payload). That is G.65 surface area and is intentionally absent here.
 * `pendingSheet` — D-2's third fact — was deferred by WAVE C4 for the same
 * reason and is added by WAVE C5, whose `ExpandableSelectorSheet` is its only
 * reader: it is the sheet's DEFERRED-COMMIT staging area (G.63), the one place
 * in the filter system where a tick does not apply immediately.
 */

/** Per-field session facts. */
export interface FilterFieldSession {
  /** F.50 — set on the first CLOSE of this field's dropdown. */
  openedBefore: boolean
  /** F.47 — option-id order snapshot taken on the last dropdown OPEN. */
  frozenOrder?: string[]
  /**
   * G.63/D-2 — the side sheet's STAGED (uncommitted) selection for this field.
   * Present only while a sheet is open on it; `Confirm` commits and clears it,
   * and every discard route (Escape / minimise / Cancel) clears it without
   * committing. `undefined` therefore means "no sheet is staging this field",
   * which is what lets a re-opened sheet resume rather than restart.
   */
  pendingSheet?: string[]
}

/** The whole session, keyed by facet column. */
export type FilterSessionState = Record<string, FilterFieldSession>

export interface FilterSession {
  /** The session identity this state belongs to (`moduleCode + viewId`). */
  viewKey: string
  /** Raw state — read by tests and by the panel's render path. */
  state: FilterSessionState
  /** F.50 — `true` once the field's dropdown has been opened and closed. */
  hasOpenedBefore: (fieldId: string) => boolean
  /** F.47 — the last open's order snapshot, or `undefined` before the first open. */
  getFrozenOrder: (fieldId: string) => string[] | undefined
  /**
   * Take (and store) the open-time snapshot for `fieldId`, returning it.
   * Order = currently-selected ids first, in `allOptionIds` order, then the
   * rest in `allOptionIds` order. Ids not present in `allOptionIds` are
   * dropped; duplicates collapse. Called on EVERY open — that is what makes a
   * row unticked during a session relocate to `Available` on the next open
   * (F.47's "reappears in the Available section on the next open") while never
   * moving mid-session.
   */
  snapshotOnOpen: (fieldId: string, currentSelectedIds: readonly string[], allOptionIds: readonly string[]) => string[]
  /** Mark the field opened-before. Called on dropdown CLOSE (D-2). */
  markOpened: (fieldId: string) => void
  /** G.63 — the sheet's staged selection, or `undefined` when nothing is staged. */
  getPendingSheet: (fieldId: string) => string[] | undefined
  /** G.63 — stage (does NOT apply). Only `Confirm` turns this into a value. */
  setPendingSheet: (fieldId: string, staged: readonly string[]) => void
  /** G.63 — drop the staged selection, on commit AND on every discard route. */
  clearPendingSheet: (fieldId: string) => void
  /** Drop the whole session (explicit reset; also happens on `viewKey` change). */
  reset: () => void
}

/** Pure snapshot rule — exported for direct unit testing. */
export function buildFrozenOrder(
  currentSelectedIds: readonly string[],
  allOptionIds: readonly string[],
): string[] {
  const selected = new Set(currentSelectedIds)
  const seen = new Set<string>()
  const head: string[] = []
  const tail: string[] = []
  for (const id of allOptionIds) {
    if (seen.has(id)) continue
    seen.add(id)
    if (selected.has(id)) head.push(id)
    else tail.push(id)
  }
  return [...head, ...tail]
}

export function useFilterSession(viewKey: string): FilterSession {
  // The store is a ref so `snapshotOnOpen` can return the snapshot it just
  // took SYNCHRONOUSLY (the dropdown needs it in the same event that opens it);
  // `version` only exists to re-render readers.
  const store = useRef<FilterSessionState>({})
  const [, setVersion] = useState(0)
  const bump = useCallback(() => setVersion((v) => v + 1), [])

  // D-2 — the session is keyed by the view. A different module/view is a
  // different session, so both facts start over.
  const lastKey = useRef(viewKey)
  if (lastKey.current !== viewKey) {
    lastKey.current = viewKey
    store.current = {}
  }

  // Unmounting the view drops the session too (D-2's "resets on view unmount").
  useEffect(() => () => {
    store.current = {}
  }, [])

  const field = useCallback((fieldId: string): FilterFieldSession => {
    const existing = store.current[fieldId]
    if (existing) return existing
    const created: FilterFieldSession = { openedBefore: false }
    store.current[fieldId] = created
    return created
  }, [])

  const hasOpenedBefore = useCallback(
    (fieldId: string) => store.current[fieldId]?.openedBefore ?? false,
    [],
  )

  const getFrozenOrder = useCallback((fieldId: string) => store.current[fieldId]?.frozenOrder, [])

  const snapshotOnOpen = useCallback<FilterSession['snapshotOnOpen']>(
    (fieldId, currentSelectedIds, allOptionIds) => {
      const order = buildFrozenOrder(currentSelectedIds, allOptionIds)
      const current = field(fieldId)
      store.current[fieldId] = { ...current, frozenOrder: order }
      bump()
      return order
    },
    [bump, field],
  )

  const markOpened = useCallback(
    (fieldId: string) => {
      const current = field(fieldId)
      if (current.openedBefore) return
      store.current[fieldId] = { ...current, openedBefore: true }
      bump()
    },
    [bump, field],
  )

  const getPendingSheet = useCallback(
    (fieldId: string) => store.current[fieldId]?.pendingSheet,
    [],
  )

  const setPendingSheet = useCallback<FilterSession['setPendingSheet']>(
    (fieldId, staged) => {
      const current = field(fieldId)
      const next = [...staged]
      const prev = current.pendingSheet
      // The sheet mirrors on every tick; bail when nothing actually moved so a
      // no-op mirror never re-renders the whole view.
      if (prev && prev.length === next.length && prev.every((id, i) => id === next[i])) return
      store.current[fieldId] = { ...current, pendingSheet: next }
      bump()
    },
    [bump, field],
  )

  const clearPendingSheet = useCallback(
    (fieldId: string) => {
      const current = store.current[fieldId]
      if (!current?.pendingSheet) return
      const next = { ...current }
      delete next.pendingSheet
      store.current[fieldId] = next
      bump()
    },
    [bump],
  )

  const reset = useCallback(() => {
    store.current = {}
    bump()
  }, [bump])

  return {
    viewKey,
    state: store.current,
    hasOpenedBefore,
    getFrozenOrder,
    snapshotOnOpen,
    markOpened,
    getPendingSheet,
    setPendingSheet,
    clearPendingSheet,
    reset,
  }
}
