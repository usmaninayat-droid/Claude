import { useMemo, useState } from 'react'
import { deriveFilters, type EntityConfig, type EntityRecord } from '@fams/v5-composer'
import {
  applyLiveFilters,
  buildLiveFilterGroups,
  deriveTagGroups,
  type LiveFilterValue,
} from './live-filter-model'
import {
  defaultLiveListColumns,
  defaultLiveShownColumns,
  liveListColumnCatalog,
  type LiveListWidthState,
} from './live-list-model'
import {
  useLiveViewStateStore,
  type LiveViewStateOptions,
  type LiveViewStatePatch,
  type LiveViewStateSnapshot,
} from './live-view-state'

/**
 * useLiveSearchFilters — the search∩filters half of the live view state,
 * shared by the hybrid panel (via `useLiveViewState`) and the list-only view
 * (which carries its own in-card search/funnel row per SPEC v2 §2.10):
 * search text, the All-Filters value, saved filters (an injectable seam —
 * see `live-view-state.ts`), tag vocabulary (both `tagsCol` +
 * `privateTagsCol` groups), derived groups and the filtered record set.
 * Search matches the title, the record's internal `uniqueidentifier`, the
 * bound plate (the identity the VEHICLE cell actually renders, A22), and the
 * blueprint's own search columns.
 *
 * The state itself is a `LiveViewStateSnapshot` the caller MAY own
 * (`options.state` + `options.onStateChange`), so it survives the view-tab
 * switch that unmounts the body (round-4 F1). Omit both and the hook keeps
 * its own, exactly as before.
 */
export function useLiveSearchFilters(
  config: EntityConfig,
  records: EntityRecord[],
  options?: LiveViewStateOptions,
) {
  const [state, patch] = useLiveViewStateStore(options)
  return useLiveSearchFiltersFrom(config, records, state, patch)
}

/** The search∩filters surface over an ALREADY-resolved snapshot + patch. */
function useLiveSearchFiltersFrom(
  config: EntityConfig,
  records: EntityRecord[],
  state: LiveViewStateSnapshot,
  patch: (next: LiveViewStatePatch) => void,
) {
  // Popover open/closed is transient chrome, not view state — it is never
  // restored on remount and never round-trips to the owner.
  const [filtersOpen, setFiltersOpen] = useState(false)

  const facets = useMemo(() => deriveFilters(config), [config])
  const groups = useMemo(() => buildLiveFilterGroups(facets, records), [facets, records])
  const tagGroups = useMemo(() => deriveTagGroups(config, records), [config, records])

  const tagsCol = config.uiConfig.map?.tagsCol
  const privateTagsCol = config.uiConfig.map?.privateTagsCol
  const searchColumns = useMemo(
    () => config.uiConfig.search?.columns ?? config.listcolumns.map((p) => p.col),
    [config],
  )

  const { search, filterValue, savedFilters } = state
  const plateCol = config.uiConfig.map?.plateCol
  const filtered = useMemo(() => {
    let out = applyLiveFilters(records, filterValue, tagsCol, privateTagsCol)
    const q = search.trim().toLowerCase()
    if (q) {
      const cols = ['title', 'uniqueidentifier', ...(plateCol ? [plateCol] : []), ...searchColumns]
      out = out.filter((rec) => cols.some((col) => String(rec[col] ?? '').toLowerCase().includes(q)))
    }
    return out
  }, [records, filterValue, tagsCol, privateTagsCol, search, searchColumns, plateCol])

  return {
    search,
    setSearch: (next: string) => patch({ search: next }),
    filterValue,
    setFilterValue: (next: LiveFilterValue) => patch({ filterValue: next }),
    groups,
    tagGroups,
    filtered,
    savedFilters,
    saveFilter: (name: string) =>
      patch((prev) => ({
        savedFilterSeq: prev.savedFilterSeq + 1,
        savedFilters: [
          ...prev.savedFilters,
          { id: `sf-${prev.savedFilterSeq + 1}`, name, value: prev.filterValue },
        ],
      })),
    renameFilter: (id: string, name: string) =>
      patch((prev) => ({
        savedFilters: prev.savedFilters.map((f) => (f.id === id ? { ...f, name } : f)),
      })),
    deleteFilter: (id: string) =>
      patch((prev) => ({ savedFilters: prev.savedFilters.filter((f) => f.id !== id) })),
    filtersOpen,
    setFiltersOpen,
  }
}

