import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import {
  Input,
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent,
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '../primitives';
import { DataTable } from '../data-display';
import type { DataTableColumn } from '../data-display';
import { ComplianceGauge, MiniDonutCell } from '../data-viz';
import type { PlannedShift, ShiftWorker, ShiftArea, ShiftPlannerLabels } from './shift-planner';

/**
 * WorkforceCompliance — the **Compliance Monitoring** view that pairs with
 * `ShiftPlanner`. It derives one coverage record PER worker PER day from the same
 * planned shifts (deterministic), lists them in a table, and opens a wide detail
 * sheet: a KPI grid (overall-compliance gauge + metrics) and a per-sub-area card
 * grid (Visited / Not Visited, each with a compliance gauge, inspection window,
 * time-in-area, area-coverage bar and a reported-incidents table).
 *
 * DYNAMIC / config-driven — same contract as `ShiftPlanner`: workers · areas ·
 * subAreas · labels are props; it reads the SAME `shifts`, so the two views stay
 * in sync. The route-replay map is an optional `renderRouteMap` slot (kept out of
 * the DS core — GPS/telemetry is app-specific). Chrome is FAMS blue; green/amber/
 * red are genuine status only (visited / partial / missed).
 *
 * Adapted from the IIMS "Inspector Shifts → Compliance Monitoring" module
 * (spec: iims-ins/docs/lifecycle-specs/06-inspector-shifts.md §7).
 */

/* ─────────────────────────── types ─────────────────────────── */
export interface ComplianceEntry {
  id: string;
  workerId: string;
  dateISO: string;
  areaId: string;
  sectorsPlanned: string[];
  sectorsVisited: string[];
  compliancePct: number;
  incidentsReported: number;
  timeInSectorsMin: number;
  scheduledMin: number;
  areaCoveragePct: number;
  idleMin: number;
  /** each shift's window, e.g. "9am – 11am". */
  timings: string[];
}

export interface WorkforceComplianceProps {
  workers: ShiftWorker[];
  shifts: PlannedShift[];
  areas: ShiftArea[];
  /** the sub-area universe (Sectors / Stops / Wings) used to fill days that lack them. */
  subAreas?: string[];
  labels?: ShiftPlannerLabels;
  /** optional map card in the detail sheet (e.g. a route-replay LeafletMap). */
  renderRouteMap?: (ctx: { entry: ComplianceEntry }) => React.ReactNode;
  className?: string;
}

/* ─────────────── seeded PRNG (FNV-1a) — deterministic, no Math.random ─────── */
function h01(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
const hInt = (key: string, n: number) => Math.floor(h01(key) * n);

const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const KPI_CATEGORIES = ['Operations', 'Maintenance', 'Safety', 'Quality', 'Logistics', 'Environment'];
const INCIDENT_TITLES = ['Threshold breach', 'Missed checkpoint', 'Unsafe condition', 'Overdue task', 'Equipment fault', 'Access blocked'];

/* ─────────────────────── date / time helpers ─────────────────────── */
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fmt12 = (hhmm: string) => { let [h, m] = hhmm.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`; };
const parseISO = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const dateLong = (d: Date) => `${d.getDate()} ${MON_SHORT[d.getMonth()]}, ${d.getFullYear()}`;
const fmtCompact = (hhmm: string) => { let [h, m] = hhmm.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return m ? `${h}:${String(m).padStart(2, '0')}${ap}` : `${h}${ap}`; };
const hm = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;

/* ─────────────────────── derive compliance (pure, exported) ─────────────── */
/** One ComplianceEntry per (workerId, dateISO) from the planned shifts (skips
 *  unassigned). Deterministic — seeded by workerId+dateISO. */
export function deriveComplianceEntries(shifts: PlannedShift[], subAreas: string[] = []): ComplianceEntry[] {
  const groups = new Map<string, PlannedShift[]>();
  for (const sh of shifts) {
    if (!sh.workerId) continue;
    const key = `${sh.workerId}|${sh.dateISO}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(sh);
  }
  const pool = subAreas.length ? subAreas : ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
  const out: ComplianceEntry[] = [];
  for (const [key, group] of groups) {
    const [workerId, dateISO] = key.split('|');
    const seed = `${workerId}${dateISO}`;
    group.sort((a, b) => toMin(a.start) - toMin(b.start));
    let planned = Array.from(new Set(group.map((x) => x.subArea).filter(Boolean) as string[]));
    if (planned.length < 2) {
      const n = 3 + hInt(`${seed}n`, 2);
      const start = hInt(`${seed}s`, pool.length);
      planned = Array.from(new Set(Array.from({ length: n }, (_, i) => pool[(start + i) % pool.length])));
    }
    const missOne = planned.length > 1 && hInt(`${seed}miss`, 6) === 0;
    const visited = missOne ? planned.filter((_, i) => i !== hInt(`${seed}mi`, planned.length)) : [...planned];
    const scheduledMin = group.reduce((a, x) => a + Math.max(0, toMin(x.end) - toMin(x.start)), 0);
    const areaCoveragePct = 55 + hInt(`${seed}area`, 31);
    const compliancePct = missOne ? 62 + hInt(`${seed}cmp`, 18) : 82 + hInt(`${seed}cmp`, 15);
    const timeInSectorsMin = Math.round(scheduledMin * (0.6 + h01(`${seed}tis`) * 0.35));
    const idleMin = 20 + hInt(`${seed}idle`, 70);
    const incidentsReported = hInt(`${seed}inc`, 4);
    out.push({
      id: `cmp-${workerId}-${dateISO}`,
      workerId, dateISO, areaId: group[0].areaId,
      sectorsPlanned: planned, sectorsVisited: visited,
      compliancePct, incidentsReported, timeInSectorsMin, scheduledMin, areaCoveragePct, idleMin,
      timings: group.map((x) => `${fmtCompact(x.start)} – ${fmtCompact(x.end)}`),
    });
  }
  return out.sort((a, b) => (a.dateISO < b.dateISO ? 1 : a.dateISO > b.dateISO ? -1 : a.workerId.localeCompare(b.workerId)));
}

/* ─────────────────────────── small pieces ─────────────────────────── */
function WorkerAvatar({ name, color = 'var(--primary)', size = 26 }: { name: string; color?: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return <span className="grid shrink-0 place-items-center rounded-full font-semibold text-white" style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>{initials || '—'}</span>;
}

function MiniKpi({ icon, label, value, iconColor = 'var(--primary)' }: { icon: React.ReactNode; label: string; value: React.ReactNode; iconColor?: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${iconColor} 14%, transparent)`, color: iconColor }}>{icon}</span>
      <div className="flex min-w-0 flex-col">
        <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="truncate text-body-sm font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}

function VisitPill({ visited }: { visited: boolean }) {
  const color = visited ? 'var(--status-success)' : 'var(--status-error)';
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-bold uppercase tracking-wide" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
      <span className="inline-block size-1.5 rounded-full" style={{ background: color }} />{visited ? 'Visited' : 'Not Visited'}
    </span>
  );
}
function CriticalityPill({ critical }: { critical: boolean }) {
  const color = critical ? 'var(--status-error)' : 'var(--status-warning)';
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-caption font-bold uppercase tracking-wide" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>{critical ? 'Critical' : 'Minor'}</span>;
}

interface CmpIncidentRow { id: string; title: string; kpiCategory: string; reportedOn: string; critical: boolean; }
function sectorIncidents(seed: string, count: number): CmpIncidentRow[] {
  return Array.from({ length: count }, (_, i) => {
    const k = `${seed}${i}`;
    const day = 1 + hInt(`${k}d`, 27);
    const hh = 6 + hInt(`${k}h`, 12);
    return {
      id: `AN-${10000 + hInt(`${k}id`, 89999)}`,
      title: INCIDENT_TITLES[hInt(`${k}t`, INCIDENT_TITLES.length)],
      kpiCategory: KPI_CATEGORIES[hInt(`${k}c`, KPI_CATEGORIES.length)],
      reportedOn: `${String(day).padStart(2, '0')} ${MON_SHORT[hInt(`${k}m`, 12)]}, 2026 ${fmt12(`${String(hh).padStart(2, '0')}:${String(hInt(`${k}mi`, 6) * 10).padStart(2, '0')}`)}`,
      critical: hInt(`${k}cr`, 3) === 0,
    };
  });
}

/* ═══════════════════════════ detail side-sheet ═══════════════════════════ */
function ComplianceDetailSheet({
  entry, worker, areaLabel, labels, renderRouteMap, onClose,
}: {
  entry: ComplianceEntry; worker?: ShiftWorker; areaLabel: string;
  labels: Required<ShiftPlannerLabels>; renderRouteMap?: WorkforceComplianceProps['renderRouteMap']; onClose: () => void;
}) {
  const dateLbl = dateLong(parseISO(entry.dateISO));
  const gaugeColor = entry.compliancePct >= 90 ? 'var(--status-success)' : entry.compliancePct >= 75 ? 'var(--status-warning)' : 'var(--status-error)';

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" width="min(1100px, 96vw)" className="p-0">
        <SheetHeader>
          <SheetTitle>{labels.workerSingular} · Shifts / {worker?.name ?? 'Unassigned'}</SheetTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-body-xs font-medium text-foreground"><Icons.Calendar size={13} className="text-muted-foreground" />{dateLbl}</span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-body-xs font-medium text-foreground"><Icons.MarkerPin01 size={13} className="text-muted-foreground" />{areaLabel}</span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-6">
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="row-span-2 flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card p-3">
              <ComplianceGauge value={entry.compliancePct} size={120} />
              <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Overall Compliance</span>
            </div>
            <MiniKpi icon={<WorkerAvatar name={worker?.name ?? '—'} color={worker?.color} size={22} />} label={labels.workerSingular} value={worker?.name ?? 'Unassigned'} />
            <MiniKpi icon={<Icons.Grid01 size={16} />} label={`${labels.subAreaSingular}s Planned`} value={entry.sectorsPlanned.join(', ')} />
            <MiniKpi icon={<Icons.Clock size={16} />} label="Timings Scheduled" value={entry.timings.join(', ') || '—'} />
            <MiniKpi icon={<Icons.MarkerPin01 size={16} />} label={`${labels.subAreaSingular}s Visited`} value={`${entry.sectorsVisited.length} / ${entry.sectorsPlanned.length}`} iconColor={entry.sectorsVisited.length === entry.sectorsPlanned.length ? 'var(--status-success)' : 'var(--status-warning)'} />
            <MiniKpi icon={<Icons.AlertTriangle size={16} />} label="Incidents Reported" value={entry.incidentsReported} iconColor="var(--status-error)" />
            <MiniKpi icon={<Icons.Clock size={16} />} label="Time In Sectors" value={`${hm(entry.timeInSectorsMin)} / ${hm(entry.scheduledMin)}`} />
            <MiniKpi icon={<Icons.Activity size={16} />} label="Area Coverage" value={`${entry.areaCoveragePct}%`} />
            <MiniKpi icon={<Icons.Clock size={16} />} label="Idle Time" value={hm(entry.idleMin)} />
          </div>

          {/* middle: plan log + optional map */}
          <div className={cn('mt-5 grid gap-4', renderRouteMap ? 'lg:grid-cols-2' : 'grid-cols-1')}>
            <PlanLog entry={entry} areaLabel={areaLabel} />
            {renderRouteMap && (
              <div className="min-h-[280px] overflow-hidden rounded-lg border border-border">{renderRouteMap({ entry })}</div>
            )}
          </div>

          {/* bottom: per-sub-area cards */}
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {entry.sectorsPlanned.map((sector, i) => {
              const visited = entry.sectorsVisited.includes(sector);
              const seed = `${entry.workerId}${entry.dateISO}${sector}`;
              return (
                <div key={sector} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-body-sm font-semibold text-foreground">Inspection {labels.subAreaSingular} {i + 1}</span>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-caption font-semibold uppercase text-muted-foreground">{sector}</span>
                    </div>
                    <VisitPill visited={visited} />
                  </div>
                  {visited ? (
                    <>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                        <ComplianceGauge value={Math.max(50, entry.compliancePct - hInt(`${seed}g`, 12))} size={96} />
                        <div className="flex flex-col gap-2 text-body-xs">
                          <span className="flex items-center gap-1.5 text-muted-foreground"><Icons.Clock size={13} />Window: <span className="font-medium text-foreground">{entry.timings[i % Math.max(1, entry.timings.length)] ?? '—'}</span></span>
                          <span className="flex items-center gap-1.5 text-muted-foreground"><Icons.Clock size={13} />Time in {labels.subAreaSingular}: <span className="font-medium text-foreground">{hm(Math.round(entry.timeInSectorsMin / entry.sectorsPlanned.length))}</span></span>
                          <span className="flex items-center gap-1.5 text-muted-foreground"><Icons.AlertTriangle size={13} />Incidents: <span className="font-medium text-foreground">{hInt(`${seed}ic`, 3)}</span></span>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-body-xs">
                          <span className="text-muted-foreground">Area Coverage</span>
                          <span className="font-medium text-foreground">{50 + hInt(`${seed}ac`, 45)}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${50 + hInt(`${seed}ac`, 45)}%` }} />
                        </div>
                      </div>
                      <SectorIncidentsTable rows={sectorIncidents(seed, 1 + hInt(`${seed}ni`, 3))} />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                      <span className="grid size-10 place-items-center rounded-full bg-[color-mix(in_srgb,var(--status-error)_12%,transparent)] text-[var(--status-error)]"><Icons.XClose size={18} /></span>
                      <span className="text-body-sm font-medium text-muted-foreground">No Compliance Data Yet</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectorIncidentsTable({ rows }: { rows: CmpIncidentRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full border-collapse text-left">
        <thead className="bg-muted/40 text-caption uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-semibold">Title</th>
            <th className="px-3 py-2 font-semibold">KPI Category</th>
            <th className="px-3 py-2 font-semibold">Reported On</th>
            <th className="px-3 py-2 font-semibold">Criticality</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 text-body-xs font-medium text-foreground">{r.title}</td>
              <td className="px-3 py-2 text-body-xs text-muted-foreground">{r.kpiCategory}</td>
              <td className="px-3 py-2 text-body-xs text-muted-foreground">{r.reportedOn}</td>
              <td className="px-3 py-2"><CriticalityPill critical={r.critical} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Compact Plan Log — Started Shift + reported incidents on a vertical timeline. */
function PlanLog({ entry, areaLabel }: { entry: ComplianceEntry; areaLabel: string }) {
  const seed = `${entry.workerId}${entry.dateISO}`;
  const startTime = (entry.timings[0] ?? '9am – 11am').split(' – ')[0];
  const events = [
    { icon: <Icons.PlayCircle size={15} className="text-[var(--status-success)]" />, title: 'Started Shift', time: startTime, sub: areaLabel },
    ...Array.from({ length: entry.incidentsReported }, (_, i) => {
      const hh = 8 + hInt(`${seed}e${i}h`, 9);
      const mm = hInt(`${seed}e${i}m`, 6) * 10;
      return { icon: <Icons.AlertTriangle size={15} className="text-[var(--status-warning)]" />, title: 'Incident Reported', time: fmtCompact(`${hh}:${String(mm).padStart(2, '0')}`), sub: `IN-${10000 + hInt(`${seed}e${i}id`, 89999)}` };
    }),
  ];
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-2.5 text-body-sm font-semibold text-foreground">Plan Log</div>
      <ul className="flex flex-col gap-3 p-4">
        {events.map((e, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="inline-flex min-w-[64px] items-center justify-center rounded-md border border-border px-1.5 py-0.5 text-caption font-medium text-muted-foreground">{e.time}</span>
            <span className="mt-0.5 shrink-0">{e.icon}</span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body-sm font-semibold text-foreground">{e.title}</span>
              <span className="flex items-center gap-1 truncate text-body-xs text-muted-foreground"><Icons.MarkerPin01 size={11} />{e.sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ═══════════════════════════ WorkforceCompliance (table) ═══════════════════ */
export function WorkforceCompliance({
  workers, shifts, areas, subAreas = [], labels: labelsProp, renderRouteMap, className,
}: WorkforceComplianceProps) {
  const labels: Required<ShiftPlannerLabels> = {
    workerSingular: labelsProp?.workerSingular ?? 'Worker',
    workerPlural: labelsProp?.workerPlural ?? 'Workers',
    areaSingular: labelsProp?.areaSingular ?? 'Area',
    subAreaSingular: labelsProp?.subAreaSingular ?? 'Zone',
  };
  const entries = React.useMemo(() => deriveComplianceEntries(shifts, subAreas), [shifts, subAreas]);
  const worker = React.useCallback((id: string) => workers.find((w) => w.id === id), [workers]);
  const areaLabel = React.useCallback((id: string) => { const a = areas.find((x) => x.id === id); return a ? (a.sub ? `${a.label} · ${a.sub}` : a.label) : '—'; }, [areas]);

  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState<ComplianceEntry | null>(null);
  const q = query.trim().toLowerCase();
  const rows = entries.filter((e) => !q || `${worker(e.workerId)?.name ?? ''} ${dateLong(parseISO(e.dateISO))} ${areaLabel(e.areaId)}`.toLowerCase().includes(q));

  const SectorsCell = ({ e }: { e: ComplianceEntry }) => {
    const full = e.sectorsVisited.length === e.sectorsPlanned.length;
    const color = full ? 'var(--status-success)' : 'var(--status-warning)';
    return (
      <TooltipProvider delayDuration={80}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-body-xs font-semibold tabular-nums" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
              <Icons.MarkerPin01 size={11} />{e.sectorsVisited.length} / {e.sectorsPlanned.length}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-foreground p-2 text-background">
            <ul className="flex flex-col gap-1">
              {e.sectorsPlanned.map((sec) => {
                const v = e.sectorsVisited.includes(sec);
                return (
                  <li key={sec} className="flex items-center gap-2 text-body-xs">
                    {v ? <Icons.CheckCircle size={13} style={{ color: 'var(--status-success)' }} /> : <Icons.XClose size={13} style={{ color: 'var(--status-error)' }} />}
                    <span className={v ? '' : 'line-through opacity-80'}>{sec}</span>
                  </li>
                );
              })}
            </ul>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const columns: DataTableColumn<ComplianceEntry>[] = [
    { id: 'date', header: 'Date', accessor: (e) => dateLong(parseISO(e.dateISO)), width: '130px', sortable: true },
    { id: 'worker', header: labels.workerSingular, sortable: true, accessor: (e) => worker(e.workerId)?.name ?? '',
      cell: (e) => { const w = worker(e.workerId); return <span className="flex items-center gap-2"><WorkerAvatar name={w?.name ?? '—'} color={w?.color} size={26} /><span className="truncate font-medium text-foreground">{w?.name}</span></span>; } },
    { id: 'area', header: labels.areaSingular, width: '160px', accessor: (e) => areaLabel(e.areaId) },
    { id: 'sectors', header: `${labels.subAreaSingular}s Visited`, width: '140px', cell: (e) => <SectorsCell e={e} /> },
    { id: 'compliance', header: 'Compliance', width: '120px', align: 'right', cell: (e) => <div className="inline-flex justify-end"><MiniDonutCell value={e.compliancePct} size={36} /></div> },
    { id: 'incidents', header: 'Incidents', width: '100px', align: 'right', accessor: (e) => e.incidentsReported, sortable: true },
    { id: 'time', header: 'Time in Sectors', width: '150px', accessor: (e) => `${hm(e.timeInSectorsMin)} / ${hm(e.scheduledMin)}` },
    { id: 'coverage', header: 'Area Coverage', width: '120px', align: 'right', accessor: (e) => `${e.areaCoveragePct}%`, sortable: true },
  ];

  return (
    <div className={cn('flex h-full flex-col gap-3 overflow-auto p-6', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-[320px] max-w-full">
          <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search anything here" className="pl-8" />
        </div>
        <button type="button" className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Filter"><Icons.FilterLines size={15} /></button>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(e) => e.id}
        onRowClick={(e) => setOpen(e)}
        emptyState={<div className="py-10 text-center text-body-sm text-muted-foreground">No compliance records yet — schedule shifts in the Planning tab.</div>}
      />
      {open && (
        <ComplianceDetailSheet
          entry={open}
          worker={worker(open.workerId)}
          areaLabel={areaLabel(open.areaId)}
          labels={labels}
          renderRouteMap={renderRouteMap}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
