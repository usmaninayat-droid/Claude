import { useCallback, useEffect, useRef, useState } from 'react'
import type { CustomizeViewState } from './CustomizeViewDrawer'
import type { LiveFilterValue, SavedLiveFilter } from './live-filter-model'
import type { LiveListWidthState } from './live-list-model'

/**
 * live-view-state.ts — the SERIALIZABLE snapshot of one live view's
 * presentation state, plus the controlled/uncontrolled store the live view
 * hooks read it through.
 *
 * WHY IT EXISTS (round-4 interaction finding F1): every piece of live view
 * state used to be a component-local `useState` inside `LiveHybridView`.
 * Switching a view tab unmounts that body, so `Save`, `Save View` and
 * `Enable Autosave` all cleared the unsaved-changes toast while the edited
 * column set — and the divider width, and the saved filters — reverted to the
 * blueprint defaults on the way back. From the user's seat the word "Save"
 * was untrue.
 *
 * The fix is NOT a store dependency and NOT a fetch (rule 8 still holds):
 * this is presentation state expressed as one plain, serializable value that
 * the OWNER of the module (`ModuleView`) holds, keyed per view id, so it
 * outlives the body that edits it and two views never share one column set.
 * A real app can lift it one level further — `ModuleView` takes the whole map
 * as a controlled prop — and back it with durable storage; nothing here
 * assumes memory.
 *
 * `savedColumns` vs `draftColumns` is what makes `Save` mean something:
 * `draftColumns` is what the table renders, `savedColumns` is what `Revert`
 * restores, and `Save`/`Enable Autosave` promote the draft to saved.
 */
export interface LiveViewStateSnapshot {
  /** List search box text. */
  search: string
  /** All-Filters popover value. */
  filterValue: LiveFilterValue
  /** Saved filter entries (the in-memory half of the saved-filters seam). */
  savedFilters: SavedLiveFilter[]
  /** Monotonic id source for saved filters — kept here so ids stay unique across remounts. */
  savedFilterSeq: number
  /** Divider width state. */
  widthState: LiveListWidthState
  /** Whether the ✕ grabber has hidden the list panel. */
  panelHidden: boolean
  /** Committed column set; `null` = the blueprint defaults. */
  savedColumns: string[] | null
  /** Working column set (what the table renders); `null` = the blueprint defaults. */
  draftColumns: string[] | null
  /** Column edits are pending a `Save`. */
  columnsDirty: boolean
  /** Customize View edits are pending a `Save`. */
  customizeDirty: boolean
  /** What `Revert` restores the Customize View model to; `null` = clean. */
  customizeBaseline: CustomizeViewState | null
  /** Autosave (the toast's third action / the view menu's `Autosave for Me`). */
  autosave: boolean
  /** `eye-off` — markers hidden on the map. */
  vehiclesHidden: boolean
  /** Which right tool drawer is open. */
  openDrawer: 'zones' | 'poi' | 'incidents' | null
  checkedZoneIds: string[]
  checkedPoiIds: string[]
}

/**
 * The resting snapshot. ONE shared, frozen identity: every update in this
 * module is immutable (never in place), so a single constant keeps the
 * expensive `filtered` memo from recomputing on every render of a 1,000-row
 * surface — which a fresh `{}` per render would force.
 */
export const EMPTY_LIVE_VIEW_STATE: LiveViewStateSnapshot = Object.freeze({
  search: '',
  filterValue: { filters: {}, tags: [] },
  savedFilters: [],
  savedFilterSeq: 0,
  widthState: 'collapsed',
  panelHidden: false,
  savedColumns: null,
  draftColumns: null,
  columnsDirty: false,
  customizeDirty: false,
  customizeBaseline: null,
  autosave: false,
  vehiclesHidden: false,
  openDrawer: null,
  checkedZoneIds: [],
  checkedPoiIds: [],
})

/** A fresh, mutable copy of the resting snapshot (tests, app-side seeding). */
export function emptyLiveViewState(): LiveViewStateSnapshot {
  return {
    ...EMPTY_LIVE_VIEW_STATE,
    filterValue: { filters: {}, tags: [] },
    savedFilters: [],
    checkedZoneIds: [],
    checkedPoiIds: [],
  }
}

/**
 * Controlled/uncontrolled options every live view hook accepts. Omit both and
 * the hook keeps its own state exactly as it always did (main's behaviour);
 * pass `state` + `onStateChange` and the OWNER holds it, which is what lets it
 * survive the view-tab switch that unmounts the body.
 */
export interface LiveViewStateOptions {
  state?: LiveViewStateSnapshot
  onStateChange?: (next: LiveViewStateSnapshot) => void
}

export type LiveViewStatePatch =
  | Partial<LiveViewStateSnapshot>
  | ((prev: LiveViewStateSnapshot) => Partial<LiveViewStateSnapshot>)

/**
 * Reads the snapshot and returns a stable `patch` that composes correctly
 * when several patches fire in one event handler (the ref carries the latest
 * value forward, which a controlled prop cannot do within a single tick).
 */
export function useLiveViewStateStore(
  options?: LiveViewStateOptions,
): [LiveViewStateSnapshot, (patch: LiveViewStatePatch) => void] {
  const [internal, setInternal] = useState<LiveViewStateSnapshot>(
    () => options?.state ?? emptyLiveViewState(),
  )
  const controlled = options?.state !== undefined
  const state = controlled ? (options?.state as LiveViewStateSnapshot) : internal

  /**
   * These four refs carry the latest render's values forward for `patch`, which
   * has to stay identity-stable (a `patch` that changed every state change
   * would re-render every consumer that memoizes on it).
   *
   * They are written in an EFFECT, not during render (Phase 7 code review,
   * finding F6). A render-phase ref write is a concurrent-mode rule violation:
   * under a render that React throws away, the ref would be left pointing at
   * state that never committed, and the next `patch` would merge onto it.
   *
   * The effect is declared HERE, inside the store hook, so it is registered
   * before any effect the calling view declares — `LiveHybridView` and
   * `LiveListOnlyView` both call `patch` from their own `saveSignal` effect,
   * and effects run in declaration order within a component, so the refs are
   * already current by the time those run. Within a single tick `patch` keeps
   * composing correctly regardless, because it writes `latest.current` itself.
   */
  const latest = useRef(state)
  const controlledRef = useRef(controlled)
  const onChange = useRef(options?.onStateChange)
  useEffect(() => {
    latest.current = state
    controlledRef.current = controlled
    onChange.current = options?.onStateChange
  })

  const patch = useCallback((next: LiveViewStatePatch) => {
    const partial = typeof next === 'function' ? next(latest.current) : next
    const merged = { ...latest.current, ...partial }
    latest.current = merged
    if (!controlledRef.current) setInternal(merged)
    onChange.current?.(merged)
  }, [])

  return [state, patch]
}
