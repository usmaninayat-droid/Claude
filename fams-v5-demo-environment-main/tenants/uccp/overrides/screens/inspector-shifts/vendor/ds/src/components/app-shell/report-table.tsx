import * as React from 'react';
import { cn } from '../utils/cn';
import { Popover, PopoverTrigger, PopoverContent, Avatar, Button, Checkbox } from '../primitives';
import { IconBadge } from '../data-viz';
import { SearchMd, Download01, Save01, Bell01, LayersThree01, Mail01, Clock } from '../../icons';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { FormSheet } from './side-sheet';
import { DateRangePicker } from '../basics';

/**
 * ReportTable — the report result surface used by every report type (tabular,
 * group-by, multi-event, trip). Optional KPI summary row + a toolbar (search ·
 * Group By · export/save/notify) + "Showing N items" + a grouped, horizontally
 * scrollable data table. Figma DS V2 report result + group-by frames.
 */
export interface ReportColumn {
  key: string;
  label: React.ReactNode;
  /** Custom cell renderer; defaults to `row[key]`. */
  render?: (row: Record<string, React.ReactNode>) => React.ReactNode;
  /** Hint that this column groups well (offered in the Group By dropdown). */
  groupable?: boolean;
}

export interface ReportKpi {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  icon?: React.ReactNode;
  /** Icon accent color (token/hex) for the standard IconBadge. Default primary. */
  iconColor?: string;
  /** @deprecated bg is derived from `iconColor` now. */
  iconBg?: string;
}

export interface ReportTableProps {
  columns: ReportColumn[];
  rows: Record<string, React.ReactNode>[];
  kpis?: ReportKpi[];
  /** Place the KPI band BELOW the toolbar (search/actions on top) instead of above it. */
  kpisBelowToolbar?: boolean;
  /** Keys searched by the toolbar search (defaults to all columns). */
  searchKeys?: string[];
  /** RAG report — tint each row green/amber/red by status (null = no tint). */
  rag?: (row: Record<string, React.ReactNode>) => 'green' | 'amber' | 'red' | null | undefined;
  /** Report name shown in the Subscribe (schedule) sheet. */
  reportName?: React.ReactNode;
  /** Recipients offered in the Subscribe sheet. */
  recipientOptions?: { value: string; label: string }[];
  /** Called when a subscription is created from the bell icon. */
  onSubscribe?: (sub: ReportSubscription) => void;
  className?: string;
}

/** A report subscription created from the toolbar bell. */
export interface ReportSubscription {
  recipients: string[];
  frequency: 'Daily' | 'Weekly' | 'Monthly';
  dayTime: string;
  start?: string;
  end?: string;
}

const cellText = (v: React.ReactNode): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');

const RAG_BG: Record<string, string> = {
  green: 'color-mix(in srgb, var(--status-success) 18%, transparent)',
  amber: 'color-mix(in srgb, var(--status-warning) 22%, transparent)',
  red: 'color-mix(in srgb, var(--status-error) 16%, transparent)',
};

