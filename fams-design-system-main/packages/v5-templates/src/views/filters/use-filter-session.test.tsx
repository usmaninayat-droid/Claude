import { describe, expect, it } from 'vitest'
import { act, render } from '@testing-library/react'
import { buildFrozenOrder, useFilterSession, type FilterSession } from './use-filter-session'

function mountSession(viewKey: string) {
  const box: { current: FilterSession | null } = { current: null }
  function Probe({ k }: { k: string }) {
    box.current = useFilterSession(k)
    return null
  }
  const utils = render(<Probe k={viewKey} />)
  return { box, utils }
}

describe('buildFrozenOrder (D-2 snapshot rule)', () => {
  it('puts the selected ids first, each side in source order', () => {
    expect(buildFrozenOrder(['c', 'a'], ['a', 'b', 'c', 'd'])).toEqual(['a', 'c', 'b', 'd'])
  })

  it('drops ids that are not options and collapses duplicates', () => {
    expect(buildFrozenOrder(['zz'], ['a', 'a', 'b'])).toEqual(['a', 'b'])
  })

  it('is a plain copy when nothing is selected', () => {
    expect(buildFrozenOrder([], ['a', 'b'])).toEqual(['a', 'b'])
  })
})

describe('useFilterSession', () => {
  it('starts empty: no frozen order, never opened', () => {
    const { box } = mountSession('mod:view')
    expect(box.current?.getFrozenOrder('group')).toBeUndefined()
    expect(box.current?.hasOpenedBefore('group')).toBe(false)
  })

  it('snapshotOnOpen returns and stores the frozen order', () => {
    const { box } = mountSession('mod:view')
    let order: string[] = []
    act(() => {
      order = box.current!.snapshotOnOpen('group', ['b'], ['a', 'b', 'c'])
    })
    expect(order).toEqual(['b', 'a', 'c'])
    expect(box.current?.getFrozenOrder('group')).toEqual(['b', 'a', 'c'])
  })

  it('re-snapshots on every open — that is how a row relocates on the NEXT open (F.47)', () => {
    const { box } = mountSession('mod:view')
    act(() => void box.current!.snapshotOnOpen('group', ['b'], ['a', 'b', 'c']))
    act(() => void box.current!.snapshotOnOpen('group', ['c'], ['a', 'b', 'c']))
    expect(box.current?.getFrozenOrder('group')).toEqual(['c', 'a', 'b'])
  })

  it('markOpened sets openedBefore once and preserves the frozen order (F.50)', () => {
    const { box } = mountSession('mod:view')
    act(() => void box.current!.snapshotOnOpen('group', [], ['a', 'b']))
    act(() => box.current!.markOpened('group'))
    expect(box.current?.hasOpenedBefore('group')).toBe(true)
    act(() => box.current!.markOpened('group'))
    expect(box.current?.hasOpenedBefore('group')).toBe(true)
    expect(box.current?.getFrozenOrder('group')).toEqual(['a', 'b'])
  })

  it('keeps each field independent', () => {
    const { box } = mountSession('mod:view')
    act(() => box.current!.markOpened('group'))
    expect(box.current?.hasOpenedBefore('group')).toBe(true)
    expect(box.current?.hasOpenedBefore('state')).toBe(false)
  })

  it('reset() drops both facts for every field', () => {
    const { box } = mountSession('mod:view')
    act(() => void box.current!.snapshotOnOpen('group', ['a'], ['a', 'b']))
    act(() => box.current!.markOpened('group'))
    act(() => box.current!.reset())
    expect(box.current?.hasOpenedBefore('group')).toBe(false)
    expect(box.current?.getFrozenOrder('group')).toBeUndefined()
  })

  it('a new viewKey is a new session (D-2 reset on module/view change)', () => {
    const box: { current: FilterSession | null } = { current: null }
    function Probe({ k }: { k: string }) {
      box.current = useFilterSession(k)
      return null
    }
    const { rerender } = render(<Probe k="mod:view-a" />)
    act(() => box.current!.markOpened('group'))
    expect(box.current?.hasOpenedBefore('group')).toBe(true)
    rerender(<Probe k="mod:view-b" />)
    expect(box.current?.viewKey).toBe('mod:view-b')
    expect(box.current?.hasOpenedBefore('group')).toBe(false)
  })

  it('unmounting the view drops the session', () => {
    const { box, utils } = mountSession('mod:view')
    act(() => box.current!.markOpened('group'))
    const session = box.current!
    utils.unmount()
    expect(session.hasOpenedBefore('group')).toBe(false)
  })
})
