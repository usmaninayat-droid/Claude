import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssetMarker, type AssetMarkerState } from './map-marker';
import { AssetGlyph } from '../../icons';

/**
 * LeafletMap — Leaflet wrapper for the FAMS live-monitoring surfaces.
 *
 * The full Leaflet engine is dynamically imported on mount (~150KB) so apps
 * that never render a map pay nothing. Projects must add `leaflet` to deps.
 *
 * Beyond plain markers it supports the things the demos' Live Monitoring
 * screens actually need:
 *  - **Marker kinds** — directional `vehicle` pins, `plant`/`site` origin &
 *    destination pins, and plain `dot`s — each a status-coloured divIcon,
 *    with an optional pulsing `live` ring.
 *  - **Routes** — polylines between an origin and destination, optionally
 *    fetched as real road geometry from OSRM (a straight-line placeholder is
 *    drawn first, then swapped when the fetch resolves).
 *  - **Imperative handle** — `flyTo`, `fitAll`, `zoomIn`, `zoomOut` via ref so
 *    a surrounding list/sidebar can drive the map.
 *
 *   const map = useRef<LeafletMapHandle>(null);
 *   <LeafletMap ref={map} center={[25,55]} markers={…} routes={…} fitToContent />
 *   map.current?.flyTo([25.0,55.1], 14);
 */

export type LatLng = [number, number];

export type MarkerKind = 'dot' | 'vehicle' | 'plant' | 'site' | 'asset';
export type MarkerStatus = 'default' | 'reporting' | 'stopped' | 'critical' | 'warning' | 'idle';

export interface MapMarker {
  id: string;
  position: LatLng;
  /** Status drives the marker colour. */
  status?: MarkerStatus;
  /** Visual kind. `dot` (default) · `vehicle` · `plant` · `site` · `asset`. */
  kind?: MarkerKind;
  /** For `kind: 'asset'` — the dynamic inner glyph name (e.g. "car", "workforce", "bin"). */
  assetType?: string;
  /** For `kind: 'asset'` — the live state driving the pin colour. */
  assetState?: AssetMarkerState;
  /** For `kind: 'asset'` — selected/emphasised pin. */
  assetActive?: boolean;
  /** Pulsing "live" ring (moving vehicles). */
  live?: boolean;
  /** Heading 0–360 for vehicle markers (rotates the direction tick). */
  heading?: number;
  /** Label rendered above the pin (e.g. plate). Vehicle pins show it as a pill. */
  label?: string;
  /** Status text shown beside the pill in a vehicle pin's floating label. */
  statusLabel?: string;
  /** Emphasise this marker (selected in the fleet list) with a halo ring. */
  selected?: boolean;
  /** Tooltip on hover. */
  tooltip?: string;
  /**
   * Render a custom pin image (a full teardrop-pin SVG/PNG) directly as the
   * marker, instead of a `kind`. Takes precedence over `kind` when set. Use for
   * brand/category map pins (POI category icons, trip start/end markers, …).
   */
  iconUrl?: string;
  /** Pixel size `[w, h]` for `iconUrl` (default `[34, 40]`). */
  iconSize?: [number, number];
  /** Anchor `[x, y]` for `iconUrl` (default bottom-centre `[w/2, h]`). */
  iconAnchor?: [number, number];
  /** A badge (e.g. a sequence number) drawn on the top-right of an `iconUrl` pin. */
  badge?: string | number;
}

export interface MapRoute {
  id: string;
  /** Ordered points; a straight polyline is drawn through them. */
  points: LatLng[];
  color?: string;
  weight?: number;
  dashed?: boolean;
  /**
   * Fetch real road geometry from OSRM between the first and last point and
   * swap it in once it resolves (the straight line shows meanwhile). Fails
   * silently — the placeholder stays if OSRM is unreachable.
   */
  osrm?: boolean;
  /**
   * Continuously animate this marker id creeping along the route geometry
   * (the demos' moving-truck effect). Uses OSRM geometry once resolved.
   */
  animateMarkerId?: string;
}

/** A filled polygon zone (service area / compliance zone). */
export interface MapZone {
  id: string;
  /** Polygon ring as [lat,lng] points. */
  points: LatLng[];
  color?: string;
  label?: string;
  fillOpacity?: number;
}

/** A weighted heat point — intensity 0..1 (low→green, mid→amber, high→red). */
export interface HeatPoint {
  position: LatLng;
  intensity?: number;
}

