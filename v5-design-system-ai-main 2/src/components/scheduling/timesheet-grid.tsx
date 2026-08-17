import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button, Input, Popover, PopoverTrigger, PopoverContent, Checkbox } from '../primitives';

/**
 * TimesheetGrid — a reusable, domain-agnostic **attendance-based timesheet
 * matrix**: workers down, days across, each cell a colour-coded actual-vs-
 * planned pill. This is NOT a project/billable time-tracker (task/cost-code
 * entry) — it renders the reconciliation layer between a roster (planned
 * hours) and attendance (actual hours), the way every mature HRMS timesheet
 * does (SAP SuccessFactors / Sage People / ClickTime style).
 *
 * DYNAMIC / config-driven, like `ShiftPlanner`: it holds NO domain vocabulary
 * or business rules (OT thresholds, leave policy, regularization workflow —
 * all product-owned). It is CONTROLLED — `workers` + two pure lookup
 * callbacks (`getCell`, `getTotals`) are the entire data contract; navigation
 * (`view`/`anchor`) is controlled by the consumer too, so a product can bound
 * it to whatever window its underlying data actually covers
 * (`minDateISO`/`maxDateISO`).
 *
 * Adapted from the Berkeley UAE IFM Timesheet R&D + Figma parity target
 * (2205-19382): worker rows × day columns, a two-tone ratio bar + "HH:MM /
 * HH:MM" text per cell, a grey "-" for no-shift days, plain text for leave
 * days, and a right-hand ACTUAL/PLANNED totals column.
 */

/* ─────────────────────────────── types ─────────────────────────────── */

export interface TimesheetWorker {
  id: string;
  name: string;
  /** e.g. "Cleaner" / "Security Guard" — shown under the name. */
  roleLabel?: string;
  /** avatar tint; defaults to --primary. */
  color?: string;
}

export type TimesheetCellStatus =
  /** No shift scheduled this day (day off / not rostered). */
  | 'no-shift'
  /** Shift scheduled but the day hasn't happened yet (or is outside the
   *  attendance data window) — planned hours known, actual not yet recorded. */
  | 'scheduled'
  /** Worked at/near the planned hours. */
  | 'on-plan'
  /** Worked meaningfully below the planned hours. */
  | 'short'
  /** Full-day approved leave/holiday — rendered as plain text, no pill. */
  | 'leave';

export interface TimesheetCell {
  status: TimesheetCellStatus;
  /** Minutes actually worked this day (null = not recorded / not applicable). */
  actualMin: number | null;
  /** Minutes scheduled this day (null = no shift). */
  plannedMin: number | null;
  /** > 0 → an amber "overtime" ring is drawn around the pill (R&D: OT must
   *  stand out — it's paid differently and payroll needs it separated). */
  overtimeMin?: number;
  /** Set for a `status: 'leave'` cell — the text shown instead of a pill
   *  (e.g. "Sick Leave", "Annual Leave"). */
  label?: string;
  /** Set when this day has an attendance exception (missing punch, absence,
   *  early-out…) — rendered as a small flag marker on the pill, with this as
   *  its tooltip/label. */
  exceptionLabel?: string;
  /** True once a supervisor has corrected this day's record (regularization)
   *  — rendered as a small edit marker, audit-visible. */
  regularized?: boolean;
  /** Optional punch times (`HH:MM`) — shown in the Daily view's richer cell. */
  clockIn?: string;
  clockOut?: string;
}

export interface TimesheetTotals {
  actualMin: number;
  plannedMin: number;
  regularMin: number;
  otMin: number;
}

export type TimesheetViewMode = 'daily' | 'weekly' | 'monthly';

export interface TimesheetGridLabels {
  workerSingular?: string; // "Worker"
  workerPlural?: string;   // "Workers"
}

