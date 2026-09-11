import type { ReactNode, HTMLAttributes } from 'react'

export type SortDirection = 'asc' | 'desc'

export interface SortState {
  key: string
  direction: SortDirection
}

/**
 * Closed content-shape vocabulary for a column's DEFAULT text rendering
 * (`column.render` omitted) — the stakeholder-agreed responsive/overflow
 * rules, so truncation stops being a per-screen judgment call:
 *
 *  - `'fixed-id'` — fixed-length identifiers (plates, IMEI). NEVER truncated;
 *    single line, natural (content-fit) width. Long values widen the column
 *    (or trigger the table's own horizontal scroll) rather than clip.
 *  - `'variable-id'` — variable-length identifiers (asset/driver names,
 *    including a long "driver name in vehicle name" composite). Wraps up to
 *    2 lines within a capped column width; only when the FULL value still
 *    overflows 2 wrapped lines does it collapse to a single MIDDLE-truncated
 *    line (never end-truncated) — the differentiating tail of a name/id stays
 *    visible either way.
 *  - `'descriptive'` — free text (addresses, notes). Single-line
 *    end-truncation, always paired with one-gesture full-value access: a
 *    tooltip that opens on hover (desktop) AND on tap (touch — the same
 *    control's `onClick` toggles it, since touch browsers fire click but not
 *    a hover event). Applies on web too, not just narrow/touch viewports.
 *  - `'fixed-content'` — short fixed-FORMAT values (status, speed, a
 *    timestamp). Renders identically to `'fixed-id'` (never truncated,
 *    natural width) — kept as its own value only so a column's intent
 *    (bounded status/measurement vs. an identifier) is self-documenting in
 *    caller code, not because the two need different markup.
 *
 * Column-width priority falls out of these four rather than needing a
 * separate allocator: `'fixed-id'`/`'fixed-content'` columns claim only their
 * natural content width (auto table layout already gives them exactly that),
 * so the remaining space is what `'variable-id'`/`'descriptive'` columns
 * wrap/truncate INTO — put fixed-shape columns first in `columns` when order
 * matters for a screen's specific layout.
 */
export type DataTableColumnContentType = 'fixed-id' | 'variable-id' | 'descriptive' | 'fixed-content'

export interface DataTableColumn<T> {
  /** Stable identifier — also the sort key and visibility/order key. */
  key: string
  /** Header content. */
  label: ReactNode
  /**
   * 16px glyph shown beside the label in the column customizer. Optional —
   * additive, existing usages unaffected.
   */
  icon?: ReactNode
  /**
   * Section label for the column customizer, e.g. "Asset – Basic Info".
   * Optional — columns without a group land under a default "Columns" section.
   */
  group?: string
  /** Cell renderer. When omitted, the raw `row[key]` value is shown. */
  render?: (row: T, rowIndex: number) => ReactNode
  /**
   * Value used for sorting. Defaults to `row[key]`. Provide when the sortable
   * value differs from the displayed value.
   */
  sortAccessor?: (row: T) => unknown
  /** Column width, e.g. `"12rem"` / `"20%"`. */
  width?: string
  /**
   * Minimum column width, e.g. `"10rem"` — applied as `min-inline-size` on the
   * header cell so the column is never crushed when the table is narrower than
   * the sum of its columns; the body scroll container scrolls horizontally
   * instead. Additive — omit for the unchanged auto-layout behaviour.
   */
  minWidth?: string
  /** Text alignment. Maps to logical start/center/end. */
  align?: 'start' | 'center' | 'end'
  /** Header is clickable to sort. Default false. */
  isSortable?: boolean
  /** Column can be hidden via the customization panel. Default true. */
  isHideable?: boolean
  /** Hidden by default (still toggleable). Uncontrolled mode only. */
  isHiddenByDefault?: boolean
  /**
   * Content shape driving this column's width/wrap/truncation behavior (see
   * `DataTableColumnContentType`). The width/whitespace treatment applies to
   * the cell regardless of `render`; the specific wrap-then-middle-truncate
   * / end-truncate-with-tooltip TEXT treatment only applies when `render` is
   * omitted — a custom `render` owns its own content and truncation. Omit
   * `contentType` entirely for the original unbounded, untruncated cell.
   */
  contentType?: DataTableColumnContentType
}

