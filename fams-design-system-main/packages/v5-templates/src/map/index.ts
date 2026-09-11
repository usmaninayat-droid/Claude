/**
 * `@fams/v5-templates/map` — the map template's dedicated, heavy entry
 * point. [phase 2 §3, MapPanel]
 *
 * LAZY-WEIGHT DISCIPLINE (perf rule 7): `maplibre-gl` + `react-map-gl` +
 * `deck.gl` + `terra-draw` + `supercluster` are real, substantial
 * dependencies (a WebGL map engine, a GPU layer framework, a geometry-draw
 * library). Most `@fams/v5-templates` consumers never render a map and must
 * not pay for any of it. This package's main barrel, `src/index.ts`, imports
 * NOTHING from `map/` — so a consumer doing `import { ModuleView } from
 * '@fams/v5-templates'` never resolves this file or anything it imports.
 * Map-rendering consumers opt in explicitly via this second path:
 *
 *   import { MapPanel } from '@fams/v5-templates/map'
 *
 * MECHANISM — separate build entry, not an in-file dynamic `import()`:
 * `tsup.config.ts` lists `src/index.ts` AND `src/map/index.ts` as two
 * independent `entry` points (still `splitting: false`). esbuild bundles
 * each entry from its own reachable-module graph, so `dist/index.js` (the
 * `.` export) contains zero bytes of the map stack, and `dist/map/index.js`
 * (the `./map` export, wired in `package.json`'s `exports` map) contains the
 * full MapPanel implementation. A `React.lazy(() => import('./MapPanel'))`
 * split INSIDE a single entry was considered first (the brief's suggested
 * default) and rejected: with `splitting: false` and only one real entry,
 * esbuild has nowhere to put a second chunk — it inlines the dynamically
 * imported module's code into that same single output file (the `import()`
 * stays lazy at *execution* time, but the *bytes* ship regardless of
 * whether it ever runs). A separate entry is the only one of the two
 * mechanisms that is actually verifiable at the build-output level: run
 * `pnpm --filter @fams/v5-templates build` and inspect `dist/index.js` vs
 * `dist/map/index.js` — this file's exports (and the libraries above) are
 * verifiably absent from the first.
 */
export { MapPanel } from './MapPanel'
export type {
  LngLat,
  MapLegendEntry,
  MapHeatDatum,
  MapMarkerDatum,
  MapPanelClusterOptions,
  MapPanelProps,
  MapViewState,
  MapZoneDatum,
} from './MapPanel.types'
export {
  BRIGHT_MAP_STYLE,
  DEFAULT_MAP_STYLE,
  DEFAULT_VIEW_STATE,
  MAP_ATTRIBUTION_STRIP,
  MAP_MIN_ZOOM,
  MAP_TOOL_DRAWER_WIDTH,
  MUTED_MAP_STYLE,
  applyMutedBasemapPaint,
} from './constants'
export { useMutedBasemapStyle } from './muted-basemap'
/* Traffic overlay (SPEC 3.19) — the deterministic pseudo-traffic layer.
   `MapPanel`/`LiveMapView` wire it themselves; these are exported so an app
   can key its own chrome off the same levels/palette the map paints with. */
export {
  TRAFFIC_LEVELS,
  TRAFFIC_LEVEL_LABELS,
  TRAFFIC_ROAD_CLASSES,
  buildTrafficFeatureCollection,
  congestionFor,
  hashSeed,
  levelForCongestion,
  trafficLevelFor,
  trafficPalette,
  trafficSegmentKey,
  type TrafficLevel,
  type TrafficRoadClass,
} from './traffic'
export { TRAFFIC_LAYER_ID, TRAFFIC_SOURCE_ID, useTrafficLayer } from './traffic-layer'
export { setTrafficOverlayEnabled, useTrafficOverlayEnabled } from './traffic-overlay-store'
/* Basemap label renames (`uiConfig.map.labelOverrides`). */
export { applyLabelOverrides, buildTextFieldExpression, isWaterLabelLayer, rewriteNameGetters, useMapLabelOverrides, LABEL_NAME_FIELDS } from './label-overrides'
export type { MapLabelOverride } from './label-overrides'
export { TrafficLegend } from './chrome/TrafficLegend'
export type { TrafficLegendProps } from './chrome/TrafficLegend'
export {
  GLOBAL_BASEMAP_IDS,
  DEFAULT_GLOBAL_BASEMAP_ID,
  resolveGlobalBasemapStyleUrl,
  setGlobalBasemapId,
  useGlobalBasemapId,
  useGlobalBasemapStyleUrl,
  type GlobalBasemapId,
} from './global-basemap-store'
/* `focusOffsetFitsCardAbove` is deliberately NOT re-exported: it is a test-only
   predicate (Phase 7 code review, finding 11), and every barrel entry is a
   contract FAMS Desk has to keep working. `popup-anchor.test.ts` imports it
   from the module directly. It was never exported on `main`, so un-exporting it
   here removes nothing from the published surface. */
