import { ChevronLeft, ChevronRight } from '../icons'
import { cn } from '../lib/cn'
import { Button } from '../primitives/Button'

/**
 * DataTablePagination — presentational pager for `DataTable`'s `page` /
 * `pageSize` / `rowCount` contract. [L3 composite]
 *
 * Purely presentational (Rule 8 — state-agnostic): it displays the current
 * page/total and calls `onPageChange` with the requested page number. It
 * never fetches or slices data itself — see `DataTable`'s own JSDoc
 * ("Pagination contract") for how `page`/`pageSize`/`rowCount` combine.
 */
export interface DataTablePaginationProps {
  /** Current 1-indexed page. */
  page: number
  /** Total number of pages (≥ 1). */
  pageCount: number
  /** Rows per page — used only to compute the "X–Y of Z" range label. */
  pageSize: number
  /** Total row count across all pages. Omit to hide the range label. */
  rowCount?: number
  /** Fires with the requested 1-indexed page when Previous/Next is clicked. */
  onPageChange: (page: number) => void
  className?: string
}

export function DataTablePagination({
  page,
  pageCount,
  pageSize,
  rowCount,
  onPageChange,
  className,
}: DataTablePaginationProps) {
  const rangeLabel = formatRangeLabel(page, pageSize, rowCount)

  return (
    <div
      data-slot="data-table-pagination"
      className={cn(
        'flex items-center justify-between gap-4 border-t border-border px-3 py-2 text-xs text-muted-foreground',
        className,
      )}
    >
      <span>{rangeLabel}</span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4 rtl:-scale-x-100" />
        </Button>
        <span aria-live="polite">
          Page {page} of {pageCount}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4 rtl:-scale-x-100" />
        </Button>
      </div>
    </div>
  )
}

function formatRangeLabel(page: number, pageSize: number, rowCount?: number): string | null {
  if (rowCount === undefined) return null
  if (rowCount === 0) return '0 of 0'
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, rowCount)
  return `${start}–${end} of ${rowCount}`
}
