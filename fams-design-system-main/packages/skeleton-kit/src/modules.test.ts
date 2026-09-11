import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL as NodeURL } from 'node:url'
import { createElement } from 'react'
import { createLazyRoute, createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { deriveNavEntries } from './shell'
import { buildRouter, withNavRouteDriftGuard, type ShellComponentProps } from './router'
import type { FamsModule } from './types'

function mkModule(id: string, path: string, order?: number): FamsModule {
  return {
    id,
    navEntry: { label: id.toUpperCase(), path, order },
    routes: () => Promise.resolve(createLazyRoute(path)({ component: () => null })),
  }
}

describe('module contract → nav derivation', () => {
  it('derives one nav entry per module', () => {
    const nav = deriveNavEntries([mkModule('dashboard', '/dashboard'), mkModule('settings', '/settings')])
    expect(nav).toHaveLength(2)
    expect(nav.map((n) => n.label)).toEqual(['DASHBOARD', 'SETTINGS'])
    expect(nav.map((n) => n.path)).toEqual(['/dashboard', '/settings'])
  })

  it('sorts by explicit order, then by declaration order', () => {
    const nav = deriveNavEntries([
      mkModule('b', '/b', 2),
      mkModule('a', '/a', 1),
      mkModule('c', '/c'), // no order → declaration index (2)
    ])
    expect(nav.map((n) => n.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('module contract → route registration', () => {
  it('registers a route per module plus the index route', () => {
    const router = buildRouter({ modules: [mkModule('dashboard', '/dashboard'), mkModule('settings', '/settings')] })
    const ids = Object.keys(router.routesById)
    expect(ids).toContain('/dashboard')
    expect(ids).toContain('/settings')
    expect(ids).toContain('/') // index route
  })

  it('does NOT invoke a module route loader at registration time (lazy)', () => {
    const dashLoader = vi.fn(() => Promise.resolve(createLazyRoute('/dashboard')({ component: () => null })))
    const settingsLoader = vi.fn(() => Promise.resolve(createLazyRoute('/settings')({ component: () => null })))
    buildRouter({
      modules: [
        { id: 'dashboard', navEntry: { label: 'Dashboard', path: '/dashboard' }, routes: dashLoader },
        { id: 'settings', navEntry: { label: 'Settings', path: '/settings' }, routes: settingsLoader },
      ],
    })
    // The dynamic import behind each module only fires on navigation, never at boot.
    expect(dashLoader).not.toHaveBeenCalled()
    expect(settingsLoader).not.toHaveBeenCalled()
  })
})

describe('navEntry.path ↔ createLazyRoute drift guard', () => {
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  it('detects loudly: rejects when the createLazyRoute id does not match navEntry.path', async () => {
    process.env.NODE_ENV = 'test'
    const drifted: FamsModule = {
      id: 'settings',
      navEntry: { label: 'Settings', path: '/settings' },
      routes: () => Promise.resolve(createLazyRoute('/old-settings-path')({ component: () => null })),
    }
    await expect(withNavRouteDriftGuard(drifted)()).rejects.toThrow(
      /navEntry\.path is "\/settings" but its createLazyRoute\(\.\.\.\) id is "\/old-settings-path"/,
    )
  })

  it('passes silently when navEntry.path matches the createLazyRoute id', async () => {
    process.env.NODE_ENV = 'test'
    const ok = mkModule('dashboard', '/dashboard')
    const lazyRoute = await withNavRouteDriftGuard(ok)()
    expect(lazyRoute.options.id).toBe('/dashboard')
  })

  it('stays silent in production even when paths drift', async () => {
    process.env.NODE_ENV = 'production'
    const drifted: FamsModule = {
      id: 'settings',
      navEntry: { label: 'Settings', path: '/settings' },
      routes: () => Promise.resolve(createLazyRoute('/old-settings-path')({ component: () => null })),
    }
    const lazyRoute = await withNavRouteDriftGuard(drifted)()
    expect(lazyRoute.options.id).toBe('/old-settings-path')
  })

  it('wires the guard into buildRouter: a drifted module throws when its chunk is loaded', async () => {
    process.env.NODE_ENV = 'test'
    const drifted: FamsModule = {
      id: 'settings',
      navEntry: { label: 'Settings', path: '/settings' },
      routes: () => Promise.resolve(createLazyRoute('/old-settings-path')({ component: () => null })),
    }
    const router = buildRouter({ modules: [drifted] })
    // `routesById` is typed against a statically-known route tree; our module routes
    // are assembled from a runtime array, so `looseRoutesById` (untyped, same data)
    // is the documented escape hatch for reaching them by id in a test.
    const route = router.looseRoutesById['/settings']
    expect(route.lazyFn).toBeDefined()
    await expect(route.lazyFn?.()).rejects.toThrow(/Route drift in module "settings"/)
  })

  it('wires the guard into buildRouter: a matching module resolves cleanly when its chunk is loaded', async () => {
    process.env.NODE_ENV = 'test'
    const router = buildRouter({ modules: [mkModule('dashboard', '/dashboard')] })
    const route = router.looseRoutesById['/dashboard']
    await expect(route.lazyFn?.()).resolves.toBeDefined()
  })

  // The two tests above only exercise the Node-process code path (they set
  // `process.env.NODE_ENV` directly), which cannot catch a regression to the
  // `process.env?.NODE_ENV` form: that form still reads `process.env.NODE_ENV`
  // correctly under plain Node, so the behavioral tests would keep passing
  // even though it silently breaks the real target — a browser production
  // bundle. Vite/esbuild's `define` substitution (and Vite's own
  // `code.includes("process.env.NODE_ENV")` gate) only match the exact,
  // non-optional-chain `process.env.NODE_ENV` AST shape; the `?.` form is left
  // untouched by the bundler and evaluates to `undefined` in a browser (no
  // global `process`), which flips `isProductionEnv()` to `false` in
  // production and makes the drift guard throw in prod instead of being
  // dead-code-eliminated — the opposite of the "silent in production"
  // contract. Guard the exact source form directly so this can't regress
  // unnoticed.
  it('source form: isProductionEnv uses the bundler-substitutable process.env.NODE_ENV form (no optional chain)', () => {
    // Use Node's explicit URL ctor, not the jsdom-shadowed global `URL` — under
    // this package's jsdom test environment, global `URL`'s relative-resolution
    // ignores the file: base arg and resolves against jsdom's `location` instead.
    const routerSourcePath = fileURLToPath(new NodeURL('./router.tsx', import.meta.url))
    const source = readFileSync(routerSourcePath, 'utf-8')
    // Scope the assertion to the function body, not the whole file — the
    // preceding comment intentionally spells out the rejected `?.` form as
    // documentation, which would otherwise false-fail a whole-file substring
    // check.
    const fnMatch = source.match(/function isProductionEnv\(\)[^{]*\{[^}]*\}/)
    expect(fnMatch).toBeTruthy()
    const fnBody = fnMatch![0]
    expect(fnBody).toContain('process.env.NODE_ENV')
    expect(fnBody).not.toContain('process.env?.NODE_ENV')
  })
})

describe('buildRouter shellComponent override', () => {
  it('renders the default minimal AppShell when no shellComponent is given', async () => {
    const router = buildRouter({
      modules: [mkModule('dashboard', '/dashboard')],
      brandLabel: 'Acme',
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    render(createElement(RouterProvider, { router }))
    // The default AppShell renders the brandLabel and a "Primary" nav landmark.
    expect(await screen.findByText('Acme')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
  })

  it('renders a provided shellComponent instead, passed the same modules/brandLabel props', async () => {
    function CustomShell({ modules, brandLabel }: ShellComponentProps) {
      return createElement(
        'div',
        { 'data-testid': 'custom-shell' },
        createElement('span', null, brandLabel),
        createElement('span', null, `${modules.length} modules`),
      )
    }
    const router = buildRouter({
      modules: [mkModule('dashboard', '/dashboard'), mkModule('settings', '/settings')],
      brandLabel: 'Acme',
      shellComponent: CustomShell,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    render(createElement(RouterProvider, { router }))
    expect(await screen.findByTestId('custom-shell')).toBeInTheDocument()
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('2 modules')).toBeInTheDocument()
    // The default AppShell's "Primary" nav landmark must NOT be present.
    expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument()
  })
})
