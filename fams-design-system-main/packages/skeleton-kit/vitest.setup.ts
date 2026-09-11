import '@testing-library/jest-dom'

// In this vitest + jsdom + Node combo `window.localStorage` falls through to
// Node's experimental global getter, which returns undefined AND logs a warning
// on every read. The theming bootstrap persists the explicit theme choice to
// localStorage, so install a real in-memory stub. Decide via the property
// DESCRIPTOR (which does not invoke the getter, so it never trips the warning),
// then overwrite unconditionally.
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
// Router's scroll restoration calls it whenever a router built by `buildRouter`
// mounts (e.g. the shellComponent-override tests). Override with a no-op so
// those tests stay noise-free — same stub as v5-kit's setup.
globalThis.scrollTo = (() => {}) as typeof globalThis.scrollTo

// jsdom has no matchMedia; the theming bootstrap reads prefers-color-scheme
// on first load, so provide a controllable stub (defaults to light).
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
