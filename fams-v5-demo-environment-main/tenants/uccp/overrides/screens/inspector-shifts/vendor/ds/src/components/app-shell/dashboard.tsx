import * as React from 'react';
import { cn } from '../utils/cn';
import { KpiTile, ChartCard } from '../data-viz';
import type { KpiTileProps } from '../data-viz';
import { DateRangePicker } from '../basics';
import { Popover, PopoverTrigger, PopoverContent, Checkbox } from '../primitives';
import { Download01 } from '../../icons';
import { ChevronDown, Check } from 'lucide-react';

/** One option in a dashboard filter field — a colored dot + label + count. */
export interface DashboardFilterOption {
  value: string;
  label: React.ReactNode;
  /** Legend dot color (token or hex). */
  color?: string;
  count?: number;
}

/** A dashboard top-bar filter field (a labeled multi-select dropdown). */
export interface DashboardFilterField {
  id: string;
  label: React.ReactNode;
  options: DashboardFilterOption[];
  selected?: string[];
  onChange?: (selected: string[]) => void;
}

/**
 * Dashboard — a polished, config-driven dashboard layout matching the demo
 * apps (Truemax / CRM / EAD): a date-range header, a KPI tile row, and a
 * 12-column grid of chart cards. Dashboard module instances compose this.
 */

export interface DashboardKpi extends KpiTileProps {
  id?: string;
}

export interface DashboardSection {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  /** Grid span out of 12 (default 6). */
  span?: number;
  bodyHeight?: number | string;
  /** Right-aligned header slot (legend / actions). */
  legend?: React.ReactNode;
  children: React.ReactNode;
}

export interface DashboardProps {
  /** Preset range pills (e.g. "Last 7 Days"). The first is active by default. */
  ranges?: string[];
  /** Label shown next to the calendar icon (e.g. "28 Jan – 26 Feb, 2026"). */
  dateLabel?: React.ReactNode;
  activeRange?: string;
  onRangeChange?: (range: string) => void;
  kpis?: DashboardKpi[];
  sections?: DashboardSection[];
  /** Top-bar filter fields (labeled multi-select dropdowns with colored options). */
  filters?: DashboardFilterField[];
  /** Right-aligned Export action in the header. */
  onExport?: () => void;
  exportLabel?: React.ReactNode;
  /** Extra content rendered below the chart grid (feeds, tables…). */
  children?: React.ReactNode;
  className?: string;
}

export function Dashboard({
  ranges,
  dateLabel,
  activeRange,
  onRangeChange,
  kpis,
  sections,
  filters,
  onExport,
  exportLabel = 'Export',
  children,
  className,
}: DashboardProps) {
  const [internalRange, setInternalRange] = React.useState(activeRange ?? ranges?.[0]);
  const active = activeRange ?? internalRange;
  const pick = (r: string) => { setInternalRange(r); onRangeChange?.(r); };

  return (
    <div className={cn('flex flex-col gap-4 p-6', className)}>
      {/* Header — date-range picker + filter fields (left) · Export (right). */}
      {(dateLabel || ranges?.length || filters?.length || onExport) && (
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker
            value={dateLabel ?? active}
            presets={ranges}
            onApply={(r) => { pick(r.preset ?? r.label); }}
          />
          {filters?.map((f) => <DashboardFilterDropdown key={f.id} field={f} />)}
          {onExport ? (
            <button
              type="button"
              onClick={onExport}
              className="ml-auto flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-body-sm font-semibold text-primary-foreground outline-none transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Download01 size={15} />
              {exportLabel}
            </button>
          ) : null}
        </div>
      )}

      {/* KPI row */}
      {kpis?.length ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
          {kpis.map((k, i) => {
            const { id, ...rest } = k;
            return <KpiTile key={id ?? i} {...rest} />;
          })}
        </div>
      ) : null}

      {/* Chart grid — 12-col on lg; spans clamp to full width on mobile */}
      {sections?.length ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {sections.map((s) => (
            <div
              key={s.id}
              className="min-w-0"
              style={{ gridColumn: `span ${s.span ?? 6} / span ${s.span ?? 6}` }}
            >
              <ChartCard title={s.title} subtitle={s.subtitle} icon={s.icon} legend={s.legend} bodyHeight={s.bodyHeight}>
                {s.children}
              </ChartCard>
            </div>
          ))}
        </div>
      ) : null}

      {children}
    </div>
  );
}

/* ── Dashboard filter field — a labeled multi-select dropdown (colored options
   + counts), shown in the dashboard top bar. Config-driven. ──────────────── */
function DashboardFilterDropdown({ field }: { field: DashboardFilterField }) {
  const controlled = field.selected !== undefined;
  const [internal, setInternal] = React.useState<string[]>(field.selected ?? []);
  const selected = controlled ? field.selected! : internal;
  const setSelected = (next: string[]) => { if (!controlled) setInternal(next); field.onChange?.(next); };
  const toggle = (v: string) => setSelected(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-body-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          {field.label}
          {selected.length ? (
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{selected.length}</span>
          ) : null}
          <ChevronDown size={14} className="text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-72 w-64 overflow-auto p-1">
        {field.options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button key={o.value} type="button" onClick={() => toggle(o.value)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-body-sm hover:bg-muted">
              <span className={cn('flex size-4 shrink-0 items-center justify-center rounded border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>{on ? <Check size={10} /> : null}</span>
              {o.color ? <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: o.color }} /> : null}
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              {o.count !== undefined ? <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">{o.count}</span> : null}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
