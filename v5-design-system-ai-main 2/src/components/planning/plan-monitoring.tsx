import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Input, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { DataTable, EmptyState } from '../data-display';
import type { DataTableColumn } from '../data-display';
import { MiniDonutCell } from '../data-viz';

/**
 * PlanMonitoring — the "Plan Monitoring" home (list monitor). Plans configured in
 * Interactive Planning are scheduled daily for the selected period and land here.
 * Built to Tadweer's Plan Monitoring (Figma AKU5PLaqjO1QBakY9pUAH1 · node
 * 49-33236). Chrome is FAMS blue; SCHEDULED (amber) / ONGOING (blue) / COMPLETED
 * (green) and the compliance ring are genuine status.
 *
 * DYNAMIC / config-driven: `rows`, `kpis`, `statusStyles`, `wasteStyles`,
 * `shiftStyles` and labels are props, so any scheduled-service monitor adapts by
 * config. Row click → the full-screen detail (host-provided via `onOpen`).
 */

export interface PlanMonitorRow {
  id: string;
  serviceType: string;
  wasteType: string;
  title: string;
  vehicle: string;
  driver: string;
  driverColor?: string;
  shift: string;
  locations: string[];
  startAt: string;
  endAt: string;
  status: string;
  progressDone: number;
  progressTotal: number;
  compliancePct?: number;
}
export interface PlanMonitorKpi { label: string; value: React.ReactNode; icon: React.ReactNode; tone: string }
export interface StatusStyle { tone: string; filled?: boolean }

export interface PlanMonitoringProps {
  rows: PlanMonitorRow[];
  kpis?: PlanMonitorKpi[];
  statusStyles?: Record<string, StatusStyle>;
  wasteStyles?: Record<string, { icon: React.ReactNode; color: string }>;
  shiftStyles?: Record<string, { icon: React.ReactNode; color: string }>;
  onOpen?: (row: PlanMonitorRow) => void;
  onEditColumns?: () => void;
  className?: string;
}

const VIOLET = 'var(--chart-accent-purple)';
const DEFAULT_STATUS: Record<string, StatusStyle> = {
  SCHEDULED: { tone: 'var(--status-warning)', filled: true },
  ONGOING: { tone: 'var(--primary)', filled: true },
  COMPLETED: { tone: 'var(--status-success)', filled: true },
};

function wasteGlyph(name: string): { icon: React.ReactNode; color: string } {
  const n = name.toLowerCase();
  if (n.includes('recycl')) return { icon: <Icons.RefreshCcw01 size={14} />, color: 'var(--status-success)' };
  if (n.includes('mix')) return { icon: <Icons.Trash01 size={14} />, color: VIOLET };
  if (n.includes('non')) return { icon: <Icons.Trash01 size={14} />, color: 'var(--muted-foreground)' };
  return { icon: <Icons.Package size={14} />, color: 'var(--status-warning)' }; // General
}
function shiftGlyph(name: string): { icon: React.ReactNode; color: string } {
  const n = name.toLowerCase();
  if (n.includes('night')) return { icon: <Icons.Moon01 size={14} />, color: 'var(--primary)' };
  if (n.includes('afternoon')) return { icon: <Icons.SunSetting02 size={14} />, color: 'var(--status-warning)' };
  return { icon: <Icons.Sun size={14} />, color: 'var(--status-warning)' }; // Morning
}

function StatusPill({ status, style }: { status: string; style?: StatusStyle }) {
  const s = style ?? { tone: 'var(--muted-foreground)' };
  if (s.filled) return <span className="inline-flex items-center rounded-md px-2 py-1 text-caption font-bold uppercase tracking-wide text-white" style={{ background: s.tone }}>{status}</span>;
  return <span className="inline-flex items-center rounded-md px-2 py-1 text-caption font-bold uppercase tracking-wide" style={{ background: `color-mix(in srgb, ${s.tone} 14%, transparent)`, color: s.tone }}>{status}</span>;
}

function WorkerAvatar({ name, color = 'var(--primary)', size = 24 }: { name: string; color?: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return <span className="grid shrink-0 place-items-center rounded-full font-semibold text-white" style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}>{initials || '—'}</span>;
}

function defaultKpis(rows: PlanMonitorRow[]): PlanMonitorKpi[] {
  const n = (s: string) => rows.filter((r) => r.status === s).length;
  return [
    { label: 'Total Number of Plans', value: rows.length, icon: <Icons.LayoutAlt01 size={20} />, tone: VIOLET },
    { label: 'Completed Plans', value: n('COMPLETED'), icon: <Icons.CheckCircle size={20} />, tone: 'var(--status-success)' },
    { label: 'On Going Plans', value: n('ONGOING'), icon: <Icons.Activity size={20} />, tone: 'var(--primary)' },
    { label: 'Scheduled Plans', value: n('SCHEDULED'), icon: <Icons.Clock size={20} />, tone: 'var(--status-warning)' },
  ];
}

