# `@fams/demo-kit`

Generic, **product-agnostic** demo machinery for running a FAMS React app with
**no backend**. It provides a relational in-browser store, session persistence,
a seed loader, a persona auth shim, and an MSW mock-API generator — all with
zero product vocabulary.

## The tier rule (read this first)

`@fams/demo-kit` is **core tier** (decision #13). Like `@fams/ui-kit`,
`@fams/tokens`, and `@fams/skeleton-kit`, it is product-agnostic and:

- **imports NO `@fams/v5-*` package** — the ESLint `no-restricted-imports`
  boundary ban fails the build if it ever does;
- **contains NO v5 vocabulary** — no `entityconfig`, no `systemcolumns`, no
  `pipeline_rules`, no tenant-as-licensing, no blueprints. Only generic
  contracts: schemas, references, seeds, personas, endpoint contracts.

Where these contracts overlap with shapes `@fams/v5-composer` already ported,
**demo-kit does not import them** — it defines its own. The duplication across
the tier boundary is the accepted price of keeping core product-agnostic.

**v5 wiring happens in the demo app (phase 3.3), not here.** The demo app writes
a thin adapter that bridges these generic contracts onto `@fams/v5-kit`'s
injectable seams (`ModulesSource` / `BlueprintSource` / `UserSource` / the
composer stores). This package never reaches up into the v5 tier.

## What's inside

### 1. `RelationalStore` — relational in-browser store

Register entity types with a lightweight schema; get CRUD, query, and
**bidirectional referential integrity**.

```ts
import { RelationalStore } from '@fams/demo-kit'

const store = new RelationalStore()
store.register({
  type: 'workforce',
  fields: [{ name: 'name', type: 'string', required: true }],
  references: [
    // forward `vehicleId` (one) ⇄ inverse `crew` (materialized on the vehicle)
    { name: 'vehicleId', target: 'vehicle', cardinality: 'one', inverse: 'crew' },
  ],
})
store.register({ type: 'vehicle', fields: [{ name: 'plate', type: 'string' }], references: [] })

store.create('vehicle', { id: 'v1', plate: 'ABC-1' })
store.create('workforce', { id: 'w1', name: 'Ada', vehicleId: 'v1' })

store.read('vehicle', 'v1').crew // → ['w1']  (both sides updated)
store.getReferrers('v1')         // → [{ type: 'workforce', id: 'w1', field: 'vehicleId' }]
store.remove('vehicle', 'v1')    // clears the dangling w1.vehicleId → null
```

- **Forward references are the single source of truth**; inverse accessors are
  recomputed from them after every mutation, so both sides never drift.
- `RefDef` declares `{ name, target, cardinality, inverse }`. `cardinality: 'one'`
  stores `string | null`; `'many'` stores `string[]`. The `inverse` field on the
  target is always the id array of referrers.
- Deletes are **hard** and clear every dangling reference pointing at the record.
- `list(type, query)` supports `where` (equality, `{ in }`, `{ contains }`),
  `sort`, and `offset`/`limit` — enough for list endpoints. `total` is the
  match count **before** pagination.
- `snapshot()` / `load()` for serialization (snapshot is forward-only; inverses
  rebuild on load).

### 2. Session persistence

`Persistence` is demo-kit's **own** interface (deliberately not the composer's).

```ts
import { RelationalStore, SessionStoragePersistence } from '@fams/demo-kit'

const store = new RelationalStore({
  persistence: new SessionStoragePersistence({ namespace: 'my-demo' }),
})
```

- `SessionStoragePersistence` — survives reloads within a browser session,
  guards `typeof window` (safe under SSR / Node).
- `MemoryPersistence` — the in-memory default.
- `store.reset()` re-seeds from the loaded seed set and clears persistence.

### 3. Seed loader

A seed set is per-type entity arrays + login personas + a role → privilege map.

```ts
import { loadSeeds, type SeedSet } from '@fams/demo-kit'

const seeds: SeedSet = {
  entities: { vehicle: [{ id: 'v1', plate: 'ABC-1' }], workforce: [{ id: 'w1', name: 'Ada', vehicleId: 'v1' }] },
  users: [{ id: 'u1', name: 'Dana', roles: ['dispatcher'] }],
  roles: { dispatcher: ['workforce.read', 'workforce.write'] },
}

loadSeeds(store, seeds) // deterministic ids; THROWS DanglingSeedRefError on a dangling cross-reference
```

