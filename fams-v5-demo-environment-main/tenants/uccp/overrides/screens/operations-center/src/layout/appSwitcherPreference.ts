import { useEffect, useState } from 'react'

/**
 * How the application switcher presents itself. Two states, and the Launch Pad
 * is simply the expanded one:
 *   • `page`  — EXPANDED: the Launch Pad (`#/home`), the full-page launcher.
 *   • `popup` — MINIMIZED: the tile grid anchored to the rail's application row.
 *
 * Clicking the application row opens whichever state is current, and the
 * expand / minimize buttons switch between them *and* record the choice — so
 * whatever the user last chose is what the application row gives them next
 * time, across reloads.
 */
export type SwitcherMode = 'page' | 'popup'

const STORAGE_KEY = 'uccp.app-switcher-mode'
const DEFAULT_MODE: SwitcherMode = 'page'

function read(): SwitcherMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'page' || raw === 'popup') return raw
  } catch { /* ignore unavailable / malformed storage */ }
  return DEFAULT_MODE
}

/** Live consumers, so a write from one mounted component (the Launch Pad's
 *  minimize button) reaches the others (the rail) without a reload. */
const listeners = new Set<(mode: SwitcherMode) => void>()

/** Persist the choice and notify every mounted consumer. Safe to call from
 *  outside React — the Launch Pad writes it while the rail is unmounted. */
export function setSwitcherModePreference(mode: SwitcherMode) {
  try { localStorage.setItem(STORAGE_KEY, mode) } catch { /* ignore */ }
  for (const l of listeners) l(mode)
}

/** `[mode, setMode]`, backed by localStorage so the choice survives reloads. */
export function useSwitcherModePreference(): [SwitcherMode, (mode: SwitcherMode) => void] {
  const [mode, setMode] = useState<SwitcherMode>(read)

  useEffect(() => {
    listeners.add(setMode)
    return () => { listeners.delete(setMode) }
  }, [])

  return [mode, setSwitcherModePreference]
}
