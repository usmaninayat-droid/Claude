/**
 * shell.axe.test.tsx — automated axe-core sweep for `V5AppShell`.
 *
 * `V5AppShell` composes `@fams/ui-kit`'s already axe-audited `AppShell` /
 * `SideNav` / `TopNav` (covered by `packages/ui-kit/src/a11y.axe.test.tsx`), so
 * this sweep exists to catch wiring mistakes in THIS package — e.g. a nav item
 * losing its accessible name through the `renderItem` `Link` bridge — not to
 * re-audit the primitives themselves.
 *
 * Same rule config as ui-kit's sweep, for the same reasons:
 * - `color-contrast` disabled: jsdom has no layout/paint engine.
 * - `region` disabled: no routed page content is mounted under `<Outlet/>` in
 *   this fixture, so "all content contained by landmarks" doesn't apply.
 */
import { describe, expect, it } from 'vitest'
import { render, waitFor, screen } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { configureAxe } from 'vitest-axe'
// Deep import: the package's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same workaround as ui-kit's sweep).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { fireEvent } from '@testing-library/react'
import type { FamsModule } from '@fams/skeleton-kit'
import { AppsProvider } from './apps'
import { V5AppShell } from './shell'

expect.extend({ toHaveNoViolations })

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Assertion<T> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
  },
})

const modules: FamsModule[] = [
  { id: 'assets', navEntry: { label: 'Assets', path: '/assets' }, routes: () => Promise.resolve({} as never) },
  { id: 'settings', navEntry: { label: 'Settings', path: '/settings' }, routes: () => Promise.resolve({} as never) },
]

function buildTestRouter(initialPath: string) {
  const rootRoute = createRootRoute({
    component: () => <V5AppShell modules={modules} brandLabel="Acme" />,
  })
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => null })
  const moduleRoutes = modules.map((m) =>
    createRoute({ getParentRoute: () => rootRoute, path: m.navEntry.path, component: () => null }),
  )
  const routeTree = rootRoute.addChildren([indexRoute, ...moduleRoutes])
  return createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [initialPath] }) })
}

describe('V5AppShell — axe sweep', () => {
  it('has no violations at the index route (bare launch-pad host, no chrome)', async () => {
    const router = buildTestRouter('/')
    const { container } = render(<RouterProvider router={router} />)
    await waitFor(() => expect(router.state.status).toBe('idle'))
    expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no violations with a module active (NavRail active row + TopNav brand)', async () => {
    const router = buildTestRouter('/assets')
    const { container } = render(<RouterProvider router={router} />)
    await waitFor(() => expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument())
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no violations with the rail-footer user popover open', async () => {
    const rootRoute = createRootRoute({
      component: () => (
        <AppsProvider
          value={{
            applications: [],
            user: { name: 'Avery Stone', email: 'avery@fams.example' },
            onUserLogout: () => {},
          }}
        >
          <V5AppShell modules={modules} brandLabel="Acme" />
        </AppsProvider>
      ),
    })
    const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => null })
    const assetsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/assets', component: () => null })
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, assetsRoute]),
      history: createMemoryHistory({ initialEntries: ['/assets'] }),
    })
    render(<RouterProvider router={router} />)
    await waitFor(() => expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Avery Stone' }))
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Avery Stone — account' })).toBeInTheDocument())
    // Radix portals the popover to document.body — audit the whole document.
    expect(await axe(document.body)).toHaveNoViolations()
  })
})
