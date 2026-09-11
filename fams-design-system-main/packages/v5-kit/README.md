# @fams/v5-kit

The **v5 boot layer** for React — the rewrite of v5's Vue boot sequence
(`v5/src/frontend/boot`, `composables/app`, `directives/privilege`), composed
**on top of** the product-agnostic `@fams/skeleton-kit` and the low-code
`@fams/v5-composer`.

**Tier: v5 (product-aware).** It carries the product vocabulary the core tier
deliberately lacks — tenancy, licensing, privileges, blueprints. It MAY import
`@fams/skeleton-kit` / `@fams/v5-composer` / `@fams/ui-kit`; the core tier NEVER
imports it (decision #13, lint-enforced). It does **not** duplicate skeleton-kit
logic — it composes `createFamsApp`, `bootstrapTheme`, `queryClassOptions`, and
the `FamsModule` contract.

## Peer dependencies

`react`, `react-dom`, `@tanstack/react-router`, and `@tanstack/react-query`
are all `peerDependencies` of this package too, for the same reason as
skeleton-kit: this package imports `useQuery`/`useRouterState` directly, so a
second copy of either TanStack package in a consuming app risks `Invalid hook
call`. Full singleton list, what an external consumer must install, and the
Vite `resolve.dedupe`/`resolve.alias` block: `packages/skeleton-kit/README.md`
§ Consuming from another workspace (canonical — don't duplicate it here).

## What it adds over skeleton-kit

| concern | skeleton-kit (core) | v5-kit (this package) |
| --- | --- | --- |
| module list | you hand it a static `FamsModule[]` | fetched at runtime from a tenant's **licensed modules**, mapped to `FamsModule[]` |
| module code | bespoke lazy routes only | bespoke **or** low-code **composer** (blueprint) modules |
| theming | `data-theme` + `data-tenant` | + per-tenant `runtimeVars` escape hatch |
| access | `requiredPrivileges` typed but unused | reactive `<Privileged>` / `usePrivilege` gating |
| cache | generic `QueryClient` | per-tenant `wipeTenantCache` + `logout()` |

## Boot sequence

`bootstrapTenant(config)` is **async** — mirroring v5's `boot()`, which awaited
`GET bootstrap` before registering routes. The order:

1. **Fetch licensed modules** — `modulesSource.getLicensedModules()`.
2. **Fetch the user** — `user?.getUser()` (defaults to an anonymous `user`).
3. **Resolve** licensed ∩ implemented → skeleton `FamsModule[]`
   (`resolveTenantModules`). See *Decision #23* below.
4. **`createFamsApp({ modules, … })`** — skeleton wires theming (`data-theme` +
   `data-tenant`), query defaults, the router (one lazy chunk per module) and
   error boundaries.
5. **`applyTenantTheme(tenant)`** — layers the tenant's `runtimeVars`.
6. **Wrap** the skeleton app in `PrivilegeProvider`, fed by the resolved user.

It returns `{ App, router, queryClient, modules, skipped, logout }`.

### Why a composed `bootstrapTenant`, not a bare modules array

The module list is fetched at runtime, so the async orchestration has to live
*somewhere*. Composing `createFamsApp` inside `bootstrapTenant` keeps it in one
place and lets us add the two wrappers a bare array couldn't: the
`PrivilegeProvider` around the whole tree and the tenant-scoped `logout()`.
(`resolveTenantModules` is still exported for callers/tests that want only the
mapping.)

```ts
import { bootstrapTenant } from '@fams/v5-kit'
import '@fams/tokens/theme.css'
import '@fams/tokens/tenants.css'

const app = await bootstrapTenant({
  modulesSource: { getLicensedModules: () => api.get('/bootstrap') },
  user: { getUser: () => api.get('/me') },
  tenant: { tenant: 'crm' },
  blueprintSource: { getBlueprint: (ref) => api.get(`/blueprints/${ref}`) },
  implementations: {
    // bespoke module: supplies its own lazy route
    assets: { routes: () => import('./modules/assets/route').then((m) => m.Route) },
    // low-code module: rendered by the composer from a resolved blueprint
    deals: { composerModule: { blueprintRef: 'crm/deals' }, navEntry: { order: 2 } },
  },
  composer: { renderers: myTemplateRenderers },
  onLogout: () => { clearTokens(); location.assign('/login') },
})

createRoot(document.getElementById('root')!).render(<app.App />)
```

## The injectable seams

Everything the boot layer reads from the outside is an interface, so the real
API (later) and phase-3's demo-kit both satisfy the same contracts with no
change here:

- `ModulesSource.getLicensedModules(): Promise<LicensedModule[]>`
- `UserSource.getUser(): Promise<PrivilegeUser>`
- `BlueprintSource.getBlueprint(ref): Promise<ModuleBlueprint>`
- `ComposerConfig` — app-supplied template `renderers` + optional `createData`.

### `LicensedModule` — v5 → React mapping

`LicensedModule` keeps v5's `GET bootstrap` entry shape (`code` / `name` /
`basemodule` / `meta` / `menu`) so the real API needs no translation. The one
structural change: v5's `menu.component` was a **string** resolved through a
static component manifest — a missing entry made v5 **silently skip** the route.
Here the `implementations` map (keyed on `code`) is the React equivalent of that
manifest, and a missing implementation is a **LOUD dev warning + skip**, never
silent.

## Decision #23 — licensed-only registration

`resolveTenantModules` iterates the **licensed** array and reads
`implementations[code]` **only for a licensed code**. An unlicensed
implementation present in the map is therefore never referenced — its lazy
`routes` loader is never touched, so its bundler chunk is never requested. This
is asserted by a spy test (an unlicensed loader that must never be called).

## Composer (low-code) modules

When an implementation declares `composerModule: { blueprintRef }`, v5-kit
synthesizes the route, resolves the blueprint via `blueprintSource` (cached
under the per-tenant `[tenant, …]` queryKey, `static` class), and renders it
through v5-composer's `<ComposedModule>` (blueprint path). App-supplied
`composer.renderers` provide the actual template components; until one is wired,
`ComposedModule` shows its marked placeholder. Bespoke implementations just
provide `routes`. `blueprintSource` is required only if any implementation is
low-code (otherwise a composer module warns + skips).

## Privilege gating — the `v-privilege` rewrite

`usePrivilege(required)` / `<Privileged required fallback?>` preserve v5's exact
semantics:

- `required` is ANDed (`every` must be present);
- a non-`'user'` `userType` **bypasses** all checks;
- otherwise `required.every(p => privileges.includes(p))`.

The one deliberate change: v5's directive ran **once at mount** and never
updated. This version is **reactive** — consumers re-evaluate whenever the
context value changes. `<Privileged>` renders `null` by default when denied (the
subtree is never mounted), not v5's `display:none`; pass `fallback` to render
something instead.

> **UI gating is UX only (decision #23).** These checks decide what UI to show,
> never what a user may *do*. Real authorization is enforced server-side — a
> client that forges privileges only changes what its own screen renders, not
> what the API accepts.

## Query-cache hygiene (perf rule 8 / decision #23)

Tenant-scoped queries **must** prefix their queryKey with the tenant id —
`[tenant, …rest]`. `wipeTenantCache(queryClient, tenant)` then drops exactly that
tenant's queries (TanStack's default partial/prefix matching) and nothing else.
The returned `V5App.logout()` wires this to the logout contract: it wipes this
tenant's cache, then runs the app's `onLogout` callback.

## Public API

`bootstrapTenant` · `resolveTenantModules` · `applyTenantTheme` ·
`PrivilegeProvider` · `Privileged` · `usePrivilege` · `wipeTenantCache` ·
`ComposerModuleView` · `makeComposerRouteLoader` · plus the types
(`LicensedModule`, `ModulesSource`, `UserSource`, `BlueprintSource`,
`ModuleImplementation`, `ModuleImplementationMap`, `TenantRuntimeConfig`,
`ComposerConfig`, `BootstrapTenantConfig`, `PrivilegeUser`, `ResolvedTenant`,
`V5App`).
