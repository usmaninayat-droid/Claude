import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button, Input, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { DataTable, EmptyState, ColumnConfig } from '../data-display';
import type { DataTableColumn } from '../data-display';
import {
  FLOOD_STATUS_LABEL, FLOOD_STATUS_TONE, fmtDateTime, fmtForecastDate,
  type FloodPlanCatalog, type FloodPlanRecord, type FloodPlanStatus,
} from './flood-plan-types';

/**
 * FloodPlanList — Smart Planning's List View over MM Flood response plans
 * (FM-6365). Columns: plan name · description · zones · vehicle type ·
 * workforce type · depot · assembly point · discharge point · status ·
 * version · rostered dates · last updated — every one sortable; filters for
 * zone / vehicle type / workforce type / status / rostered-or-not apply
 * together; Export writes a CSV of exactly the filtered rows and the
 * columns currently shown; the table scrolls horizontally so columns past
 * the viewport stay reachable.
 *
 * Superseded versions are neither listed nor counted (the consumer passes
 * them, this component drops them, so the KPI strip and the table agree).
 * Rejected plans stay listed with a red pill AND a tinted row. The row
 * action "Roster" is only enabled for APPROVED plans.
 */

export interface FloodPlanListProps {
  plans: FloodPlanRecord[];
  catalog: FloodPlanCatalog;
  onOpen: (plan: FloodPlanRecord) => void;
  onRoster: (plan: FloodPlanRecord) => void;
  className?: string;
}

type Filters = { zone: string; vehicle: string; workforce: string; status: '' | FloodPlanStatus; rostered: '' | 'yes' | 'no' };
const EMPTY_FILTERS: Filters = { zone: '', vehicle: '', workforce: '', status: '', rostered: '' };

export function StatusPill({ status, className }: { status: FloodPlanStatus; className?: string }) {
  const tone = FLOOD_STATUS_TONE[status];
  const filled = status === 'APPROVED' || status === 'REJECTED';
  return filled
    ? <span className={cn('inline-flex items-center rounded-md px-2 py-1 text-caption font-bold uppercase tracking-wide text-white', className)} style={{ background: tone }}>{FLOOD_STATUS_LABEL[status]}</span>
    : <span className={cn('inline-flex items-center rounded-md px-2 py-1 text-caption font-bold uppercase tracking-wide', className)} style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}>{FLOOD_STATUS_LABEL[status]}</span>;
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

