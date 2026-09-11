import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { cn } from '../lib/cn'
// TYPE-ONLY map-entry imports — erased at build time (lazy-weight rule).
import type { LiveVehiclePopupData } from '../map/LiveVehiclePopup'
import type { LngLat } from '../map/MapPanel.types'
import { MapView } from './MapView'
import {
  deriveLivePois,
  deriveLiveVehicles,
  deriveLiveWorkforce,
  deriveLiveZones,
  filterLiveRecordsByKind,
  hasLiveWorkforce,
  type LiveEntityKindFilter,
} from './live-data'
import {
  CUSTOMIZE_DRAWER_WIDTH,
  CustomizeViewDrawer,
  defaultCustomizeViewState,
  type CustomizeViewState,
} from './live/CustomizeViewDrawer'
import { countActiveLiveFilters } from './live/live-filter-model'
import { LiveFilterChips } from './live/LiveFilterChips'
import { LiveFiltersPopover } from './live/LiveFiltersPopover'
import { LiveKindChips } from './live/LiveKindChips'
import { LiveListPanel } from './live/LiveListPanel'
import { LivePanelDivider, LivePanelReopenButton } from './live/LivePanelDivider'
import { UnsavedChangesToast } from './live/UnsavedChangesToast'
import { LIVE_LIST_WIDTH_CLASS, LIVE_LIST_WIDTH_PX, type LiveListWidthState } from './live/live-list-model'
import { writePersistedSyncWithMap } from './live/sync-with-map-storage'
import { PoiDrawer, ZonesDrawer } from './live/ZonesDrawer'
import { IncidentsDrawer, incidentMapPins } from './live/IncidentsDrawer'
import type { RecordGeometry } from './hybrid/record-map-model'
import { useLiveViewState } from './live/use-live-view-state'
import type { LiveViewStateSnapshot } from './live/live-view-state'

/**
 * LiveHybridView — the live-monitoring list+MAP hybrid (figma spec §§1.2,
 * 1.4, 1.6–1.8), distinct from `HybridView` (the list+DETAIL split):
 * a collapsible vehicle list panel (search-highlight, All-Filters popover +
 * saved filters + applied chips, Columns popover with the unsaved-changes
 * toast) on the leading edge, the divider's ‹ › ✕ grabbers stepping its
 * three width states (also settable via `listState` — Customize View's
 * "List View State"), the live map filling the rest with the Zones/POI tool
 * drawers and the eye-off marker toggle, and two-way selection sync. The map
 * itself stays behind `MapView`'s lazy slot — the light barrel ships zero
 * map bytes. `ModuleView` picks this body for the `'hybrid'` kind whenever
 * the blueprint binds coordinates (`uiConfig.map.latCol/lngCol`).
 *
 * HEIGHT-CHAIN CONTRACT (regressed three times as of 2026-08-31 — read this
 * before touching layout classes here or in anything this view renders):
 * this view fills its container EXACTLY (`h-full`, never taller) and ALL
 * scrolling happens INSIDE its own panels — the list table's `[role=region]`,
 * the map canvas — never on this root, and never on any ancestor (a window/
 * module-shell scrollbar with blank space below is always a bug, not a
 * feature). That only holds if EVERY link in the flex chain from this root
 * down to the scrollable table region keeps both `h-full`/`flex-1` (so the
 * box actually shrinks to the space it's given) AND `min-h-0` (so it doesn't
 * fall back to its content's intrinsic size instead of honoring that
 * shrink) — AND every `overflow-hidden`/`overflow-auto` clipping box along
 * that chain is itself `position`-ed (usually `relative`), because an
 * unpositioned clipping box does not establish a containing block and lets
 * absolutely-positioned descendants (a `sr-only` label span is the everyday
 * case) escape its clip and inflate an ancestor's `scrollHeight` instead
 * (root cause of the 2026-08-31 regression — see `DataTable.tsx`'s clipping
 * root for the fix and its own tripwire test). A new fixed-height row added
 * anywhere in this tree (a chip row, a meta row, a banner) is safe on its
 * OWN — non-growing flex siblings don't need `min-h-0` — but never remove
 * `min-h-0`/`flex-1`/the clipping root's `position` from an EXISTING link.
 * Guarded by: `LiveHybridView.test.tsx`'s "viewport height-chain contract"
 * tripwire (brittle className assertions, deliberately) and the demo repo's
 * `app/e2e/viewport-scroll-contract-verify.spec.ts` (the real, rendered-pixel
 * version — asserts `html.scrollHeight === clientHeight` for Live Monitoring
 * Hybrid/List/Map, Weather Stations hybrid, and Requests & Complaints hybrid,
 * at 1440/1990px, across weather/workforce/detail-sheet states).
 */
