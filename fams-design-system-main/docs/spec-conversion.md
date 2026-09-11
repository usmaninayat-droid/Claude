# Spec conversion — Shaheer `.spec.md` → our executable tests (task 2.7 §5)

Shaheer's V5 design system ships behavioral `.spec.md` files. Several of them
describe behaviors we **ported** into this repo's tier-2 templates. This audit
maps each ported spec to the test(s) that assert its claims, and lists — per
spec — which claims are covered, which were **closed in 2.7**, and which are
**N/A** (the claim describes truemax-specific fidelity or an un-ported
component, so there is nothing here to test).

Scope rule (from the task): we audit only the specs that cover PORTED code, and
we do **not** port specs for un-ported components. "N/A" below always names why.

Source specs live in the read-only `FAMS-Design-System-By-Shaheer` repo under
`src/components/…`.

---

## 1. `app-shell/app-shell.spec.md` → DetailSheet / stacking / ModuleView

The AppShell itself is **not** ported (no `AppShell` component here — apps
compose the shell from `@fams/skeleton-kit` + `@fams/v5-kit`). What IS ported is
the pieces the spec describes:

| Ported behavior (spec claim) | Our code | Test(s) |
| --- | --- | --- |
| `DetailSheet` browser-tab strip: one tab per open record, macOS traffic-light header (close-all + minimize) | `entity-profile/ProfileStack.tsx` | `entity-profile/ProfileStack.test.tsx` — tab-per-item + active body; activate / close / **close-all** / **minimize** dispatch |
| `openDetail(descriptor)` pushes a tab; closing the last returns to the module; per-module browser-tab stacking (dedupe, active fallback, minimize keeps stack) | `entity-profile/useDetailStack.ts` | `entity-profile/useDetailStack.test.ts` — push/dedupe/activate, close-active fallback, minimize+restore, close-all |
| **Esc / overlay dismiss = MINIMIZE** (amber-control semantics; module stays mounted) | `ProfileStack` `onOpenChange` → `onMinimize` | **CLOSED in 2.7**: `ProfileStack.test.tsx` — "maps Escape (sheet dismiss) to MINIMIZE" |
| Toolbar band: search filters the active view live | `views/ModuleView.tsx` + `views/ModuleViewFilters.tsx` | `views/ModuleView.test.tsx` — "filters records by the free-text search box" |
| Toolbar band: named **filter facet** dropdowns from the blueprint | `views/ModuleViewFilters.tsx` | **CLOSED in 2.7**: `views/ModuleView.test.tsx` — "renders a blueprint filter facet and narrows the list when a value is picked" |
| View-tab bar = module views + user saved views; add/close a view; per-tab state | `views/ModuleView.tsx` | `views/ModuleView.test.tsx` — tab per view kind, saved-view create/delete round-trip, `onStateChange` view-id + per-tab state |
| Kanban zero-cards-across-all-stages → shared empty state | `views/KanbanView.tsx` | `views/KanbanView.test.tsx` — "renders an empty state with no records" |
| End-to-end: a row/card click opens the detail; module view stays behind | `renderers/v5-module-renderers.tsx` | `renderers/v5-module-renderers.test.tsx` — row-click opens `EntityProfile` sheet; card-click opens `TaskDetail` sheet |

