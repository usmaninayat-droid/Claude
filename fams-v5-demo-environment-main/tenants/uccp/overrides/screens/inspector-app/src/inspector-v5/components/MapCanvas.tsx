import { forwardRef } from 'react';
import { MapView } from '@ds/components/map';
import type { MapMarker, MapRoute, MapViewHandle, MapZone } from '@ds/components/map/types';
import type { Priority, PlanStatus } from '../data/types';
import { PLAN_STATUS_META } from '../data/status';

const DEFAULT_CENTER: [number, number] = [25.2854, 51.531];
const DEFAULT_ZOOM = 11;

/**
 * Dot-marker geometry — matches the FAMS V5 web hybrid-view record map
 * EXACTLY: `uiConfig.map.records` in
 * "fams-v5-demo-environment/tenants/frms/modules/incidents/blueprint.json"
 * sets `radius: 8`, and the web's underlying `ScatterplotLayer`
 * (fams-design-system/packages/v5-templates/src/map/layers.ts,
 * `buildFlatMarkerLayer`) draws `getRadius: d.radius ?? 6` in PIXELS with a
 * 2px white stroke (`getLineColor: [255,255,255,255]`,
 * `lineWidthMinPixels: 2`). Selection bumps the radius by +4px (
 * `record-map-model.ts`'s `toMapData`: `selected ? meta.radius + 4 :
 * meta.radius`) — i.e. 8 → 12.
 */
const DOT_RADIUS = 8;
const DOT_RADIUS_SELECTED = DOT_RADIUS + 4;

/**
 * Incident priority → dot colour, copied verbatim from the web's
 * `uiConfig.map.records.colorBy` in the incidents blueprint (same file as
 * above): Critical #D92D20, High #FF6A1A, Medium #F79009, Low #12B76A,
 * fallbackColor #98A2B3.
 */
const INCIDENT_PRIORITY_DOT_COLOR: Record<Priority, string> = {
  Critical: '#D92D20',
  High: '#FF6A1A',
  Medium: '#F79009',
  Low: '#12B76A',
};
const INCIDENT_DOT_FALLBACK = '#98A2B3';

/** Builds a small circular DOM-marker SVG (data URI) matching the web's
 *  ScatterplotLayer dot: solid fill + 2px white stroke, sized in pixels.
 *  This goes through `MapMarker.iconUrl` — the DS `MapView`'s supported
 *  "custom marker art" extension point — since the DS's built-in `kind:
 *  'dot'` circle is fixed to `MARKER_STATUS_COLORS` (a 6-value enum) and
 *  can't carry an arbitrary per-record hex or the web's 8px/white-stroke
 *  sizing. `iconUrl` markers anchor at their bottom edge (a DS `MapView`
 *  constant, not something a consumer can override), so a same-diameter dot
 *  image sits its bottom edge on the coordinate — a `radius`-px vertical
 *  offset from dead-center. That's the one visual delta from the web's
 *  perfectly-centered WebGL dot; everything else (fill, stroke, size,
 *  selection growth) matches exactly. */
function buildDotIconUrl(color: string, radius: number): string {
  const size = radius * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${radius}" cy="${radius}" r="${radius - 1}" fill="${color}" stroke="#ffffff" stroke-width="2"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** A `MapMarker` plus the record's web-parity dot colour — set by
 *  `priorityToDotColor`/`planStatusToDotColor` at the call site instead of
 *  the DS's `status` enum (see `buildDotIconUrl` for why). */
export type CanvasMarkerInput = Omit<MapMarker, 'iconUrl' | 'iconSize' | 'kind'> & {
  dotColor?: string;
};

export interface MapCanvasProps {
  markers: CanvasMarkerInput[];
  zones?: MapZone[];
  routes?: MapRoute[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

/**
 * MapCanvas — thin wrapper over the DS `MapView`, defaulted to the Doha
 * metro area. Forwards a `MapViewHandle` (flyTo/fitAll/fitTo/zoomIn/zoomOut/
 * project) so callers can drive the camera. Markers carrying `dotColor` are
 * rendered as web-parity coloured dots (see `buildDotIconUrl`); markers
 * without it fall back to the DS's own marker rendering untouched.
 */
export const MapCanvas = forwardRef<MapViewHandle, MapCanvasProps>(function MapCanvas(
  { markers, zones, routes, selectedId, onSelect, center = DEFAULT_CENTER, zoom = DEFAULT_ZOOM, className },
  ref
) {
  const markersWithSelection: MapMarker[] = markers.map((marker) => {
    const selected = selectedId != null ? marker.id === selectedId : marker.selected;
    if (!marker.dotColor) return { ...marker, selected };
    const radius = selected ? DOT_RADIUS_SELECTED : DOT_RADIUS;
    const { dotColor, ...rest } = marker;
    return {
      ...rest,
      selected,
      iconUrl: buildDotIconUrl(dotColor, radius),
      iconSize: [radius * 2, radius * 2],
    };
  });

  return (
    <MapView
      ref={ref}
      center={center}
      zoom={zoom}
      markers={markersWithSelection}
      zones={zones}
      routes={routes}
      onMarkerClick={onSelect}
      className={['qmme-map-canvas', className].filter(Boolean).join(' ')}
    />
  );
});

/** Incident priority → web-parity dot colour (see `INCIDENT_PRIORITY_DOT_COLOR`). */
export function priorityToDotColor(priority: Priority): string {
  return INCIDENT_PRIORITY_DOT_COLOR[priority] ?? INCIDENT_DOT_FALLBACK;
}

/** Daily-plan status → dot colour, from our own status source of truth
 *  (`data/status.ts`'s `PLAN_STATUS_META`) — the web has no plans/daily-plan
 *  hybrid map blueprint to mirror, so this stays our local semantics, kept
 *  in the same web-parity dot style (radius 8/12, white stroke). */
export function planStatusToDotColor(status: PlanStatus): string {
  return PLAN_STATUS_META[status]?.color ?? INCIDENT_DOT_FALLBACK;
}
