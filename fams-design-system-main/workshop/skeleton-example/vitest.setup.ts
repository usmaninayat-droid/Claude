import '@testing-library/jest-dom'

// jsdom does not implement scrollTo; TanStack Router's scroll restoration
// calls it on navigation. Stub it so the smoke test output stays clean.
if (typeof window !== 'undefined') {
  window.scrollTo = () => {}
}

// jsdom has no matchMedia; the theming bootstrap reads prefers-color-scheme.
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

// This vitest + jsdom + Node combo routes window.localStorage to Node's
// experimental global (undefined + a warning on read); the theming bootstrap
// persists the theme choice, so install an in-memory stub. Decide via the
// property descriptor (no getter invocation → no warning), then overwrite.
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
