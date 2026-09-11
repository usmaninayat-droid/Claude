import { forwardRef, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Search } from '../icons'
import { cn } from '../lib/cn'
import { Input } from '../primitives/Input'
import { TrendIndicator } from '../primitives/TrendIndicator'
import { DataTable } from './DataTable'
import type { DataTableColumn } from './DataTable.types'
import { LeaderboardPodium } from './LeaderboardPodium'
import type { LeaderboardColumn, LeaderboardItem, LeaderboardProps } from './Leaderboard.types'

/**
 * Leaderboard — a ranked board: an optional top-N podium above a ranked
 * table. [L3 composite]
 *
 * A composition, not a new table engine: the body is a real `DataTable`
 * (sticky header, sortable headers, per-column `minWidth`, inner scroll
 * region, loading/empty states), the podium is `LeaderboardPodium`, movement
 * is `TrendIndicator`. Two columns are injected ahead of the caller's
 * `columns` — rank (always first in reading order, so it mirrors correctly
 * under RTL) and the entity block (`media` + `primary` + `secondary`).
 *
 * Generic by construction (rule 10): items are `{ id, rank, primary,
 * secondary, media, movement, score, detail, cells }` and every metric is a
 * caller-defined column with its own renderer — there is no vehicle, driver,
 * fuel or behaviour vocabulary in this file.
 *
 * State-agnostic (rule 8): ranking, sorting semantics and data loading are
 * the caller's. Search is presentational — it filters the rows already given
 * (and can be lifted with `searchValue`/`onSearchChange`); while a search is
 * active the podium is hidden, because a podium of a filtered set is a lie.
 *
 * @usage-index leaderboard
 */
export type {
  LeaderboardColumn,
  LeaderboardItem,
  LeaderboardMovement,
  LeaderboardProps,
} from './Leaderboard.types'

/**
 * Row pitch. Figma fits SEVEN ranked rows in a 500px board; the previous
 * `rowHeight="lg"` (`py-5`, 20px each side) measured a ~61px pitch, so only
 * five fitted and row six was sliced by the card edge (round-2 visual QA #5).
 *
 * The fix is leaderboard-scoped, not a change to `DataTable`'s default density
 * for every consumer: the table drops to `rowHeight="md"` (`py-2` → 8px each
 * side) and the two INJECTED cells below carry `min-h-8` (2rem), so the pitch
 * is a deterministic 8 + 32 + 8 = 48px whatever the caller's metric cells hold.
 *
 * 48 ≥ the 44px minimum touch target (verdict V11), so a board with
 * `onItemClick` — where the whole `<tr>` is the target — still clears it. The
 * rows carry no nested interactive control of their own.
 */
const ROW_CELL_MIN_HEIGHT = 'flex min-h-8 items-center'

/** Plain-text haystack for the built-in search filter. */
function searchHaystack(item: LeaderboardItem): string {
  const parts = [
    item.searchText,
    typeof item.primary === 'string' ? item.primary : undefined,
    typeof item.secondary === 'string' ? item.secondary : undefined,
  ]
  return parts.filter(Boolean).join(' ').toLowerCase()
}

