/**
 * Home — the Inspector's day view (Tadweer April redesign). Two-pane:
 *   • Left panel: header (greeting + duty) + a top tab-switch (Dashboard | My
 *     Tasks). Dashboard = KPI summary; My Tasks = the inspector's SCHEDULED
 *     tasks (click → detail side-sheet → "Start Inspection" opens over it).
 *   • Right panel: the live incident map (Leaflet) with the status legend.
 */
import * as React from 'react';
import * as Icons from '@ds/icons';
import { KpiTile } from '@ds/components/data-viz';
import type { DetailDescriptor } from '@ds/components/app-shell';
import { useIims } from '@/store/store';
import { useNav } from '@/app/nav';
import { AvatarChip } from '@/lib/ui';
import { IncidentMap, StatusLegend, DOHA_CENTER, type LeafletMapHandle } from '@/lib/IncidentMap';
import { LeafletMap } from '@ds/components/map';
import type { MapZone } from '@ds/components/map';
import { INCIDENT_STATUS_ORDER } from '@/data/status';
import type { IncidentStatus, ServiceType } from '@/data/types';
import { ZONES } from '@/data/catalog';
import { todayTasks, type Task } from '@/app/po-modules';
import emptyTasksUrl from '@/assets/empty-tasks.svg';
import reportIconUrl from '@/assets/action-report.svg';
import dutyOnlineUrl from '@/assets/duty-online.svg';
import dutyOfflineUrl from '@/assets/duty-offline.svg';

type Store = ReturnType<typeof useIims>;

/* Build one filled polygon per sector, scattered around the lot's zone centre —
   the orange geofences shown on the task-detail map. Deterministic per index. */
function sectorPolygons(center: { lat: number; lng: number }, sectors: string[]): MapZone[] {
  const n = Math.max(1, sectors.length);
  return sectors.map((label, i) => {
    const a = (i / n) * Math.PI * 2 + 0.6;
    const cx = center.lat + Math.sin(a) * 0.022;
    const cy = center.lng + Math.cos(a) * 0.028;
    const verts = 5;
    const points: [number, number][] = [];
    for (let k = 0; k < verts; k++) {
      const ang = (k / verts) * Math.PI * 2 + i * 0.7;
      const r = 0.009 + ((i + k) % 3) * 0.0025;
      points.push([cx + Math.sin(ang) * r, cy + Math.cos(ang) * r * 1.25]);
    }
    return { id: `sector-${i}`, points, color: '#F79009', fillOpacity: 0.4, label };
  });
}

/* ─────────────────────────── task detail side sheet ─────────────────────────── */

