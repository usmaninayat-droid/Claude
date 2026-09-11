import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button, Input, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { MapView, WeatherForecastPanel, buildFloodForecastPanelData, LiveMapTools, LIVE_BASEMAP_STYLES, LIVE_BASEMAP_DEFAULT_ID } from '../map';
import type { MapMarker, MapZone, MapViewHandle } from '../map';
import depotPinUrl from '../map/poi-pins/depot.svg';
import assemblyPinUrl from '../map/poi-pins/assembly.svg';
import dischargePinUrl from '../map/poi-pins/discharge.svg';
import { StatusPill } from './flood-plan-list';
import {
  FLOOD_STATUS_LABEL, ringCentroid,
  type FloodPlanCatalog, type FloodPlanRecord, type FloodPlanStatus,
} from './flood-plan-types';

/**
 * FloodPlanHybrid — Smart Planning's Hybrid View for MM Flood (FM-6366):
 * the plan list beside a map that shows where the response is planned and
 * what the weather is doing.
 *
 * Map layers, driven by Live Monitoring's map tools column (top-right):
 *   · Zones (zones tile)   — MM zone boundaries, shaded by roster state:
 *                            rostered plan(s) · un-rostered plan(s) · no plan
 *                            (neutral), with the plan count on each covered zone
 *   · POI (POI tile)       — plan overlays: depot · assembly point · discharge pins
 *   · Weather (weather tile) — weather stations with current readings + the
 *                            Open-Meteo / QMD forecast panel
 *
 * Interactions: click an area → the list shows every plan covering it; click
 * a plan pin → the plan detail sheet; Roster from the list → the roster
 * sheet (approved plans only); list filters (and the eye toggles) drive what
 * the map shows. No route line is ever drawn — a plan holds locations only.
 */

export interface FloodPlanHybridProps {
  plans: FloodPlanRecord[];
  catalog: FloodPlanCatalog;
  /** plan ids hidden from the map (eye toggle off). */
  hiddenOnMap: Set<string>;
  onToggleVisible: (id: string, visible: boolean) => void;
  onOpenPlan: (id: string) => void;
  onRoster: (plan: FloodPlanRecord) => void;
  renderCreateWizard?: (p: { open: boolean; onOpenChange: (open: boolean) => void }) => React.ReactNode;
  className?: string;
}

type Filters = { vehicle: string; workforce: string; status: '' | FloodPlanStatus; rostered: '' | 'yes' | 'no' };
const EMPTY_FILTERS: Filters = { vehicle: '', workforce: '', status: '', rostered: '' };

const ROSTERED = 'var(--status-success)';
const UNROSTERED = 'var(--status-warning)';
const NO_PLAN = 'var(--gray-400)';

/** Count badge for a planned area — an inline SVG so it rides MapView's pin pipeline. */
function countBadge(n: number, fill = '#101828'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="17" r="15" fill="${fill}" stroke="#fff" stroke-width="3"/><text x="17" y="22" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="#fff">${n}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: { id: string; name: string }[]; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-md border border-border bg-input-background px-2 text-body-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <option value="">All</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );
}

function EyeToggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={label} className={cn('relative grid size-8 place-items-center rounded-md transition-colors before:absolute before:-inset-3 before:content-[\'\']', on ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
      {on ? <Icons.Eye size={16} /> : <Icons.EyeOff size={16} />}
    </button>
  );
}

