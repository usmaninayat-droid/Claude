import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, RefreshCw } from '@fams/ui-kit/icons'
import {
  AlertOctagonIcon,
  CloudRaining06Icon,
  MapIconButton,
  MapLayersSwitcher,
  MarkerPin06Icon,
  findUnavailableTool,
  Pin01Icon,
  SearchRefractionIcon,
  TrafficLightsIcon,
  ZonesIcon,
  toast,
  type MapBasemapStyle,
} from '@fams/ui-kit'
import { cn } from '../../lib/cn'
import { MAP_ATTRIBUTION_STRIP } from '../constants'
import { LiveBasemapPreview } from './LiveBasemapPreview'
import { MapSearchPanel } from './MapSearchPanel'
import { createPlacesSearchProvider } from '../search/search-providers'
import type { MapSearchProvider, MapSearchResult } from '../search/search-types'
import type { LiveMapPlace, LiveMapUnavailableTool } from '../live-types'

/**
 * LiveMapTools — the Live Monitoring floating map chrome (SPEC §2.3), the
 * control set round-1 QA found present in Hybrid and **entirely missing from
 * Map View** (visual #9 / UX finding 2): white 40×40 tiles with the Figma
 * `Shadow/Map`, on a 52px pitch —
 *
 *   top-start:    `search-refraction` (the designer's reference app shows the
 *                 search control alone there; `pin-01` / `refresh-cw-01` are
 *                 opt-in through `tools`)
 *   bottom-start: `eye` (marker clustering — the reference app's toggle;
 *                 lit = unclustered/"see every asset", resting = clustered)
 *   top-end:      layers · `traffic-lights` · POI · zones
 *
 * It lives in the MAP entry (not in a view) so every live map surface —
 * hybrid, map-only, or any app embedding `LiveMapView` — gets the same tools
 * from one place.
 *
 * WHY TWO PLACE SEARCHES (Phase 7 code review, finding 7): ui-kit ships
 * `MapSearchControl`, the STANDALONE-map variant wired by `MapContainer` — a
 * single tile that expands in place, for a map with no other floating chrome.
 * The combobox below is the LIVE-MONITORING variant: it shares the 52px tile
 * pitch and stacking order with the five sibling tools in this stack, opens
 * into the drawer geometry `MAP_TOOL_DRAWER_WIDTH` fixes, and doubles as the
 * `pin-01` drop-pin target — geometry `MapSearchControl` deliberately does not
 * carry. The shared, behavioural half (`findUnavailableTool`, and the layers
 * switcher via `MapLayersControl`) IS reused from ui-kit; only the geometry is
 * separate. Fix place-search BEHAVIOUR in both, or lift it into ui-kit first.
 *
 * Three run decisions are implemented here, all data-driven so the design
 * system carries **zero environment-specific copy** (no place names, no
 * tenant strings, no "not available in this deployment" sentences):
 *
 * - **Place search (SPEC 3.18)** — no geocoder, ever. The search control
 *   filters the `places` list the APPLICATION supplies (`uiConfig.map.places`
 *   → `LiveMapPlace[]`) and picking a result flies the camera there.
 * - **POI drop (SPEC 3.18)** — `pin-01` arms drop mode; the next picked
 *   place drops a POI pin at its position.
 * - **Traffic (SPEC 3.19)** — the control always renders and stays
 *   interactive. When the deployment lists it in `unavailableTools`,
 *   activating it raises the message **from metadata** as a toast instead of
 *   toggling. A dead or absent control is not acceptable.
 *
 * Refresh reports itself (UX-25 / interaction 18e): the glyph spins while
 * the caller's promise is in flight and a quiet "Updated just now"
 * confirmation follows, announced through a polite live region.
 *
 * State-agnostic: every toggle is controlled by the caller; only transient
 * view state (which panel is open, the refresh spinner) lives here.
 */

/** Tool identifiers `unavailableTools[].tool` may name. */
export const LIVE_MAP_TOOL_IDS = ['search', 'pin', 'refresh', 'markers', 'cluster', 'layers', 'weather', 'incidents', 'traffic', 'zones', 'poi'] as const
export type LiveMapToolId = (typeof LIVE_MAP_TOOL_IDS)[number]

