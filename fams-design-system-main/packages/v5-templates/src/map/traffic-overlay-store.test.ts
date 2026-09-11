import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

/**
 * The store keeps module-level state on purpose (it is an app-wide
 * preference), so each case re-imports it fresh — otherwise the first test's
 * write would be the second test's "already chosen" value.
 */
async function freshStore() {
  vi.resetModules()
  return import('./traffic-overlay-store')
}

describe('traffic-overlay-store', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults OFF — the button renders, the overlay does not paint', async () => {
    const { useTrafficOverlayEnabled } = await freshStore()
    const { result } = renderHook(() => useTrafficOverlayEnabled())
    expect(result.current[0]).toBe(false)
  })

  it('honours an app default until the user chooses', async () => {
    const { useTrafficOverlayEnabled } = await freshStore()
    const { result } = renderHook(() => useTrafficOverlayEnabled(true))
    expect(result.current[0]).toBe(true)
  })

  it('persists the choice to localStorage', async () => {
    const { useTrafficOverlayEnabled } = await freshStore()
    const { result } = renderHook(() => useTrafficOverlayEnabled())
    act(() => result.current[1](true))
    expect(window.localStorage.getItem('fams:map:traffic-overlay')).toBe('true')
    expect(result.current[0]).toBe(true)
  })

  it('a persisted choice outranks the app default (survives a reload)', async () => {
    window.localStorage.setItem('fams:map:traffic-overlay', 'true')
    const { useTrafficOverlayEnabled } = await freshStore()
    const { result } = renderHook(() => useTrafficOverlayEnabled(false))
    expect(result.current[0]).toBe(true)
  })

  it('a persisted OFF also outranks an app default of ON', async () => {
    window.localStorage.setItem('fams:map:traffic-overlay', 'false')
    const { useTrafficOverlayEnabled } = await freshStore()
    const { result } = renderHook(() => useTrafficOverlayEnabled(true))
    expect(result.current[0]).toBe(false)
  })
})
