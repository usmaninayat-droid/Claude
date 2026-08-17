# Smart Routing — Module Architecture Spec (v0.1, planning)

> **One advanced module, many use-cases.** Smart Routing is the decide-side sibling of
> Trip Management (the execute side): it plans, simulates, prices, and releases —
> Trip Management dispatches, monitors, and completes. This spec maps the entire
> capability onto FAMS V5: which module types, which existing components, what the one
> new primitive is, and how use-cases stay config.
>
> Decision record: [`adr/006-planner-module-type.md`](adr/006-planner-module-type.md).
> Research base: `knowledge-base/smart-routing/` (workspace root) — feature catalog,
> verticals, workforce-coupling whitespace, GCC rule packs, wow list.
> Reference implementations: `Code/fams-route-optimization` (engine seam, cost, tests) ·
> `Code/route-optimization` (rich planner/monitoring/sites UI — feature donor).

---

## 1. The shape: one rail entry, five surfaces

Smart Routing is **one left-nav module** (rail label: `Smart Routing`; descriptor line
in decks/tenders: *"Route Optimization & Cost Simulation"*) whose top-nav tabs are its
surfaces. Per the platform model it is a **domain area**: one new engine type + existing
types composed behind a single nav item.

```
Smart Routing  (one module-rail entry)
├── Planner        planner type      demand + fleet → solve → interactive plan (map + Gantt)
├── Scenarios      planner type      clone/tweak/diff — the Scenario Workbench   ← the wow
├── Cost           dashboard type    contract-aware cost sim, slab-waste, CO2e, cost/seat
├── Monitoring     (link-out)        released plans live in Trip Management (pipeline + live-monitoring)
└── Network        entity type       stops · sites · camps · depots · vendors · contracts  (map + list)
```

**The connection moment** (the demo): `Release plan` in the Planner spawns trip records
into the existing Trip Management pipeline with `SingleReference` links back to the plan
→ live-monitoring executes them → actuals flow back into the plan's
planned-vs-actual and the learned-reality layer. Plan → Dispatch → Monitor → Learn.

## 2. Type mapping (what's new, what's reused)

| Capability | V5 type | New? |
|---|---|---|
| Planner + what-if + Scenarios | **`planner`** | ⚠️ the ONLY new registered type (ADR-006) |
| Cost & analytics surface | `dashboard` | no — declarative widgets |
| Stops/sites/camps/depots, vehicles, vendors, contracts, demand | `entity` (+ `pois`/`zones` where geo-first) | no |
| Trip lifecycle (Planned → Dispatched → En route → Done) | `pipeline` (existing Trip Management) | no |
| Live tracking / replay | `live-monitoring` (existing Trip Management) | no |
| Plan-vs-actual reports | `reports` | no |
| Ad-hoc trip request | `forms` (FormSheet) | no |
| Solver | **`RoutingProvider` runtime service** — not a module | ⚠️ new runtime seam (ported, tested) |

## 3. Reuse map — components that already exist in the kit

The planner chassis is mostly **composition of shipped components**:

| Existing component (`src/components/…`) | Role in Smart Routing |
|---|---|
| `planning/CreatePlanWizard` (332) | New-plan flow: scope → demand → fleet → constraints → preview KPIs (`PlanKpi`, `PlanMapPreview` already typed) |
| `planning/InteractivePlanning` (272) | The interactive plan surface base (`PlanRow`, `PlanZone`, `PlanBin` generalize to stops/routes) |
| `planning/PlanningMode` (235) | Solve-mode frame (edit → re-solve loop) |
| `planning/PlanOverview` (213) | Plan summary: days, points, day-status — becomes plan header/overview |
| `planning/SmartPlanningCalendar` (169) | Multi-day/shift plan grid (`PlanShift` — login/logout waves) |
| `planning/PlanMonitoring` + `PlanMonitoringDetail` (580) | Released-plan monitoring + per-stop drill (`PlanLogEvent`, `ServiceLocationDetail`) |
| `planning/ChangeResourceSheet` (122) | Swap vehicle/driver on a route — reuse verbatim |
| `scheduling/ShiftPlanner` (955) | **The workforce coupling**: roster context beside the plan; shift anchors drive arrive-by/depart-at |
| `scheduling/TimesheetGrid`, `WorkforceCompliance` | Driver-hours & compliance surfaces (GCC rule packs render here) |
| `map/LeafletMap` | Routes (polylines **with road-geometry fetch already built in**), zones, heat, `project()` |
| `map/AssetMarker`, `POI` vectors | Stop/vehicle/camp pins with state color + glyph |
| `app-shell/TripCard` | Route/trip list items in planner left rail and monitoring |
| `data-viz/CompareBars`, `KpiTile`, `Gauge`, `Sparkline` | Scenario diff bars, plan KPIs, utilization |
| `app-shell/DashboardWidgetGrid` | Cost view: declarative gauge/compareBars/map widgets |
| `app-shell/EntityDetail` / `TaskDetail` / `side-sheet` | Stop/route/vendor detail sheets — same detail top-nav everywhere |
| `forms/SchemaForm` + FormSheet | Create stop/vendor/ad-hoc trip; wizard steps |
| `data-display/DataTable`, `StatePill`, `Timeline` | Manifests, plan audit trail |

**Net-new components** (small, token-only, live in `src/components/planning/`):
`ScenarioDiff` (side-by-side KPI diff + per-route change list) · `StabilityBadge`
(re-solve disruption: "3 stops moved, 2 drivers affected") · `PlaybackControl`
(port from prototype, 175 lines) · `RouteGantt` (time-axis route lanes; pairs with map).
Everything else is composition.

