import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Hash02,
  AlertTriangle,
  ChevronRightDouble,
  Calendar as CalendarIcon,
  UploadCloud02,
} from '../../icons';
import { cn } from '../utils/cn';
import { Switch, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Textarea } from '../primitives';
import { DateRangePicker } from '../basics';

/**
 * TaskDetail — FAITHFUL adaptation of the Truemax/Ducon ticket-detail layout
 * (the Figma Make design), section for section:
 *
 *   ┌──────────────────────────────────────────────┬──┬──────────────┐
 *   │ [# WO-1001][⚠ MAINTENANCE]   [Cancel WO][STATUS▾] │  │  Timeline    │
 *   │ Title (26px semibold)                        │‹‹│  (comments,  │
 *   │ label——————value   label——————value          │  │   composer)  │
 *   │ ▸ Asset Details   ▸ Parts Used   ▸ Checklist │  │              │
 *   │ ▸ Maintenance Report (boxed fields, toggle,  │  │              │
 *   │   textareas, attachments, description)       │  │              │
 *   └──────────────────────────────────────────────┴──┴──────────────┘
 *
 * Horizontal InfoRows (muted 12px label at fixed 140px + 14px semibold
 * value), chevron section headers, boxed fields with INTERNAL labels,
 * a collapse divider in front of the right timeline panel, and the
 * Cancel-with-reason dialog.
 */

/* ── InfoRow — horizontal label/value (label fixed 140px) ─────────────── */

export interface TaskInfoRowDef {
  label: React.ReactNode;
  value: React.ReactNode;
}

