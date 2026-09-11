import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import {
  Input, Button, Badge, Checkbox,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Popover, PopoverTrigger, PopoverContent,
} from '../primitives';
import { DataTable, EmptyState } from '../data-display';
import type { DataTableColumn } from '../data-display';
import { FilterPopup } from '../modals';

/**
 * CentralAuditLog — PD-311 "Central Audit Page: New Module".
 *
 * Currently each module (e.g. vehicle profile) has its own audit trail /
 * timeline (see the profile detail sheet's Timeline tab — date-grouped
 * entries, avatar + action text, attachment thumbnails, an "All Filters"
 * panel with counted checkboxes for Entry Type / Tags / Attachments). This is
 * the proposed CENTRAL version: one place an admin sees every change across
 * the platform, filterable by module/user/date/change-type, scoped to a
 * single organization (confirmed in the ticket thread — the org switcher is
 * a hard scope boundary, not just another filter facet).
 *
 * Every facet — Organization, User, Module, Change type — is its own
 * toolbar-level control (no generic catch-all "Filters" popover hiding the
 * "major" ones); Attachments is a plain toggle since a single boolean isn't
 * worth a popover. Module/Change type reuse the shared `FilterPopup` chrome
 * (counted checkboxes, "Clear all") with a custom `title` per facet.
 *
 * Two read states:
 *  - Table: DataTable with a native `groupBy` for date-group headers
 *    ("Today"/"Yesterday"/"28 Oct, 2025" — same convention as the per-entity
 *    timeline), a one-line truncated `summary` in Details (the full sentence
 *    is a native `title` tooltip — a raw multi-line System sentence used to
 *    wrap and break the fixed 44px row height).
 *  - Timeline: a read-only, card-separated, date-grouped feed. Row shape
 *    (title + description + chip row, `#id` reference chip) is inspired by
 *    the FAMS Inbox notification list — not copied; no unread dots, mention
 *    highlighting, or severity flags, since this is a read-only audit trail.
 *
 * System vs. human actors render differently: automated field-diff entries
 * ("SYSTEM UPDATED LAST RFID TIMESTAMP FROM **X** TO **Y**") use a neutral
 * pencil marker, no avatar, and an ALL-CAPS sentence — a literal match of
 * the real per-entity Timeline tab's dominant entry type, not invented copy.
 *
 * Built the golden way otherwise: DataTable + EmptyState from data-display,
 * Select/Badge/Input/Checkbox from primitives, V5 icons, token-only styling.
 */

export type AuditChangeType = 'added' | 'modified' | 'deleted';

export interface AuditAttachment {
  name: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string; // ISO
  orgId: string;
  orgName: string;
  module: string;
  moduleIcon?: React.ReactNode;
  /**
   * Optional — not every module change points at a single addressable record.
   * A Vehicles/Bins/Workforce change almost always does (a plate, a bin, an
   * employee); a Plan Monitoring or Events change sometimes doesn't (a
   * schedule-wide recalculation, a global threshold change). Omit both when
   * there's no natural entity — the column renders the module context alone.
   */
  entityId?: string;
  entityLabel?: string;
  userName: string;
  userColor?: string;
  changeType: AuditChangeType;
  /**
   * Full narrative — for a System row this is the raw field-diff sentence
   * ("Updated last RFID timestamp from **X** to **Y** …"), shown ALL-CAPS
   * with bold values in Timeline view, where a wrapped multi-line sentence
   * reads fine. Human rows are already a short phrase, so `details` and
   * `summary` are typically identical for them.
   */
  details: string;
  /**
   * One-line scannable label for Table view (e.g. "RFID & weight timestamp
   * updated"). Table rows are 44px and must all stay that height — a raw
   * diff sentence wrapped across 3 lines broke that rhythm and read as
   * shouty ALL-CAPS clutter. Falls back to `details` when omitted.
   */
  summary?: string;
  attachments?: AuditAttachment[];
}

