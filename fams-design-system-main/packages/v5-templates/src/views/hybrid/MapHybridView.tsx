import { lazy, Suspense, useMemo, useRef, useState, type ReactNode } from 'react'
import { ClusterBadge, CountTabs, VehicleMarker, type ClusterBadgeSegment, type VehicleStatusTone } from '@fams/ui-kit'
import { HybridView as HybridViewShell } from '@fams/ui-kit'
import { compileFieldSet, type EntityConfig, type EntityRecord, type FilterFacet } from '@fams/v5-composer'
// TYPE-ONLY map-entry import — erased at build time (lazy-weight rule).
import type { LngLat, MapClusterDatum, MapMarkerDatum, MapMarkerRenderState } from '../../map/MapPanel.types'
import type { WeatherStationDatum } from '../../map/weather-types'
import { cn } from '../../lib/cn'
import { DEFAULT_GLOBAL_BASEMAP_ID, GLOBAL_BASEMAP_IDS, resolveGlobalBasemapStyleUrl, useGlobalBasemapId } from '../../map/global-basemap-store'
// Runtime import of a LIGHT store module (zero maplibre/deck.gl deps — same
// carve-out `global-basemap-store` above already uses), never the heavy
// `map/` entry itself: the generic hybrid lens's opt-in cluster toggle
// (`uiConfig.map.cluster`) shares the app-wide preference Live Monitoring's
// fleet map already persists, rather than inventing a second one.
import { useClusterEnabled } from '../../map/cluster-toggle-store'
// Same light-store carve-out as `cluster-toggle-store` above — the traffic
// toggle shares the app-wide persisted preference Live Monitoring writes.
import { useTrafficOverlayEnabled } from '../../map/traffic-overlay-store'
// LIGHT search-provider factory + gazetteer data (zero maplibre/deck.gl deps
// — the same carve-out `views/MapView.tsx` uses for `qatarGazetteer`).
import { createDefaultSearchProviders } from '../../map/search/search-providers'
import { qatarGazetteer, type MapGazetteerEntry } from '../../map/search/qatar-gazetteer'
// TYPE-ONLY live-chrome imports — erased at build time (lazy-weight rule).
import type { LiveMapToolId } from '../../map/chrome/LiveMapTools'
import type { LiveMapPlace, LivePoiDatum, LiveZoneDatum } from '../../map/live-types'
import type { MapZoneDatum } from '../../map/MapPanel.types'
import { deriveLivePois, deriveLiveZones } from '../live-data'
import { PoiDrawer, ZonesDrawer } from '../live/ZonesDrawer'
import { readPersistedSyncWithMap, writePersistedSyncWithMap } from '../live/sync-with-map-storage'
import { recordNounFor } from '../actions/module-actions-config'
import { downloadRecords, exportColumnsFor } from '../actions/export-records'
import { useModuleViewFacets } from '../use-module-view-facets'
import type { ModuleViewAssigneeFacet } from '../ModuleViewFilters'
import type { RecordLensStateProps } from '../RecordViewStates'
import { RecordCountRow } from '../RecordCountRow'
import { applyViewState, type ViewSort } from '../saved-views'
import type { GroupByMenuOption } from '../GroupByMenuButton'
import type { SortMenuOption } from '../SortMenuButton'
import { ALL_STAGE, buildStageTabItems, useStageTabsState } from '../stage-tabs'
import { RecordMapChrome, type RecordMapTool } from './RecordMapChrome'
import { RecordMapListPane } from './RecordMapListPane'
import { RecordMapListToolbar } from './RecordMapListToolbar'
import { RecordMapSlot } from './RecordMapSlot'
import { RecordMapPopup } from './RecordMapPopup'
import { RecordMapMeasureReadout, RecordMapNotice } from './RecordMapOverlays'
/**
 * The docked weather-station drawer (SPEC 22:38014/22:40509) — heavy `./map`
 * entry, reached lazily by PACKAGE SPECIFIER exactly like `RecordMapSlot`'s
 * own map import (lazy-weight rule; see that file's header).
 */
const LazyWeatherStationDrawer = lazy(() =>
  import('@fams/v5-templates/map').then((mod) => ({ default: mod.WeatherStationDrawer })),
)
/**
 * Live Monitoring's floating map chrome (SPEC §2.3) — rendered here when the
 * blueprint declares `uiConfig.map.tools` (chrome-parity requirement,
 * 2026-09-01: the Requests & Complaints hybrid carries the IDENTICAL tools
 * stack the fleet hybrid does — search, cluster eye, layers switcher,
 * traffic, POI/Zones above Weather/Incidents, per the blueprint's own tool
 * order). Heavy `./map` entry, reached lazily by package specifier exactly
 * like `RecordMapSlot`/`LazyWeatherStationDrawer` (lazy-weight rule).
 */
const LazyLiveMapTools = lazy(() =>
  import('@fams/v5-templates/map').then((mod) => ({ default: mod.LiveMapTools })),
)

import {
  colorKeyTotals,
  deriveRecordGeometry,
  focusOf,
  pathLengthKm,
  itemsInBbox,
  recordMapConfig,
  toMapData,
  visibleOnMap,
  type RecordGeometry,
} from './record-map-model'

/**
 * The list pane's in-panel toolbar (SPEC `pipelines-hybrid-29-41808` §1.1) —
 * DATA config only. Every field mirrors a shape `ModuleViewFilters` /
 * `useModuleViewFacets` already derive from a blueprint (`FilterFacet`,
 * `SortMenuOption`, `ModuleViewAssigneeFacet`), so a metadata-wiring wave can
 * hand this the SAME derivation it already computes for the page-level
 * toolbar — no second facet vocabulary. Omit the whole prop (or any one
 * field) to hide that control; the pane renders no toolbar at all when every
 * field is omitted.
 */
