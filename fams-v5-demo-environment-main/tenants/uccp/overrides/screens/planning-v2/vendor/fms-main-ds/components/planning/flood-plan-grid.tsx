import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Input } from '../primitives';
import { StatusPill } from './flood-plan-list';
import {
  FLOOD_SHIFT_CONFIG, forecastDays, shiftsOverlap, todayIso,
  type FloodPlanCatalog, type FloodPlanRecord, type FloodRosterEntry, type FloodShift,
  type FloodVehicleUnit, type FloodCrewMember,
} from './flood-plan-types';

/**
 * FloodPlanGrid — Smart Planning's Grid view (FM-6369): the rostering matrix.
 * Rows are plans, vehicles, drivers or workforce (switchable); columns are
 * dates in a navigable window that always includes today by default.
 *
 *   · Empty cell (plans grouping) → the roster assignment side sheet opens
 *     for that plan and date; filled cell → the same sheet, editable.
 *   · Conflict chips filter to driver / vehicle / workforce / all conflicts,
 *     evaluated on actual shift windows (never labels).
 *   · KPI cards: plans, conflicts, vehicles and crew for the visible window.
 */

export interface FloodPlanGridProps {
  plans: FloodPlanRecord[];
  catalog: FloodPlanCatalog;
  vehicleUnits: FloodVehicleUnit[];
  crewMembers: FloodCrewMember[];
  onOpenPlan: (id: string) => void;
  /** open the roster sheet — existing entry (editable) or a new one on `date`. */
  onRoster: (plan: FloodPlanRecord, entry?: FloodRosterEntry, date?: string) => void;
  className?: string;
}

type Grouping = 'plans' | 'vehicles' | 'drivers' | 'workforce';
type ConflictKind = 'vehicle' | 'driver' | 'workforce';
const GROUPINGS: { id: Grouping; label: string; icon: React.ReactNode }[] = [
  { id: 'plans', label: 'Plans', icon: <Icons.LayoutAlt01 size={14} /> },
  { id: 'vehicles', label: 'Vehicles', icon: <Icons.Truck02 size={14} /> },
  { id: 'drivers', label: 'Drivers', icon: <Icons.User01 size={14} /> },
  { id: 'workforce', label: 'Workforce', icon: <Icons.Users02 size={14} /> },
];
const SHIFT_ICON: Record<FloodShift, React.ReactNode> = {
  Morning: <Icons.Sun size={12} />, Afternoon: <Icons.SunSetting02 size={12} />, Night: <Icons.CloudMoon size={12} />,
};

interface Flat { plan: FloodPlanRecord; entry: FloodRosterEntry }