export interface LiveHybridViewProps {
  config: EntityConfig
  records: EntityRecord[]
  /** Controlled selection; omit for uncontrolled. */
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  /** Popup "open in new" — navigate to the record's profile. */
  onOpenRecord?: (record: EntityRecord) => void
  /**
   * The Incidents panel (map-button seam, Figma 19:23006 #4) — another
   * module's config + records, e.g. the incidents blueprint + its 36 seed
   * rows. Omit and the Incidents tool doesn't render at all (a tool cannot
   * render for data the blueprint never declared, same rule zones/POI
   * follow); with it, the map paints severity-coloured incident pins
   * (reusing the incidents hybrid's own `colorBy` legend) and the right
   * drawer lists incident CARDS (`RecordMapCard`, same shell/stage chip the
   * incidents hybrid renders) with a leading eye toggle.
   */
  incidentsConfig?: EntityConfig
  incidentsRecords?: EntityRecord[]
  /** Incident card/pin click → its detail side sheet (the caller's opener seam). */
  onOpenIncident?: (record: EntityRecord) => void
  /** Feeds the popup's Critical Events / Trips / Devices tabs per record. */
  getPopupData?: (record: EntityRecord) => LiveVehiclePopupData | undefined
  /**
   * Controlled list width state (Customize View → "List View State"). Omit
   * for uncontrolled — the divider grabbers manage it internally either way,
   * reporting through `onListStateChange`.
   */
  listState?: LiveListWidthState
  onListStateChange?: (state: LiveListWidthState) => void
  /** Legacy width override for the collapsed state; prefer `listState`. */
  listWidthClassName?: string
  /**
   * Controlled Customize View drawer visibility (spec §1.9) — `ModuleView`
   * opens it from the active tab's `⋮` menu. Omit for no drawer.
   */
  customizeOpen?: boolean
  onCustomizeOpenChange?: (open: boolean) => void
  /** The active saved view's name — seeds the drawer's name input. */
  viewName?: string
  /**
   * CONTROLLED Customize View state (name, autosave/private/protect, Pin
   * View, Set as Default, the map/widget toggles). Omit for uncontrolled —
   * the body keeps its own, the original behaviour. `ModuleView` controls it
   * so the SAME model backs the drawer AND the active tab's `⋮` menu +
   * pin/lock tab decorations (SPEC §2.9): one state model, never two.
   */
  customizeState?: CustomizeViewState
  onCustomizeStateChange?: (state: CustomizeViewState) => void
  /** Reports whether this view has unsaved column/customize edits — the
   *  view menu's dirty-only `Save View` first row (495:59898). */
  onDirtyChange?: (dirty: boolean) => void
  /** Increment to persist the pending edits (the menu's `Save View`) — the
   *  same nonce seam `fitToMarkersNonce` uses. */
  saveSignal?: number
  /** Drawer footer Delete View — the caller removes the saved view. */
  onDeleteView?: () => void
  /** Data-loading flag (app seam) — renders the list panel's skeleton rows
   *  (SPEC v2 495:25945) while true. */
  loading?: boolean
  /**
   * CONTROLLED view state (columns + the unsaved/saved column sets, divider
   * width, saved filters, search, drawer + eye-off toggles). `ModuleView`
   * owns it PER SAVED VIEW so it outlives this body — switching a view tab
   * unmounts `LiveHybridView`, and with the state inside the body `Save`,
   * `Save View` and `Enable Autosave` all discarded the edited column set on
   * the way back (round-4 finding F1). Omit for uncontrolled: the body keeps
   * its own, the original behaviour.
   */
  viewState?: LiveViewStateSnapshot
  onViewStateChange?: (state: LiveViewStateSnapshot) => void
  className?: string
}

