/**
 * inspector-shifts — the PO "Inspector Shifts" module (Planning view) + the
 * Create/Edit shift Sheet, the recurring-delete Dialog, and the Inspector-detail
 * "Shift Schedule" week grid. Everything reads/writes the shared `useIims` store
 * so planned shifts reflect instantly in the Inspector app too.
 *
 * Built to docs/lifecycle-specs/06-inspector-shifts.md. Chrome is FAMS primary
 * blue (CTAs / active tabs / toggles); green/amber/red are reserved for genuine
 * shift status — ok / missing-assignment / conflict.
 */
import * as React from 'react';
import { createPortal } from 'react-dom';
import * as Icons from '@ds/icons';
import type { ModuleConfig } from '@ds/components/app-shell';
import { DetailSheet } from '@ds/components/app-shell';
import { DataTable } from '@ds/components/data-display';
import type { DataTableColumn } from '@ds/components/data-display';
import { DateRangePicker } from '@ds/components/basics';
import { KpiTile, MiniDonutCell } from '@ds/components/data-viz';
import {
  Button, Input, Textarea, Switch,
  Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetClose,
  Popover, PopoverTrigger, PopoverContent,
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent,
  Dialog, DialogContent, DialogTitle, DialogDescription, toast,
} from '@ds/components/primitives';
import L from 'leaflet';
import { useIims } from '@/store/store';
import { INSPECTORS, ZONES } from '@/data/catalog';
import type { PlannedShift, Incident } from '@/data/types';
import { IncidentDetailFlow } from '@/flows/IncidentDetail';
import { AvatarChip } from '@/lib/ui';
import { SEVERITY } from '@/data/status';
import { IncidentMap, DOHA_CENTER } from '@/lib/IncidentMap';
import emptyComplianceIllustration from '@/assets/empty-compliance.svg';
import inspectorMarkerUrl from '@/assets/inspector-marker.svg';
import flagStartUrl from '@/assets/flag-start.svg';
import flagEndUrl from '@/assets/flag-end.svg';

/** A [lat, lng] tuple (local — the custom RouteMap uses raw Leaflet, not DS). */
type LatLng = [number, number];
import { ComplianceGaugeChart } from './po-modules';

type Store = ReturnType<typeof useIims>;

/* ─────────────────────────────── constants ─────────────────────────────── */
export const SECTORS = ['Sector A', 'Sector B', 'Sector C', 'Sector D', 'Sector E'];
export const SHIFT_TASKS = ['General Inspection', 'Inspection', 'Bin Audit', 'Route Check'];
const DAY_ABBR = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Daily-view hour columns (08:00 … 19:00). */
const DAY_HOURS = Array.from({ length: 12 }, (_, i) => 8 + i);
/** Ordinal suffix for "11th Day" monthly labels. */
const ord = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const lotLabel = (id: string) => { const i = ZONES.findIndex((z) => z.id === id); return i < 0 ? '—' : `Lot ${i + 1}`; };
const lotSub = (id: string) => ZONES.find((z) => z.id === id)?.name ?? '';
const inspectorName = (id: string) => INSPECTORS.find((x) => x.id === id)?.name ?? '';

/* ───────────────────────── date / time helpers ─────────────────────────── */
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const minToHHMM = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(Math.round(min) % 60).padStart(2, '0')}`;
/** compact "9am" / "12:30pm" / "9:15 am" → minutes of day. */
const compactToMin = (s: string) => {
  const m = s.trim().toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!m) return 0;
  let h = Number(m[1]) % 12; if (m[3] === 'pm') h += 12;
  return h * 60 + Number(m[2] ?? 0);
};
const fmt12 = (hhmm: string) => { let [h, m] = hhmm.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`; };
const parseISO = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(d.getDate() + n); return x; };
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** Monday of the ISO week containing `d`. */
const isoWeekStart = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const dateLong = (d: Date) => `${d.getDate()} ${MON_SHORT[d.getMonth()]}, ${d.getFullYear()}`;
/** ISO week number (1..53) — used for the "(2nd Week)" navigator suffix. */
function isoWeekNo(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  const first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((t.getTime() - first.getTime()) / 86400000 - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
}
const weekOrdinal = (d: Date) => ord(Math.ceil(d.getDate() / 7)) + ' Week';

/* ─────────────────────────── derived helpers ───────────────────────────── */
export type ShiftFlag = 'conflict' | 'missing' | null;

/** Map<shiftId, 'conflict'|'missing'|null>.
 *  conflict (red): another shift, SAME inspectorId (non-empty), SAME date, times overlap.
 *  missing (amber): inspectorId === ''. */
export function shiftConflicts(shifts: PlannedShift[]): Map<string, ShiftFlag> {
  const out = new Map<string, ShiftFlag>();
  for (const sh of shifts) {
    if (!sh.inspectorId) { out.set(sh.id, 'missing'); continue; }
    const clash = shifts.some((o) =>
      o.id !== sh.id && o.inspectorId === sh.inspectorId && o.dateISO === sh.dateISO &&
      toMin(o.start) < toMin(sh.end) && toMin(sh.start) < toMin(o.end));
    out.set(sh.id, clash ? 'conflict' : null);
  }
  return out;
}

/** Total scheduled hours for an inspector within [weekStart, weekStart+7). */
export function weeklyHours(shifts: PlannedShift[], inspectorId: string, weekStart: Date): number {
  const s = startOfDay(weekStart).getTime();
  const e = s + 7 * 86400000;
  let min = 0;
  for (const sh of shifts) {
    if (sh.inspectorId !== inspectorId) continue;
    const t = parseISO(sh.dateISO).getTime();
    if (t >= s && t < e) min += Math.max(0, toMin(sh.end) - toMin(sh.start));
  }
  return Math.round((min / 60) * 10) / 10;
}

const FLAG_COLOR: Record<'ok' | 'missing' | 'conflict', string> = {
  ok: 'var(--status-success)', missing: 'var(--status-warning)', conflict: 'var(--status-error)',
};
const flagKey = (f: ShiftFlag): 'ok' | 'missing' | 'conflict' => (f === 'conflict' ? 'conflict' : f === 'missing' ? 'missing' : 'ok');

/* ─────────────────────────── recurrence engine ─────────────────────────── */
export type Frequency = 'Daily' | 'Weekly' | 'Monthly';
export interface RecurrenceCfg {
  frequency: Frequency;
  every: number;              // repeat every N units
  monthlyDay?: number;        // Monthly → repeat on the Nth day of month
  endsMode: 'on' | 'after';
  endDateISO?: string;        // endsMode 'on'
  count?: number;             // endsMode 'after'
}

/** Generate the occurrence dates (ISO) for a recurrence starting at `startISO`. */
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
    else { // Monthly — advance by N months, land on monthlyDay (clamped)
      const next = new Date(cur.getFullYear(), cur.getMonth() + every, 1);
      const dom = rec.monthlyDay ?? start.getDate();
      const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(dom, last));
      cur = next;
    }
  }
  return out;
}

/* ══════════════════════════════ chip (weekly) ══════════════════════════════ */

