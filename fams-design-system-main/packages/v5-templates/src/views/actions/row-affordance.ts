/**
 * row-affordance.ts — the REVEAL half of the shared row/card hover rule.
 *
 * The restyle half (background + border colour on the row/card itself) lives
 * in `@fams/ui-kit`'s `composites/row-affordance.ts` and is switched on with
 * one boolean prop (`DataTable.hasRowHoverAffordance` / `KanbanCard.
 * hasHoverAffordance`). This half styles the `…` options BUTTON, which is
 * composed here in the patterns tier — so the group name below is the single
 * coupling point between the two files and must stay in step with ui-kit's
 * `ROW_AFFORDANCE_GROUP`.
 *
 * Figma Dev Notes `33534:32266` / `33534:32263` say only "on hover show options
 * button". Hover alone is a touch and keyboard dead end, so the binding UX
 * notes add three more reveal paths — each clause below is one of them:
 *
 *  - **H.49 — hover.** `group-hover/row-affordance:*`. The RESTING look is
 *    byte-identical to the frame (`opacity-0`), which is what the designer drew.
 *  - **H.49 — keyboard.** `focus-visible:*` (the button itself) and
 *    `group-focus-within/row-affordance:*` (anything inside the row), so Tab
 *    reveals it. The button is NEVER `display:none` or `hidden` — it stays in
 *    the DOM and in the tab order at all times, which is why this is an
 *    opacity/pointer-events recipe and not a mount condition.
 *  - **H.49 — menu-open persistence.** `aria-expanded:*` AND `data-[state=open]:*`:
 *    the control must not vanish out from under its own open menu. BOTH are
 *    needed, and `aria-expanded` is the one that actually works — round 1
 *    measured `opacity: 0` while the menu was open, because
 *    `RecordActionsMenu` composes `Tooltip > DropdownMenuTrigger > Button`
 *    with `asChild` on both, which collapses two Radix triggers onto ONE
 *    element: the OUTER trigger's props win, so `data-state` on the button
 *    reported the TOOLTIP's state and read `closed` while the menu was open.
 *    `aria-expanded` is set by the menu trigger alone and is therefore the
 *    honest signal (the nesting is also fixed at that call site, so
 *    `data-state` now tracks the menu too — belt and braces, since any other
 *    consumer may compose the trigger differently).
 *  - **H.49 — plain `:focus`.** `focus:*` alongside `focus-visible:*`.
 *    `:focus-visible` does not match a PROGRAMMATIC `.focus()` when the last
 *    input was a pointer, so a control revealed only by `focus-visible` is
 *    invisible to `element.focus()` — which is how tests, skip links and
 *    focus-restore-after-close all move focus.
 *  - **H.50 — touch.** `@media (pointer: coarse)` makes the button permanently
 *    visible, because a coarse pointer has no hover at all. A media-query
 *    branch only: the desktop resting look is untouched.
 *
 * `pointer-events` is toggled alongside `opacity` so an invisible button is
 * never also a click target (an opacity-0 button that still swallows clicks
 * over the row's own click area is the classic version of this bug).
 */
export const ROW_ACTION_REVEAL = [
  'opacity-0 pointer-events-none transition-opacity',
  'group-hover/row-affordance:pointer-events-auto group-hover/row-affordance:opacity-100',
  'group-focus-within/row-affordance:pointer-events-auto group-focus-within/row-affordance:opacity-100',
  'focus-visible:pointer-events-auto focus-visible:opacity-100',
  'focus:pointer-events-auto focus:opacity-100',
  'data-[state=open]:pointer-events-auto data-[state=open]:opacity-100',
  'aria-expanded:pointer-events-auto aria-expanded:opacity-100',
  '[@media(pointer:coarse)]:pointer-events-auto [@media(pointer:coarse)]:opacity-100',
].join(' ')

/**
 * The opt-in RESTING-VISIBLE counterpart, selected by
 * `uiConfig.rowActions.alwaysVisible` (see that key's doc in `@fams/v5-
 * composer`'s `types.ts`). A module whose own reference frame draws the `…`
 * persistently gets this; every other module keeps {@link ROW_ACTION_REVEAL}
 * unchanged, which is why this is a SECOND string rather than an edit to the
 * first — the hover default is authored, shared by List/Hybrid/Kanban, and
 * belongs to the modules that drew it.
 *
 * Only the resting opacity/pointer-events differ. The button was never
 * unmounted or removed from the tab order in either mode, so no focus, menu-
 * open or touch clause is needed here: always-visible already satisfies all of
 * them.
 */
export const ROW_ACTION_PERSISTENT = 'opacity-100 pointer-events-auto'