export interface TimesheetGridProps {
  workers: TimesheetWorker[];
  view: TimesheetViewMode;
  onViewChange: (v: TimesheetViewMode) => void;
  /** The currently-focused date — drives which week/month/day is shown. */
  anchor: Date;
  onAnchorChange: (d: Date) => void;
  /** Navigable window bounds (ISO) — prev/next disable past them (matches
   *  whatever window the consumer's underlying data actually covers). */
  minDateISO?: string;
  maxDateISO?: string;
  /** The "today" ISO date used to highlight the current-day column header —
   *  MUST be the consumer's demo/business clock, not the real wall clock
   *  (defaults to `new Date()` only as a back-compat fallback). */
  todayISO?: string;
  /** Per (worker, date) cell — called for every visible day column. */
  getCell: (workerId: string, dateISO: string) => TimesheetCell;
  /** Period totals for the worker across exactly the CURRENTLY VISIBLE days. */
  getTotals: (workerId: string, days: string[]) => TimesheetTotals;
  labels?: TimesheetGridLabels;
  /** Optional Regular/OT (and leave day count) split for the whole visible
   *  period — rendered as trailing chips on the view/nav toolbar row. */
  periodFooter?: { regularMin: number; otMin: number; leaveDays?: number };
  /** Consumer-owned scoping control (e.g. a Site `Select` + "Showing N of M")
   *  — same slot pattern as `ShiftPlanner.filterSlot`. */
  filterSlot?: React.ReactNode;
  /** Consumer-owned lifecycle/status control (Draft/Submitted/Approved…) —
   *  rendered on the toolbar, not a new chrome bar. */
  statusSlot?: React.ReactNode;
  /** Renders + wires the Export button (CSV etc.) — omit to hide it. */
  onExport?: () => void;
  /** Clicking a worker's name/avatar cell (row-level drill). */
  onRowClick?: (workerId: string) => void;
  /** Clicking one specific day cell (day-level drill). */
  onCellClick?: (workerId: string, dateISO: string) => void;
  className?: string;
}

/* ─────────────────────────── date helpers ─────────────────────────── */
const DAY_ABBR = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ord = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(d.getDate() + n); return x; };
const addMonths = (d: Date, n: number) => { const x = new Date(d.getFullYear(), d.getMonth() + n, 1); const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); x.setDate(Math.min(d.getDate(), last)); return x; };
/** Monday of the ISO week containing `d`. */
const isoWeekStart = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const dateLong = (d: Date) => `${d.getDate()} ${MON_SHORT[d.getMonth()]}, ${d.getFullYear()}`;
const dateMed = (d: Date) => `${d.getDate()} ${MON_SHORT[d.getMonth()]}`;
const weekOrdinal = (d: Date) => ord(Math.ceil(d.getDate() / 7)) + ' Week';
const monthDaysOf = (d: Date) => {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Array.from({ length: last }, (_, i) => new Date(d.getFullYear(), d.getMonth(), i + 1));
};
const fmtHM = (min: number | null | undefined) => {
  if (min == null) return '—';
  const m = Math.max(0, Math.round(min));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/* ─────────────────────────── ratio bar + pill ───────────────────────── */
const TONE_COLOR: Record<'success' | 'error' | 'muted', string> = {
  success: 'var(--status-success)', error: 'var(--status-error)', muted: 'var(--border)',
};

function RatioBar({ pct, tone }: { pct: number; tone: 'success' | 'error' | 'muted' }) {
  const color = TONE_COLOR[tone];
  return (
    <span
      className="relative inline-block h-2 w-14 shrink-0 overflow-hidden rounded-full"
      style={{ background: tone === 'muted' ? 'var(--muted)' : `color-mix(in srgb, ${color} 20%, transparent)` }}
    >
      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </span>
  );
}

function TimesheetPill({ cell, dense }: { cell: TimesheetCell; dense?: boolean }) {
  if (cell.status === 'leave') {
    return <span className={cn('font-medium text-foreground', dense ? 'text-body-sm' : 'text-body-xs')}>{cell.label ?? 'Leave'}</span>;
  }
  if (cell.status === 'no-shift') {
    return (
      <span className="inline-flex items-center gap-2">
        <RatioBar pct={0} tone="muted" />
        <span className="text-body-xs text-muted-foreground">-</span>
      </span>
    );
  }
  if (cell.status === 'scheduled') {
    return (
      <span className="inline-flex items-center gap-2">
        <RatioBar pct={0} tone="muted" />
        <span className="text-body-xs text-muted-foreground">- / {fmtHM(cell.plannedMin)}</span>
      </span>
    );
  }
  const tone = cell.status === 'on-plan' ? 'success' : 'error';
  const pct = cell.plannedMin ? ((cell.actualMin ?? 0) / cell.plannedMin) * 100 : 0;
  const overtime = (cell.overtimeMin ?? 0) > 0;
  return (
    <span
      title={cell.exceptionLabel}
      className={cn(
        'inline-flex items-center gap-2 rounded-md px-1 py-0.5',
        overtime && 'ring-1 ring-[var(--status-warning)]',
      )}
      style={overtime ? { background: 'color-mix(in srgb, var(--status-warning) 8%, transparent)' } : undefined}
    >
      <RatioBar pct={pct} tone={tone} />
      <span className="whitespace-nowrap text-body-xs font-medium text-foreground">{fmtHM(cell.actualMin)} / {fmtHM(cell.plannedMin)}</span>
      {cell.exceptionLabel ? <Icons.AlertTriangle size={11} className="shrink-0 text-[var(--status-warning)]" /> : null}
      {cell.regularized ? <Icons.Edit01 size={10} className="shrink-0 text-primary" /> : null}
    </span>
  );
}

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

/* ─────────────────────── legend ─────────────────────── */
function Legend() {
  const Item = ({ dot, label }: { dot: React.ReactNode; label: string }) => (
    <span className="flex items-center gap-1.5 text-body-xs text-muted-foreground">{dot}{label}</span>
  );
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Item dot={<span className="inline-block size-2.5 rounded-full" style={{ background: 'var(--status-success)' }} />} label="On Plan" />
      <Item dot={<span className="inline-block size-2.5 rounded-full" style={{ background: 'var(--status-error)' }} />} label="Short" />
      <Item dot={<span className="inline-block size-2.5 rounded-full ring-1 ring-[var(--status-warning)]" style={{ background: 'color-mix(in srgb, var(--status-warning) 30%, transparent)' }} />} label="Overtime" />
      <Item dot={<Icons.AlertTriangle size={12} className="text-[var(--status-warning)]" />} label="Exception" />
      <Item dot={<span className="inline-block size-2.5 rounded-full" style={{ background: 'var(--border)' }} />} label="No Shift" />
    </div>
  );
}