export interface LeafletMapHandle {
  flyTo: (position: LatLng, zoom?: number) => void;
  fitAll: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Project a lat/lng to a pixel point within the map container (for overlays). */
  project: (position: LatLng) => { x: number; y: number } | null;
}

export interface LeafletMapProps {
  center: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  routes?: MapRoute[];
  /** Filled polygon zones (drawn under the markers). */
  zones?: MapZone[];
  /** Heat points — rendered as soft density blobs (dependency-free). */
  heat?: HeatPoint[];
  /** Base heat-blob radius in metres (scales with intensity). Default 380. */
  heatRadius?: number;
  /**
   * Cluster nearby markers into a count badge wrapped in a status-proportion
   * ring (the live-monitoring "zoomed-out" overview). Clusters re-form on
   * zoom/pan; a singleton renders as its normal marker; clicking a cluster
   * zooms in to expand it. Off → every marker renders individually.
   */
  cluster?: boolean;
  /** Points of interest — non-clustered pins, separate from `markers`. */
  pois?: { id: string; position: LatLng; label?: string; color?: string }[];
  onMarkerClick?: (id: string) => void;
  /** Fired on pan/zoom — lets overlays (e.g. a marker popup) re-project. */
  onViewportChange?: () => void;
  /** Fit the viewport to all markers + routes on first render. */
  fitToContent?: boolean;
  /** Tile layer. Defaults to CartoDB Voyager (colourful, no key). */
  tileUrl?: string;
  tileAttribution?: string;
  /** Show Leaflet's native +/- zoom control (bottom-right). Default off. */
  zoomControl?: boolean;
  className?: string;
}

const CARTO_VOYAGER = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const CARTO_ATTRIB = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const STATUS_COLORS: Record<MarkerStatus, string> = {
  default:   '#0072D6',
  reporting: '#12B76A',
  stopped:   '#D92D20',
  critical:  '#F04438',
  warning:   '#F79009',
  idle:      '#98A2B3',
};

/** Inject the live-pulse keyframes once. */
function ensurePulseStyle() {
  if (typeof document === 'undefined' || document.getElementById('fams-map-pulse')) return;
  const s = document.createElement('style');
  s.id = 'fams-map-pulse';
  s.textContent = `
@keyframes famsRingPulse { 0%{transform:scale(.9);opacity:.55} 70%{transform:scale(1.6);opacity:0} 100%{opacity:0} }
.fams-pulse-ring{position:absolute;inset:0;border-radius:50%;animation:famsRingPulse 2s ease-out infinite;}
`;
  document.head.appendChild(s);
}

const VEHICLE_SVG = `<svg width="18" height="13" viewBox="0 0 20 14" fill="none"><path d="M1 3.5h9v7H1zM10 5.5h4l3 2.5v2.5h-7z" fill="#fff" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="5" cy="11" r="1.6" fill="#fff" stroke="currentColor" stroke-width="1.2"/><circle cx="13.5" cy="11" r="1.6" fill="#fff" stroke="currentColor" stroke-width="1.2"/></svg>`;
const PLANT_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 21V9l5 3V9l5 3V5l8 5v11z" fill="currentColor" opacity="0.9"/></svg>`;
const SITE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2c3.9 0 7 3.1 7 7 0 5-7 13-7 13S5 14 5 9c0-3.9 3.1-7 7-7z" fill="#fff" opacity=".25"/><circle cx="12" cy="9" r="2.5" fill="#fff"/></svg>`;

