import { ChevronDown, ChevronUp } from '../icons'
import { cn } from '../lib/cn'
import { CountChip } from './CountChip'
import type { DataTableGroupBy } from './DataTable.types'

export interface DataTableGroupHeaderRowProps<T> {
  groupKey: string
  rowCount: number
  columnSpan: number
  isCollapsed: boolean
  onToggle: (key: string) => void
  groupBy?: DataTableGroupBy<T>
}

/**
 * DataTableGroupHeaderRow — the collapsible row above a group's members.
 * [internal to DataTable — not part of the public component surface]
 *
 * figma-spec-list.md §4 "Group header row anatomy" (36px tall, white/`bg-card`
 * row — NOT the muted band a generic grouped-table convention might reach
 * for): a collapse chevron, the group's own label content (`getGroupLabel` —
 * e.g. a caller-rendered `StatusPill` for a status-keyed group, or plain text
 * for any other groupable column), then a neutral `CountChip` holding the
 * group's row count. Pulled out of `DataTable.tsx` per root CLAUDE.md rule 12
 * (~300-line soft budget) — same decomposition `DataTableColumnsMenu`/
 * `DataTablePagination`/`DataTableSummaryRow`/`DataTableVirtualBody` already
 * went through.
 */
export function DataTableGroupHeaderRow<T>({
  groupKey,
  rowCount,
  columnSpan,
  isCollapsed,
  onToggle,
  groupBy,
}: DataTableGroupHeaderRowProps<T>) {
  return (
    <tr data-slot="data-table-group-header-row" className="h-9 border-b border-border bg-card">
      <td colSpan={columnSpan} className="p-0">
        <button
          type="button"
          onClick={() => onToggle(groupKey)}
          aria-expanded={!isCollapsed}
          className={cn(
            'flex h-9 w-full items-center gap-2 px-3 text-start text-body-sm font-medium text-foreground outline-none',
            'hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
          )}
        >
          {/* figma-spec-list.md §4 / round-1 design QA (D4): the caret points
              UP for an EXPANDED group, DOWN for a collapsed one — the
              inverse of the more common "chevron points toward what will
              appear" convention, but that's what the reference shows.
              Vertical, so no RTL mirroring is needed (unlike a horizontal
              disclosure caret). */}
          {isCollapsed ? (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronUp className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="inline-flex min-w-0 items-center">
            {groupBy?.getGroupLabel ? groupBy.getGroupLabel(groupKey) : groupKey}
          </span>
          <CountChip>{rowCount}</CountChip>
        </button>
      </td>
    </tr>
  )
}

DataTableGroupHeaderRow.displayName = 'DataTableGroupHeaderRow'