## 4. `PlannerModuleConfig` (sketch — schema file lands with Phase 1)

```jsonc
{
  "$schema": "../../schemas/PlannerModuleConfig.schema.json",
  "kind": "planner",
  "code": "routing/plans",
  "name": "Smart Routing",
  "dataSources": {                      // reads OTHER modules' entities — the platform superpower
    "demand":   { "entity": "workforce/employees", "as": "passengers" },   // or "orders"
    "fleet":    { "entity": "fleet/vehicles" },
    "stops":    { "entity": "routing/stops" },
    "vendors":  { "entity": "routing/vendors" },
    "shifts":   { "entity": "workforce/shifts" }                            // arrive-by anchors
  },
  "provider": { "kind": "mock", "seed": "fams-demo" },   // mock | osrm | vroom | ors (env-swap)
  "enablements": {
    "pickupClustering":  { "maxWalkMeters": 500 },       // staff/school: homes → stops
    "campOrigins":       true,                           // GCC labor-camp many-to-one
    "shiftAnchors":      true,                           // arrive-by / depart-at from shifts
    "genderSequencing":  { "nightWindow": ["21:00","05:00"], "escortSeat": true },
    "pdptwPairing":      false,                          // delivery use-case
    "codCashLimit":      false,                          // delivery use-case (GCC)
    "skillsMatching":    false,                          // crew-dispatch use-case
    "multiTripChaining": false,                          // school tiers
    "rulePacks":         ["gcc-sa"]                      // midday-ban, Ramadan, Hijri, TGA cards
  },
  "cost": {
    "contracts": { "entity": "routing/contracts" },      // per-seat | per-km | per-trip | slab
    "kpis": ["costPerHead", "idleSeatCost", "utilization", "co2ePerSeat"]
  },
  "release": { "target": "fleet/trips" }                 // plan → Trip Management pipeline
}
```

One module type; **the use-case is the enablement set**: staff transport
(clustering+camps+shifts+gender), delivery (pdptw+cod+slots), crew dispatch
(skills+workOrders), school (clustering+chaining+bells). This is the same
config-over-code move as the rest of the kit.

## 5. Data model (entities — all standard `EntityConfig`, EAV store)

- `routing/stops` — POIs/pickup points/camps/sites/depots (geo; `pois`-style map+list;
  Makani/SPL-shortcode/pin fields — GCC addressing is pins, not streets)
- `routing/vendors` + `routing/contracts` — pricing model per contract
  (per-seat/km/trip/slab boundaries) → feeds the cost simulator
- `routing/plans` — the planner's own records (draft → simulated → released; audit)
- `routing/scenarios` — cloned plan variants, `SingleReference` → parent plan
- Reads (never owns): `workforce/employees`, `workforce/shifts`, `fleet/vehicles`,
  writes to `fleet/trips` on release. **References form the graph** — "the workers in
  Workforce are the passengers in Smart Routing" falls out of the entity references.

## 6. What makes it "wow" (research-ranked, mapped)

1. **Scenario Workbench** (Scenarios tab) — clone → tweak fleet/contract/demand →
   `ScenarioDiff` side-by-side (cost/km/CO2e/SLA). No competitor ships this.
2. **Contract-aware cost simulator** (Cost tab) — re-price a month under Vendor B;
   slab-waste flags. Extends `cost.ts` from the platform fork.
3. **Stability budget on re-solve** (`StabilityBadge`) — unshipped anywhere.
4. **Workforce coupling** — ShiftPlanner beside the planner; labor-cost-true
   objectives later. Only IFS is close; FAMS owns the data.
5. **GCC rule packs** — config, not code: midday-ban seasonal waves, Ramadan hours,
   gender sequencing, TGA Wasl card expiry, Arabic/RTL, sovereignty deploy
   (self-host OSRM/VROOM behind `RoutingProvider`).
6. **Day replay** (in Trip Management, fed by plans) — `PlaybackControl` port +
   planned-vs-actual capture from day 1 (seeds the learned-reality layer).

## 7. Phasing

- **P0 — runtime spine**: `RoutingProvider` + optimizer + cost engine into
  `src/runtime/` with the fork's 7 test files. No UI change.
- **P1 — the type + the demo**: `planner` registered renderer +
  `PlannerModuleConfig.schema.json`; Planner tab (wizard → solve → interactive plan);
  Scenarios tab with `ScenarioDiff`; Cost tab (dashboard widgets); **plan release →
  Trip Management**. Update KIT-INDEX / PLATFORM-MODEL / COOKBOOK (+ golden snippet).
- **P2 — execution loop**: monitoring/replay port, planned-vs-actual capture,
  boarding/no-show entities, stability budget.
- **P3 — intelligence**: learned reality corrections, "why this route?" explainability,
  CO2e KPI, labor-cost objectives.
- **P4 — expansion enablements**: delivery (PDPTW/COD), school (chaining/bells),
  crew dispatch (skills), fleet-mix/EV/own-vs-outsource simulators.

## 8. Guardrails (inherited, non-negotiable)

Token-only styling · render `AppShell`, never bespoke chrome · modules are config ·
solver behind the provider seam, deterministic mock default (seeded, no
`Date.now`/`Math.random`) · detail = standard side sheets · additive-only DS changes ·
`fams-v5-verify` green before "done".
