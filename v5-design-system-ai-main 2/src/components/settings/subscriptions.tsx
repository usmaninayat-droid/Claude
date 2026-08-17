import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Switch, Checkbox, Popover, PopoverTrigger, PopoverContent, Badge, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../primitives';

/**
 * Subscriptions — Settings › Subscriptions (FAMS, Figma 176-3062-scheduler /
 * 176-3222-org). Two tabs:
 *   • My Subscriptions       — scheduled/shared reports table (name · type · frequency ·
 *                              next/last run · sub-org · enable toggle · Remove).
 *   • Organization Subscriptions — notification rules per role (role · trigger · severity ·
 *                              notification) set Off / On / Mandatory, with role + severity
 *                              filters and bulk-select. "Mandatory" = users cannot opt out.
 * Config-driven + token-only.
 */

export type SubTab = 'my' | 'org';
export type ReportAction = 'remove' | 'edit';
export interface ReportSubscription {
  id: string;
  name: string;
  /** Free-form source kind — 'Report', 'Pipeline', 'Maintenance', 'Event', … (data, not chrome). */
  type: string;
  frequency: string;
  nextRun?: string;
  lastRun?: string;
  subOrg?: string;
  enabled: boolean;
}

export type SubSeverity = 'critical' | 'other' | 'minor' | 'medium' | 'low';
export type SubLevel = 'off' | 'on' | 'mandatory';
export interface OrgSubscription {
  id: string;
  role: string;
  trigger: string;
  severity: SubSeverity;
  notification: string;
  level: SubLevel;
}

export interface SubscriptionsProps {
  title?: string;
  subtitle?: string;
  reportSubscriptions: ReportSubscription[];
  orgSubscriptions: OrgSubscription[];
  defaultTab?: SubTab;
  /** Opt-in: add an "Edit / Go to source" item to each report row's menu (fires
   *  `onReportAction(sub, 'edit')`). Default false ⇒ menu is Remove-only (frame parity). */
  editableReports?: boolean;
  onToggleReport?: (id: string, enabled: boolean) => void;
  onReportAction?: (sub: ReportSubscription, action: ReportAction) => void;
  onSetLevel?: (id: string, level: SubLevel) => void;
  onBulkSetLevel?: (ids: string[], level: SubLevel) => void;
  className?: string;
}

const SEVERITY_META: Record<SubSeverity, { label: string; tone: string }> = {
  critical: { label: 'CRITICAL', tone: 'var(--status-error)' },
  other: { label: 'OTHER', tone: 'var(--primary)' },
  minor: { label: 'MINOR', tone: 'var(--status-warning)' },
  medium: { label: 'MEDIUM', tone: 'var(--status-success)' },
  low: { label: 'LOW', tone: 'var(--muted-foreground)' },
};
const SEVERITY_FILTERS = ['All Severities', 'Critical', 'Other', 'Minor', 'Medium', 'Low'];

