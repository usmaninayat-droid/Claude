import type { Dispatch, KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject, SetStateAction } from 'react'
import { ArrowDownUp } from '@fams/ui-kit/icons'
import type { FilterExpandColumn, FilterRowTemplate } from '@fams/v5-composer'
import { Checkbox, Input } from '@fams/ui-kit'
import { cn } from '../../lib/cn'
import { cellText, columnMinWidth, type SelectorRow } from './ExpandableSelectorSheet'
import { FilterEntityRow, FilterRowBadge } from './filter-row-template'

/**
 * ExpandableSelectorTable — the side sheet's scrolling entity grid (FAMILY C,
 * WAVE C5). Split out of `ExpandableSelectorSheet` purely for the root
 * CLAUDE.md rule-12 file budget; it is INTERNAL to the sheet, has no
 * standalone meaning, and is covered by its parent's demo/tests rather than
 * its own registry entry (the `COVERED_BY_PARENT` treatment
 * `DataTableVirtualBody` gets).
 *
 * Everything load-bearing about it is spelled out in the parent's JSDoc:
 * - `role="grid"` + `aria-multiselectable` + per-row `aria-selected` (D-4/D.27)
 * - roving `tabIndex`: the body is ONE tab stop, never one per row (D.29)
 * - a 96px per-column floor with the h-scroll on THIS container (E.43)
 * - a sticky header row (E.44)
 * - spacer-padded windowing driven by the parent's `window` slice (E.46)
 */
export interface ExpandableSelectorTableProps {
  /** The ordered, visible column set — already resolved from metadata. */
  columns: FilterExpandColumn[]
  /** Row ids in render order (search + sort + Selected-to-Top applied). */
  orderedIds: string[]
  /** Id → row lookup. */
  byId: Map<string, SelectorRow>
  /** The windowed slice of `orderedIds` the parent decided to render. */
  window: { start: number; end: number }
  /** Ids rendered right now (`orderedIds.slice(window.start, window.end)`). */
  renderedIds: string[]
  /** The STAGED selection (never the confirmed one) — G.63. */
  pendingSet: Set<string>
  multiple: boolean
  /** Index of the roving tab stop. */
  activeRow: number
  setActiveRow: Dispatch<SetStateAction<number>>
  sort: { col: string; dir: 'asc' | 'desc' } | null
  onSortColumn: (col: string) => void
  onToggleRow: (id: string) => void
  onToggleAll: () => void
  allPendingSelected: boolean
  somePendingSelected: boolean
  /** Used only to NAME things — never to branch on an entity (J.87). */
  facetLabel: string
  titleId: string
  rowDomId: (id: string) => string
  scrollerRef: RefObject<HTMLDivElement | null>
  onScroll: (element: HTMLDivElement) => void
  onRowKeyDown: (event: ReactKeyboardEvent<HTMLTableRowElement>, index: number, id: string) => void
  totalMinWidth: number
  rowHeight: number
  /**
   * R-37 / FIX WAVE C-2 / P2 — rendered inside the empty state when the facet
   * enables create-from-search and the user typed something. Omitted (the
   * default) keeps the plain `No results found!` the sheet always had.
   */
  emptyAction?: ReactNode
  /**
   * R-38/DN-30 — when the facet's metadata authors one, the FIRST column's
   * cell is replaced by the rich identity block (avatar · name over a `#` id
   * pill · status badge) and the columns the template consumed are not
   * repeated as plain cells. Omitted ⇒ plain cells everywhere, as before.
   */
  rowTemplate?: FilterRowTemplate
  /**
   * R-30/DN-23 — the per-column quick-filter row, shown only while the
   * toolbar's filter button is pressed. `undefined` ⇒ the row is not rendered.
   */
  columnFilters?: Record<string, string>
  onColumnFilterChange?: (col: string, next: string) => void
}