export function ReportTable({ columns, rows, kpis, kpisBelowToolbar, searchKeys, rag, reportName, recipientOptions, onSubscribe, className }: ReportTableProps) {
  const [query, setQuery] = React.useState('');
  const [groupKey, setGroupKey] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(() => new Set());
  const [subOpen, setSubOpen] = React.useState(false);
  const groupables = columns.filter((c) => c.groupable);

  const q = query.trim().toLowerCase();
  const keys = searchKeys ?? columns.map((c) => c.key);
  const filtered = q ? rows.filter((r) => keys.some((k) => cellText(r[k]).toLowerCase().includes(q))) : rows;

  // Group rows by the chosen key (preserving first-seen order), or one flat group.
  const order: string[] = [];
  const byGroup = new Map<string, Record<string, React.ReactNode>[]>();
  for (const r of filtered) {
    const g = groupKey ? cellText(r[groupKey]) || '—' : '__all__';
    if (!byGroup.has(g)) { byGroup.set(g, []); order.push(g); }
    byGroup.get(g)!.push(r);
  }
  const toggleGroup = (g: string) => setCollapsed((p) => { const n = new Set(p); n.has(g) ? n.delete(g) : n.add(g); return n; });

  const ICON_BTN = 'flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground outline-none transition-colors hover:bg-muted';

  const kpiBand = kpis?.length ? (
    <div className={cn('flex flex-wrap gap-3 px-6', kpisBelowToolbar ? 'pb-1 pt-0' : 'pt-5')}>
      {kpis.map((k, i) => (
        <div key={i} className="flex min-w-[180px] flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          {k.icon ? <IconBadge icon={k.icon} color={k.iconColor} size={36} /> : null}
          <div className="min-w-0">
            <div className="truncate text-caption text-muted-foreground">{k.label}</div>
            <div className="text-h6 font-semibold text-foreground">
              {k.value}{k.unit ? <span className="ml-0.5 text-body-sm font-medium text-muted-foreground">{k.unit}</span> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      {kpisBelowToolbar ? null : kpiBand}

      {/* Toolbar */}
      <div className={cn('flex items-center gap-2 px-6 py-4', kpisBelowToolbar && 'pb-2')}>
        <div className="relative max-w-[360px] flex-1">
          <SearchMd size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anything here"
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-body-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {groupables.length ? (
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-body-sm font-medium text-foreground outline-none hover:bg-muted">
                <LayersThree01 size={15} className="text-muted-foreground" />
                Group By{groupKey ? `: ${columns.find((c) => c.key === groupKey)?.label}` : ''}
                <ChevronDown size={14} className="text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1">
              <button type="button" onClick={() => setGroupKey(null)} className={cn('flex w-full rounded-md px-2 py-1.5 text-left text-body-sm hover:bg-muted', !groupKey && 'font-semibold text-primary')}>None</button>
              {groupables.map((c) => (
                <button key={c.key} type="button" onClick={() => setGroupKey(c.key)} className={cn('flex w-full rounded-md px-2 py-1.5 text-left text-body-sm hover:bg-muted', groupKey === c.key && 'font-semibold text-primary')}>{c.label}</button>
              ))}
            </PopoverContent>
          </Popover>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <button type="button" title="Save" className={ICON_BTN}><Save01 size={16} /></button>
          <button type="button" title="Export" className={ICON_BTN}><Download01 size={16} /></button>
          <button type="button" title="Subscribe" onClick={() => setSubOpen(true)} className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground outline-none hover:opacity-90"><Bell01 size={16} /></button>
        </div>
      </div>

      {kpisBelowToolbar ? kpiBand : null}

      <SubscribeReportSheet
        open={subOpen}
        onOpenChange={setSubOpen}
        reportName={reportName}
        recipientOptions={recipientOptions}
        onSubscribe={(sub) => { onSubscribe?.(sub); setSubOpen(false); }}
      />

      <div className="px-6 pb-2 text-caption text-muted-foreground">
        Showing <span className="font-semibold text-primary">{filtered.length} items</span>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-body-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>{columns.map((c) => <th key={c.key} className="whitespace-nowrap px-4 py-2.5 font-semibold">{c.label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.map((g) => (
                <React.Fragment key={g}>
                  {groupKey ? (
                    <tr className="bg-muted/30">
                      <td colSpan={columns.length} className="px-4 py-2">
                        <button type="button" onClick={() => toggleGroup(g)} className="flex items-center gap-2 text-body-sm font-semibold text-foreground outline-none">
                          {collapsed.has(g) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                          {g}
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{byGroup.get(g)!.length}</span>
                        </button>
                      </td>
                    </tr>
                  ) : null}
                  {(groupKey && collapsed.has(g) ? [] : byGroup.get(g)!).map((row, i) => {
                    const ragBg = rag ? RAG_BG[rag(row) ?? ''] : undefined;
                    return (
                    <tr key={i} className={cn(!ragBg && 'hover:bg-muted/30')} style={ragBg ? { background: ragBg } : undefined}>
                      {columns.map((c) => (
                        <td key={c.key} className="whitespace-nowrap px-4 py-2.5 text-foreground">
                          {c.render ? c.render(row) : row[c.key]}
                        </td>
                      ))}
                    </tr>
                    );
                  })}
                </React.Fragment>
              ))}
              {filtered.length === 0 ? (
                <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">No matching records.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** A driver/person cell — avatar + name + optional id (matches the report frames). */
export function ReportPersonCell({ name, id, src }: { name: React.ReactNode; id?: React.ReactNode; src?: string }) {
  return (
    <span className="flex items-center gap-2">
      <Avatar size="sm" src={src} fallback={cellText(name).slice(0, 2).toUpperCase() || 'U'} />
      <span className="flex flex-col leading-tight">
        <span className="text-body-sm font-medium text-foreground">{name}</span>
        {id ? <span className="text-[11px] text-muted-foreground">{id}</span> : null}
      </span>
    </span>
  );
}

/* ── Subscribe Report — schedule a recurring report (the toolbar bell) ────── */
const DEFAULT_RECIPIENTS = [
  { value: 'jane.doe@fams.com', label: 'jane.doe@fams.com' },
  { value: 'ops@fams.com', label: 'ops@fams.com' },
  { value: 'manager@fams.com', label: 'manager@fams.com' },
];
const WEEKDAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_DAYS = ['1st', '5th', '10th', '15th', '20th', '25th', 'Last day'];
const FREQUENCIES: ReportSubscription['frequency'][] = ['Daily', 'Weekly', 'Monthly'];

function SubField({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function SelectMenu({ value, options, onChange, icon }: { value: string; options: string[]; onChange: (v: string) => void; icon?: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="flex w-full items-center justify-between gap-2 text-left text-body-sm font-medium text-foreground outline-none">
          <span className="flex items-center gap-2">{icon}{value}</span>
          <ChevronDown size={15} className="text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-64 w-[var(--radix-popover-trigger-width)] overflow-auto p-1">
        {options.map((o) => (
          <button key={o} type="button" onClick={() => onChange(o)} className={cn('flex w-full rounded-md px-2 py-1.5 text-left text-body-sm hover:bg-muted', o === value && 'font-semibold text-primary')}>{o}</button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function SubscribeReportSheet({
  open,
  onOpenChange,
  reportName = 'this report',
  recipientOptions = DEFAULT_RECIPIENTS,
  onSubscribe,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportName?: React.ReactNode;
  recipientOptions?: { value: string; label: string }[];
  onSubscribe?: (sub: ReportSubscription) => void;
}) {
  const [recipients, setRecipients] = React.useState<string[]>([]);
  const [frequency, setFrequency] = React.useState<ReportSubscription['frequency']>('Monthly');
  const [weekday, setWeekday] = React.useState('Monday');
  const [monthDay, setMonthDay] = React.useState('1st');
  const [time, setTime] = React.useState('08:00');
  const [start, setStart] = React.useState('');
  const [end, setEnd] = React.useState('');

  const dayTime = frequency === 'Daily' ? time : frequency === 'Weekly' ? `${weekday}, ${time}` : `${monthDay} of Month, ${time}`;
  const toggleRecipient = (v: string) => setRecipients((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} width="min(520px, 94vw)">
      <div className="flex h-full flex-col">
        <div className="px-6 pt-6">
          <h2 className="text-h5 font-semibold text-foreground">Subscribe Report</h2>
          <p className="text-body-sm text-muted-foreground">You will subscribe to report <span className="font-medium text-primary">{reportName}</span>.</p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-auto px-6 py-5">
          <div className="text-body-sm font-semibold text-foreground">Subscription Info</div>

          {/* Recipients */}
          <SubField label="Select Recipients">
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="flex w-full items-center justify-between gap-2 text-left text-body-sm font-medium text-foreground outline-none">
                  <span className="flex items-center gap-2"><Mail01 size={15} className="text-muted-foreground" />{recipients.length ? `${recipients.length} Recipient${recipients.length > 1 ? 's' : ''} Selected` : <span className="text-muted-foreground">Select recipients</span>}</span>
                  <ChevronDown size={15} className="text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="max-h-64 w-[var(--radix-popover-trigger-width)] overflow-auto p-1">
                {recipientOptions.map((o) => (
                  <button key={o.value} type="button" onClick={() => toggleRecipient(o.value)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-body-sm hover:bg-muted">
                    <Checkbox checked={recipients.includes(o.value)} onCheckedChange={() => toggleRecipient(o.value)} aria-label={o.label} />
                    <span className="truncate">{o.label}</span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </SubField>
          {recipients.length ? (
            <div className="-mt-2 flex flex-wrap gap-1.5">
              {recipients.map((r) => (
                <span key={r} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                  {recipientOptions.find((o) => o.value === r)?.label ?? r}
                  <button type="button" aria-label={`Remove ${r}`} onClick={() => toggleRecipient(r)}><X size={11} /></button>
                </span>
              ))}
            </div>
          ) : null}

          {/* Frequency */}
          <SubField label="Frequency">
            <SelectMenu value={frequency} options={FREQUENCIES} onChange={(v) => setFrequency(v as ReportSubscription['frequency'])} />
          </SubField>

          {/* Day & Time (conditional on frequency) */}
          <SubField label="Frequency, Day and Time">
            <div className="flex items-center gap-2">
              <Clock size={15} className="shrink-0 text-muted-foreground" />
              {frequency === 'Weekly' ? <div className="flex-1"><SelectMenu value={weekday} options={WEEKDAYS_FULL} onChange={setWeekday} /></div> : null}
              {frequency === 'Monthly' ? <div className="flex-1"><SelectMenu value={monthDay} options={MONTH_DAYS} onChange={setMonthDay} /></div> : null}
              <input value={time} onChange={(e) => setTime(e.target.value)} className="h-8 w-16 rounded-md border border-border bg-card px-2 text-center text-body-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </SubField>

          <div className="grid grid-cols-2 gap-3">
            <DateRangePicker mode="single" field={{ label: 'Start Date & Time' }} value={start || undefined} onApply={(r) => setStart(r.label)} />
            <DateRangePicker mode="single" field={{ label: 'End Date & Time' }} value={end || undefined} onApply={(r) => setEnd(r.label)} />
          </div>
        </div>

        <div className="border-t border-border px-6 py-4">
          <Button className="w-full" onClick={() => onSubscribe?.({ recipients, frequency, dayTime, start, end })}>Subscribe</Button>
        </div>
      </div>
    </FormSheet>
  );
}
