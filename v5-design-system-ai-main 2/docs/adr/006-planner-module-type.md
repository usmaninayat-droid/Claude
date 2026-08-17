# ADR-006 — `planner` module type + `RoutingProvider` runtime service (Smart Routing)

**Status:** Proposed
**Date:** 2026-07-16

## Context

FAMS is adding **Smart Routing** — an advanced route-optimization / cost-simulation /
monitoring capability that sits above the core Trip Management domain area and feeds it
(plans released in Smart Routing spawn trips into the existing `pipeline` +
`live-monitoring` modules).

The capability was validated by two R&D passes (see
`knowledge-base/smart-routing/` in the workspace root):

- Scenario/what-if simulation in the planner UI is a genuine market gap — no fleet or
  staff-transport product ships it.
- Workforce-coupled routing (roster, labor cost, fatigue/legal rules in the optimizer)
  is effectively unclaimed; FAMS natively owns that data.
- GCC rule packs (midday ban, Ramadan hours, gender sequencing, TGA Wasl, Makani/SPL
  addressing) have no competitor bundle.

Two product builds already proved the shape outside the kit: `Code/route-optimization`
(prototype; rich planner/monitoring/sites UI) and `Code/fams-route-optimization`
(platform fork; solver behind a `RoutingProvider { matrix · directions · optimize }`
seam, cost engine, 7 test files). Both had to `registerModuleType` product-side —
evidence the capability does not fit the existing type menu.

Coherence law #3 says the type menu is fixed and a new type is "rare, deliberate."
Precedent: `zones` and `pois` were added as registered renderers when zone/POI
management could not be expressed as `entity` views (see `module-registry.tsx`).

Why the existing types don't fit: a planner is not records-on-a-board (`pipeline`),
not a record browser (`entity`), not read-only KPIs (`dashboard`), and not live assets
(`live-monitoring`). It is an **interactive solve-preview-commit surface**: demand +
fleet in, candidate plan out, with what-if manipulation before release. That
interaction loop (edit → re-solve → diff → commit) has no chassis in the kit.

## Decision

1. **Add one registered module type: `planner`.** A config-driven chassis
   (`PlannerModuleConfig`) rendered by the shell, following the `zones`/`pois`
   registration pattern (typed `data`, placeholder fallback). It is the ONLY new
   primitive; everything else in Smart Routing composes existing types.
2. **Add one runtime service: `RoutingProvider`** in `src/runtime/` beside the sim
   adapter — interface `{ matrix · directions · optimize }` with a deterministic
   `MockRoutingProvider` default and env-swappable real providers (OSRM/VROOM/ORS,
   self-hostable for KSA data-sovereignty deploys). Port from
   `Code/fams-route-optimization` with its tests. The solver is never a component
   concern and never hand-built.
3. **Smart Routing itself is a domain area, not a type** — composed of `planner` +
   `dashboard` + `entity` + existing `pipeline`/`live-monitoring` (Trip Management)
   per `docs/SMART-ROUTING-MODULE.md`. Use-cases (staff transport, delivery, crew
   dispatch, school) are **enablements in config**, not code paths.

## Consequences

- The type menu grows to 12 (9 documented + `zones` + `pois` + `planner`).
  KIT-INDEX, FAMS-PLATFORM-MODEL, MODULE-TYPE-COOKBOOK, and `Recipe.schema.json`
  must be updated when the type lands; `PlannerModuleConfig.schema.json` joins
  `schemas/`.
- Product-side `registerModuleType` splices in the two Code/ repos are retired once
  the kit type ships; those repos become reference implementations/feature donors.
- The existing `planning/*` component family (CreatePlanWizard, InteractivePlanning,
  PlanMonitoring, PlanOverview, SmartPlanningCalendar, ChangeResourceSheet) becomes
  the chassis's composition base — the type formalizes components that already exist.
- Determinism law applies: the mock provider is seeded; no `Date.now`/`Math.random`
  in the solve path, so demos and tests are reproducible.

## Alternatives considered

- **Compose Smart Routing from `dashboard` + `entity` only** — rejected: the
  solve-preview-commit loop and map+Gantt plan editing cannot be expressed as
  declarative dashboard widgets; it would force bespoke screen React (violates law #4).
- **Keep `registerModuleType` product-side** — rejected: duplicates the chassis per
  product, drifts from the shell, and the two existing repos already diverged.
- **Rename/extend Trip Management** — rejected in the platform model: Trip Management
  is execution (`pipeline` + `live-monitoring`); planning is a distinct capability
  that feeds it. The connection is data (plan release → trips), not naming.
