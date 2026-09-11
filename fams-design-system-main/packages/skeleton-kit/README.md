# @fams/skeleton-kit

The generic app **boot layer** every FAMS React app starts from — folder
convention, routing + per-module lazy loading, query defaults, theming
bootstrap, and error boundaries. One `createFamsApp(config)` call wires it all.

**Tier: core (product-agnostic).** It sits *above* `@fams/ui-kit` / `@fams/tokens`
in the layer cake and may depend on `@fams/tokens` (CSS) + React. It contains
**no product vocabulary** — no business tenancy, licensing, or product-specific
concepts. Product-specific kits (a later phase) build on top of it; nothing
product-specific ever flows back down into this package.

## Install / boot

```ts
// main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createFamsApp } from '@fams/skeleton-kit'

// The APP owns the token CSS imports (skeleton-kit only sets the attributes
// these stylesheets key off of):
import '@fams/tokens/theme.css'
import '@fams/tokens/tenants.css'
import '@fams/tokens/fonts.css'

import { dashboardModule } from './modules/dashboard'
import { settingsModule } from './modules/settings'

const { App } = createFamsApp({
  modules: [dashboardModule, settingsModule],
  brandLabel: 'My App',
  theme: { tenant: 'fams' },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

> **Consuming from outside this monorepo:** install this package with
> `link:`, not `file:` — see § Consuming from another workspace below and
> `docs/PUBLISHING.md` § 5 for why (`catalog:` refs that only resolve inside
> this workspace, and the exact pnpm error a `file:` install hits).

## Consuming from another workspace

**This section is the canonical source for the React-singleton contract.**
`docs/PUBLISHING.md` § 5 and `packages/v5-kit/README.md` link here rather than
restating it — if you're updating the singleton list or the alias block,
update it here only.

The React-singleton alias block in `workshop/skeleton-example/vite.config.ts`
is necessary but **not sufficient** once `@fams/skeleton-kit` is
consumed from a genuinely different workspace — a separate pnpm/npm project
vendoring this repo (e.g. via a git subtree), rather than this monorepo's own
`workshop/*` apps, which already share one `node_modules`. Any package that
owns React context or hook state must resolve to exactly **one** copy across
the whole dependency graph, or you get `Invalid hook call` / a null hook
dispatcher: the app's copy of `react-dom` renders using one dispatcher
instance, while a second copy of the context/hook-owning package — pulled in
because the consuming workspace's resolver hoisted or bundled its own — reads
or writes state against an instance that was never mounted into that tree.

### What to install

`react`, `react-dom`, `@tanstack/react-router`, and `@tanstack/react-query`
are **all** `peerDependencies` of `@fams/skeleton-kit` (and of `@fams/v5-kit`,
which builds on it) — none of them are installed for you as a transitive
`dependency`. An external consumer must install all four itself, at versions
compatible with this package's declared peer ranges (`react`/`react-dom`
`^19`; `@tanstack/react-router`/`@tanstack/react-query` pinned by this repo's
`pnpm-workspace.yaml` catalog — check `packages/skeleton-kit/package.json`
`peerDependencies` for the exact range this version was built against):

```bash
pnpm add react react-dom @tanstack/react-router @tanstack/react-query
```

This is a deliberate consequence of the fix below, not a new chore: making a
package a `peerDependency` is exactly what stops a second, private copy from
ever being installed underneath `@fams/skeleton-kit` in the first place — the
alias/dedupe block after this section is the belt-and-suspenders for bundlers
that would otherwise still let a duplicate slip in (a nested transitive
version, a hoisting quirk, a lockfile with more than one resolved version).

**Full singleton list** for an app built on this skeleton:

| Package | Why it must be single-copy |
| --- | --- |
| `react` / `react-dom` | The hook dispatcher — the classic `Invalid hook call`. |
| `react/jsx-runtime`, `react/jsx-dev-runtime` | Same React instance, different entry point. |
| `@tanstack/react-router` | `RouterProvider` puts the router in React context; `useRouter`/`useMatches`/`useNavigate`/etc. read it via a `useStore` hook bound to that specific package instance. |
| `@tanstack/react-query` | `QueryClientProvider` puts the `QueryClient` in React context; `useQuery`/`useMutation`/etc. read it the same way. |

`workshop/skeleton-example/vite.config.ts` is the reference implementation —
copy its `resolve.dedupe` + `resolve.alias` block into your own Vite config:

```ts
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom', '@tanstack/react-router', '@tanstack/react-query'],
    alias: [
      { find: /^react$/, replacement: require.resolve('react') },
      { find: /^react-dom$/, replacement: require.resolve('react-dom') },
      { find: /^react\/jsx-runtime$/, replacement: require.resolve('react/jsx-runtime') },
      { find: /^react\/jsx-dev-runtime$/, replacement: require.resolve('react/jsx-dev-runtime') },
      { find: /^@tanstack\/react-router$/, replacement: require.resolve('@tanstack/react-router') },
      { find: /^@tanstack\/react-query$/, replacement: require.resolve('@tanstack/react-query') },
    ],
  },
})
```

Non-Vite bundlers need the equivalent — webpack's `resolve.alias` + a
single resolved copy per package, Metro's `resolver.alias`, etc. The
requirement (one resolved module instance per package, app-wide) is
bundler-agnostic; only the mechanism differs.

**Current package classification, as of this doc:** `react`, `react-dom`,
`@tanstack/react-router`, and `@tanstack/react-query` are **all**
`peerDependencies` of `@fams/skeleton-kit` — a consumer supplies its own copy
of every one of them, consistent with the singleton list above. (History: the
two TanStack packages were plain `dependencies` until a team consuming this
DS from a separate workspace hit `Invalid hook call` from a second, private
copy — the alias/dedupe block above was already the documented fix for that
gap; the peer-dependency change closes it at the install-graph level too, so
a duplicate is structurally harder to end up with in the first place, not
just aliased away after the fact.) Internally, this monorepo's own
build/typecheck/test still resolve both TanStack packages via this package's
`devDependencies` (`catalog:`-pinned) — that's an internal build-time detail
and does not change what an external consumer must install (see § What to
install above). `@fams/v5-kit`, which sits on top of this package and imports
both TanStack packages directly, carries the identical classification for the
identical reason. See `docs/PUBLISHING.md` § 5 for the
`catalog:`/`file:`/`link:` mechanics of installing this package from outside
the monorepo in the first place.

## The module contract (LOCKED, v1)

A module is exactly these four fields:

```ts
interface FamsModule {
  id: string                    // stable unique id
  routes: ModuleRouteLoader     // () => Promise<LazyRoute> — a dynamic import
  navEntry: {                   // one derived nav item
    label: string
    icon?: ReactNode
    path: string
    order?: number
  }
  requiredPrivileges?: string[] // typed but UNUSED in v1 (gating is a later phase)
}
```

Routes + nav entries are **derived from this contract**: `deriveNavEntries()`
builds the nav (sorted by `order`, declaration order as the fallback), and
`buildRouter()` registers one route per module under the shared shell.

### v1.1: `validateSearch` + `additionalRoutes` (purely additive)

v1 above still type-checks and behaves identically with zero changes — every
existing module keeps working. v1.1 adds two **optional** fields for modules
that need more than a single route:

```ts
interface FamsModule {
  id: string
  routes: ModuleRouteLoader   // unchanged: the PRIMARY route, at navEntry.path
  navEntry: NavEntry
  requiredPrivileges?: string[]

  // NEW, both optional:
  validateSearch?: AnyValidator          // eager search-param validation for the PRIMARY route
  additionalRoutes?: ModuleRouteEntry[]  // more routes beyond navEntry.path (e.g. a detail view)
}

interface ModuleRouteEntry {
  path: string                  // full route path, e.g. '/tickets/$ticketId'
  routes: ModuleRouteLoader     // its own independently-lazy-loaded component
  validateSearch?: AnyValidator // its own optional search-param validation
}
```

Why this shape:

- **Additive, not a replacement.** `routes`/`navEntry.path` — the v1 single
  route — are untouched. `validateSearch` and `additionalRoutes` are new
  optional fields; a module that omits both is exactly a v1 module.
- **Every route is independently lazy.** The primary route (`routes`) and
  each `additionalRoutes[]` entry (`entry.routes`) is its own
  `() => import('./…')` loader, so `buildRouter()` attaches each via its own
  `.lazy(...)` — its own bundler chunk. A LIST route and its DETAIL route
  never share a chunk, and navigating between them fetches only the one that
  changed.
- **`validateSearch` runs eagerly, not inside the lazy chunk.** TanStack
  Router evaluates `validateSearch` as part of matching the URL, before (or
  while) the route's lazy component chunk is fetched — so it lives on the
  route entry itself (`FamsModule.validateSearch` / `ModuleRouteEntry.validateSearch`),
  a small, eagerly-available function, not behind the dynamic `import()`.
- **A wrong declaration is a compile error.** `ModuleRouteEntry.path` is a
  required `string`; a module that forgets to give an `additionalRoutes`
  entry a `routes` loader, or a `validateSearch` that doesn't return an
  object, fails to type-check.

## Multiple routes per module (list + detail)

The single-`LazyRoute`-at-`navEntry.path` v1 form cannot express a LIST route
plus a DETAIL route with independent code-splitting, loaders, or page titles.
`additionalRoutes` fixes that — worked example:

```
src/modules/tickets/
  index.ts        # the FamsModule: primary (list) route + additionalRoutes (detail)
  list-route.tsx  # createLazyRoute('/tickets')({ component: TicketsListPage })
  detail-route.tsx  # createLazyRoute('/tickets/$ticketId')({ component: TicketDetailPage })
```

```ts
// modules/tickets/index.ts
import type { FamsModule } from '@fams/skeleton-kit'

export const ticketsModule: FamsModule = {
  id: 'tickets',
  navEntry: { label: 'Tickets', path: '/tickets', order: 3 },
  validateSearch: ticketsValidateSearch, // see § validateSearch below
  routes: () => import('./list-route').then((m) => m.Route), // the LIST route
  additionalRoutes: [
    {
      path: '/tickets/$ticketId', // the DETAIL route — its own path, own chunk
      routes: () => import('./detail-route').then((m) => m.Route),
    },
  ],
}
```

```ts
// modules/tickets/list-route.tsx
import { createLazyRoute } from '@tanstack/react-router'
export const Route = createLazyRoute('/tickets')({ component: TicketsListPage })

// modules/tickets/detail-route.tsx
import { createLazyRoute } from '@tanstack/react-router'
export const Route = createLazyRoute('/tickets/$ticketId')({ component: TicketDetailPage })
```

Both routes are direct siblings registered under the shared root shell (the
same way every module route already is in v1) — `additionalRoutes` entries
are not required to nest under the primary route in the route tree, so a
detail path can be any string TanStack Router accepts, param syntax
(`$ticketId`) included. The `navEntry.path` ↔ `createLazyRoute(id)` drift
guard (see below) applies to every `additionalRoutes` entry too, not just the
primary route.

See `workshop/skeleton-example/src/modules/tickets/` for the full reference
implementation (list page, detail page, and the tests exercising navigation
between them).

## `validateSearch`

Declare `validateSearch` on the primary route (`FamsModule.validateSearch`)
or on any `additionalRoutes` entry (`ModuleRouteEntry.validateSearch`) instead
of hand-rolling URL-search-param parsing inside the module's component:

```ts
// modules/tickets/index.ts
import type { FamsModule, ModuleSearchValidator } from '@fams/skeleton-kit'

interface TicketsSearch {
  page: number
}

// `ModuleSearchValidator<TSearch>` is a convenience type for AUTHORING the
// validator function with the output shape checked — the module contract
// itself stores it erased (see that type's doc comment).
const ticketsValidateSearch: ModuleSearchValidator<TicketsSearch> = (search) => {
  const raw = search.page
  const page = raw === undefined ? 1 : Number(raw)
  if (!Number.isInteger(page) || page < 1) {
    throw new Error(`Invalid "page" search param: ${JSON.stringify(raw)}`)
  }
  return { page }
}

export const ticketsModule: FamsModule = {
  id: 'tickets',
  navEntry: { label: 'Tickets', path: '/tickets' },
  validateSearch: ticketsValidateSearch,
  routes: () => import('./list-route').then((m) => m.Route),
}
```

A bad `?page=` value throws (TanStack Router surfaces it as a route error);
a valid one is parsed once, centrally, instead of by every reader of
`location.search`. This accepts anything TanStack's `validateSearch` accepts
— a plain function, a `{ parse }` object, a validator adapter, or a Standard
Schema (e.g. a Zod schema) — same as using it directly with `createRoute`.

**Note on this package's runtime-composed router:** because `buildRouter()`
assembles the route tree from a runtime module array rather than a single
statically-registered route tree, there is no global `Register` type
augmentation for hooks like `useSearch({ from: '/tickets' })` to key off
inside a module's own component. Use `useSearch({ strict: false })` /
`useParams({ strict: false })` there instead (see
`workshop/skeleton-example/src/modules/tickets/list-route.tsx`) — the values
are still the ones `validateSearch` produced, just without the `from`-keyed
static type. This is a pre-existing characteristic of the runtime-composed
router (the same reason path params were already untyped in v1), not
something `additionalRoutes`/`validateSearch` newly introduces.

Deliberately **not** added in this pass (kept out to avoid gold-plating a
contract other teams build on): a `loader` field and `params`
parse/stringify. Both are options `createRoute()` already accepts, and
wiring either through `ModuleRouteEntry`/`FamsModule` the same way
`validateSearch` was would be a small, mechanical follow-up if a consuming
team needs it — they were left out only because typing them precisely against
a runtime-heterogeneous module array is materially more involved than
`validateSearch`, and neither was in this round's minimum bar.

## Folder convention for consuming apps

```
src/
  main.tsx                 # createFamsApp({ modules: [...] })
  modules/
    <id>/
      index.ts             # exports the FamsModule (tiny, eagerly loaded)
      route.tsx            # exports `Route` via createLazyRoute (code-split)
      … module-local components / hooks …
```

Each module folder is a self-contained slice. The `index.ts` is tiny (id + nav
+ a dynamic-import loader); everything heavy lives behind `route.tsx`.

## Per-module lazy loading (code-splitting)

Each module hands its route subtree to the skeleton as a **dynamic import**:

```ts
// modules/dashboard/route.tsx
import { createLazyRoute } from '@tanstack/react-router'
export const Route = createLazyRoute('/dashboard')({ component: DashboardPage })

// modules/dashboard/index.ts
export const dashboardModule: FamsModule = {
  id: 'dashboard',
  navEntry: { label: 'Dashboard', path: '/dashboard' },
  routes: () => import('./route').then((m) => m.Route),
}
```

The route **tree** (path config) is built eagerly; the route **code** is
attached via TanStack Router's `.lazy(module.routes)`. Because `module.routes`
is a dynamic `import()`, the bundler splits each module into its own chunk that
is fetched only when the route is navigated to. Two modules ⇒ two lazy chunks.
The example app additionally enables `@tanstack/router-plugin`
(`autoCodeSplitting: true`) in its Vite config.

### Trap: a lazy route renders nothing until its chunk resolves

`RouterProvider` kicks off `router.load()` for the current location on mount,
but that call is asynchronous, and TanStack Router commits a location's full
match set (root shell + the matched module's lazy component) as one atomic
unit only once everything in it has resolved. Render an app whose initial (or
navigated-to) route is a module route, and query immediately afterward —
**nothing** for that location is on screen yet, not even the otherwise-eager
nav, because the whole commit is waiting on the module's dynamic `import()`.
Every consumer rediscovers this the first time a module route's test renders
empty.

**One-line fix:** `await router.load()` — the router instance is exposed on
the object `createFamsApp` returns (`{ App, router, queryClient }`) — before
asserting on a module route's content. It's idempotent: it resolves once the
in-flight load (including the lazy chunk) settles, whether that load was
triggered by your call or already kicked off by `RouterProvider`'s own mount
effect.

Worked example: the `'renders a lazy module route only after awaiting
router.load()'` test in `workshop/skeleton-example/src/app.test.tsx`.

**This trap is unchanged by `additionalRoutes` — if anything, mind it per
route.** Each `additionalRoutes` entry is its own independent `.lazy()` chunk,
so navigating from a list route to a detail route re-triggers the exact same
"nothing is committed until the load resolves" behavior for the NEW location,
even though the list route (a different match) already resolved. `await
router.load()` after every navigation you assert on, not just after the
initial render — see the list→detail navigation test in
`workshop/skeleton-example/src/modules/tickets/tickets.test.tsx`.

## Theming bootstrap

`createFamsApp` calls `bootstrapTheme()` once, synchronously, before render:

- Writes an **explicit** `data-theme` (`"light"` | `"dark"`) on `<html>` —
  resolved from `localStorage` first, then `prefers-color-scheme`. Always
  explicit (never removed) so the token dark-mode selectors are deterministic.
- Writes `data-tenant` on `<html>` from `config.theme.tenant` (default `fams`).
  This is the generic theming attribute — not a business concept.

`config.theme.defaultTheme`, if set, forces an initial theme instead of
resolving from `localStorage`/`prefers-color-scheme`. Whether it overrides a
previously **stored** user choice, or defers to it, is controlled by
`config.theme.defaultThemeMode`:

| `defaultThemeMode`  | behavior                                                        |
| ------------------- | ---------------------------------------------------------------- |
| `'force'` (default) | `defaultTheme` always wins, even over a stored choice.            |
| `'respect-stored'`   | a stored choice wins; `defaultTheme` only applies when nothing is stored. |

The default (`'force'`) is today's pre-existing behavior, kept unchanged.
**It is a deliberate but still-open product decision** — whether an app
should be able to force a theme onto a returning user who already picked one
is not yet settled (see `docs/BACKLOG.md`). This option makes the choice explicit
and lets a consuming app opt into `'respect-stored'` without a breaking
change, ahead of that decision.

Runtime utilities:

```ts
import { useTheme, setTheme, toggleTheme } from '@fams/skeleton-kit'
const { theme, setTheme, toggleTheme } = useTheme() // 'light' | 'dark'
```

## Query classes (per-class gcTime — performance rule 8)

`createFamsQueryClient()` builds a TanStack `QueryClient` with sensible generic
defaults. Per-query cache retention (`gcTime`) is classified:

| class      | gcTime | for                                    |
| ---------- | ------ | -------------------------------------- |
| `static`   | 24h    | reference data that rarely changes     |
| `session`  | 30m    | stable for the length of a session     |
| `volatile` | 30s    | frequently-changing, short-lived data  |

```ts
import { useQuery } from '@tanstack/react-query'
import { queryClassOptions } from '@fams/skeleton-kit'

useQuery({ queryKey: ['units'], queryFn, ...queryClassOptions('static') })
```

Presets are overridable per-app: `createFamsApp({ query: { gcTimes: { volatile: 5000 } } })`.

## Error boundaries

- A **root** error boundary (`RootErrorBoundary`) wraps the whole app with a
  token-styled fallback (`DefaultErrorFallback`).
- A **route-level** default error component (`DefaultRouteErrorComponent`) is
  wired into the router.

Both are overridable: `createFamsApp({ errorFallback, routeErrorComponent })`.

## Public API

`createFamsApp` · `FamsAppConfig` · `FamsApp` · `FamsModule` · `NavEntry` ·
`ModuleRouteLoader` · `ModuleRouteEntry` · `ModuleSearchValidator` ·
`buildRouter` · `withNavRouteDriftGuard` · `withAdditionalRouteDriftGuard` ·
`deriveNavEntries` · `AppShell` · `DefaultRouteErrorComponent` ·
`createFamsQueryClient` · `queryClassOptions` · `gcTimeForClass` ·
`DEFAULT_GC_TIMES` · `useTheme` · `setTheme` · `getTheme` · `toggleTheme` ·
`bootstrapTheme` · `resolveInitialTheme` · `RootErrorBoundary` ·
`DefaultErrorFallback`.
