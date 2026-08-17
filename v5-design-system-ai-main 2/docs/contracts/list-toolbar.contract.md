# C1 — List Toolbar contract

> **Status:** decided (revisable by an explicit ADR). **Severity of violation:** major.
> **Canonical component:** `ModuleToolbar` (to be extracted from `AppShell.tsx` into an exported,
> ungated DS component). **Enforcement:** `design-qa` rubric + structural gate (`toolbar.mjs`, planned)
> + adoption sweep. **Kills defect classes:** `search-icon-under-input` (×3), the events "extra filter
> row", toolbar fragmentation (15+ hand-rolled toolbars).

## Decision (the locked rule)
Every LIST / TABLE surface renders **exactly ONE toolbar row**, then (optionally) a chips row.
It is the same component everywhere. Anatomy, left → right, in ONE row:

```
[ Search ] [ ≤3 pinned quick-filters ] [ Sort ] [ Group* ] [ All Filters ▿(n) ] · · · [ product slot ] [ Export ] [ + Create ]
─────────────────────────────────────────────────────────────────────────────────────────────
[ active-filter chips … ] [ Clear all ]          ← chips row (NOT a second filter row)
```

- **Search** — one input, left. Placeholder "Search anything here" (existing).
- **Pinned quick-filters** — at most **3** high-value facets as compact dropdown pills. Everything
  else lives ONLY in the All-Filters popover. Which 3 pin = the recipe decides (order in
  `deriveFilters`); default = first 3.
- **Sort** / **Group** — compact popover controls, NOT full-width fields. Group shows only where the
  module supports grouping (pipeline-List today).
- **All Filters** — funnel button + active-count badge → popover with the FULL facet set + date +
  "Clear all filters". This is the home for every facet beyond the 3 pinned.
- **Product slot · Export · Create** — right-aligned (`activeModule.toolbarSlot`, CSV, primary Create).
- **Chips row** — active filters as removable pills + "Clear all". This is the ONLY second row allowed,
  and it holds *state*, not *controls*.

## Do / Don't
- ✅ Reuse `ModuleToolbar`. A facet beyond the 3 pinned → put it in the All-Filters popover.
- ✅ Sort/Group are icon-triggered popovers, sized to content.
- ❌ **A second ROW of filter fields** (the Events `FilterChip` row: Assets/Workforce/Date/Events/Zone/Location) — that is the defect. Fields do not fill the row.
- ❌ **Duplicating popover facets as inline fields** — a facet is pinned (≤3) XOR in the popover, never both.
- ❌ **A separate search row** stacked above/below when the toolbar row already has search.
- ❌ Hand-rolling a search `<input>` + funnel button in a new surface instead of importing `ModuleToolbar`.

## The dashboard exception → C2
Dashboards are NOT lists. `Dashboard` (`dashboard.tsx:70-141`) legitimately renders a row of labeled
filter **FIELDS** (`DashboardFilterDropdown` — multi-select with option dots + counts) + date + Export,
and **no search, no chips, no Create**. That is correct *because filtering the whole board IS the
dashboard's purpose*. It is a **different component** (`DashboardFilterBar`, contract C2) so the two can
never be confused. Rule of thumb: **row-of-fields ⇒ dashboard; search+pinned+popover ⇒ list.**

## States (mandatory)
- **Loading:** skeleton rows (see C6), toolbar stays interactive.
- **No results (search/filter):** a "no results" row with a Clear-filters affordance — never a blank body.
- **Filters active:** count badge on All-Filters + chips row visible.
- **Empty (no data at all):** empty-state message + Create CTA.

## Canonical component + API (target after extraction)
`ModuleToolbar` moves out of `AppShell.tsx` into `src/components/app-shell/module-toolbar.tsx`, exported,
behavior-preserving, and **ungated** (drop `TOOLBAR_TYPES = {'entity','pipeline'}` — any surface may use it).
Props (from today's shell state): `searchValue/onSearch`, `facets` (+ `pinnedCount=3`), `sortFields/onSort`,
`groupBy?`, `activeFilters/onToggle/onClearAll`, `toolbarSlot?`, `onExport?`, `onCreate?`. Filtering/sorting
logic stays in the view renderers (`applyFacets`/`applySort`) — the toolbar is presentational + emits intent.

## Adoption surface (the sweep — must all consume `ModuleToolbar` or be ticketed)
Hand-rolled today (from the reality map), grouped by owner:
- **app-shell built-ins:** `live-monitoring-view.tsx`, `view-renderers.tsx` InboxView (`:1044`), ReportsHome (`:1286`), `report-table.tsx` (`:150`).
- **standalone modules:** `zones/zones-view.tsx` (`:182`), `pois/pois-view.tsx` (`:174`), `contracts/contract-management.tsx` (`:67`), `events/events-view.tsx` (`:387` — the chips-row offender).
- **scheduling:** `shift-planner.tsx` (`:882`), `timesheet-grid.tsx` (`:383`), `workforce-compliance.tsx` (`:389`).
- **planning:** `interactive-planning.tsx` (`:153`), `plan-monitoring.tsx` (`:145`), `smart-planning-calendar.tsx` (`:96`), `plan-monitoring-detail.tsx` (`:156`).
- **settings tables:** `entity-configuration.tsx`, `pipeline-configuration.tsx`, `user-accounts.tsx`, `tags-categories.tsx`.

**Definition of Done for C1** = `ModuleToolbar` extracted + exported + ungated, EVERY surface above consumes
it (or carries a tracked exception ticket with a reason), verified via gates + parity across every showcase
app that renders these surfaces. A surface still hand-rolling a toolbar after this = a `design-qa` blocker.

## Notes / open calibration (safe to proceed on the defaults above)
- `pinnedCount` default = 3; a recipe may override. Some scheduling/planning grids have a legitimate
  **second control row** (view-toggle / date-navigator / legend) — that is NOT a filter row and is allowed
  *below* the toolbar; the contract forbids a second *filter* row specifically.
- Surfaces with genuinely non-list layouts (calendar view-switchers, kanban display toggles) keep their
  view-specific control but still take the standard search+filter from `ModuleToolbar` where they list rows.
