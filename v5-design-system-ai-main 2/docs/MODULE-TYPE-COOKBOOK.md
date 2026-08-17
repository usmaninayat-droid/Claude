# Module-Type Cookbook — one golden recipe per type

> **What this is.** The copy-paste reference for composing a FAMS V5 product.
> For each of the **9 module types**, this gives you: *when to use it*, *how it's
> authored* (declarative JSON vs. a config TSX module), the **minimal golden
> snippet**, the DS components it composes, and the **proven source file to copy**.
>
> **Why it exists.** A generated app should look like the hand-composed showcase.
> The fidelity comes from using the *same* config shapes the showcase + the
> `Code/fleet-ops` proof use. Copy the proven source — don't reinvent the shape.
>
> Pairs with: [`KIT-INDEX.md`](../KIT-INDEX.md) (component manifest), the
> `Recipe.schema.json` + per-type schemas in [`schemas/`](../schemas), and
> [`docs/FAMS-PLATFORM-MODEL.md`](FAMS-PLATFORM-MODEL.md) (the App→Module→View model).

---

## How to pick a type (decision guide)

Answer top-to-bottom; the **first** match wins.

| If the capability is… | Use type | Backed by an entity? |
|---|---|---|
| Records that **move through stages** on a board (leads, work orders, manifests, tickets) | **pipeline** | yes (+ `statusList` + rules) |
| Records you **browse / edit** but with no lifecycle board (vehicles, companies, assets, contacts) | **entity** | yes |
| **Real-time assets on a map** + a fleet/asset list with telemetry popups | **live-monitoring** | yes (geo) |
| **KPIs + charts** summarizing other modules' data | **dashboard** | no (reads others) |
| **Tabbed report surfaces** — tables / KPI grids / charts / export | **reports** | no (reads others) |
| **Events on a month grid** (bookings, training, activities) | **calendar** | yes / events |
| A **full-page data-entry form** (log a reading, file a request) | **forms** | writes an entity |
| **Notifications / items needing attention** | **inbox** | events |
| **Admin configuration** (thresholds, toggles, dangerous actions) | **settings** | no (config) |

> **Rule of thumb:** *entity vs pipeline* is the only subtle call — both sit on an
> `EntityConfig`. The difference is **lifecycle**: declare `statusList` stages +
> transition rules → pipeline (kanban + rule-enforced moves); otherwise → entity.

### Two authoring forms

- **Declarative JSON** (`entity`, `pipeline`) — a `*.module.json` config + a
  `*.seed.json`, wired through `createAppRuntime` → the sim engine. Rendering is
  derived from field metadata. **No React.** Copy [`recipes/crm/`](../recipes/crm).
- **Config TSX module** (`dashboard`, `live-monitoring`, `reports`, `calendar`,
  `forms`, `settings`, `inbox`) — a `ModuleConfig` object carrying typed `data`
  (or `tabs` with `render`) consumed by the shell's built-in renderer. Still
  config, **still no bespoke screen** — you fill a typed shape, the shell draws it.

