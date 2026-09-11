import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { MemoryPersistence } from '@fams/demo-kit'
import { buildDemoRuntime } from '../boot'
import { makeModulesSource } from './seams'
import { buildBootstrapModules, privilegesFor, ROLE_PRIVILEGES } from './model'
import { getManifest, getResolvedConfig, getUsers } from './content'

/**
 * Persona gating: the dispatcher lacks `settings.view` (admin Settings hidden)
 * and `ticketing.create` (no New on the board); both hold the product `.view`
 * privileges. Proven at two levels — the pure builder, and through the live MSW
 * `/api/bootstrap` fetch the app's ModulesSource uses.
 */
const BASE = 'http://localhost'
const runtime = buildDemoRuntime({ tenant: 'fams', personaId: 'u_admin', baseUrl: BASE, persistence: new MemoryPersistence() })
const server = setupServer(...runtime.handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('persona gating — pure builder', () => {
  const manifest = getManifest('fams')
  const configs = Object.fromEntries(
    manifest.modules.map((id) => [id, getResolvedConfig('fams', id)]),
  )
  // The fams manifest licenses three entity modules and three dashboards; the
  // dashboards are non-entity configs, which is exactly what these assertions
  // pin (a dashboard registers like any other module, gated by `<id>.view`).
  const DASHBOARDS = ['fuel-monitoring', 'telematics-dashboard', 'vehicle-behaviour']
  const users = getUsers('fams')

  // CRM app (showcase wave 2): Leads/Deals pipelines + Contact Person/Company/
  // Product-Service entities, composed alongside the reused Workforce module.
  const CRM = ['leads', 'deals', 'contact-person', 'company', 'product-service']

  it('admin sees every product module + settings', () => {
    const priv = privilegesFor(users, ROLE_PRIVILEGES, 'u_admin')
    const codes = buildBootstrapModules(manifest, configs, priv).map((m) => m.code)
    expect(codes.sort()).toEqual(['asset', ...CRM, ...DASHBOARDS, 'inbox', 'live-monitoring', 'operations-center', 'job-orders', 'pipelines', 'preventive-maintenance', 'settings', 'ticketing', 'workforce'].sort())
  })

  it('dispatcher sees the product modules but NOT settings, NOT the CRM app', () => {
    const priv = privilegesFor(users, ROLE_PRIVILEGES, 'u_dispatcher')
    const codes = buildBootstrapModules(manifest, configs, priv).map((m) => m.code)
    expect(codes).not.toContain('settings')
    for (const crmModule of CRM) expect(codes).not.toContain(crmModule)
    expect(codes.sort()).toEqual(['asset', ...DASHBOARDS, 'inbox', 'live-monitoring', 'operations-center', 'job-orders', 'pipelines', 'preventive-maintenance', 'ticketing', 'workforce'].sort())
  })

  it('dispatcher lacks ticketing.create; admin holds it', () => {
    expect(privilegesFor(users, ROLE_PRIVILEGES, 'u_admin')).toContain('ticketing.create')
    expect(privilegesFor(users, ROLE_PRIVILEGES, 'u_dispatcher')).not.toContain('ticketing.create')
  })

  it('u_superadmin sees the FULL module set (the showcase persona) — never a subset', () => {
    const priv = privilegesFor(users, ROLE_PRIVILEGES, 'u_superadmin')
    const codes = buildBootstrapModules(manifest, configs, priv).map((m) => m.code)
    expect(codes.sort()).toEqual(['asset', ...CRM, ...DASHBOARDS, 'inbox', 'live-monitoring', 'operations-center', 'job-orders', 'pipelines', 'preventive-maintenance', 'settings', 'ticketing', 'workforce'].sort())
  })

  /**
   * MECHANICAL GUARD (showcase wave 2 hardening): wave 1 derived `superadmin`
   * as a bare spread of `ADMIN_PRIVILEGES`, so `u_superadmin === admin` and it
   * silently inherits every gap admin has. This does not hand-type the module
   * list (that would reproduce the exact bug class it exists to catch) — it
   * reads every tenant manifest on disk and asserts superadmin's privilege set
   * covers `<module>.view` for every module EVERY tenant actually licenses.
   */
  it('u_superadmin covers <module>.view for every module licensed in every tenant manifest', () => {
    const tenantIds = ['fams', 'iwmp']
    const superadminPrivileges = new Set(ROLE_PRIVILEGES.superadmin)
    const gaps: string[] = []
    for (const t of tenantIds) {
      const tManifest = getManifest(t)
      for (const moduleId of tManifest.modules) {
        if (!superadminPrivileges.has(`${moduleId}.view`)) gaps.push(`${t}/${moduleId}`)
      }
    }
    expect(gaps).toEqual([])
  })
})

describe('persona gating — through MSW /api/bootstrap', () => {
  it('the ModulesSource returns settings for admin but not the dispatcher', async () => {
    const admin = await makeModulesSource(BASE, 'u_admin').getLicensedModules()
    const dispatcher = await makeModulesSource(BASE, 'u_dispatcher').getLicensedModules()
    expect(admin.map((m) => m.code)).toContain('settings')
    expect(dispatcher.map((m) => m.code)).not.toContain('settings')
    expect(dispatcher.map((m) => m.code)).toContain('asset')
  })
})