/** Build the divIcon HTML for a marker kind. */
function markerHtml(m: MapMarker): { html: string; size: [number, number]; anchor: [number, number] } {
  const color = STATUS_COLORS[m.status ?? 'default'];
  const label = m.label
    ? `<div style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:3px;white-space:nowrap;font:600 10px/1 Gilroy,sans-serif;color:#1d2939;background:rgba(255,255,255,.9);padding:2px 5px;border-radius:3px;box-shadow:0 1px 2px rgba(16,24,40,.18)">${m.label}</div>`
    : '';
  // Selection halo (fleet-list row → map emphasis).
  const halo = m.selected
    ? `<span style="position:absolute;inset:-7px;border-radius:50%;border:2px solid #0072D6;box-shadow:0 0 0 3px rgba(0,114,214,.2)"></span>`
    : '';

  // Custom pin image (full teardrop-pin SVG/PNG) — takes precedence over `kind`.
  if (m.iconUrl) {
    const [w, h] = m.iconSize ?? [34, 40];
    const anchor = m.iconAnchor ?? [w / 2, h];
    const ring = m.live ? `<span class="fams-pulse-ring" style="background:${color}"></span>` : '';
    const badge =
      m.badge != null && m.badge !== ''
        ? `<span style="position:absolute;top:-4px;right:-4px;min-width:15px;height:15px;padding:0 3px;border-radius:8px;background:#0072D6;color:#fff;font:700 9px/15px Gilroy,sans-serif;text-align:center;box-shadow:0 0 0 1.5px #fff">${m.badge}</span>`
        : '';
    const html = `<div style="position:relative;width:${w}px;height:${h}px">${halo}${label}${ring}<img src="${m.iconUrl}" alt="" draggable="false" style="width:${w}px;height:${h}px;display:block;filter:drop-shadow(0 2px 3px rgba(16,24,40,.28))"/>${badge}</div>`;
    return { html, size: [w, h], anchor };
  }

  if (m.kind === 'asset') {
    // The DS V2 live-monitoring pin: state-coloured AssetMarker + a dynamic
    // asset glyph (vehicle / workforce / bin). Rendered to static HTML for the
    // Leaflet divIcon; CSS-var colours resolve in the page.
    const pin = renderToStaticMarkup(
      <AssetMarker state={m.assetState ?? 'non-reporting'} active={m.assetActive} size={34}>
        {m.assetType ? <AssetGlyph name={m.assetType} variant="map" size={20} /> : null}
      </AssetMarker>,
    );
    // Floating label pill (plate + status) — shown when unclustered.
    const assetLabel = m.label
      ? `<div style="position:absolute;bottom:calc(100% + 2px);left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:5px;white-space:nowrap;background:#fff;border:1px solid #eaecf0;border-radius:4px;padding:2px 8px 2px 3px;box-shadow:0 1px 3px rgba(16,24,40,.2)"><span style="background:${color};color:#fff;font:700 9px/1 Gilroy,sans-serif;letter-spacing:.04em;padding:3px 5px;border-radius:3px">${m.label}</span>${m.statusLabel ? `<span style="font:600 10px/1 Gilroy,sans-serif;color:#475467">${m.statusLabel}</span>` : ''}</div>`
      : '';
    const html = `<div style="position:relative;display:flex;justify-content:center">${assetLabel}${pin}</div>`;
    return { html, size: [40, 60], anchor: [20, 54] };
  }
  if (m.kind === 'vehicle') {
    const ring = m.live ? `<span class="fams-pulse-ring" style="background:${color}"></span>` : '';
    const tick = `<span style="position:absolute;top:-5px;left:50%;transform:translateX(-50%) rotate(${m.heading ?? 0}deg);transform-origin:50% 23px;width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:6px solid ${color}"></span>`;
    // Floating label box (cement demo): coloured plate pill + status text.
    const vehLabel = m.label
      ? `<div style="position:absolute;bottom:calc(100% + 5px);left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:5px;white-space:nowrap;background:#fff;border:1px solid #eaecf0;border-radius:4px;padding:2px 8px 2px 3px;box-shadow:0 1px 3px rgba(16,24,40,.2)"><span style="background:${color};color:#fff;font:700 9px/1 Gilroy,sans-serif;letter-spacing:.04em;padding:3px 5px;border-radius:3px">${m.label}</span>${m.statusLabel ? `<span style="font:600 10px/1 Gilroy,sans-serif;color:#475467">${m.statusLabel}</span>` : ''}</div>`
      : '';
    return {
      html: `<div style="position:relative;width:38px;height:38px;color:${color}">${halo}${vehLabel}${ring}${tick}<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#fff;border:2.5px solid ${color};box-shadow:0 1px 4px rgba(16,24,40,.3)">${VEHICLE_SVG}</span></div>`,
      size: [38, 38],
      anchor: [19, 19],
    };
  }
  if (m.kind === 'plant') {
    return {
      html: `<div style="position:relative;width:34px;height:34px;color:#475467">${label}<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#f2f4f7;border:2px solid #d0d5dd;box-shadow:0 1px 4px rgba(16,24,40,.25)">${PLANT_SVG}</span></div>`,
      size: [34, 34],
      anchor: [17, 17],
    };
  }
  if (m.kind === 'site') {
    return {
      html: `<div style="position:relative;width:34px;height:34px">${label}<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:50% 50% 50% 0;transform:rotate(45deg);background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(16,24,40,.3)"><span style="transform:rotate(-45deg)">${SITE_SVG}</span></span></div>`,
      size: [34, 34],
      anchor: [17, 30],
    };
  }
  // dot
  const ring = m.live ? `<span class="fams-pulse-ring" style="background:${color}"></span>` : '';
  return {
    html: `<div style="position:relative;width:24px;height:24px">${halo}${label}${ring}<span style="position:absolute;inset:0;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 3px rgba(16,24,40,.25)"></span></div>`,
    size: [24, 24],
    anchor: [12, 12],
  };
}

