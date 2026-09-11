import type { ReactNode } from 'react'
import type { LucideIcon } from '@fams/ui-kit/icons'
import type { IconBadgeTone, SortState } from '@fams/ui-kit'
import type { EntityConfig, EntityRecord, FieldOptionContext } from '@fams/v5-composer'
import type { RecordLensStateProps } from '../RecordViewStates'

/**
 * `ListView`'s public contract. [tier-2 internal]
 *
 * Split out of `ListView.tsx` under root rule 12's decompose-on-touch — the
 * interface and its doc comments are ~55% of that file and change for entirely
 * different reasons than the render body. Verbatim: not a prop, default or doc
 * line was altered.
 */
/**
 * A single stat-card tile above the list table (figma-spec-list.md §2 — 5
 * cards, both flat + grouped variants). [contract for the metadata/demo
 * layer — see the module doc's "Blueprint contract" section]
 *
 * DELIBERATELY pre-computed: `value` arrives already formatted (a count, a
 * duration, …) — `ListView` never aggregates `records` itself (Rule 8, same
 * "template renders what it's handed" contract as every other view prop
 * here). The recommended blueprint shape a metadata layer derives THIS from
 * is documented on `ModuleViewProps.summaryTiles` in `ModuleView.tsx`.
 */
export interface ListViewSummaryTile {
  /** Stable key for the tile (also the React list key). */
  id: string
  label: ReactNode
  /** Pre-formatted — e.g. `18`, `"6"`, `"13h 14m"`. */
  value: ReactNode
  icon?: LucideIcon
  /** Icon-chip tone. Omit + set `iconColor`/`iconBg` for a hue `IconBadgeTone` doesn't name. */
  tone?: IconBadgeTone
  /** Raw icon-chip color escape hatch — see `KpiTile.iconColor` (e.g. the spec's terracotta "Accent 8" tile, which has no token yet). */
  iconColor?: string
  /** Pairs with `iconColor` — the chip's background. */
  iconBg?: string
}

/** The trailing, header-only pencil/edit affordance (figma-spec-list.md §3's 62px trailing header cell). Omit for no trailing column. */
export interface ListViewHeaderAction {
  onClick?: () => void
  ariaLabel?: string
  /** Defaults to a `Pencil` glyph. */
  icon?: ReactNode
}

export interface ListViewProps extends RecordLensStateProps {
  /** Module config — columns + cell renderers derive from it (blueprint-driven). */
  config: EntityConfig
  /** The records to show (already filtered/sorted by the caller / ModuleView). */
  records: EntityRecord[]
  /**
   * Cols the user may inline-edit (double-click a cell). Requires
   * `onRecordChange`. Omit for a read-only list.
   */
  editableCols?: string[]
  /** Inline-edit commit — fires with `(col, value, record)`. */
  onRecordChange?: (col: string, value: unknown, record: EntityRecord) => void
  /** Row click — the hook the hybrid split / detail open uses. */
  onRowClick?: (record: EntityRecord) => void
  /** Highlighted row id (e.g. the hybrid-view selection). Ignored while `selectable` is on — see that prop. */
  selectedId?: string
  /** Injected option data for reference/assignee/tag inline editors (Rule 8). */
  fieldContext?: FieldOptionContext

  /**
   * Restricts (and orders) the rendered columns to exactly these `col` keys
   * — e.g. `HybridView`'s compact left-list, driven by a blueprint's
   * `uiConfig.hybrid.listColumns`. Unlike `groupedColumnOrder` (which only
   * reorders while grouped), this applies unconditionally and DROPS every
   * other derived column. Omit for every derived column (default,
   * unaffected).
   */
  visibleCols?: string[]

  /**
   * Shows the checkbox selection column (figma-spec-list.md §3's 40px
   * leading checkbox column). Omit/false for no checkboxes (default,
   * unchanged). Uncontrolled (internal state) unless `selectedRowIds` +
   * `onSelectedRowIdsChange` are both given.
   */
  selectable?: boolean
  selectedRowIds?: string[]
  onSelectedRowIdsChange?: (ids: string[]) => void

  /**
   * Stat cards rendered above the table (figma-spec-list.md §2). Omit for no
   * summary row (default, unaffected) — see `ListViewSummaryTile`'s doc for
   * the blueprint-derivation contract.
   */
  summaryTiles?: ListViewSummaryTile[]

  /**
   * Groups rows by this column's value (figma-spec-list.md §4 — the grouped
   * list variant). The grouped-by column is dropped from the row's own
   * cells (its value is already shown on the group header) — generic for
   * ANY groupable column, not status-specific. When the column is the
   * module's `status` field, the group header renders the blueprint's own
   * `StatusPill` (stage color from `config.uiConfig.statusList`); any other
   * column gets a plain-text header. Omit/`null` for the flat (ungrouped)
   * table (default).
   */
  groupByCol?: string | null
  /**
   * Column order to use ONLY while grouped (figma-spec-list.md §4: the
   * grouped variant shows Ticket Type before Title) — an ordered list of
   * `accessorKey`s. Columns not listed keep their default relative order,
   * appended after the listed ones. Omit to keep the flat variant's column
   * order unchanged while grouped.
   */
  groupedColumnOrder?: string[]
  /**
   * Drops the STATUS column entirely (SPEC Addendum "Stage tabs" —
   * `HybridView`'s stage-tabs lens, `uiConfig.hybrid.stageTabs`: an active
   * stage tab already states the stage, so the per-row pill is redundant).
   * Independent of `groupByCol` — this hides the column outright rather
   * than moving its value to a group header. Omit/`false` to keep the
   * column (unchanged default).
   */
  hideStatusColumn?: boolean

