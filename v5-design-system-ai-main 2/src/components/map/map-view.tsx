import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cn } from '../utils/cn';
import { AssetGlyph } from '../../icons';
import { AssetMarker } from './map-marker';
import type {
  LatLng, MapMarker, MapViewHandle, MapViewProps,
} from './types';
import { MARKER_STATUS_COLORS } from './types';

/**
 * MapView — the FAMS DS standard map, on MapLibre GL. A light-grey vector
 * basemap with a subtle camera tilt (3D), standard DS controls (zoom · reset ·
 * fullscreen), and the same prop API as the previous Leaflet map (markers,
 * routes, zones, heat, cluster, pois, fitToContent + a flyTo/fitAll/zoom/project
 * ref) so every consumer keeps working. Coordinates are `[lat,lng]` on the
 * boundary; converted to MapLibre `[lng,lat]` internally.
 */

const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const DEFAULT_PITCH = 40;

const STATUS_COLORS = MARKER_STATUS_COLORS;

/*
 * resolveColor — same defect class as T-015 (a "derive from colour" helper
 * that only handled hex, not DS tokens). Here the consumer is worse: MapLibre
 * paint properties + GeoJSON `properties` are read by the WebGL renderer, not
 * the DOM, so an unresolved `var(--token)` string isn't a CSS value at all —
 * it paints black instead of erroring. Any colour that reaches `paint`/GeoJSON
 * `properties` (zone fill+outline, route line, cluster/marker colours) MUST be
 * resolved to a concrete value first; colours that stay in the DOM (HTML
 * marker `style.background`, list dots) can keep `var(...)` as-is — the browser
 * resolves those natively. Hex/named colours fast-path through unchanged.
 */
const resolvedColorCache = new Map<string, string>();
function resolveColor(c: string | undefined | null, fallback = '#667085'): string {
  if (!c) return fallback;
  if (!c.includes('var(')) return c; // fast path — already a concrete CSS colour
  const cached = resolvedColorCache.get(c);
  if (cached) return cached;
  // var(--token) or var(--token, fallback)
  const m = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/.exec(c);
  let resolved = fallback;
  if (m) {
    const [, name, varFallback] = m;
    const fromDom = typeof document !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      : '';
    resolved = fromDom || (varFallback ? varFallback.trim() : fallback);
  }
  resolvedColorCache.set(c, resolved);
  return resolved;
}

const ll = (p: LatLng): [number, number] => [p[1], p[0]];
/** Closed GeoJSON ring ([lng,lat]) — repeats the first point so the outline joins fully. */
function ring(points: LatLng[]): [number, number][] {
  const r = points.map(ll);
  if (r.length && (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1])) r.push(r[0]);
  return r;
}

/* one-time pulse keyframes for live markers */
function ensurePulse() {
  if (typeof document === 'undefined' || document.getElementById('fams-mapview-pulse')) return;
  const s = document.createElement('style');
  s.id = 'fams-mapview-pulse';
  s.textContent = `@keyframes fams-mv-pulse{0%{transform:scale(.6);opacity:.6}70%{transform:scale(1.8);opacity:0}100%{opacity:0}}`;
  document.head.appendChild(s);
}