/**
 * Tools rendered when the caller passes no `tools` list — the reference
 * app's set. `pin` (drop a POI) and `refresh` are DELIBERATELY absent: the
 * designer's reference keeps the top-start stack to the search control alone.
 * Both stay fully implemented and a deployment that wants them back lists
 * them in `uiConfig.map.tools` — the DS never hardcodes one tenant's set.
 */
export const LIVE_MAP_DEFAULT_TOOL_IDS: LiveMapToolId[] = [
  'search',
  'cluster',
  'layers',
  'traffic',
  'zones',
  'poi',
]

/** The muted (SPEC §1) basemap — the resting style every live map resolves. */
export const LIVE_MAP_MUTED_STYLE_ID = 'muted'
/** The layers control's alternate style (the legacy `layersActive` state). */
export const LIVE_MAP_BRIGHT_STYLE_ID = 'bright'

/** Additional hover-row style ids (map-layer-switcher spec, point 2). */
export const LIVE_MAP_STREETS_STYLE_ID = 'streets'
export const LIVE_MAP_TERRAIN_STYLE_ID = 'terrain'
/** @deprecated Renamed to {@link LIVE_MAP_TERRAIN_STYLE_ID} when the switcher
 *  adopted the reference's canonical six style names. */
export const LIVE_MAP_DARK_STYLE_ID = LIVE_MAP_TERRAIN_STYLE_ID
export const LIVE_MAP_SATELLITE_STYLE_ID = 'satellite'
export const LIVE_MAP_HYBRID_STYLE_ID = 'hybrid'

/**
 * Default basemap style list (SPEC 3.19 + the hover-row switcher spec).
 *
 * ONLY `muted` and `bright` (real OpenFreeMap/Positron style URLs, resolved
 * in `LiveMapView`) are real MapLibre tile styles — repo rule 1 forbids
 * Mapbox GL / any paid tile provider, and no other free vector style is
 * wired into this deployment. The four extra entries below (`streets`,
 * `dark`, `satellite`, `hybrid`) are CSS-FILTER approximations layered on the
 * SAME `LiveBasemapPreview` swatch purely so the hover row has 6 visually
 * distinct cards (map-layer-switcher spec point 2) — they are NOT
 * independent tile styles. `LiveMapView` maps every one of them onto the
 * `bright` style URL; only the muted/bright split changes the actual map
 * tiles. Document this pragmatically rather than overclaiming six real
 * basemaps.
 */
export const LIVE_MAP_BASEMAP_STYLES: MapBasemapStyle[] = [
  // Canonical six, in the designer's fixed left-to-right order. Only
  // `muted`/`bright` change the real tile URL — the other four are documented
  // filter/palette variants over the same tiles (see the note above); the
  // LABELS are now the reference's exact names so a card never claims a style
  // it cannot deliver under a different word.
  { id: LIVE_MAP_MUTED_STYLE_ID, label: 'Grayscale', preview: <LiveBasemapPreview variant="grayscale" /> },
  { id: LIVE_MAP_STREETS_STYLE_ID, label: 'OSM', preview: <LiveBasemapPreview variant="osm" /> },
  { id: LIVE_MAP_BRIGHT_STYLE_ID, label: 'Roadmap', preview: <LiveBasemapPreview variant="roadmap" /> },
  { id: LIVE_MAP_SATELLITE_STYLE_ID, label: 'Satellite', preview: <LiveBasemapPreview variant="satellite" /> },
  { id: LIVE_MAP_TERRAIN_STYLE_ID, label: 'Terrain', preview: <LiveBasemapPreview variant="terrain" /> },
  { id: LIVE_MAP_HYBRID_STYLE_ID, label: 'Hybrid', preview: <LiveBasemapPreview variant="hybrid" /> },
]

