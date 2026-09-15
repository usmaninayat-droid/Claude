import { ArrowUp, ArrowDown, ArrowUpDown } from '../icons'
import { cn } from '../lib/cn'
import { ColumnResizeHandle } from './DataTableColumnControls'
import { STICKY_CELL_BASE, ALIGN_CLASS, HEADER_JUSTIFY_CLASS } from './dataTableLayoutClasses'
import { COLUMN_RESIZE_MIN_PX } from './useDataTableColumnResize'
import type { DataTableColumn, SortState } from './DataTable.types'

/**
 * DataTableHeaderCell — one `<th>` of `DataTable`'s header row: label +
 * optional sort button, plus the two §7 (text-truncation.md) controls —
 * the expand-toggle button and the drag/keyboard-resize handle. [internal
 * to DataTable — not part of the public component surface, same convention
 * as `DataTableGroupHeaderRow`/`DataTableStackedRow`]
 *
 * Pulled out of `DataTable.tsx` itself (root CLAUDE.md rule 12's ~300-line
 * soft budget) once column expansion/resize pushed the inline `<th>` block
 * past a single screenful — same decomposition call `DataTableColumnsMenu`/
 * `DataTablePagination`/`DataTableSummaryRow`/`DataTableVirtualBody` already
 * made for their own pieces of this component.
 */
export interface DataTableHeaderCellProps<T> {
  col: DataTableColumn<T>
  sort: SortState | null
  cycleSort: (key: string) => void
  /** Cell density — see `DataTableProps.density`. */
  density?: 'default' | 'compact'
  isStickyThisCol: boolean
  /**
   * The exact class set the pinned identity cell must carry — lane offset
   * and seam included. Resolved once in `DataTable` (see `identityPinClass`)
   * so the header and the body cannot disagree about the lane. Ignored when
   * `isStickyThisCol` is false.
   */
  stickyPinClass?: string
  /** `undefined` when no column is expanded (default, unaffected) —
   * `columnWidthStyle`'s own `null` vs `key` distinction lives in the
   * expansion hook; this component only needs to know WHICH key, if any. */
  expandedKey: string | null
  toggleExpanded: (key: string) => void
  registerTap: (key: string, pointerType: string) => void
  consumeSuppressedClick: () => boolean
  columnWidthStyle: (col: DataTableColumn<T>) => { width?: string; minInlineSize?: string } | undefined
  beginResize: (col: DataTableColumn<T>, event: React.PointerEvent<HTMLElement>) => void
  stepResize: (col: DataTableColumn<T>, currentWidthPx: number, direction: 1 | -1) => void
  resizedWidthPx: (key: string) => number | undefined
}

