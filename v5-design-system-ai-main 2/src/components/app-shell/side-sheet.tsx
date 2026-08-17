import * as React from 'react';
import { X, Minus, Plus, FileText, Search, Check, ChevronDown } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '../primitives';
import { Textarea, Label, Button, Switch, FloatingLabelInput } from '../primitives';
import { Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { DateRangePicker } from '../basics';
import { LabeledSelect } from '../settings/field-select';
import { cn } from '../utils/cn';
import type { IconType } from './types';

/* ── date helpers — ISO ("YYYY-MM-DD") in/out for `type: 'date'` FormFields
   (T-065 finding 3: mirrors the local-Date→ISO idiom products use alongside
   `DateRangePicker(mode="single")`, no `.toISOString()` UTC day-shift risk). */
const SCHEMA_FORM_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isoToDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${SCHEMA_FORM_MONTHS[m - 1]}, ${y}`;
}

function dateToISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Side sheets — the AppShell's right-slide-in surfaces.
 *
 * - `DetailSheet` — wide; opens a record's full detail on top of the module
 *   (list/board stays visible behind a backdrop). Header is a browser-tab strip
 *   with macOS traffic-light controls + a `+` to open a new record. Multiple
 *   open records become tabs.
 * - `FormSheet` — narrower, chrome-less; a focused create/edit surface with a
 *   single floating close button to the left of the panel.
 *
 * Both wrap the design-system `Sheet` (Radix Dialog → overlay, blur, focus-trap,
 * Esc-to-close, slide animation).
 */

/* ════════════════════════════════ DetailSheet ════════════════════════════ */

export interface DetailSheetTab {
  id: string;
  label: React.ReactNode;
  category?: React.ReactNode;
  icon?: IconType;
}

export interface DetailSheetProps {
  open: boolean;
  /** Fired on Esc / overlay click — treated as a MINIMIZE (tabs are preserved). */
  onOpenChange: (open: boolean) => void;
  tabs: DetailSheetTab[];
  activeId?: string;
  onTabClick: (id: string) => void;
  onCloseTab: (id: string) => void;
  /** Close-all (red control) — clears every tab for the module. */
  onCloseAll?: () => void;
  /** Minimize (amber control) — hides the sheet but keeps the module's tabs. */
  onMinimize?: () => void;
  onAdd?: () => void;
  width?: string;
  children: React.ReactNode;
}

export function DetailSheet({
  open,
  onOpenChange,
  tabs,
  activeId,
  onTabClick,
  onCloseTab,
  onCloseAll,
  onMinimize,
  onAdd,
  width = 'min(1100px, 94vw)',
  children,
}: DetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" hideClose width={width} className="gap-0 p-0">
        <SheetTitle className="sr-only">
          {tabs.find((t) => t.id === activeId)?.label ?? 'Record details'}
        </SheetTitle>
        <SheetDescription className="sr-only">Record detail side sheet</SheetDescription>
        {/* Header — Figma DS V2 detail top nav (6995:455): close-all + minimize
            controls, then a bordered browser-tab strip + add. */}
        <div className="flex h-12 shrink-0 items-stretch border-b border-border bg-background" style={{ backgroundColor: 'var(--background)' }}>
          <div className="flex items-center gap-2 px-6">
            <button
              type="button"
              aria-label="Close all tabs"
              onClick={() => (onCloseAll ? onCloseAll() : onOpenChange(false))}
              className="grid size-4 place-items-center rounded-full text-black/55 transition hover:brightness-90"
              style={{ background: '#FF5F57' }} // coherence-allow — decorative window-chrome dots
            >
              <X size={10} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              aria-label="Minimize"
              onClick={() => (onMinimize ? onMinimize() : onOpenChange(false))}
              className="grid size-4 place-items-center rounded-full text-black/55 transition hover:brightness-90"
              style={{ background: '#FFBD2E' }} // coherence-allow — decorative window-chrome dots
            >
              <Minus size={10} strokeWidth={2.5} />
            </button>
          </div>

          {/* Browser-style tabs: no scroll. As more tabs open the inactive ones
              flex-shrink + truncate (full label on hover via title tooltip); the
              active tab keeps its (bounded) full width. */}
          <div className="flex min-w-0 flex-1 items-stretch overflow-hidden">
            {tabs.map((t) => {
              const Icon = t.icon ?? FileText;
              const active = t.id === activeId;
              return (
                <div
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  title={typeof t.label === 'string' ? t.label : undefined}
                  onClick={() => onTabClick(t.id)}
                  className={cn(
                    'group -mr-px flex cursor-pointer items-center gap-3 border-l border-r border-border px-3 py-1 transition-colors',
                    active
                      ? 'max-w-[280px] shrink-0 bg-card'
                      : 'min-w-0 flex-1 basis-0 bg-transparent hover:bg-muted/60',
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Icon size={16} className={cn('shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                    <div className="flex min-w-0 flex-col justify-center leading-tight">
                      {t.category ? (
                        <span
                          className="truncate text-caption font-semibold leading-[14px] text-muted-foreground"
                          style={{ opacity: active ? 1 : 0.7 }}
                        >
                          {t.category}
                        </span>
                      ) : null}
                      <span
                        className="truncate text-caption font-semibold leading-[18px]"
                        style={{ color: active ? 'var(--card-foreground)' : 'var(--muted-foreground)' }}
                      >
                        {t.label}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close tab"
                    onClick={(e) => { e.stopPropagation(); onCloseTab(t.id); }}
                    className="ml-auto grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {onAdd ? (
            <button
              type="button"
              aria-label="New record"
              onClick={onAdd}
              className="my-auto ml-1 grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus size={18} />
            </button>
          ) : null}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-auto bg-background">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

/* ════════════════════════════════ FormSheet ════════════════════════════ */

export interface FormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  width?: string;
  children: React.ReactNode;
}

export function FormSheet({ open, onOpenChange, width = 'min(720px, 92vw)', children }: FormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" hideClose width={width} className="gap-0 overflow-visible p-0">
        <SheetTitle className="sr-only">Create / edit</SheetTitle>
        <SheetDescription className="sr-only">Create or edit form side sheet</SheetDescription>
        {/* Floating close — left of the panel, vertically centered */}
        <button
          type="button"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          className="absolute left-[-52px] top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-lg transition-colors hover:text-foreground"
        >
          <X size={18} />
        </button>
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

/* ════════════════════════════════ SchemaForm ════════════════════════════ */

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'picker'
  | 'multi-picker'
  | 'toggle';

/** Rich option for picker fields — avatar/subtitle rows (CRM-style). */
export interface PickerOption {
  value: string;
  label: string;
  subtitle?: string;
  avatarFallback?: string;
  avatarColor?: string;
  /** Extra columns for table-mode multi-pickers, keyed by tableColumns.key. */
  meta?: Record<string, React.ReactNode>;
}

export interface FormField {
  key: string;
  label: string;
  type?: FormFieldType;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  /** Options for `picker` / `multi-picker` fields. */
  pickerOptions?: PickerOption[];
  /**
   * Inline "create new" for `picker` fields (the CRM pattern): a sub-form
   * rendered inside the dropdown; `map` turns its values into a new option,
   * which is appended and selected. `onCreate` lets the config persist it.
   */
  createNew?: {
    label?: string;
    fields: FormField[];
    map: (values: Record<string, string>) => PickerOption;
    onCreate?: (values: Record<string, string>) => void;
  };
  /** Column span in the 2-col grid (default 1; 2 = full width). */
  span?: 1 | 2;
  /**
   * `multi-picker` presentation: 'chips' (compact popover, default) or
   * 'table' — the demos' Select Asset tab: search + Selected/Available
   * tables with a select-all checkbox, rendered inline in the form.
   */
  multiPickerMode?: 'chips' | 'table';
  /** Extra table columns for table-mode (cells from option.meta[key]). */
  tableColumns?: { key: string; header: string }[];
  /** Hide the field unless this returns true (demo's conditional sections). */
  visibleIf?: (values: Record<string, string>) => boolean;
}

export interface FormSchema {
  title?: string;
  description?: string;
  submitLabel?: string;
  fields: FormField[];
}

/* ── picker controls ─────────────────────────────────────────────────── */

function PickerAvatar({ option, size = 24 }: { option: PickerOption; size?: number }) {
  if (!option.avatarFallback) return null;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-caption font-bold text-white"
      style={{ width: size, height: size, background: option.avatarColor ?? 'var(--primary)' }}
      aria-hidden
    >
      {option.avatarFallback}
    </span>
  );
}

/**
 * Searchable single-select with avatar rows + inline "create new" sub-form.
 *
 * T-090(e): optional `floatingLabel` renders the label INSIDE the trigger
 * (caption on top, avatar+value below, chevron trailing — `h-14`/
 * `rounded-md`/`bg-input-background`, matching FloatingLabelInput/
 * LabeledSelect) instead of an external `<Label>` above a bare `h-10`
 * trigger. Judged case-by-case vs `multi-picker` (kept external — see
 * `MultiPickerControl`'s doc comment): a single-picker's trigger content is
 * FIXED-HEIGHT (one avatar + one label, never wraps), the same shape
 * `SchemaSelectField`/`DateRangePicker`'s `field` variant already float —
 * so this is a small, honest, additive fix for the "Assign-to reads
 * odd-one-out next to floated siblings" defect, not a new idiom.
 */
function EntityPickerControl({
  field,
  value,
  onChange,
  floatingLabel,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
  floatingLabel?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [extra, setExtra] = React.useState<PickerOption[]>([]);
  const [creating, setCreating] = React.useState(false);
  const [createValues, setCreateValues] = React.useState<Record<string, string>>({});

  const options = [...(field.pickerOptions ?? []), ...extra];
  const selected = options.find((o) => o.value === value);
  const filtered = options.filter((o) =>
    `${o.label} ${o.subtitle ?? ''}`.toLowerCase().includes(q.toLowerCase())
  );

  const commitCreate = () => {
    const opt = field.createNew!.map(createValues);
    field.createNew!.onCreate?.(createValues);
    setExtra((prev) => [...prev, opt]);
    onChange(opt.value);
    setCreating(false);
    setCreateValues({});
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setCreating(false); setQ(''); } }}>
      <PopoverTrigger asChild>
        {floatingLabel ? (
          <button
            type="button"
            className="flex h-14 w-full flex-col justify-center gap-0.5 rounded-md border border-border bg-input-background px-3 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground" style={{ letterSpacing: '0.04em' }}>
              {floatingLabel}
            </span>
            <span className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-body-sm font-medium text-foreground">
                {selected ? <PickerAvatar option={selected} /> : null}
                <span className="truncate">{selected ? selected.label : (field.placeholder ?? 'Choose…')}</span>
              </span>
              <ChevronDown size={15} className="ml-auto shrink-0 text-muted-foreground" />
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="flex h-10 w-full items-center gap-2 rounded-md border border-border bg-card px-3 text-left text-body-sm text-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {selected ? (
              <>
                <PickerAvatar option={selected} />
                <span className="min-w-0 truncate">{selected.label}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{field.placeholder ?? 'Choose…'}</span>
            )}
            <ChevronDown size={14} className="ml-auto shrink-0 text-muted-foreground" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-[280px] p-0">
        {!creating ? (
          <>
            <div className="relative border-b border-border p-2">
              <Search size={14} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="h-8 w-full rounded-md bg-muted/50 pl-7 pr-2 text-body-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-56 overflow-auto p-1">
              {filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-body-sm outline-none transition-colors hover:bg-muted"
                >
                  <PickerAvatar option={o} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-foreground">{o.label}</span>
                    {o.subtitle ? <span className="truncate text-caption text-muted-foreground">{o.subtitle}</span> : null}
                  </span>
                  {o.value === value ? <Check size={14} className="ml-auto shrink-0 text-primary" /> : null}
                </button>
              ))}
              {!filtered.length ? (
                <div className="px-2 py-3 text-center text-caption text-muted-foreground">No matches.</div>
              ) : null}
            </div>
            {field.createNew ? (
              <div className="border-t border-border p-1">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(true);
                    // Pre-fill the first create field with the search text (smart UX).
                    const first = field.createNew!.fields[0];
                    if (first && q) setCreateValues({ [first.key]: q });
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-body-sm font-medium text-primary outline-none transition-colors hover:bg-muted"
                >
                  <Plus size={14} />
                  {q ? `Add “${q}” as ${field.createNew.label ?? 'new'}` : `Add ${field.createNew.label ?? 'new'}`}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col gap-3 p-3">
            <div className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              New {field.createNew?.label ?? 'record'}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {field.createNew!.fields.map((cf) =>
                // T-088: same label-inside rule as the main FieldGridBody —
                // text/number/select/date self-label; only the rest keep the
                // external caption.
                isFloatingLabelType(cf.type) ? (
                  <div key={cf.key} className={cn(cf.span === 2 ? 'col-span-2' : 'col-span-2 sm:col-span-1')}>
                    <FieldControl
                      field={cf}
                      value={createValues[cf.key] ?? ''}
                      onChange={(v) => setCreateValues((prev) => ({ ...prev, [cf.key]: v }))}
                    />
                  </div>
                ) : (
                  <div key={cf.key} className={cn('flex flex-col gap-1', cf.span === 2 ? 'col-span-2' : 'col-span-2 sm:col-span-1')}>
                    <Label className="text-caption font-semibold">{cf.label}</Label>
                    <FieldControl
                      field={cf}
                      value={createValues[cf.key] ?? ''}
                      onChange={(v) => setCreateValues((prev) => ({ ...prev, [cf.key]: v }))}
                    />
                  </div>
                )
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" size="sm" variant="tertiary" onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={commitCreate}>Add</Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Searchable multi-select (checkbox rows); value is a comma-joined string.
 *
 * T-090(e): judged AGAINST a floating-label variant and kept external — the
 * trigger is `flex-wrap`/`min-h-10` and genuinely GROWS with each selected
 * chip (unlike the single-picker's fixed one-avatar-one-label content), so
 * a caption pinned to a `h-14` box would either clip a 3rd+ chip row or
 * force the box to grow past its sibling fields' height, both worse than
 * the current external label. Same reasoning excludes `MultiPickerTableControl`
 * (a full table, not a compact field — its `field.label` is already a column
 * header, not a floating caption).
 */
function MultiPickerControl({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const options = field.pickerOptions ?? [];
  const selectedIds = value ? value.split(',').filter(Boolean) : [];
  const filtered = options.filter((o) =>
    `${o.label} ${o.subtitle ?? ''}`.toLowerCase().includes(q.toLowerCase())
  );
  const toggle = (id: string) =>
    onChange(
      (selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]).join(',')
    );

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(''); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-left text-body-sm outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {selectedIds.length ? (
            selectedIds.map((id) => {
              const o = options.find((x) => x.value === id);
              return (
                <span key={id} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-caption font-medium text-secondary-foreground">
                  {o?.label ?? id}
                </span>
              );
            })
          ) : (
            <span className="text-muted-foreground">{field.placeholder ?? 'Select…'}</span>
          )}
          <ChevronDown size={14} className="ml-auto shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-[280px] p-0">
        <div className="relative border-b border-border p-2">
          <Search size={14} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="h-8 w-full rounded-md bg-muted/50 pl-7 pr-2 text-body-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-56 overflow-auto p-1">
          {filtered.map((o) => {
            const on = selectedIds.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-body-sm outline-none transition-colors hover:bg-muted"
              >
                <span
                  className={cn(
                    'grid size-4 shrink-0 place-items-center rounded border',
                    on ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                  )}
                >
                  {on ? <Check size={11} /> : null}
                </span>
                <PickerAvatar option={o} size={22} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-foreground">{o.label}</span>
                  {o.subtitle ? <span className="truncate text-caption text-muted-foreground">{o.subtitle}</span> : null}
                </span>
              </button>
            );
          })}
          {!filtered.length ? (
            <div className="px-2 py-3 text-center text-caption text-muted-foreground">No matches.</div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Table-mode multi-select — the demos' Select Asset tab: search + a
 *  "Selected (n)" table and an "Available (n)" table with select-all. */
function MultiPickerTableControl({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  const [q, setQ] = React.useState('');
  const options = field.pickerOptions ?? [];
  const cols = field.tableColumns ?? [];
  const selectedIds = value ? value.split(',').filter(Boolean) : [];
  const matches = (o: PickerOption) =>
    `${o.label} ${o.subtitle ?? ''}`.toLowerCase().includes(q.toLowerCase());
  const selected = options.filter((o) => selectedIds.includes(o.value));
  const available = options.filter((o) => !selectedIds.includes(o.value) && matches(o));
  const toggle = (id: string) =>
    onChange(
      (selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]).join(',')
    );
  const selectAllAvailable = () =>
    onChange([...selectedIds, ...available.map((o) => o.value)].join(','));
  const clearAll = () => onChange('');

  const gridStyle = { gridTemplateColumns: `24px minmax(0,1.4fr) ${cols.map(() => 'minmax(0,1fr)').join(' ')}` };

  const HeaderRow = ({ checkbox }: { checkbox?: React.ReactNode }) => (
    <div className="grid items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground" style={gridStyle}>
      <span className="grid place-items-center">{checkbox}</span>
      <span>{field.label}</span>
      {cols.map((c) => (
        <span key={c.key}>{c.header}</span>
      ))}
    </div>
  );

  const Row = ({ o, on }: { o: PickerOption; on: boolean }) => (
    <button
      type="button"
      onClick={() => toggle(o.value)}
      className="grid w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-body-sm outline-none transition-colors last:border-b-0 hover:bg-muted/40"
      style={gridStyle}
    >
      <span
        className={cn(
          'grid size-4 place-items-center justify-self-center rounded border',
          on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
        )}
      >
        {on ? <Check size={11} /> : null}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        {o.avatarFallback ? <PickerAvatar option={o} size={22} /> : null}
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-foreground">{o.label}</span>
          {o.subtitle ? <span className="truncate text-caption text-muted-foreground">{o.subtitle}</span> : null}
        </span>
      </span>
      {cols.map((c) => (
        <span key={c.key} className="min-w-0 truncate text-foreground">
          {o.meta?.[c.key] ?? '—'}
        </span>
      ))}
    </button>
  );

  return (
    <div className="flex w-full flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={field.placeholder ?? 'Search…'}
          className="h-9 w-full rounded-md border border-border bg-card pl-8 pr-3 text-body-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Selected table */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-caption font-semibold text-foreground">Selected ({selected.length})</span>
          {selected.length ? (
            <button type="button" onClick={clearAll} className="text-caption font-medium text-muted-foreground underline-offset-2 hover:underline">
              Clear all
            </button>
          ) : null}
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <HeaderRow />
          {selected.map((o) => (
            <Row key={o.value} o={o} on />
          ))}
          {!selected.length ? (
            <div className="px-3 py-3 text-center text-caption text-muted-foreground">Nothing selected yet.</div>
          ) : null}
        </div>
      </div>

      {/* Available table — select-all in the header (the demo behavior) */}
      <div>
        <div className="mb-1.5 text-caption font-semibold text-foreground">Available ({available.length})</div>
        <div className="overflow-hidden rounded-lg border border-border">
          <HeaderRow
            checkbox={
              available.length ? (
                <button
                  type="button"
                  aria-label="Select all available"
                  onClick={selectAllAvailable}
                  className="grid size-4 place-items-center rounded border border-border bg-card transition-colors hover:border-primary"
                />
              ) : undefined
            }
          />
          {available.map((o) => (
            <Row key={o.value} o={o} on={false} />
          ))}
          {!available.length ? (
            <div className="px-3 py-3 text-center text-caption text-muted-foreground">
              {q ? 'No matches.' : 'All options have been selected.'}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * T-088/T-090: which `FormField` types render their OWN label-inside-the-box
 * composition (FloatingLabelInput / LabeledSelect / DateRangePicker's `field`
 * variant / EntityPickerControl's `floatingLabel`) vs. which keep the
 * established external-label-above idiom.
 * `textarea` is excluded on purpose — FloatingLabelInput's own spec lists
 * "using this as a multi-line textarea" as an anti-pattern (label-inside
 * doesn't fit a growing multi-line box). `multi-picker` stays external too
 * (see `MultiPickerControl`'s doc comment: its trigger genuinely grows with
 * selection count, a fixed-height caption box doesn't fit). `picker`
 * (single-select) DOES float now (T-090(e)) — its content is fixed-height,
 * the same shape `select`/`date` already float; keeping it external was the
 * "Assign-to reads odd-one-out" defect this ticket fixes.
 */
function isFloatingLabelType(type: FormFieldType | undefined): boolean {
  return type === undefined || type === 'text' || type === 'number' || type === 'select' || type === 'date' || type === 'picker';
}

/** `select`-type FieldControl: reuses the shared `LabeledSelect` (the same
 *  floating-label popover select used by Settings forms + product wizards),
 *  bridging its plain `options: string[]` API onto `FormField`'s
 *  `{label,value}[]` options (round-trips through the label text — schema
 *  select options are assumed to have unique labels, same assumption the
 *  product's own Client picker already makes). */
function SchemaSelectField({ field: f, value, onChange }: { field: FormField; value: string; onChange: (v: string) => void }) {
  const options = f.options ?? [];
  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';
  return (
    <LabeledSelect
      label={`${f.label}${f.required ? ' *' : ''}`}
      value={selectedLabel}
      options={options.map((o) => o.label)}
      onChange={(label) => { const picked = options.find((o) => o.label === label); onChange(picked ? picked.value : label); }}
      placeholder={f.placeholder ?? 'Select…'}
    />
  );
}

/** Shared field renderer used by SchemaForm, SteppedSchemaForm, and inline creates. */
export function FieldControl({
  field: f,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (f.type === 'textarea') {
    return <Textarea placeholder={f.placeholder} value={value} onChange={(e) => onChange(e.target.value)} rows={3} />;
  }
  if (f.type === 'select') {
    return <SchemaSelectField field={f} value={value} onChange={onChange} />;
  }
  if (f.type === 'picker') {
    // T-090(e): floating label (see EntityPickerControl's doc comment) —
    // matches the sibling text/select/date fields in the same grid.
    return <EntityPickerControl field={f} value={value} onChange={onChange} floatingLabel={`${f.label}${f.required ? ' *' : ''}`} />;
  }
  if (f.type === 'multi-picker') {
    return f.multiPickerMode === 'table' ? (
      <MultiPickerTableControl field={f} value={value} onChange={onChange} />
    ) : (
      <MultiPickerControl field={f} value={value} onChange={onChange} />
    );
  }
  if (f.type === 'date') {
    // T-065 finding 3: never a native `<input type="date">` (generic
    // dd/mm/yyyy + native browser icon) — the DS ships DateRangePicker
    // (mode="single") for exactly this. Value stays an ISO ("YYYY-MM-DD")
    // string in/out, unchanged contract for every `type:'date'` consumer
    // (Inventory's Assign sheet reads `v.collectionDate`/`v.dueBack` as ISO).
    // T-088: `field` variant (label inside, matching the sibling
    // FloatingLabelInput/LabeledSelect fields in the same grid) instead of a
    // bare trigger under an external <Label> — `h-14`/`rounded-md`/
    // `bg-input-background` geometry-matches those siblings verbatim.
    return (
      <DateRangePicker
        mode="single"
        field={{ label: `${f.label}${f.required ? ' *' : ''}` }}
        value={value ? isoToDisplayDate(value) : undefined}
        placeholder={f.placeholder ?? 'Select Date'}
        onApply={(r) => { if (r.start) onChange(dateToISO(r.start)); }}
        triggerClassName="h-14 rounded-md border-border bg-input-background"
      />
    );
  }
  return (
    <FloatingLabelInput
      label={`${f.label}${f.required ? ' *' : ''}`}
      type={f.type === 'number' ? 'number' : 'text'}
      placeholder={f.placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function FieldGridBody({
  fields,
  values,
  set,
}: {
  fields: FormField[];
  values: Record<string, string>;
  set: (k: string, v: string) => void;
}) {
  return (
    <>
      {fields
        .filter((f) => !f.visibleIf || f.visibleIf(values))
        .map((f) =>
          f.type === 'toggle' ? (
            // Demo toggle row: muted label left, switch right (full width).
            <div key={f.key} className="col-span-2 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-caption font-semibold leading-[14px] text-muted-foreground">{f.label}</p>
                {f.placeholder ? (
                  <p className="text-caption text-muted-foreground/80">{f.placeholder}</p>
                ) : null}
              </div>
              <Switch
                checked={values[f.key] === '1'}
                onCheckedChange={(on) => set(f.key, on ? '1' : '')}
                aria-label={f.label}
              />
            </div>
          ) : isFloatingLabelType(f.type) ? (
            // T-088: text/number/select/date self-render the label INSIDE the
            // control (FloatingLabelInput/LabeledSelect/DateRangePicker's
            // `field` variant) — no external <Label> above, matching the
            // Settings-sheet/wizard standard (this is what made "Site
            // Location"/"Start date" read as broken next to a correct
            // "Duration" field: one law, applied everywhere it fits).
            <div
              key={f.key}
              className={cn('flex flex-col gap-1.5', f.span === 2 ? 'col-span-2' : 'col-span-2 sm:col-span-1')}
            >
              <FieldControl field={f} value={values[f.key] ?? ''} onChange={(v) => set(f.key, v)} />
            </div>
          ) : (
            <div
              key={f.key}
              className={cn(
                'flex flex-col gap-1.5',
                f.span === 2 || f.type === 'textarea' || (f.type === 'multi-picker' && f.multiPickerMode === 'table')
                  ? 'col-span-2'
                  : 'col-span-2 sm:col-span-1'
              )}
            >
              <Label htmlFor={`f-${f.key}`} className="text-caption font-semibold text-foreground">
                {f.label}
                {f.required ? <span className="text-destructive"> *</span> : null}
              </Label>
              <FieldControl field={f} value={values[f.key] ?? ''} onChange={(v) => set(f.key, v)} />
            </div>
          )
        )}
    </>
  );
}

/**
 * SchemaForm — renders a config-declared form inside a FormSheet. Fully
 * controlled internally; calls `onSubmit(values)` on submit.
 */
export function SchemaForm({
  schema,
  onSubmit,
  onCancel,
}: {
  schema: FormSchema;
  onSubmit?: (values: Record<string, string>) => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const set = (k: string, v: string) => setValues((prev) => ({ ...prev, [k]: v }));

  return (
    <form
      className="flex h-full flex-col"
      onSubmit={(e) => { e.preventDefault(); onSubmit?.(values); }}
    >
      {/* Header */}
      {(schema.title || schema.description) && (
        <div className="shrink-0 border-b border-border px-6 pb-4 pt-6">
          {schema.title ? <h2 className="text-h6 font-semibold text-foreground">{schema.title}</h2> : null}
          {schema.description ? (
            <p className="mt-1 text-body-sm text-muted-foreground">{schema.description}</p>
          ) : null}
        </div>
      )}

      {/* Fields */}
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-4 overflow-auto p-6">
        <FieldGridBody fields={schema.fields} values={values} set={set} />
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
        <Button type="button" variant="tertiary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">{schema.submitLabel ?? 'Create'}</Button>
      </div>
    </form>
  );
}

/* ════════════════════════════ SteppedSchemaForm ══════════════════════════ */

export interface FormStep {
  id: string;
  title: string;
  fields: FormField[];
  /** Return an error message to block progression, or null/undefined to pass. */
  validate?: (values: Record<string, string>) => string | null | undefined;
}

export interface SteppedFormSchema {
  title?: string;
  description?: string;
  submitLabel?: string;
  steps: FormStep[];
  /** Live computed summary rendered in the sticky footer (e.g. price). */
  summary?: (values: Record<string, string>) => React.ReactNode;
}

/**
 * SteppedSchemaForm — the demos' multi-step creation pattern (Truemax
 * Basic Info → Select Asset → Trigger; CRM Lead Info → Detailed Info;
 * Cement's 4-step order). Tab bar with gated progression (a step's
 * `validate` must pass before moving forward), Back/Next/Submit footer
 * with an optional live summary slot.
 */
export function SteppedSchemaForm({
  schema,
  onSubmit,
  onCancel,
}: {
  schema: SteppedFormSchema;
  onSubmit?: (values: Record<string, string>) => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [stepIdx, setStepIdx] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const set = (k: string, v: string) => setValues((prev) => ({ ...prev, [k]: v }));

  const steps = schema.steps;
  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;

  const validateCurrent = (): boolean => {
    // Required fields on the current step…
    const missing = step.fields.find((f) => f.required && !(values[f.key] ?? '').trim());
    if (missing) {
      setError(`${missing.label} is required.`);
      return false;
    }
    // …then the step's own rule.
    const msg = step.validate?.(values);
    if (msg) {
      setError(msg);
      return false;
    }
    setError(null);
    return true;
  };

  const goTo = (idx: number) => {
    if (idx > stepIdx && !validateCurrent()) return;
    setError(null);
    setStepIdx(idx);
  };

  const next = () => {
    if (!validateCurrent()) return;
    if (isLast) onSubmit?.(values);
    else setStepIdx((i) => i + 1);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header + step tabs */}
      <div className="shrink-0 border-b border-border px-6 pt-6">
        {schema.title ? <h2 className="text-h6 font-semibold text-foreground">{schema.title}</h2> : null}
        {schema.description ? (
          <p className="mt-1 text-body-sm text-muted-foreground">{schema.description}</p>
        ) : null}
        <div className="mt-4 flex gap-5" role="tablist">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === stepIdx}
              onClick={() => goTo(i)}
              className={cn(
                'relative -mb-px flex items-center gap-1.5 border-b-2 pb-3 text-body-sm outline-none transition-colors',
                i === stepIdx
                  ? 'border-primary font-semibold text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'grid size-5 place-items-center rounded-full text-caption font-bold',
                  i < stepIdx
                    ? 'bg-primary text-primary-foreground'
                    : i === stepIdx
                      ? 'border border-primary text-primary'
                      : 'border border-border text-muted-foreground'
                )}
              >
                {i < stepIdx ? <Check size={11} /> : i + 1}
              </span>
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Step fields */}
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-4 overflow-auto p-6">
        <FieldGridBody fields={step.fields} values={values} set={set} />
      </div>

      {/* Sticky footer — error, summary, Back/Next */}
      <div className="shrink-0 border-t border-border px-6 py-4">
        {error ? <div className="mb-2 text-body-sm font-medium text-destructive">{error}</div> : null}
        <div className="flex items-center gap-3">
          {schema.summary ? (
            <div className="min-w-0 flex-1 text-body-sm text-foreground">{schema.summary(values)}</div>
          ) : (
            <div className="flex-1 text-caption text-muted-foreground">
              Step {stepIdx + 1} of {steps.length}
            </div>
          )}
          {stepIdx > 0 ? (
            <Button type="button" variant="tertiary" onClick={() => { setError(null); setStepIdx((i) => i - 1); }}>
              Back
            </Button>
          ) : (
            <Button type="button" variant="tertiary" onClick={onCancel}>Cancel</Button>
          )}
          <Button type="button" variant="primary" onClick={next}>
            {isLast ? schema.submitLabel ?? 'Create' : 'Save & Proceed'}
          </Button>
        </div>
      </div>
    </div>
  );
}
