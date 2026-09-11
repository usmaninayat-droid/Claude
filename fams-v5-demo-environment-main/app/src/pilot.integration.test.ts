import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { MemoryPersistence } from '@fams/demo-kit'
import { buildPipelineModuleData, deriveCard, deriveColumns } from '@fams/v5-composer'
import type { EntityConfig, ModuleBlueprint, UserContext } from '@fams/v5-composer'
import { buildDemoRuntime } from './boot'
import { ApiDataAdapter } from './demo/ApiDataAdapter'
import { getModuleRules, getResolvedConfig } from './demo/content'
import { createComposerDataFactory } from './demo/composer-data'
import { linkedRecords } from './demo/referrers'

/**
 * Founder-walkthrough coverage — the same click-path the WALKTHROUGH.md script
 * follows, proven headlessly (jsdom + msw/node; the React render path itself is
 * proven by `vite build`).
 */
const BASE = 'http://localhost'
const asConfig = (t: string, m: string) => getResolvedConfig(t, m) as unknown as EntityConfig

/* 1. Tenant divergence: FAMS keeps the core Vehicles module; IWMP replaces it
      with a tenant-native Collection Point module (tenants/iwmp/modules/asset). */
describe('tenant divergence — FAMS core vs IWMP tenant-native asset module', () => {
  it('IWMP resolves the tenant-native Collection Point module; FAMS keeps core Vehicles', () => {
    const fams = asConfig('fams', 'asset')
    const iwmp = asConfig('iwmp', 'asset')

    // Tenant-native base swaps the whole module identity for IWMP only.
    expect(fams.code).toBe('asset/vehicle')
    expect(fams.name).toBe('Vehicles')
    expect(iwmp.code).toBe('asset/collection-point')
    expect(iwmp.name).toBe('Collection Point Management')

    // Rendered columns diverge with the base: FAMS still lists vehicle columns,
    // IWMP lists the collection-point set (Location / No. of Waste Types).
    const fCols = deriveColumns(fams)
    const iCols = deriveColumns(iwmp)
    expect(fCols.some((c) => c.header === 'Vehicle Type')).toBe(true)
    expect(iCols.some((c) => c.header === 'Location')).toBe(true)
    expect(iCols.some((c) => c.header === 'No. of Waste Types')).toBe(true)
    expect(iCols.some((c) => c.header === 'Vehicle Type')).toBe(false)
  })
})

/* 1b. Both tenants boot with referentially-consistent seeds (loadSeeds runs
      validateSeedRefs, which throws loudly on any dangling reference — `demo
      check` does NOT cover this runtime concern, so a test must). */
describe('tenant seeds — both tenants load without dangling references', () => {
  it('IWMP loads its collection-point seeds and the inverse refs resolve', () => {
    const runtime = buildDemoRuntime({ tenant: 'iwmp', personaId: 'u_admin', baseUrl: BASE, persistence: new MemoryPersistence() })
    expect(runtime.store.list('asset/collection-point').total).toBe(26)
    expect(runtime.store.list('workforce/driver').total).toBe(11)
    // Beige Bluffs (CP-1018) → contractor WCR-11 gives the crew member an inverse link.
    expect(linkedRecords(runtime.store, 'WCR-11', 'asset/collection-point').length).toBeGreaterThan(0)
  })

  it('FAMS loads its core seeds (50 vehicles, 20 workforce, 15 tickets)', () => {
    const runtime = buildDemoRuntime({ tenant: 'fams', personaId: 'u_admin', baseUrl: BASE, persistence: new MemoryPersistence() })
    expect(runtime.store.list('asset/vehicle').total).toBe(50)
    expect(runtime.store.list('workforce/driver').total).toBe(20)
    expect(runtime.store.list('ticketing/ticket').total).toBe(15)
  })
})

