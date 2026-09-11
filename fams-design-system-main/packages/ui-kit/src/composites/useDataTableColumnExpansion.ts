import { useCallback, useRef } from 'react'
import type { DataTableColumn, DataTableColumnContentType } from './DataTable.types'

/** Two taps within this window count as a double-tap. */
const DOUBLE_TAP_WINDOW_MS = 400

/**
 * Width a column compresses TO while a sibling is expanded — text-
 * truncation.md §7: "none are hidden, only compressed (and still subject
 * to its own §1–§3 contentType rule at that compressed width)". These are
 * FLOORS, not the doc's own visual spec — same status as the existing
 * `column.minWidth` prop (a layout input, not a token), and a caller's own
 * `minWidth` always wins when given.
 */
const CONTENT_TYPE_COLLAPSE_FLOOR: Partial<Record<DataTableColumnContentType, string>> = {
  'fixed-id': '7rem',
  'fixed-content': '6rem',
  'variable-id': '7rem',
  descriptive: '7rem',
}
const DEFAULT_COLLAPSE_FLOOR = '6rem'

function collapseFloorWidth<T>(col: DataTableColumn<T>): string {
  if (col.minWidth) return col.minWidth
  if (col.contentType) return CONTENT_TYPE_COLLAPSE_FLOOR[col.contentType] ?? DEFAULT_COLLAPSE_FLOOR
  return DEFAULT_COLLAPSE_FLOOR
}

/**
 * useDataTableColumnExpansion — text-truncation.md §7's column-expansion
 * interaction. One column at a time expands to fill the table's remaining
 * width; every other visible column compresses to its contentType floor —
 * never triggering the table's own horizontal scroll first (§7's explicit
 * requirement).
 *
 * Fully CONTROLLED, mirroring the existing `selectedIds`/`onSelectionChange`
 * pair on the same component (§7's doc comment names this exact shape):
 * omitting both props makes every toggle here a no-op, same as an unwired
 * `selectedIds` — the caller owns the state.
 *
 * Two independent entry points drive the SAME toggle:
 *  - Touch — `registerTap(key, pointerType)`, called from both the column's
 *    header cell and every body cell in that column. Only `pointerType ===
 *    'touch'` is ever acted on; a mouse double-click on an arbitrary cell
 *    must NOT expand anything (§7 web interaction is a dedicated control,
 *    not double-click-anywhere) — see `DataTable.tsx`'s pointerup wiring.
 *  - Web — `toggleExpanded(key)` directly, wired to the small header-edge
 *    expand button (`DataTableColumnControls.ExpandColumnToggle`).
 *
 * A resolved tap (expand, collapse-same-column, or collapse-via-tapping-
 * elsewhere) also needs to swallow the SAME tap's resulting `click` — which
 * would otherwise ALSO fire sort-cycling or `onRowClick` a moment later.
 * `consumeSuppressedClick()` is that one-shot guard: callers check it inside
 * their own click handler and skip their normal action when it returns true.
 */
export function useDataTableColumnExpansion<T>({
  expandedColumnKey,
  onExpandedColumnChange,
}: {
  expandedColumnKey?: string | null
  onExpandedColumnChange?: (key: string | null) => void
}) {
  const expandedKey = expandedColumnKey ?? null
  const lastTapRef = useRef<{ key: string; time: number } | null>(null)
  const suppressClickRef = useRef(false)

  const setExpanded = useCallback(
    (key: string | null) => onExpandedColumnChange?.(key),
    [onExpandedColumnChange],
  )

  const toggleExpanded = useCallback(
    (key: string) => setExpanded(expandedKey === key ? null : key),
    [expandedKey, setExpanded],
  )

  const registerTap = useCallback(
    (key: string, pointerType: string) => {
      if (pointerType !== 'touch') return
      if (expandedKey !== null && key !== expandedKey) {
        // Tapping any OTHER column while one is expanded collapses it — a
        // single tap is enough, no need to wait for a would-be second tap.
        lastTapRef.current = null
        suppressClickRef.current = true
        setExpanded(null)
        return
      }
      const now = Date.now()
      const last = lastTapRef.current
      if (last && last.key === key && now - last.time < DOUBLE_TAP_WINDOW_MS) {
        lastTapRef.current = null
        suppressClickRef.current = true
        toggleExpanded(key)
      } else {
        lastTapRef.current = { key, time: now }
      }
    },
    [expandedKey, setExpanded, toggleExpanded],
  )

  const consumeSuppressedClick = useCallback(() => {
    if (!suppressClickRef.current) return false
    suppressClickRef.current = false
    return true
  }, [])

  /**
   * `undefined` for the EXPANDED column is deliberate, not an oversight: the
   * table is `table-layout: fixed` while any column is expanded, and under
   * that algorithm a column with NO explicit width receives 100% of the
   * space left over after every explicit-width sibling is subtracted — the
   * one-line way to make it "fill the remaining width" without computing a
   * pixel value in JS. Setting an explicit `width: '100%'` here instead
   * would be wrong: every OTHER column still has its own explicit floor
   * width, so the widths would sum past 100% and force exactly the
   * horizontal scroll §7 says expansion must avoid.
   */
  const columnWidthStyle = useCallback(
    (col: DataTableColumn<T>): { width?: string; minInlineSize?: string } | undefined => {
      if (expandedKey === null) {
        return col.width || col.minWidth
          ? { width: col.width, minInlineSize: col.minWidth }
          : undefined
      }
      if (col.key === expandedKey) return undefined
      const floor = collapseFloorWidth(col)
      return { width: floor, minInlineSize: floor }
    },
    [expandedKey],
  )

  return {
    expandedKey,
    toggleExpanded,
    registerTap,
    consumeSuppressedClick,
    columnWidthStyle,
    isTableFixed: expandedKey !== null,
  }
}
