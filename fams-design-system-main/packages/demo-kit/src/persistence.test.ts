import { describe, it, expect, beforeEach } from 'vitest'
import { RelationalStore } from './store'
import { MemoryPersistence, SessionStoragePersistence } from './persistence'
import { loadSeeds } from './seeds'
import type { SeedSet } from './seeds'
import type { EntitySchema } from './types'
import { exampleSchemas, exampleSeeds } from './fixtures'

function register(store: RelationalStore): RelationalStore {
  for (const s of exampleSchemas) store.register(s)
  return store
}

/**
 * exampleSchemas + one ADDED entity type ('ticket') — simulates the shape a
 * schema-adding merge produces: a browser tab that persisted a snapshot under
 * the OLD (3-type) schema now boots against a NEWER (4-type) one.
 */
const schemasWithTicket: EntitySchema[] = [
  ...exampleSchemas,
  { type: 'ticket', fields: [{ name: 'title', type: 'string', required: true }], references: [] },
]

const seedsWithTicket: SeedSet = {
  ...exampleSeeds,
  entities: { ...exampleSeeds.entities, ticket: [{ id: 't1', title: 'Leak reported' }] },
}

function registerWithTicket(store: RelationalStore): RelationalStore {
  for (const s of schemasWithTicket) store.register(s)
  return store
}

describe('MemoryPersistence', () => {
  it('round-trips a snapshot and isolates it from later mutation', () => {
    const p = new MemoryPersistence()
    const store = register(new RelationalStore({ persistence: p }))
    loadSeeds(store, exampleSeeds)
    store.update('workforce', 'w1', { name: 'Edited' })

    const saved = p.load()
    store.update('workforce', 'w1', { name: 'Later' })
    expect(saved?.snapshot.workforce.find((r) => r.id === 'w1')?.name).toBe('Edited')

    p.clear()
    expect(p.load()).toBeNull()
  })
})

describe('SessionStoragePersistence (jsdom)', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('survives a reload within the session (hydrate over re-seed)', () => {
    const store1 = register(new RelationalStore({ persistence: new SessionStoragePersistence({ namespace: 'roundtrip' }) }))
    loadSeeds(store1, exampleSeeds)
    store1.update('workforce', 'w1', { name: 'Edited' })

    // Fresh store, same session storage namespace = a "reload".
    const store2 = register(new RelationalStore({ persistence: new SessionStoragePersistence({ namespace: 'roundtrip' }) }))
    loadSeeds(store2, exampleSeeds)
    expect(store2.read('workforce', 'w1')?.name).toBe('Edited')
    // inverses were rebuilt from the hydrated forward refs
    expect(store2.read('vehicle', 'v1')?.crew).toEqual(['w1', 'w2'])
  })

  it('reset() re-seeds fresh and clears the persisted edits', () => {
    const persistence = new SessionStoragePersistence({ namespace: 'reset' })
    const store = register(new RelationalStore({ persistence }))
    loadSeeds(store, exampleSeeds)
    store.update('workforce', 'w1', { name: 'Edited' })
    store.create('workforce', { id: 'w_extra', name: 'Extra' })

    store.reset()

    expect(store.read('workforce', 'w1')?.name).toBe('Ada') // back to seed
    expect(store.read('workforce', 'w_extra')).toBeUndefined() // extra gone
    // a subsequent reload now hydrates the reset (fresh) dataset
    const reloaded = register(new RelationalStore({ persistence: new SessionStoragePersistence({ namespace: 'reset' }) }))
    loadSeeds(reloaded, exampleSeeds)
    expect(reloaded.read('workforce', 'w1')?.name).toBe('Ada')
  })
})

describe('schema fingerprint versioning (stale/legacy snapshot handling)', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('matching fingerprint: the persisted snapshot IS used', () => {
    const store1 = register(new RelationalStore({ persistence: new SessionStoragePersistence({ namespace: 'match' }) }))
    loadSeeds(store1, exampleSeeds)
    store1.update('workforce', 'w1', { name: 'Edited' })

    // Same schema shape on "reload" → fingerprints match → hydrate, not re-seed.
    const store2 = register(new RelationalStore({ persistence: new SessionStoragePersistence({ namespace: 'match' }) }))
    expect(store2.schemaFingerprint()).toBe(store1.schemaFingerprint())
    loadSeeds(store2, exampleSeeds)
    expect(store2.read('workforce', 'w1')?.name).toBe('Edited')
  })

  it('stale fingerprint (schema-adding merge): the persisted snapshot is discarded and seeds hydrate fresh', () => {
    // Old tab: schema WITHOUT the new "ticket" type, persists under that shape.
    const store1 = register(new RelationalStore({ persistence: new SessionStoragePersistence({ namespace: 'stale' }) }))
    loadSeeds(store1, exampleSeeds)
    store1.update('workforce', 'w1', { name: 'Edited before merge' })

    // Same tab reloads AFTER a schema-adding merge: registers the extra
    // "ticket" type before hydrating from the (now stale) persisted snapshot.
    const store2 = registerWithTicket(new RelationalStore({ persistence: new SessionStoragePersistence({ namespace: 'stale' }) }))
    expect(store2.schemaFingerprint()).not.toBe(store1.schemaFingerprint())
    loadSeeds(store2, seedsWithTicket)

    // Bug would have shown "full shell, 0 rows" for the new type; fixed
    // behavior re-seeds fresh so the new type's rows are present.
    expect(store2.read('ticket', 't1')?.title).toBe('Leak reported')
    expect(store2.list('ticket').total).toBe(1)
    // And the stale edit from before the merge is gone (fresh seed, not a
    // partial/backfilled hydrate of the old snapshot).
    expect(store2.read('workforce', 'w1')?.name).toBe('Ada')
  })

  it('missing fingerprint (legacy pre-fingerprint snapshot): discarded, seeds hydrate fresh', () => {
    const persistence = new SessionStoragePersistence({ namespace: 'legacy' })
    // Simulate a snapshot written by the OLD code — a bare StoreSnapshot with
    // no `{ fingerprint, snapshot }` envelope at all — landing directly in
    // sessionStorage under the same key this persistence instance reads.
    window.sessionStorage.setItem(
      'legacy:store:v1',
      JSON.stringify({
        vehicle: exampleSeeds.entities.vehicle,
        site: exampleSeeds.entities.site,
        workforce: [{ id: 'w1', name: 'Legacy Edited', role: 'driver', vehicleId: 'v1', siteIds: ['s1', 's2'] }],
      }),
    )

    const store = register(new RelationalStore({ persistence }))
    loadSeeds(store, exampleSeeds)

    // Discarded (not hydrated as-is) → fresh seed value, not the legacy one.
    expect(store.read('workforce', 'w1')?.name).toBe('Ada')
    // Re-seeding re-saves under the new envelope, tagged with the current
    // fingerprint — the stale untagged raw payload is gone.
    const resaved = JSON.parse(window.sessionStorage.getItem('legacy:store:v1')!)
    expect(resaved.fingerprint).toBe(store.schemaFingerprint())
    expect(resaved.snapshot.workforce.find((r: { id: string }) => r.id === 'w1').name).toBe('Ada')
  })
})
