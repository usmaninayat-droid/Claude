# plan-monitoring — scheduled-plan monitor block

> **What it is.** Plans configured in **Interactive Planning** flow into **Plan Monitoring** and are
> **scheduled daily** for the selected period. This is the monitoring surface. Backed by the DS
> `PlanMonitoring` component. Built from Figma `AKU5PLaqjO1QBakY9pUAH1` (node `49-33236`); full spec in
> kb `02-frames-pipelines/10-plan-monitoring.md`.

## Anatomy (Home — List View) — ✅ built
- **Top-nav**: `List View` | `+`. Toolbar: search + filter + **Group By**.
- **KPI strip** (4 tinted-circle cards): Total Number of Plans · Completed Plans · On Going Plans ·
  Scheduled Plans (auto-derived from row statuses, or pass `kpis`).
- **Table**: ID · Service Type (violet pill) · Waste Type (glyph) · Title · Vehicle (truck + plate) ·
  Driver (avatar + name) · Shift (Morning/Night/Afternoon glyph) · Service Locations (1–2 pin chips) ·
  Planned Time (START/END) · Status (SCHEDULED amber / ONGOING blue / COMPLETED green) · Progress of Plan
  (bar + done/total) · Compliance (mini-donut %). Row click → `onOpen(row)` (full-screen detail).

## Adapt (props on `PlanMonitoring`)
1. `rows: PlanMonitorRow[]` — id · serviceType · wasteType · title · vehicle · driver(+driverColor) ·
   shift · locations[] · startAt · endAt · status · progressDone · progressTotal · compliancePct?.
2. `kpis?` — override the 4 KPI cards (`{ label, value, icon, tone }`); omit → derived from statuses.
3. `statusStyles` / `wasteStyles` / `shiftStyles` — per-value pill/glyph styling.
4. `onOpen(row)` — open the detail; `onEditColumns` — column editor.

Brand = FAMS blue chrome; SCHEDULED/ONGOING/COMPLETED + compliance ring are genuine status.

## Compose
`type:'dashboard'`, `tabKind:'instance'` — carries a `List View` tab. Splice `planMonitoringBlock` into the
app; point `rows` at the daily-scheduled plan instances (produced from Interactive Planning plans × period).

## Plan Overview — ✅ built (`PlanOverview`)
A recurring plan repeats **daily over a long period** (months → years), so the flow is
**list → Plan Overview → per-day detail**. `PlanOverview` rolls every daily instance up: an Avg-Compliance
gauge + KPI band (Total Days · Completed · Ongoing · Scheduled · Missed Collections), a **Compliance-Over-
Time** trend, a **Needs Attention** list (worst days → jump straight to that day), a **Daily Instances
heatmap calendar** (each day colored by compliance/status → click → per-day detail), and a **Service Points
(POI) summary** (coverage + avg compliance per location). Config-driven `data: PlanOverviewData`;
`onOpenDay(dateISO)` → the per-day `PlanMonitoringDetail`.

### Domain model (generalized — bins ↔ POIs ↔ people)
A **Plan** assigns **workforce** (driver + helpers → generically *assignees*) to service **Service Points /
POIs** (bins are one kind; also gullies, hydrants, sites, stops) grouped into **Zones**, on a **recurring
schedule**. Monitoring tracks each **daily instance**: which points were serviced on-plan/off-plan/missed,
by whom, at what compliance. So `bins` = service points, `driver`/`helpers` = the assignees, and the plan is
the relation binding points ↔ people over time.

## Full-screen detail — ✅ built (`PlanMonitoringDetail`)
NOT a side sheet (`49-42454` / dec `1737-2629`). Full-page scroll: top bar (id · title · contractor ·
location chips · status) → **header KPI band** (Overall Compliance gauge + compactor/driver/helpers/
depot/discharge + service type/distance/waste/shift/PTO/fuel/avg-time/idle/revenue) → **Plan Log**
(tabbed timeline) + route-replay **map** (collection-stats header + planned/actual routes + depot/discharge
markers + play) → **per-service-location cards** (compliance gauge + window/distance/revenue/bins/waste/PTO
+ CBM bar + Contact Person) → **analytics** (Compliance Break Down bars · Event Type Breakdown stacked bar ·
Outside Plan donut · Weight Collection Trend area · Gross vs Received bars · Bin Collection Trend line).
Config-driven via a `data` prop (frame-matching defaults). Open from the list via `PlanMonitoring.onOpen`.

## Edit side sheets — ✅ built (`ChangeResourceSheet`)
Reusable right side-sheet to re-assign a resource on a scheduled plan (Nov release `3624-*`/`3633-*`).
Searchable single-select radio list (avatar/icon + label + meta + status chip), Cancel / Confirm (disabled
until changed). One component drives **change vehicle · change driver · add/change helper · change discharge
station**. Wired into `PlanMonitoringDetail`: hover a KPI-band cell → edit pencil → sheet → Confirm updates
the field AND prepends a "{Field} Changed" event to the Plan Log. Disabled options (Maintenance / On Leave)
are non-selectable. Config-driven `options: ResourceOption[]`.

## Empty states — ✅ built (`EmptyState`, in data-display)
Reusable placeholder (IWMP-CCMS `3590-*`): centered token-driven illustration + title + description +
optional action. Variants `no-data` / `no-results` / `no-map` (or a custom illustration). Wired into the
monitor table (no-results on search, no-data when empty); drop it into any chart card / table / map pane.

## Follow-ons
- **Route-replay playback** (live marker animation) — map shows static planned/actual routes + a play
  button; scrubbed replay is the next depth pass (same as kb 09 Planning-Mode replay).
- **Type Commercial / Municipal** detail variants (mostly data differences).
