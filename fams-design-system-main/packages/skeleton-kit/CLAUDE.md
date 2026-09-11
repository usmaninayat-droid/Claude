# `@fams/skeleton-kit` — CLAUDE.md

> Pointers + deltas only. Constitution: root `CLAUDE.md`. Full contract: `README.md`.

`@fams/skeleton-kit` is the **generic app-boot layer** every FAMS React app starts from: one `createFamsApp(config)` call wires TanStack Router (per-module lazy code-splitting), TanStack Query defaults (per-class `gcTime`), theming bootstrap (`data-theme`/`data-tenant`), and root error boundaries. It sits ABOVE `@fams/ui-kit`/`@fams/tokens`.

## Tier + boundary rules
- **Core tier, product-agnostic** — carries NO product vocabulary; product-specific kits (`@fams/v5-kit`) build on top of it.
- **Never imports `@fams/v5-*`** (decision #13, `no-restricted-imports` boundary-linted — failing the build, not just a style nit).
- No `@fams/tokens` package.json dependency — tokens are consumed as compiled CSS (`dist/tokens.css`/`dist/theme.css`) at runtime by the consuming APP (which loads them and sets `data-theme`/`data-tenant`), not imported by this package. Its only real runtime dependency besides TanStack Router/Query is React.

## Key entry points (`src/index.ts`, single flat barrel, no subpaths)
- `createFamsApp` + `FamsAppConfig`/`FamsApp` — the boot call.
- `FamsModule`/`NavEntry`/`ModuleRouteLoader` — the module contract every consuming app implements. v1 (locked: `id`/`routes`/`navEntry`/`requiredPrivileges`) is unchanged; v1.1 adds two OPTIONAL fields — `validateSearch` (eager, on the primary route) and `additionalRoutes: ModuleRouteEntry[]` (more routes beyond `navEntry.path`, e.g. a detail view alongside a list — each independently lazy-loaded, each with its own optional `validateSearch`). Full contract + worked list+detail example: README.md.
- `buildRouter`, `AppShell`/`deriveNavEntries` — routing + shell wiring. `withNavRouteDriftGuard`/`withAdditionalRouteDriftGuard` are the dev-only path↔`createLazyRoute(id)` drift checks for the primary route and `additionalRoutes` entries respectively.
- `createFamsQueryClient`, `queryClassOptions`/`gcTimeForClass`/`DEFAULT_GC_TIMES` — the `static`/`session`/`volatile` query-class model.
- `useTheme`/`setTheme`/`bootstrapTheme`/`resolveInitialTheme` — theming bootstrap.
- `RootErrorBoundary`/`DefaultErrorFallback`.

## Adding to this package
1. New boot-layer capability must stay product-agnostic — if it needs v5 vocabulary (blueprints, licensed modules, personas), it belongs in `@fams/v5-kit` instead, not here.
2. Export from `src/index.ts` (this package has no secondary barrel — everything is public API).
3. Add/extend a colocated `*.test.ts(x)` — this package tests boot machinery, not visual states, so no axe sweep here; a11y is the responsibility of the components it boots (`@fams/ui-kit`).

## Tests to run
- `pnpm --filter @fams/skeleton-kit test` · `typecheck` · `lint`.
- vitest runs jsdom with an explicit `http://localhost/` origin (localStorage needs a real origin) and a `vitest.setup.ts` stubbing `localStorage`/`matchMedia` — reuse those stubs rather than re-mocking per test.
- `workshop/skeleton-example` (`@fams/skeleton-example`, port 6200) is the live integration check for `createFamsApp` + per-module lazy chunking — run it if you change the boot contract.

## Definition of done
Boot-contract changes are done when: the change is product-agnostic (no v5/product vocabulary leaked in), tests + typecheck + lint are green, and `workshop/skeleton-example` still boots.

## Links
- `packages/skeleton-kit/README.md` (full `FamsModule` contract, query-class table) · root `CLAUDE.md` · `docs/knowledge-base/decisions.md` #13.