/* build the HTML element for a marker (DS-styled, engine-agnostic) */
function markerEl(m: MapMarker): { el: HTMLElement; anchor: maplibregl.PositionAnchor } {
  const color = STATUS_COLORS[m.status ?? 'default'];
  const wrap = document.createElement('div');
  wrap.style.cursor = 'pointer';

  if (m.iconUrl) {
    const [w, h] = m.iconSize ?? [34, 40];
    wrap.innerHTML = `<div style="position:relative"><img src="${m.iconUrl}" alt="" width="${w}" height="${h}" style="display:block"/>${
      m.badge != null ? `<span style="position:absolute;top:-6px;right:-6px;min-width:16px;height:16px;padding:0 4px;border-radius:9px;background:var(--primary);color:#fff;font:700 10px/16px system-ui;text-align:center">${m.badge}</span>` : ''
    }</div>`;
    return { el: wrap, anchor: 'bottom' };
  }

  if (m.kind === 'dot' || !m.kind) {
    wrap.innerHTML = `<span style="display:block;width:12px;height:12px;border-radius:50%;background:${color};box-shadow:0 0 0 2px #fff,0 1px 3px rgba(16,24,40,.3)"></span>`;
    if (m.selected) wrap.firstElementChild!.setAttribute('style', wrap.firstElementChild!.getAttribute('style') + `;outline:3px solid ${color}55;outline-offset:2px`);
    return { el: wrap, anchor: 'center' };
  }

  const labelPill = m.label
    ? `<div style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:4px;display:flex;align-items:center;gap:4px;white-space:nowrap;background:#fff;border:1px solid #eaecf0;border-radius:6px;padding:2px 6px;font:600 11px/1 system-ui;color:#101828;box-shadow:0 1px 3px rgba(16,24,40,.2)">${m.label}${m.statusLabel ? `<span style="color:#667085;font-weight:500">· ${m.statusLabel}</span>` : ''}</div>`
    : '';

  // asset → the rich DS AssetMarker (state-coloured teardrop + dynamic inner glyph)
  if (m.kind === 'asset') {
    const pin = renderToStaticMarkup(
      <AssetMarker state={m.assetState ?? 'non-reporting'} active={m.assetActive ?? m.selected} size={34}>
        {m.assetType ? <AssetGlyph name={m.assetType} variant="map" size={20} /> : null}
      </AssetMarker>,
    );
    wrap.innerHTML = `<div style="position:relative">${labelPill}${pin}</div>`;
    return { el: wrap, anchor: 'bottom' };
  }

  // vehicle / plant / site → a teardrop pin with a glyph, optional label pill + live pulse + heading tick
  const pulse = m.live ? `<span style="position:absolute;left:50%;top:14px;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:${color};animation:fams-mv-pulse 1.6s ease-out infinite"></span>` : '';
  const tick = m.heading != null ? `<span style="position:absolute;left:50%;top:-3px;width:0;height:0;margin-left:-4px;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:7px solid ${color};transform-origin:50% 20px;transform:rotate(${m.heading}deg)"></span>` : '';
  const halo = m.selected ? `box-shadow:0 0 0 4px ${color}44,0 2px 6px rgba(16,24,40,.35);` : 'box-shadow:0 2px 6px rgba(16,24,40,.3);';
  const label = m.label
    ? `<div style="position:absolute;bottom:36px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:4px;white-space:nowrap;background:#fff;border:1px solid #eaecf0;border-radius:6px;padding:2px 6px;font:600 11px/1 system-ui;color:#101828;box-shadow:0 1px 3px rgba(16,24,40,.2)">${m.label}${m.statusLabel ? `<span style="color:#667085;font-weight:500">· ${m.statusLabel}</span>` : ''}</div>`
    : '';
  wrap.innerHTML = `<div style="position:relative;width:28px;height:34px">${pulse}${label}
    <div style="position:absolute;left:0;top:0;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};${halo}display:grid;place-items:center">
      <span style="transform:rotate(45deg);width:9px;height:9px;border-radius:50%;background:#fff"></span>
    </div>${tick}</div>`;
  return { el: wrap, anchor: 'bottom' };
}