export { computeFocusOffset, computePopupAnchor, DEFAULT_POPUP_SIZE } from './popup-anchor'
export type { FocusOffsetInput, MapPopupAnchor, PopupAnchorInput } from './popup-anchor'
export { suppressedChipIds } from './chip-collision'
export type { ChipCollisionItem, ChipCollisionOptions } from './chip-collision'
export type { DrawMode } from './draw'

/**
 * LocationMap — the generic DISPLAY map template (figma-spec-detail.md §4),
 * composed on `MapPanel`. Ships from this same `./map` entry (never the
 * light `.` barrel) for the identical lazy-weight reason as `MapPanel`
 * itself — see this file's header.
 */
export { LocationMap } from './LocationMap'
export type { LocationMapPin, LocationMapPolygon, LocationMapProps } from './LocationMap'

/**
 * LocationMapSection — the `LocationMapSection`-named profile-section
 * renderer (figma-spec-detail.md §4). `TaskDetail` never imports this file
 * directly (that would defeat the whole point of this entry split) — it
 * resolves it through a `React.lazy(() => import('@fams/v5-templates/map'))`
 * registered under the SAME package's light `.` entry instead (see
 * `views/LocationMapSectionSlot.tsx`), so a consumer that never renders a
 * `LocationMapSection` never pays for this file's `maplibre-gl` chain.
 */
export { LocationMapSection } from './LocationMapSection'
export type { LocationMapSectionConfig } from './LocationMapSection'

/**
 * OnwaniLocationSection — the creation form's `OnwaniLocationPicker` mounted
 * as a profile SECTION, so the detail side sheet edits location through the
 * exact same component the creation sheet uses. Registered by name from the
 * light barrel via `views/OnwaniLocationSectionSlot.tsx`'s lazy wrapper — a
 * consumer never imports this directly.
 */
export { OnwaniLocationSection } from './OnwaniLocationSection'
export type { OnwaniLocationSectionConfig } from './OnwaniLocationSection'

/**
 * LocationPickerMap — the INTERACTIVE click-to-drop-a-pin map (figma-spec-
 * create-sheet.md §2.11's Location Details card). Ships from this same
 * `./map` entry for the identical lazy-weight reason as everything else
 * above; reached from the light `.` entry only through a runtime
 * `import('@fams/v5-templates/map')` inside the "LocationPicker" edit
 * widget (`creation-sheet/LocationPickerWidget.tsx`).
 */
export { LocationPickerMap } from './LocationPickerMap'
export type { LocationPickerMapProps, LocationPickerRelatedPin } from './LocationPickerMap'

/**
 * LiveMapView + LiveVehiclePopup — the live-monitoring map surface (photo/
 * status-ring vehicle markers, segmented cluster badges, the 4-tab vehicle
 * card popup). Heavy entry only; the light barrel's `MapView`/
 * `LiveHybridView` reach these through `React.lazy(() =>
 * import('@fams/v5-templates/map'))` — see `views/MapView.tsx`.
 */
export { LiveMapView } from './LiveMapView'
export type { LiveMapViewProps } from './LiveMapView'
export { LiveVehiclePopup } from './LiveVehiclePopup'
export type { LiveVehiclePopupProps, LiveVehiclePopupData } from './LiveVehiclePopup'
export { LIVE_STATUS_LABEL, LIVE_STATUS_TONE, liveVehicleMeta } from './live-types'
export type {
  LiveIncidentDatum,
  LiveMapPlace,
  LiveMapUnavailableTool,
  LivePoiDatum,
  LiveVehicleDatum,
  LiveVehicleStatus,
  LiveZoneDatum,
} from './live-types'
/**
 * LiveMapTools — the Live Monitoring floating map chrome (SPEC §2.3).
 * `LiveMapView` renders it behind `showTools`; exported so an app can paint
 * the same stack over its own map surface.
 */
export {
  LiveMapTools,
  LIVE_MAP_TOOL_IDS,
  LIVE_MAP_DEFAULT_TOOL_IDS,
  LIVE_MAP_BASEMAP_STYLES,
  LIVE_MAP_MUTED_STYLE_ID,
  LIVE_MAP_BRIGHT_STYLE_ID,
} from './chrome/LiveMapTools'
export type { LiveMapToolsProps, LiveMapToolId } from './chrome/LiveMapTools'
export { PoiPin, poiRadiusZone } from './PoiPin'
export type { PoiPinProps } from './PoiPin'
export { IncidentPin } from './IncidentPin'
export type { IncidentPinProps } from './IncidentPin'
export type { MapClusterDatum, MapPathDatum, MapMarkerRenderState } from './MapPanel.types'

/**
 * Cluster toggle (map-features-video-analysis.md §2) — persisted, cross-tab
 * synced "is clustering on" preference, the same shape as
 * `useGlobalBasemapId` above. `LiveMapView` consumes this itself; exported so
 * an app painting its own chrome over the map can read/drive the same state.
 */
