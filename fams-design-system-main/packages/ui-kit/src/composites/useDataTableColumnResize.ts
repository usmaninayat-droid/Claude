import { useCallback, useRef, useState } from 'react'
import type { DataTableColumn } from './DataTable.types'

/** Never let a drag or arrow-key resize crush a column past readability. */
export const COLUMN_RESIZE_MIN_PX = 64
/** Arrow-key resize step (APG "Window Splitter" keyboard pattern). */
const COLUMN_RESIZE_STEP_PX = 16

/**
 * useDataTableColumnResize — the "fine-grained" half of text-truncation.md
 * §7's web interaction: a draggable/keyboard-operable column-border handle
 * alongside the click-to-expand shortcut ("expand-to-full-content is the
 * one-click shortcut, drag is the fine-grained version").
 *
 * Deliberately UNCONTROLLED and local to this table instance — §7's doc
 * comment only asks for a controlled `expandedColumnKey` pair, not a resize
 * callback, so drag-resize is DataTable's own transient UI state, same as
 * `ColumnCustomizer`'s search text or a `Popover`'s open state.
 *
 * RTL-safe (root rule 4): the handle sits at the column's inline-END edge,
 * so a pointer drag toward the visual right must WIDEN the column in LTR
 * and NARROW it in RTL. The sign flip is read once per drag from the
 * handle's own computed `direction` — never a hardcoded assumption.
 */
export function useDataTableColumnResize<T>() {
  const [widths, setWidths] = useState<Record<string, number>>({})
  const dragRef = useRef<{ key: string; startX: number; startWidth: number; rtl: boolean } | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const stopDrag = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    dragRef.current = null
  }, [])

  const beginResize = useCallback(
    (col: DataTableColumn<T>, event: React.PointerEvent<HTMLElement>) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget
      const th = target.closest('th')
      const startWidth = th?.getBoundingClientRect().width ?? COLUMN_RESIZE_MIN_PX
      const rtl = getComputedStyle(target).direction === 'rtl'
      dragRef.current = { key: col.key, startX: event.clientX, startWidth, rtl }

      const onMove = (e: PointerEvent) => {
        const drag = dragRef.current
        if (!drag) return
        const delta = (e.clientX - drag.startX) * (drag.rtl ? -1 : 1)
        setWidths((prev) => ({
          ...prev,
          [drag.key]: Math.max(COLUMN_RESIZE_MIN_PX, drag.startWidth + delta),
        }))
      }
      const onUp = () => stopDrag()

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      cleanupRef.current = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
    },
    [stopDrag],
  )

  /** Keyboard equivalent (APG window-splitter: ArrowLeft/ArrowRight resize
   * by a fixed step) — the handle is `tabIndex=0`, so drag is never the
   * only way to fine-tune a column's width. */
  const stepResize = useCallback((col: DataTableColumn<T>, currentWidthPx: number, direction: 1 | -1) => {
    setWidths((prev) => ({
      ...prev,
      [col.key]: Math.max(COLUMN_RESIZE_MIN_PX, currentWidthPx + direction * COLUMN_RESIZE_STEP_PX),
    }))
  }, [])

  const resizedWidthPx = useCallback((key: string) => widths[key], [widths])

  return { beginResize, stepResize, resizedWidthPx }
}
