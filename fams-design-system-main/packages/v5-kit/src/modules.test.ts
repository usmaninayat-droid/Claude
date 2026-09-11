import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { resolveTenantModules } from './modules'
import type { LicensedModule, ModuleImplementationMap } from './types'

const tenant = { tenant: 'crm' }

function licensed(code: string, name = code, path = `/${code}`): LicensedModule {
  return { code, name, menu: { path } }
}

describe('resolveTenantModules — decision #23 (licensed-only registration)', () => {
  let warn: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    warn.mockRestore()
  })

  it('registers only licensed modules and NEVER references an unlicensed implementation', () => {
    const licensedLoader = vi.fn(() => Promise.resolve({} as never))
    const unlicensedLoader = vi.fn(() => Promise.resolve({} as never))

    const implementations: ModuleImplementationMap = {
      assets: { routes: licensedLoader },
      // An implementation that exists in the map but is NOT licensed to this
      // tenant — its lazy loader must never be touched (chunk never requested).
      secretAdmin: { routes: unlicensedLoader },
    }

    const { modules, skipped } = resolveTenantModules({
      licensed: [licensed('assets', 'Assets', '/assets')],
      implementations,
      tenant,
    })

    expect(modules).toHaveLength(1)
    expect(modules[0].id).toBe('assets')
    expect(modules[0].navEntry).toMatchObject({ label: 'Assets', path: '/assets' })
    expect(skipped).toHaveLength(0)

    // The heart of decision #23: the unlicensed loader was never invoked...
    expect(unlicensedLoader).not.toHaveBeenCalled()
    // ...and neither loader is invoked merely by resolving (lazy until nav).
    expect(licensedLoader).not.toHaveBeenCalled()
  })

  it('LOUD-warns and skips a licensed module with no implementation (no silent skip)', () => {
    const { modules, skipped } = resolveTenantModules({
      licensed: [licensed('assets', 'Assets'), licensed('ghost', 'Ghost Module')],
      implementations: { assets: { routes: vi.fn() } },
      tenant,
    })

    expect(modules.map((m) => m.id)).toEqual(['assets'])
    expect(skipped.map((m) => m.code)).toEqual(['ghost'])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('ghost')
    expect(warn.mock.calls[0][0]).toContain('no implementation')
  })

  it('applies navEntry overrides and carries requiredPrivileges', () => {
    const { modules } = resolveTenantModules({
      licensed: [licensed('assets', 'Assets', '/assets')],
      implementations: {
        assets: {
          routes: vi.fn(),
          navEntry: { label: 'Fleet', order: 3 },
          requiredPrivileges: ['assets.view'],
        },
      },
      tenant,
    })
    expect(modules[0].navEntry).toMatchObject({ label: 'Fleet', path: '/assets', order: 3 })
    expect(modules[0].requiredPrivileges).toEqual(['assets.view'])
  })

  it('builds a composer route for a low-code implementation', () => {
    const blueprintSource = { getBlueprint: vi.fn() }
    const { modules, skipped } = resolveTenantModules({
      licensed: [licensed('deals', 'Deals', '/deals')],
      implementations: { deals: { composerModule: { blueprintRef: 'crm/deals' } } },
      tenant,
      blueprintSource,
    })
    expect(skipped).toHaveLength(0)
    expect(modules[0].id).toBe('deals')
    expect(typeof modules[0].routes).toBe('function')
    // The loader must NOT eagerly resolve the blueprint (lazy until navigation).
    expect(blueprintSource.getBlueprint).not.toHaveBeenCalled()
  })

  it('warns + skips a low-code module when no blueprintSource is provided', () => {
    const { modules, skipped } = resolveTenantModules({
      licensed: [licensed('deals', 'Deals')],
      implementations: { deals: { composerModule: { blueprintRef: 'crm/deals' } } },
      tenant,
    })
    expect(modules).toHaveLength(0)
    expect(skipped.map((m) => m.code)).toEqual(['deals'])
    expect(warn.mock.calls[0][0]).toContain('blueprintSource')
  })

  it('warns + skips an implementation with neither routes nor composerModule', () => {
    const { modules, skipped } = resolveTenantModules({
      licensed: [licensed('broken')],
      implementations: { broken: {} },
      tenant,
    })
    expect(modules).toHaveLength(0)
    expect(skipped.map((m) => m.code)).toEqual(['broken'])
    expect(warn.mock.calls[0][0]).toContain('neither')
  })
})
