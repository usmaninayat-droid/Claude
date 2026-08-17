# FAMS Interaction & Layout Contracts — the index

> **What this is.** The canonical, decided-once rules for the interaction/layout patterns
> that agents kept improvising inconsistently. Each contract states the DECIDED rule + Do/Don't
> + **the canonical DS component that encodes it** + how it's enforced (gate / review-checklist).
> Decide it here → build the component → gate it → never re-discuss.
>
> **Who consults this.** MANDATORY reading before BUILDING or REVIEWING any list, table, form,
> detail sheet, status pill, or dashboard. The `design-qa` reviewer's rubric IS this folder;
> `frontend-eng` reads the relevant contract before authoring; the review-fix panel enforces it.

## Why this exists (skills R&D conclusion)
The `ui-ux-pro-max` GitHub skill (MIT) is a searchable KB of `Category / Issue / Do / Don't /
Severity` rows consulted before building — a good *method*. But its generic content is **already
harvested** into `.claude/team/knowledge/ux-rules.md` (99 rules) + `qa-antipatterns.md` + `states.md`,
so importing it adds nothing. Our recurring defects are **FAMS-specific interaction contracts** it
never covered. So: **adopt the method (consult-first, severity-tagged, gated), fill it with FAMS law.**
We do NOT proliferate personas — one new reviewer (`design-qa`) owns fidelity + adoption; contracts
are the shared rubric.

## The Layer-0 principle (why contracts become components)
Mistakes cluster wherever a pattern is PROSE instead of a COMPONENT. The coherence laws already
forbid hand-rolling chrome (nav/kanban/shell never break — they're components). So each contract's
endgame is a **single canonical component** that makes the wrong version unbuildable. To improve a
pattern you EDIT the one component (every consumer gets it for free) — you never fork a sibling.

## The register

| # | Contract | Canonical component | Enforcement | Status |
|---|----------|---------------------|-------------|--------|
| C1 | [List Toolbar](list-toolbar.contract.md) — one row: search · pinned quick-filters · Sort · Group · All-Filters popover · view actions; no second filter row; no popover filters duplicated inline; dashboards excepted | `ListToolbar` (app-shell) | structural gate + design-qa | **drafting** |
| C2 | Dashboard Filter Bar — filter FIELDS filling the row is correct here (distinct from C1) | `DashboardFilterBar` | design-qa | planned |
| C3 | Status Pill — fixed type scale (never larger than body), `--status-*` only, tint/solid/outline per column role | `StatusPill` / `state-pill` | typography gate + design-qa | planned |
| C4 | Form/Detail Header — title → divider → tab strip → panel; tabs never above the divider | `SheetHeader` | structural gate + design-qa | planned |
| C5 | Detail Surface — every module's detail renders the config-driven `TaskDetail`; a bespoke look-alike is banned (`ignored-existing-ds-component`) | `TaskDetail` | reuse gate + design-qa | planned |
| C6 | Table Data-Loading — skeleton first-load; default virtualized infinite-scroll; "Showing X of Y" = materialized / current filtered+searched total | `DataView` / table loader | design-qa | planned |

## Contract file shape
Each `*.contract.md` carries: **Decision** (the locked rule) · **Rationale** (benchmarked vs
best-in-class where relevant) · **Do / Don't** (with the defect class it kills) · **Canonical
component + API** · **States** (empty/loading/error/no-results) · **Enforcement** (gate id or
review-checklist) · **Adoption** (the call-site surface that must all consume it).
