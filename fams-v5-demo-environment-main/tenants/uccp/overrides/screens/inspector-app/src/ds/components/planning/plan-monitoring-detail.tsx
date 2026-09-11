import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Input } from '../primitives';
import { LeafletMap } from '../map';
import type { LatLng } from '../map';
import { ComplianceGauge, BarChart, AreaChart, LineChart, DonutChart } from '../data-viz';
import { ChangeResourceSheet } from './change-resource-sheet';
import type { ResourceOption } from './change-resource-sheet';

/**
 * PlanMonitoringDetail — the Plan Monitoring FULL-SCREEN detail (Figma
 * AKU5PLaqjO1QBakY9pUAH1 · node 49-42454; Dec 1737-2629). NOT a side sheet — the
 * data volume warrants a full page: a header KPI band, a Plan Log + route-replay
 * map, per-service-location cards, and an analytics stack. Config-driven via a
 * `data` prop (frame-matching defaults). Brand law: Tadweer green → FAMS
 * `--primary`; green/amber/red only for genuine status.
 */

/* ── data model (all optional — frame-matching defaults below) ───────────── */
export interface PlanLogEvent { time: string; kind: 'start' | 'alert' | 'service' | 'collected' | 'done'; title: string; sub?: string; sub2?: string }
export interface ServiceLocationDetail {
  name: string; code: string; status: string; compliancePct: number;
  window: string; distance: string; revenue: string; bins: number; waste: string; ptoLifts: number;
  cbmDone: number; cbmTotal: number;
  contact: string; email: string; phone: string; signed: boolean; emiratesId: boolean; description: string;
}
export interface PlanMonitoringDetailData {
  id: string; title: string; contractor: string; locations: string[]; status: string;
  compliancePct: number;
  compactor: string; driver: string; helpers: string[]; depot: string; discharge: string;
  serviceType: string; distance: string; wasteCollected: string; shift: string;
  ptoLifts: number; fuelCost: string; avgTime: string; idleTime: string; revenue: string;
  collectionStats: { label: string; value: number; color: string }[];
  planLog: PlanLogEvent[];
  route: LatLng[]; plannedRoute?: LatLng[]; depotPos: LatLng; dischargePos: LatLng; center: LatLng;
  serviceLocations: ServiceLocationDetail[];
}

const P = 'var(--primary)';
const OK = 'var(--status-success)';
const WARN = 'var(--status-warning)';
const ERR = 'var(--status-error)';
const PURPLE = 'var(--chart-accent-purple)';

