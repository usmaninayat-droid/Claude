import { useCallback, useMemo, useState } from 'react'
import type { DataTableGroupBy } from './DataTable.types'

export interface DataTableGroup<T> {
  key: string
  rows: { row: T; index: number }[]
}

/**
 * useDataTableGrouping — DataTable's row grouping + controlled/uncontrolled
 * collapse state (mirroring sort/defaultSort). Returns null groups when
 * `groupBy` is omitted. Internal to DataTable; behavior identical to the
 * original inline implementation.
 */
export function useDataTableGrouping<T>({
  groupBy,
  pageData,
  collapsedGroupKeys: collapsedGroupKeysProp,
  defaultCollapsedGroupKeys,
  onGroupToggle,
}: {
  groupBy?: DataTableGroupBy<T>
  pageData: T[]
  collapsedGroupKeys?: string[]
  defaultCollapsedGroupKeys?: string[]
  onGroupToggle?: (key: string) => void
}) {
  const [internalCollapsedGroupKeys, setInternalCollapsedGroupKeys] = useState<
    Set<string>
  >(() => new Set(defaultCollapsedGroupKeys))

  const collapsedGroupKeys = useMemo(
    () =>
      collapsedGroupKeysProp !== undefined
        ? new Set(collapsedGroupKeysProp)
        : internalCollapsedGroupKeys,
    [collapsedGroupKeysProp, internalCollapsedGroupKeys],
  )

  const toggleGroup = useCallback(
    (key: string) => {
      if (collapsedGroupKeysProp === undefined) {
        setInternalCollapsedGroupKeys((prev) => {
          const next = new Set(prev)
          if (next.has(key)) next.delete(key)
          else next.add(key)
          return next
        })
      }
      onGroupToggle?.(key)
    },
    [collapsedGroupKeysProp, onGroupToggle],
  )

  const groups = useMemo(() => {
    if (!groupBy) return null
    const out: DataTableGroup<T>[] = []
    const indexOf = new Map<string, number>()
    pageData.forEach((row, index) => {
      const key = groupBy.getGroupKey(row)
      let i = indexOf.get(key)
      if (i === undefined) {
        i = out.length
        indexOf.set(key, i)
        out.push({ key, rows: [] })
      }
      out[i].rows.push({ row, index })
    })
    return out
  }, [groupBy, pageData])

  return { groups, collapsedGroupKeys, toggleGroup }
}
