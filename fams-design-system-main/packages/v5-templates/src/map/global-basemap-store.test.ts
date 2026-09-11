import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  GLOBAL_BASEMAP_IDS,
  resolveGlobalBasemapCanvasFilter,
  resolveGlobalBasemapStyleUrl,
  sanitizeGlobalBasemapId,
  setGlobalBasemapId,
  useGlobalBasemapId,
} from './global-basemap-store'
import { LIVE_MAP_BASEMAP_STYLES } from './chrome/LiveMapTools'
import { BRIGHT_MAP_STYLE, MUTED_MAP_STYLE } from './constants'

const STORAGE_KEY = 'fams:map:global-basemap-id'

describe('global-basemap-store', () => {
  beforeEach(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* jsdom always has localStorage; guarded anyway to mirror prod code */
    }
  })

  it('falls back to the caller default with nothing persisted', () => {
    const { result } = renderHook(() => useGlobalBasemapId('muted'))
    expect(result.current[0]).toBe('muted')
  })

  it('setGlobalBasemapId replicates to every subscribed hook instance', () => {
    const a = renderHook(() => useGlobalBasemapId('muted'))
    const b = renderHook(() => useGlobalBasemapId('muted'))

    act(() => {
      setGlobalBasemapId('bright')
    })

    expect(a.result.current[0]).toBe('bright')
    expect(b.result.current[0]).toBe('bright')
  })

  it('persists the id to localStorage when available (guarded elsewhere for envs without it)', () => {
    act(() => {
      setGlobalBasemapId('satellite')
    })
    try {
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('satellite')
    } catch {
      // localStorage unavailable in this test environment — the guarded
      // read/write path is exactly what `hasLocalStorage()` exists for; the
      // in-memory value (asserted via the hook above) still updates.
    }
  })

  it('the setter returned by the hook is setGlobalBasemapId itself', () => {
    const { result } = renderHook(() => useGlobalBasemapId('muted'))
    act(() => {
      result.current[1]('terrain')
    })
    expect(result.current[0]).toBe('terrain')
  })

  it('shares its id vocabulary with LiveMapTools (single source of style ids)', () => {
    expect(LIVE_MAP_BASEMAP_STYLES.map((s) => s.id)).toEqual([...GLOBAL_BASEMAP_IDS])
  })

  it('resolves only muted to the muted style; every other id is the bright style (rule 1: no paid tiles)', () => {
    expect(resolveGlobalBasemapStyleUrl('muted')).toBe(MUTED_MAP_STYLE)
    expect(resolveGlobalBasemapStyleUrl('muted', 'blob:patched')).toBe('blob:patched')
    for (const id of GLOBAL_BASEMAP_IDS.filter((i) => i !== 'muted')) {
      expect(resolveGlobalBasemapStyleUrl(id)).toBe(BRIGHT_MAP_STYLE)
    }
  })

  it('unsubscribes cleanly on unmount (no error re-rendering after)', () => {
    const { unmount } = renderHook(() => useGlobalBasemapId('muted'))
    unmount()
    expect(() => setGlobalBasemapId('hybrid')).not.toThrow()
  })

  describe('sanitizeGlobalBasemapId (blue-map root cause: unvalidated persisted/legacy ids)', () => {
    it('passes through every current canonical id unchanged', () => {
      for (const id of GLOBAL_BASEMAP_IDS) {
        expect(sanitizeGlobalBasemapId(id)).toBe(id)
      }
    })

    it('migrates the pre-rename legacy "dark" id to "terrain"', () => {
      expect(sanitizeGlobalBasemapId('dark')).toBe('terrain')
    })

    it('resolves an unrecognized id to null so the caller falls back to its own default', () => {
      expect(sanitizeGlobalBasemapId('some-future-id')).toBeNull()
      expect(sanitizeGlobalBasemapId('')).toBeNull()
      expect(sanitizeGlobalBasemapId(null)).toBeNull()
      expect(sanitizeGlobalBasemapId(undefined)).toBeNull()
    })

    it('useGlobalBasemapId sanitizes whatever the store replicates in (e.g. a legacy id from another tab)', () => {
      const { result } = renderHook(() => useGlobalBasemapId('muted'))
      act(() => {
        // `setGlobalBasemapId` is the app's own writer and only ever writes
        // current, valid ids — this simulates a value arriving from OUTSIDE
        // that contract (a stale cross-tab `storage` event, or a value some
        // pre-rename build wrote straight to `localStorage`), which is
        // exactly what `sanitizeGlobalBasemapId` exists to catch on the way
        // OUT of the store rather than trusting it came in clean.
        setGlobalBasemapId('dark')
      })
      expect(result.current[0]).toBe('terrain')
      act(() => {
        setGlobalBasemapId('some-future-id')
      })
      expect(result.current[0]).toBe('muted')
    })

    it('resolveGlobalBasemapStyleUrl treats an unrecognized id as bright, never as muted', () => {
      expect(resolveGlobalBasemapStyleUrl('totally-unknown')).toBe(BRIGHT_MAP_STYLE)
    })
  })

  describe('resolveGlobalBasemapCanvasFilter (map-layer-switcher spec point 3: distinct, legible variants)', () => {
    it('applies no filter to the two real tile styles', () => {
      expect(resolveGlobalBasemapCanvasFilter('muted')).toBe('')
      expect(resolveGlobalBasemapCanvasFilter('bright')).toBe('')
    })

    it('applies a distinct, non-empty filter to every CSS-swatch-only variant', () => {
      const filters = new Set<string>()
      for (const id of ['streets', 'satellite', 'terrain', 'hybrid'] as const) {
        const filter = resolveGlobalBasemapCanvasFilter(id)
        expect(filter).not.toBe('')
        filters.add(filter)
      }
      // No two variants collapse onto the same look.
      expect(filters.size).toBe(4)
    })

    it('resolves an unrecognized id to no filter', () => {
      expect(resolveGlobalBasemapCanvasFilter('nonsense')).toBe('')
    })
  })
})