export { useClusterEnabled, setClusterEnabled } from './cluster-toggle-store'

/**
 * Map search (map-features-video-analysis.md §1) — the pluggable provider
 * contract, the default provider set built from data a live view already
 * holds, the dropdown panel, and the selected-result highlight marker.
 * `LiveMapView` wires all of this itself via `searchProviders`/
 * `searchableZones`/`searchShortcuts`; exported for a caller painting its own
 * map chrome (mirrors why `LiveMapTools` itself is exported).
 */
export { MapSearchPanel } from './chrome/MapSearchPanel'
export type { MapSearchPanelProps } from './chrome/MapSearchPanel'
export { SearchHighlightPin } from './SearchHighlightPin'
export type { SearchHighlightPinProps } from './SearchHighlightPin'
export {
  createDefaultSearchProviders,
  createPlacesSearchProvider,
  createZonesSearchProvider,
  createAssetsSearchProvider,
  createPoisSearchProvider,
  createShortcutsSearchProvider,
} from './search/search-providers'
export type { MapSearchShortcut } from './search/search-providers'
export type {
  MapSearchResult,
  MapSearchResultKind,
  MapSearchProvider,
  MapSearchHighlight,
} from './search/search-types'
export { searchHighlightZone, haversineKm, vehiclesWithinRadius } from './search/highlight-geo'
/**
 * Qatar gazetteer (search-video-spec.md: "a Qatar gazetteer of
 * places/districts/landmarks (metadata, no geocoder)") — a static, opt-in
 * dataset + provider; NOT part of `createDefaultSearchProviders`'s output
 * unless a caller passes `gazetteer: qatarGazetteer` (see the file doc).
 */
export { qatarGazetteer, createGazetteerSearchProvider } from './search/qatar-gazetteer'
export type { MapGazetteerEntry } from './search/qatar-gazetteer'

/**
 * Weather monitoring layer (Figma section 22:41486) — the station markers,
 * their overlay checkbox row, the seeded field overlays and the docked
 * station drawer. `LiveMapView` wires all of it from `weatherStations`;
 * everything is exported for a caller painting its own map chrome, exactly
 * as `LiveMapTools`/`MapSearchPanel` above are.
 */
export { WeatherStationMarker } from './WeatherStationMarker'
export type { WeatherStationMarkerProps } from './WeatherStationMarker'
export { WeatherStationDrawer } from './WeatherStationDrawer'
export type { WeatherStationDrawerProps } from './WeatherStationDrawer'
export {
  WeatherConditionsGrid,
  WeatherTrendChart,
  WeatherForecastTable,
  WeatherDailyTable,
  currentConditionRows,
  nowBandMarkArea,
  stationCoordinates,
  NO_VALUE,
} from './WeatherStationDrawerParts'
export { MapOverlayLayersPanel } from './chrome/MapOverlayLayersPanel'
export type { MapOverlayLayersPanelProps, MapOverlayLayerEntry } from './chrome/MapOverlayLayersPanel'
export { WeatherForecastPanel } from './WeatherForecastPanel'
export type { WeatherForecastPanelProps } from './WeatherForecastPanel'
export {
  WEATHER_OVERLAY_IDS,
  WEATHER_OVERLAY_LABELS,
  WEATHER_DEFAULT_OVERLAY_IDS,
  WEATHER_FORECAST_MODELS,
  WEATHER_FORECAST_MODEL_LABELS,
  stationTempC,
  stationMarkerLabel,
  nearestWeatherStation,
  stationForecastPanelData,
} from './weather-types'
export type {
  WeatherStationDatum,
  WeatherStationReading,
  WeatherForecastRow,
  WeatherDailyRow,
  WeatherTrendPoint,
  WeatherOverlayId,
  WeatherForecastLocation,
  WeatherForecastDay,
  WeatherForecastPanelData,
  WeatherForecastModelId,
} from './weather-types'
export {
  temperatureBand,
  temperatureBandColor,
  stationBandColor,
  weatherLegendEntries,
  WEATHER_TEMP_BAND_THRESHOLDS,
  WEATHER_TEMP_BAND_RANGE,
} from './weather-color'
export type { WeatherTempBand } from './weather-color'
export {
  buildWeatherField,
  weatherFieldValue,
  weatherFieldHash,
  WEATHER_FIELD_RESOLUTION,
} from './weather-overlay'
export type { WeatherFieldPoint, WeatherFieldCollection } from './weather-overlay'
export {
  useWeatherOverlayLayers,
  weatherLayerSpec,
  weatherSourceId,
  weatherLayerId,
  mapFieldBbox,
  WEATHER_FIELD_OVERLAY_IDS,
} from './weather-overlay-layer'
export type { WeatherFieldOverlayId } from './weather-overlay-layer'
