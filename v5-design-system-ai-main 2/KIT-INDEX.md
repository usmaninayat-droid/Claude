# KIT-INDEX — the system inventory

> Single index of the design system. When you need to find a component, module
> type, schema, recipe, asset, or token — **start here**. A module is **config,
> not React** (`src/runtime/config-render.ts` → `config-bridge` → renderers).
> New product = new config; new module *type* = a registered renderer.

## Module types (the fixed menu) + when to use each

| Type | Use for | Renders from config |
|---|---|---|
| **entity** | things (vehicles, contacts, companies, assets) | list/grouped/map views + profile detail (identity panel + tabs incl. declarative **Overview** widgets) |
| **pipeline** | staged work (deals, tickets, work orders) | kanban + list + grouped, dynamic cards, tabbed detail (Timeline/Activity/Linked/Files), RBAC moves |
| **dashboard** | KPIs + analytics | KPI row + declarative **widgets** (donut · gauge · bar · compareBars · maps) |
| **live-monitoring** | real-time fleet/asset map | left fleet list + map with **AssetMarker** pins (state colour + dynamic glyph) + popup over marker |
| **reports** | report instances | per-report list/grouped views (Home + Runner) |
| **inbox / settings / calendar / forms** | notifications · settings nav · scheduling · creation | notification stack · `SettingsNav` · month grid · `SchemaForm`/`SteppedSchemaForm` |

## Component library (`src/components/*`) — ~243 components, token-only

| Area | Count | Key components / use when |
|---|---|---|
| **primitives** | 103 | Button, Input, Select, Badge (Tag/Status), Dialog, Popover, Tooltip, Avatar, Tabs, Switch — the base kit |
| **data-display** | 24 | DataTable, ListRow, KanbanCard/Column, StatePill, StateTransitionToolbar, Timeline, DowntimeBadge, PeoplePicker |
| **data-viz** | 19 | KpiTile/KpiCard, Bar/Line/Area/Donut/Gauge/Heatmap/Radar charts, ComplianceGauge, **CompareBars**, ChartCard, IconBadge, Sparkline |
| **widgets** | 9 | **EntityProfileCard** (identity panel), ActivityFeed, EntityChartCard, identity-map-card |
| **widgets-v2** | 7 | MetricCard, NotificationCard, EventLogCard, Stepper, KpiSelectionCard, UserRoleCard |
| **navigation** | 7 | SideNav + ModuleRail, TopNavModule (+ reports Home), TopNavDetail, **SettingsNav**, Breadcrumbs, ViewTabs |
| **map** | 6 | LeafletMap (markers · routes · **zones** · **heat** · `kind:'asset'` pins · `project()`), **AssetMarker**, EventsHeatmap, ZoneComplianceMap, ServiceLocationsMap |
| **app-shell** | 46 | AppShell, module-registry, the 9 view renderers, config-bridge, DetailSheet (minimize/close-all per-module tabs), Dashboard + **DashboardWidgetGrid**, EntityDetail, LiveMonitoringView |
| **basics** | 10 | Logo (FAMS/Tadweer × tone), CalendarCell, DatePickerListItem, SkeletonLoader, DevNote |
| **charts** | 12 | showcase chart wrappers (WidgetCard, ActivityGauge, StackedBarChart, HeatChart…) |

## Icons & assets (`src/icons`, `assets/`)

- **UI icons** — ~1231 V5 glyphs, `import { Icons } from '@ds/icons'` (lucide-compatible API).
- **EventIcon** — event glyph library (line/map), `<EventIcon name variant>`; line everywhere, map on the map. Cell renderer: `component: { name: 'EventIcon' }`.
- **AssetGlyph** — vehicle/workforce/bin asset glyphs (map/list), the dynamic inner icon of `AssetMarker`.
- Raw assets: `assets/icons/fams` · `assets/vectors/{events,vehicle,bin,workforce,POI,…}` · `assets/icons-on-map`.

## Schemas · golden recipe · brand

- Schemas: `schemas/` — Recipe + Entity/Pipeline/Dashboard/Reports/Settings/Tenant configs.
- **Golden recipe**: `recipes/crm/` — copy this. `deals` (pipeline) · `companies`/`contacts` (entity, with a declarative `profile.overview`).
- **Brand default = FAMS** (coherence law #6): every product/demo/test uses FAMS blue (`--primary #0072D6`) + the FAMS logo — set NO `brand.theme`/logo unless the user explicitly asks for a different brand.

## Health
`pnpm typecheck` · `pnpm test` · `pnpm build` (all green).

## The 6 coherence laws (never break)
1. Token-only styling (no hex in components). 2. One shell + IA (render `AppShell`).
3. Fixed module-type menu. 4. Config-driven rendering (no per-product screen React).
5. Theming = tokens + logo only. **6. Default brand = FAMS.**

> Contributing or extending? See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/`](docs/) —
> architecture, the module-type cookbook ([`docs/MODULE-TYPE-COOKBOOK.md`](docs/MODULE-TYPE-COOKBOOK.md)),
> the build sequence, and ADRs.
