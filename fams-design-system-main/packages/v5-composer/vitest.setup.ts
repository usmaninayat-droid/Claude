import '@testing-library/jest-dom'

// jsdom has no layout engine. The SchemaForm widgets pull in ui-kit controls
// (Radix Popper-based Select, cmdk-based Combobox) that measure anchors/lists
// via ResizeObserver and scroll the active item into view — neither exists in
// jsdom. Same stubs as ui-kit's own vitest.setup.ts.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

if (typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = () => {}
}

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
