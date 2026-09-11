import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { useVirtualRows } from './useVirtualRows'

/**
 * jsdom has no layout engine, so the scroll container is never really
 * measured — these tests assert the "degrades gracefully" contract
 * documented on the hook: with no real measurement, it should still surface
 * a usable (non-empty) window rather than collapsing to zero items.
 */
describe('useVirtualRows', () => {
  it('returns no virtual items when count is 0', () => {
    const { result } = renderHook(() => {
      const scrollRef = useRef<HTMLDivElement>(null)
      return useVirtualRows({ count: 0, scrollRef })
    })
    expect(result.current.getVirtualItems()).toEqual([])
    expect(result.current.getTotalSize()).toBe(0)
  })

  it('degrades gracefully under jsdom — surfaces the full window when unmeasured', () => {
    const { result } = renderHook(() => {
      const scrollRef = useRef<HTMLDivElement>(null)
      return useVirtualRows({ count: 10, scrollRef, estimateRowHeight: 32 })
    })
    const items = result.current.getVirtualItems()
    expect(items.length).toBeGreaterThan(0)
    expect(items[0]?.index).toBe(0)
    expect(result.current.getTotalSize()).toBe(10 * 32)
  })

  it('respects a custom estimateRowHeight in the computed total size', () => {
    const { result } = renderHook(() => {
      const scrollRef = useRef<HTMLDivElement>(null)
      return useVirtualRows({ count: 5, scrollRef, estimateRowHeight: 50 })
    })
    expect(result.current.getTotalSize()).toBe(250)
  })
})
