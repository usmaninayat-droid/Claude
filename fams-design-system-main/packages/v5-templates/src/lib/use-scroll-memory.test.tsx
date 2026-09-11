import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { useScrollMemory, resetScrollMemory } from './use-scroll-memory'

/**
 * UX A.5 — a board scrolled 400px into its lanes came back at 0 after a lens
 * round-trip, because switching lens unmounts the view. Asserted on the
 * OBSERVED `scrollLeft` after a real unmount/remount, not on a prop.
 */
function Scroller({ memoryKey }: { memoryKey?: string }) {
  const ref = useScrollMemory<HTMLDivElement>(memoryKey)
  return <div data-testid="scroller" ref={ref} />
}

/**
 * jsdom implements no layout, so `scrollLeft`/`scrollTop` are hard-wired to 0
 * and are not settable. Back them with real per-element storage on the
 * prototype — installed BEFORE the first render, because the hook restores in
 * the ref callback and there is no later moment to patch an instance.
 */
const offsets = new WeakMap<HTMLElement, { left: number; top: number }>()
function slot(el: HTMLElement) {
  let v = offsets.get(el)
  if (!v) { v = { left: 0, top: 0 }; offsets.set(el, v) }
  return v
}
for (const [axis, key] of [['scrollLeft', 'left'], ['scrollTop', 'top']] as const) {
  Object.defineProperty(HTMLElement.prototype, axis, {
    get() { return slot(this as HTMLElement)[key] },
    set(v: number) { slot(this as HTMLElement)[key] = v },
    configurable: true,
  })
}

beforeEach(() => {
  resetScrollMemory()
  // The restore is deferred one frame (the element is in the DOM before its
  // children are laid out); run it synchronously so the test can observe it.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0 })
})

describe('useScrollMemory', () => {
  it('restores the scroll offset after an unmount/remount round-trip', () => {
    const first = render(<Scroller memoryKey="kanban:pipelines" />)
    const el = first.getByTestId('scroller')
    act(() => { el.scrollLeft = 420; el.dispatchEvent(new Event('scroll')) })
    first.unmount()

    const second = render(<Scroller memoryKey="kanban:pipelines" />)
    expect(second.getByTestId('scroller').scrollLeft).toBe(420)
  })

  it('keys the memory per caller, so two boards never inherit each other position', () => {
    const a = render(<Scroller memoryKey="kanban:pipelines" />)
    act(() => { a.getByTestId('scroller').scrollLeft = 420; a.getByTestId('scroller').dispatchEvent(new Event('scroll')) })
    a.unmount()

    const b = render(<Scroller memoryKey="kanban:ticketing" />)
    expect(b.getByTestId('scroller').scrollLeft).toBe(0)
  })

  it('remembers nothing at all when no key is given', () => {
    const a = render(<Scroller />)
    act(() => { a.getByTestId('scroller').scrollLeft = 420; a.getByTestId('scroller').dispatchEvent(new Event('scroll')) })
    a.unmount()

    const b = render(<Scroller />)
    expect(b.getByTestId('scroller').scrollLeft).toBe(0)
  })
})
