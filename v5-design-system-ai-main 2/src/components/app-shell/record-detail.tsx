import * as React from 'react';
import { cn } from '../utils/cn';
import { Textarea, FloatingLabelInput } from '../primitives';
import { DateRangePicker } from '../basics';
import { LabeledSelect } from '../settings/field-select';
import type { IconType } from './types';

/* ── date helpers — ISO ("YYYY-MM-DD") in/out for `type: 'date'` fields
   (T-065 finding 3: mirrors the local-Date→ISO idiom products use alongside
   `DateRangePicker(mode="single")`, no `.toISOString()` UTC day-shift risk). */
const EDITABLE_FIELD_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isoToDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${EDITABLE_FIELD_MONTHS[m - 1]}, ${y}`;
}

function dateToISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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
  const labelText = typeof f.label === 'string' ? f.label : '';

  // T-088: text/number/select/date self-render their label INSIDE the box
  // (FloatingLabelInput/LabeledSelect/DateRangePicker's `field` variant) once
  // editable — no external caption above an active control. `textarea` keeps
  // the external caption (FloatingLabelInput's own spec: not for multi-line
  // boxes); the non-editable (read-only label/value) branch is unaffected —
  // that's a display, not a form control.
  if (editable && f.type !== 'textarea') {
    return (
      <div className={cn('min-w-0', className)}>
        {f.type === 'date' ? (
          // T-065 finding 3: never a native `<input type="date">` — the DS
          // ships DateRangePicker (mode="single") for exactly this. Value
          // stays an ISO ("YYYY-MM-DD") string in/out, unchanged contract.
          <DateRangePicker
            mode="single"
            field={{ label: labelText }}
            value={f.value ? isoToDisplayDate(f.value) : undefined}
            placeholder={f.placeholder ?? 'Select Date'}
            onApply={(r) => { if (r.start) onChange?.(f.key, dateToISO(r.start)); }}
            triggerClassName="h-14 rounded-md border-border bg-input-background"
          />
        ) : f.type === 'select' ? (
          <LabeledSelect
            label={labelText}
            value={(f.options ?? []).find((o) => o.value === f.value)?.label ?? ''}
            options={(f.options ?? []).map((o) => o.label)}
            onChange={(label) => {
              const picked = (f.options ?? []).find((o) => o.label === label);
              onChange?.(f.key, picked ? picked.value : label);
            }}
            placeholder={f.placeholder ?? 'Select…'}
          />
        ) : (
          <FloatingLabelInput
            label={labelText}
            type={f.type === 'number' ? 'number' : 'text'}
            value={f.value}
            placeholder={f.placeholder}
            onChange={(e) => onChange?.(f.key, e.target.value)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-caption uppercase tracking-wide text-muted-foreground">{f.label}</div>
      {!editable ? (
        <div className="mt-0.5 truncate text-body-sm font-medium text-foreground">{f.value || '—'}</div>
      ) : (
        <Textarea
          rows={2}
          value={f.value}
          placeholder={f.placeholder}
          onChange={(e) => onChange?.(f.key, e.target.value)}
          className="mt-1"
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
          {/* Unified field-role type: label = caption/medium (no uppercase — matches
              TaskInfoRow); value = body-sm/semibold (matches detail + list). */}
          <div className="text-caption font-medium text-muted-foreground">{f.label}</div>
          <div className="mt-0.5 truncate text-body-sm font-semibold text-foreground">{f.value ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}
