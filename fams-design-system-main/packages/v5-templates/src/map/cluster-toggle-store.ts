import { useSyncExternalStore } from 'react'

/**
 * cluster-toggle-store — persisted "is marker clustering on" preference
 * (map-features-video-analysis.md §2, "Enable/Disable Cluster action").
 *
 * The reference clip's toggle instantly explodes/collapses cluster bubbles
 * and its tooltip flips between "Disable clustering"/"Enable clustering"
 * depending on state; the clip doesn't exercise a reload so persistence is a
 * recommendation, not an observed fact (see the spec's "Persistence hints").
 * Modelled exactly on `global-basemap-store.ts`'s proven
 * localStorage + `useSyncExternalStore` shape (same defensive guards for
 * SSR/jsdom/private-mode storage exceptions), because this is the same kind
 * of app-wide display preference the basemap id already is.
 *
 * State-agnostic per rule 8: `LiveMapView`/`LiveMapTools` stay pure
 * controlled presenters over `clusterEnabled`/`onClusterToggle` props; only
 * the app-level default resolution goes through this store, exactly the way
 * `useGlobalBasemapId` is consumed.
 */

const STORAGE_KEY = 'fams:map:cluster-enabled'

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

/** Sets the app-wide clustering preference; replicates cross-tab. */
export function setClusterEnabled(value: boolean): void {
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
 * useClusterEnabled — subscribes to the app-wide clustering preference.
 *
 * @param defaultEnabled the blueprint/app default (e.g. `uiConfig.map.cluster`)
 * used until the user has toggled it at least once. @default true
 * @returns `[enabled, setEnabled]`, mirroring `useState`'s shape.
 */
export function useClusterEnabled(defaultEnabled = true): [boolean, (value: boolean) => void] {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return [stored ?? defaultEnabled, setClusterEnabled]
}
