# Changelog — @fams/ui-react

All notable changes to the component library. Format loosely follows Keep a Changelog.

## 2026-07-04 — showcase template, family-based IA, coherence cleanup

### Changed
- **Standardized component-page template** across all ~88 component pages: Playground/Preview → Galleries (grouped state grids) → PropsTable → Guidelines → Accessibility. Replaces the earlier flat, per-component-inconsistent demo pages.
- **Global RTL via header switcher.** RTL is now proven once, for every page, via a `dir="rtl"` toggle in the showcase header — per-demo RTL blocks removed (zero left in the codebase).
- **Nav restructured to a family-based IA**: 88 components regrouped from flat layer listing into 26 families across 9 function groups (Actions, Forms & Input, Data Display, Overlays, Feedback, Navigation, Flows, Profiles & Records, Shells & Structure). Each family is one page with member tabs (e.g. Data Table & Filtering = table + cells + columns + filters). Grounded in v5-codebase usage research (31 tabbed workspace profiles, right-anchored sheet widths, single-step-create dominance). Legacy routes redirect via a generic map — no broken links.
- **StatusView replaces EmptyState + ErrorState + NoPermission** — one kind-dispatch component (`'empty' | 'error' | 'no-permission'`) instead of three near-identical full-page state screens; `NoPermission` kept as an inline-only gate variant. Real consumers (`CriticalEventsList`, `ProfileLayout`) updated.
- **FilterPanel**: fixed a datalist id-collision bug — multiple `FilterPanel` instances on the same page were all binding to the first panel's `<datalist>` via a hardcoded id (root cause of "opening one dropdown opened all"), now scoped via `useId()`. Added outside-click / Escape dismissal to the save-options menu.
- Deduplicated shared gap-class logic (`layout/_gap.ts`, used by Stack/Toolbar/FormGrid) and array-coercion logic (`lib/toArray.ts`, used by Combobox/PeoplePicker) into single sources.

### Removed
- **Command** primitive — speculative addition with zero real IWMP usage.

### Deprecated
- **NotificationCard** flagged beta — pending a real consumer before it's considered stable.

## [Unreleased] — reference-DS port (branch `feature/design-port`)

The design team's reference DS (`mshaheer-des/v5-design-system-ai`) was used as a **design reference
only** — every component below was re-implemented cleanly in this architecture (React 19, `@fams/tokens`,
Radix, cva, TypeScript strict, state-agnostic presenters), never copied. All ~108 reference components
were analysed and classified in `docs/history/PORT-LEDGER.md`; duplicates were consolidated to one canonical
component each; nothing that fetches/stores/routes or carries business vocabulary was admitted.

### Added — primitives (L1)
Badge, Avatar, IconBadge, TrendIndicator, Separator, Progress, RadioGroup, Accordion, AlertDialog,
Sheet, Command, ScrollArea, RadialProgress, FileTypeIcon.

### Added — composites (L3)
KpiTile, Alert, Breadcrumbs, ChartCard, ChartLegend, ChartTooltip, Timeline, ChecklistSection, Stepper,
UserMenu, PeoplePicker, DestructiveActionModal, NotificationCard, SegmentedBar, LiveDurationCard,
HealthStrip, ConnectionStatusCard, CriticalEventsList, ViewTabs, ModuleViewTabs, FilterPopup, TableCell,
EntityPickerDrawer (+ LinkedEntityChip), StateTransitionToolbar, StatusTransitionDropdown, ActivityFeed,
EntityProfileCard, DateRangePicker, Kanban (KanbanBoard/Column/Card, on `@hello-pangea/dnd`).

### Added — shells (L4)
RecordLayout (+ DetailSection, FieldGrid), DetailSheet, FormSheet, DashboardLayout.

### Changed — refinements to existing components (strictly additive)
- Input: optional `leadingIcon` / `trailingIcon` slots.
- Switch: re-implemented on the real Radix `Switch` primitive (a11y).
- Tooltip: optional `showArrow` + `TooltipSupport` line.
- DropdownMenu: `DropdownMenuShortcut`.
- Card: `CardDescription`; `bg-card` + `shadow-elevation` surface.
- DataTable: optional collapsible `groupBy` sections.
- SideNav / ModuleRail: border-inline accent, notification dot, `SideNavFooterItem`, grouped `ModuleRailSection`.
- `cn()`: taught tailwind-merge our custom `text-*` typography tokens (font-size vs color no longer collide).

### Fixed
- Select: RTL — checkmark `right-2`→`end-2`, `pl/pr`→`ps/pe`.

### Infra
- `docs/history/PORTING-PLAYBOOK.md` (agent contract), `docs/history/PORT-LEDGER.md` (classification),
  `docs/USAGE-INDEX.md` (which v5 pattern each component replaces), `docs/COMPONENT-GUIDE.md` (when-to-use).
- `@hello-pangea/dnd` (Apache-2.0) added for Kanban.
- Live component gallery at `apps/showcase` → Components → "Ported (WIP)".

### Deferred (not in this branch)
- **Charts** (line/bar/donut/gauge/heatmap/radar/sparkline) → dedicated ECharts phase.
- **Logo** image/icon variants → needs config-driven assets (not library `?url` imports).
- **Categorical multi-hue token palette** → decision pending (current chart ramp is monochrome).
- Per-component showcase doc pages (currently one flat gallery).

### Quality bar
Every checkpoint: `@fams/ui-react` typecheck + Vitest (711 passing) + ESLint (incl. jsx-a11y),
**and** `@fams/showcase` typecheck — all green. Tokens-only, RTL logical properties, Radix a11y.