export function Subscriptions({
  title = 'Subscriptions',
  subtitle = 'See all your scheduled and shared subscriptions. Set up delivery times and manage access for seamless collaboration.',
  reportSubscriptions, orgSubscriptions, defaultTab = 'my', editableReports = false, onToggleReport, onReportAction, onSetLevel, onBulkSetLevel, className,
}: SubscriptionsProps) {
  const [tab, setTab] = React.useState<SubTab>(defaultTab);
  return (
    <div className={cn('p-7', className)}>
      <div className="mb-5">
        <h1 className="text-h5 font-semibold text-foreground">{title}</h1>
        <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="mb-5 flex items-center gap-6 border-b border-border">
        {([['my', 'My Subscriptions'], ['org', 'Organization Subscriptions']] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
            className={cn('relative -mb-px pb-2.5 text-body-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring', tab === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
            {label}
            {tab === id && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      {tab === 'my'
        ? <MySubscriptions rows={reportSubscriptions} editable={editableReports} onToggle={onToggleReport} onAction={onReportAction} />
        : <OrgSubscriptions rows={orgSubscriptions} onSetLevel={onSetLevel} onBulkSetLevel={onBulkSetLevel} />}
    </div>
  );
}

function MySubscriptions({ rows, editable, onToggle, onAction }: { rows: ReportSubscription[]; editable?: boolean; onToggle?: (id: string, e: boolean) => void; onAction?: (s: ReportSubscription, a: ReportAction) => void }) {
  if (!rows.length) return <Empty label="No subscriptions yet — schedule a report to see it here." />;
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-body-sm">
          <thead className="border-b border-border bg-muted/40 text-caption uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Type</th>
              <th className="px-4 py-2.5 font-semibold">Frequency</th>
              <th className="px-4 py-2.5 font-semibold">Next Run</th>
              <th className="px-4 py-2.5 font-semibold">Last Run</th>
              <th className="px-4 py-2.5 font-semibold">Sub Organization</th>
              <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="group hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium text-foreground">{r.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.type}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.frequency}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{r.nextRun ?? '—'}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{r.lastRun ?? '—'}</td>
                <td className="px-4 py-2.5 text-foreground">{r.subOrg ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-2">
                    <Switch checked={r.enabled} onCheckedChange={(v) => onToggle?.(r.id, v)} aria-label={`${r.enabled ? 'Disable' : 'Enable'} ${r.name}`} />
                    {onAction && <ReportMenu sub={r} onEdit={editable ? () => onAction(r, 'edit') : undefined} onRemove={() => onAction(r, 'remove')} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrgSubscriptions({ rows, onSetLevel, onBulkSetLevel }: { rows: OrgSubscription[]; onSetLevel?: (id: string, l: SubLevel) => void; onBulkSetLevel?: (ids: string[], l: SubLevel) => void }) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [roleFilter, setRoleFilter] = React.useState<string[]>([]);
  const [severity, setSeverity] = React.useState('All Severities');

  const roles = React.useMemo(() => Array.from(new Set(rows.map((r) => r.role))), [rows]);
  const visible = React.useMemo(() => rows.filter((r) =>
    (!roleFilter.length || roleFilter.includes(r.role)) &&
    (severity === 'All Severities' || SEVERITY_META[r.severity].label === severity.toUpperCase()),
  ), [rows, roleFilter, severity]);
  // Reconcile selection against what's actually shown — a filter change (or rows changing
  // under it) must drop selected ids that scrolled out of view, so the bulk bar count and
  // select-all state never lie about what's on screen.
  React.useEffect(() => { setSelected((cur) => cur.filter((id) => visible.some((r) => r.id === id))); }, [visible]);

  const allChecked = visible.length > 0 && visible.every((r) => selected.includes(r.id));
  const someChecked = selected.some((id) => visible.some((r) => r.id === id));
  const toggleAll = () => setSelected(allChecked ? selected.filter((id) => !visible.some((r) => r.id === id)) : Array.from(new Set([...selected, ...visible.map((r) => r.id)])));
  const clearFilters = () => { setRoleFilter([]); setSeverity('All Severities'); };
  const bulk = (l: SubLevel) => { onBulkSetLevel?.(selected, l); setSelected([]); };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <RoleFilter roles={roles} value={roleFilter} onChange={setRoleFilter} />
        <SeverityFilter value={severity} onChange={setSeverity} />
        {(roleFilter.length > 0 || severity !== 'All Severities') && (
          <button type="button" onClick={clearFilters} className="rounded-sm text-body-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring">Clear Filters</button>
        )}
      </div>

      {visible.length ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-body-sm">
              <thead className="border-b border-border bg-muted/40 text-caption uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-2.5"><Checkbox checked={allChecked ? true : someChecked ? 'indeterminate' : false} onCheckedChange={toggleAll} aria-label="Select all rows" /></th>
                  <th className="px-4 py-2.5 font-semibold">Role</th>
                  <th className="px-4 py-2.5 font-semibold">Trigger Event</th>
                  <th className="px-4 py-2.5 font-semibold">Severity</th>
                  <th className="px-4 py-2.5 font-semibold">Notification</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((r) => {
                  const sev = SEVERITY_META[r.severity];
                  const on = selected.includes(r.id);
                  return (
                    <tr key={r.id} className={cn('hover:bg-muted/30', on && 'bg-primary/5')}>
                      <td className="px-4 py-2.5"><Checkbox checked={on} onCheckedChange={() => setSelected((cur) => (cur.includes(r.id) ? cur.filter((x) => x !== r.id) : [...cur, r.id]))} aria-label={`Select ${r.role} · ${r.trigger}`} /></td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{r.role}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.trigger}</td>
                      <td className="px-4 py-2.5">
                        <Badge color={sev.tone}><Icons.Flag01 size={13} className="mr-1" />{sev.label}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.notification}</td>
                      <td className="px-4 py-2.5"><div className="flex justify-end"><LevelToggle level={r.level} onChange={(l) => onSetLevel?.(r.id, l)} /></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : <Empty label="No subscriptions match your filters." />}

      {selected.length > 0 && (
        <div role="status" aria-live="polite" className="sticky bottom-4 mx-auto flex items-center gap-4 rounded-xl border border-primary/30 bg-card px-4 py-3 shadow-md">
          <button type="button" aria-label="Clear selection" onClick={() => setSelected([])} className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><Icons.XClose size={16} /></button>
          <span className="text-body-sm font-medium text-foreground">{selected.length} Row{selected.length === 1 ? '' : 's'} selected</span>
          <LevelToggle level={undefined} onChange={bulk} />
        </div>
      )}
    </div>
  );
}

/** Off / On / Mandatory segmented control. `level=undefined` = bulk (no active state). */
function LevelToggle({ level, onChange }: { level?: SubLevel; onChange: (l: SubLevel) => void }) {
  const opts: { id: SubLevel; label: string }[] = [
    { id: 'off', label: 'Off' }, { id: 'on', label: 'On' }, { id: 'mandatory', label: 'Mandatory' },
  ];
  return (
    <div role="group" aria-label="Notification level" className="inline-flex shrink-0 overflow-hidden rounded-md border border-border">
      {opts.map((o) => {
        const active = level === o.id;
        const btnClass = cn('px-3 py-1.5 text-body-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring',
          active ? (o.id === 'mandatory' ? 'bg-foreground text-background' : 'bg-muted text-foreground') : 'bg-card text-muted-foreground hover:bg-muted');
        if (o.id === 'mandatory') {
          return (
            <TooltipProvider key={o.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-pressed={active} aria-label="Mandatory (users cannot opt-out)" onClick={() => onChange(o.id)} className={btnClass}>{o.label}</button>
                </TooltipTrigger>
                <TooltipContent>Mandatory means users cannot opt-out</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return (
          <button key={o.id} type="button" aria-pressed={active} onClick={() => onChange(o.id)} className={btnClass}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Single-select severity filter — RoleFilter chrome (h-9 icon · label · chevron). */
function SeverityFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-haspopup="listbox" aria-expanded={open} className="flex h-9 items-center gap-2 rounded-md border border-border bg-input-background px-3 text-body-sm text-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
          <Icons.Flag01 size={15} className="text-muted-foreground" />{value}<Icons.ChevronDown size={15} className="text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        {SEVERITY_FILTERS.map((s) => (
          <button key={s} type="button" role="option" aria-selected={s === value} onClick={() => { onChange(s); setOpen(false); }}
            className={cn('flex w-full items-center rounded-md px-2.5 py-2 text-left text-body-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', s === value ? 'font-semibold text-primary' : 'text-foreground')}>
            {s}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function RoleFilter({ roles, value, onChange }: { roles: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const label = value.length ? `${value.length} Role${value.length > 1 ? 's' : ''} Selected` : 'All Roles';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-haspopup="listbox" aria-expanded={open} className="flex h-9 items-center gap-2 rounded-md border border-border bg-input-background px-3 text-body-sm text-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
          <Icons.Users01 size={15} className="text-muted-foreground" />{label}<Icons.ChevronDown size={15} className="text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        {roles.map((r) => (
          <button key={r} type="button" role="checkbox" aria-checked={value.includes(r)} onClick={() => onChange(value.includes(r) ? value.filter((x) => x !== r) : [...value, r])} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
            <Checkbox checked={value.includes(r)} aria-hidden tabIndex={-1} className="pointer-events-none" />{r}
          </button>
        ))}
        {!roles.length && <div className="px-2.5 py-3 text-body-sm text-muted-foreground">No roles.</div>}
      </PopoverContent>
    </Popover>
  );
}

function ReportMenu({ sub, onEdit, onRemove }: { sub: ReportSubscription; onEdit?: () => void; onRemove: () => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Actions for ${sub.name}`} className="grid size-8 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"><Icons.DotsVertical size={18} /></button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-1">
        {onEdit && (
          <button type="button" className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { onEdit(); setOpen(false); }}><Icons.Edit02 size={15} />Edit / Go to source</button>
        )}
        <button type="button" className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-[var(--status-error)] transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { onRemove(); setOpen(false); }}><Icons.Trash01 size={15} />Remove</button>
      </PopoverContent>
    </Popover>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-body-sm text-muted-foreground">{label}</div>;
}
