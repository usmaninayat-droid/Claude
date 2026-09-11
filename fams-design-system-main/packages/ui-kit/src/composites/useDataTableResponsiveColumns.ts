import { useEffect, useState, type RefObject } from 'react'
import type { DataTableColumn, DataTableColumnContentType } from './DataTable.types'

/**
 * Estimated minimum footprint (px) per `contentType`, used ONLY to decide
 * which columns give way first as the viewport narrows — text-truncation.md
 * §8. Deliberately approximate: this drives a RANKING (fits / doesn't fit),
 * not pixel-perfect layout, so it never needs to match the real rendered
 * width exactly.
 */
const CONTENT_TYPE_FLOOR_PX: Partial<Record<DataTableColumnContentType, number>> = {
  'fixed-id': 112,
  'fixed-content': 96,
  'variable-id': 112,
  descriptive: 112,
}
const DEFAULT_FLOOR_PX = 112

/**
 * Hide priority: LOWER hides FIRST. §8's reconciled order — descriptive
 * gives way first, then variable-id; fixed-content/fixed-id are never
 * auto-hidden ("stays visible longest ... hidden last, if ever").
 */
const HIDE_TIER: Partial<Record<DataTableColumnContentType, number>> = {
  descriptive: 0,
  'variable-id': 1,
}
/** No `contentType` carries no protection either — hides alongside descriptive. */
const DEFAULT_HIDE_TIER = 0

function parseWidthPx(width: string | undefined): number | null {
  if (!width) return null
  const rem = /^([\d.]+)rem$/.exec(width)
  if (rem) return parseFloat(rem[1]!) * 16
  const px = /^([\d.]+)px$/.exec(width)
  if (px) return parseFloat(px[1]!)
  return null
}

function floorPx<T>(col: DataTableColumn<T>): number {
  return (
    parseWidthPx(col.minWidth) ??
    (col.contentType ? CONTENT_TYPE_FLOOR_PX[col.contentType] ?? DEFAULT_FLOOR_PX : DEFAULT_FLOOR_PX)
  )
}

function hideTier<T>(col: DataTableColumn<T>): number {
  if (col.isHideable === false) return Number.POSITIVE_INFINITY
  if (col.contentType === 'fixed-id' || col.contentType === 'fixed-content') return Number.POSITIVE_INFINITY
  return col.contentType ? HIDE_TIER[col.contentType] ?? DEFAULT_HIDE_TIER : DEFAULT_HIDE_TIER
}

/**
 * useDataTableResponsiveColumns — text-truncation.md §8's viewport-driven
 * column hide order. Below the width where the visible columns no longer
 * fit even at their content-type floor, columns give way in priority order
 * (descriptive first, then variable-id; fixed-content/fixed-id never
 * auto-hide) rather than the table falling back to squeezed truncation or
 * scroll alone.
 *
 * This is a DEFAULT, layered on top of the existing explicit
 * `hiddenColumnKeys`/`ColumnCustomizer` model, never inside it — a column
 * this hook hides is still "visible" in that model (the caller's explicit
 * choice is untouched); freeing space by explicitly hiding a lower-priority
 * column via the customizer is what brings an auto-hidden one back, which
 * is the doc's "still reachable through the existing ColumnCustomizer panel"
 * in practice, without a second, competing hidden-state channel.
 *
 * Safe under `jsdom`/SSR by construction: `ResizeObserver` never fires (or
 * reports 0), so `containerWidth` stays `0` — treated as "not yet measured,"
 * which returns an empty hide-set (show everything), the same defensive
 * convention `dataTableCellText.tsx`'s `VariableIdentifierText` already
 * uses. Every existing table (rendered in jsdom, always 0-width there) is
 * therefore unaffected; only a real, laid-out browser viewport ever hides
 * a column.
 */
export function useDataTableResponsiveColumns<T>({
  containerRef,
  columns,
  reservedPx = 0,
}: {
  containerRef: RefObject<HTMLElement | null>
  columns: DataTableColumn<T>[]
  /** Fixed-width chrome already claimed outside `columns` — the selection
   * checkbox / trailing-action column, when present. */
  reservedPx?: number
}): Set<string> {
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (typeof ResizeObserver === 'undefined') {
      setContainerWidth(el.clientWidth)
      return
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setContainerWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [containerRef])

  if (containerWidth <= 0) return new Set()

  const available = containerWidth - reservedPx
  const total = columns.reduce((sum, c) => sum + floorPx(c), 0)
  if (total <= available) return new Set()

  const droppable = columns
    .map((c, i) => ({ key: c.key, floor: floorPx(c), tier: hideTier(c), i }))
    // The FIRST column is the row's identity (the name/thumbnail cell every
    // row is read by) and is never auto-hidden, whatever its `contentType`.
    // Without this guard a column set whose leading column carries no
    // `contentType` lands in `DEFAULT_HIDE_TIER` (0, the same tier as
    // `descriptive`) at index 0 — first in the sort, therefore the FIRST
    // thing dropped. That is exactly what emptied the identity column out of
    // the narrow hybrid list pane (~440px), leaving rows that opened on a
    // secondary column with nothing naming the record at all. The
    // `columns.length - hidden.size <= 1` floor below cannot catch it: it
    // only guarantees SOME column survives, not the one that identifies the
    // row. Space is freed by dropping trailing columns (or by scrolling), so
    // this only ever changes which column gives way, never whether the table
    // fits.
    .filter((x) => x.i > 0 && Number.isFinite(x.tier))
    .sort((a, b) => a.tier - b.tier || a.i - b.i)

  const hidden = new Set<string>()
  let remaining = total
  for (const { key, floor } of droppable) {
    if (remaining <= available) break
    if (columns.length - hidden.size <= 1) break // always keep at least one column
    hidden.add(key)
    remaining -= floor
  }
  return hidden
}
