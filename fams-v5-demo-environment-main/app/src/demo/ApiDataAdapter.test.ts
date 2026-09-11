import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { MemoryPersistence } from '@fams/demo-kit'
import { buildDemoRuntime } from '../boot'
import { ApiDataAdapter } from './ApiDataAdapter'

/**
 * ApiDataAdapter round-trip through the v5-shaped API contract, served by MSW
 * over the demo-kit store. This is the production-contract proof: the adapter
 * only ever talks fetch — MSW is swapped for a real backend with no change.
 */
const BASE = 'http://localhost'
const runtime = buildDemoRuntime({ tenant: 'fams', personaId: 'u_admin', baseUrl: BASE, persistence: new MemoryPersistence() })
const server = setupServer(...runtime.handlers)
const api = new ApiDataAdapter(BASE)
const CODE = 'asset/vehicle'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('ApiDataAdapter (fetch → MSW → demo-kit store)', () => {
  it('lists seeded records', async () => {
    const { data, total } = await api.listByCode(CODE)
    expect(total).toBe(50)
    expect(data.map((r) => r.id)).toContain('VEH-01')
  })

  it('gets a single record profile', async () => {
    const rec = await api.profile(CODE, 'VEH-01')
    expect(rec.title).toBe('Tanker 01')
  })

  it('creates a record and sees it in the next list', async () => {
    const before = (await api.listByCode(CODE)).total
    const created = await api.create(CODE, { title: 'New Rig', status: 'Active' })
    expect(created.id).toBeTruthy()
    expect(created.uniqueidentifier).toMatch(/^VEH-/)
    const after = await api.listByCode(CODE)
    expect(after.total).toBe(before + 1)
    expect(after.data.some((r) => r.title === 'New Rig')).toBe(true)
  })

  it('updates a record', async () => {
    const updated = await api.update(CODE, 'VEH-02', { status: 'Retired' })
    expect(updated.status).toBe('Retired')
  })
})
