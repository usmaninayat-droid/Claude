import * as React from 'react';
import { cn } from '../utils/cn';
import { Button, Input, Checkbox, Popover, PopoverTrigger, PopoverContent, Avatar, Badge } from '../primitives';
import { FormSheet } from './side-sheet';
import { SearchMd, FilterFunnel02, Calendar, BarChartSquare02, Truck01, User01, AlertTriangle, Circle } from '../../icons';
import { ChevronDown, X, PanelLeft, Check } from 'lucide-react';
import { ReportTable, type ReportColumn, type ReportSubscription } from './report-table';
import { DateRangePicker, type DateRangeResult } from '../basics';
import type { ReportBuilderConfig, ReportBuilderValues, ReportFilterEntity, ReportFilterField, ReportResult } from './types';

/**
 * Date filter value encoding — `ReportBuilderValues[key]` is typed `string` (a
 * single generic slot shared with select/text fields), but a `generate()`
 * callback needs the REAL picked start/end dates, not just the DateRangePicker's
 * display label ("This week" / "05 Jul, 2026 – 10 Jul, 2026"). We encode both
 * into one JSON string (label + ISO bounds) so the value stays a plain
 * `string` (no type/consumer break) while `parseDateFilterValue` gives any
 * `generate()` real, comparable ISO dates. Consumers that never call
 * `parseDateFilterValue` are unaffected — they never read this value back as
 * display text (the picker's own internal state renders its trigger label).
 */
const isoOfDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function encodeDateFilterValue(r: DateRangeResult): string {
  return JSON.stringify({ label: r.label, start: r.start ? isoOfDate(r.start) : undefined, end: r.end ? isoOfDate(r.end) : undefined });
}
/** Parses a `values[key]` produced by a `kind: 'date'` filter. Falls back to
 *  treating the raw string as the label (pre-fix / non-JSON values) so this
 *  never throws on an unexpected shape. */
export function parseDateFilterValue(v?: string): { label: string; startISO?: string; endISO?: string } {
  if (!v) return { label: '' };
  try {
    const p = JSON.parse(v) as { label?: string; start?: string; end?: string };
    if (p && typeof p === 'object' && 'label' in p) return { label: p.label ?? '', startISO: p.start, endISO: p.end };
  } catch { /* not JSON — a plain legacy label string */ }
  return { label: v };
}

const nodeText = (n: React.ReactNode): string =>
  typeof n === 'string' || typeof n === 'number' ? String(n) : '';

const DEFAULT_EVENT_TYPES = [
  { value: 'over-speeding', label: 'Over Speeding' },
  { value: 'idling', label: 'Idling' },
  { value: 'harsh-braking', label: 'Harsh Braking' },
  { value: 'geofence', label: 'Geofence Breach' },
];

