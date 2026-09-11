import { describe, expect, it } from 'vitest'
import { defaultCustomizeViewState } from './CustomizeViewDrawer'
import { readPersistedSyncWithMap, writePersistedSyncWithMap } from './sync-with-map-storage'

/**
 * "Sync With Map" must default OFF for a brand-new view (reference-video rule
 * 1 / spec §3.22), while a user's own persisted choice — either
 * direction — still wins on every subsequent view. Kept as its own file
 * (rather than folded into `sync-with-map-storage.test.ts`, which only
 * exercises the storage primitives) since this is a `CustomizeViewDrawer`
 * behaviour, not a storage-module one.
 */
describe('defaultCustomizeViewState — Sync With Map default', () => {
  it('defaults syncListWithMap OFF when the user has never picked a preference', () => {
    expect(readPersistedSyncWithMap()).toBeNull()
    expect(defaultCustomizeViewState('Hybrid View').syncListWithMap).toBe(false)
  })

  it('honors a persisted ON override', () => {
    writePersistedSyncWithMap(true)
    try {
      expect(defaultCustomizeViewState('Hybrid View').syncListWithMap).toBe(true)
    } finally {
      window.localStorage.removeItem('fams.liveMonitoring.syncListWithMap')
    }
  })

  it('honors a persisted OFF override (no-op vs. the built-in default, but same code path)', () => {
    writePersistedSyncWithMap(false)
    try {
      expect(defaultCustomizeViewState('Hybrid View').syncListWithMap).toBe(false)
    } finally {
      window.localStorage.removeItem('fams.liveMonitoring.syncListWithMap')
    }
  })
})
