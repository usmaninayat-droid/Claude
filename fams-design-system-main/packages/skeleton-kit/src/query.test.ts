import { describe, it, expect } from 'vitest'
import { DEFAULT_GC_TIMES, gcTimeForClass, queryClassOptions, createFamsQueryClient } from './query'

describe('query-class gcTime mapping', () => {
  it('maps each class to its default gcTime', () => {
    expect(gcTimeForClass('static')).toBe(DEFAULT_GC_TIMES.static)
    expect(gcTimeForClass('session')).toBe(DEFAULT_GC_TIMES.session)
    expect(gcTimeForClass('volatile')).toBe(DEFAULT_GC_TIMES.volatile)
    // ordering invariant: static retained longest, volatile shortest
    expect(DEFAULT_GC_TIMES.static).toBeGreaterThan(DEFAULT_GC_TIMES.session)
    expect(DEFAULT_GC_TIMES.session).toBeGreaterThan(DEFAULT_GC_TIMES.volatile)
  })

  it('honours per-app gcTime overrides', () => {
    const config = { gcTimes: { volatile: 5000 } }
    expect(gcTimeForClass('volatile', config)).toBe(5000)
    expect(gcTimeForClass('static', config)).toBe(DEFAULT_GC_TIMES.static) // untouched
  })

  it('queryClassOptions returns a spreadable gcTime object', () => {
    expect(queryClassOptions('static')).toEqual({ gcTime: DEFAULT_GC_TIMES.static })
    expect(queryClassOptions('volatile', { gcTimes: { volatile: 1000 } })).toEqual({ gcTime: 1000 })
  })
})

describe('createFamsQueryClient', () => {
  it('applies sensible generic defaults', () => {
    const qc = createFamsQueryClient()
    const defaults = qc.getDefaultOptions().queries
    expect(defaults?.gcTime).toBe(DEFAULT_GC_TIMES.session)
    expect(defaults?.retry).toBe(1)
    expect(defaults?.refetchOnWindowFocus).toBe(false)
  })

  it('lets the caller override defaults via clientConfig', () => {
    const qc = createFamsQueryClient({ clientConfig: { defaultOptions: { queries: { retry: 3 } } } })
    expect(qc.getDefaultOptions().queries?.retry).toBe(3)
  })
})