export const Leaderboard = forwardRef<HTMLDivElement, LeaderboardProps>(
  (
    {
      className,
      items,
      columns,
      variant = 'table',
      podiumCount = 3,
      scoreLabel,
      detailLabel,
      rankLabel = 'Rank',
      showRank = true,
      entityLabel = 'Name',
      searchable = false,
      searchPlaceholder = 'Search',
      searchValue,
      onSearchChange,
      onItemClick,
      loading,
      emptyState,
      ariaLabel,
      bodyMaxHeight,
      ...props
    },
    ref,
  ) => {
    const [internalQuery, setInternalQuery] = useState('')
    const query = searchValue ?? internalQuery
    const commitQuery = (next: string) => {
      if (searchValue === undefined) setInternalQuery(next)
      onSearchChange?.(next)
    }

    const ranked = useMemo(
      () => items.map((item, index) => ({ ...item, rank: item.rank ?? index + 1 })),
      [items],
    )

    const needle = query.trim().toLowerCase()
    const rows = useMemo(
      () => (needle ? ranked.filter((item) => searchHaystack(item).includes(needle)) : ranked),
      [ranked, needle],
    )

    const tableColumns = useMemo<DataTableColumn<LeaderboardItem>[]>(() => {
      const rankColumn: DataTableColumn<LeaderboardItem> = {
        key: '__rank',
        label: rankLabel,
        minWidth: '6rem',
        isHideable: false,
        render: (item) => (
          <span className={cn(ROW_CELL_MIN_HEIGHT, 'gap-2')}>
            <span className="text-body-sm font-semibold text-foreground">{item.rank}</span>
            {item.movement ? <TrendIndicator size="sm" {...item.movement} /> : null}
          </span>
        ),
      }
      const entityColumn: DataTableColumn<LeaderboardItem> = {
        key: '__entity',
        label: entityLabel,
        minWidth: '12rem',
        isHideable: false,
        render: (item) => (
          <span className={cn(ROW_CELL_MIN_HEIGHT, 'min-w-0 gap-2')}>
            {item.media ? <span className="shrink-0">{item.media}</span> : null}
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-foreground">{item.primary}</span>
              {item.secondary ? (
                <span className="truncate text-caption text-muted-foreground">
                  {item.secondary}
                </span>
              ) : null}
            </span>
            {/* Movement lives on the rank column; with no rank column it would
                otherwise vanish, so it re-homes here rather than being lost. */}
            {!showRank && item.movement ? <TrendIndicator size="sm" {...item.movement} /> : null}
          </span>
        ),
      }
      const metricColumns = columns.map((column: LeaderboardColumn) => ({
        key: column.key,
        label: column.label,
        align: column.align,
        width: column.width,
        minWidth: column.minWidth,
        isSortable: column.isSortable,
        isHideable: false,
        render: (item: LeaderboardItem, index: number): ReactNode =>
          column.render ? column.render(item, index) : item.cells?.[column.key],
        sortAccessor: (item: LeaderboardItem) => item.cells?.[column.key],
      }))
      return showRank ? [rankColumn, entityColumn, ...metricColumns] : [entityColumn, ...metricColumns]
    }, [columns, entityLabel, rankLabel, showRank])

    const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape' && query) {
        event.preventDefault()
        commitQuery('')
      }
    }

    const showPodium = variant === 'podium' && !needle && !loading

    return (
      <div
        ref={ref}
        data-slot="leaderboard"
        data-variant={variant}
        className={cn('flex min-h-0 w-full flex-col gap-4', className)}
        {...props}
      >
        {showPodium ? (
          <LeaderboardPodium
            items={ranked.slice(0, podiumCount)}
            scoreLabel={scoreLabel}
            detailLabel={detailLabel}
            rankLabel={rankLabel}
            onItemClick={onItemClick}
          />
        ) : null}

        {searchable ? (
          <Input
            type="search"
            value={query}
            onChange={(event) => commitQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            leadingIcon={<Search aria-hidden="true" />}
            data-slot="leaderboard-search"
          />
        ) : null}

        <div
          className="flex min-h-0 flex-1 flex-col"
          style={bodyMaxHeight ? { maxBlockSize: bodyMaxHeight } : undefined}
        >
          <DataTable<LeaderboardItem>
            data={rows}
            columns={tableColumns}
            getRowId={(item) => item.id}
            isCustomizable={false}
            hasStickyHeader
            // Keyboard operability rides on `onRowClick` inside `DataTable`, so
            // a board with no `onItemClick` renders no `tabindex`, no
            // `cursor: pointer` and no hover affordance (verdict V11 — the same
            // choice `ListRow`/`CriticalEventsList` already make).
            hasFocusableRows
            scrollRegionLabel={ariaLabel}
            ariaLabel={ariaLabel}
            rowHeight="md"
            loading={loading}
            emptyState={emptyState}
            onRowClick={onItemClick ? (item) => onItemClick(item.id) : undefined}
          />
        </div>
      </div>
    )
  },
)

Leaderboard.displayName = 'Leaderboard'
