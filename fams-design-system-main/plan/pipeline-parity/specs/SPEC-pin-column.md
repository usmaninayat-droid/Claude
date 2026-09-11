# SPEC — Pin Column (Figma node `33534:43315`)

Source file: FAMS Web Portal `suo7zX7QrsiIeT57UV34yZ`, section "Pin Column".
Frames: `33534:43316` (Pin Columns — hover state), `33534:44661`, `33534:45125`
(Kanban View with a pinned group + separator). Dev Notes `33534:45589`,
`33534:45590`, `33534:44658` (55).
Screenshots: `../figma-pincol-{list,kanban1,kanban2}.png`,
`~/.claude/jobs/bedd742f/tmp/p55.png`.

> **Branding adaptation.** Figma draws the stage accent bars and the pinned
> separator in FAMS blue. Accent bars come from each stage's own
> `uiConfig.statusList[].color` (already data-driven); the separator uses
> `--border`/`--primary` from the Qatar MME theme.

## 1. Visual

- Each stage lane has a 3px accent bar across the top in the stage colour, a
  header row with the stage **label**, a **count chip**, and a trailing **pin
  icon button**.
- The pin icon is **revealed on lane hover / keyboard focus** and is otherwise
  visually hidden (it stays in the accessibility tree).
- A pinned lane keeps the pin icon permanently visible and renders it in its
  active (filled) state.
- **Dev Note `33534:45590`:** *"A vertical line will act as a separator between
  pinned and unpinned columns."* — the separator is drawn after the LAST pinned
  lane: a full-height 2px rule with a small round cap at its top.

## 2. Interaction

- **Dev Note `33534:45589`:** *"When the user hovers over a Column Status, a pin
  icon will appear. Clicking the pin icon will pin that column to the first
  position, regardless of its current location."*
  - Pin → the lane is hoisted to the **front** of the board; pinning a second
    lane puts it after the first (pins keep the order they were added in);
    unpinned lanes keep their configured relative order.
  - Click again → unpin, and the lane falls back to its configured slot.
- **Dev Note `33534:44658` (55) — load-bearing:** *"Horizontal scrolling will be
  applied to all columns together. There will be no separate behavior where
  pinned columns remain fixed while the remaining columns scroll. All columns
  will scroll at once. This is to prevent multiple scrollbars in smaller
  viewports."*
  - Pinning therefore **reorders only** — it must NOT make the lane
    `position: sticky`. The board keeps exactly one horizontal scroller.
- Pin state is per-view and sticky (`ViewState.pinnedColumns`), so it survives
  navigation and is saved with a saved view.
- Drag-and-drop between stages is unaffected by pinning; a pinned lane accepts
  and rejects drops by the same `rules.json` transition set as any other.
- Screen-reader: the pin button is named `Pin <Stage>` / `Unpin <Stage>` with
  `aria-pressed`.

## 3. Edge states

- A pin limit applies (`MAX_PINNED_COLUMNS`); attempting to exceed it is
  refused with `PIN_LIMIT_REASON` rather than silently ignored.
- A saved `pinnedColumns` naming a stage a later blueprint edit removed is
  ignored, not an error.
- No stages pinned → no separator is drawn.

## 4. Delta vs current implementation

Pin Column was **already implemented** by a prior parity run — the code cites
this very Dev Note. `KanbanView` owns `pinnedStages`/`onPinnedStagesChange`,
`views/kanban/move-rules.ts` provides `orderStagesByPinned`/`togglePinned`, and
`ui-kit`'s `KanbanColumn` takes `pinned`/`pinnedSeparator`. One genuine
regression remains:

1. `KanbanColumn.tsx` applies `pinned && 'sticky start-0 z-10 bg-card
   shadow-elevation'`, which is exactly the frozen-column behaviour Dev Note
   `33534:44658` forbids. It must be removed; only the reorder + the separator
   rule survive.
