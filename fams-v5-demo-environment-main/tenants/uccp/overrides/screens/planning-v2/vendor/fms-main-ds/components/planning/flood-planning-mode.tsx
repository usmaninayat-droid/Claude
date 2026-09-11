import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { MapView, WeatherForecastPanel, buildFloodForecastPanelData, LiveMapTools, LIVE_BASEMAP_STYLES, LIVE_BASEMAP_DEFAULT_ID } from '../map';
import type { LatLng, MapMarker, MapZone, MapViewHandle, MapRoute } from '../map';
import { optimizeDepotAssemblyRoute } from './flood-route';
import depotPinUrl from '../map/poi-pins/depot.svg';
import assemblyPinUrl from '../map/poi-pins/assembly.svg';
import dischargePinUrl from '../map/poi-pins/discharge.svg';
import {
  forecastDays,
  type FloodPlanCatalog, type FloodPlanDraft, type FloodSiteKind, type FloodSiteOption,
} from './flood-plan-types';

/**
 * FloodPlanningMode — the full-screen "Planning Mode" of the MM Flood Create
 * New Plan flow (FM-6364). Figma qLpsvk0JRDQ7CBoV96s0eU · 2007-88754
 * (rail · Resource Allocation) → 2007-88886 / 2007-89361 (select panel) →
 * 2007-90425 (zones side sheet) → 2007-90965 (Start Depot) → 2007-92632
 * (Discharge Station).
 *
 * Flood service rules (see flood-plan-types.ts): the rail has NO Service
 * Schedule, Resource Allocation asks for a vehicle TYPE + workforce TYPE only
 * (inspector assignment happens at rostering, not here), and there is no
 * Optimize Route beyond the depot → assembly leg.
 *
 * Interactive planning maps ONE zone: the "Select zone" field opens the zones
 * side sheet on the right, picking a zone there (or clicking a zone polygon
 * while none is selected) replaces the selection. Once a zone is selected the
 * map shows only that zone and the chosen Start Depot / Assembly Point /
 * Discharge Station pins (plus the depot → assembly route) — all other zones,
 * existing-plan overlays and weather stations are removed from the map. The
 * map carries Live Monitoring's control column (basemap switcher · traffic ·
 * POI · zones · weather · incidents, vendored in `../map/live-map-tools`):
 * POI reveals the zone's candidate sites, zones opens the side sheet and
 * weather shows the Open-Meteo / QMD forecast panel.
 *
 * Brand law: Figma's Tadweer green → FAMS `--primary`; green/amber/red only
 * for genuine status (available pill, risk swatches, close-X).
 */

export interface FloodPlanningModeProps {
  catalog: FloodPlanCatalog;
  draft: FloodPlanDraft;
  onClose: () => void;
  onConfirm: (draft: FloodPlanDraft) => void;
  className?: string;
}

type RailSection = 'resources' | 'depot' | 'assembly' | 'discharge';
type SelectPanel = 'vehicle' | 'workforce' | null;

const GREY_ZONE = 'var(--gray-400)';

/* ── rail atoms ─────────────────────────────────────────────────────────── */

function RailHeader({ label, open, onToggle, bold = true }: { label: string; open: boolean; onToggle: () => void; bold?: boolean }) {
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-center gap-0.5 text-left" aria-expanded={open}>
      {open ? <Icons.ChevronDown size={16} className="text-[var(--gray-900)]" /> : <Icons.ChevronRight size={16} className="text-[var(--gray-900)]" />}
      <span className={cn('text-[14px] text-[var(--gray-900)]', bold ? 'font-bold' : 'font-semibold')}>{label}</span>
    </button>
  );
}

/** Figma 2007-88798 (empty) / 2007-89851 (filled) — 48px field w/ 16px icon. */
function RailField({ icon, label, value, onClick, disabled }: { icon: React.ReactNode; label: string; value?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-full items-center gap-2 overflow-hidden rounded-[4px] border border-[var(--gray-300)] bg-card px-3 py-2 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <span className="shrink-0 text-[var(--gray-500)]">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {value ? (
          <>
            <span className="truncate text-[10px] font-semibold text-[var(--gray-500)]">{label}</span>
            <span className="truncate text-[14px] font-semibold text-[var(--gray-900)]">{value}</span>
          </>
        ) : (
          <span className="truncate text-[14px] font-semibold text-[var(--gray-400)]">{label}</span>
        )}
      </span>
      <Icons.ChevronDown size={12} className="shrink-0 text-[var(--gray-500)]" />
    </button>
  );
}