/** Stable status order so a cluster's ring colours don't reshuffle between renders. */
const CLUSTER_STATUS_ORDER: MarkerStatus[] = ['reporting', 'warning', 'idle', 'stopped', 'critical', 'default'];

/** A cluster pin: count badge wrapped in a conic ring of the member statuses. */
function clusterIconHtml(
  count: number,
  breakdown: Partial<Record<MarkerStatus, number>>,
): { html: string; size: [number, number]; anchor: [number, number] } {
  const total = Object.values(breakdown).reduce<number>((s, n) => s + (n ?? 0), 0) || count || 1;
  let acc = 0;
  const stops: string[] = [];
  for (const st of CLUSTER_STATUS_ORDER) {
    const n = breakdown[st] ?? 0;
    if (!n) continue;
    const start = (acc / total) * 360;
    acc += n;
    const end = (acc / total) * 360;
    stops.push(`${STATUS_COLORS[st]} ${start}deg ${end}deg`);
  }
  const ring = stops.length ? `conic-gradient(${stops.join(',')})` : STATUS_COLORS.default;
  const d = Math.round(40 + Math.min(34, Math.log10(Math.max(1, count)) * 11)); // 40 → ~74px
  const inset = Math.round(d * 0.16);
  const fs = count >= 100 ? 12 : 13;
  const html =
    `<div style="position:relative;width:${d}px;height:${d}px">` +
    `<div style="position:absolute;inset:0;border-radius:50%;background:${ring};box-shadow:0 1px 4px rgba(16,24,40,.3)"></div>` +
    `<div style="position:absolute;inset:${inset}px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font:700 ${fs}px/1 Gilroy,sans-serif;color:#1d2939">${count}</div>` +
    `</div>`;
  return { html, size: [d, d], anchor: [d / 2, d / 2] };
}