Both kinds live side-by-side in the product's `recipe.ts` / `App.tsx` (see
[`Code/fleet-ops`](#proof)): data modules in the `RecipeBundle`, config modules
added as direct `AppShell` `ModuleConfig`s.

### Two rules that override the table

- **A data-owning module is never just a form.** A from-scratch module is **a
  view (list / kanban / map / calendar) + a detail side sheet + a creation side
  sheet** — in that order. Open the detail from a row/card (reuse `TaskDetail`
  or `EntityDetail`; if neither fits, a new side sheet that keeps the **same
  detail top-nav** and opens as a right sheet). The Create form is a **`FormSheet`**
  (toolbar "Create New" / detail "+"). The standalone `forms` type (a full-page
  form) is the *exception* — use it only for genuine "log a reading / file a
  request" entry points, not as the default module shape.
- **Inbox and Settings are app-nav surfaces, not left-rail modules.** They live
  in the blue app rail: Inbox via `AppConfig.collectiveInbox`, Settings via the
  app-rail footer gear (`AppConfig.settings`). Do **not** put them in the recipe
  `modules` array. (They remain in the `ModuleType` union for the renderer, but
  products surface them through the shell chrome.)

---

## 1. entity — things you browse + edit

**When:** a set of records with no stage board (Vehicles, Companies, Contacts, Assets, Bins).
**Form:** declarative JSON (`kind: "entity"`).
**Default views:** `list` · `grouped-list` · `map` · `hybrid`.
**Composes:** DataTable, ListRow, EntityDetail (+ Overview tab), AssetMarker (if geo).

```jsonc
// vehicles.module.json
{
  "$schema": "../../schemas/EntityModuleConfig.schema.json",
  "kind": "entity",
  "code": "fleet/vehicles",
  "name": "Vehicles",
  "uidPrefix": "V",
  "systemcolumns": [
    { "col": "title",      "name": "Plate",    "type": "SmallText", "required": true },
    { "col": "systemcol1", "name": "Type",     "type": "SingleSelect", "listValues": ["Truck", "Van", "Pickup", "Forklift"] },
    { "col": "systemcol2", "name": "Depot",    "type": "SingleSelect" },
    { "col": "systemcol3", "name": "Odometer", "type": "Number" },
    { "col": "systemcol4", "name": "Driver",   "type": "SmallText" },
    { "col": "status",     "name": "Status",   "type": "SingleSelect", "listValues": ["Active", "In Shop", "Retired"] }
  ],
  "listcolumns": [
    { "col": "uniqueidentifier", "component": { "name": "TextView" } },
    { "col": "title",  "component": { "name": "TextView", "props": { "handleOverflow": true } } },
    { "col": "systemcol1", "component": { "name": "TextView" } },
    { "col": "status", "component": { "name": "StatusList" } }
  ],
  "uiConfig": {
    "profile": {
      "title": { "col": "title", "pos": "left" },
      "details": [
        { "col": "uniqueidentifier", "pos": "left",  "order": 1, "name": "Vehicle ID", "component": { "name": "LinkView" } },
        { "col": "status",           "pos": "right", "order": 1, "component": { "name": "StatusList", "props": { "editable": true } } }
      ],
      "rightPanel": { "type": "tab", "tabs": [
        { "key": "activity", "title": "Activity", "order": 1, "component": { "name": "ActivityFeed" } },
        { "key": "linked",   "title": "Linked",   "order": 2, "component": { "name": "LinkedItems" } }
      ] }
    },
    "search": { "columns": ["title", "uniqueidentifier"] }
  }
}
```

**Copy from:** [`recipes/crm/companies.module.json`](../recipes/crm/companies.module.json) ·
proven live in `Code/fleet-ops/src/recipe/vehicles.module.ts`.
**Geo/profile fidelity:** an entity can opt into the **Overview tab** + identity
panel (Phase 1c) and **AssetMarker** map pins — see the live-monitoring entry below.

---

## 2. pipeline — staged work on a board

**When:** records with a lifecycle (Deals, Work Orders, Incidents, Manifests, Tickets).
**Form:** declarative JSON (`kind: "pipeline"`) + a `*.rules.json` for RBAC + allowed transitions.
**Default views:** `kanban` · `list` · `calendar`.
**Composes:** KanbanBoard + KanbanCard, DataTable (list), TaskDetail (timeline/activity/linked/files).

Same `EntityConfig` shape as `entity`, **plus** `uiConfig.statusList` (the stages)
and a `uiConfig.kanbanCard` (field→slot placement). The field's *type* picks the
cell renderer (status→pill, priority→flag, Currency→money, Reference→avatar).

```jsonc
// the bits that make an entity a pipeline:
"uiConfig": {
  "statusList": [
    { "key": "lead",      "label": "Lead",      "color": "#94a3b8" },
    { "key": "qualified", "label": "Qualified", "color": "#0072d6" },
    { "key": "proposal",  "label": "Proposal",  "color": "#f79009" },
    { "key": "won",       "label": "Won",       "color": "#16a34a" },
    { "key": "lost",      "label": "Lost",      "color": "#f04438" }
  ],
  "kanbanCard": {
    "header": [
      { "col": "systemcol2", "pos": "left",  "order": 1, "component": { "name": "PriorityFlag" } },
      { "col": "uniqueidentifier", "pos": "right", "order": 1 },
      { "col": "title", "pos": "left", "order": 3 }
    ],
    "body":   [ { "col": "status", "pos": "left", "order": 2, "component": { "name": "StageProgress" } } ],
    "footer": [ { "col": "systemcol6", "pos": "left", "order": 1, "component": { "name": "AssigneeList", "props": { "avatarOnly": true } } } ]
  }
}
```

**Copy from:** [`recipes/crm/deals.module.json`](../recipes/crm/deals.module.json) +
[`deals.rules.json`](../recipes/crm/deals.rules.json) — the golden pipeline.
Rule-enforced moves + RBAC are wired by `createAppRuntime`; a `SalesManager` can
close a deal, a rep can't.

---

## 3. live-monitoring — real-time assets on a map

**When:** vehicles / plant / sites moving in real time, with a fleet list + on-map telemetry popups.
**Form:** config TSX `ModuleConfig` carrying `MonitoringModuleData`.
**Default view:** `map` (left fleet list + Leaflet map + popup that anchors **over** the selected marker).
**Composes:** LeafletMap, **AssetMarker** (state-colored pin + dynamic asset glyph), the telemetry popup, EntityDetail (drill-in).

```tsx
import type { ModuleConfig, MonitoringEntity } from '@ds/components/app-shell';
import { MarkerPin01 } from '@ds/icons';

const entities: MonitoringEntity[] = TRACKED.map((t) => ({
  id: t.plate,
  position: t.position,              // [lat, lng]
  status: t.status,                  // 'reporting' | 'warning' | 'stopped' (MarkerStatus)
  statusLabel: t.statusLabel,
  assetType: 'car',                  // ← AssetMarker glyph: 'car' | 'workforce' | 'bin' …
  live: t.status === 'reporting',    // pulsing ring
  heading: t.heading,                // 0–360 direction tick
  title: t.plate,
  subtitle: `${t.driver} · ${t.depot}`,
  metric: `${t.speed} km/h`,
  metricSub: t.lastSeen,
  telemetry: [                       // ← the on-map popup Overview grid
    { label: 'Driver', value: t.driver },
    { label: 'Speed',  value: `${t.speed} km/h` },
    { label: 'Activity', value: t.activity },
  ],
  toDetail: () => vehicleDetail(t.plate),  // drill into the standard EntityDetail
}));

export const monitoringModule: ModuleConfig = {
  id: 'monitoring', type: 'live-monitoring', label: 'Live Monitoring', icon: MarkerPin01,
  data: {
    center: [25.2048, 55.2708], zoom: 12, listTitle: 'Fleet',
    liveBadge: { label: `${reporting} vehicles reporting` },
    legend: [
      { label: 'Moving',  color: '#12B76A', count: reporting },
      { label: 'Idle',    color: '#F79009', count: warning },
      { label: 'Stopped', color: '#D92D20', count: stopped },
    ],
    entities,
  },
};
```

**Copy from:** `Code/fleet-ops/src/recipe/monitoring.tsx` (the proof) · shape
reference `src/showcase/apps/ead-rms.config.tsx`. **Always set `assetType`** — that's
what upgrades a plain dot to the DS V2 AssetMarker (Phase 1a fidelity).

---

## 4. dashboard — KPIs + charts

**When:** a summarizing surface over other modules' data (no own entity).
**Form:** config TSX, `tabKind: 'instance'`, each tab `render()`s a `<Dashboard>`.
**Composes:** Dashboard (KPI row + section grid), BarChart / DonutChart / LineChart, **DashboardWidgetGrid** (declarative gauge · compareBars · map widgets — Phase 1b).

```tsx
import { Dashboard, DashboardWidgetGrid } from '@ds/components/app-shell';
import { BarChart, DonutChart } from '@ds/components/data-viz';

export const dashboardModule: ModuleConfig = {
  id: 'dashboard', type: 'dashboard', label: 'Dashboard', icon: Activity,
  tabKind: 'instance',
  tabs: [{
    id: 'fleet-overview', label: 'Fleet Overview',
    render: () => (
      <Dashboard
        dateLabel="01 Jun – 15 Jun, 2026"
        ranges={['Last 7 Days', 'Last 30 Days', 'This Month', 'All Time']}
        kpis={[
          { id: 'total',  label: 'Total Vehicles', value: String(VEHICLES.length), icon: <Truck01 size={20} />, trend: 'neutral', trendValue: 'Fleet register' },
          { id: 'active', label: 'Active on Road',  value: String(active), icon: <Activity size={20} />, iconBg: 'var(--chart-accent-green)', iconColor: '#fff', trend: 'up', trendValue: '+2 vs last week' },
        ]}
        sections={[
          { id: 'by-stage', title: 'Work Orders by Stage', span: 7,
            children: <BarChart data={byStage} xKey="stage" series={[{ dataKey: 'count', name: 'Work Orders', color: 'var(--primary)' }]} height={260} /> },
          { id: 'by-type', title: 'Fleet by Type', span: 5,
            children: <DonutChart data={byType} height={260} /> },
        ]}
      >
        {/* declarative widgets — no bespoke JSX per widget */}
        <DashboardWidgetGrid widgets={[
          { kind: 'gauge', title: 'Fleet Compliance', span: 4, value: 92 },
          { kind: 'compareBars', span: 8, title: 'Planned vs Actual',
            bars: [
              { label: 'Planned Hours', value: 1800, valueLabel: '1800 h', color: 'primary' },
              { label: 'Actual Hours',  value: 1645, valueLabel: '1645 h', color: 'success' },
            ] },
        ]} />
      </Dashboard>
    ),
  }],
};
```

**Copy from:** `Code/fleet-ops/src/recipe/dashboard.tsx` (the proof) ·
`src/showcase/apps/*.config.tsx` (6 dashboards). Derive KPIs from the **same data
arrays** the other modules use so the numbers always agree.

---

## 5. reports — Reports Home (catalog) + Report Runner

**When:** named report instances — tables, KPI grids, charts, export.
**Form:** config TSX, `tabKind: 'instance'`, each tab `render()`s a report (usually a
`<Dashboard>` or a `<DataTable>`). The module **opens on a Reports Home catalog**
(a card per report); opening one adds it as a **top-nav tab** (like an opened
record) and activates it. The **🏠 Home tab** returns to the catalog; report tabs
are closeable and accumulate as you open more. All built into the shell — give
each tab card metadata (`description`, `icon`, `category`) and it just works.
**Composes:** `ReportsHome` (catalog) + `ReportsTopNav` (the Home + opened-report
tab strip); Dashboard / DataTable / data-viz charts (the report body).

```tsx
export const reportsModule: ModuleConfig = {
  id: 'reports', type: 'reports', label: 'Reports', icon: BarChart3,
  tabKind: 'instance',
  tabs: [
    { id: 'sla', label: 'SLA Performance', icon: Speedometer03, category: 'Operations',
      description: 'Attainment trend and open breaches against the SLA.',
      render: () => <SlaPerformanceReport /> },
    { id: 'cost', label: 'Lifecycle Costs', icon: CurrencyDollar, category: 'Finance',
      description: 'Maintenance spend by asset category, QTD.',
      render: () => <CostReport /> },
  ],
};
```

**Copy from:** `Code/facilities-ops/src/recipe/reports.tsx` (Home catalog + 3
reports, the proof) · `src/showcase/apps/{ducon,ead-rms,workshop}.config.tsx` for
report-content shapes (`LifecycleCostReport`, `ComplianceTrendReport`).

---

## 6. calendar — events on a month grid

**When:** scheduled events (bookings, training, activities, due dates).
**Form:** config TSX `ModuleConfig` carrying `CalendarModuleData`.
**Composes:** the built-in month-grid CalendarView.

```tsx
const salesCalendar: CalendarModuleData = {
  monthLabel: 'February 2026',
  startWeekday: 0,          // 0 = Sun … 6 = Sat
  daysInMonth: 28,
  today: 17,
  events: ACTIVITIES.map((a) => ({ day: dayOf(a.due), label: a.title, color: ACTIVITY_COLORS[a.kind] })),
};

// module: { id: 'calendar', type: 'calendar', label: 'Calendar', data: salesCalendar }
```

**Copy from:** `src/showcase/apps/sales.config.tsx` (`salesCalendar`).

---

## 7. forms — a full-page data-entry form

**When:** a structured form that writes a record (log a reading, file a request, register an asset).
**Form:** config TSX `ModuleConfig` carrying `FormsModuleData` (a `FormSchema` + `onSubmit`).
**Composes:** the built-in SchemaForm + success state.

```tsx
const logReadingForm: FormsModuleData = {
  title: 'Log manual reading',
  description: 'Field technicians record readings when a unit is offline.',
  schema: {
    title: 'Manual Reading', submitLabel: 'Save reading',
    fields: [
      { key: 'generator', label: 'Generator', type: 'select', required: true, options: GENERATORS.map((g) => ({ label: g.name, value: g.id })) },
      { key: 'hours', label: 'Run hours', type: 'number', required: true },
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Condition, leaks…', span: 2 },
    ],
  },
  onSubmit: (v, actions) => { /* mutate the target entity's rows, then */ actions.refresh(); },
  successTitle: 'Reading saved',
  successHint: 'The record has been updated with your reading.',
};

// module: { id: 'log-reading', type: 'forms', label: 'Log Reading', icon: ClipboardIcon, data: logReadingForm }
```

**Copy from:** `src/showcase/apps/generator.config.tsx` (`logReadingForm`).

---

## 8. inbox — the cross-app notification surface (app-nav, not a module)

**When:** notifications across **every** app. Inbox is *built different* — it is a
single cross-app surface opened from the blue app-rail Inbox icon, with **no view
tabs**. Do not add it to the `modules` array.
**Form:** `AppConfig.collectiveInbox.data: InboxModuleData` — supply data only; the
DS renders the whole surface.
**Composes (built-in `InboxView`):** header (title · search · filter · Clear All) ·
filter tabs with counts (**Unread · All · Reminders · Assigned to me · @Mentions ·
Critical**) · date grouping · rich rows (leading bell/activity/avatar icon, title,
description, `#source` chip, severity flag, due chip, module chip, timestamp,
unread dot, hover Clear) · empty state.

```tsx
// Wire on the AppConfig (App.tsx), NOT in the modules array:
collectiveInbox: {
  notificationDot: true,
  data: {
    notifications: [
      { id: 'n1', kind: 'alert', unread: true, dateGroup: 'Today', timestamp: '8:45 AM',
        title: 'Approval needed: Chiller overhaul',
        description: 'AST-02 overhaul requires your approval before dispatch.',
        sourceTag: 'FM-204', module: 'CCMS', priority: 'Critical', dueLabel: 'Today',
        categories: ['assigned', 'critical'] },
      { id: 'n5', kind: 'mention', unread: true, dateGroup: 'Yesterday', timestamp: '12:01 AM',
        avatarFallback: 'AK', title: 'Ahmed K. mentioned you in Work Orders',
        description: '@you please review WO-310.', sourceTag: 'FM-204', module: 'IIMS',
        categories: ['mention'] },
      // kind: 'system' rows show the activity glyph; omit `unread` for read (greyed) rows.
    ],
  },
}
```

`InboxNotification` fields: `kind` (`alert`·`system`·`mention`) · `unread` ·
`dateGroup` · `timestamp` · `sourceTag` (`#` chip) · `module` (+ `moduleIcon`) ·
`priority` (`Critical`/`Minor` flag) · `dueLabel` (orange clock) · `categories`
(drive the Reminders/Assigned/@Mentions/Critical tabs).
**Copy from:** `Code/facilities-ops/src/recipe/inbox.tsx` (the proof). Figma:
FAMS Web Portal inbox frames.

---

## 9. settings — admin configuration (app-nav footer, not a module)

**When:** tenant/admin config — thresholds, toggles, dangerous actions. Settings
opens from the blue app-rail **footer gear**, not the module rail. Do not add it
to the `modules` array.
**Form:** `AppConfig.settings = { title, sections }` (the dedicated `SettingsNav`
that replaces the module rail), driven by `SettingsModuleData`-shaped sections.
**Composes:** the settings sections renderer; item kinds `field` · `toggle` · `action`.

> Settings UI is spec-pending — only build it once settings frames are provided.

```tsx
const genSettings: SettingsModuleData = {
  sections: [
    {
      id: 'thresholds', title: 'Alert thresholds', description: 'When alarms fire across the fleet.',
      items: [
        { kind: 'field',  label: 'Low fuel alarm', value: '< 20%' },
        { kind: 'toggle', label: 'Over-temperature auto-shutdown', description: 'Stop the engine when coolant exceeds limits.', defaultOn: true },
      ],
    },
    {
      id: 'danger', title: 'Danger zone',
      items: [
        { kind: 'action', label: 'Reset telematics gateways', description: 'Re-provisions every device. ~2 min downtime.', actionLabel: 'Reset all', destructive: true },
      ],
    },
  ],
};

// module: { id: 'settings', type: 'settings', label: 'Settings', icon: Settings01, data: genSettings }
```

**Copy from:** `src/showcase/apps/generator.config.tsx` (`genSettings`). For the
full-screen Settings nav (Figma DS V2), set `AppConfig.settings = { title, sections }`.

---

<a id="proof"></a>
## The end-to-end proof: `Code/fleet-ops`

One product that exercises **entity + pipeline (JSON) + live-monitoring + dashboard
(TSX)** together, consuming the DS read-only on FAMS-blue dummy data:

```
src/recipe/
  recipe.ts             ← RecipeBundle: vehicles (entity) + maintenance (pipeline), wired to the sim
  vehicles.module.ts    ← entity config
  maintenance.module.ts ← pipeline config
  maintenance.rules.ts  ← RBAC + stage transitions
  monitoring.tsx        ← live-monitoring ModuleConfig (AssetMarker pins + telemetry popups)
  dashboard.tsx         ← dashboard ModuleConfig (KPIs + charts + DashboardWidgetGrid)
  data.ts               ← shared dummy data (all modules read the same arrays)
App.tsx                 ← createAppRuntime(recipe) + adds the config modules → <AppShell>
```

This is the layout `/new-product` should produce. **Data modules → `RecipeBundle`;
config modules → direct `ModuleConfig`s in `App.tsx`.** Reference the showcase for
UI shape; never import its config or `sample-data.ts`.

---

## Coherence reminders (don't break)

1. **Token-only** — no hex in components; the per-stage `color` in a `statusList`
   and the legend hex in live-monitoring are *data*, not component styling.
2. **One shell** — render `AppShell`; never hand-roll a board / detail / drawer.
3. **Fixed menu** — a capability that doesn't fit the 9 types is a signal to add a
   *registered renderer to the kit*, not a one-off screen in a product.
4. **FAMS default brand** — no `brand.theme`, no custom logo, unless explicitly asked.
