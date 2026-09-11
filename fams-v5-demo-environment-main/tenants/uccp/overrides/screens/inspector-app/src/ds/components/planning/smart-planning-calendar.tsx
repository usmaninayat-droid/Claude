import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button, Input, Switch } from '../primitives';

/**
 * SmartPlanningCalendar — the Smart Planning "Calendar View" (Tadweer Feb release,
 * n0i75qJfZlSACytghHMs67 · 104-353). Recurring plans as rows × 7 day columns; each
 * cell is that plan's scheduled window for the day (time + vehicle + assignee),
 * shift-colored (morning / afternoon / night), with conflict + missing-assignment
 * highlighting, a Highlight-Conflicts toggle + legend, a week navigator and
 * Configure New Plan. Visualizes how a plan repeats day-over-day across the week.
 *
 * Brand = FAMS blue chrome; green/amber/red are genuine status (conflict / missing
 * / shift accents). Config-driven: `plans`, `weekDays`, `weekLabel`, callbacks.
 */

export type PlanShift = 'morning' | 'afternoon' | 'night';
export interface PlanDayCell {
  time: string;
  vehicle: string;
  /** assignee name; empty/undefined ⇒ missing assignment. */
  assignee?: string;
  shift: PlanShift;
  /** overlaps another plan on this day ⇒ conflict. */
  conflict?: boolean;
}
export interface SmartPlanRow {
  id: string;
  name: string;
  status: string;
  lot: string;
  /** exactly 7 cells (Sun→Sat); null = no window that day. */
  days: (PlanDayCell | null)[];
}
export interface SmartPlanningCalendarProps {
  plans: SmartPlanRow[];
  weekDays: { abbr: string; date: number }[];
  weekLabel: string;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onConfigureNewPlan?: () => void;
  onOpenPlan?: (plan: SmartPlanRow) => void;
  className?: string;
}

const SHIFT: Record<PlanShift, { icon: React.ReactNode; color: string }> = {
  morning: { icon: <Icons.Sun size={13} />, color: 'var(--status-warning)' },
  afternoon: { icon: <Icons.SunSetting02 size={13} />, color: 'var(--status-warning)' },
  night: { icon: <Icons.Moon01 size={13} />, color: 'var(--primary)' },
};
const MISSING = 'var(--status-error)';
const CONFLICT = 'var(--status-success)'; // per the Feb-release legend (Conflict = green chip)

function Cell({ cell, highlight, onClick }: { cell: PlanDayCell | null; highlight: boolean; onClick?: () => void }) {
  if (!cell) return <td className="border-b border-r border-border/60 bg-muted/20" />;
  const missing = !cell.assignee || cell.assignee === '-';
  const accent = highlight ? (cell.conflict ? CONFLICT : missing ? MISSING : SHIFT[cell.shift].color) : SHIFT[cell.shift].color;
  const tint = highlight && (cell.conflict || missing) ? `color-mix(in srgb, ${accent} 7%, var(--card))` : undefined;
  return (
    <td className="border-b border-r border-border/60 p-1.5 align-top">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full flex-col gap-1 rounded-md border bg-card px-2 py-1.5 text-left transition-colors hover:bg-muted/40"
        style={{ borderColor: 'var(--border)', borderLeftWidth: 3, borderLeftColor: accent, background: tint }}
      >
        <span className="flex items-center gap-1 text-caption font-semibold text-foreground">
          <span style={{ color: SHIFT[cell.shift].color }}>{SHIFT[cell.shift].icon}</span>{cell.time}
        </span>
        <span className="flex items-center gap-2 text-caption text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Icons.Truck01 size={10} />{cell.vehicle}</span>
          <span className={cn('inline-flex items-center gap-1', missing && highlight && 'text-[color:var(--status-error)]')}><Icons.User01 size={10} />{cell.assignee || '—'}</span>
        </span>
      </button>
    </td>
  );
}