export interface CentralAuditLogProps {
  entries: AuditEntry[];
  organizations: { id: string; name: string }[];
  defaultOrgId?: string;
  /** ISO timestamp treated as "now" for Today/Yesterday grouping — pass a fixed value for deterministic demos. */
  nowIso?: string;
  onRowClick?: (entry: AuditEntry) => void;
  className?: string;
}

const CHANGE_TYPE_META: Record<AuditChangeType, { label: string; variant: 'success' | 'warning' | 'destructive'; icon: React.ReactNode; tone: string }> = {
  added: { label: 'Added', variant: 'success', icon: <Icons.PlusCircle size={12} />, tone: 'var(--status-success)' },
  modified: { label: 'Modified', variant: 'warning', icon: <Icons.Edit03 size={12} />, tone: 'var(--status-warning)' },
  deleted: { label: 'Deleted', variant: 'destructive', icon: <Icons.Trash01 size={12} />, tone: 'var(--status-error)' },
};

function UserAvatar({ name, color = 'var(--primary)', size = 28 }: { name: string; color?: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-caption font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
    >
      {initials || '—'}
    </span>
  );
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}, ${d.getFullYear()}`;
}
/** "Jul 24, 2026, 4:45 AM" — matches the per-entity Timeline's trailing timestamp exactly. */
function formatFullTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}
/** "Today" / "Yesterday" / "28 Oct, 2025" — same convention as the per-entity timeline. */
function dateGroupKey(iso: string, nowIso: string): string {
  const d = new Date(iso);
  const now = new Date(nowIso);
  const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.round((nowOnly - dOnly) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return formatFullDate(iso);
}

/** Automated field-diff entries ("SYSTEM UPDATED LAST RFID TIMESTAMP FROM…")
 *  are logged as actor "System" — the dominant entry type in production (see
 *  the real Vehicle Profile → Timeline tab), distinct from a person manually
 *  editing a record. Rendered with a neutral pencil marker (no tone color,
 *  no avatar) and an ALL-CAPS sentence — never invented for this mockup, a
 *  literal match of what ships today. */
function isSystemActor(name: string): boolean {
  return name.trim().toLowerCase() === 'system';
}

/** Inline `**bold**` segments (the before/after values in a system field-diff
 *  sentence render bold against a regular-weight sentence — see reference
 *  screenshot). Plain text passes through unchanged when there's no markup. */
function renderBoldSegments(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );
}
/** Plain-text version of a `**bold**`-marked sentence, for a native `title` tooltip. */
function stripBoldMarkup(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}

function AttachmentThumb({ name }: { name: string }) {
  return (
    <span
      title={name}
      className="grid size-12 shrink-0 place-items-center rounded-md border border-border bg-muted text-muted-foreground"
    >
      <Icons.Image01 size={16} />
    </span>
  );
}

const ALL = '__all__';

export function CentralAuditLog({ entries, organizations, defaultOrgId, nowIso, onRowClick, className }: CentralAuditLogProps) {
  const now = nowIso ?? new Date().toISOString();

  const [query, setQuery] = React.useState('');
  const [orgId, setOrgId] = React.useState(defaultOrgId ?? organizations[0]?.id ?? ALL);
  const [userFilter, setUserFilter] = React.useState(ALL);
  const [moduleSet, setModuleSet] = React.useState<Set<string>>(new Set());
  const [changeSet, setChangeSet] = React.useState<Set<AuditChangeType>>(new Set());
  const [attachmentsOnly, setAttachmentsOnly] = React.useState(false);
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [view, setView] = React.useState<'table' | 'timeline'>('table');

  const modules = React.useMemo(() => Array.from(new Set(entries.map((e) => e.module))).sort(), [entries]);
  const users = React.useMemo(() => Array.from(new Set(entries.map((e) => e.userName))).sort(), [entries]);

  const scoped = React.useMemo(() => entries.filter((e) => orgId === ALL || e.orgId === orgId), [entries, orgId]);

  // Facet counts reflect the org scope only (same as the per-entity panel's
  // static-looking Entry Type counts) — not recomputed per other active
  // filter, so picking one checkbox doesn't make the others jump around.
  const moduleCounts = React.useMemo(
    () => modules.map((m) => ({ key: m, count: scoped.filter((e) => e.module === m).length })),
    [modules, scoped],
  );
  const changeCounts = React.useMemo(
    () => (Object.keys(CHANGE_TYPE_META) as AuditChangeType[]).map((ct) => ({ key: ct, count: scoped.filter((e) => e.changeType === ct).length })),
    [scoped],
  );
  const attachmentsCount = React.useMemo(() => scoped.filter((e) => e.attachments?.length).length, [scoped]);

  const q = query.trim().toLowerCase();
  const data = React.useMemo(() => scoped.filter((e) => {
    if (moduleSet.size && !moduleSet.has(e.module)) return false;
    if (changeSet.size && !changeSet.has(e.changeType)) return false;
    if (attachmentsOnly && !e.attachments?.length) return false;
    if (userFilter !== ALL && e.userName !== userFilter) return false;
    if (fromDate && e.timestamp.slice(0, 10) < fromDate) return false;
    if (toDate && e.timestamp.slice(0, 10) > toDate) return false;
    if (q && !`${e.entityId ?? ''} ${e.entityLabel ?? ''} ${e.module} ${e.userName} ${e.details}`.toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => b.timestamp.localeCompare(a.timestamp)), [scoped, moduleSet, changeSet, attachmentsOnly, userFilter, fromDate, toDate, q]);

  // Every facet is its own toolbar-level control now — Module and Change
  // type as counted-checkbox dropdowns (same tier as Organization/User),
  // Attachments as a plain toggle (a single boolean isn't worth a popover).
  // No more generic catch-all "Filters" popover.
  const moduleFilterCount = moduleSet.size;
  const changeFilterCount = changeSet.size;
  const activeFilterCount = moduleFilterCount + changeFilterCount + (attachmentsOnly ? 1 : 0) + (userFilter !== ALL ? 1 : 0) + (fromDate ? 1 : 0) + (toDate ? 1 : 0);
  const moduleFilterLabel = moduleSet.size === 0 ? 'All modules' : moduleSet.size === 1 ? [...moduleSet][0] : `${moduleSet.size} modules`;
  const changeFilterLabel = changeSet.size === 0 ? 'All changes' : changeSet.size === 1 ? CHANGE_TYPE_META[[...changeSet][0]].label : `${changeSet.size} change types`;

  const resetFilters = () => {
    setModuleSet(new Set()); setChangeSet(new Set()); setAttachmentsOnly(false);
    setUserFilter(ALL); setFromDate(''); setToDate(''); setQuery('');
  };

  const kpis = React.useMemo(() => ({
    total: scoped.length,
    added: scoped.filter((e) => e.changeType === 'added').length,
    modified: scoped.filter((e) => e.changeType === 'modified').length,
    deleted: scoped.filter((e) => e.changeType === 'deleted').length,
  }), [scoped]);

  const toggleModule = (m: string) => setModuleSet((prev) => {
    const next = new Set(prev);
    next.has(m) ? next.delete(m) : next.add(m);
    return next;
  });
  const toggleChange = (ct: AuditChangeType) => setChangeSet((prev) => {
    const next = new Set(prev);
    next.has(ct) ? next.delete(ct) : next.add(ct);
    return next;
  });

  const columns: DataTableColumn<AuditEntry>[] = [
    {
      id: 'timestamp', header: 'Time', width: '90px', sortable: true,
      cell: (r) => <span className="font-mono text-body-xs text-muted-foreground">{formatClock(r.timestamp)}</span>,
    },
    {
      id: 'module', header: 'Module', width: '160px',
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-body-sm font-medium text-secondary-foreground">
          {r.moduleIcon}{r.module}
        </span>
      ),
    },
    {
      id: 'entity', header: 'ID', width: '160px',
      cell: (r) => r.entityId ? (
        <span className="flex flex-col">
          <span className="text-body-sm font-semibold text-foreground">{r.entityId}</span>
          {r.entityLabel ? <span className="text-body-xs text-muted-foreground">{r.entityLabel}</span> : null}
        </span>
      ) : (
        // No single addressable record (e.g. a schedule-wide Plan Monitoring
        // recalculation, a global Events threshold change) — the module
        // column already gives context, so this cell just stays empty.
        <span className="text-body-sm text-muted-foreground">—</span>
      ),
    },
    {
      id: 'user', header: 'User', width: '160px',
      cell: (r) => isSystemActor(r.userName) ? (
        <span className="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
          <span className="grid size-[26px] shrink-0 place-items-center rounded-full border border-border text-muted-foreground">
            <Icons.Edit03 size={13} />
          </span>
          System
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 text-body-sm text-foreground">
          <UserAvatar name={r.userName} color={r.userColor} size={26} />{r.userName}
        </span>
      ),
    },
    {
      id: 'changeType', header: 'Change type', width: '120px',
      cell: (r) => {
        const m = CHANGE_TYPE_META[r.changeType];
        return <Badge variant={m.variant} size="sm">{m.icon}{m.label}</Badge>;
      },
    },
    {
      id: 'details', header: 'Details', width: '260px',
      // A one-line scannable summary — every row stays 44px regardless of
      // actor type. The full ALL-CAPS field-diff sentence (System rows) or
      // longer note only shows in Timeline view, where there's room for it;
      // here it's a native `title` tooltip on hover so it's still one click
      // (well, one hover) away without breaking table rhythm.
      cell: (r) => (
        <span className="flex min-w-0 items-center gap-2 text-body-sm text-foreground" title={stripBoldMarkup(r.details)}>
          <span className="truncate">{r.summary ?? r.details}</span>
          {r.attachments?.length ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-caption text-muted-foreground">
              <Icons.Paperclip size={11} />{r.attachments.length}
            </span>
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-4 overflow-auto p-6', className)}>
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="flex items-center gap-2 text-h3 font-semibold text-foreground">
            <Icons.ClockRewind size={22} className="text-primary" />
            Central audit log
          </h1>
          <p className="text-body-sm text-muted-foreground">View all changes across the platform, scoped to one organization.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setView('table')}
              className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors',
                view === 'table' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              <Icons.Rows01 size={15} />Table
            </button>
            <button
              type="button"
              onClick={() => setView('timeline')}
              className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors',
                view === 'timeline' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              <Icons.ClockRewind size={15} />Timeline
            </button>
          </div>
          <Button variant="tertiary" size="sm"><Icons.Download01 size={15} />Export CSV</Button>
        </div>
      </div>

      {/* toolbar — every facet is its own visible control, no catch-all "Filters" popover */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <div className="relative w-[240px] max-w-full">
          <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ID, user, details…" className="pl-8" />
        </div>

        <Select value={orgId} onValueChange={setOrgId}>
          <SelectTrigger className="w-[190px]"><Icons.Building06 size={15} className="mr-1 text-muted-foreground" /><SelectValue placeholder="Organization" /></SelectTrigger>
          <SelectContent>
            {organizations.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="User" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All users</SelectItem>
            {users.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Module — a "major" filter, same toolbar tier as Organization/User,
            not buried inside a secondary popover. Still a counted-checkbox
            panel (a module change can span multiple modules at once, unlike
            Org/User which are single-select). */}
        <FilterPopup
          trigger={
            <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-body-sm font-medium text-foreground transition-colors hover:bg-muted">
              <Icons.LayoutAlt01 size={15} className="text-muted-foreground" />
              {moduleFilterLabel}
            </button>
          }
          title="Module"
          activeCount={moduleFilterCount}
          onClearAll={() => setModuleSet(new Set())}
        >
          <div className="flex flex-col gap-1.5">
            {moduleCounts.map(({ key, count }) => (
              <label key={key} className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 hover:bg-muted">
                <span className="flex items-center gap-2 text-body-sm text-foreground">
                  <Checkbox checked={moduleSet.has(key)} onCheckedChange={() => toggleModule(key)} />
                  {key}
                </span>
                <span className="text-caption text-muted-foreground">{count}</span>
              </label>
            ))}
          </div>
        </FilterPopup>

        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-body-sm font-medium text-foreground transition-colors hover:bg-muted">
              <Icons.CalendarDate size={15} className="text-muted-foreground" />
              {fromDate || toDate ? `${fromDate || '…'} → ${toDate || '…'}` : 'Date range'}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 space-y-3 p-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-semibold text-muted-foreground">From date</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-semibold text-muted-foreground">To date</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </PopoverContent>
        </Popover>

        {/* Change type — same tier as Module/Organization/User. */}
        <FilterPopup
          trigger={
            <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-body-sm font-medium text-foreground transition-colors hover:bg-muted">
              <Icons.Activity size={15} className="text-muted-foreground" />
              {changeFilterLabel}
            </button>
          }
          title="Change type"
          activeCount={changeFilterCount}
          onClearAll={() => setChangeSet(new Set())}
        >
          <div className="flex flex-col gap-1.5">
            {changeCounts.map(({ key, count }) => {
              const m = CHANGE_TYPE_META[key];
              return (
                <label key={key} className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 hover:bg-muted">
                  <span className="flex items-center gap-2 text-body-sm text-foreground">
                    <Checkbox checked={changeSet.has(key)} onCheckedChange={() => toggleChange(key)} />
                    <span style={{ color: m.tone }}>{m.icon}</span>{m.label}
                  </span>
                  <span className="text-caption text-muted-foreground">{count}</span>
                </label>
              );
            })}
          </div>
        </FilterPopup>

        {/* Attachments — a single boolean, so a plain toggle button rather
            than a popover just for one checkbox. */}
        <button
          type="button"
          onClick={() => setAttachmentsOnly((v) => !v)}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-body-sm font-medium transition-colors',
            attachmentsOnly ? 'border-primary bg-secondary text-secondary-foreground' : 'border-border text-foreground hover:bg-muted',
          )}
        >
          <Icons.Paperclip size={15} className={attachmentsOnly ? '' : 'text-muted-foreground'} />
          Attachments{attachmentsOnly ? null : ` (${attachmentsCount})`}
        </button>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <Icons.RefreshCcw01 size={14} />Reset ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total changes" value={kpis.total} icon={<Icons.ClockRewind size={20} />} tone="var(--primary)" />
        <KpiCard label="Added" value={kpis.added} icon={<Icons.PlusCircle size={20} />} tone="var(--status-success)" />
        <KpiCard label="Modified" value={kpis.modified} icon={<Icons.Edit03 size={20} />} tone="var(--status-warning)" />
        <KpiCard label="Deleted" value={kpis.deleted} icon={<Icons.Trash01 size={20} />} tone="var(--status-error)" />
      </div>

      {/* body — Table (grouped by day) or read-only Timeline */}
      <div className="min-h-0 flex-1">
        {view === 'table' ? (
          <DataTable
            manageColumns
            columns={columns}
            data={data}
            getRowId={(r) => r.id}
            onRowClick={onRowClick}
            stickyHeader
            groupBy={{ get: (r) => dateGroupKey(r.timestamp, now) }}
            emptyState={
              <EmptyState
                variant={activeFilterCount > 0 || q ? 'no-results' : 'no-data'}
                title={activeFilterCount > 0 || q ? 'No audit entries found' : 'No activity yet'}
                description={activeFilterCount > 0 || q ? 'Try adjusting your filters or date range and try again.' : 'Changes made across the platform will appear here.'}
                action={activeFilterCount > 0 || q ? <Button variant="tertiary" size="sm" onClick={resetFilters}>Clear all filters</Button> : undefined}
              />
            }
          />
        ) : (
          <AuditTimeline entries={data} now={now} onRowClick={onRowClick} activeFilterCount={activeFilterCount || (q ? 1 : 0)} onClear={resetFilters} />
        )}
      </div>
    </div>
  );
}

/**
 * Read-only date-grouped feed. Card-separated rows with a title line
 * (actor + short summary + trailing timestamp), an optional muted
 * description line (the fuller sentence — only shown when it says more than
 * the title), and a chip row (module, `#id`, change-type) below — inspired by
 * the FAMS Inbox notification list (title/description/chip structure, `#id`
 * reference chip, card-separated rows) rather than the single crammed
 * flex-wrap line this used to be. Not a copy: Inbox's unread dot, mention
 * highlighting, and severity flag don't apply to a read-only audit trail.
 */
