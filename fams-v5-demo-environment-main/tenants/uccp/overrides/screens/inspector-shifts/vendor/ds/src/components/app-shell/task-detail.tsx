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
    <div className="flex items-center gap-4">
      <p className="w-[140px] shrink-0 text-[12px] font-semibold leading-[14px] text-muted-foreground">{label}</p>
      <div className="flex min-w-0 flex-col items-start justify-center">
        {typeof value === 'string' || typeof value === 'number' ? (
          <p className="truncate text-[14px] font-semibold leading-4 text-foreground">{value}</p>
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
          <span className="whitespace-nowrap text-[14px] font-semibold text-foreground">{title}</span>
        </button>
        {headerRight}
      </div>
      {open ? <div className={cn('w-full', inset && 'px-4')}>{children}</div> : null}
    </section>
  );
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
          {isDate ? <CalendarIcon size={20} className="shrink-0 text-muted-foreground" /> : null}
          {editable && !hasValue ? (
            <div className="flex h-[42px] min-w-0 flex-1 flex-col justify-center">
              <input
                type={isDate ? 'date' : type === 'number' ? 'number' : 'text'}
                className="w-full bg-transparent text-[16px] font-semibold text-foreground outline-none placeholder:text-muted-foreground"
                value={value}
                placeholder={label}
                onChange={(e) => onChange?.(e.target.value)}
              />
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-[12px] font-semibold leading-[18px] text-muted-foreground">{label}</p>
              {editable ? (
                <input
                  type={isDate ? 'date' : type === 'number' ? 'number' : 'text'}
                  className="w-full bg-transparent text-[16px] font-semibold leading-6 text-foreground outline-none"
                  value={value}
                  onChange={(e) => onChange?.(e.target.value)}
                />
              ) : (
                <p className="truncate text-[16px] font-semibold leading-6 text-foreground">{value || '—'}</p>
              )}
            </div>
          )}
        </div>
      </div>
      {error ? <p className="text-[11px] font-medium text-destructive">{error}</p> : null}
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
      <p className="text-[12px] font-semibold leading-[14px] text-muted-foreground">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </p>
      <div className={cn('relative w-full rounded-[6px] border bg-card', error ? 'border-destructive' : 'border-border')}>
        <textarea
          className="w-full resize-y bg-transparent p-3 text-[14px] font-semibold text-foreground outline-none placeholder:text-muted-foreground"
          style={{ minHeight }}
          value={value}
          placeholder={placeholder}
          readOnly={!editable}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </div>
      {error ? <p className="text-[11px] font-medium text-destructive">{error}</p> : null}
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
      <p className="text-[12px] font-semibold leading-[14px] text-muted-foreground">{label}</p>
      <Switch checked={enabled} onCheckedChange={(v) => onToggle?.(v)} disabled={disabled} aria-label={String(label)} />
    </div>
  );
}

/* ── Read-only description with Show more/less gradient (demo) ────────── */

export function CollapsibleNote({ label = 'Description', text }: { label?: string; text: string }) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-[12px] font-semibold leading-[14px] text-muted-foreground">{label}</p>
      <div className="relative w-full rounded-[4px] border border-border bg-muted/40">
        <div className={cn('p-4', !show && 'max-h-[160px] overflow-hidden')}>
          <p className="whitespace-pre-wrap text-justify text-[14px] leading-[19px] text-muted-foreground">{text}</p>
        </div>
        {!show ? (
          <div className="pointer-events-none absolute bottom-0 left-0 h-[110px] w-full bg-gradient-to-b from-transparent to-card" />
        ) : null}
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 text-[14px] font-semibold text-foreground"
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
      <p className="text-[12px] font-semibold leading-[14px] text-muted-foreground">Attachments</p>
      <div
        className={cn(
          'flex h-[54px] w-full items-center justify-center gap-1.5 rounded-[6px] border border-dashed border-border bg-muted/30',
          disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-primary/50'
        )}
      >
        <UploadCloud02 size={16} className="text-muted-foreground" />
        <p className="text-[14px] text-muted-foreground">
          Drop files to attach or <span className="font-semibold text-primary">browse</span>
        </p>
      </div>
    </div>
  );
}

/* ── TaskDetail root ──────────────────────────────────────────────────── */

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
  /** The two-column horizontal InfoRow grid under the title. */
  details: { left: TaskInfoRowDef[]; right: TaskInfoRowDef[] };
  /** Right timeline/comments panel (ActivityFeed). Collapsible. */
  timeline?: React.ReactNode;
  timelineTitle?: React.ReactNode;
  /** Main-column sections (TaskSection stack). */
  children?: React.ReactNode;
  className?: string;
}

export function TaskDetail({
  ticketId,
  moduleLabel,
  title,
  status,
  cancel,
  details,
  timeline,
  timelineTitle = 'Timeline',
  children,
  className,
}: TaskDetailProps) {
  const [timelineOpen, setTimelineOpen] = React.useState(true);
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
                  <span className="text-[14px] font-semibold text-muted-foreground">{ticketId}</span>
                </span>
                {moduleLabel ? (
                  <span className="-ml-px flex h-[26px] items-center gap-1 rounded-r-[3px] border border-border bg-card px-2">
                    <AlertTriangle size={12} className="text-muted-foreground" />
                    <span className="text-[14px] font-semibold uppercase text-muted-foreground">{moduleLabel}</span>
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {cancel ? (
                  <button
                    type="button"
                    onClick={() => { setCancelReason(''); setCancelOpen(true); }}
                    className="flex items-center rounded-[4px] border border-destructive/30 px-2 py-1 text-[11px] font-semibold text-destructive transition-colors hover:bg-destructive/5"
                  >
                    {cancel.label ?? 'Cancel WO'}
                  </button>
                ) : null}
                {status}
              </div>
            </div>
            <h2 className="w-full whitespace-pre-wrap text-[26px] font-semibold leading-snug text-foreground">{title}</h2>

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

          {children}
        </div>
      </div>

      {/* ── Collapse divider ────────────────────────────────────────── */}
      {timeline ? (
        <button
          type="button"
          aria-label={timelineOpen ? 'Collapse timeline' : 'Expand timeline'}
          onClick={() => setTimelineOpen((v) => !v)}
          className="flex w-[40px] shrink-0 items-start justify-center border-l border-border bg-card py-[27px] text-muted-foreground outline-none transition-colors hover:text-foreground"
        >
          <ChevronRightDouble size={20} className={cn('transition-transform', !timelineOpen && 'rotate-180')} />
        </button>
      ) : null}

      {/* ── Timeline panel ──────────────────────────────────────────── */}
      {timeline && timelineOpen ? (
        <aside className="flex w-[clamp(320px,26vw,400px)] shrink-0 flex-col border-l border-border bg-background">
          <div className="shrink-0 border-b border-border px-4 py-3 text-[14px] font-semibold text-foreground">
            {timelineTitle}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-4">{timeline}</div>
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