/* ── Select Assets — the advanced multi-select filter side sheet ──────────── */
export function AssetSelectSideSheet({
  open,
  onOpenChange,
  assets,
  selectedIds,
  onSave,
  entityLabel = 'Assets',
  icon = <Truck01 size={16} />,
  entityKind = 'asset',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: ReportFilterEntity[];
  selectedIds: string[];
  onSave: (ids: string[]) => void;
  /** What the items are (e.g. "Assets", "Vehicles", "Sites"). */
  entityLabel?: string;
  /** Per-row leading glyph (defaults to a truck — set for non-vehicle fleets).
   *  Ignored when `entityKind="person"` (a per-row initials avatar is used
   *  instead — the correct visual for an employee/workforce picker). */
  icon?: React.ReactNode;
  /** 'asset' (default, back-compat: a static icon per row) or 'person' (a
   *  per-row initials `Avatar`, no fleet vocabulary at all). */
  entityKind?: 'asset' | 'person';
}) {
  const [sel, setSel] = React.useState<Set<string>>(() => new Set(selectedIds));
  const [q, setQ] = React.useState('');
  React.useEffect(() => {
    if (open) setSel(new Set(selectedIds));
  }, [open, selectedIds]);

  const query = q.trim().toLowerCase();
  const match = (a: ReportFilterEntity) =>
    !query || `${nodeText(a.label)} ${nodeText(a.meta)} ${(a.tags ?? []).join(' ')}`.toLowerCase().includes(query);
  const filtered = assets.filter(match);
  const selected = filtered.filter((a) => sel.has(a.id));
  const available = filtered.filter((a) => !sel.has(a.id));

  const toggle = (id: string) =>
    setSel((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const selectAll = () => setSel((prev) => { const n = new Set(prev); available.forEach((a) => n.add(a.id)); return n; });
  const unselectAll = () => setSel((prev) => { const n = new Set(prev); selected.forEach((a) => n.delete(a.id)); return n; });

  const Row = ({ a }: { a: ReportFilterEntity }) => (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-2 hover:bg-muted/50">
      <Checkbox checked={sel.has(a.id)} onCheckedChange={() => toggle(a.id)} aria-label={nodeText(a.label)} />
      {entityKind === 'person' ? (
        <Avatar size="sm" fallback={nodeText(a.label).split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '—'} />
      ) : (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-foreground">{a.label}</span>
      {a.meta ? <span className="shrink-0 text-caption text-muted-foreground">{a.meta}</span> : null}
      {(a.tags ?? []).map((t, i) => (
        <span key={i} className="shrink-0 rounded-md bg-[var(--status-warning)]/10 px-1.5 py-0.5 text-caption font-semibold text-[var(--status-warning)]">
          {t}
        </span>
      ))}
    </label>
  );

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} width="min(560px, 94vw)">
      <div className="flex h-full flex-col">
        <div className="px-6 pt-6">
          <h2 className="text-h5 font-semibold text-foreground">Select {entityLabel}</h2>
          <p className="text-body-sm text-muted-foreground">Select {entityLabel.toLowerCase()} to add to the report.</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <SearchMd size={16} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search anything here"
                className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-body-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <button type="button" title="Filter" className="flex size-10 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted">
              <FilterFunnel02 size={16} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          {selected.length ? (
            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Selected {entityLabel}</span>
                <button type="button" onClick={unselectAll} className="text-caption font-semibold text-[var(--status-error)] hover:underline">Unselect All</button>
              </div>
              {selected.map((a) => <Row key={a.id} a={a} />)}
            </div>
          ) : null}
          <div className="mb-1 flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{entityLabel} List</span>
            {available.length ? (
              <button type="button" onClick={selectAll} className="text-caption font-semibold text-primary hover:underline">Select All</button>
            ) : null}
          </div>
          {available.length ? available.map((a) => <Row key={a.id} a={a} />) : (
            <p className="py-6 text-center text-body-sm text-muted-foreground">No more assets.</p>
          )}
        </div>

        <div className="border-t border-border px-6 py-4">
          <Button className="w-full" onClick={() => onSave([...sel])}>Save</Button>
        </div>
      </div>
    </FormSheet>
  );
}

/* ── Custom Report Builder — left filter panel + right result/empty ───────── */
function FilterDropdown({ label, value, placeholder, icon, children, open, onOpenChange }: {
  label: string; value?: React.ReactNode; placeholder: string; icon?: React.ReactNode; children?: React.ReactNode;
  /**
   * Controlled open state (T-094 F1) — omit for the old uncontrolled behavior
   * (Radix manages its own state when `open` is undefined). `SelectField`
   * (single-select) passes both so it can close the popover the instant an
   * option is picked; multi-select facet dropdowns (`MultiSelectField` /
   * the shell's own `FacetDropdown`) do NOT use this component and correctly
   * stay open across a multi-pick — don't wire this into them.
   */
  open?: boolean; onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button type="button" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
          <span className="block text-caption font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
          <span className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-body-sm font-medium text-foreground">
              {icon}
              <span className="truncate">{value ?? <span className="text-muted-foreground">{placeholder}</span>}</span>
            </span>
            <ChevronDown size={15} className="shrink-0 text-muted-foreground" />
          </span>
        </button>
      </PopoverTrigger>
      {children ? <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-1">{children}</PopoverContent> : null}
    </Popover>
  );
}

type EventType = Extract<ReportFilterField, { kind: 'multiSelect' }>['options'][number];

/**
 * Compact soft-tint severity tag (T-099 item 4) — the Exception Type popover
 * previously hand-rolled an oversized `rounded-md px-1.5 py-0.5` span
 * (including a noisy gray "Normal" tag on every option with no real
 * severity). Reuses the DS `Badge` primitive's own `warning`/`destructive`
 * soft-tint variants at `size="xs"` (the compact `h-4`/`text-caption` chip
 * standard used platform-wide) instead of a bespoke style, and renders
 * NOTHING when an option carries no real severity (every option in this
 * product declares one, but a config that doesn't shouldn't get a tag).
 */
/** Criticality bucket for an event type — the two client-facing types plus an
 *  optional amber Warning tier if a config declares it. */
type CritBucket = 'Critical' | 'Warning' | 'Normal';
const critBucket = (s?: EventType['severity']): CritBucket =>
  s === 'critical' ? 'Critical' : s === 'warning' ? 'Warning' : 'Normal';

const CRIT_META: Record<CritBucket, { variant: 'destructive' | 'warning' | 'muted'; Icon: React.ComponentType<{ size?: number }> }> = {
  Critical: { variant: 'destructive', Icon: AlertTriangle },
  Warning: { variant: 'warning', Icon: AlertTriangle },
  Normal: { variant: 'muted', Icon: Circle },
};

/** Every event-type row shows its criticality (Critical red / Normal grey /
 *  Warning amber) — Figma 29105-6894. Icon + label, never colour alone. */
function SeverityChip({ severity, className }: { severity?: EventType['severity']; className?: string }) {
  const b = critBucket(severity);
  const { variant, Icon } = CRIT_META[b];
  return (
    <Badge variant={variant} size="xs" className={cn('ml-auto shrink-0', className)}>
      <Icon size={11} />{b}
    </Badge>
  );
}

/** Rich multi-select event-type picker — search + Selected/Event List groups +
 *  Select All / Unselect All + severity chips (Figma multi-event frame). */
function EventTypePicker({
  eventTypes, selected, query, onQuery, onToggle, onSelectAll, onUnselectAll,
}: {
  eventTypes: EventType[];
  selected: string[];
  query: string;
  onQuery: (q: string) => void;
  onToggle: (v: string) => void;
  onSelectAll: (vals: string[]) => void;
  onUnselectAll: (vals: string[]) => void;
}) {
  const q = query.trim().toLowerCase();
  // Criticality quick-filter (chips): narrow the list to one type so "Select All"
  // bulk-selects all events of that criticality (client ask, Figma 29105-6894).
  const [crit, setCrit] = React.useState<'All' | CritBucket>('All');
  const critOptions = React.useMemo(() => {
    const present = new Set(eventTypes.map((e) => critBucket(e.severity)));
    return (['Critical', 'Warning', 'Normal'] as CritBucket[]).filter((b) => present.has(b));
  }, [eventTypes]);
  const visible = eventTypes.filter((e) =>
    (!q || e.label.toLowerCase().includes(q)) && (crit === 'All' || critBucket(e.severity) === crit));
  const sel = visible.filter((e) => selected.includes(e.value));
  const avail = visible.filter((e) => !selected.includes(e.value));
  const Row = (e: EventType) => {
    const on = selected.includes(e.value);
    return (
      <button key={e.value} type="button" onClick={() => onToggle(e.value)} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-muted">
        <span className={cn('flex size-4 shrink-0 items-center justify-center rounded border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>{on ? <Check size={11} /> : null}</span>
        <span className="min-w-0 flex-1 truncate text-body-sm text-foreground">{e.label}</span>
        <SeverityChip severity={e.severity} />
      </button>
    );
  };
  return (
    <div>
      <div className="relative mb-2">
        <SearchMd size={14} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search Event" className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-2 text-body-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      {/* Criticality quick-filter chips — pick a type, then Select All to bulk-add it. */}
      {critOptions.length > 1 ? (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {(['All', ...critOptions] as const).map((b) => {
            const active = crit === b;
            return (
              <button
                key={b}
                type="button"
                onClick={() => setCrit(b)}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-caption font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {b !== 'All' ? React.createElement(CRIT_META[b].Icon, { size: 11 }) : null}{b}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="max-h-72 overflow-auto">
        {sel.length ? (
          <>
            <div className="flex items-center justify-between px-1.5 pb-1 pt-1">
              <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Selected Events</span>
              <button type="button" onClick={() => onUnselectAll(sel.map((e) => e.value))} className="text-caption font-semibold text-[var(--status-error)] hover:underline">Unselect All</button>
            </div>
            {sel.map(Row)}
          </>
        ) : null}
        <div className="flex items-center justify-between px-1.5 pb-1 pt-2">
          <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Event List</span>
          {avail.length ? <button type="button" onClick={() => onSelectAll(avail.map((e) => e.value))} className="text-caption font-semibold text-primary hover:underline">Select All</button> : null}
        </div>
        {avail.length ? avail.map(Row) : <p className="px-1.5 py-2 text-caption text-muted-foreground">No more events.</p>}
      </div>
    </div>
  );
}

/* ── Config-driven filter field controls — render any ReportFilterField ───── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-caption font-medium uppercase tracking-wide text-muted-foreground">{children}</span>;
}

function MultiSelectField({ field, value, onChange }: { field: Extract<ReportFilterField, { kind: 'multiSelect' }>; value: string[]; onChange: (v: string[]) => void }) {
  const [query, setQuery] = React.useState('');
  const first = field.options.find((o) => o.value === value[0])?.label;
  const caption = value.length > 1 ? `${value.length} selected` : first;
  // No-selection placeholder must never just echo the label back (e.g. an
  // "Exceptions" field showing literal "Exceptions" as its value text reads
  // as redundant/broken) — derive "All {label}" unless the config overrides it.
  const placeholderText = field.placeholder ?? `All ${field.label.toLowerCase()}`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
          <FieldLabel>{field.label}</FieldLabel>
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-body-sm font-medium text-foreground">{caption ?? <span className="text-muted-foreground">{placeholderText}</span>}</span>
            <ChevronDown size={15} className="shrink-0 text-muted-foreground" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-2">
        <EventTypePicker
          eventTypes={field.options}
          selected={value}
          query={query}
          onQuery={setQuery}
          onToggle={(v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])}
          onSelectAll={(vals) => onChange(Array.from(new Set([...value, ...vals])))}
          onUnselectAll={(vals) => onChange(value.filter((v) => !vals.includes(v)))}
        />
      </PopoverContent>
    </Popover>
  );
}

function EntitySelectField({ field, value, onChange }: { field: Extract<ReportFilterField, { kind: 'entitySelect' }>; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const entityLabel = field.entityLabel ?? 'Assets';
  const isPerson = field.entityKind === 'person';
  return (
    <div>
      {/* Same label-inside-the-box anatomy as MultiSelectField/SelectField/
       *  DateRangePicker's `field` variant — the caption used to sit in an
       *  external <FieldLabel> ABOVE a separate trigger button, the one
       *  inconsistent field next to its three siblings in this panel. */}
      <button type="button" onClick={() => setOpen(true)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
        <FieldLabel>{field.label}</FieldLabel>
        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2 text-body-sm font-medium text-foreground">
            {isPerson ? <User01 size={15} className="text-muted-foreground" /> : <Truck01 size={15} className="text-muted-foreground" />}
            <span className="truncate">
              {value.length ? <span className="font-semibold text-primary">{value.length} {entityLabel} Selected</span> : <span className="text-muted-foreground">Select {entityLabel}</span>}
            </span>
          </span>
          <ChevronDown size={15} className="shrink-0 text-muted-foreground" />
        </span>
      </button>
      <AssetSelectSideSheet open={open} onOpenChange={setOpen} assets={field.items} selectedIds={value} entityLabel={entityLabel} entityKind={field.entityKind} icon={isPerson ? <User01 size={16} /> : undefined} onSave={(ids) => { onChange(ids); setOpen(false); }} />
    </div>
  );
}

function NumberRangeField({ field, value, onChange }: { field: Extract<ReportFilterField, { kind: 'numberRange' }>; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <FieldLabel>{field.label}</FieldLabel>
      <div className="flex items-center rounded-lg border border-border bg-card px-2">
        <span className="text-caption text-muted-foreground">Over</span>
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 border-0 px-1 text-body-sm focus-visible:ring-0" />
        {field.unit ? <span className="text-caption font-semibold text-primary">{field.unit}</span> : null}
      </div>
    </div>
  );
}

/**
 * Radio-affordance option row (T-099 item 2) — the DS single-select idiom
 * (mirrors `SearchableSelect`'s T-058 radio-list pattern): a real radio
 * circle per row, not just bold/primary TEXT to imply selection. Shared by
 * every `kind: 'select'` filter field (Site, Trade, …) across the report
 * templates + custom builder — one fix point covers the whole sweep.
 */
function RadioOptionRow({ label, selected, onClick }: { label: React.ReactNode; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-body-sm hover:bg-muted', selected && 'font-semibold text-primary')}>
      <span className={cn('flex size-4 shrink-0 items-center justify-center rounded-full border', selected ? 'border-primary' : 'border-border')}>
        {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

function SelectField({ field, value, onChange }: { field: Extract<ReportFilterField, { kind: 'select' }>; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const current = value ? field.options.find((o) => o.value === value)?.label : undefined;
  // Same rule as MultiSelectField — the no-selection state derives "All
  // {label}", never the bare label repeated as its own placeholder value.
  const placeholderText = field.placeholder ?? `All ${field.label.toLowerCase()}`;
  // T-099 item 2: pin an "All …" row FIRST (using the same placeholder text
  // the closed field already shows) — the popover used to only ever list
  // `field.options`, so a field like Site could display "All sites" when
  // closed but never offer it as a pickable row once opened.
  return (
    <FilterDropdown label={field.label} placeholder={placeholderText} value={current} open={open} onOpenChange={setOpen}>
      <RadioOptionRow label={placeholderText} selected={!value} onClick={() => { onChange(''); setOpen(false); }} />
      {field.options.map((o) => (
        // T-094 F1: this is a SINGLE-select field — close the popover the
        // instant an option is picked (was staying open over the form,
        // value updated but the list never dismissed). Multi-select facets
        // (MultiSelectField/EventTypePicker, the shell's FacetDropdown) stay
        // open by design for a multi-pick — do not add setOpen(false) there.
        <RadioOptionRow key={o.value} label={o.label} selected={o.value === value} onClick={() => { onChange(o.value); setOpen(false); }} />
      ))}
    </FilterDropdown>
  );
}

function FilterFieldControl({ field, value, onChange }: { field: ReportFilterField; value: string | string[] | undefined; onChange: (v: string | string[]) => void }) {
  switch (field.kind) {
    case 'date':
      return <DateRangePicker field={{ label: field.label }} mode={field.mode ?? 'range'} value={(value as string) ? parseDateFilterValue(value as string).label : undefined} onApply={(r) => onChange(encodeDateFilterValue(r))} />;
    case 'multiSelect':
      return <MultiSelectField field={field} value={(value as string[]) ?? []} onChange={onChange} />;
    case 'entitySelect':
      return <EntitySelectField field={field} value={(value as string[]) ?? []} onChange={onChange} />;
    case 'numberRange':
      return <NumberRangeField field={field} value={(value as string) ?? ''} onChange={onChange} />;
    case 'select':
      return <SelectField field={field} value={(value as string) ?? ''} onChange={onChange} />;
    case 'text':
      return (
        <div>
          <FieldLabel>{field.label}</FieldLabel>
          <Input value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className="h-9 text-body-sm" />
        </div>
      );
  }
}

const DEFAULT_FILTERS: ReportFilterField[] = [{ kind: 'date', key: 'date', label: 'Select Date', mode: 'range' }];

function initValues(filters: ReportFilterField[]): ReportBuilderValues {
  const v: ReportBuilderValues = {};
  for (const f of filters) {
    if (f.kind === 'multiSelect' || f.kind === 'entitySelect') v[f.key] = [];
    else if (f.kind === 'numberRange') v[f.key] = f.defaultValue ?? '';
    else v[f.key] = '';
  }
  return v;
}

/** Shared left filter-panel shell — collapse rail, header slot, config-driven
 *  filter list, footer slot. Two consumers render it: `CustomReportBuilder`
 *  (editable name + Save/Generate) and `ReportTemplateView` (locked title +
 *  Regenerate only, T-065-follow-up "scoped template filters"). Extracted on
 *  the 2nd occurrence rather than duplicated — keep BOTH consumers' header/
 *  footer as slots so neither is forced into the other's shape. */
const PANEL_W = 288;

/** The side-panel collapse/expand toggle (design glyph: a left-docked panel),
 *  in a soft grey rounded button. Used in the panel header (to collapse) and in
 *  the report toolbar (to re-expand). */
function PanelToggle({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      title={title}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <PanelLeft size={16} />
    </button>
  );
}

function ReportFilterAside({
  collapsed, onCollapse, header, filters, values, onChange, footer,
}: {
  collapsed: boolean;
  onCollapse: () => void;
  header: React.ReactNode;
  filters: ReportFilterField[];
  values: ReportBuilderValues;
  onChange: (key: string, v: string | string[]) => void;
  footer: React.ReactNode;
}) {
  // Always mounted; collapse animates WIDTH 288↔0 (+ content fade) so the report
  // reflows smoothly rather than the panel hard-swapping to a rail. `inert` when
  // collapsed keeps the clipped fields out of the tab order.
  return (
    <aside
      className="min-w-0 shrink-0 overflow-hidden bg-card transition-[width] duration-300 ease-in-out"
      style={{ width: collapsed ? 0 : PANEL_W, borderRight: collapsed ? 'none' : '1px solid var(--border)' }}
      aria-hidden={collapsed || undefined}
      {...(collapsed ? ({ inert: '' } as Record<string, unknown>) : {})}
    >
      <div
        className="flex h-full flex-col transition-opacity duration-200 ease-in-out"
        style={{ width: PANEL_W, opacity: collapsed ? 0 : 1 }}
      >
        <div className="flex items-start justify-between gap-2 px-4 py-4">
          <div className="min-w-0 flex-1">{header}</div>
          <PanelToggle onClick={onCollapse} title="Collapse filters" />
        </div>

        {/* Filters — entirely config-driven (domain-agnostic) */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-4 pb-4">
          {filters.map((f) => (
            <FilterFieldControl key={f.key} field={f} value={values[f.key]} onChange={(v) => onChange(f.key, v)} />
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-border px-4 py-4">{footer}</div>
      </div>
    </aside>
  );
}

/** Shared right result pane — a generated table (with optional KPI band) or
 *  the "nothing generated yet" empty state. Shared by `CustomReportBuilder`
 *  and `ReportTemplateView`. */
function ReportResultPane({ result, reportName, emptyBody, onSubscribe, filtersCollapsed, onExpandFilters }: { result: ReportResult | null; reportName?: React.ReactNode; emptyBody?: React.ReactNode; onSubscribe?: (sub: ReportSubscription) => void; filtersCollapsed?: boolean; onExpandFilters?: () => void }) {
  const showToggle = filtersCollapsed && onExpandFilters;
  return (
    <div className="relative min-h-0 flex-1 overflow-auto bg-background">
      {result ? (
        <ReportTable
          reportName={reportName}
          kpis={result.kpis}
          columns={result.columns.map((c): ReportColumn => ({ key: c.key, label: c.label, groupable: true }))}
          rows={result.rows}
          onSubscribe={onSubscribe}
          leading={showToggle ? <PanelToggle onClick={onExpandFilters!} title="Show filters" /> : undefined}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          {showToggle ? <div className="absolute left-6 top-4"><PanelToggle onClick={onExpandFilters!} title="Show filters" /></div> : null}
          <div className="mb-1 flex size-20 items-center justify-center rounded-full bg-muted">
            <BarChartSquare02 size={36} className="text-muted-foreground" />
          </div>
          <div className="text-h6 font-semibold text-foreground">No Reports Available</div>
          <p className="max-w-xs text-body-sm text-muted-foreground">{emptyBody ?? 'Configure your report using the panel on the left to start visualizing your data.'}</p>
        </div>
      )}
    </div>
  );
}

export function CustomReportBuilder({ config, initialName = 'Untitled Report', onSave }: { config?: ReportBuilderConfig; initialName?: string; onSave?: (name: string) => void }) {
  const filters = config?.filters ?? DEFAULT_FILTERS;
  const [name, setName] = React.useState(initialName);
  const [collapsed, setCollapsed] = React.useState(false);
  const [values, setValues] = React.useState<ReportBuilderValues>(() => initValues(filters));
  const [result, setResult] = React.useState<ReportResult | null>(null);
  const setValue = (k: string, v: string | string[]) => setValues((p) => ({ ...p, [k]: v }));
  const generate = () => setResult(config?.generate?.(values) ?? FALLBACK_RESULT());

  return (
    <div className="flex h-full min-h-0">
      <ReportFilterAside
        collapsed={collapsed}
        onCollapse={() => setCollapsed(true)}
        header={
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Report name"
              className="w-full truncate rounded-md border border-transparent bg-transparent text-body font-semibold text-foreground outline-none hover:border-border focus:border-border focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-caption text-muted-foreground">Customize the filters to generate your report.</p>
          </>
        }
        filters={filters}
        values={values}
        onChange={setValue}
        footer={
          <>
            <button
              type="button"
              onClick={() => setValues(initValues(filters))}
              className="rounded-sm text-body-sm font-semibold text-[var(--status-error)] transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Reset Filters
            </button>
            <div className="ml-auto flex items-center gap-2">
              {onSave ? (
                <Button variant="secondary" onClick={() => onSave(name.trim() || 'Untitled Report')}>Save</Button>
              ) : null}
              <Button onClick={generate}>Generate Report</Button>
            </div>
          </>
        }
      />
      <ReportResultPane
        result={result}
        reportName={name}
        onSubscribe={config?.onSubscribe ? (sub) => config.onSubscribe!(name, sub) : undefined}
        filtersCollapsed={collapsed}
        onExpandFilters={() => setCollapsed(false)}
      />
    </div>
  );
}

/**
 * A SCOPED report template (T-065 follow-up) — a system report whose title
 * and result SHAPE are fixed by the product (`config.render` owns the actual
 * layout: `ReportTable`, a `Dashboard` + chart, whatever the report already
 * used), but exposes a small DECLARED set of filters (date range, site,
 * exception type, …) the user can adjust and regenerate. Distinct from
 * `CustomReportBuilder`: no editable name/Save (it's a system report, not a
 * user-authored one) and `filters` is the template's own honest, scoped set
 * — never the fully-open custom-report filter menu. Rendering
 * `config.render(initValues(config.filters))` on mount means the DEFAULT
 * (unfiltered) output is whatever the report already showed before this
 * wrapper existed — opening a template looks unchanged until the user
 * actually changes a filter and clicks Regenerate.
 */
export interface ReportTemplateConfig {
  title: React.ReactNode;
  description?: React.ReactNode;
  filters: ReportFilterField[];
  /** Renders the report body for the given (applied) filter values. Owns its
   *  own layout/columns/charts — this wrapper only supplies the filter panel
   *  and re-invokes render on Regenerate; it never adds/removes columns or
   *  metrics (that's what "+ New Report" / `CustomReportBuilder` is for). */
  render: (values: ReportBuilderValues) => React.ReactNode;
}

export function ReportTemplateView({ config }: { config: ReportTemplateConfig }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const initial = React.useMemo(() => initValues(config.filters), [config.filters]);
  const [values, setValues] = React.useState<ReportBuilderValues>(initial);
  // The APPLIED values (what's actually rendered) only change on Regenerate —
  // editing a filter previews nothing until the user commits, same as the
  // custom builder's Generate button. Starts at `initial` so the default view
  // is the template's normal (unfiltered) output.
  const [applied, setApplied] = React.useState<ReportBuilderValues>(initial);
  const setValue = (k: string, v: string | string[]) => setValues((p) => ({ ...p, [k]: v }));

  return (
    <div className="flex h-full min-h-0">
      <ReportFilterAside
        collapsed={collapsed}
        onCollapse={() => setCollapsed(true)}
        header={
          <>
            <h2 className="truncate text-body font-semibold text-foreground">{config.title}</h2>
            <p className="text-caption text-muted-foreground">{config.description ?? 'Adjust the filters and regenerate this report.'}</p>
          </>
        }
        filters={config.filters}
        values={values}
        onChange={setValue}
        footer={
          <>
            <button
              type="button"
              onClick={() => setValues(initial)}
              className="rounded-sm text-body-sm font-semibold text-[var(--status-error)] transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Reset Filters
            </button>
            <Button className="ml-auto" onClick={() => setApplied(values)}>Regenerate</Button>
          </>
        }
      />
      <div className="relative min-h-0 flex-1 overflow-auto bg-background">
        {collapsed ? <div className="absolute left-6 top-4 z-10"><PanelToggle onClick={() => setCollapsed(false)} title="Show filters" /></div> : null}
        {config.render(applied)}
      </div>
    </div>
  );
}

/** Generic sample result when the product provides no `generate`. */
function FALLBACK_RESULT(): ReportResult {
  const rows = Array.from({ length: 5 }, (_, i) => ({
    item: `Item ${i + 1}`,
    value: `${100 + i * 5}`,
    when: `12 Jun, ${String(8 + i).padStart(2, '0')}:30`,
  }));
  return {
    columns: [
      { key: 'item', label: 'Item' },
      { key: 'value', label: 'Value' },
      { key: 'when', label: 'Time' },
    ],
    rows,
  };
}