export const MapView = React.forwardRef<MapViewHandle, MapViewProps>(function MapView(
  {
    center, zoom = 12, markers = [], routes = [], zones = [], heat = [], cluster = false,
    pois = [], onMarkerClick, onViewportChange, fitToContent, draw,
    styleUrl = LIGHT_STYLE, pitch = DEFAULT_PITCH, controls, zoomControl, className,
  },
  ref,
) {
  const holder = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<maplibregl.Map | null>(null);
  const markerObjs = React.useRef<maplibregl.Marker[]>([]);
  const rafRef = React.useRef<number | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const showControls = controls ?? zoomControl ?? true;

  const allPoints = React.useCallback((): LatLng[] => [
    ...markers.map((m) => m.position), ...pois.map((p) => p.position),
    ...routes.flatMap((r) => r.points), ...zones.flatMap((z) => z.points),
  ], [markers, pois, routes, zones]);

  /* create the map once */
  React.useEffect(() => {
    if (!holder.current || map.current) return;
    ensurePulse();
    const m = new maplibregl.Map({
      container: holder.current,
      style: styleUrl,
      center: ll(center),
      zoom,
      pitch,
      // demo-only: tile attribution hidden per client; RESTORE before any
      // public deployment (license requirement) — CARTO/OpenStreetMap tile
      // usage requires visible attribution outside a private demo context.
      attributionControl: false,
      dragRotate: true,
    });
    map.current = m;
    m.on('load', () => setLoaded(true));
    if (onViewportChange) m.on('move', onViewportChange);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Keep camera in sync when center/zoom PROPS actually change post-mount.
   * Deliberately does NOT depend on `loaded` — the map is already constructed
   * at `center`/`zoom` (see below), so re-running this on the async
   * load→ready transition served no purpose except a real race: if a consumer
   * calls the imperative `flyTo`/`fitTo` (e.g. a row click) while the style is
   * still loading, the delayed 'load' event flips `loaded` moments later and
   * this effect used to re-fire and snap the camera BACK to the original
   * center/zoom, clobbering the user's selection. Skip the mount-time run
   * (already positioned by the constructor) and only react to genuine
   * subsequent prop changes. */
  const skippedInitialSync = React.useRef(false);
  React.useEffect(() => {
    if (!skippedInitialSync.current) { skippedInitialSync.current = true; return; }
    if (map.current) map.current.easeTo({ center: ll(center), zoom, duration: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], zoom]);

  /* Has a consumer already moved the camera imperatively (flyTo/fitAll/fitTo)?
   * Guards the one-time "fit to content on load" below from clobbering it —
   * same load-transition race as above, just for `fitToContent`. */
  const userMoved = React.useRef(false);

  /* imperative handle */
  React.useImperativeHandle(ref, (): MapViewHandle => ({
    flyTo: (p, z) => { userMoved.current = true; map.current?.flyTo({ center: ll(p), zoom: z ?? map.current.getZoom(), pitch }); },
    fitAll: () => { userMoved.current = true; fitBounds(); },
    fitTo: (pts, opts) => { userMoved.current = true; fitToPoints(pts, opts); },
    zoomIn: () => map.current?.zoomIn(),
    zoomOut: () => map.current?.zoomOut(),
    project: (p) => { const pt = map.current?.project(ll(p)); return pt ? { x: pt.x, y: pt.y } : null; },
  }));

  const fitBounds = React.useCallback(() => {
    const pts = allPoints();
    if (!map.current || pts.length === 0) return;
    const b = new maplibregl.LngLatBounds();
    pts.forEach((p) => b.extend(ll(p)));
    map.current.fitBounds(b, { padding: 60, maxZoom: 16, pitch, duration: 0 });
  }, [allPoints, pitch]);

  /** Fit the camera to an arbitrary set of points (e.g. a single zone's
   *  polygon) — used to "fly to and fit" a clicked row, distinct from
   *  `fitAll` (fits the whole dataset). Single point → flyTo at maxZoom. */
  const fitToPoints = React.useCallback((pts: LatLng[], opts?: { padding?: number; maxZoom?: number }) => {
    if (!map.current || pts.length === 0) return;
    if (pts.length === 1) { map.current.flyTo({ center: ll(pts[0]), zoom: opts?.maxZoom ?? 15, pitch }); return; }
    const b = new maplibregl.LngLatBounds();
    pts.forEach((p) => b.extend(ll(p)));
    map.current.fitBounds(b, { padding: opts?.padding ?? 60, maxZoom: opts?.maxZoom ?? 16, pitch, duration: 500 });
  }, [pitch]);

  /* interactive drawing (polygon · rectangle · circle) */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    const clr = resolveColor(draw?.color ?? 'var(--primary)', '#0072D6');

    const ensureDrawLayers = () => {
      if (m.getSource('mv-draw')) return;
      m.addSource('mv-draw', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('mv-draw-v', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'mv-draw-fill', type: 'fill', source: 'mv-draw', filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': clr, 'fill-opacity': 0.15 } });
      m.addLayer({ id: 'mv-draw-line', type: 'line', source: 'mv-draw', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': clr, 'line-width': 2.5 } });
      m.addLayer({ id: 'mv-draw-v', type: 'circle', source: 'mv-draw-v', paint: { 'circle-radius': 4, 'circle-color': '#fff', 'circle-stroke-color': clr, 'circle-stroke-width': 2 } });
    };
    const clearPreview = () => {
      (m.getSource('mv-draw') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [] });
      (m.getSource('mv-draw-v') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [] });
    };

    if (!draw?.mode) { m.getCanvas().style.cursor = ''; clearPreview(); return; }
    ensureDrawLayers();
    m.getCanvas().style.cursor = 'crosshair';
    m.doubleClickZoom.disable();

    let pts: LatLng[] = [];
    const toLL = (e: maplibregl.MapMouseEvent): LatLng => [e.lngLat.lat, e.lngLat.lng];
    const rectCorners = (a: LatLng, b: LatLng): LatLng[] => [[a[0], a[1]], [a[0], b[1]], [b[0], b[1]], [b[0], a[1]]];
    const circlePoly = (c: LatLng, edge: LatLng): LatLng[] => {
      const rLat = edge[0] - c[0], rLng = edge[1] - c[1];
      const r = Math.hypot(rLat, rLng);
      return Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * Math.PI * 2; return [c[0] + r * Math.sin(a), c[1] + r * Math.cos(a)] as LatLng; });
    };
    const render = (poly: LatLng[], closed: boolean, verts: LatLng[]) => {
      const src = m.getSource('mv-draw') as maplibregl.GeoJSONSource;
      src?.setData(closed && poly.length >= 3
        ? { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring(poly)] } }
        : { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: poly.map(ll) } });
      (m.getSource('mv-draw-v') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: verts.map((v) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: ll(v) } })) });
    };

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const p = toLL(e);
      if (draw.mode === 'polygon') {
        // close if clicking near the first vertex
        if (pts.length >= 3) { const f = m.project(ll(pts[0])); if (Math.hypot(f.x - e.point.x, f.y - e.point.y) < 12) { finish(pts); return; } }
        pts = [...pts, p]; draw.onChange?.(pts); render(pts, pts.length >= 3, pts);
      } else if (draw.mode === 'rectangle') {
        if (pts.length === 0) { pts = [p]; }
        else { finish(rectCorners(pts[0], p)); }
      } else if (draw.mode === 'circle') {
        if (pts.length === 0) { pts = [p]; }
        else { finish(circlePoly(pts[0], p)); }
      } else if (draw.mode === 'point') {
        // Single-click placement (POI create flow) — completes immediately,
        // no multi-vertex preview needed.
        finish([p]);
      }
    };
    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (!pts.length) return;
      const cur = toLL(e);
      if (draw.mode === 'polygon') render([...pts, cur], pts.length >= 2, pts);
      else if (draw.mode === 'rectangle') { const c = rectCorners(pts[0], cur); render(c, true, [pts[0], cur]); }
      else if (draw.mode === 'circle') render(circlePoly(pts[0], cur), true, [pts[0]]);
    };
    const onDbl = (e: maplibregl.MapMouseEvent) => { e.preventDefault(); if (draw.mode === 'polygon' && pts.length >= 3) finish(pts); };
    const finish = (poly: LatLng[]) => { pts = []; clearPreview(); draw.onComplete(poly); };

    m.on('click', onClick); m.on('mousemove', onMove); m.on('dblclick', onDbl);
    return () => {
      m.off('click', onClick); m.off('mousemove', onMove); m.off('dblclick', onDbl);
      m.getCanvas().style.cursor = ''; m.doubleClickZoom.enable(); clearPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, draw?.mode, draw?.color]);

  /* GeoJSON layers (routes · zones · heat · GL clusters) — (re)synced on data change */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;

    const setGeoJSON = (id: string, data: GeoJSON.FeatureCollection, addLayers: () => void) => {
      const src = m.getSource(id) as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(data); else { m.addSource(id, { type: 'geojson', data, ...(id === 'mv-cluster' ? { cluster: true, clusterRadius: 46, clusterMaxZoom: 15 } : {}) } as any); addLayers(); }
    };

    // zones — colour DATA reaches GeoJSON `properties` read by the GL paint
    // expression below, so it MUST be resolved (see `resolveColor` above).
    setGeoJSON('mv-zones', {
      type: 'FeatureCollection',
      features: zones.map((z) => ({ type: 'Feature', properties: { color: resolveColor(z.color, '#12B76A'), fo: z.fillOpacity ?? 0.12, label: z.label ?? '' }, geometry: { type: 'Polygon', coordinates: [ring(z.points)] } })),
    }, () => {
      m.addLayer({ id: 'mv-zones-fill', type: 'fill', source: 'mv-zones', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'fo'] } });
      m.addLayer({ id: 'mv-zones-line', type: 'line', source: 'mv-zones', paint: { 'line-color': ['get', 'color'], 'line-width': 2 } });
      // Zone-name hover tooltip (T-039 #6 / T-040 #f) — bound once, here, at
      // layer-creation time (this callback only fires the first time the
      // source/layers are added, so the listeners are never double-bound on
      // later data refreshes via `setGeoJSON`'s `src.setData` branch above).
      const tip = document.createElement('div');
      tip.style.cssText = 'font:600 12px system-ui;color:#101828;padding:2px 4px;white-space:nowrap';
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
      m.on('mousemove', 'mv-zones-fill', (e) => {
        m.getCanvas().style.cursor = 'pointer';
        const label = (e.features?.[0]?.properties as any)?.label;
        if (!label) { popup.remove(); return; }
        tip.textContent = label;
        popup.setLngLat(e.lngLat).setDOMContent(tip).addTo(m);
      });
      m.on('mouseleave', 'mv-zones-fill', () => { m.getCanvas().style.cursor = ''; popup.remove(); });
    });

    // routes — same rule: resolve before it becomes a GeoJSON property.
    setGeoJSON('mv-routes', {
      type: 'FeatureCollection',
      features: routes.map((r) => ({ type: 'Feature', properties: { color: resolveColor(r.color, '#7A5AF8'), weight: r.weight ?? 4, dashed: r.dashed ? 1 : 0 }, geometry: { type: 'LineString', coordinates: r.points.map(ll) } })),
    }, () => {
      m.addLayer({ id: 'mv-routes-line', type: 'line', source: 'mv-routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'weight'] } });
    });

    // heat
    setGeoJSON('mv-heat', {
      type: 'FeatureCollection',
      features: heat.map((h) => ({ type: 'Feature', properties: { i: h.intensity ?? 0.6 }, geometry: { type: 'Point', coordinates: ll(h.position) } })),
    }, () => {
      m.addLayer({ id: 'mv-heat-layer', type: 'heatmap', source: 'mv-heat', paint: { 'heatmap-weight': ['get', 'i'], 'heatmap-radius': 34, 'heatmap-opacity': 0.7 } });
    });

    // GL clusters (only when cluster mode) — cluster circles + counts + unclustered
    // dots + a NATIVE (GPU symbol) name label for unclustered points. This is
    // the "visualise like vehicles, not dots" fix (T-039 #2) done the
    // scale-safe way: thousands of entities stay GL-rendered even once
    // individually visible (past the cluster radius) — a per-marker HTML/DOM
    // label (the `!cluster` markerEl path below) does not scale to a
    // multi-thousand roster.
    if (cluster) {
      setGeoJSON('mv-cluster', {
        type: 'FeatureCollection',
        features: markers.map((mk) => ({ type: 'Feature', properties: { color: STATUS_COLORS[mk.status ?? 'default'], id: mk.id, label: mk.label ?? '' }, geometry: { type: 'Point', coordinates: ll(mk.position) } })),
      }, () => {
        m.addLayer({ id: 'mv-cluster-circle', type: 'circle', source: 'mv-cluster', filter: ['has', 'point_count'], paint: { 'circle-color': '#0072D6', 'circle-radius': ['step', ['get', 'point_count'], 16, 20, 20, 100, 26], 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff' } });
        m.addLayer({ id: 'mv-cluster-count', type: 'symbol', source: 'mv-cluster', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12, 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'] }, paint: { 'text-color': '#ffffff' } });
        m.addLayer({ id: 'mv-cluster-dot', type: 'circle', source: 'mv-cluster', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': ['get', 'color'], 'circle-radius': 6, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
        m.addLayer({
          id: 'mv-cluster-label',
          type: 'symbol',
          source: 'mv-cluster',
          filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'label'], '']],
          layout: { 'text-field': ['get', 'label'], 'text-size': 11, 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-optional': true },
          paint: { 'text-color': '#101828', 'text-halo-color': '#ffffff', 'text-halo-width': 1.2 },
        });
        m.on('click', 'mv-cluster-circle', (e) => {
          const f = e.features?.[0]; if (!f) return;
          const src = m.getSource('mv-cluster') as maplibregl.GeoJSONSource;
          (src.getClusterExpansionZoom as any)((f.properties as any).cluster_id).then((z: number) => m.easeTo({ center: (f.geometry as any).coordinates, zoom: z }));
        });
        m.on('click', 'mv-cluster-dot', (e) => { const id = (e.features?.[0]?.properties as any)?.id; if (id) onMarkerClick?.(id); });
        m.on('click', 'mv-cluster-label', (e) => { const id = (e.features?.[0]?.properties as any)?.id; if (id) onMarkerClick?.(id); });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, JSON.stringify(zones), JSON.stringify(routes), JSON.stringify(heat), cluster, JSON.stringify(markers.map((m) => [m.id, m.position, m.status, m.label]))]);

  /* HTML markers (non-cluster) + pois — rebuilt on change */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    markerObjs.current.forEach((mk) => mk.remove());
    markerObjs.current = [];

    const add = (mm: MapMarker) => {
      const { el, anchor } = markerEl(mm);
      if (mm.tooltip) el.title = mm.tooltip;
      el.addEventListener('click', () => onMarkerClick?.(mm.id));
      const mk = new maplibregl.Marker({ element: el, anchor }).setLngLat(ll(mm.position)).addTo(m);
      markerObjs.current.push(mk);
    };

    if (!cluster) markers.forEach(add);
    pois.forEach((p) => {
      const el = document.createElement('div');
      el.style.cursor = 'pointer';
      let anchor: maplibregl.PositionAnchor = 'center';
      if (p.iconUrl) {
        // Real DS POI teardrop artwork (T-039 #5 / T-040 #i) — same image-marker
        // shape as `markerEl`'s `iconUrl` branch above, sized generously so pins
        // stay legible at typical zoom levels.
        const [w, h] = p.iconSize ?? [30, 36];
        el.innerHTML = `<img src="${p.iconUrl}" alt="" width="${w}" height="${h}" style="display:block"/>`;
        anchor = 'bottom';
      } else {
        el.innerHTML = `<span style="display:block;width:12px;height:12px;border-radius:50%;background:${p.color ?? STATUS_COLORS.default};box-shadow:0 0 0 2px #fff,0 1px 3px rgba(16,24,40,.3)"></span>`;
      }
      if (p.label) el.title = p.label;
      el.addEventListener('click', () => onMarkerClick?.(p.id));
      const mk = new maplibregl.Marker({ element: el, anchor }).setLngLat(ll(p.position)).addTo(m);
      markerObjs.current.push(mk);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, cluster, JSON.stringify(markers), JSON.stringify(pois)]);

  /* animated route markers (creeping along a route) */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const animated = routes.filter((r) => r.animateMarkerId && r.points.length > 1);
    if (!animated.length) return;
    // densify each animated route
    const paths = animated.map((r) => r.points.map(ll));
    const movers = animated.map((r) => {
      const el = document.createElement('div');
      const mm = markers.find((x) => x.id === r.animateMarkerId);
      el.innerHTML = markerEl(mm ?? { id: r.animateMarkerId!, position: r.points[0], kind: 'vehicle', status: 'reporting' }).el.innerHTML;
      return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(paths[0][0] as [number, number]).addTo(m);
    });
    let t = 0;
    const tick = () => {
      t = (t + 0.0025) % 1;
      paths.forEach((path, i) => {
        const seg = t * (path.length - 1);
        const idx = Math.floor(seg); const f = seg - idx;
        const a = path[idx]; const b = path[Math.min(idx + 1, path.length - 1)];
        movers[i].setLngLat([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f] as [number, number]);
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); movers.forEach((mv) => mv.remove()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, JSON.stringify(routes.map((r) => [r.id, r.animateMarkerId, r.points.length]))]);

  /* fit to content on first load — skipped if the consumer already moved the
   * camera imperatively (flyTo/fitAll/fitTo) during the async load window. */
  React.useEffect(() => { if (loaded && fitToContent && !userMoved.current) fitBounds(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, fitToContent]);

  const resetNorth = () => map.current?.easeTo({ bearing: 0, pitch });
  const fullscreen = () => { const c = holder.current?.parentElement; if (c) (document.fullscreenElement ? document.exitFullscreen() : c.requestFullscreen?.()); };

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <div ref={holder} className="h-full w-full" />
      {/* Loading overlay — the MapLibre canvas paints blank grey for ~1-3s
       *  while the style/basemap tiles fetch (every consumer: Live
       *  Monitoring, Zones, POIs, attendance journey — T-065 finding 4).
       *  Stays mounted through the fade-out (opacity + pointer-events, not
       *  `loaded && null`) so there's no interaction dead-zone the instant
       *  `loaded` flips true, and sits BELOW the zoom/reset controls
       *  (z-300 vs their z-400) so they stay usable while tiles settle. */}
      <div
        aria-hidden={loaded}
        className={cn(
          'absolute inset-0 z-[300] flex flex-col items-center justify-center gap-2 bg-muted/70 backdrop-blur-[1px] transition-opacity duration-300',
          loaded ? 'pointer-events-none opacity-0' : 'opacity-100',
        )}
      >
        <svg className="animate-spin text-muted-foreground" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span className="text-body-xs font-medium text-muted-foreground">Loading map…</span>
      </div>
      {showControls && (
        <div className="absolute bottom-4 right-4 z-[400] flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <CtrlBtn label="Zoom in" onClick={() => map.current?.zoomIn()}><PlusIcon /></CtrlBtn>
          <span className="h-px bg-border" />
          <CtrlBtn label="Zoom out" onClick={() => map.current?.zoomOut()}><MinusIcon /></CtrlBtn>
          <span className="h-px bg-border" />
          <CtrlBtn label="Reset view" onClick={resetNorth}><CompassIcon /></CtrlBtn>
          <span className="h-px bg-border" />
          <CtrlBtn label="Fullscreen" onClick={fullscreen}><ExpandIcon /></CtrlBtn>
        </div>
      )}
    </div>
  );
});

function CtrlBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-9 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      {children}
    </button>
  );
}
const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
const MinusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14" /></svg>;
const CompassIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></svg>;
const ExpandIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>;
