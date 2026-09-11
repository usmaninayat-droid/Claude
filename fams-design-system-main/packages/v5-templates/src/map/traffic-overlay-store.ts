import { useSyncExternalStore } from 'react'

/**
 * traffic-overlay-store — persisted "is the traffic overlay on" preference
 * (SPEC 3.19, the `traffic-lights` tool in the map's end-side stack).
 *
 * Modelled EXACTLY on `cluster-toggle-store.ts` (which is itself modelled on
 * `global-basemap-store.ts`) — same `useSyncExternalStore` shape, same
 * defensive storage guards for SSR / jsdom / private-mode exceptions, same
 * cross-tab `storage` replication. The traffic overlay is the same kind of
 * app-wide display preference the basemap id and the clustering toggle
 * already are: a user who turned it on expects it still on after a reload.
 *
 * State-agnostic per rule 8: `LiveMapView`/`LiveMapTools` stay controlled
 * presenters over `trafficActive`/`onTrafficToggle`; only the app-level
 * default resolution goes through this store.
 */

const STORAGE_KEY = 'fams:map:traffic-overlay'

let currentValue: boolean | null = null
let initialized = false
const listeners = new Set<() => void>()

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}

function readPersisted(): boolean | null {
  if (!hasLocalStorage()) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'true') return true
    if (raw === 'false') return false
    return null
  } catch {
    return null
  }
}

function writePersisted(value: boolean): void {
  if (!hasLocalStorage()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    /* private-mode / quota — in-memory value still updates below */
  }
}

function ensureInitialized(): void {
  if (initialized) return
  initialized = true
  currentValue = readPersisted()
  if (hasLocalStorage()) {
    try {
      window.addEventListener('storage', (event) => {
        if (event.key !== STORAGE_KEY) return
        currentValue = event.newValue === 'true' ? true : event.newValue === 'false' ? false : null
        listeners.forEach((listener) => listener())
      })
    } catch {
      /* addEventListener unavailable (non-DOM env) — same-tab sync still works */
    }
  }
}

/** Sets the app-wide traffic-overlay preference; replicates cross-tab. */
export function setTrafficOverlayEnabled(value: boolean): void {
  ensureInitialized()
  if (currentValue === value) return
  currentValue = value
  writePersisted(value)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  ensureInitialized()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): boolean | null {
  ensureInitialized()
  return currentValue
}

function getServerSnapshot(): boolean | null {
  return null
}

/**
 * useTrafficOverlayEnabled — subscribes to the app-wide traffic preference.
 *
 * @param defaultEnabled the blueprint/app default. The overlay defaults OFF
 * (the button renders, the paint does not) until the user turns it on.
 * @returns `[enabled, setEnabled]`, mirroring `useState`'s shape.
 */
export function useTrafficOverlayEnabled(defaultEnabled = false): [boolean, (value: boolean) => void] {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return [stored ?? defaultEnabled, setTrafficOverlayEnabled]
}
