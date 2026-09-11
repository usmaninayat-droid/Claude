import * as React from 'react';
import { cn } from '../utils/cn';
import { Input, Textarea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../primitives';
import type { IconType } from './types';

/**
 * RecordDetail — a polished two-column record layout for the DetailSheet body,
 * matching the demo detail screens (Truemax ticket-detail, Cement order-detail):
 * a header (icon · category · title · subtitle · status · meta · actions) then a
 * main column of sections + a sticky aside. Compose with `DetailSection`,
 * `FieldGrid`, and DS pieces (Timeline, EntityProfileCard, StatePill…).
 */

export interface RecordDetailProps {
  icon?: IconType;
  category?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Status pill node (e.g. <StatePill .../>). */
  status?: React.ReactNode;
  /** Badge/meta row under the title (priority, type, dates…). */
  meta?: React.ReactNode;
  /** Right-aligned header actions (buttons / StateTransitionToolbar). */
  actions?: React.ReactNode;
  /** Sticky right column (profile card, key facts, payment…). */
  aside?: React.ReactNode;
  /** Main column content — typically a stack of <DetailSection>. */
  children: React.ReactNode;
  className?: string;
}

export function RecordDetail({
  icon: Icon,
  category,
  title,
  subtitle,
  status,
  meta,
  actions,
  aside,
  children,
  className,
}: RecordDetailProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-card px-6 py-5">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
              <Icon size={18} />
            </span>
          ) : null}
          <div className="min-w-0">
            {category ? (
              <div className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{category}</div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-h6 font-semibold text-foreground">{title}</h2>
              {status}
            </div>
            {subtitle ? <div className="mt-0.5 text-body-sm text-muted-foreground">{subtitle}</div> : null}
            {meta ? <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>

      {/* Body — main + sticky aside */}
      <div className={cn('grid gap-6 p-6', aside ? 'lg:grid-cols-[1fr_320px]' : 'grid-cols-1')}>
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
        {aside ? (
          <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">{aside}</aside>
        ) : null}
      </div>
    </div>
  );
}

/* A titled card section for the main column. */
export function DetailSection({
  title,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-lg border border-border bg-card', className)}>
      {title ? (
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h3 className="text-body-sm font-semibold text-foreground">{title}</h3>
          {actions}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

/* ── EditableField — the demos' two-state field rendering ─────────────── */

export interface EditableFieldDef {
  key: string;
  label: React.ReactNode;
  value: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'select';
  options?: { label: string; value: string }[];
  placeholder?: string;
}

/**
 * EditableField — renders as a read-only label/value when `editable` is
 * false (closed/locked stages) and as an inline input otherwise. The stage
 * machine decides; the field just obeys.
 */
export function EditableField({
  field: f,
  editable,
  onChange,
  className,
}: {
  field: EditableFieldDef;
  editable?: boolean;
  onChange?: (key: string, value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-caption uppercase tracking-wide text-muted-foreground">{f.label}</div>
      {!editable ? (
        <div className="mt-0.5 truncate text-body-sm font-medium text-foreground">{f.value || '—'}</div>
      ) : f.type === 'textarea' ? (
        <Textarea
          rows={2}
          value={f.value}
          placeholder={f.placeholder}
          onChange={(e) => onChange?.(f.key, e.target.value)}
          className="mt-1"
        />
      ) : f.type === 'select' ? (
        <Select value={f.value} onValueChange={(v) => onChange?.(f.key, v)}>
          <SelectTrigger className="mt-1 h-8">
            <SelectValue placeholder={f.placeholder ?? 'Select…'} />
          </SelectTrigger>
          <SelectContent>
            {(f.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
          value={f.value}
          placeholder={f.placeholder}
          onChange={(e) => onChange?.(f.key, e.target.value)}
          className="mt-1 h-8"
        />
      )}
    </div>
  );
}

/** A grid of EditableFields — drop-in replacement for FieldGrid when the
 *  record's stage allows editing. */
export function EditableFieldGrid({
  fields,
  editable,
  onChange,
  columns = 3,
  className,
}: {
  fields: EditableFieldDef[];
  editable?: boolean;
  onChange?: (key: string, value: string) => void;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn('grid gap-x-4 gap-y-3', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {fields.map((f) => (
        <EditableField key={f.key} field={f} editable={editable} onChange={onChange} />
      ))}
    </div>
  );
}

/* A responsive label/value grid for record fields. */
export function FieldGrid({
  fields,
  columns = 2,
  className,
}: {
  fields: { label: React.ReactNode; value: React.ReactNode }[];
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn('grid gap-x-4 gap-y-3', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {fields.map((f, i) => (
        <div key={i} className="min-w-0">
          <div className="text-caption uppercase tracking-wide text-muted-foreground">{f.label}</div>
          <div className="mt-0.5 truncate text-body-sm font-medium text-foreground">{f.value ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}