export interface MapHybridViewToolbarConfig {
  /** Row 1 search input. Presence of this key turns the control on; `placeholder` is its only sub-option — the VALUE is the sibling `search`/`onSearchChange` props (controlled) or internal state (uncontrolled). */
  search?: { placeholder?: string }
  /** Row 1 filter funnel — one section per facet with `options`. */
  filterFacets?: FilterFacet[]
  /**
   * Row 2 Group By control (`GroupByMenuButton`, SPEC Addendum "Group By
   * popup" / AC-6.1..6.4). `defaultKey` is what the popover's `Reset`
   * restores — this control always has an active grouping (no "ungrouped"
   * state, AC-6.2), so a default is mandatory whenever `options` is
   * non-empty. The VALUE is the sibling `groupBy`/`onGroupByChange` props
   * (controlled) or internal state seeded from `defaultKey` (uncontrolled) —
   * same convention as `search`/`sort` below.
   */
  groupBy?: { options: GroupByMenuOption[]; defaultKey: string }
  /** Row 2 sort control (`SortMenuButton`, `variant="toggle"` — SPEC Addendum "Sort popup" / AC-7.1..7.4). */
  sortOptions?: SortMenuOption[]
  /** Row 2 assignee split-pill — its value lives at `filters[assigneeFacet.col]`, same convention as `ModuleViewFilters`. */
  assigneeFacet?: ModuleViewAssigneeFacet
  /**
   * Row 2 generic single-select facet dropdown (`uiConfig.map.records.
   * toolbar.facetCol`) — the seam a field that ISN'T `Assignee`-typed uses
   * to get the split-pill toolbar experience (single active value, live
   * counts) without retyping the field. `options[].count` is the LIVE count
   * over the pane's own search/other-filters-narrowed record set (recomputed
   * by the caller every render, same convention as `RecordMapChrome`'s
   * legend counts). Its value lives at `filters[facet.col]` — a single-
   * element array, or `[]` for "no selection" — same shared filter channel
   * every other row-2 control uses.
   */
  facet?: { col: string; label: string; options: { value: string; label: string; count: number }[] }
  /** Row 2 download/export — fires with the pane's CURRENT search/filter/sort-narrowed record set (AC-4.6). Omit to hide the button. */
  onDownload?: (records: EntityRecord[]) => void
  /** Addendum detail 5 — a labeled primary create button flush-right in row 1 (with Download lifted beside it). Omit for the compact "+" icon button. */
  createLabel?: string
  /**
   * Row 0 — Stage tabs (SPEC Addendum "Stage tabs": the Requests & Complaints
   * hybrid's "All / Triage / Acknowledged / …" strip). A `CountTabs` row
   * ABOVE the rest of the toolbar — "All" plus one tab per
   * `uiConfig.statusList` entry, each carrying a LIVE count over the pane's
   * own search/filter-narrowed records (same live-recompute convention the
   * generic `facetCol` above already uses). Selecting a specific stage
   * narrows the list + map to just that stage. Because the active tab
   * already states the stage, this lens ALSO suppresses the redundant
   * per-card stage chip (`card.stageChip`) and any Group-By-status section
   * header while a specific stage is active — both return on "All" (root
   * rule: never a business-vocabulary flag, this reads the SAME
   * `uiConfig.statusList` the chip/grouping already key off). Omit (or
   * `false`), or when `uiConfig.statusList` is empty, to render no stage-tab
   * row at all (unchanged default).
   */
  stageTabs?: boolean
}

export interface MapHybridViewProps extends RecordLensStateProps {
  /** Module config — the list cards, the geometry bindings and the colour key all come from it. */
  config: EntityConfig
  /**
   * Records to render. When `toolbar` is omitted, still expected
   * search/filter-narrowed by the caller (unchanged default behavior). When
   * `toolbar` is supplied, this is the FULL set — the toolbar's own
   * search/filter/sort narrows it internally (`applyViewState`), so a caller
   * adopting the in-panel toolbar should stop pre-filtering and hand over
   * every record instead.
   */
  records: EntityRecord[]
  /** Controlled map↔list highlight; omit for uncontrolled. */
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  /** Card / popup "open" — the app owns the detail surface (rule 8). */
  onOpenRecord?: (record: EntityRecord) => void
  /** Controlled legend selection (colour-key values). Omit for uncontrolled (all on). */
  visibleKeys?: string[]
  onVisibleKeysChange?: (keys: string[]) => void
  /** A5's flat multi-select set, shared with every other lens. */
  selectedIds?: readonly string[]
  onSelectedIdsChange?: (ids: string[]) => void
  /** A5's shared hover-revealed `…` row menu. */
  renderRowActions?: (record: EntityRecord) => ReactNode
  /**
   * Basemap style URLs the layers control cycles between. When omitted the
   * lens reads/writes the APP-WIDE basemap id (`useGlobalBasemapId`) so it
   * agrees with Live Monitoring, dashboard maps and record maps; passing a
   * list opts this lens out of the shared selection and cycles locally.
   */
  basemapStyles?: string[]
  /** Fires when the draw tool completes a shape — the app owns the write. */
  onZoneDrawn?: (geojson: unknown) => void
  /** Resets the caller's own search + filters; also re-checks every legend entry. */
  onClearFilters?: () => void
  /**
   * The list pane's in-panel toolbar config (SPEC §1.1) — data only (facets,
   * sort options, the assignee facet). Omit entirely to render the pane with
   * no toolbar at all (unchanged default behavior).
   */
  toolbar?: MapHybridViewToolbarConfig
  /** Toolbar search text. Uncontrolled (internal state) when omitted. */
  search?: string
  onSearchChange?: (value: string) => void
  /** Toolbar filter + assignee-pill values (facet col → selected values). Uncontrolled (internal state) when omitted. */
  filters?: Record<string, string[]>
  onFilterChange?: (col: string, values: string[]) => void
  /** Toolbar group-by. Uncontrolled (internal state, seeded from `toolbar.groupBy.defaultKey`) when omitted. */
  groupBy?: string
  onGroupByChange?: (value: string) => void
  /**
   * Toolbar stage tabs (SPEC Addendum "Stage tabs") — the active `statusList`
   * key, or the `'all'` sentinel for no stage narrowing. Uncontrolled
   * (internal state, default `'all'`) when omitted.
   */
  activeStage?: string
  onActiveStageChange?: (stage: string) => void
  /** Toolbar sort. Uncontrolled (internal state) when omitted. */
  sort?: ViewSort | null
  onSortChange?: (sort: ViewSort | null) => void
  className?: string
}


/**
 * MapHybridView — the generic list + map hybrid lens. [tier-2 pattern]
 *
 * SPEC §1.3's two frames in ONE component: a list pane of blueprint-driven
 * cards on the leading edge and a record map filling the rest. Everything that
 * varies is config (`uiConfig.map.records`) — the colour key, its value→colour
 * map, whether the legend filters, and whether a record carries a point, a
 * polygon, or both. Nothing here names a domain (UX L.78's parity check).
 *
 * Per-record geometry, NOT a mode: see `record-map-model.ts`'s header for why
 * the two location shapes are one lens, never a second view kind.
 *
 * Two-way sync (Dev Note 32270) runs on ONE selection id — the same one the
 * open-record path uses. List card click → select → the camera eases to that
 * record's pin; pin/polygon click → the same select → the list pane scrolls the
 * card into view and rings it. A5's multi-select set is untouched by either
 * direction. Empty / filtered / error states come from the shared
 * `RecordViewStates` seam (`RecordLensStateProps`), forwarded to the list pane
 * (UX J.57).
 */
