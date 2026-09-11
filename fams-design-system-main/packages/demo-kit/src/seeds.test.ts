import { describe, it, expect } from 'vitest'
import { RelationalStore } from './store'
import { loadSeeds, validateSeedRefs, seedRecords, DanglingSeedRefError, type SeedSet } from './seeds'
import { exampleSchemas, exampleSeeds } from './fixtures'

function register(): RelationalStore {
  const store = new RelationalStore()
  for (const s of exampleSchemas) store.register(s)
  return store
}

describe('loadSeeds — happy path', () => {
  it('loads records with deterministic ids and resolved cross-references', () => {
    const store = register()
    loadSeeds(store, exampleSeeds)
    expect(store.list('workforce').total).toBe(3)
    expect(store.read('workforce', 'w1')?.vehicleId).toBe('v1')
    expect(store.read('vehicle', 'v1')?.crew).toEqual(['w1', 'w2'])
  })

  it('seedRecords pulls a typed per-type array out of a seed set', () => {
    expect(seedRecords(exampleSeeds, 'site').map((r) => r.id)).toEqual(['s1', 's2'])
    expect(seedRecords(exampleSeeds, 'missing')).toEqual([])
  })
})

describe('loadSeeds — dangling references fail LOUDLY', () => {
  const broken: SeedSet = {
    entities: {
      vehicle: [{ id: 'v1', plate: 'AAA' }],
      site: [{ id: 's1', name: 'Depot' }],
      workforce: [
        { id: 'w1', name: 'Ada', vehicleId: 'v_missing', siteIds: ['s1', 's_missing'] },
      ],
    },
    users: [],
  }

  it('throws DanglingSeedRefError listing every offender', () => {
    const store = register()
    expect(() => loadSeeds(store, broken)).toThrow(DanglingSeedRefError)
  })

  it('reports each missing id with its type/field context', () => {
    const store = register()
    let err: DanglingSeedRefError | undefined
    try {
      validateSeedRefs(store, broken)
    } catch (e) {
      err = e as DanglingSeedRefError
    }
    expect(err).toBeInstanceOf(DanglingSeedRefError)
    expect(err!.refs).toEqual(
      expect.arrayContaining([
        { type: 'workforce', recordId: 'w1', field: 'vehicleId', missingId: 'v_missing', target: 'vehicle' },
        { type: 'workforce', recordId: 'w1', field: 'siteIds', missingId: 's_missing', target: 'site' },
      ]),
    )
    expect(err!.refs).toHaveLength(2)
  })

  it('throws when the seed set names an unregistered type', () => {
    const store = register()
    const badType: SeedSet = { entities: { unknownType: [{ id: 'x1' }] }, users: [] }
    expect(() => validateSeedRefs(store, badType)).toThrow(/unregistered type/)
  })
})
