import {
  Fragment,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { Circle } from '../icons'
import { cn } from '../lib/cn'
import { Checkbox } from '../primitives/Checkbox'
import { IconControl } from './IconControl'
import { DataTableSummaryRow } from './DataTableSummaryRow'
import { DataTablePagination } from './DataTablePagination'
import { DataTableVirtualBody } from './DataTableVirtualBody'
import { DataTableColumnsMenu } from './DataTableColumnsMenu'
import { DataTableGroupHeaderRow } from './DataTableGroupHeaderRow'
import { DataTableStackedRow } from './DataTableStackedRow'
import { DataTableHeaderCell } from './DataTableHeaderCell'
import {
  STICKY_CELL_BASE,
  STICKY_CELL_END_BASE,
  STICKY_CELL_LANE_2,
  ALIGN_CLASS,
} from './dataTableLayoutClasses'
import { renderDefaultCell, CONTENT_TYPE_TD_CLASS } from './dataTableCellText'
import { buildFlatRenderItems } from './dataTableFlatItems'
import { ROW_AFFORDANCE_GROUP, ROW_AFFORDANCE_SURFACE } from './row-affordance'
import { useDataTableSort } from './useDataTableSort'
import { useDataTableColumns } from './useDataTableColumns'
import { useDataTablePagination } from './useDataTablePagination'
import { useDataTableGrouping } from './useDataTableGrouping'
import { useDataTableColumnExpansion } from './useDataTableColumnExpansion'
import { useDataTableColumnResize } from './useDataTableColumnResize'
import { useDataTableResponsiveColumns } from './useDataTableResponsiveColumns'
import type { DataTableProps } from './DataTable.types'

/**
 * DataTable — the platform "base table".
 *
 * Ported from the team GH design-system `data-table.tsx` and the real v5
 * q-table wrapper (sorting + column-customization panel, Figma 504-27970 /
 * 495-25285). Framework-agnostic in intent: this React build and the Vue
 * `DataTable.vue` are kept in API-parity.
 *
 * Structure: this file orchestrates + renders; the logic lives in focused
 * sibling hooks — `useDataTableSort`, `useDataTableColumns`,
 * `useDataTablePagination`, `useDataTableGrouping` — and subcomponents
 * (`DataTableColumnsMenu`, `DataTableVirtualBody`, `DataTablePagination`,
 * `DataTableSummaryRow`). Types are in `DataTable.types.ts`.
 *
 * Features
 *  - Column definitions: `key` / `label` / `render` / `width` / `align`.
 *  - Sorting: click a sortable header to cycle asc → desc → none.
 *  - Row selection (checkbox column, header select-all, or `selectionMode="radio"`
 *    for an exclusive single-choice list with no select-all) + row click.
 *  - Column customization: a "Columns" panel to show/hide and reorder
 *    (drag handle) columns. Controlled or uncontrolled.
 *  - Sticky header, empty state, loading state.
 *  - Optional grouping via `groupBy`: collapsible labeled sections with a
 *    per-group row count. Additive — omit `groupBy` for flat-table behavior.
 *    Collapse is controlled or uncontrolled.
 *  - Row virtualization (rendering only): opt-in windowed rendering
 *    (`virtualized` + `estimateRowHeight`). Off by default.
 *  - Pagination: presentational only, never fetches. See "Pagination
 *    contract" below.
 *  - Summary/KPI rows: a caller-supplied `summaryRow` footer, and/or a
 *    per-group aggregate via `groupBy.getGroupSummary`.
 *  - Viewport overflow (UX ruling A6, run 2026-09-05): by default, columns
 *    auto-hide in priority order as the container narrows
 *    (`useDataTableResponsiveColumns`); `disableResponsiveHide` opts a table
 *    OUT of that entirely in favor of its own horizontal scroll — every
 *    column stays. `stickyFirstCol`/`stickyTrailingCol` pin the identity
 *    column and the trailing options/row-actions column to the inline-
 *    start/-end edges during that scroll; `stickyLeadingCols` pins BOTH
 *    leading columns (selection + identity) in their own lanes, which is what
 *    A6 actually asks for. `stickyTrailingCol` occludes at rest on an
 *    overflowing table — read its doc comment before passing it.
 *
 * Pagination contract (presentational — DataTable never fetches):
 *  - Omit `pageSize` → no pager, no slicing. Today's behavior, unchanged.
 *  - `pageSize` + `rowCount` ("server mode") → `data` is treated as exactly
 *    one page, rendered as-is; the pager reflects `rowCount`/`pageSize`/
 *    `page`. `onPaginationChange` is the caller's cue to refetch — no slicing.
 *  - `pageSize` alone, no `rowCount`, `data.length > pageSize`
 *    ("client convenience") → DataTable slices its own sorted `data`.
 *
 * Tokens only (no hardcoded colors/sizes) and RTL-safe (logical utilities).
 */

export type {
  SortDirection,
  SortState,
  DataTableColumn,
  DataTableColumnContentType,
  DataTableGroupBy,
  DataTableSummaryCells,
  DataTableProps,
} from './DataTable.types'

/*
 * A23 — the sticky first column and the rest of its row must read as ONE row.
 *
 * The sticky cell used to hardcode `bg-card`: opaque, but state-blind. The
 * rest of a hovered or selected row tinted and the pinned cell did not, so the
 * row read as two blocks with a visible seam at the sticky boundary. The
 * cell's appearance has to follow the ROW's own state.
 *
 * It follows it through an INSET OVERLAY rather than through the cell's own
 * `background-color`, and that is load-bearing rather than stylistic. The row
 * tints are ALPHA colours (`bg-muted/40`, `bg-secondary/40`); setting one as
 * the cell's background REPLACES the opaque `bg-card` instead of layering over
 * it, leaving the cell 40% transparent in exactly the two states that matter —
 * and a sticky cell is the one cell with other cells sliding underneath it, so
 * a hovered row would show the scrolled columns' text ghosting through the
 * pinned cell.
 *
 * So `bg-card` stays on the element (opaque in every state) and the tint rides
 * a `::before` at `-z-10`: inside the cell's own stacking context (`isolate`)
 * the element background paints first, then negative-z descendants, then the
 * content. Composite is opaque, the tint matches the rest of the row, and the
 * cell's own text still paints on top.
 *
 * `group/sticky-row` is NAMED so a row nested inside another `group` can never
 * be captured by this one — the same reasoning `ROW_AFFORDANCE_GROUP` documents.
 * The tint values mirror this table's own row defaults (see `renderRow`), so
 * the two halves cannot drift apart.
 */
const STICKY_ROW_GROUP = 'group/sticky-row'

/**
 * Shared, never-mutated empty set returned when `disableResponsiveHide` is
 * on — avoids allocating a fresh `Set` every render for a table that always
 * shows every column (see `disableResponsiveHide`'s own doc comment).
 */
const NO_AUTO_HIDDEN_KEYS: ReadonlySet<string> = new Set()

function defaultRowId(_row: unknown, index: number): string {
  return String(index)
}

/**
 * RowRadio — `selectionMode="radio"`'s per-row control. Same dot-in-circle
 * visual language as the standalone `RadioGroupItem` primitive (border-border
 * ring, primary-filled dot), reimplemented as a plain `role="radio"` button
 * rather than wrapped in Radix's `RadioGroup.Root` — that root renders a
 * `<div>`, which cannot legally wrap sibling `<tr>` elements. Grouping
 * semantics (exclusivity, one aria-checked=true) are already guaranteed by
 * `toggleRow`'s radio-mode branch, so a native group wrapper buys nothing
 * here that plain `role="radio"` + `aria-checked` doesn't already give.
 */
function RowRadio({ checked, onChange, ariaLabel }: { checked: boolean; onChange: () => void; ariaLabel?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={ariaLabel ?? 'Select row'}
      onClick={onChange}
      className={cn(
        'flex aspect-square size-4 shrink-0 items-center justify-center rounded-full border border-border bg-input-background outline-none transition-shadow',
        'focus-visible:ring-2 focus-visible:ring-ring',
        checked && 'border-primary',
      )}
    >
      {checked ? <Circle className="size-2 fill-primary text-primary" /> : null}
    </button>
  )
}

export function DataTable<T>({
  columns,
  data,
  getRowId = defaultRowId,
  sort: sortProp,
  onSortChange,
  defaultSort = null,
  isSelectable = false,
  selectedIds,
  onSelectionChange,
  selectionMode = 'checkbox',
  onRowClick,
  hasFocusableRows = false,
  isCustomizable = true,
  columnsMenuVariant = 'icon',
  columnOrder,
  onColumnOrderChange,
  hiddenColumnKeys,
  onColumnConfigChange,
  groupBy,
  defaultCollapsedGroupKeys,
  collapsedGroupKeys: collapsedGroupKeysProp,
  onGroupToggle,
  virtualized = false,
  estimateRowHeight = 40,
  page: pageProp,
  pageSize,
  rowCount,
  onPaginationChange,
  summaryRow,
  loading,
  isLoading,
  emptyState,
  loadingState,
  hasStickyHeader = true,
  scrollRegionLabel,
  rowHeight = 'md',
  density = 'default',
  trailingAction,
  rowActions,
  hasRowHoverAffordance,
  stickyFirstCol = false,
  stickyLeadingCols = false,
  stickyTrailingCol = false,
  disableResponsiveHide = false,
  ariaLabel,
  layout = 'table',
  stackedIdentifierKey,
  expandedColumnKey,
  onExpandedColumnChange,
  className,
  ...rest
}: DataTableProps<T>) {
  const busy = loading ?? isLoading ?? false

  /**
   * A6's two leading pins, resolved once for the header and the body so the
   * two rows can never disagree about which cell owns which lane.
   *  - `pinSelectionCol` — lane 1 (`start-0`), the checkbox/radio cell.
   *  - `pinIdentityCol` — the first data column: lane 2 (`start-10`, the
   *    selection column's own width) when that column is rendered AND
   *    pinned, lane 1 otherwise.
   * `stickyFirstCol` alone keeps its exact previous meaning (pin whichever
   * cell renders first), so existing tables are untouched.
   */
  const pinSelectionCol = stickyFirstCol || stickyLeadingCols
  const pinIdentityCol = stickyLeadingCols || (stickyFirstCol && !isSelectable)
  const identityPinClass = cn(
    STICKY_CELL_BASE,
    isSelectable && pinSelectionCol && STICKY_CELL_LANE_2,
  )

  // Declared early — both the responsive-hide measurement and the
  // virtualization scroller below read/attach the SAME node.
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { columnByKey, visibleColumns, visibleKeys, catalog, commitVisibleKeys } =
    useDataTableColumns<T>({
      columns,
      columnOrder,
      onColumnOrderChange,
      hiddenColumnKeys,
      onColumnConfigChange,
    })

  const { sort, cycleSort, sortedData } = useDataTableSort<T>({
    data,
    columnByKey,
    sort: sortProp,
    defaultSort,
    onSortChange,
  })

  const { currentPage, pageCount, pageData, goToPage } = useDataTablePagination<T>({
    sortedData,
    dataLength: data.length,
    page: pageProp,
    pageSize,
    rowCount,
    onPaginationChange,
  })

  /* ---- selection ---- */
  const rowIds = useMemo(
    () => pageData.map((row, i) => getRowId(row, i)),
    [pageData, getRowId],
  )
  const selected = selectedIds ?? []
  const allSelected = rowIds.length > 0 && selected.length >= rowIds.length
  const someSelected = selected.length > 0 && !allSelected

  const toggleAll = useCallback(
    (checked: boolean) => onSelectionChange?.(checked ? rowIds : []),
    [rowIds, onSelectionChange],
  )
  const toggleRow = useCallback(
    (id: string, checked: boolean) => {
      if (selectionMode === 'radio') {
        // Exclusive — selecting a row always replaces the whole selection;
        // there is no "unchecking" a radio (Figma has no deselect affordance).
        onSelectionChange?.(checked ? [id] : [])
        return
      }
      onSelectionChange?.(
        checked ? [...selected, id] : selected.filter((s) => s !== id),
      )
    },
    [selected, onSelectionChange, selectionMode],
  )

  const { groups, collapsedGroupKeys, toggleGroup } = useDataTableGrouping<T>({
    groupBy,
    pageData,
    collapsedGroupKeys: collapsedGroupKeysProp,
    defaultCollapsedGroupKeys,
    onGroupToggle,
  })

  // The icon-variant columns trigger (default) shares the SAME trailing cell
  // `trailingAction` uses — one trailing column serves the header-only
  // `trailingAction`, the default columns pencil, and the per-row
  // `rowActions` (the design has a single trailing cell, not two). The
  // legacy `labelled` variant renders its own toolbar row above the table
  // instead (see below), so it does NOT claim this column.
  const showIconColumnsMenu = isCustomizable && columnsMenuVariant !== 'labelled'
  const showLabelledColumnsMenu = isCustomizable && columnsMenuVariant === 'labelled'
  const hasTrailingColumn = Boolean(trailingAction || showIconColumnsMenu || rowActions)
  const rowAffordance = hasRowHoverAffordance ?? Boolean(rowActions)
  const isCompact = density === 'compact'
  const rowPaddingClass = rowHeight === 'lg' ? 'py-5' : 'py-2'
  /* `density` (compact dense-list) — cell inline padding and the header
   * row's own height. Stated once here and threaded to every cell so the
   * header and body can never disagree about the density they render at. */
  const cellPaddingXClass = isCompact ? 'px-2.5' : 'px-3'
  const headerRowHeightClass = isCompact ? 'h-8' : 'h-10'

  /* ---- column expansion (text-truncation.md §7) ---- */
  const { expandedKey, toggleExpanded, registerTap, consumeSuppressedClick, columnWidthStyle, isTableFixed } =
    useDataTableColumnExpansion<T>({ expandedColumnKey, onExpandedColumnChange })
  const { beginResize, stepResize, resizedWidthPx } = useDataTableColumnResize<T>()

  /* ---- responsive column hide order (text-truncation.md §8) ----
   * A pure DISPLAY filter layered on top of the explicit visible-keys model
   * above — it never mutates `visibleKeys`/the customizer's own state (see
   * the hook's doc comment). `table`-layout only; `stacked` already reads
   * every visible column onto its own wrapping line, so there is nothing to
   * hide there. */
  const reservedColumnsPx = (isSelectable ? 40 : 0) + (hasTrailingColumn ? 64 : 0)
  // Always called (rules of hooks) — its result is simply discarded below
  // when the caller opted out, rather than skipping the call itself.
  const computedAutoHiddenKeys = useDataTableResponsiveColumns<T>({
    containerRef: scrollContainerRef,
    columns: visibleColumns,
    reservedPx: reservedColumnsPx,
  })
  const autoHiddenKeys = disableResponsiveHide ? NO_AUTO_HIDDEN_KEYS : computedAutoHiddenKeys
  const renderedColumns = useMemo(
    () => (layout === 'table' ? visibleColumns.filter((c) => !autoHiddenKeys.has(c.key)) : visibleColumns),
    [layout, visibleColumns, autoHiddenKeys],
  )

  const columnSpan = renderedColumns.length + (isSelectable ? 1 : 0) + (hasTrailingColumn ? 1 : 0)

  const summaryColumnSpecs = useMemo(
    () => renderedColumns.map((c) => ({ key: c.key, align: c.align })),
    [renderedColumns],
  )

  const renderRow = (row: T, index: number) => {
    const id = rowIds[index]
    const isRowSelected = selected.includes(id)
    return (
      <tr
        key={id}
        data-row-id={id}
        data-selected={isRowSelected || undefined}
        onClick={
          onRowClick
            ? () => {
                // A resolved double-tap (§7) already acted on the tap that
                // produced THIS click — e.g. collapsing a column by tapping
                // elsewhere in the row must not ALSO open the row's detail
                // sheet a moment later.
                if (consumeSuppressedClick()) return
                onRowClick(row, index)
              }
            : undefined
        }
        // Opt-in keyboard operability for clickable rows (`hasFocusableRows`):
        // the row itself takes focus and Enter/Space activates it, so a
        // row-click table is not mouse-only. `role="row"` is kept (a
        // `role="button"` here would break the table's own semantics).
        tabIndex={onRowClick && hasFocusableRows ? 0 : undefined}
        onKeyDown={
          onRowClick && hasFocusableRows
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onRowClick(row, index)
                }
              }
            : undefined
        }
        className={cn(
          'border-b border-border transition-colors last:border-b-0',
          // Always present (cheap, no-op unless `stickyFirstCol` also puts a
          // `group-hover/group-data-[selected]` consumer on a cell) so the
          // sticky cell can always read this row's own hover/selected state.
          STICKY_ROW_GROUP,
          // The ONE shared row/card hover recipe (`row-affordance.ts`) — the
          // designer wrote a single rule for list rows, hybrid cards and
          // kanban cards, so all three read it from there.
          rowAffordance && ROW_AFFORDANCE_GROUP,
          rowAffordance && ROW_AFFORDANCE_SURFACE,
          onRowClick && 'cursor-pointer hover:bg-muted/40',
          onRowClick &&
            hasFocusableRows &&
            'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          isRowSelected && 'bg-secondary/40',
        )}
      >
        {isSelectable ? (
          <td
            className={cn(
              'w-10 align-middle',
              cellPaddingXClass,
              rowPaddingClass,
              pinSelectionCol && [
                STICKY_CELL_BASE,
                'z-10',
              ],
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {selectionMode === 'radio' ? (
              <RowRadio checked={isRowSelected} onChange={() => toggleRow(id, true)} />
            ) : (
              <Checkbox
                checked={isRowSelected}
                onCheckedChange={(c) => toggleRow(id, c === true)}
                aria-label="Select row"
              />
            )}
          </td>
        ) : null}
        {renderedColumns.map((col, colIndex) => (
          <td
            key={col.key}
            // Touch double-tap (§7): a column's BODY cells are just as valid
            // a tap target as its header — `registerTap` no-ops for any
            // non-touch pointer, so mouse/pen clicks are unaffected.
            onPointerUp={(e) => registerTap(col.key, e.pointerType)}
            className={cn(
              // Figma DS-V2 "List Widget" (4FS7S3tHKzZZpdFBA0aGkt 8821:11670)
              // Table Cell: `Body | Subtitle/sm/Medium` — Gilroy **Medium
              // (500)** at 14px/20px in `Default Text/Dark` (#344054 =
              // `text-gray-700`). NOT `text-foreground` (#101828) at the
              // inherited weight 400, which is what made every list read as a
              // generic HTML table rather than a FAMS one (designer report
              // 2026-09-07). Applied here, once, so every DataTable consumer
              // inherits it — the secondary/`Default Text/Normal` (#475467)
              // line stays the caller's own concern via `render`.
              'align-middle font-medium text-gray-700',
              cellPaddingXClass,
              rowPaddingClass,
              ALIGN_CLASS[col.align ?? 'start'],
              // Width/whitespace treatment per `contentType` — applies
              // regardless of a custom `render` (layout is a column-level
              // decision; see `dataTableCellText.tsx`'s doc comment).
              col.contentType && CONTENT_TYPE_TD_CLASS[col.contentType],
              // The identity pin. With `stickyFirstCol` alone this is only
              // the first-rendered cell (i.e. no checkbox column); with
              // `stickyLeadingCols` it is pinned alongside the checkbox in
              // its own lane (A6's two leading pins).
              pinIdentityCol && colIndex === 0 && [identityPinClass, 'z-10'],
            )}
          >
            {col.render
              ? col.render(row, index)
              : renderDefaultCell((row as Record<string, unknown>)[col.key], col.contentType)}
          </td>
        ))}
        {/* Trailing column: blank for a header-only `trailingAction`, the
            per-row `…` options control when `rowActions` is supplied. Clicks
            inside it never reach the row's own `onRowClick` (UX note G.46 —
            a row control must not also open the detail sheet). */}
        {hasTrailingColumn ? (
          <td
            className={cn(
              'w-16 align-middle',
              cellPaddingXClass,
              rowPaddingClass,
              stickyTrailingCol && [STICKY_CELL_END_BASE, 'z-10'],
            )}
            onClick={rowActions ? (e) => e.stopPropagation() : undefined}
          >
            {rowActions ? <div className="flex justify-end">{rowActions(row, index)}</div> : null}
          </td>
        ) : null}
      </tr>
    )
  }

  const renderGroupHeaderRow = useCallback(
    (groupKey: string, rowCount: number) => (
      <DataTableGroupHeaderRow
        key={`group-${groupKey}`}
        groupKey={groupKey}
        rowCount={rowCount}
        columnSpan={columnSpan}
        isCollapsed={collapsedGroupKeys.has(groupKey)}
        onToggle={toggleGroup}
        groupBy={groupBy}
      />
    ),
    [collapsedGroupKeys, toggleGroup, columnSpan, groupBy],
  )

  const renderGroupSummaryRow = useCallback(
    (groupKey: string, cells: Partial<Record<string, ReactNode>>) => (
      <DataTableSummaryRow
        key={`group-summary-${groupKey}`}
        columns={summaryColumnSpecs}
        cells={cells}
        isSelectable={isSelectable}
        tone="group"
      />
    ),
    [summaryColumnSpecs, isSelectable],
  )

  /* ---- virtualization (opt-in; rendering only) ----
   * Flattens (possibly grouped) `pageData` into a single windowable list.
   * Only computed when `virtualized` is on. */
  const flatRenderItems = useMemo(() => {
    if (!virtualized) return []
    return buildFlatRenderItems({
      groups,
      flatRows: pageData,
      collapsedGroupKeys,
      getGroupSummary: groupBy?.getGroupSummary,
    })
  }, [virtualized, groups, pageData, collapsedGroupKeys, groupBy])

  return (
    <div
      className={cn(
        // `relative` is LOAD-BEARING, not decorative (regression 2026-08-31 —
        // third occurrence of this bug CLASS, see LiveHybridView.tsx's header
        // comment). This box clips via `overflow-hidden`, which only clips
        // NORMAL-FLOW descendants — an `overflow: hidden`/`auto` box that is
        // itself `position: static` does NOT establish a containing block for
        // `position: absolute` descendants, so any such descendant (a
        // `sr-only` accessible-label span is the everyday case — Tailwind's
        // `.sr-only` IS `position: absolute`) resolves its containing block
        // against the NEXT positioned ancestor instead, escaping this clip
        // entirely. Virtualized rows push some of those spans well past this
        // box's visible bound (overscan rows render below the fold), and the
        // escaped boxes then inflate `scrollHeight` on whichever ancestor
        // they land in — here, `LiveListPanel`'s `position: relative`
        // `tableRef` wrapper — which itself has `overflow: visible`, so the
        // excess keeps climbing until it reaches the first ancestor that
        // actually clips: the module shell body, which duly grows a REAL
        // (functional, draggable) scrollbar and reveals blank space below the
        // fold when scrolled. `relative` here (default z-index, no new
        // stacking behavior) closes the escape hatch — this table's own
        // clipping box now catches everything it renders, matching its
        // `overflow-hidden` intent.
        'relative flex w-full min-h-0 flex-col overflow-hidden rounded-sm border border-border bg-card',
        className,
      )}
      {...rest}
    >
      {showLabelledColumnsMenu ? (
        <div className="flex items-center justify-end border-b border-border p-2">
          <DataTableColumnsMenu
            catalog={catalog}
            value={visibleKeys}
            onChange={commitVisibleKeys}
            variant="labelled"
          />
        </div>
      ) : null}

      {layout === 'stacked' ? (
        <div
          data-slot="data-table-stacked-list"
          role="list"
          aria-label={ariaLabel}
          className="min-h-0 flex-1 overflow-auto"
        >
          {busy ? (
            <div className="px-3 py-10 text-center text-muted-foreground">{loadingState ?? 'Loading…'}</div>
          ) : pageData.length === 0 ? (
            <div className="px-3 py-10 text-center text-muted-foreground">{emptyState ?? 'No rows'}</div>
          ) : (
            pageData.map((row, index) => {
              const id = rowIds[index]
              return (
                <DataTableStackedRow
                  key={id}
                  row={row}
                  index={index}
                  columns={visibleColumns}
                  identifierKey={stackedIdentifierKey}
                  isSelectable={isSelectable}
                  isSelected={selected.includes(id)}
                  selectionMode={selectionMode}
                  onToggleSelect={(checked) => toggleRow(id, checked)}
                  onRowClick={onRowClick ? () => onRowClick(row, index) : undefined}
                  hasFocusableRows={hasFocusableRows}
                  rowActions={rowActions ? rowActions(row, index) : undefined}
                  renderCell={(col, r, i) =>
                    col.render ? col.render(r, i) : renderDefaultCell((r as Record<string, unknown>)[col.key], col.contentType)
                  }
                />
              )
            })
          )}
        </div>
      ) : (
      <div
        // NOT `fams-scroll-region` (round-2026-08-31 finding): this region is
        // the table's HORIZONTAL column overflow, not a decorative vertical
        // panel — its scrollbar is a load-bearing "more columns exist"
        // affordance (QA A5/A20, `LiveListPanel`'s SPEED-column fix), which
        // an invisible-at-rest thumb would silently undo for every consumer.
        // A caller that wants the hover-reveal treatment for ITS OWN reason
        // can still add the class via its own wrapper.
        //
        // It IS `fams-scroll-region-persistent` (2026-09-07): the sibling
        // utility keeps that affordance — the thumb is painted at rest — but
        // in the 8px rounded overlay geometry instead of the native platform
        // bar the designer flagged as "a heavy horizontal scrollbar at the
        // bottom". Same reserved gutter at every state, so no content shift.
        className="fams-scroll-region-persistent min-h-0 flex-1 overflow-auto"
        ref={scrollContainerRef}
        role={scrollRegionLabel ? 'region' : undefined}
        aria-label={scrollRegionLabel}
        tabIndex={scrollRegionLabel ? 0 : undefined}
      >
        <table
          className={cn(
            'w-full border-collapse text-start text-sm',
            // §7: while a column is expanded, EVERY other column collapses
            // to an explicit floor width and the expanded column is left
            // unstyled so `table-layout: fixed` hands it 100% of whatever
            // is left over — see `useDataTableColumnExpansion`'s
            // `columnWidthStyle` doc comment for why that (not an explicit
            // width) is what avoids the table's own horizontal scroll.
            isTableFixed && 'table-fixed',
          )}
          aria-label={ariaLabel}
        >
          <thead
            className={cn(
              // figma-spec-list.md §3/§5: "12px per the DS 'caption 12px'
              // convention" — `text-caption` (the semantic token) rather than
              // the numerically-identical `text-xs`, matching every other
              // caption-styled composite (`IdChip`/`PriorityChip`/`StatusPill`/
              // `CountChip`).
              'bg-card text-caption font-semibold uppercase tracking-wide text-muted-foreground',
              hasStickyHeader && 'sticky top-0 z-10',
            )}
          >
            {/* Figma DS-V2 8821:11670 `Table Header`: a fixed **40px** row
                (`h-10`). The cells' own `py-2.5` was collapsing to a 32px
                row here because the header carries no 20px-line-height text
                of its own (12px/18px caption + a 16px glyph), so the height
                is stated on the row rather than inferred from its tallest
                cell. */}
            <tr className={cn(headerRowHeightClass, 'border-b border-border')}>
              {isSelectable ? (
                <th
                  scope="col"
                  className={cn(
                    'w-10 text-start',
                    cellPaddingXClass,
                    isCompact ? 'py-1.5' : 'py-2.5',
                    pinSelectionCol && [
                      STICKY_CELL_BASE,
                      'z-20',
                    ],
                  )}
                >
                  {selectionMode === 'radio' ? (
                    // No select-all for an exclusive single-choice list — the
                    // slot stays empty (figma 5332:21416 has no header
                    // control above the radio column) but keeps the same
                    // width so the rest of the header aligns with the body.
                    <span className="sr-only">Select</span>
                  ) : (
                    <Checkbox
                      checked={
                        allSelected ? true : someSelected ? 'indeterminate' : false
                      }
                      onCheckedChange={(c) => toggleAll(c === true)}
                      aria-label="Select all rows"
                    />
                  )}
                </th>
              ) : null}
              {renderedColumns.map((col, colIndex) => (
                <DataTableHeaderCell
                  key={col.key}
                  col={col}
                  sort={sort}
                  cycleSort={cycleSort}
                  density={density}
                  isStickyThisCol={pinIdentityCol && colIndex === 0}
                  stickyPinClass={identityPinClass}
                  expandedKey={expandedKey}
                  toggleExpanded={toggleExpanded}
                  registerTap={registerTap}
                  consumeSuppressedClick={consumeSuppressedClick}
                  columnWidthStyle={columnWidthStyle}
                  beginResize={beginResize}
                  stepResize={stepResize}
                  resizedWidthPx={resizedWidthPx}
                />
              ))}
              {hasTrailingColumn ? (
                <th
                  scope="col"
                  className={cn(
                    'w-16 text-end',
                    cellPaddingXClass,
                    isCompact ? 'py-1.5' : 'py-2.5',
                    stickyTrailingCol && [STICKY_CELL_END_BASE, 'z-20'],
                  )}
                >
                  {!trailingAction && !showIconColumnsMenu ? (
                    <span className="sr-only">Row actions</span>
                  ) : null}
                  {trailingAction ? (
                    // Icon-only ⇒ name AND a hover/focus tooltip (UX K.67).
                    <IconControl tip={trailingAction.ariaLabel ?? 'Edit columns'}>
                      <button
                        type="button"
                        onClick={trailingAction.onClick}
                        className="inline-flex size-6 items-center justify-center rounded-xs text-muted-foreground outline-none hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {trailingAction.icon}
                      </button>
                    </IconControl>
                  ) : showIconColumnsMenu ? (
                    // The default columns trigger (product truth —
                    // VALUES-CROSSCHECK.md row 25 / F1,F2,F4 figma.png): a
                    // pencil pinned at the header row's trailing end, same
                    // slot + look every hand-built `trailingAction` "Edit
                    // columns" pencil already uses, wired to the SAME
                    // ColumnCustomizer popover the labelled variant opens.
                    <DataTableColumnsMenu
                      catalog={catalog}
                      value={visibleKeys}
                      onChange={commitVisibleKeys}
                    />
                  ) : null}
                </th>
              ) : null}
            </tr>
          </thead>
          {!busy && pageData.length > 0 && virtualized ? (
            <DataTableVirtualBody
              items={flatRenderItems}
              scrollRef={scrollContainerRef}
              estimateRowHeight={estimateRowHeight}
              columnSpan={columnSpan}
              renderRow={renderRow}
              renderGroupHeader={renderGroupHeaderRow}
              renderGroupSummary={renderGroupSummaryRow}
            />
          ) : (
            <tbody>
              {busy ? (
                <tr>
                  <td
                    colSpan={columnSpan}
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    {loadingState ?? 'Loading…'}
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnSpan}
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    {emptyState ?? 'No rows'}
                  </td>
                </tr>
              ) : groups ? (
                groups.map((group) => {
                  const isCollapsed = collapsedGroupKeys.has(group.key)
                  return (
                    <Fragment key={`group-${group.key}`}>
                      {renderGroupHeaderRow(group.key, group.rows.length)}
                      {isCollapsed
                        ? null
                        : group.rows.map(({ row, index }) => renderRow(row, index))}
                      {!isCollapsed && groupBy?.getGroupSummary
                        ? renderGroupSummaryRow(
                            group.key,
                            groupBy.getGroupSummary(
                              group.key,
                              group.rows.map((r) => r.row),
                            ),
                          )
                        : null}
                    </Fragment>
                  )
                })
              ) : (
                pageData.map((row, index) => renderRow(row, index))
              )}
            </tbody>
          )}
          {summaryRow && !busy && pageData.length > 0 ? (
            <tfoot>
              <DataTableSummaryRow
                columns={summaryColumnSpecs}
                cells={summaryRow}
                isSelectable={isSelectable}
                tone="footer"
              />
            </tfoot>
          ) : null}
        </table>
      </div>
      )}

      {pageSize !== undefined ? (
        <DataTablePagination
          page={currentPage}
          pageCount={pageCount}
          pageSize={pageSize}
          rowCount={rowCount ?? data.length}
          onPageChange={goToPage}
        />
      ) : null}
    </div>
  )
}