function isoShift(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function FloodPlanGrid({ plans, catalog, vehicleUnits, crewMembers, onOpenPlan, onRoster, className }: FloodPlanGridProps) {
  const [startIso, setStartIso] = React.useState(() => todayIso());
  const [span, setSpan] = React.useState<7 | 14>(7);
  const [grouping, setGrouping] = React.useState<Grouping>('plans');
  const [conflictFilter, setConflictFilter] = React.useState<'none' | 'all' | ConflictKind>('none');
  const [query, setQuery] = React.useState('');

  const live = React.useMemo(() => plans.filter((p) => p.status !== 'SUPERSEDED'), [plans]);
  const dates = React.useMemo(() => {
    const [y, m, d] = startIso.split('-').map(Number);
    return forecastDays(new Date(y, m - 1, d), span);
  }, [startIso, span]);
  const inWindow = (iso: string) => iso >= dates[0].iso && iso <= dates[dates.length - 1].iso;
  const today = todayIso();

  const flat = React.useMemo<Flat[]>(() => live.flatMap((plan) => plan.roster.map((entry) => ({ plan, entry }))), [live]);
  const memberOf = React.useCallback((name: string) => crewMembers.find((c) => c.id === name), [crewMembers]);

  /* conflicts — every double-booked resource across overlapping shift windows */
  const conflicts = React.useMemo(() => {
    const map = new Map<string, Set<ConflictKind>>();
    const mark = (id: string, k: ConflictKind) => { const s = map.get(id) ?? new Set<ConflictKind>(); s.add(k); map.set(id, s); };
    for (let i = 0; i < flat.length; i++) {
      for (let j = i + 1; j < flat.length; j++) {
        const a = flat[i]; const b = flat[j];
        if (a.plan.id === b.plan.id && a.entry.id === b.entry.id) continue;
        if (!shiftsOverlap(a.entry.date, a.entry.shift, b.entry.date, b.entry.shift)) continue;
        for (const v of a.entry.vehicles) if (b.entry.vehicles.includes(v)) { mark(a.entry.id, 'vehicle'); mark(b.entry.id, 'vehicle'); }
        for (const c of a.entry.crew) if (b.entry.crew.includes(c)) { const k: ConflictKind = memberOf(c)?.driver ? 'driver' : 'workforce'; mark(a.entry.id, k); mark(b.entry.id, k); }
      }
    }
    return map;
  }, [flat, memberOf]);
  const entryConflicted = (e: FloodRosterEntry, kind?: ConflictKind) => {
    const s = conflicts.get(e.id);
    return kind ? !!s?.has(kind) : !!s?.size;
  };

  /* window KPIs */
  const winEntries = React.useMemo(() => flat.filter((f) => inWindow(f.entry.date)), [flat, dates]); // eslint-disable-line react-hooks/exhaustive-deps
  const kpis = React.useMemo(() => ({
    plans: new Set(winEntries.map((f) => f.plan.id)).size,
    conflicts: winEntries.filter((f) => entryConflicted(f.entry)).length,
    vehicles: new Set(winEntries.flatMap((f) => f.entry.vehicles)).size,
    crew: new Set(winEntries.flatMap((f) => f.entry.crew)).size,
  }), [winEntries, conflicts]); // eslint-disable-line react-hooks/exhaustive-deps
  const kindCount = (k: ConflictKind) => winEntries.filter((f) => entryConflicted(f.entry, k)).length;

  /* rows per grouping */
  const q = query.trim().toLowerCase();
  interface Row { id: string; title: React.ReactNode; searchKey: string; planFor?: FloodPlanRecord; cells: (date: string) => Flat[] }
  const rows = React.useMemo<Row[]>(() => {
    const byDate = (pred: (f: Flat) => boolean) => (date: string) => flat.filter((f) => f.entry.date === date && pred(f));
    if (grouping === 'plans') {
      return live.map((p) => ({
        id: p.id,
        searchKey: `${p.name} ${p.id}`,
        planFor: p,
        title: (
          <button type="button" onClick={() => onOpenPlan(p.id)} className="flex w-full flex-col gap-1 text-left">
            <span className="line-clamp-2 text-body-sm font-semibold text-foreground hover:underline">{p.name}</span>
            <span className="flex items-center gap-1.5"><StatusPill status={p.status} /><span className="text-caption text-muted-foreground">v{p.version}</span></span>
          </button>
        ),
        cells: byDate((f) => f.plan.id === p.id),
      }));
    }
    const resourceRow = (id: string, icon: React.ReactNode, sub: string, pred: (f: Flat) => boolean): Row => ({
      id, searchKey: `${id} ${sub}`,
      title: (
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-body-sm font-semibold text-foreground">{icon}{id}</span>
          <span className="text-caption text-muted-foreground">{sub}</span>
        </span>
      ),
      cells: byDate(pred),
    });
    if (grouping === 'vehicles') {
      return vehicleUnits.filter((v) => v.active).map((v) =>
        resourceRow(v.id, <Icons.Truck02 size={14} className="text-muted-foreground" />, catalog.vehicleTypes.find((t) => t.id === v.typeId)?.name ?? v.typeId, (f) => f.entry.vehicles.includes(v.id)));
    }
    const pool = grouping === 'drivers' ? crewMembers.filter((c) => c.active && c.driver) : crewMembers.filter((c) => c.active);
    return pool.map((c) =>
      resourceRow(c.id, <Icons.User01 size={14} className="text-muted-foreground" />, `${catalog.workforceTypes.find((t) => t.id === c.typeId)?.name ?? c.typeId}${c.driver ? ' · Driver' : ''}`, (f) => f.entry.crew.includes(c.id)));
  }, [grouping, live, vehicleUnits, crewMembers, catalog, flat, onOpenPlan]);

  const shownRows = rows.filter((r) => {
    if (q && !r.searchKey.toLowerCase().includes(q)) return false;
    if (conflictFilter === 'none') return true;
    const kind = conflictFilter === 'all' ? undefined : conflictFilter;
    return dates.some((d) => r.cells(d.iso).some((f) => entryConflicted(f.entry, kind)));
  });

  const kpiCards = [
    { label: 'Plans rostered', value: kpis.plans, icon: <Icons.LayoutAlt01 size={18} />, tone: 'var(--chart-accent-purple)' },
    { label: 'Conflicts', value: kpis.conflicts, icon: <Icons.AlertTriangle size={18} />, tone: kpis.conflicts ? 'var(--status-error)' : 'var(--status-success)' },
    { label: 'Vehicles assigned', value: kpis.vehicles, icon: <Icons.Truck02 size={18} />, tone: 'var(--status-info)' },
    { label: 'Crew assigned', value: kpis.crew, icon: <Icons.Users02 size={18} />, tone: 'var(--status-warning)' },
  ];

  const chip = (id: 'all' | ConflictKind, label: string, count: number) => (
    <button
      key={id}
      type="button"
      aria-pressed={conflictFilter === id}
      onClick={() => setConflictFilter((cur) => (cur === id ? 'none' : id))}
      className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-body-xs font-semibold transition-colors',
        conflictFilter === id ? 'border-[var(--status-error)] bg-[color-mix(in_srgb,var(--status-error)_10%,transparent)] text-[var(--status-error)]' : 'border-border text-muted-foreground hover:bg-muted')}
    >
      <span className="inline-block size-2 rounded-sm" style={{ background: 'var(--status-error)', opacity: count ? 1 : 0.35 }} />{label} ({count})
    </button>
  );

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-3 overflow-hidden p-6', className)}>
      {/* KPI cards — the visible window */}
      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <div key={k.label} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md" style={{ background: `color-mix(in srgb, ${k.tone} 12%, transparent)`, color: k.tone }}>{k.icon}</span>
            <span className="flex flex-col"><span className="text-body-lg font-bold leading-6 text-foreground">{k.value}</span><span className="text-caption text-muted-foreground">{k.label}</span></span>
          </div>
        ))}
      </div>

      {/* toolbar: grouping · search · conflict chips */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-lg border border-border">
          {GROUPINGS.map((g) => (
            <button key={g.id} type="button" aria-pressed={grouping === g.id} onClick={() => setGrouping(g.id)} className={cn('flex items-center gap-1.5 px-3 py-2 text-body-xs font-semibold transition-colors', grouping === g.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
              {g.icon}{g.label}
            </button>
          ))}
        </div>
        <div className="relative w-[260px] max-w-full">
          <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${grouping}`} className="pl-8" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Conflicts</span>
          {chip('all', 'All', kpis.conflicts)}
          {chip('vehicle', 'Vehicle', kindCount('vehicle'))}
          {chip('driver', 'Driver', kindCount('driver'))}
          {chip('workforce', 'Workforce', kindCount('workforce'))}
        </div>
      </div>

      {/* date window navigation */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setStartIso((s) => isoShift(s, -span))} aria-label="Previous window" className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.ChevronLeft size={15} /></button>
        <button type="button" onClick={() => setStartIso((s) => isoShift(s, span))} aria-label="Next window" className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.ChevronRight size={15} /></button>
        <button type="button" onClick={() => setStartIso(todayIso())} className="rounded-md border border-border px-2.5 py-1.5 text-body-xs font-semibold text-foreground transition-colors hover:bg-muted">Today</button>
        <label className="flex items-center gap-1.5 text-body-xs font-medium text-muted-foreground">
          From
          <input type="date" value={startIso} onChange={(e) => e.target.value && setStartIso(e.target.value)} className="rounded-md border border-border bg-card px-2 py-1.5 text-body-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <select value={span} onChange={(e) => setSpan(Number(e.target.value) as 7 | 14)} className="rounded-md border border-border bg-card px-2 py-1.5 text-body-xs font-medium text-foreground outline-none">
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
        </select>
        <span className="ml-1 text-body-sm font-semibold text-foreground">{dates[0].day} {dates[0].mon} – {dates[dates.length - 1].day} {dates[dates.length - 1].mon}</span>
      </div>

      {/* the matrix */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
        <table className="w-full border-collapse" style={{ minWidth: 240 + dates.length * 150 }}>
          <thead className="sticky top-0 z-[2]">
            <tr className="bg-muted/40">
              <th className="sticky left-0 z-[1] w-[240px] border-b border-r border-border bg-muted/40 px-3 py-2.5 text-left text-caption font-bold uppercase tracking-wide text-muted-foreground">{GROUPINGS.find((g) => g.id === grouping)?.label}</th>
              {dates.map((d) => (
                <th key={d.iso} className={cn('border-b border-r border-border px-2 py-2 text-center', d.iso === today && 'bg-primary/[0.06]')}>
                  <div className={cn('text-caption font-bold uppercase tracking-wide', d.iso === today ? 'text-primary' : 'text-muted-foreground')}>{d.dow} <span className="text-foreground">{d.day} {d.mon}</span>{d.iso === today && <span className="ml-1 rounded-sm bg-primary px-1 py-px text-[9px] font-bold text-white">TODAY</span>}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shownRows.map((row) => (
              <tr key={row.id}>
                <td className="sticky left-0 z-[1] w-[240px] border-b border-r border-border bg-card px-3 py-2.5 align-top">{row.title}</td>
                {dates.map((d) => {
                  const items = row.cells(d.iso);
                  if (!items.length) {
                    const rosterable = row.planFor;
                    return (
                      <td key={d.iso} className={cn('border-b border-r border-border/60 p-1 align-top', d.iso === today && 'bg-primary/[0.03]')}>
                        {rosterable ? (
                          <button
                            type="button"
                            onClick={() => onRoster(rosterable, undefined, d.iso)}
                            title={rosterable.status === 'APPROVED' ? `Roster ${rosterable.name} on ${d.day} ${d.mon}` : 'Only approved plans can be rostered'}
                            className="group grid h-full min-h-[52px] w-full place-items-center rounded-md text-transparent transition-colors hover:bg-muted/50 hover:text-muted-foreground"
                          >
                            <Icons.Plus size={14} />
                          </button>
                        ) : <div className="min-h-[52px]" />}
                      </td>
                    );
                  }
                  return (
                    <td key={d.iso} className={cn('border-b border-r border-border/60 p-1 align-top', d.iso === today && 'bg-primary/[0.03]')}>
                      <div className="flex flex-col gap-1">
                        {items.map((f) => {
                          const conflicted = entryConflicted(f.entry, conflictFilter === 'none' || conflictFilter === 'all' ? undefined : conflictFilter) || entryConflicted(f.entry);
                          const cfg = FLOOD_SHIFT_CONFIG[f.entry.shift];
                          return (
                            <button
                              key={f.entry.id}
                              type="button"
                              onClick={() => onRoster(f.plan, f.entry)}
                              title={`${f.plan.name} · ${f.entry.shift} (${cfg.start}–${cfg.end})${conflicted ? ' · CONFLICT' : ''} — click to edit`}
                              className={cn('flex w-full flex-col gap-0.5 rounded-md border bg-card px-2 py-1.5 text-left transition-colors hover:bg-muted/40')}
                              style={{ borderColor: 'var(--border)', borderLeftWidth: 3, borderLeftColor: conflicted ? 'var(--status-error)' : 'var(--status-success)', background: conflicted ? 'color-mix(in srgb, var(--status-error) 6%, var(--card))' : undefined }}
                            >
                              <span className="flex items-center gap-1 text-caption font-semibold text-foreground">
                                <span className="text-[color:var(--status-warning)]">{SHIFT_ICON[f.entry.shift]}</span>{cfg.start}–{cfg.end}
                                {conflicted && <Icons.AlertTriangle size={11} className="ml-auto text-[color:var(--status-error)]" />}
                              </span>
                              {grouping !== 'plans' && <span className="line-clamp-1 text-caption font-medium text-foreground">{f.plan.name}</span>}
                              {grouping !== 'vehicles' && <span className="inline-flex items-center gap-1 text-caption text-muted-foreground"><Icons.Truck01 size={10} />{f.entry.vehicles.join(', ') || '—'}</span>}
                              {(grouping === 'plans' || grouping === 'vehicles') && <span className="inline-flex items-center gap-1 text-caption text-muted-foreground"><Icons.User01 size={10} />{f.entry.crew.join(', ') || '—'}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {!shownRows.length && (
              <tr><td colSpan={dates.length + 1} className="px-4 py-10 text-center text-body-sm text-muted-foreground">{conflictFilter !== 'none' ? 'No conflicts in the visible window.' : 'Nothing matches.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
