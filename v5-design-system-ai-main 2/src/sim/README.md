# `sim/` — Faithful FAMS backend simulation

> The browser-side engine that makes the front-end fully interactive **without a
> server**. It mirrors the real FAMS V5 backend's shapes and logic (per
> `docs/learnings/`), runs in TypeScript, persists to localStorage, and sits
> behind the `@fams-v5/adapters` interfaces — so swapping in the real REST API
> later is a one-line adapter change.

## Why it exists

The vision (`../VISION-AND-REPLAN.md`) chose **faithful simulation**: the
front-end should behave like production. Rather than fake interactivity, we port
the documented backend *logic* into the browser. Components never touch the sim
directly — they call adapters; the in-memory adapter delegates here.

## Layout

```
sim/
├── engine/
│   ├── types.ts         # entityconfig (systemcolumns + uiConfig), entitydata, pipeline_rules, resolved permissions
│   ├── rules.ts         # JSONLogic-lite evaluator + resolvePermissions/allowedTransitions/isTaskVisible
│   ├── entity-store.ts  # generic EAV CRUD, soft-delete, UID sequences, ref CSV↔array, OR/AND filtering
│   └── index.ts         # barrel
├── seed/                # (next) per-tenant/use-case seed datasets — CRM first
└── persistence/         # (next) localStorage hydrate/snapshot adapter implementing Persistence
```

## What's faithful to production

| Engine piece | Mirrors backend | Spec source |
|---|---|---|
| `EntityStore` | Generic entity engine — one store for every `code`, MultiReference as CSV, `tags` as array, soft-delete, UID sequences | Architecture §7, Business-Logic §0–1 |
| `rules.ts` | `pipeline_rules` → resolved `{ fieldRules, statusRules, transitionRules }`; OR-in/AND-across filtering | Business-Logic §1 |
| Filtering | OR within a filter, AND across filters | Business-Logic §1 |

## Where we deliberately improve on the backend

- **No `eval()`.** Production's rules/event engines use `eval()` (flagged in the
  Engineering & Risk notes). `rules.ts` is a safe interpreter with the same power.
- **RBAC actually enforces** (backend has `bypass = true`).
- **Compliance** (when added) will use the correct weighted formula, not the
  bin-visits-only version that's live.
- **Data source always shown** (CAN vs estimated) for fuel/odometer.

## Build order

Phase 1 (engine):
1. ✅ types · rules · entity-store
2. ✅ `persistence/` localStorage adapter (+ in-memory) implementing `Persistence`
3. ✅ `seed/crm` dataset (configs + role-gated rules + sample records) + `createCrmSim()`
4. ✅ `adapters/` sim → `@fams-v5/adapters` bridge (entity + rule-enforced pipeline)
5. ☐ events engine (single/dual-leg, data_driven/periodic) — Live Monitoring
6. ☐ delivery engine (K-means via Turf, ETA cascade) — Delivery module
7. ☐ telemetry simulator (ticking `datastreams.logdata`) — maps/fuel/odometer

Phase 2 (first slice): stand up `Projects/crm/` — wire `createCrmSim()` through
the bridge into the kit's `PipelineModule`/`EntityModule`, add routing +
tenant theme. This is the first fully-clickable, persisted product.

## The seam in one snippet

```ts
import { createCrmSim } from '../sim';
import { createPipelineAdapter, createEntityAdapter } from '../sim/adapters';

const sim = createCrmSim('fams-v5');
const leads = createPipelineAdapter(sim.store, 'crm/leads', {
  rules: sim.rules['crm/leads'],
  getUser: () => sim.users.manager,   // → sim.users.rep to see RBAC change
});
const companies = createEntityAdapter(sim.store, 'crm/companies');
// hand `leads`/`companies` to the kit chassis — no chassis changes needed.
```

## Testing

The engine is pure TS with no DOM/React deps, so `rules.ts` and `entity-store.ts`
are unit-testable in isolation (rule resolution truth tables, filter combinations,
soft-delete, UID sequencing) before any UI is wired.