export interface LiveMapToolsProps {
  /**
   * Which tools render, by id. Defaults to {@link LIVE_MAP_DEFAULT_TOOL_IDS}.
   * Application-driven (`uiConfig.map.tools`) so a deployment can restore
   * `pin`/`refresh` or drop any other control without a component fork.
   * `zones`/`poi` remain additionally gated by `zonesAvailable`/`poiAvailable`
   * (a tool cannot render for data the blueprint never declared).
   */
  tools?: LiveMapToolId[]
  /**
   * Application-supplied place list backing the search control (SPEC 3.18).
   * @deprecated pass `searchProviders` instead — with no `searchProviders`,
   * `places` is still folded into a single default places provider so
   * existing callers keep working unchanged.
   */
  places?: LiveMapPlace[]
  /**
   * Pluggable "search anything" result sources
   * (map-features-video-analysis.md §1) — places, saved zones, assets, app
   * shortcuts, or any caller-supplied provider with the same
   * `{ id, search(query) => Promise<MapSearchResult[]> }` contract. Build the
   * default set with `createDefaultSearchProviders` from `../search/search-providers`.
   */
  searchProviders?: MapSearchProvider[]
  /** A result was picked from the search dropdown — fly the camera to it and drop the highlight. */
  onSearchResultSelect?: (result: MapSearchResult) => void
  /** The search panel was explicitly cleared/closed (Escape or `×`) — remove the highlight. */
  onSearchClear?: () => void
  /** A place was picked — fly the camera to it. @deprecated use `onSearchResultSelect`. */
  onPlacePick?: (place: LiveMapPlace) => void
  /** A place was picked while `pin-01` drop mode was armed. */
  onDropPin?: (place: LiveMapPlace) => void
  /** Re-fetch live positions; the returned promise drives the spinner. */
  onRefresh?: () => void | Promise<unknown>
  /**
   * Marker-clustering toggle (map-features-video-analysis.md §2) — the EYE
   * button in the bottom-start stack, confirmed against the reference app:
   * that single control is the clustering toggle, not a marker-visibility
   * switch. Tooltip flips "Disable clustering" / "Enable clustering" with the
   * state; the glyph and the lit treatment follow "eye on = see every asset"
   * (lit + `Eye` while UNCLUSTERED, resting + `EyeOff` while clustered).
   * Fully controlled: `LiveMapView`
   * resolves the default from `useClusterEnabled`/`uiConfig.map.cluster` and
   * persists the toggle.
   */
  clusterEnabled?: boolean
  onClusterToggle?: () => void
  /**
   * Weather-monitoring layer toggle (19:25255). Additive and OPT-IN: the
   * button only renders when the deployment lists `weather` in `tools`, so
   * every existing map surface is unchanged. Pressing it is what reveals the
   * overlay checkbox row — the row is not a second, independent control.
   */
  weatherActive?: boolean
  /**
   * The incidents/alerts layer's pressed state (Figma 19:23006 #4). The
   * control renders whenever the deployment lists `incidents` in `tools`; its
   * INTERACTION is not specified yet, so a deployment may list the tool
   * without a handler and get an inert-but-honest toggle rather than a
   * silently dead button.
   */
  incidentsActive?: boolean
  onIncidentsToggle?: () => void
  onWeatherToggle?: () => void
  /**
   * @deprecated SPEC 3.19 makes layers a STYLE SWITCHER, not a binary toggle
   * (interaction 19b). Kept working: with no `basemapStyles`/`onBasemapChange`
   * these two bridge onto the two-entry default list — `layersActive` reads as
   * the `bright` style and picking the other entry calls `onLayersToggle`.
   * New callers pass `basemapStyles` + `activeBasemapId` + `onBasemapChange`.
   */
  layersActive?: boolean
  /** @deprecated see `layersActive`. */
  onLayersToggle?: () => void
  /**
   * Selectable basemap styles (SPEC 3.19). Defaults to
   * `LIVE_MAP_BASEMAP_STYLES` — a neutral two-entry list every caller may
   * override; the design system never names a tenant's tile provider.
   */
  basemapStyles?: MapBasemapStyle[]
  /** Applied style id; defaults to the legacy `layersActive` bridge. */
  activeBasemapId?: string
  /** A basemap style was picked from the layers popover. */
  onBasemapChange?: (id: string) => void
  /**
   * Traffic overlay toggle (SPEC 3.19). Inactive = resting white tile,
   * active = filled primary — the identical treatment the eye/cluster button
   * carries. The overlay itself is a deterministic pseudo-traffic layer
   * painted by `MapPanel` (`map/traffic.ts`); this control only reports the
   * toggle. Fully controlled: `LiveMapView` resolves the default from
   * `useTrafficOverlayEnabled`/`uiConfig.map.trafficOverlay` and persists it.
   */
  trafficActive?: boolean
  onTrafficToggle?: () => void
  /** Render the zones tool (the blueprint declares zones). */
  zonesAvailable?: boolean
  zonesOpen?: boolean
  onZonesToggle?: () => void
  /** Render the POI tool (the blueprint declares POIs). */
  poiAvailable?: boolean
  poiOpen?: boolean
  onPoiToggle?: () => void
  /**
   * Tools that render and stay interactive but have no data source here —
   * activating one raises its `message` (SPEC 3.19). Always app-supplied.
   */
  unavailableTools?: LiveMapUnavailableTool[]
  /** Override the default toast for an unavailable tool. */
  onUnavailableTool?: (tool: LiveMapUnavailableTool) => void
  /**
   * Pixels to shift the END-side stack inboard — set to the open right
   * drawer's width so the drawer never covers the tool that opened it
   * (round-1 visual #21 / interaction 21b).
   */
  endInset?: number
  /**
   * GROUPED layout (Command Center v2): every control — search and the
   * cluster eye included — renders in ONE top-end column instead of the
   * default three-corner spread (search top-start, cluster bottom-start,
   * layers/traffic/… top-end). A wall-display dashboard that floats its own
   * KPI/chart panels around the map edges needs its actions in one
   * predictable stack, not scattered "stray buttons" (v1 critique #3). The
   * search panel then expands INBOARD (leftward from the stack) so it never
   * leaves the viewport. Off by default — every existing surface keeps the
   * reference's corner layout unchanged.
   */
  grouped?: boolean
  className?: string
}

