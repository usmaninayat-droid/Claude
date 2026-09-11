import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import type { FamsModule } from '@fams/skeleton-kit'
import { AppsProvider, type AppDefinition, type AppsContextValue } from './apps'
import { toast } from '@fams/ui-kit'
import { V5AppShell } from './shell'
import { createRailIndicators } from './rail-indicators'
import { SWITCHER_MODE_KEY } from './home'

function mkModule(id: string, label: string, path: string): FamsModule {
  return {
    id,
    navEntry: { label, path },
    routes: () => Promise.resolve({} as never), // never invoked in these tests
  }
}

/** Builds a minimal router with `V5AppShell` as the root and a leaf route per module. */
function buildTestRouter(
  modules: FamsModule[],
  initialPath: string,
  brandLabel?: string,
  apps?: AppDefinition[],
  context?: Partial<AppsContextValue>,
) {
  const Root = () => (
    <AppsProvider value={{ applications: apps ?? [], ...context }}>
      <V5AppShell modules={modules} brandLabel={brandLabel} />
    </AppsProvider>
  )
  const rootRoute = createRootRoute({ component: Root })
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => null })
  const moduleRoutes = modules.map((m) =>
    createRoute({ getParentRoute: () => rootRoute, path: m.navEntry.path, component: () => null }),
  )
  const assetsIndex = modules.findIndex((m) => m.navEntry.path === '/assets')
  const assetsRoute = assetsIndex >= 0 ? moduleRoutes[assetsIndex] : undefined
  const nestedRoutes = assetsRoute
    ? [createRoute({ getParentRoute: () => assetsRoute, path: '$id', component: () => null })]
    : []

  const routeTree = rootRoute.addChildren([indexRoute, ...moduleRoutes, ...nestedRoutes])
  return createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [initialPath] }) })
}

/** The unified rail — `NavRail`'s own `aria-label`. */
function rail() {
  return screen.getByRole('navigation', { name: 'Primary' })
}