export function HomeTaskDetail({ s, task, onStart }: { s: Store; task: Task; onStart: () => void }) {
  const zone = s.zone(task.zoneId);
  const me = s.currentInspector();
  const center: [number, number] = zone ? [zone.center.lat, zone.center.lng] : DOHA_CENTER;
  const mapRef = React.useRef<LeafletMapHandle>(null);
  const [mapFull, setMapFull] = React.useState(false);
  const zones = React.useMemo(() => (zone ? sectorPolygons(zone.center, task.sectors ?? []) : []), [zone, task.sectors]);
  // Leaflet re-fits on window resize — nudge it when the map size changes.
  React.useEffect(() => {
    const id = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 80);
    return () => window.clearTimeout(id);
  }, [mapFull]);

  const Pill = ({ icon: Ic, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) => (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
      <Ic size={13} />{children}
    </span>
  );
  const FieldRow = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
    <div className="flex items-start gap-3">
      <span className="w-[116px] shrink-0 text-[13px] font-medium text-muted-foreground">{label}</span>
      <span className="flex-1 text-[14px] font-semibold text-foreground">{children}</span>
    </div>
  );

  return (
    <div className="flex h-full w-full flex-col bg-card">
      <div className="flex flex-1 flex-col gap-5 overflow-auto p-6">
        {/* header badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Pill icon={Icons.Hash02}>{task.pid ?? task.id}</Pill>
          <Pill icon={Icons.Trash01}>{task.inspectionType ?? 'Inspection'}</Pill>
          <span className="ml-auto"><TaskBadge status={task.status} /></span>
        </div>

        {/* title = asset / subject */}
        <h2 className="text-[26px] font-bold leading-tight text-foreground">{task.ref ?? task.title}</h2>

        {/* field grid */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <FieldRow label="Inspection Date">{task.dateTime ?? task.dateLabel}</FieldRow>
          <FieldRow label="Inspector">
            <span className="flex items-center gap-1.5"><AvatarChip name={me.name} color={me.avatarColor} size={20} />{me.name}</span>
          </FieldRow>
          <FieldRow label="Sectors">{task.lots ?? task.sectors?.join(', ')}</FieldRow>
          {task.specLabel && <FieldRow label={task.specLabel}>{task.specValue}</FieldRow>}
        </div>

        {/* notes / instructions — green callout */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'color-mix(in srgb, var(--status-success) 35%, transparent)', background: 'color-mix(in srgb, var(--status-success) 7%, transparent)' }}
        >
          <div className="mb-1.5 flex items-center gap-2 text-[14px] font-semibold" style={{ color: 'var(--status-success)' }}>
            <Icons.InfoCircle size={16} /> Notes/Instructions
          </div>
          <p className="text-[13px] leading-relaxed text-foreground">{task.note}</p>
        </div>

        {/* map — sectors drawn as orange polygons */}
        <div className={mapFull ? 'fixed inset-0 z-[90] isolate bg-card' : 'relative isolate h-[300px] overflow-hidden rounded-xl border border-border'}>
          <LeafletMap ref={mapRef} center={center} zoom={12} zones={zones} className="h-full w-full" />
          {/* zoom + fullscreen (bottom-right) */}
          <div className="absolute bottom-3 right-3 z-[500] flex flex-col gap-2">
            <MapBtn label="Zoom in" onClick={() => mapRef.current?.zoomIn()}><span className="text-lg font-semibold leading-none">+</span></MapBtn>
            <MapBtn label="Zoom out" onClick={() => mapRef.current?.zoomOut()}><span className="text-lg font-semibold leading-none">−</span></MapBtn>
            <MapBtn label={mapFull ? 'Minimize map' : 'Maximize map'} onClick={() => setMapFull((v) => !v)}>{mapFull ? <Icons.Minimize01 size={17} /> : <Icons.Maximize01 size={17} />}</MapBtn>
          </div>
        </div>
      </div>

      {/* footer — green Start CTA (opens the inspection sheet over this one) */}
      <div className="border-t border-border bg-card p-4">
        <button
          type="button"
          onClick={onStart}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground transition hover:brightness-95"
        >
          Start
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── task card ─────────────────────────── */

/* Lot / geofence glyph (a skewed parcel outline with corner nodes) — matches the
   Tadweer task-card icon; not in the DS icon set, so drawn inline. */
function LotIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M6.4 7.3 16.9 5.5a1.5 1.5 0 0 1 1.73 1.2l1.2 8.2a1.5 1.5 0 0 1-1.23 1.72L7.9 18.5a1.5 1.5 0 0 1-1.73-1.2L4.97 9.02A1.5 1.5 0 0 1 6.4 7.3Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <g fill="currentColor">
        <circle cx="6.5" cy="7.6" r="1.7" />
        <circle cx="17.5" cy="5.8" r="1.7" />
        <circle cx="18.7" cy="15.8" r="1.7" />
        <circle cx="7.7" cy="17.6" r="1.7" />
      </g>
    </svg>
  );
}

/* Solid status badge sitting at the top of the card. SCHEDULED = filled orange. */
const TASK_BADGE: Record<Task['status'], { label: string; bg: string }> = {
  planned: { label: 'SCHEDULED', bg: 'var(--status-warning)' },
  completed: { label: 'COMPLETED', bg: 'var(--status-success)' },
  missed: { label: 'MISSED', bg: 'var(--status-error)' },
};
function TaskBadge({ status }: { status: Task['status'] }) {
  const m = TASK_BADGE[status];
  return (
    <span className="inline-flex w-fit items-center rounded-lg px-3 py-1.5 text-[13px] font-bold uppercase tracking-wide text-white" style={{ background: m.bg }}>
      {m.label}
    </span>
  );
}

function TaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-left transition hover:shadow-[var(--elevation-md)]"
    >
      <TaskBadge status={task.status} />
      <div className="flex items-start gap-2.5">
        <LotIcon size={20} className="mt-0.5 shrink-0 text-muted-foreground" />
        <p className="text-[17px] font-bold leading-snug text-foreground">{task.lots ?? task.title}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[15px] font-semibold text-foreground">
        <span className="flex items-center gap-2">
          <Icons.Clock size={17} className="text-muted-foreground" />
          {task.endTime ? `${task.time} – ${task.endTime}` : task.time}
        </span>
        <span className="flex items-center gap-2">
          <Icons.Calendar size={17} className="text-muted-foreground" />
          {task.dateLabel}
        </span>
      </div>
    </button>
  );
}

/* ─────────────────────────── screen ─────────────────────────── */

function Stat({ label, value, icon, color }: { label: string; value: React.ReactNode; icon: React.ReactNode; color: string }) {
  return <KpiTile label={label} value={value} icon={icon} iconColor={color} />;
}

function MapBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-[var(--elevation-md)] transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function Home({ openDetail }: { openDetail?: (d: DetailDescriptor) => void }) {
  const s = useIims();
  const nav = useNav();
  const me = s.currentInspector();
  const { onDuty } = s.data;
  const k = s.kpis();

  const scheduled = React.useMemo(() => todayTasks(s), [s]);
  const [tab, setTab] = React.useState<'dashboard' | 'tasks'>('tasks');

  // Map: legend filter, location/zone search, maximize, and a searched-location pin
  const mapRef = React.useRef<LeafletMapHandle>(null);
  const [enabledStatuses, setEnabledStatuses] = React.useState<Set<IncidentStatus>>(() => new Set(INCIDENT_STATUS_ORDER));
  const toggleStatus = (st: IncidentStatus) =>
    setEnabledStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(st)) next.delete(st); else next.add(st);
      return next;
    });
  // Incidents shown on the map are filtered by the legend's status checkboxes only.
  const mapIncidents = React.useMemo(
    () => s.data.incidents.filter((i) => enabledStatuses.has(i.status)),
    [s, enabledStatuses],
  );

  // Location / zone search — matches zones by name or code; picking one flies the
  // map there and drops a distinct location pin (cleared via "Remove marker").
  const [locQuery, setLocQuery] = React.useState('');
  const [sugOpen, setSugOpen] = React.useState(false);
  const [locMarker, setLocMarker] = React.useState<[number, number] | null>(null);
  const zoneMatches = React.useMemo(() => {
    const q = locQuery.trim().toLowerCase();
    if (!q) return [] as typeof ZONES;
    return ZONES.filter((z) => `${z.name} ${z.code}`.toLowerCase().includes(q)).slice(0, 6);
  }, [locQuery]);
  const selectZone = (z: (typeof ZONES)[number]) => {
    setLocMarker([z.center.lat, z.center.lng]);
    setLocQuery(z.name);
    setSugOpen(false);
    mapRef.current?.flyTo([z.center.lat, z.center.lng], 14);
  };

  // Maximize the map to fill the whole surface. Leaflet re-fits on window resize.
  const [mapMax, setMapMax] = React.useState(false);
  React.useEffect(() => {
    const id = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 80);
    return () => window.clearTimeout(id);
  }, [mapMax]);

  // Off duty → everything on Home is locked; only the duty toggle stays live.
  const locked = !onDuty;

  // The Home module is a full-bleed two-pane surface with its own header, so we
  // hide the shell's module top-nav while Home is mounted (INS · Inspector only;
  // the marker is set by this INS-only component and cleared on unmount).
  React.useLayoutEffect(() => {
    document.body.setAttribute('data-ins-home', '');
    return () => document.body.removeAttribute('data-ins-home');
  }, []);

  const openTask = (task: Task) => {
    openDetail?.({
      id: task.id,
      label: task.ref ?? task.title,
      category: 'My Tasks',
      // Starting the inspection clears this lot from the Home day list (it's now
      // being worked / done) — completed tasks are removed from Home.
      render: () => (
        <HomeTaskDetail
          s={s}
          task={task}
          onStart={() => nav.openNewInspection({
            taskId: task.id,
            lotNo: task.lotNo,
            sectors: task.sectors,
            zoneId: task.zoneId,
            espId: task.espId,
            serviceType: task.service as ServiceType,
          })}
        />
      ),
    });
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── LEFT PANEL ── */}
      <aside className="flex w-full shrink-0 flex-col border-r border-border bg-card md:w-[400px]">
        {/* header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-4">
          <AvatarChip name={me.name} color={me.avatarColor} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-md font-semibold text-foreground">{me.name}</p>
            <p className="text-body-xs text-muted-foreground">
              {new Date(s.now).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => s.toggleDuty()}
            aria-label="Toggle duty status"
            aria-pressed={onDuty}
            className="shrink-0 rounded-full outline-none transition-transform duration-200 ease-out hover:scale-[1.04] active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* Cross-fade the two duty SVGs so the track colour + knob glide
                between states instead of hard-swapping. */}
            <span className="relative block h-[30px] w-[69px]">
              <img
                src={dutyOfflineUrl}
                width={69}
                height={30}
                alt=""
                className="absolute inset-0 transition-opacity duration-300 ease-out"
                style={{ opacity: onDuty ? 0 : 1 }}
              />
              <img
                src={dutyOnlineUrl}
                width={69}
                height={30}
                alt=""
                className="absolute inset-0 transition-opacity duration-300 ease-out"
                style={{ opacity: onDuty ? 1 : 0 }}
              />
            </span>
            <span className="sr-only">{onDuty ? 'On duty' : 'Off duty'}</span>
          </button>
        </div>

        {/* Clocked-out notice */}
        {locked && (
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-5 py-2.5 text-body-sm font-medium" style={{ background: 'color-mix(in srgb, var(--status-error) 10%, transparent)', color: 'var(--status-error)' }}>
            <Icons.Clock size={16} />
            You&apos;re clocked out — turn on duty to start your shift.
          </div>
        )}

        {/* Big Dashboard | My Tasks segmented switch */}
        <div className={`shrink-0 px-4 pt-4 ${locked ? 'pointer-events-none select-none opacity-50' : ''}`}>
          <div className="flex gap-1.5 rounded-2xl bg-muted p-1.5">
            {([
              { key: 'dashboard' as const, label: 'Dashboard', icon: Icons.LayoutAlt01 },
              { key: 'tasks' as const, label: 'My Tasks', icon: Icons.ClipboardCheck },
            ]).map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-body-md font-semibold transition ${
                    active ? 'bg-card text-primary shadow-[var(--elevation-sm)]' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <t.icon size={18} />
                  {t.label}
                  {t.key === 'tasks' && (
                    <span className={`rounded-full px-1.5 text-caption font-bold tabular-nums ${active ? 'bg-primary/10 text-primary' : 'bg-border text-muted-foreground'}`}>{scheduled.length}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className={`min-h-0 flex-1 overflow-auto p-4 ${locked ? 'pointer-events-none select-none opacity-50' : ''}`}>
          {tab === 'dashboard' ? (
            <>
              <div className="mb-4">
                <button type="button" disabled={!onDuty} onClick={() => nav.openReportIncident()}
                  className="flex w-full flex-col items-center justify-center gap-2.5 rounded-2xl border border-border bg-card p-5 text-body-md font-semibold text-foreground transition hover:shadow-[var(--elevation-md)] disabled:pointer-events-none disabled:opacity-40">
                  <img src={reportIconUrl} width={52} height={53} alt="" />
                  Report Incident
                </button>
              </div>
              <p className="mb-2 text-body-xs font-semibold uppercase tracking-wide text-muted-foreground">Reported Incidents</p>
              <div className="mb-4 grid grid-cols-2 gap-2.5">
                <Stat label="Reported Today" value={k.reportedToday} icon={<Icons.AlertTriangle size={18} />} color="var(--status-warning)" />
                <Stat label="Total Reported" value={k.totalReported} icon={<Icons.LayersThree01 size={18} />} color="var(--status-warning)" />
              </div>
              <p className="mb-2 text-body-xs font-semibold uppercase tracking-wide text-muted-foreground">Inspections</p>
              <div className="mb-4 grid grid-cols-2 gap-2.5">
                <Stat label="Conducted Today" value={k.conductedToday} icon={<Icons.ClipboardCheck size={18} />} color="var(--primary)" />
                <Stat label="Total Conducted" value={k.totalConducted} icon={<Icons.CheckCircle size={18} />} color="var(--primary)" />
              </div>
              <p className="mb-2 text-body-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending</p>
              <div className="grid grid-cols-2 gap-2.5">
                <Stat label="Verifications" value={k.pendingVerifications} icon={<Icons.Clock size={18} />} color="var(--chart-3)" />
                <Stat label="Re-Verifications" value={k.pendingReVerifications} icon={<Icons.RefreshCw01 size={18} />} color="var(--chart-3)" />
              </div>
            </>
          ) : scheduled.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <img src={emptyTasksUrl} width={104} height={106} alt="" />
              <div>
                <p className="text-body-md font-semibold text-foreground">All done for today</p>
                <p className="mt-1 text-body-sm text-muted-foreground">No tasks left to inspect today. Completed lots drop off automatically.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {scheduled.map((t) => <TaskCard key={t.id} task={t} onOpen={() => openTask(t)} />)}
            </div>
          )}
        </div>
      </aside>

      {/* ── RIGHT PANEL — map ── (isolate: keep Leaflet's high z-indexes below the DS side-sheet) */}
      <div className={
        mapMax
          ? 'fixed inset-0 z-[80] isolate bg-card'
          : `relative isolate hidden min-w-0 flex-1 md:block ${locked ? 'pointer-events-none opacity-60' : ''}`
      }>
        <IncidentMap ref={mapRef} incidents={mapIncidents} desaturated={!onDuty} locationMarker={locMarker} className="h-full w-full" />

        {/* location / zone search (top-left) */}
        <div className="absolute left-4 top-4 z-[500] w-[min(360px,55%)]">
          <div className="relative">
            <Icons.SearchMd size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={locQuery}
              onChange={(e) => { setLocQuery(e.target.value); setSugOpen(true); }}
              onFocus={() => setSugOpen(true)}
              onBlur={() => window.setTimeout(() => setSugOpen(false), 120)}
              onKeyDown={(e) => { if (e.key === 'Enter' && zoneMatches[0]) selectZone(zoneMatches[0]); }}
              placeholder="Search locations & zones…"
              className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-9 text-body-sm text-foreground shadow-[var(--elevation-md)] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            {(locQuery || locMarker) && (
              <button
                type="button"
                aria-label="Clear search"
                title="Clear search"
                onMouseDown={(e) => { e.preventDefault(); setLocQuery(''); setLocMarker(null); setSugOpen(false); }}
                className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Icons.XClose size={15} />
              </button>
            )}
            {sugOpen && zoneMatches.length > 0 && (
              <ul className="absolute left-0 right-0 top-11 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--elevation-md)]">
                {zoneMatches.map((z) => (
                  <li key={z.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); selectZone(z); }}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-muted"
                    >
                      <Icons.MarkerPin01 size={15} className="shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-foreground">{z.name}</span>
                      <span className="shrink-0 text-caption font-semibold text-muted-foreground">{z.code}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* map actions (bottom, opposite the legend) */}
        <div className="absolute bottom-4 right-4 z-[500] flex flex-col gap-2">
          <MapBtn label={mapMax ? 'Minimize map' : 'Maximize map'} onClick={() => setMapMax((v) => !v)}>
            {mapMax ? <Icons.Minimize01 size={17} /> : <Icons.Maximize01 size={17} />}
          </MapBtn>
          <MapBtn label="Zoom in" onClick={() => mapRef.current?.zoomIn()}><span className="text-lg font-semibold leading-none">+</span></MapBtn>
          <MapBtn label="Zoom out" onClick={() => mapRef.current?.zoomOut()}><span className="text-lg font-semibold leading-none">−</span></MapBtn>
        </div>

        {/* legend + map data filter (bottom-left) */}
        <div className="absolute bottom-4 left-4 z-[500] min-w-[260px] rounded-2xl border border-border bg-card/95 p-4 shadow-[var(--elevation-md)] backdrop-blur-sm">
          <p className="mb-3 text-body-sm font-semibold text-muted-foreground">Legend</p>
          <StatusLegend counts={s.countByStatus()} enabled={enabledStatuses} onToggle={toggleStatus} disabled={locked} />
        </div>
      </div>
    </div>
  );
}