export function FloodPlanHybrid({ plans, catalog, hiddenOnMap, onToggleVisible, onOpenPlan, onRoster, renderCreateWizard, className }: FloodPlanHybridProps) {
  const [query, setQuery] = React.useState('');
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);
  const [zoneFocus, setZoneFocus] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const mapRef = React.useRef<MapViewHandle>(null);

  /* layer toggles — each independent */
  const [layers, setLayers] = React.useState({ zones: true, plans: true, weather: false });
  const [forecastExpanded, setForecastExpanded] = React.useState(false);
  /* Live Monitoring map tools: basemap switcher · traffic · POI (plan
   * overlays) · zones · weather (stations + forecast) · incidents */
  const [basemapId, setBasemapId] = React.useState(LIVE_BASEMAP_DEFAULT_ID);
  const basemap = LIVE_BASEMAP_STYLES.find((b) => b.id === basemapId) ?? LIVE_BASEMAP_STYLES[0];
  const [traffic, setTraffic] = React.useState(false);
  const [incidents, setIncidents] = React.useState(false);
  const forecastData = React.useMemo(() => buildFloodForecastPanelData(), []);
  const flip = (k: keyof typeof layers) => setLayers((l) => ({ ...l, [k]: !l[k] }));


  const zoneName = (id: string) => catalog.zones.find((z) => z.id === id)?.name ?? id;
  const vehicleName = (id?: string) => catalog.vehicleTypes.find((v) => v.id === id)?.name ?? '—';
  const live = React.useMemo(() => plans.filter((p) => p.status !== 'SUPERSEDED'), [plans]);

  /* list rows = search + filters + area focus; the map follows this same set */
  const q = query.trim().toLowerCase();
  // `filtered` = search + filters (drives coverage shading); `rows` adds the
  // area focus on top (drives the list and the plan pins) — so focusing one
  // area lists its plans without turning every other area "unplanned".
  const filtered = React.useMemo(() => live.filter((p) => {
    if (filters.vehicle && p.vehicleTypeId !== filters.vehicle) return false;
    if (filters.workforce && p.workforceTypeId !== filters.workforce) return false;
    if (filters.status && p.status !== filters.status) return false;
    if (filters.rostered === 'yes' && !p.roster.length) return false;
    if (filters.rostered === 'no' && p.roster.length) return false;
    if (q && !`${p.name} ${p.id} ${p.zoneIds.map(zoneName).join(' ')} ${vehicleName(p.vehicleTypeId)} ${FLOOD_STATUS_LABEL[p.status]}`.toLowerCase().includes(q)) return false;
    return true;
  }), [live, filters, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = React.useMemo(() => (zoneFocus ? filtered.filter((p) => p.zoneIds.includes(zoneFocus)) : filtered), [filtered, zoneFocus]);
  const activeFilters = Object.values(filters).filter(Boolean).length;
  /** plans drawn on the map: filtered + eye toggle (coverage); focus narrows the pins only. */
  const coveragePlans = React.useMemo(() => filtered.filter((p) => !hiddenOnMap.has(p.id)), [filtered, hiddenOnMap]);
  const mapPlans = React.useMemo(() => rows.filter((p) => !hiddenOnMap.has(p.id)), [rows, hiddenOnMap]);

  /* coverage — per zone, how many mapped plans cover it */
  const coverage = React.useMemo(() => {
    const m = new Map<string, FloodPlanRecord[]>();
    for (const z of catalog.zones) m.set(z.id, coveragePlans.filter((p) => p.zoneIds.includes(z.id)));
    return m;
  }, [catalog.zones, coveragePlans]);
  const rosteredCount = coveragePlans.filter((p) => p.roster.length > 0).length;
  const unrosteredCount = coveragePlans.length - rosteredCount;
  /** zone tint by roster state of the plans covering it */
  const zoneTone = (z: string) => { const ps = coverage.get(z) ?? []; return !ps.length ? NO_PLAN : ps.some((p) => p.roster.length > 0) ? ROSTERED : UNROSTERED; };
  const zoneToneHex = (z: string) => { const t = zoneTone(z); return t === ROSTERED ? '#12B76A' : t === UNROSTERED ? '#F79009' : '#101828'; };

  const zoneShapes: MapZone[] = React.useMemo(() => {
    if (!layers.zones) return [];
    return catalog.zones.map((z) => {
      const ps = coverage.get(z.id) ?? [];
      const n = ps.length;
      const focused = z.id === zoneFocus;
      const state = !n ? 'no plan' : ps.some((p) => p.roster.length > 0) ? 'rostered' : 'not rostered';
      return {
        id: z.id, points: z.points,
        label: `${z.name} · ${n ? `${n} plan${n === 1 ? '' : 's'} · ${state}` : 'no plan'}`,
        color: focused ? 'var(--primary)' : zoneTone(z.id),
        fillOpacity: focused ? 0.28 : n ? 0.18 : 0.06,
      };
    });
  }, [catalog.zones, coverage, layers.zones, zoneFocus]); // eslint-disable-line react-hooks/exhaustive-deps

  const markers: MapMarker[] = React.useMemo(() => {
    const out: MapMarker[] = [];
    if (layers.zones) {
      for (const z of catalog.zones) {
        const n = coverage.get(z.id)?.length ?? 0;
        if (n) out.push({ id: `count-${z.id}`, position: ringCentroid(z.points), iconUrl: countBadge(n, zoneToneHex(z.id)), iconSize: [34, 34], tooltip: `${z.name} · ${n} plan${n === 1 ? '' : 's'} · ${zoneTone(z.id) === ROSTERED ? 'rostered' : 'not rostered'}` });
      }
    }
    if (layers.plans) {
      const site = (id?: string) => catalog.sites.find((s) => s.id === id);
      for (const p of mapPlans) {
        for (const [key, url, label] of [['depotId', depotPinUrl, 'Depot'], ['assemblyId', assemblyPinUrl, 'Assembly'], ['dischargeId', dischargePinUrl, 'Discharge']] as const) {
          const s = site(p[key]);
          if (s) out.push({ id: `plan-${p.id}-${key}`, position: s.position, iconUrl: url, iconSize: [30, 36], tooltip: `${p.name} · ${label}: ${s.name}` });
        }
      }
    }
    if (layers.weather) {
      catalog.weatherStations.forEach((s, i) => {
        const mm = s.rainMm[0] ?? 0;
        const temp = 27 + ((i * 3) % 6);
        out.push({
          id: `ws-${s.id}`, position: s.position, kind: 'site',
          status: mm >= 15 ? 'critical' : mm >= 5 ? 'warning' : 'reporting',
          label: s.name,
          statusLabel: `${mm.toFixed(1)} mm · ${temp}°C`,
          tooltip: `${s.name} · ${mm.toFixed(1)} mm rain now · ${temp}°C`,
        });
      });
    }
    return out;
  }, [catalog, coverage, mapPlans, layers]); // eslint-disable-line react-hooks/exhaustive-deps


  const onMarkerClick = (id: string) => {
    if (id.startsWith('plan-')) { const planId = id.slice(5).replace(/-(depotId|assemblyId|dischargeId)$/, ''); onOpenPlan(planId); return; }
    if (id.startsWith('count-')) { const z = id.slice(6); setZoneFocus((cur) => (cur === z ? null : z)); return; }
    if (catalog.zones.some((z) => z.id === id)) { setZoneFocus((cur) => (cur === id ? null : id)); return; }
  };

  const statusOptions = (['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED'] as FloodPlanStatus[]).map((s) => ({ id: s, name: FLOOD_STATUS_LABEL[s] }));

  return (
    <div className={cn('flex h-full min-h-0', className)}>
      {/* ── left: plan list ────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="flex w-[590px] min-w-[420px] max-w-[52%] flex-col border-r border-border">
          <div className="flex items-center gap-2.5 p-4">
            <div className="relative flex-1">
              <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search plans" className="pl-8" />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" aria-label="Filter" className={cn('relative grid size-10 shrink-0 place-items-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground', activeFilters ? 'border-primary text-primary' : 'border-border')}>
                  <Icons.FilterFunnel02 size={16} />
                  {activeFilters > 0 && <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">{activeFilters}</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="flex w-[420px] flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-semibold text-foreground">Filter plans · the map follows</span>
                  <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="text-body-xs font-medium text-primary hover:underline">Clear all</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FilterSelect label="Vehicle type" value={filters.vehicle} options={catalog.vehicleTypes} onChange={(v) => setFilters((f) => ({ ...f, vehicle: v }))} />
                  <FilterSelect label="Workforce type" value={filters.workforce} options={catalog.workforceTypes} onChange={(v) => setFilters((f) => ({ ...f, workforce: v }))} />
                  <FilterSelect label="Status" value={filters.status} options={statusOptions} onChange={(v) => setFilters((f) => ({ ...f, status: v as Filters['status'] }))} />
                  <FilterSelect label="Rostered" value={filters.rostered} options={[{ id: 'yes', name: 'Rostered' }, { id: 'no', name: 'Not rostered' }]} onChange={(v) => setFilters((f) => ({ ...f, rostered: v as Filters['rostered'] }))} />
                </div>
                <p className="text-body-xs text-muted-foreground">Zone is chosen by clicking an area on the map.</p>
              </PopoverContent>
            </Popover>
            <Button variant="primary" onClick={() => setCreating(true)}><Icons.Plus size={16} className="mr-1.5" />Create New Plan</Button>
          </div>

          {/* area focus chip — "every plan covering that area" */}
          {zoneFocus && (
            <div className="flex items-center gap-2 border-t border-border bg-primary/[0.05] px-4 py-2 text-body-sm">
              <Icons.Map01 size={14} className="text-primary" />
              <span className="text-foreground">Plans covering <span className="font-semibold">{zoneName(zoneFocus)}</span></span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-caption font-semibold text-primary">{rows.length}</span>
              <button type="button" onClick={() => setZoneFocus(null)} aria-label="Clear area" className="ml-auto grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><Icons.XClose size={14} /></button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-[1] bg-card">
                <tr className="border-y border-border text-caption font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="w-10 px-3 py-2.5" />
                  <th className="px-2 py-2.5 text-left">Plan</th>
                  <th className="px-2 py-2.5 text-left">Zones</th>
                  <th className="px-2 py-2.5 text-left">Vehicle Type</th>
                  <th className="px-2 py-2.5 text-left">Status</th>
                  <th className="px-2 py-2.5 text-right" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const on = !hiddenOnMap.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpenPlan(p.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenPlan(p.id); } }}
                      className={cn('cursor-pointer border-b border-border/70 hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-[var(--primary)]', p.status === 'REJECTED' && 'bg-[color-mix(in_srgb,var(--status-error)_6%,transparent)]')}
                    >
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}><EyeToggle on={on} onClick={() => onToggleVisible(p.id, !on)} label={on ? 'Hide on map' : 'Show on map'} /></td>
                      <td className="px-2 py-2.5">
                        <span className="flex flex-col"><span className="text-body-sm font-semibold text-foreground">{p.name}</span><span className="text-body-xs text-muted-foreground">{p.id} · v{p.version}</span></span>
                      </td>
                      <td className="px-2 py-2.5">
                        <span className="flex flex-col gap-0.5">
                          {p.zoneIds.slice(0, 2).map((z) => <span key={z} className="inline-flex items-center gap-1 text-body-sm text-foreground"><Icons.MarkerPin01 size={12} className="text-muted-foreground" />{zoneName(z)}</span>)}
                          {p.zoneIds.length > 2 && <span className="pl-4 text-body-xs text-muted-foreground">+{p.zoneIds.length - 2} more</span>}
                        </span>
                      </td>
                      <td className="px-2 py-2.5"><span className="inline-flex items-center gap-1.5 text-body-sm text-foreground"><Icons.Truck02 size={16} className="text-muted-foreground" />{vehicleName(p.vehicleTypeId)}</span></td>
                      <td className="px-2 py-2.5"><StatusPill status={p.status} /></td>
                      <td className="px-2 py-2.5 text-right" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <Button variant="secondary" size="sm" disabled={p.status !== 'APPROVED'} title={p.status === 'APPROVED' ? 'Assign roster' : 'Only approved plans can be rostered'} onClick={() => onRoster(p)}>
                          <Icons.CalendarPlus01 size={14} className="mr-1" />Roster
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-body-sm text-muted-foreground">{zoneFocus ? `No plan covers ${zoneName(zoneFocus)} yet.` : 'No plans match.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button type="button" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Show list' : 'Hide list'} className="grid w-4 shrink-0 place-items-center border-r border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        {collapsed ? <Icons.ChevronRight size={14} /> : <Icons.ChevronLeft size={14} />}
      </button>

      {/* ── right: map ─────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        <MapView
          ref={mapRef}
          center={catalog.center}
          zoom={catalog.zoom ?? 10}
          zones={zoneShapes}
          markers={markers}
          styleUrl={basemap.style}
          onMarkerClick={onMarkerClick}
          showReset={false}
          showLocate
          controlsPosition="bottom-right"
          className="h-full w-full"
        />

        {/* legend (top-left): roster state of the areas + what the pins mean */}
        <div className="absolute left-4 top-4 z-[400] flex items-center gap-4 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
          <span className="flex items-center gap-1.5 text-body-sm font-medium text-foreground"><span className="size-2.5 rounded-full" style={{ background: ROSTERED }} />Rostered plans <span className="text-muted-foreground">{rosteredCount}</span></span>
          <span className="flex items-center gap-1.5 text-body-sm font-medium text-foreground"><span className="size-2.5 rounded-full" style={{ background: UNROSTERED }} />Un-rostered plans</span>
          <span className="rounded-full px-2 py-0.5 text-caption font-bold text-white" style={{ background: UNROSTERED }} aria-label={`${unrosteredCount} un-rostered plans`}>{unrosteredCount}</span>
          {layers.plans && (
            <>
              <span className="h-4 w-px bg-border" aria-hidden />
              <span className="flex items-center gap-1.5 text-body-sm font-medium text-foreground"><img src={depotPinUrl} alt="" className="h-4 w-[14px] object-contain" />Depot</span>
              <span className="flex items-center gap-1.5 text-body-sm font-medium text-foreground"><img src={assemblyPinUrl} alt="" className="h-4 w-[14px] object-contain" />Assembly</span>
              <span className="flex items-center gap-1.5 text-body-sm font-medium text-foreground"><img src={dischargePinUrl} alt="" className="h-4 w-[14px] object-contain" />Discharge</span>
            </>
          )}
          {zoneFocus && <span className="text-body-xs text-muted-foreground">· click the area again to clear</span>}
        </div>

        {/* Live Monitoring's map tools (top-right column) */}
        <LiveMapTools
          className="absolute right-4 top-4 z-[400]"
          activeBasemapId={basemapId}
          onBasemapChange={setBasemapId}
          trafficActive={traffic}
          onTrafficToggle={() => setTraffic((v) => !v)}
          poiOpen={layers.plans}
          onPoiToggle={() => flip('plans')}
          zonesOpen={layers.zones}
          onZonesToggle={() => flip('zones')}
          weatherActive={layers.weather}
          onWeatherToggle={() => flip('weather')}
          incidentsActive={incidents}
          onIncidentsToggle={() => setIncidents((v) => !v)}
        />

        {/* forecast layer — Live Monitoring's weather forecast panel
            (Open-Meteo · QMD), anchored to the map's bottom edge verbatim */}
        {layers.weather && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[400] flex justify-end">
            <WeatherForecastPanel data={forecastData} expanded={forecastExpanded} onExpandedChange={setForecastExpanded} />
          </div>
        )}
      </div>

      {renderCreateWizard?.({ open: creating, onOpenChange: setCreating })}
    </div>
  );
}
