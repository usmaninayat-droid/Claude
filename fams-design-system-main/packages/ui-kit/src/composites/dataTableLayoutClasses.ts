import { cn } from '../lib/cn'
import type { DataTableColumn } from './DataTable.types'

/**
 * dataTableLayoutClasses — small class-map constants shared between
 * `DataTable.tsx` and `DataTableHeaderCell.tsx`. Split out purely to avoid a
 * circular import between the two (the header cell needs these; `DataTable`
 * needs the header cell) — same "no business logic, just shared constants"
 * role `CONTENT_TYPE_TD_CLASS` plays in `dataTableCellText.tsx`.
 */

/**
 * A23 — the sticky first column and the rest of its row must read as ONE
 * row. The sticky cell used to hardcode `bg-card`: opaque, but state-blind.
 * The rest of a hovered or selected row tinted and the pinned cell did not,
 * so the row read as two blocks with a visible seam at the sticky boundary.
 * The cell's appearance has to follow the ROW's own state.
 *
 * It follows it through an INSET OVERLAY rather than through the cell's own
 * `background-color`, and that is load-bearing rather than stylistic. The
 * row tints are ALPHA colours (`bg-muted/40`, `bg-secondary/40`); setting
 * one as the cell's background REPLACES the opaque `bg-card` instead of
 * layering over it, leaving the cell 40% transparent in exactly the two
 * states that matter — and a sticky cell is the one cell with other cells
 * sliding underneath it, so a hovered row would show the scrolled columns'
 * text ghosting through the pinned cell.
 *
 * So `bg-card` stays on the element (opaque in every state) and the tint
 * rides a `::before` at `-z-10`: inside the cell's own stacking context
 * (`isolate`) the element background paints first, then negative-z
 * descendants, then the content. Composite is opaque, the tint matches the
 * rest of the row, and the cell's own text still paints on top.
 *
 * Pairs with `STICKY_ROW_GROUP` (`DataTable.tsx`, kept local there — only
 * the row markup itself needs it) — the tint values mirror this table's own
 * row defaults, so the two halves cannot drift apart.
 */
export const STICKY_CELL_BASE = cn(
  'sticky start-0 isolate bg-card',
  'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:transition-colors before:content-[""]',
  'group-hover/sticky-row:before:bg-muted/40',
  'group-data-[selected]/sticky-row:before:bg-secondary/40',
)

/**
 * UX ruling A6 (run 2026-09-05) — the trailing side of the same pin: the
 * table-options header cell and the per-row `⋮` menu pin to the inline-END
 * edge (`stickyTrailingCol`), mirroring `STICKY_CELL_BASE`'s inline-start
 * pin exactly (same state-following `::before` overlay — see that constant's
 * own doc comment for why it isn't a plain `background-color`). Logical
 * (`end-0`, not `right-0`) so `dir="rtl"` mirrors it automatically —
 * A6: "logical pin sides so RTL mirrors them." `border-s` draws the visible
 * seam the ruling calls for, on whichever edge content slides underneath.
 */
export const STICKY_CELL_END_BASE = cn(
  'sticky end-0 isolate border-s border-border bg-card',
  'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:transition-colors before:content-[""]',
  'group-hover/sticky-row:before:bg-muted/40',
  'group-data-[selected]/sticky-row:before:bg-secondary/40',
)

/**
 * UX ruling A6 (run 2026-09-05) — the SECOND leading pin lane. A6 asks for
 * *two* pinned columns at the inline start: the selection column and the
 * row's identity column. `STICKY_CELL_BASE` pins lane 1 at `start-0`; the
 * identity column sits directly after it, so its own inset must equal the
 * selection column's width. That column is `w-10` throughout this file, so
 * the lane offset is the SAME scale step (`start-10`) — read off the width
 * utility rather than written as a length, so the two cannot drift apart.
 *
 * Composed AFTER `STICKY_CELL_BASE` through `cn()`, whose tailwind-merge
 * pass drops the `start-0` from the base (same utility group) and keeps this
 * one. Logical (`start-*`, not `left-*`), so `dir="rtl"` mirrors the lane
 * with no second code path. Only applied when the selection column is
 * actually rendered AND pinned; without it the identity column is lane 1 and
 * keeps `start-0`.
 */
export const STICKY_CELL_LANE_2 = 'start-10'

/**
 * REMOVED (run 2026-09-07, list/table Figma cross-check) — there is no
 * vertical column divider anywhere in the design.
 *
 * A6 (2026-09-05) asked for "an explicit right border/shadow at the pin
 * seam so the user can see the join", and this file carried
 * `STICKY_CELL_START_SEAM = 'border-e border-border'` for the outermost
 * leading pinned cell. The Figma extraction that followed
 * (`plan/run-2026-09-07-list-table/specs/VALUES-CROSSCHECK.md` row 14)
 * contradicts it on the one point all five product screens AND the DS V2
 * table spec independently agree on: row dividers are bottom-only 1px
 * `#eaecf0`, with **no vertical column dividers anywhere**. Full agreement
 * across every reference outranks a single UX ruling, so the seam is gone
 * rather than made conditional — a per-table opt-in would just be a
 * documented way to draw a line the design does not have.
 *
 * The pin still reads correctly without it: `STICKY_CELL_BASE` keeps the
 * cell's background OPAQUE in every state (that is what its `::before`
 * tint overlay is for), so columns sliding underneath disappear at the cell
 * edge instead of ghosting through — which is the actual "you can see the
 * join" signal. `STICKY_CELL_END_BASE` keeps its own `border-s`: that is
 * the table-options/⋮ gutter's edge against the scroll region, not a
 * divider between two data columns.
 */

export const ALIGN_CLASS: Record<NonNullable<DataTableColumn<unknown>['align']>, string> = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
}

/** Flex-container equivalent of `ALIGN_CLASS`, for the header cell's
 * `group/col-header` wrapper (needed once the header holds more than one
 * child — the label and the expand-toggle button). */
export const HEADER_JUSTIFY_CLASS: Record<NonNullable<DataTableColumn<unknown>['align']>, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
}
