// jsdom in this runner ships without a working Storage / matchMedia, which
// skeleton-kit's theme bootstrap reads at boot. Provide minimal stubs so the
// real bootstrapTenant path runs in tests.
class MemoryStorage {
  private m = new Map<string, string>()
  getItem = (k: string): string | null => this.m.get(k) ?? null
  setItem = (k: string, v: string): void => void this.m.set(k, String(v))
  removeItem = (k: string): void => void this.m.delete(k)
  clear = (): void => this.m.clear()
  key = (i: number): string | null => [...this.m.keys()][i] ?? null
  get length(): number {
    return this.m.size
  }
}

for (const key of ['localStorage', 'sessionStorage'] as const) {
  if (!(key in window) || !window[key]) {
    Object.defineProperty(window, key, { writable: true, configurable: true, value: new MemoryStorage() })
  }
}

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
  })
}
