import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
// TYPE-ONLY map-entry imports — erased at build time (lazy-weight rule).
import type { LiveVehiclePopupData } from '../map/LiveVehiclePopup'
import type {
  LiveIncidentDatum,
  LiveMapPlace,
  LiveMapUnavailableTool,
  LivePoiDatum,
  LiveVehicleDatum,
  LiveWorkforceDatum,
  LiveZoneDatum,
} from '../map/live-types'
import type { LiveMapToolId } from '../map/chrome/LiveMapTools'
import type { LngLat, MapPathDatum } from '../map/MapPanel.types'
import type { MapLabelOverride } from '../map/label-overrides'
import type { WeatherForecastPanelData, WeatherStationDatum } from '../map/weather-types'
import { qatarGazetteer, type MapGazetteerEntry } from '../map/search/qatar-gazetteer'
import { deriveLivePois, deriveLiveVehicles, deriveLiveWorkforce, deriveLiveZones, hasLiveMap } from './live-data'
import {
  deriveLivePopupData,
  deriveLiveWorkforcePopupData,
  hasLivePopup,
  hasLiveWorkforcePopup,
} from './live/live-popup-data'
import { PoiDrawer, ZonesDrawer } from './live/ZonesDrawer'
import { ViewEmptyState } from './ViewEmptyState'

/**
 * MapView — `ModuleView`'s body for the `'map'` view kind (figma
 * live-monitoring spec): the full-bleed live vehicle map. This file is the
 * LIGHT-BARREL SLOT — the real implementation (`LiveMapView`) lives in the
 * heavy `@fams/v5-templates/map` entry and is reached ONLY through the
 * runtime `import()` below, so a consumer whose modules never show a map
 * ships zero bytes of maplibre/deck.gl (the exact mechanism
 * `LocationMapSectionSlot.tsx` documents — package-specifier dynamic import,
 * never a relative `../map`).
 */
const LazyLiveMapView = lazy(() =>
  import('@fams/v5-templates/map').then((mod) => ({ default: mod.LiveMapView })),
)

export interface MapViewProps {
  config: EntityConfig
  records: EntityRecord[]
  /** Controlled selected record id (marker emphasis + popup); omit for
   *  uncontrolled. */
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  /** Popup "open in new" — navigate to the record's profile. */
  onOpenRecord?: (record: EntityRecord) => void
  /**
   * Feeds the popup's Critical Events / Trips / Devices tabs per record.
   * Omit to fall back to the blueprint's own `uiConfig.map.popup` bindings
   * (`deriveLivePopupData`) — the metadata-only path that lights up the
   * popup's 4-tab bar with zero app code.
   */
  getPopupData?: (record: EntityRecord) => LiveVehiclePopupData | undefined
  /** Popup footer CTA row per record (the cockpit's status-driven CTAs). */
  renderPopupFooter?: (record: EntityRecord) => ReactNode
  /** Popup header overflow menu per record (the cockpit's remote commands). */
  renderPopupOverflow?: (record: EntityRecord) => ReactNode
  /** Popup width cap override (CSS length, e.g. `'22.5rem'`). */
  popupMaxWidth?: string
  /** Popup card class override (pairs with `popupMaxWidth` for a narrow card). */
  popupClassName?: string
  /** Camera nudge — pans the map to a position (list⇄map selection sync). */
  focusPosition?: LngLat | null
  /** Frames these SW/NE corners instead of zooming to a single pin
   *  (`MapPanel.fitBounds`) — keeps the rest of the fleet in view. */
  fitBounds?: [LngLat, LngLat] | null
  /** Map bounds + zoom on load and on every camera move — the seam behind
   *  Customize View's "Sync list with Map" (SPEC §3.22). */
  onViewportChange?: (bbox: [number, number, number, number], zoom: number) => void
  /** Fit-to-fleet nonce (`MapPanel.fitToMarkersNonce`) — refresh recenter. */
  fitToMarkersNonce?: number
  /** Basemap style URL override — the layers control's switch. */
  styleUrl?: string
  /** Marker clustering (default on) — the map settings toggle. */
  cluster?: boolean
  /**
   * Zone polygons to draw — the zones drawer's CHECKED zones. ⚠ There is
   * deliberately NO "fall back to every blueprint zone" default any more:
   * that fallback is what painted the stray blue/green rectangles over the
   * map-only view (Z-3100 / Z-2200 — round-1 UX finding 18 / visual #9)
   * while the hybrid, which passes its checked set, drew none. Omit it and
   * the map draws no zones until something is checked.
   */
  zones?: LiveZoneDatum[]
  /** Checked POIs — plotted as pins with hover tooltip + radius circle. */
  pois?: LivePoiDatum[]
  /**
   * The Incidents panel's currently VISIBLE incidents (eye-on ∩ search∩filter
   * — the caller, e.g. `LiveHybridView`, narrows the set; this view only
   * paints it) — severity-coloured pins, non-clustered.
   */
  incidents?: LiveIncidentDatum[]
  /** Whether the Incidents tool renders at all (the caller declares an
   *  incidents overlay). Defaults to `incidents` being non-empty. */
  incidentsAvailable?: boolean
  /** Controlled Incidents drawer (the caller renders `IncidentsDrawer`). */
  incidentsOpen?: boolean
  onIncidentsOpenChange?: (open: boolean) => void
  /** Selected incident pin (emphasis ring). */
  selectedIncidentId?: string | null
  /** A pin was clicked — opens the incident's card in the panel/sheet. */
  onSelectIncident?: (incident: LiveIncidentDatum) => void
  /** Route polylines (selected record's actual/planned pair) — `LiveMapView.paths` passthrough. */
  paths?: MapPathDatum[]
  /** The bottom-left eye-off toggle's state — true hides every vehicle marker
   *  (the list keeps its rows; only the map thins out). */
  vehiclesHidden?: boolean
  onVehiclesHiddenChange?: (hidden: boolean) => void

