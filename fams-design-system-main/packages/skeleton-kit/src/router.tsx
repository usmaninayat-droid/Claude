import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  type AnyRoute,
  type ErrorComponentProps,
  type LazyRoute,
  type RouterHistory,
} from '@tanstack/react-router'
import { type ComponentType, type ReactNode } from 'react'
import { DefaultErrorFallback } from './error-boundary'
import { AppShell } from './shell'
import type { FamsModule, ModuleRouteEntry, ModuleRouteLoader } from './types'

/** A route component must be a function component (TanStack rejects class components). */
export type RouteComponentFn = () => ReactNode
export type RouteErrorComponentFn = (props: ErrorComponentProps) => ReactNode

/** Route-level error component (TanStack `errorComponent`) using the token fallback. */
export function DefaultRouteErrorComponent({ error, reset }: ErrorComponentProps) {
  return <DefaultErrorFallback error={error} reset={reset} />
}

function DefaultIndex() {
  return null
}

// LOAD-BEARING: must be the exact `typeof process !== 'undefined' && process.env.NODE_ENV === 'production'`
// form, with NO optional chain between `process.env` and `NODE_ENV`. Vite/esbuild's `define`
// substitution and Vite's own `code.includes("process.env.NODE_ENV")` gate both match this literal
// AST shape only; `process.env?.NODE_ENV` is left untouched by the bundler and always evaluates to
// `undefined` in a browser (no global `process`), which would make this return false in production —
// i.e. the guard would throw on drift in production instead of being dead-code-eliminated. This is
// the same form TanStack's own source uses for the same reason.
function isProductionEnv(): boolean {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'production'
}

/**
 * Dev-only loud guard for the `navEntry.path` ↔ `createLazyRoute(id)` coupling.
 *
 * The two are convention-only, declared in separate files: `buildRouter` below
 * registers the route using `module.navEntry.path`, while the module's own
 * `route.tsx` calls `createLazyRoute('<path>')`. TanStack Router's `.lazy()`
 * discards the id it's handed once the chunk resolves (`loadRouteChunk` in
 * `@tanstack/router-core` destructures `id` out of `lazyRoute.options` and
 * throws it away), so a mismatch is never caught by the router itself — the
 * wrong module's component would just silently render under the registered
 * path, with no error at any point.
 *
 * This wraps each module's lazy loader so drift throws loudly the moment the
 * chunk resolves (i.e. on first navigation to that route) — in dev only. In
 * production the wrap is skipped entirely: bundlers replace
 * `process.env.NODE_ENV` with a literal and dead-code-eliminate the branch,
 * the same mechanism React's own dev warnings rely on, so there is zero
 * runtime cost and zero console noise in a production build.
 */
export function withNavRouteDriftGuard(module: FamsModule): ModuleRouteLoader {
  if (isProductionEnv()) return module.routes
  return async () => {
    const lazyRoute = await module.routes()
    const actualId = lazyRoute.options.id
    if (actualId !== module.navEntry.path) {
      throw new Error(
        `[@fams/skeleton-kit] Route drift in module "${module.id}": navEntry.path is ` +
          `"${module.navEntry.path}" but its createLazyRoute(...) id is "${actualId}". ` +
          `These must be the exact same string — fix the module's navEntry.path or its ` +
          `route file's createLazyRoute('${module.navEntry.path}') call.`,
      )
    }
    return lazyRoute
  }
}

/**
 * Dev-only loud guard for one `additionalRoutes[]` entry's `path` ↔
 * `createLazyRoute(id)` coupling — the same drift class as
 * {@link withNavRouteDriftGuard} above, generalized to a module's non-primary
 * routes (each entry has its own path + its own lazy loader, independent of
 * `navEntry.path`). See that function's doc comment for the full rationale;
 * this only differs in which path/loader pair it checks and its message.
 */
export function withAdditionalRouteDriftGuard(moduleId: string, entry: ModuleRouteEntry): ModuleRouteLoader {
  if (isProductionEnv()) return entry.routes
  return async () => {
    const lazyRoute = await entry.routes()
    const actualId = lazyRoute.options.id
    if (actualId !== entry.path) {
      throw new Error(
        `[@fams/skeleton-kit] Route drift in module "${moduleId}": additionalRoutes entry path is ` +
          `"${entry.path}" but its createLazyRoute(...) id is "${actualId}". ` +
          `These must be the exact same string — fix the entry's path or its ` +
          `route file's createLazyRoute('${entry.path}') call.`,
      )
    }
    return lazyRoute
  }
}

/** The prop shape every root-shell override must accept. */
export interface ShellComponentProps {
  modules: FamsModule[]
  brandLabel?: string
}

