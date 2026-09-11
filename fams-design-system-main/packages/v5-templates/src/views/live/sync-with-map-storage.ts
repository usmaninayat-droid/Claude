/**
 * sync-with-map-storage.ts — persistence for the "Sync list with Map"
 * toggle (Customize View, SPEC §3.22). The toggle itself lives in the
 * per-view `CustomizeViewState` (`syncListWithMap`), which is presentation
 * state the module owner holds in memory (see `live-view-state.ts`'s doc
 * comment) and does not survive a reload on its own.
 *
 * This is a SEPARATE, narrower persistence: just the user's last-picked
 * default for a brand-new view, read once at `defaultCustomizeViewState`
 * time and written whenever the user flips the toggle. It never reaches
 * into a saved view's own state — Save/Revert/Autosave semantics for an
 * existing view are unaffected.
 *
 * `localStorage` access is guarded throughout: private browsing, disabled
 * storage, or a non-browser test environment must all degrade to "use the
 * built-in default" rather than throw.
 */

const STORAGE_KEY = 'fams.liveMonitoring.syncListWithMap'

export function readPersistedSyncWithMap(): boolean | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'true') return true
    if (raw === 'false') return false
    return null
  } catch {
    return null
  }
}

export function writePersistedSyncWithMap(value: boolean): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
  } catch {
    // Storage unavailable (private mode / quota / non-browser test) — the
    // toggle still works for the session, it just won't be remembered.
  }
}
