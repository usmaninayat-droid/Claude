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
  Eye,
  EyeOff,
  FilterLines as FunnelIcon,
  Check,
} from '../../icons';

/** Key-free light basemap — Carto's `light_all` now demands an API key and
 *  serves an "API KEY REQUIRED" watermark tile instead (2026-09-01 fix, same
 *  as operations-center LiveGisMap). OSM standard is the workspace default. */
const LIGHT_BASEMAP = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
import { Shapes, MapPin, Pencil } from 'lucide-react';
import { cn } from '../utils/cn';
import { Popover, PopoverTrigger, PopoverContent, Skeleton } from '../primitives';
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
import type { MonitoringModuleData, MonitoringEntity, MonitoringZone, MonitoringPoi, DetailDescriptor } from './types';

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
          <div className="flex shrink-0 items-center gap-0.5">
            {/* Expand → open the asset's full detail view (canonical top-right control). */}
            {canDrill ? (
              <button
                type="button"
                aria-label="Open detail view"
                onClick={() => onOpenDetail!(entity.toDetail!())}
                className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
              >
                <ExpandIcon size={13} />
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={13} />
            </button>
          </div>
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

    </div>
  );
}

/* ── list skeleton (loading state) ────────────────────────────────────── */

function FleetListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 border-b border-border px-3 py-2.5">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-2.5 w-1/2" />
            <Skeleton className="h-2 w-2/3" />
          </div>
          <Skeleton className="h-2.5 w-10 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/* ── fleet list row ───────────────────────────────────────────────────── */

/** Which optional list columns are shown (Vehicle is always shown). */
interface FleetCols {
  activity: boolean;
  speed: boolean;
}

function ActivityCell({ entity }: { entity: MonitoringEntity }) {
  return (
    <span className="flex w-[72px] shrink-0 items-center gap-2 text-[11px] font-medium">
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
  );
}

