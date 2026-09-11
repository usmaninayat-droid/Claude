# PORT LEDGER — reference DS → clean architecture

> Historical working document from the initial port project (June–July 2026). Kept for provenance — not part of the living documentation.

Authoritative classification of every component in the reference DS (`mshaheer-des/v5-design-system-ai`),
decided against our layer model + hard rules. The reference is a **design reference only** — we re-implement
intent in our stack (React 19, tokens, Radix, MapLibre, ECharts), never copy code.

**Source analysis:** 6 parallel agents over all ~108 reference files, 2026-07-03. Synthesized + deduped by the orchestrator.

Verdict legend:
- **NEW-PORT** — aligned, missing, worth a clean re-implementation.
- **REFINE** — equivalent exists in target; apply the one specific improvement the reference suggests.
- **REFERENCE-ONLY** — good design, needs our engine (ECharts/MapLibre) → deferred to a dedicated engine phase.
- **REJECT** — app-layer machinery / business-vocab / duplicate; does not enter the DS.
- **BLOCKED** — NEW-PORT gated on a decision (dependency) or an unbuilt dependency.

---

## Totals

| Verdict | Count |
|---|---|
| NEW-PORT (this effort) | **~44** components |
| REFINE existing | 10 |
| BLOCKED — Kanban (needs `@dnd-kit` decision) | 3 |
| REFERENCE-ONLY — charts (ECharts phase) | 12 |
| REFERENCE-ONLY — maps (MapLibre, already have domain/map) | 2 |
| REJECT (app-layer / dup / business) | ~30 |

---

## System-wide policies decided from the analysis

1. **No raw hex/color as a component prop (Rule 2).** Reference components (StatePill, Kanban, Timeline, StateTransition*, IconBadge, PeoplePicker) pass raw hex via `style`. Replaced by:
   - `tone` — a closed semantic enum (`neutral|info|success|warning|danger|primary`) → status tokens.
   - `colorIndex` — categorical data series → `--color-chart-series-1..10` tokens (for legends, avatars-by-person, kanban lanes).
   - **Narrow documented exception:** genuinely user-defined data colors (a user-picked tag/geozone color stored in the DB) may be applied via a single CSS custom property (`style={{ '--dot-color': color }}`) consumed by a token-defaulted utility. This is *data*, not a design decision — allowed only for that case, and only for the color, never layout.
2. **Consolidate duplicates at the source.** The reference ships competing implementations; we admit ONE canonical each: KPI tile (`KpiTile` ← kpi-tile + kpi-card + MetricCard), chart chrome (`ChartCard` ← chart-card + WidgetCard), legend (`ChartLegend` ← chart-legend + figma legend + HeatLegend), notification (`NotificationCard` ← two variants), person picker (`PeoplePicker` ← people-picker + assignee-picker), detail row (`DetailSection`/`FieldRow` ← DetailSection + EntityDetailRow + TaskInfoRow), gauges (one ECharts gauge ← 3 SVG gauges).
3. **Business-named feature panels are rejected**, but their *mechanics* are salvaged into generic presenters (MaintenanceChecklist → `ChecklistSection` with a `states[]` prop; DowntimeBadge → `LiveDurationCard` size variant).
4. **Charts are deferred as a phase, not ported.** Any component whose body is a chart (recharts or hand-rolled SVG) is REFERENCE-ONLY; only chart-agnostic *chrome* (ChartCard, ChartLegend, ChartTooltip, IconBadge, KpiTile, TrendIndicator, RadialProgress, SegmentedBar) ports now.

---

## Build waves (dependency-ordered)

### Wave 1 — Foundational primitives (leaves; unlock the composites) — 14
Zero deps on unbuilt components. `Avatar`, `Badge`, `IconBadge`, `TrendIndicator` are depended-on by many Wave-2 composites, so they lead.

