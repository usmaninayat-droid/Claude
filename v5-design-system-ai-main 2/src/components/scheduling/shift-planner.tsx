import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import {
  Button, Input, Textarea, Switch,
  Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle,
  Popover, PopoverTrigger, PopoverContent,
  Dialog, DialogContent, DialogTitle, DialogDescription, toast,
} from '../primitives';
import { DateRangePicker } from '../basics';

/**
 * ShiftPlanner — a reusable, domain-agnostic **workforce shift planner**. A
 * weekly/daily planning grid (workers × days), conflict + utilization derivation,
 * a single-page Create/Edit sheet (grouped sections, no tabs) with a recurrence
 * engine + occurrence preview, and a recurring-delete dialog. Chrome is FAMS
 * primary blue; green/amber/red are reserved for genuine shift status — ok /
 * missing-assignment / conflict.
 *
 * DYNAMIC / config-driven: it holds NO domain vocabulary. Any workforce
 * (inspectors, drivers, technicians, guards, cleaners) is expressed through props
 * — `workers`, `areas`, `subAreas`, `tasks`, and `labels` — and it is CONTROLLED:
 * `shifts` come in as a prop; create/update/delete are reported through callbacks
 * so the product owns persistence (sim engine, store, or API). The map and the
 * "plans" reference tab are optional render slots, so the core carries no map or
 * table dependency.
 *
 * Adapted from the IIMS "Inspector Shifts" module (Tadweer Figma frames);
 * spec: iims-ins/docs/lifecycle-specs/06-inspector-shifts.md.
 */

/* ─────────────────────────────── types ─────────────────────────────── */

export interface ShiftWorker {
  id: string;
  name: string;
  /** e.g. "Inspector" / "Driver" — shown under the name. Falls back to labels.workerSingular. */
  roleLabel?: string;
  /** avatar tint; defaults to --primary. */
  color?: string;
}

/** A schedulable area (the "Lot"/zone/route/site a shift belongs to). */
export interface ShiftArea {
  id: string;
  label: string;
  /** optional second line, e.g. a district name ("Deira"). */
  sub?: string;
}

export interface PlannedShift {
  id: string;
  /** groups a recurring series (share one seriesId). */
  seriesId: string;
  /** '' = unassigned → "missing assignment". */
  workerId: string;
  /** 'YYYY-MM-DD'. */
  dateISO: string;
  /** 'HH:MM' 24h. */
  start: string;
  end: string;
  areaId: string;
  /** optional finer sub-area (the "Sector"). */
  subArea?: string;
  task: string;
  notes?: string;
  recurring: boolean;
}

export type ShiftFlag = 'conflict' | 'missing' | null;
export type DeleteScope = 'one' | 'following' | 'all';

export type Frequency = 'Daily' | 'Weekly' | 'Monthly';
export interface RecurrenceCfg {
  frequency: Frequency;
  every: number;
  monthlyDay?: number;
  endsMode: 'on' | 'after';
  endDateISO?: string;
  count?: number;
}

export interface ShiftPlannerLabels {
  workerSingular?: string; // "Inspector"
  workerPlural?: string;   // "Inspectors"
  areaSingular?: string;   // "Lot"
  subAreaSingular?: string;// "Sector"
}

export interface ShiftPlannerProps {
  workers: ShiftWorker[];
  shifts: PlannedShift[];
  areas: ShiftArea[];
  /** finer sub-areas offered in the sheet (the "Sectors"). Omit → no sub-area field/line. */
  subAreas?: string[];
  tasks: string[];
  labels?: ShiftPlannerLabels;
  /** reference "now" for the initial week + default dates. Defaults to today. */
  now?: number;
  /** daily-view first / last hour columns (inclusive). Defaults 8 … 19. */
  dayStartHour?: number;
  dayEndHour?: number;
  /** Persist newly-built shifts (recurring → one per occurrence). */
  onCreate: (shifts: PlannedShift[]) => void;
  onUpdate: (id: string, patch: Partial<PlannedShift>) => void;
  /** scope uses seriesId + dateISO for 'following'/'all'; the full shift is passed for context. */
  onDelete: (id: string, scope: DeleteScope, shift: PlannedShift) => void;
  /** optional map card in the sheet's Schedule section (kept out of the DS core). */
  renderAreaMap?: (ctx: { area?: ShiftArea; subArea?: string }) => React.ReactNode;
  /** optional "Scheduled Plans" reference section; provide → the sheet shows an
   *  extra "Scheduled Plans" heading below Schedule/Assignment. */
  renderPlansTab?: (ctx: { area?: ShiftArea }) => React.ReactNode;
  /** optional extra control rendered in the toolbar, right after the search box
   *  (e.g. a consumer-owned site/scope selector — same slot pattern as
   *  `DispatcherCockpit.filterSlot`). The DS core stays domain-agnostic; a
   *  product wires its own scoping control here instead of bolting a second
   *  toolbar row on top of this component. */
  filterSlot?: React.ReactNode;
  className?: string;
}

/* ─────────────────────────── constants ─────────────────────────── */
const DAY_ABBR = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ord = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

const FLAG_COLOR: Record<'ok' | 'missing' | 'conflict', string> = {
  ok: 'var(--status-success)', missing: 'var(--status-warning)', conflict: 'var(--status-error)',
};
const flagKey = (f: ShiftFlag): 'ok' | 'missing' | 'conflict' => (f === 'conflict' ? 'conflict' : f === 'missing' ? 'missing' : 'ok');

