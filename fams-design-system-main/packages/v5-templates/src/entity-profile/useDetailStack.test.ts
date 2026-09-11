import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useDetailStack } from './useDetailStack'

interface Rec {
  id: string
  title?: string
}

describe('useDetailStack', () => {
  it('pushDetail appends, activates, and un-minimizes', () => {
    const { result } = renderHook(() => useDetailStack<Rec>())
    act(() => result.current.pushDetail({ id: 'a' }))
    // Minimize first so the un-minimize assertion below is non-vacuous: `minimized`
    // already starts `false` from initial state, so asserting it's `false` right
    // after a fresh hook's first pushDetail would pass even if pushDetail's own
    // `setMinimized(false)` were deleted entirely.
    act(() => result.current.minimize())
    expect(result.current.minimized).toBe(true)
    act(() => result.current.pushDetail({ id: 'b' }))
    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'b'])
    expect(result.current.activeId).toBe('b')
    expect(result.current.minimized).toBe(false)
  })

  it('pushDetail dedupes by id (replace in place) and re-activates', () => {
    const { result } = renderHook(() => useDetailStack<Rec>())
    act(() => result.current.pushDetail({ id: 'a', title: 'A' }))
    act(() => result.current.pushDetail({ id: 'b' }))
    act(() => result.current.pushDetail({ id: 'a', title: 'A2' }))
    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'b'])
    expect(result.current.items[0]?.title).toBe('A2')
    expect(result.current.activeId).toBe('a')
  })

  it('minimize keeps the stack; restore un-minimizes without changing active', () => {
    const { result } = renderHook(() => useDetailStack<Rec>())
    act(() => result.current.pushDetail({ id: 'a' }))
    act(() => result.current.pushDetail({ id: 'b' }))
    act(() => result.current.minimize())
    expect(result.current.minimized).toBe(true)
    expect(result.current.items).toHaveLength(2)
    expect(result.current.activeId).toBe('b')
    act(() => result.current.restore())
    expect(result.current.minimized).toBe(false)
    expect(result.current.activeId).toBe('b')
  })

  it('closeDetail on the active tab falls back to the last remaining tab', () => {
    const { result } = renderHook(() => useDetailStack<Rec>())
    act(() => result.current.pushDetail({ id: 'a' }))
    act(() => result.current.pushDetail({ id: 'b' }))
    act(() => result.current.pushDetail({ id: 'c' }))
    act(() => result.current.closeDetail('c')) // active was c → fall back to last remaining (b)
    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'b'])
    expect(result.current.activeId).toBe('b')
  })

  it('closeDetail on a non-active tab keeps the active selection', () => {
    const { result } = renderHook(() => useDetailStack<Rec>())
    act(() => result.current.pushDetail({ id: 'a' }))
    act(() => result.current.pushDetail({ id: 'b' }))
    act(() => result.current.activate('a'))
    act(() => result.current.closeDetail('b'))
    expect(result.current.activeId).toBe('a')
  })

  it('closeAll empties the stack', () => {
    const { result } = renderHook(() => useDetailStack<Rec>())
    act(() => result.current.pushDetail({ id: 'a' }))
    act(() => result.current.closeAll())
    expect(result.current.items).toHaveLength(0)
    expect(result.current.activeId).toBeNull()
  })
})