  /* ── Floating map chrome (SPEC §2.3, `LiveMapTools`) ──────────────────── */
  /**
   * Paint the Figma floating tool set over the map — search / pin / refresh,
   * eye-off, layers / traffic / POI / zones. Off by default so a surface
   * that paints its own chrome never doubles up.
   *
   * With it on and the drawer props left UNCONTROLLED (`zonesOpen` /
   * `poiOpen` omitted), this view also owns the Zones/POI drawers and their
   * checked sets — the self-contained map-only view. Pass them controlled
   * (the hybrid does) to keep that state and the drawers in the caller.
   */
  showTools?: boolean
  /** Place list backing the map's search control; defaults to the blueprint's
   *  `uiConfig.map.places`. The DS ships no gazetteer and never geocodes. */
  places?: LiveMapPlace[]
  /** Tools that render but have no data source here; defaults to the
   *  blueprint's `uiConfig.map.unavailableTools` (message = metadata). */
  unavailableTools?: LiveMapUnavailableTool[]
  /** Re-fetch live positions (drives the refresh tool's spinner). */
  onRefresh?: () => void | Promise<unknown>
  /** Controlled Zones drawer (omit for the self-contained mode above). */
  zonesOpen?: boolean
  onZonesOpenChange?: (open: boolean) => void
  /** Controlled POI drawer (omit for the self-contained mode above). */
  poiOpen?: boolean
  onPoiOpenChange?: (open: boolean) => void
  /** Extra inboard step (px) for the map's END tool stack — any right drawer
   *  the HOST docks over the map (e.g. Customize View), not just the two
   *  tool-owned ones (`LiveMapView.toolEndInset`). */
  toolEndInset?: number
  /** START-side twin of `toolEndInset` — a host-docked LEFT panel column
   *  the expanded weather forecast bar must clear (`LiveMapView.toolStartInset`). */
  toolStartInset?: number
  /** Whether the zones / POI tools render at all. Defaults to "the blueprint
   *  declares any" — the caller narrows it (e.g. Customize View's pin
   *  toggles). */
  zonesAvailable?: boolean
  poisAvailable?: boolean
  /** Weather layer starts ON (`LiveMapView.defaultWeatherEnabled`) — e.g. a
   *  command-center surface that opens with the rain layer live. */
  defaultWeatherEnabled?: boolean
  /** Hide zero-rain / no-reading weather stations (`LiveMapView.weatherHideDryStations`). */
  weatherHideDryStations?: boolean
  /** One grouped top-end tool column (`LiveMapTools.grouped`) — a dashboard
   *  that floats its own panels needs its actions in one stack. */
  groupedTools?: boolean
  className?: string
}