export function LiveHybridView({
  config,
  records,
  selectedId,
  onSelect,
  onOpenRecord,
  incidentsConfig,
  incidentsRecords,
  onOpenIncident,
  getPopupData,
  listState,
  onListStateChange,
  listWidthClassName,
  customizeOpen = false,
  onCustomizeOpenChange,
  viewName = 'Hybrid View',
  customizeState,
  onCustomizeStateChange,
  onDirtyChange,
  saveSignal = 0,
  onDeleteView,
  loading = false,
  viewState,
  onViewStateChange,
  className,
}: LiveHybridViewProps) {
  const [internalId, setInternalId] = useState<string | null>(null)
  const activeId = selectedId !== undefined ? selectedId : internalId
  /*
   * Selecting a record FLIES THE CAMERA to it (`focusPosition` below, spec
   * item 11 / reference rule 6). With "Sync With Map" on, that camera move
   * would otherwise re-scope the list to the one vehicle it just flew to —
   * so a row click would silently delete the rest of the list, and a marker
   * click would do the same (reference rule 3: selection NEVER changes
   * membership).
   *
   * So a selection FREEZES the bbox the list is scoped by at whatever the
   * user was actually looking at. The freeze lifts on the user's next real
   * map gesture (pointer/wheel on the map pane), which is the moment they
   * asked for a new scope. Tracking the bbox itself never stops — only which
   * reading the list applies.
   */
  const [frozenBbox, setFrozenBbox] = useState<[number, number, number, number] | null>(null)
  const viewportBboxRef = useRef<[number, number, number, number] | null>(null)
  const select = (id: string | null) => {
    if (id !== null) setFrozenBbox(viewportBboxRef.current)
    if (selectedId === undefined) setInternalId(id)
    onSelect?.(id)
  }

  /*
   * All/Vehicle/Workforce chips (task "add WORKFORCE alongside vehicles"
   * §1). Internal, uncontrolled state — deliberately NOT folded into
   * `viewState`'s per-saved-view snapshot (column edits, search, saved
   * filters): the kind switch is a broader "what universe am I looking at"
   * toggle, not a per-view customization, and keeping it local avoids
   * touching that already-intricate state machine (task §5's pragmatic-
   * wiring scope call). Defaults to `'all'` — the combined view — per the
   * task's explicit default-state call (§7).
   *
   * `filterLiveRecordsByKind` narrows `records` to the chip's kind BEFORE
   * anything else in the existing pipeline (search, saved filters, column
   * derivation, map derivation) runs, so every downstream surface —
   * `useLiveViewState`, the list panel, `MapView` — stays completely
   * kind-agnostic. A module with no `uiConfig.map.workforce` binding
   * (`workforceAvailable` false) never renders the chips at all and this is
   * always `'all'`, so `kindFilteredRecords === records` and the Vehicle-only
   * experience is byte-identical to before this enhancement.
   */
  const workforceAvailable = hasLiveWorkforce(config)
  /*
   * DEFAULT CORRECTED to `'vehicle'` (run 2026-09-07, list/table Figma
   * parity). The workforce task's §7 default of `'all'` put the pane into
   * `mixedColumns` mode — the synthetic Name·ID·Type·Location set — on first
   * paint, so the pane opened on a column set the Figma reference
   * (`540:11164`: VEHICLE | ACTIVITY OVERVIEW | SPEED) does not have, and
   * four columns crammed into ~440px truncated. Figma is the parity
   * reference, so the pane now opens on the Vehicle shape; the kind chips
   * are untouched and still switch to All/Workforce (and the mixed column
   * set still renders when they do).
   */
  const [kindFilter, setKindFilter] = useState<LiveEntityKindFilter>('vehicle')
  const kindFilteredRecords = useMemo(
    () => (workforceAvailable ? filterLiveRecordsByKind(config, records, kindFilter) : records),
    [workforceAvailable, config, records, kindFilter],
  )
  const mixedColumns = workforceAvailable && kindFilter !== 'vehicle'

  const live = useLiveViewState(config, kindFilteredRecords, { state: viewState, onStateChange: onViewStateChange })
  const [internalCustomize, setInternalCustomize] = useState<CustomizeViewState>(() =>
    defaultCustomizeViewState(viewName),
  )
  const customize = customizeState ?? internalCustomize
  const setCustomize = (next: CustomizeViewState) => {
    if (customizeState === undefined) setInternalCustomize(next)
    onCustomizeStateChange?.(next)
  }
  // Customize View edits on a saved view raise the SAME unsaved-changes toast
  // as column edits (spec §§1.8–1.9; round-1 QA `customize-unsaved-toast`).
  // The baseline snapshot is what Revert restores.
  // Both live in the view-state snapshot so a pending Customize View edit —
  // and the toast that reports it — survive a view-tab switch exactly as the
  // column edits do (F1).
  const customizeBaseline = live.state.customizeBaseline
  const customizeDirty = live.customizeDirty

  /* Refresh's fit-to-fleet nonce. Every OTHER piece of map-tool state —
     place search + fly-to, POI drop, basemap flip, traffic, the eye-off
     toggle — now lives inside `LiveMapTools`/`LiveMapView`, which both live
     map surfaces share (round-1: the hybrid's own duplicate stack is why
     those fixes were invisible here). */
  const [fitNonce, setFitNonce] = useState(0)

  /*
   * UX-3 / A6: the marker set must match the list. `Showing 6 items` over five
   * visible vehicles was never a dropped marker — `deriveLiveVehicles` plots
   * every record with a finite lat/lng pair, and the sixth (the QA anchor
   * Z-7764) HAS one; it just sits ~1,700km outside the camera the unfiltered
   * fleet framed, so it rendered off-screen with no cue. Committing a search
   * or a filter now re-frames the camera on exactly the narrowed set, so what
   * the count claims is what the map shows. Keyed on the filtered id SET (a
   * stable string), so panning, position ticks and re-renders never re-fit —
   * only an actual change of WHICH records are listed does, and only while a
   * narrowing is in effect.
   */
  const filteredKey =
    live.filtered.length === kindFilteredRecords.length ? null : live.filtered.map((r) => r.id).join(',')
  useEffect(() => {
    if (filteredKey === null) return
    setFitNonce((n) => n + 1)
  }, [filteredKey])
  // Switching the All/Vehicle/Workforce chip changes WHICH markers are on
  // the map even when no search/filter is narrowing anything (the case
  // `filteredKey` above never catches, since `live.filtered` still equals
  // the whole kind-filtered set) — re-fit so the new marker set is framed
  // rather than leaving the camera where the PREVIOUS chip's markers sat.
  // Skips the FIRST run (mount) via a ref — every effect fires once on
  // mount regardless of its deps, and bumping the nonce then would shift
  // `fitToMarkersNonce`'s starting value for every live module (workforce-
  // bound or not), which is a behavior change this task doesn't ask for.
  const kindFilterMounted = useRef(false)
  useEffect(() => {
    if (!kindFilterMounted.current) {
      kindFilterMounted.current = true
      return
    }
    setFitNonce((n) => n + 1)
  }, [kindFilter])

  const dirty = live.columnsDirty || customizeDirty
  useEffect(() => {
    onDirtyChange?.(dirty)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report on change
  }, [dirty])
  const savedSignalRef = useRef(saveSignal)
  useEffect(() => {
    if (saveSignal === savedSignalRef.current) return
    savedSignalRef.current = saveSignal
    live.saveColumns()
    live.patch({ customizeBaseline: null, customizeDirty: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce seam
  }, [saveSignal])

  // Width state: controlled (Customize View) or the hook's own.
  const widthState = listState ?? live.widthState
  const setWidthState = (next: LiveListWidthState) => {
    // "Hide list" is a LIST VIEW STATE value (UX finding 7 — the ✕ grabber
    // needs an equivalent control for WCAG 2.5.8's exception to apply); the
    // panel's hidden flag is what actually renders it.
    live.setPanelHidden(next === 'hidden')
    if (next !== 'hidden') live.setWidthState(next)
    onListStateChange?.(next)
  }
  // A controlled listState change lands in the hook too, so expanded-column
  // derivation follows Customize View's dropdown.
  useEffect(() => {
    if (!listState) return
    live.setPanelHidden(listState === 'hidden')
    if (listState !== 'hidden') live.setWidthState(listState)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync one way
  }, [listState])

  /*
   * The Incidents panel (Figma 19:23006 #4) — a cross-module overlay
   * (another module's config+records, unlike zones/POI which come off THIS
   * config's own `uiConfig.map`). State lives here, the same tier every
   * other drawer/eye-toggle state on this view lives at:
   *  - `incidentsHiddenIds` — the eye toggle's per-incident hidden set,
   *    empty by default (spec: "all visible when the panel/layer is
   *    enabled").
   *  - `incidentsVisibleItems` — the drawer's OWN search∩filter-narrowed set,
   *    reported up via `onVisibleItemsChange` so the map's pins stay in
   *    lockstep with the card list without a second filter state.
   *  - `selectedIncidentId` — separate from the vehicle `activeId`: a pin/
   *    card click never contends with the fleet's own selection.
   */
  const [incidentsHiddenIds, setIncidentsHiddenIds] = useState<Set<string>>(() => new Set())
  const toggleIncidentHidden = (id: string) =>
    setIncidentsHiddenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const [incidentsVisibleItems, setIncidentsVisibleItems] = useState<RecordGeometry[]>([])
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)
  const incidentsAvailable = Boolean(incidentsConfig && incidentsRecords)
  const incidentsOpen = live.openDrawer === 'incidents'
  const incidentPins = useMemo(
    () => (incidentsAvailable && incidentsOpen ? incidentMapPins(incidentsVisibleItems, incidentsHiddenIds) : []),
    [incidentsAvailable, incidentsOpen, incidentsVisibleItems, incidentsHiddenIds],
  )
  const selectIncidentPin = (incident: { id: string }) => {
    setSelectedIncidentId(incident.id)
    const record = incidentsRecords?.find((r) => r.id === incident.id)
    if (record) onOpenIncident?.(record)
  }

  const zones = useMemo(() => deriveLiveZones(config), [config])
  const pois = useMemo(() => deriveLivePois(config), [config])
  const checkedZones = useMemo(
    () => zones.filter((z) => live.checkedZoneIds.includes(z.id)),
    [zones, live.checkedZoneIds],
  )
  const checkedPois = useMemo(
    () => pois.filter((p) => live.checkedPoiIds.includes(p.id)),
    [pois, live.checkedPoiIds],
  )

  // Row click → pan the map to the vehicle OR workforce member (spec item 11
  // extended by task §7's "sync-with-map" requirement), derived from the
  // ACTIVE selection so marker-side selection re-centers identically.
  const focusPosition = useMemo<LngLat | null>(() => {
    if (!activeId) return null
    const vehicle = deriveLiveVehicles(config, kindFilteredRecords).find((v) => v.id === activeId)
    if (vehicle) return vehicle.position
    const member = deriveLiveWorkforce(config, kindFilteredRecords).find((w) => w.id === activeId)
    return member?.position ?? null
  }, [activeId, config, kindFilteredRecords])

  /* "Sync With Map" (SPEC §3.22 — the list-meta row toggle and the Customize
     View row are one state): while ON, the LIST is re-filtered to the
     vehicles inside the map's current viewport as the user pans/zooms. The
     MAP keeps rendering the full search∩filter set — clipping its own
     markers to its own viewport would be circular.

     The bbox is tracked ALWAYS, not only while the toggle is on: subscribing
     conditionally left a stale reading behind whenever the user panned with
     sync OFF, so switching it back ON re-scoped the list to where the map
     used to be. Tracking is cheap (one throttled state write); only
     APPLYING it is gated, which is also what makes turning the toggle on
     filter immediately against the current view without touching the
     camera. */
  const [viewportBbox, setViewportBbox] = useState<[number, number, number, number] | null>(null)
  // The toggle's default for the NEXT view/session persists (localStorage) —
  // only the default, never a saved view's own committed state (Save/Revert
  // still govern that, per `live-view-state.ts`).
  useEffect(() => {
    writePersistedSyncWithMap(customize.syncListWithMap)
  }, [customize.syncListWithMap])
  const handleViewportChange = useCallback((bbox: [number, number, number, number]) => {
    viewportBboxRef.current = bbox
    setViewportBbox((prev) =>
      prev && prev[0] === bbox[0] && prev[1] === bbox[1] && prev[2] === bbox[2] && prev[3] === bbox[3]
        ? prev
        : bbox,
    )
  }, [])
  const listRecords = useMemo(() => {
    // Sync OFF: the list is the full search∩filter set, completely decoupled
    // from the camera (reference-video rule 1). Marker/cluster clicks change
    // the SELECTION, never the row set — only this toggle, the viewport,
    // filters and search decide membership (rule 3).
    const bbox = frozenBbox ?? viewportBbox
    if (!customize.syncListWithMap || !bbox) return live.filtered
    const latCol = config.uiConfig.map?.latCol
    const lngCol = config.uiConfig.map?.lngCol
    if (!latCol || !lngCol) return live.filtered
    const [west, south, east, north] = bbox
    return live.filtered.filter((rec) => {
      const lat = Number(rec[latCol])
      const lng = Number(rec[lngCol])
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
      // A viewport that crossed the antimeridian reports west > east.
      const inLng = west <= east ? lng >= west && lng <= east : lng >= west || lng <= east
      return inLng && lat >= south && lat <= north
    })
  }, [customize.syncListWithMap, frozenBbox, viewportBbox, live.filtered, config])

  /*
   * N5: at 1280 the map's 560px floor clamps BOTH Expanded and Fully Expanded
   * to the same rendered width, so the second widen click changed state with
   * zero visible feedback. Measuring the panel is the only way to know the
   * clamp bound — it is a viewport-dependent CSS `max-width`, not a value this
   * component computes — so the divider is told, and offers the way back
   * instead of a step that does nothing.
   */
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelPx, setPanelPx] = useState(0)
  useEffect(() => {
    const node = panelRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setPanelPx(entry.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [live.panelHidden])
  const atMaxWidth =
    panelPx > 0 && widthState !== 'collapsed' && panelPx < LIVE_LIST_WIDTH_PX[widthState] - 1

  const panelWidth =
    widthState === 'collapsed' && listWidthClassName
      ? listWidthClassName
      : LIVE_LIST_WIDTH_CLASS[widthState === 'hidden' ? 'collapsed' : widthState]

  return (
    <div data-slot="live-hybrid-view" className={cn('relative flex h-full min-h-0', className)}>
      {!live.panelHidden ? (
        <>
          <div
            ref={panelRef}
            className={cn(
              'flex h-full min-h-0 w-full flex-none flex-col',
              panelWidth,
              // UX-1/UX-3: the map keeps a 560px floor at every width state —
              // Expanded/Fully Expanded clamp instead of pushing it off-canvas,
              // and the panel's own table takes the loss as inner scroll.
              'md:max-w-[calc(100%-35rem)]',
            )}
          >
            <LiveListPanel
              config={config}
              records={listRecords}
              totalCount={kindFilteredRecords.length}
              kindChipsSlot={
                workforceAvailable ? <LiveKindChips value={kindFilter} onChange={setKindFilter} /> : undefined
              }
              mixedColumns={mixedColumns}
              viewportSynced={customize.syncListWithMap && viewportBbox !== null}
              // AC-2: the list-meta row's inline toggle reads/writes the
              // SAME `customize.syncListWithMap` source of truth
              // `CustomizeViewDrawer`'s own "Sync list with Map" ToggleRow
              // owns — no dual state, just a second surface for it.
              syncListWithMap={customize.syncListWithMap}
              onSyncListWithMapChange={(checked) => {
                // Flipping the toggle is itself a request to scope by what is
                // on screen NOW, so it clears any freeze a selection left
                // behind (reference rule 5: filters immediately against the
                // current view, without moving the camera).
                setFrozenBbox(null)
                setCustomize({ ...customize, syncListWithMap: checked })
              }}
              search={live.search}
              onSearchChange={live.setSearch}
              filterSlot={
                <LiveFiltersPopover
                  open={live.filtersOpen}
                  onOpenChange={live.setFiltersOpen}
                  groups={live.groups}
                  value={live.filterValue}
                  onChange={live.setFilterValue}
                  tagGroups={live.tagGroups}
                  saved={live.savedFilters}
                  onSaveFilter={live.saveFilter}
                  onRenameFilter={live.renameFilter}
                  onDeleteFilter={live.deleteFilter}
                />
              }
              chipsSlot={<LiveFilterChips groups={live.groups} value={live.filterValue} onChange={live.setFilterValue} />}
              columns={live.columns}
              shownColumns={live.shownColumns}
              onColumnsChange={live.setColumns}
              catalog={live.catalog}
              widthState={widthState}
              selectedId={activeId}
              onSelect={select}
              loading={loading}
            />
          </div>
          <LivePanelDivider
            state={widthState}
            onStateChange={setWidthState}
            onHide={() => live.setPanelHidden(true)}
            atMaxWidth={atMaxWidth}
          />
        </>
      ) : (
        // SPEC `live-monitoring-4-19-27942` §1.3: the collapsed rail is a
        // real 13px LAYOUT width (map narrows to make room for it), not a
        // floating overlay painted on top of the map — a real flex sibling
        // here, same slot the panel + divider occupy above, is what makes
        // that true instead of merely looking similar.
        <LivePanelReopenButton
          onShow={() => live.setPanelHidden(false)}
          onShowFullyExpanded={() => {
            live.setPanelHidden(false)
            live.setWidthState('fully-expanded')
          }}
        />
      )}

      <div
        className="relative min-h-0 min-w-0 flex-1"
        // The user's own gesture on the map pane is what lifts a selection's
        // bbox freeze (see `select` above) — capture phase, because MapLibre
        // stops these before they reach us.
        onPointerDownCapture={() => setFrozenBbox(null)}
        onWheelCapture={() => setFrozenBbox(null)}
      >
        {/*
         * The whole floating tool set is `LiveMapTools`, rendered by
         * `LiveMapView` behind `showTools` — the hybrid used to hand-roll its
         * own stack, which is why the traffic tool, the place search + fly-to
         * + POI drop and the refresh spinner were fixed only on the map-only
         * surface. One implementation now paints both, and its end-side stack
         * steps inboard by the open drawer's width so the drawer can never
         * cover the tool that opened it (interaction 21b / UX finding 3).
         *
         * `styleUrl` is deliberately NOT passed: `LiveMapView` resolves the
         * SPEC §1 muted-but-coloured basemap itself, and only then does its
         * layers tool own the bright/muted flip.
         */}
        <MapView
          config={config}
          records={live.filtered}
          selectedId={activeId}
          onSelect={select}
          onOpenRecord={onOpenRecord}
          getPopupData={getPopupData}
          focusPosition={focusPosition}
          onViewportChange={handleViewportChange}
          fitToMarkersNonce={fitNonce}
          zones={checkedZones}
          pois={checkedPois}
          incidents={incidentPins}
          incidentsAvailable={incidentsAvailable}
          incidentsOpen={incidentsOpen}
          onIncidentsOpenChange={(open) => live.setOpenDrawer(open ? 'incidents' : null)}
          selectedIncidentId={selectedIncidentId}
          onSelectIncident={selectIncidentPin}
          vehiclesHidden={live.vehiclesHidden}
          onVehiclesHiddenChange={live.setVehiclesHidden}
          showTools
          onRefresh={() => setFitNonce((n) => n + 1)}
          // Customize View's "Pin Zone/POI Filter on Map" gates whether each
          // tool stays available on the map (SPEC §2.7).
          zonesAvailable={zones.length > 0 && customize.pinZoneFilter}
          zonesOpen={live.openDrawer === 'zones'}
          onZonesOpenChange={(open) => live.setOpenDrawer(open ? 'zones' : null)}
          poisAvailable={pois.length > 0 && customize.pinPoiFilter}
          poiOpen={live.openDrawer === 'poi'}
          onPoiOpenChange={(open) => live.setOpenDrawer(open ? 'poi' : null)}
          // UX-10 / round-3 UX #5: ANY open right drawer steps the end tool
          // stack inboard, not just the two tool-owned ones. Customize View
          // docks over the same edge and used to bury all four tools.
          toolEndInset={customizeOpen ? CUSTOMIZE_DRAWER_WIDTH : undefined}
          className="h-full min-h-0"
        />

        <ZonesDrawer
          open={live.openDrawer === 'zones'}
          onClose={() => live.setOpenDrawer(null)}
          zones={zones}
          checkedIds={live.checkedZoneIds}
          onCheckedIdsChange={live.setCheckedZoneIds}
        />
        <PoiDrawer
          open={live.openDrawer === 'poi'}
          onClose={() => live.setOpenDrawer(null)}
          pois={pois}
          checkedIds={live.checkedPoiIds}
          onCheckedIdsChange={live.setCheckedPoiIds}
        />
        {incidentsAvailable && incidentsConfig && incidentsRecords ? (
          <IncidentsDrawer
            open={incidentsOpen}
            onClose={() => live.setOpenDrawer(null)}
            config={incidentsConfig}
            records={incidentsRecords}
            selectedId={selectedIncidentId}
            onSelect={setSelectedIncidentId}
            hiddenIds={incidentsHiddenIds}
            onToggleHidden={toggleIncidentHidden}
            onOpenRecord={onOpenIncident}
            onVisibleItemsChange={setIncidentsVisibleItems}
          />
        ) : null}
      </div>

      <CustomizeViewDrawer
        open={customizeOpen}
        onClose={() => onCustomizeOpenChange?.(false)}
        variant="hybrid"
        state={{
          ...customize,
          name: customize.name || viewName,
          listState: live.panelHidden ? 'hidden' : widthState,
        }}
        onStateChange={(next) => {
          // First drawer edit snapshots the baseline Revert restores; any
          // edit on a non-autosaving view raises the unsaved-changes toast
          // (round-1 QA `customize-unsaved-toast`).
          if (!customizeBaseline) {
            live.patch({
              customizeBaseline: {
                ...customize,
                name: customize.name || viewName,
                listState: live.panelHidden ? 'hidden' : widthState,
              },
            })
          }
          setCustomize(next)
          if (!next.autosave) live.setCustomizeDirty(true)
          if (next.listState !== (live.panelHidden ? 'hidden' : widthState)) setWidthState(next.listState)
        }}
        // The drawer's Fields sub-panel mirrors the Columns popover: the
        // SPEC §2.6 Shown defaults, unified with the table on first edit.
        columns={live.shownColumns}
        onColumnsChange={live.setColumns}
        catalog={live.catalog}
        filterCount={countActiveLiveFilters(live.filterValue)}
        onEditFilters={() => {
          onCustomizeOpenChange?.(false)
          live.setFiltersOpen(true)
        }}
        onDelete={onDeleteView}
      />

      {dirty ? (
        <UnsavedChangesToast
          onRevert={() => {
            live.revertColumns()
            if (customizeBaseline) setCustomize(customizeBaseline)
            live.patch({ customizeBaseline: null, customizeDirty: false })
          }}
          onSave={() => {
            live.saveColumns()
            live.patch({ customizeBaseline: null, customizeDirty: false })
          }}
          onEnableAutosave={() => {
            live.enableAutosave()
            setCustomize({ ...customize, autosave: true })
            live.patch({ customizeBaseline: null, customizeDirty: false })
          }}
        />
      ) : null}
    </div>
  )
}

LiveHybridView.displayName = 'LiveHybridView'