/* Figma `Shadow/Map` — 6px 10px 12px rgba(0,0,0,0.05); the same one-off
   ui-kit's `MapIconButton` carries. */
// token-exempt: Figma-sourced one-off shadow (Shadow/Map — directional, no DS token equivalent)
const MAP_SHADOW = 'shadow-[6px_10px_12px_0_rgba(0,0,0,0.05)]'

/**
 * ToolButton — a thin adapter over ui-kit's `MapIconButton` (QA A19).
 *
 * It used to redeclare that primitive's geometry inline: its own `size-11
 * -m-0.5` box, its own `before:inset-0.5 before:rounded-lg` tile, its own
 * shadow constant and its own active treatment. Two copies of one geometry
 * is how the stack drifted — the copies disagreed on radius (8px here, the
 * Figma-and-token 6px there), so the tools in this stack and the zoom cluster
 * opposite them painted different corners. There is now ONE painted tile in
 * the design system and every floating map control is it.
 *
 * The one thing this adapter still owns is TOGGLE SEMANTICS.
 * `MapIconButton` always reports `aria-pressed`, which is right for a toggle
 * and wrong for a plain action (Refresh is not a state). Passing
 * `aria-pressed` through the spread — where a later prop wins — lets a caller
 * that omits `pressed` get no `aria-pressed` attribute at all.
 */
function ToolButton({
  label,
  active,
  pressed,
  onClick,
  className,
  children,
  ...rest
}: {
  label: string
  /** Figma active treatment (primary tile, white glyph). */
  active?: boolean
  /** Toggle semantics — omit for plain action buttons. */
  pressed?: boolean
  onClick?: () => void
  className?: string
  children: React.ReactNode
} & { 'aria-expanded'?: boolean; 'data-slot'?: string }) {
  return (
    <MapIconButton
      label={label}
      active={active}
      onClick={onClick}
      className={className}
      aria-pressed={pressed}
      {...rest}
    >
      {children}
    </MapIconButton>
  )
}

