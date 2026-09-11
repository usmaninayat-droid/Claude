import { describe, it, expect, beforeEach } from 'vitest'
import { RelationalStore, computeSchemaFingerprint } from './store'
import { exampleSchemas, exampleSeeds } from './fixtures'
import type { EntitySchema } from './types'

function seededStore(): RelationalStore {
  const store = new RelationalStore()
  for (const s of exampleSchemas) store.register(s)
  store.applySeeds(exampleSeeds.entities)
  return store
}

describe('RelationalStore — CRUD', () => {
  let store: RelationalStore
  beforeEach(() => {
    store = seededStore()
  })

  it('creates with defaults + generated id and reads it back', () => {
    const rec = store.create('vehicle', { plate: 'NEW-1' })
    expect(rec.id).toMatch(/^gen_vehicle_/)
    expect(rec.status).toBe('active') // field default applied
    expect(store.read('vehicle', rec.id)).toMatchObject({ plate: 'NEW-1' })
  })

  it('preserves an explicit id on create', () => {
    const rec = store.create('workforce', { id: 'w_explicit', name: 'Zoe' })
    expect(rec.id).toBe('w_explicit')
  })

  it('updates a record and bumps version', () => {
    const before = store.version
    const updated = store.update('workforce', 'w1', { role: 'lead' })
    expect(updated?.role).toBe('lead')
    expect(store.version).toBeGreaterThan(before)
  })

  it('returns undefined updating / false removing a missing record', () => {
    expect(store.update('workforce', 'nope', { role: 'x' })).toBeUndefined()
    expect(store.remove('workforce', 'nope')).toBe(false)
  })

  it('throws on an unknown entity type', () => {
    expect(() => store.create('ghost', {})).toThrow(/unknown entity type/)
  })
})

describe('RelationalStore — bidirectional reference integrity', () => {
  let store: RelationalStore
  beforeEach(() => {
    store = seededStore()
  })

  it('materializes the inverse on the target (one → many)', () => {
    expect(store.read('vehicle', 'v1')?.crew).toEqual(['w1', 'w2'])
    expect(store.read('vehicle', 'v2')?.crew).toEqual(['w3'])
  })

  it('materializes the inverse for a many-cardinality forward ref', () => {
    expect(store.read('site', 's1')?.workers).toEqual(['w1', 'w2'])
    expect(store.read('site', 's2')?.workers).toEqual(['w1'])
  })

  it('updates BOTH sides when a reference is reassigned', () => {
    store.update('workforce', 'w2', { vehicleId: 'v2' })
    expect(store.read('vehicle', 'v1')?.crew).toEqual(['w1'])
    // inverse is rebuilt in record order (w2 precedes w3 in the workforce table)
    expect(store.read('vehicle', 'v2')?.crew).toEqual(['w2', 'w3'])
    expect(store.read('workforce', 'w2')?.vehicleId).toBe('v2')
  })

  it('reflects a new record on the inverse side immediately', () => {
    store.create('workforce', { id: 'w9', name: 'Nia', vehicleId: 'v2', siteIds: ['s2'] })
    expect(store.read('vehicle', 'v2')?.crew).toContain('w9')
    expect(store.read('site', 's2')?.workers).toContain('w9')
  })
})

describe('RelationalStore — dangling-ref cleanup on delete', () => {
  let store: RelationalStore
  beforeEach(() => {
    store = seededStore()
  })

  it('clears one-cardinality refs pointing at a deleted target', () => {
    store.remove('vehicle', 'v1')
    expect(store.read('workforce', 'w1')?.vehicleId).toBeNull()
    expect(store.read('workforce', 'w2')?.vehicleId).toBeNull()
    expect(store.read('workforce', 'w3')?.vehicleId).toBe('v2') // untouched
  })

  it('removes a deleted target from many-cardinality ref arrays', () => {
    store.remove('site', 's1')
    expect(store.read('workforce', 'w1')?.siteIds).toEqual(['s2'])
    expect(store.read('workforce', 'w2')?.siteIds).toEqual([])
  })

  it('drops the record and leaves no referrers', () => {
    store.remove('vehicle', 'v1')
    expect(store.read('vehicle', 'v1')).toBeUndefined()
    expect(store.getReferrers('v1')).toEqual([])
  })
})

describe('RelationalStore — getReferrers', () => {
  it('finds every record pointing at an id across relationships', () => {
    const store = seededStore()
    const refs = store.getReferrers('v1')
    expect(refs).toEqual(
      expect.arrayContaining([
        { type: 'workforce', id: 'w1', field: 'vehicleId' },
        { type: 'workforce', id: 'w2', field: 'vehicleId' },
      ]),
    )
    expect(refs).toHaveLength(2)
    expect(store.getReferrers('s2')).toEqual([{ type: 'workforce', id: 'w1', field: 'siteIds' }])
  })
})

