import { useEffect, useState } from 'react'

/**
 * How the application switcher presents itself. Two states, and the launch
 * pad is simply the EXPANDED one:
 *   • `page`  — expanded: the launch pad (`HomeLaunchPad`), the full page.
 *   • `popup` — minimized: the tile grid (`AppSwitcherPanel`) anchored to the
 *     rail's application row.
 *
 * Clicking the application row opens whichever state is current, and the
 * expand / minimize controls both switch state AND record the choice — so
 * the row keeps giving the user whatever they last chose, across reloads.
 * Expand / minimize ARE the preference; there is no separate setting.
 */
export type AppSwitcherMode = 'page' | 'popup'

const DEFAULT_MODE: AppSwitcherMode = 'page'

function read(storageKey: string): AppSwitcherMode {
  if (typeof window === 'undefined') return DEFAULT_MODE
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (raw === 'page' || raw === 'popup') return raw
  } catch {
    /* storage unavailable / malformed → default */
  }
  return DEFAULT_MODE
}

/**
 * Live consumers per storage key. The WRITER (the launch pad's minimize
 * button) and the READER (the rail's application row) are typically never
 * mounted at the same time, and even when they are, a plain `localStorage`
 * write notifies nobody in the same tab — so the module keeps a listener set
 * and pushes the new value out itself.
 */
const listeners = new Map<string, Set<(mode: AppSwitcherMode) => void>>()

/** Persist the choice and notify every mounted consumer of that key. Safe to
 *  call from outside React. */
export function setAppSwitcherPreference(storageKey: string, mode: AppSwitcherMode) {
  try {
    window.localStorage.setItem(storageKey, mode)
  } catch {
    /* storage unavailable — the in-session listeners still update */
  }
  for (const listener of listeners.get(storageKey) ?? []) listener(mode)
}

/**
 * `[mode, setMode]`, backed by `localStorage[storageKey]`.
 *
 * Namespace the key per tenant, exactly like `usePinnedIds`
 * (`fams.<tenant>.app-switcher-mode`) — one browser profile can hold several
 * tenants and the choice is per tenant.
 */
export function useAppSwitcherPreference(
  storageKey: string,
): [AppSwitcherMode, (mode: AppSwitcherMode) => void] {
  const [mode, setMode] = useState<AppSwitcherMode>(() => read(storageKey))

  useEffect(() => {
    setMode(read(storageKey))
    const set = listeners.get(storageKey) ?? new Set<(m: AppSwitcherMode) => void>()
    listeners.set(storageKey, set)
    set.add(setMode)
    return () => {
      set.delete(setMode)
      if (set.size === 0) listeners.delete(storageKey)
    }
  }, [storageKey])

  return [mode, (next) => setAppSwitcherPreference(storageKey, next)]
}