**N/A (not ported):**
- App rail / module rail / top-nav / inbox / "switching app resets module",
  "switching module clears details" — these are `AppShell` state-machine claims;
  no AppShell here (it's `@fams/skeleton-kit` + `@fams/v5-kit` territory).
- `FormSheet` chrome-less create sheet + the DetailSheet `+`-to-create — our
  create surface is `CreationSheet` opened from the module toolbar's "New"
  action, not a `+` inside the stack strip. The create flow itself is tested
  (`CreationSheet.test.tsx`, and end-to-end in the renderer test); the
  `+`-in-strip affordance is not ported → N/A.
- Pipeline **Group-by** (T-094) — not ported into `ModuleView`/`PipelineListView`
  yet → N/A.
- `EntityDetail` tab-strip horizontal-scroll overflow (T-081/T-095) —
  `EntityDetail` is not the component we ported; `EntityProfile` uses ui-kit
  `Tabs`. Overflow behavior is a ui-kit `Tabs` concern → N/A here.

## 2. `data-display/kanban-card.spec.md` → KanbanCardView

Our `views/kanban/KanbanCardView.tsx` is a **v5-tier re-derivation**: the card is
built from the blueprint (`deriveCard`) and every cell renders through the
FieldRegistry read renderers, tokens-only. It is deliberately **not** a port of
truemax's fixed-layout card, so the pixel-fidelity claims below are N/A.

| Ported behavior (spec claim) | Our code | Test(s) |
| --- | --- | --- |
| Card renders a title | `KanbanCardView` → `KanbanCard`'s `title` | `views/KanbanView.test.tsx` — card titles render |
| Card renders **metadata cells** (not title-only) | `KanbanCardView` groups `card.body`/`header`/`footer` cells (`groupCellRows`, read renderers) into `KanbanCard`'s `badges`/`metadataFields`/`footerEnd`/`avatars` | **CLOSED in 2.7**, composed onto `@fams/ui-kit`'s `KanbanCard` in a later pass: `views/KanbanView.test.tsx` — asserts a body cell (company) renders |
| Card is clickable → opens the record | `KanbanCardView` `onClick` | `views/KanbanView.test.tsx` — "fires onCardClick with the record id" |
| Move affordance (keyboard "Move to…" menu, since pragmatic-dnd has no keyboard DnD) + guarded moves | `@fams/ui-kit`'s `KanbanCard` (built-in menu) + `KanbanView`'s `onCardMove` | `views/KanbanView.test.tsx` — keyboard move menu commits; a `canMove`-denied move is refused on commit; `kanban/kanban-model.test.ts` — `resolveMove`/`groupCellRows` |

**N/A (truemax fidelity, not our design contract):** 6px corners vs 8px;
`rounded-[2px]` badge slots; title weight 700; single-letter avatar (vs
initials); the 3-scenario live-ticking **DowntimeBadge**; priority flag icon
with `fill/stroke` from `PRIORITY_CONFIG`; `MAINTENANCE_TYPE_CONFIG`. None of
these are ported — our card composes tokenized read-renderer cells, so there is
no fixed badge/avatar/downtime layout to assert.

## 3. `data-display/state-pill.spec.md` → stage/status chip

There is **no standalone `StatePill` in `@fams/v5-templates`**. The workflow-state
chip is realized two ways in the ported code, both tokens-only:
- the current-stage control in `views/TaskDetailHeader.tsx` (ui-kit
  `StatusTransitionDropdown`), and
- status cells rendered by the FieldRegistry `StatusList`/read renderers.

| Ported behavior (spec claim) | Our code | Test(s) |
| --- | --- | --- |
| Stage label + color derive from the blueprint `statusList` | `views/KanbanView.tsx` (lanes), `TaskDetailHeader` | `views/KanbanView.test.tsx` — a lane per `statusList` stage; `views/TaskDetail.test.tsx` — "Status: {label}" control |

**N/A (ui-kit primitive / truemax fidelity):** exact `StatePill` CSS — 700/11px
Gilroy, `0.05em` tracking, `6px×14px` padding, `sm` = `h-6 px-2.5`, per-stage hex
map. We do not ship that primitive; the chip we ship is `StatusTransitionDropdown`
(tokens-only). These are ui-kit styling contracts, not v5-templates behavior →
N/A here.

## 4. `data-display/state-transition-toolbar.spec.md` → TaskDetail transition control

The toolbar's transition behavior is ported onto `views/TaskDetailHeader.tsx`
(ui-kit `StatusTransitionDropdown`), driven by the composer's rule check.

| Ported behavior (spec claim) | Our code | Test(s) |
| --- | --- | --- |
| Current state + next-state actions; only legal transitions are actionable | `TaskDetailHeader` (`allowedTransitions` → enabled targets) | `views/TaskDetail.test.tsx` — "gates the stage menu by allowedTransitions" |
| A denied transition does not fire `onTransition` | `TaskDetailHeader` (disabled + "Not permitted" reason) | `views/TaskDetail.test.tsx` — "does not fire onTransition when a disallowed (disabled) transition item is clicked" |
| `onTransition(toStageId, note?)` emits the target for the parent to run (component just emits) | `TaskDetail` → `onTransition(toStage, reason)` | `views/TaskDetail.test.tsx` — fires `('won', undefined)` for a permitted target; end-to-end rule-guarded move persists in `renderers/v5-module-renderers.test.tsx` |

**N/A:**
- T-086 action-button typography (sentence-case `text-body-sm font-medium`),
  `gap-1.5` inline-flex layout, `outline/primary/destructive` variant CSS,
  "primary left / destructive right" ordering — these describe the bespoke
  `StateTransitionToolbar` button row. Our control is `StatusTransitionDropdown`
  (a menu, not a button row), so the layout/typography claims don't map → N/A.
- T-102 note-capture dialog (`noteLabel` → DS `Dialog`+`Textarea`) — the
  `onTransition` reason channel exists (`(toStage, reason?)`), but the
  note-capture **dialog** is a ui-kit `StatusTransitionDropdown` concern, not
  ported into v5-templates → N/A here.

---

## Summary of gaps closed in 2.7

Four executable assertions were added so every ported behavioral claim is either
tested or explicitly N/A above:

1. `ProfileStack.test.tsx` — Esc/overlay dismiss maps to **minimize** (stack preserved).
2. `views/ModuleView.test.tsx` — a blueprint **filter facet** renders and narrows the list.
3. `views/KanbanView.test.tsx` — a card's **derived body cell** renders (not title-only).
4. (Coverage confirmation) the composer→templates end-to-end flows —
   `renderers/v5-module-renderers.test.tsx` — exercise row→profile, card→TaskDetail,
   guarded moves, and RBAC list-filtering, which several app-shell claims depend on.
