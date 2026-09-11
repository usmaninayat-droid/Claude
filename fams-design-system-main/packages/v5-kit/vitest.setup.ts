import '@testing-library/jest-dom'

// v5-kit composes @fams/skeleton-kit's theming bootstrap, which persists the
// explicit theme choice to localStorage and reads prefers-color-scheme. In the
// vitest + jsdom + Node combo `window.localStorage` falls through to Node's
// experimental getter (returns undefined + logs a warning on every read), so
// install a real in-memory stub — same approach as skeleton-kit's setup.
{
  const target = globalThis as typeof globalThis & { localStorage?: Storage }
  const desc = Object.getOwnPropertyDescriptor(target, 'localStorage')
  if (!desc || desc.configurable) {
    const store = new Map<string, string>()
    const localStorageStub: Storage = {
      get length() {
        return store.size
      },
      clear: () => store.clear(),
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      removeItem: (key: string) => store.delete(key),
      setItem: (key: string, value: string) => store.set(key, String(value)),
    }
    Object.defineProperty(target, 'localStorage', { value: localStorageStub, configurable: true })
  }
}

// jsdom ships window.scrollTo as a stub that THROWS "Not implemented"; TanStack
// Router's scroll restoration calls it when the composed app mounts. Override it
// unconditionally with a no-op so the bootstrap smoke test stays noise-free.
globalThis.scrollTo = (() => {}) as typeof globalThis.scrollTo

// jsdom has no ResizeObserver; Radix popper-positioned surfaces (the rail
// footer's Tooltip/UserPopover) construct one when they open. Without this
// stub, focus returning to the tooltip-wrapped trigger after the user popover
// closes THROWS and collapses the whole app into its error boundary mid-test.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom has no matchMedia; skeleton-kit's theming reads prefers-color-scheme.
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
