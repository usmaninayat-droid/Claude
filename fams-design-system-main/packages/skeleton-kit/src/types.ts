import type { AnyRoute, AnyValidator, LazyRoute, Validator } from '@tanstack/react-router'
import type { ReactNode } from 'react'

/**
 * How a module hands its route subtree to the skeleton. It is a function that
 * returns a promise of a TanStack `LazyRoute` (produced by `createLazyRoute`).
 * Because the body is a dynamic `import()`, each module's route code lands in
 * its own bundler chunk and is fetched only when that route is navigated to.
 *
 * Convention (per module folder):
 *   // modules/<id>/route.tsx
 *   import { createLazyRoute } from '@tanstack/react-router'
 *   export const Route = createLazyRoute('<navEntry.path>')({ component: Page })
 *
 *   // modules/<id>/index.ts  (tiny, eagerly loaded)
 *   export const <id>Module: FamsModule = {
 *     id: '<id>',
 *     navEntry: { label: '…', path: '<navEntry.path>' },
 *     routes: () => import('./route').then((m) => m.Route),
 *   }
 */
export type ModuleRouteLoader = () => Promise<LazyRoute<AnyRoute>>

/**
 * TanStack Router's `validateSearch` shape (`Validator<Record<string, unknown>, TSearch>` —
 * a plain parse function, a `{ parse }` object, a validator adapter, or a
 * Standard Schema). Re-exported under this package's naming rather than
 * re-exporting `@tanstack/react-router`'s generic `Validator` directly, so the
 * module contract reads as skeleton-kit vocabulary.
 *
 * `validateSearch` is evaluated EAGERLY by the router (it runs before/while a
 * route's `.lazy()` chunk is fetched, as part of matching the URL), unlike the
 * route's component. That's why it lives on the route entry itself rather
 * than inside the lazily-loaded module — see `ModuleRouteEntry`/`FamsModule`.
 *
 * Use this to type the validator FUNCTION YOU AUTHOR (e.g.
 * `const validateSearch: ModuleSearchValidator<TicketsSearch> = (search) => {...}`)
 * so its output is checked against the shape you intend. `ModuleRouteEntry`/
 * `FamsModule` themselves store it as the erased `AnyValidator` — the same
 * "erase to Any___ once it leaves the module's own file" pattern this
 * package already uses for `routes` (erased to `LazyRoute<AnyRoute>`), since
 * the module list is a runtime-heterogeneous array, not a single static
 * route tree TypeScript can carry one shared `TSearch` through.
 */
export type ModuleSearchValidator<TSearch = Record<string, unknown>> = Validator<
  Record<string, unknown>,
  TSearch
>

/**
 * One additional route contributed by a module, beyond the single route at
 * `navEntry.path` (see {@link FamsModule.additionalRoutes}). Each entry gets
 * its own path, its own independently-lazy-loaded component (a separate
 * bundler chunk — the same `.lazy(loader)` mechanism as the primary route),
 * and may declare its own `validateSearch`.
 *
 * Convention: give the entry's `path` its own `route.tsx` file
 * (`createLazyRoute('<path>')({ component })`) so it code-splits
 * independently from both the module's primary route and any sibling
 * `additionalRoutes` entries — that per-route code-splitting is the entire
 * point of this field (LIST and DETAIL must not share a chunk).
 */
export interface ModuleRouteEntry {
  /** Full route path (as passed to TanStack's `createRoute({ path })`), e.g. `/tickets/$ticketId`. */
  path: string
  /** Lazily-loaded route subtree for THIS path — see {@link ModuleRouteLoader}. */
  routes: ModuleRouteLoader
  /** Optional eager search-param validation for THIS path. See {@link ModuleSearchValidator}. */
  validateSearch?: AnyValidator
}

/** A single navigation entry derived from a module. Product-agnostic. */
export interface NavEntry {
  /** Human-readable label shown in the app nav. */
  label: string
  /** Optional pre-rendered icon node (e.g. `<Home />`). */
  icon?: ReactNode
  /** Route path this entry links to; also the module's route path. */
  path: string
  /** Sort order within the nav; lower comes first. Falls back to declaration order. */
  order?: number
  /**
   * The module's route renders WITHOUT the app shell chrome (no rail, no top
   * bar) — a full-screen surface such as a wall-display command center or an
   * embedded cockpit. The nav entry itself still renders normally (the rail
   * links TO the surface; the surface owns its own way back). Product-agnostic:
   * the skeleton's default `AppShell` and any `shellComponent` override decide
   * what "no chrome" means for themselves. Optional and additive — a module
   * that never sets it behaves byte-identically to before this field existed.
   */
  fullScreen?: boolean
}

/**
 * The module contract. v1 (LOCKED) is exactly four fields: `id`, `routes`,
 * `navEntry`, `requiredPrivileges`. v1.1 adds two OPTIONAL fields —
 * `validateSearch` and `additionalRoutes` — purely additive: a v1 module
 * (the single `routes` loader registered at `navEntry.path`, nothing else)
 * type-checks and behaves identically with zero changes. Extend only by
 * adding further optional fields; never change the meaning of an existing one.
 *
 * `requiredPrivileges` is typed but intentionally unused in v1/v1.1 — access
 * gating is a later phase's job (the product kit built on top); the core
 * skeleton stays product-agnostic.
 */
export interface FamsModule {
  /** Stable unique id for the module. */
  id: string
  /** Lazily-loaded route subtree for the module's PRIMARY route (registered at `navEntry.path`) — see {@link ModuleRouteLoader}. */
  routes: ModuleRouteLoader
  /** Nav entry derived into the app shell. */
  navEntry: NavEntry
  /** Privileges a future gating layer will require; unused in v1/v1.1. */
  requiredPrivileges?: string[]
  /**
   * Optional eager search-param validation for the PRIMARY route
   * (`navEntry.path`). Omit for a route with no search params — this is a
   * pure addition; a v1 module never sets it. See {@link ModuleSearchValidator}.
   */
  validateSearch?: AnyValidator
  /**
   * Optional ADDITIONAL routes beyond the single primary route at
   * `navEntry.path` — e.g. a `/$id` detail view nested under a list. Each
   * entry is registered and code-split independently (its own `.lazy()`
   * chunk, its own optional `validateSearch`). Omit for a module with exactly
   * one route — this is a pure addition; a v1 module never sets it.
   */
  additionalRoutes?: ModuleRouteEntry[]
}