export interface BuildRouterOptions {
  modules: FamsModule[]
  brandLabel?: string
  /** Component rendered at the index route `/`. */
  indexComponent?: RouteComponentFn
  /**
   * When set, the app LANDS on this path: the FIRST time `/` is matched (app
   * entry — a cold load or a reload at `/`) the index route redirects there
   * instead of rendering `indexComponent`. Every later navigation to `/`
   * renders `indexComponent` normally, so the index surface stays reachable
   * from the chrome that links to it. Product-agnostic: the caller resolves
   * whatever landing policy it has (e.g. a tenant's configured landing
   * module) down to a plain route path. Unset — the default — leaves `/`
   * rendering `indexComponent` from the first frame.
   */
  indexRedirectTo?: string
  /** Route-level error component override. */
  routeErrorComponent?: RouteErrorComponentFn
  /** History override (e.g. a memory history for tests). */
  history?: RouterHistory
  /**
   * Path prefix the app is served under, e.g. `/MME-FRMS-MVP/`. Stripped
   * before route matching and prepended to generated links. Defaults to
   * `globalThis.__FAMS_BASE_PATH__` when the host declares one; unset (or `/`)
   * means the app is served at the origin root.
   */
  basepath?: string
  /**
   * Override the root-route chrome rendered around `<Outlet/>`. Defaults to
   * the package's own minimal `AppShell`. Product-agnostic: this package
   * doesn't know or care what the override renders — only that it accepts
   * `{ modules, brandLabel }`, the same contract the default shell uses.
   */
  shellComponent?: ComponentType<ShellComponentProps>
}

/**
 * Assemble a TanStack router from the module contract. The route tree itself is
 * built eagerly (just path config + optional `validateSearch`, which TanStack
 * Router evaluates eagerly as part of matching), but each route's component
 * code is attached via `.lazy(...)` — a dynamic import — so it is code-split
 * into its own chunk and fetched only on navigation.
 *
 * Each module contributes one PRIMARY route at `navEntry.path` (v1's single
 * route, unchanged) plus, optionally, any `additionalRoutes` entries (v1.1) —
 * e.g. a detail view alongside a list. Every route — primary or additional —
 * gets its own independent `.lazy()` chunk, so a list and its detail view
 * never share a bundle.
 */
export function buildRouter(options: BuildRouterOptions) {
  const Shell = options.shellComponent ?? AppShell
  const rootRoute = createRootRoute({
    component: () => <Shell modules={options.modules} brandLabel={options.brandLabel} />,
    errorComponent: options.routeErrorComponent ?? DefaultRouteErrorComponent,
  })

  const redirectTo = options.indexRedirectTo
  // LANDING, not a permanent rewrite: the redirect fires once, on the first
  // match of `/`. Redirecting on EVERY match would make the index surface
  // unreachable — the chrome that navigates to `/` (logo click, the app
  // switcher's "Home") would bounce straight back — which is a different
  // (and much bigger) change than choosing where the app opens.
  let landed = false
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: options.indexComponent ?? DefaultIndex,
    ...(redirectTo && redirectTo !== '/'
      ? {
          beforeLoad: () => {
            if (landed) return
            landed = true
            throw redirect({ to: redirectTo, replace: true })
          },
        }
      : {}),
  })

  const moduleRoutes = options.modules.flatMap((module) => {
    const primaryRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: module.navEntry.path,
      validateSearch: module.validateSearch,
    }).lazy(withNavRouteDriftGuard(module) as () => Promise<LazyRoute<AnyRoute>>)

    const additionalRoutes = (module.additionalRoutes ?? []).map((entry) =>
      createRoute({
        getParentRoute: () => rootRoute,
        path: entry.path,
        validateSearch: entry.validateSearch,
      }).lazy(withAdditionalRouteDriftGuard(module.id, entry) as () => Promise<LazyRoute<AnyRoute>>),
    )

    return [primaryRoute, ...additionalRoutes]
  })

  const routeTree = rootRoute.addChildren([indexRoute, ...moduleRoutes])

  /*
   * DEPLOY BASE PATH. Route paths in the module contract are authored
   * origin-relative (`/live-monitoring`), which is right when the app is served
   * at the origin root. A host served under a subpath — GitHub Pages project
   * pages, a reverse proxy — must tell the router to strip that prefix before
   * matching, or every URL is a not-found.
   *
   * The host declares it by setting `globalThis.__FAMS_BASE_PATH__` before boot
   * (the demo app derives it from Vite's `import.meta.env.BASE_URL`). A global
   * rather than an option because every layer between the entry point and this
   * function is deploy-agnostic and has no business forwarding it. An explicit
   * `options.basepath` still wins, and '/' is the same as unset.
   */
  const declaredBase = (globalThis as { __FAMS_BASE_PATH__?: string }).__FAMS_BASE_PATH__
  const basepath = options.basepath ?? (declaredBase && declaredBase !== '/' ? declaredBase : undefined)

  return createRouter({
    routeTree,
    defaultErrorComponent: options.routeErrorComponent ?? DefaultRouteErrorComponent,
    ...(basepath ? { basepath } : {}),
    ...(options.history ? { history: options.history } : {}),
  })
}

export type FamsRouter = ReturnType<typeof buildRouter>