export interface DataTableGroupBy<T> {
  /** Returns the group key for a row. Groups render in first-seen order. */
  getGroupKey: (row: T) => string
  /** Render a group's header label. Defaults to the raw key. */
  getGroupLabel?: (key: string) => ReactNode
  /**
   * Optional per-group aggregate row, rendered after the group's rows when
   * expanded. Column key → cell content; omitted keys render blank. Additive
   * — omit for no per-group summary row (default, unaffected).
   */
  getGroupSummary?: (key: string, rows: T[]) => Partial<Record<string, ReactNode>>
}

/** Column key → cell content for a `DataTable` aggregate/KPI row. */
export type DataTableSummaryCells = Partial<Record<string, ReactNode>>

export interface DataTableProps<T>
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  columns: DataTableColumn<T>[]
  data: T[]
  /** Stable row id. Defaults to the row index (string). */
  getRowId?: (row: T, index: number) => string

  /* Sorting — controlled OR uncontrolled. */
  sort?: SortState | null
  onSortChange?: (sort: SortState | null) => void
  defaultSort?: SortState | null

  /* Selection. */
  isSelectable?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  /**
   * `'checkbox'` (default, unchanged) — multi-select with a header select-all.
   * `'radio'` — exclusive single-select (figma 5332:21416's "Link an Existing
   * Workforce Profile" picker table): each row gets a radio-style control,
   * there is no select-all (nothing to select "all" of in a single-choice
   * list), and `onSelectionChange` always fires with a one-element array.
   * Only meaningful when `isSelectable` is set.
   */
  selectionMode?: 'checkbox' | 'radio'

  /* Row interaction. */
  onRowClick?: (row: T, index: number) => void
  /**
   * Makes body rows keyboard-operable when `onRowClick` is set: each row
   * becomes focusable (`tabIndex=0`), shows a focus ring, and activates on
   * Enter/Space. Opt-in and additive — omit for the unchanged mouse-only
   * behaviour of existing tables.
   */
  hasFocusableRows?: boolean

  /* Column customization. */
  /**
   * Show the columns customizer trigger + panel. Default true.
   *
   * The trigger is an icon-only pencil pinned at the header row's trailing
   * end (`columnsMenuVariant="icon"`, default) — the same affordance every
   * real product surface already hand-builds via `trailingAction`
   * (`ListView`'s "Edit columns" pencil, `LiveListPanel`'s columns pencil)
   * and the one every Figma table/list screen shows (VALUES-CROSSCHECK.md
   * row 25: a small pencil at the header row's end, never a bordered
   * "Columns" button). This is the SAME trailing-column slot `trailingAction`
   * uses — supplying `trailingAction` always wins if both are set.
   */
  isCustomizable?: boolean
  /**
   * `'icon'` (default) — the pencil-in-header-end trigger described above.
   * `'labelled'` — the legacy bordered "Columns" button (gear icon + text)
   * in its own toolbar row above the table. No shipped product surface uses
   * this; kept as an escape hatch for a standalone toolbar context with no
   * header row to pin a pencil into (e.g. a table rendered without its own
   * chrome). Ignored when `isCustomizable` is false.
   */
  columnsMenuVariant?: 'icon' | 'labelled'
  /**
   * Ordered array of **visible** column keys — the single source of truth for
   * BOTH visibility and order (mirrors `ColumnCustomizer.value`). When provided
   * together with `onColumnOrderChange`, the table renders exactly these keys
   * in this order and the customizer is driven by them.
   *
   * Backward compatible: if `onColumnOrderChange` is NOT provided, this is
   * treated as the legacy full column order and combined with
   * `hiddenColumnKeys` / `onColumnConfigChange` as before.
   */
  columnOrder?: string[]
  /**
   * Controlled setter for the ordered-visible-keys model. Providing this opts
   * the table into the `columnOrder`-as-visible-keys semantics above.
   */
  onColumnOrderChange?: (orderedVisibleKeys: string[]) => void
  hiddenColumnKeys?: string[]
  onColumnConfigChange?: (config: { order: string[]; hidden: string[] }) => void

  /* Grouping. Additive — omit for the original flat-table rendering. */
  /** Partitions rows into collapsible labeled sections. Default: no grouping. */
  groupBy?: DataTableGroupBy<T>
  /** Group keys collapsed on first render. Uncontrolled thereafter — the user toggles via the group header. */
  defaultCollapsedGroupKeys?: string[]
  /**
   * Controlled collapse state — the exact set of collapsed group keys. Pair
   * with `onGroupToggle`. Omit for uncontrolled collapse (seeded from
   * `defaultCollapsedGroupKeys`), mirroring `sort`/`defaultSort`.
   */
  collapsedGroupKeys?: string[]
  /** Fires with the toggled group's key, in BOTH controlled and uncontrolled mode. */
  onGroupToggle?: (key: string) => void

  /* Virtualization (rendering only) — opt-in, additive. Off by default. */
  /** Window row rendering via `@tanstack/react-virtual`. Default false. */
  virtualized?: boolean
  /** Estimated row height in px, used before the browser measures the real one. Default 40. */
  estimateRowHeight?: number

  /* Pagination — presentational only; DataTable never fetches. See the
   * class JSDoc "Pagination contract". Omit `pageSize` for no pager
   * (default, unaffected). */
  /** Current 1-indexed page. Controlled together with `onPaginationChange`. */
  page?: number
  /** Rows per page. Providing this is what turns the pager on. */
  pageSize?: number
  /** Total row count across all pages ("server mode"). Omit for client-side convenience paging over `data`. */
  rowCount?: number
  /** Fires with the requested page/pageSize when the user changes page. */
  onPaginationChange?: (state: { page: number; pageSize: number }) => void

  /* Summary / KPI row. Additive — omit for no footer row (default, unaffected). */
  /** Table-wide aggregate row, rendered as a `<tfoot>` row below the body. */
  summaryRow?: DataTableSummaryCells

  /* Presentation. */
  /** Shows the loading state in place of rows. */
  loading?: boolean
  /** @deprecated Alias of `loading`, kept for back-compat. */
  isLoading?: boolean
  emptyState?: ReactNode
  loadingState?: ReactNode
  hasStickyHeader?: boolean
  /**
   * Accessible name for the body's scroll container. When set, the scroll
   * region becomes a labelled, keyboard-scrollable `role="region"`
   * (`tabIndex=0`) — required whenever the table body scrolls inside a fixed
   * card rather than growing the page. Omit for no scroll region semantics.
   */
  scrollRegionLabel?: string
  /**
   * Body-row vertical rhythm. `'md'` (default) is the original compact
   * padding; `'lg'` is figma-spec-list.md §3's 64px-tall data row (a
   * generic density knob, not a one-off pixel value baked into a single
   * consumer). Additive — omit for the unchanged default.
   */
  rowHeight?: 'md' | 'lg'
  /**
   * Horizontal/vertical CELL density — the second, independent axis to
   * `rowHeight`'s row rhythm. `'default'` keeps the padding every existing
   * table ships with (`px-3` cells, a 40px header row). `'compact'` is the
   * dense-list density the narrow list panes need: a 32px header row and
   * tighter cell padding, so three real columns fit a ~440px pane instead of
   * crushing into truncation.
   *
   * A GENERIC knob, not a pane-specific one (rule 10): it states a density,
   * never which surface asked for it. Additive — omit for the unchanged
   * default.
   */
  density?: 'default' | 'compact'
  /**
   * An extra, UNLABELED trailing header-only column (figma-spec-list.md §3's
   * 62px trailing cell: "holds only a pencil/edit icon, no label" — a
   * generic per-list affordance, e.g. "manage this row's fields", not
   * specific to any one icon or action). Body cells in this column are
   * always blank; only the header cell renders `icon` as a button. Omit for
   * no trailing column (default, unaffected).
   *
   * Shares its header cell with the default `isCustomizable` columns pencil
   * (see that prop's doc comment) — an explicit `trailingAction` always wins
   * over the auto-rendered columns trigger, same trailing column either way.
   */
  trailingAction?: {
    icon: ReactNode
    onClick?: () => void
    ariaLabel?: string
  }
  /**
   * Per-row trailing affordance (the design's hover-revealed `…` row options
   * button — Figma Dev Note `33534:32266`). Rendered in the SAME trailing
   * column as `trailingAction` (they compose: the header cell stays the
   * `trailingAction` button, the body cells become this). Whatever is
   * returned owns its own reveal styling — see `@fams/v5-templates`'s
   * `views/actions/row-affordance.ts`, whose classes hook onto the group this
   * table puts on every row when `hasRowHoverAffordance` is set. Omit for no
   * per-row actions (default, unaffected).
   */
  rowActions?: (row: T, index: number) => ReactNode
  /**
   * Opts every body row into the shared row/card hover-affordance recipe
   * (`composites/row-affordance.ts`): background AND border colour change on
   * hover, mirrored on `focus-within`, held while a child menu is open. This
   * is what reveals a `rowActions` control, so it defaults ON whenever
   * `rowActions` is provided; pass `false` to keep a plain table. Additive —
   * a table with neither prop is byte-identical to before.
   */
  hasRowHoverAffordance?: boolean
  /**
   * Pins the first rendered cell (the selection checkbox column when
   * `isSelectable`, else the first data column) to the inline-start edge
   * during the table's own horizontal scroll — same for the header cell.
   * The sticky cell is ALWAYS opaque (never transparent — a transparent
   * sticky cell would let scrolled columns show through it) and its
   * background is DRIVEN BY THE ROW'S OWN STATE (hover / `data-selected`),
   * not a fixed token, so a selected or hovered row reads as one uniform
   * block with no seam at the sticky boundary (A23). Default false.
   */
  stickyFirstCol?: boolean
  /**
   * Pins the table's TWO leading columns — the selection column (when
   * `isSelectable`) AND the first data column — to the inline-start edge
   * during the table's own horizontal scroll, each in its own lane, header
   * and body together. UX ruling A6 (run 2026-09-05): "two pinned columns at
   * the start: the row checkbox and the identity column — without the
   * identity column a horizontally scrolled row is anonymous."
   *
   * The superset of `stickyFirstCol`, which pins only whichever cell renders
   * first (the checkbox when selectable, otherwise data column 0) and so
   * leaves the identity column scrolling away on a selectable table. Setting
   * this implies `stickyFirstCol`'s behavior; setting both is harmless.
   *
   * Lanes are logical (`inset-inline-start`), so `dir="rtl"` mirrors them to
   * the opposite physical edge with no second code path, and the outermost
   * pinned cell carries the seam border A6 asks for. Both cells keep
   * `STICKY_CELL_BASE`'s state-following overlay, so a hovered or selected
   * row still reads as one block across the pin boundary (A23).
   *
   * Default false — additive; a table that passes neither pin prop renders
   * exactly as before.
   */
  stickyLeadingCols?: boolean
  /**
   * Pins the trailing column (the `trailingAction` header cell / per-row
   * `rowActions` cell — the SAME single trailing column both compose into,
   * see `trailingAction`'s own doc comment) to the inline-end edge during
   * the table's own horizontal scroll (UX ruling A6, run 2026-09-05: "a
   * per-row action you must scroll 400px to reach is a hidden action").
   * Logical side (`inset-inline-end`), so `dir="rtl"` mirrors it to the
   * opposite physical edge automatically. No-op when neither
   * `trailingAction` nor `rowActions` is set (nothing to pin). Default
   * false — additive, existing tables keep their current layout.
   *
   * HAZARD, measured 2026-09-05 — do NOT pass this on a table that actually
   * overflows. An `inset-inline-end` sticky cell inside an overflowing
   * scroller sits at the scrollport's END EDGE at every scroll offset,
   * including at rest, so it necessarily covers whatever column occupies the
   * last `w-16` of the scrollport (measured: 54px of a STATUS pill covered at
   * 1280 — the pill was not truncated, it was hidden underneath). Reserving
   * track width after the pinned column does not help; the scrollport still
   * shows data across its full width at `scrollLeft = 0`. Safe only where the
   * table does not overflow (sticky is then a no-op) — otherwise prefer
   * `stickyLeadingCols` and let the trailing control ride the scroll. See
   * `qa/UX-NOTES.md` A6, amended 2026-09-05.
   */
  stickyTrailingCol?: boolean
  /**
   * Opts this table OUT of `useDataTableResponsiveColumns`'s viewport-driven
   * auto-hide entirely (UX ruling A6, run 2026-09-05: "no responsive column
   * hiding, ever" — a table whose column set must never disappear as the
   * container narrows). Every column that is otherwise visible stays
   * rendered at every width; the table instead relies on its own
   * `contentType`/`minWidth` floors plus the scroll container's own
   * `overflow-auto` to grow a horizontal scrollbar the user can pan (the
   * house rule this ruling replaces silent column loss with — see C1: a
   * narrowed table used to drop a row's own identity column with no
   * scroller anywhere on the page to bring it back).
   *
   * Additive and OFF by default — every existing consumer keeps today's
   * hide-as-you-narrow behavior unless it explicitly opts in.
   */
  disableResponsiveHide?: boolean
  /** Accessible caption / label for the table element. */
  ariaLabel?: string

  /**
   * `'table'` (default, unchanged) — the standard `<table>` markup below.
   * `'stacked'` — the narrow-panel row shape for a list sitting beside a map:
   * one column (`stackedIdentifierKey`) on its own line, every other visible
   * column folded onto a wrapping "label: value" line underneath, instead of
   * one `<td>` per column. Selection and `rowActions` are unaffected in
   * either layout.
   *
   * Still under stakeholder debate (hence a prop, not the only behavior) —
   * v1-scoped on purpose: no column-header row (nothing to click — sort via
   * a control outside the table in this layout) and `groupBy`/`virtualized`
   * are not yet supported together with `'stacked'`. Flip back to `'table'`
   * at any breakpoint; both read the same `columns`/`data`.
   */
  layout?: 'table' | 'stacked'
  /**
   * Which column's value renders on the stacked row's own first line.
   * Required for `layout="stacked"` to be meaningful; defaults to the first
   * visible column when omitted.
   */
  stackedIdentifierKey?: string

  /* Column expansion (text-truncation.md §7). Additive — omit for the
   * unchanged behavior: no column ever expands, no expand/resize controls
   * change anything. `layout="table"` only (no-op under `"stacked"`, which
   * has no header row to attach the affordance to). */
  /**
   * The single expanded column's key, or `null`/omitted for none. Fully
   * CONTROLLED, mirroring `selectedIds`/`onSelectionChange` on this same
   * component — pair with `onExpandedColumnChange` to make the double-tap
   * (touch, on the column's header or any of its cells) / click-to-expand
   * (the header's small expand-toggle button) interaction actually toggle
   * anything. Omitting both props is a no-op, same as an unwired
   * `selectedIds`. Expanding a column compresses every OTHER visible column
   * to its `contentType` floor (never hides one) rather than triggering the
   * table's own horizontal scroll — only one column expands at a time.
   */
  expandedColumnKey?: string | null
  /**
   * Fires with the next expanded key (or `null` to collapse) on: a second
   * tap on the already-expanded column (double-tap collapse), a tap on a
   * DIFFERENT column while one is expanded (single tap is enough to
   * dismiss), a double-tap on a column when none is expanded (expand), or
   * the header's expand-toggle button (web).
   */
  onExpandedColumnChange?: (key: string | null) => void
}