export function PlanMonitoring({
  rows, kpis, statusStyles, wasteStyles, shiftStyles, onOpen, className,
}: PlanMonitoringProps) {
  const [query, setQuery] = React.useState('');
  const sStyles = { ...DEFAULT_STATUS, ...statusStyles };
  const kpiCards = kpis ?? defaultKpis(rows);

  const q = query.trim().toLowerCase();
  const data = rows.filter((r) => !q || `${r.id} ${r.serviceType} ${r.wasteType} ${r.title} ${r.vehicle} ${r.driver} ${r.shift} ${r.locations.join(' ')} ${r.status}`.toLowerCase().includes(q));

  const columns: DataTableColumn<PlanMonitorRow>[] = [
    { id: 'id', header: 'ID', width: '110px', accessor: (r) => r.id },
    { id: 'service', header: 'Service Type', width: '150px', cell: (r) => (
      <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-body-sm font-medium" style={{ background: `color-mix(in srgb, ${VIOLET} 12%, transparent)`, color: VIOLET }}><Icons.BinCollection size={14} />{r.serviceType}</span>
    ) },
    { id: 'waste', header: 'Waste Type', width: '130px', cell: (r) => { const w = wasteStyles?.[r.wasteType] ?? wasteGlyph(r.wasteType); return <span className="inline-flex items-center gap-1.5 text-body-sm text-foreground"><span style={{ color: w.color }}>{w.icon}</span>{r.wasteType}</span>; } },
    { id: 'title', header: 'Title', width: '160px', accessor: (r) => r.title, sortable: true },
    { id: 'vehicle', header: 'Vehicle', width: '120px', cell: (r) => <span className="inline-flex items-center gap-1.5 text-body-sm text-foreground"><Icons.Truck01 size={16} className="text-muted-foreground" />{r.vehicle}</span> },
    { id: 'driver', header: 'Driver', width: '150px', cell: (r) => <span className="inline-flex items-center gap-2 text-body-sm text-foreground"><WorkerAvatar name={r.driver} color={r.driverColor} />{r.driver}</span> },
    { id: 'shift', header: 'Shift', width: '150px', cell: (r) => { const s = shiftStyles?.[r.shift] ?? shiftGlyph(r.shift); return <span className="inline-flex items-center gap-1.5 text-body-sm text-foreground"><span style={{ color: s.color }}>{s.icon}</span>{r.shift}</span>; } },
    { id: 'locations', header: 'Service Locations', width: '170px', cell: (r) => (
      <span className="flex flex-col gap-0.5">
        {r.locations.slice(0, 2).map((l) => <span key={l} className="inline-flex items-center gap-1.5 text-body-sm text-foreground"><Icons.MarkerPin01 size={13} className="text-muted-foreground" />{l}</span>)}
        {r.locations.length > 2 && <span className="pl-5 text-body-xs text-muted-foreground">+{r.locations.length - 2} more</span>}
      </span>
    ) },
    { id: 'planned', header: 'Planned Time', width: '180px', cell: (r) => (
      <span className="flex flex-col gap-0.5 text-body-xs">
        <span><span className="mr-1 font-semibold text-muted-foreground">START</span><span className="text-foreground">{r.startAt}</span></span>
        <span><span className="mr-1 font-semibold text-muted-foreground">END</span><span className="text-foreground">{r.endAt}</span></span>
      </span>
    ) },
    { id: 'status', header: 'Status', width: '130px', cell: (r) => <StatusPill status={r.status} style={sStyles[r.status]} /> },
    { id: 'progress', header: 'Progress of Plan', width: '150px', cell: (r) => {
      const pct = r.progressTotal ? Math.round((r.progressDone / r.progressTotal) * 100) : 0;
      return (
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></span>
          <span className="text-body-xs tabular-nums text-muted-foreground">{r.progressDone}/{r.progressTotal}</span>
        </span>
      );
    } },
    { id: 'compliance', header: 'Compliance', width: '110px', align: 'right', cell: (r) => (
      r.compliancePct != null
        ? <span className="inline-flex justify-end"><MiniDonutCell value={r.compliancePct} size={34} /></span>
        : <span className="text-body-xs text-muted-foreground">0%</span>
    ) },
  ];

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-4 overflow-auto p-6', className)}>
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-[340px] max-w-full">
          <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search anything here" className="pl-8" />
        </div>
        <button type="button" aria-label="Filter" className="grid size-10 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.FilterLines size={16} /></button>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-body-sm font-medium text-foreground transition-colors hover:bg-muted">Group By<Icons.ChevronDown size={15} className="text-muted-foreground" /></button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-1">
            {['Status', 'Service Type', 'Shift', 'Driver'].map((g) => <button key={g} type="button" className="flex w-full rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted">{g}</button>)}
          </PopoverContent>
        </Popover>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <div key={k.label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${k.tone} 14%, transparent)`, color: k.tone }}>{k.icon}</span>
            <div className="flex flex-col">
              <span className="text-body-sm text-muted-foreground">{k.label}</span>
              <span className="text-h4 font-semibold text-foreground">{k.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* table — the standard DS column-config pencil lives in the header (manageColumns) */}
      <div className="min-h-0 flex-1">
        <DataTable manageColumns columns={columns} data={data} getRowId={(r) => r.id + r.title} onRowClick={onOpen} emptyState={<EmptyState variant={query ? 'no-results' : 'no-data'} title={query ? 'No matching plans' : 'No plans scheduled yet'} description={query ? 'Try a different search or clear the filter.' : 'Plans configured in Interactive Planning appear here once scheduled.'} />} />
      </div>
    </div>
  );
}