/* 2 + 3. Persona gating + data coherence, through the real fetch/MSW path. */
describe('coherence — create workforce linked to a vehicle → vehicle Assignments', () => {
  const runtime = buildDemoRuntime({ tenant: 'fams', personaId: 'u_dispatcher', baseUrl: BASE, persistence: new MemoryPersistence() })
  const server = setupServer(...runtime.handlers)
  const api = new ApiDataAdapter(BASE)
  const WF = 'workforce/driver'
  const VEHICLE = 'VEH-45' // no seeded workforce links to it

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('starts with no workforce assigned to the vehicle', () => {
    expect(linkedRecords(runtime.store, VEHICLE, WF)).toHaveLength(0)
  })

  it('after a fetch/MSW create linked to the vehicle, it surfaces via getReferrers', async () => {
    const created = await api.create(WF, { title: 'New Crew', systemcol1: 'Driver', status: 'Active', systemcol4: VEHICLE })
    expect(created.uniqueidentifier).toMatch(/^WF-/)
    const linked = linkedRecords(runtime.store, VEHICLE, WF)
    expect(linked.map((r) => r.title)).toContain('New Crew')
  })

  it('reset re-seeds the store back to the seeded workforce count', () => {
    expect(runtime.store.list(WF).total).toBe(21) // 20 seeded + 1 created above
    runtime.store.reset()
    expect(runtime.store.list(WF).total).toBe(20)
    expect(linkedRecords(runtime.store, VEHICLE, WF)).toHaveLength(0)
  })
})

/* 4. Pipeline: ticket lands in the correct lane (incl. the create default stage). */
describe('pipeline — ticket cards group into the correct lane', () => {
  const config = asConfig('fams', 'ticketing')

  it('a seeded ticket sits in the lane matching its status', () => {
    const rec = { id: 'TKT-X', status: 'in-progress', title: 'Brake check' }
    const data = buildPipelineModuleData(config, [rec])
    const card = data.cards.find((c) => c.id === 'TKT-X')!
    expect(card.stageId).toBe('in-progress')
    expect(data.stages.some((s) => s.id === card.stageId)).toBe(true)
  })

  it('a created ticket with no status defaults to the first stage', () => {
    const node = { id: 'ticketing', type: 'pipeline', label: 'Tickets', dataSource: { code: 'ticketing/ticket' } } as ModuleBlueprint
    const buffers = { 'ticketing/ticket': [] as never[] }
    const rules = { 'ticketing/ticket': getModuleRules('ticketing')! }
    const admin: UserContext = { id: 'u_admin', roles: ['admin'], privileges: [] }
    const api = { create: async () => ({}), update: async () => ({}) } as unknown as ApiDataAdapter
    const data = createComposerDataFactory({ api, buffers, privileges: ['ticketing.create'], userContext: admin, rulesByCode: rules })(node)
    const created = data.create!({ title: 'No stage given' })
    expect(created.status).toBe('new')
    expect(deriveCard(config, created).stageId).toBe('new')
  })
})

/* 5. Role-gated transition: dispatcher cannot resolve; admin can. */
describe('pipeline — role-gated transition (in-progress → resolved)', () => {
  const node = { id: 'ticketing', type: 'pipeline', label: 'Tickets', dataSource: { code: 'ticketing/ticket' } } as ModuleBlueprint
  const rules = { 'ticketing/ticket': getModuleRules('ticketing')! }
  const api = { create: async () => ({}), update: async () => ({}) } as unknown as ApiDataAdapter
  const buffers = () => ({ 'ticketing/ticket': [{ id: 'TKT-1', status: 'in-progress', title: 'x' }] })

  it('admin may transition to resolved', () => {
    const admin: UserContext = { id: 'u_admin', roles: ['admin'], privileges: [] }
    const data = createComposerDataFactory({ api, buffers: buffers(), privileges: ['ticketing.update'], userContext: admin, rulesByCode: rules })(node)
    expect(data.transitions!('TKT-1')).toContain('resolved')
  })

  it('dispatcher is blocked from resolved but may still move to triaged', () => {
    const dispatcher: UserContext = { id: 'u_dispatcher', roles: ['dispatcher'], privileges: [] }
    const data = createComposerDataFactory({ api, buffers: buffers(), privileges: ['ticketing.update'], userContext: dispatcher, rulesByCode: rules })(node)
    const next = data.transitions!('TKT-1')
    expect(next).not.toContain('resolved')
    expect(next).toContain('triaged')
    expect(() => data.move!('TKT-1', 'resolved')).toThrow(/not permitted/)
  })
})
