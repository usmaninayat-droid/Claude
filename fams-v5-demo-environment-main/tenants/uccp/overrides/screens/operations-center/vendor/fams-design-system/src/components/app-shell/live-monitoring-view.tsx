import * as React from 'react';
import {
  SearchMd as Search,
  Plus,
  Minus,
  Maximize02 as Maximize2,
  ChevronLeft,
  XClose as X,
  Signal01 as SignalIcon,
  RefreshCw02 as RefreshIcon,
  LayersThree01 as LayersIcon,
  Route as RouteIcon,
  AlertTriangle,
  Wifi,
  MarkerPin01 as PinIcon,
  Expand as ExpandIcon,
  Minimize02 as MinimizeIcon,
} from '../../icons';

// Round 2026-08-31 P0 fix: was CARTO's light_all rastertiles, which
// watermarked "API KEY REQUIRED" in this environment — swapped for the
// always-free OSM standard raster tiles (see leaflet-map.tsx's default).
const OSM_LIGHT = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
import { cn } from '../utils/cn';
import { LeafletMap } from '../map';
import type { LeafletMapHandle, MapMarker, MapRoute, LatLng, MarkerStatus, AssetMarkerState } from '../map';

/** Map the live-monitoring status enum onto the AssetMarker pin states. */
const STATUS_TO_ASSET_STATE: Record<MarkerStatus, AssetMarkerState> = {
  default: 'non-reporting',
  reporting: 'moving',
  stopped: 'stopped',
  critical: 'immobilized',
  warning: 'excess-idling',
  idle: 'idle',
};
import type { MonitoringModuleData, MonitoringEntity, DetailDescriptor } from './types';

/**
 * LiveMonitoringView — the platform's real Live Monitoring surface, adapted
 * from the EAD RMS fleet console + the Cement delivery tracker:
 *
 *   ┌───────────────────┬──────────────────────────────────────┐
 *   │ Vehicles      ⌃   │  live badge        [layers][zoom]     │
 *   │ search…           │                                       │
 *   │ ● Moving 5  …     │            M A P  (markers + route)    │
 *   │ ─────────────     │                                       │
 *   │ [pin] Z-7764  …   │        ┌─ tracking popup ─┐           │
 *   │ [pin] Z-7765  …   │        │ telemetry / events │          │
 *   │ …                 │        └────────────────────┘          │
 *   │                   │  ● legend          [+/-] zoom         │
 *   └───────────────────┴──────────────────────────────────────┘
 *
 * A searchable, status-badged fleet list on the left drives the map (click a
 * row → fly to it); clicking a marker opens a telemetry popup that drills into
 * the standard EntityDetail. Routes draw as polylines (optionally OSRM road
 * geometry). Falls back gracefully to the legacy `markers` contract.
 */

const STATUS_HEX: Record<string, string> = {
  default: '#0072D6',
  reporting: '#12B76A',
  stopped: '#D92D20',
  critical: '#F04438',
  warning: '#F79009',
  idle: '#98A2B3',
};

/** Normalise legacy `markers` into entities so the view has one code path. */
function deriveEntities(data: MonitoringModuleData): MonitoringEntity[] {
  if (data.entities?.length) return data.entities;
  return (data.markers ?? []).map((m: MapMarker) => ({
    id: m.id,
    position: m.position,
    status: m.status ?? 'default',
    kind: m.kind ?? 'dot',
    live: m.live,
    title: m.tooltip ?? m.id,
    tooltip: m.tooltip,
  }));
}

function MapToolBtn({
  onClick,
  active,
  label,
  children,
}: {
  onClick?: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid size-9 place-items-center rounded-md border shadow-sm transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  );
}

/* ── on-map telemetry popup ───────────────────────────────────────────── */