/** Figma 2007-91004 — radio + pin + name rows (Start Depot / Assembly / Discharge). */
function SiteRadioList({ kind, options, value, onChange, emptyHint }: { kind: FloodSiteKind; options: FloodSiteOption[]; value?: string; onChange: (id: string) => void; emptyHint: string }) {
  const pin = kind === 'depot' ? depotPinUrl : kind === 'assembly' ? assemblyPinUrl : dischargePinUrl;
  if (!options.length) return <p className="pl-[18px] text-[12px] font-medium text-[var(--gray-500)]">{emptyHint}</p>;
  return (
    <div role="radiogroup" className="flex flex-col gap-3">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.id)} className="flex items-center gap-2 text-left">
            <span className={cn('grid size-4 shrink-0 place-items-center rounded-full border', on ? 'border-[var(--status-success)]' : 'border-[var(--gray-300)]')}>
              {on && <span className="size-2 rounded-full bg-[var(--status-success)]" />}
            </span>
            <img src={pin} alt="" className="h-5 w-[18px] shrink-0 object-contain" />
            <span className="truncate text-[14px] font-semibold text-[var(--gray-900)]">{o.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── select side panel (Figma 2007-89018 "Select Vehicle") ─────────────── */

interface PanelRow { id: string; title: string; meta: { icon: React.ReactNode; text: string }[]; available: boolean; leading?: React.ReactNode }

function SelectPanelSheet({ title, subtitle, sectionLabel, rows, value, onSelect, onClose, searchPlaceholder }: {
  title: string; subtitle: string; sectionLabel: string; rows: PanelRow[]; value?: string; onSelect: (id: string) => void; onClose: () => void; searchPlaceholder: string;
}) {
  const [q, setQ] = React.useState('');
  const shown = rows.filter((r) => !q || r.title.toLowerCase().includes(q.toLowerCase()) || r.meta.some((m) => m.text.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="absolute inset-y-0 right-0 z-[500] flex items-center gap-10 pl-10" style={{ width: 780 }}>
      {/* scrim over the map + rail */}
      <button type="button" aria-label="Close panel" onClick={onClose} className="absolute inset-y-0 right-0 -left-[100vw] cursor-default bg-[var(--gray-900)]/40" />
      <button type="button" onClick={onClose} aria-label="Close" className="relative z-10 grid size-[58px] shrink-0 place-items-center rounded-full bg-white text-[var(--gray-900)] shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
        <Icons.XClose size={24} />
      </button>
      <div className="relative z-10 flex h-full min-w-0 flex-1 flex-col gap-5 bg-white p-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-[18px] font-bold text-black">{title}</h3>
          <p className="text-[14px] font-medium text-[var(--gray-500)]">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex h-9 flex-1 items-center gap-2 rounded-[4px] border border-[var(--gray-300)] bg-white px-2">
            <Icons.SearchRefraction size={16} className="text-[var(--gray-500)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="w-full bg-transparent text-[12px] font-medium text-[var(--gray-900)] outline-none placeholder:text-[var(--gray-400)]" />
          </label>
          <button type="button" aria-label="Filter" className="grid size-9 shrink-0 place-items-center rounded-[4px] border border-[var(--gray-300)] text-[var(--gray-500)]"><Icons.FilterFunnel02 size={16} /></button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          <span className="pb-2 text-[12px] font-semibold text-[var(--gray-500)]">{sectionLabel}</span>
          <div role="radiogroup" className="flex flex-col">
            {shown.map((r) => {
              const on = r.id === value;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={!r.available}
                  onClick={() => onSelect(r.id)}
                  className={cn('flex h-[52px] items-center gap-3 border-b border-[var(--gray-200)] px-2 text-left transition-colors hover:bg-muted/40 disabled:opacity-60', on && 'bg-primary/[0.04]')}
                >
                  <span className={cn('grid size-4 shrink-0 place-items-center rounded-full border', on ? 'border-primary' : 'border-[var(--gray-300)]')}>{on && <span className="size-2 rounded-full bg-primary" />}</span>
                  {r.leading}
                  <span className="min-w-0 flex-1 text-[16px] font-medium text-[var(--gray-900)]">{r.title}</span>
                  <span className="flex items-center gap-4">
                    {r.meta.map((m, i) => (
                      <span key={i} className="flex items-center gap-1 text-[12px] font-medium text-[var(--gray-700)]"><span className="text-[var(--gray-500)]">{m.icon}</span>{m.text}</span>
                    ))}
                    <span className={cn('rounded-[4px] px-1.5 py-[3px] text-[12px] font-semibold uppercase tracking-[0.48px] text-white', r.available ? 'bg-[var(--status-success)]' : 'bg-[var(--gray-400)]')}>{r.available ? 'Available' : 'Unavailable'}</span>
                  </span>
                </button>
              );
            })}
            {!shown.length && <p className="py-6 text-center text-[12px] font-medium text-[var(--gray-500)]">No matches</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── zones side sheet (Figma 2007-90425) — single select ────────────────── */

function ZonesPanel({ catalog, value, onSelect, onClose }: { catalog: FloodPlanCatalog; value?: string; onSelect: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = React.useState('');
  const zones = catalog.zones.filter((z) => !q || z.name.toLowerCase().includes(q.toLowerCase()) || z.code.toLowerCase().includes(q.toLowerCase()) || z.tags.some((t) => t.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="absolute inset-y-0 right-0 z-[450] flex w-[310px] flex-col gap-4 border-l border-[var(--gray-200)] bg-white px-5 py-4 shadow-[-6px_0_8px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[14px] font-bold text-[var(--gray-900)]">Select Zone</span>
          <span className="text-[12px] font-medium text-[var(--gray-500)]">One zone per plan</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close zones" className="relative grid size-8 place-items-center rounded-[4px] before:absolute before:-inset-2 before:content-[''] text-[var(--gray-500)] hover:bg-muted"><Icons.XClose size={16} /></button>
      </div>
      <label className="flex h-9 items-center gap-2 rounded-[4px] border border-[var(--gray-300)] px-2">
        <Icons.SearchRefraction size={16} className="text-[var(--gray-500)]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search zone, code or tag" className="w-full bg-transparent text-[12px] font-medium text-[var(--gray-900)] outline-none placeholder:text-[var(--gray-500)]" />
      </label>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-8 items-center">
          <span className="w-6" />
          <span className="flex-1 p-2.5 text-[10px] font-bold uppercase tracking-[0.8px] text-[var(--gray-500)]/70">Zone</span>
          <span className="p-2.5 text-[10px] font-bold uppercase tracking-[0.8px] text-[var(--gray-500)]/70">Tags</span>
        </div>
        <div role="radiogroup" className="min-h-0 flex-1 overflow-auto py-1">
          {zones.map((z) => {
            const on = z.id === value;
            return (
              <button
                key={z.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onSelect(z.id)}
                className={cn('flex h-12 w-full items-center border-b border-[var(--gray-200)] text-left transition-colors hover:bg-muted/40', on && 'bg-primary/[0.04]')}
                title={z.name}
              >
                <span className="grid w-6 shrink-0 place-items-center">
                  <span className={cn('grid size-4 place-items-center rounded-full border', on ? 'border-primary' : 'border-[var(--gray-300)]')}>{on && <span className="size-2 rounded-full bg-primary" />}</span>
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2 px-2.5">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: z.color }} />
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-[12px] font-semibold text-[var(--gray-900)]">{z.name}</span>
                    <span className="truncate text-[10px] font-medium text-[var(--gray-500)]">{z.code} · {z.municipality}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 pr-2">
                  <span className="max-w-[72px] truncate rounded-[4px] bg-[var(--status-warning)]/10 px-2 py-1 text-[11px] font-medium text-[var(--status-warning)]">{z.tags[0]}</span>
                  {z.tags.length > 1 && <span className="rounded-[4px] bg-[var(--status-warning)]/10 px-1.5 py-1 text-[11px] font-medium text-[var(--status-warning)]">+{z.tags.length - 1}</span>}
                </span>
              </button>
            );
          })}
          {!zones.length && <p className="py-6 text-center text-[12px] font-medium text-[var(--gray-500)]">No matches</p>}
        </div>
      </div>
    </div>
  );
}

/* ── main ───────────────────────────────────────────────────────────────── */

export function FloodPlanningMode({ catalog, draft, onClose, onConfirm, className }: FloodPlanningModeProps) {
  const [local, setLocal] = React.useState<FloodPlanDraft>(draft);
  const set = <K extends keyof FloodPlanDraft>(k: K, v: FloodPlanDraft[K]) => setLocal((d) => ({ ...d, [k]: v }));

  const [open, setOpen] = React.useState<Record<RailSection, boolean>>({ resources: true, depot: false, assembly: false, discharge: false });
  const toggle = (k: RailSection) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const [panel, setPanel] = React.useState<SelectPanel>(null);
  const [zonesOpen, setZonesOpen] = React.useState(false);
  const [railCollapsed, setRailCollapsed] = React.useState(false);
  const mapRef = React.useRef<MapViewHandle>(null);

  /* Live Monitoring map tools state */
  const [basemapId, setBasemapId] = React.useState(LIVE_BASEMAP_DEFAULT_ID);
  const basemap = LIVE_BASEMAP_STYLES.find((b) => b.id === basemapId) ?? LIVE_BASEMAP_STYLES[0];
  const [traffic, setTraffic] = React.useState(false);
  const [weather, setWeather] = React.useState(false);
  const [incidents, setIncidents] = React.useState(false);
  const [poiOpen, setPoiOpen] = React.useState(false);
  const [forecastExpanded, setForecastExpanded] = React.useState(false);
  const forecastData = React.useMemo(() => buildFloodForecastPanelData(), []);

  // the plan's forecast date defaults to today (no date strip on this map)
  React.useEffect(() => { if (!local.forecastDate) set('forecastDate', forecastDays()[0].iso); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = React.useMemo(() => new Set(local.zoneIds), [local.zoneIds]);
  const zoneId = local.zoneIds.length === 1 ? local.zoneIds[0] : undefined;
  const zone = catalog.zones.find((z) => z.id === zoneId);

  /* one zone per plan — selecting replaces; depot / assembly / discharge must
   * stay inside the plan's zone, so they are dropped when the zone changes. */
  const setZones = (ids: string[]) => setLocal((d) => {
    const keep = (sid?: string) => (sid && ids.includes(catalog.sites.find((s) => s.id === sid)?.zoneId ?? '') ? sid : undefined);
    return { ...d, zoneIds: ids, depotId: keep(d.depotId), assemblyId: keep(d.assemblyId), dischargeId: keep(d.dischargeId) };
  });
  const selectZone = (id: string) => { setZones([id]); setZonesOpen(false); };
  const removeZone = (id: string) => setZones(local.zoneIds.filter((z) => z !== id));

  // A freshly selected zone opens the three site pickers so the next steps are visible.
  React.useEffect(() => {
    if (zoneId) setOpen((o) => ({ ...o, depot: true, assembly: true, discharge: true }));
  }, [zoneId]);

  const sitesOf = (kind: FloodSiteKind) => catalog.sites.filter((s) => s.kind === kind && selected.has(s.zoneId));
  const vehicle = catalog.vehicleTypes.find((v) => v.id === local.vehicleTypeId);
  const workforce = catalog.workforceTypes.find((w) => w.id === local.workforceTypeId);
  const canConfirm = !!zoneId && !!local.vehicleTypeId && !!local.workforceTypeId && !!local.depotId && !!local.assemblyId && !!local.dischargeId;

  /* map layers — before a zone is picked every zone is shown (grey, clickable);
   * once picked, ONLY the plan zone and its chosen points remain. */
  const zones: MapZone[] = React.useMemo(() => {
    const shown = selected.size ? catalog.zones.filter((z) => selected.has(z.id)) : catalog.zones;
    return shown.map((z) => ({
      id: z.id, points: z.points, label: `${z.code} · ${z.name}`,
      color: selected.has(z.id) ? 'var(--primary)' : GREY_ZONE,
      fillOpacity: selected.has(z.id) ? 0.28 : 0.08,
    }));
  }, [catalog, selected]);

  const markers: MapMarker[] = React.useMemo(() => {
    const out: MapMarker[] = [];
    const pin = (id: string | undefined, url: string, label: string) => {
      const s = catalog.sites.find((x) => x.id === id);
      if (s) out.push({ id: `site-${s.id}`, position: s.position, label, tooltip: s.name, iconUrl: url, iconSize: [34, 40] });
    };
    pin(local.depotId, depotPinUrl, 'Start Depot');
    pin(local.assemblyId, assemblyPinUrl, 'Assembly Point');
    pin(local.dischargeId, dischargePinUrl, 'Discharge Point');
    // POI tool: the zone's candidate sites, faded, so a point can be chosen from the map
    if (poiOpen && zoneId) {
      const chosen = new Set([local.depotId, local.assemblyId, local.dischargeId]);
      for (const s of catalog.sites) {
        if (s.zoneId !== zoneId || chosen.has(s.id)) continue;
        const url = s.kind === 'depot' ? depotPinUrl : s.kind === 'assembly' ? assemblyPinUrl : dischargePinUrl;
        out.push({ id: `poi-${s.id}`, position: s.position, tooltip: s.name, iconUrl: url, iconSize: [26, 30], opacity: 0.55 });
      }
    }
    return out;
  }, [catalog, local.depotId, local.assemblyId, local.dischargeId, poiOpen, zoneId]);

  /* frame the plan zone together with its candidate sites when it changes;
   * with no zone selected, frame every zone so one can be picked on the map. */
  React.useEffect(() => {
    const pts: LatLng[] = zone
      ? [...zone.points, ...catalog.sites.filter((s) => s.zoneId === zone.id).map((s) => s.position)]
      : selected.size ? [] : catalog.zones.flatMap((z) => z.points);
    if (!pts.length) return;
    const t = window.setTimeout(() => mapRef.current?.fitTo(pts, { padding: 80, maxZoom: zone ? 13 : 11 }), 50);
    return () => window.clearTimeout(t);
  }, [zone, selected, catalog]);

  /* FM-6353 AC — route optimisation runs for depot → assembly ONLY; no route
   * inside the zone or to the discharge station (driver nav is Google Maps). */
  const optimized = React.useMemo(
    () => optimizeDepotAssemblyRoute(catalog.sites.find((s) => s.id === local.depotId), catalog.sites.find((s) => s.id === local.assemblyId)),
    [catalog.sites, local.depotId, local.assemblyId],
  );
  const routes: MapRoute[] = React.useMemo(
    () => (optimized ? [{ id: 'depot-assembly', points: optimized.points, color: 'var(--status-info)', weight: 4 }] : []),
    [optimized],
  );

  // FM-6353 change request: the select panels list ONLY resources actually
  // available to do the task — an unavailable type never appears.
  const panelRows: PanelRow[] = panel === 'vehicle'
    ? catalog.vehicleTypes.filter((v) => v.available > 0).map((v) => ({
        id: v.id, title: v.name, available: v.available > 0,
        leading: <span className="grid h-6 w-[45px] shrink-0 place-items-center text-[var(--gray-700)]"><Icons.Truck02 size={24} /></span>,
        meta: [{ icon: <Icons.Droplets02 size={14} />, text: v.capacity }, { icon: <Icons.CheckCircle size={14} />, text: `${v.available} available` }],
      }))
    : panel === 'workforce'
    ? catalog.workforceTypes.filter((w) => w.available > 0).map((w) => ({
        id: w.id, title: w.name, available: w.available > 0,
        leading: <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--gray-200)] text-[var(--gray-700)]"><Icons.Users02 size={16} /></span>,
        meta: [{ icon: <Icons.Users01 size={14} />, text: w.crewSize }, { icon: <Icons.CheckCircle size={14} />, text: `${w.available} available` }],
      }))
    : [];

  const zoneHint = local.zoneIds.length > 1
    ? 'Interactive planning maps one zone — remove the extra zones or pick one from the list.'
    : 'Pick a zone from the list or click one on the map.';

  return (
    <div className={cn('relative flex h-full min-h-0 bg-card', className)}>
      {/* ── left rail (Figma 2007-88755) ─────────────────────────────── */}
      <div className={cn('flex shrink-0 flex-col border-r border-[var(--gray-200)] bg-white transition-[width]', railCollapsed ? 'w-[64px]' : 'w-[262px]')}>
        <div className="flex h-11 items-center gap-2 border-b border-[var(--gray-200)] bg-[var(--gray-50)] px-5">
          <button type="button" onClick={onClose} aria-label="Close planning mode" className="relative grid size-5 shrink-0 place-items-center rounded-full bg-[var(--status-error)] text-white before:absolute before:-inset-3 before:content-[''] hover:opacity-90"><Icons.XClose size={12} /></button>
          {!railCollapsed && <span className="flex-1 truncate text-[16px] font-semibold text-[var(--gray-900)]">Planning Mode</span>}
          <button type="button" onClick={() => setRailCollapsed((c) => !c)} aria-label={railCollapsed ? 'Expand rail' : 'Collapse rail'} className="relative ml-auto grid size-6 place-items-center rounded-[2px] bg-[var(--gray-200)] text-[var(--gray-700)] before:absolute before:-inset-3 before:content-['']"><Icons.FlexAlignLeft size={16} /></button>
        </div>

        {!railCollapsed && (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto px-5 pb-5 pt-3">
              <div className="flex flex-col gap-2.5">
                <RailHeader label="Resource Allocation" open={open.resources} onToggle={() => toggle('resources')} />
                {open.resources && (
                  <div className="flex flex-col gap-3">
                    <RailField icon={<Icons.Truck02 size={16} />} label="Select Vehicle Type" value={vehicle?.name} onClick={() => setPanel('vehicle')} />
                    <RailField icon={<Icons.Users02 size={16} />} label="Select Workforce Type" value={workforce?.name} onClick={() => setPanel('workforce')} />
                  </div>
                )}
              </div>
              <div className="h-px w-full bg-[var(--gray-200)]" />
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-[var(--gray-900)]">Plan Zone</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', zoneId ? 'bg-primary/10 text-primary' : 'bg-[var(--gray-100)] text-[var(--gray-500)]')}>{local.zoneIds.length} selected</span>
                </div>
                <RailField icon={<Icons.MarkerPin01 size={16} />} label={zoneId ? 'Change zone' : 'Select zone'} value={zone?.name} onClick={() => setZonesOpen(true)} />
                {local.zoneIds.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {local.zoneIds.map((id) => {
                      const z = catalog.zones.find((x) => x.id === id);
                      return z ? (
                        <button key={id} type="button" onClick={() => removeZone(id)} title="Remove zone" className="flex items-center gap-1 rounded-[4px] border border-[var(--gray-300)] bg-white px-2 py-1 text-[12px] font-medium text-[var(--gray-900)] hover:border-primary">
                          <span className="size-2 rounded-full" style={{ background: z.color }} />{z.name}<Icons.XClose size={10} className="text-[var(--gray-500)]" />
                        </button>
                      ) : null;
                    })}
                  </div>
                ) : null}
                {!zoneId && <p className="text-[12px] font-medium text-[var(--gray-500)]">{zoneHint}</p>}
              </div>
              <div className="h-px w-full bg-[var(--gray-200)]" />
              <div className="flex flex-col gap-2.5">
                <RailHeader label="Start Depot" open={open.depot} onToggle={() => toggle('depot')} bold={false} />
                {open.depot && <SiteRadioList kind="depot" options={sitesOf('depot')} value={local.depotId} onChange={(id) => set('depotId', id)} emptyHint="Select a zone to list its depots." />}
              </div>
              <div className="flex flex-col gap-2.5">
                <RailHeader label="Assembly Point" open={open.assembly} onToggle={() => toggle('assembly')} bold={false} />
                {open.assembly && <SiteRadioList kind="assembly" options={sitesOf('assembly')} value={local.assemblyId} onChange={(id) => set('assemblyId', id)} emptyHint="Select a zone to list its assembly points." />}
              </div>
              <div className="flex flex-col gap-2.5">
                <RailHeader label="Discharge Station" open={open.discharge} onToggle={() => toggle('discharge')} bold={false} />
                {open.discharge && <SiteRadioList kind="discharge" options={sitesOf('discharge')} value={local.dischargeId} onChange={(id) => set('dischargeId', id)} emptyHint="Select a zone to list its discharge stations." />}
              </div>
            </div>
            <div className="px-4 pb-5 pt-3">
              <button
                type="button"
                disabled={!canConfirm}
                onClick={() => onConfirm(local)}
                className={cn('flex h-10 w-full items-center justify-center rounded-[4px] text-[16px] font-semibold text-white transition-colors', canConfirm ? 'bg-primary hover:opacity-90' : 'bg-primary/30')}
              >
                Confirm Selection
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── map ─────────────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        <MapView
          ref={mapRef}
          center={catalog.center}
          zoom={catalog.zoom ?? 10}
          zones={zones}
          markers={markers}
          routes={routes}
          showReset={false}
          controlsPosition="bottom-right"
          styleUrl={basemap.style}
          onMarkerClick={(id) => {
            // a zone polygon is a click target only while choosing the zone
            if (!zoneId && catalog.zones.some((z) => z.id === id)) selectZone(id);
            // a faded POI pin picks that site
            if (id.startsWith('poi-')) {
              const s = catalog.sites.find((x) => x.id === id.slice(4));
              if (s) set(s.kind === 'depot' ? 'depotId' : s.kind === 'assembly' ? 'assemblyId' : 'dischargeId', s.id);
            }
          }}
          className="h-full w-full"
        />

        {/* legend */}
        <div className="absolute left-4 top-4 z-[400] flex items-center gap-4 rounded-[4px] border border-[var(--gray-200)] bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--gray-900)]"><span className="size-2.5 rounded-full bg-primary" />Plan zone</span>
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--gray-900)]"><img src={depotPinUrl} alt="" className="h-4 w-[14px] object-contain" />Start Depot</span>
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--gray-900)]"><img src={assemblyPinUrl} alt="" className="h-4 w-[14px] object-contain" />Assembly Point</span>
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--gray-900)]"><img src={dischargePinUrl} alt="" className="h-4 w-[14px] object-contain" />Discharge Station</span>
          {optimized && (
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--gray-900)]">
              <Icons.Route size={14} className="text-[var(--status-info)]" />
              Depot → Assembly · {optimized.km.toFixed(1)} km · ~{optimized.mins} min
            </span>
          )}
        </div>

        {/* Live Monitoring's map tools (top-end column) */}
        <LiveMapTools
          className={cn('absolute top-4 z-[460] transition-[right]', zonesOpen ? 'right-[326px]' : 'right-4')}
          activeBasemapId={basemapId}
          onBasemapChange={setBasemapId}
          trafficActive={traffic}
          onTrafficToggle={() => setTraffic((v) => !v)}
          poiOpen={poiOpen}
          onPoiToggle={() => setPoiOpen((v) => !v)}
          zonesOpen={zonesOpen}
          onZonesToggle={() => setZonesOpen((o) => !o)}
          weatherActive={weather}
          onWeatherToggle={() => setWeather((v) => !v)}
          incidentsActive={incidents}
          onIncidentsToggle={() => setIncidents((v) => !v)}
        />

        {/* weather layer — Live Monitoring's forecast panel (Open-Meteo · QMD) */}
        {weather && (
          <div className={cn('pointer-events-none absolute bottom-4 left-4 z-[440] flex justify-end', zonesOpen ? 'right-[326px]' : 'right-[72px]')}>
            <WeatherForecastPanel data={forecastData} expanded={forecastExpanded} onExpandedChange={setForecastExpanded} />
          </div>
        )}

        {zonesOpen && <ZonesPanel catalog={catalog} value={zoneId} onSelect={selectZone} onClose={() => setZonesOpen(false)} />}
      </div>

      {panel && (
        <SelectPanelSheet
          title={panel === 'vehicle' ? 'Select Vehicle Type' : 'Select Workforce Type'}
          subtitle={panel === 'vehicle' ? 'Select the required vehicle type for your plan — specific tankers are rostered later.' : 'Select the required workforce type for your plan — crew members are rostered later.'}
          sectionLabel={panel === 'vehicle' ? 'Available Vehicle Types' : 'Available Workforce Types'}
          searchPlaceholder={panel === 'vehicle' ? 'Search vehicle type' : 'Search workforce type'}
          rows={panelRows}
          value={panel === 'vehicle' ? local.vehicleTypeId : local.workforceTypeId}
          onSelect={(id) => {
            if (panel === 'vehicle') set('vehicleTypeId', id);
            else set('workforceTypeId', id);
            setPanel(null);
          }}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  );
}