export function LiveMapTools({
  tools = LIVE_MAP_DEFAULT_TOOL_IDS,
  places,
  searchProviders,
  onSearchResultSelect,
  onSearchClear,
  onPlacePick,
  onDropPin,
  onRefresh,
  clusterEnabled = true,
  onClusterToggle,
  weatherActive,
  incidentsActive,
  onIncidentsToggle,
  onWeatherToggle,
  layersActive = false,
  onLayersToggle,
  basemapStyles = LIVE_MAP_BASEMAP_STYLES,
  activeBasemapId,
  onBasemapChange,
  trafficActive = false,
  onTrafficToggle,
  zonesAvailable = false,
  zonesOpen = false,
  onZonesToggle,
  poiAvailable = false,
  poiOpen = false,
  onPoiToggle,
  unavailableTools,
  onUnavailableTool,
  endInset = 0,
  grouped = false,
  className,
}: LiveMapToolsProps) {
  const enabled = (tool: LiveMapToolId) => tools.includes(tool)
  /*
   * The top-end stack, in the deployment's own authored order (Figma
   * 19:23006). `tools` is the single source of truth for BOTH membership and
   * sequence: filtering it (rather than walking a fixed list and testing
   * membership) is what makes the stack's composition metadata. In GROUPED
   * mode the search and cluster controls join this same column (in the
   * caller's authored order) instead of holding the start-side corners.
   */
  const endStackMembers: LiveMapToolId[] = grouped
    ? ['search', 'layers', 'traffic', 'weather', 'incidents', 'poi', 'zones', 'cluster']
    : ['layers', 'traffic', 'weather', 'incidents', 'poi', 'zones']
  const endStackOrder = tools.filter((tool) => endStackMembers.includes(tool))

  const [searchOpen, setSearchOpen] = useState(false)
  const [dropMode, setDropMode] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => (timerRef.current ? clearTimeout(timerRef.current) : undefined), [])

  /** The blueprint's entry for a tool, when it declared one unavailable.
   *  Delegates to ui-kit's `findUnavailableTool` rather than re-implementing
   *  the lookup — the two used to be separate copies of the same predicate
   *  (Phase 7 code review, finding 7). */
  const unavailable = (tool: LiveMapToolId): LiveMapUnavailableTool | undefined =>
    findUnavailableTool(unavailableTools, tool)

  /**
   * Runs `action` unless the deployment declared the tool unavailable — in
   * which case the control still responded, it just reports the app's own
   * message (SPEC 3.19). The DS supplies no copy of its own.
   */
  const guarded = (tool: LiveMapToolId, action: () => void) => () => {
    const entry = unavailable(tool)
    if (entry) {
      if (onUnavailableTool) onUnavailableTool(entry)
      // `toast.info`, not a bare `toast`: sonner renders a status glyph for a
      // typed toast and none for a plain message, and UX-NOTES F42 wants a
      // non-colour channel on every status (round-4 UX finding N4 measured
      // zero `<svg>` inside this toast).
      else toast.info(entry.message)
      return
    }
    action()
  }

  /** Reports an unavailable tool the way `guarded` does, for controls that own
   *  their own unavailable handling (ui-kit's `MapLayersControl`). */
  const raiseUnavailable = (tool: LiveMapToolId) => () => {
    const entry = unavailable(tool)
    if (!entry) return
    if (onUnavailableTool) onUnavailableTool(entry)
    else toast.info(entry.message)
  }

  /* Layers = a style switcher (SPEC 3.19). `layersActive`/`onLayersToggle` are
     deprecated but still bridged onto the two default entries, so callers that
     have not migrated keep working with no behaviour change. */
  const activeStyleId =
    activeBasemapId ?? (layersActive ? LIVE_MAP_BRIGHT_STYLE_ID : LIVE_MAP_MUTED_STYLE_ID)
  const changeBasemap = (id: string) => {
    // `MapLayersSwitcher` (the hover-row) has no built-in unavailable
    // handling of its own — unlike ui-kit's popover `MapLayersControl` — so
    // layers' unavailable-tool reporting is guarded here instead.
    if (unavailable('layers')) {
      raiseUnavailable('layers')()
      return
    }
    if (onBasemapChange) {
      onBasemapChange(id)
      return
    }
    if (id !== activeStyleId) onLayersToggle?.()
  }

  const runRefresh = guarded('refresh', () => {
    if (refreshing) return
    setRefreshing(true)
    Promise.resolve(onRefresh?.())
      .catch(() => undefined)
      .finally(() => {
        setRefreshing(false)
        setRefreshedAt(Date.now())
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setRefreshedAt(null), 4000)
      })
  })

  // Back-compat: with no `searchProviders`, `places` still backs a single
  // default provider so existing callers (pre-search-panel) keep working.
  const effectiveProviders = searchProviders ?? (places?.length ? [createPlacesSearchProvider(places)] : [])

  const selectResult = (result: MapSearchResult) => {
    onSearchResultSelect?.(result)
    if (result.position) {
      // `raw` is the original `LiveMapPlace` for a place-provider result
      // (`createPlacesSearchProvider` sets it) — prefer it so the deprecated
      // `onPlacePick`/`onDropPin` bridge hands back an IDENTICAL object
      // (same id, same `category`) rather than a lossy reconstruction from
      // the result's own prefixed id/title.
      const asPlace: LiveMapPlace =
        result.kind === 'place' && result.raw && typeof result.raw === 'object'
          ? (result.raw as LiveMapPlace)
          : { id: result.id, name: result.title, position: result.position }
      onPlacePick?.(asPlace)
      if (dropMode) {
        onDropPin?.(asPlace)
        setDropMode(false)
      }
    }
    setSearchOpen(false)
  }

  const openSearch = () => {
    setSearchOpen(true)
  }

  return (
    <div data-slot="live-map-tools" className={cn('pointer-events-none absolute inset-0 z-10', className)}>
      {/* ── top-start column: search (· pin · refresh when `tools` lists them) ── */}
      {/* 16px off both map edges — the reference's control inset, and the
          same offset the end stack uses so the two read as one system. */}
      {grouped ? null : (
      <div className="pointer-events-auto absolute start-4 top-4 flex flex-col gap-3">
        {enabled('search') ? (
        <div className="flex items-start gap-3">
          {/*
           * The trigger EXPANDS IN PLACE (spec §1): the tile and the pill
           * occupy the same top-start anchor, so the button is unmounted
           * while the panel is open rather than sitting beside it. Closing
           * (× / Escape / a selection) brings the tile straight back.
           */}
          {searchOpen ? null : (
            <ToolButton
              label="Search places on the map"
              aria-expanded={false}
              onClick={guarded('search', openSearch)}
            >
              <SearchRefractionIcon aria-hidden="true" />
            </ToolButton>
          )}
          <MapSearchPanel
            providers={effectiveProviders}
            open={searchOpen}
            onOpenChange={setSearchOpen}
            onResultSelect={selectResult}
            onClear={onSearchClear}
            placeholder={dropMode ? 'Pick a place to drop a point' : undefined}
          />
        </div>
        ) : null}

        {enabled('pin') ? (
          <ToolButton
            label="Drop a point of interest at a place"
            pressed={dropMode}
            active={dropMode}
            onClick={guarded('pin', () => {
              const next = !dropMode
              setDropMode(next)
              if (next) openSearch()
            })}
          >
            <Pin01Icon aria-hidden="true" />
          </ToolButton>
        ) : null}

        {enabled('refresh') ? (
          <div className="flex items-center gap-2">
            <ToolButton label="Refresh live positions" onClick={runRefresh} data-slot="live-map-refresh">
              <RefreshCw aria-hidden="true" className={cn(refreshing && 'animate-spin')} />
            </ToolButton>
            {/* Quiet confirmation (UX-25) — announced politely, never a modal. */}
            <span
              role="status"
              aria-live="polite"
              className={cn(
                'rounded-full bg-card px-2 py-1 text-caption text-muted-foreground transition-opacity',
                MAP_SHADOW,
                refreshedAt ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              {refreshedAt ? 'Updated just now' : ''}
            </span>
          </div>
        ) : null}
      </div>
      )}

      {/* ── top-end stack ────────────────────────────────────────────────
             ORDER COMES FROM `tools` (Figma 19:23006 reads layers · traffic ·
             weather · incidents · POI · zones, which is NOT the order this
             block used to hardcode). Each tool contributes a node to the map
             below and the stack renders them in the caller's authored
             sequence, so re-ordering the stack — or dropping a control — is a
             blueprint edit (`uiConfig.map.tools`), never a DS change. Tools
             the deployment did not list, or whose data is absent
             (`poiAvailable`/`zonesAvailable`), contribute nothing. */}
      <div
        data-slot="live-map-end-tools"
        className="pointer-events-auto absolute top-4 flex flex-col gap-3"
        // Logical inline inset via inline style, never a negative/logical
        // utility class: a consuming app's Tailwind build does not reliably
        // emit those and silently falls back to a physical edge.
        style={{ insetInlineEnd: 16 + endInset }}
      >
        {endStackOrder.map((tool) => {
          switch (tool) {
            case 'search':
              /* GROUPED-mode search: same control, but the panel expands
                 INBOARD — absolutely anchored to the stack's end edge so its
                 320px body grows leftward over the map instead of off-screen.
                 The tile still unmounts while the panel is open (spec §1's
                 expand-in-place contract, rotated 180°). */
              return (
                <div key={tool} className="relative flex min-h-10 justify-end">
                  {searchOpen ? null : (
                    <ToolButton
                      label="Search places on the map"
                      aria-expanded={false}
                      onClick={guarded('search', openSearch)}
                    >
                      <SearchRefractionIcon aria-hidden="true" />
                    </ToolButton>
                  )}
                  <MapSearchPanel
                    providers={effectiveProviders}
                    open={searchOpen}
                    onOpenChange={setSearchOpen}
                    onResultSelect={selectResult}
                    onClear={onSearchClear}
                    className="absolute end-0 top-0"
                    placeholder={dropMode ? 'Pick a place to drop a point' : undefined}
                  />
                </div>
              )
            case 'cluster':
              /* GROUPED-mode cluster eye — identical control and polarity to
                 the bottom-start original (see that block's comment), just
                 stacked with its siblings. */
              return (
                <ToolButton
                  key={tool}
                  label={clusterEnabled ? 'Disable clustering' : 'Enable clustering'}
                  pressed={!clusterEnabled}
                  active={!clusterEnabled}
                  onClick={guarded('cluster', () => onClusterToggle?.())}
                  data-slot="live-map-cluster-toggle"
                >
                  {clusterEnabled ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </ToolButton>
              )
            case 'layers':
              /* Layers = a basemap STYLE SWITCHER (SPEC 3.19, interaction
                 19b), HOVER-ROW interaction (map-layer-switcher spec):
                 hovering/focusing the collapsed control expands it into a row
                 of style cards instead of opening a popover. Both come from
                 ui-kit's generic `MapLayersSwitcher`; the style list is a prop. */
              return (
                <MapLayersSwitcher
                  key={tool}
                  label="Switch basemap style"
                  styles={basemapStyles}
                  activeStyleId={activeStyleId}
                  onStyleChange={changeBasemap}
                />
              )
            case 'traffic':
              return (
                <ToolButton
                  key={tool}
                  /* The label names the STATE's counterpart action, matching
                     the eye/cluster button's convention: "Traffic overlay"
                     turns it on, "Hide traffic overlay" turns it back off. */
                  label={trafficActive ? 'Hide traffic overlay' : 'Traffic overlay'}
                  pressed={trafficActive}
                  active={trafficActive}
                  onClick={guarded('traffic', () => onTrafficToggle?.())}
                  data-slot="live-map-traffic"
                >
                  <TrafficLightsIcon aria-hidden="true" />
                </ToolButton>
              )
            case 'weather':
              return (
                <ToolButton
                  key={tool}
                  label={weatherActive ? 'Hide weather layer' : 'Weather layer'}
                  pressed={weatherActive}
                  active={weatherActive}
                  onClick={guarded('weather', () => onWeatherToggle?.())}
                  data-slot="live-map-weather"
                >
                  {/* Figma 19:23006 names `cloud-raining-06`. The thermometer
                      that stood here was a stand-in chosen when the icon set
                      carried no cloud glyph; the canonical library has one. */}
                  <CloudRaining06Icon aria-hidden="true" />
                </ToolButton>
              )
            case 'incidents':
              /* The incidents/alerts layer (Figma 19:23006 #4). The control is
                 specified; its INTERACTION is not yet, so a deployment that
                 lists the tool without wiring `onIncidentsToggle` gets a
                 button that renders, is focusable and reports itself as an
                 unpressed toggle — never a dead click that silently does
                 nothing, and never a control the DS invents behaviour for. */
              return (
                <ToolButton
                  key={tool}
                  label={incidentsActive ? 'Hide incidents layer' : 'Incidents'}
                  pressed={incidentsActive}
                  active={incidentsActive}
                  onClick={guarded('incidents', () => onIncidentsToggle?.())}
                  data-slot="live-map-incidents"
                >
                  <AlertOctagonIcon aria-hidden="true" />
                </ToolButton>
              )
            case 'poi':
              if (!poiAvailable) return null
              return (
                <ToolButton
                  key={tool}
                  label="Points of interest"
                  pressed={poiOpen}
                  active={poiOpen}
                  onClick={guarded('poi', () => onPoiToggle?.())}
                  data-slot="live-map-poi"
                >
                  {/* `marker-pin-06` — the designer's re-specified POI glyph
                      (a pin with a ringed head), replacing `marker-pin-05`. */}
                  <MarkerPin06Icon aria-hidden="true" />
                </ToolButton>
              )
            case 'zones':
              if (!zonesAvailable) return null
              return (
                <ToolButton
                  key={tool}
                  label="Zones"
                  pressed={zonesOpen}
                  active={zonesOpen}
                  onClick={guarded('zones', () => onZonesToggle?.())}
                  data-slot="live-map-zones"
                >
                  <ZonesIcon aria-hidden="true" />
                </ToolButton>
              )
            default:
              return null
          }
        })}
      </div>

      {/* ── bottom-start: clustering toggle (the eye) ─────────────────────
             QA A18: its bottom edge lines up with the bottom-END zoom /
             fullscreen stack's (a flat `bottom-4`, 16px), PLUS whatever the
             attribution strip actually occupies under it — which `MapPanel`
             publishes as `--fams-map-attribution-strip` and sets to 0 when
             the strip is hidden. The old flat `28 + 12` reserved room for a
             control that may not render at all and could never align with
             the opposite stack. */}
      {grouped ? null : (
      <div
        // QA A19: `start-4`, the same 16px inline inset the top-start search
        // stack uses, so both start-edge stacks paint in one column.
        className="pointer-events-auto absolute start-4 flex flex-col gap-3"
        style={{ insetBlockEnd: `calc(1rem + var(--fams-map-attribution-strip, ${MAP_ATTRIBUTION_STRIP}px))` }}
      >
        {/* The reference app's single bottom-start control IS the clustering
            toggle, and its polarity is "eye ON = see every asset" (designer,
            round 5): the ACTIVE, filled-primary state means markers are
            UNCLUSTERED — every tanker drawn individually — and the resting
            white state means they are clustered. Clustering is the default, so
            the button rests INACTIVE. The label always names the action a
            click WILL perform, which is the inverse of the state. */}
        {enabled('cluster') ? (
        <ToolButton
          label={clusterEnabled ? 'Disable clustering' : 'Enable clustering'}
          pressed={!clusterEnabled}
          active={!clusterEnabled}
          onClick={guarded('cluster', () => onClusterToggle?.())}
          data-slot="live-map-cluster-toggle"
        >
          {clusterEnabled ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </ToolButton>
        ) : null}
      </div>
      )}

    </div>
  )
}

LiveMapTools.displayName = 'LiveMapTools'
