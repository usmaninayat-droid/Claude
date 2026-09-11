import '@testing-library/jest-dom'

// jsdom has no layout engine, so it doesn't implement ResizeObserver.
// cmdk (Combobox) and Radix Popper-based content (Popover/Tooltip/Select)
// use it to measure anchors/lists — stub it out for tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// cmdk scrolls the highlighted item into view on selection change; jsdom
// doesn't implement scrollIntoView at all.
if (typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = () => {}
}

// jsdom has never implemented the Pointer Events spec: `window.PointerEvent`
// is simply absent. `@testing-library/dom`'s `createEvent` falls back to the
// plain `Event` constructor when that's missing — and unlike its own
// no-native-constructor (IE11) fallback path, that branch does NOT copy
// unrecognized init keys onto the event, so `fireEvent.pointerUp(el, {
// pointerType: 'touch' })` silently produces an event with NO `pointerType`
// at all. `DataTable`'s column-expansion double-tap detection (§7 of
// text-truncation.md) reads exactly that field to tell a touch tap from a
// mouse click — without this polyfill every such test would silently no-op
// instead of exercising the real interaction. Minimal: just enough of the
// real `PointerEvent` shape (a `MouseEvent` plus `pointerId`/`pointerType`)
// for `event.pointerType` to survive `fireEvent.pointerUp`/`pointerDown`.
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number
    pointerType: string
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 0
      this.pointerType = params.pointerType ?? ''
    }
  }
  globalThis.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent
}

// embla-carousel (ImageGallery's thumbnail strip) also observes slide
// visibility via IntersectionObserver; jsdom doesn't implement it either.
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

// embla-carousel (ImageGallery's thumbnail strip) reads `matchMedia` while
// activating, even with no `breakpoints` option set; jsdom has no layout
// engine and doesn't implement it.
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
