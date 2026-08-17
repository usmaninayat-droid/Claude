import type { AssetMarkerState } from './map-marker';

/**
 * Shared map types for the DS map (MapLibre `MapView`). Kept Leaflet-free so the
 * whole component tree can import them without pulling a map engine in.
 * `[lat, lng]` order throughout (MapView converts to MapLibre's [lng,lat]).
 */
export type LatLng = [number, number];

export type MarkerKind = 'dot' | 'vehicle' | 'plant' | 'site' | 'asset';
export type MarkerStatus = 'default' | 'reporting' | 'stopped' | 'critical' | 'warning' | 'idle';

/**
 * Canonical marker status → colour map. These are marker DATA colours (injected
 * into Leaflet/MapLibre HTML icons, not chrome), and are the SINGLE source the
 * map renderer + `MapLegend` share — so a consumer building a legend never
 * re-hardcodes the hex. Values mirror the DS status tokens
 * (primary / success / error-600 / error / warning / grey-400).
 */
export const MARKER_STATUS_COLORS: Record<MarkerStatus, string> = {
  default: '#0072D6',   // coherence-allow — marker DATA colour (== --primary)
  reporting: '#12B76A', // coherence-allow — == --status-success
  stopped: '#D92D20',   // coherence-allow — == error-600
  critical: '#F04438',  // coherence-allow — == --status-error
  warning: '#F79009',   // coherence-allow — == --status-warning
  idle: '#98A2B3',      // coherence-allow — == grey-400
};

export interface MapMarker {
  id: string;
  position: LatLng;
  status?: MarkerStatus;
  kind?: MarkerKind;
  assetType?: string;
  assetState?: AssetMarkerState;
  assetActive?: boolean;
  live?: boolean;
  heading?: number;
  label?: string;
  statusLabel?: string;
  selected?: boolean;
  tooltip?: string;
  iconUrl?: string;
  iconSize?: [number, number];
  iconAnchor?: [number, number];
  badge?: string | number;
}

export interface MapRoute {
  id: string;
  points: LatLng[];
  color?: string;
  weight?: number;
  dashed?: boolean;
  osrm?: boolean;
  animateMarkerId?: string;
}

export interface MapZone {
  id: string;
  points: LatLng[];
  color?: string;
  label?: string;
  fillOpacity?: number;
}

export interface HeatPoint {
  position: LatLng;
  intensity?: number;
}

export interface MapPoi {
  id: string;
  position: LatLng;
  label?: string;
  color?: string;
  /** Pin artwork (DS POI teardrop SVG) — falls back to a plain colour dot when omitted. */
  iconUrl?: string;
  iconSize?: [number, number];
}

export interface MapViewHandle {
  flyTo: (position: LatLng, zoom?: number) => void;
  fitAll: () => void;
  /** Fit the camera to a specific set of points (e.g. one zone's polygon) —
   *  distinct from `fitAll` (fits the whole dataset). */
  fitTo: (positions: LatLng[], opts?: { padding?: number; maxZoom?: number }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Project a lat/lng to a pixel point within the map container (for overlays). */
  project: (position: LatLng) => { x: number; y: number } | null;
}

export type MapDrawMode = 'polygon' | 'rectangle' | 'circle' | 'point';
export interface MapDrawSpec {
  /** active draw tool; null/undefined = not drawing. */
  mode: MapDrawMode | null;
  color?: string;
  /** fires as vertices change (live). */
  onChange?: (points: LatLng[]) => void;
  /** fires when the shape is completed (polygon closed / 2nd corner / radius set). */
  onComplete: (points: LatLng[]) => void;
}

export interface MapViewProps {
  center: LatLng;
  zoom?: number;
  /** interactive zone/shape drawing (polygon · rectangle · circle). */
  draw?: MapDrawSpec;
  markers?: MapMarker[];
  routes?: MapRoute[];
  zones?: MapZone[];
  heat?: HeatPoint[];
  heatRadius?: number;
  cluster?: boolean;
  pois?: MapPoi[];
  onMarkerClick?: (id: string) => void;
  onViewportChange?: () => void;
  fitToContent?: boolean;
  /** MapLibre style URL. Defaults to the DS light-grey basemap. */
  styleUrl?: string;
  /** Camera tilt (deg) for the subtle 3D effect. Default 40. */
  pitch?: number;
  /** Show the standard DS map controls (zoom · reset · fullscreen). Default true. */
  controls?: boolean;
  className?: string;

  /* ── back-compat aliases (old LeafletMap API) ─────────────────────────── */
  /** @deprecated use `styleUrl` — raster tile URL is ignored by MapView. */
  tileUrl?: string;
  /** @deprecated ignored by MapView. */
  tileAttribution?: string;
  /** @deprecated use `controls`. */
  zoomControl?: boolean;
}

/* Back-compat aliases so existing imports keep working after the swap. */
export type LeafletMapHandle = MapViewHandle;
export type LeafletMapProps = MapViewProps;