function FleetRow({
  entity,
  selected,
  cols,
  onClick,
}: {
  entity: MonitoringEntity;
  selected: boolean;
  cols: FleetCols;
  onClick: () => void;
}) {
  const color = STATUS_HEX[entity.status] ?? STATUS_HEX.default;
  const hasActivity = entity.alerts != null || entity.connections != null || entity.distanceKm != null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 border-b border-border px-3 py-2 text-left outline-none transition-colors',
        selected ? 'bg-secondary/60 shadow-[inset_3px_0_0_var(--primary)]' : 'hover:bg-muted/40'
      )}
    >
      {/* VEHICLE — thumbnail (or initials) + title + status pill */}
      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="relative shrink-0">
          {entity.image ? (
            <img src={entity.image} alt="" loading="lazy" className="size-9 rounded-md object-cover" />
          ) : (
            <span className="grid size-9 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-primary">
              {entity.avatarFallback ?? entity.title.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span aria-hidden className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card" style={{ background: color }} />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
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
      </span>
      {/* ACTIVITY OVERVIEW */}
      {cols.activity && hasActivity ? <ActivityCell entity={entity} /> : null}
      {/* SPEED */}
      {cols.speed && entity.metric != null ? (
        <span className="flex w-[64px] shrink-0 flex-col items-end">
          <span className="text-caption font-semibold text-foreground">{entity.metric}</span>
          {entity.metricSub != null ? <span className="text-[10px] text-muted-foreground">{entity.metricSub}</span> : null}
        </span>
      ) : null}
    </button>
  );
}

/** Column header row + a config pencil that toggles the optional columns. */
function FleetHeader({ cols, setCols }: { cols: FleetCols; setCols: (c: FleetCols) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
      <span className="min-w-0 flex-1">Vehicle</span>
      {cols.activity ? <span className="w-[72px] shrink-0">Activity Overview</span> : null}
      {cols.speed ? <span className="w-[64px] shrink-0 text-right">Speed</span> : null}
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Configure columns" className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Pencil size={12} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-1">
          {([['activity', 'Activity Overview'], ['speed', 'Speed']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCols({ ...cols, [key]: !cols[key] })}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-body-sm outline-none transition-colors hover:bg-muted"
            >
              <span className="text-foreground">{label}</span>
              <span className={cn('grid size-4 shrink-0 place-items-center rounded border', cols[key] ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                {cols[key] ? <Check size={10} /> : null}
              </span>
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ── view ─────────────────────────────────────────────────────────────── */

export function LiveMonitoringView({
  data,
  view = 'hybrid',
  onOpenDetail,
}: {
  data: MonitoringModuleData;
  /** Hybrid (list + map) · list (list only) · map (map only) — from the view tabs. */
  view?: 'hybrid' | 'list' | 'map';
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
  // Clustered "zoomed-out" overview (status-ring count badges) vs every asset
  // as its own pin. Toggled by the eye button bottom-left (canonical).
  const [clustered, setClustered] = React.useState(true);
  // Right side-sheet overlays (Zones / POIs) + which items are toggled on.
  const [overlay, setOverlay] = React.useState<null | 'zones' | 'pois'>(null);
  const [enabledZones, setEnabledZones] = React.useState<Set<string>>(new Set());
  const [enabledPois, setEnabledPois] = React.useState<Set<string>>(new Set());
  const [overlayQuery, setOverlayQuery] = React.useState('');
  // Which optional fleet-list columns are shown (toggled by the header pencil).
  const [listCols, setListCols] = React.useState<FleetCols>({ activity: true, speed: true });
  const toggleId = (set: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) =>
    set((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const mapRef = React.useRef<LeafletMapHandle>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
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
        // Floating label pill only when unclustered (clustered overview is just rings).
        label: clustered ? undefined : e.mapLabel,
        statusLabel: clustered ? undefined : e.statusLabel,
        selected: e.id === selectedId,
        tooltip: e.tooltip,
      })),
    [entities, selectedId, clustered]
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

  /* Filters — opened from the funnel (All Filters panel), multi-select by status;
     the selected values show as applied-filter chips below the search. */
  // Multi-section "All Filters": each facet has selected values; Tags filter by
  // entity.tags. Selections show as applied chips. (Falls back to one Status facet.)
  const [facetSel, setFacetSel] = React.useState<Record<string, string[]>>({});
  const [tagSel, setTagSel] = React.useState<string[]>([]);
  const [appliedHidden, setAppliedHidden] = React.useState(false);

  const facetDefs = data.filterFacets?.length ? data.filterFacets : [{ id: 'status', label: 'Status' }];
  // The categorical value of one facet for an entity (status facet → statusLabel).
  const facetValue = (e: MonitoringEntity, id: string): string | undefined =>
    id === 'status' ? (e.statusLabel ?? e.status) : e.facets?.[id];

  // Facet sections with their distinct option values + counts (status keeps colors).
  const facetSections = React.useMemo(
    () =>
      facetDefs
        .map((def) => {
          const map = new Map<string, { count: number; color?: string }>();
          for (const e of listEntities) {
            const v = facetValue(e, def.id);
            if (v == null || v === '') continue;
            const cur = map.get(v) ?? { count: 0, color: def.id === 'status' ? (STATUS_HEX[e.status] ?? STATUS_HEX.default) : undefined };
            cur.count += 1;
            map.set(v, cur);
          }
          return { id: def.id, label: def.label, options: [...map.entries()].map(([value, m]) => ({ value, ...m })) };
        })
        .filter((s) => s.options.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listEntities, data.filterFacets],
  );

  const toggleFacet = (facetId: string, value: string) =>
    setFacetSel((prev) => {
      const cur = prev[facetId] ?? [];
      return { ...prev, [facetId]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] };
    });
  const toggleTag = (tag: string) =>
    setTagSel((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  const clearAllFilters = () => { setFacetSel({}); setTagSel([]); };

  const activeFacets = Object.entries(facetSel).filter(([, vals]) => vals.length);
  const selectedCount = activeFacets.reduce((n, [, v]) => n + v.length, 0) + tagSel.length;
  // Applied-chip list: every selected facet value + tag, with how to remove it.
  const appliedChips = [
    ...activeFacets.flatMap(([fid, vals]) => vals.map((value) => ({ key: `${fid}:${value}`, label: value, remove: () => toggleFacet(fid, value) }))),
    ...tagSel.map((t) => ({ key: `tag:${t}`, label: t, remove: () => toggleTag(t) })),
  ];
  const visibleList = selectedCount
    ? listEntities.filter(
        (e) =>
          activeFacets.every(([fid, vals]) => { const v = facetValue(e, fid); return v != null && vals.includes(v); }) &&
          (!tagSel.length || (e.tags ?? []).some((t) => tagSel.includes(t))),
      )
    : listEntities;

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

  // Zones/POIs overlays: only the enabled ones are drawn on the map.
  const dataZones = data.zones ?? [];
  const dataPois = data.pois ?? [];
  const shownZones = dataZones.filter((z) => enabledZones.has(z.id)).map((z) => ({ id: z.id, points: z.points, color: z.color, label: z.name }));
  const shownPois = dataPois.filter((p) => enabledPois.has(p.id)).map((p) => ({ id: p.id, position: p.position, label: p.name, color: p.color }));
  const overlayItems: (MonitoringZone | MonitoringPoi)[] = overlay === 'zones' ? dataZones : overlay === 'pois' ? dataPois : [];

  return (
    <div className={cn('flex h-full min-h-0 items-stretch', fullscreen && 'fixed inset-0 z-[1500] bg-background')}>
      {/* ── Fleet list panel ──────────────────────────────────────────── */}
      <aside
        className={cn(
          'flex flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-300',
          // List view → full width; Map view → hidden; Hybrid → fixed (collapsible).
          view === 'list' ? 'flex-1' : view === 'map' ? 'w-0 shrink-0' : collapsed ? 'w-0 shrink-0' : 'w-[340px] shrink-0'
        )}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-3">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="h-8 w-full rounded-md border border-border bg-card pl-8 pr-2 text-body-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {/* Filter funnel → "All Filters" panel: grouped facet sections + tags + saved filters. */}
          {facetSections.length || data.filterTags?.length ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Filter"
                  className={cn(
                    'relative grid size-8 shrink-0 place-items-center rounded-md border transition-colors',
                    selectedCount ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted'
                  )}
                >
                  <FunnelIcon size={15} />
                  {selectedCount ? (
                    <span className="absolute -right-1.5 -top-1.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {selectedCount}
                    </span>
                  ) : null}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-0">
                <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                  <span className="text-body-sm font-semibold text-foreground">All Filters</span>
                  <div className="flex items-center gap-2">
                    {data.savedFilters?.length ? (
                      <select
                        aria-label="Saved filters"
                        className="h-6 rounded-md border border-border bg-card px-1.5 text-[11px] text-foreground outline-none"
                        value=""
                        onChange={(e) => { const sf = data.savedFilters!.find((s) => s.id === e.target.value); if (sf) { setFacetSel(sf.facets ?? {}); setTagSel(sf.tags ?? []); } }}
                      >
                        <option value="">Saved Filters</option>
                        {data.savedFilters.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    ) : null}
                    {selectedCount ? (
                      <button type="button" onClick={clearAllFilters} className="text-caption font-semibold text-[var(--status-error)] hover:underline">Clear all</button>
                    ) : null}
                  </div>
                </div>
                <div className="max-h-80 overflow-auto p-3">
                  {data.filterTags?.length ? (
                    <div className="mb-3">
                      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tags</div>
                      <div className="flex flex-wrap gap-1.5">
                        {data.filterTags.map((tag) => {
                          const on = tagSel.includes(tag);
                          return (
                            <button key={tag} type="button" onClick={() => toggleTag(tag)} className={cn('rounded-md border px-2 py-0.5 text-caption font-medium transition-colors', on ? 'border-primary bg-secondary text-primary' : 'border-border text-muted-foreground hover:bg-muted')}>
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  {facetSections.map((section) => (
                    <div key={section.id} className="mb-3 last:mb-0">
                      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{section.label}</div>
                      <div className="flex flex-col">
                        {section.options.map((opt) => {
                          const on = (facetSel[section.id] ?? []).includes(opt.value);
                          return (
                            <button key={opt.value} type="button" onClick={() => toggleFacet(section.id, opt.value)} className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-left text-body-sm outline-none transition-colors hover:bg-muted">
                              <span className="flex min-w-0 items-center gap-2">
                                <span className={cn('grid size-4 shrink-0 place-items-center rounded border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                                  {on ? <Check size={10} /> : null}
                                </span>
                                {opt.color ? <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: opt.color }} /> : null}
                                <span className="truncate text-foreground">{opt.value}</span>
                              </span>
                              <span className="shrink-0 text-caption font-semibold text-muted-foreground">{opt.count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center justify-between px-3 py-2">
          {data.loading ? (
            <Skeleton className="h-3 w-28" />
          ) : (
          <span className="text-caption text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{visibleList.length}</span>
            {selectedCount ? <> items out of {listEntities.length}</> : <> {data.listTitle ?? 'tracked'}</>}
          </span>
          )}
          {selectedCount ? (
            <button type="button" onClick={() => setAppliedHidden((v) => !v)} className="text-caption font-medium text-primary outline-none hover:underline">
              {appliedHidden ? 'Show applied filters' : 'Hide applied filters'}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-caption font-semibold text-[var(--status-success)]">
              <span className="size-1.5 animate-pulse rounded-full bg-[var(--status-success)]" /> Live
            </span>
          )}
        </div>

        {/* Applied-filter chips — each removes on click (canonical applied-filters row). */}
        {selectedCount > 0 && !appliedHidden ? (
          <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-border px-3 pb-2.5">
            {appliedChips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={c.remove}
                className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-caption font-medium text-secondary-foreground transition-opacity hover:opacity-80"
              >
                {c.label}
                <X size={11} />
              </button>
            ))}
          </div>
        ) : null}

        {/* Column header row (Vehicle · Activity Overview · Speed) + config pencil */}
        {!data.loading ? <FleetHeader cols={listCols} setCols={setListCols} /> : null}

        <div className="min-h-0 flex-1 overflow-auto">
          {data.loading ? (
            <FleetListSkeleton />
          ) : (
            <>
              {visibleList.map((e) => (
                <FleetRow key={e.id} entity={e} selected={e.id === selectedId} cols={listCols} onClick={() => select(e.id)} />
              ))}
              {!visibleList.length ? (
                <div className="px-3 py-6 text-center text-caption text-muted-foreground">No matches.</div>
              ) : null}
            </>
          )}
        </div>
      </aside>

      {/* ── Map area (hidden in List view) ────────────────────────────── */}
      {view !== 'list' ? (
      <div className="relative min-w-0 flex-1">
        <LeafletMap
          ref={mapRef}
          center={data.center}
          zoom={data.zoom ?? 12}
          markers={data.loading ? [] : markers}
          cluster={clustered}
          zones={data.loading ? [] : shownZones}
          pois={data.loading ? [] : shownPois}
          routes={showRoutes ? routes : []}
          tileUrl={tileLight ? LIGHT_BASEMAP : undefined}
          fitToContent
          onMarkerClick={select}
          onViewportChange={updatePopupPoint}
          className="h-full w-full"
        />

        {/* Map skeleton sheen while loading (under the toolbars; tiles stay faintly visible). */}
        {data.loading ? <div className="pointer-events-none absolute inset-0 z-[800] animate-pulse bg-muted/40" /> : null}

        {/* List collapse handle at the list↔map seam (canonical ‹/›) — hybrid only. */}
        {view === 'hybrid' ? (
          <button
            type="button"
            aria-label={collapsed ? 'Show list' : 'Hide list'}
            onClick={() => setCollapsed((v) => !v)}
            className="absolute left-0 top-1/2 z-[1000] flex h-12 w-4 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft size={13} className={cn('transition-transform', collapsed && 'rotate-180')} />
          </button>
        ) : null}

        {/* Map toolbar — top-left: search · refresh */}
        <div className="absolute left-3 top-3 z-[1000] flex flex-col gap-1.5">
          <MapToolBtn label="Search on map" onClick={() => searchRef.current?.focus()}>
            <Search size={15} />
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
        </div>

        {/* Map toolbar — top-right: layers · routes · fit · zones · pois */}
        <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-1.5">
          <MapToolBtn label="Toggle basemap" active={tileLight} onClick={() => setTileLight((v) => !v)}>
            <LayersIcon size={15} />
          </MapToolBtn>
          {routes.length ? (
            <MapToolBtn label="Toggle routes" active={showRoutes} onClick={() => setShowRoutes((v) => !v)}>
              <RouteIcon size={15} />
            </MapToolBtn>
          ) : null}
          <MapToolBtn label="Fit to all" onClick={() => mapRef.current?.fitAll()}>
            <Maximize2 size={15} />
          </MapToolBtn>
          {dataZones.length ? (
            <MapToolBtn label="Zones" active={overlay === 'zones'} onClick={() => setOverlay((o) => (o === 'zones' ? null : 'zones'))}>
              <Shapes size={15} />
            </MapToolBtn>
          ) : null}
          {dataPois.length ? (
            <MapToolBtn label="Points of interest" active={overlay === 'pois'} onClick={() => setOverlay((o) => (o === 'pois' ? null : 'pois'))}>
              <MapPin size={15} />
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

        {/* Cluster / uncluster toggle (canonical: eye icon, bottom-left). */}
        <div className="absolute bottom-4 left-4 z-[1000]">
          <MapToolBtn
            label={clustered ? 'Uncluster assets' : 'Cluster assets'}
            active={clustered}
            onClick={() => setClustered((v) => !v)}
          >
            {clustered ? <Eye size={15} /> : <EyeOff size={15} />}
          </MapToolBtn>
        </div>

        {/* Legend — sits above the cluster toggle */}
        {data.legend?.length ? (
          <div className="absolute bottom-[68px] left-4 z-[900] rounded-lg border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
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
      ) : null}

      {/* ── Right side-sheet: Zones / POIs overlays ───────────────────────── */}
      {overlay ? (
        <aside className="flex w-[320px] shrink-0 flex-col overflow-hidden border-l border-border bg-card">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-3">
            <span className="text-body-sm font-semibold text-foreground">{overlay === 'zones' ? 'Zones' : 'Points of Interest'}</span>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOverlay(null)}
              className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={13} />
            </button>
          </div>
          <div className="shrink-0 border-b border-border p-2">
            <input
              value={overlayQuery}
              onChange={(e) => setOverlayQuery(e.target.value)}
              placeholder={overlay === 'zones' ? 'Search Zones' : 'Search POIs'}
              className="h-8 w-full rounded-md border border-border bg-card px-2.5 text-body-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {(() => {
            const isZone = overlay === 'zones';
            const items = overlayItems.filter((it) => !overlayQuery || it.name.toLowerCase().includes(overlayQuery.toLowerCase()));
            return (
              <>
                {/* Column headers — zones: Color · Name · Parent / POIs: Name · Coordinates */}
                <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                  <span className="w-4 shrink-0" />
                  <span className="w-[18px] shrink-0">{isZone ? 'Color' : ''}</span>
                  <span className="min-w-0 flex-1">Name</span>
                  <span className="shrink-0">{isZone ? 'Parent' : 'Coordinates'}</span>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  {items.map((it) => {
                    const on = (isZone ? enabledZones : enabledPois).has(it.id);
                    const color = it.color ?? (isZone ? '#12b76a' : '#7A5AF8');
                    const right = isZone
                      ? (it as MonitoringZone).parent
                      : `${(it as MonitoringPoi).position[0].toFixed(3)}, ${(it as MonitoringPoi).position[1].toFixed(3)}`;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => toggleId(isZone ? setEnabledZones : setEnabledPois, it.id)}
                        className="flex w-full items-center gap-2.5 border-b border-border px-3 py-2 text-left outline-none transition-colors hover:bg-muted/40"
                      >
                        <span className={cn('grid size-4 shrink-0 place-items-center rounded border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                          {on ? <Check size={10} /> : null}
                        </span>
                        {isZone ? (
                          <span aria-hidden className="size-[18px] shrink-0 rounded" style={{ background: color }} />
                        ) : (
                          <MapPin size={15} className="shrink-0" style={{ color }} aria-hidden />
                        )}
                        <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-foreground">{it.name}</span>
                        {right ? <span className="shrink-0 text-caption text-muted-foreground">{right}</span> : null}
                      </button>
                    );
                  })}
                  {!items.length ? (
                    <div className="px-3 py-6 text-center text-caption text-muted-foreground">None available.</div>
                  ) : null}
                </div>
              </>
            );
          })()}
        </aside>
      ) : null}
    </div>
  );
}