export function TaskInfoRow({ label, value }: TaskInfoRowDef) {
  return (
    <div className="flex items-start gap-4">
      {/* T-065 finding 1: a FIXED 140px label ate most of a narrow (~220–290px)
          two-column grid, leaving so little room for the value that
          single-line `truncate` HID THE TAIL of dates/ranges ("2026-07-06 →
          202…" — the end date invisible) and long names (Camp/Project). Fix:
          the label shrinks to its own content (`w-fit` + a small min, not a
          fixed 140px) so the value gets the remainder. */}
      <p className="w-fit min-w-[56px] shrink-0 whitespace-nowrap text-caption font-medium leading-[14px] text-muted-foreground">{label}</p>
      <div className="flex min-w-0 w-full flex-col items-start justify-center">
        {typeof value === 'string' || typeof value === 'number' ? (
          // `w-full` is required here — this div's parent `items-start` (cross-axis
          // start alignment, needed so a ReactNode value like a badge isn't
          // force-stretched) otherwise leaves a block child sized to its own
          // CONTENT rather than the shrunk flex column, so wrapping never
          // engages and the text visually spills into the next InfoRow column
          // (T-065 finding 2). Belt-and-braces: a value that STILL doesn't fit
          // after the label shrink wraps to up to 2 lines (`line-clamp-2` +
          // `break-words`) instead of single-line-truncating — a date range
          // must show its FULL text (across two lines if needed), never a
          // hidden tail. `title` carries the full value as a tooltip too
          // (ContractCard truncation idiom, T-056).
          <p className="line-clamp-2 w-full break-words text-body-sm font-semibold leading-4 text-foreground" title={String(value)}>{value}</p>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

/* ── Section — chevron header, optional right slot, collapsible ───────── */

export function TaskSection({
  title,
  headerRight,
  defaultOpen = true,
  inset = true,
  children,
  className,
}: {
  title: React.ReactNode;
  headerRight?: React.ReactNode;
  defaultOpen?: boolean;
  /** Indent the body like the demo (px-4). */
  inset?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section className={cn('flex w-full flex-col gap-3', className)}>
      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 outline-none"
        >
          <ChevronDown
            size={14}
            className={cn('text-muted-foreground transition-transform', !open && '-rotate-90')}
          />
          <span className="whitespace-nowrap text-body-sm font-semibold text-foreground">{title}</span>
        </button>
        {headerRight}
      </div>
      {open ? <div className={cn('w-full', inset && 'px-4')}>{children}</div> : null}
    </section>
  );
}

/* ── date helpers — ISO ("YYYY-MM-DD") in/out for BoxedField's date type ──
   (T-065 finding 3: mirrors the local-Date→ISO idiom products use alongside
   `DateRangePicker(mode="single")`, no `.toISOString()` UTC day-shift risk.) */

const BOXED_FIELD_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isoToDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${BOXED_FIELD_MONTHS[m - 1]}, ${y}`;
}

function dateToISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ── BoxedField — the demo's EditableField (internal label, 16px value) ── */

export function BoxedField({
  label,
  value,
  editable,
  onChange,
  error,
  type = 'text',
}: {
  label: string;
  value: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  error?: string;
  type?: 'text' | 'number' | 'date';
}) {
  const hasValue = value.length > 0;
  const isDate = type === 'date';
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <div className={cn('relative w-full rounded-[6px] border bg-card', error ? 'border-destructive' : 'border-border')}>
        <div className="flex items-center gap-2 px-3 py-2">
          {isDate && !editable ? <CalendarIcon size={20} className="shrink-0 text-muted-foreground" /> : null}
          {editable && isDate ? (
            // T-065 finding 3: never a native `<input type="date">` — the DS
            // ships DateRangePicker(mode="single") for exactly this. Its own
            // trigger already renders a calendar icon, so BoxedField's icon is
            // suppressed above for the editable-date case (no duplicate).
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-caption font-medium leading-[18px] text-muted-foreground">{label}</p>
              <DateRangePicker
                mode="single"
                value={hasValue ? isoToDisplayDate(value) : undefined}
                placeholder="Select Date"
                onApply={(r) => { if (r.start) onChange?.(dateToISO(r.start)); }}
                triggerClassName="h-auto w-full justify-between gap-2 border-0 bg-transparent p-0 text-body-sm font-semibold leading-6 text-foreground hover:bg-transparent"
              />
            </div>
          ) : editable && !hasValue ? (
            <div className="flex h-[42px] min-w-0 flex-1 flex-col justify-center">
              <input
                type={type === 'number' ? 'number' : 'text'}
                className="w-full bg-transparent text-body-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
                value={value}
                placeholder={label}
                onChange={(e) => onChange?.(e.target.value)}
              />
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-caption font-medium leading-[18px] text-muted-foreground">{label}</p>
              {editable ? (
                <input
                  type={type === 'number' ? 'number' : 'text'}
                  className="w-full bg-transparent text-body-sm font-semibold leading-6 text-foreground outline-none"
                  value={value}
                  onChange={(e) => onChange?.(e.target.value)}
                />
              ) : (
                <p className="truncate text-body-sm font-semibold leading-6 text-foreground">{value || '—'}</p>
              )}
            </div>
          )}
        </div>
      </div>
      {error ? <p className="text-caption font-medium text-destructive">{error}</p> : null}
    </div>
  );
}

/* ── BoxedTextarea — labeled textarea with required mark + error border ── */

export function BoxedTextarea({
  label,
  required,
  value,
  editable = true,
  onChange,
  error,
  placeholder,
  minHeight = 80,
}: {
  label: React.ReactNode;
  required?: boolean;
  value: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  error?: string;
  placeholder?: string;
  minHeight?: number;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-caption font-medium leading-[14px] text-muted-foreground">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </p>
      <div className={cn('relative w-full rounded-[6px] border bg-card', error ? 'border-destructive' : 'border-border')}>
        <textarea
          className="w-full resize-y bg-transparent p-3 text-body-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
          style={{ minHeight }}
          value={value}
          placeholder={placeholder}
          readOnly={!editable}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </div>
      {error ? <p className="text-caption font-medium text-destructive">{error}</p> : null}
    </div>
  );
}

/* ── ToggleRow — muted label + switch (Downtime Tracking) ─────────────── */

export function TaskToggleRow({
  label,
  enabled,
  onToggle,
  disabled,
}: {
  label: React.ReactNode;
  enabled: boolean;
  onToggle?: (on: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex w-full items-center justify-between">
      <p className="text-caption font-medium leading-[14px] text-muted-foreground">{label}</p>
      <Switch checked={enabled} onCheckedChange={(v) => onToggle?.(v)} disabled={disabled} aria-label={String(label)} />
    </div>
  );
}

/* ── Read-only description with Show more/less gradient (demo) ────────── */

export function CollapsibleNote({ label = 'Description', text }: { label?: string; text: string }) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-caption font-medium leading-[14px] text-muted-foreground">{label}</p>
      <div className="relative w-full rounded-[4px] border border-border bg-muted/40">
        <div className={cn('p-4', !show && 'max-h-[160px] overflow-hidden')}>
          <p className="whitespace-pre-wrap text-justify text-body-sm leading-[19px] text-muted-foreground">{text}</p>
        </div>
        {!show ? (
          <div className="pointer-events-none absolute bottom-0 left-0 h-[110px] w-full bg-gradient-to-b from-transparent to-card" />
        ) : null}
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 text-body-sm font-semibold text-foreground"
        >
          {show ? 'Show less' : 'Show more'}
          <ChevronDown size={14} className={cn('transition-transform', show && 'rotate-180')} />
        </button>
      </div>
    </div>
  );
}

/* ── Attachments dropzone strip (visual, demo-style) ──────────────────── */

export function AttachmentDrop({ disabled }: { disabled?: boolean }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-caption font-medium leading-[14px] text-muted-foreground">Attachments</p>
      <div
        className={cn(
          'flex h-[54px] w-full items-center justify-center gap-1.5 rounded-[6px] border border-dashed border-border bg-muted/30',
          disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-primary/50'
        )}
      >
        <UploadCloud02 size={16} className="text-muted-foreground" />
        <p className="text-body-sm text-muted-foreground">
          Drop files to attach or <span className="font-semibold text-primary">browse</span>
        </p>
      </div>
    </div>
  );
}

/* ── TaskDetail root ──────────────────────────────────────────────────── */

/** One sub-tab of the right panel (Pass 2, Trip Management — "Trip Timeline"
 *  Trip Info / Alarms / All logs). Additive to the single `timeline` slot:
 *  when `rightPanelTabs` is provided it takes over the right panel entirely
 *  (a tab strip + the active tab's `render()`); existing single-panel
 *  consumers (`timeline`/`timelineTitle`) are completely unaffected. */
export interface TaskDetailRightTab {
  id: string;
  label: React.ReactNode;
  render: () => React.ReactNode;
}

/** A collapsible data group in the main column (Asset Details, Issue Details,
 *  Schedule Info, Maintenance Report, Vehicle, Linked, …). Which groups appear is
 *  the CONSUMER's call — pass a different set per stage for stage-adaptive detail
 *  (Figma 29893-15990/13689: Reported→Asset+Issue; Under-Inspection→Schedule+Report).
 *  This is where structured data lives — NOT as extra right-panel tabs. */
export interface TaskDetailGroup {
  id: string;
  title: React.ReactNode;
  icon?: React.ReactNode;
  /** Open on mount. Default true. */
  defaultOpen?: boolean;
  /** Two-column labeled fields (row-major: [0]=left,[1]=right,[2]=left,…). */
  fields?: TaskInfoRowDef[];
  /** Arbitrary content (Notes, Attachments, a table) — used when `fields` is omitted. */
  content?: React.ReactNode;
}

export interface TaskDetailProps {
  /** "#" pill content (the WO / ticket id). */
  ticketId: React.ReactNode;
  /** Second joined pill (module context, rendered UPPERCASE). */
  moduleLabel?: React.ReactNode;
  title: React.ReactNode;
  /** Status control (StatusTransitionDropdown) — top right. */
  status?: React.ReactNode;
  /** Red-outline Cancel button + reason dialog (hidden when omitted). */
  cancel?: {
    label?: string;
    dialogTitle?: string;
    description?: string;
    onConfirm: (reason: string) => void;
  };
  /** The two-column horizontal InfoRow grid under the title (the always-on summary). */
  details: { left: TaskInfoRowDef[]; right: TaskInfoRowDef[] };
  /** Stage-adaptive collapsible data groups shown below the summary (Asset/Issue/
   *  Schedule/Report/Vehicle/…). Pass a different set per stage. */
  groups?: TaskDetailGroup[];
  /** Right timeline/comments panel (ActivityFeed). Collapsible. Ignored when
   *  `rightPanelTabs` is provided. */
  timeline?: React.ReactNode;
  timelineTitle?: React.ReactNode;
  /** Right panel as a set of sub-tabs (Trip Info / Alarms / All logs, …) —
   *  takes precedence over `timeline`/`timelineTitle` when set. */
  rightPanelTabs?: TaskDetailRightTab[];
  /** Initial active tab id (defaults to the first). */
  defaultRightTab?: string;
  /** Main-column sections (TaskSection stack). */
  children?: React.ReactNode;
  className?: string;
}

/** Collapsible data group — chevron + title header; expanded shows a two-column
 *  field grid (row-major) or arbitrary `content`. */
function TaskGroupSection({ group }: { group: TaskDetailGroup }) {
  const [open, setOpen] = React.useState(group.defaultOpen ?? true);
  const left = (group.fields ?? []).filter((_, i) => i % 2 === 0);
  const right = (group.fields ?? []).filter((_, i) => i % 2 === 1);
  return (
    <div className="w-full border-b border-border pb-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-sm py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronDown size={16} className={cn('shrink-0 text-muted-foreground transition-transform', !open && '-rotate-90')} />
        {group.icon ? <span className="shrink-0 text-muted-foreground [&>svg]:size-4">{group.icon}</span> : null}
        <span className="text-body-sm font-semibold text-foreground">{group.title}</span>
      </button>
      {open ? (
        <div className="mt-3">
          {group.fields?.length ? (
            <div className="flex w-full flex-wrap items-start gap-x-8 gap-y-5">
              <div className="flex min-w-[220px] flex-1 basis-[220px] flex-col gap-5">
                {left.map((d, i) => <TaskInfoRow key={i} {...d} />)}
              </div>
              <div className="flex min-w-[220px] flex-1 basis-[220px] flex-col gap-5">
                {right.map((d, i) => <TaskInfoRow key={i} {...d} />)}
              </div>
            </div>
          ) : group.content}
        </div>
      ) : null}
    </div>
  );
}

export function TaskDetail({
  ticketId,
  moduleLabel,
  title,
  status,
  cancel,
  details,
  groups,
  timeline,
  timelineTitle = 'Timeline',
  rightPanelTabs,
  defaultRightTab,
  children,
  className,
}: TaskDetailProps) {
  const [timelineOpen, setTimelineOpen] = React.useState(true);
  const [activeRightTab, setActiveRightTab] = React.useState(defaultRightTab ?? rightPanelTabs?.[0]?.id);
  const activeTab = rightPanelTabs?.find((t) => t.id === activeRightTab) ?? rightPanelTabs?.[0];
  const hasRightPanel = !!(rightPanelTabs?.length || timeline);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');

  return (
    <div className={cn('flex h-full min-h-0 items-stretch', className)}>
      {/* ── Main column ─────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1 overflow-y-auto bg-card">
        <div className="flex w-full flex-col gap-8 p-6">
          {/* Header block */}
          <div className="flex w-full flex-col gap-4">
            <div className="flex h-[26px] w-full items-center justify-between">
              {/* Joined pill group: [# id][⚠ MODULE] */}
              <div className="flex items-center">
                <span className="flex h-[26px] items-center gap-1 rounded-l-[3px] border border-border bg-card px-2">
                  <Hash02 size={12} className="text-muted-foreground" />
                  <span className="text-body-sm font-semibold text-muted-foreground">{ticketId}</span>
                </span>
                {moduleLabel ? (
                  <span className="-ml-px flex h-[26px] items-center gap-1 rounded-r-[3px] border border-border bg-card px-2">
                    <AlertTriangle size={12} className="text-muted-foreground" />
                    <span className="text-body-sm font-semibold uppercase text-muted-foreground">{moduleLabel}</span>
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {cancel ? (
                  <button
                    type="button"
                    onClick={() => { setCancelReason(''); setCancelOpen(true); }}
                    className="flex items-center rounded-[4px] border border-destructive/30 px-2 py-1 text-caption font-semibold text-destructive transition-colors hover:bg-destructive/5"
                  >
                    {cancel.label ?? 'Cancel WO'}
                  </button>
                ) : null}
                {status}
              </div>
            </div>
            <h2 className="w-full whitespace-pre-wrap text-h5 font-semibold leading-snug text-foreground">{title}</h2>

            {/* Details — two columns of horizontal InfoRows, bottom border.
                Wraps to a single stacked column when the surface is narrow
                (e.g. the side-sheet) so the fixed-width labels never collide. */}
            <div className="flex w-full flex-wrap items-start gap-x-8 gap-y-5 border-b border-border pb-4">
              <div className="flex min-w-[220px] flex-1 basis-[220px] flex-col gap-5">
                {details.left.map((d, i) => (
                  <TaskInfoRow key={i} {...d} />
                ))}
              </div>
              <div className="flex min-w-[220px] flex-1 basis-[220px] flex-col gap-5">
                {details.right.map((d, i) => (
                  <TaskInfoRow key={i} {...d} />
                ))}
              </div>
            </div>
          </div>

          {/* Stage-adaptive collapsible data groups (Asset/Issue/Schedule/Report/…) */}
          {groups?.length ? (
            <div className="flex w-full flex-col gap-5">
              {groups.map((g) => <TaskGroupSection key={g.id} group={g} />)}
            </div>
          ) : null}

          {children}
        </div>
      </div>

      {/* ── Collapse divider ────────────────────────────────────────── */}
      {hasRightPanel ? (
        <button
          type="button"
          aria-label={timelineOpen ? 'Collapse timeline' : 'Expand timeline'}
          onClick={() => setTimelineOpen((v) => !v)}
          className="flex w-[40px] shrink-0 items-start justify-center border-l border-border bg-card py-[27px] text-muted-foreground outline-none transition-colors hover:text-foreground"
        >
          <ChevronRightDouble size={20} className={cn('transition-transform', !timelineOpen && 'rotate-180')} />
        </button>
      ) : null}

      {/* ── Right panel — either a set of sub-tabs (Pass 2, "Trip Timeline":
          Trip Info / Alarms / All logs) or the single `timeline` slot ─── */}
      {hasRightPanel && timelineOpen ? (
        <aside className="flex w-[clamp(320px,26vw,400px)] shrink-0 flex-col border-l border-border bg-background">
          {rightPanelTabs?.length ? (
            <div className="flex shrink-0 items-center gap-4 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
              {rightPanelTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab?.id === t.id}
                  onClick={() => setActiveRightTab(t.id)}
                  className={cn(
                    'whitespace-nowrap border-b-2 py-3 text-body-sm font-semibold outline-none transition-colors',
                    activeTab?.id === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="shrink-0 border-b border-border px-4 py-3 text-body-sm font-semibold text-foreground">
              {timelineTitle}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-hidden p-4">
            {rightPanelTabs?.length ? activeTab?.render() : timeline}
          </div>
        </aside>
      ) : null}

      {/* ── Cancel dialog ───────────────────────────────────────────── */}
      {cancel ? (
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent className="max-w-[400px]">
            <DialogHeader>
              <DialogTitle>{cancel.dialogTitle ?? 'Cancel Work Order'}</DialogTitle>
              <DialogDescription>
                {cancel.description ??
                  'This will stop any active downtime timers and release reserved parts back to inventory.'}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              autoFocus
              rows={3}
              placeholder="Reason for cancellation…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <DialogFooter>
              <Button type="button" variant="tertiary" onClick={() => setCancelOpen(false)}>
                Keep Open
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!cancelReason.trim()}
                onClick={() => { cancel.onConfirm(cancelReason.trim()); setCancelOpen(false); }}
              >
                {cancel.label ?? 'Cancel WO'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