  /** The trailing header-only pencil/edit affordance — see `ListViewHeaderAction`. Omit for no trailing column (default). */
  headerAction?: ListViewHeaderAction

  /**
   * Per-row hover-revealed options control (the design's `…` row menu, Figma
   * Dev Note `33534:32266`) — rendered in the trailing cell of every row, and
   * opting every row into ui-kit's shared row/card hover-affordance recipe.
   * Passed straight through to `DataTable.rowActions`; `ModuleView` supplies
   * the one shared `RecordActionsMenu` here, gated by `uiConfig.rowActions`.
   * Omit for no row menu (default, unaffected).
   */
  rowActions?: (record: EntityRecord) => ReactNode

  /**
   * Body-row vertical rhythm — passed straight through to `DataTable.
   * rowHeight`. `'lg'` (default, unchanged) is ticketing's figma-spec-
   * list.md §3 64px-tall row; `'md'` is the DS's original compact padding, a
   * closer match for a module whose own spec wants a shorter row (e.g.
   * asset/Collection-Point's figma-spec-list.md §3 44px row). Recommended
   * blueprint shape: `uiConfig.listRowHeight?: 'md' | 'lg'`, read straight
   * through by `ModuleView`.
   */
  rowHeight?: 'md' | 'lg'

  /* Rendering performance / layout (generic passthroughs to DataTable) */
  /**
   * Windows body rows (DataTable's virtual body) — turn on for large record
   * sets (e.g. the live-monitoring 1,000-row seed, UX-2). Off by default.
   */
  virtualized?: boolean
  /** Estimated row height (px) for the virtual body. Default 48. */
  estimateRowHeight?: number
  /**
   * Keeps the FIRST visible column sticky at the inline-start during the
   * table's own horizontal scroll (UX-5: a wide table never loses its row
   * identity while scanning right). Header stickiness on vertical scroll is
   * DataTable's default. Off by default.
   */
  stickyFirstCol?: boolean
  /**
   * Pins BOTH leading columns — the selection column and the first visible
   * column — at the inline-start during the table's own horizontal scroll
   * (UX ruling A6, run 2026-09-05; see `DataTable.stickyLeadingCols`). The
   * superset of `stickyFirstCol`, which on a selectable list pins only the
   * checkbox and lets the row's identity scroll away. Off by default,
   * additive.
   */
  stickyLeadingCols?: boolean
  /**
   * Opts this table OUT of `DataTable`'s viewport-driven column auto-hide
   * entirely (UX ruling A6, run 2026-09-05: "no responsive column hiding,
   * ever" — see `DataTable.disableResponsiveHide`'s own doc comment for the
   * mechanism and C1's failure mode). Off by default so every EXISTING
   * `ListView` caller — including the narrow compact-list usages
   * (`HybridView`'s left pane) that may still want auto-hide — keeps
   * today's behavior unless it explicitly opts in.
   */
  disableColumnAutoHide?: boolean
  /**
   * Pins the table-options header cell + per-row `rowActions` control to the
   * inline-end edge during the table's own horizontal scroll (UX ruling A6 —
   * see `DataTable.stickyTrailingCol`'s own doc comment). Off by default,
   * additive. No-op when the table has no trailing column at all.
   */
  stickyTrailingCol?: boolean
  /**
   * A minimum inline-size applied to EVERY derived column (any CSS length,
   * e.g. `'7rem'`) so columns overflow into the table's own horizontal
   * scroll instead of crushing (UX-1/UX-5). Omit for no minimum (default).
   */
  columnMinWidth?: string
  /**
   * Per-column READ-cell overrides, keyed by column key — the caller's node
   * wins over the derived renderer for that column only. The escape hatch a
   * host with its own row anatomy needs (the live-monitoring VEHICLE cell's
   * 3D vehicle art + status dot, SPEC P0-1.1) without forking `ListView` or
   * pushing product vocabulary into the generic cell path. Additive: omit for
   * the unchanged derived rendering. Editable columns are unaffected — an
   * override replaces the read presentation, not the edit affordance.
   */
  cellOverrides?: Record<string, (row: EntityRecord) => ReactNode>
  /** Custom loading presentation — overrides the default skeleton bars. */
  loadingState?: ReactNode

  /* UX states */
  /** Renders skeleton rows in place of content. */
  loading?: boolean
  /** More rows are available — shows the "Load more" affordance. */
  hasMore?: boolean
  /** Requests the next page (lazy-load pagination — never fetches itself). */
  onLoadMore?: () => void
  /** Loading label for the load-more button while `loading` + `hasMore`. */
  loadMoreLabel?: string

  /* Sort — controlled passthrough to DataTable. */
  sort?: SortState | null
  onSortChange?: (sort: SortState | null) => void

  /** Custom empty surface; defaults to the shared three-cause `RecordViewEmptyState`. */
  emptyState?: ReactNode
  ariaLabel?: string
  className?: string
}

