import { useCallback, useMemo, useState } from 'react'
import type { DataTableColumn, SortState } from './DataTable.types'

/**
 * useDataTableSort — DataTable's controlled/uncontrolled sort state + the
 * derived sorted rows. Internal to DataTable. Behavior is identical to the
 * original inline implementation.
 */
export function useDataTableSort<T>({
  data,
  columnByKey,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
}: {
  data: T[]
  columnByKey: Map<string, DataTableColumn<T>>
  sort?: SortState | null
  defaultSort?: SortState | null
  onSortChange?: (sort: SortState | null) => void
}) {
  const [internalSort, setInternalSort] = useState<SortState | null>(defaultSort)
  const sort = sortProp !== undefined ? sortProp : internalSort

  const cycleSort = useCallback(
    (key: string) => {
      const next: SortState | null =
        !sort || sort.key !== key
          ? { key, direction: 'asc' }
          : sort.direction === 'asc'
            ? { key, direction: 'desc' }
            : null
      if (sortProp === undefined) setInternalSort(next)
      onSortChange?.(next)
    },
    [sort, sortProp, onSortChange],
  )

  const sortedData = useMemo(() => {
    if (!sort) return data
    const col = columnByKey.get(sort.key)
    if (!col) return data
    const accessor =
      col.sortAccessor ?? ((row: T) => (row as Record<string, unknown>)[sort.key])
    const dir = sort.direction === 'asc' ? 1 : -1
    return [...data].sort((a, b) => {
      const av = accessor(a)
      const bv = accessor(b)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [data, sort, columnByKey])

  return { sort, cycleSort, sortedData }
}
