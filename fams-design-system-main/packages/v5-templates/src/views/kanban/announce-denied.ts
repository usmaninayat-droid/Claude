import { announce } from '@atlaskit/pragmatic-drag-and-drop-live-region'

/**
 * Announce a denied Kanban/TaskDetail move. Shared by `KanbanView`'s default
 * `onMoveDenied` path (`../KanbanView.tsx`) and both of
 * `../../renderers/v5-module-renderers.tsx`'s guarded-write catch sites, so
 * every denial in this package speaks through ONE function — call this
 * instead of `announce()` directly at any denial site, present or future.
 *
 * The announce is SYNCHRONOUS. It used to be deferred one macrotask to win a
 * live-region race against `@fams/ui-kit`'s `KanbanCard`, which announced an
 * optimistic "Moved X to Y." unconditionally after `onCardMove` returned —
 * and `@atlaskit/pragmatic-drag-and-drop-live-region`'s `announce()` cancels
 * whatever announcement is still pending on every call (it writes the live
 * region's `textContent` only after a flat 1000ms `announceDelay`), so
 * whichever call ran LAST won. That workaround is gone because the root cause
 * is fixed: `KanbanBoardProps.formatMoveAnnouncement` (ui-kit) now lets the
 * board's owner suppress that success announce per move, and `KanbanView`
 * returns `null` from it for every move it did not commit. There is no
 * competing announce left to outrun.
 *
 * The defer was in fact never sufficient, which is why suppression is the
 * only real fix: ui-kit's dist BUNDLES its own copy of the live-region module
 * (`packages/ui-kit/tsup.config.ts` marks `@atlaskit/pragmatic-drag-and-drop*`
 * `noExternal`), so ui-kit's `announce()` and this one drive two SEPARATE
 * module instances with two separate `role="status"` nodes. Across instances
 * neither call can cancel the other's pending timer — the false success was
 * still delivered in its own live region alongside the denial. Ordering
 * tricks cannot fix that; not announcing the success can.
 *
 * The pointer-drag path needs no ordering trick either: pragmatic-dnd
 * dispatches a drop to the source (the card's own `Dropped X.` announce)
 * BEFORE the monitors (the board's `onCardMove` → this denial) — see
 * `@atlaskit/pragmatic-drag-and-drop/dist/esm/make-adapter/make-adapter.js` —
 * so within one module instance the denial is already the last word.
 *
 * ALSO NOTE: the live region's node is `role="status"` (ARIA polite) — a
 * deliberate choice by the library itself (see its `createNode()`'s own
 * comment: `role="alert"`/assertive was found unreliable around focus
 * changes). Never describe this default as "assertive" in comments/JSDoc
 * that reference it — it is polite by the dependency's own design.
 */
export function announceDenied(message: string): void {
  announce(message)
}