describe('RelationalStore — query', () => {
  let store: RelationalStore
  beforeEach(() => {
    store = seededStore()
  })

  it('filters by equality', () => {
    const { records, total } = store.list('workforce', { where: { role: 'driver' } })
    expect(total).toBe(2)
    expect(records.map((r) => r.id).sort()).toEqual(['w1', 'w2'])
  })

  it('filters by { in }', () => {
    const { records } = store.list('vehicle', { where: { status: { in: ['maintenance'] } } })
    expect(records.map((r) => r.id)).toEqual(['v2'])
  })

  it('filters by { contains } (substring, case-insensitive)', () => {
    const { records } = store.list('site', { where: { name: { contains: 'depot' } } })
    expect(records.map((r) => r.id)).toEqual(['s1'])
  })

  it('sorts ascending and descending', () => {
    const asc = store.list('workforce', { sort: { field: 'name' } }).records.map((r) => r.name)
    expect(asc).toEqual(['Ada', 'Ben', 'Cy'])
    const desc = store.list('workforce', { sort: { field: 'name', dir: 'desc' } }).records.map((r) => r.name)
    expect(desc).toEqual(['Cy', 'Ben', 'Ada'])
  })

  it('paginates with offset/limit and reports the pre-page total', () => {
    const page = store.list('workforce', { sort: { field: 'name' }, offset: 1, limit: 1 })
    expect(page.total).toBe(3)
    expect(page.records.map((r) => r.id)).toEqual(['w2'])
  })
})

describe('RelationalStore — snapshot / load', () => {
  it('round-trips forward refs and rebuilds inverses on load', () => {
    const store = seededStore()
    const snap = store.snapshot()
    // snapshot is forward-only: no materialized inverse fields leak out
    expect(snap.vehicle[0]).not.toHaveProperty('crew')

    const restored = new RelationalStore()
    for (const s of exampleSchemas) restored.register(s)
    restored.load(snap)
    expect(restored.read('workforce', 'w1')?.vehicleId).toBe('v1')
    expect(restored.read('vehicle', 'v1')?.crew).toEqual(['w1', 'w2'])
  })

  it('never re-mints a generated id after a reload (the per-instance counter restarts)', () => {
    // Regression, run 2026-09-05-job-orders: `counter` is per-instance and is
    // NOT part of the snapshot, so a rehydrated store restarted it at 1 while
    // the restored rows still carried `gen_<type>_1`. The next create minted a
    // duplicate id and React logged "Encountered two children with the same
    // key" — duplicate keys can duplicate or omit rows entirely.
    const store = seededStore()
    const first = store.create('vehicle', { plate: 'A-1' })
    expect(first.id).toMatch(/^gen_vehicle_/)

    // Simulate the reload: a brand-new instance loaded from the snapshot.
    const restored = new RelationalStore()
    for (const sch of exampleSchemas) restored.register(sch)
    restored.load(store.snapshot())

    const second = restored.create('vehicle', { plate: 'A-2' })
    expect(second.id).not.toBe(first.id)
    const ids = restored.list('vehicle').records.map((r) => String(r.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('snapshot is an isolated deep clone', () => {
    const store = seededStore()
    const snap = store.snapshot()
    store.update('workforce', 'w1', { name: 'Changed' })
    expect(snap.workforce.find((r) => r.id === 'w1')?.name).toBe('Ada')
  })
})

describe('computeSchemaFingerprint / RelationalStore#schemaFingerprint', () => {
  it('is stable regardless of registration/schema-array order', () => {
    const reversed = [...exampleSchemas].reverse()
    expect(computeSchemaFingerprint(exampleSchemas)).toBe(computeSchemaFingerprint(reversed))

    const store = new RelationalStore()
    for (const s of reversed) store.register(s)
    expect(store.schemaFingerprint()).toBe(computeSchemaFingerprint(exampleSchemas))
  })

  it('changes when an entity type is added', () => {
    const withExtra: EntitySchema[] = [
      ...exampleSchemas,
      { type: 'ticket', fields: [{ name: 'title', type: 'string' }], references: [] },
    ]
    expect(computeSchemaFingerprint(withExtra)).not.toBe(computeSchemaFingerprint(exampleSchemas))
  })

  it('changes when a field is added to an existing type', () => {
    const withExtraField: EntitySchema[] = exampleSchemas.map((s) =>
      s.type === 'vehicle' ? { ...s, fields: [...s.fields, { name: 'vin', type: 'string' }] } : s,
    )
    expect(computeSchemaFingerprint(withExtraField)).not.toBe(computeSchemaFingerprint(exampleSchemas))
  })
})

describe('RelationalStore — deep-clone returned records', () => {
  it('read() returns a deep clone so mutations do not affect the store', () => {
    const store = seededStore()
    const record = store.read('workforce', 'w1')!
    const originalSites = [...(record.siteIds as string[])]

    // Mutate the returned record's array
    ;(record.siteIds as string[]).push('s_fake')

    // Store should be unaffected
    const storeRecord = store.read('workforce', 'w1')!
    expect(storeRecord.siteIds).toEqual(originalSites)
    expect(storeRecord.siteIds).not.toContain('s_fake')
  })

  it('list() returns deep clones so mutations do not affect the store', () => {
    const store = seededStore()
    const { records } = store.list('site')
    const siteRecord = records.find((r) => r.id === 's1')!
    const originalWorkers = [...(siteRecord.workers as string[])]

    // Mutate the returned record's inverse array
    ;(siteRecord.workers as string[]).push('w_fake')

    // Store should be unaffected
    const storeRecord = store.read('site', 's1')!
    expect(storeRecord.workers).toEqual(originalWorkers)
    expect(storeRecord.workers).not.toContain('w_fake')
  })
})
