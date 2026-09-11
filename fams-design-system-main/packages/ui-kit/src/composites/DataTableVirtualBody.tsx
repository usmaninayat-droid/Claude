import type { ReactNode, RefObject } from 'react'
import { useVirtualRows } from './useVirtualRows'
import type { FlatRenderItem } from './dataTableFlatItems'

export interface DataTableVirtualBodyProps<T> {
  /** Flattened rows (+ group headers / group summaries) to window over. */
  items: FlatRenderItem<T>[]
  /** The scrollable ancestor that owns the table's vertical scrollbar. */
  scrollRef: RefObject<HTMLDivElement | null>
  /** Estimated row height in px, used before the browser measures the real one. */
  estimateRowHeight: number
  /** `colSpan` for the top/bottom spacer cells — matches the body rows' column count. */
  columnSpan: number
  renderRow: (row: T, index: number) => ReactNode
  renderGroupHeader: (groupKey: string, rowCount: number) => ReactNode
  renderGroupSummary: (groupKey: string, cells: Partial<Record<string, ReactNode>>) => ReactNode
}

/**
 * DataTableVirtualBody — the windowed `<tbody>` used when `DataTable`'s
 * `virtualized` prop is on. Renders only the rows / group-headers /
 * group-summary rows within the current viewport (plus overscan), padded
 * top/bottom with height-only spacer rows so the scrollbar and scroll
 * position stay correct. [internal to DataTable — not part of the public
 * component surface]
 */
export function DataTableVirtualBody<T>({
  items,
  scrollRef,
  estimateRowHeight,
  columnSpan,
  renderRow,
  renderGroupHeader,
  renderGroupSummary,
}: DataTableVirtualBodyProps<T>) {
  const virtualizer = useVirtualRows({ count: items.length, scrollRef, estimateRowHeight })
  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]!.start : 0
  const paddingBottom =
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1]!.end : 0

  const renderItem = (item: FlatRenderItem<T>) => {
    if (item.kind === 'row') return renderRow(item.row, item.index)
    if (item.kind === 'group-header') return renderGroupHeader(item.groupKey, item.rowCount)
    return renderGroupSummary(item.groupKey, item.cells)
  }

  // Graceful degradation: when the scroll viewport can't be measured (0px —
  // jsdom, a hidden/unmounted container, SSR), the virtualizer yields no
  // items despite there being rows. Rendering nothing would be wrong and is
  // unstable across re-renders (sort/select/group re-measure to 0), so fall
  // back to rendering every item. In a real browser with a measured viewport
  // the windowed path below runs instead.
  if (virtualItems.length === 0 && items.length > 0) {
    return <tbody data-slot="data-table-virtual-body">{items.map(renderItem)}</tbody>
  }

  return (
    <tbody data-slot="data-table-virtual-body">
      {paddingTop > 0 ? (
        <tr aria-hidden="true">
          <td colSpan={columnSpan} style={{ height: paddingTop, padding: 0, border: 0 }} />
        </tr>
      ) : null}
      {virtualItems.map((virtualItem) => {
        const item = items[virtualItem.index]
        if (!item) return null
        return renderItem(item)
      })}
      {paddingBottom > 0 ? (
        <tr aria-hidden="true">
          <td colSpan={columnSpan} style={{ height: paddingBottom, padding: 0, border: 0 }} />
        </tr>
      ) : null}
    </tbody>
  )
}