/* ─────────────────────────── the grid table ─────────────────────────── */
interface GridRow { id: string; name: string; roleLabel: string; color: string }

function GridTable({
  rows, days, today, workerPlural, richCells, getCell, getTotals, onRowClick, onCellClick,
}: {
  rows: GridRow[]; days: Date[]; today: string; workerPlural: string; richCells: boolean;
  getCell: TimesheetGridProps['getCell']; getTotals: TimesheetGridProps['getTotals'];
  onRowClick?: (id: string) => void; onCellClick?: (id: string, iso: string) => void;
}) {
  const dayIsos = React.useMemo(() => days.map(toISO), [days]);
  return (
    <table className="w-full min-w-[880px] border-collapse">
      <thead>
        <tr className="bg-muted/40">
          <th className="sticky left-0 z-[1] w-[220px] border-b border-r border-border bg-muted/40 px-3 py-2 text-left text-caption font-bold uppercase tracking-wide text-muted-foreground">{workerPlural}</th>
          {days.map((d, i) => {
            const iso = dayIsos[i];
            const isToday = iso === today;
            return (
              <th key={iso} className="border-b border-r border-border px-2 py-2 text-center">
                <div className={cn('inline-flex flex-col items-center rounded-md px-2 py-0.5', isToday && 'border border-primary')}>
                  <span className={cn('text-caption font-bold uppercase tracking-wide', isToday ? 'text-primary' : 'text-muted-foreground')}>{DAY_ABBR[d.getDay()]}</span>
                  <span className={cn('text-body-sm font-semibold', isToday ? 'text-primary' : 'text-foreground')}>{d.getDate()}</span>
                </div>
              </th>
            );
          })}
          <th className="border-b border-border px-3 py-2 text-left text-caption font-bold uppercase tracking-wide text-muted-foreground">Actual / Planned Hours</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const totals = getTotals(row.id, dayIsos);
          // A single-day (Daily) view's "period" IS that one cell — mirror its
          // own status (which already softens an in-progress/not-yet-finished
          // shift) rather than re-deriving a ratio that would read as "short"
          // for the exact same reason the cell itself doesn't.
          const singleDayCell = dayIsos.length === 1 ? getCell(row.id, dayIsos[0]) : null;
          const totalsTone = singleDayCell
            ? (singleDayCell.status === 'on-plan' ? 'success' : singleDayCell.status === 'short' ? 'error' : 'muted')
            : totals.plannedMin === 0 ? 'muted' : totals.actualMin / Math.max(1, totals.plannedMin) >= 0.85 ? 'success' : 'error';
          const totalsPct = totals.plannedMin ? (totals.actualMin / totals.plannedMin) * 100 : 0;
          return (
            <tr key={row.id} className="hover:bg-muted/30">
              <td className="sticky left-0 z-[1] w-[220px] border-b border-r border-border bg-card p-0 align-top">
                <button
                  type="button"
                  onClick={() => onRowClick?.(row.id)}
                  className="flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left outline-none transition-colors hover:bg-muted/50"
                >
                  <WorkerAvatar name={row.name} color={row.color} size={32} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-body-sm font-semibold text-foreground">{row.name}</span>
                    <span className="text-caption text-muted-foreground">{row.roleLabel}</span>
                  </div>
                </button>
              </td>
              {days.map((_, i) => {
                const iso = dayIsos[i];
                const cell = getCell(row.id, iso);
                return (
                  <td key={iso} className="min-w-[112px] border-b border-r border-border/60 p-1.5 align-middle">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onCellClick?.(row.id, iso); }}
                      className="flex w-full flex-col items-start gap-1 rounded-md p-1 text-left outline-none transition-colors hover:bg-muted/50"
                    >
                      <TimesheetPill cell={cell} />
                      {richCells && (cell.clockIn || cell.clockOut) ? (
                        <span className="text-caption text-muted-foreground">In {cell.clockIn ?? '—'} · Out {cell.clockOut ?? '—'}</span>
                      ) : null}
                    </button>
                  </td>
                );
              })}
              <td className="border-b border-border px-3 py-2 align-middle">
                <span className="inline-flex items-center gap-2">
                  <RatioBar pct={totalsPct} tone={totalsTone} />
                  <span className="whitespace-nowrap text-body-sm font-semibold text-foreground">{fmtHM(totals.actualMin)} / {fmtHM(totals.plannedMin)}</span>
                </span>
              </td>
            </tr>
          );
        })}
        {rows.length === 0 ? (
          <tr><td colSpan={days.length + 2} className="px-4 py-10 text-center text-body-sm text-muted-foreground">No {workerPlural.toLowerCase()} match the current search/filter.</td></tr>
        ) : null}
      </tbody>
    </table>
  );
}