const DEFAULT: PlanMonitoringDetailData = {
  id: 'PID-231454', title: 'Bin Collection Plan Sector A MUSAFFAH Lot 3', contractor: 'BEIYING CORPORATION',
  locations: ['Al Reef Village', 'Capital Mall'], status: 'COMPLETED', compliancePct: 81,
  compactor: 'AD-CN-1409', driver: 'Muhammad A.', helpers: ['M. A.', 'M. A.'], depot: 'Dawn Valley, UAE', discharge: 'Silver Lake, UAE',
  serviceType: 'Bin Collection', distance: '44 km', wasteCollected: '3,780 kg', shift: '04:30 AM – 01:30 AM',
  ptoLifts: 18, fuelCost: 'AED 19.44', avgTime: '1h 32m', idleTime: '18 mins', revenue: 'AED 32,000',
  collectionStats: [
    { label: 'Total Planned Collections', value: 50, color: 'var(--foreground)' },
    { label: 'On-Plan Collections', value: 10, color: OK },
    { label: 'Off-Plan Collections', value: 10, color: WARN },
    { label: 'Unknown Collections', value: 16, color: PURPLE },
    { label: 'No-RFID-Bin Collections', value: 16, color: P },
    { label: 'Pending Collections', value: 30, color: ERR },
  ],
  planLog: [
    { time: '12:43 PM', kind: 'start', title: 'Started Plan', sub: 'DEPOT A, ABU DHABI, UAE' },
    { time: '12:43 PM', kind: 'alert', title: 'Over Speeding at 140 km/h', sub: 'SECTOR 12, ABU DHABI, UAE' },
    { time: '12:43 PM', kind: 'service', title: 'Service Started', sub: 'AL REEF VILLAGE' },
    { time: '12:43 PM', kind: 'collected', title: 'Bin Collected', sub: '60 kg · 12356/A7' },
    { time: '12:43 PM', kind: 'done', title: 'Service Completed', sub: 'AL REEF VILLAGE', sub2: 'TIME SPENT: 14 MINS' },
    { time: '12:43 PM', kind: 'alert', title: 'Over Speeding at 140 km/h', sub: 'SECTOR 12, ABU DHABI, UAE' },
    { time: '12:43 PM', kind: 'collected', title: 'Bin Collected', sub: 'PLANNED ETA: 24 MAY, 25  12:43 PM' },
  ],
  route: [[24.44, 54.58], [24.42, 54.56], [24.40, 54.55], [24.41, 54.52], [24.43, 54.50]],
  plannedRoute: [[24.44, 54.58], [24.43, 54.55], [24.40, 54.53], [24.43, 54.50]],
  depotPos: [24.44, 54.58], dischargePos: [24.43, 54.50], center: [24.42, 54.54],
  serviceLocations: [
    { name: 'Capital Mall', code: 'SL-2143A', status: 'COMPLETED', compliancePct: 81, window: '04:30 AM – 01:30 AM', distance: '22 km', revenue: 'AED 3,200', bins: 23, waste: '1,780 kg', ptoLifts: 9, cbmDone: 11, cbmTotal: 100, contact: 'Ali Hassan', email: 'ali.hassan1@gmail.com', phone: '+971 50 123 4567', signed: true, emiratesId: true, description: 'Lorem ipsum dolor sit amet consectetur. Bibendum cursus faucibus tincidunt turpis faucibus a nullam aliquam nisi.' },
    { name: 'Al Reef Village', code: 'SL-2143A', status: 'COMPLETED', compliancePct: 81, window: '04:30 AM – 01:30 AM', distance: '22 km', revenue: 'AED 3,200', bins: 23, waste: '1,780 kg', ptoLifts: 9, cbmDone: 11, cbmTotal: 100, contact: 'Ali Hassan', email: 'ali.hassan2@gmail.com', phone: '+971 50 123 4567', signed: true, emiratesId: true, description: 'Lorem ipsum dolor sit amet consectetur. Bibendum cursus faucibus tincidunt turpis faucibus a nullam aliquam nisi.' },
  ],
};