/* ───────────────────────── date / time helpers ─────────────────────── */
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fmt12 = (hhmm: string) => { let [h, m] = hhmm.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`; };
const parseISO = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(d.getDate() + n); return x; };
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** Monday of the ISO week containing `d`. */
const isoWeekStart = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const dateLong = (d: Date) => `${d.getDate()} ${MON_SHORT[d.getMonth()]}, ${d.getFullYear()}`;
const weekOrdinal = (d: Date) => ord(Math.ceil(d.getDate() / 7)) + ' Week';

/* ─────────────────────────── derived helpers (exported, pure) ───────────── */

/** Map<shiftId, flag>. conflict (red): same worker, same date, overlapping time.
 *  missing (amber): workerId === ''.
 *
 *  Perf (T-051, multi-week × large-site boards): grouped by `workerId|dateISO`
 *  FIRST (O(n)) instead of the naive O(n²) "every shift scans every other
 *  shift" — a worker has at most a handful of shifts on any given date, so the
 *  pairwise overlap check inside each tiny bucket is effectively O(1), and the
 *  whole function is O(n). At a few-thousand-worker × multi-week board (T-038/
 *  T-051 scale) the O(n²) version was a multi-second-to-frozen hotspot. */
export function shiftConflicts(shifts: PlannedShift[]): Map<string, ShiftFlag> {
  const out = new Map<string, ShiftFlag>();
  const byWorkerDate = new Map<string, PlannedShift[]>();
  for (const sh of shifts) {
    if (!sh.workerId) { out.set(sh.id, 'missing'); continue; }
    const key = `${sh.workerId}|${sh.dateISO}`;
    const bucket = byWorkerDate.get(key);
    if (bucket) bucket.push(sh); else byWorkerDate.set(key, [sh]);
  }
  for (const bucket of byWorkerDate.values()) {
    if (bucket.length === 1) { out.set(bucket[0].id, null); continue; }
    for (const sh of bucket) {
      const clash = bucket.some((o) =>
        o.id !== sh.id && toMin(o.start) < toMin(sh.end) && toMin(sh.start) < toMin(o.end));
      out.set(sh.id, clash ? 'conflict' : null);
    }
  }
  return out;
}

/** Total scheduled hours for a worker within [weekStart, weekStart+7). */
export function weeklyHours(shifts: PlannedShift[], workerId: string, weekStart: Date): number {
  const s = startOfDay(weekStart).getTime();
  const e = s + 7 * 86400000;
  let min = 0;
  for (const sh of shifts) {
    if (sh.workerId !== workerId) continue;
    const t = parseISO(sh.dateISO).getTime();
    if (t >= s && t < e) min += Math.max(0, toMin(sh.end) - toMin(sh.start));
  }
  return Math.round((min / 60) * 10) / 10;
}

/** Occurrence dates (ISO) for a recurrence starting at `startISO`. */
export function generateOccurrences(startISO: string, rec: RecurrenceCfg): string[] {
  const start = parseISO(startISO);
  const every = Math.max(1, rec.every || 1);
  const cap = rec.endsMode === 'after' ? Math.max(1, Math.min(365, rec.count ?? 1)) : 365;
  const endMs = rec.endsMode === 'on' && rec.endDateISO ? parseISO(rec.endDateISO).getTime() : Infinity;
  const out: string[] = [];
  let cur = new Date(start);
  for (let i = 0; i < 400 && out.length < cap; i++) {
    if (startOfDay(cur).getTime() > endMs) break;
    out.push(toISO(cur));
    if (rec.frequency === 'Daily') cur = addDays(cur, every);
    else if (rec.frequency === 'Weekly') cur = addDays(cur, every * 7);
    else {
      const next = new Date(cur.getFullYear(), cur.getMonth() + every, 1);
      const dom = rec.monthlyDay ?? start.getDate();
      const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(dom, last));
      cur = next;
    }
  }
  return out;
}

/* ─────────────────────────── small pieces ─────────────────────────── */

function WorkerAvatar({ name, color = 'var(--primary)', size = 32 }: { name: string; color?: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
    >
      {initials || '—'}
    </span>
  );
}

function UtilizationBadge({ hours }: { hours: number }) {
  const utilized = hours > 0;
  const color = utilized ? 'var(--primary)' : 'var(--status-error)';
  return (
    <span className="mt-1 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-caption font-bold uppercase tracking-wide" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
      {utilized ? `Utilized for ${hours}h per week` : 'Not Utilized'}
    </span>
  );
}

/** Floating-label popover select. */
function FieldSelect({
  label, icon, value, display, options, onChange, required,
}: {
  label: string; icon: React.ReactNode; value: string; display?: string;
  options: { value: string; label: string; sub?: string }[]; onChange: (v: string) => void; required?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const shown = display ?? options.find((o) => o.value === value)?.label ?? '';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
          <span className="shrink-0 text-muted-foreground">{icon}</span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">{label}{required && <span className="text-[var(--status-error)]"> *</span>}</span>
            <span className={`truncate text-body-sm ${shown ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{shown || `Select ${label.toLowerCase()}`}</span>
          </span>
          <Icons.ChevronDown size={16} className="shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-72 w-[--radix-popover-trigger-width] overflow-auto p-1">
        {options.map((o) => {
          const sel = o.value === value;
          return (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body-sm transition-colors hover:bg-muted">
              <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${sel ? 'border-primary' : 'border-border'}`}>{sel && <span className="size-2 rounded-full bg-primary" />}</span>
              <span className="flex min-w-0 flex-col"><span className="truncate text-foreground">{o.label}</span>{o.sub && <span className="truncate text-caption text-muted-foreground">{o.sub}</span>}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

/** Floating-label native time field, clearable.
 *
 * T-078 (double clock icon, same defect class as the T-062 search-icon law —
 * an icon composed onto an input that already owns an icon slot): a native
 * `<input type="time">` renders its OWN trailing clock/picker-indicator glyph
 * in Chromium, so pairing it with our leading `Icons.Clock` painted TWO clock
 * icons per field. The leading `Icons.Clock` is the one-and-only prescribed
 * icon here (it's what carries the field's identity next to the floating
 * label, matching the sibling `FieldSelect`/`DateRangePicker` fields in this
 * sheet) — the browser's own indicator is suppressed via
 * `[&::-webkit-calendar-picker-indicator]:hidden` so exactly one clock
 * renders. This does not disable the native time control itself (typing +
 * the up/down spinners still work); it only removes the redundant icon.
 *
 * T-090: exported (was module-private) so other DS surfaces with a native
 * clock-in/clock-out pair — `timesheets.tsx`'s Regularize sheet was
 * duplicating a plain `<label>` + bare `<input type="time">` — can REUSE
 * this idiom instead of re-deriving the double-icon fix per consumer. */
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
      <Icons.Clock size={18} className="shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-body-sm font-medium text-foreground outline-none [&::-webkit-calendar-picker-indicator]:hidden" />
      </span>
      {value && <button type="button" aria-label="Clear" onClick={() => onChange('')} className="shrink-0 text-muted-foreground hover:text-foreground"><Icons.XClose size={15} /></button>}
    </div>
  );
}

/* ─────────────────────────── shift chip (weekly) ─────────────────────── */

function ShiftChip({
  sh, areaLabel, flag, highlight, onOpen, onEdit, onDelete,
}: {
  sh: PlannedShift; areaLabel: string; flag: ShiftFlag; highlight: boolean;
  onOpen: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [menu, setMenu] = React.useState(false);
  const color = highlight ? FLAG_COLOR[flagKey(flag)] : 'var(--border)';
  const place = sh.subArea ? `${sh.subArea} · ${areaLabel}` : areaLabel;
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-0.5 rounded-md border bg-card px-2 py-1.5 pr-6 text-left transition-colors hover:bg-muted/40"
        style={{ borderColor: highlight ? color : 'var(--border)', borderLeftWidth: 3, borderLeftColor: highlight ? color : 'var(--primary)', background: highlight && flag ? `color-mix(in srgb, ${color} 8%, var(--card))` : undefined }}
      >
        <span className="flex items-center gap-1 truncate text-caption font-semibold text-foreground">
          <Icons.Clock size={11} className="shrink-0 text-muted-foreground" />
          {fmt12(sh.start)} – {fmt12(sh.end)}
        </span>
        <span className="flex items-center gap-1 truncate text-caption text-muted-foreground">
          <Icons.Briefcase01 size={10} className="shrink-0" />{sh.task}
        </span>
        <span className="flex items-center gap-1 truncate text-caption text-muted-foreground">
          <Icons.MarkerPin01 size={10} className="shrink-0" />{place}
        </span>
      </button>
      <Popover open={menu} onOpenChange={setMenu}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Shift actions"
            className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <Icons.DotsVertical size={14} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-40 p-1">
          <button type="button" onClick={() => { setMenu(false); onEdit(); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted"><Icons.Edit01 size={15} className="text-muted-foreground" />Edit Shift</button>
          <button type="button" onClick={() => { setMenu(false); onDelete(); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-[var(--status-error)] transition-colors hover:bg-[color-mix(in_srgb,var(--status-error)_10%,transparent)]"><Icons.Trash01 size={15} />Delete Shift</button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

type PlannerRow = { id: string; name: string; roleLabel: string; color: string; unassigned?: boolean };

/* ── weekly: workers × 7 days ── */
function WeeklyGrid({
  rows, weekDays, weekStart, shifts, flags, highlight, matches, areaLabel, workerPlural,
  cellIndex, workerIndex, onOpen, onEdit, onDelete,
}: {
  rows: PlannerRow[]; weekDays: Date[]; weekStart: Date; shifts: PlannedShift[]; flags: Map<string, ShiftFlag>;
  highlight: boolean; matches: (sh: PlannedShift) => boolean; areaLabel: (id: string) => string; workerPlural: string;
  /** Pre-built `${workerId}|${dateISO}` → shifts (matches-filtered) and
   *  `workerId` → shifts (unfiltered) indexes (T-051 perf) — O(1) per-cell
   *  lookups instead of an O(rows × days × shifts) linear filter per cell. */
  cellIndex: Map<string, PlannedShift[]>; workerIndex: Map<string, PlannedShift[]>;
  onOpen: (sh: PlannedShift) => void; onEdit: (sh: PlannedShift) => void; onDelete: (sh: PlannedShift) => void;
}) {
  const dayCounts = weekDays.map((d) => {
    const iso = toISO(d);
    const day = shifts.filter((sh) => sh.dateISO === iso && matches(sh));
    return { missing: day.filter((sh) => flags.get(sh.id) === 'missing').length, conflict: day.filter((sh) => flags.get(sh.id) === 'conflict').length };
  });
  return (
    <table className="w-full min-w-[880px] border-collapse">
      <thead>
        <tr className="bg-muted/40">
          <th className="sticky left-0 z-[1] w-[220px] border-b border-r border-border bg-muted/40 px-3 py-2 text-left text-caption font-bold uppercase tracking-wide text-muted-foreground">{workerPlural}</th>
          {weekDays.map((d, i) => {
            const weekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <th key={i} className="border-b border-r border-border px-2 py-2 text-center">
                <div className={`text-caption font-bold uppercase tracking-wide ${weekend ? 'text-muted-foreground' : 'text-primary'}`}>{DAY_ABBR[d.getDay()]}</div>
                <div className={`text-body-sm font-semibold ${weekend ? 'text-muted-foreground' : 'text-foreground'}`}>{d.getDate()}</div>
                {highlight && (dayCounts[i].missing > 0 || dayCounts[i].conflict > 0) && (
                  <div className="mt-1 flex items-center justify-center gap-1">
                    {dayCounts[i].missing > 0 && <span className="inline-block size-1.5 rounded-full" style={{ background: FLAG_COLOR.missing }} title={`${dayCounts[i].missing} missing`} />}
                    {dayCounts[i].conflict > 0 && <span className="inline-block size-1.5 rounded-full" style={{ background: FLAG_COLOR.conflict }} title={`${dayCounts[i].conflict} conflict`} />}
                  </div>
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const hours = row.unassigned ? 0 : weeklyHours(workerIndex.get(row.id) ?? [], row.id, weekStart);
          return (
            <tr key={row.id || 'unassigned'}>
              <td className="sticky left-0 z-[1] w-[220px] border-b border-r border-border bg-card px-3 py-2 align-top">
                <div className="flex items-start gap-2">
                  {row.unassigned
                    ? <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--status-warning)_16%,transparent)] text-[var(--status-warning)]"><Icons.AlertTriangle size={15} /></span>
                    : <WorkerAvatar name={row.name} color={row.color} size={32} />}
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-body-sm font-semibold text-foreground">{row.name}</span>
                    <span className="text-caption text-muted-foreground">{row.unassigned ? 'Missing assignment' : row.roleLabel}</span>
                    {!row.unassigned && <UtilizationBadge hours={hours} />}
                  </div>
                </div>
              </td>
              {weekDays.map((d, i) => {
                const iso = toISO(d);
                const cell = (cellIndex.get(`${row.id}|${iso}`) ?? []).slice().sort((a, b) => toMin(a.start) - toMin(b.start));
                return (
                  <td key={i} className="min-w-[112px] border-b border-r border-border/60 p-1.5 align-top">
                    <div className="flex flex-col gap-1.5">
                      {cell.map((sh) => (
                        <ShiftChip key={sh.id} sh={sh} areaLabel={areaLabel(sh.areaId)} flag={flags.get(sh.id) ?? null} highlight={highlight} onOpen={() => onOpen(sh)} onEdit={() => onEdit(sh)} onDelete={() => onDelete(sh)} />
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ── daily: workers × hours timeline bars ── */
function DailyGrid({
  rows, date, hours, flags, highlight, areaLabel, workerPlural,
  cellIndex, onOpen, onEdit, onDelete,
}: {
  rows: PlannerRow[]; date: Date; hours: number[]; flags: Map<string, ShiftFlag>;
  highlight: boolean; areaLabel: (id: string) => string; workerPlural: string;
  /** Pre-built `${workerId}|${dateISO}` → shifts index (matches-filtered,
   *  T-051 perf) — O(1) per-row lookup instead of an O(rows × shifts) scan. */
  cellIndex: Map<string, PlannedShift[]>;
  onOpen: (sh: PlannedShift) => void; onEdit: (sh: PlannedShift) => void; onDelete: (sh: PlannedShift) => void;
}) {
  const iso = toISO(date);
  const dayStart = hours[0] * 60;
  const dayEnd = (hours[hours.length - 1] + 1) * 60;
  const span = dayEnd - dayStart;
  return (
    <table className="w-full min-w-[880px] border-collapse">
      <thead>
        <tr className="bg-muted/40">
          <th className="sticky left-0 z-[1] w-[220px] border-b border-r border-border bg-muted/40 px-3 py-2 text-left text-caption font-bold uppercase tracking-wide text-muted-foreground">{workerPlural}</th>
          <th className="border-b border-border p-0">
            <div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length}, 1fr)` }}>
              {hours.map((h) => (
                <div key={h} className="border-r border-border/60 py-2 text-center text-caption font-semibold text-muted-foreground">{String(h).padStart(2, '0')}:00</div>
              ))}
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const cell = (cellIndex.get(`${row.id}|${iso}`) ?? []).slice().sort((a, b) => toMin(a.start) - toMin(b.start));
          return (
            <tr key={row.id || 'unassigned'}>
              <td className="sticky left-0 z-[1] w-[220px] border-b border-r border-border bg-card px-3 py-2 align-middle">
                <div className="flex items-center gap-2">
                  {row.unassigned
                    ? <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--status-warning)_16%,transparent)] text-[var(--status-warning)]"><Icons.AlertTriangle size={15} /></span>
                    : <WorkerAvatar name={row.name} color={row.color} size={30} />}
                  <span className="truncate text-body-sm font-semibold text-foreground">{row.name}</span>
                </div>
              </td>
              <td className="border-b border-border p-0">
                <div className="relative h-14">
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${hours.length}, 1fr)` }}>
                    {hours.map((h) => <div key={h} className="border-r border-border/40" />)}
                  </div>
                  {cell.map((sh) => {
                    const flag = flags.get(sh.id) ?? null;
                    const color = highlight ? FLAG_COLOR[flagKey(flag)] : 'var(--primary)';
                    const left = ((Math.max(dayStart, toMin(sh.start)) - dayStart) / span) * 100;
                    const width = ((Math.min(dayEnd, toMin(sh.end)) - Math.max(dayStart, toMin(sh.start))) / span) * 100;
                    return (
                      <div key={sh.id} className="group absolute bottom-1.5 top-1.5" style={{ left: `${left}%`, width: `${Math.max(4, width)}%` }}>
                        <button type="button" onClick={() => onOpen(sh)} className="flex h-full w-full flex-col justify-center overflow-hidden rounded-md border px-2 text-left transition-colors hover:brightness-95" style={{ borderColor: color, borderLeftWidth: 3, background: `color-mix(in srgb, ${color} 12%, var(--card))` }} title={`${fmt12(sh.start)} – ${fmt12(sh.end)} · ${sh.task} · ${areaLabel(sh.areaId)}`}>
                          <span className="truncate text-caption font-semibold text-foreground">{fmt12(sh.start)}–{fmt12(sh.end)}</span>
                          <span className="truncate text-caption text-muted-foreground">{sh.task} · {areaLabel(sh.areaId)}</span>
                        </button>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" aria-label="Shift actions" className="absolute right-0.5 top-0.5 grid size-4 place-items-center rounded text-muted-foreground opacity-0 transition-all hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"><Icons.DotsVertical size={12} /></button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-40 p-1">
                            <button type="button" onClick={() => onEdit(sh)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted"><Icons.Edit01 size={15} className="text-muted-foreground" />Edit Shift</button>
                            <button type="button" onClick={() => onDelete(sh)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-[var(--status-error)] transition-colors hover:bg-[color-mix(in_srgb,var(--status-error)_10%,transparent)]"><Icons.Trash01 size={15} />Delete Shift</button>
                          </PopoverContent>
                        </Popover>
                      </div>
                    );
                  })}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ─────────────────────── Create / Edit shift sheet ─────────────────────── */
interface DraftShift {
  dateISO: string; areaId: string; subArea: string;
  workerId: string; start: string; end: string; task: string; notes: string;
  recurring: boolean; rec: RecurrenceCfg;
}

/** Section heading used throughout the single-page sheet. */
function SheetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function ScheduleShiftSheet({
  mode, shift, defaultDate, now, workers, areas, subAreas, tasks, labels,
  existing, renderAreaMap, renderPlansTab, onCreate, onUpdate, onClose,
}: {
  mode: 'create' | 'edit'; shift?: PlannedShift; defaultDate?: string; now: number;
  workers: ShiftWorker[]; areas: ShiftArea[]; subAreas: string[]; tasks: string[];
  labels: Required<ShiftPlannerLabels>; existing: PlannedShift[];
  renderAreaMap?: ShiftPlannerProps['renderAreaMap']; renderPlansTab?: ShiftPlannerProps['renderPlansTab'];
  onCreate: ShiftPlannerProps['onCreate']; onUpdate: ShiftPlannerProps['onUpdate']; onClose: () => void;
}) {
  const hasPlans = !!renderPlansTab;
  /** Edit mode is CONTEXTUAL: the worker the shift belongs to is fixed (shown
   *  as a read-only header), never a re-assignable picker. A worker picker
   *  only makes sense in the create-new-shift flow (`mode === 'create'`). */
  const editWorker = mode === 'edit' ? workers.find((w) => w.id === shift?.workerId) : undefined;

  const initial = React.useMemo<DraftShift>(() => ({
    dateISO: shift?.dateISO ?? defaultDate ?? toISO(new Date(now)),
    areaId: shift?.areaId ?? areas[0]?.id ?? '',
    subArea: shift?.subArea ?? subAreas[0] ?? '',
    workerId: shift?.workerId ?? '',
    start: shift?.start ?? '08:00',
    end: shift?.end ?? '10:00',
    task: shift?.task ?? tasks[0] ?? '',
    notes: shift?.notes ?? '',
    recurring: shift?.recurring ?? false,
    rec: { frequency: 'Weekly', every: 1, monthlyDay: shift ? parseISO(shift.dateISO).getDate() : new Date(now).getDate(), endsMode: 'after', count: 10 },
  }), [shift, defaultDate, now, areas, subAreas, tasks]);

  const [draft, setDraft] = React.useState<DraftShift>(initial);
  const set = <K extends keyof DraftShift>(k: K, v: DraftShift[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setRec = <K extends keyof RecurrenceCfg>(k: K, v: RecurrenceCfg[K]) => setDraft((d) => ({ ...d, rec: { ...d.rec, [k]: v } }));

  const dirty = React.useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial]);
  const dateDisplay = draft.dateISO ? dateLong(parseISO(draft.dateISO)) : '';
  const area = areas.find((a) => a.id === draft.areaId);
  const areaDisplay = area ? (area.sub ? `${area.label} · ${area.sub}` : area.label) : '';

  const occurrences = React.useMemo(() => draft.recurring ? generateOccurrences(draft.dateISO, draft.rec) : [draft.dateISO], [draft.recurring, draft.dateISO, draft.rec]);
  const occConflict = React.useCallback((dISO: string) => {
    if (!draft.workerId) return false;
    return existing.some((o) =>
      o.workerId === draft.workerId && o.dateISO === dISO && (mode === 'create' || o.seriesId !== shift?.seriesId) &&
      toMin(o.start) < toMin(draft.end) && toMin(draft.start) < toMin(o.end));
  }, [draft, existing, mode, shift]);

  const submit = () => {
    if (mode === 'create') {
      const base = now + Math.floor(startOfDay(new Date(now)).getTime() % 100000);
      const seriesId = `series-${base}`;
      const built: PlannedShift[] = occurrences.map((dISO, i) => ({
        id: `shift-${base}-${i}`,
        seriesId: draft.recurring ? seriesId : `shift-${base}-${i}`,
        workerId: draft.workerId, dateISO: dISO, start: draft.start, end: draft.end,
        areaId: draft.areaId, subArea: draft.subArea || undefined, task: draft.task, recurring: draft.recurring,
        notes: draft.notes || undefined,
      }));
      onCreate(built);
      toast.success(draft.recurring ? `${built.length} shifts scheduled` : 'Shift scheduled');
    } else if (shift) {
      onUpdate(shift.id, {
        dateISO: draft.dateISO, areaId: draft.areaId, subArea: draft.subArea || undefined, workerId: draft.workerId,
        start: draft.start, end: draft.end, task: draft.task, notes: draft.notes || undefined, recurring: draft.recurring,
      });
      toast.success('Shift updated');
    }
    onClose();
  };

  const freqUnit = (n: number) => `${draft.rec.frequency === 'Daily' ? 'Day' : draft.rec.frequency === 'Weekly' ? 'Week' : 'Month'}${n > 1 ? 's' : ''}`;

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" width="min(520px, 94vw)" className="p-0">
        <SheetHeader><SheetTitle>{mode === 'edit' ? 'Edit Shift' : 'Schedule New Shift'}</SheetTitle></SheetHeader>

        {mode === 'edit' && (
          <div className="flex items-center gap-3 border-b border-border bg-muted/20 px-6 py-3">
            <WorkerAvatar name={editWorker?.name ?? 'Unassigned'} color={editWorker?.color} size={36} />
            <div className="flex min-w-0 flex-col">
              <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">{labels.workerSingular}</span>
              <span className="truncate text-body-sm font-semibold text-foreground">{editWorker?.name ?? 'Unassigned'}</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-6">
          <div className="flex flex-col gap-6">
            <SheetSection title="Schedule">
              <DateRangePicker
                mode="single"
                field={{ label: <>Select Date <span className="text-[var(--status-error)]">*</span></> }}
                value={dateDisplay || undefined}
                placeholder="Select date"
                onApply={(r) => { if (r.start) set('dateISO', toISO(r.start)); }}
              />
              <FieldSelect label={`Select ${labels.areaSingular}`} required icon={<Icons.MarkerPin01 size={18} />} value={draft.areaId}
                display={areaDisplay}
                options={areas.map((a) => ({ value: a.id, label: a.label, sub: a.sub }))}
                onChange={(v) => set('areaId', v)} />
              {subAreas.length > 0 && (
                <FieldSelect label={`Select ${labels.subAreaSingular}`} required icon={<Icons.Grid01 size={18} />} value={draft.subArea}
                  options={subAreas.map((s2) => ({ value: s2, label: s2 }))} onChange={(v) => set('subArea', v)} />
              )}
              {renderAreaMap && (
                <div className="overflow-hidden rounded-lg border border-border">
                  <p className="border-b border-border bg-muted/40 px-3 py-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">{draft.subArea ? `${draft.subArea} · ` : ''}{areaDisplay}</p>
                  <div className="h-[220px] w-full">{renderAreaMap({ area, subArea: draft.subArea })}</div>
                </div>
              )}
            </SheetSection>

            {hasPlans && (
              <SheetSection title="Scheduled Plans">
                {renderPlansTab!({ area })}
              </SheetSection>
            )}

            <SheetSection title="Assignment">
              {/* Edit mode: worker is fixed (read-only header above) — no picker here.
                 Create mode: picking the worker is the point of the flow. */}
              {mode === 'create' && (
                <FieldSelect label={`Select ${labels.workerSingular}`} icon={<Icons.User01 size={18} />} value={draft.workerId}
                  display={draft.workerId ? (workers.find((w) => w.id === draft.workerId)?.name ?? '') : ''}
                  options={workers.map((w) => ({ value: w.id, label: w.name }))} onChange={(v) => set('workerId', v)} />
              )}
              <div className="grid grid-cols-2 gap-3">
                <TimeField label="Start Time" value={draft.start} onChange={(v) => set('start', v)} />
                <TimeField label="End Time" value={draft.end} onChange={(v) => set('end', v)} />
              </div>
              <FieldSelect label="Task" icon={<Icons.Briefcase01 size={18} />} value={draft.task}
                options={tasks.map((t) => ({ value: t, label: t }))} onChange={(v) => set('task', v)} />
              <label className="flex flex-col gap-1.5">
                <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">Notes / Instructions</span>
                <Textarea rows={3} value={draft.notes} onChange={(e) => set('notes', e.target.value)} placeholder={`Optional instructions for the ${labels.workerSingular.toLowerCase()}…`} />
              </label>
            </SheetSection>

            <SheetSection title="Recurrence">
              <label className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
                <span className="flex items-center gap-2 text-body-sm font-medium text-foreground"><Icons.Repeat04 size={16} className="text-muted-foreground" />Recurring</span>
                <Switch checked={draft.recurring} onCheckedChange={(v) => set('recurring', !!v)} />
              </label>

              {draft.recurring && (
                <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldSelect label="Frequency" icon={<Icons.Repeat01 size={18} />} value={draft.rec.frequency}
                      options={(['Daily', 'Weekly', 'Monthly'] as Frequency[]).map((f) => ({ value: f, label: f }))}
                      onChange={(v) => setRec('frequency', v as Frequency)} />
                    <FieldSelect label="Repeat Every" icon={<Icons.RefreshCcw01 size={18} />} value={String(draft.rec.every)}
                      display={`${draft.rec.every} ${freqUnit(draft.rec.every)}`}
                      options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n} ${freqUnit(n)}` }))}
                      onChange={(v) => setRec('every', Number(v))} />
                  </div>
                  {draft.rec.frequency === 'Monthly' && (
                    <FieldSelect label="Repeat On" icon={<Icons.Calendar size={18} />} value={String(draft.rec.monthlyDay ?? 1)}
                      display={`${ord(draft.rec.monthlyDay ?? 1)} Day`}
                      options={Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `${ord(i + 1)} Day` }))}
                      onChange={(v) => setRec('monthlyDay', Number(v))} />
                  )}
                  <div className="flex flex-col gap-2">
                    <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Ends On</span>
                    <label className="flex items-center gap-2 text-body-sm text-foreground">
                      <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${draft.rec.endsMode === 'on' ? 'border-primary' : 'border-border'}`}>{draft.rec.endsMode === 'on' && <span className="size-2 rounded-full bg-primary" />}</span>
                      <button type="button" onClick={() => setRec('endsMode', 'on')} className="shrink-0">On</button>
                      <span className="min-w-[150px] flex-1">
                        <DateRangePicker mode="single" field={{ label: 'End Date' }} value={draft.rec.endDateISO ? dateLong(parseISO(draft.rec.endDateISO)) : undefined} placeholder="Select date" onApply={(r) => { if (r.start) { setRec('endDateISO', toISO(r.start)); setRec('endsMode', 'on'); } }} />
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-body-sm text-foreground">
                      <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${draft.rec.endsMode === 'after' ? 'border-primary' : 'border-border'}`}>{draft.rec.endsMode === 'after' && <span className="size-2 rounded-full bg-primary" />}</span>
                      <button type="button" onClick={() => setRec('endsMode', 'after')} className="shrink-0">After</button>
                      <input type="number" min={1} max={60} value={draft.rec.count ?? 1} onFocus={() => setRec('endsMode', 'after')} onChange={(e) => setRec('count', Math.max(1, Number(e.target.value) || 1))} className="w-16 rounded-md border border-border bg-card px-2 py-1 text-body-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                      <span className="text-muted-foreground">occurrences</span>
                    </label>
                  </div>

                  <p className="text-body-sm font-semibold text-foreground">Preview</p>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full border-collapse">
                      <thead><tr className="bg-muted/40">
                        <th className="px-3 py-2 text-left text-caption font-bold uppercase tracking-wide text-muted-foreground">#</th>
                        <th className="px-3 py-2 text-left text-caption font-bold uppercase tracking-wide text-muted-foreground">Date</th>
                        <th className="px-3 py-2 text-left text-caption font-bold uppercase tracking-wide text-muted-foreground">Day</th>
                        <th className="px-3 py-2 text-left text-caption font-bold uppercase tracking-wide text-muted-foreground">Time</th>
                        <th className="px-3 py-2" />
                      </tr></thead>
                      <tbody>
                        {occurrences.slice(0, 24).map((dISO, i) => {
                          const d = parseISO(dISO);
                          const conflict = occConflict(dISO);
                          return (
                            <tr key={dISO + i} className="border-t border-border/60">
                              <td className="px-3 py-1.5 text-body-xs tabular-nums text-muted-foreground">{i + 1}</td>
                              <td className="px-3 py-1.5 text-body-xs text-foreground">{dateLong(d)}</td>
                              <td className="px-3 py-1.5 text-body-xs text-muted-foreground">{DAY_ABBR[d.getDay()]}</td>
                              <td className="px-3 py-1.5 text-body-xs text-muted-foreground">{fmt12(draft.start)} – {fmt12(draft.end)}</td>
                              <td className="px-3 py-1.5 text-right">
                                {conflict
                                  ? <Icons.AlertTriangle size={14} className="ml-auto text-[var(--status-error)]" />
                                  : <Icons.CheckCircle size={14} className="ml-auto text-[var(--status-success)]" />}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {occurrences.length > 24 && <p className="px-3 py-1.5 text-caption text-muted-foreground">+ {occurrences.length - 24} more…</p>}
                  </div>
                </div>
              )}
            </SheetSection>
          </div>
        </div>

        <SheetFooter>
          {mode === 'edit'
            ? <Button variant="primary" className="w-full" disabled={!dirty} onClick={submit}>Update</Button>
            : <Button variant="primary" className="w-full" onClick={submit}>Create</Button>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ─────────────────────── delete recurring dialog ─────────────────────── */
function DeleteShiftDialog({
  shift, workerName, onClose, onConfirm,
}: { shift: PlannedShift; workerName: string; onClose: () => void; onConfirm: (scope: DeleteScope) => void }) {
  const [scope, setScope] = React.useState<DeleteScope>('one');
  const opts: { value: DeleteScope; label: string; sub: string }[] = [
    { value: 'one', label: 'This shift', sub: 'Only this specific instance will be removed.' },
    { value: 'following', label: 'This and following shifts', sub: 'Deletes this and all future scheduled instances in this series.' },
    { value: 'all', label: 'All shifts', sub: 'Deletes every shift in this recurring series, past and future.' },
  ];
  const place = shift.subArea || '—';
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col gap-4">
          <span className="grid size-11 place-items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--status-error) 12%, transparent)' }}>
            <Icons.AlertTriangle size={20} className="text-[var(--status-error)]" />
          </span>
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-h6 font-semibold text-foreground">Delete Recurring Shift?</DialogTitle>
            <DialogDescription className="text-body-sm text-muted-foreground">
              This is a recurring shift for <span className="font-semibold text-foreground">{workerName || 'Unassigned'}</span> in <span className="font-semibold text-foreground">{place}</span>. How would you like to proceed?
            </DialogDescription>
          </div>
          <div className="flex flex-col gap-2">
            {opts.map((o) => (
              <button key={o.value} type="button" onClick={() => setScope(o.value)} className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors ${scope === o.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}>
                <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${scope === o.value ? 'border-primary' : 'border-border'}`}>{scope === o.value && <span className="size-2 rounded-full bg-primary" />}</span>
                <span className="flex flex-col">
                  <span className="text-body-sm font-semibold text-foreground">{o.label}</span>
                  <span className="text-caption text-muted-foreground">{o.sub}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <button type="button" onClick={() => onConfirm(scope)} className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--status-error)] px-4 text-body-sm font-semibold text-white transition-opacity hover:opacity-90">Delete</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════ ShiftPlanner (planning view) ═══════════════════ */

export function ShiftPlanner({
  workers, shifts, areas, subAreas = [], tasks, labels: labelsProp, now = Date.now(),
  dayStartHour = 8, dayEndHour = 19, onCreate, onUpdate, onDelete, renderAreaMap, renderPlansTab, filterSlot, className,
}: ShiftPlannerProps) {
  const labels: Required<ShiftPlannerLabels> = {
    workerSingular: labelsProp?.workerSingular ?? 'Worker',
    workerPlural: labelsProp?.workerPlural ?? 'Workers',
    areaSingular: labelsProp?.areaSingular ?? 'Area',
    subAreaSingular: labelsProp?.subAreaSingular ?? 'Zone',
  };
  const hours = React.useMemo(
    () => Array.from({ length: Math.max(1, dayEndHour - dayStartHour + 1) }, (_, i) => dayStartHour + i),
    [dayStartHour, dayEndHour],
  );
  const areaLabel = React.useCallback((id: string) => areas.find((a) => a.id === id)?.label ?? '—', [areas]);
  const workerName = React.useCallback((id: string) => workers.find((w) => w.id === id)?.name ?? '', [workers]);

  const [query, setQuery] = React.useState('');
  const [view, setView] = React.useState<'weekly' | 'daily'>('weekly');
  const [anchor, setAnchor] = React.useState<Date>(() => startOfDay(new Date(now)));
  const [highlight, setHighlight] = React.useState(true);
  const [sheet, setSheet] = React.useState<{ mode: 'create' | 'edit'; shift?: PlannedShift; date?: string } | null>(null);
  const [del, setDel] = React.useState<PlannedShift | null>(null);

  const weekStart = React.useMemo(() => isoWeekStart(anchor), [anchor]);
  const weekDays = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const flags = React.useMemo(() => shiftConflicts(shifts), [shifts]);

  const q = query.trim().toLowerCase();
  const matches = React.useCallback((sh: PlannedShift) =>
    !q || `${workerName(sh.workerId)} ${sh.task} ${sh.subArea ?? ''} ${areaLabel(sh.areaId)}`.toLowerCase().includes(q),
  [q, workerName, areaLabel]);

  /* Perf (T-051): both grids look up a cell (worker × date) or a worker's full
   * shift list once per row/day — indexing here (O(n)) instead of letting each
   * grid linear-filter `shifts` per cell (O(rows × days × n)) is what keeps a
   * multi-week × large-site board (thousands of workers × 13 weeks) responsive. */
  const cellIndex = React.useMemo(() => {
    const idx = new Map<string, PlannedShift[]>();
    for (const sh of shifts) {
      if (!matches(sh)) continue;
      const key = `${sh.workerId}|${sh.dateISO}`;
      const bucket = idx.get(key);
      if (bucket) bucket.push(sh); else idx.set(key, [sh]);
    }
    return idx;
  }, [shifts, matches]);
  const workerIndex = React.useMemo(() => {
    const idx = new Map<string, PlannedShift[]>();
    for (const sh of shifts) {
      const bucket = idx.get(sh.workerId);
      if (bucket) bucket.push(sh); else idx.set(sh.workerId, [sh]);
    }
    return idx;
  }, [shifts]);

  const windowISO = React.useMemo(() => (view === 'daily' ? new Set([toISO(anchor)]) : new Set(weekDays.map(toISO))), [view, anchor, weekDays]);
  const visible = shifts.filter((sh) => windowISO.has(sh.dateISO) && matches(sh));
  const visMissing = visible.filter((sh) => flags.get(sh.id) === 'missing').length;
  const visConflict = visible.filter((sh) => flags.get(sh.id) === 'conflict').length;
  const pct = (n: number) => (visible.length ? Math.round((n / visible.length) * 100) : 0);

  const step = (dir: number) => setAnchor((d) => addDays(d, view === 'daily' ? dir : dir * 7));
  const navLabel = view === 'daily'
    ? `${DAY_FULL[anchor.getDay()]}, ${dateLong(anchor)}`
    : `${dateLong(weekStart)} – ${dateLong(addDays(weekStart, 6))}  (${weekOrdinal(weekStart)})`;

  const rows: PlannerRow[] = [
    ...workers.map((w) => ({ id: w.id, name: w.name, roleLabel: w.roleLabel ?? labels.workerSingular, color: w.color ?? 'var(--primary)' })),
    ...(shifts.some((sh) => !sh.workerId) ? [{ id: '', name: 'Unassigned', roleLabel: '', color: 'var(--status-warning)', unassigned: true }] : []),
  ];

  const openCreate = (date?: string) => setSheet({ mode: 'create', date: date ?? toISO(anchor) });
  const openEdit = (sh: PlannedShift) => setSheet({ mode: 'edit', shift: sh });
  const askDelete = (sh: PlannedShift) => { if (sh.recurring) setDel(sh); else { onDelete(sh.id, 'one', sh); toast.success('Shift deleted'); } };

  return (
    <div className={cn('flex h-full flex-col gap-3 overflow-hidden p-6', className)}>
      {/* toolbar row 1 — search + filter · New Shift */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-[320px] max-w-full">
          <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search anything here" className="pl-8" />
        </div>
        {filterSlot}
        <div className="ml-auto">
          <Button variant="primary" onClick={() => openCreate()}><Icons.Plus size={16} className="mr-1.5" />New Shift</Button>
        </div>
      </div>

      {/* toolbar row 2 — view toggle · navigator · highlight + legend */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
          {(['weekly', 'daily'] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={`rounded-md px-3 py-1.5 text-body-sm font-semibold capitalize transition-colors ${view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{v}</button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => step(-1)} aria-label="Previous" className="grid size-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.ChevronLeft size={16} /></button>
          <span className="min-w-[240px] text-center text-body-sm font-semibold text-foreground">{navLabel}</span>
          <button type="button" onClick={() => step(1)} aria-label="Next" className="grid size-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.ChevronRight size={16} /></button>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <label className="flex items-center gap-2 text-body-sm font-medium text-foreground">
            <Switch checked={highlight} onCheckedChange={(v) => setHighlight(!!v)} />Highlight Conflicts
          </label>
          {highlight && (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-body-xs text-muted-foreground"><span className="inline-block size-2.5 rounded-full" style={{ background: FLAG_COLOR.missing }} />Missing Assignment ({pct(visMissing)}%)</span>
              <span className="flex items-center gap-1.5 text-body-xs text-muted-foreground"><span className="inline-block size-2.5 rounded-full" style={{ background: FLAG_COLOR.conflict }} />Conflict ({pct(visConflict)}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* grid */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
        {view === 'weekly'
          ? <WeeklyGrid rows={rows} weekDays={weekDays} weekStart={weekStart} shifts={shifts} flags={flags} highlight={highlight} matches={matches} areaLabel={areaLabel} workerPlural={labels.workerPlural} cellIndex={cellIndex} workerIndex={workerIndex} onOpen={openEdit} onEdit={openEdit} onDelete={askDelete} />
          : <DailyGrid rows={rows} date={anchor} hours={hours} flags={flags} highlight={highlight} areaLabel={areaLabel} workerPlural={labels.workerPlural} cellIndex={cellIndex} onOpen={openEdit} onEdit={openEdit} onDelete={askDelete} />}
      </div>

      {sheet && (
        <ScheduleShiftSheet
          mode={sheet.mode}
          shift={sheet.shift}
          defaultDate={sheet.date}
          now={now}
          workers={workers}
          areas={areas}
          subAreas={subAreas}
          tasks={tasks}
          labels={labels}
          existing={shifts}
          renderAreaMap={renderAreaMap}
          renderPlansTab={renderPlansTab}
          onCreate={onCreate}
          onUpdate={onUpdate}
          onClose={() => setSheet(null)}
        />
      )}
      {del && (
        <DeleteShiftDialog
          shift={del}
          workerName={workerName(del.workerId)}
          onClose={() => setDel(null)}
          onConfirm={(scope) => { onDelete(del.id, scope, del); toast.success('Shift deleted'); setDel(null); }}
        />
      )}
    </div>
  );
}
