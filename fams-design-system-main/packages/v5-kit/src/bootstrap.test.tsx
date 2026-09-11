import { describe, expect, it, vi, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createLazyRoute } from '@tanstack/react-router'
import { bootstrapTenant } from './bootstrap'
import { usePrivilege } from './privilege'
import type { BootstrapTenantConfig, LicensedModule } from './types'

afterEach(() => {
  document.documentElement.removeAttribute('data-tenant')
  document.documentElement.removeAttribute('style')
  // bootstrapTenant doesn't expose a history override, so each router built in
  // these tests uses the shared jsdom browser history. Reset the URL after
  // every test so a `router.navigate(...)` in one test doesn't leak the route
  // into the next test's fresh router (which boots at the CURRENT location).
  window.history.pushState({}, '', '/')
})

const licensed: LicensedModule[] = [
  { code: 'assets', name: 'Assets', menu: { path: '/assets' } },
  { code: 'ghost', name: 'Ghost', menu: { path: '/ghost' } },
]

function baseConfig(overrides: Partial<BootstrapTenantConfig> = {}): BootstrapTenantConfig {
  return {
    modulesSource: { getLicensedModules: () => Promise.resolve(licensed) },
    implementations: {
      assets: { routes: vi.fn(() => Promise.resolve({} as never)) },
    },
    tenant: { tenant: 'crm', runtimeVars: { '--color-primary': '#abcdef' } },
    ...overrides,
  }
}

describe('bootstrapTenant', () => {
  it('registers licensed ∩ implemented modules and reports the skipped ones', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const app = await bootstrapTenant(baseConfig())
    expect(app.modules.map((m) => m.id)).toEqual(['assets'])
    expect(app.skipped.map((m) => m.code)).toEqual(['ghost'])
    warn.mockRestore()
  })

  it('applies tenant theming (data-tenant + runtimeVars) at boot', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await bootstrapTenant(baseConfig())
    expect(document.documentElement.getAttribute('data-tenant')).toBe('crm')
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#abcdef')
    // Composed, not duplicated: skeleton-kit still owns an explicit data-theme.
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/)
    warn.mockRestore()
  })

  it('logout wipes this tenant\'s cache then runs the onLogout hook', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onLogout = vi.fn()
    const app = await bootstrapTenant(baseConfig({ onLogout }))
    app.queryClient.setQueryData(['crm', 'assets'], { a: 1 })
    app.queryClient.setQueryData(['mm', 'assets'], { a: 2 })

    await app.logout()

    expect(app.queryClient.getQueryData(['crm', 'assets'])).toBeUndefined()
    expect(app.queryClient.getQueryData(['mm', 'assets'])).toEqual({ a: 2 })
    expect(onLogout).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('defaults to the real V5AppShell (not skeleton-kit\'s placeholder): nav items render and active state matches the route', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // baseConfig's shared "assets" mock resolves a bare `{}` (fine for tests that
    // never navigate there), but this test actually navigates to "/assets", which
    // resolves the module's lazy route chunk — needs a real `createLazyRoute`
    // result so skeleton-kit's navEntry.path ↔ createLazyRoute id drift guard
    // doesn't throw on a malformed lazy route.
    const app = await bootstrapTenant(
      baseConfig({
        brandLabel: 'FAMS',
        implementations: {
          assets: { routes: () => Promise.resolve(createLazyRoute('/assets')({ component: () => null })) },
        },
      }),
    )
    const Wrapped = app.App
    render(<Wrapped />)

    // At the index route the default V5Home launch pad renders (no rail —
    // Home IS the launcher), fed from the same licensed-module metadata.
    await waitFor(() => expect(screen.getByText('Favorites')).toBeInTheDocument())
    expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Assets' })).toBeInTheDocument()

    // Navigate to the assets module route: the unified NavRail appears, the
    // module row is active, and the switcher row names the implicit app
    // (brandLabel — the tenant config has no `applications`).
    await app.router.navigate({ to: '/assets' })
    await waitFor(() => expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument())
    const primaryRail = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(primaryRail).getByRole('button', { name: 'Switch application (FAMS)' })).toBeInTheDocument()
    expect(within(primaryRail).getByRole('button', { name: 'Assets' })).toHaveAttribute('aria-current', 'page')
    // The top bar brand switches to the active module's nav label.
    expect(screen.getByRole('heading', { level: 1, name: 'Assets' })).toBeInTheDocument()
    warn.mockRestore()
  })

  it('feeds the privilege context from the UserSource through the whole composed app', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    function Home() {
      // Reads privilege context that bootstrapTenant fed from the UserSource,
      // exercising the full PrivilegeProvider → skeleton router → index route stack.
      return <span data-testid="home">{usePrivilege(['assets.view']) ? 'granted' : 'denied'}</span>
    }
    const app = await bootstrapTenant(
      baseConfig({
        indexComponent: Home,
        user: { getUser: () => Promise.resolve({ privileges: ['assets.view'], userType: 'user' }) },
      }),
    )
    const Wrapped = app.App
    render(<Wrapped />)
    await waitFor(() => expect(screen.getByTestId('home')).toHaveTextContent('granted'))
    warn.mockRestore()
  })

  it('threads the UserSource identity into the shell user popover and wires its logout to V5App.logout', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onLogout = vi.fn()
    const app = await bootstrapTenant(
      baseConfig({
        onLogout,
        implementations: {
          assets: { routes: () => Promise.resolve(createLazyRoute('/assets')({ component: () => null })) },
        },
        user: {
          getUser: () =>
            Promise.resolve({
              privileges: [],
              userType: 'user',
              identity: { name: 'Avery Stone', email: 'avery@fams.example' },
            }),
        },
      }),
    )
    const Wrapped = app.App
    render(<Wrapped />)
    // The rail (and its footer user trigger) render on module routes, not Home.
    await waitFor(() => expect(screen.getByText('Favorites')).toBeInTheDocument())
    await app.router.navigate({ to: '/assets' })

    // The rail-footer user item is a real trigger now — open it.
    const trigger = await screen.findByRole('button', { name: 'Avery Stone' })
    expect(trigger).toBeEnabled()
    fireEvent.click(trigger)
    expect(screen.getByText('Avery Stone')).toBeInTheDocument()
    expect(screen.getByText('avery@fams.example')).toBeInTheDocument()

    // Logout runs the composed V5App.logout: cache wipe + the app's onLogout hook.
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1))
    warn.mockRestore()
  })

  it('keeps the user item decorative when the UserSource carries no identity (back-compat)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const app = await bootstrapTenant(
      baseConfig({
        implementations: {
          assets: { routes: () => Promise.resolve(createLazyRoute('/assets')({ component: () => null })) },
        },
        user: { getUser: () => Promise.resolve({ privileges: [], userType: 'user' }) },
      }),
    )
    const Wrapped = app.App
    render(<Wrapped />)
    await waitFor(() => expect(screen.getByText('Favorites')).toBeInTheDocument())
    await app.router.navigate({ to: '/assets' })
    const trigger = await screen.findByRole('button', { name: 'User' })
    expect(trigger).toBeDisabled()
    warn.mockRestore()
  })
})

