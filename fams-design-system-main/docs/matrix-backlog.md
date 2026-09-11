# Component Matrix Backlog

Source: `research.html` §3 "Component gap matrix — Ben vs Shaheer" (tag: `~345 components matched`). Ben ≈102 tested, product-agnostic core components; Shaheer ≈243 Figma-faithful + domain/runtime components. Framing from `decisions.md` decision #1: Ben = engineering skeleton, Shaheer = design truth — this backlog is the punch list for reconciling the two.

**§3 completeness caveat:** §3 is a **summary-level** matrix, not a row-per-component audit. It names specific components only inside four prose bullets (`Only Shaheer`, `Only Ben`, `Both, materially different`, `Neither`) plus one aggregate counts line by category (`Primitives 27/24 · Layout 4/0 · Forms 6/5 · Data display 27/29 · Charts 15/18 · Nav 7/8 · Overlays 3/6 · Shell 8/9 · Maps 5/9 · Domain 0/~40+`). The tables below enumerate **only the components §3 names explicitly**. The aggregate counts imply many more components exist on both sides that are already consistent ("both-aligned") — §3 does not name any of those individually, so no `both-aligned` rows are listed; this is a gap in the source, not an omission here. Do not treat this document as covering all ~345 matched components — it covers what §3 chose to call out.

---

## Counts summary

| Bucket | Count | Action |
|---|---|---|
| Already in progress (phase 1 task 6) | 2 | none — vaul `Drawer` + cmdk `Command` are being imported now |
| Restyle-to-Figma (Ben-only) | 14 | bring up to Shaheer's Figma-faithful visuals |
| Import-from-Shaheer (Shaheer-only, excl. the 2 done) | 21 | port into the design system |
| Decide — both-diverged (merge) | 4 | reconcile two implementations |
| Decide — neither exists (net new) | 5 | build fresh, decide ownership/timing |
| Both-aligned (none) | 0 named | §3 does not enumerate these; see caveat above |
| **Total rows tracked** | **46** (44 backlog + 2 done) | |

---

## 1. Purpose

This is the punch list for the larger matrix reconciliation that phase 1 §6 explicitly deferred: the restyle-to-Figma passes that bring Ben's tested components up to Shaheer's design truth, and the imports of Shaheer-only components into the design system. It is a backlog, not a plan — no sequencing, estimation, or reconciliation work happens in this document; each row gets its own decision/ticket later. Already done (or in flight) as of phase 1 task 6: **vaul `Drawer`** and **cmdk `Command`** are being imported now, so they're marked `done` below and excluded from the open counts.

## 2. Backlog

