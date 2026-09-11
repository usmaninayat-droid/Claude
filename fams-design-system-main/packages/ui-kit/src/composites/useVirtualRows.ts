import { useVirtualizer, observeElementRect } from '@tanstack/react-virtual'
import type { RefObject } from 'react'

export interface UseVirtualRowsOptions {
  /** Total number of flattened, renderable items (rows + any group header/summary rows). */
  count: number
  /** The scrollable ancestor that owns the table body's vertical scrollbar. */
  scrollRef: RefObject<HTMLDivElement | null>
  /** Estimated row height in px, used before the browser measures the real one. Default 40. */
  estimateRowHeight?: number
  /** Extra items rendered outside the visible window, each side. Default 8. */
  overscan?: number
}

/**
 * jsdom has no layout engine — `offsetWidth`/`offsetHeight` are always 0, so
 * the virtualizer's real (synchronous, on-mount) measurement reports a
 * 0px-tall viewport, not "unmeasured". That happens on mount regardless of
 * `initialRect` (which only seeds the very first paint) and regardless of
 * `ResizeObserver` (stubbed as a no-op in this repo's `vitest.setup.ts`, so
 * it never fires again afterward) — so a 0px measurement, once taken, sticks
 * for the component's lifetime in tests. This fallback height is what makes
 * the hook "degrade gracefully" there: any 0px measurement is treated as
 * unmeasured and replaced with a generous fixed viewport, wide enough to
 * exercise realistic dataset sizes in tests without collapsing to zero
 * visible rows.
 */
const JSDOM_FALLBACK_VIEWPORT_PX = 2000

/**
 * useVirtualRows — thin wrapper over `@tanstack/react-virtual` powering
 * `DataTable`'s opt-in row virtualization. Internal — not part of the public
 * component surface.
 */
export function useVirtualRows({
  count,
  scrollRef,
  estimateRowHeight = 40,
  overscan = 8,
}: UseVirtualRowsOptions) {
  return useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    overscan,
    // Seeds the very first paint, before any measurement has run.
    initialRect: { width: 0, height: JSDOM_FALLBACK_VIEWPORT_PX },
    // Corrects a real-but-zero measurement (jsdom) to the same fallback —
    // see JSDOM_FALLBACK_VIEWPORT_PX above. In a real browser this passes
    // the actual measured rect straight through.
    observeElementRect: (instance, cb) =>
      observeElementRect(instance, (rect) =>
        cb(rect.height > 0 ? rect : { ...rect, height: JSDOM_FALLBACK_VIEWPORT_PX }),
      ),
  })
}