export function SmartPlanningCalendar({
  plans, weekDays, weekLabel, onPrevWeek, onNextWeek, onConfigureNewPlan, onOpenPlan, className,
}: SmartPlanningCalendarProps) {
  const [query, setQuery] = React.useState('');
  const [highlight, setHighlight] = React.useState(true);
  const [includeNonExec, setIncludeNonExec] = React.useState(false);

  const q = query.trim().toLowerCase();
  const rows = plans.filter((p) => !q || `${p.name} ${p.lot} ${p.status}`.toLowerCase().includes(q));

  const cells = rows.flatMap((p) => p.days.filter(Boolean) as PlanDayCell[]);
  const missingCount = cells.filter((c) => !c.assignee || c.assignee === '-').length;
  const conflictCount = cells.filter((c) => c.conflict).length;

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-3 overflow-hidden p-6', className)}>
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-[320px] max-w-full">
          <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search anything here" className="pl-8" />
        </div>
        <button type="button" aria-label="Filter" className="grid size-10 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.FilterLines size={16} /></button>
        <div className="ml-auto">
          <Button variant="primary" onClick={onConfigureNewPlan}><Icons.Plus size={16} className="mr-1.5" />Configure New Plan</Button>
        </div>
      </div>

      {/* nav + toggles + legend */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={onPrevWeek} aria-label="Previous week" className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.ChevronLeft size={15} /></button>
          <button type="button" onClick={onNextWeek} aria-label="Next week" className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.ChevronRight size={15} /></button>
          <span className="ml-1 text-body-sm font-semibold text-foreground">{weekLabel}</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <label className="flex items-center gap-2 text-body-sm font-medium text-muted-foreground">
            <input type="checkbox" checked={includeNonExec} onChange={(e) => setIncludeNonExec(e.target.checked)} className="size-4 rounded border-border accent-[var(--primary)]" />Include Non-Executable
          </label>
          <label className="flex items-center gap-2 text-body-sm font-medium text-foreground">
            <Switch checked={highlight} onCheckedChange={(v) => setHighlight(!!v)} />Highlight Conflicts
          </label>
          {highlight && (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-body-xs font-semibold" style={{ background: `color-mix(in srgb, ${MISSING} 14%, transparent)`, color: MISSING }}><span className="inline-block size-2 rounded-sm" style={{ background: MISSING }} />Missing Assignment ({missingCount})</span>
              <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-body-xs font-semibold" style={{ background: `color-mix(in srgb, ${CONFLICT} 14%, transparent)`, color: CONFLICT }}><span className="inline-block size-2 rounded-sm" style={{ background: CONFLICT }} />Conflict ({conflictCount})</span>
            </div>
          )}
        </div>
      </div>

      {/* grid */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-[1080px] border-collapse">
          <thead className="sticky top-0 z-[1]">
            <tr className="bg-muted/40">
              <th className="sticky left-0 z-[1] w-[240px] border-b border-r border-border bg-muted/40 px-3 py-2.5 text-left text-caption font-bold uppercase tracking-wide text-muted-foreground">Plans</th>
              {weekDays.map((d, i) => {
                const weekend = i === 0 || i === 6;
                return (
                  <th key={i} className="border-b border-r border-border px-2 py-2 text-center">
                    <div className={cn('text-caption font-bold uppercase tracking-wide', weekend ? 'text-muted-foreground' : 'text-primary')}>{d.abbr} <span className="text-foreground">{d.date}</span></div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="sticky left-0 z-[1] w-[240px] border-b border-r border-border bg-card px-3 py-2.5 align-top">
                  <button type="button" onClick={() => onOpenPlan?.(p)} className="flex flex-col gap-1 text-left">
                    <span className="flex items-start gap-2">
                      <span className="line-clamp-2 text-body-sm font-semibold text-foreground">{p.name}</span>
                      <span className="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-caption font-bold uppercase text-white" style={{ background: 'var(--status-success)' }}>{p.status}</span>
                    </span>
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-caption font-medium" style={{ background: 'color-mix(in srgb, var(--chart-accent-purple) 12%, transparent)', color: 'var(--chart-accent-purple)' }}><Icons.BinCollection size={12} />{p.lot}</span>
                  </button>
                </td>
                {Array.from({ length: 7 }, (_, i) => (
                  <Cell key={i} cell={p.days[i] ?? null} highlight={highlight} onClick={() => onOpenPlan?.(p)} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
