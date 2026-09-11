import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

interface SummaryColumnSpec {
  key: string
  align?: 'start' | 'center' | 'end'
}

const ALIGN_CLASS: Record<NonNullable<SummaryColumnSpec['align']>, string> = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
}

export interface DataTableSummaryRowProps {
  /** Visible columns, in render order — mirrors `DataTable`'s current column set. */
  columns: SummaryColumnSpec[]
  /** Column key → cell content for this aggregate row. Omitted keys render blank. */
  cells: Partial<Record<string, ReactNode>>
  /** Reserves the selection-checkbox gutter column when `DataTable.isSelectable`. */
  isSelectable: boolean
  /** `'footer'` = table-wide total (stronger emphasis); `'group'` = per-group subtotal. */
  tone?: 'footer' | 'group'
}

/**
 * DataTableSummaryRow — a single aggregate/KPI row rendered under a
 * `DataTable` body, either as the table-wide footer (`summaryRow` prop) or
 * after a group's rows (`groupBy.getGroupSummary`). [internal to DataTable —
 * not part of the public component surface]
 *
 * Domain-agnostic (Rule 8/10): the caller supplies every cell's content —
 * this component only lays cells out with the same column alignment and
 * selection-gutter rules as the body rows it sits under.
 */
export function DataTableSummaryRow({
  columns,
  cells,
  isSelectable,
  tone = 'footer',
}: DataTableSummaryRowProps) {
  return (
    <tr
      data-slot="data-table-summary-row"
      className={cn(
        'border-t border-border font-semibold text-foreground',
        tone === 'footer' ? 'bg-muted/40' : 'bg-muted/20',
      )}
    >
      {isSelectable ? <td className="w-10 px-3 py-2 align-middle" /> : null}
      {columns.map((col) => (
        <td
          key={col.key}
          className={cn('px-3 py-2 align-middle', ALIGN_CLASS[col.align ?? 'start'])}
        >
          {cells[col.key] ?? null}
        </td>
      ))}
    </tr>
  )
}
