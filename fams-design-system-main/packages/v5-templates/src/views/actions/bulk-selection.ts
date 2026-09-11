import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * bulk-selection.ts — the selection model behind the bulk action bar.
 *
 * Ported from the one correct reference implementation
 * (`REFERENCE-MINING.md` §3.3 → `«IFMDS»/components/settings/subscriptions.tsx`
 * L134-212), with the two deltas that file's own review called for:
 *
 *  - **Filtered-set semantics.** `selectAll` selects exactly the ids handed in,
 *    which are always the records currently passing search + filters (UX note
 *    G.44). It can never mean "every record in the module".
 *  - **A filter change CLEARS the selection**, it does not prune it. The
 *    reference prunes; UX note G.45/G.47 is explicit that changing filters
 *    clears, "otherwise users bulk-delete records they cannot see". Both share
 *    the same mechanism — an effect keyed on what the user is looking at — so
 *    the difference is one line, recorded here rather than silently diverged.
 *
 * Flat by construction: one `string[]`, no per-column or per-group buckets, so
 * a kanban selection spanning three stages is one set and one bulk action
 * (UX note G.45). There is deliberately no second store to keep in step.
 */

export interface BulkSelection {
  /** Currently selected record ids, in selection order. */
  selectedIds: string[]
  /** Count for the bar's live-region copy. */
  count: number
  /** Whether every currently-visible record is selected. */
  allVisibleSelected: boolean
  /** Whether SOME (not all) are — the header checkbox's `indeterminate` state. */
  someVisibleSelected: boolean
  /** Replaces the set wholesale (what `DataTable.onSelectionChange` hands back). */
  setSelectedIds: (ids: string[]) => void
  /** Adds/removes one id — the kanban card checkbox path. */
  toggle: (id: string, selected: boolean) => void
  /** Selects exactly the filtered set. */
  selectAll: () => void
  /** Empties the set — the bar's `✕ Clear selection`, Escape, and every completed bulk action. */
  clear: () => void
}

/**
 * The selection state for one lens.
 *
 * @param visibleIds ids of the records currently passing search + filters, in
 * render order. This is BOTH what `selectAll` selects and what the clearing
 * effect watches, which is what makes the bar's count structurally unable to
 * lie about what is on screen.
 * @param resetKey a string that changes whenever the user's filter/search/lens
 * choice changes. Selection is cleared when it changes — NOT when `visibleIds`
 * merely changes identity, because a record edit or a re-sort must not throw a
 * selection away.
 */
export function useBulkSelection(visibleIds: readonly string[], resetKey: string): BulkSelection {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // `resetKey`'s previous value, so the clearing effect fires on a real CHANGE
  // rather than on mount (where clearing an already-empty set is harmless but
  // an extra render, and where a caller-restored selection would be eaten).
  const lastResetKey = useRef(resetKey)

  useEffect(() => {
    if (lastResetKey.current === resetKey) return
    lastResetKey.current = resetKey
    setSelectedIds((current) => (current.length ? [] : current))
  }, [resetKey])

  const visible = useMemo(() => new Set(visibleIds), [visibleIds])

  // A selected id that has left the visible set entirely (deleted, or paged
  // away) is dropped: the bar must never count a record that no longer exists.
  // This is the reference's reconciling effect; the CLEAR-on-filter-change rule
  // above is what makes it a safety net rather than the main mechanism.
  const effective = useMemo(() => selectedIds.filter((id) => visible.has(id)), [selectedIds, visible])

  const allVisibleSelected = visibleIds.length > 0 && effective.length === visibleIds.length
  const someVisibleSelected = effective.length > 0 && !allVisibleSelected

  const toggle = useCallback((id: string, selected: boolean) => {
    setSelectedIds((current) =>
      selected ? (current.includes(id) ? current : [...current, id]) : current.filter((s) => s !== id),
    )
  }, [])

  const selectAll = useCallback(() => setSelectedIds([...visibleIds]), [visibleIds])
  const clear = useCallback(() => setSelectedIds((current) => (current.length ? [] : current)), [])

  return {
    selectedIds: effective,
    count: effective.length,
    allVisibleSelected,
    someVisibleSelected,
    setSelectedIds,
    toggle,
    selectAll,
    clear,
  }
}

/**
 * The bar's count copy. UX note G.44 requires select-all to say out loud that
 * it means the filtered set — "the bar reads `12 selected (all matching
 * filters)`" — so the suffix appears exactly when the selection IS the whole
 * filtered set and there is a filter in play.
 */
export function selectionSummary(count: number, isEntireFilteredSet: boolean, isFiltered: boolean): string {
  const base = `${count} selected`
  return isEntireFilteredSet && isFiltered ? `${base} (all matching filters)` : base
}
