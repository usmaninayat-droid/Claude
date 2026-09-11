import type { ReactNode } from 'react'

/**
 * FlatRenderItem — one row of `DataTable`'s virtualized render list: either a
 * data row, a group header, or a per-group summary row. Internal to
 * `DataTable`'s virtualization path — not part of the public component
 * surface.
 */
export type FlatRenderItem<T> =
  | { kind: 'row'; row: T; index: number }
  | { kind: 'group-header'; groupKey: string; rowCount: number }
  | { kind: 'group-summary'; groupKey: string; cells: Partial<Record<string, ReactNode>> }

export interface BuildFlatRenderItemsParams<T> {
  /** Grouped partitions (see `DataTable`'s `groupBy`), or `null` for a flat table. */
  groups: { key: string; rows: { row: T; index: number }[] }[] | null
  /** The rows to render when `groups` is `null`. */
  flatRows: T[]
  /** Group keys currently collapsed — their rows (and summary) are omitted. */
  collapsedGroupKeys: Set<string>
  /** Optional per-group aggregate row builder, mirrors `DataTableGroupBy.getGroupSummary`. */
  getGroupSummary?: (key: string, rows: T[]) => Partial<Record<string, ReactNode>> | undefined
}

/**
 * buildFlatRenderItems — flattens `DataTable`'s (possibly grouped) rows into
 * a single ordered list the virtualizer can window over uniformly. Pure
 * function, no React — kept separate from `DataTable.tsx` for isolated unit
 * testing and to keep the component file from growing unbounded.
 */
export function buildFlatRenderItems<T>({
  groups,
  flatRows,
  collapsedGroupKeys,
  getGroupSummary,
}: BuildFlatRenderItemsParams<T>): FlatRenderItem<T>[] {
  if (!groups) {
    return flatRows.map((row, index) => ({ kind: 'row', row, index }))
  }

  const out: FlatRenderItem<T>[] = []
  for (const group of groups) {
    out.push({ kind: 'group-header', groupKey: group.key, rowCount: group.rows.length })
    if (collapsedGroupKeys.has(group.key)) continue
    for (const { row, index } of group.rows) out.push({ kind: 'row', row, index })
    if (getGroupSummary) {
      const cells = getGroupSummary(
        group.key,
        group.rows.map((r) => r.row),
      )
      if (cells) out.push({ kind: 'group-summary', groupKey: group.key, cells })
    }
  }
  return out
}