/**
 * use-live-view-state — the live hybrid view's whole panel state machine
 * (extracted per root rule 12 so `LiveHybridView` stays a composition):
 * `useLiveSearchFilters` above plus column customization with the
 * unsaved-changes dirty flag (rendered `columns` vs the Columns popover's
 * `shownColumns` default are DECOUPLED per SPEC v2 §2.6 until the user's
 * first edit unifies them), the divider width/hidden state, and the
 * drawer/eye-off toggles.
 *
 * Every one of those lives in the `LiveViewStateSnapshot` the caller may own
 * — see `live-view-state.ts` for why (round-4 F1: `Save` was a no-op across a
 * view-tab switch).
 */
export function useLiveViewState(
  config: EntityConfig,
  records: EntityRecord[],
  options?: LiveViewStateOptions,
) {
  const [state, patch] = useLiveViewStateStore(options)
  const searchFilters = useLiveSearchFiltersFrom(config, records, state, patch)

  const catalog = useMemo(() => liveListColumnCatalog(config), [config])
  const defaultColumns = useMemo(
    () => defaultLiveListColumns(config, state.widthState),
    [config, state.widthState],
  )
  const defaultShown = useMemo(() => defaultLiveShownColumns(config), [config])
  // Rendered table columns vs the Columns popover's Shown value: decoupled
  // DEFAULTS (SPEC §2.2 collapsed table vs §2.6 popover Shown group); the
  // user's first explicit edit becomes the single source for both.
  const columns = state.draftColumns ?? defaultColumns
  const shownColumns = state.draftColumns ?? defaultShown

  return {
    ...searchFilters,
    state,
    patch,
    widthState: state.widthState,
    setWidthState: (next: LiveListWidthState) => patch({ widthState: next }),
    panelHidden: state.panelHidden,
    setPanelHidden: (next: boolean) => patch({ panelHidden: next }),
    columns,
    shownColumns,
    /** Column edits on a saved view raise the unsaved-changes toast (spec
     *  §1.8) — unless the view autosaves (Enable Autosave's whole point), in
     *  which case the edit IS the commit. */
    setColumns: (next: string[]) =>
      patch((prev) =>
        prev.autosave
          ? { draftColumns: next, savedColumns: next, columnsDirty: false }
          : { draftColumns: next, columnsDirty: true },
      ),
    /** Revert restores the last COMMITTED column set (`null` = blueprint
     *  defaults, which is what an unsaved view reverts to). */
    revertColumns: () => patch((prev) => ({ draftColumns: prev.savedColumns, columnsDirty: false })),
    /** Commit: the draft becomes the saved set. Durable for as long as the
     *  owner holds the snapshot — a session by default, a real store when the
     *  app injects one. */
    saveColumns: () => patch((prev) => ({ savedColumns: prev.draftColumns, columnsDirty: false })),
    columnsDirty: state.columnsDirty,
    customizeDirty: state.customizeDirty,
    setCustomizeDirty: (next: boolean) => patch({ customizeDirty: next }),
    autosave: state.autosave,
    enableAutosave: () =>
      patch((prev) => ({
        autosave: true,
        savedColumns: prev.draftColumns,
        columnsDirty: false,
        customizeDirty: false,
      })),
    catalog,
    vehiclesHidden: state.vehiclesHidden,
    setVehiclesHidden: (next: boolean) => patch({ vehiclesHidden: next }),
    openDrawer: state.openDrawer,
    setOpenDrawer: (next: 'zones' | 'poi' | 'incidents' | null) => patch({ openDrawer: next }),
    checkedZoneIds: state.checkedZoneIds,
    setCheckedZoneIds: (next: string[]) => patch({ checkedZoneIds: next }),
    checkedPoiIds: state.checkedPoiIds,
    setCheckedPoiIds: (next: string[]) => patch({ checkedPoiIds: next }),
  }
}
