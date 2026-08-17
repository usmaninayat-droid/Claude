import * as React from 'react';
import { cn } from '../utils/cn';
import { MapWidget } from './map-widget';
import { MapView } from './map-view';
import type { MapViewHandle, LatLng, MapMarker } from './types';
import { ASSET_STATE_COLOR, type AssetMarkerState } from './map-marker';
import { WidgetShell, type MapLegendItem } from './map-widgets';

/**
 * MapLiveWidget — the dashboard-embedded live fleet map (`type: "map-live"` in
 * `DashboardModuleConfig.schema.json`).
 *
 * Spec: `map-live-widget.spec.md`.
 *
 * Composes the existing MapWidget chrome + MapView engine and adds the live
 * telematics behaviours the Telematics Overview dashboard needs:
 *  - breathing pulse on **moving** assets (MapView `live` markers)
 *  - **position interpolation** between pings (assets glide, not teleport)
 *  - **cluster health rings** — screen-space buckets drawn as a conic ring of
 *    the member states (Moving/Idling/Stopped…), replacing the flat GL cluster
 *  - a **freshness pill** ("LIVE · updated 8s ago", amber once stale)
 *
 * `prefers-reduced-motion` disables the pulse and the interpolation (positions
 * jump) — the data stays identical. Token-only chrome; marker/ring colours come
 * from the canonical `ASSET_STATE_COLOR` state→token map.
 */

export interface MapLiveAsset {
  id: string;
  position: LatLng;
  /** Live asset state (DS vocab) — drives pin + ring colour. */
  state: AssetMarkerState;
  /** Heading 0–360 (vehicle direction). */
  heading?: number;
  /** Speed km/h — shown in the label pill when provided. */
  speed?: number;
  /** Label pill (plate). */
  label?: string;
  /** Status text beside the label (defaults to the state's display name). */
  statusLabel?: string;
  /** AssetGlyph name for the pin (e.g. "car", "truck"). Default "car". */
  assetType?: string;
  /** Emphasised (selected) pin. */
  selected?: boolean;
}

export interface MapLiveWidgetProps {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  center: LatLng;
  zoom?: number;
  assets: MapLiveAsset[];
  /** Header legend. Defaults to per-state counts derived from `assets`. */
  legend?: MapLegendItem[];
  /** Map body height. Default 420. */
  height?: number;
  /** Screen-space health-ring clustering. Default true. */
  cluster?: boolean;
  /** Last data refresh — drives the freshness pill. */
  updatedAt?: number | string | Date;
  /** Seconds after which the freshness pill turns amber ("stale"). Default 120. */
  staleAfterSec?: number;
  /** Clock override (demo/fixed time). Default `Date.now`. */
  getNow?: () => number;
  /** Ping→ping interpolation duration (ms). Default 900. 0 disables. */
  interpolateMs?: number;
  onAssetClick?: (id: string) => void;
  className?: string;
}

const STATE_LABEL: Record<AssetMarkerState, string> = {
  moving: 'Moving',
  idle: 'Idling',
  'excess-idling': 'Excess idling',
  stopped: 'Stopped',
  'non-moving': 'Stationary',
  immobilized: 'Immobilized',
  'non-reporting': 'Not reporting',
};

/** Stable ring segment order so cluster rings don't reshuffle between renders. */
const RING_ORDER: AssetMarkerState[] = [
  'moving', 'idle', 'excess-idling', 'non-moving', 'stopped', 'immobilized', 'non-reporting',
];

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return reduced;
}

interface HealthCluster {
  key: string;
  x: number;
  y: number;
  count: number;
  counts: Partial<Record<AssetMarkerState, number>>;
  members: LatLng[];
}

const lerpPos = (a: LatLng, b: LatLng, t: number): LatLng => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

