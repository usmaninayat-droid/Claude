import * as React from 'react';
import { cn } from '../utils/cn';
import { Button, Input, Checkbox, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { FormSheet } from './side-sheet';
import { SearchMd, FilterLines, Calendar, BarChartSquare02, Truck01 } from '../../icons';
import { ChevronDown, X, PanelLeft, Check } from 'lucide-react';
import { ReportTable, type ReportColumn } from './report-table';
import { DateRangePicker } from '../basics';
import type { ReportBuilderConfig, ReportBuilderValues, ReportFilterEntity, ReportFilterField, ReportResult } from './types';

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: ReportFilterEntity[];
  selectedIds: string[];
  onSave: (ids: string[]) => void;
  /** What the items are (e.g. "Assets", "Vehicles", "Sites"). */
  entityLabel?: string;
  /** Per-row leading glyph (defaults to a truck — set for non-vehicle fleets). */
  icon?: React.ReactNode;
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
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-foreground">{a.label}</span>
      {a.meta ? <span className="shrink-0 text-caption text-muted-foreground">{a.meta}</span> : null}
      {(a.tags ?? []).map((t, i) => (
        <span key={i} className="shrink-0 rounded-md bg-[var(--status-warning)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--status-warning)]">
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
              <SearchMd size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search anything here"
                className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-body-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <button type="button" title="Filter" className="flex size-10 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted">
              <FilterLines size={16} />
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
function FilterDropdown({ label, value, placeholder, icon, children }: {
  label: string; value?: React.ReactNode; placeholder: string; icon?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
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

function SeverityChip({ severity }: { severity?: EventType['severity'] }) {
  const map = {
    critical: { label: 'Critical', cls: 'bg-[var(--status-error)]/10 text-[var(--status-error)]' },
    warning: { label: 'Warning', cls: 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]' },
    normal: { label: 'Normal', cls: 'bg-muted text-muted-foreground' },
  } as const;
  const s = map[severity ?? 'normal'];
  return <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold', s.cls)}>{s.label}</span>;
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
  const visible = eventTypes.filter((e) => !q || e.label.toLowerCase().includes(q));
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
        <SearchMd size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search Event" className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-2 text-body-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      <div className="max-h-72 overflow-auto">
        {sel.length ? (
          <>
            <div className="flex items-center justify-between px-1.5 pb-1 pt-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Selected Events</span>
              <button type="button" onClick={() => onUnselectAll(sel.map((e) => e.value))} className="text-[11px] font-semibold text-[var(--status-error)] hover:underline">Unselect All</button>
            </div>
            {sel.map(Row)}
          </>
        ) : null}
        <div className="flex items-center justify-between px-1.5 pb-1 pt-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Event List</span>
          {avail.length ? <button type="button" onClick={() => onSelectAll(avail.map((e) => e.value))} className="text-[11px] font-semibold text-primary hover:underline">Select All</button> : null}
        </div>
        {avail.length ? avail.map(Row) : <p className="px-1.5 py-2 text-caption text-muted-foreground">No more events.</p>}
      </div>
    </div>
  );
}

/* ── Config-driven filter field controls — render any ReportFilterField ───── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{children}</span>;
}

function MultiSelectField({ field, value, onChange }: { field: Extract<ReportFilterField, { kind: 'multiSelect' }>; value: string[]; onChange: (v: string[]) => void }) {
  const [query, setQuery] = React.useState('');
  const first = field.options.find((o) => o.value === value[0])?.label;
  const caption = value.length > 1 ? `${value.length} selected` : first;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
          <FieldLabel>{field.label}</FieldLabel>
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-body-sm font-medium text-foreground">{caption ?? <span className="text-muted-foreground">{field.label}</span>}</span>
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
  return (
    <div>
      <FieldLabel>{field.label}</FieldLabel>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex items-center gap-2 text-body-sm">
          <Truck01 size={15} className="text-muted-foreground" />
          {value.length ? <span className="font-semibold text-primary">{value.length} {entityLabel} Selected</span> : <span className="text-muted-foreground">Select {entityLabel}</span>}
        </span>
        <ChevronDown size={15} className="text-muted-foreground" />
      </button>
      <AssetSelectSideSheet open={open} onOpenChange={setOpen} assets={field.items} selectedIds={value} entityLabel={entityLabel} onSave={(ids) => { onChange(ids); setOpen(false); }} />
    </div>
  );
}

function NumberRangeField({ field, value, onChange }: { field: Extract<ReportFilterField, { kind: 'numberRange' }>; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <FieldLabel>{field.label}</FieldLabel>
      <div className="flex items-center rounded-lg border border-border bg-card px-2">
        <span className="text-[10px] text-muted-foreground">Over</span>
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 border-0 px-1 text-body-sm focus-visible:ring-0" />
        {field.unit ? <span className="text-caption font-semibold text-primary">{field.unit}</span> : null}
      </div>
    </div>
  );
}

function SelectField({ field, value, onChange }: { field: Extract<ReportFilterField, { kind: 'select' }>; value: string; onChange: (v: string) => void }) {
  const current = field.options.find((o) => o.value === value)?.label;
  return (
    <FilterDropdown label={field.label} placeholder={field.label} value={current}>
      {field.options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className={cn('flex w-full rounded-md px-2 py-1.5 text-left text-body-sm hover:bg-muted', o.value === value && 'font-semibold text-primary')}>{o.label}</button>
      ))}
    </FilterDropdown>
  );
}

function FilterFieldControl({ field, value, onChange }: { field: ReportFilterField; value: string | string[] | undefined; onChange: (v: string | string[]) => void }) {
  switch (field.kind) {
    case 'date':
      return <DateRangePicker field={{ label: field.label }} mode={field.mode ?? 'range'} value={(value as string) || undefined} onApply={(r) => onChange(r.label)} />;
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
      {collapsed ? (
        <button type="button" onClick={() => setCollapsed(false)} title="Show filters" className="flex w-10 shrink-0 items-center justify-center border-r border-border bg-card text-muted-foreground hover:bg-muted">
          <PanelLeft size={18} />
        </button>
      ) : (
        <aside className="flex w-[300px] shrink-0 flex-col border-r border-border bg-card">
          <div className="flex items-start justify-between gap-2 px-4 py-4">
            <div className="min-w-0 flex-1">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Report name"
                className="w-full truncate rounded-md border border-transparent bg-transparent text-body font-semibold text-foreground outline-none hover:border-border focus:border-border focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-caption text-muted-foreground">Customize the filters to generate your report.</p>
            </div>
            <button type="button" onClick={() => setCollapsed(true)} title="Collapse" className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted">
              <PanelLeft size={15} />
            </button>
          </div>

          {/* Filters — entirely config-driven (domain-agnostic) */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-4 pb-4">
            {filters.map((f) => (
              <FilterFieldControl key={f.key} field={f} value={values[f.key]} onChange={(v) => setValue(f.key, v)} />
            ))}
          </div>

          <div className="flex gap-2 border-t border-border px-4 py-4">
            {onSave ? (
              <Button variant="secondary" className="flex-1" onClick={() => onSave(name.trim() || 'Untitled Report')}>Save</Button>
            ) : null}
            <Button className="flex-1" onClick={generate}>Generate Report</Button>
          </div>
        </aside>
      )}

      <div className="min-h-0 flex-1 overflow-auto bg-background">
        {result ? (
          <ReportTable
            columns={result.columns.map((c): ReportColumn => ({ key: c.key, label: c.label, groupable: true }))}
            rows={result.rows}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <div className="mb-1 flex size-20 items-center justify-center rounded-full bg-muted">
              <BarChartSquare02 size={36} className="text-muted-foreground" />
            </div>
            <div className="text-h6 font-semibold text-foreground">No Reports Available</div>
            <p className="max-w-xs text-body-sm text-muted-foreground">Configure your report using the panel on the left to start visualizing your data.</p>
          </div>
        )}
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
