import { describe, it, expect } from 'vitest'
import { joinRefCsv, InMemoryDataStore } from './store'
import type { EntityConfig } from './types'

describe('joinRefCsv — MultiReference id contract', () => {
  it('joins ids with a comma', () => {
    expect(joinRefCsv(['id1', 'id2', 'id3'])).toBe('id1,id2,id3')
  })

  it('maps an empty selection to "" (matches writeRefs empty-selection semantics)', () => {
    expect(joinRefCsv([])).toBe('')
  })

  it('throws a clear error instead of silently corrupting the round-trip when an id contains a comma', () => {
    expect(() => joinRefCsv(['id1', 'bad,id'])).toThrow(/comma/)
    expect(() => joinRefCsv(['id1', 'bad,id'])).toThrow(/bad,id/)
  })
})

const minimalConfig: EntityConfig = {
  code: 'widget',
  name: 'Widget',
  systemcolumns: [],
  uiConfig: { statusList: [] },
  listcolumns: [],
}

describe('InMemoryDataStore — genId() instance isolation', () => {
  it('two independently created stores generate ids independently (no shared counter)', () => {
    const storeA = new InMemoryDataStore()
    const storeB = new InMemoryDataStore()
    storeA.registerConfig(minimalConfig)
    storeB.registerConfig(minimalConfig)

    const a1 = storeA.create('widget', {})
    const b1 = storeB.create('widget', {})
    const a2 = storeA.create('widget', {})
    const b2 = storeB.create('widget', {})

    // Each store's own ids never repeat.
    expect(a1.id).not.toBe(a2.id)
    expect(b1.id).not.toBe(b2.id)

    // A fresh store starts its counter fresh — its first id's counter segment
    // matches what storeA's first id used, proving the counter is not shared
    // module-level state (before this refactor, storeB would have inherited
    // storeA's already-advanced counter).
    const counterSegment = (id: string) => id.split('_').pop()
    expect(counterSegment(b1.id)).toBe(counterSegment(a1.id))
  })

  it('a fresh store in a fresh test starts fresh (first id uses the base counter value)', () => {
    const store = new InMemoryDataStore()
    store.registerConfig(minimalConfig)
    const record = store.create('widget', {})
    // Base counter is 1000 -> '1000'.toString(36) === 'rs'
    expect(record.id.split('_').pop()).toBe((1000).toString(36))
  })
})