If no persisted session exists, seeds are applied fresh; otherwise the persisted
session is hydrated (edits survive the reload). `loadSeeds` always validates the
declared seeds first and **fails loudly** listing every dangling reference.

### 4. Persona auth shim

A tiny observable — no React dependency in the core.

```ts
import { createPersonaAuth } from '@fams/demo-kit'

const auth = createPersonaAuth(seeds.users, seeds.roles)
const unsub = auth.subscribe(() => rerender())
auth.login('u1')
auth.privileges() // → ['workforce.read', 'workforce.write']
auth.userType()   // → persona.userType ?? first role
```

React consumers use the optional hook from the **separate** entry (React is an
optional peer, so the core entry stays React-free):

```ts
import { usePersona } from '@fams/demo-kit/react'
const { persona, privileges, userType } = usePersona(auth)
```

**⚠️ userType and gating:** By default, `auth.userType()` returns `'user'`
(normal gating) unless a persona explicitly sets a different `userType`. This
safe-by-default behavior protects against accidental privilege escalation in
demo scenarios. Only test/admin personas should have a privileged `userType`
(e.g. `'admin'` or `'readonly'`); v5-kit bridges treat any non-`'user'` value
as a gating bypass. Always name such personas clearly (e.g. `u_admin`) with a
comment noting the bypass.

### 5. MSW mock-API generator

Describe endpoints as generic contracts; get MSW handlers that read/write the
store. No product endpoint names are baked in.

```ts
import { buildHandlers, setupDemoWorker, type EndpointContract } from '@fams/demo-kit'

const contract: EndpointContract[] = [
  { method: 'get', path: '/api/workforce', op: { kind: 'list', type: 'workforce' } },
  { method: 'get', path: '/api/workforce/:id', op: { kind: 'get', type: 'workforce' } },
  { method: 'post', path: '/api/workforce', op: { kind: 'create', type: 'workforce' } },
  { method: 'patch', path: '/api/workforce/:id', op: { kind: 'update', type: 'workforce' } },
  { method: 'delete', path: '/api/workforce/:id', op: { kind: 'remove', type: 'workforce' } },
]

const worker = await setupDemoWorker(buildHandlers(contract, store))
await worker.start()
```

- List endpoints read `?limit=&offset=&sort=&dir=` plus any other query param as
  an equality filter; the default response envelope is `{ data, total }`.
- `op.kind: 'custom'` gives you `({ request, params, store }) => Response` for
  anything bespoke.
- `setupDemoWorker` is **async** — it lazily imports `msw/browser` so browser
  worker code never loads in Node / SSR bundles that only need `buildHandlers`.
- `buildHandlers(contract, store, { baseUrl })` optionally prepends an origin or
  origin+path prefix to each contract endpoint. Leave `baseUrl` unset in the
  browser for same-origin requests — MSW intercepts relative paths automatically.
  Pass an absolute URL (e.g., `https://api.example.test`) when using `msw/node`
  for tests (which require absolute URLs) or to target a different API origin.

> **Service worker requirement:** MSW's browser mode needs a service-worker
> script served from your app's public root. Run this once in the consuming app:
>
> ```sh
> npx msw init public/ --save
> ```
>
> In tests, use `msw/node`'s
> `setupServer(...buildHandlers(contract, store, { baseUrl }))` instead — no
> worker file needed.

## How an app bridges demo-kit to the product kits

demo-kit stays generic; the **demo app** owns the v5 adaptation:

1. Define v5's entity types as `EntitySchema`s and its dummy data as a `SeedSet`
   (app-side — v5 vocabulary lives here, not in demo-kit).
2. `loadSeeds(store, seeds)` and `createPersonaAuth(seeds.users, seeds.roles)`.
3. `buildHandlers(contract, store)` for the v5 REST shape and `setupDemoWorker`.
4. Write adapters that satisfy `@fams/v5-kit`'s injectable seams
   (`ModulesSource` / `BlueprintSource` / `UserSource`) by calling `fetch` against
   the mock API (or the store directly), and pass `usePersona(auth)` into the
   user seam. That adapter — the only place the two tiers meet — lives in the
   app, never in this package.