export function MapViewFallback({ label }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Loading map'}
      className="h-full min-h-64 w-full animate-pulse rounded-md bg-muted"
    />
  )
}

export function MapView({
  config,
  records,
  selectedId,
  onSelect,
  onOpenRecord,
  getPopupData,
  renderPopupFooter,
  renderPopupOverflow,
  popupMaxWidth,
  popupClassName,
  focusPosition,
  fitBounds,
  onViewportChange,
  fitToMarkersNonce,
  styleUrl,
  cluster,
  zones,
  pois,
  incidents,
  incidentsAvailable,
  incidentsOpen,
  onIncidentsOpenChange,
  selectedIncidentId,
  onSelectIncident,
  paths,
  vehiclesHidden = false,
  onVehiclesHiddenChange,
  showTools = false,
  places,
  unavailableTools,
  onRefresh,
  zonesOpen,
  onZonesOpenChange,
  poiOpen,
  onPoiOpenChange,
  toolEndInset,
  toolStartInset,
  zonesAvailable,
  poisAvailable,
  defaultWeatherEnabled,
  weatherHideDryStations,
  groupedTools,
  className,
}: MapViewProps): ReactNode {
  const vehicles = useMemo(() => deriveLiveVehicles(config, records), [config, records])
  const workforce = useMemo(() => deriveLiveWorkforce(config, records), [config, records])

  /*
   * Self-contained chrome (the map-only view): with `showTools` on and the
   * drawer props uncontrolled, this view owns the drawers AND their checked
   * sets, so Map View gets the same Zones/POI behaviour the hybrid has
   * instead of a bare canvas (round-1 visual #9 / UX finding 2).
   */
  const blueprintZones = useMemo(() => deriveLiveZones(config), [config])
  const blueprintPois = useMemo(() => deriveLivePois(config), [config])
  const ownsDrawers = showTools && zonesOpen === undefined && poiOpen === undefined
  const [ownDrawer, setOwnDrawer] = useState<'zones' | 'poi' | null>(null)
  const [ownZoneIds, setOwnZoneIds] = useState<string[]>([])
  const [ownPoiIds, setOwnPoiIds] = useState<string[]>([])
  const resolvedZonesOpen = ownsDrawers ? ownDrawer === 'zones' : (zonesOpen ?? false)
  const resolvedPoiOpen = ownsDrawers ? ownDrawer === 'poi' : (poiOpen ?? false)
  const ownZones = useMemo(
    () => blueprintZones.filter((zone) => ownZoneIds.includes(zone.id)),
    [blueprintZones, ownZoneIds],
  )
  const ownPois = useMemo(() => blueprintPois.filter((poi) => ownPoiIds.includes(poi.id)), [blueprintPois, ownPoiIds])

  // Metadata-first popup data: an explicit `getPopupData` wins; otherwise a
  // blueprint authoring `uiConfig.map.popup` feeds the vehicle card's
  // Overview grid + Critical Events / Trips / Devices tabs (spec §1.5).
  const resolvePopupData = getPopupData ?? (hasLivePopup(config) ? (record: EntityRecord) => deriveLivePopupData(config, record) : undefined)
  // Same metadata-first path for the WORKFORCE popup (2026-08-31 task): a
  // blueprint authoring `uiConfig.map.workforce.popup` feeds the tabbed
  // workforce card's Overview grid + Critical Events / Shifts tab bodies.
  const resolveWorkforcePopupData = hasLiveWorkforcePopup(config)
    ? (record: EntityRecord) => deriveLiveWorkforcePopupData(config, record)
    : undefined

  if (!hasLiveMap(config)) {
    return (
      <ViewEmptyState
        title="No map binding"
        description="This module's blueprint declares a map view but binds no coordinates (uiConfig.map.latCol/lngCol)."
      />
    )
  }

  const mapPlaces = places ?? (config.uiConfig.map?.places as LiveMapPlace[] | undefined)
  const mapUnavailable =
    unavailableTools ?? (config.uiConfig.map?.unavailableTools as LiveMapUnavailableTool[] | undefined)
  /* Which floating tools render — blueprint-driven (`uiConfig.map.tools`).
     Unset, `LiveMapTools` falls back to its own default set. */
  const mapTools = config.uiConfig.map?.tools as LiveMapToolId[] | undefined
  /* `uiConfig.map.search.gazetteer` — a named opt-in bundled dataset
     ("qatar" -> `qatarGazetteer`). The design system ships no gazetteer by
     default; this key is the ONLY way a deployment gets one. */
  const gazetteerName = (config.uiConfig.map as { search?: { gazetteer?: string } } | undefined)?.search?.gazetteer
  const mapGazetteer: MapGazetteerEntry[] | undefined = gazetteerName === 'qatar' ? qatarGazetteer : undefined

  const body = (
    <Suspense fallback={<MapViewFallback />}>
      <LazyLiveMapView
        vehicles={vehicles}
        workforce={workforce}
        markersHidden={vehiclesHidden}
        onMarkersHiddenChange={onVehiclesHiddenChange}
        showTools={showTools}
        places={mapPlaces}
        /* The map search is DATA-DRIVEN off the same blueprint map config the
           layers read — saved zones and POIs become searchable rows without a
           second authoring surface (and without any geocoder). */
        searchableZones={blueprintZones}
        searchablePois={blueprintPois}
        searchGazetteer={mapGazetteer}
        tools={mapTools}
        /* `uiConfig.map.trafficOverlay` — the traffic tool renders by
           default (the overlay itself is off until the user turns it on);
           an explicit `false` drops the control entirely. */
        trafficOverlay={config.uiConfig.map?.trafficOverlay as boolean | undefined}
        /* `uiConfig.map.labelOverrides` — basemap label renames (e.g. a sea
           whose local name differs from the OSM tiles'). */
        labelOverrides={config.uiConfig.map?.labelOverrides as MapLabelOverride[] | undefined}
        /* `uiConfig.map.weather` — the weather monitoring layer's station
           set. Supplying a NON-EMPTY array is what turns the whole layer on
           in `LiveMapView` (the tool button, the markers and the drawer all
           key off it — there is no overlay row or band-key legend any more,
           removed 2026-08-31), so `enabled: false` resolves to `undefined`
           rather than to an empty array being passed down. The shape is
           validated by the composer schema; this is the one cast at the
           tier boundary (see `UiConfig.map.weather`). */
        weatherStations={
          config.uiConfig.map?.weather?.enabled === false
            ? undefined
            : (config.uiConfig.map?.weather?.stations as WeatherStationDatum[] | undefined)
        }
        /* `uiConfig.map.weather.forecast` — the bottom forecast panel's
           Open-Meteo/QMD data. Rides the same enabled gate as the stations;
           same tier-boundary cast. */
        defaultWeatherEnabled={defaultWeatherEnabled}
        weatherHideDryStations={weatherHideDryStations}
        toolStartInset={toolStartInset}
        groupedTools={groupedTools}
        weatherForecast={
          config.uiConfig.map?.weather?.enabled === false
            ? undefined
            : (config.uiConfig.map?.weather?.forecast as WeatherForecastPanelData | undefined)
        }
        /* `uiConfig.map.attribution` — 'hidden' (MapPanel's default as of
           2026-08-31) | 'compact' | 'visible'. See `MapPanelProps.attribution`:
           whether a deployment shows the OSM credit is the deployment's
           call, not the DS's. */
        attribution={config.uiConfig.map?.attribution as 'hidden' | 'compact' | 'visible' | undefined}
        unavailableTools={mapUnavailable}
        onRefresh={onRefresh}
        zonesAvailable={zonesAvailable ?? blueprintZones.length > 0}
        zonesOpen={resolvedZonesOpen}
        onZonesOpenChange={
          ownsDrawers ? (open) => setOwnDrawer(open ? 'zones' : null) : onZonesOpenChange
        }
        poisAvailable={poisAvailable ?? blueprintPois.length > 0}
        toolEndInset={toolEndInset}
        poiOpen={resolvedPoiOpen}
        onPoiOpenChange={ownsDrawers ? (open) => setOwnDrawer(open ? 'poi' : null) : onPoiOpenChange}
        selectedId={selectedId}
        onSelect={onSelect}
        onOpenVehicle={
          onOpenRecord ? (vehicle: LiveVehicleDatum) => onOpenRecord(vehicle.record as EntityRecord) : undefined
        }
        getPopupData={
          resolvePopupData ? (vehicle: LiveVehicleDatum) => resolvePopupData(vehicle.record as EntityRecord) : undefined
        }
        getWorkforcePopupData={
          resolveWorkforcePopupData
            ? (member: LiveWorkforceDatum) => resolveWorkforcePopupData(member.record as EntityRecord)
            : undefined
        }
        onOpenWorkforce={
          onOpenRecord ? (member: LiveWorkforceDatum) => onOpenRecord(member.record as EntityRecord) : undefined
        }
        popupFooter={
          renderPopupFooter ? (vehicle: LiveVehicleDatum) => renderPopupFooter(vehicle.record as EntityRecord) : undefined
        }
        popupOverflow={
          renderPopupOverflow ? (vehicle: LiveVehicleDatum) => renderPopupOverflow(vehicle.record as EntityRecord) : undefined
        }
        popupMaxWidth={popupMaxWidth}
        popupClassName={popupClassName}
        zones={ownsDrawers ? ownZones : (zones ?? config.uiConfig.map?.zones)}
        pois={ownsDrawers ? ownPois : pois}
        incidents={incidents}
        incidentsAvailable={incidentsAvailable ?? Boolean(incidents?.length)}
        incidentsOpen={incidentsOpen}
        onIncidentsOpenChange={onIncidentsOpenChange}
        selectedIncidentId={selectedIncidentId}
        onSelectIncident={onSelectIncident}
        paths={paths}
        focusPosition={focusPosition}
        fitBounds={fitBounds}
        onViewportChange={onViewportChange}
        fitToMarkersNonce={fitToMarkersNonce}
        styleUrl={styleUrl}
        cluster={cluster}
        className={className ?? 'h-full min-h-96'}
        aria-label={`${config.name} live map`}
        vehicleArt={config.uiConfig.map?.vehicleArt}
        markerDetailZoom={config.uiConfig.map?.markerDetailZoom}
      />
      {/* The drawers dock `absolute inset-y-0 end-0`, so the self-contained
          mode supplies the positioned container they dock into. */}
      {ownsDrawers ? (
        <div className="pointer-events-none absolute inset-0 [&>*]:pointer-events-auto">
          <ZonesDrawer
            open={resolvedZonesOpen}
            onClose={() => setOwnDrawer(null)}
            zones={blueprintZones}
            checkedIds={ownZoneIds}
            onCheckedIdsChange={setOwnZoneIds}
          />
          <PoiDrawer
            open={resolvedPoiOpen}
            onClose={() => setOwnDrawer(null)}
            pois={blueprintPois}
            checkedIds={ownPoiIds}
            onCheckedIdsChange={setOwnPoiIds}
          />
        </div>
      ) : null}
    </Suspense>
  )

  // Only the self-contained mode needs its own positioned box; every other
  // caller keeps MapView's original single-child layout contract.
  return ownsDrawers ? <div className="relative h-full min-h-0">{body}</div> : body
}

MapView.displayName = 'MapView'
