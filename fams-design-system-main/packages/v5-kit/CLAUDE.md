# `@fams/v5-kit` — CLAUDE.md

> Pointers + deltas only. Constitution: root `CLAUDE.md`. Full contract + decision #23 detail: `README.md`.

`@fams/v5-kit` is the **v5-tier boot layer** — the React rewrite of v5's Vue boot layer. One async `bootstrapTenant(config)` turns a tenant's **licensed-module list** into the `@fams/skeleton-kit` module contract (licensed-only route registration, decision #23), wires the composer blueprint path, applies per-tenant runtime theming, provides reactive privilege gating (`<Privileged>`/`usePrivilege`), and per-tenant query-cache hygiene (`wipeTenantCache`/`logout`).

## Tier + boundary rules
- **v5 tier, product-aware.** MAY import `@fams/skeleton-kit`/`@fams/v5-composer`/`@fams/ui-kit`; the core tier NEVER imports this (decision #13, lint-enforced). Its `eslint.config.js` self-contained-config comment is explicit: it deliberately imports sibling v5-tier packages, so it does NOT inherit the core-tier ban — only the decision #7 Radix ban applies.
- **Licensed-only registration is the whole point (decision #23):** `resolveTenantModules` reads `implementations[code]` only for a licensed code — an unlicensed implementation present in the map must never be referenced, and its lazy `routes` loader must never be touched. This is asserted by a spy test — don't weaken it.
- **UI gating is UX only.** `<Privileged>`/`usePrivilege` decide what UI to show, never what a user may *do* — real authorization is server-side, per-endpoint, on the untouched v5 API. Don't let a privilege check anywhere in this package start standing in for a server check.
- Every data seam (modules/user/blueprints) is injectable — real API later, `@fams/demo-kit` today. Never hardcode a data source.

## Key entry points (`src/index.ts`, single flat barrel)
- `bootstrapTenant`/`resolveTenantModules`/`applyTenantTheme` — tenant boot.
- `PrivilegeProvider`/`Privileged`/`usePrivilege` — the `v-privilege` rewrite.
- `wipeTenantCache` — per-tenant query-cache hygiene on logout.
- `ComposerModuleView`/`makeComposerRouteLoader` — composer blueprint route wiring.
- `AppsProvider` (+ `AppsProviderProps`) — apps-vs-modules navigation: outer rail = the tenant's `applications[]`, inner rail = the active app's modules.
- Types: `LicensedModule(Meta|Menu)`, `ModulesSource`/`UserSource`/`BlueprintSource`, `ModuleImplementation(Map)`, `TenantRuntimeConfig`, `BootstrapTenantConfig`, `ResolvedTenant`, `V5App`.

## Adding to this package
1. New tenant-boot capability must preserve the licensed-only invariant — if it touches module resolution, add/extend a spy test proving unlicensed implementations are never referenced.
2. New injectable seam → define it as a `*Source` interface (follow `ModulesSource`/`UserSource`/`BlueprintSource`), never a concrete fetch call.
3. Export from `src/index.ts` (no secondary barrel here).

## Tests to run
- `pnpm --filter @fams/v5-kit test` · `typecheck` · `lint`.
- vitest.setup.ts stubs `localStorage`, `globalThis.scrollTo` (jsdom throws on TanStack Router scroll restoration), and `matchMedia` — reuse, don't re-stub.
- The demo app (`@fams/demo-kit` + this package's injectable seams) is the integration check for bootstrap changes.

## Definition of done
A change here is done when: the licensed-only invariant still holds (spy test green), privilege gating is still UX-only (no server-trust creep), tests/typecheck/lint are green, and any new seam is injectable, not hardcoded.

## Links
- `packages/v5-kit/README.md` (decision #23 walkthrough) · root `CLAUDE.md` · `docs/knowledge-base/decisions.md` #13, #23.