| # | Component | Layer | Ref source | Deps | Prio | Notes |
|---|---|---|---|---|---|---|
| 1 | **Badge** | L1 | primitives/badge | — | P1 | variants default/secondary/outline/muted/success/warning/info/destructive; sizes xs(count-pill)/sm/md; `tone`+`colorIndex`, no raw hex; absorbs StatePill (uppercase solid-pill tone) + StagePill (dot) |
| 2 | **Avatar** | L1 | primitives/avatar | — | P1 | sizes xs–xl w/ matched font; image/initials/status-dot (dot ring follows surface) |
| 3 | **IconBadge** | L1 | data-viz/icon-badge | — | P1 | icon in tinted disc; `tone`→token; circle/square; foundational for ChartCard+KpiTile |
| 4 | **TrendIndicator** | L1 | figma-charts#TrendBadge | — | P2 | up/down delta + note; composed by KpiTile (one shared trend helper) |
| 5 | **Separator** | L1 | primitives/separator | — | P2 | orientation h/v, decorative; de-dups inline dividers |
| 6 | **Progress** | L1 | primitives/progress | — | P2 | Radix Root+Indicator, token-only |
| 7 | **RadioGroup** | L1 | primitives/radio-group | — | P2 | Radix RadioGroup+Item+Indicator |
| 8 | **Accordion** | L1 | primitives/accordion | — | P2 | compound; mirrors Tabs; reuses accordion keyframes |
| 9 | **AlertDialog** | L1 | primitives/alert-dialog | Button | P1 | distinct Radix primitive; Action=destructive/Cancel=tertiary via buttonVariants |
| 10 | **Sheet** | L1 | primitives/sheet (+drawer) | Dialog | P1 | side drawer, logical `start/end`; built on Dialog (NO vaul); vaul gestures flagged future; retires ~20 drawer forks |
| 11 | **Command** | L1 | primitives/command | — | P2 | cmdk wrap; lets Combobox compose DS Command instead of raw cmdk |
| 12 | **ScrollArea** | L1 | primitives/scroll-area | — | P3 | both orientations; cosmetic scrollbar |
| 13 | **RadialProgress** | L1 | data-viz/mini-donut-cell | — | P2 | single-value circular progress SVG (not a chart) |
| 14 | **FileTypeIcon** | L1 | basics/file-type-icon | — | P2 | ext→color map remapped to token scale |

### Wave 2 — Composites (on existing + Wave-1 primitives) — ~24
Independent of each other → high parallelism.

| Component | Layer | Ref source | Deps | Prio |
|---|---|---|---|---|
| **KpiTile** | L3 | kpi-tile (+kpi-card+MetricCard merged) | IconBadge, TrendIndicator | P1 |
| **ChartCard** | L3 | chart-card (+WidgetCard) | Card, IconBadge | P1 |
| **ChartLegend** | L3 | chart-legend (+figma+HeatLegend) | — | P1 |
| **ChartTooltip** | L3 | chart-tooltip | — | P2 |
| **SegmentedBar** | L3 | data-viz/activity-bar | Tooltip | P3 |
| **Alert** (inline banner) | L3 | widgets/context-banner | — | P1 |
| **Timeline** | L3 | data-display/timeline | — | P1 |
| **ChecklistSection** | L3 | checklist-section (+maintenance via states[]) | Progress | P1 |
| **LiveDurationCard** | L3 | downtime-timer (+downtime-badge sm) | — | P2 |
| **HealthStrip** | L3 | widgets/health-strip | — | P2 |
| **ConnectionStatusCard** | L3 | widgets/telematics-status-card (generalized) | — | P2 |
| **Stepper** | L3 | figma-widgets#Stepper | — | P1 |
| **Breadcrumbs** | L3 | navigation/breadcrumbs | — | P1 |
| **UserMenu** | L3 | app-shell/user-menu | Popover, Avatar | P1 |
| **PeoplePicker** | L3 | people-picker (+assignee-picker) | Popover, Avatar, Checkbox | P1 |
| **DestructiveActionModal** | L3 | modals/destructive-action-modal | Dialog, Input, Textarea, Button | P1 |
| **StateTransitionToolbar** | L3 | state-transition-toolbar | Badge, Button | P1 |
| **StatusTransitionDropdown** | L3 | status-transition-dropdown | DropdownMenu, Dialog, Textarea, Button | P1 |
| **ActivityFeed** | L3 | widgets/activity-feed | Avatar | P1 |
| **CriticalEventsList** | L3 | widgets/critical-events-list | ListRow, EmptyState | P2 |
| **EntityProfileCard** | L3 | widgets/entity-profile-card | Avatar, TagChipList | P1 |
| **NotificationCard** | L3 | notification-card (+figma variant merged) | Avatar, Badge | P1 |
| **DateRangePicker** | L3 | basics/date-range-picker | Calendar, Popover, Button | P1 |
| **ModuleViewTabs** + **DetailTabStrip** | L3 | navigation/top-nav | DropdownMenu (plug into TopNav slot) | P1 |
| **ViewTabs** | L3 | navigation/view-tabs | Button, DropdownMenu | P2 |
| **FilterPopup** | L3 | modals/filter-popup | Popover, Button, Badge | P2 (confirm vs FilterPanel) |
| **TableCell** | L3 | data-display/table-cell | Badge, Checkbox, Switch, Avatar, Progress | P2 (rename `compliance`→`gauge`) |
| **DisclosureCard** | L3 | figma-widgets#KpiSelectionCard | — | P3 (speculative) |
| **EntityPickerDrawer** + **LinkedEntityChip** | L3 | modals/linked-entity-picker | Sheet, Avatar, Badge, Checkbox | P2 |