function TrackingPopup({
  entity,
  onClose,
  onOpenDetail,
}: {
  entity: MonitoringEntity;
  onClose: () => void;
  onOpenDetail?: (d: DetailDescriptor) => void;
}) {
  const color = STATUS_HEX[entity.status] ?? STATUS_HEX.default;
  // Build the tab set from whatever data the entity provides (EAD's
  // Overview / Critical Events / Trips / Devices).
  const tabs = [
    { id: 'overview', label: 'Overview' },
    ...(entity.events?.length ? [{ id: 'events', label: `Events (${entity.events.length})` }] : []),
    ...(entity.trips?.length ? [{ id: 'trips', label: 'Trips' }] : []),
    ...(entity.devices?.length ? [{ id: 'devices', label: 'Devices' }] : []),
  ];
  const [tab, setTab] = React.useState('overview');
  const [latestOnly, setLatestOnly] = React.useState(false);
  const active = tabs.some((t) => t.id === tab) ? tab : 'overview';
  const canDrill = !!(entity.toDetail && onOpenDetail);
  return (
    <div className="w-[340px] overflow-hidden rounded-lg border border-border bg-card shadow-[0_12px_16px_0_rgba(16,24,40,0.08),0_4px_6px_0_rgba(16,24,40,0.03)]">
      {/* Header */}
      <div className="border-b border-border px-4 pb-2.5 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {canDrill ? (
              <button
                type="button"
                onClick={() => onOpenDetail!(entity.toDetail!())}
                className="truncate text-left text-body-sm font-semibold text-foreground outline-none hover:text-primary hover:underline"
              >
                {entity.title}
              </button>
            ) : (
              <div className="truncate text-body-sm font-semibold text-foreground">{entity.title}</div>
            )}
            {entity.subtitle ? <div className="truncate text-caption text-muted-foreground">{entity.subtitle}</div> : null}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={13} />
          </button>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full" style={{ background: color }} />
          <span className="text-caption font-medium" style={{ color }}>
            {entity.statusLabel ?? entity.status}
            {entity.since ? <span className="text-muted-foreground"> · since {entity.since}</span> : null}
          </span>
        </div>
      </div>

      {/* Tabs */}
      {tabs.length > 1 ? (
        <div className="flex gap-4 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                '-mb-px whitespace-nowrap border-b-2 py-2 text-caption font-semibold outline-none transition-colors',
                active === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Body */}
      <div className="max-h-[248px] overflow-auto px-4 py-3">
        {active === 'overview' ? (
          entity.telemetry?.length ? (
            <div className="grid grid-cols-3 gap-x-3 gap-y-3">
              {entity.telemetry.map((f, i) => (
                <div key={i} className="min-w-0">
                  <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</div>
                  <div className="mt-0.5 truncate text-caption font-semibold text-foreground">{f.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2 text-caption text-muted-foreground">No telemetry available.</div>
          )
        ) : active === 'events' ? (
          <div className="flex flex-col">
            {entity.events!.map((e, i, arr) => {
              const sc = e.severity === 'error' ? '#F04438' : e.severity === 'warning' ? '#F79009' : '#0072D6';
              return (
                <div key={e.id} className={cn('flex items-center justify-between gap-2 py-2', i < arr.length - 1 && 'border-b border-border')}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: sc }} />
                    <span className="truncate text-caption font-medium text-foreground">{e.title}</span>
                  </span>
                  {e.meta ? <span className="shrink-0 text-[10px] text-muted-foreground">{e.meta}</span> : null}
                </div>
              );
            })}
          </div>
        ) : active === 'trips' ? (
          <div className="flex flex-col gap-2.5">
            {/* Summary metrics + show-latest toggle (EAD Trips tab) */}
            {entity.tripSummary ? (
              <div className="flex items-center gap-4 border-b border-border pb-2">
                {entity.tripSummary.distance != null ? (
                  <span className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Distance</span>
                    <span className="text-caption font-semibold text-primary">{entity.tripSummary.distance}</span>
                  </span>
                ) : null}
                {entity.tripSummary.trips != null ? (
                  <span className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Trips</span>
                    <span className="text-caption font-semibold text-foreground">{entity.tripSummary.trips}</span>
                  </span>
                ) : null}
                {entity.tripSummary.duration != null ? (
                  <span className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Duration</span>
                    <span className="text-caption font-semibold text-foreground">{entity.tripSummary.duration}</span>
                  </span>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setLatestOnly((v) => !v)}
              className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground outline-none hover:text-foreground"
            >
              <span className={cn('grid size-3.5 place-items-center rounded border', latestOnly ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                {latestOnly ? '✓' : ''}
              </span>
              Show latest trip only
            </button>
            {(latestOnly ? entity.trips!.slice(0, 1) : entity.trips!).map((t) => (
              <div key={t.id} className="border-l-2 border-primary/60 pl-2.5">
                <div className="flex items-baseline gap-2">
                  {t.time ? <span className="text-caption font-semibold text-foreground">{t.time}</span> : null}
                  <span className="truncate text-caption text-foreground">{t.destination}</span>
                </div>
                <div className="mt-0.5 flex gap-3 text-[10px] text-muted-foreground">
                  {t.distance ? <span>{t.distance}</span> : null}
                  {t.duration ? <span>{t.duration}</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {entity.devices!.map((d, i, arr) => (
              <div key={d.id} className={cn('flex items-center justify-between gap-2 py-2', i < arr.length - 1 && 'border-b border-border')}>
                <span className="truncate text-caption font-medium text-foreground">{d.name}</span>
                {d.meta ? <span className="shrink-0 text-[10px] text-muted-foreground">{d.meta}</span> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {entity.toDetail && onOpenDetail ? (
        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={() => onOpenDetail(entity.toDetail!())}
            className="w-full rounded-md bg-secondary py-1.5 text-caption font-semibold text-secondary-foreground transition-colors hover:opacity-90"
          >
            View full detail
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ── status filter tab ────────────────────────────────────────────────── */

function StatusTab({
  label,
  count,
  dot,
  active,
  onClick,
}: {
  label: React.ReactNode;
  count: number;
  dot?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-caption font-semibold outline-none transition-colors',
        active ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {dot ? <span aria-hidden className="size-2 rounded-full" style={{ background: dot }} /> : null}
      {label}
      <span className={cn('rounded px-1.5 text-[10px] font-bold', active ? 'bg-card text-primary' : 'bg-muted text-muted-foreground')}>
        {count}
      </span>
    </button>
  );
}

/* ── fleet list row ───────────────────────────────────────────────────── */

function FleetRow({
  entity,
  selected,
  onClick,
}: {
  entity: MonitoringEntity;
  selected: boolean;
  onClick: () => void;
}) {
  const color = STATUS_HEX[entity.status] ?? STATUS_HEX.default;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 border-b border-border px-3 py-2 text-left outline-none transition-colors',
        selected ? 'bg-secondary/60 shadow-[inset_3px_0_0_var(--primary)]' : 'hover:bg-muted/40'
      )}
    >
      <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-primary">
        {entity.avatarFallback ?? entity.title.slice(0, 2).toUpperCase()}
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card"
          style={{ background: color }}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-body-sm font-semibold text-foreground">{entity.title}</span>
        <span className="flex min-w-0 items-center gap-1.5">
          {entity.statusLabel ? (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
            >
              <span aria-hidden className="size-1.5 rounded-full" style={{ background: color }} />
              {entity.statusLabel}
            </span>
          ) : null}
          {entity.subtitle ? <span className="truncate text-caption text-muted-foreground">{entity.subtitle}</span> : null}
        </span>
      </span>
      {/* Activity Overview mini-stats (EAD: alerts · links · distance) */}
      {entity.alerts != null || entity.connections != null || entity.distanceKm != null ? (
        <span className="flex shrink-0 items-center gap-2.5 text-[11px] font-medium">
          {entity.alerts != null ? (
            <span className="inline-flex items-center gap-0.5" style={{ color: entity.alerts > 0 ? 'var(--destructive)' : 'var(--muted-foreground)' }} title="Alerts">
              <AlertTriangle size={12} /> {entity.alerts}
            </span>
          ) : null}
          {entity.connections != null ? (
            <span className="inline-flex items-center gap-0.5 text-muted-foreground" title="Connected devices">
              <Wifi size={12} /> {entity.connections}
            </span>
          ) : null}
          {entity.distanceKm != null ? (
            <span className="inline-flex items-center gap-0.5 text-muted-foreground" title="Distance today">
              <PinIcon size={12} /> {entity.distanceKm}
            </span>
          ) : null}
        </span>
      ) : null}
      {entity.metric != null ? (
        <span className="flex w-[68px] shrink-0 flex-col items-end">
          <span className="text-caption font-semibold text-foreground">{entity.metric}</span>
          {entity.metricSub != null ? <span className="text-[10px] text-muted-foreground">{entity.metricSub}</span> : null}
        </span>
      ) : null}
    </button>
  );
}

/* ── view ─────────────────────────────────────────────────────────────── */

export function LiveMonitoringView({
  data,
  onOpenDetail,
}: {
  data: MonitoringModuleData;
  onOpenDetail?: (d: DetailDescriptor) => void;
}) {
  const entities = React.useMemo(() => deriveEntities(data), [data]);
  const [query, setQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState(false);
  const [tileLight, setTileLight] = React.useState(false);
  const [showRoutes, setShowRoutes] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const mapRef = React.useRef<LeafletMapHandle>(null);
  // Screen position of the selected marker's pin — the telemetry popup opens
  // OVER the marker (EAD behaviour), re-projected as the map pans/zooms.
  const [popupPoint, setPopupPoint] = React.useState<{ x: number; y: number } | null>(null);

  const filtered = React.useMemo(() => {
    if (!query) return entities;
    const q = query.toLowerCase();
    return entities.filter((e) => `${e.title} ${typeof e.subtitle === 'string' ? e.subtitle : ''}`.toLowerCase().includes(q));
  }, [entities, query]);

  // Only "trackable" entities (not plant/site anchors) populate the list.
  const listEntities = filtered.filter((e) => e.kind !== 'plant' && e.kind !== 'site');
  const selected = entities.find((e) => e.id === selectedId) ?? null;

  // Re-project the selected marker to a screen point so the popup sits over it.
  // A ref keeps the map's (once-attached) onViewportChange callback current.
  const selectedRef = React.useRef(selected);
  selectedRef.current = selected;
  const updatePopupPoint = React.useCallback(() => {
    const s = selectedRef.current;
    setPopupPoint(s ? mapRef.current?.project(s.position) ?? null : null);
  }, []);
  React.useEffect(() => {
    // Project after layout settles (marker added / flyTo finishes).
    const id = requestAnimationFrame(updatePopupPoint);
    return () => cancelAnimationFrame(id);
  }, [selectedId, updatePopupPoint]);

  // Memoised so the per-second ETA tick doesn't churn the map's effects
  // (which would reset the truck-animation progress every render).
  const markers: MapMarker[] = React.useMemo(
    () =>
      entities.map((e) => ({
        id: e.id,
        position: e.position,
        status: e.status,
        // An `assetType` opts into the DS V2 AssetMarker pin (state colour +
        // dynamic glyph); otherwise the legacy vehicle/plant/site/dot pin.
        kind: e.assetType ? 'asset' : (e.kind ?? 'vehicle'),
        assetType: e.assetType,
        assetState: e.assetType ? STATUS_TO_ASSET_STATE[e.status] : undefined,
        assetActive: e.assetType ? e.id === selectedId : undefined,
        live: e.live,
        heading: e.heading,
        label: e.mapLabel,
        statusLabel: e.statusLabel,
        selected: e.id === selectedId,
        tooltip: e.tooltip,
      })),
    [entities, selectedId]
  );
  const routes: MapRoute[] = React.useMemo(
    () =>
      (data.routes ?? []).map((r) => ({
        id: r.id,
        points: r.points,
        color: r.color,
        dashed: r.dashed,
        osrm: r.osrm,
        animateMarkerId: r.animateMarkerId,
      })),
    [data.routes]
  );

  /* status filter tabs — derived from the trackable set (the demos' All /
     Moving / Loading / … chips with counts). */
  const [statusTab, setStatusTab] = React.useState('all');
  const groupKey = (e: MonitoringEntity) => e.statusLabel ?? e.status;
  const groups = React.useMemo(() => {
    const map = new Map<string, { count: number; color: string }>();
    for (const e of listEntities) {
      const k = groupKey(e);
      const g = map.get(k) ?? { count: 0, color: STATUS_HEX[e.status] ?? STATUS_HEX.default };
      g.count += 1;
      map.set(k, g);
    }
    return [...map.entries()].map(([label, g]) => ({ label, ...g }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listEntities]);
  const visibleList = statusTab === 'all' ? listEntities : listEntities.filter((e) => groupKey(e) === statusTab);

  /* live ETA countdown (loops) */
  const countdownFrom = data.liveBadge?.countdownFromSec;
  const [etaSec, setEtaSec] = React.useState(countdownFrom ?? 0);
  React.useEffect(() => {
    if (!countdownFrom) return;
    setEtaSec(countdownFrom);
    const t = setInterval(() => setEtaSec((s) => (s <= 1 ? countdownFrom : s - 1)), 1000);
    return () => clearInterval(t);
  }, [countdownFrom]);
  const etaText = countdownFrom ? `${Math.max(1, Math.floor(etaSec / 60))} min` : data.liveBadge?.eta;

  // Stable identity so the map's marker effect isn't torn down each render.
  const select = React.useCallback(
    (id: string) => {
      const e = entities.find((x) => x.id === id);
      setSelectedId(id);
      if (e) mapRef.current?.flyTo(e.position, 14);
    },
    [entities]
  );

  return (
    <div className={cn('flex h-full min-h-0 items-stretch', fullscreen && 'fixed inset-0 z-[1500] bg-background')}>
      {/* ── Fleet list panel ──────────────────────────────────────────── */}
      <aside
        className={cn(
          'flex shrink-0 flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-300',
          collapsed ? 'w-0' : 'w-[340px]'
        )}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-3">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="h-8 w-full rounded-md border border-border bg-card pl-8 pr-2 text-body-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between px-3 py-2">
          <span className="text-caption text-muted-foreground">
            {data.listTitle ?? 'Tracked'} · <span className="font-semibold text-foreground">{listEntities.length}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-caption font-semibold text-[var(--status-success)]">
            <span className="size-1.5 animate-pulse rounded-full bg-[var(--status-success)]" /> Live
          </span>
        </div>

        {/* Status filter tabs (All / Moving / Loading / …) */}
        {groups.length > 1 ? (
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <StatusTab label="All" count={listEntities.length} active={statusTab === 'all'} onClick={() => setStatusTab('all')} />
            {groups.map((g) => (
              <StatusTab key={g.label} label={g.label} count={g.count} dot={g.color} active={statusTab === g.label} onClick={() => setStatusTab(g.label)} />
            ))}
          </div>
        ) : null}

        {/* Column headers (EAD list) */}
        {listEntities.some((e) => e.alerts != null || e.connections != null || e.distanceKm != null) ? (
          <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            <span className="w-9 shrink-0" />
            <span className="flex-1">Vehicle</span>
            <span className="shrink-0">Activity</span>
            <span className="w-[68px] shrink-0 text-right">Speed</span>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto">
          {visibleList.map((e) => (
            <FleetRow key={e.id} entity={e} selected={e.id === selectedId} onClick={() => select(e.id)} />
          ))}
          {!visibleList.length ? (
            <div className="px-3 py-6 text-center text-caption text-muted-foreground">No matches.</div>
          ) : null}
        </div>
      </aside>

      {/* ── Map area ──────────────────────────────────────────────────── */}
      <div className="relative min-w-0 flex-1">
        <LeafletMap
          ref={mapRef}
          center={data.center}
          zoom={data.zoom ?? 12}
          markers={markers}
          routes={showRoutes ? routes : []}
          tileUrl={tileLight ? OSM_LIGHT : undefined}
          fitToContent
          onMarkerClick={select}
          onViewportChange={updatePopupPoint}
          className="h-full w-full"
        />

        {/* Left toolbar — collapse · refresh · layers · routes (the demo clusters) */}
        <div className="absolute left-3 top-3 z-[1000] flex flex-col gap-1.5">
          <MapToolBtn label={collapsed ? 'Show list' : 'Hide list'} onClick={() => setCollapsed((v) => !v)}>
            <ChevronLeft size={16} className={cn('transition-transform', collapsed && 'rotate-180')} />
          </MapToolBtn>
          <MapToolBtn
            label="Refresh"
            onClick={() => {
              setRefreshing(true);
              mapRef.current?.fitAll();
              setTimeout(() => setRefreshing(false), 600);
            }}
          >
            <RefreshIcon size={15} className={cn('text-primary', refreshing && 'animate-spin')} />
          </MapToolBtn>
          <MapToolBtn label="Toggle basemap" active={tileLight} onClick={() => setTileLight((v) => !v)}>
            <LayersIcon size={15} />
          </MapToolBtn>
          {routes.length ? (
            <MapToolBtn label="Toggle routes" active={showRoutes} onClick={() => setShowRoutes((v) => !v)}>
              <RouteIcon size={15} />
            </MapToolBtn>
          ) : null}
        </div>

        {/* Live badge (with ticking ETA when a countdown is configured) */}
        {data.liveBadge ? (
          <div className="absolute left-1/2 top-3 z-[900] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-sm">
            <span className="size-2 animate-pulse rounded-full bg-[var(--status-success)]" />
            <span className="text-caption font-semibold text-foreground">{data.liveBadge.label}</span>
            {etaText ? (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-caption font-bold text-primary">{etaText}</span>
            ) : null}
          </div>
        ) : null}

        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-1.5">
          <MapToolBtn label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={() => setFullscreen((v) => !v)}>
            {fullscreen ? <MinimizeIcon size={15} /> : <ExpandIcon size={15} />}
          </MapToolBtn>
          <MapToolBtn label="Fit to all" onClick={() => mapRef.current?.fitAll()}>
            <Maximize2 size={15} />
          </MapToolBtn>
          <div className="flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm">
            <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()} className="grid size-9 place-items-center text-foreground transition-colors hover:bg-muted">
              <Plus size={15} />
            </button>
            <div className="h-px bg-border" />
            <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()} className="grid size-9 place-items-center text-foreground transition-colors hover:bg-muted">
              <Minus size={15} />
            </button>
          </div>
        </div>

        {/* Legend */}
        {data.legend?.length ? (
          <div className="absolute bottom-4 left-4 z-[900] rounded-lg border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <SignalIcon size={11} /> Status
            </div>
            <div className="flex flex-col gap-1">
              {data.legend.map((l, i) => (
                <div key={i} className="flex items-center gap-2 text-caption">
                  <span aria-hidden className="size-2.5 rounded-full" style={{ background: l.color }} />
                  <span className="text-foreground">{l.label}</span>
                  {l.count != null ? <span className="ml-auto font-semibold text-muted-foreground">{l.count}</span> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Tracking popup — anchored OVER the selected marker (re-projected on
            pan/zoom); falls back to the top-right corner if not yet projected. */}
        {selected ? (
          <div
            className="pointer-events-none absolute z-[1000]"
            style={
              popupPoint
                ? { left: popupPoint.x, top: popupPoint.y, transform: 'translate(-50%, calc(-100% - 22px))' }
                : { right: 16, top: 16 }
            }
          >
            <div className="pointer-events-auto">
              <TrackingPopup entity={selected} onClose={() => setSelectedId(null)} onOpenDetail={onOpenDetail} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
