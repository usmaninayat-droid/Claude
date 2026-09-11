import { useMemo, useState } from 'react'
import { Pencil } from '@fams/ui-kit/icons'
import { Button, DataTable, KpiTile, Skeleton, Stack } from '@fams/ui-kit'
import { compileFieldSet, deriveColumns, type EntityRecord } from '@fams/v5-composer'
import { cn } from '../lib/cn'
import { RecordCountRow } from './RecordCountRow'
import { resolveGroupHeaderIcon } from './group-by'
import { useListColumns, useListGroupBy } from './list/use-list-columns'
import { DEFAULT_RECORD_NOUN, RecordViewEmptyState, resolveEmptyCause } from './RecordViewStates'
// The public contract lives beside the view (root rule 12); re-exported here
// because this module is the path every caller already imports it from.
export type { ListViewHeaderAction, ListViewProps, ListViewSummaryTile } from './list/ListView.types'
import type { ListViewProps } from './list/ListView.types'

const SKELETON_ROWS = 6

/**
 * ListView — the blueprint-driven, modern list template. [tier-2 pattern]
 *
 * Built on ui-kit's `DataTable` (TanStack Table + Virtual underneath, kept
 * invisible per decision #9): columns come from `deriveColumns(config)`, every
 * cell renders through the FieldRegistry read renderer for its field type
 * (avatars/chips/links, task 2.2), and any `editableCols` cell swaps to that
 * type's inline editor on double-click — committing through
 * `onRecordChange(col, value, record)`. The module's `status` column (when
 * not itself editable) upgrades to a solid `StatusPill` colored from
 * `config.uiConfig.statusList` — the same per-stage color kanban already
 * uses — rather than the field registry's generic enum chip, matching
 * figma-spec-list.md §3's pixel-verified STATUS column.
 *
 * UX built in: skeleton rows while `loading`, a tokenized `ViewEmptyState`,
 * lazy-load pagination (`hasMore` + `onLoadMore`), an optional checkbox
 * selection column, an optional stat-card row, and optional grouping (both
 * threaded onto `DataTable`'s existing `groupBy`/`isSelectable` machinery —
 * see `groupByCol`/`selectable`). State-agnostic (Rule 8): it renders the
 * `records` (and `summaryTiles`) it's handed and reports intent out; it
 * never fetches, aggregates, sorts server-side, or stores.
 *
 * ## Blueprint contract (for the metadata/demo layer)
 *
 * Three pieces of this view are deliberately NOT auto-derived from `config`
 * — they need caller/blueprint-computed data DS has no business computing
 * itself (Rule 8):
 *  1. **Summary tiles** (`summaryTiles`) — `ListViewSummaryTile[]`, already
 *     valued. Recommended blueprint shape: a new, optional
 *     `uiConfig.listSummary: {id, label, icon?, tone?, filter?: {col,
 *     equals}}[]` array; the app computes each tile's `value` as
 *     `filter ? records.filter(r => r[filter.col] === filter.equals).length
 *     : records.length` (or any richer aggregate the blueprint later wants)
 *     and passes the resulting `ListViewSummaryTile[]` in.
 *  2. **Grouped column order** (`groupedColumnOrder`) — recommended
 *     blueprint shape: `uiConfig.listGroupedColumns?: string[]` (column
 *     `col` keys, in the desired grouped-mode order); the app reads it
 *     straight through.
 *  3. **Which column is grouped** (`groupByCol`) — driven by
 *     `ModuleView`'s auto-derived `groupByFacet` (any `listcolumns` field
 *     backed by a `SingleSelect` `systemcolumns` entry) — no new blueprint
 *     key needed for the CHOICES; `groupByCol` itself is just "whichever
 *     option the user picked," round-tripped through `ViewState.groupBy`.
 */