### Wave 3 — Shells (depend on Wave-2) — 3 (+ blocked)
| Component | Layer | Ref source | Deps | Prio |
|---|---|---|---|---|
| **RecordLayout** + **DetailSection**/**FieldGrid** | L4 | app-shell/record-detail | FormGrid, Stack | P2 |
| **DetailSheet** + **FormSheet** | L4 | app-shell/side-sheet | Sheet, form primitives | P1 |
| **DashboardLayout** | L4 | app-shell/dashboard | DateRangePicker, KpiTile, ChartCard | P2 |

### Wave 4 — Refinements to existing components (careful; re-read before edit) — 10
| Component | Change | Ref source |
|---|---|---|
| Input | add `leadingIcon`/`trailingIcon` slots | floating-label-input |
| Select | RTL fix: checkmark `right-2`→`end-2` | primitives/select |
| Switch | swap hand-rolled button → Radix `SwitchPrimitive` (rule-5 a11y) | primitives/switch |
| Tooltip | add `Arrow` + optional support-text second line | primitives/tooltip |
| DropdownMenu | add `DropdownMenuShortcut` (with `ms-auto`) | primitives/dropdown-menu |
| Card | add `CardDescription`; `bg-card` + `shadow-elevation` | data-display/card |
| DataTable | add `groupBy` collapsible sections w/ counts | data-display/data-table |
| Logo | add image-asset + icon-only variant + `tone` (dark surfaces) | figma-basics#Logo |
| SideNav/ModuleRail | Inbox dividers, notif dot, circular footer, border-left accent; grouped sections (SettingsNav) | side-nav, settings-nav |
| ProfileLayout | extract `DetailSection`/`FieldRow` (rule-of-three from entity/record/task detail) | entity-detail |

### Deferred
- **Kanban** (KanbanBoard/Column/Card) — **BLOCKED on `@dnd-kit` dependency decision.** Design is clean + state-agnostic; only the DnD lib is missing from `LIBRARIES.md`.
- **Charts** (12) — area/bar/line/donut/radar/sparkline/gauge×3/heatmap/compare/stacked → **ECharts phase**, own effort.
- **SchemaForm / SteppedSchemaForm** — schema-driven form renderer; likely app-layer, revisit separately.

### Rejected (not in the DS) — highlights
Runtime/composition engine (runtime-app, config-bridge, module-registry, view-renderers, dashboard-widgets), business feature views (live-monitoring-view, report-builder, task-detail, entity-detail-as-orchestrator, map-widgets), duplicates (kpi-card, WidgetCard, figma legends, DowntimeBadge, AssigneePicker, MaintenanceChecklist, PartsTable, side-nav-gradient, map-widget, map-marker), Figma mockup artifacts (TaskCard, UserRoleCard, DevNote, CalendarCell, Skeleton variants), Leaflet map (engine rejected), file-upload (owned by parallel agent).
