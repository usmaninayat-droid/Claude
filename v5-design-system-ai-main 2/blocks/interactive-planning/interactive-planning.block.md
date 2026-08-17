# interactive-planning — Smart-City service-planning block

> **What it is.** A **service-planning** surface for Smart Cities (Tadweer "Interactive Planning"):
> plan services across zones, assign vehicles, and see coverage on a live map. Backed by the DS
> `InteractivePlanning` component — no bespoke screen. Built from Figma `AKU5PLaqjO1QBakY9pUAH1`
> (node `105-15028` + siblings); full spec in kb `02-frames-pipelines/09-interactive-planning.md`.

## Anatomy (Home — Hybrid View) — ✅ built
- **Top-nav tabs** — `Interactive Planning` | `Hybrid View` | `+` (rendered by the module instance-tabs).
- **Left plan table** (~590px): search + filter + **+ Create New Plan** (primary). Columns: eye
  (map-visibility toggle — active = primary) · Service Type (violet pill + bin glyph) · Waste Type
  (icon + General/Recyclable/Non Recyclable) · Vehicle (compactor glyph + plate) · Status pill
  (DRAFTED = neutral, APPROVED = success). Collapse handle between panes.
- **Right map** (DS `LeafletMap`): zone polygons + planned (green) / unplanned (red) bins, a legend with
  per-layer checkboxes.

## Adapt (props on `InteractivePlanning`)
1. `plans: PlanRow[]` — `{ id, serviceType, wasteType, vehicle, status, visible? }`.
2. `zones: PlanZone[]` — `{ id, name?, points: [lat,lng][], color? }` (coverage polygons).
3. `bins: PlanBin[]` — `{ id, position, planned }` (map dots; green planned / red unplanned).
4. `statusStyles` — per-status pill style `{ tone, filled? }` (default DRAFTED neutral / APPROVED success).
5. `wasteStyles` — per-waste-type `{ icon, color }` (defaults: General=amber, Recyclable=green, Non=neutral).
6. `labels`, `center`, `zoom`. Callbacks: `onCreatePlan`, `onToggleVisible`, `onEditColumns`.

Brand = FAMS blue chrome (Figma's Tadweer green → `--primary`); green/amber/red only for genuine status.

## Compose
`type:'dashboard'`, `tabKind:'instance'` — the module carries `Interactive Planning` + `Hybrid View`
tabs. Splice `interactivePlanningBlock` into the app's modules like any view block. Point the data at
the app's plans/zones/bins.

## Create New Plan wizard — ✅ built (`CreatePlanWizard`)
Opens in the right pane (list stays left) with a floating close-X and a 3-step rail:
- **Step 1 Basic Setup** — Title (FloatingLabelInput) · Service Type · Select Time Frame (DateRangePicker)
  · Clone Plan. **Save and Continue**.
- **Step 2 Interactive Mapping** — a **Smart Insights** callout + a Plan Details KPI grid (Overall
  Suitability ring, Shift, Waste Type, Driver, Frequency, Total Bins, Compactor, Helpers, Total Time,
  distances) beside a routed coverage-map preview (purple route + count clusters + CBM legend). Back / Save.
- **Step 3 Summary** — Basic Details + the same Plan Details block. **Create Plan** → `onPlanCreated(draft)`.
Config-driven: `serviceTypes`, `cloneOptions`, `details` (Smart Insight + KPIs) and `mapPreview` are
props with frame-matching defaults. Wired via `InteractivePlanning`'s `createWizard` (default true).

## Planning Mode — ✅ built (`PlanningMode`)
Full-screen interactive-mapping sub-mode (`105-9350`), opened from the wizard's Interactive Mapping step
("Open interactive map"). Left rail: **Planning Mode** + red close-X + list toggle; accordion **Service
Schedule · Service Coverage · Resource Allocation · Route & Stops** (Route & Stops expanded → Start Depot ·
**Collection Zone 1** card (Est. Waste) · Discharge Station) + **Optimize Route**. Map: draw toolbar
(auto/circle/polygon/rectangle — active = primary), Selected/Planned/Unplanned legend checkboxes, a drawn
selection zone, clustered bins, and an eye-off toggle. Config-driven (bins/selectionZone/depot/discharge).

## Calendar View — ✅ built (`SmartPlanningCalendar`)
Feb release renames the module **Smart Planning** with a 4-view picker (Hybrid · Map Only · Dispatch
Cockpit · Calendar). The **Calendar View** (`104-353`) is a recurring plan-schedule grid: plans (rows) ×
7 day columns; each cell = that plan's scheduled window for the day (time + vehicle + assignee),
shift-colored (morning ☀ / afternoon / night 🌙), with **conflict** + **missing-assignment** highlighting,
a Highlight-Conflicts toggle + legend (counts), a week navigator and **Configure New Plan**. Visualizes how
a plan repeats day-over-day. Config-driven: `plans: SmartPlanRow[]`, `weekDays`, `weekLabel`, callbacks.

## Follow-ons
- **Dispatch Cockpit** and **Map Only** view modes (from the Feb view picker) + the "Select Preferred
  View" picker screen.
- **Live shape-drawing** (leaflet-draw) in Planning Mode; Optimize Route already draws a route.
