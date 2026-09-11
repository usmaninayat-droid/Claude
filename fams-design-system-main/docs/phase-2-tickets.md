# Phase 2 tickets (opened during Phase 1 dependency alignment)

Tickets logged here were scoped but deliberately **not** attempted during
Phase 1 §5 (dependency alignment) because they exceed a contained, same-task
rewrite. Each entry records the scoping evidence so Phase 2 doesn't have to
redo the investigation.

## KANBAN-DND: replace `@hello-pangea/dnd` with `@atlaskit/pragmatic-drag-and-drop`

**Decision reference:** tech-stack.md ("Drag & drop: pragmatic-drag-and-drop
(Atlassian) — dnd-kit rejected"), decision #tech-stack.

**v5-tier resolution (Task 2.4, phase 2 §3):** the NEW v5-template
`KanbanView` (`packages/v5-templates/src/views/KanbanView.tsx`) is built
directly on `@atlaskit/pragmatic-drag-and-drop` (now a real dependency of
`@fams/v5-templates`, catalog-pinned), so the v5-family pipeline board already
runs on the chosen library — this ticket's motivation is satisfied *for the v5
tier*. It ships the keyboard concern below as a documented, tested "Move to
stage" card menu (pragmatic-dnd has no built-in keyboard DnD). **Still
pending:** the ui-kit legacy swap — `packages/ui-kit`'s `Kanban.tsx` remains on
`@hello-pangea/dnd` (untouched) and the scope below is the plan for replacing
*it*.

**Status (2026-07-23): DONE.** `packages/ui-kit`'s `Kanban.tsx`/`KanbanCard.tsx`
now run on `@atlaskit/pragmatic-drag-and-drop` (+ the `-hitbox`,
`-react-drop-indicator`, `-live-region` companion packages, all now real
dependencies of `@fams/ui-kit`, catalog-pinned) — `@hello-pangea/dnd` has been
removed from `packages/ui-kit/package.json` entirely. `KanbanBoard`/
`KanbanColumn`/`KanbanCard`'s public prop API is unchanged (see "What Phase 2
should do" below — every item there was completed as scoped). The keyboard/
screen-reader parity gap is closed by a board-provided column registry
(`kanban-context.ts`) that lets each `KanbanCard` render a "Move to…" menu
(`MoreVertical` trigger → `DropdownMenu`), plus lift/drop
`pragmatic-drag-and-drop-live-region` announcements. `Kanban.test.tsx` was
rewritten against the new mocking strategy; all originally-documented
behavioral guarantees still hold, plus new tests for the "Move to…" menu. The
`docs/BACKLOG.md` v5-templates entry (`KanbanCardView` doesn't compose
`KanbanCard`) is still open — only the `ui-kit` half of this ticket was ever
in scope here; that entry tracks the remaining `v5-templates` rewrite.

### Scope assessed

Read `packages/ui-kit/src/composites/Kanban.tsx` (251 lines: `KanbanBoard`,
`KanbanColumn`, `KanbanCard`) and `Kanban.test.tsx` (195 lines, 11 tests) in
full before deciding.

**Why this is not a contained (~1 focused day) rewrite:**

1. **Different API shape, not a drop-in swap.** `@hello-pangea/dnd` is a
   render-props API (`Droppable`/`Draggable` hand back `innerRef`,
   `droppableProps`/`draggableProps`, `dragHandleProps`, and a `placeholder`
   node) wired through a single `DragDropContext.onDragEnd`.
   `pragmatic-drag-and-drop` is a low-level, imperative toolkit: you attach
   `draggable()` / `dropTargetForElements()` behaviors to raw DOM nodes
   yourself (typically in a `useEffect` + ref), and subscribe via
   `monitorForElements()` — there is no render-prop equivalent to translate
   1:1. `KanbanBoard`, `KanbanColumn`, and `KanbanCard` would all need their
   internals rewritten, not just an import swap.
2. **No built-in reordering, placeholder space, or auto-scroll.**
   `@hello-pangea/dnd` computes the dragged-item's displaced layout and
   placeholder automatically. Pragmatic-dnd ships none of this — reorder
   math, placeholder sizing, and auto-scroll are the consumer's
   responsibility (Atlassian's own examples build these by hand per board).
3. **Keyboard + screen-reader accessibility is the actual hard part.**
   `Kanban.tsx`'s own doc comment says `@hello-pangea/dnd` was "chosen for
   its keyboard + screen-reader support" — it ships a complete keyboard
   sensor (Space to lift, arrow keys to move, Space to drop) and live-region
   announcements out of the box. Pragmatic-dnd's core package does not ship
   an equivalent keyboard interaction model — the `-live-region` companion
   only gives you an announcer primitive, and full keyboard board support is
   a hand-built pattern in Atlassian's own docs/examples, not a toggle. Per
   `CLAUDE.md` hard rule 5 ("every interactive component passes axe") and the
   DS's own accessibility bar, re-establishing equivalent keyboard support is
   a design-and-build task in its own right, not a mechanical port.
4. **The whole test suite mocks the old API shape.** All 11 tests in
   `Kanban.test.tsx` `vi.mock('@hello-pangea/dnd', ...)` the render-prop
   shape and capture `onDragEnd`. None of that mock strategy carries over —
   pragmatic-dnd would need new tests built around mocking
   `draggable`/`dropTargetForElements`/`monitorForElements` from
   `@atlaskit/pragmatic-drag-and-drop/element/adapter`, effectively a
   rewrite of the test file too.
5. **Usage surface:** only one component family (`Kanban.tsx`) — the
   `@hello-pangea/dnd` import is otherwise isolated to this file, its test,
   and the axe sweep fixture (`src/a11y.axe.test.tsx`) — so the *blast
   radius* is small. But small blast radius + a from-scratch keyboard a11y
   implementation is still not a "≤1 focused day" job; it's a
   design-plus-build task that deserves its own ticket and its own axe
   verification pass.

### What Phase 2 should do

- Design the keyboard interaction model first (lift/move/drop + live-region
  announcements) using Atlassian's board example as a reference, verify it
  against the same a11y bar as every other DS component.
- Rewrite `KanbanBoard`/`KanbanColumn`/`KanbanCard` internals on
  `draggable()` / `dropTargetForElements()` / `monitorForElements()`, keeping
  the public prop API (`KanbanBoardProps`, `KanbanColumnProps`,
  `KanbanCardProps`, `onCardMove`) unchanged — no consumer-visible break.
  Companion packages already catalog-pinned: `@atlaskit/pragmatic-drag-and-drop`,
  `@atlaskit/pragmatic-drag-and-drop-hitbox` (reorder/edge-detection),
  `@atlaskit/pragmatic-drag-and-drop-react-drop-indicator` (drop-line
  visuals), `@atlaskit/pragmatic-drag-and-drop-live-region` (screen-reader
  announcer). Add `flourish` only if a drop animation is wanted.
- Rewrite `Kanban.test.tsx` against the new mocking strategy; all existing
  behavioral assertions (wiring, no-op guards, unknown-column guard,
  tone/token-only classes, ref forwarding) should still hold.
- Re-run the fixture in `src/a11y.axe.test.tsx` and keep it green.
- Remove `@hello-pangea/dnd` from `packages/ui-kit/package.json` entirely
  once the port lands, and drop the catalog comment referencing it.
