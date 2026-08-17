# FAMS Blocks — the module library (pick → adapt → compose)

> **What this is.** Every FAMS module type, pre-built as a **reusable block** you copy and adapt
> to a use case — so an app is *composed* from existing blocks, never built from scratch.
>
> **What an app is.** An app (e.g. **IIMS** — Incident & Inspections Monitoring System, **CCMS** —
> Contract & Compliance Monitoring System) is a **recipe** that picks the blocks it needs, adapts
> each (rename · fields · statuses · dummy data), and wires them into one AppShell. A **solution**
> (e.g. **IWMP** — Integrated Waste Management Platform for Smart Cities) bundles several apps.
>
> ```
> FAMS (design system)
>   blocks/        ← you are here — the reusable module library
>   schemas/       ← the contract each block validates against
>   recipes/       ← composed apps (crm/ exists; iims/, ccms/ … added on request)
> ```

## The block library (the fixed module-type menu)

| Block | Type | Form | Use it for | Status |
|---|---|---|---|---|
| [entity](entity/entity.block.md) | `entity` | JSON config + seed | any **register** (inspections, contracts, assets, drivers, zones) | ✅ built |
| [pipeline](pipeline/pipeline.block.md) | `pipeline` | JSON config + rules + seed | any **workflow** with stages (incidents, deals, work orders, approvals) | ✅ built |
| [dashboard](dashboard/dashboard.block.md) | `dashboard` | TSX `ModuleConfig` | **monitoring** — KPI strip + chart grid + widgets | ✅ built |
| [reports](reports/reports.block.md) | `reports` | TSX `ModuleConfig` | tabbed **report tables** (RAG, subscribe/schedule) | ✅ built |
| [live-monitoring](live-monitoring/live-monitoring.block.md) | `live-monitoring` | TSX `ModuleConfig` | **map** + live status (clustering, facets, zones, POIs) | ✅ built |
| [calendar](calendar/calendar.block.md) | `calendar` | TSX `ModuleConfig` | scheduled items on a month calendar | ✅ built |
| [forms](forms/forms.block.md) | `forms` | TSX `ModuleConfig` | standalone **form** surface | ✅ built |
| [inbox](inbox/inbox.block.md) | app-nav surface | TSX (`collectiveInbox`) | one cross-app **notification** surface | ✅ built |
| [settings](settings/settings.block.md) | app-nav surface | TSX (`settings`) | tenant/app **configuration** | ✅ built |
| [shifts](shifts/shifts.block.md) | composite¹ | TSX `ModuleConfig` + DS `ShiftPlanner`/`WorkforceCompliance` | **workforce scheduling** — Planning grid (conflicts/recurrence) + Compliance Monitoring | ✅ built |
| [interactive-planning](interactive-planning/interactive-planning.block.md) | composite¹ | TSX `ModuleConfig` + DS `InteractivePlanning` | **Smart-City service planning** — plan table + coverage map + Create-Plan wizard + Planning Mode | ✅ built (3 core screens) |
| [plan-monitoring](plan-monitoring/plan-monitoring.block.md) | composite¹ | TSX `ModuleConfig` + DS `PlanMonitoring`/`PlanMonitoringDetail` | **scheduled-plan monitor** — KPI list + full-screen analytics detail + edit sheets | ✅ built |
| [events](events/events.block.md) | composite¹ | TSX `ModuleConfig` + DS `EventsView`/`EventDetailSheet` | **entity events** — hybrid list+map, expand-to-highlight, detail side sheet + timeline | ✅ built |
| [zones](zones/zones.block.md) | composite¹ | TSX `ModuleConfig` + DS `ZonesView` | **zone hierarchy** — tree list + map polygons (Create Zone / KML next) | 🚧 hybrid view built |

> ¹ **shifts** is not a 10th canonical type — it's a reusable *composite* block rendered through the
> `dashboard` instance-tab mechanism (`type:'dashboard'`, `tabKind:'instance'`), backed by the DS
> `ShiftPlanner` component. Same pattern the IIMS "Inspector Shifts" module uses. Adapt it to any
> workforce (inspectors · drivers · technicians · guards) by props — see its md.

> **Why two forms?** Data-bound modules (`entity`, `pipeline`) plug into a recipe as **JSON** and run
> on the sim engine (RBAC + rule-enforced moves) — exactly like `recipes/crm/`. View modules
> (`dashboard`, `reports`, `live-monitoring`, `calendar`, `forms`) and the app-nav surfaces
> (`inbox`, `settings`) are **React `ModuleConfig`s** spliced into the app (config-driven composition,
> no bespoke screens) — exactly like the facilities-ops product. The running app is always React.

## How to compose an app (the loop)

1. **Pick** the blocks the app needs (e.g. IIMS = pipeline ×1 *(Incidents)* + entity ×1 *(Inspections)*
   + dashboard + reports + inbox + settings).
2. **Copy** each block into the app folder (`recipes/<app>/` for JSON blocks; the app's `src/recipe/`
   for TSX blocks).
3. **Adapt** to the use case — rename, set fields/statuses, swap dummy data. Keep the structure.
4. **Compose** — list the JSON modules in `<app>.recipe.json` (+ seeds + rules); splice the TSX
   modules into `App.tsx`. Brand = FAMS default unless told otherwise.
5. **Verify** — schemas valid · token-only · `pnpm typecheck` · every module resolves a renderer + a
   data source. (Golden wiring reference: `D:\Claude Projects\Code\facilities-ops`.)

## Adapting, by example
- **IIMS · Incidents** ← `pipeline` block: stages `reported → triaged → in-progress → resolved`,
  add severity/location fields, point the right-panel timeline at the activity feed.
- **IIMS · Inspections** ← `entity` block: fields checklist-ref, inspector, date, result; statuses
  `Scheduled / Passed / Failed`.
- **CCMS · Contracts** ← `entity` block: fields vendor, value, start/end, owner; statuses
  `Active / Expiring / Expired`.
- **CCMS · Compliance** ← `pipeline` (review workflow) or `dashboard` (compliance KPIs) — pick by frame.

Each block's `.md` documents its anatomy, fields, and exactly which knobs to turn when adapting.
