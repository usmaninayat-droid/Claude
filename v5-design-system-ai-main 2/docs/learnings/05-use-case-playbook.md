# Use Case Playbook

Maps a stated intent to a module composition. Each entry is a **concept recipe** — a sketch of which base modules to wire, in what configuration, with what defaults. Full JSON is authored as `use-cases/<slug>/<slug>.recipe.json` alongside one `<module-id>.module.json` per module.

**Authored today:** `crm/` is fully authored (3 pipelines + 4 entities). The other six (`hrms/`, `workshop-maintenance/`, `fleet-telematics/`, `waste-collection/`, `field-service/`, `smart-cities/`) are scaffolded folders with READMEs only — extend them when you build that product.

Use this when the user says one of:

- "Build a CRM" / "make a sales pipeline tool"
- "Build a Workshop Maintenance app" / "service maintenance"
- "Build a Waste Collection app" / "bin management"
- "Build a Fleet Telematics product"
- "Build an HRMS"
- "Build a Field Service app"
- "Build a Smart Cities suite"

If the user's intent doesn't match exactly, pick the **closest recipe** and extend it.

---

## 1. CRM (Pipedrive-shaped) — `crm`

**Concept:** sales pipeline tool. Move opportunities through stages until they become invoices.

**Modules:**

| Kind | ID | Purpose | Default views |
|---|---|---|---|
| Pipeline | `leads` | Inbound leads, qualify | Kanban + List |
| Pipeline | `deals` | Sales opportunities | Kanban + List + Calendar |
| Pipeline | `invoices` | Closed-won → billed | List + Kanban |
| Entity | `companies` | Accounts | List + Hybrid (HQ on map) |
| Entity | `contacts` | People at companies | List |
| Entity | `products` | Catalog (optional) | List |
| Entity | `services` | Service offerings (optional) | List |
| Reports | `sales-reports` | Pipeline velocity, win rate, AR aging | — |
| Dashboards | `sales-dashboard` | Pipeline value, deals by stage, top reps | — |
| Inbox | `inbox` | @-mentions, deal-stage moves | — |

**Pipeline stage defaults:**
- Leads: `New → Contacted → Qualified → Closed Lost / Closed Disqualified`
- Deals: `Discovery → Proposal → Negotiation → Won → Lost`
- Invoices: `Draft → Sent → Partially Paid → Paid → Overdue`

**Linkages:**
- Leads link Contact + Company. On qualified → optionally convert to Deal (creates linked record).
- Deals link Contact + Company + Product. On won → creates Invoice.
- Companies' detail tab "Deals" + "Contacts" (Pattern #19).
- Pattern #33 aggregate metric: Deals stage = sum of deal value; Invoices = sum of amount.

---

## 2. Workshop Maintenance (Truemax-shaped) — `workshop-maintenance`

**Concept:** workshop accepts vehicles, runs jobs through stages, tracks parts and PM schedules.

**Modules:**

