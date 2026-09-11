# SPEC — Pipeline Sorting (Figma node `33534:45591`, section "Sorting")

Source file: FAMS Web Portal `suo7zX7QrsiIeT57UV34yZ`. Frames:
`33534:46719` / `33534:45674` / `33534:46191` (Kanban View – Sorting, 1920×1080)
plus Dev Notes `33534:45592` (57), `33534:45620` (58), `33534:45647` (59).
Screenshots: `../figma-sorting-{1,2,3}.png`, `~/.claude/jobs/bedd742f/tmp/s5{7,8,9}.png`.

> **Branding adaptation.** Figma is FAMS blue. Every accent in this spec maps to
> the Qatar MME theme via DS tokens (`--primary` = `#6E112D`). No FAMS blue is
> copied. Active-row text/arrow = `text-primary`; "Reset" = `text-destructive`.

## 1. Visual

The Sort control is the second icon button on the module toolbar, between the
Filter funnel and the Assignee chip. It is an `ArrowUpDown` glyph in a 40px
tertiary icon button. Trigger reads `border-primary text-primary` while a sort
is active or the menu is open.

Popover (`align="start"`, ~224px wide, radius `md`, elevation shadow, 6px pad):

| Region | Content | Token |
|---|---|---|
| Header row | `SORT BY` (uppercase, caption, semibold, muted) at start; `Reset` at end | label `text-muted-foreground`; Reset `text-destructive`, caption, medium |
| Row 1 | `None` + ` (default)` in muted | `text-foreground` / `text-muted-foreground` |
| Rows 2..n | one per sortable column (blueprint `listcolumns`) — Figma shows Severity, Ticket ID, KPI Category, Lot, Sector, Penalty, Assigned ESP, Reported By, Rectification Due | `text-foreground` |
| Active row | tinted background + `text-primary` label + a direction arrow at the row end | `bg-muted/60`, arrow `text-primary` |
| Hover row | tinted background, cursor pointer | `hover:bg-muted` |

Rows: full width, `px-2 py-1.5`, `rounded-sm`, caption type, label truncates.

## 2. Interaction (Dev Notes are authoritative)

- **`33534:45592` (57):** "Once the user clicks on any of the options, it will
  first sort in **ascending** order." → clicking an inactive row sets
  `{key, direction:'asc'}`.
- **`33534:45620` (58):** "Clicking it again will **remove** the sorting." →
  clicking the *row* of the already-active column clears sort to `None`.
  (Note this is a 2-state row cycle, NOT asc→desc→none.)
- **`33534:45647` (59):** "Clicking **the arrow** will change the sorting order
  from ascending to descending, and from descending back to ascending." → the
  direction arrow is its own hit target; it flips direction and never clears.

Therefore the active row has **two** affordances:
1. row body → clear sort (back to `None (default)`),
2. arrow button → toggle `asc ⇄ desc`.

Other affordances:
- `Reset` in the header → clears sort to `None`, menu stays open.
- `None (default)` row → clears sort; shown selected when no sort is active.
- Picking a column **closes** the menu; toggling direction via the arrow keeps
  it open (you are refining, not choosing).
- `Escape` / outside click closes. Trigger keeps focus on close.
- Sort persists into `ViewState.sort` (saved views) and applies to BOTH lenses:
  in List it drives the column sort indicator; in Kanban it orders the cards
  **within** every stage lane.
- Screen-reader: the arrow button is named
  `Sort <Column> descending` / `ascending` per its next action; the row is
  `role="option"` with `aria-selected`.

## 3. Empty / edge states

- Module with no sortable columns → the whole Sort control is not rendered.
- A saved sort naming a column that no longer exists → treated as no sort
  (no throw), and the menu shows `None (default)` selected.

## 4. Delta vs current implementation

`packages/v5-templates/src/views/ModuleViewFilters.tsx` already renders a
"Sort by" dropdown with None + columns and asc/desc arrows, wired to
`ViewSort`. Gaps to close:

1. No `Reset` affordance in the header.
2. `selectSort` cycles asc → desc → null **on the row**; Figma splits this into
   row = set/clear and arrow = flip direction.
3. The direction arrow is decorative, not a button.
4. Kanban lens does not currently order cards within a lane by `sort`.