export function DataTableHeaderCell<T>({
  density = 'default',
  col,
  sort,
  cycleSort,
  isStickyThisCol,
  stickyPinClass,
  expandedKey,
  toggleExpanded,
  registerTap,
  consumeSuppressedClick,
  columnWidthStyle,
  beginResize,
  stepResize,
  resizedWidthPx,
}: DataTableHeaderCellProps<T>) {
  const isSorted = sort?.key === col.key
  const isExpandedCol = expandedKey === col.key
  // Only meaningful outside expansion — §7 deliberately hides the resize
  // handle while a column is expanded (drag-resize and "compress everyone
  // else" are alternative ways to the SAME end; combining them is out of
  // scope for this pass).
  const resizedPx = expandedKey === null ? resizedWidthPx(col.key) : undefined
  const widthStyle =
    resizedPx !== undefined ? { width: `${resizedPx}px`, minInlineSize: col.minWidth } : columnWidthStyle(col)
  const columnLabelText = typeof col.label === 'string' ? col.label : col.key

  return (
    <th
      scope="col"
      style={widthStyle}
      // Explicit accessible name, computed EXACTLY as the old "name from
      // content" would have for a plain label — otherwise the accname
      // algorithm would concatenate the expand-toggle/resize-handle
      // controls' own names into this cell's name too (they're
      // descendants), silently changing what `getByRole('columnheader', {
      // name })`/screen-reader table navigation announces for every
      // existing column, not just ones this task touched.
      aria-label={columnLabelText}
      // Touch double-tap (§7) on the header itself (label or whitespace,
      // not just the expand button) — no-ops for any non-touch pointer.
      onPointerUp={(e) => registerTap(col.key, e.pointerType)}
      className={cn(
        'font-semibold',
        density === 'compact' ? 'px-2.5 py-1.5' : 'px-3 py-2.5',
        ALIGN_CLASS[col.align ?? 'start'],
        // A positioning context for the resize handle below. Skipped when
        // this cell is already `sticky` (any non-static position already
        // establishes one).
        !isStickyThisCol && 'relative',
        isStickyThisCol && [stickyPinClass ?? STICKY_CELL_BASE, 'z-20'],
      )}
      aria-sort={
        isSorted ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : col.isSortable ? 'none' : undefined
      }
    >
      <div className={cn('group/col-header flex items-center gap-1', HEADER_JUSTIFY_CLASS[col.align ?? 'start'])}>
        {col.isSortable ? (
          <button
            type="button"
            onClick={() => {
              // A resolved double-tap already expanded/collapsed this
              // column — the same tap's `click` must not ALSO cycle sort a
              // moment later.
              if (consumeSuppressedClick()) return
              cycleSort(col.key)
            }}
            // Hover tooltip (figma live-monitoring spec §1.10): announces
            // what the NEXT click does.
            title={isSorted && sort!.direction === 'asc' ? 'Click to sort descending' : 'Click to sort ascending'}
            // `uppercase` is re-applied here (not just inherited from
            // `thead`'s own class) because the browser UA stylesheet resets
            // `text-transform` on `button` — without this, every SORTABLE
            // header silently lost the caption uppercase treatment while
            // non-sortable headers kept it (finding: asset list's headers
            // rendered Title Case, not uppercase, only on columns with the
            // sort affordance).
            className="group inline-flex items-center gap-1 uppercase outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {col.label}
            {isSorted ? (
              // The SORTED column carries a primary-tinted arrow.
              sort!.direction === 'asc' ? (
                <ArrowUp className="size-3 text-primary" data-slot="sort-arrow" />
              ) : (
                <ArrowDown className="size-3 text-primary" data-slot="sort-arrow" />
              )
            ) : (
              // UNSORTED columns show NO glyph at rest (round-1 visual
              // finding #28 — a persistent ↑↓ on every header is not the
              // Figma). The hint still appears on hover / keyboard focus so
              // the affordance stays discoverable, which a plain removal
              // would lose. `[@media(hover:none)]:opacity-50` is the
              // coarse-pointer fallback, NOT decoration: Tailwind v4's
              // `hover` variant (and therefore `group-hover`) is itself
              // wrapped in `@media (hover: hover)`, so on a touch device the
              // reveal can never fire and the affordance would be invisible
              // with no way to find it (Phase 7 code review, finding 5 —
              // the demo and FAMS Desk both target tablets). The two media
              // queries are mutually exclusive, so their emitted order
              // cannot matter.
              <ArrowUpDown
                data-slot="sort-hint"
                className="size-3 opacity-0 transition-opacity group-hover:opacity-50 group-focus-visible:opacity-50 [@media(hover:none)]:opacity-50"
              />
            )}
          </button>
        ) : (
          col.label
        )}
        {/* The per-column hover "Expand" toggle (icon-only Maximize/Minimize
            button) was removed globally: it added visual noise on every column
            header and duplicated an affordance the drag/keyboard resize handle
            below already provides. The double-tap-to-expand pointer gesture
            (touch) still works via `toggleExpanded` in the caller; the button
            was the only visible entry point on desktop. */}
      </div>
      {expandedKey === null ? (
        <ColumnResizeHandle
          onPointerDown={(e) => beginResize(col, e)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
            e.preventDefault()
            const th = (e.currentTarget as HTMLElement).closest('th')
            // `Math.max(..., COLUMN_RESIZE_MIN_PX)`, not `??`: an
            // unmeasured/degenerate layout reports `0` (a real number, so
            // `??` would keep it) — without the floor, the FIRST
            // ArrowRight from that state would step to 16px and
            // immediately get clamped back down to the 64px floor by
            // `stepResize`, silently swallowing the very first keypress.
            const measured = th?.getBoundingClientRect().width ?? COLUMN_RESIZE_MIN_PX
            const current = resizedPx ?? Math.max(measured, COLUMN_RESIZE_MIN_PX)
            stepResize(col, current, e.key === 'ArrowRight' ? 1 : -1)
          }}
          label={`Resize ${columnLabelText} column`}
          valueNow={resizedPx ?? COLUMN_RESIZE_MIN_PX}
          valueMin={COLUMN_RESIZE_MIN_PX}
        />
      ) : null}
    </th>
  )
}

DataTableHeaderCell.displayName = 'DataTableHeaderCell'