export function ExpandableSelectorTable({
  columns,
  orderedIds,
  byId,
  window,
  renderedIds,
  pendingSet,
  multiple,
  activeRow,
  setActiveRow,
  sort,
  onSortColumn,
  onToggleRow,
  onToggleAll,
  allPendingSelected,
  somePendingSelected,
  facetLabel,
  titleId,
  rowDomId,
  scrollerRef,
  onScroll,
  onRowKeyDown,
  totalMinWidth,
  rowHeight: ROW_HEIGHT,
  emptyAction,
  rowTemplate,
  columnFilters,
  onColumnFilterChange,
}: ExpandableSelectorTableProps) {
  /*
   * Columns the rich template already draws are not repeated as their own
   * plain cells — the row would otherwise show the same name twice. The
   * template block replaces the FIRST visible column's cell; the header keeps
   * that column's own label, so sorting and the column customizer are
   * unaffected.
   */
  const consumed = new Set<string>()
  if (rowTemplate) {
    for (const col of [rowTemplate.avatar, rowTemplate.title, rowTemplate.subtitle, rowTemplate.idPill]) {
      if (col) consumed.add(col)
    }
  }
  const templateColumn = rowTemplate ? columns[0]?.col : undefined
  const statusColumn = rowTemplate?.statusBadge?.col
  return (
    <div
      ref={scrollerRef}
      data-slot="sheet-table-scroller"
      // E.43 — the horizontal scroller is THIS container, never the sheet
      // and never the document (E.33).
      className="order-none min-h-0 flex-1 overflow-x-auto overflow-y-auto px-6 pb-4"
      onScroll={(event) => onScroll(event.currentTarget)}
    >
      <table
        data-slot="sheet-table"
        // D-4/D.27 — `role="grid"` (not the native `table` role) is what
        // makes `aria-multiselectable` + per-row `aria-selected` legal;
        // axe rejects both on a plain table.
        role="grid"
        data-total-min-width={totalMinWidth}
        aria-labelledby={titleId}
        aria-multiselectable={multiple || undefined}
        style={{ minWidth: `${totalMinWidth}px` }}
        className="w-full border-collapse text-sm"
      >
        <thead className="sticky top-0 z-10 bg-card">
          <tr>
            <th scope="col" className="w-12 px-3 py-2.5 text-start">
              {multiple ? (
                <Checkbox
                  data-slot="sheet-select-all-box"
                  aria-label={`Select all ${orderedIds.length} shown ${facetLabel}`}
                  checked={
                    allPendingSelected ? true : somePendingSelected ? 'indeterminate' : false
                  }
                  onCheckedChange={onToggleAll}
                />
              ) : (
                <span className="sr-only">Selected</span>
              )}
            </th>
            {columns.map((column) => {
              const isSorted = sort?.col === column.col
              const sortable = column.sortable !== false
              return (
                <th
                  key={column.col}
                  scope="col"
                  // E.43 — the 96px floor, on the header cell, so the
                  // column is never crushed; the container scrolls instead.
                  style={{ minWidth: `${columnMinWidth(column)}px` }}
                  aria-sort={
                    !sortable
                      ? undefined
                      : isSorted
                        ? sort!.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                  }
                  className="px-3 py-2.5 text-start text-xs font-semibold uppercase text-muted-foreground"
                >
                  {sortable ? (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => onSortColumn(column.col)}
                      className="inline-flex items-center gap-1 uppercase outline-none hover:text-foreground"
                    >
                      {column.label}
                      <ArrowDownUp className="size-3 opacity-50" aria-hidden="true" />
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              )
            })}
          </tr>
          {columnFilters ? (
            <tr data-slot="sheet-quick-filter">
              <th scope="col" className="px-3 pb-2">
                <span className="sr-only">Column filters</span>
              </th>
              {columns.map((column) => (
                <th key={column.col} scope="col" className="px-3 pb-2">
                  <Input
                    data-slot={`sheet-quick-filter-${column.col}`}
                    type="search"
                    value={columnFilters[column.col] ?? ''}
                    aria-label={`Filter by ${column.label}`}
                    placeholder={column.label}
                    onChange={(event) => onColumnFilterChange?.(column.col, event.target.value)}
                  />
                </th>
              ))}
            </tr>
          ) : null}
        </thead>
        <tbody>
          {/* Windowing spacers keep the scrollbar honest (E.46). */}
          {window.start > 0 ? (
            <tr aria-hidden="true">
              <td
                colSpan={columns.length + 1}
                style={{ height: window.start * ROW_HEIGHT, padding: 0, border: 0 }}
              />
            </tr>
          ) : null}
          {renderedIds.map((id, i) => {
            const index = window.start + i
            const row = byId.get(id) ?? {}
            const checked = pendingSet.has(id)
            return (
              <tr
                key={id}
                id={rowDomId(id)}
                data-slot="sheet-row"
                aria-selected={checked}
                // D.29 — ROVING tabIndex: the body is ONE tab stop, so 292
                // rows are 292 arrow steps, not 292 Tab presses.
                tabIndex={index === activeRow ? 0 : -1}
                onFocus={() => setActiveRow(index)}
                onKeyDown={(event) => onRowKeyDown(event, index, id)}
                onClick={() => onToggleRow(id)}
                style={{ height: ROW_HEIGHT }}
                className="cursor-pointer border-b border-border outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring hover:bg-muted/50"
              >
                <td className="px-3">
                  {/*
                    Presentational: the row itself carries `aria-selected`
                    and the Space/Enter handler, so this must NOT become a
                    second focusable per row (D.29).
                  */}
                  <span
                    aria-hidden="true"
                    data-slot={multiple ? 'row-checkbox' : 'row-radio'}
                    data-checked={checked || undefined}
                    className={cn(
                      'block size-4 border border-border',
                      // R-24/DN-16 — single select draws radios.
                      multiple ? 'rounded-xs' : 'rounded-full',
                      checked && 'border-primary bg-primary',
                    )}
                  />
                </td>
                {columns.map((column) => {
                  if (rowTemplate && column.col === templateColumn) {
                    return (
                      <td
                        key={column.col}
                        style={{ minWidth: `${columnMinWidth(column)}px` }}
                        className="px-3 text-foreground"
                      >
                        <FilterEntityRow template={rowTemplate} omitStatus read={(col) => cellText(row, col)} />
                      </td>
                    )
                  }
                  if (rowTemplate && column.col === statusColumn) {
                    return (
                      <td
                        key={column.col}
                        style={{ minWidth: `${columnMinWidth(column)}px` }}
                        className="px-3"
                      >
                        <FilterRowBadge template={rowTemplate} value={cellText(row, column.col)} />
                      </td>
                    )
                  }
                  /*
                    A column the identity block already drew keeps its CELL
                    (dropping it would desync every row from the header row)
                    but renders nothing — the value is not shown twice.
                  */
                  if (rowTemplate && consumed.has(column.col)) {
                    return (
                      <td
                        key={column.col}
                        style={{ minWidth: `${columnMinWidth(column)}px` }}
                        className="px-3"
                      />
                    )
                  }
                  return (
                    <td
                      key={column.col}
                      style={{ minWidth: `${columnMinWidth(column)}px` }}
                      className="truncate px-3 text-foreground"
                    >
                      {cellText(row, column.col)}
                    </td>
                  )
                })}
              </tr>
            )
          })}
          {window.end < orderedIds.length ? (
            <tr aria-hidden="true">
              <td
                colSpan={columns.length + 1}
                style={{
                  height: (orderedIds.length - window.end) * ROW_HEIGHT,
                  padding: 0,
                  border: 0,
                }}
              />
            </tr>
          ) : null}
          {orderedIds.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="px-3 py-10 text-center text-muted-foreground"
              >
                No results found!
                {emptyAction}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