| Kind | ID | Purpose |
|---|---|---|
| Entity | `vehicles` | Customer-owned vehicles in for service |
| Entity | `customers` | Workshop's customers |
| Pipeline | `job-orders` | Reported issue → scheduled → ongoing → complete (Pattern #43) |
| Pipeline | `preventive-maintenance` | Multi-trigger PM schedules (Pattern #40, #41, #42) |
| Entity | `parts` | Spare parts catalog |
| Entity | `technicians` | Workshop staff |
| Reports | `service-reports` | Job throughput, repeat-issue rate |
| Dashboards | `workshop-dashboard` | Open jobs, average time-to-complete |

**Special patterns:** Pattern #43 (per-status action button), Pattern #41 (left-rail stepped wizard) for PM authoring, Pattern #40 (multi-trigger progress row) for PM grouped list, Pattern #42 (rule preview table) for trigger rules.

---

## 3. Waste Collection (Tadweer-shaped) — `waste-collection`

**Concept:** waste authority manages bins, routes vehicles, runs inspections.

**Tenant:** `tadweer` (with gradient rail).

**Modules:**

| Kind | ID | Purpose |
|---|---|---|
| Entity | `bins` | Bin inventory with location, capacity, type |
| Entity | `vehicles` | Waste-collection trucks |
| Entity | `workforce` | Drivers, inspectors |
| Pipeline | `trips` | Daily collection trips per vehicle |
| Pipeline | `inspections` | Bin / driver inspections |
| Live Monitoring | `live-monitoring` | Real-time truck + bin status (hybrid view) |
| Reports | `collection-reports` | Tonnage by area, route compliance |
| Dashboards | `operational-dashboard` | Tadweer-style (Pattern #48, #49) |
| Dashboards | `driver-behaviour` | Pattern #50, #51, #52 |
| Inbox | `inbox` | |

**Special patterns:** Pattern #47 (gradient rail) via tenant, Pattern #48 (compliance gauge), Pattern #49 (actual-vs-target KPI), Pattern #51 (geospatial heatmap).

---

## 4. Fleet Telematics (FAMS V5 base) — `fleet-telematics`

**Concept:** the core FAMS product. Real-time fleet monitoring + trip history + events.

**Modules:**

| Kind | ID | Purpose |
|---|---|---|
| Entity | `vehicles` | Vehicles with device feeds |
| Entity | `drivers` | Drivers, including DMS-detected behavior |
| Live Monitoring | `live-monitoring` | Hybrid list + map (Pattern #03) |
| Pipeline | `trips` | Trips with start/end/distance/score |
| Pipeline | `events` | Telematics events (speeding, harsh braking, idling, geofence breach) |
| Reports | `fleet-reports` | Trip reports, event reports, fuel reports |
| Dashboards | `fleet-dashboard` | KPI overview |
| Inbox | `inbox` | Critical events, alerts |

---

## 5. HRMS — `hrms`

**Concept:** employees, departments, applications, leave.

**Modules:**

| Kind | ID | Purpose |
|---|---|---|
| Entity | `employees` | Workforce roster |
| Entity | `departments` | Org structure |
| Pipeline | `applications` | Job application pipeline (interview rounds via Pattern #37) |
| Pipeline | `leave-requests` | Leave approval workflow |
| Pipeline | `performance-reviews` | Review cycles |
| Reports | `hr-reports` | Headcount, turnover |
| Dashboards | `hr-dashboard` | |

---

## 6. Field Service — `field-service`

**Concept:** dispatch field technicians to customer jobs.

**Modules:**

| Kind | ID | Purpose |
|---|---|---|
| Entity | `customers` | Customer sites |
| Entity | `technicians` | Field staff |
| Entity | `inventory` | Truck stock |
| Pipeline | `jobs` | Service jobs with scheduling |
| Live Monitoring | `live-monitoring` | Technician location |
| Reports | `service-reports` | |
| Dashboards | `dispatcher-dashboard` | |

**Special patterns:** Pattern #53 (bulk reassignment modal) for dispatcher reassign.

---

## 7. Smart Cities — `smart-cities`

**Concept:** multi-app composition. Multiple FAMS apps (CCMS-style + IIMS-style + CCRMS-style) live under one tenant.

**Apps:**

| App | Modules |
|---|---|
| Command Centre | Live Monitoring + Incidents pipeline + Inbox |
| Inspections | Inspections pipeline + Reports + Dashboards |
| Inventory | Assets entity + Movements pipeline |

**Special patterns:** Pattern #65 (cross-app source filter) in Inbox, Pattern #66 (app provenance badge) on notification cards.

---

## How to extend a recipe

If the user wants something close but not exact (e.g., "CRM but with a Tickets pipeline for support cases"):

1. Find the closest recipe above.
2. Add the new module — pick its base kind (Entity / Pipeline / Reports / …) from the kinds catalogue in `01-architecture.md`.
3. Configure it per the matching schema in `schemas/`.
4. If it touches a new pattern not in `04-pattern-ledger.md`, flag it.

## How to build a brand-new recipe

If none of the above fit:

1. Decompose the use case into modules (which entities, which pipelines, which dashboards).
2. Pick existing patterns wherever possible.
3. Author it as `use-cases/<slug>/<slug>.recipe.json` + one `<module-id>.module.json` per module.
4. Note any new patterns in `04-pattern-ledger.md`.

## Source of truth

Long-form module specs in `knowledge-base/product-context/`. When this playbook is ambiguous, defer to the specs.
