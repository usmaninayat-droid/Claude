import { useCallback, useMemo, useState } from 'react'
import type { DataTableColumn } from './DataTable.types'
import type { ColumnCatalogItem } from './ColumnCustomizer'

/**
 * useDataTableColumns — DataTable's column visibility + order model
 * (controlled visible-keys mode OR legacy order+hidden mode), the derived
 * visible columns, the customizer catalog, and the commit callback. Internal
 * to DataTable; behavior identical to the original inline implementation.
 */
export function useDataTableColumns<T>({
  columns,
  columnOrder,
  onColumnOrderChange,
  hiddenColumnKeys,
  onColumnConfigChange,
}: {
  columns: DataTableColumn<T>[]
  columnOrder?: string[]
  onColumnOrderChange?: (orderedVisibleKeys: string[]) => void
  hiddenColumnKeys?: string[]
  onColumnConfigChange?: (config: { order: string[]; hidden: string[] }) => void
}) {
  const visibleKeysMode = onColumnOrderChange !== undefined

  const allKeys = useMemo(() => columns.map((c) => c.key), [columns])

  const columnByKey = useMemo(() => {
    const map = new Map<string, DataTableColumn<T>>()
    for (const c of columns) map.set(c.key, c)
    return map
  }, [columns])

  const [internalOrder, setInternalOrder] = useState<string[]>(allKeys)
  const [internalHidden, setInternalHidden] = useState<string[]>(() =>
    columns.filter((c) => c.isHiddenByDefault).map((c) => c.key),
  )

  const order = columnOrder ?? internalOrder
  const hidden = hiddenColumnKeys ?? internalHidden

  const effectiveOrder = useMemo(() => {
    const known = order.filter((k) => allKeys.includes(k))
    const missing = allKeys.filter((k) => !known.includes(k))
    return [...known, ...missing]
  }, [order, allKeys])

  const visibleKeys = useMemo(() => {
    if (visibleKeysMode) {
      const raw = columnOrder ?? allKeys
      return raw.filter((k) => columnByKey.has(k))
    }
    return effectiveOrder.filter((k) => !hidden.includes(k))
  }, [visibleKeysMode, columnOrder, allKeys, columnByKey, effectiveOrder, hidden])

  const visibleColumns = useMemo(
    () =>
      visibleKeys
        .map((k) => columnByKey.get(k))
        .filter((c): c is DataTableColumn<T> => Boolean(c)),
    [visibleKeys, columnByKey],
  )

  const catalog = useMemo<ColumnCatalogItem[]>(
    () =>
      columns.map((c) => ({
        key: c.key,
        label: typeof c.label === 'string' ? c.label : c.key,
        group: c.group ?? 'Columns',
        icon: c.icon,
        required: c.isHideable === false,
      })),
    [columns],
  )

  const commitVisibleKeys = useCallback(
    (nextVisible: string[]) => {
      if (visibleKeysMode) {
        onColumnOrderChange?.(nextVisible)
        return
      }
      const nextHidden = allKeys.filter((k) => !nextVisible.includes(k))
      const nextOrder = [...nextVisible, ...nextHidden]
      if (columnOrder === undefined) setInternalOrder(nextOrder)
      if (hiddenColumnKeys === undefined) setInternalHidden(nextHidden)
      onColumnConfigChange?.({ order: nextOrder, hidden: nextHidden })
    },
    [
      visibleKeysMode,
      onColumnOrderChange,
      allKeys,
      columnOrder,
      hiddenColumnKeys,
      onColumnConfigChange,
    ],
  )

  return { columnByKey, visibleColumns, visibleKeys, catalog, commitVisibleKeys }
}