export function MapHybridView({
  config,
  records,
  selectedId,
  onSelect,
  onOpenRecord,
  visibleKeys,
  onVisibleKeysChange,
  selectedIds,
  onSelectedIdsChange,
  renderRowActions,
  basemapStyles,
  onZoneDrawn,
  onClearFilters,
  isFiltered,
  error,
  onRetry,
  onCreateRecord,
  toolbar,
  search: searchProp,
  onSearchChange,
  filters: filtersProp,
  onFilterChange,
  groupBy: groupByProp,
  onGroupByChange,
  activeStage: activeStageProp,
  onActiveStageChange,
  sort: sortProp,
  onSortChange,
  className,
}: MapHybridViewProps) {
  const meta = useMemo(() => recordMapConfig(config), [config])
  const compiled = useMemo(() => compileFieldSet(config), [config])
  /*
   * Stage chip (`uiConfig.map.records.card.stageChip`) — resolved from
   * `uiConfig.statusList` (the SAME stage vocabulary the Kanban board's
   * columns already use) by the record's own `status`. Scoped to the hybrid
   * list card only — never folded into the shared `kanbanCard` config, so
   * the real Kanban board (whose columns already ARE the stage) is
   * unaffected.
   */
  const showStageChip = Boolean(config.uiConfig.map?.records?.card?.stageChip)
  const stageChipOf = useMemo(() => {
    if (!showStageChip) return undefined
    const byKey = new Map(config.uiConfig.statusList.map((s) => [s.key, s] as const))
    return (item: RecordGeometry) => {
      const stage = byKey.get(String(item.record.status ?? ''))
      return stage ? { label: stage.label, color: stage.color } : undefined
    }
  }, [showStageChip, config])
  const noun = useMemo(() => recordNounFor(config), [config])
  const keyed = useMemo(() => new Set(meta.entries.map((e) => e.key)), [meta])
  const allKeys = useMemo(() => meta.entries.map((e) => e.key), [meta])

  /*
   * Blueprint-declared in-panel toolbar (`uiConfig.map.records.toolbar`,
   * SPEC Addendum) — when the caller passes no `toolbar` prop, the config
   * block turns the SAME page-level derivations (`useModuleViewFacets`) into
   * a `MapHybridViewToolbarConfig`, so a metadata-only blueprint (the demo
   * app never writes bespoke UI) gets the full toolbar. An explicit `toolbar`
   * prop always wins; both absent keeps the pane toolbar-less (unchanged).
   */
  const derived = useModuleViewFacets(config, records)
  const declared = config.uiConfig.map?.records?.toolbar
  const labelOfCol = useMemo(() => {
    const map = new Map<string, string>()
    for (const col of config.systemcolumns) map.set(col.col, col.name)
    return map
  }, [config])
  const derivedToolbar = useMemo<MapHybridViewToolbarConfig | undefined>(() => {
    if (!declared) return undefined
    const built: MapHybridViewToolbarConfig = {}
    if (declared.search)
      built.search = typeof declared.search === 'object' ? declared.search : { placeholder: derived.searchPlaceholder }
    if (declared.filters) built.filterFacets = derived.facets
    if (declared.groupBy)
      built.groupBy = {
        options: declared.groupBy.cols.map((col) => ({ key: col, label: labelOfCol.get(col) ?? col })),
        defaultKey: declared.groupBy.defaultCol,
      }
    if (declared.sort) built.sortOptions = derived.sortOptions.map((o) => ({ key: o.col, label: o.label }))
    if (declared.assignee) built.assigneeFacet = derived.assigneeFacet
    if (declared.stageTabs) built.stageTabs = true
    if (declared.download)
      built.onDownload = (rows) => downloadRecords('csv', exportColumnsFor(config), rows, config.name)
    if (typeof declared.create === 'object' && declared.create.label) built.createLabel = declared.create.label
    return built
  }, [declared, derived, labelOfCol, config])
  const effectiveToolbar = toolbar ?? derivedToolbar

  /*
   * Station-drawer routing (`uiConfig.map.stationDrawer`, SPEC 22:38014 /
   * 22:40509): a module whose records ARE weather stations opens the docked
   * drawer (readings grid + 24h trend + Forecast/QMD tables) instead of the
   * app's generic profile. Matching is metadata-side data (`weather.
   * stations`) by name/id; an unmatched record falls back to `onOpenRecord`.
   */
  const stations = useMemo<WeatherStationDatum[]>(() => {
    if (!config.uiConfig.map?.stationDrawer) return []
    return (config.uiConfig.map?.weather?.stations ?? []) as WeatherStationDatum[]
  }, [config])
  const [activeStation, setActiveStation] = useState<WeatherStationDatum | null>(null)
  const stationFor = (record: EntityRecord): WeatherStationDatum | undefined => {
    if (!stations.length) return undefined
    const title = String(record.title ?? '').trim().toLowerCase()
    const id = String(record.id ?? '')
    return stations.find((st) => st.id === id || st.name.trim().toLowerCase() === title)
  }
  const openRecord = (record: EntityRecord) => {
    const station = stationFor(record)
    if (station) setActiveStation(station)
    else onOpenRecord?.(record)
  }

  /*
   * The in-panel toolbar's search/filter/sort state (SPEC §1.1) — the SAME
   * controlled-if-supplied / internal-otherwise pattern `selectedId` and
   * `visibleKeys` already use in this file. `applyViewState` is the exact pure
   * helper `ModuleView`'s own page-level toolbar uses to turn a `ViewState`
   * into a filtered/sorted array (`saved-views.ts`) — reused here verbatim so
   * moving search/filter/sort INTO the panel doesn't invent a second
   * filtering implementation.
   */
  const [internalSearch, setInternalSearch] = useState('')
  const search = searchProp !== undefined ? searchProp : internalSearch
  const setSearch = (value: string) => {
    if (searchProp === undefined) setInternalSearch(value)
    onSearchChange?.(value)
  }

  const [internalFilters, setInternalFilters] = useState<Record<string, string[]>>({})
  const filters = filtersProp ?? internalFilters
  const setFilter = (col: string, values: string[]) => {
    if (filtersProp === undefined) setInternalFilters((prev) => ({ ...prev, [col]: values }))
    onFilterChange?.(col, values)
  }

  const [internalSort, setInternalSort] = useState<ViewSort | null>(null)
  const sort = sortProp !== undefined ? sortProp : internalSort
  const setSort = (next: ViewSort | null) => {
    if (sortProp === undefined) setInternalSort(next)
    onSortChange?.(next)
  }

  // Group By (SPEC Addendum AC-6.1..6.4) — same controlled-if-supplied /
  // internal-otherwise pattern as `sort` above, seeded from the config's own
  // `defaultKey` since this control always has an active grouping (never
  // "ungrouped", AC-6.2).
  const [internalGroupBy, setInternalGroupBy] = useState<string | undefined>(undefined)
  const groupBy = groupByProp ?? internalGroupBy ?? effectiveToolbar?.groupBy?.defaultKey
  const setGroupBy = (next: string) => {
    if (groupByProp === undefined) setInternalGroupBy(next)
    onGroupByChange?.(next)
  }

  /*
   * Stage tabs (`uiConfig.map.records.toolbar.stageTabs`, SPEC Addendum
   * "Stage tabs") — controlled-if-supplied / internal-otherwise state via
   * the shared `useStageTabsState` (`../stage-tabs`, also used by
   * `HybridView`'s list+detail hybrid). `ALL_STAGE` is the sentinel for "no
   * stage narrowing" — never a real `statusList` key — so it survives a
   * `statusList` edit without needing to match a stale key.
   */
  const showStageTabs = Boolean(effectiveToolbar?.stageTabs) && config.uiConfig.statusList.length > 0
  const [activeStage, setActiveStage] = useStageTabsState(activeStageProp, onActiveStageChange)
  const stageNarrowed = showStageTabs && activeStage !== ALL_STAGE

  const searchColumns = useMemo(() => config.uiConfig.search?.columns ?? ['title'], [config])
  const toolbarNarrowed = Boolean(search.trim()) || Object.values(filters).some((v) => v.length > 0)
  // Stage narrowing reuses the SAME generic filter channel `applyViewState`
  // already applies per-column (never a second filtering implementation) —
  // it folds one more `status` entry into the filters map fed to it, keyed
  // off the SAME column `groupBy: 'status'` already reads.
  const effectiveFilters = useMemo(
    () => (stageNarrowed ? { ...filters, status: [activeStage] } : filters),
    [filters, stageNarrowed, activeStage],
  )
  const viewFilteredRecords = useMemo(
    () => applyViewState(records, { filters: effectiveFilters, search, sort }, searchColumns),
    [records, effectiveFilters, search, sort, searchColumns],
  )

  const items = useMemo(() => deriveRecordGeometry(config, viewFilteredRecords), [config, viewFilteredRecords])
  const totals = useMemo(() => colorKeyTotals(items), [items])

  /*
   * Stage-tab counts — computed over the records that pass every OTHER
   * active filter/search (the stage narrowing itself excluded), same live-
   * recompute convention the generic `facetCol` below already uses, so
   * switching tabs never shifts a SIBLING tab's own count.
   */
  const preStageRecords = useMemo(
    () => (showStageTabs ? applyViewState(records, { filters, search, sort: null }, searchColumns) : []),
    [records, filters, search, searchColumns, showStageTabs],
  )
  const stageTabItems = useMemo(
    () => (showStageTabs ? buildStageTabItems(preStageRecords, config.uiConfig.statusList) : []),
    [showStageTabs, preStageRecords, config],
  )

  /*
   * Generic single-select facet (`uiConfig.map.records.toolbar.facetCol`) —
   * the seam a field that isn't `Assignee`-typed uses to get the split-pill
   * toolbar experience (single active value, live counts, filters list+map)
   * without retyping it (see `RecordMapListToolbar`'s `facet` prop doc).
   * Reuses the SAME derived facet `deriveFilters()`/`useModuleViewFacets`
   * already computed for the page-level "All Filters" panel (`derived.
   * facets`, matched by `col`) — never a second facet vocabulary. Its option
   * counts are recomputed LIVE from the records that pass every OTHER active
   * filter/search (this facet's own selection excluded), same convention
   * `RecordMapChrome`'s legend/cluster counts already use — a change to the
   * facet's own selection narrows `viewFilteredRecords`/the map, never its
   * own option counts.
   */
  const facetCol = declared?.facetCol
  const facetDef = useMemo(
    () => (facetCol ? derived.facets.find((f) => f.col === facetCol) : undefined),
    [facetCol, derived.facets],
  )
  const facetCountBase = useMemo(() => {
    if (!facetCol) return []
    const otherFilters = { ...filters }
    delete otherFilters[facetCol]
    return applyViewState(records, { filters: otherFilters, search, sort: null }, searchColumns)
  }, [records, facetCol, filters, search, searchColumns])
  const facet = useMemo(() => {
    if (!facetCol || !facetDef) return undefined
    const counts = new Map<string, number>()
    for (const record of facetCountBase) {
      const value = record[facetCol]
      if (value == null || value === '') continue
      counts.set(String(value), (counts.get(String(value)) ?? 0) + 1)
    }
    return {
      col: facetDef.col,
      label: facetDef.label,
      options: (facetDef.options ?? []).map((value) => ({
        value,
        label: value,
        count: counts.get(value) ?? 0,
      })),
    }
  }, [facetCol, facetDef, facetCountBase])

  const [internalId, setInternalId] = useState<string | null>(null)
  const activeId = selectedId !== undefined ? selectedId : internalId
  const select = (id: string | null) => {
    if (selectedId === undefined) setInternalId(id)
    onSelect?.(id)
  }

  const [keyState, setKeyState] = useState<string[] | null>(null)
  const activeKeys = visibleKeys ?? keyState ?? allKeys
  const toggleKey = (key: string, checked: boolean) => {
    const next = checked ? [...activeKeys, key] : activeKeys.filter((k) => k !== key)
    setKeyState(next)
    onVisibleKeysChange?.(next)
  }
  const showAll = () => {
    setKeyState(allKeys)
    onVisibleKeysChange?.(allKeys)
    // The panel's OWN search/filter/sort narrow the same record set the
    // legend colours key off of — "Show all" / "Clear filters" must undo
    // every one of them, or a search term left in the box would keep the
    // list narrowed right after the user asked to see everything again.
    setSearch('')
    for (const [col, values] of Object.entries(filters)) if (values.length) setFilter(col, [])
    setSort(null)
    // A specific stage tab narrows the list+map too — "Show all" returns to
    // the "All" tab along with every other narrowing.
    if (stageNarrowed) setActiveStage(ALL_STAGE)
    // A selection-frozen sync scope is a narrowing too — lift it so "Show
    // all" really shows everything the live camera frames.
    setFrozenBbox(null)
    onClearFilters?.()
  }

  /** Per-record eye toggles (SPEC row 20) — map visibility only; the list keeps every card. */
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set())
  const toggleHidden = (id: string) =>
    setHiddenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Global-sync (map-layer-switcher spec point 5): the layers button cycles
  // the SHARED basemap id, so a pick here replicates to every other map
  // surface. A caller-supplied `basemapStyles` URL list keeps the legacy
  // local cycle over its own entries.
  const [globalBasemapId, setGlobalBasemapId] = useGlobalBasemapId(DEFAULT_GLOBAL_BASEMAP_ID)
  const [localBasemapIndex, setLocalBasemapIndex] = useState(0)
  const basemapIndex = basemapStyles
    ? localBasemapIndex
    : Math.max(0, GLOBAL_BASEMAP_IDS.indexOf(globalBasemapId as (typeof GLOBAL_BASEMAP_IDS)[number]))
  const cycleBasemap = () => {
    if (basemapStyles) {
      setLocalBasemapIndex((i) => (i + 1) % basemapStyles.length)
      return
    }
    setGlobalBasemapId(GLOBAL_BASEMAP_IDS[(basemapIndex + 1) % GLOBAL_BASEMAP_IDS.length])
  }
  const basemapStyleUrl = basemapStyles
    ? basemapStyles[basemapIndex % basemapStyles.length]
    : resolveGlobalBasemapStyleUrl(globalBasemapId)
  const [tool, setTool] = useState<RecordMapTool | null>(null)
  const [measured, setMeasured] = useState<LngLat[]>([])
  const [fitNonce, setFitNonce] = useState(0)
  const [popupId, setPopupId] = useState<string | null>(null)

  const mappable = useMemo(() => items.filter((i) => i.point || i.polygon), [items])
  const shown = useMemo(
    () => visibleOnMap(mappable, { visibleKeys: activeKeys, keyed, hiddenIds, filterable: meta.filterable }),
    [mappable, activeKeys, keyed, hiddenIds, meta.filterable],
  )
  const { markers, zones } = useMemo(() => toMapData(shown, meta, activeId), [shown, meta, activeId])
  const focus = useMemo(() => focusOf(items.find((i) => i.id === activeId)), [items, activeId])
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])

  /*
   * Live-Monitoring chrome parity (2026-09-01): a blueprint that declares
   * `uiConfig.map.tools` (the SAME metadata key the fleet hybrid reads)
   * swaps this lens's own layers/measure/draw stack for the shared
   * `LiveMapTools` — search, cluster eye, layers switcher, traffic, and the
   * POI/Zones-above-Weather/Incidents end stack in the blueprint's own
   * order — plus the "Sync With Map" list toggle. Everything below is inert
   * for a module that never sets `tools` (unchanged default behavior).
   */
  const liveToolIds = (config.uiConfig.map?.tools ?? undefined) as LiveMapToolId[] | undefined
  const liveTools = Boolean(liveToolIds?.length)
  const clusterConfigured =
    Boolean(config.uiConfig.map?.cluster) || (liveTools && Boolean(liveToolIds?.includes('cluster')))
  const [clusterEnabled, toggleClusterEnabled] = useClusterEnabled(clusterConfigured)

  /* Zones / POI drawers — the SAME `uiConfig.map.zones`/`pois` vocabulary +
     `ZonesDrawer`/`PoiDrawer` components Live Monitoring renders. */
  const liveZones = useMemo<LiveZoneDatum[]>(() => (liveTools ? deriveLiveZones(config) : []), [liveTools, config])
  const livePois = useMemo<LivePoiDatum[]>(() => (liveTools ? deriveLivePois(config) : []), [liveTools, config])
  const [openDrawer, setOpenDrawer] = useState<'zones' | 'poi' | null>(null)
  const [checkedZoneIds, setCheckedZoneIds] = useState<string[]>([])
  const [checkedPoiIds, setCheckedPoiIds] = useState<string[]>([])

  /* Traffic — the shared persisted overlay preference (SPEC 3.19). */
  const [trafficEnabled, setTrafficEnabled] = useTrafficOverlayEnabled(false)

  /* Weather layer — `uiConfig.map.weather.stations` markers behind the
     weather tool, opening the SAME docked station drawer this lens already
     ships for station-record modules. */
  const weatherLayerStations = useMemo<WeatherStationDatum[]>(() => {
    if (!liveTools || config.uiConfig.map?.weather?.enabled === false) return []
    return (config.uiConfig.map?.weather?.stations ?? []) as WeatherStationDatum[]
  }, [liveTools, config])
  const [weatherOn, setWeatherOn] = useState(false)

  /* Incidents layer toggle — this module's records ARE the incident pins, so
     the tool honestly shows/hides the record layer (never an inert button). */
  const [recordsLayerOn, setRecordsLayerOn] = useState(true)

  /* Map place search — the same pluggable providers the fleet map builds:
     the blueprint's `places`, its checked-zone vocabulary, its POIs, and the
     `uiConfig.map.search.gazetteer` gazetteer ("qatar" → `qatarGazetteer`). */
  // Same untyped-metadata escape hatch `views/MapView.tsx` uses for the
  // gazetteer key (`uiConfig.map.search.gazetteer` is app metadata, not a
  // composer-typed binding).
  const searchGazetteer: MapGazetteerEntry[] | undefined =
    (config.uiConfig.map as { search?: { gazetteer?: string } } | undefined)?.search?.gazetteer === 'qatar'
      ? qatarGazetteer
      : undefined
  const searchProviders = useMemo(
    () =>
      liveTools
        ? createDefaultSearchProviders({
            places: (config.uiConfig.map?.places ?? []) as LiveMapPlace[],
            zones: liveZones,
            pois: livePois,
            gazetteer: searchGazetteer,
          })
        : [],
    [liveTools, config, liveZones, livePois, searchGazetteer],
  )
  const [flyTo, setFlyTo] = useState<LngLat | null>(null)

  /* "Sync With Map" (SPEC §3.22 parity) — viewport-scopes the CARD LIST while
     on; the map keeps every pin. Bbox tracked always (subscribing only while
     on shows a stale frame first); a selection freezes the scope at the bbox
     the user actually clicked in (LiveHybridView's own contract), and the
     user's next gesture on the map pane lifts the freeze. */
  const [syncWithMap, setSyncWithMapState] = useState<boolean>(() => readPersistedSyncWithMap() ?? false)
  const setSyncWithMap = (checked: boolean) => {
    setSyncWithMapState(checked)
    writePersistedSyncWithMap(checked)
  }
  const viewportBboxRef = useRef<[number, number, number, number] | null>(null)
  const [viewportBbox, setViewportBbox] = useState<[number, number, number, number] | null>(null)
  const [frozenBbox, setFrozenBbox] = useState<[number, number, number, number] | null>(null)
  const handleViewportChange = (bbox: [number, number, number, number]) => {
    viewportBboxRef.current = bbox
    setViewportBbox((prev) =>
      prev && prev[0] === bbox[0] && prev[1] === bbox[1] && prev[2] === bbox[2] && prev[3] === bbox[3] ? prev : bbox,
    )
  }

  /*
   * LM-chrome overlay data (`uiConfig.map.tools` mode): the record layer
   * honors the incidents-tool toggle, checked POIs plot as pins, the weather
   * tool plots the blueprint's stations (click → the docked station drawer),
   * and checked zones append their polygons — all over the SAME
   * markers/zones channels the record data already uses. Prefixed ids keep
   * the overlay entries out of the record-selection path.
   */
  const poiById = useMemo(() => new Map(livePois.map((p) => [p.id, p])), [livePois])
  const stationById = useMemo(
    () => new Map(weatherLayerStations.map((s) => [s.id, s])),
    [weatherLayerStations],
  )
  const mapMarkers = useMemo(() => {
    if (!liveTools) return markers
    const base = recordsLayerOn ? markers : []
    const extras: MapMarkerDatum[] = []
    for (const id of checkedPoiIds) {
      const poi = poiById.get(id)
      if (poi) extras.push({ id: `poi:${poi.id}`, position: poi.position, color: poi.color ?? 'var(--color-chart-4)', radius: 7, label: poi.name })
    }
    if (weatherOn)
      for (const station of weatherLayerStations)
        extras.push({ id: `station:${station.id}`, position: station.position, color: 'var(--color-chart-2)', radius: 7, label: station.name })
    return extras.length ? [...base, ...extras] : base
  }, [liveTools, markers, recordsLayerOn, checkedPoiIds, poiById, weatherOn, weatherLayerStations])
  const mapZones = useMemo(() => {
    if (!liveTools || checkedZoneIds.length === 0) return zones
    const extra: MapZoneDatum[] = liveZones
      .filter((zone) => checkedZoneIds.includes(zone.id))
      .map((zone) => ({
        id: `zone:${zone.id}`,
        points: zone.points,
        color: zone.color,
        label: zone.label,
        fillOpacity: zone.fillOpacity,
      }))
    return [...zones, ...extra]
  }, [liveTools, zones, checkedZoneIds, liveZones])

  /*
   * Config-driven marker ART (`uiConfig.map.vehicleArt`, A24's entity-
   * agnostic key — tanker/car use the SAME mechanism) + opt-in CLUSTERING
   * (`uiConfig.map.cluster`), both scoped to whichever module's blueprint
   * actually sets them (the rain-sensors/Weather Stations module, currently
   * the only one that does) — every other caller of this shared lens keeps
   * the plain one-circle-per-record GPU layer with no cluster toggle.
   */
  const markerArt = config.uiConfig.map?.vehicleArt
  const statusToneOf = (item: RecordGeometry): VehicleStatusTone =>
    item.colorKey && item.colorKey.trim().toLowerCase() === 'active' ? 'success' : 'muted'
  const renderStationMarker = markerArt
    ? (marker: MapMarkerDatum, _state: MapMarkerRenderState) => {
        const item = byId.get(marker.id)
        if (!item) return null
        return (
          <VehicleMarker
            label={item.label}
            art={markerArt}
            tone={statusToneOf(item)}
            // Static entities never move — no badge, no chips (requirement:
            // "no mobility/status badges... Active/Inactive is just a tint").
            badge={false}
            showPill={false}
            selected={activeId === item.id}
            onClick={() => {
              select(item.id)
              openRecord(item.record)
            }}
          />
        )
      }
    : undefined
  const renderStationCluster = markerArt
    ? (clusterDatum: MapClusterDatum) => {
        const counts = new Map<VehicleStatusTone, number>()
        for (const member of clusterDatum.markers) {
          const memberItem = (member.data as RecordGeometry | undefined) ?? byId.get(member.id)
          const tone = memberItem ? statusToneOf(memberItem) : 'muted'
          counts.set(tone, (counts.get(tone) ?? 0) + 1)
        }
        const order: VehicleStatusTone[] = ['success', 'warning', 'error', 'muted']
        const segments: ClusterBadgeSegment[] = order
          .filter((tone) => counts.has(tone))
          .map((tone) => ({ tone, count: counts.get(tone)! }))
        return <ClusterBadge count={clusterDatum.count} segments={segments} />
      }
    : undefined

  const pick = (item: RecordGeometry | undefined, position?: LngLat) => {
    if (tool === 'measure') {
      if (position) setMeasured((prev) => [...prev, position])
      return
    }
    if (!item) return
    // Freeze the sync scope at the bbox the user clicked in (LM contract) —
    // the camera ease that follows must not re-narrow the list mid-gesture.
    setFrozenBbox(viewportBboxRef.current)
    select(item.id)
    // A module whose markers carry their own art (`vehicleArt`) opens the
    // record's detail surface DIRECTLY off the marker click — identical to
    // the list-row click (`openRecord` below) — never the generic map popup
    // (requirement: "no popup on map, just side sheet of entity detail").
    if (markerArt) {
      openRecord(item.record)
      return
    }
    setPopupId(item.id)
  }

  const narrowed = meta.filterable && activeKeys.length < allKeys.length
  const ungeocoded = items.length - mappable.length

  const listToolbar = effectiveToolbar ? (
    <RecordMapListToolbar
      search={effectiveToolbar.search ? search : undefined}
      onSearchChange={effectiveToolbar.search ? setSearch : undefined}
      searchPlaceholder={effectiveToolbar.search?.placeholder}
      filterFacets={effectiveToolbar.filterFacets}
      filters={filters}
      onFilterChange={setFilter}
      onCreateRecord={onCreateRecord ? () => onCreateRecord() : undefined}
      createLabel={effectiveToolbar.createLabel}
      groupByOptions={effectiveToolbar.groupBy?.options}
      groupByDefaultKey={effectiveToolbar.groupBy?.defaultKey}
      groupBy={groupBy}
      onGroupByChange={setGroupBy}
      sortOptions={effectiveToolbar.sortOptions}
      sort={sort}
      onSortChange={setSort}
      assigneeFacet={effectiveToolbar.assigneeFacet}
      facet={facet}
      onDownload={
        effectiveToolbar.onDownload ? () => effectiveToolbar.onDownload?.(viewFilteredRecords) : undefined
      }
    />
  ) : null

  /*
   * Stage tabs row (SPEC Addendum "Stage tabs") — "All" plus one `CountTabs`
   * tab per `uiConfig.statusList` entry, rendered ABOVE `listToolbar` (SEE
   * `RecordMapListPane`'s `stageTabs` slot). Composition, never a new
   * primitive (root rule): this is the SAME `CountTabs` `InboxView` already
   * uses for its filter-tabs row.
   */
  const stageTabsNode = showStageTabs ? (
    <div data-slot="record-map-stage-tabs">
      <CountTabs
        aria-label={`Filter ${noun.many} by stage`}
        items={[{ id: ALL_STAGE, label: 'All', count: preStageRecords.length }, ...stageTabItems]}
        value={activeStage}
        onValueChange={setActiveStage}
      />
    </div>
  ) : null

  /*
   * Group By → grouped card list (Addendum AC-6.1: selection regroups the
   * list LIVE). Items are re-ordered by group here — status in stage order
   * (`statusList`), SingleSelect columns in their authored `listValues`
   * order, anything else alphabetically — and the pane draws a header where
   * the label changes. Only active when a toolbar actually offers Group By.
   */
  const groupCol = effectiveToolbar?.groupBy ? groupBy : undefined
  const groupMeta = useMemo(() => {
    if (!groupCol) return undefined
    const order = new Map<string, number>()
    const labels = new Map<string, string>()
    if (groupCol === 'status') {
      ;(config.uiConfig.statusList ?? []).forEach((stage, i) => {
        order.set(stage.key, i)
        labels.set(stage.key, stage.label)
      })
    } else {
      const col = config.systemcolumns.find((c) => c.col === groupCol)
      ;(col?.listValues ?? []).forEach((value, i) => order.set(value, i))
    }
    return { order, labels }
  }, [groupCol, config])
  const groupValueOf = (item: RecordGeometry) => String(item.record[groupCol ?? ''] ?? '')
  /*
   * Stage tabs suppress the "TRIAGE"-style Group-By-status section header
   * while a specific stage is active — the active tab already states the
   * stage, so the header (and, below, the per-card stage chip) would be
   * redundant. Only the STATUS grouping is affected; grouping by anything
   * else (e.g. municipality) keeps its headers regardless of the active
   * stage tab. Both return unconditionally on "All" (`stageNarrowed` false).
   */
  const suppressStageHeader = stageNarrowed && groupCol === 'status'
  const groupLabelOf =
    groupCol && !suppressStageHeader
      ? (item: RecordGeometry) => {
          const value = groupValueOf(item)
          return groupMeta?.labels.get(value) ?? (value || 'No value')
        }
      : undefined
  // Stable re-order by group rank only — within a group the toolbar sort's
  // own order survives (Array.prototype.sort is stable). Unranked values
  // cluster alphabetically after every ranked one.
  const groupedItems = useMemo(() => {
    if (!groupCol || !groupMeta) return items
    const rankOf = (item: RecordGeometry) => {
      const value = String(item.record[groupCol] ?? '')
      return groupMeta.order.has(value) ? groupMeta.order.get(value)! : Number.MAX_SAFE_INTEGER
    }
    return [...items].sort((a, b) => {
      const ra = rankOf(a)
      const rb = rankOf(b)
      if (ra !== rb) return ra - rb
      if (ra === Number.MAX_SAFE_INTEGER)
        return String(a.record[groupCol] ?? '').localeCompare(String(b.record[groupCol] ?? ''))
      return 0
    })
  }, [items, groupCol, groupMeta])

  /*
   * "Sync With Map" list scoping (LM parity): the CARD LIST narrows to the
   * camera's bbox — frozen at selection time (see `pick`/the pane's
   * `onSelect`) until the user's next map gesture — while the map keeps
   * every pin. Only active in LM-chrome mode with the toggle on.
   */
  const syncBbox = liveTools && syncWithMap ? (frozenBbox ?? viewportBbox) : null
  const paneItems = useMemo(
    () => (syncBbox ? itemsInBbox(groupedItems, syncBbox) : groupedItems),
    [groupedItems, syncBbox],
  )
  const syncNarrowed = paneItems.length < groupedItems.length

  return (
    <section data-slot="map-hybrid-view" className={cn('flex h-full min-h-0 min-w-0 flex-col gap-2', className)}>
      <h2 className="sr-only">{`${config.name} list and map`}</h2>
      {/* The ONE count row per lens (UX E.30) — the shared implementation with
          this lens's map-specific copy, not a second row. `hideResultsCount`
          (Addendum detail 7) suppresses it per module, never globally. */}
      {config.uiConfig.hideResultsCount ? null : (
        <RecordCountRow slot="record-map-count-row" shown={shown.length} total={mappable.length} noun={noun}>
          {activeKeys.length === 0 && meta.filterable
            ? `0 of ${mappable.length} ${noun.many} — all ${meta.legendTitle.toLowerCase()} values hidden`
            : `Showing ${shown.length} of ${mappable.length} mapped ${noun.many}`}
        </RecordCountRow>
      )}
      <div className="min-h-0 flex-1">
        <HybridViewShell
          data-slot="map-hybrid-shell"
          // SPEC's "~420px" is a 1920-space PROPORTION, not a value (UX B.6):
          // the pane is a fraction of the lens with a readable floor, so 1440
          // and 1280 scale instead of crushing the map.
          // UX I.55: the floor is 360px, not 288px — at 1280 the 26% share
          // resolved to 307px and the pane was being crushed by the map instead
          // of the map yielding. `min-w-90` is 22.5rem = 360px on the spacing
          // scale (no arbitrary px value).
          listWidthClassName="md:w-[26%] md:min-w-90 md:max-w-md"
          listLabel="List"
          mapLabel="Map"
          list={
            <RecordMapListPane
              config={config}
              compiled={compiled}
              items={paneItems}
              groupLabelOf={groupLabelOf}
              selectedId={activeId}
              onSelect={(id) => {
                // A list selection eases the camera — freeze the sync scope at
                // the bbox the user clicked in (LiveHybridView's contract), or
                // the moving camera would immediately re-narrow the list.
                setFrozenBbox(viewportBboxRef.current)
                select(id)
                const record = byId.get(id)?.record
                if (record) openRecord(record)
              }}
              hiddenIds={hiddenIds}
              onToggleHidden={toggleHidden}
              stageChipOf={stageNarrowed ? undefined : stageChipOf}
              selectedIds={selectedIds}
              onSelectedIdsChange={onSelectedIdsChange}
              renderActions={renderRowActions}
              recordNoun={noun}
              isFiltered={isFiltered || toolbarNarrowed || syncNarrowed || stageNarrowed}
              onClearFilters={showAll}
              error={error}
              onRetry={onRetry}
              onCreateRecord={onCreateRecord}
              toolbar={listToolbar}
              stageTabs={stageTabsNode}
              syncWithMap={liveTools ? syncWithMap : undefined}
              onSyncWithMapChange={liveTools ? setSyncWithMap : undefined}
            />
          }
          map={
            <div
              className="relative h-full min-h-0"
              // The user's own gesture on the map pane lifts a selection's
              // sync-scope freeze (LiveHybridView's contract) — capture
              // phase, because MapLibre stops these before they reach us.
              onPointerDownCapture={liveTools ? () => setFrozenBbox(null) : undefined}
              onWheelCapture={liveTools ? () => setFrozenBbox(null) : undefined}
            >
              <RecordMapSlot
                markers={mapMarkers}
                zones={mapZones}
                selectedMarkerId={popupId ?? undefined}
                onMarkerClick={(marker: MapMarkerDatum) => {
                  // LM-chrome overlay entries (prefixed ids) never enter the
                  // record-selection path: a station pin opens the docked
                  // station drawer, a POI pin just eases the camera to it.
                  if (marker.id.startsWith('station:')) {
                    const station = stationById.get(marker.id.slice('station:'.length))
                    if (station) setActiveStation(station)
                    return
                  }
                  if (marker.id.startsWith('poi:')) {
                    const poi = poiById.get(marker.id.slice('poi:'.length))
                    if (poi) setFlyTo(poi.position)
                    return
                  }
                  pick(byId.get(marker.id), marker.position)
                }}
                onZoneClick={(zone) => pick(byId.get(zone.id))}
                renderMarkerPopup={(marker) => {
                  const item = byId.get(marker.id)
                  return item ? (
                    <RecordMapPopup
                      item={item}
                      colorLabel={meta.legendTitle}
                      onOpen={() => openRecord(item.record)}
                    />
                  ) : null
                }}
                onPopupClose={() => setPopupId(null)}
                cluster={clusterConfigured && clusterEnabled}
                renderMarker={renderStationMarker}
                renderCluster={renderStationCluster}
                clusterAriaLabel={
                  markerArt ? (clusterDatum) => `${clusterDatum.count} ${noun.many}` : undefined
                }
                // The blueprint's own map centre (uiConfig.map.center, [lng,
                // lat]) — without it the record map opened on MapPanel's
                // world-view default even when every pin sits in one city.
                defaultViewState={
                  config.uiConfig.map?.center
                    ? {
                        longitude: config.uiConfig.map.center[0],
                        latitude: config.uiConfig.map.center[1],
                        zoom: 9.5,
                      }
                    : undefined
                }
                focusPosition={flyTo ?? focus}
                fitToMarkersNonce={fitNonce}
                styleUrl={basemapStyleUrl}
                editable={tool === 'draw'}
                onZoneDrawn={onZoneDrawn}
                traffic={liveTools ? trafficEnabled : undefined}
                onViewportChange={liveTools ? handleViewportChange : undefined}
                // Per-module opt-out (`uiConfig.map.hideFullscreenControl`) —
                // the zoom pill stays, only the separate fullscreen tile
                // below it is omitted (e.g. Requests & Complaints, 2026-09-01).
                hideFullscreenControl={Boolean(config.uiConfig.map?.hideFullscreenControl)}
                aria-label={`${config.name} map`}
              />
              {activeStation ? (
                <Suspense fallback={null}>
                  {/* Docked over the map pane's right edge, no scrim, map
                      stays interactive (SPEC 19:27942's docking contract) —
                      absolute inside this pane's own `relative` container. */}
                  <LazyWeatherStationDrawer
                    station={activeStation}
                    onClose={() => setActiveStation(null)}
                    className="absolute inset-y-0 end-0 z-20"
                  />
                </Suspense>
              ) : null}
              <RecordMapChrome
                legendEntries={meta.entries}
                legendTitle={meta.legendTitle}
                legendFilterable={meta.filterable}
                visibleKeys={activeKeys}
                onLegendToggle={toggleKey}
                legendTotals={totals}
                basemapIndex={basemapIndex}
                onCycleBasemap={cycleBasemap}
                activeTool={tool}
                onToolChange={(next) => {
                  setTool(next)
                  if (next !== 'measure') setMeasured([])
                }}
                onFit={() => setFitNonce((n) => n + 1)}
                canFit={mapMarkers.length > 0}
                nounPlural={noun.many}
                clusterEnabled={clusterEnabled}
                // In LM-chrome mode `LiveMapTools` owns the cluster eye (and
                // the whole end tool stack) — two stacks never paint at once.
                hideTools={liveTools}
                onClusterToggle={
                  clusterConfigured && !liveTools ? () => toggleClusterEnabled(!clusterEnabled) : undefined
                }
                // Non-blocking overlays (UX J.61 / E.28): the map always keeps
                // its tiles + chrome; a zero state is a chip on top of it, and
                // a filtered-to-zero state offers the way back. The chrome
                // lays this out as the start cell of its top row, beside the
                // legend, so the two can never overlap (finding A7b-3).
                notice={
                  <RecordMapNotice
                    shown={shown.length}
                    mappable={mappable.length}
                    ungeocoded={ungeocoded}
                    narrowed={narrowed || activeKeys.length === 0}
                    noun={noun}
                    onShowAll={showAll}
                  />
                }
              />

              {tool === 'measure' ? (
                <RecordMapMeasureReadout
                  points={measured.length}
                  km={pathLengthKm(measured)}
                  onClear={() => setMeasured([])}
                  noun={noun}
                />
              ) : null}

              {liveTools ? (
                <>
                  <Suspense fallback={null}>
                    <LazyLiveMapTools
                      tools={liveToolIds}
                      searchProviders={searchProviders}
                      onSearchResultSelect={(result) => {
                        if (result.position) setFlyTo(result.position)
                      }}
                      onSearchClear={() => setFlyTo(null)}
                      clusterEnabled={clusterEnabled}
                      onClusterToggle={() => toggleClusterEnabled(!clusterEnabled)}
                      activeBasemapId={globalBasemapId}
                      onBasemapChange={(id) => setGlobalBasemapId(id)}
                      trafficActive={trafficEnabled}
                      onTrafficToggle={() => setTrafficEnabled(!trafficEnabled)}
                      zonesAvailable={liveZones.length > 0}
                      zonesOpen={openDrawer === 'zones'}
                      onZonesToggle={() => setOpenDrawer(openDrawer === 'zones' ? null : 'zones')}
                      poiAvailable={livePois.length > 0}
                      poiOpen={openDrawer === 'poi'}
                      onPoiToggle={() => setOpenDrawer(openDrawer === 'poi' ? null : 'poi')}
                      weatherActive={weatherOn}
                      onWeatherToggle={weatherLayerStations.length ? () => setWeatherOn((v) => !v) : undefined}
                      incidentsActive={recordsLayerOn}
                      onIncidentsToggle={() => setRecordsLayerOn((v) => !v)}
                      // Step the end stack inboard of an open drawer
                      // (`MAP_TOOL_DRAWER_WIDTH` = 347 — kept literal here so
                      // the light barrel never imports the heavy map entry).
                      endInset={openDrawer ? 347 : 0}
                    />
                  </Suspense>
                  <ZonesDrawer
                    open={openDrawer === 'zones'}
                    onClose={() => setOpenDrawer(null)}
                    zones={liveZones}
                    checkedIds={checkedZoneIds}
                    onCheckedIdsChange={setCheckedZoneIds}
                  />
                  <PoiDrawer
                    open={openDrawer === 'poi'}
                    onClose={() => setOpenDrawer(null)}
                    pois={livePois}
                    checkedIds={checkedPoiIds}
                    onCheckedIdsChange={setCheckedPoiIds}
                  />
                </>
              ) : null}
            </div>
          }
        />
      </div>
    </section>
  )
}

MapHybridView.displayName = 'MapHybridView'