describe('bootstrapTenant — tenant landingModule', () => {
  const realRoutes = {
    assets: { routes: () => Promise.resolve(createLazyRoute('/assets')({ component: () => null })) },
  }

  it('lands on Home when no landingModule is configured (default, unchanged)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const app = await bootstrapTenant(baseConfig({ implementations: realRoutes }))
    const Wrapped = app.App
    render(<Wrapped />)
    await waitFor(() => expect(screen.getByText('Favorites')).toBeInTheDocument())
    expect(app.router.state.location.pathname).toBe('/')
    warn.mockRestore()
  })

  // The remaining resolution cases (explicit id, unknown id → Home + warning)
  // are covered as unit tests in `landing.test.ts`: a second live router that
  // redirects on the SHARED jsdom history would race this file's other tests.
  it('branding.hideName drops the rail wordmark label but keeps brandLabel elsewhere', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const app = await bootstrapTenant(
      baseConfig({
        brandLabel: 'FAMS',
        implementations: realRoutes,
        tenant: { tenant: 'crm', branding: { hideName: true } },
      }),
    )
    const Wrapped = app.App
    render(<Wrapped />)
    await waitFor(() => expect(screen.getByText('Favorites')).toBeInTheDocument())
    await app.router.navigate({ to: '/assets' })
    const rail = await screen.findByRole('navigation', { name: 'Primary' })
    // Only the DS logo composite's own wordmark remains — the separate
    // `logoExpanded` text label beside it is gone (without hideName there are
    // two "FAMS" texts in the rail: the logo and the label).
    expect(within(rail).queryAllByText('FAMS')).toHaveLength(1)
    expect(within(rail).getByText('FAMS')).toHaveAttribute('data-tenant-logo')
    // Still used for the app-switcher label.
    expect(within(rail).getByRole('button', { name: 'Switch application (FAMS)' })).toBeInTheDocument()
    warn.mockRestore()
  })

  it('landingModule "first" redirects the index route to the first module', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const app = await bootstrapTenant(
      baseConfig({
        implementations: realRoutes,
        tenant: { tenant: 'crm', landingModule: 'first' },
      }),
    )
    const Wrapped = app.App
    render(<Wrapped />)
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/assets'))
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
    // Home stays REACHABLE: the redirect is a landing, not a permanent
    // rewrite — navigating back to `/` renders the launch pad.
    await app.router.navigate({ to: '/' })
    await waitFor(() => expect(screen.getByText('Favorites')).toBeInTheDocument())
    expect(app.router.state.location.pathname).toBe('/')
    warn.mockRestore()
  })

})