/* ══════════════════════════════ TimesheetGrid ══════════════════════════ */
export function TimesheetGrid({
  workers, view, onViewChange, anchor, onAnchorChange, minDateISO, maxDateISO, todayISO,
  getCell, getTotals, labels: labelsProp, periodFooter, filterSlot, statusSlot, onExport,
  onRowClick, onCellClick, className,
}: TimesheetGridProps) {
  const labels: Required<TimesheetGridLabels> = {
    workerSingular: labelsProp?.workerSingular ?? 'Worker',
    workerPlural: labelsProp?.workerPlural ?? 'Workers',
  };

  const [query, setQuery] = React.useState('');
  const [tagFilter, setTagFilter] = React.useState<Set<string>>(new Set());
  const today = todayISO ?? toISO(new Date());

  const roleOptions = React.useMemo(() => Array.from(new Set(workers.map((w) => w.roleLabel).filter((x): x is string => !!x))).sort(), [workers]);

  const q = query.trim().toLowerCase();
  const filteredWorkers = workers.filter((w) =>
    (!q || `${w.name} ${w.roleLabel ?? ''}`.toLowerCase().includes(q)) &&
    (tagFilter.size === 0 || (w.roleLabel && tagFilter.has(w.roleLabel))));

  const rows: GridRow[] = filteredWorkers.map((w) => ({ id: w.id, name: w.name, roleLabel: w.roleLabel ?? labels.workerSingular, color: w.color ?? 'var(--primary)' }));

  const days = React.useMemo(() => {
    if (view === 'daily') return [startOfDay(anchor)];
    if (view === 'monthly') return monthDaysOf(anchor);
    const start = isoWeekStart(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [view, anchor]);

  const canStep = (candidate: Date) => {
    const iso = toISO(candidate);
    if (minDateISO && iso < minDateISO) return false;
    if (maxDateISO && iso > maxDateISO) return false;
    return true;
  };
  const stepMonth = (dir: number) => { const next = addMonths(anchor, dir); if (canStep(next)) onAnchorChange(next); };
  const stepUnit = (dir: number) => {
    const next = view === 'daily' ? addDays(anchor, dir) : addDays(anchor, dir * 7);
    if (canStep(next)) onAnchorChange(next);
  };

  const monthLabel = `${MON_SHORT[anchor.getMonth()]} ${anchor.getFullYear()}`;
  const weekStart = isoWeekStart(anchor);
  const weekLabel = `${dateMed(weekStart)} – ${dateMed(addDays(weekStart, 6))}  (${weekOrdinal(weekStart)})`;
  const dayLabel = `${DAY_FULL[anchor.getDay()]}, ${dateLong(anchor)}`;

  const toggleTag = (t: string) => setTagFilter((prev) => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });

  return (
    <div className={cn('flex h-full flex-col gap-3 overflow-hidden p-6', className)}>
      {/* toolbar row 1 — search · filters · status/export */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-[280px] max-w-full">
          <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search anything here" className="pl-8" />
        </div>
        {filterSlot}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Filter by role"
              className={cn(
                'grid size-9 shrink-0 place-items-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                tagFilter.size > 0 ? 'border-primary text-primary' : 'border-border',
              )}
            >
              <Icons.FilterLines size={15} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-2">
            <p className="mb-1 px-1 text-caption font-bold uppercase tracking-wide text-muted-foreground">Filter by role</p>
            <div className="flex max-h-64 flex-col gap-0.5 overflow-auto">
              {roleOptions.map((t) => (
                <label key={t} className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-body-sm hover:bg-muted">
                  <Checkbox checked={tagFilter.has(t)} onCheckedChange={() => toggleTag(t)} aria-label={t} />
                  {t}
                </label>
              ))}
              {roleOptions.length === 0 ? <p className="px-1.5 py-1 text-body-xs text-muted-foreground">No roles.</p> : null}
            </div>
          </PopoverContent>
        </Popover>
        <div className="ml-auto flex items-center gap-2.5">
          {statusSlot}
          {onExport ? (
            <Button variant="secondary" onClick={onExport}><Icons.Download01 size={16} className="mr-1.5" />Export</Button>
          ) : null}
        </div>
      </div>

      {/* toolbar row 2 — view toggle · navigator(s) · legend/footer */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
          {(['monthly', 'weekly', 'daily'] as const).map((v) => (
            <button key={v} type="button" onClick={() => onViewChange(v)} className={cn('rounded-md px-3 py-1.5 text-body-sm font-semibold capitalize transition-colors', view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>{v}</button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button type="button" onClick={() => stepMonth(-1)} aria-label="Previous month" className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.ChevronLeft size={15} /></button>
          <span className="min-w-[110px] text-center text-body-sm font-semibold text-foreground">{monthLabel}</span>
          <button type="button" onClick={() => stepMonth(1)} aria-label="Next month" className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.ChevronRight size={15} /></button>
        </div>

        {view !== 'monthly' ? (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => stepUnit(-1)} aria-label="Previous" className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.ChevronLeft size={15} /></button>
            <span className="min-w-[220px] text-center text-body-sm font-semibold text-foreground">{view === 'daily' ? dayLabel : weekLabel}</span>
            <button type="button" onClick={() => stepUnit(1)} aria-label="Next" className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.ChevronRight size={15} /></button>
          </div>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-4">
          <Legend />
          {periodFooter ? (
            <span className="flex items-center gap-3 border-l border-border pl-3 text-body-xs font-semibold text-foreground">
              <span>Regular <span className="text-primary">{fmtHM(periodFooter.regularMin)}</span></span>
              <span>Overtime <span className="text-[var(--status-warning)]">{fmtHM(periodFooter.otMin)}</span></span>
              {periodFooter.leaveDays != null ? <span>Leave <span className="text-muted-foreground">{periodFooter.leaveDays}d</span></span> : null}
            </span>
          ) : null}
        </div>
      </div>

      {/* grid */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
        <GridTable
          rows={rows}
          days={days}
          today={today}
          workerPlural={labels.workerPlural}
          richCells={view === 'daily'}
          getCell={getCell}
          getTotals={getTotals}
          onRowClick={onRowClick}
          onCellClick={onCellClick}
        />
      </div>
    </div>
  );
}
