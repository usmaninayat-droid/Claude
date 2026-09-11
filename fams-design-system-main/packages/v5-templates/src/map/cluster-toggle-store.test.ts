import { describe, expect, it, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { setClusterEnabled, useClusterEnabled } from './cluster-toggle-store'

describe('cluster-toggle-store — persisted clustering preference (map-features-video-analysis.md §2)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('falls back to the caller default before anything has been persisted', () => {
    const { result } = renderHook(() => useClusterEnabled(true))
    expect(result.current[0]).toBe(true)
  })

  it('persists a toggle to localStorage and reflects it on the next mount', () => {
    act(() => setClusterEnabled(false))
    expect(window.localStorage.getItem('fams:map:cluster-enabled')).toBe('false')
    const { result } = renderHook(() => useClusterEnabled(true))
    expect(result.current[0]).toBe(false)
  })

  it('the returned setter updates every subscribed hook instance', () => {
    const a = renderHook(() => useClusterEnabled(true))
    const b = renderHook(() => useClusterEnabled(true))
    act(() => a.result.current[1](false))
    expect(a.result.current[0]).toBe(false)
    expect(b.result.current[0]).toBe(false)
  })
})