/* ── option catalogs for the edit side sheets ───────────────────────────── */
const VEHICLE_OPTS: ResourceOption[] = [
  { id: 'AD-CN-1409', label: 'AD-CN-1409', meta: 'Compactor · 12 CBM', status: 'On Duty', statusTone: P, icon: <Icons.Truck01 size={16} /> },
  { id: 'AD-CN-1322', label: 'AD-CN-1322', meta: 'Compactor · 14 CBM', status: 'Available', icon: <Icons.Truck01 size={16} /> },
  { id: 'AD-CN-2201', label: 'AD-CN-2201', meta: 'Skip Loader · 8 CBM', status: 'Available', icon: <Icons.Truck01 size={16} /> },
  { id: 'AD-CN-3310', label: 'AD-CN-3310', meta: 'Compactor · 16 CBM', status: 'Maintenance', statusTone: WARN, disabled: true, icon: <Icons.Truck01 size={16} /> },
];
const DRIVER_OPTS: ResourceOption[] = [
  { id: 'Muhammad A.', label: 'Muhammad A.', meta: 'ID-1231 · +971 4123 4567', avatar: 'MA', status: 'On Duty', statusTone: P },
  { id: 'Omar Khan', label: 'Omar Khan', meta: 'ID-1242 · +971 4123 4512', avatar: 'OK', status: 'Available' },
  { id: 'Ravi Singh', label: 'Ravi Singh', meta: 'ID-1256 · +971 4123 4598', avatar: 'RS', status: 'Available' },
  { id: 'Kamal Raj', label: 'Kamal Raj', meta: 'ID-1268 · +971 4123 4570', avatar: 'KR', status: 'On Leave', statusTone: ERR, disabled: true },
];
const HELPER_OPTS: ResourceOption[] = [
  { id: 'Ayaan Malik', label: 'Ayaan Malik', meta: 'Helper · ID-3401', avatar: 'AM', status: 'Available' },
  { id: 'Zain Ali', label: 'Zain Ali', meta: 'Helper · ID-3412', avatar: 'ZA', status: 'Available' },
  { id: 'Naveen', label: 'Naveen', meta: 'Helper · ID-3423', avatar: 'NV', status: 'Available' },
  { id: 'Sanjay', label: 'Sanjay', meta: 'Helper · ID-3434', avatar: 'SJ', status: 'On Duty', statusTone: P },
];
const DISCHARGE_OPTS: ResourceOption[] = [
  { id: 'Silver Lake, UAE', label: 'Silver Lake Station', meta: 'Silver Lake, UAE · 12 km', status: 'Open', icon: <Icons.MarkerPin01 size={16} /> },
  { id: 'Al Dhafra, UAE', label: 'Al Dhafra Transfer', meta: 'Al Dhafra, UAE · 18 km', status: 'Open', icon: <Icons.MarkerPin01 size={16} /> },
  { id: 'MBZ City, UAE', label: 'Central Tipping Station', meta: 'MBZ City, UAE · 9 km', status: 'Open', icon: <Icons.MarkerPin01 size={16} /> },
];

