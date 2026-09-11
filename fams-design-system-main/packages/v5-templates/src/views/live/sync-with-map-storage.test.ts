import { describe, expect, it } from 'vitest'
import { readPersistedSyncWithMap, writePersistedSyncWithMap } from './sync-with-map-storage'

describe('sync-with-map-storage', () => {
  it('reads null (no opinion) before anything is written', () => {
    expect(readPersistedSyncWithMap()).toBeNull()
  })

  it('round-trips true/false', () => {
    writePersistedSyncWithMap(true)
    expect(readPersistedSyncWithMap()).toBe(true)
    writePersistedSyncWithMap(false)
    expect(readPersistedSyncWithMap()).toBe(false)
  })

  it('degrades to null when localStorage.getItem throws (private mode, quota, etc.)', () => {
    const original = window.localStorage.getItem
    window.localStorage.getItem = () => {
      throw new Error('blocked')
    }
    try {
      expect(readPersistedSyncWithMap()).toBeNull()
    } finally {
      window.localStorage.getItem = original
    }
  })

  it('write never throws even when localStorage.setItem is blocked', () => {
    const original = window.localStorage.setItem
    window.localStorage.setItem = () => {
      throw new Error('blocked')
    }
    try {
      expect(() => writePersistedSyncWithMap(true)).not.toThrow()
    } finally {
      window.localStorage.setItem = original
    }
  })
})