function csvEscape(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function FloodPlanList({ plans, catalog, onOpen, onRoster, className }: FloodPlanListProps) {
  const [query, setQuery] = React.useState('');
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);
  const [hidden, setHidden] = React.useState<string[]>([]);

  const zoneName = (id: string) => catalog.zones.find((z) => z.id === id)?.name ?? id;
  const siteName = (id?: string) => catalog.sites.find((s) => s.id === id)?.name ?? '—';
  const vehicleName = (id?: string) => catalog.vehicleTypes.find((v) => v.id === id)?.name ?? '—';
  const workforceName = (id?: string) => catalog.workforceTypes.find((w) => w.id === id)?.name ?? '—';
  const rosterText = (p: FloodPlanRecord) => p.roster.map((r) => fmtForecastDate(r.date)).join(', ');

  // Superseded versions are excluded before anything else — never listed, never counted.
  const live = React.useMemo(() => plans.filter((p) => p.status !== 'SUPERSEDED'), [plans]);
  const q = query.trim().toLowerCase();
  const rows = React.useMemo(() => live.filter((p) => {
    if (filters.zone && !p.zoneIds.includes(filters.zone)) return false;
    if (filters.vehicle && p.vehicleTypeId !== filters.vehicle) return false;
    if (filters.workforce && p.workforceTypeId !== filters.workforce) return false;
    if (filters.status && p.status !== filters.status) return false;
    if (filters.rostered === 'yes' && !p.roster.length) return false;
    if (filters.rostered === 'no' && p.roster.length) return false;
    if (q) {
      const hay = `${p.name} ${p.description} ${p.zoneIds.map(zoneName).join(' ')} ${vehicleName(p.vehicleTypeId)} ${workforceName(p.workforceTypeId)} ${siteName(p.depotId)} ${siteName(p.assemblyId)} ${siteName(p.dischargeId)} ${FLOOD_STATUS_LABEL[p.status]} v${p.version}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [live, filters, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeFilters = Object.values(filters).filter(Boolean).length;

  const Muted = ({ children }: { children: React.ReactNode }) => <span className="text-body-sm text-foreground">{children}</span>;
  const columns: DataTableColumn<FloodPlanRecord>[] = [
    { id: 'name', header: 'Plan Name', width: '220px', sortable: true, accessor: (p) => p.name, cell: (p) => (
      <span className="flex flex-col">
        <span className="text-body-sm font-semibold text-foreground">{p.name}</span>
        <span className="text-body-xs text-muted-foreground">{p.id}</span>
      </span>
    ) },
    { id: 'description', header: 'Description', width: '260px', sortable: true, accessor: (p) => p.description, cell: (p) => <span className="line-clamp-2 text-body-sm text-muted-foreground">{p.description || '—'}</span> },
    { id: 'zones', header: 'Zones', width: '200px', sortable: true, accessor: (p) => p.zoneIds.map(zoneName).join(', '), cell: (p) => (
      <span className="flex flex-col gap-0.5">
        {p.zoneIds.slice(0, 2).map((z) => <span key={z} className="inline-flex items-center gap-1.5 text-body-sm text-foreground"><Icons.MarkerPin01 size={13} className="text-muted-foreground" />{zoneName(z)}</span>)}
        {p.zoneIds.length > 2 && <span className="pl-5 text-body-xs text-muted-foreground">+{p.zoneIds.length - 2} more</span>}
      </span>
    ) },
    { id: 'vehicle', header: 'Vehicle Type', width: '190px', sortable: true, accessor: (p) => vehicleName(p.vehicleTypeId), cell: (p) => <span className="inline-flex items-center gap-1.5 text-body-sm text-foreground"><Icons.Truck02 size={16} className="text-muted-foreground" />{vehicleName(p.vehicleTypeId)}</span> },
    { id: 'workforce', header: 'Workforce Type', width: '170px', sortable: true, accessor: (p) => workforceName(p.workforceTypeId), cell: (p) => <span className="inline-flex items-center gap-1.5 text-body-sm text-foreground"><Icons.Users02 size={16} className="text-muted-foreground" />{workforceName(p.workforceTypeId)}</span> },
    { id: 'depot', header: 'Depot', width: '190px', sortable: true, accessor: (p) => siteName(p.depotId), cell: (p) => <Muted>{siteName(p.depotId)}</Muted> },
    { id: 'assembly', header: 'Assembly Point', width: '210px', sortable: true, accessor: (p) => siteName(p.assemblyId), cell: (p) => <Muted>{siteName(p.assemblyId)}</Muted> },
    { id: 'discharge', header: 'Discharge Point', width: '220px', sortable: true, accessor: (p) => siteName(p.dischargeId), cell: (p) => <Muted>{siteName(p.dischargeId)}</Muted> },
    { id: 'status', header: 'Status', width: '120px', sortable: true, accessor: (p) => FLOOD_STATUS_LABEL[p.status], cell: (p) => <StatusPill status={p.status} /> },
    { id: 'version', header: 'Version', width: '90px', align: 'center', sortable: true, accessor: (p) => p.version, cell: (p) => <span className="text-body-sm tabular-nums text-foreground">v{p.version}</span> },
    { id: 'roster', header: 'Rostered Dates', width: '200px', sortable: true, accessor: (p) => p.roster[0]?.date ?? '', cell: (p) => p.roster.length ? (
      <span className="flex flex-col gap-0.5">
        {p.roster.slice(0, 2).map((r) => <span key={r.id} className="inline-flex items-center gap-1.5 text-body-sm text-foreground"><Icons.CalendarDate size={13} className="text-muted-foreground" />{fmtForecastDate(r.date)} · {r.shift}</span>)}
        {p.roster.length > 2 && <span className="pl-5 text-body-xs text-muted-foreground">+{p.roster.length - 2} more</span>}
      </span>
    ) : <span className="text-body-xs text-muted-foreground">Not rostered</span> },
    { id: 'updated', header: 'Last Updated', width: '210px', sortable: true, accessor: (p) => p.updatedAt, cell: (p) => (
      <span className="flex flex-col"><span className="text-body-sm text-foreground">{fmtDateTime(p.updatedAt)}</span><span className="text-body-xs text-muted-foreground">{p.updatedBy}</span></span>
    ) },
    { id: 'actions', header: '', width: '120px', align: 'right', cell: (p) => (
      <Button
        variant="secondary"
        size="sm"
        disabled={p.status !== 'APPROVED'}
        title={p.status === 'APPROVED' ? 'Assign roster' : 'Only approved plans can be rostered'}
        onClick={(e) => { e.stopPropagation(); onRoster(p); }}
      >
        <Icons.CalendarPlus01 size={14} className="mr-1" />Roster
      </Button>
    ) },
  ];
  const visible = columns.filter((c) => !hidden.includes(c.id));

  const exportCsv = () => {
    const cols = visible.filter((c) => c.id !== 'actions');
    const header = cols.map((c) => csvEscape(typeof c.header === 'string' ? c.header : c.id));
    const lines = rows.map((p) => cols.map((c) => csvEscape(c.id === 'roster' ? rosterText(p) : c.accessor ? c.accessor(p) : '')).join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `flood-plans-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const count = (s: FloodPlanStatus) => live.filter((p) => p.status === s).length;
  const kpis = [
    { label: 'Total Plans', value: live.length, icon: <Icons.LayoutAlt01 size={20} />, tone: 'var(--chart-accent-purple)' },
    { label: 'Draft', value: count('DRAFT'), icon: <Icons.Edit01 size={20} />, tone: 'var(--muted-foreground)' },
    { label: 'In Review', value: count('IN_REVIEW'), icon: <Icons.Eye size={20} />, tone: 'var(--status-info)' },
    { label: 'Approved', value: count('APPROVED'), icon: <Icons.CheckCircle size={20} />, tone: 'var(--status-success)' },
    { label: 'Rejected', value: count('REJECTED'), icon: <Icons.XCircle size={20} />, tone: 'var(--status-error)' },
  ];
  const statusOptions = (['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED'] as FloodPlanStatus[]).map((s) => ({ id: s, name: FLOOD_STATUS_LABEL[s] }));
  const totalWidth = visible.reduce((w, c) => w + parseInt(c.width ?? '160', 10), 0);

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-4 overflow-auto p-6', className)}>
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-[340px] max-w-full">
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
          <PopoverContent align="start" className="flex w-[560px] flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <span className="text-body-sm font-semibold text-foreground">Filter plans</span>
              <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="text-body-xs font-medium text-primary hover:underline">Clear all</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FilterSelect label="Zone" value={filters.zone} options={catalog.zones} onChange={(v) => setFilters((f) => ({ ...f, zone: v }))} />
              <FilterSelect label="Vehicle type" value={filters.vehicle} options={catalog.vehicleTypes} onChange={(v) => setFilters((f) => ({ ...f, vehicle: v }))} />
              <FilterSelect label="Workforce type" value={filters.workforce} options={catalog.workforceTypes} onChange={(v) => setFilters((f) => ({ ...f, workforce: v }))} />
              <FilterSelect label="Status" value={filters.status} options={statusOptions} onChange={(v) => setFilters((f) => ({ ...f, status: v as Filters['status'] }))} />
              <FilterSelect label="Rostered" value={filters.rostered} options={[{ id: 'yes', name: 'Rostered' }, { id: 'no', name: 'Not rostered' }]} onChange={(v) => setFilters((f) => ({ ...f, rostered: v as Filters['rostered'] }))} />
            </div>
          </PopoverContent>
        </Popover>
        <ColumnConfig columns={columns.filter((c) => c.id !== 'actions').map((c) => ({ id: c.id, label: typeof c.header === 'string' ? c.header : c.id }))} hidden={hidden} onChange={setHidden} minVisible={2} size={40} triggerClassName="rounded-lg border border-border" />
        <span className="text-body-sm text-muted-foreground">{rows.length} of {live.length} plans</span>
        <Button variant="secondary" className="ml-auto" onClick={exportCsv} disabled={!rows.length}><Icons.Download01 size={16} className="mr-1.5" />Export</Button>
      </div>

      {/* KPI strip — counts exclude superseded versions */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${k.tone} 14%, transparent)`, color: k.tone }}>{k.icon}</span>
            <div className="flex flex-col">
              <span className="text-body-sm text-muted-foreground">{k.label}</span>
              <span className="text-h4 font-semibold text-foreground">{k.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* table — horizontal scroll keeps every column reachable */}
      <div className="min-h-0 flex-1 overflow-x-auto">
        <div style={{ minWidth: totalWidth }}>
          <DataTable
            columns={visible}
            data={rows}
            getRowId={(p) => p.id}
            onRowClick={onOpen}
            rowClassName={(p) => (p.status === 'REJECTED' ? 'bg-[color-mix(in_srgb,var(--status-error)_6%,transparent)]' : undefined)}
            emptyState={<EmptyState variant={q || activeFilters ? 'no-results' : 'no-data'} title={q || activeFilters ? 'No matching plans' : 'No plans yet'} description={q || activeFilters ? 'Try a different search or clear the filters.' : 'Create a plan from the Hybrid View to see it here.'} />}
          />
        </div>
      </div>
    </div>
  );
}