export function MapLiveWidget({
  title = 'Live Fleet Map',
  icon,
  center,
  zoom = 10,
  assets,
  legend,
  height = 420,
  cluster = true,
  updatedAt,
  staleAfterSec = 120,
  getNow,
  interpolateMs = 900,
  onAssetClick,
  className,
}: MapLiveWidgetProps) {
  const mapRef = React.useRef<MapViewHandle>(null);
  const reducedMotion = usePrefersReducedMotion();
  const now = getNow ?? Date.now;

  /* ── position interpolation between pings ────────────────────────────── */
  const [displayed, setDisplayed] = React.useState<MapLiveAsset[]>(assets);
  const prevAssets = React.useRef<MapLiveAsset[]>(assets);
  React.useEffect(() => {
    const from = new Map(prevAssets.current.map((a) => [a.id, a.position]));
    prevAssets.current = assets;
    if (reducedMotion || !interpolateMs) { setDisplayed(assets); return; }
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / interpolateMs);
      const e = 1 - (1 - k) * (1 - k); // ease-out
      setDisplayed(assets.map((a) => {
        const p = from.get(a.id);
        return p ? { ...a, position: lerpPos(p, a.position, e) } : a;
      }));
      if (k >= 1) clearInterval(timer);
    };
    const timer = setInterval(step, 150);
    step();
    return () => clearInterval(timer);
  }, [assets, reducedMotion, interpolateMs]);

  /* ── screen-space health-ring clusters (public project() API) ────────── */
  const [clusters, setClusters] = React.useState<HealthCluster[]>([]);
  const [clusteredIds, setClusteredIds] = React.useState<Set<string>>(new Set());
  const rafPending = React.useRef(false);

  const recluster = React.useCallback(() => {
    const h = mapRef.current;
    if (!h || !cluster) { setClusters([]); setClusteredIds(new Set()); return; }
    const CELL = 76;
    const buckets = new Map<string, { asset: MapLiveAsset; x: number; y: number }[]>();
    for (const a of prevAssets.current) {
      const p = h.project(a.position);
      if (!p) return; // map not ready yet — keep previous state
      const key = `${Math.floor(p.x / CELL)}:${Math.floor(p.y / CELL)}`;
      const arr = buckets.get(key);
      const entry = { asset: a, x: p.x, y: p.y };
      if (arr) arr.push(entry); else buckets.set(key, [entry]);
    }
    const next: HealthCluster[] = [];
    const ids = new Set<string>();
    for (const [key, group] of buckets) {
      if (group.length < 2) continue;
      const counts: Partial<Record<AssetMarkerState, number>> = {};
      let x = 0; let y = 0;
      for (const g of group) {
        counts[g.asset.state] = (counts[g.asset.state] ?? 0) + 1;
        x += g.x; y += g.y;
        ids.add(g.asset.id);
      }
      next.push({
        key,
        x: x / group.length,
        y: y / group.length,
        count: group.length,
        counts,
        members: group.map((g) => g.asset.position),
      });
    }
    setClusters(next);
    setClusteredIds(ids);
  }, [cluster]);

  const scheduleRecluster = React.useCallback(() => {
    if (rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(() => { rafPending.current = false; recluster(); });
  }, [recluster]);

  // First compute — retry until the map instance can project.
  React.useEffect(() => {
    if (!cluster) return;
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      if (mapRef.current?.project(center) || tries > 20) {
        clearInterval(t);
        recluster();
      }
    }, 250);
    return () => clearInterval(t);
  }, [cluster, recluster]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => { scheduleRecluster(); }, [displayed, scheduleRecluster]);

  /* ── freshness pill ──────────────────────────────────────────────────── */
  const [, tick] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    if (updatedAt == null) return;
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, [updatedAt]);

  let freshness: { label: string; stale: boolean } | null = null;
  if (updatedAt != null) {
    const age = Math.max(0, Math.round((now() - new Date(updatedAt).getTime()) / 1000));
    const label = age < 60 ? `updated ${age}s ago` : age < 3600 ? `updated ${Math.round(age / 60)}m ago` : `updated ${Math.round(age / 3600)}h ago`;
    freshness = { label, stale: age > staleAfterSec };
  }

  /* ── derived legend + markers ────────────────────────────────────────── */
  const autoLegend = React.useMemo<MapLegendItem[]>(() => {
    const counts = new Map<AssetMarkerState, number>();
    for (const a of assets) counts.set(a.state, (counts.get(a.state) ?? 0) + 1);
    return RING_ORDER.filter((s) => counts.has(s)).map((s) => ({
      label: `${STATE_LABEL[s]} (${counts.get(s)})`,
      color: ASSET_STATE_COLOR[s],
    }));
  }, [assets]);

  const markers = React.useMemo<MapMarker[]>(
    () => displayed
      .filter((a) => !clusteredIds.has(a.id))
      .map((a) => ({
        id: a.id,
        position: a.position,
        kind: 'asset' as const,
        assetType: a.assetType ?? 'car',
        assetState: a.state,
        heading: a.heading,
        live: !reducedMotion && a.state === 'moving',
        label: a.label,
        statusLabel: a.statusLabel ?? (a.speed != null && a.state === 'moving' ? `${Math.round(a.speed)} km/h` : STATE_LABEL[a.state]),
        selected: a.selected,
      })),
    [displayed, clusteredIds, reducedMotion],
  );

  return (
    <WidgetShell title={title} icon={icon} legend={legend ?? autoLegend} className={className}>
      <MapWidget
        height={height}
        statusBadge={freshness ? { label: `LIVE · ${freshness.label}`, variant: freshness.stale ? 'warning' : 'success' } : undefined}
        showFullscreen={false}
        onZoomIn={() => mapRef.current?.zoomIn()}
        onZoomOut={() => mapRef.current?.zoomOut()}
        className="rounded-none border-0"
      >
        <div className="relative h-full w-full">
          <MapView
            ref={mapRef}
            center={center}
            zoom={zoom}
            markers={markers}
            onMarkerClick={onAssetClick}
            onViewportChange={scheduleRecluster}
            controls={false}
            className="absolute inset-0"
          />
          {/* Health-ring cluster overlay — conic ring of member states + count. */}
          {cluster && clusters.length ? (
            <div aria-hidden={false} className="pointer-events-none absolute inset-0 z-10">
              {clusters.map((c) => {
                const total = c.count || 1;
                let acc = 0;
                const stops: string[] = [];
                for (const s of RING_ORDER) {
                  const n = c.counts[s] ?? 0;
                  if (!n) continue;
                  const from = (acc / total) * 360;
                  acc += n;
                  stops.push(`${ASSET_STATE_COLOR[s]} ${from}deg ${(acc / total) * 360}deg`);
                }
                const d = Math.round(42 + Math.min(26, Math.log10(Math.max(1, c.count)) * 14));
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => mapRef.current?.fitTo(c.members, { padding: 90 })}
                    aria-label={`Cluster of ${c.count} assets — zoom in`}
                    className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ left: c.x, top: c.y, width: d, height: d, background: `conic-gradient(${stops.join(',')})` }}
                  >
                    <span className="absolute inset-[5px] flex items-center justify-center rounded-full bg-card text-body-sm font-bold text-foreground">
                      {c.count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </MapWidget>
    </WidgetShell>
  );
}