Columns: **Status** — Ben-only / Shaheer-only / both-diverged / both-aligned. **Action** — restyle-to-Figma / import-from-Shaheer / none / decide. **Priority** — P1 (blocks v5-templates or the entity-module pilot per decision #24), P2 (common, needed broadly but not pilot-blocking), P3 (long-tail domain, used by modules after the pilot). Priority is curator judgment applied on top of §3's own emphasis (it repeatedly flags config runtime, real maps, and core table/list engines as structurally important; domain suites as the long tail) and decision #24 ("entity module first, live monitoring second") — §3 itself does not assign priorities.

### Overlays

| Component | Status | Action | Priority | Notes |
|---|---|---|---|---|
| Command palette (cmdk) | Shaheer-only | import-from-Shaheer | — | **DONE** — importing in phase 1 task 6 |
| Drawer (vaul) | Shaheer-only | import-from-Shaheer | — | **DONE** — importing in phase 1 task 6 |
| DetailSheet | both-diverged | decide | P1 | Ben = single-pane; Shaheer = multi-tab minimize/close-all → merge |
| FullScreenDetail | Shaheer-only | import-from-Shaheer | P2 | |
| StepWizardSheet | Shaheer-only | import-from-Shaheer | P2 | |
| Generic Wizard primitive | neither exists | decide | P1 | "Neither" (build new); relates to decision #10's CreationSheet grouping work |

### Data display

| Component | Status | Action | Priority | Notes |
|---|---|---|---|---|
| DataTable | both-diverged | decide | P1 | Ben = TanStack + virtual + axe; Shaheer = Figma-faithful config-driven, not virtualized → merge. Ties to decision #8 (TanStack Table for all tables) |
| ListView (merged virtualized + config-driven) | neither exists | decide | P1 | "Neither" (build new); ties to decision #9 (ListView, not "DataView") |
| widgets-v2 (MetricCard / EventLogCard / KpiSelectionCard / UserRoleCard) | Shaheer-only | import-from-Shaheer | P2 | Grouped bundle as named in §3 |
| TrendIndicator | Ben-only | restyle-to-Figma | P2 | |
| TagChipList | Ben-only | restyle-to-Figma | P2 | |
| SegmentedBar | Ben-only | restyle-to-Figma | P2 | |
| RadialProgress | Ben-only | restyle-to-Figma | P2 | |
| FilterPanel (standalone) | Ben-only | restyle-to-Figma | P2 | |
| Generic resource timeline | neither exists | decide | P3 | "Neither" (build new); scheduling/planning-adjacent, not pilot-blocking |
| Reusable calendar view | neither exists | decide | P3 | "Neither" (build new) |

### Forms

| Component | Status | Action | Priority | Notes |
|---|---|---|---|---|
| FormGrid | Ben-only | restyle-to-Figma | P2 | |
| FormSection | Ben-only | restyle-to-Figma | P2 | |
| TagPicker | Ben-only | restyle-to-Figma | P2 | |

### Primitives / Layout

| Component | Status | Action | Priority | Notes |
|---|---|---|---|---|
| Stack | Ben-only | restyle-to-Figma | P2 | Layout category |
| Toolbar | Ben-only | restyle-to-Figma | P2 | |
| Slider | Ben-only | restyle-to-Figma | P2 | |
| Calendar primitive (standalone) | Ben-only | restyle-to-Figma | P2 | Distinct from the "reusable calendar view" build-new item and domain SmartPlanningCalendar |
| Pagination (standalone) | Ben-only | restyle-to-Figma | P2 | |

### Charts

| Component | Status | Action | Priority | Notes |
|---|---|---|---|---|
| RadarChart | Shaheer-only | import-from-Shaheer | P2 | |

### Navigation

| Component | Status | Action | Priority | Notes |
|---|---|---|---|---|
| SettingsNav | Shaheer-only | import-from-Shaheer | P2 | |

### Shell

| Component | Status | Action | Priority | Notes |
|---|---|---|---|---|
| AppShell | both-diverged | decide | P1 | Ben = chrome + slots; Shaheer = config → view runtime → merge. Foundational chrome, needed by every module including the entity-module pilot |
| NoPermission | Ben-only | restyle-to-Figma | P2 | |

### Maps

| Component | Status | Action | Priority | Notes |
|---|---|---|---|---|
| MapContainer | both-diverged | decide | P2 | Ben = placeholder; Shaheer = working Leaflet impl (§3's "Only Shaheer" bullet separately calls this out as "real Leaflet MapContainer" — same underlying component, listed in both §3 bullets) → adopt Shaheer's, then port to MapLibre per the perf scan (§2) |
| MapPanel (product-agnostic, MapLibre) | neither exists | decide | P2 | "Neither" (build new) |
| EventsHeatmap | Shaheer-only | import-from-Shaheer | P3 | Maps/domain overlay behavior |
| ZoneComplianceMap | Shaheer-only | import-from-Shaheer | P3 | |
| ServiceLocationsMap | Shaheer-only | import-from-Shaheer | P3 | |
| IdentityMapCard | Shaheer-only | import-from-Shaheer | P3 | |

### Domain (runtime + suites)

| Component | Status | Action | Priority | Notes |
|---|---|---|---|---|
| Config runtime (→ v5-composer) | Shaheer-only | import-from-Shaheer | P1 | Foundational: the entity-module pilot proves the composer (decision #24) — this is the runtime it needs, not a visual component |
| Planning + SmartPlanningCalendar | Shaheer-only | import-from-Shaheer | P3 | Named as one grouped item in §3 |
| Scheduling / ShiftPlanner / TimesheetGrid | Shaheer-only | import-from-Shaheer | P3 | Named as one grouped item in §3 |
| Zones | Shaheer-only | import-from-Shaheer | P3 | |
| Events | Shaheer-only | import-from-Shaheer | P3 | |
| POIs | Shaheer-only | import-from-Shaheer | P3 | |
| Contracts | Shaheer-only | import-from-Shaheer | P3 | |
| Operations dispatcher-cockpit | Shaheer-only | import-from-Shaheer | P3 | Live-monitoring-adjacent; decision #24 puts live monitoring after the entity-module pilot |
| Reports builder | Shaheer-only | import-from-Shaheer | P3 | |
| Settings suite | Shaheer-only | import-from-Shaheer | P3 | |
| LoginScreen | Shaheer-only | import-from-Shaheer | P2 | Common — every product needs auth entry, not module-specific long-tail |
| TripCard | Shaheer-only | import-from-Shaheer | P3 | |

---

## 3. Working rules

- **Definition of done** for every row is whatever CLAUDE.md's DoD says (tokens-only styling, tests, axe, registry entry) — this backlog does not restate or relax it. A row isn't closeable until its component meets that bar.
- **Migrate-on-touch, not a sweep.** Per decision #7, headless base is Base UI primary + React Aria for date/time pickers (+Tree) only. Any Ben component still on Radix migrates to Base UI/React Aria *only when it's touched* for its restyle-to-Figma pass — don't run a separate Radix-migration project. New Radix usage is lint-banned; nothing in this backlog is an exception.
- **Don't restructure Ben's tested components' API without a decision.** Restyle-to-Figma passes are visual/token reconciliation, not a license to change props, exports, or behavior of a component Ben already tested — any API change needed to reach Figma parity is a `decide` row, escalated, not a silent side effect of a restyle ticket.
- Rows marked `decide` (both-diverged or neither-exists) are explicitly **not resolved here** — this document only lists them; the actual reconciliation approach for each is out of scope for phase 1 per the requirement that created this backlog.
