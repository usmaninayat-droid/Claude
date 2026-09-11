import type { HTMLAttributes, ReactNode } from 'react'
import type { TrendIndicatorProps } from '../primitives/TrendIndicator'

/** Rank movement — an arrow glyph plus its value, never colour alone (V12). */
export type LeaderboardMovement = Pick<TrendIndicatorProps, 'direction' | 'value' | 'note'>

export interface LeaderboardItem {
  /** Stable id — the value handed back by `onItemClick`. */
  id: string
  /** 1-based rank. Defaults to the item's position in `items`. */
  rank?: number
  /** Primary label (a name, a code, a plate…). */
  primary: ReactNode
  /** Secondary line under `primary`. */
  secondary?: ReactNode
  /** Leading visual — an `Avatar`, an `IconBadge`, a glyph. */
  media?: ReactNode
  /** Rank movement, rendered through `TrendIndicator`. */
  movement?: LeaderboardMovement
  /** Headline metric shown on the podium card (`variant="podium"`). */
  score?: ReactNode
  /** Extra podium-card content — counters, chips, a `StatBar`. */
  detail?: ReactNode
  /**
   * Large decorative graphic pinned to the podium card's inline-end edge (a
   * trophy, a medal illustration, a rank crest). Purely presentational — kept
   * a free slot so the graphic is the caller's, never a shape this file names.
   */
  emblem?: ReactNode
  /** Column values, keyed by `LeaderboardColumn.key`. Used when the column has no `render`. */
  cells?: Record<string, ReactNode>
  /**
   * Plain text the built-in search matches against. Falls back to `primary`
   * and `secondary` when those are strings — supply it whenever they are not.
   */
  searchText?: string
}

export interface LeaderboardColumn {
  /** Stable identifier — also the `cells` key and the sort key. */
  key: string
  /** Header content. */
  label: ReactNode
  /** Cell renderer. Defaults to `item.cells?.[key]`. */
  render?: (item: LeaderboardItem, index: number) => ReactNode
  /** Text alignment, mapped to logical start/center/end. */
  align?: 'start' | 'center' | 'end'
  /** Preferred column width, e.g. `"12rem"`. */
  width?: string
  /** Minimum column width — the column is never crushed; the body scrolls instead (V6). */
  minWidth?: string
  /** Header is clickable to sort. Default false — no dead sort affordances. */
  isSortable?: boolean
}

export interface LeaderboardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Ranked items, best first. Ranking is the caller's — this component never re-sorts by score. */
  items: LeaderboardItem[]
  /** Metric columns rendered after the rank/entity columns. */
  columns: LeaderboardColumn[]
  /** `'table'` (default) is the ranked table alone; `'podium'` adds top-N highlight cards above it. */
  variant?: 'table' | 'podium'
  /** How many highlight cards `variant="podium"` renders. Default 3. */
  podiumCount?: number
  /** Caption above each podium card's `score`. */
  scoreLabel?: ReactNode
  /** Caption above each podium card's `detail` block (e.g. a counters row). */
  detailLabel?: ReactNode
  /** Header label of the injected rank column. Default `'Rank'`. */
  rankLabel?: string
  /**
   * Renders the injected rank column. Default `true`. Set `false` for a board
   * whose rows are already in rank order and whose design carries no rank
   * column — the ordinal is then the row position, and `movement` (which the
   * rank column also hosts) moves onto the entity column so it is never lost.
   * The podium keeps its rank medallion either way: a podium IS the ranking.
   */
  showRank?: boolean
  /** Header label of the injected entity column. Default `'Name'`. */
  entityLabel?: ReactNode
  /** Renders a search input that filters the table rows. Default false. */
  searchable?: boolean
  /** Placeholder + accessible name of the search input. Default `'Search'`. */
  searchPlaceholder?: string
  /** Controlled search text. Pair with `onSearchChange`; omit for uncontrolled search. */
  searchValue?: string
  /** Fires on every search keystroke and on Escape (which clears). */
  onSearchChange?: (value: string) => void
  /** Called with the clicked item's `id`. Omit for a non-interactive board. */
  onItemClick?: (id: string) => void
  /** Shows the loading state in place of rows. */
  loading?: boolean
  /** Rendered instead of the rows when `items` (or the search result) is empty. */
  emptyState?: ReactNode
  /** Accessible name of the table. */
  ariaLabel?: string
  /**
   * Caps the table body's height so it scrolls inside its card instead of
   * growing the page (V5), e.g. `"24rem"`. Omit to grow with the content.
   */
  bodyMaxHeight?: string
}
