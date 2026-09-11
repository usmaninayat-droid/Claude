export { MapWidget } from './map-widget';
export type {
  MapWidgetProps,
  MapWidgetStatusBadge,
  MapWidgetLocationCallout,
} from './map-widget';

export { AssetMarker, ASSET_STATE_COLOR } from './map-marker';
export type { AssetMarkerState, AssetMarkerProps } from './map-marker';

export { MapLiveWidget, usePrefersReducedMotion } from './map-live-widget';
export type { MapLiveWidgetProps, MapLiveAsset } from './map-live-widget';
export { HybridMapListWidget } from './hybrid-map-list-widget';
export type {
  HybridMapListWidgetProps,
  HybridMapListEvent,
  HybridEventSeverity,
  HybridChip,
} from './hybrid-map-list-widget';

export { MapLegend } from './map-legend';
export type { MapLegendProps } from './map-legend';
export { MARKER_STATUS_COLORS } from './types';

// The DS standard map is MapLibre GL (`MapView`). `LeafletMap` stays exported as
// an alias of `MapView` so every existing consumer keeps working unchanged.
export { MapView, MapView as LeafletMap } from './map-view';
export type {
  MapViewProps,
  MapViewHandle,
  MapPoi,
  MapDrawSpec,
  MapDrawMode,
  LeafletMapProps,
  LeafletMapHandle,
  MapMarker,
  MapRoute,
  MapZone,
  HeatPoint,
  MarkerKind,
  MarkerStatus,
  LatLng,
} from './types';

export { EventsHeatmap, ZoneComplianceMap, ServiceLocationsMap } from './map-widgets';
export type {
  EventsHeatmapProps,
  ZoneComplianceMapProps,
  ServiceLocationsMapProps,
  MapLegendItem,
  ZoneComplianceRow,
} from './map-widgets';
export { WeatherForecastWidget } from './weather-forecast-widget';
export type { WeatherForecastWidgetProps } from './weather-forecast-widget';
export { WeatherForecastPanel, buildFloodForecastPanelData } from './weather-forecast-panel';
export type {
  WeatherForecastPanelProps, WeatherForecastPanelData, WeatherForecastDay,
  WeatherForecastRow, WeatherDailyRow, WeatherForecastLocation,
} from './weather-forecast-panel';
export { MapAnalyticsPanel } from './map-analytics-panel';
export type { MapAnalyticsPanelProps, FloodIndexProps, RainProjectionProps, RainProjectionSlot, FleetStatusProps, FleetStatusSegment } from './map-analytics-panel';
export { MapLayersControl, MapToolsControl, MapVisibilityToggle } from './map-layers-control';
export type { MapLayersControlProps, MapLayerToggle, MapToolsControlProps, MapVisibilityToggleProps } from './map-layers-control';
export { LiveMapTools, MapToolButton, BasemapSwitcher, LIVE_BASEMAP_STYLES, LIVE_BASEMAP_DEFAULT_ID } from './live-map-tools';
export type { LiveMapToolsProps, LiveMapToolId, MapToolButtonProps, BasemapSwitcherProps, BasemapStyle } from './live-map-tools';
