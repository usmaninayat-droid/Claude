import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { MemoryPersistence } from '@fams/demo-kit'
import { buildDemoRuntime, bootstrapDemoApp } from './boot'

/**
 * Boot smoke: the REAL v5-kit `bootstrapTenant` over the app seams + MSW.
 * Modules are registered per the persona's bootstrap manifest, and the render
 * buffers are hydrated through the fetch/MSW round trip. No React render (the
 * render path is proven by `vite build`).
 */
const BASE = 'http://localhost'

function runtimeFor(personaId: string) {
  return buildDemoRuntime({ tenant: 'fams', personaId, baseUrl: BASE, persistence: new MemoryPersistence() })
}

describe('bootstrapDemoApp (fams)', () => {
  const runtime = runtimeFor('u_admin')
  const server = setupServer(...runtime.handlers)
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('registers modules per the admin manifest (asset + workforce + ticketing + settings)', async () => {
    const { app } = await bootstrapDemoApp(runtime)
    expect(app.modules.map((m) => m.id).sort()).toEqual(
      ['asset', 'company', 'contact-person', 'deals', 'fuel-monitoring', 'inbox', 'job-orders', 'leads', 'live-monitoring', 'operations-center', 'pipelines', 'preventive-maintenance', 'product-service', 'settings', 'telematics-dashboard', 'ticketing', 'vehicle-behaviour', 'workforce'],
    )
    expect(app.skipped).toHaveLength(0)
  })

  it('hydrates the render buffer through fetch/MSW', async () => {
    const { buffers } = await bootstrapDemoApp(runtime)
    expect(buffers['asset/vehicle']).toBeDefined()
    expect(buffers['asset/vehicle'].length).toBe(50)
  })
})

describe('bootstrapDemoApp (fams) — u_superadmin', () => {
  const runtime = runtimeFor('u_superadmin')
  const server = setupServer(...runtime.handlers)
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('registers EVERY module this cycle produced (the full showcase surface)', async () => {
    const { app } = await bootstrapDemoApp(runtime)
    expect(app.modules.map((m) => m.id).sort()).toEqual(
      ['asset', 'company', 'contact-person', 'deals', 'fuel-monitoring', 'inbox', 'job-orders', 'leads', 'live-monitoring', 'operations-center', 'pipelines', 'preventive-maintenance', 'product-service', 'settings', 'telematics-dashboard', 'ticketing', 'vehicle-behaviour', 'workforce'],
    )
    expect(app.skipped).toHaveLength(0)
  })
})

describe('bootstrapDemoApp — dispatcher registers no settings', () => {
  const runtime = runtimeFor('u_dispatcher')
  const server = setupServer(...runtime.handlers)
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())

  it('omits the admin settings module but keeps the product modules', async () => {
    const { app } = await bootstrapDemoApp(runtime)
    const ids = app.modules.map((m) => m.id).sort()
    expect(ids).toEqual(['asset', 'fuel-monitoring', 'inbox', 'job-orders', 'live-monitoring', 'operations-center', 'pipelines', 'preventive-maintenance', 'telematics-dashboard', 'ticketing', 'vehicle-behaviour', 'workforce'])
    expect(ids).not.toContain('settings')
    // The dispatcher role was NOT extended with CRM privileges this wave —
    // Leads/Deals/Contact Person/Company/Product-Service stay invisible to it.
    expect(ids).not.toContain('leads')
    expect(ids).not.toContain('deals')
  })
})
