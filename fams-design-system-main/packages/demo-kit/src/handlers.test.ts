// @vitest-environment node
import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { RelationalStore } from './store'
import { buildHandlers } from './handlers'
import { exampleSchemas, exampleSeeds, exampleContract } from './fixtures'

const BASE = 'http://localhost'

// One store instance; its schemas + the handlers (which close over it) are set
// up once, then the data is re-seeded fresh before each test.
const store = new RelationalStore()
for (const s of exampleSchemas) store.register(s)
const server = setupServer(...buildHandlers(exampleContract, store, { baseUrl: BASE }))

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

beforeEach(() => {
  store.applySeeds(exampleSeeds.entities)
})

describe('buildHandlers — MSW over real fetch (msw/node)', () => {
  it('lists with the default { data, total } envelope', async () => {
    const res = await fetch(`${BASE}/api/workforce`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(3)
    expect(body.data.map((r: { id: string }) => r.id).sort()).toEqual(['w1', 'w2', 'w3'])
  })

  it('lists with query-param filters + pagination', async () => {
    const res = await fetch(`${BASE}/api/workforce?role=driver&sort=name&limit=1`)
    const body = await res.json()
    expect(body.total).toBe(2) // pre-page total
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('Ada')
  })

  it('gets a record by id, 404 when missing', async () => {
    const ok = await fetch(`${BASE}/api/workforce/w1`)
    expect(ok.status).toBe(200)
    expect((await ok.json()).name).toBe('Ada')

    const missing = await fetch(`${BASE}/api/workforce/nope`)
    expect(missing.status).toBe(404)
  })

  it('creates a record and persists it to the store', async () => {
    const res = await fetch(`${BASE}/api/workforce`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'w_new', name: 'Nova', vehicleId: 'v2' }),
    })
    expect(res.status).toBe(201)
    expect((await res.json()).id).toBe('w_new')
    // written through to the store, inverse materialized
    expect(store.read('workforce', 'w_new')?.name).toBe('Nova')
    expect(store.read('vehicle', 'v2')?.crew).toContain('w_new')
  })

  it('updates a record through PATCH', async () => {
    const res = await fetch(`${BASE}/api/workforce/w1`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'lead' }),
    })
    expect(res.status).toBe(200)
    expect((await res.json()).role).toBe('lead')
    expect(store.read('workforce', 'w1')?.role).toBe('lead')
  })

  it('removes a record (204) and clears dangling refs', async () => {
    const res = await fetch(`${BASE}/api/workforce/w1`, { method: 'DELETE' })
    expect(res.status).toBe(204)
    expect(store.read('workforce', 'w1')).toBeUndefined()
    expect(store.read('vehicle', 'v1')?.crew).toEqual(['w2'])
  })
})