/** `TopNav`'s title node. */
function topBarBrand() {
  return document.querySelector('[data-slot="top-nav-title"]')!
}

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('V5AppShell (unified NavRail)', () => {
  it('renders the ACTIVE application\'s modules as rail rows and its name in the switcher row', async () => {
    const modules = [
      mkModule('assets', 'Assets', '/assets'),
      mkModule('workforce', 'Workforce', '/workforce'),
      mkModule('ticketing', 'Ticketing', '/ticketing'),
    ]
    const apps: AppDefinition[] = [
      { id: 'fleet', name: 'Fleet', modules: ['assets', 'workforce'] },
      { id: 'support', name: 'Support', modules: ['ticketing'] },
    ]
    const router = buildTestRouter(modules, '/assets', 'Acme', apps)
    render(<RouterProvider router={router} />)

    await waitFor(() => expect(rail()).toBeInTheDocument())
    // Rail rows = the active app's modules only.
    expect(within(rail()).getByRole('button', { name: 'Assets' })).toBeInTheDocument()
    expect(within(rail()).getByRole('button', { name: 'Workforce' })).toBeInTheDocument()
    expect(within(rail()).queryByRole('button', { name: 'Ticketing' })).not.toBeInTheDocument()
    // The current app names the switcher row.
    expect(within(rail()).getByRole('button', { name: 'Switch application (Fleet)' })).toBeInTheDocument()
    // Active row carries aria-current.
    expect(within(rail()).getByRole('button', { name: 'Assets' })).toHaveAttribute('aria-current', 'page')
    // There is no second (module) rail anymore.
    expect(screen.queryByRole('navigation', { name: 'Module' })).not.toBeInTheDocument()
  })

  it('suppresses the switcher row for an app declaring hideSwitcher, without hiding its own module rows', async () => {
    const modules = [
      mkModule('assets', 'Assets', '/assets'),
      mkModule('inspector-app', 'Inspector', '/inspector-app'),
    ]
    const apps: AppDefinition[] = [
      { id: 'fleet', name: 'Fleet', modules: ['assets'] },
      { id: 'inspector', name: 'Inspector', modules: ['inspector-app'], hideSwitcher: true },
    ]
    const router = buildTestRouter(modules, '/inspector-app', 'Acme', apps)
    render(<RouterProvider router={router} />)

    await waitFor(() => expect(rail()).toBeInTheDocument())
    // The active app's own module still renders as a rail row.
    expect(within(rail()).getByRole('button', { name: 'Inspector' })).toBeInTheDocument()
    // But no switcher row for it — no cross-app navigation surface at all.
    expect(within(rail()).queryByRole('button', { name: /Switch application/ })).not.toBeInTheDocument()
  })

  it('falls back to one implicit app spanning every module when no applications are configured', async () => {
    const modules = [mkModule('assets', 'Assets', '/assets'), mkModule('settings', 'Settings', '/settings')]
    const router = buildTestRouter(modules, '/assets', 'Acme')
    render(<RouterProvider router={router} />)

    await waitFor(() => expect(rail()).toBeInTheDocument())
    expect(within(rail()).getByRole('button', { name: 'Assets' })).toBeInTheDocument()
    // The implicit app is named from brandLabel in the switcher row.
    expect(within(rail()).getByRole('button', { name: 'Switch application (Acme)' })).toBeInTheDocument()
  })

  it('switches the active application row set when the route moves to a different app', async () => {
    const modules = [mkModule('assets', 'Assets', '/assets'), mkModule('ticketing', 'Ticketing', '/ticketing')]
    const apps: AppDefinition[] = [
      { id: 'fleet', name: 'Fleet', modules: ['assets'] },
      { id: 'support', name: 'Support', modules: ['ticketing'] },
    ]
    const router = buildTestRouter(modules, '/ticketing', 'Acme', apps)
    render(<RouterProvider router={router} />)

    await waitFor(() =>
      expect(within(rail()).getByRole('button', { name: 'Switch application (Support)' })).toBeInTheDocument(),
    )
    expect(within(rail()).getByRole('button', { name: 'Ticketing' })).toBeInTheDocument()
    expect(within(rail()).queryByRole('button', { name: 'Assets' })).not.toBeInTheDocument()
  })

  // Reference default: the switcher row opens the Launch Pad directly
  // ('page' mode) until the user has minimized Home once, at which point it
  // remembers 'popup' and the row opens the anchored `AppSwitcherPanel`
  // instead (`useSwitcherMode` in shell.tsx, `V5Home.onMinimize` in home.tsx).
  it('default ("page") mode: clicking the switcher row navigates to the launch pad, no popover', async () => {
    const modules = [mkModule('assets', 'Assets', '/assets'), mkModule('ticketing', 'Ticketing', '/ticketing')]
    const apps: AppDefinition[] = [
      { id: 'fleet', name: 'Fleet', modules: ['assets'] },
      { id: 'support', name: 'Support', modules: ['ticketing'] },
    ]
    const router = buildTestRouter(modules, '/assets', 'Acme', apps)
    render(<RouterProvider router={router} />)
    await waitFor(() => expect(rail()).toBeInTheDocument())

    fireEvent.click(within(rail()).getByRole('button', { name: 'Switch application (Fleet)' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.queryByText('Switch Application')).not.toBeInTheDocument()
  })

  it('the panel\'s expand control records "page" as the preference on its way to the launch pad', async () => {
    const MODULES = [mkModule('assets', 'Assets', '/assets'), mkModule('jobs', 'Jobs', '/jobs')]
    localStorage.setItem(SWITCHER_MODE_KEY('default'), 'popup')
    const router = buildTestRouter(MODULES, '/assets', 'Acme', [
      { id: 'fleet', name: 'Fleet', modules: ['assets'] },
      { id: 'ops', name: 'Ops', modules: ['jobs'] },
    ])
    render(<RouterProvider router={router} />)
    await waitFor(() => expect(rail()).toBeInTheDocument())
    fireEvent.click(within(rail()).getByRole('button', { name: 'Switch application (Fleet)' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Expand to Launch Pad' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    // Expand / minimize ARE the preference — the app row opens the launch pad
    // from now on.
    expect(localStorage.getItem(SWITCHER_MODE_KEY('default'))).toBe('page')
  })

  it('"popup" mode (persisted after a Home minimize): switcher row opens the panel, and switching navigates to the app\'s first module', async () => {
    const modules = [mkModule('assets', 'Assets', '/assets'), mkModule('ticketing', 'Ticketing', '/ticketing')]
    const apps: AppDefinition[] = [
      { id: 'fleet', name: 'Fleet', modules: ['assets'] },
      { id: 'support', name: 'Support', modules: ['ticketing'] },
    ]
    localStorage.setItem(SWITCHER_MODE_KEY('default'), 'popup')
    const router = buildTestRouter(modules, '/assets', 'Acme', apps)
    render(<RouterProvider router={router} />)
    await waitFor(() => expect(rail()).toBeInTheDocument())

    fireEvent.click(within(rail()).getByRole('button', { name: 'Switch application (Fleet)' }))
    const panel = await screen.findByText('Switch Application')
    expect(panel).toBeInTheDocument()
    // Active app tile marked; picking the other app navigates to its first module.
    expect(screen.getByRole('button', { name: 'Fleet' })).toHaveAttribute('aria-current', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Support' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/ticketing'))
  })

  it('module row click navigates to the module route', async () => {
    const modules = [mkModule('assets', 'Assets', '/assets'), mkModule('workforce', 'Workforce', '/workforce')]
    const router = buildTestRouter(modules, '/assets', 'Acme')
    render(<RouterProvider router={router} />)
    await waitFor(() => expect(rail()).toBeInTheDocument())

    fireEvent.click(within(rail()).getByRole('button', { name: 'Workforce' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/workforce'))
  })

  it('renders NO chrome at the index route — the launch pad IS the launcher', async () => {
    const modules = [mkModule('assets', 'Assets', '/assets')]
    const router = buildTestRouter(modules, '/', 'Acme')
    render(<RouterProvider router={router} />)

    await waitFor(() => expect(router.state.status).toBe('idle'))
    expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument()
    expect(document.querySelector('[data-slot="top-nav"]')).toBeNull()
  })

  it('renders NO chrome on a module route whose nav entry declares fullScreen', async () => {
    const modules = [
      mkModule('assets', 'Assets', '/assets'),
      {
        ...mkModule('command-center', 'Command Center', '/command-center'),
        navEntry: { label: 'Command Center', path: '/command-center', fullScreen: true },
      },
    ]
    const router = buildTestRouter(modules, '/command-center', 'Acme')
    render(<RouterProvider router={router} />)

    await waitFor(() => expect(router.state.status).toBe('idle'))
    expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument()
    expect(document.querySelector('[data-slot="top-nav"]')).toBeNull()
  })

  it('a fullScreen module still renders as a rail row from OTHER routes', async () => {
    const modules = [
      mkModule('assets', 'Assets', '/assets'),
      {
        ...mkModule('command-center', 'Command Center', '/command-center'),
        navEntry: { label: 'Command Center', path: '/command-center', fullScreen: true },
      },
    ]
    const router = buildTestRouter(modules, '/assets', 'Acme')
    render(<RouterProvider router={router} />)

    await waitFor(() => expect(rail()).toBeInTheDocument())
    expect(within(rail()).getByRole('button', { name: 'Command Center' })).toBeInTheDocument()
  })

  it('top bar shows the active module label, one bar, tabs region, mobile trigger', async () => {
    const modules = [mkModule('assets', 'Assets', '/assets')]
    const router = buildTestRouter(modules, '/assets', 'Acme')
    render(<RouterProvider router={router} />)

    await waitFor(() => expect(topBarBrand()).toHaveTextContent('Assets'))
    expect(document.querySelectorAll('[data-slot="top-nav"]')).toHaveLength(1)
    const heading = screen.getByRole('heading', { level: 1, name: 'Assets' })
    expect(heading).toHaveClass('truncate')
    expect(document.querySelector('[data-slot="top-nav-tabs"]')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toBeInTheDocument()
  })

  it('treats a nested path under a module route as active too', async () => {
    const modules = [mkModule('assets', 'Assets', '/assets')]
    const router = buildTestRouter(modules, '/assets/123', 'Acme')
    render(<RouterProvider router={router} />)

    await waitFor(() =>
      expect(within(rail()).getByRole('button', { name: 'Assets' })).toHaveAttribute('aria-current', 'page'),
    )
  })

  describe('rail-footer user popover', () => {
    const MODULES = [mkModule('assets', 'Assets', '/assets')]
    const IDENTITY = { name: 'Avery Stone', email: 'avery@fams.example' }

    it('keeps the user item decorative/disabled when no identity is provided', async () => {
      const router = buildTestRouter(MODULES, '/assets', 'Acme', [])
      render(<RouterProvider router={router} />)
      await waitFor(() => expect(rail()).toBeInTheDocument())
      expect(screen.getByRole('button', { name: 'User' })).toBeDisabled()
    })

    it('turns the user item into a popover trigger showing name + email when an identity is provided', async () => {
      const router = buildTestRouter(MODULES, '/assets', 'Acme', [], { user: IDENTITY })
      render(<RouterProvider router={router} />)
      await waitFor(() => expect(rail()).toBeInTheDocument())

      const trigger = screen.getByRole('button', { name: 'Avery Stone' })
      expect(trigger).toBeEnabled()
      fireEvent.click(trigger)
      await waitFor(() => expect(screen.getByText('avery@fams.example')).toBeInTheDocument())
    })

    it('fires onUserLogout from the popover logout button', async () => {
      const onUserLogout = vi.fn()
      const router = buildTestRouter(MODULES, '/assets', 'Acme', [], { user: IDENTITY, onUserLogout })
      render(<RouterProvider router={router} />)
      await waitFor(() => expect(rail()).toBeInTheDocument())

      fireEvent.click(screen.getByRole('button', { name: 'Avery Stone' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Log out' }))
      expect(onUserLogout).toHaveBeenCalledTimes(1)
    })

    it('closes on Escape without logging out', async () => {
      const onUserLogout = vi.fn()
      const router = buildTestRouter(MODULES, '/assets', 'Acme', [], { user: IDENTITY, onUserLogout })
      render(<RouterProvider router={router} />)
      await waitFor(() => expect(rail()).toBeInTheDocument())

      const trigger = screen.getByRole('button', { name: 'Avery Stone' })
      fireEvent.click(trigger)
      await waitFor(() => expect(screen.getByText('avery@fams.example')).toBeInTheDocument())
      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
      await waitFor(() => expect(screen.queryByText('avery@fams.example')).not.toBeInTheDocument())
      expect(onUserLogout).not.toHaveBeenCalled()
    })
  })

  describe('pinned rail entries (railStart + indicator dots)', () => {
    const MODULES = [mkModule('inbox', 'Inbox', '/inbox'), mkModule('assets', 'Assets', '/assets')]

    it('renders railStart entries as top rows above the switcher, resolved from the module nav entry', async () => {
      const router = buildTestRouter(MODULES, '/assets', 'Acme', [
        { id: 'app', name: 'Telematics', modules: ['assets'] },
      ], { railStart: [{ id: 'inbox', module: 'inbox' }] })
      render(<RouterProvider router={router} />)
      await waitFor(() => expect(rail()).toBeInTheDocument())

      const inboxRow = within(rail()).getByRole('button', { name: 'Inbox' })
      expect(inboxRow).toBeInTheDocument()
      // No indicator source → no dot.
      expect(rail().querySelector('[data-slot="navrail-row-dot"]')).toBeNull()
      // Clicking it navigates to the pinned module.
      fireEvent.click(inboxRow)
      await waitFor(() => expect(router.state.location.pathname).toBe('/inbox'))
    })

    it('skips a railStart entry whose module did not resolve (unlicensed)', async () => {
      const router = buildTestRouter(MODULES, '/assets', 'Acme', [], {
        railStart: [{ id: 'ghost', module: 'not-licensed' }],
      })
      render(<RouterProvider router={router} />)
      await waitFor(() => expect(rail()).toBeInTheDocument())
      expect(within(rail()).queryByRole('button', { name: 'not-licensed' })).not.toBeInTheDocument()
    })

    it('shows the unread dot from the indicator source and clears it reactively', async () => {
      const indicators = createRailIndicators({ inbox: true })
      const router = buildTestRouter(MODULES, '/assets', 'Acme', [], {
        railStart: [{ id: 'inbox', module: 'inbox' }],
        railIndicators: indicators,
      })
      render(<RouterProvider router={router} />)
      await waitFor(() => expect(rail()).toBeInTheDocument())

      expect(rail().querySelector('[data-slot="navrail-row-dot"]')).not.toBeNull()
      act(() => indicators.set('inbox', false))
      await waitFor(() => expect(rail().querySelector('[data-slot="navrail-row-dot"]')).toBeNull())
    })

    it('drops the application row highlight on a cross-application pinned route', async () => {
      const apps = [{ id: 'app', name: 'Telematics', modules: ['assets'] }]
      const onApp = buildTestRouter(MODULES, '/assets', 'Acme', apps, {
        railStart: [{ id: 'inbox', module: 'inbox' }],
      })
      const { unmount } = render(<RouterProvider router={onApp} />)
      await waitFor(() => expect(rail()).toBeInTheDocument())
      // Inside the application: the row paints the 25% scope fill.
      expect(
        within(rail()).getByRole('button', { name: 'Switch application (Telematics)' }),
      ).toHaveAttribute('data-active', 'true')
      unmount()

      // On the inbox — a CROSS-APPLICATION surface — the rail is inside no
      // single app, so no application row is highlighted.
      const onInbox = buildTestRouter(MODULES, '/inbox', 'Acme', apps, {
        railStart: [{ id: 'inbox', module: 'inbox' }],
      })
      render(<RouterProvider router={onInbox} />)
      await waitFor(() => expect(rail()).toBeInTheDocument())
      expect(
        within(rail()).getByRole('button', { name: 'Switch application (Telematics)' }),
      ).not.toHaveAttribute('data-active')
    })

    it('marks the pinned entry active on its own route', async () => {
      const router = buildTestRouter(MODULES, '/inbox', 'Acme', [], {
        railStart: [{ id: 'inbox', module: 'inbox' }],
      })
      render(<RouterProvider router={router} />)
      await waitFor(() => expect(rail()).toBeInTheDocument())
      expect(within(rail()).getByRole('button', { name: 'Inbox' })).toHaveAttribute('aria-current', 'page')
    })
  })

  /**
   * P0-2 — THE app-root toast outlet. `V5ModuleSurface` fires `toast.success`
   * on every module create; before this the only `<Toaster/>` lived inside
   * `CockpitView`, so asset/workforce/ticketing/live-monitoring creates were
   * emitted into a void. It must be mounted exactly once, by the shell, on
   * every route — including the rail-less launch pad.
   */
  describe('app-root toast outlet (P0-2)', () => {
    const MODULES = [mkModule('assets', 'Assets', '/assets')]
    // Sonner's outlet is the aria-live region; the inner `ol` only appears
    // once a toast exists, so the region is what proves the mount.
    const outlets = () => document.querySelectorAll('section[aria-live="polite"]')

    it('mounts exactly one Toaster on a module route', async () => {
      const router = buildTestRouter(MODULES, '/assets', 'Acme')
      render(<RouterProvider router={router} />)
      await waitFor(() => expect(rail()).toBeInTheDocument())
      expect(outlets()).toHaveLength(1)
    })

    it('mounts exactly one Toaster on the rail-less launch pad route', async () => {
      const router = buildTestRouter(MODULES, '/', 'Acme')
      render(<RouterProvider router={router} />)
      await waitFor(() => expect(outlets()).toHaveLength(1))
    })

    it('renders a toast fired from a NON-cockpit module surface', async () => {
      const router = buildTestRouter(MODULES, '/assets', 'Acme')
      render(<RouterProvider router={router} />)
      await waitFor(() => expect(rail()).toBeInTheDocument())
      act(() => {
        toast.success('Asset created')
      })
      expect(await screen.findByText('Asset created')).toBeInTheDocument()
    })
  })

  it('passes the tenant branding logo through to the rail, falling back to the Logo wordmark', async () => {
    const modules = [mkModule('assets', 'Assets', '/assets')]
    const router = buildTestRouter(modules, '/assets', 'Acme')
    render(<RouterProvider router={router} />)
    await waitFor(() => expect(rail()).toBeInTheDocument())
    // No branding configured — falls back to the generic Logo composite.
    // The rail boots COLLAPSED (navbar parity: the references expand only
    // via the logo-row toggle), where that button IS the expand control;
    // expanding restores its Home identity.
    const logoRow = within(rail()).getByRole('button', { name: 'Open Sidebar' })
    expect(logoRow.querySelector('[data-tenant-logo]')).toBeInTheDocument()
    fireEvent.click(logoRow)
    expect(within(rail()).getByRole('button', { name: 'Home' })).toBeInTheDocument()
  })
})
