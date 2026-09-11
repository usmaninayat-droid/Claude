import { useCallback, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'

/**
 * Roving-tabindex keyboard model for an ARIA grid of `rows × cols` cells,
 * plus multi-select. Framework-free logic; the board wires the handlers.
 *
 *  Arrows          move the active cell (Home/End → row start/end,
 *                  PageUp/PageDown → ±10 rows)
 *  Enter / Space   open the assign surface for the active cell
 *  Delete/Backspace clear the active cell (or the whole selection)
 *  ⌘/Ctrl+C / V    copy the active cell's duty, paste onto the selection
 *  ⌘/Ctrl+Z        undo
 *  Esc             clear selection / cancel
 *  Shift+Arrow     extend a rectangular selection from the anchor
 *  Shift+Click     range-select · ⌘/Ctrl+Click toggle-select
 */

export interface CellRef { row: number; col: number }
export type CellKey = `${number}:${number}`
export const cellKey = (r: number, c: number): CellKey => `${r}:${c}`

export interface GridKeyboardHandlers {
  onActivate: (cell: CellRef) => void
  onClear: (cells: CellRef[]) => void
  onCopy: (cell: CellRef) => void
  onPaste: (cells: CellRef[]) => void
  onUndo: () => void
  /** Called when the active cell changes, so the board can scroll it into view. */
  onActiveChange?: (cell: CellRef) => void
}

export function useGridKeyboard(rows: number, cols: number, h: GridKeyboardHandlers) {
  const [active, setActive] = useState<CellRef | null>(null)
  const [selected, setSelected] = useState<Set<CellKey>>(() => new Set())
  const anchor = useRef<CellRef | null>(null)

  const clamp = (r: number, c: number): CellRef => ({
    row: Math.max(0, Math.min(rows - 1, r)),
    col: Math.max(0, Math.min(cols - 1, c)),
  })

  const rangeKeys = (a: CellRef, b: CellRef): Set<CellKey> => {
    const out = new Set<CellKey>()
    for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++)
      for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) out.add(cellKey(r, c))
    return out
  }

  const selectedRefs = useCallback((): CellRef[] => {
    if (selected.size === 0 && active) return [active]
    return [...selected].map((k) => {
      const [r, c] = k.split(':').map(Number) as [number, number]
      return { row: r, col: c }
    })
  }, [selected, active])

  const focus = useCallback((cell: CellRef, extend = false) => {
    const next = clamp(cell.row, cell.col)
    setActive(next)
    h.onActiveChange?.(next)
    if (extend && anchor.current) setSelected(rangeKeys(anchor.current, next))
    else { anchor.current = next; setSelected(new Set()) }
  }, [rows, cols, h]) // eslint-disable-line react-hooks/exhaustive-deps

  const onCellClick = useCallback((cell: CellRef, ev: MouseEvent) => {
    if (ev.shiftKey && anchor.current) {
      setActive(cell)
      setSelected(rangeKeys(anchor.current, cell))
      return
    }
    if (ev.metaKey || ev.ctrlKey) {
      setActive(cell)
      setSelected((prev) => {
        const next = new Set(prev)
        const k = cellKey(cell.row, cell.col)
        if (next.has(k)) next.delete(k)
        else next.add(k)
        return next
      })
      return
    }
    anchor.current = cell
    setActive(cell)
    setSelected(new Set())
  }, [])

  const onKeyDown = useCallback((ev: KeyboardEvent) => {
    if (!active) return
    const mod = ev.metaKey || ev.ctrlKey
    const step = (dr: number, dc: number) => { ev.preventDefault(); focus({ row: active.row + dr, col: active.col + dc }, ev.shiftKey) }
    switch (ev.key) {
      case 'ArrowUp': return step(-1, 0)
      case 'ArrowDown': return step(1, 0)
      case 'ArrowLeft': return step(0, -1)
      case 'ArrowRight': return step(0, 1)
      case 'PageUp': return step(-10, 0)
      case 'PageDown': return step(10, 0)
      case 'Home': ev.preventDefault(); return focus({ row: active.row, col: 0 }, ev.shiftKey)
      case 'End': ev.preventDefault(); return focus({ row: active.row, col: cols - 1 }, ev.shiftKey)
      case 'Enter':
      case ' ':
        ev.preventDefault(); return h.onActivate(active)
      case 'Delete':
      case 'Backspace':
        ev.preventDefault(); return h.onClear(selectedRefs())
      case 'Escape':
        ev.preventDefault(); setSelected(new Set()); return
      case 'a':
        if (mod) { ev.preventDefault(); setSelected(rangeKeys({ row: 0, col: 0 }, { row: rows - 1, col: cols - 1 })) }
        return
      case 'c':
        if (mod) { ev.preventDefault(); h.onCopy(active) }
        return
      case 'v':
        if (mod) { ev.preventDefault(); h.onPaste(selectedRefs()) }
        return
      case 'z':
        if (mod) { ev.preventDefault(); h.onUndo() }
        return
    }
  }, [active, cols, rows, focus, h, selectedRefs])

  const isSelected = useCallback((r: number, c: number) => selected.has(cellKey(r, c)), [selected])
  const clearSelection = useCallback(() => setSelected(new Set()), [])

  return { active, setActive: focus, selected, isSelected, selectionCount: selected.size, selectedRefs, onCellClick, onKeyDown, clearSelection }
}
