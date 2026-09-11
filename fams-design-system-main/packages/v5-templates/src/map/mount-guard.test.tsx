import { Suspense, StrictMode, useLayoutEffect, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook } from '@testing-library/react'
import {
  __resetSingleMapGuardForTests,
  MapGuardScopeProvider,
  useSingleMapGuard,
  type SingleMapGuardResult,
} from './mount-guard'

describe('useSingleMapGuard', () => {
  afterEach(() => {
    __resetSingleMapGuardForTests()
    vi.restoreAllMocks()
  })

  it('grants the slot to the first mounted instance', () => {
    const { result } = renderHook(() => useSingleMapGuard())
    expect(result.current).toEqual({ granted: true, blocked: false })
  })

  it('blocks a second concurrently-mounted instance and logs a dev console.error once the block PERSISTS', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const first = renderHook(() => useSingleMapGuard())
    const second = renderHook(() => useSingleMapGuard())

    expect(first.result.current).toEqual({ granted: true, blocked: false })
    expect(second.result.current).toEqual({ granted: false, blocked: true })
    // The warning is deliberately deferred one macrotask: a block that resolves
    // inside the same commit is an ordinary remount handover, not a second
    // concurrent map, and must not be reported (see `mount-guard.ts`).
    expect(errorSpy).not.toHaveBeenCalled()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy.mock.calls[0][0]).toContain('[MapPanel]')
  })

  it('does NOT warn when the block resolves in the same commit — a remount handover, not a second map', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const outgoing = renderHook(() => useSingleMapGuard())
    const incoming = renderHook(() => useSingleMapGuard())
    expect(incoming.result.current.blocked).toBe(true)
    outgoing.unmount()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('releases the slot on unmount so a subsequent instance can claim it', () => {
    const first = renderHook(() => useSingleMapGuard())
    expect(first.result.current.granted).toBe(true)
    first.unmount()

    const second = renderHook(() => useSingleMapGuard())
    expect(second.result.current).toEqual({ granted: true, blocked: false })
  })

  it('does not block a third instance once the second (blocked) one unmounts', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const first = renderHook(() => useSingleMapGuard())
    const second = renderHook(() => useSingleMapGuard())
    expect(second.result.current.blocked).toBe(true)

    second.unmount() // the blocked instance never held the slot — releasing it must not clear `first`'s hold
    const third = renderHook(() => useSingleMapGuard())
    expect(third.result.current.blocked).toBe(true) // `first` still holds it
    expect(first.result.current.granted).toBe(true)
  })

  it('does not block a single instance rendered under StrictMode (double-render / double-mount-effect)', () => {
    const { result } = renderHook(() => useSingleMapGuard(), { wrapper: StrictMode })
    expect(result.current).toEqual({ granted: true, blocked: false })
  })

  it('does NOT block a second instance in a DIFFERENT slot — two deliberately-concurrent maps (e.g. a Hybrid view\'s primary map and a docked sheet\'s inline LocationMap) never contend for the same slot', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const primary = renderHook(() => useSingleMapGuard('default'))
    const inlineDetail = renderHook(() => useSingleMapGuard('location-map'))

    expect(primary.result.current).toEqual({ granted: true, blocked: false })
    expect(inlineDetail.result.current).toEqual({ granted: true, blocked: false })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('still blocks (same as before) a second instance in the SAME named slot', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const first = renderHook(() => useSingleMapGuard('location-map'))
    const second = renderHook(() => useSingleMapGuard('location-map'))

    expect(first.result.current).toEqual({ granted: true, blocked: false })
    expect(second.result.current).toEqual({ granted: false, blocked: true })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy.mock.calls[0][0]).toContain('"location-map"')
  })

  it('recovers when an abandoned (Suspense-discarded) claim expires in the window between a blocked sibling\'s commit and its own passive-effect subscribe', () => {
    // Reproduces the real bug found via a live probe of the app (create-sheet
    // map -> Escape -> open a detail page's map): React's "recovered by
    // synchronously rendering the entire root" concurrent-render path
    // discards a render pass that had already run this hook's render-time
    // claim (see file header, "Abandoned claims") — the claim's grace-period
    // `setTimeout(0)` later releases it, but if that fires in the narrow
    // window between a genuinely-blocked sibling's COMMIT and that sibling's
    // OWN passive effect (which is what subscribes it to `releaseListeners`),
    // the release notification reaches no one and the sibling was, before
    // this fix, stuck on the fallback card forever despite the slot being
    // free. A real `Suspense` discard + `useLayoutEffect` (guaranteed to run
    // AFTER commit but BEFORE passive effects in the same commit) reproduces
    // that exact ordering deterministically, with no test-only backdoor.
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const neverResolves = new Promise<never>(() => {})
      function GhostThatSuspends(): ReactNode {
        useSingleMapGuard() // render-time claim — runs for real, then this render is discarded
        throw neverResolves // Suspense swallows the rest; no effect ever commits for this instance
      }

      let blockedResult: SingleMapGuardResult | undefined
      function Blocked() {
        blockedResult = useSingleMapGuard()
        useLayoutEffect(() => {
          // Fires the ghost's pending grace-period expiry HERE — after this
          // component's commit, but (React's guaranteed ordering) strictly
          // before its own passive effect runs below.
          vi.runAllTimers()
        })
        return null
      }

      render(
        <>
          <Suspense fallback={null}>
            <GhostThatSuspends />
          </Suspense>
          <Blocked />
        </>,
      )

      // Recovered: the ghost's claim expired, and `Blocked`'s passive effect
      // re-checked the NOW-free slot instead of only waiting on a release
      // notification that already fired with nobody subscribed.
      expect(blockedResult).toEqual({ granted: true, blocked: false })
    } finally {
      vi.useRealTimers()
    }
  })

  // §3d reconciliation: scope (MapGuardScopeProvider, from wt-detail-ds) and
  // slot (the `slot` argument, from wt-parity-ds's fix-wave) are independent
  // axes of the same registry — a docked sheet's own scope must not collide
  // with the page underneath it, REGARDLESS of which slot each side uses.
  it('does NOT block a same-slot MapPanel in a DIFFERENT scope — a docked sheet\'s own scope never contends with the page underneath it', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const pageMap = renderHook(() => useSingleMapGuard())
    const sheetMap = renderHook(() => useSingleMapGuard(), {
      wrapper: ({ children }) => <MapGuardScopeProvider>{children}</MapGuardScopeProvider>,
    })

    expect(pageMap.result.current).toEqual({ granted: true, blocked: false })
    expect(sheetMap.result.current).toEqual({ granted: true, blocked: false })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('still blocks a second same-slot MapPanel inside the SAME scope', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = ({ children }: { children?: ReactNode }) => (
      <MapGuardScopeProvider>{children}</MapGuardScopeProvider>
    )
    // Two independent renders sharing one scope: renderHook's wrapper mounts
    // a fresh provider (fresh scope id) per call, so drive both hooks from a
    // single tree instead to keep them in the SAME scope.
    let first: SingleMapGuardResult | undefined
    let second: SingleMapGuardResult | undefined
    function Two() {
      first = useSingleMapGuard()
      second = useSingleMapGuard()
      return null
    }
    render(<Two />, { wrapper })

    expect(first).toEqual({ granted: true, blocked: false })
    expect(second).toEqual({ granted: false, blocked: true })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(errorSpy).toHaveBeenCalledTimes(1)
  })

  it('two full page-level maps (default scope, default slot) still refuse each other — the guard\'s original purpose', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const first = renderHook(() => useSingleMapGuard())
    const second = renderHook(() => useSingleMapGuard())

    expect(first.result.current).toEqual({ granted: true, blocked: false })
    expect(second.result.current).toEqual({ granted: false, blocked: true })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(errorSpy).toHaveBeenCalledTimes(1)
  })
})
