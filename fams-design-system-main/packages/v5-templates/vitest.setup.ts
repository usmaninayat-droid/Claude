import { beforeEach } from 'vitest'
import '@testing-library/jest-dom'

// jsdom (at least at this package's pinned version, run with no explicit
// `url` option) exposes NO `window.localStorage` at all — same class of gap
// as ResizeObserver/IntersectionObserver below, just for Web Storage. A
// couple of live-monitoring components read/write it for cross-session
// defaults (e.g. "Sync list with Map" — `views/live/sync-with-map-storage.ts`,
// which itself degrades to a no-op if storage throws, so this stub only
// needs to be functionally correct, not exactly spec-complete).
if (typeof globalThis.localStorage === 'undefined') {
  const backing = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (key: string) => (backing.has(key) ? backing.get(key)! : null),
    setItem: (key: string, value: string) => {
      backing.set(key, String(value))
    },
    removeItem: (key: string) => {
      backing.delete(key)
    },
    clear: () => backing.clear(),
    key: (index: number) => Array.from(backing.keys())[index] ?? null,
    get length() {
      return backing.size
    },
  } as Storage
}

/*
 * jsdom implements no 2D canvas context, so anything that reaches for one
 * throws a "Not implemented: HTMLCanvasElement.prototype.getContext" line per
 * call. ECharts (the engine behind `@fams/ui-kit`'s chart wrappers, which the
 * console templates and the dashboard widgets both render) probes for a
 * context on every mount, so a single test file that draws a chart emits
 * hundreds of those and buries the actual failures.
 *
 * Stubbed rather than mocking the chart components away: the tests should
 * render the REAL wrapper (its container, aria-label and empty state are part
 * of the contract), and only the pixel-pushing needs to be inert. The stub
 * returns a no-op context whose methods do nothing and whose measurements
 * come back zero, which is exactly what a zero-size jsdom element would
 * measure anyway. Installing the `canvas` npm package instead would add a
 * native build dependency for no test value (and no chart is asserted on by
 * its pixels).
 */
if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = () => null
} else if (typeof HTMLCanvasElement !== 'undefined') {
  const noop = () => {}
  const context = new Proxy(
    {
      canvas: null,
      measureText: () => ({ width: 0 }),
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
      createPattern: () => null,
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: noop,
      setTransform: noop,
      getLineDash: () => [],
    } as Record<string, unknown>,
    {
      get(target, prop) {
        if (prop in target) return target[prop as string]
        // Everything else on a 2D context is a draw/state call the tests
        // never read back — one shared no-op covers all of them.
        return noop
      },
      set() {
        return true
      },
    },
  )
  HTMLCanvasElement.prototype.getContext = (() => context) as HTMLCanvasElement['getContext']
}

// `localStorage` persists across every test IN THE SAME FILE (one shared
// `window`), so without this an earlier test flipping a persisted toggle on
// would silently change a later test's "fresh view" default and make suites
// order-dependent.
beforeEach(() => {
  try {
    window.localStorage?.clear()
  } catch {
    // Storage disabled/unavailable in this test environment — nothing to clear.
  }
})

// jsdom has no layout engine, so it doesn't implement ResizeObserver.
// Radix Popper-based content (DropdownMenu here) uses it to measure anchors —
// same stub as packages/ui-kit/vitest.setup.ts.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// embla-carousel (ui-kit's `ImageGallery`, rendered here by
// `TaskDetailAdditionalInfo`'s `images` prop and the `BeforePhotosSection`
// named section renderer, figma-spec-detail.md §7) observes slide
// visibility via IntersectionObserver; jsdom doesn't implement it — same
// stub as packages/ui-kit/vitest.setup.ts.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserver {
    root = null
    rootMargin = ''
    thresholds: ReadonlyArray<number> = []
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  } as unknown as typeof IntersectionObserver
}

// embla-carousel also reads `matchMedia` while activating, even with no
// `breakpoints` option set; jsdom has no layout engine and doesn't
// implement it — same stub as packages/ui-kit/vitest.setup.ts.
if (typeof globalThis.matchMedia === 'undefined') {
  globalThis.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// jsdom has no layout engine, so `Element.prototype.scrollIntoView` is absent.
// cmdk (the `Combobox` listbox) calls it on every active-item change, which
// would otherwise fail any test that opens a combobox.
if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = () => {}
}