/* ── small pieces ────────────────────────────────────────────────────────── */
function InfoCell({ icon, label, value, iconColor = 'var(--muted-foreground)', onEdit }: { icon: React.ReactNode; label: string; value: React.ReactNode; iconColor?: string; onEdit?: () => void }) {
  return (
    <div className="group flex items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${iconColor} 12%, transparent)`, color: iconColor }}>{icon}</span>
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
          {onEdit && <button type="button" onClick={onEdit} aria-label={`Change ${label}`} className="text-muted-foreground opacity-0 transition-opacity hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"><Icons.Edit01 size={11} /></button>}
        </span>
        <span className="truncate text-body-sm font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = status === 'COMPLETED' ? OK : status === 'ONGOING' ? P : WARN;
  return <span className="inline-flex items-center rounded-md px-2.5 py-1 text-caption font-bold uppercase tracking-wide text-white" style={{ background: tone }}>{status}</span>;
}

function Avatar({ name, color = P, size = 28 }: { name: string; color?: string; size?: number }) {
  const ini = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return <span className="grid shrink-0 place-items-center rounded-full font-semibold text-white" style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>{ini}</span>;
}

const LOG_ICON: Record<PlanLogEvent['kind'], { icon: React.ReactNode; color: string }> = {
  start: { icon: <Icons.PlayCircle size={15} />, color: OK },
  alert: { icon: <Icons.AlertTriangle size={15} />, color: WARN },
  service: { icon: <Icons.Flag01 size={15} />, color: P },
  collected: { icon: <Icons.Trash01 size={15} />, color: 'var(--muted-foreground)' },
  done: { icon: <Icons.CheckCircle size={15} />, color: OK },
};

function PlanLog({ events }: { events: PlanLogEvent[] }) {
  const [tab, setTab] = React.useState('all');
  const tabs = [['all', 'All'], ['bin', 'Bin Collection'], ['critical', 'Critical Events'], ['issues', 'Reported Issues']];
  return (
    <div className="flex min-h-0 w-[320px] shrink-0 flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-body font-semibold text-foreground">Plan Log</span>
        <Icons.LayoutRight size={16} className="text-muted-foreground" />
      </div>
      <div className="flex items-center gap-3 border-b border-border px-4">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={cn('relative py-2.5 text-body-xs font-semibold transition-colors', tab === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
            {label}{tab === id && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>
      <div className="p-3">
        <div className="relative mb-3">
          <Icons.SearchSm size={14} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search Event" className="h-9 pl-8 text-body-sm" />
        </div>
        <div className="rounded-lg bg-[color-mix(in_srgb,var(--status-success)_8%,transparent)] p-2.5 text-body-xs text-foreground">
          Plan completed with 92% route coverage and 85% time efficiency. 30 bins missed — 2 overflow cases reported in Area C.
        </div>
        <ul className="mt-3 flex flex-col">
          {events.map((e, i) => {
            const g = LOG_ICON[e.kind];
            return (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="inline-flex min-w-[62px] items-center justify-center rounded-md border border-border px-1.5 py-0.5 text-caption font-medium text-muted-foreground">{e.time}</span>
                  {i < events.length - 1 && <span className="my-1 w-px flex-1 bg-border" style={{ minHeight: 18 }} />}
                </div>
                <div className="flex min-w-0 flex-col pb-3">
                  <span className="flex items-center gap-1.5 text-body-sm font-semibold text-foreground"><span style={{ color: g.color }}>{g.icon}</span>{e.title}</span>
                  {e.sub && <span className="pl-6 text-caption text-muted-foreground">{e.sub}</span>}
                  {e.sub2 && <span className="pl-6 text-caption text-muted-foreground">{e.sub2}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function ServiceLocationCard({ loc }: { loc: ServiceLocationDetail }) {
  const cbmPct = Math.round((loc.cbmDone / loc.cbmTotal) * 100);
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-body font-semibold text-foreground"><Icons.MarkerPin01 size={16} className="text-muted-foreground" />{loc.name} - Service Location <span className="text-body-xs font-normal text-muted-foreground">{loc.code}</span></span>
        <StatusPill status={loc.status} />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="flex flex-col items-center"><ComplianceGauge value={loc.compliancePct} size={104} /><span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Compliance</span></div>
        <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <InfoCell icon={<Icons.Clock size={16} />} label="Collection Window" value={loc.window} />
          <InfoCell icon={<Icons.Route size={16} />} label="Distance Covered" value={loc.distance} />
          <InfoCell icon={<Icons.CurrencyDollar size={16} />} label="Revenue" value={loc.revenue} iconColor={OK} />
          <InfoCell icon={<Icons.Trash01 size={16} />} label="Bins Collected" value={loc.bins} iconColor={P} />
          <InfoCell icon={<Icons.Package size={16} />} label="Waste Collected" value={loc.waste} iconColor={WARN} />
          <InfoCell icon={<Icons.RefreshCcw01 size={16} />} label="PTO Lifts" value={loc.ptoLifts} />
        </div>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-body-xs"><span className="text-muted-foreground">11 CBM</span><span className="font-medium text-foreground">{cbmPct}/100</span></div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${cbmPct}%`, background: `linear-gradient(90deg, ${OK}, ${WARN}, ${ERR})` }} /></div>
      </div>
      <div className="border-t border-border pt-3">
        <span className="text-body-sm font-semibold text-foreground">Contact Person</span>
        <div className="mt-2 grid grid-cols-1 gap-y-2 text-body-sm sm:grid-cols-2">
          <ContactRow label="Service Delivery Confirmation by" value={<span className="flex items-center gap-1.5"><Avatar name={loc.contact} size={20} />{loc.contact}</span>} />
          <ContactRow label="Email Address" value={loc.email} />
          <ContactRow label="Phone" value={loc.phone} />
          <ContactRow label="Signature" value={loc.signed ? <span className="text-primary">✎ Signed</span> : '—'} />
          <ContactRow label="Emirates ID" value={loc.emiratesId ? <span className="text-primary">◍ Attachment</span> : '—'} />
        </div>
        <p className="mt-2 text-body-xs text-muted-foreground"><span className="mb-0.5 block font-medium text-muted-foreground">Description</span>{loc.description}</p>
      </div>
    </div>
  );
}
function ContactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex flex-col"><span className="text-caption text-muted-foreground">{label}</span><span className="text-body-sm font-medium text-foreground">{value}</span></div>;
}

function Card({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col gap-3 rounded-xl border border-border bg-card p-5', className)}>
      <span className="flex items-center gap-2 text-body-sm font-semibold text-foreground">{icon}{title}</span>
      {children}
    </section>
  );
}

function LabeledBar({ label, done, total, pct, color = P }: { label: string; done?: string; total?: string; pct: number; color?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-body-xs"><span className="text-muted-foreground">{label}</span><span className="font-medium text-foreground">{done ?? `${pct}%`}{total ? ` / ${total}` : ''}</span></div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}

/* ── the full-screen detail ──────────────────────────────────────────────── */
interface EditTarget { key: string; title: string; options: ResourceOption[]; currentId: string; label: string }

export function PlanMonitoringDetail({ data = DEFAULT, onBack, className }: { data?: PlanMonitoringDetailData; onBack?: () => void; className?: string }) {
  // editable resource fields + a live Plan Log so re-assignments are reflected + logged
  const [live, setLive] = React.useState({ compactor: data.compactor, driver: data.driver, helpers: [...data.helpers], discharge: data.discharge });
  const [log, setLog] = React.useState<PlanLogEvent[]>(data.planLog);
  const [edit, setEdit] = React.useState<EditTarget | null>(null);
  const [playing, setPlaying] = React.useState(false);

  const openEdit = (t: EditTarget) => setEdit(t);
  const confirmEdit = (id: string) => {
    if (!edit) return;
    const prev = edit.currentId;
    const newLabel = edit.options.find((o) => o.id === id)?.label ?? id;
    setLive((cur) => {
      if (edit.key === 'compactor') return { ...cur, compactor: newLabel };
      if (edit.key === 'driver') return { ...cur, driver: newLabel };
      if (edit.key === 'discharge') return { ...cur, discharge: newLabel };
      if (edit.key.startsWith('helper')) { const i = Number(edit.key.slice(6)); const h = [...cur.helpers]; h[i] = newLabel; return { ...cur, helpers: h }; }
      return cur;
    });
    setLog((cur) => [{ time: 'Just now', kind: 'alert', title: `${edit.label} Changed`, sub: `NEW: ${newLabel}`, sub2: prev ? `PREVIOUS: ${prev}` : undefined }, ...cur]);
    setEdit(null);
  };

  const eventData = ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00'].map((h, i) => ({
    h, over: 3 + (i % 4), idle: 2 + (i % 3), zin: 4 + (i % 5), zout: 3 + (i % 4), stay: 2 + (i % 3),
  }));
  const eventSeries = [
    { dataKey: 'over', name: 'Overspeeding', color: PURPLE },
    { dataKey: 'idle', name: 'Idling', color: P },
    { dataKey: 'zin', name: 'Zone in', color: OK },
    { dataKey: 'zout', name: 'Zone out', color: WARN },
    { dataKey: 'stay', name: 'Zone Stay', color: ERR },
  ];
  const weightData = Array.from({ length: 12 }, (_, i) => ({ t: `${i * 2}:00`, kg: Math.round(200 + i * 260 + (i % 3) * 80) }));
  const binTrend = Array.from({ length: 12 }, (_, i) => ({ t: `${i * 2}:00`, bins: Math.round(10 + i * i * 0.9) }));

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-auto bg-muted/30', className)}>
      {/* top bar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-card px-6 py-3">
        <button type="button" onClick={onBack} aria-label="Back" className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.ChevronLeft size={16} /></button>
        <span className="text-body-sm font-semibold text-foreground">{data.id}</span>
        <span className="text-body-sm text-muted-foreground">{data.title}</span>
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-caption font-semibold text-muted-foreground">{data.contractor}</span>
        {data.locations.map((l) => <span key={l} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-caption font-medium text-foreground"><Icons.MarkerPin01 size={11} className="text-muted-foreground" />{l}</span>)}
        <span className="ml-auto"><StatusPill status={data.status} /></span>
      </div>

      <div className="flex flex-col gap-4 p-6">
        {/* KPI band */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex flex-col items-center"><ComplianceGauge value={data.compliancePct} size={110} /><span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Overall Compliance</span></div>
            <InfoCell icon={<Icons.Truck01 size={16} />} label="Compactor" value={live.compactor} iconColor={P} onEdit={() => openEdit({ key: 'compactor', label: 'Vehicle', title: 'Change Vehicle', options: VEHICLE_OPTS, currentId: live.compactor })} />
            <InfoCell icon={<Avatar name={live.driver} size={20} />} label="Driver" value={live.driver} onEdit={() => openEdit({ key: 'driver', label: 'Driver', title: 'Change Driver', options: DRIVER_OPTS, currentId: live.driver })} />
            <InfoCell icon={<Icons.Users01 size={16} />} label="Helper 1" value={live.helpers[0] ?? '—'} onEdit={() => openEdit({ key: 'helper0', label: 'Helper 1', title: 'Add / Change Helper', options: HELPER_OPTS, currentId: live.helpers[0] ?? '' })} />
            <InfoCell icon={<Icons.Users01 size={16} />} label="Helper 2" value={live.helpers[1] ?? '—'} onEdit={() => openEdit({ key: 'helper1', label: 'Helper 2', title: 'Add / Change Helper', options: HELPER_OPTS, currentId: live.helpers[1] ?? '' })} />
            <InfoCell icon={<Icons.MarkerPin01 size={16} />} label="Depot" value={data.depot} iconColor={OK} />
            <InfoCell icon={<Icons.MarkerPin01 size={16} />} label="Discharge Station" value={live.discharge} iconColor={WARN} onEdit={() => openEdit({ key: 'discharge', label: 'Discharge Station', title: 'Change Discharge Station', options: DISCHARGE_OPTS, currentId: live.discharge })} />
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-border pt-4">
            <InfoCell icon={<Icons.BinCollection size={16} />} label="Service Type" value={data.serviceType} iconColor={PURPLE} />
            <InfoCell icon={<Icons.Route size={16} />} label="Distance" value={data.distance} />
            <InfoCell icon={<Icons.Package size={16} />} label="Waste Collected" value={data.wasteCollected} iconColor={WARN} />
            <InfoCell icon={<Icons.Sun size={16} />} label="Morning Shift" value={data.shift} iconColor={WARN} />
            <InfoCell icon={<Icons.RefreshCcw01 size={16} />} label="Total PTO Lifts" value={data.ptoLifts} />
            <InfoCell icon={<Icons.CurrencyDollar size={16} />} label="Fuel Cost" value={data.fuelCost} />
            <InfoCell icon={<Icons.Clock size={16} />} label="Avg Time / Service Location" value={data.avgTime} />
            <InfoCell icon={<Icons.Clock size={16} />} label="Idle / Waiting Time" value={data.idleTime} />
            <InfoCell icon={<Icons.CurrencyDollar size={16} />} label="Revenue" value={data.revenue} iconColor={OK} />
          </div>
        </div>

        {/* Plan Log + Map */}
        <div className="flex min-h-[460px] gap-4">
          <PlanLog events={log} />
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border">
            {/* collection stats header */}
            <div className="absolute inset-x-0 top-0 z-[400] flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-border bg-card/95 px-4 py-2 backdrop-blur">
              {data.collectionStats.map((s) => (
                <span key={s.label} className="flex items-center gap-1.5 text-body-xs font-medium text-foreground">
                  <Icons.MarkerPin01 size={12} style={{ color: s.color }} /><span className="tabular-nums">{s.value}</span><span className="text-muted-foreground">{s.label}</span>
                </span>
              ))}
            </div>
            <LeafletMap
              center={data.center} zoom={12} zoomControl
              routes={[
                ...(data.plannedRoute ? [{ id: 'planned', points: data.plannedRoute, color: OK }] : []),
                { id: 'actual', points: data.route, color: PURPLE, animateMarkerId: playing ? 'replay' : undefined },
              ]}
              markers={playing ? [{ id: 'replay', position: data.route[0], kind: 'vehicle', status: 'reporting' }] : []}
              pois={[{ id: 'depot', position: data.depotPos, color: OK, label: 'Depot' }, { id: 'discharge', position: data.dischargePos, color: WARN, label: 'Discharge' }]}
              className="h-full w-full"
            />
            <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause route replay' : 'Play route replay'} className="absolute bottom-4 left-4 z-[400] grid size-11 place-items-center rounded-full bg-card text-primary shadow-md transition-colors hover:bg-muted">
              {playing ? <Icons.PauseCircle size={22} /> : <Icons.PlayCircle size={22} />}
            </button>
          </div>
        </div>

        {/* per-service-location cards */}
        <div className="grid gap-4 xl:grid-cols-2">
          {data.serviceLocations.map((loc, i) => <ServiceLocationCard key={i} loc={loc} />)}
        </div>

        {/* analytics */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Compliance Break Down" icon={<Icons.CheckCircle size={15} className="text-[color:var(--status-success)]" />}>
            <LabeledBar label="Bin Collection" done="290 Bins" total="712 Bins" pct={41} color={OK} />
            <LabeledBar label="Shift Compliance" pct={100} color={OK} />
            <LabeledBar label="Start Time" pct={72} color={P} />
            <LabeledBar label="End Time" pct={64} color={WARN} />
          </Card>
          <Card title="Event Type Breakdown" icon={<Icons.BarChartSquare02 size={15} className="text-muted-foreground" />} className="lg:col-span-2">
            <BarChart data={eventData} xKey="h" series={eventSeries} stacked height={220} showLegend />
          </Card>
          <Card title="Outside Plan Bins Collected" icon={<Icons.PieChart01 size={15} className="text-muted-foreground" />}>
            <DonutChart height={200} centerLabel={<div className="text-center"><div className="text-h4 font-semibold text-foreground">16</div><div className="text-caption text-muted-foreground">Total Bins</div></div>} data={[
              { name: 'Registered Bins', value: 7, color: OK },
              { name: 'Unregistered Bins', value: 5, color: WARN },
              { name: 'Unscanned Bin Collection', value: 4, color: ERR },
            ]} />
          </Card>
          <Card title="Weight Collection Trend" icon={<Icons.TrendUp01 size={15} className="text-muted-foreground" />} className="lg:col-span-2">
            <AreaChart data={weightData} xKey="t" series={[{ dataKey: 'kg', name: 'Waste Collected (kg)', color: ERR }]} height={220} />
          </Card>
          <Card title="Gross Weight — Collected vs Received" icon={<Icons.Package size={15} className="text-muted-foreground" />} className="lg:col-span-2">
            <div className="flex items-center gap-3 text-body-xs">
              <span className="text-muted-foreground">Discrepancy 5.9% · −200 kg</span>
              <span className="inline-flex items-center rounded-md px-2 py-0.5 font-semibold" style={{ background: `color-mix(in srgb, ${OK} 14%, transparent)`, color: OK }}>WITHIN TOLERANCE</span>
            </div>
            <LabeledBar label="Collected Weight" done="3,200 kg" pct={94} color={OK} />
            <LabeledBar label="Received Gross Weight" done="3,400 kg" pct={100} color={P} />
          </Card>
          <Card title="Bin Collection Trend" icon={<Icons.TrendUp01 size={15} className="text-muted-foreground" />}>
            <LineChart data={binTrend} xKey="t" series={[{ dataKey: 'bins', name: 'Bin Collection', color: OK }]} height={200} />
          </Card>
        </div>
      </div>

      <ChangeResourceSheet
        open={!!edit}
        title={edit?.title ?? ''}
        options={edit?.options ?? []}
        currentId={edit?.currentId || undefined}
        searchPlaceholder="Search…"
        confirmLabel="Confirm"
        onConfirm={confirmEdit}
        onOpenChange={(o) => { if (!o) setEdit(null); }}
      />
    </div>
  );
}
