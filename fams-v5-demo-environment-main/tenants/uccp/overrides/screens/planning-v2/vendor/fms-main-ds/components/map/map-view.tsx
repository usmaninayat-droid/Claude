import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cn } from '../utils/cn';
import { AssetGlyph } from '../../icons';
import { AssetMarker } from './map-marker';
import vehiclePinUrl from './poi-pins/vehicle.svg';
import type {
  LatLng, MapMarker, MapViewHandle, MapViewProps, MarkerStatus,
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
/** Ceiling for the auto-fit — a tiny extent (one pin, a single geofence) must
 *  not zoom to street level and lose all context. */
const MAX_FIT_ZOOM = 16;

const STATUS_COLORS = MARKER_STATUS_COLORS;

/* Per-status member counts aggregated INTO each GL cluster (c_reporting,
 * c_stopped, …) — feeds the Figma 275-96858 donut ring segments. */
const CLUSTER_STATUS_SUMS = Object.fromEntries(
  (Object.keys(MARKER_STATUS_COLORS) as MarkerStatus[]).map((s) => [`c_${s}`, ['+', ['case', ['==', ['get', 'status'], s], 1, 0]]]),
);

/** Cluster bubble (Figma 275-96858): 40px donut whose ring segments are the
 *  cluster's status breakdown (conic-gradient over the marker data colours),
 *  with a 30px dark core carrying the white bold member count. */
function clusterDonutEl(p: Record<string, unknown>): HTMLElement {
  const total = Number(p.point_count ?? 0);
  const parts = (Object.keys(MARKER_STATUS_COLORS) as MarkerStatus[])
    .map((s) => ({ color: MARKER_STATUS_COLORS[s], n: Number(p[`c_${s}`] ?? 0) }))
    .filter((x) => x.n > 0);
  let acc = 0;
  const stops = parts
    .map((x) => { const from = (acc / total) * 360; acc += x.n; const to = (acc / total) * 360; return `${x.color} ${from}deg ${to}deg`; })
    .join(', ');
  const el = document.createElement('div');
  el.style.cursor = 'pointer';
  el.innerHTML =
    `<div style="width:40px;height:40px;border-radius:50%;background:conic-gradient(${stops || `${STATUS_COLORS.default} 0deg 360deg`});display:grid;place-items:center;box-shadow:0 2px 6px rgba(16,24,40,.25)">` +
    `<span style="width:30px;height:30px;border-radius:50%;background:#101828;color:#fff;display:grid;place-items:center;font:700 12px/1 'Gilroy',system-ui,sans-serif">${total}</span>` +
    `</div>`;
  return el;
}

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
  /* NOTE: opacity is applied to the INNER content div (below), never to
   * `wrap` itself — MapLibre's own Marker lifecycle manages `wrap.style`
   * (position/transform, and an internal occlusion-opacity check) and
   * will silently clobber an opacity set directly on the root element on
   * its next update tick. */
  const innerOpacity = m.opacity != null ? `opacity:${m.opacity};` : '';

  if (m.iconUrl) {
    const [w, h] = m.iconSize ?? [34, 40];
    wrap.innerHTML = `<div style="position:relative;${innerOpacity}"><img src="${m.iconUrl}" alt="" width="${w}" height="${h}" style="display:block"/>${
      m.badge != null ? `<span style="position:absolute;top:-6px;right:-6px;min-width:16px;height:16px;padding:0 4px;border-radius:9px;background:var(--primary);color:#fff;font:700 10px/16px system-ui;text-align:center">${m.badge}</span>` : ''
    }</div>`;
    return { el: wrap, anchor: 'bottom' };
  }

  if (m.kind === 'dot' || !m.kind) {
    wrap.innerHTML = `<span style="display:block;width:12px;height:12px;border-radius:50%;background:${color};box-shadow:0 0 0 2px #fff,0 1px 3px rgba(16,24,40,.3);${innerOpacity}"></span>`;
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

  // vehicle → DS "Map icon for tanker" (green circle badge + tanker glyph on
  // a stem with a check-star badge; fams-design-system/assets/icons/POI
  // Icons/Map icon for tanker.svg). Anchored at the bottom of the stem so
  // the pin's tip sits on the GPS point. Keeps the label pill (above) + a
  // live pulse behind the badge when driving.
  if (m.kind === 'vehicle') {
    const [w, h] = m.iconSize ?? [40, 58];
    // circle-badge centre relative to the SVG's 50×73 viewBox is at
    // (25, 26.5); scale it into the rendered box so the pulse sits behind
    // the tanker glyph rather than under the stem.
    const badgeCy = Math.round(h * (26.5 / 73));
    const pulseV = m.live ? `<span style="position:absolute;left:50%;top:${badgeCy}px;transform:translate(-50%,-50%);width:${Math.round(h * 0.55)}px;height:${Math.round(h * 0.55)}px;border-radius:50%;background:${color};animation:fams-mv-pulse 1.6s ease-out infinite;pointer-events:none"></span>` : '';
    const labelV = m.label
      ? `<div style="position:absolute;bottom:${h + 4}px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:4px;white-space:nowrap;background:#fff;border:1px solid #eaecf0;border-radius:6px;padding:2px 6px;font:600 11px/1 system-ui;color:#101828;box-shadow:0 1px 3px rgba(16,24,40,.2)">${m.label}${m.statusLabel ? `<span style="color:#667085;font-weight:500">· ${m.statusLabel}</span>` : ''}</div>`
      : '';
    wrap.innerHTML = `<div style="position:relative;width:${w}px;height:${h}px;${innerOpacity}">${pulseV}${labelV}<img src="${m.iconUrl ?? vehiclePinUrl}" alt="" width="${w}" height="${h}" style="display:block;position:relative;z-index:1"/></div>`;
    return { el: wrap, anchor: 'bottom' };
  }

  // plant / site → a teardrop pin with a glyph, optional label pill + live pulse + heading tick
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
    center, zoom = 12, markers = [], routes = [], zones = [], circles = [], heat = [], cluster = false,
    pois = [], onMarkerClick, onViewportChange, fitToContent, fitPadding = 60, draw,
    styleUrl = LIGHT_STYLE, pitch = DEFAULT_PITCH, controls, zoomControl, controlsPosition = 'bottom-right', onReady, className,
    rasterOverlays = [], showReset = true, showLocate = false,
  },
  ref,
) {
  const onReadyRef = React.useRef(onReady);
  onReadyRef.current = onReady;
  const holder = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<maplibregl.Map | null>(null);
  const markerObjs = React.useRef<maplibregl.Marker[]>([]);
  const rafRef = React.useRef<number | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const showControls = controls ?? zoomControl ?? true;

  /* Has a consumer already moved the camera imperatively (flyTo/fitAll/fitTo)?
   * Guards the auto-fit below from clobbering it. */
  const userMoved = React.useRef(false);
  /** Latest auto-fit callback, for the mount-once ResizeObserver below. Null
   *  unless `fitToContent` is on and the camera is still ours to move.
   *  DECLARED HERE, above the map-construction effect that closes over it: the
   *  ResizeObserver callback can fire on the very first observe (browsers
   *  deliver an initial box) and reading a `const` declared further down would
   *  be a TDZ `refitRef is not defined` — the transient error seen on 09-04. */
  const refitRef = React.useRef<(() => void) | null>(null);

  /* Every coordinate the camera should be able to see. Geofence rings
     contribute their bounding box (not just the center) so a large geozone
     can't hang off the edge of a "fit to content" frame. */
  const allPoints = React.useCallback((): LatLng[] => {
    const pts: LatLng[] = [
      ...markers.map((m) => m.position), ...pois.map((p) => p.position),
      ...routes.flatMap((r) => r.points), ...zones.flatMap((z) => z.points),
    ];
    for (const c of circles) {
      const dLat = c.radius / 111_320;
      const dLng = dLat / Math.max(0.2, Math.cos((c.center[0] * Math.PI) / 180));
      pts.push([c.center[0] - dLat, c.center[1] - dLng], [c.center[0] + dLat, c.center[1] + dLng]);
    }
    return pts.filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  }, [markers, pois, routes, zones, circles]);

  /* Geometry fingerprint for the auto-fit below. Consumers build these arrays
     as inline literals, so a new array arrives on EVERY parent render (route
     replay ticks, layer toggles); identity can't gate the re-fit, but a
     coarse (~1 m) rounded signature of the actual coordinates can. */
  const fitKey = React.useMemo(
    () => (fitToContent ? allPoints().map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join('|') : ''),
    [fitToContent, allPoints],
  );

  /* create the map once */
  React.useEffect(() => {
    if (!holder.current || map.current) return;
    ensurePulse();
    const m = new maplibregl.Map({
      container: holder.current,
      style: styleUrl as any,
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
    m.on('load', () => { setLoaded(true); try { onReadyRef.current?.(m); } catch { /* product tweak must never break the map */ } });
    // Belt-and-braces: `load` fires once when the style + first tiles resolve, but
    // in strict-mode double-mount it can be lost on the first (torn-down) instance
    // and never re-fired on the second one if the style is already cached. `idle`
    // is emitted whenever the map settles (frame drained, tiles + sprites in),
    // so it reliably fires post-mount on the surviving instance too.
    m.on('idle', () => setLoaded(true));
    // Belt-and-braces #2: on some mobile devices/layout races neither `load`
    // nor `idle` ever fires (e.g. a 0-sized container at construction that
    // later resizes) and the loading overlay would linger forever, blocking
    // taps underneath. Force-dismiss after a max 4s regardless.
    const forceLoadedTimer = window.setTimeout(() => setLoaded(true), 4000);
    m.once('load', () => window.clearTimeout(forceLoadedTimer));
    if (onViewportChange) m.on('move', onViewportChange);
    // Belt-and-braces: MapLibre only measures its container ONCE, at
    // construction. If a consumer mounts this inside a layout that hasn't
    // settled its size yet (e.g. a flex/absolute wrapper still resolving on
    // the same tick, a sheet/drawer animating open, a sidebar collapsing) the
    // canvas can end up sized against a stale/zero rect and render blank
    // until something calls `.resize()`. Watch the actual container box and
    // resize whenever it changes so every consumer gets this for free.
    // A resize keeps center+zoom, so a narrower container silently crops
    // content that used to fit — re-fit an auto-fitted map after the resize.
    const ro = new ResizeObserver(() => { map.current?.resize(); refitRef.current?.(); });
    ro.observe(holder.current);
    return () => { window.clearTimeout(forceLoadedTimer); if (rafRef.current) cancelAnimationFrame(rafRef.current); ro.disconnect(); m.remove(); map.current = null; };
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

  /* imperative handle */
  React.useImperativeHandle(ref, (): MapViewHandle => ({
    flyTo: (p, z) => { userMoved.current = true; map.current?.flyTo({ center: ll(p), zoom: z ?? map.current.getZoom(), pitch }); },
    fitAll: () => { userMoved.current = true; fitBounds(); },
    fitTo: (pts, opts) => { userMoved.current = true; fitToPoints(pts, opts); },
    zoomIn: () => map.current?.zoomIn(),
    zoomOut: () => map.current?.zoomOut(),
    project: (p) => { const pt = map.current?.project(ll(p)); return pt ? { x: pt.x, y: pt.y } : null; },
  }));

  /**
   * Fit the camera to `allPoints()` — i.e. ONLY the geometry this map was
   * handed (routes + markers + POIs + zone polygons + geofence bounding
   * boxes), never a dataset-wide extent.
   *
   * 2026-09-04: `cameraForBounds` alone is not enough here. Two things break
   * it in this app:
   *   • PITCH. Solving the bounds *at* a 40° tilt zooms far out (a tilted
   *     frustum must swallow the whole box inside its near edge); solving it
   *     FLAT and then re-applying the tilt gives a tight frame but shifts what
   *     is actually on screen, because a pitched camera covers far more ground
   *     above the center than below it.
   *   • ASPECT. In a tall, narrow container (the plan detail's map column can
   *     be ~310 × 1250 CSS px) those two effects compound and the whole track
   *     ended up crushed against the bottom edge with empty Doha above it.
   *
   * So: take `cameraForBounds` (flat) as the STARTING guess, apply the real
   * pitch, then close the loop in screen space — project every fitted point,
   * pan so its pixel bbox is centred inside the padded viewport, and scale the
   * zoom by how much the bbox over/under-fills that box. Two or three passes
   * converge; the result is correct for any aspect ratio and any pitch because
   * it is measured, not predicted.
   */
  const fitBounds = React.useCallback(() => {
    const m = map.current;
    const pts = allPoints();
    if (!m || pts.length === 0) return;
    const pad = typeof fitPadding === 'number'
      ? { top: fitPadding, bottom: fitPadding, left: fitPadding, right: fitPadding }
      : { top: 40, bottom: 40, left: 40, right: 40, ...fitPadding };
    const { width, height } = m.getCanvas().getBoundingClientRect();
    // A box that leaves at least a third of each axis for content, so absurd
    // padding on a small container can't invert the target rect.
    const padX = Math.min(pad.left + pad.right, width * 0.66) / (pad.left + pad.right || 1);
    const padY = Math.min(pad.top + pad.bottom, height * 0.66) / (pad.top + pad.bottom || 1);
    const box = {
      left: pad.left * padX, right: width - pad.right * padX,
      top: pad.top * padY, bottom: height - pad.bottom * padY,
    };
    const availW = box.right - box.left;
    const availH = box.bottom - box.top;
    if (availW <= 8 || availH <= 8) return;

    const b = new maplibregl.LngLatBounds();
    pts.forEach((p) => b.extend(ll(p)));
    const cam = m.cameraForBounds(b, { padding: pad, maxZoom: MAX_FIT_ZOOM, bearing: 0, pitch: 0 });
    m.jumpTo({
      center: cam?.center ?? b.getCenter(),
      zoom: Math.min(cam?.zoom ?? MAX_FIT_ZOOM, MAX_FIT_ZOOM),
      bearing: 0,
      pitch,
    });

    for (let pass = 0; pass < 4; pass++) {
      let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
      for (const p of pts) {
        const q = m.project(ll(p));
        if (!Number.isFinite(q.x) || !Number.isFinite(q.y)) continue;
        if (q.x < minX) minX = q.x;
        if (q.y < minY) minY = q.y;
        if (q.x > maxX) maxX = q.x;
        if (q.y > maxY) maxY = q.y;
      }
      if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;
      // Centre the content's pixel bbox inside the padded box.
      const dx = (minX + maxX) / 2 - (box.left + box.right) / 2;
      const dy = (minY + maxY) / 2 - (box.top + box.bottom) / 2;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) m.panBy([dx, dy], { duration: 0 });
      // …then scale it to fill that box (zoom about the now-centred content).
      const w = Math.max(maxX - minX, 1e-3);
      const h = Math.max(maxY - minY, 1e-3);
      const scale = Math.min(availW / w, availH / h);
      if (!Number.isFinite(scale) || scale <= 0) break;
      if (scale > 0.995 && scale < 1.02) break; // already fits, snugly
      const next = Math.max(1, Math.min(MAX_FIT_ZOOM, m.getZoom() + Math.log2(scale)));
      if (Math.abs(next - m.getZoom()) < 0.01) break;
      m.setZoom(next);
    }
    // One last centring pass — the final setZoom above can nudge the bbox.
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    for (const p of pts) {
      const q = m.project(ll(p));
      if (!Number.isFinite(q.x) || !Number.isFinite(q.y)) continue;
      if (q.x < minX) minX = q.x;
      if (q.y < minY) minY = q.y;
      if (q.x > maxX) maxX = q.x;
      if (q.y > maxY) maxY = q.y;
    }
    if (Number.isFinite(minX)) {
      const dx = (minX + maxX) / 2 - (box.left + box.right) / 2;
      const dy = (minY + maxY) / 2 - (box.top + box.bottom) / 2;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) m.panBy([dx, dy], { duration: 0 });
    }
  }, [allPoints, fitPadding, pitch]);

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
      // On UNMOUNT the init effect's cleanup has already run `map.remove()`
      // (React tears effects down in declaration order), so canvas/style
      // access here would throw "reading 'getSource' of undefined". Bail
      // when the map is already gone — nothing left to reset anyway.
      if ((m as unknown as { _removed?: boolean })._removed) return;
      m.getCanvas().style.cursor = ''; m.doubleClickZoom.enable(); clearPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, draw?.mode, draw?.color]);

  /* Swap the basemap style live when `styleUrl` changes post-mount (the Map
   * Layers base-map picker). DOM markers survive `setStyle`, but GeoJSON
   * sources/layers are wiped with the old style — bump `styleEpoch` once the
   * new style settles so the sync effect below re-adds them. */
  const [styleEpoch, setStyleEpoch] = React.useState(0);
  const styleRef = React.useRef(styleUrl);
  React.useEffect(() => {
    const m = map.current;
    if (!m || styleRef.current === styleUrl) return;
    styleRef.current = styleUrl;
    m.setStyle(styleUrl as any);
    m.once('idle', () => setStyleEpoch((e) => e + 1));
  }, [styleUrl]);

  /* Raster tile overlays (e.g. rain radar) — synced on change, and re-added
   * after a basemap swap (styleEpoch) since setStyle wipes them. */
  const rasterOverlayIds = React.useRef<string[]>([]);
  React.useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    const run = () => {
      for (const id of rasterOverlayIds.current) {
        if (m.getLayer(`mv-ro-${id}`)) m.removeLayer(`mv-ro-${id}`);
        if (m.getSource(`mv-ro-${id}`)) m.removeSource(`mv-ro-${id}`);
      }
      rasterOverlayIds.current = [];
      for (const o of rasterOverlays) {
        // `maxzoom` caps the tile requests — beyond it MapLibre upscales the
        // last supported level instead of fetching tiles the provider would
        // reject (e.g. RainViewer's "zoom not supported" text tiles).
        m.addSource(`mv-ro-${o.id}`, { type: 'raster', tiles: o.tiles, tileSize: 256, ...(o.maxzoom != null ? { maxzoom: o.maxzoom } : {}), ...(o.attribution ? { attribution: o.attribution } : {}) });
        m.addLayer({ id: `mv-ro-${o.id}`, type: 'raster', source: `mv-ro-${o.id}`, paint: { 'raster-opacity': o.opacity ?? 0.7 } });
        rasterOverlayIds.current.push(o.id);
      }
    };
    if (!m.isStyleLoaded()) { m.once('idle', run); return () => { m.off('idle', run); }; }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, styleEpoch, JSON.stringify(rasterOverlays)]);

  /* GeoJSON layers (routes · zones · heat · GL clusters) — (re)synced on data change */
  React.useEffect(() => {
    // Two-step guard: re-binding the narrowed value to a fresh `const` keeps
    // it non-null INSIDE the hoisted `runGeoJsonSync` function declaration
    // below (tsc drops `if (!m) return` narrowing of the original binding
    // inside a hoisted function body — planning-v2 build-gate fix 2026-08-31).
    const m0 = map.current;
    if (!m0 || !loaded) return;
    const m = m0;
    // `loaded` (our own load/idle-derived flag) can flip true a tick before
    // MapLibre's OWN internal style-ready flag does — `addSource`/`addLayer`
    // (below) throw "Style is not done loading" if called in that gap. Guard
    // with the engine's own `isStyleLoaded()` and, if it isn't ready yet,
    // retry once the style settles (`idle`) rather than silently dropping
    // this sync — deps won't naturally re-fire this effect again otherwise.
    if (!m.isStyleLoaded()) { m.once('idle', runGeoJsonSync); return () => { m.off('idle', runGeoJsonSync); }; }
    runGeoJsonSync();

    function runGeoJsonSync() {
    const setGeoJSON = (id: string, data: GeoJSON.FeatureCollection, addLayers: () => void) => {
      const src = m.getSource(id) as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(data); else { m.addSource(id, { type: 'geojson', data, ...(id === 'mv-cluster' ? { cluster: true, clusterRadius: 46, clusterMaxZoom: 15, clusterProperties: CLUSTER_STATUS_SUMS } : {}) } as any); addLayers(); }
    };

    // zones — colour DATA reaches GeoJSON `properties` read by the GL paint
    // expression below, so it MUST be resolved (see `resolveColor` above).
    setGeoJSON('mv-zones', {
      type: 'FeatureCollection',
      features: zones.map((z) => ({ type: 'Feature', properties: { id: z.id, color: resolveColor(z.color, '#12B76A'), fo: z.fillOpacity ?? 0.12, label: z.label ?? '' }, geometry: { type: 'Polygon', coordinates: [ring(z.points)] } })),
    }, () => {
      m.addLayer({ id: 'mv-zones-fill', type: 'fill', source: 'mv-zones', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'fo'] } });
      m.addLayer({ id: 'mv-zones-line', type: 'line', source: 'mv-zones', paint: { 'line-color': ['get', 'color'], 'line-width': 2 } });
      // Zone click → onMarkerClick(zone.id) so a whole zone polygon is a click
      // target (not only its centroid marker). Opt-in: no-op when the zone has
      // no id or no handler is provided; markers keep their own click path.
      m.on('click', 'mv-zones-fill', (e) => {
        const id = (e.features?.[0]?.properties as any)?.id;
        if (id) onMarkerClick?.(id);
      });
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

    // geofence circles (FM-6354's depot/assembly/discharge geozones) — each
    // approximated as a 64-point ring so the same GL fill/line pipeline the
    // zones use renders it; dashed boundary reads as a *fence*, not an area.
    setGeoJSON('mv-circles', {
      type: 'FeatureCollection',
      features: circles.map((c) => {
        const [lat, lng] = c.center;
        const dLat = c.radius / 111320;
        const dLng = c.radius / (111320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
        const ringPts: [number, number][] = Array.from({ length: 65 }, (_, i) => {
          const a = (i / 64) * 2 * Math.PI;
          return [lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)];
        });
        return { type: 'Feature' as const, properties: { id: c.id, color: resolveColor(c.color, '#0072D6'), label: c.label ?? '' }, geometry: { type: 'Polygon' as const, coordinates: [ringPts] } };
      }),
    }, () => {
      m.addLayer({ id: 'mv-circles-fill', type: 'fill', source: 'mv-circles', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.08 } });
      m.addLayer({ id: 'mv-circles-line', type: 'line', source: 'mv-circles', paint: { 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-dasharray': [2, 2] } });
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
      // Markers with a fully-custom `iconUrl` pin join the GL cluster source
      // only when they opt in via `clusterable` (Figma 275-96858: zoomed out
      // they fold into status-donut bubbles; zoomed in the custom pin
      // renders individually — managed by the donut effect below). Non-opted
      // iconUrl pins keep the legacy always-individual behaviour: a bespoke
      // pin graphic is otherwise a deliberate "always show this one
      // distinctly" signal from the consumer.
      const clusterable = markers.filter((mk) => !mk.iconUrl || mk.clusterable);
      setGeoJSON('mv-cluster', {
        type: 'FeatureCollection',
        features: clusterable.map((mk) => ({ type: 'Feature', properties: { color: STATUS_COLORS[mk.status ?? 'default'], id: mk.id, label: mk.label ?? '', status: mk.status ?? 'default', hasIcon: mk.iconUrl ? 1 : 0 }, geometry: { type: 'Point', coordinates: ll(mk.position) } })),
      }, () => {
        // Cluster bubbles render as DOM donut markers (see the donut effect
        // below) — only the unclustered non-icon dots + labels stay GL.
        m.addLayer({ id: 'mv-cluster-dot', type: 'circle', source: 'mv-cluster', filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'hasIcon'], 1]], paint: { 'circle-color': ['get', 'color'], 'circle-radius': 6, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
        m.addLayer({
          id: 'mv-cluster-label',
          type: 'symbol',
          source: 'mv-cluster',
          filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'label'], ''], ['!=', ['get', 'hasIcon'], 1]],
          layout: { 'text-field': ['get', 'label'], 'text-size': 11, 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-optional': true },
          paint: { 'text-color': '#101828', 'text-halo-color': '#ffffff', 'text-halo-width': 1.2 },
        });
        m.on('click', 'mv-cluster-dot', (e) => { const id = (e.features?.[0]?.properties as any)?.id; if (id) onMarkerClick?.(id); });
        m.on('click', 'mv-cluster-label', (e) => { const id = (e.features?.[0]?.properties as any)?.id; if (id) onMarkerClick?.(id); });
      });
    }
    } // end runGeoJsonSync
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, styleEpoch, JSON.stringify(zones), JSON.stringify(circles), JSON.stringify(routes), JSON.stringify(heat), cluster, JSON.stringify(markers.map((m) => [m.id, m.position, m.status, m.label, m.iconUrl]))]);

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

    // Custom `iconUrl` pins render as individual HTML markers here — except
    // `clusterable` ones in cluster mode, whose visibility is zoom-driven
    // (folded into donuts vs. shown individually) by the donut effect below.
    markers.forEach((mm) => { if (!cluster || (mm.iconUrl && !mm.clusterable)) add(mm); });
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

  /* Cluster donuts (Figma 275-96858) + zoom-revealed clusterable pins.
   * MapLibre draws GL layers, not DOM, so the donut bubbles are HTML markers
   * synced from the cluster source on every render: clusters present at the
   * current zoom get a donut; clusterable custom pins get their individual
   * HTML pin ONLY while they are un-clustered (zoomed in past the radius). */
  const donutMarkersRef = React.useRef<Map<number, maplibregl.Marker>>(new Map());
  const clusterPinsRef = React.useRef<Map<string, maplibregl.Marker>>(new Map());
  React.useEffect(() => {
    const m = map.current;
    if (!m || !loaded || !cluster) return;
    const pinDefs = markers.filter((mk) => mk.iconUrl && mk.clusterable);
    const makePin = (mm: MapMarker) => {
      const { el, anchor } = markerEl(mm);
      if (mm.tooltip) el.title = mm.tooltip;
      el.addEventListener('click', () => onMarkerClick?.(mm.id));
      return new maplibregl.Marker({ element: el, anchor }).setLngLat(ll(mm.position));
    };
    const update = () => {
      const src = m.getSource('mv-cluster') as maplibregl.GeoJSONSource | undefined;
      if (!src || !m.isSourceLoaded('mv-cluster')) return;
      const feats = m.querySourceFeatures('mv-cluster');
      const visible = new Set<string>();
      const clusters = new Map<number, (typeof feats)[number]>();
      for (const f of feats) {
        const p = f.properties as Record<string, unknown>;
        if (p.cluster) clusters.set(Number(p.cluster_id), f);
        else if (p.id) visible.add(String(p.id));
      }
      for (const mm of pinDefs) {
        const cur = clusterPinsRef.current.get(mm.id);
        if (visible.has(mm.id) && !cur) clusterPinsRef.current.set(mm.id, makePin(mm).addTo(m));
        else if (!visible.has(mm.id) && cur) { cur.remove(); clusterPinsRef.current.delete(mm.id); }
      }
      for (const [cid, f] of clusters) {
        const coords = (f.geometry as any).coordinates as [number, number];
        let mk = donutMarkersRef.current.get(cid);
        if (!mk) {
          const el = clusterDonutEl(f.properties as Record<string, unknown>);
          el.addEventListener('click', () => {
            // Guard the race where this donut was pruned between render and
            // click (cluster ids are zoom-scoped): ignore failures and only
            // ease to a zoom that actually goes IN.
            (src.getClusterExpansionZoom as any)(cid)
              .then((z: number) => { if (Number.isFinite(z) && z > m.getZoom()) m.easeTo({ center: coords, zoom: z }); })
              .catch(() => { /* stale cluster id — ignore */ });
          });
          mk = new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(m);
          donutMarkersRef.current.set(cid, mk);
        } else mk.setLngLat(coords);
      }
      for (const [cid, mk] of donutMarkersRef.current) if (!clusters.has(cid)) { mk.remove(); donutMarkersRef.current.delete(cid); }
    };
    m.on('render', update);
    update();
    return () => {
      m.off('render', update);
      donutMarkersRef.current.forEach((mk) => mk.remove());
      donutMarkersRef.current.clear();
      clusterPinsRef.current.forEach((mk) => mk.remove());
      clusterPinsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, cluster, styleEpoch, JSON.stringify(markers)]);

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

  /* fit to content on load AND whenever the geometry itself changes (a detail
   * map swapping to another record) — `fitKey` is a coordinate fingerprint, so
   * re-renders that rebuild identical arrays don't move the camera. Skipped if
   * the consumer already moved it imperatively (flyTo/fitAll/fitTo). */
  React.useEffect(() => { if (loaded && fitToContent && fitKey && !userMoved.current) fitBounds(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, fitToContent, fitKey]);

  /* Keep the ResizeObserver's re-fit hook pointed at the current callback. */
  React.useEffect(() => {
    refitRef.current = fitToContent ? () => { if (!userMoved.current) fitBounds(); } : null;
    return () => { refitRef.current = null; };
  }, [fitToContent, fitBounds]);

  // "Reset view" — returns the camera HOME: the initial center + zoom (e.g.
  // the full-country view), plus north-up bearing and the default tilt. Prior
  // behaviour only reset bearing/pitch, which is invisible on a map that's
  // rarely rotated — so the control read as inert. Recentering makes it a
  // genuine "back to the overview" button after panning/zooming into an area.
  const resetNorth = () => map.current?.easeTo({ center: ll(center), zoom, bearing: 0, pitch });
  const fullscreen = () => { const c = holder.current?.parentElement; if (c) (document.fullscreenElement ? document.exitFullscreen() : c.requestFullscreen?.()); };

  return (
    // `isolate` scopes the z-[300] loading overlay + z-[400] zoom controls to
    // this map's own stacking context so they don't leak above sibling floating
    // panels (Live Dispatching's IncidentPanel is z-20 in the parent isolate;
    // without this, a still-loading map buries panel clicks under the overlay).
    <div className={cn('relative h-full w-full overflow-hidden isolate', className)}>
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
        <span className="text-body-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Loading map…</span>
      </div>
      {showControls && (
        <div className={cn(
          'absolute right-4 z-[400] flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm',
          controlsPosition === 'top-right' ? 'top-4' : 'bottom-4',
        )}>
          <CtrlBtn label="Zoom in" onClick={() => map.current?.zoomIn()}><PlusIcon /></CtrlBtn>
          <span className="h-px bg-border" />
          <CtrlBtn label="Zoom out" onClick={() => map.current?.zoomOut()}><MinusIcon /></CtrlBtn>
          {showLocate && (<><span className="h-px bg-border" /><CtrlBtn label="Fit to content" onClick={fitBounds}><LocateIcon /></CtrlBtn></>)}
          {showReset && (<><span className="h-px bg-border" /><CtrlBtn label="Reset view" onClick={resetNorth}><CompassIcon /></CtrlBtn></>)}
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
const LocateIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>;
