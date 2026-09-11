/**
 * row-affordance.ts — THE one row/card hover-affordance recipe.
 *
 * Figma Dev Notes `33534:32266` (list row) and `33534:32263` (hybrid card) are
 * byte-identical:
 *
 * > On hover show options button
 * > Card Background & Border color changed
 *
 * The designer therefore wrote ONE rule for List rows, Hybrid cards and Kanban
 * cards (`INTERACTIONS.md` "Corrections and additions", and `qa/
 * UX-NOTES-pipelines.md` H.53 "applied once, in one shared card shell … not
 * three copies"). This module is that one place: `DataTable` (list + hybrid
 * rows) and `KanbanCard` (board cards) both opt in with a single boolean prop
 * and get these exact classes — no lens ever hand-rolls its own.
 *
 * Two halves, deliberately separate:
 *  - {@link ROW_AFFORDANCE_GROUP} + {@link ROW_AFFORDANCE_SURFACE} live on the
 *    row/card (this file's consumers, in ui-kit).
 *  - the REVEAL half lives on the `…` button, which is composed a tier up in
 *    `@fams/v5-templates` (`views/actions/row-affordance.ts` re-states the
 *    group name from here as the single coupling point).
 *
 * Rules encoded here, each from a binding UX note:
 *  - **H.52 — no reflow.** Only `background-color` and `border-color` change.
 *    The resting row/card already carries its 1px border, so nothing goes
 *    0→1px and no padding moves. Gate: the card's rect is identical on hover.
 *  - **H.49 — keyboard reach.** `focus-within` mirrors `hover`, so tabbing to
 *    the `…` button restyles the row exactly as pointing at it does.
 *  - **H.49 (menu-open persistence)** — `has-[[data-state=open]]` keeps the
 *    restyle while a child popover/menu is open. This is the clause the
 *    reference `shift-planner.tsx` recipe has and our older `ViewTabs` /
 *    `KanbanColumnView` reveals lack.
 */

/**
 * The named Tailwind group the reveal half hooks onto. Named (not bare
 * `group`) so a row nested inside another `group` — a kanban column, a
 * hybrid pane — can never capture the card's own hover state.
 */
export const ROW_AFFORDANCE_GROUP = 'group/row-affordance'

/**
 * The hover/focus restyle for the row or card itself: background AND border
 * colour, colour only (H.52). Applied ON TOP of the component's resting
 * classes, so tailwind-merge's "later wins" resolves the conflict.
 */
export const ROW_AFFORDANCE_SURFACE = [
  'transition-colors',
  'hover:border-primary/30 hover:bg-muted/40',
  'focus-within:border-primary/30 focus-within:bg-muted/40',
  'has-[[data-state=open]]:border-primary/30 has-[[data-state=open]]:bg-muted/40',
].join(' ')