async function fetchOsrm(points: LatLng[]): Promise<LatLng[] | null> {
  if (points.length < 2) return null;
  const a = points[0];
  const b = points[points.length - 1];
  const url = `https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    const coords = json?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords)) return null;
    return coords.map((c: [number, number]) => [c[1], c[0]] as LatLng);
  } catch {
    return null;
  }
}

export const LeafletMap = React.forwardRef<LeafletMapHandle, LeafletMapProps>(function LeafletMap(
  {
    center,
    zoom = 12,
    markers = [],
    routes = [],
    zones = [],
    heat = [],
    heatRadius = 380,
    cluster = false,
    pois = [],
    onMarkerClick,
    onViewportChange,
    fitToContent,
    tileUrl = CARTO_VOYAGER,
    tileAttribution = CARTO_ATTRIB,
    zoomControl = false,
    className,
  },
  ref
) {
  const el = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<any>(null);
  const markerLayer = React.useRef<any>(null);
  const routeLayer = React.useRef<any>(null);
  const zoneLayer = React.useRef<any>(null);
  const heatLayer = React.useRef<any>(null);
  const poiLayer = React.useRef<any>(null);
  const markerRefs = React.useRef<Record<string, any>>({});
  const routeGeom = React.useRef<Record<string, LatLng[]>>({});
  const tileRef = React.useRef<any>(null);
  const [ready, setReady] = React.useState(false);

  React.useImperativeHandle(ref, () => ({
    flyTo: (position, z = 14) => map.current?.flyTo(position, z, { duration: 0.7 }),
    fitAll: () => fitContent(),
    zoomIn: () => map.current?.zoomIn(),
    zoomOut: () => map.current?.zoomOut(),
    project: (position) => {
      const p = map.current?.latLngToContainerPoint(position);
      return p ? { x: p.x, y: p.y } : null;
    },
  }));

  const fitContent = React.useCallback(() => {
    if (!map.current) return;
    const pts: LatLng[] = [...markers.map((m) => m.position), ...routes.flatMap((r) => r.points)];
    if (pts.length >= 2) {
      const L = (window as any).L;
      if (L) map.current.fitBounds(L.latLngBounds(pts), { padding: [60, 60] });
    } else if (pts.length === 1) {
      map.current.setView(pts[0], zoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, routes, zoom]);

  /* init once */
  React.useEffect(() => {
    if (!el.current || map.current) return;
    let cancelled = false;
    (async () => {
      ensurePulseStyle();
      const L = await import('leaflet');
      (window as any).L = L;
      if (cancelled || !el.current) return;
      if (!document.querySelector('link[data-fams-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.dataset.famsLeaflet = 'true';
        document.head.appendChild(link);
      }
      const m = L.map(el.current, { center, zoom, zoomControl: false, attributionControl: true });
      if (zoomControl) L.control.zoom({ position: 'bottomright' }).addTo(m);
      tileRef.current = L.tileLayer(tileUrl, { attribution: tileAttribution, subdomains: 'abcd', maxZoom: 19 }).addTo(m);
      // Stacking order (bottom → top): heat · zones · routes · markers.
      heatLayer.current = L.layerGroup().addTo(m);
      zoneLayer.current = L.layerGroup().addTo(m);
      routeLayer.current = L.layerGroup().addTo(m);
      poiLayer.current = L.layerGroup().addTo(m);
      markerLayer.current = L.layerGroup().addTo(m);
      m.on('move zoom', () => onViewportChange?.());
      map.current = m;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      map.current?.remove?.();
      map.current = null;
      markerLayer.current = null;
      routeLayer.current = null;
      zoneLayer.current = null;
      heatLayer.current = null;
      poiLayer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* swap basemap when the tile url changes (the layers toggle) */
  React.useEffect(() => {
    if (ready && tileRef.current) tileRef.current.setUrl(tileUrl);
  }, [ready, tileUrl]);

  /* markers — individual pins, or status-ring clusters when `cluster` is on.
     Clusters are pixel-bucketed at the current zoom, so they re-form on
     zoom/pan (the handler below); a singleton bucket renders its normal pin. */
  const renderMarkers = React.useCallback(() => {
    const L = (window as any).L;
    const layer = markerLayer.current;
    const m = map.current;
    if (!L || !layer || !m) return;
    layer.clearLayers();
    markerRefs.current = {};
    const place = (mk: MapMarker) => {
      const { html, size, anchor } = markerHtml(mk);
      const icon = L.divIcon({ className: 'fams-map-marker', html, iconSize: size, iconAnchor: anchor });
      const marker = L.marker(mk.position, { icon, zIndexOffset: mk.live ? 100 : mk.kind === 'vehicle' ? 50 : 0 });
      if (mk.tooltip) marker.bindTooltip(mk.tooltip, { direction: 'top' });
      if (onMarkerClick) marker.on('click', () => onMarkerClick(mk.id));
      marker.addTo(layer);
      markerRefs.current[mk.id] = marker;
    };
    if (!cluster || markers.length < 2) {
      markers.forEach(place);
      return;
    }
    const CELL = 58; // px bucket size at the current zoom
    const buckets = new Map<string, MapMarker[]>();
    for (const mk of markers) {
      const p = m.latLngToContainerPoint(mk.position);
      const key = `${Math.floor(p.x / CELL)}:${Math.floor(p.y / CELL)}`;
      const arr = buckets.get(key);
      if (arr) arr.push(mk); else buckets.set(key, [mk]);
    }
    for (const group of buckets.values()) {
      if (group.length === 1) { place(group[0]); continue; }
      const breakdown: Partial<Record<MarkerStatus, number>> = {};
      let lat = 0, lng = 0;
      for (const g of group) {
        const s = g.status ?? 'default';
        breakdown[s] = (breakdown[s] ?? 0) + 1;
        lat += g.position[0];
        lng += g.position[1];
      }
      const center: LatLng = [lat / group.length, lng / group.length];
      const { html, size, anchor } = clusterIconHtml(group.length, breakdown);
      const icon = L.divIcon({ className: 'fams-map-cluster', html, iconSize: size, iconAnchor: anchor });
      const marker = L.marker(center, { icon, zIndexOffset: 200 });
      marker.on('click', () => m.flyTo(center, Math.min((m.getZoom?.() ?? 12) + 2, 18), { duration: 0.6 }));
      marker.addTo(layer);
    }
  }, [markers, onMarkerClick, cluster]);

  React.useEffect(() => {
    if (!ready) return;
    renderMarkers();
    if (fitToContent) fitContent();
    const m = map.current;
    if (cluster && m) {
      const h = () => renderMarkers();
      m.on('zoomend moveend', h);
      return () => { m.off('zoomend moveend', h); };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, renderMarkers, cluster]);

  /* zones (filled polygons) */
  React.useEffect(() => {
    if (!ready || !zoneLayer.current) return;
    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      if (cancelled) return;
      zoneLayer.current.clearLayers();
      for (const z of zones) {
        const color = z.color ?? '#0072D6';
        const poly = L.polygon(z.points, {
          color, weight: 1.5, fillColor: color, fillOpacity: z.fillOpacity ?? 0.18,
        }).addTo(zoneLayer.current);
        if (z.label) poly.bindTooltip(z.label, { direction: 'center' });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, zones]);

  /* points of interest — non-clustered teardrop pins in a dedicated layer */
  React.useEffect(() => {
    if (!ready || !poiLayer.current) return;
    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      if (cancelled) return;
      poiLayer.current.clearLayers();
      for (const p of pois) {
        const color = p.color ?? '#7A5AF8';
        const html =
          `<div style="position:relative;width:26px;height:26px">` +
          `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:50% 50% 50% 0;transform:rotate(45deg);background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(16,24,40,.3)"><span style="width:6px;height:6px;border-radius:50%;background:#fff;transform:rotate(-45deg)"></span></span>` +
          `</div>`;
        const icon = L.divIcon({ className: 'fams-map-poi', html, iconSize: [26, 26], iconAnchor: [13, 24] });
        const marker = L.marker(p.position, { icon, zIndexOffset: 150 });
        if (p.label) marker.bindTooltip(p.label, { direction: 'top' });
        marker.addTo(poiLayer.current);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pois]);

  /* heat (soft density blobs — green→amber→red by intensity) */
  React.useEffect(() => {
    if (!ready || !heatLayer.current) return;
    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      if (cancelled) return;
      heatLayer.current.clearLayers();
      for (const h of heat) {
        const t = Math.max(0, Math.min(1, h.intensity ?? 0.6));
        const color = t > 0.66 ? '#F04438' : t > 0.33 ? '#F79009' : '#12B76A';
        L.circle(h.position, {
          radius: heatRadius * (0.55 + t), stroke: false, fillColor: color, fillOpacity: 0.3,
        }).addTo(heatLayer.current);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, heat, heatRadius]);

  /* routes (+ OSRM swap) */
  React.useEffect(() => {
    if (!ready || !routeLayer.current) return;
    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      if (cancelled) return;
      routeLayer.current.clearLayers();
      for (const r of routes) {
        routeGeom.current[r.id] = r.points;
        const line = L.polyline(r.points, {
          color: r.color ?? '#0072D6',
          weight: r.weight ?? 3.5,
          opacity: 0.85,
          dashArray: r.dashed ? '6 7' : undefined,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeLayer.current);
        if (r.osrm) {
          fetchOsrm(r.points).then((geo) => {
            if (!cancelled && geo && routeLayer.current) {
              line.setLatLngs(geo);
              routeGeom.current[r.id] = geo; // animate along real road geometry
            }
          });
        }
      }
      if (fitToContent) fitContent();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, routes]);

  /* live movement — creep animated markers along their route geometry.
     setInterval (not RAF) so movement continues even when the tab is in the
     background, and is consistent regardless of frame rate. */
  React.useEffect(() => {
    if (!ready) return;
    const animated = routes.filter((r) => r.animateMarkerId);
    if (!animated.length) return;
    const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const lerp = (pts: LatLng[], p: number): LatLng => {
      const total = pts.length - 1;
      const f = Math.max(0, Math.min(total, p * total));
      const i = Math.min(Math.floor(f), total - 1);
      const t = f - i;
      const a = pts[i];
      const b = pts[i + 1];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    };
    const tick = () => {
      const nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const elapsed = (nowMs - start) / 1000;
      for (const r of animated) {
        const pts = routeGeom.current[r.id] ?? r.points;
        // loop 40% → 96% → back to 40%
        const p = 0.4 + ((elapsed * 0.02) % 0.56);
        const mk = markerRefs.current[r.animateMarkerId!];
        if (mk && pts.length >= 2) mk.setLatLng(lerp(pts, p));
      }
    };
    const id = setInterval(tick, 80);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, routes]);

  return <div ref={el} className={className} style={{ width: '100%', height: '100%' }} />;
});
