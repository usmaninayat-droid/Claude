# `app/` — the FAMS v5 demo application

A Vite + React app (port **6300**) that boots the **real** stack with **no
backend**, rendering the committed `resolved/<tenant>/<module>.blueprint.json`
for a selected tenant + persona. Decisions #18/#19.

```
seeds → @fams/demo-kit relational store → MSW (v5 API contract) → fetch adapter → composer/templates render
```

The frontend never knows MSW exists: the only data client is `ApiDataAdapter`,
which talks `fetch()`. In the browser MSW is a service worker intercepting those
same-origin requests; swap it for a real backend and nothing in the app changes.

## Run

Prerequisite — build the design system once (the app consumes its built `dist`
via pnpm `link:`, like the tool suite):

```bash
cd ../fams-design-system && pnpm install && pnpm build
cd ../fams-v5-demo-environment && pnpm install
pnpm --filter app msw:init   # once — writes public/mockServiceWorker.js (committed)
pnpm --filter app dev        # http://localhost:6300
```

Build / test / typecheck:

```bash
pnpm --filter app build
pnpm --filter app test
pnpm --filter app typecheck
```

## URL params

`?tenant=<id>&persona=<id>` are read at boot. Defaults: the first tenant and its
first persona. The Demo Console writes these + reloads on a switch.

- `tenant` — `fams` | `iwmp` (any folder under `tenants/`).
- `persona` — a persona id from `tenants/<t>/seeds/users.json` (`u_admin` | `u_dispatcher`).

## The v5-kit boot seams (all app-implemented, `src/demo/seams.ts`)

- **ModulesSource** → `GET /api/bootstrap?persona=<id>` (MSW), backed by the
  tenant's `tenant.json` manifest. Returns the v5-shaped licensed modules
  (`code`/`name`/`menu`) **the persona may see** — so module visibility is
  persona-gated at the source (see gating below).
- **BlueprintSource** → wraps `resolved/<t>/<module>.blueprint.json` (imported
  from the committed repo via Vite glob) as the single `ModuleBlueprint` node
  the composer renders.
- **UserSource** → the `@fams/demo-kit` persona auth shim (`privileges` +
  `userType`), feeding v5-kit's reactive `<Privileged>` gating.
- **implementations** → product modules take the low-code composer path
  (`composerModule` + `v5TemplateRenderers`); the builtin admin `settings`
  module is bespoke.

## The MSW data loop (`src/demo/model.ts`, `ApiDataAdapter.ts`)

The v5-shaped endpoint contract (defined here in the app, not in demo-kit):

| Endpoint | Op |
|---|---|
| `POST /api/entity/entity_list_by_code` `{code, filters?, sort?, offset?, limit?}` | list → `{data,total}` |
| `POST /api/entity/entity_profile` `{code, id}` | get |
| `POST /api/entity/entity_create` `{code, values}` | create (mints a `uidPrefix` uid) |
| `POST /api/entity/entity_update` `{code, id, values}` | update |
| `POST /api/entity/entity_delete` `{code, id}` | soft delete |
| `GET /api/bootstrap?persona=<id>` | persona's licensed modules |

`buildHandlers` (demo-kit) turns the entity contract into MSW handlers over the
relational store; `ApiDataAdapter` is the fetch client for them.

### Sync ⇄ async contract friction (documented v1 choice)

The composer's render-time `DataAdapter` is **synchronous** (`list()`/`get()`
return values, not promises — it was designed for an in-memory store), but
`fetch` is async. The bridge (`composer-data.ts`): at boot we hydrate a per-code
**buffer** through the real fetch path (`ApiDataAdapter.listByCode` → MSW →
store), then the composer reads the buffer synchronously. Writes are optimistic
— the buffer is mutated synchronously *and* written through to MSW via `fetch`,
reconciling the server id/uid on resolve.

Pipeline transition **rules** run client-side via the composer runtime's
evaluator: the `ticketing` module's adapter exposes `transitions`/`move`, gated
by the module's `rules.json` + the persona `UserContext` through the composer's
exported `allowedTransitions` (as in the design-system gate demo). A created
pipeline card with no status defaults to the first stage (the app-side
pipeline-create fix). Entity CRUD is fully proven over fetch/MSW (the
production-contract proof) — see `ApiDataAdapter.test.ts`.

## Persona gating (visible admin vs dispatcher difference)

Role → privilege map lives in the app (`src/demo/model.ts`, `ROLE_PRIVILEGES`):

- **admin** — view/create/update on `asset`, `workforce`, `ticketing` + `settings.view`
- **dispatcher** — `asset.view`, `workforce.view`, `workforce.create`, `ticketing.view`

So the dispatcher: (1) does **not** see the admin **Settings** module in the nav
(the bootstrap endpoint omits it), and (2) gets **no “New” button** on Tickets
(the composer adapter exposes `create` only with `ticketing.create`), while it
can still create Workforce (used by the coherence walkthrough).

## Tenant / persona switching + reset

A switch updates the URL and **fully reloads** (v1): the registered module set is
persona-dependent and the tenant theme + resolved set + seeds all change at boot,
so re-running `bootstrapTenant` is the honest path. Tenant switch re-themes via
`applyTenantTheme`, which sets `<html data-tenant>` so the DS `[data-tenant]`
token block drives the theme — fams blue vs iwmp green + sidebar gradient. Seed
reset calls `store.reset()` + reload.

## Tests

`src/**/*.test.{ts,tsx}` (vitest, `msw/node`) — no React render (the render
path is proven by `vite build`):

- `demo/ApiDataAdapter.test.ts` — CRUD round-trip through the v5 contract.
- `boot.test.ts` — the real `bootstrapTenant` over the seams; modules registered
  per the persona manifest; render buffer hydrated through fetch/MSW.
- `demo/gating.test.ts` — admin vs dispatcher module visibility (pure + via MSW).
- `demo/composer-data.test.ts` — the sync buffer bridge + create-button gating.
- `pilot.integration.test.ts` — the founder-walkthrough path: tenant deltas
  render (FAMS vs IWMP), workforce→vehicle coherence (fetch/MSW → `getReferrers`),
  reset re-seeds, pipeline lanes + default stage, role-gated transition.
- `drill.verify.test.ts` — the phase-4 drill goalpost: asserts both drill
  fields (Severity Level, Penalty Payment Due Date) are defined AND placed on
  the Dispatcher@IWMP ticketing detail surface.
- `render-path.test.ts` — ties the ops-engine placement output (`addField.placements`
  / `placeField`) to the `FieldRegistry` detail-surface derivation the composer
  actually renders from, proving a captured placement reaches the real render path.

`e2e/visual-matrix.spec.ts` (Playwright, phase 4 §2) — the actual rendered
app, real browser: a curated tenant × persona × screen visual matrix booted
via the URL params above. `pnpm test:visual` (update baselines with
`test:visual:update`). See root `CLAUDE.md` § Gates for the full contract
(dual local/VRT mode, CI wiring). All 24 matrix shots are real — kanban is
wired via `resolveModuleViews` (post-4.C fix).

## Demo Console

`@fams/demo-kit/console`'s `DemoConsole` is mounted once at the app root
(`src/main.tsx`), above the routed tree. Hover the top edge (or Tab to the
hidden trigger) to open it; it drives tenant/persona/module-jump/reset/share via
the callbacks wired here.