function ShiftChip({
  sh, flag, highlight, onOpen, onEdit, onDelete,
}: {
  sh: PlannedShift; flag: ShiftFlag; highlight: boolean;
  onOpen: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [menu, setMenu] = React.useState(false);
  const color = highlight ? FLAG_COLOR[flagKey(flag)] : 'var(--border)';
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-0.5 rounded-md border bg-card px-2 py-1.5 pr-6 text-left transition-colors hover:bg-muted/40"
        style={{ borderColor: highlight ? color : 'var(--border)', borderLeftWidth: 3, borderLeftColor: highlight ? color : 'var(--primary)', background: highlight && flag ? `color-mix(in srgb, ${color} 8%, var(--card))` : undefined }}
      >
        <span className="flex items-center gap-1 truncate text-[11px] font-semibold text-foreground">
          <Icons.Clock size={11} className="shrink-0 text-muted-foreground" />
          {fmt12(sh.start)} – {fmt12(sh.end)}
        </span>
        <span className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
          <Icons.Briefcase01 size={10} className="shrink-0" />{sh.task}
        </span>
        <span className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
          <Icons.MarkerPin01 size={10} className="shrink-0" />{sh.sector} · {lotLabel(sh.lotId)}
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

/* Utilization badge under an inspector row. */
function UtilizationBadge({ hours }: { hours: number }) {
  const utilized = hours > 0;
  const color = utilized ? 'var(--primary)' : 'var(--status-error)';
  return (
    <span className="mt-1 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
      {utilized ? `Utilized for ${hours}h per week` : 'Not Utilized'}
    </span>
  );
}

/* ══════════════════════════════ Planning view ══════════════════════════════ */

type ViewMode = 'weekly' | 'daily';

function PlanningView({ s }: { s: Store }) {
  const shifts = s.data.shifts;
  const [query, setQuery] = React.useState('');
  const [view, setView] = React.useState<ViewMode>('weekly');
  const [anchor, setAnchor] = React.useState<Date>(() => startOfDay(new Date(s.now)));
  const [highlight, setHighlight] = React.useState(true);

  // Sheet / dialog state
  const [sheet, setSheet] = React.useState<{ mode: 'create' | 'edit'; shift?: PlannedShift; date?: string } | null>(null);
  const [del, setDel] = React.useState<PlannedShift | null>(null);

  const weekStart = React.useMemo(() => isoWeekStart(anchor), [anchor]);
  const weekDays = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const flags = React.useMemo(() => shiftConflicts(shifts), [shifts]);

  const q = query.trim().toLowerCase();
  const matches = React.useCallback((sh: PlannedShift) =>
    !q || `${inspectorName(sh.inspectorId)} ${sh.task} ${sh.sector} ${lotLabel(sh.lotId)} ${lotSub(sh.lotId)}`.toLowerCase().includes(q), [q]);

  // Visible shifts for the active window (week or day) — drives the legend %.
  const windowISO = React.useMemo(() => {
    if (view === 'daily') return new Set([toISO(anchor)]);
    return new Set(weekDays.map(toISO));
  }, [view, anchor, weekDays]);
  const visible = shifts.filter((sh) => windowISO.has(sh.dateISO) && matches(sh));
  const visMissing = visible.filter((sh) => flags.get(sh.id) === 'missing').length;
  const visConflict = visible.filter((sh) => flags.get(sh.id) === 'conflict').length;
  const pct = (n: number) => (visible.length ? Math.round((n / visible.length) * 100) : 0);

  const step = (dir: number) => setAnchor((d) => addDays(d, view === 'daily' ? dir : dir * 7));
  const navLabel = view === 'daily'
    ? `${DAY_FULL[anchor.getDay()]}, ${dateLong(anchor)}`
    : `${dateLong(weekStart)} – ${dateLong(addDays(weekStart, 6))}  (${weekOrdinal(weekStart)})`;

  // Rows = inspectors + a synthetic "Unassigned" row for missing-assignment shifts.
  const rows: { id: string; name: string; unassigned?: boolean }[] = [
    ...INSPECTORS.map((i) => ({ id: i.id, name: i.name })),
    ...(shifts.some((sh) => !sh.inspectorId) ? [{ id: '', name: 'Unassigned', unassigned: true }] : []),
  ];

  const openCreate = (date?: string) => setSheet({ mode: 'create', date: date ?? toISO(anchor) });
  const openEdit = (sh: PlannedShift) => setSheet({ mode: 'edit', shift: sh });
  const askDelete = (sh: PlannedShift) => { if (sh.recurring) setDel(sh); else { s.deleteShift(sh.id, 'one'); toast.success('Shift deleted'); } };

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden p-6">
      {/* toolbar row 1 — search + filter · New Shift */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-[320px] max-w-full">
          <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search anything here" className="pl-8" />
        </div>
        <button type="button" className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Filter"><Icons.FilterLines size={15} /></button>
        <div className="ml-auto">
          <Button variant="primary" onClick={() => openCreate()}><Icons.Plus size={16} className="mr-1.5" />New Shift</Button>
        </div>
      </div>

      {/* toolbar row 2 — view toggle · navigator · highlight + legend */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
          {(['weekly', 'daily'] as ViewMode[]).map((v) => (
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
          ? <WeeklyGrid rows={rows} weekDays={weekDays} weekStart={weekStart} shifts={shifts} flags={flags} highlight={highlight} matches={matches} onOpen={openEdit} onEdit={openEdit} onDelete={askDelete} />
          : <DailyGrid rows={rows} date={anchor} shifts={shifts} flags={flags} highlight={highlight} matches={matches} onOpen={openEdit} onEdit={openEdit} onDelete={askDelete} />}
      </div>

      {sheet && (
        <ScheduleShiftSheet
          s={s}
          mode={sheet.mode}
          shift={sheet.shift}
          defaultDate={sheet.date}
          onClose={() => setSheet(null)}
        />
      )}
      {del && <DeleteShiftDialog shift={del} onClose={() => setDel(null)} onConfirm={(scope) => { s.deleteShift(del.id, scope); toast.success('Shift deleted'); setDel(null); }} />}
    </div>
  );
}

/* ── weekly: inspectors × 7 days ── */
function WeeklyGrid({
  rows, weekDays, weekStart, shifts, flags, highlight, matches, onOpen, onEdit, onDelete,
}: {
  rows: { id: string; name: string; unassigned?: boolean }[];
  weekDays: Date[]; weekStart: Date; shifts: PlannedShift[]; flags: Map<string, ShiftFlag>;
  highlight: boolean; matches: (sh: PlannedShift) => boolean;
  onOpen: (sh: PlannedShift) => void; onEdit: (sh: PlannedShift) => void; onDelete: (sh: PlannedShift) => void;
}) {
  const insp = (id: string) => INSPECTORS.find((x) => x.id === id);
  // per-day flag counts (for the dots under weekday headers)
  const dayCounts = weekDays.map((d) => {
    const iso = toISO(d);
    const day = shifts.filter((sh) => sh.dateISO === iso && matches(sh));
    return { missing: day.filter((sh) => flags.get(sh.id) === 'missing').length, conflict: day.filter((sh) => flags.get(sh.id) === 'conflict').length };
  });
  return (
    <table className="w-full min-w-[880px] border-collapse">
      <thead>
        <tr className="bg-muted/40">
          <th className="sticky left-0 z-[1] w-[220px] border-b border-r border-border bg-muted/40 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Inspectors</th>
          {weekDays.map((d, i) => {
            const weekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <th key={i} className="border-b border-r border-border px-2 py-2 text-center">
                <div className={`text-[11px] font-bold uppercase tracking-wide ${weekend ? 'text-muted-foreground' : 'text-primary'}`}>{DAY_ABBR[d.getDay()]}</div>
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
          const hours = row.unassigned ? 0 : weeklyHours(shifts, row.id, weekStart);
          const person = insp(row.id);
          return (
            <tr key={row.id || 'unassigned'}>
              <td className="sticky left-0 z-[1] w-[220px] border-b border-r border-border bg-card px-3 py-2 align-top">
                <div className="flex items-start gap-2">
                  {row.unassigned
                    ? <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--status-warning)_16%,transparent)] text-[var(--status-warning)]"><Icons.AlertTriangle size={15} /></span>
                    : <AvatarChip name={person?.name ?? '—'} color={person?.avatarColor ?? 'var(--primary)'} size={32} />}
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-body-sm font-semibold text-foreground">{row.name}</span>
                    <span className="text-[11px] text-muted-foreground">{row.unassigned ? 'Missing assignment' : 'Inspector'}</span>
                    {!row.unassigned && <UtilizationBadge hours={hours} />}
                  </div>
                </div>
              </td>
              {weekDays.map((d, i) => {
                const iso = toISO(d);
                const cell = shifts.filter((sh) => sh.inspectorId === row.id && sh.dateISO === iso && matches(sh)).sort((a, b) => toMin(a.start) - toMin(b.start));
                return (
                  <td key={i} className="min-w-[112px] border-b border-r border-border/60 p-1.5 align-top">
                    <div className="flex flex-col gap-1.5">
                      {cell.map((sh) => (
                        <ShiftChip key={sh.id} sh={sh} flag={flags.get(sh.id) ?? null} highlight={highlight} onOpen={() => onOpen(sh)} onEdit={() => onEdit(sh)} onDelete={() => onDelete(sh)} />
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

/* ── daily: inspectors × hours (08–19) timeline bars ── */
function DailyGrid({
  rows, date, shifts, flags, highlight, matches, onOpen, onEdit, onDelete,
}: {
  rows: { id: string; name: string; unassigned?: boolean }[];
  date: Date; shifts: PlannedShift[]; flags: Map<string, ShiftFlag>;
  highlight: boolean; matches: (sh: PlannedShift) => boolean;
  onOpen: (sh: PlannedShift) => void; onEdit: (sh: PlannedShift) => void; onDelete: (sh: PlannedShift) => void;
}) {
  const insp = (id: string) => INSPECTORS.find((x) => x.id === id);
  const iso = toISO(date);
  const dayStart = DAY_HOURS[0] * 60;         // 08:00
  const dayEnd = (DAY_HOURS[DAY_HOURS.length - 1] + 1) * 60; // 20:00
  const span = dayEnd - dayStart;
  return (
    <table className="w-full min-w-[880px] border-collapse">
      <thead>
        <tr className="bg-muted/40">
          <th className="sticky left-0 z-[1] w-[220px] border-b border-r border-border bg-muted/40 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Inspectors</th>
          <th className="border-b border-border p-0">
            <div className="grid" style={{ gridTemplateColumns: `repeat(${DAY_HOURS.length}, 1fr)` }}>
              {DAY_HOURS.map((h) => (
                <div key={h} className="border-r border-border/60 py-2 text-center text-[11px] font-semibold text-muted-foreground">{String(h).padStart(2, '0')}:00</div>
              ))}
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const person = insp(row.id);
          const cell = shifts.filter((sh) => sh.inspectorId === row.id && sh.dateISO === iso && matches(sh)).sort((a, b) => toMin(a.start) - toMin(b.start));
          return (
            <tr key={row.id || 'unassigned'}>
              <td className="sticky left-0 z-[1] w-[220px] border-b border-r border-border bg-card px-3 py-2 align-middle">
                <div className="flex items-center gap-2">
                  {row.unassigned
                    ? <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--status-warning)_16%,transparent)] text-[var(--status-warning)]"><Icons.AlertTriangle size={15} /></span>
                    : <AvatarChip name={person?.name ?? '—'} color={person?.avatarColor ?? 'var(--primary)'} size={30} />}
                  <span className="truncate text-body-sm font-semibold text-foreground">{row.name}</span>
                </div>
              </td>
              <td className="border-b border-border p-0">
                <div className="relative h-14">
                  {/* hour gridlines */}
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${DAY_HOURS.length}, 1fr)` }}>
                    {DAY_HOURS.map((h) => <div key={h} className="border-r border-border/40" />)}
                  </div>
                  {cell.map((sh) => {
                    const flag = flags.get(sh.id) ?? null;
                    const color = highlight ? FLAG_COLOR[flagKey(flag)] : 'var(--primary)';
                    const left = ((Math.max(dayStart, toMin(sh.start)) - dayStart) / span) * 100;
                    const width = ((Math.min(dayEnd, toMin(sh.end)) - Math.max(dayStart, toMin(sh.start))) / span) * 100;
                    return (
                      <div key={sh.id} className="group absolute top-1.5 bottom-1.5" style={{ left: `${left}%`, width: `${Math.max(4, width)}%` }}>
                        <button type="button" onClick={() => onOpen(sh)} className="flex h-full w-full flex-col justify-center overflow-hidden rounded-md border px-2 text-left transition-colors hover:brightness-95" style={{ borderColor: color, borderLeftWidth: 3, background: `color-mix(in srgb, ${color} 12%, var(--card))` }} title={`${fmt12(sh.start)} – ${fmt12(sh.end)} · ${sh.task} · ${sh.sector} · ${lotLabel(sh.lotId)}`}>
                          <span className="truncate text-[10px] font-semibold text-foreground">{fmt12(sh.start)}–{fmt12(sh.end)}</span>
                          <span className="truncate text-[9px] text-muted-foreground">{sh.task} · {lotLabel(sh.lotId)}</span>
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

/* ══════════════════════ Schedule / Edit Shift Sheet ═════════════════════════ */

/** Floating-label popover select (matches DocTypeField in po-modules). */
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
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}{required && <span className="text-[var(--status-error)]"> *</span>}</span>
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
              <span className="flex min-w-0 flex-col"><span className="truncate text-foreground">{o.label}</span>{o.sub && <span className="truncate text-[11px] text-muted-foreground">{o.sub}</span>}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

/** Floating-label time field (native input[type=time], clearable). */
function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
      <Icons.Clock size={18} className="shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-body-sm font-medium text-foreground outline-none" />
      </span>
      {value && <button type="button" aria-label="Clear" onClick={() => onChange('')} className="shrink-0 text-muted-foreground hover:text-foreground"><Icons.XClose size={15} /></button>}
    </div>
  );
}

/**
 * Floating close affordance — copied verbatim (classes + `SheetClose` wiring)
 * from the DS creation-sheet standard,
 * `fams-design-system/packages/v5-templates/src/creation-sheet/CreationSheet.tsx`
 * (`SheetFloatingClose`), which is what the Requests & Complaints pipeline
 * creation form renders. A circular tertiary icon button fully DETACHED in the
 * overlay gap left of the sheet, vertically centered on the panel: `end-full`
 * pins its trailing edge to the panel's leading edge, then `me-10` (40px) pushes
 * it into the gap. Replaces the sheet's own top-right "X" (`hideClose` on
 * `SheetContent`); same `SheetClose` → `onOpenChange(false)` path.
 */
const SheetFloatingClose = () => (
  <SheetClose asChild>
    <Button
      type="button"
      variant="tertiary"
      size="icon"
      aria-label="Close"
      className="absolute end-full top-1/2 z-10 me-10 size-10 -translate-y-1/2 rounded-full border border-border bg-card shadow-elevation"
    >
      <Icons.XClose size={16} aria-hidden />
    </Button>
  </SheetClose>
);

type SheetTab = 'basic' | 'plans' | 'shift';

interface DraftShift {
  dateISO: string; lotId: string; sector: string;
  inspectorId: string; start: string; end: string; task: string; notes: string;
  recurring: boolean; rec: RecurrenceCfg;
}

function ScheduleShiftSheet({
  s, mode, shift, defaultDate, onClose,
}: { s: Store; mode: 'create' | 'edit'; shift?: PlannedShift; defaultDate?: string; onClose: () => void }) {
  const [tab, setTab] = React.useState<SheetTab>('basic');

  const initial = React.useMemo<DraftShift>(() => ({
    dateISO: shift?.dateISO ?? defaultDate ?? toISO(new Date(s.now)),
    lotId: shift?.lotId ?? ZONES[0].id,
    sector: shift?.sector ?? SECTORS[0],
    inspectorId: shift?.inspectorId ?? '',
    start: shift?.start ?? '08:00',
    end: shift?.end ?? '10:00',
    task: shift?.task ?? SHIFT_TASKS[0],
    notes: shift?.notes ?? '',
    recurring: shift?.recurring ?? false,
    rec: { frequency: 'Weekly', every: 1, monthlyDay: shift ? parseISO(shift.dateISO).getDate() : new Date(s.now).getDate(), endsMode: 'after', count: 10 },
  }), [shift, defaultDate, s]);

  const [draft, setDraft] = React.useState<DraftShift>(initial);
  const set = <K extends keyof DraftShift>(k: K, v: DraftShift[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setRec = <K extends keyof RecurrenceCfg>(k: K, v: RecurrenceCfg[K]) => setDraft((d) => ({ ...d, rec: { ...d.rec, [k]: v } }));

  // dirty-tracking for edit mode
  const dirty = React.useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial]);

  const dateDisplay = draft.dateISO ? dateLong(parseISO(draft.dateISO)) : '';
  const zone = ZONES.find((z) => z.id === draft.lotId);

  // recurrence preview occurrences + per-row conflict against existing shifts
  const occurrences = React.useMemo(() => draft.recurring ? generateOccurrences(draft.dateISO, draft.rec) : [draft.dateISO], [draft.recurring, draft.dateISO, draft.rec]);
  const occConflict = React.useCallback((dISO: string) => {
    if (!draft.inspectorId) return false;
    return s.data.shifts.some((o) =>
      o.inspectorId === draft.inspectorId && o.dateISO === dISO && (mode === 'create' || o.seriesId !== shift?.seriesId) &&
      toMin(o.start) < toMin(draft.end) && toMin(draft.start) < toMin(o.end));
  }, [draft, s.data.shifts, mode, shift]);

  const submit = () => {
    if (mode === 'create') {
      const seriesId = `series-${Date.now()}`;
      const built: PlannedShift[] = occurrences.map((dISO, i) => ({
        id: `shift-${Date.now()}-${i}`,
        seriesId: draft.recurring ? seriesId : `shift-${Date.now()}-${i}`,
        inspectorId: draft.inspectorId, dateISO: dISO, start: draft.start, end: draft.end,
        lotId: draft.lotId, sector: draft.sector, task: draft.task, recurring: draft.recurring,
        notes: draft.notes || undefined,
      }));
      s.addShifts(built);
      toast.success(draft.recurring ? `${built.length} shifts scheduled` : 'Shift scheduled');
    } else if (shift) {
      s.updateShift(shift.id, {
        dateISO: draft.dateISO, lotId: draft.lotId, sector: draft.sector, inspectorId: draft.inspectorId,
        start: draft.start, end: draft.end, task: draft.task, notes: draft.notes || undefined, recurring: draft.recurring,
      });
      toast.success('Shift updated');
    }
    onClose();
  };

  const TabBtn = ({ id, label }: { id: SheetTab; label: string }) => (
    <button type="button" onClick={() => setTab(id)} className={`relative px-1 py-2.5 text-body-sm font-semibold transition-colors ${tab === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
      {label}
      {tab === id && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
    </button>
  );

  const RECUR_MARKER = { position: zone?.center ? { lat: zone.center.lat, lng: zone.center.lng } : undefined };

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" width="min(520px, 94vw)" hideClose className="flex flex-col p-0">
        <SheetFloatingClose />
        <SheetHeader><SheetTitle>{mode === 'edit' ? 'Edit Shift' : 'Schedule New Shift'}</SheetTitle></SheetHeader>
        <div className="flex items-center gap-6 border-b border-border px-6">
          <TabBtn id="basic" label="Basic Info" />
          <TabBtn id="plans" label="Scheduled Plans" />
          <TabBtn id="shift" label="Shift Info" />
        </div>

        <div className="flex-1 overflow-auto p-6">
          {tab === 'basic' && (
            <div className="flex flex-col gap-4">
              <DateRangePicker
                mode="single"
                field={{ label: <>Select Date <span className="text-[var(--status-error)]">*</span></> }}
                value={dateDisplay || undefined}
                placeholder="Select date"
                onApply={(r) => { if (r.start) set('dateISO', toISO(r.start)); }}
              />
              <FieldSelect label="Select Lot" required icon={<Icons.MarkerPin01 size={18} />} value={draft.lotId}
                display={`${lotLabel(draft.lotId)} · ${lotSub(draft.lotId)}`}
                options={ZONES.map((z, i) => ({ value: z.id, label: `Lot ${i + 1}`, sub: z.name }))}
                onChange={(v) => set('lotId', v)} />
              <FieldSelect label="Select Sector" required icon={<Icons.Grid01 size={18} />} value={draft.sector}
                options={SECTORS.map((s2) => ({ value: s2, label: s2 }))} onChange={(v) => set('sector', v)} />
              <div className="overflow-hidden rounded-lg border border-border">
                <p className="border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{draft.sector} · {lotLabel(draft.lotId)} · {lotSub(draft.lotId)}</p>
                <div className="h-[220px] w-full">
                  <IncidentMap incidents={[]} single={RECUR_MARKER.position} />
                </div>
              </div>
            </div>
          )}

          {tab === 'plans' && <ScheduledPlansTab lotId={draft.lotId} />}

          {tab === 'shift' && (
            <div className="flex flex-col gap-4">
              <FieldSelect label="Select Inspector" icon={<Icons.User01 size={18} />} value={draft.inspectorId}
                display={draft.inspectorId ? inspectorName(draft.inspectorId) : ''}
                options={INSPECTORS.map((i) => ({ value: i.id, label: i.name }))} onChange={(v) => set('inspectorId', v)} />
              <div className="grid grid-cols-2 gap-3">
                <TimeField label="Start Time" value={draft.start} onChange={(v) => set('start', v)} />
                <TimeField label="End Time" value={draft.end} onChange={(v) => set('end', v)} />
              </div>
              {/* The "Task" select was removed from this form (2026-09-01, user
                  request). `draft.task` still carries the default SHIFT_TASKS[0]
                  so shift chips / the week grid keep rendering a task label. */}
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Notes / Instructions</span>
                <Textarea rows={3} value={draft.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional instructions for the inspector…" />
              </label>

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
                      display={`${draft.rec.every} ${draft.rec.frequency === 'Daily' ? 'Day' : draft.rec.frequency === 'Weekly' ? 'Week' : 'Month'}${draft.rec.every > 1 ? 's' : ''}`}
                      options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n} ${draft.rec.frequency === 'Daily' ? 'Day' : draft.rec.frequency === 'Weekly' ? 'Week' : 'Month'}${n > 1 ? 's' : ''}` }))}
                      onChange={(v) => setRec('every', Number(v))} />
                  </div>
                  {draft.rec.frequency === 'Monthly' && (
                    <FieldSelect label="Repeat On" icon={<Icons.Calendar size={18} />} value={String(draft.rec.monthlyDay ?? 1)}
                      display={`${ord(draft.rec.monthlyDay ?? 1)} Day`}
                      options={Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `${ord(i + 1)} Day` }))}
                      onChange={(v) => setRec('monthlyDay', Number(v))} />
                  )}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ends On</span>
                    <label className="flex items-center gap-2 text-body-sm text-foreground">
                      <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${draft.rec.endsMode === 'on' ? 'border-primary' : 'border-border'}`}>{draft.rec.endsMode === 'on' && <span className="size-2 rounded-full bg-primary" />}</span>
                      <input type="radio" className="hidden" checked={draft.rec.endsMode === 'on'} onChange={() => setRec('endsMode', 'on')} />
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

                  {/* preview table */}
                  <p className="text-body-sm font-semibold text-foreground">Preview</p>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full border-collapse">
                      <thead><tr className="bg-muted/40">
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Date</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Day</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Time</th>
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
                    {occurrences.length > 24 && <p className="px-3 py-1.5 text-[11px] text-muted-foreground">+ {occurrences.length - 24} more…</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <SheetFooter>
          {/* Detail/edit view: a single Update CTA on every tab, disabled until the
              PO actually changes a field (navigate tabs via the tab headers). */}
          {mode === 'edit'
            ? <Button variant="primary" className="w-full" disabled={!dirty} onClick={submit}>Update</Button>
            : tab !== 'shift'
              ? <Button variant="primary" className="w-full" onClick={() => setTab(tab === 'basic' ? 'plans' : 'shift')}>Save &amp; Next</Button>
              : <Button variant="primary" className="w-full" onClick={submit}>Create</Button>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ── Scheduled Plans tab — reference DataTable of the lot's contracted plans ── */
interface PlanRow { id: string; contract: string; serviceType: string; wasteType: string; lastService: string; status: string; }
const SERVICE_TYPES = ['Bin Collection', 'Street Sweeping', 'Bin Washing', 'Container Collection'];
const WASTE_TYPES = ['General', 'Recyclable', 'Bulky', 'Hazardous'];
function ScheduledPlansTab({ lotId }: { lotId: string }) {
  const [query, setQuery] = React.useState('');
  const rows = React.useMemo<PlanRow[]>(() => {
    const li = Math.max(0, ZONES.findIndex((z) => z.id === lotId));
    return Array.from({ length: 10 }, (_, i) => {
      const day = 10 + ((li * 3 + i * 2) % 18);
      const scheduled = (li + i) % 3 !== 0;
      return {
        id: `plan-${lotId}-${i}`,
        contract: `Nadeef ${lotLabel(lotId)}`,
        serviceType: SERVICE_TYPES[(li + i) % SERVICE_TYPES.length],
        wasteType: WASTE_TYPES[(li + i) % WASTE_TYPES.length],
        lastService: `${day} Jan, 2026 ${String(9 + (i % 8)).padStart(2, '0')}:00`,
        status: scheduled ? 'SCHEDULED' : 'COMPLETED',
      };
    });
  }, [lotId]);
  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => !q || `${r.contract} ${r.serviceType} ${r.wasteType}`.toLowerCase().includes(q));

  const pill = (text: string, color: string) => (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>{text}</span>
  );
  const columns: DataTableColumn<PlanRow>[] = [
    { id: 'contract', header: 'Contract', accessor: (r) => r.contract, sortable: true },
    { id: 'service', header: 'Service Type', width: '150px', cell: (r) => pill(r.serviceType, 'var(--chart-accent-purple)') },
    { id: 'waste', header: 'Waste Type', accessor: (r) => r.wasteType, width: '120px' },
    { id: 'last', header: 'Last Service', accessor: (r) => r.lastService, width: '170px', sortable: true },
    { id: 'status', header: 'Status', width: '130px', cell: (r) => pill(r.status, r.status === 'SCHEDULED' ? 'var(--status-warning)' : 'var(--status-success)') },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search plans…" className="pl-8" />
        </div>
        <button type="button" className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Filter"><Icons.FilterLines size={15} /></button>
      </div>
      <DataTable columns={columns} data={filtered} getRowId={(r) => r.id} emptyState={<div className="py-8 text-center text-body-sm text-muted-foreground">No plans for this lot.</div>} />
    </div>
  );
}

/* ═══════════════════════════ Delete Recurring dialog ═══════════════════════ */

type DeleteScope = 'one' | 'following' | 'all';
function DeleteShiftDialog({ shift, onClose, onConfirm }: { shift: PlannedShift; onClose: () => void; onConfirm: (scope: DeleteScope) => void }) {
  const [scope, setScope] = React.useState<DeleteScope>('one');
  const opts: { value: DeleteScope; label: string; sub: string }[] = [
    { value: 'one', label: 'This shift', sub: 'Only this specific instance will be removed.' },
    { value: 'following', label: 'This and following shifts', sub: 'Deletes this and all future scheduled instances in this series.' },
    { value: 'all', label: 'All shifts', sub: 'Deletes every shift in this recurring series, past and future.' },
  ];
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
              This is a recurring shift for Inspector <span className="font-semibold text-foreground">{inspectorName(shift.inspectorId) || 'Unassigned'}</span> in <span className="font-semibold text-foreground">{shift.sector}</span>. How would you like to proceed?
            </DialogDescription>
          </div>
          <div className="flex flex-col gap-2">
            {opts.map((o) => (
              <button key={o.value} type="button" onClick={() => setScope(o.value)} className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors ${scope === o.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}>
                <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${scope === o.value ? 'border-primary' : 'border-border'}`}>{scope === o.value && <span className="size-2 rounded-full bg-primary" />}</span>
                <span className="flex flex-col">
                  <span className="text-body-sm font-semibold text-foreground">{o.label}</span>
                  <span className="text-[11px] text-muted-foreground">{o.sub}</span>
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

/* ══════════════════════════════ module builder ═════════════════════════════ */

/**
 * Compliance Monitoring is HIDDEN (2026-09-01) — see this bundle's HIDDEN.md.
 * Flip to `true` here AND re-add the view in
 * `app/src/demo/inspector-shifts-module.tsx` to bring the tab back; all of
 * `ComplianceMonitoringView`, `complianceEntries`, the compliance DetailSheet
 * and the RouteMap stay in the codebase untouched.
 */
const SHOW_COMPLIANCE_MONITORING = false;

export function buildInspectorShiftsModule(s: Store): ModuleConfig {
  return {
    id: 'shifts',
    type: 'dashboard',
    label: 'Inspector Shifts',
    icon: Icons.CalendarCheck01,
    tabKind: 'instance',
    defaultTabId: 'planning',
    tabs: [
      { id: 'planning', label: 'Planning', icon: Icons.CalendarCheck01, render: () => <PlanningView s={s} /> },
      ...(SHOW_COMPLIANCE_MONITORING
        ? [{ id: 'compliance', label: 'Compliance Monitoring', icon: Icons.ShieldTick, render: () => <ComplianceMonitoringView s={s} /> }]
        : []),
    ],
  };
}

/* ═══════════════ Inspector detail · "Shift Schedule" week grid ══════════════ */

/** Week time-grid (hours × 7 days) with green shift blocks for one inspector.
 *  Hoisted as its own component so its hooks are isolated (EntityDetail renders
 *  only the active tab). */
export function InspectorShiftScheduleTab({ s, inspectorId }: { s: Store; inspectorId: string }) {
  const [query, setQuery] = React.useState('');
  const [anchor, setAnchor] = React.useState<Date>(() => startOfDay(new Date(s.now)));
  const weekStart = React.useMemo(() => isoWeekStart(anchor), [anchor]);
  const weekDays = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const HOURS = Array.from({ length: 12 }, (_, i) => 10 + i); // 10:00 … 21:00
  const gridStart = HOURS[0] * 60;
  const gridEnd = (HOURS[HOURS.length - 1] + 1) * 60;
  const span = gridEnd - gridStart;

  const q = query.trim().toLowerCase();
  const mine = s.data.shifts.filter((sh) => sh.inspectorId === inspectorId &&
    (!q || `${sh.task} ${sh.sector} ${lotLabel(sh.lotId)}`.toLowerCase().includes(q)));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-[280px] max-w-full">
          <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search shifts…" className="pl-8" />
        </div>
        <button type="button" className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Filter"><Icons.FilterLines size={15} /></button>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => setAnchor((d) => addDays(d, -7))} aria-label="Previous week" className="grid size-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.ChevronLeft size={16} /></button>
          <span className="min-w-[210px] text-center text-body-sm font-semibold text-foreground">{dateLong(weekStart)} – {dateLong(addDays(weekStart, 6))}</span>
          <button type="button" onClick={() => setAnchor((d) => addDays(d, 7))} aria-label="Next week" className="grid size-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-border">
        <div className="min-w-[760px]">
          {/* header row */}
          <div className="grid border-b border-border bg-muted/40" style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}>
            <div className="px-2 py-2" />
            {weekDays.map((d, i) => {
              const weekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div key={i} className="border-l border-border px-2 py-2 text-center">
                  <div className={`text-[11px] font-bold uppercase tracking-wide ${weekend ? 'text-muted-foreground' : 'text-primary'}`}>{DAY_ABBR[d.getDay()]}</div>
                  <div className="text-body-sm font-semibold text-foreground">{d.getDate()}</div>
                </div>
              );
            })}
          </div>
          {/* body — hour rows with absolutely-positioned blocks per day column */}
          <div className="relative grid" style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}>
            {/* hour labels + gridlines */}
            <div className="flex flex-col">
              {HOURS.map((h) => <div key={h} className="h-12 border-b border-border/50 px-2 pt-1 text-right text-[10px] text-muted-foreground">{fmt12(`${String(h).padStart(2, '0')}:00`)}</div>)}
            </div>
            {weekDays.map((d, di) => {
              const iso = toISO(d);
              const cell = mine.filter((sh) => sh.dateISO === iso);
              return (
                <div key={di} className="relative border-l border-border">
                  {HOURS.map((h) => <div key={h} className="h-12 border-b border-border/50" />)}
                  {cell.map((sh) => {
                    const top = ((Math.max(gridStart, toMin(sh.start)) - gridStart) / span) * 100;
                    const height = ((Math.min(gridEnd, toMin(sh.end)) - Math.max(gridStart, toMin(sh.start))) / span) * 100;
                    return (
                      <div key={sh.id} className="absolute inset-x-1 overflow-hidden rounded-md border px-1.5 py-1" style={{ top: `${top}%`, height: `${Math.max(6, height)}%`, borderColor: 'var(--status-success)', borderLeftWidth: 3, background: 'color-mix(in srgb, var(--status-success) 12%, var(--card))' }} title={`${fmt12(sh.start)} – ${fmt12(sh.end)} · ${sh.sector} · ${lotLabel(sh.lotId)} · ${sh.task}`}>
                        <p className="truncate text-[10px] font-semibold text-foreground">{fmt12(sh.start)} – {fmt12(sh.end)}</p>
                        <p className="truncate text-[9px] text-muted-foreground">{sh.sector} · {lotLabel(sh.lotId)}</p>
                        <p className="truncate text-[9px] text-muted-foreground">{sh.task}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  §7 — Compliance Monitoring (2nd tab)
 *  A per-day-per-inspector compliance record derived from the store's planned
 *  shifts, a list table, and a wide detail sheet (KPI grid · Plan Log timeline ·
 *  route/sector map · per-sector inspection cards). Everything is deterministic
 *  (seeded by inspectorId+dateISO) so it stays stable across reloads.
 *  Chrome stays FAMS blue; green/amber/red are genuine status only.
 * ═══════════════════════════════════════════════════════════════════════════ */

/* seeded 0..1 PRNG (FNV-1a) — same technique as po-modules' seed01. */
function h01(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
const hInt = (key: string, n: number) => Math.floor(h01(key) * n);

const KPI_CATEGORIES = ['Solid Waste', 'Mechanical Sweeping', 'Manual Sweeping', 'Fleet', 'EHS', 'PCC'];
const INCIDENT_TITLES = [
  'Overflowing bin / container', 'Missed scheduled collection', 'Bin not washed / foul odour',
  'Street segment not swept', 'Worker without mandatory PPE', 'Debris left along kerb line',
  'Illegal dumping observed', 'Container lid damaged',
];

/* ── 7a. data model ─────────────────────────────────────────────────────── */
export interface ComplianceEntry {
  id: string;
  inspectorId: string;
  dateISO: string;
  lotId: string;
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

/** 24h "HH:MM" → compact "9am" / "12:30pm". */
function fmtCompact(hhmm: string): string {
  let [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return m ? `${h}:${String(m).padStart(2, '0')}${ap}` : `${h}${ap}`;
}
const hm = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;

/** One ComplianceEntry per (inspectorId, dateISO) across the store's planned
 *  shifts (skips unassigned). Deterministic — seeded by inspectorId+dateISO. */
export function complianceEntries(s: Store): ComplianceEntry[] {
  const groups = new Map<string, PlannedShift[]>();
  for (const sh of s.data.shifts) {
    if (!sh.inspectorId) continue;
    const key = `${sh.inspectorId}|${sh.dateISO}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(sh);
  }
  const out: ComplianceEntry[] = [];
  for (const [key, shifts] of groups) {
    const [inspectorId, dateISO] = key.split('|');
    const seed = `${inspectorId}${dateISO}`;
    shifts.sort((a, b) => toMin(a.start) - toMin(b.start));
    // planned sectors = unique across the day's shifts (fallback: derive 3–4).
    let planned = Array.from(new Set(shifts.map((x) => x.sector)));
    if (planned.length < 2) {
      const n = 3 + hInt(`${seed}n`, 2); // 3–4
      const start = hInt(`${seed}s`, SECTORS.length);
      planned = Array.from(new Set(Array.from({ length: n }, (_, i) => SECTORS[(start + i) % SECTORS.length])));
    }
    // visited: USUALLY all; RARELY (~1 in 6) one sector missed.
    const missOne = planned.length > 1 && hInt(`${seed}miss`, 6) === 0;
    const visited = missOne ? planned.filter((_, i) => i !== hInt(`${seed}mi`, planned.length)) : [...planned];

    const scheduledMin = shifts.reduce((a, x) => a + Math.max(0, toMin(x.end) - toMin(x.start)), 0);
    const areaCoveragePct = 55 + hInt(`${seed}area`, 31); // 55–85
    const compliancePct = missOne ? 62 + hInt(`${seed}cmp`, 18) : 82 + hInt(`${seed}cmp`, 15); // dip when a sector missed
    const timeInSectorsMin = Math.round(scheduledMin * (0.6 + h01(`${seed}tis`) * 0.35));
    const idleMin = 20 + hInt(`${seed}idle`, 70);
    const incidentsReported = hInt(`${seed}inc`, 4); // 0–3

    out.push({
      id: `cmp-${inspectorId}-${dateISO}`,
      inspectorId, dateISO, lotId: shifts[0].lotId,
      sectorsPlanned: planned, sectorsVisited: visited,
      compliancePct, incidentsReported, timeInSectorsMin, scheduledMin,
      areaCoveragePct, idleMin,
      timings: shifts.map((x) => `${fmtCompact(x.start)} – ${fmtCompact(x.end)}`),
    });
  }
  // newest date first, then by inspector
  return out.sort((a, b) => (a.dateISO < b.dateISO ? 1 : a.dateISO > b.dateISO ? -1 : inspectorName(a.inspectorId).localeCompare(inspectorName(b.inspectorId))));
}

/* Criticality pill — CRITICAL (red) / MINOR (amber). Genuine status only. */
function CriticalityPill({ critical }: { critical: boolean }) {
  const color = critical ? 'var(--status-error)' : 'var(--status-warning)';
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
      {critical ? 'Critical' : 'Minor'}
    </span>
  );
}

/* Status pill — VISITED (green) / NOT VISITED (red). */
function VisitPill({ visited }: { visited: boolean }) {
  const color = visited ? 'var(--status-success)' : 'var(--status-error)';
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
      <span className="inline-block size-1.5 rounded-full" style={{ background: color }} />{visited ? 'Visited' : 'Not Visited'}
    </span>
  );
}

/* A synthesized reported-incident row for a sector (deterministic by seed).
 *  Backed by a real store incident id (round-robin over `myIncidents`) so the
 *  detail flow can resolve the row on click; empty list → non-clickable. */
interface CmpIncidentRow { id: string; title: string; kpiCategory: string; reportedOn: string; critical: boolean; realIncidentId?: string; }
function sectorIncidents(seed: string, count: number, myIncidents: Incident[] = []): CmpIncidentRow[] {
  return Array.from({ length: count }, (_, i) => {
    const k = `${seed}${i}`;
    const day = 1 + hInt(`${k}d`, 27);
    const hh = 6 + hInt(`${k}h`, 12);
    const real = myIncidents.length ? myIncidents[hInt(`${k}ri`, myIncidents.length)] : undefined;
    return {
      id: `AN-${10000 + hInt(`${k}id`, 89999)}`,
      title: real?.title ?? INCIDENT_TITLES[hInt(`${k}t`, INCIDENT_TITLES.length)],
      kpiCategory: real?.category ?? KPI_CATEGORIES[hInt(`${k}c`, KPI_CATEGORIES.length)],
      reportedOn: `${String(day).padStart(2, '0')} ${MON_SHORT[hInt(`${k}m`, 12)]}, 2026 ${fmt12(`${String(hh).padStart(2, '0')}:${String(hInt(`${k}mi`, 6) * 10).padStart(2, '0')}`)}`,
      critical: real ? real.severity === 'critical' || real.zeroTolerance : hInt(`${k}cr`, 3) === 0,
      realIncidentId: real?.id,
    };
  });
}

/* ── 7b. list / table view (tab body) ───────────────────────────────────── */
function ComplianceMonitoringView({ s }: { s: Store }) {
  const entries = React.useMemo(() => complianceEntries(s), [s.data.shifts]);
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState<ComplianceEntry | null>(null);

  const q = query.trim().toLowerCase();
  const rows = entries.filter((e) => !q ||
    `${inspectorName(e.inspectorId)} ${dateLong(parseISO(e.dateISO))} ${lotLabel(e.lotId)} ${lotSub(e.lotId)}`.toLowerCase().includes(q));

  // Sectors-Visited cell — "3 / 4" ratio pill; hover lists each planned sector
  // ✓ visited / ✗ not. Full coverage is the norm; a miss is the rare case.
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
    { id: 'inspector', header: 'Inspector', sortable: true, accessor: (e) => inspectorName(e.inspectorId),
      cell: (e) => { const insp = INSPECTORS.find((x) => x.id === e.inspectorId); return (
        <span className="flex items-center gap-2"><AvatarChip name={insp?.name ?? '—'} color={insp?.avatarColor ?? 'var(--primary)'} size={26} /><span className="truncate font-medium text-foreground">{insp?.name}</span></span>
      ); } },
    { id: 'lot', header: 'Lot', width: '150px', accessor: (e) => `${lotLabel(e.lotId)} · ${lotSub(e.lotId)}` },
    { id: 'sectors', header: 'Sectors Visited', width: '130px', cell: (e) => <SectorsCell e={e} /> },
    { id: 'compliance', header: 'Compliance', width: '120px', align: 'right',
      cell: (e) => <div className="inline-flex justify-end"><MiniDonutCell value={e.compliancePct} size={36} /></div> },
    { id: 'incidents', header: 'Incidents', width: '100px', align: 'right', accessor: (e) => e.incidentsReported, sortable: true },
    { id: 'time', header: 'Time in Sectors', width: '150px', accessor: (e) => `${hm(e.timeInSectorsMin)} / ${hm(e.scheduledMin)}` },
    { id: 'area', header: 'Area Coverage', width: '120px', align: 'right', accessor: (e) => `${e.areaCoveragePct}%`, sortable: true },
  ];

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-[320px] max-w-full">
          <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
      {open && <ComplianceDetailSheet s={s} entry={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ── 7c. detail side-sheet ──────────────────────────────────────────────── */

/** Small KPI card matching the sheet's top grid (label over value, tinted icon). */
function MiniKpi({ icon, label, value, iconColor = 'var(--primary)' }: { icon: React.ReactNode; label: string; value: React.ReactNode; iconColor?: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${iconColor} 14%, transparent)`, color: iconColor }}>{icon}</span>
      <div className="flex min-w-0 flex-col">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="truncate text-body-sm font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}

type PlanLogTab = 'all' | 'incidents' | 'critical';
/** Nested activity CARD, grouped by incident id (§8a). */
interface ActivityGroup { id: string; activities: { time: string; label: string }[]; }
interface PlanLogEvent {
  id: string; time: string; kind: 'start' | 'incident' | 'idle' | 'missed'; title: string;
  location?: string; eta?: string; incidentId?: string; linkCount?: number; critical?: boolean;
  /** rich incident info (from the real backing incident). */
  incidentTitle?: string; severity?: 'low' | 'medium' | 'high' | 'critical'; category?: string;
  /** minutes-of-day for sort + play sync. */
  atMin: number;
  /** real store incident id (when the inspector has incidents) → opens detail. */
  realIncidentId?: string;
  activityGroups?: ActivityGroup[];
}
function addMinLocal(hhmm: string, min: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const t = h * 60 + m + min;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** Build the deterministic Plan Log events for an entry (shared by PlanLog +
 *  the map replay so pins pop in on the same timeline). Incident events are
 *  backed by a real store incident id (round-robin over `myIncidents`) so the
 *  detail flow can resolve them; empty list → non-clickable. */
function buildPlanLogEvents(entry: ComplianceEntry, myIncidents: Incident[] = []): PlanLogEvent[] {
  const seed = `${entry.inspectorId}${entry.dateISO}`;
  const first = entry.timings[0] ?? '9am – 11am';
  const startTime = first.split(' – ')[0];
  const startMin = compactToMin(startTime);
  const evs: PlanLogEvent[] = [
    { id: 'start', time: fmt12(minToHHMM(startMin)), kind: 'start', title: 'Started Shift', atMin: startMin,
      location: `${lotLabel(entry.lotId)} · ${lotSub(entry.lotId)}`, eta: `${dateLong(parseISO(entry.dateISO))} ${fmt12(minToHHMM(startMin))}` },
  ];
  for (let i = 0; i < entry.incidentsReported; i++) {
    const k = `${seed}ev${i}`;
    const hh = 8 + hInt(`${k}h`, 9);
    const mm = hInt(`${k}m`, 6) * 10;
    const critical = hInt(`${k}cr`, 3) === 0;
    const real = myIncidents.length ? myIncidents[i % myIncidents.length] : undefined;
    evs.push({
      id: `inc-${i}`, time: fmt12(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`), atMin: hh * 60 + mm,
      kind: 'incident', title: 'Incident Reported', critical: real ? (real.severity === 'critical') : critical,
      incidentId: real ? real.id.replace('INC-2026-', 'IN-') : `IN-${10000 + hInt(`${k}id`, 89999)}`,
      realIncidentId: real?.id,
      incidentTitle: real?.title,
      severity: real?.severity,
      category: real?.category,
      linkCount: 1 + hInt(`${k}ln`, 3),
      location: `${entry.sectorsPlanned[i % entry.sectorsPlanned.length]} · ${lotSub(entry.lotId)}`,
    });
  }
  const idleStartH = 11 + hInt(`${seed}is`, 3);
  const idleStartMin = idleStartH * 60 + hInt(`${seed}im`, 6) * 10;
  const idleStart = minToHHMM(idleStartMin);
  const idleEnd = addMinLocal(idleStart, entry.idleMin);
  // nested activity cards grouped by incident id
  const groupCount = 1 + hInt(`${seed}ng`, 2);
  const activityGroups: ActivityGroup[] = Array.from({ length: groupCount }, (_, g) => ({
    id: `IN-${20000 + hInt(`${seed}g${g}`, 79999)}`,
    activities: Array.from({ length: 1 + hInt(`${seed}na${g}`, 3) }, (_, i) => ({
      time: fmt12(addMinLocal(idleStart, g * 11 + i * 6 + 2)),
      label: hInt(`${seed}al${g}${i}`, 2) === 0 ? 'Comments Added' : 'Status Changed',
    })),
  }));
  evs.push({
    id: 'idle', time: fmt12(idleStart), atMin: idleStartMin, kind: 'idle',
    title: `Idling ${fmt12(idleStart)} – ${fmt12(idleEnd)} (${hm(entry.idleMin)})`,
    location: `${lotLabel(entry.lotId)} · ${lotSub(entry.lotId)}`,
    activityGroups,
  });
  // Missed sectors — planned but the inspector never entered them → RED "Sector
  // Not Visited" entries in the log (rare; only when sectorsVisited < planned).
  entry.sectorsPlanned.filter((sec) => !entry.sectorsVisited.includes(sec)).forEach((sec, i) => {
    const atMin = compactToMin((entry.timings[entry.timings.length - 1] ?? '5pm – 7pm').split(' – ').pop() ?? '5pm') || (18 * 60);
    evs.push({
      id: `missed-${sec}`, time: fmt12(minToHHMM(atMin + i)), atMin: atMin + i, kind: 'missed',
      title: 'Sector Not Visited',
      location: `${sec} · ${lotSub(entry.lotId)}`,
    });
  });
  return evs.sort((a, b) => a.atMin - b.atMin);
}

/** LEFT "Plan Log" (§8a) — header + panel-toggle, 3 tabs, search + filter,
 *  and a vertical timeline built from LEFT time-pills with the rail through them. */
function PlanLog({ entry, myIncidents, onOpenIncident }: { entry: ComplianceEntry; myIncidents: Incident[]; onOpenIncident: (id: string) => void }) {
  const [tab, setTab] = React.useState<PlanLogTab>('all');
  const [query, setQuery] = React.useState('');
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const events = React.useMemo(() => buildPlanLogEvents(entry, myIncidents), [entry, myIncidents]);
  const q = query.trim().toLowerCase();
  const filtered = events.filter((e) => {
    if (tab === 'incidents' && e.kind !== 'incident') return false;
    if (tab === 'critical' && !((e.kind === 'incident' && e.critical) || e.kind === 'missed')) return false;
    return !q || `${e.title} ${e.location ?? ''} ${e.incidentId ?? ''}`.toLowerCase().includes(q);
  });

  const toggle = (id: string) => setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const TabBtn = ({ id, label }: { id: PlanLogTab; label: string }) => (
    <button type="button" onClick={() => setTab(id)} className={`relative whitespace-nowrap px-1 py-2 text-body-xs font-semibold transition-colors ${tab === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
      {label}{tab === id && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
    </button>
  );

  return (
    <div className="flex h-full flex-col rounded-lg border border-border">
      {/* header — title + panel-toggle */}
      <div className="flex items-center justify-between border-b border-border px-3 pt-2">
        <div className="flex items-center gap-4">
          <p className="text-body-sm font-semibold text-foreground">Plan Log</p>
        </div>
        <button type="button" aria-label="Toggle panel" className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.LayoutRight size={15} /></button>
      </div>
      <div className="flex items-center gap-4 border-b border-border px-3">
        <TabBtn id="all" label="All" />
        <TabBtn id="incidents" label="Reported Incidents" />
        <TabBtn id="critical" label="Critical Events" />
      </div>
      {/* search + filter */}
      <div className="flex items-center gap-2 p-2">
        <div className="relative flex-1">
          <Icons.SearchSm size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Event" className="h-8 pl-8 text-body-xs" />
        </div>
        <button type="button" aria-label="Filter events" className="grid size-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.FilterLines size={14} /></button>
      </div>
      {/* timeline — LEFT time-pills with the connector rail through them */}
      <div className="relative min-h-0 flex-1 overflow-auto px-3 pb-3">
        {/* rail runs through the centre of the pill column (~34px wide pills). */}
        <div className="pointer-events-none absolute bottom-3 left-[38px] top-2 w-px bg-border" />
        <div className="flex flex-col gap-2.5 pt-1">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-body-xs text-muted-foreground">No events.</p>
          ) : filtered.map((e) => {
            const iconColor = e.kind === 'incident' ? (e.critical ? 'var(--status-error)' : 'var(--status-warning)') : e.kind === 'missed' ? 'var(--status-error)' : e.kind === 'start' ? 'var(--status-success)' : 'var(--muted-foreground)';
            const Icon = e.kind === 'incident' ? Icons.AlertTriangle : e.kind === 'missed' ? Icons.XCircle : e.kind === 'start' ? Icons.PlayCircle : Icons.Clock;
            const isOpen = expanded.has(e.id);
            const [hhmm, ap] = e.time.split(' ');
            const clickable = e.kind === 'incident' && !!e.realIncidentId;
            return (
              <div
                key={e.id}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => onOpenIncident(e.realIncidentId!) : undefined}
                onKeyDown={clickable ? (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onOpenIncident(e.realIncidentId!); } } : undefined}
                className={`relative flex gap-2.5 rounded-md ${clickable ? 'cursor-pointer transition-colors hover:bg-muted/50' : ''}`}
              >
                {/* LEFT time pill */}
                <span className="relative z-[1] mt-0.5 flex w-[52px] shrink-0 flex-col items-center rounded-md border border-border bg-card px-1 py-1 text-center leading-tight ring-2 ring-card">
                  <span className="text-[11px] font-bold tabular-nums text-foreground">{hhmm}</span>
                  <span className="text-[9px] font-semibold text-muted-foreground">{ap}</span>
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <Icon size={14} style={{ color: iconColor }} className="shrink-0" />
                    <span className={`truncate text-body-xs font-semibold ${e.kind === 'missed' ? 'text-[var(--status-error)]' : 'text-foreground'}`}>{e.title}</span>
                    {e.kind === 'idle' && e.activityGroups && (
                      <button type="button" onClick={() => toggle(e.id)} aria-label="Expand activities" className="ml-auto shrink-0 text-muted-foreground hover:text-foreground">
                        {isOpen ? <Icons.ChevronUp size={14} /> : <Icons.ChevronDown size={14} />}
                      </button>
                    )}
                  </div>
                  {e.kind === 'start' && e.eta && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Icons.Clock size={11} className="shrink-0" />PLANNED ETA: {e.eta}</span>
                  )}
                  {e.kind === 'incident' && (
                    <div className="flex flex-col gap-1">
                      {e.incidentTitle && <span className="truncate text-[11px] font-medium text-foreground">{e.incidentTitle}</span>}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground"># {e.incidentId}</span>
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 font-semibold" style={{ color: iconColor }}><Icons.Link01 size={10} />{e.linkCount}</span>
                        {e.severity && (
                          <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: `color-mix(in srgb, ${SEVERITY[e.severity].color} 14%, transparent)`, color: SEVERITY[e.severity].color }}>
                            <span className="inline-block size-1.5 rounded-full" style={{ background: SEVERITY[e.severity].color }} />{SEVERITY[e.severity].label}
                          </span>
                        )}
                        {e.category && <span className="inline-flex items-center gap-1"><Icons.Tag01 size={10} className="shrink-0" />{e.category}</span>}
                      </div>
                    </div>
                  )}
                  {e.location && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Icons.MarkerPin01 size={11} className="shrink-0" /><span className="truncate">{e.location}</span></span>
                  )}
                  {/* expanded idling → nested activity CARDS grouped by incident id */}
                  {e.kind === 'idle' && isOpen && e.activityGroups && (
                    <div className="mt-1.5 flex flex-col gap-2">
                      {e.activityGroups.map((g) => (
                        <div key={g.id} className="rounded-lg border border-border bg-muted/20 p-2">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-foreground">#{g.id}</span>
                            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">{g.activities.length} {g.activities.length === 1 ? 'Activity' : 'Activities'}</span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            {g.activities.map((a, ai) => (
                              <div key={ai} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span className="tabular-nums">{a.time}</span><span className="text-border">+</span><span>{a.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── route synthesis + geometry helpers (deterministic) ─────────────────── */

/** Deterministic sector centre for sector index i, laid out on a 2-col grid
 *  around the lot centre (so the route reads like city blocks, not a ring). */
function sectorCenter(center: LatLng, i: number, n: number): LatLng {
  const cols = 2;
  const col = i % cols;
  const row = Math.floor(i / cols);
  const rows = Math.ceil(n / cols);
  const gx = 0.016;   // grid spacing (lng)
  const gy = 0.013;   // grid spacing (lat)
  const lat = center[0] + ((rows - 1) / 2 - row) * gy;
  const lng = center[1] + (col - (cols - 1) / 2) * gx;
  return [lat, lng];
}

/** Route through the visited sectors as a COHERENT grid / right-angle "street"
 *  path: START → weave sector 1 (a few 90° turns) → connector → sector 2 → …
 *  → END. Deterministic (seed) right-angle turns inside each sector bbox — NO
 *  random scatter. Returns the ordered corner points (pre-densify). */
function buildRoute(entry: ComplianceEntry, center: LatLng): LatLng[] {
  const seed = `${entry.inspectorId}${entry.dateISO}`;
  const n = entry.sectorsPlanned.length;
  const half = 0.0052;  // sector bbox half-size
  const pts: LatLng[] = [];
  // START just outside the first sector, to the lower-left.
  const first = sectorCenter(center, 0, n);
  pts.push([first[0] - half * 1.6, first[1] - half * 1.6]);
  entry.sectorsPlanned.forEach((_, si) => {
    const c = sectorCenter(center, si, n);
    // enter at a bbox corner, then trace 2–3 right-angle "street" legs across it.
    const startCornerX = si % 2 === 0 ? -1 : 1;
    let cur: LatLng = [c[0] - half, c[1] + startCornerX * half];
    pts.push(cur);
    const legs = 2 + hInt(`${seed}legs${si}`, 2); // 2–3 legs
    for (let k = 0; k < legs; k++) {
      // horizontal leg (change lng), then vertical leg (change lat) — 90° turns.
      const lngTarget = c[1] + (k % 2 === 0 ? -startCornerX : startCornerX) * half;
      cur = [cur[0], lngTarget];
      pts.push(cur);
      const latStep = half * (0.5 + (k / legs));
      const latTarget = Math.min(c[0] + half, cur[0] + latStep);
      cur = [latTarget, cur[1]];
      pts.push(cur);
    }
    // exit toward next sector centre line (connector; drawn as deviation later).
    pts.push([c[0] + half, c[1]]);
  });
  // END just outside the last sector, to the upper-right.
  const last = sectorCenter(center, Math.max(0, n - 1), n);
  pts.push([last[0] + half * 1.4, last[1] + half * 1.4]);
  return pts;
}

/** Densify a polyline so consecutive points are ≤ `step` apart (marker glides). */
function densify(route: LatLng[], step = 0.0006): LatLng[] {
  if (route.length < 2) return route;
  const out: LatLng[] = [route[0]];
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const segs = Math.max(1, Math.ceil(d / step));
    for (let k = 1; k <= segs; k++) {
      const f = k / segs;
      out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
    }
  }
  return out;
}
/** Evenly downsample a waypoint list to at most `max` points (keeps ends).
 *  OSRM allows many coords but ≤25 keeps the public demo server happy. */
function capWaypoints(pts: LatLng[], max = 24): LatLng[] {
  if (pts.length <= max) return pts;
  const out: LatLng[] = [pts[0]];
  const inner = max - 2;
  const step = (pts.length - 1) / (inner + 1);
  for (let i = 1; i <= inner; i++) out.push(pts[Math.round(i * step)]);
  out.push(pts[pts.length - 1]);
  return out;
}

/** Snap a waypoint path to real roads via OSRM (public demo server, no key).
 *  Returns the road geometry as [lat,lng][], or null on any failure. */
async function osrmSnap(waypoints: LatLng[], signal?: AbortSignal): Promise<LatLng[] | null> {
  if (waypoints.length < 2) return null;
  const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, { signal });
    const json = await res.json();
    const geo = json?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(geo) || geo.length < 2) return null;
    return geo.map((c: [number, number]) => [c[1], c[0]] as LatLng);
  } catch {
    return null;
  }
}

/** Point along a polyline at fraction t∈[0,1] (segment-lerp). */
function pointAt(route: LatLng[], t: number): LatLng {
  if (route.length < 2) return route[0] ?? [0, 0];
  const total = route.length - 1;
  const f = Math.max(0, Math.min(total, t * total));
  const i = Math.min(Math.floor(f), total - 1);
  const frac = f - i;
  const a = route[i], b = route[i + 1];
  return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac];
}
/** Route sliced up to fraction t (for progressive draw). */
function sliceRoute(route: LatLng[], t: number): LatLng[] {
  if (route.length < 2) return route;
  const total = route.length - 1;
  const f = Math.max(0, Math.min(total, t * total));
  const i = Math.floor(f);
  const head = route.slice(0, i + 1);
  head.push(pointAt(route, t));
  return head;
}

const SHIFT_DAY_START = 7 * 60;   // 7 AM
const SHIFT_DAY_END = 20 * 60;    // 8 PM
const HOUR_TICKS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]; // 7 AM … 8 PM
const hourTickLabel = (h: number) => `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`;
const SPEEDS = [1, 2, 5] as const;

/* ── Leaflet divIcon builders (custom map markers) ──────────────────────── */
/** White glyph SVG markup per event kind — mirrors the Plan Log left icons
 *  (Started Shift → play, Incident → alert-triangle, Idling → clock, Event →
 *  download). Stroke+fill white so it reads inside the colored disc. */
const EVENT_GLYPH_SVG: Record<'start' | 'incident' | 'idle' | 'event', string> = {
  // play (filled)
  start: `<svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>`,
  // alert-triangle (line)
  incident: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  // clock (line)
  idle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  // download-cloud / arrow-down (line)
  event: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg>`,
};
/** Circular event marker — a ~26px colored disc with a WHITE event glyph
 *  centered (matching the Plan Log icons), a white ring + soft shadow. */
function eventGlyphIcon(bg: string, kind: 'start' | 'incident' | 'idle' | 'event') {
  return L.divIcon({
    className: 'iims-evt', iconSize: [26, 26], iconAnchor: [13, 13],
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${bg};border:2px solid #fff;box-shadow:0 1px 4px rgba(16,24,40,.3);display:flex;align-items:center;justify-content:center">${EVENT_GLYPH_SVG[kind]}</div>`,
  });
}
/** START (green) / END (red) flag — the provided SVG asset. 52×52 with a
 *  vertical pole; anchored at the pole base (~[19,48]) so it stands on the point.
 *  A white rounded label card floats above the flag. */
function flagIcon(kind: 'start' | 'end', label: string) {
  const url = kind === 'start' ? flagStartUrl : flagEndUrl;
  return L.divIcon({
    className: 'iims-flag', iconSize: [52, 52], iconAnchor: [19, 48],
    html: `<div style="position:relative;width:52px;height:52px">
      <img src="${url}" width="52" height="52" alt="${kind}" style="display:block" />
      <div style="position:absolute;bottom:52px;left:19px;transform:translateX(-50%);white-space:nowrap;background:#fff;border:1px solid #eaecf0;border-radius:6px;padding:3px 7px;font:600 10px/1.2 Gilroy,sans-serif;color:#1d2939;box-shadow:0 2px 6px rgba(16,24,40,.18)">${label}</div>
    </div>`,
  });
}
/** GPS arrow (small black ▸ rotated to the travel bearing). */
function arrowIcon(bearingDeg: number) {
  return L.divIcon({
    className: 'iims-arrow', iconSize: [12, 12], iconAnchor: [6, 6],
    html: `<div style="width:12px;height:12px;color:#1d2939;transform:rotate(${bearingDeg}deg);display:flex;align-items:center;justify-content:center"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M4 12h13l-5-5 1.4-1.4L21.8 12l-8.4 8.4L12 19l5-5H4z"/></svg></div>`,
  });
}
/** The moving replay marker — the person pin SVG asset (40×67, tip anchored). */
function inspectorIcon() {
  return L.divIcon({
    className: 'iims-inspector', iconSize: [40, 67], iconAnchor: [20, 65],
    html: `<img src="${inspectorMarkerUrl}" width="40" height="67" alt="Inspector" style="display:block;filter:drop-shadow(0 2px 4px rgba(16,24,40,.3))" />`,
  });
}
/** Screen bearing (deg, 0=east, clockwise-down) for an arrow between two pts.
 *  Leaflet y grows downward, so use (lat-b - lat-a) inverted for on-screen. */
function screenBearing(a: LatLng, b: LatLng): number {
  return (Math.atan2(-(b[0] - a[0]), b[1] - a[1]) * 180) / Math.PI;
}

/** RIGHT map (§9) — a CUSTOM Leaflet map (not the DS wrapper) for full control:
 *  purple grid route + red-dashed deviation + GPS arrows + green/red sector
 *  polygons + custom incident/event/START/END pins + a person replay marker that
 *  glides along the densified polyline. Bottom-left REPLAY player (collapsed ▶ →
 *  expanded bar). Playback is CONTROLLED from React state (t∈[0,1]).
 *  Purple route / red deviation+incidents / green events / black arrows = status;
 *  FAMS-blue chrome (collapsed ▶, speed-active, legend checks, toggles). */
function RouteMap({ entry, myIncidents = [], onOpenIncident }: { entry: ComplianceEntry; myIncidents?: Incident[]; onOpenIncident?: (id: string) => void }) {
  const [layers, setLayers] = React.useState<Set<string>>(() => new Set(['route', 'deviation', 'incidents', 'events']));
  const [expanded, setExpanded] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const [t, setT] = React.useState(0);       // playback fraction 0..1
  const [speed, setSpeed] = React.useState<(typeof SPEEDS)[number]>(1);
  const [dragging, setDragging] = React.useState(false);

  const zone = ZONES.find((z) => z.id === entry.lotId);
  const center: LatLng = zone?.center ? [zone.center.lat, zone.center.lng] : DOHA_CENTER;
  const seed = `${entry.inspectorId}${entry.dateISO}`;
  const events = React.useMemo(() => buildPlanLogEvents(entry, myIncidents), [entry, myIncidents]);

  // Raw coherent grid waypoints (the OSRM query + straight-line fallback path).
  const waypoints = React.useMemo(() => buildRoute(entry, center), [entry, center[0], center[1]]);
  const fallbackPath = React.useMemo(() => densify(waypoints), [waypoints]);

  // Road-snapped geometry (OSRM). Null until it resolves; falls back to straight.
  const [snapped, setSnapped] = React.useState<LatLng[] | null>(null);
  React.useEffect(() => {
    const ac = new AbortController();
    setSnapped(null);
    (async () => {
      const geo = await osrmSnap(capWaypoints(waypoints, 24), ac.signal);
      if (!ac.signal.aborted && geo) setSnapped(geo.length > 400 ? geo : densify(geo));
    })();
    return () => ac.abort();
  }, [waypoints]);

  // Effective path: snapped roads when available, else the straight fallback.
  // The drawn polyline, marker glide, deviation + arrows all derive from this.
  const route = React.useMemo(() => snapped ?? fallbackPath, [snapped, fallbackPath]);
  // Deviation = one short sub-segment near the last connector (the "M9" bit).
  const deviation = React.useMemo(() => {
    const a = Math.floor(route.length * 0.62), b = Math.floor(route.length * 0.72);
    return route.slice(a, Math.max(a + 2, b));
  }, [route]);

  // Total time (from scheduled span) + total distance (deterministic ~30–50 km).
  const totalMin = entry.scheduledMin || 7 * 60 + 30;
  const totalTimeLabel = `${Math.floor(totalMin / 60)}h ${totalMin % 60} min`;
  const totalKm = 30 + hInt(`${seed}dist`, 21); // 30–50 km

  // Event fraction along the route (by event time within the shift day).
  const eventFrac = React.useCallback((atMin: number) =>
    Math.max(0, Math.min(1, (atMin - SHIFT_DAY_START) / (SHIFT_DAY_END - SHIFT_DAY_START))), []);
  const eventPins = React.useMemo(() => events.map((e) => ({ e, frac: eventFrac(e.atMin), position: pointAt(route, eventFrac(e.atMin)) })), [events, route, eventFrac]);

  // Map-only "Events" waypoints (green download / pink hex / amber M9 diamond) —
  // small colored markers along the route, distinct from incident pins (§9).
  const eventWaypoints = React.useMemo(() => {
    const kinds: ('download' | 'hex' | 'm9')[] = ['download', 'hex', 'm9'];
    const count = 2 + hInt(`${seed}nw`, 2); // 2–3
    return Array.from({ length: count }, (_, i) => {
      const frac = 0.18 + (i / count) * 0.6 + h01(`${seed}wf${i}`) * 0.08;
      return { id: `wp-${i}`, frac, position: pointAt(route, Math.min(0.98, frac)), variant: kinds[hInt(`${seed}wk${i}`, kinds.length)] };
    });
  }, [seed, route]);

  // Sector polygons (deterministic bbox around each grid centre).
  const sectorPolys = React.useMemo(() => entry.sectorsPlanned.map((sec, i) => {
    const c = sectorCenter(center, i, entry.sectorsPlanned.length);
    const r = 0.0052;
    const poly: LatLng[] = [[c[0] - r, c[1] - r], [c[0] - r, c[1] + r], [c[0] + r, c[1] + r], [c[0] + r, c[1] - r]];
    return { sec, poly, visited: entry.sectorsVisited.includes(sec) };
  }), [entry, center[0], center[1]]);

  const active = expanded;         // player open → show playback state on the map
  const markerPos = pointAt(route, t);

  /* ── the custom Leaflet map instance ───────────────────────────────────── */
  const elRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const staticLayer = React.useRef<L.LayerGroup | null>(null);   // zones + flags + events + incidents + arrows
  const routeLine = React.useRef<L.Polyline | null>(null);       // the (progressive) purple route
  const devLine = React.useRef<L.Polyline | null>(null);
  const arrowLayer = React.useRef<L.LayerGroup | null>(null);
  const inspectorMk = React.useRef<L.Marker | null>(null);
  const eventLayer = React.useRef<L.LayerGroup | null>(null);

  // init map once
  React.useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const m = L.map(elRef.current, { zoomControl: false, attributionControl: true });
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    // Key-free OSM standard raster — Carto's basemaps now require an API key
    // and return an "API KEY REQUIRED" watermark tile (2026-09-01 fix).
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: 'abc', maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    staticLayer.current = L.layerGroup().addTo(m);
    arrowLayer.current = L.layerGroup().addTo(m);
    eventLayer.current = L.layerGroup().addTo(m);
    mapRef.current = m;
    // fit to sectors + route
    const all: LatLng[] = [...route, ...sectorPolys.flatMap((s) => s.poly)];
    if (all.length >= 2) m.fitBounds(L.latLngBounds(all as [number, number][]), { padding: [36, 36] });
    else m.setView(center, 14);
    return () => { m.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refit when the entry (route/sectors) changes
  React.useEffect(() => {
    const m = mapRef.current; if (!m) return;
    const all: LatLng[] = [...route, ...sectorPolys.flatMap((s) => s.poly)];
    if (all.length >= 2) m.fitBounds(L.latLngBounds(all as [number, number][]), { padding: [36, 36] });
  }, [route, sectorPolys]);

  // STATIC layer — sector zones + START/END flags (rebuilt on entry/layers change)
  React.useEffect(() => {
    const g = staticLayer.current; if (!g) return;
    g.clearLayers();
    // sector polygons
    for (const { sec, poly, visited } of sectorPolys) {
      L.polygon(poly as [number, number][], visited
        ? { color: 'var(--status-success)', weight: 2, fillColor: 'var(--status-success)', fillOpacity: 0.12 }
        : { color: 'var(--status-error)', weight: 2, dashArray: '6 6', fillColor: 'var(--status-error)', fillOpacity: 0.08 },
      ).addTo(g).bindTooltip(`${sec} · ${visited ? 'Visited' : 'Not visited'}`, { direction: 'center' });
    }
    // START / END flags — sit on the (snapped) route endpoints
    const startTime = events[0] ? events[0].time : '';
    const endMin = SHIFT_DAY_START + Math.round((SHIFT_DAY_END - SHIFT_DAY_START) * 0.96);
    L.marker(route[0] as [number, number], { icon: flagIcon('start', `(START) ${lotSub(entry.lotId)} · ${startTime}`), zIndexOffset: 300 }).addTo(g);
    L.marker(route[route.length - 1] as [number, number], { icon: flagIcon('end', `(END) ${lotSub(entry.lotId)} · ${fmt12(minToHHMM(endMin))}`), zIndexOffset: 300 }).addTo(g);
  }, [sectorPolys, events, route, entry.lotId]);

  // ROUTE polyline + deviation — progressive when playing, full when static.
  React.useEffect(() => {
    const m = mapRef.current; if (!m) return;
    routeLine.current?.remove(); routeLine.current = null;
    devLine.current?.remove(); devLine.current = null;
    if (layers.has('route')) {
      const pts = (active ? sliceRoute(route, t) : route) as [number, number][];
      routeLine.current = L.polyline(pts, { color: 'var(--chart-accent-purple)', weight: 4, lineJoin: 'round', lineCap: 'round' }).addTo(m);
    }
    if (layers.has('deviation') && deviation.length >= 2) {
      // only show the deviation once playback has passed it (or when static)
      const devFrac = 0.72;
      if (!active || t >= devFrac - 0.02) {
        devLine.current = L.polyline(deviation as [number, number][], { color: 'var(--status-error)', weight: 3.5, dashArray: '7 6', lineCap: 'round' }).addTo(m);
      }
    }
  }, [layers, active, t, route, deviation]);

  // GPS arrows — small black arrows along the route (toggle via legend).
  React.useEffect(() => {
    const g = arrowLayer.current; if (!g) return;
    g.clearLayers();
    if (!layers.has('gps')) return;
    const shown = active ? sliceRoute(route, t) : route;
    for (let i = 6; i < shown.length - 1; i += 12) {
      const b = screenBearing(shown[i], shown[i + 1]);
      L.marker(shown[i] as [number, number], { icon: arrowIcon(b), interactive: false, zIndexOffset: 120 }).addTo(g);
    }
  }, [layers, active, t, route]);

  // EVENT + INCIDENT markers — static = all; playing = only those reached (frac ≤ t).
  React.useEffect(() => {
    const g = eventLayer.current; if (!g) return;
    g.clearLayers();
    // incident markers (one per reported incident) — circular disc + white line
    // alert-triangle glyph (matches the Plan Log icon); click → open detail
    if (layers.has('incidents')) {
      for (const { e, frac, position } of eventPins) {
        if (e.kind !== 'incident') continue;
        if (active && frac > t + 0.001) continue;
        const color = e.critical ? 'var(--status-error)' : 'var(--status-warning)';
        const mk = L.marker(position as [number, number], { icon: eventGlyphIcon(color, 'incident'), zIndexOffset: 260 })
          .addTo(g).bindTooltip(`${e.title} · #${e.incidentId}`, { direction: 'top' });
        if (e.realIncidentId && onOpenIncident) mk.on('click', () => onOpenIncident(e.realIncidentId!));
      }
    }
    // circular EVENT markers with a WHITE glyph matching the Plan Log icons:
    // Started Shift (green play), Idling (amber clock), + generic Event waypoints
    // (green download glyph). Incident glyph markers are covered by the "!" pins.
    if (layers.has('events')) {
      for (const { e, frac, position } of eventPins) {
        if (e.kind === 'incident' || e.kind === 'missed') continue; // incident → red "!" pin; missed sectors are plan-log only
        if (active && frac > t + 0.001) continue;
        // color matches the Plan Log list icon color for this kind
        const color = e.kind === 'start' ? 'var(--status-success)' : 'var(--muted-foreground)';
        L.marker(position as [number, number], { icon: eventGlyphIcon(color, e.kind), zIndexOffset: 200 }).addTo(g).bindTooltip(e.title, { direction: 'top' });
      }
      for (const w of eventWaypoints) {
        if (active && w.frac > t + 0.001) continue;
        const tip = w.variant === 'download' ? 'Data sync event' : w.variant === 'hex' ? 'Checkpoint event' : 'Waypoint event';
        L.marker(w.position as [number, number], { icon: eventGlyphIcon('var(--status-success)', 'event'), zIndexOffset: 200 }).addTo(g).bindTooltip(tip, { direction: 'top' });
      }
    }
  }, [eventPins, eventWaypoints, layers, active, t, onOpenIncident]);

  // MOVING inspector marker (person pin) — only while the player is open.
  React.useEffect(() => {
    const m = mapRef.current; if (!m) return;
    if (!active) { inspectorMk.current?.remove(); inspectorMk.current = null; return; }
    if (!inspectorMk.current) {
      inspectorMk.current = L.marker(markerPos as [number, number], { icon: inspectorIcon(), zIndexOffset: 500, interactive: false }).addTo(m);
    } else {
      inspectorMk.current.setLatLng(markerPos as [number, number]);
    }
  }, [active, markerPos[0], markerPos[1]]);

  // rAF playback loop — advance t at (0.045 × speed) per second.
  React.useEffect(() => {
    if (!playing) return;
    let raf = 0; let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      setT((prev) => {
        const next = prev + dt * 0.045 * speed;
        if (next >= 1) { setPlaying(false); return 1; }
        return next;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  const legend = [
    { id: 'route', label: 'Actual Route', color: 'var(--chart-accent-purple)' },
    { id: 'deviation', label: 'Route Deviation', color: 'var(--status-error)' },
    { id: 'incidents', label: 'Reported Incidents', color: 'var(--status-error)' },
    { id: 'events', label: 'Events', color: 'var(--status-success)' },
    { id: 'gps', label: 'GPS Arrows', color: '#1d2939' },
  ];
  const toggleLayer = (id: string) => setLayers((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openPlayer = () => { setExpanded(true); setT(0); setPlaying(true); };
  const collapse = () => { setExpanded(false); setPlaying(false); setT(0); };
  const togglePlay = () => { if (t >= 1) setT(0); setPlaying((p) => !p); };

  // scrubber drag → seek
  const trackRef = React.useRef<HTMLDivElement>(null);
  const seekAt = (clientX: number) => {
    const el = trackRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setT(Math.max(0, Math.min(1, (clientX - r.left) / r.width)));
  };
  React.useEffect(() => {
    if (!dragging) return;
    const move = (ev: MouseEvent) => seekAt(ev.clientX);
    const up = () => setDragging(false);
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [dragging]);

  // A 40×40 white player button (rounded 4px · #D0D5DD border · design drop shadow).
  const PlayerBtn = ({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) => (
    <button
      type="button" aria-label={label} onClick={onClick}
      className="grid size-10 shrink-0 place-items-center rounded transition-transform hover:scale-[1.03]"
      style={{ background: '#fff', border: '1px solid #D0D5DD', boxShadow: '0 3.4px 9.5px rgba(0,0,0,0.1)' }}
    >{children}</button>
  );

  return (
    <div className="relative isolate h-full min-h-[360px] overflow-hidden rounded-lg border border-border">
      <div ref={elRef} className="h-full w-full" />

      {/* legend */}
      <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-1 rounded-lg border border-border bg-card/95 p-2.5 shadow-[var(--elevation-md)] backdrop-blur">
        <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Legend</span>
        {legend.map((it) => {
          const on = layers.has(it.id);
          return (
            <button key={it.id} type="button" onClick={() => toggleLayer(it.id)} className="flex items-center gap-2 text-left">
              <span className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>
                {on && <Icons.Check size={10} />}
              </span>
              <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: it.color, opacity: on ? 1 : 0.35 }} />
              <span className={`text-[11px] ${on ? 'text-foreground' : 'text-muted-foreground'}`}>{it.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── replay player (bottom-left) — pixel-matched to the design SVGs ── */}
      {!expanded ? (
        // Collapsed 92×72 (player-compacted.svg)
        <div
          className="absolute bottom-3 left-3 z-[1000] grid h-[72px] w-[92px] place-items-center rounded-[12px]"
          style={{ background: 'rgba(191,191,191,0.3)', border: '1px solid #fff', backdropFilter: 'blur(12px)' }}
        >
          <PlayerBtn label="Play route replay" onClick={openPlayer}>
            <svg width="15" height="17" viewBox="0 0 15 17" fill="none"><path d="M14.05 7.09 1.4.63A.9.9 0 0 0 0 1.38v13.47a.9.9 0 0 0 1.41.75l12.64-6.44a1.02 1.02 0 0 0 0-1.07Z" fill="#468F4C"/></svg>
          </PlayerBtn>
        </div>
      ) : (
        // Expanded 740×72 (player-expanded.svg)
        <div
          className="absolute bottom-3 left-3 right-3 z-[1000] flex h-[72px] items-stretch gap-3 rounded-lg pr-3"
          style={{ background: 'rgba(191,191,191,0.3)', border: '1px solid #fff', backdropFilter: 'blur(12px)' }}
        >
          {/* 1 · left white sub-card with Pause + Stop */}
          <div
            className="flex w-[125px] shrink-0 items-center justify-center gap-3 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid #fff', backdropFilter: 'blur(12px)' }}
          >
            <PlayerBtn label={playing ? 'Pause' : 'Resume'} onClick={togglePlay}>
              {playing ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#FFA826" strokeWidth="1.6"><circle cx="9" cy="9" r="8"/><rect x="6.6" y="5.6" width="1.7" height="6.8" rx="0.8" fill="#FFA826" stroke="none"/><rect x="9.7" y="5.6" width="1.7" height="6.8" rx="0.8" fill="#FFA826" stroke="none"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFA826"><path d="M8 5v14l11-7z"/></svg>
              )}
            </PlayerBtn>
            <PlayerBtn label="Stop" onClick={collapse}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#E01507" strokeWidth="1.6"><circle cx="9" cy="9" r="8"/><rect x="6.3" y="6.3" width="5.4" height="5.4" fill="#E01507" stroke="none"/></svg>
            </PlayerBtn>
          </div>

          {/* 2 · scrubber (speed pills top-right · track · ticks) */}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-2">
            <div className="flex items-center justify-end gap-1.5">
              {SPEEDS.map((sp) => {
                const on = speed === sp;
                return (
                  <button
                    key={sp} type="button" onClick={() => setSpeed(sp)}
                    className="grid h-4 min-w-4 place-items-center rounded-[2px] px-1 text-[10px] font-bold leading-none"
                    style={on ? { background: '#22C882', color: '#fff' } : { background: 'rgba(0,0,0,0.15)', color: '#1d2939' }}
                  >{sp}x</button>
                );
              })}
            </div>
            <div
              ref={trackRef}
              onMouseDown={(e) => { setDragging(true); seekAt(e.clientX); }}
              className="relative h-[2px] cursor-pointer"
              style={{ background: '#667085' }}
            >
              {/* filled (played) portion — green */}
              <span className="absolute inset-y-0 left-0" style={{ width: `${t * 100}%`, background: '#12B76A' }} />
              {/* black dot at start */}
              <span className="absolute left-0 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: '#000' }} />
              {/* green draggable playhead knob */}
              <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${t * 100}%`, background: '#12B76A' }} />
            </div>
            <div className="flex justify-between text-[10px] leading-none" style={{ color: '#667085' }}>
              {HOUR_TICKS.map((h) => <span key={h}>{hourTickLabel(h)}</span>)}
            </div>
          </div>

          {/* 3 · white divider + totals */}
          <div className="my-3 w-px shrink-0" style={{ background: '#fff' }} />
          <div className="flex shrink-0 flex-col justify-center pr-1">
            <span className="text-[20px] font-bold leading-tight tabular-nums" style={{ color: '#344054' }}>{totalTimeLabel}</span>
            <span className="text-[11px] leading-tight" style={{ color: '#98A2B3' }}>Total Time</span>
            <span className="mt-0.5 text-[11px] leading-tight" style={{ color: '#475467' }}>Total Distance: {totalKm} km</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── per-sector "Inspection Sector N" card ──────────────────────────────── */
function SectorInspectionCard({ entry, sector, myIncidents, onOpenIncident }: { entry: ComplianceEntry; sector: string; myIncidents: Incident[]; onOpenIncident: (id: string) => void }) {
  const visited = entry.sectorsVisited.includes(sector);
  const seed = `${entry.inspectorId}${entry.dateISO}${sector}`;
  const [query, setQuery] = React.useState('');

  const contractor = 'BEEAH';
  const gauge = visited ? 70 + hInt(`${seed}g`, 25) : 0;
  const winStart = fmt12(`0${4 + hInt(`${seed}ws`, 3)}:${String(hInt(`${seed}wm`, 6) * 10).padStart(2, '0')}`);
  const winEnd = fmt12(`${String(11 + hInt(`${seed}we`, 3)).padStart(2, '0')}:${String(hInt(`${seed}wem`, 6) * 10).padStart(2, '0')}`);
  const timeInMin = 240 + hInt(`${seed}ti`, 140);
  const windowMin = 360 + hInt(`${seed}wn`, 60);
  const incCount = hInt(`${seed}ic`, 4);
  const coveredKm = (0.6 + h01(`${seed}ck`) * 1.5);
  const totalKm = (coveredKm + 0.8 + h01(`${seed}tk`));
  const coveragePct = Math.round((coveredKm / totalKm) * 100);
  const incidents = React.useMemo(() => sectorIncidents(seed, incCount, myIncidents), [seed, incCount, myIncidents]);
  const q = query.trim().toLowerCase();
  const incRows = incidents.filter((r) => !q || `${r.title} ${r.kpiCategory} ${r.id}`.toLowerCase().includes(q));

  const incColumns: DataTableColumn<CmpIncidentRow>[] = [
    { id: 'title', header: 'Title', accessor: (r) => r.title, sortable: true },
    { id: 'kpi', header: 'KPI Category', accessor: (r) => r.kpiCategory, width: '150px' },
    { id: 'reported', header: 'Reported On', accessor: (r) => r.reportedOn, width: '190px', sortable: true },
    { id: 'crit', header: 'Criticality', width: '120px', cell: (r) => <CriticalityPill critical={r.critical} /> },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-body-sm font-semibold text-foreground">Inspection {sector}</h4>
        <span className="rounded-[3px] border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-secondary-foreground">{contractor}</span>
        <span className="rounded-[3px] border border-primary bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-primary">{lotLabel(entry.lotId)}</span>
        <span className="ml-auto"><VisitPill visited={visited} /></span>
      </div>

      {visited ? (
        <>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between">
            <ComplianceGaugeChart value={gauge} size={150} label="Compliance" />
            <div className="grid flex-1 grid-cols-2 gap-2">
              <MiniKpi icon={<Icons.Clock size={15} />} label="Inspection Window" value={`${winStart} – ${winEnd}`} />
              <MiniKpi icon={<Icons.Clock size={15} />} label="Time In Sector" value={`${hm(timeInMin)} / ${hm(windowMin)}`} iconColor="var(--chart-accent-purple)" />
              <MiniKpi icon={<Icons.AlertTriangle size={15} />} label="Incidents Reported" value={incCount} iconColor="var(--status-error)" />
              <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Area Coverage</span>
                <span className="text-body-sm font-semibold text-foreground">{coveredKm.toFixed(2)} / {totalKm.toFixed(2)} km</span>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${coveragePct}%` }} /></div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <p className="text-body-xs font-semibold uppercase tracking-wide text-muted-foreground">Reported Incidents</p>
              <div className="relative ml-auto w-[200px]">
                <Icons.SearchSm size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="h-8 pl-8 text-body-xs" />
              </div>
              <button type="button" className="grid size-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Filter"><Icons.FilterLines size={14} /></button>
            </div>
            <DataTable columns={incColumns} data={incRows} getRowId={(r) => r.id} onRowClick={(r) => { if (r.realIncidentId) onOpenIncident(r.realIncidentId); }} emptyState={<div className="py-6 text-center text-body-xs text-muted-foreground">No incidents reported in this sector.</div>} />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <img src={emptyComplianceIllustration} alt="" className="h-[92px] w-auto" />
          <div className="flex flex-col gap-0.5">
            <p className="text-body-sm font-semibold text-foreground">No Compliance Data Yet</p>
            <p className="text-body-xs text-muted-foreground">This sector was not visited during the shift.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** WIDE right Sheet — the full compliance detail (frame 554-19668). */
function ComplianceDetailSheet({ s, entry, onClose }: { s: Store; entry: ComplianceEntry; onClose: () => void }) {
  const insp = INSPECTORS.find((x) => x.id === entry.inspectorId);
  const sectorNumbers = entry.sectorsPlanned.map((sec) => sec.replace('Sector ', ''));

  // The inspector's real store incidents — back the Plan Log / sector / map
  // incidents so clicking one opens its detail flow (resolved by id).
  const myIncidents = React.useMemo(
    () => s.data.incidents.filter((i) => i.reportedByInspectorId === entry.inspectorId),
    [s.data.incidents, entry.inspectorId],
  );
  // The incident-detail sheet opens OVER this compliance sheet (own fixed z-[680]).
  const [openIncidentId, setOpenIncidentId] = React.useState<string | null>(null);
  const openIncident = React.useCallback((id: string) => setOpenIncidentId(id), []);

  return (
    <DetailSheet
      open
      onOpenChange={(o) => { if (!o) onClose(); }}
      tabs={[{ id: entry.id, label: insp?.name ?? '—', category: 'Inspector · Shifts', icon: Icons.User01 }]}
      activeId={entry.id}
      onTabClick={() => {}}
      onCloseTab={onClose}
      onCloseAll={onClose}
      onMinimize={onClose}
    >
      <div>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1 text-body-xs font-medium text-secondary-foreground"><Icons.Calendar size={13} className="text-primary" />{dateLong(parseISO(entry.dateISO))}</span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1 text-body-xs font-medium text-secondary-foreground"><Icons.MarkerPin01 size={13} className="text-primary" />{lotLabel(entry.lotId)} · {lotSub(entry.lotId)}</span>
          </div>

          <div className="flex flex-col gap-4 p-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-3">
                <ComplianceGaugeChart value={entry.compliancePct} size={130} label="Overall Compliance" />
              </div>
              <MiniKpi icon={<AvatarChip name={insp?.name ?? '—'} color={insp?.avatarColor ?? 'var(--primary)'} size={20} />} label="Inspector" value={insp?.name ?? '—'} />
              <MiniKpi icon={<Icons.Grid01 size={15} />} label="Sectors Planned" value={sectorNumbers.map((n) => `Sector ${n}`).join(', ')} />
              <MiniKpi icon={<Icons.Clock size={15} />} label="Timings Scheduled" value={entry.timings.join(', ')} iconColor="var(--chart-accent-purple)" />
              <MiniKpi icon={<Icons.MarkerPin01 size={15} />} label="Total Sectors Visited" value={`${entry.sectorsVisited.length} / ${entry.sectorsPlanned.length}`} iconColor={entry.sectorsVisited.length === entry.sectorsPlanned.length ? 'var(--status-success)' : 'var(--status-warning)'} />
              <MiniKpi icon={<Icons.AlertTriangle size={15} />} label="Total Incidents Reported" value={entry.incidentsReported} iconColor="var(--status-error)" />
              <MiniKpi icon={<Icons.Clock size={15} />} label="Time In Sectors" value={`${hm(entry.timeInSectorsMin)} / ${hm(entry.scheduledMin)}`} />
              <MiniKpi icon={<Icons.BarChartSquare02 size={15} />} label="Area Coverage" value={`${entry.areaCoveragePct}%`} iconColor="var(--chart-accent-teal)" />
              <MiniKpi icon={<Icons.Clock size={15} />} label="Idle Time" value={hm(entry.idleMin)} iconColor="var(--status-warning)" />
            </div>

            {/* Fixed row height so the Plan Log scrolls INTERNALLY (expanding an
                Idling event must not grow the panel / break the layout). */}
            <div className="grid grid-cols-1 gap-4 lg:h-[460px] lg:grid-cols-[minmax(0,340px)_1fr]">
              <div className="h-[400px] overflow-hidden lg:h-full lg:min-h-0"><PlanLog entry={entry} myIncidents={myIncidents} onOpenIncident={openIncident} /></div>
              <RouteMap entry={entry} myIncidents={myIncidents} onOpenIncident={openIncident} />
            </div>

            <div>
              <p className="mb-2 text-body-sm font-semibold text-foreground">Sector Inspections</p>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {entry.sectorsPlanned.map((sec) => (
                  <SectorInspectionCard key={sec} entry={entry} sector={sec} myIncidents={myIncidents} onOpenIncident={openIncident} />
                ))}
              </div>
            </div>
          </div>
        </div>

      {/* Incident detail — portaled to <body> so its fixed z-[680] sheet stacks
          ABOVE this compliance DetailSheet instead of being trapped inside it. */}
      {openIncidentId && createPortal(
        <IncidentDetailFlow incidentId={openIncidentId} role="po" onClose={() => setOpenIncidentId(null)} />,
        document.body,
      )}
    </DetailSheet>
  );
}
