# SPEC — "Filter By You" quick filter (Figma node `33534:26092`)

Source file: FAMS Web Portal `suo7zX7QrsiIeT57UV34yZ`, section "Filter By You".
Frames: `33534:26097` (pinned, disabled), `33534:26558` (assignee dropdown open),
`33534:27088` (enabled + tooltip). Dev Notes `33534:27070` (49),
`33534:27612` (52), `33534:27616` (53); dropdown detail `33534:27561`,
`33534:27084`.
Screenshots: `../figma-filterby-{disabled,enabled,tooltip}.png`,
`~/.claude/jobs/bedd742f/tmp/{p27561,n49,n52,n53}.png`.

> **Branding adaptation.** Figma paints the active avatar ring, the checked
> checkboxes, the count badge and "Select All" in FAMS blue. All map to
> `--primary` (`#6E112D`) in the Qatar MME theme. The avatar identity colours
> are per-user hashes from the DS `Avatar` palette, not brand colours, and stay
> as-is.

## 1. Visual

The Assignee control is one 40px-tall bordered pill on the module toolbar,
sitting after Sort and before the kanban density toggle. It has two parts:

**(a) The "you" avatar button** — leading, circular, 24px.
- *Disabled (default):* a neutral, nameless `Avatar` fallback circle.
- *Enabled:* the signed-in user's own avatar (initial on their colour), wrapped
  in a 2px `primary` focus ring, with a small ✕ badge at the top-right corner.
- Hover (either state) shows tooltip **"Filter for your Tasks"** (verbatim),
  120ms delay, matching the existing `TooltipProvider` convention.

**(b) The assignee dropdown trigger** — label + `ChevronDown`.
- Label is the facet label (`Assignee`) when nothing is selected, the single
  person's name when exactly one is selected, else `Assignee (N)`.
- When any assignee is selected a **count badge** carrying N sits on the
  control's top-right corner (`primary` fill, white numeral) — Dev Note
  `33534:27616`: *"The count badge at the top of the filter will represent the
  number of assignees selected."*

**Dropdown panel** (`align="end"`, ~324px wide, radius `lg`, elevation shadow):

| Region | Content |
|---|---|
| Search row | magnifier glyph + `Search by Name or Email` placeholder, borderless, separated below by a 1px `border` rule |
| Pinned row | checkbox · avatar · **You** (foreground, medium) over the user's email (muted, caption) |
| Group header | `Assignee` (muted caption) at start · **Select All** (`text-primary`, caption medium) at end |
| Option rows | checkbox · avatar (image if the user has one, else initial) · name over email |

Rows are `py-2 px-3`, 40px avatars at `sm`, checkbox `primary` when checked.

## 2. Interaction

- **Dev Note `33534:27070` (49):** *"The user can simply click on the [avatar]
  to view their own tasks… To clear this filter, the user can click the cross
  button on it."* → the avatar button is a **toggle**:
  - press → the assignee filter is set to *exactly* the current user, the
    avatar switches to the ringed self-avatar with the ✕ badge, the board/list
    filters to the user's own records, and the count badge reads `1`.
  - press the ✕ (or the avatar again) → clears the assignee filter entirely and
    returns to the neutral state.
- **Dev Note `33534:27612` (52):** *"The assignee dropdown will include a
  'Select All' option, and users can also select assignees manually."*
  - `Select All` selects every assignee currently listed (i.e. it respects the
    active search term). When all are already selected it flips to
    `Clear All` — a toggle, never a dead control.
- The **You** row is pinned above the group and is not repeated inside it. It
  is an ordinary checkbox row: checking it is the same state the avatar button
  produces, and the two stay in sync in both directions.
- The **search box** filters rows client-side on name OR email, case
  insensitive. It never filters away the `You` row's group header.
- Checking/unchecking a row does **not** close the panel (multi-select).
- `Escape` / outside click closes; focus returns to the trigger.
- The selection is part of the filter state, so it participates in
  `ViewState`/saved views and in the toolbar's "clear filters" path, and it
  composes with search, the filter panel and sort.
- Keyboard: the avatar button is a real `button` with
  `aria-pressed` and an accessible name of `Filter for your Tasks`; the ✕ is
  reachable as part of the same control (pressing it while focused = clear).

## 3. Empty / edge states

- Module with no assignee-typed column → the whole control is not rendered.
- Signed-in user is not among the module's assignees → the avatar button still
  works; the board legitimately shows an empty result with the standard
  "no records match" empty state and a Clear-filters action.
- Search with no matches → a muted `No people match "<term>"` row.
- No `userContext` (unauthenticated preview) → the **You** row and the avatar
  quick-toggle are omitted; the plain multi-select list remains.

## 4. Delta vs current implementation

`ModuleViewFilters.tsx` already renders an Assignee pill with a neutral leading
`Avatar` and a `DropdownMenuCheckboxItem` list from `ModuleViewAssigneeFacet`.
Gaps to close:

1. The leading avatar is `aria-hidden` decoration — it must become the
   "Filter for your Tasks" toggle button with self-avatar, ring and ✕ badge.
2. No count badge on the control.
3. Dropdown has no search box, no pinned **You** row, no **Select All**, no
   avatars and no email sub-labels.
4. `ModuleViewAssigneeFacet` carries only `options: string[]` — it needs
   per-option display metadata (name, email, avatar) and the current user's id,
   supplied generically from `userContext` + the module's user directory, never
   hardcoded.
