import { useEffect, useState } from 'react'
import { HOME_SUITES, DEFAULT_APP_ID } from '../features/home/homeData'

/**
 * The currently-selected application, chosen in the app switcher and reflected
 * everywhere in the shell: the rail's app row (colour + name), the modules list
 * (rail rows filtered to this app), and the Launch Pad's initial anchor.
 *
 * Kept out of React state alone so a write from one mounted surface (the
 * switcher popup) reaches the others (the rail) without a route change.
 */
const STORAGE_KEY = 'uccp.active-app'
const LAST_MODULES_KEY = 'uccp.last-app-modules'
const VALID_IDS = new Set(HOME_SUITES.map((s) => s.id))

function read(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw && VALID_IDS.has(raw)) return raw
  } catch { /* ignore unavailable / malformed storage */ }
  return DEFAULT_APP_ID
}

function readLastModules(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LAST_MODULES_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

/** Returns the last used module for the given app, or the app's first module if visited for the first time. */
export function getLastModuleForApp(appId: string): string {
  const suite = HOME_SUITES.find((s) => s.id === appId) ?? HOME_SUITES[0]
  const firstModuleId = suite.cards[0]?.id ?? ''
  const lastMap = readLastModules()
  const saved = lastMap[appId]
  if (saved && suite.cards.some((c) => c.id === saved)) {
    return saved
  }
  return firstModuleId
}

/** Saves the last used module for the given app. */
export function setLastModuleForApp(appId: string, moduleId: string) {
  if (!appId || !moduleId) return
  const lastMap = readLastModules()
  if (lastMap[appId] === moduleId) return
  lastMap[appId] = moduleId
  try {
    localStorage.setItem(LAST_MODULES_KEY, JSON.stringify(lastMap))
  } catch { /* ignore */ }
}

const listeners = new Set<(id: string) => void>()

export function setActiveAppId(id: string) {
  if (!VALID_IDS.has(id)) return
  try { localStorage.setItem(STORAGE_KEY, id) } catch { /* ignore */ }
  for (const l of listeners) l(id)
}

/** `[appId, setAppId]`, backed by localStorage. */
export function useActiveAppId(): [string, (id: string) => void] {
  const [id, setId] = useState<string>(read)

  useEffect(() => {
    listeners.add(setId)
    return () => { listeners.delete(setId) }
  }, [])

  return [id, setActiveAppId]
}