export function ListView({
  config,
  records,
  editableCols,
  onRecordChange,
  onRowClick,
  selectedId,
  fieldContext,
  visibleCols,
  selectable = false,
  selectedRowIds,
  onSelectedRowIdsChange,
  summaryTiles,
  groupByCol,
  groupedColumnOrder,
  hideStatusColumn,
  headerAction,
  rowActions,
  rowHeight = 'lg',
  virtualized = false,
  estimateRowHeight = 48,
  stickyFirstCol = false,
  stickyLeadingCols = false,
  disableColumnAutoHide = false,
  stickyTrailingCol = false,
  columnMinWidth,
  cellOverrides,
  loading = false,
  loadingState,
  hasMore = false,
  onLoadMore,
  loadMoreLabel = 'Load more',
  sort,
  onSortChange,
  emptyState,
  recordNoun = DEFAULT_RECORD_NOUN,
  totalCount,
  isFiltered = false,
  onClearFilters,
  error,
  onRetry,
  onCreateRecord,
  ariaLabel,
  className,
}: ListViewProps) {
  const compiled = useMemo(() => compileFieldSet(config), [config])
  const derived = useMemo(() => deriveColumns(config), [config])
  const editable = useMemo(() => new Set(editableCols ?? []), [editableCols])

  const statusByKey = useMemo(
    () => new Map(config.uiConfig.statusList.map((s) => [s.key, s])),
    [config],
  )

  const [internalSelectedRowIds, setInternalSelectedRowIds] = useState<string[]>([])
  const resolvedSelectedRowIds = selectedRowIds ?? internalSelectedRowIds
  const handleSelectedRowIdsChange = onSelectedRowIdsChange ?? setInternalSelectedRowIds

  const columns = useListColumns({
    derived,
    compiled,
    editable,
    onRecordChange,
    fieldContext,
    groupByCol,
    groupedColumnOrder,
    statusByKey,
    hideStatusCol: hideStatusColumn,
    visibleCols,
    columnMinWidth,
    cellOverrides,
  })
  /*
   * Group-header presentation for the ACTIVE grouping, derived from the
   * config already in hand (Rule 8 — no new props, no plumbing through
   * `ModuleView`):
   *  - a grouped column that stores REFERENCE ids gets its header key read
   *    through the app's display-name directory, so a vehicle group reads
   *    "Tanker 01" and not `VEH-01` (Figma `29535:4487`);
   *  - the curated `groupByOptions` entry's own `icon` becomes the header's
   *    leading glyph.
   * Both are inert for every existing consumer: no grouping → no header at
   * all; a status/SingleSelect grouping → no `refModule`, so the raw key
   * stands; no authored `icon` → no glyph.
   */
  const groupHeader = useMemo(
    () => ({
      resolveReferenceLabel: Boolean(groupByCol && compiled.byCol[groupByCol]?.refModule),
      icon: resolveGroupHeaderIcon(config.uiConfig.groupByOptions, groupByCol),
    }),
    [compiled, config, groupByCol],
  )
  const groupBy = useListGroupBy(groupByCol, statusByKey, groupHeader)

  const defaultLoadingState = (
    <div data-slot="list-view-skeleton" className="flex flex-col gap-3 p-3">
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  )

  return (
    <section
      data-slot="list-view"
      className={cn('flex h-full min-h-0 flex-col gap-3', className)}
    >
      {/* The lens's own region label under the page `h1` — round 1 found List
          and Kanban with no `h2` at all, so a screen-reader user had no way to
          jump to the content region (UX K.68). */}
      <h2 className="sr-only">{ariaLabel ?? `${config.name} list`}</h2>
      {typeof totalCount === 'number' && !config.uiConfig.hideResultsCount ? (
        <RecordCountRow
          slot="list-count-row"
          shown={records.length}
          total={totalCount}
          noun={recordNoun}
          // Omitted on the zero-results empty state: `RecordViewEmptyState`
          // below already renders its OWN, more prominent "Clear filters"
          // primary action there — a second, small text-link with the SAME
          // accessible name right above it is redundant chrome, not a second
          // affordance (and literally ambiguous to assistive tech, which
          // cannot tell the two apart by name alone).
          onClearFilters={records.length > 0 ? onClearFilters : undefined}
        />
      ) : null}
      {summaryTiles?.length ? (
        <Stack data-slot="list-view-summary" direction="row" wrap gap="field">
          {summaryTiles.map((tile) => (
            <KpiTile
              key={tile.id}
              layout="stat"
              label={tile.label}
              value={tile.value}
              icon={tile.icon}
              tone={tile.tone}
              iconColor={tile.iconColor}
              iconBg={tile.iconBg}
              className="min-w-[13rem] flex-1"
            />
          ))}
        </Stack>
      ) : null}

      <DataTable<EntityRecord>
        columns={columns}
        data={records}
        getRowId={(row) => row.id}
        isCustomizable={false}
        // `columns` is already in the right order (including the
        // grouped-mode reorder above) — pin `DataTable` to that order every
        // render via the controlled "visible-keys" mode, rather than letting
        // it seed an UNCONTROLLED order once at mount and freeze it (no
        // customizer panel is rendered here — `isCustomizable={false}` — so
        // `onColumnOrderChange` never actually fires from user interaction).
        columnOrder={columns.map((c) => c.key)}
        onColumnOrderChange={() => {}}
        isSelectable={selectable}
        onRowClick={onRowClick ? (row) => onRowClick(row) : undefined}
        selectedIds={selectable ? resolvedSelectedRowIds : selectedId ? [selectedId] : undefined}
        onSelectionChange={selectable ? handleSelectedRowIdsChange : undefined}
        groupBy={groupBy}
        rowHeight={rowHeight}
        stickyFirstCol={stickyFirstCol}
        stickyLeadingCols={stickyLeadingCols}
        stickyTrailingCol={stickyTrailingCol}
        disableResponsiveHide={disableColumnAutoHide}
        trailingAction={
          headerAction
            ? {
                icon: headerAction.icon ?? <Pencil className="size-4" aria-hidden="true" />,
                onClick: headerAction.onClick,
                ariaLabel: headerAction.ariaLabel ?? 'Edit columns',
              }
            : undefined
        }
        rowActions={rowActions ? (row) => rowActions(row) : undefined}
        sort={sort}
        onSortChange={onSortChange}
        virtualized={virtualized}
        estimateRowHeight={estimateRowHeight}
        loading={loading}
        loadingState={loadingState ?? defaultLoadingState}
        emptyState={
          // UX J.57: three distinct causes, three distinct copies, one shared
          // implementation — the list used to show the same "Nothing matches
          // this view yet" line for an empty module, a search that matched
          // nothing, and (silently) a failed load, with no way back from any
          // of them.
          emptyState ?? (
            <RecordViewEmptyState
              cause={resolveEmptyCause(error, isFiltered)}
              noun={recordNoun}
              error={error}
              onRetry={onRetry}
              onClearFilters={onClearFilters}
              onCreateRecord={onCreateRecord}
            />
          )
        }
        ariaLabel={ariaLabel ?? `${config.name} list`}
        // UX-5: the first visible column stays pinned at the inline-start
        // during the table's OWN horizontal scroll. `stickyFirstCol` above
        // now owns this natively in `DataTable` (A23) — the sticky cell's
        // background is state-driven (matches the row's own hover/selected
        // tint) instead of the fixed `bg-card` this used to hand-roll here,
        // which defeated the row highlight and left a visible seam.
        className="min-h-0 flex-1"
      />

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            variant="tertiary"
            size="sm"
            onClick={onLoadMore}
            loading={loading}
            data-slot="list-view-load-more"
          >
            {loadMoreLabel}
          </Button>
        </div>
      ) : null}
    </section>
  )
}

ListView.displayName = 'ListView'