function AuditTimeline({ entries, now, onRowClick, activeFilterCount, onClear }: { entries: AuditEntry[]; now: string; onRowClick?: (e: AuditEntry) => void; activeFilterCount: number; onClear: () => void }) {
  if (!entries.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-border bg-card">
        <EmptyState
          variant={activeFilterCount ? 'no-results' : 'no-data'}
          title={activeFilterCount ? 'No audit entries found' : 'No activity yet'}
          description={activeFilterCount ? 'Try adjusting your filters or date range and try again.' : 'Changes made across the platform will appear here.'}
          action={activeFilterCount ? <Button variant="tertiary" size="sm" onClick={onClear}>Clear all filters</Button> : undefined}
        />
      </div>
    );
  }

  let lastGroup: string | null = null;

  return (
    <div className="h-full overflow-auto rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-2">
        {entries.map((e) => {
          const group = dateGroupKey(e.timestamp, now);
          const showSep = group !== lastGroup;
          lastGroup = group;
          const m = CHANGE_TYPE_META[e.changeType];
          const system = isSystemActor(e.userName);
          const title = e.summary ?? e.details;
          // Only show the description line when it actually adds detail
          // beyond the title (system field-diffs; human rows are usually
          // already a single short phrase, so title === description there).
          const hasDescription = e.details !== title;

          return (
            <React.Fragment key={e.id}>
              {showSep && (
                <div className="flex justify-center py-0.5 first:pt-0">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-caption font-medium text-muted-foreground">{group}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => onRowClick?.(e)}
                className="flex items-start gap-2.5 rounded-lg border border-border p-3 text-left transition-colors hover:border-border-strong hover:bg-muted/50"
              >
                {system ? (
                  // Plain pencil marker, no tone color — the real system-log
                  // rows never color-code the marker by change type.
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-border text-muted-foreground">
                    <Icons.Edit03 size={13} />
                  </span>
                ) : (
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-border" style={{ color: m.tone }}>
                    {e.moduleIcon}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-body-sm">
                      <span className="font-semibold text-foreground">{system ? 'System' : e.userName}</span>
                      <span className="text-muted-foreground"> — {title}</span>
                    </span>
                    <span className="shrink-0 text-caption tabular-nums text-muted-foreground">{formatFullTimestamp(e.timestamp)}</span>
                  </div>
                  {hasDescription ? (
                    <p className="mt-0.5 text-body-sm text-muted-foreground">{renderBoldSegments(e.details)}</p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-caption text-muted-foreground">
                      {e.moduleIcon}{e.module}
                    </span>
                    {e.entityId ? (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-caption font-medium text-foreground">#{e.entityId}</span>
                    ) : null}
                    <Badge variant={m.variant} size="xs">{m.label}</Badge>
                  </div>
                  {e.attachments?.length ? (
                    <div className="mt-1.5 flex gap-1.5">
                      {e.attachments.map((a, i) => <AttachmentThumb key={i} name={a.name} />)}
                    </div>
                  ) : null}
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <span
        className="grid size-11 shrink-0 place-items-center rounded-full"
        style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}
      >
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="text-body-sm text-muted-foreground">{label}</span>
        <span className="text-h4 font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}
