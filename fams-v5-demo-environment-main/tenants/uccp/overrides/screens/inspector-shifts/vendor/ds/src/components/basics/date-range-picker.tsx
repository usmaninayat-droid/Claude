import * as React from 'react';
import { cn } from '../utils/cn';
import { Button, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { Calendar as CalendarIcon } from '../../icons';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

/**
 * DateRangePicker — the FAMS date popup (Figma DS V2 6649:24799…). Two modes:
 *  - `range` (default): a preset list (Today / This week / … / Custom) + a
 *    calendar with **range selection** + optional Start/End time + Apply. Because
 *    the popup owns range selection, dashboards/filters should use THIS, not a
 *    separate row of range pills.
 *  - `single`: the calendar alone (single date), no presets.
 *
 * Lightweight by design: drives a display label; emits the picked range on Apply.
 */
export type DateRangeMode = 'range' | 'single';

export interface DateRangeResult {
  label: string;
  preset?: string;
  start?: Date;
  end?: Date | null;
  startTime?: string;
  endTime?: string;
}

export interface DateRangePickerProps {
  mode?: DateRangeMode;
  /** Controlled display label (e.g. "01 Jun – 15 Jun, 2026"). */
  value?: React.ReactNode;
  /** Preset rows (range mode). Defaults to the standard FAMS set. */
  presets?: string[];
  /** Show Start/End time inputs (range mode). */
  withTime?: boolean;
  placeholder?: React.ReactNode;
  onApply?: (result: DateRangeResult) => void;
  triggerClassName?: string;
  /** Render as a borderless field (for the report builder filter panel). */
  field?: { label: React.ReactNode };
}

const PRESETS = ['Today', 'Yesterday', 'This week', 'Last week', 'This month', 'Last month', 'This year', 'Last year'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const fmt = (d: Date) => `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
/** Monday-first weekday index (0 = Mon … 6 = Sun). */
const mondayIdx = (d: Date) => (d.getDay() + 6) % 7;
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function DateRangePicker({
  mode = 'range',
  value,
  presets = PRESETS,
  withTime = mode === 'range',
  placeholder = 'Select Date',
  onApply,
  triggerClassName,
  field,
}: DateRangePickerProps) {
  const today = new Date();
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState({ m: today.getMonth(), y: today.getFullYear() });
  const [start, setStart] = React.useState<Date | null>(null);
  const [end, setEnd] = React.useState<Date | null>(null);
  const [preset, setPreset] = React.useState<string | null>(mode === 'range' ? null : null);
  const [startTime, setStartTime] = React.useState('10:00');
  const [endTime, setEndTime] = React.useState('18:00');
  const [label, setLabel] = React.useState<React.ReactNode>(value ?? null);

  const stepMonth = (delta: number) =>
    setView((v) => { const d = new Date(v.y, v.m + delta, 1); return { m: d.getMonth(), y: d.getFullYear() }; });

  const pickDate = (d: Date, cur: boolean) => {
    if (!cur) setView({ m: d.getMonth(), y: d.getFullYear() });
    setPreset(null);
    if (mode === 'single') { setStart(d); setEnd(null); return; }
    if (!start || (start && end)) { setStart(d); setEnd(null); }
    else if (d < start) { setStart(d); setEnd(null); }
    else setEnd(d);
  };

  const applyPreset = (p: string) => {
    setPreset(p);
    setStart(null);
    setEnd(null);
  };

  const computeLabel = (): string => {
    if (preset) return preset;
    if (mode === 'single') return start ? fmt(start) : '';
    if (start && end) return `${fmt(start)} – ${fmt(end)}`;
    if (start) return fmt(start);
    return '';
  };

  const apply = () => {
    const lbl = computeLabel() || 'Custom';
    setLabel(lbl);
    onApply?.({ label: lbl, preset: preset ?? undefined, start: start ?? undefined, end, startTime: withTime ? startTime : undefined, endTime: withTime ? endTime : undefined });
    setOpen(false);
  };

  // Build the month grid (Monday-first), with leading/trailing days from siblings.
  const firstOfMonth = new Date(view.y, view.m, 1);
  const lead = mondayIdx(firstOfMonth);
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: { day: number; cur: boolean; date: Date }[] = [];
  const prevDays = new Date(view.y, view.m, 0).getDate();
  for (let i = lead - 1; i >= 0; i--) cells.push({ day: prevDays - i, cur: false, date: new Date(view.y, view.m - 1, prevDays - i) });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, cur: true, date: new Date(view.y, view.m, d) });
  let nx = 1;
  while (cells.length % 7 !== 0 || cells.length < 42) { cells.push({ day: nx, cur: false, date: new Date(view.y, view.m + 1, nx) }); nx++; if (cells.length >= 42) break; }

  const inRange = (d: Date) => start && end && d > start && d < end;
  const isStart = (d: Date) => start && sameDay(d, start);
  const isEnd = (d: Date) => end && sameDay(d, end);

  const triggerLabel = label ?? value ?? placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {field ? (
          <button type="button" className={cn('w-full rounded-lg border border-border bg-card px-3 py-2 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring', triggerClassName)}>
            <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{field.label}</span>
            <span className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-body-sm font-medium text-foreground">
                <CalendarIcon size={15} className="text-muted-foreground" />
                <span className="truncate">{triggerLabel}</span>
              </span>
              <ChevronDown size={15} className="shrink-0 text-muted-foreground" />
            </span>
          </button>
        ) : (
          <button type="button" className={cn('inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-body-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', triggerClassName)}>
            <CalendarIcon size={16} className="text-muted-foreground" />
            {triggerLabel}
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex">
          {mode === 'range' ? (
            <div className="flex w-[150px] shrink-0 flex-col gap-0.5 border-r border-border p-2">
              <button type="button" onClick={() => applyPreset('Custom Date')} className={cn('rounded-md px-3 py-2 text-left text-body-sm', preset === 'Custom Date' || !preset ? 'bg-secondary font-semibold text-primary' : 'text-foreground/80 hover:bg-muted')}>Custom Date</button>
              {presets.map((p) => (
                <button key={p} type="button" onClick={() => applyPreset(p)} className={cn('rounded-md px-3 py-2 text-left text-body-sm', preset === p ? 'bg-secondary font-semibold text-primary' : 'text-foreground/80 hover:bg-muted')}>{p}</button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-4 px-4 pt-4">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => stepMonth(-1)} className="text-muted-foreground hover:text-foreground"><ChevronLeft size={18} /></button>
                <span className="min-w-[84px] text-center text-body-sm font-semibold text-foreground">{MONTHS[view.m]}</span>
                <button type="button" onClick={() => stepMonth(1)} className="text-muted-foreground hover:text-foreground"><ChevronRight size={18} /></button>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setView((v) => ({ ...v, y: v.y - 1 }))} className="text-muted-foreground hover:text-foreground"><ChevronLeft size={16} /></button>
                <span className="text-body-sm font-semibold text-foreground">{view.y}</span>
                <button type="button" onClick={() => setView((v) => ({ ...v, y: v.y + 1 }))} className="text-muted-foreground hover:text-foreground"><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-y-1 px-4 pb-3 pt-3">
              {WEEKDAYS.map((w) => <div key={w} className="pb-1 text-center text-caption font-medium text-muted-foreground">{w}</div>)}
              {cells.map((c, i) => {
                const selected = isStart(c.date) || isEnd(c.date);
                const ranged = inRange(c.date);
                const isToday = sameDay(c.date, today);
                return (
                  <div key={i} className={cn('flex justify-center', ranged && c.cur ? 'bg-secondary' : '', isStart(c.date) && end ? 'rounded-l-full bg-secondary' : '', isEnd(c.date) ? 'rounded-r-full bg-secondary' : '')}>
                    <button
                      type="button"
                      onClick={() => pickDate(c.date, c.cur)}
                      className={cn(
                        'relative flex size-9 items-center justify-center rounded-full text-body-sm outline-none transition-colors',
                        !c.cur ? 'text-muted-foreground/40' : 'text-foreground hover:bg-muted',
                        selected ? 'bg-primary font-semibold text-primary-foreground hover:bg-primary' : '',
                      )}
                    >
                      {c.day}
                      {isToday && !selected ? <span className="absolute bottom-1 size-1 rounded-full bg-primary" /> : null}
                    </button>
                  </div>
                );
              })}
            </div>

            {withTime ? (
              <div className="flex items-center gap-3 border-t border-border px-4 py-3 text-body-sm">
                <span className="text-muted-foreground">Start Time</span>
                <input value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-8 w-14 rounded-md border border-border bg-card px-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                <span className="text-muted-foreground">End Time</span>
                <input value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-8 w-14 rounded-md border border-border bg-card px-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">
              <span className="text-caption text-muted-foreground">{computeLabel() || '—'}{withTime && (start || preset) ? ` · ${startTime}–${endTime}` : ''}</span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={apply}>Apply</Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
