import * as React from 'react';
import { Search, X, Download, ChevronRight, AlarmClock, Navigation, Target, TrendingDown, LayoutGrid, type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { KpiMetricCard, type KpiMetricCardProps } from './kpi-metric-card';
import { StatusBreakdownCard, type StatIcon } from './status-breakdown-card';
import { CriticalEventsList, type CriticalEvent } from '../widgets';
import { ChartCard, BarChart, LineChart, AreaChart, DonutChart, ActivityBar, IconBadge } from '../data-viz';
import { DataTable, type DataTableColumn, RawDataSheet } from '../data-display';
import { MapView, type MapMarker } from '../map';
import { DateRangePicker, SearchableSelect, type SearchableSelectOption } from '../basics';

/**
 * FleetManagerConsole — Operations Center sibling VIEW (tab #2 next to the
 * Dispatcher Cockpit), ported from the telematics product's
 * `ops-center/FleetManagerConsole.tsx` (Pass 1, T-FMC). A tall, config-driven
 * operations console composed entirely from DS components (ChartCard + the 4
 * data-viz chart kinds + StatusBreakdownCard + ActivityBar + MapView + DataTable
 * + RawDataSheet + DateRangePicker + SearchableSelect multiple-mode) — every
 * KPI/series/status/row is DATA passed in as props; the seed lives in the
 * BLOCK (`operations-center.block.tsx`), never baked in here (Law 4).
 *
 * Domain-agnostic by construction: no "Fleet"/"Vehicle" vocabulary is hardcoded
 * in this file — every label, icon and column comes from `FleetManagerConsoleProps`.
 * Interactivity (owned locally, page-scoped state): multi-select facet filters
 * + active chips filter the operational register; KPI/stat cards open the DS
 * `RawDataSheet` when they carry a `rawData` payload.
 *
 * PASS 1 SCOPE: the GIS map row reuses DS `MapView` with markers only — the
 * tabbed Routes/Zones/Bins/Complaints/Events left-list (`GisConsoleMap`, the
 * largest net-new widget) is Pass 2 (see the TODO below). Chart cards render at
 * a fixed px height per config rather than measuring/filling their card's
 * height (the Fill/ResizeObserver hack in the reference product) — DS-wide
 * "charts fill parent height" is tracked as a separate DS ticket.
 */

export type FmcIcon = LucideIcon | React.ComponentType<{ size?: number; className?: string }>;

export interface FmcFilterOption {
  value: string;
  label: string;
  count?: number;
  icon?: FmcIcon;
}

export interface FmcFilterFacet {
  id: string;
  label: string;
  options: FmcFilterOption[];
  /** Evaluated per operational-register row to test facet membership when
   *  this facet has an active selection. Omit for a facet that doesn't filter
   *  the register (purely informational). */
  matchRow?: (row: any) => string;
}

export interface FmcKpi extends Omit<KpiMetricCardProps, 'onClick' | 'id'> {
  id: string;
  /** Opens the DS RawDataSheet with this payload when the card is clicked. */
  rawData?: FmcRawDataConfig;
}

export interface FmcStatItem {
  id: string;
  label: string;
  value: string;
  rawData?: FmcRawDataConfig;
}

export interface FmcRawDataConfig {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  rows: any[];
  columns: DataTableColumn<any>[];
  fileName?: string;
}

export interface FmcAvailabilityConfig {
  title: string;
  icon?: FmcIcon;
  filterLabel?: string;
  /** Raw per-status counts (rendered padded + as the segmented bar). */
  segments: { key: string; label: string; value: number; color: string }[];
}

export interface FmcFulfilmentItem {
  id: string;
  label: string;
  icon?: FmcIcon;
  num: number;
  den: number;
  unit: string;
  numUnit?: string;
  pct: number;
  color: string;
}

export interface FmcFulfilmentConfig {
  title: string;
  icon?: FmcIcon;
  items: FmcFulfilmentItem[];
}

export interface FmcMapConfig {
  title?: string;
  center: [number, number];
  zoom?: number;
  markers: MapMarker[];
}

export type FmcChartKind = 'bar' | 'bar-horizontal' | 'line' | 'area' | 'donut' | 'alert-feed';

export interface FmcChartConfig {
  id: string;
  kind: FmcChartKind;
  title: string;
  subtitle?: string;
  icon?: FmcIcon;
  height?: number;
  /* bar / bar-horizontal / line / area */
  data?: Record<string, any>[];
  xKey?: string;
  series?: { dataKey: string; name?: string; color?: string }[];
  stacked?: boolean;
  showLegend?: boolean;
  categoryWidth?: number;
  /* donut */
  donutData?: { name: string; value: number; display: string; color: string }[];
  centerValue?: React.ReactNode;
  centerSub?: React.ReactNode;
  delta?: string;
  legendBelow?: boolean;
  /* alert-feed — renders via the DS CriticalEventsList (kept as its own
   *  `FmcChartConfig` slot for the config layer; each row is a `CriticalEvent`). */
  alerts?: CriticalEvent[];
  emptyLabel?: string;
}

export type FmcChartRow =
  | { layout: 'full'; chart: FmcChartConfig }
  | { layout: 'split'; charts: [FmcChartConfig, FmcChartConfig] };

export interface FmcRegisterConfig {
  title: string;
  icon?: FmcIcon;
  columns: DataTableColumn<any>[];
  rows: any[];
  searchPlaceholder?: string;
}

export interface FleetManagerConsoleProps {
  insight?: { message: React.ReactNode; timeLeft?: string; tone?: 'error' | 'warning' | 'info'; onView?: () => void };
  dateRangePresets?: string[];
  /** Toolbar rows — each nested array renders as one flex-wrap row of facets. */
  filterRows: FmcFilterFacet[][];
  onExport?: () => void;
  primaryKpis: FmcKpi[];
  exceptionKpis: FmcKpi[];
  availability: FmcAvailabilityConfig;
  map: FmcMapConfig;
  fulfilment: FmcFulfilmentConfig;
  chartRows: FmcChartRow[];
  /** Fuel-style simple stat bands (value + label, no accent) — each nested
   *  array is one grid row. */
  statBands?: FmcStatItem[][];
  /** Chart rows rendered after the stat bands (kept as a separate slot so a
   *  consumer can group "primary" vs. "secondary" analytics sections). */
  secondaryChartRows?: FmcChartRow[];
  register: FmcRegisterConfig;
  className?: string;
}

/* ── Insight banner ──────────────────────────────────────────────────────── */
function InsightBanner({ message, timeLeft, tone = 'error', onView }: NonNullable<FleetManagerConsoleProps['insight']>) {
  const toneVar = tone === 'warning' ? 'var(--status-warning)' : tone === 'info' ? 'var(--primary)' : 'var(--status-error)';
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-md border py-2 pl-3 pr-2"
      style={{
        background: `color-mix(in srgb, ${toneVar} 8%, var(--card))`,
        borderColor: `color-mix(in srgb, ${toneVar} 22%, transparent)`,
        borderLeftWidth: 3, borderLeftColor: toneVar,
      }}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-card">
        <AlarmClock size={14} style={{ color: toneVar }} />
      </span>
      <span className="min-w-0 flex-1 text-body-sm font-semibold text-foreground">{message}</span>
      {timeLeft ? <span className="shrink-0 rounded px-2 py-1 text-caption font-semibold text-muted-foreground">{timeLeft}</span> : null}
      {onView ? (
        <button type="button" aria-label="View details" onClick={onView} className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted">
          <ChevronRight size={16} />
        </button>
      ) : null}
    </div>
  );
}

/* ── Toolbar + active chips ──────────────────────────────────────────────── */
function Toolbar({
  filterRows, filters, onFiltersChange, dateRangePresets, dateLabel, onDateChange, onExport,
}: {
  filterRows: FmcFilterFacet[][];
  filters: Record<string, string[]>;
  onFiltersChange: (next: Record<string, string[]>) => void;
  dateRangePresets?: string[];
  dateLabel: string | null;
  onDateChange: (label: string) => void;
  onExport?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {filterRows.map((row, ri) => (
        <div key={ri} className="flex flex-wrap items-center gap-3">
          {ri === 0 ? (
            <DateRangePicker
              key={dateLabel ?? 'placeholder'}
              presets={dateRangePresets}
              placeholder="Select Date Range"
              value={dateLabel ?? undefined}
              onApply={(r) => onDateChange(r.label)}
            />
          ) : null}
          {row.map((f) => (
            <SearchableSelect
              key={f.id}
              multiple
              aria-label={f.label}
              values={filters[f.id] ?? []}
              onValuesChange={(vals) => onFiltersChange({ ...filters, [f.id]: vals })}
              options={f.options as SearchableSelectOption[]}
              placeholder={f.label}
              triggerClassName="w-auto min-w-[180px] max-w-[280px]"
            />
          ))}
          {ri === 0 && onExport ? (
            <button
              type="button" aria-label="Export dashboard" title="Export dashboard" onClick={onExport}
              className="ml-auto flex size-10 items-center justify-center rounded-lg border transition-colors hover:bg-muted/40"
              style={{ borderColor: 'var(--status-success)', color: 'var(--status-success)' }}
            >
              <Download size={16} />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ActiveChips({
  filterRows, filters, onFiltersChange, dateLabel, onClearDate, onClearAll,
}: {
  filterRows: FmcFilterFacet[][];
  filters: Record<string, string[]>;
  onFiltersChange: (next: Record<string, string[]>) => void;
  dateLabel: string | null;
  onClearDate: () => void;
  onClearAll: () => void;
}) {
  const facets = React.useMemo(() => filterRows.flat(), [filterRows]);
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (dateLabel) chips.push({ key: '__date', label: dateLabel, clear: onClearDate });
  for (const f of facets) {
    for (const v of filters[f.id] ?? []) {
      const opt = f.options.find((o) => o.value === v);
      chips.push({
        key: `${f.id}:${v}`,
        label: opt?.label ?? v,
        clear: () => onFiltersChange({ ...filters, [f.id]: (filters[f.id] ?? []).filter((x) => x !== v) }),
      });
    }
  }
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-caption font-medium text-muted-foreground">Active:</span>
      {chips.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 py-0.5 pl-2.5 pr-1 text-caption font-medium text-foreground">
          {c.label}
          <button type="button" aria-label={`Remove ${c.label}`} onClick={c.clear} className="flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
            <X size={11} />
          </button>
        </span>
      ))}
      <button type="button" onClick={onClearAll} className="text-caption font-semibold text-primary hover:underline">Clear all</button>
    </div>
  );
}

/* ── KPI / stat bands ────────────────────────────────────────────────────── */
function KpiBand({ items, onOpenRaw }: { items: FmcKpi[]; onOpenRaw: (raw: FmcRawDataConfig) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      {items.map(({ rawData, ...card }) => (
        <KpiMetricCard key={card.id} {...card} onClick={rawData ? () => onOpenRaw(rawData) : undefined} />
      ))}
    </div>
  );
}

function StatBand({ items, onOpenRaw }: { items: FmcStatItem[]; onOpenRaw: (raw: FmcRawDataConfig) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((s) => (
        <KpiMetricCard key={s.id} value={s.value} label={s.label} onClick={s.rawData ? () => onOpenRaw(s.rawData!) : undefined} />
      ))}
    </div>
  );
}

/* ── Fleet Availability → StatusBreakdownCard adapter ───────────────────── */
function toAvailabilityProps(cfg: FmcAvailabilityConfig) {
  const segments = cfg.segments.filter((s) => s.value > 0); // T-058: zero-value segments break the cumulative z-order
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const bars = segments.map((s) => { acc += s.value; return { color: s.color, width: (acc / total) * 100 }; });
  return {
    title: cfg.title,
    icon: cfg.icon as StatIcon | undefined,
    filterLabel: cfg.filterLabel,
    stats: cfg.segments.map((s) => ({ label: s.label, value: String(s.value).padStart(2, '0'), color: s.color })),
    bars,
  };
}

/* ── GIS map (Pass 1 — markers only) ─────────────────────────────────────── */
function GisMapSection({ map }: { map: FmcMapConfig }) {
  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <IconBadge icon={<Navigation size={16} />} color="var(--primary)" size={32} />
        <h3 className="text-body-sm font-semibold text-foreground">{map.title ?? 'Live Map'}</h3>
        <span className="ml-auto text-caption text-muted-foreground">{map.markers.length} tracked</span>
      </header>
      {/* TODO(FMC Pass 2: tabbed GisConsoleMap — Routes/Zones/Bins/Complaints/Events
          left-list + toggleable legend + collapse + polygon/heat overlays + clustering) */}
      <div className="relative min-h-[420px] flex-1">
        <MapView center={map.center} zoom={map.zoom ?? 11} markers={map.markers} />
      </div>
    </section>
  );
}

/* ── Fulfilment KPIs ─────────────────────────────────────────────────────── */
function FulfilmentSection({ title, icon: Icon, items }: FmcFulfilmentConfig) {
  return (
    <ChartCard title={title} icon={Icon ? <Icon size={16} /> : <Target size={16} />} iconColor="var(--primary)">
      <div className="flex flex-col divide-y divide-border">
        {items.map((f) => {
          const FIcon = f.icon;
          return (
            <div key={f.id} className="flex flex-col gap-2 py-3 first:pt-1 last:pb-1">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-body-sm font-medium text-foreground">{FIcon ? <FIcon size={14} /> : null}{f.label}</span>
                <span className="text-caption text-muted-foreground">
                  <span className="font-semibold text-foreground">{f.num.toLocaleString()}</span> {f.numUnit ?? f.unit} / {f.den.toLocaleString()} {f.unit}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {/* Bar clamps to 100 (a bar can't visually exceed its own track) while the
                    label keeps the raw value — so a >100% row (e.g. saturation past capacity)
                    reads "Over target" instead of silently looking maxed-out. */}
                <span className="min-w-0 flex-1"><ActivityBar height={10} total={100} segments={[{ id: f.id, label: f.label, value: Math.min(f.pct, 100), color: f.color }]} /></span>
                <span className="flex w-16 shrink-0 flex-col items-end">
                  <span className="text-body-sm font-bold tabular-nums" style={{ color: f.color }}>{f.pct}%</span>
                  {f.pct > 100 ? <span className="text-caption font-medium text-muted-foreground">Over target</span> : null}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

/* ── Generic chart-row renderer ──────────────────────────────────────────── */
function ChartBody({ cfg }: { cfg: FmcChartConfig }) {
  switch (cfg.kind) {
    case 'bar':
      return <BarChart data={cfg.data ?? []} xKey={cfg.xKey ?? 'x'} series={cfg.series ?? []} height={cfg.height ?? 280} stacked={cfg.stacked} showLegend={cfg.showLegend} />;
    case 'bar-horizontal':
      return <BarChart data={cfg.data ?? []} xKey={cfg.xKey ?? 'x'} series={cfg.series ?? []} height={cfg.height ?? 280} horizontal categoryWidth={cfg.categoryWidth} />;
    case 'line':
      return <LineChart data={cfg.data ?? []} xKey={cfg.xKey ?? 'x'} series={cfg.series ?? []} height={cfg.height ?? 280} showLegend={cfg.showLegend} />;
    case 'area':
      return <AreaChart data={cfg.data ?? []} xKey={cfg.xKey ?? 'x'} series={cfg.series ?? []} height={cfg.height ?? 280} />;
    case 'donut': {
      const data = cfg.donutData ?? [];
      const hasCenter = cfg.centerValue != null || cfg.centerSub != null;
      return (
        <div className={cfg.legendBelow ? 'flex flex-1 flex-col items-center gap-4' : 'flex flex-1 flex-col items-center gap-5 sm:flex-row'}>
          <div className="mx-auto shrink-0" style={{ width: 200 }}>
            <DonutChart
              data={data.map((d) => ({ name: d.name, value: d.value, color: d.color }))}
              height={cfg.height ?? 190} innerRadius={64} outerRadius={86}
              centerLabel={hasCenter ? (
                <div className="flex flex-col items-center text-center leading-tight" style={{ maxWidth: 116 }}>
                  {cfg.centerValue != null ? <div className="text-body-lg font-bold text-foreground">{cfg.centerValue}</div> : null}
                  {cfg.centerSub != null ? <div className="text-caption text-muted-foreground">{cfg.centerSub}</div> : null}
                  {cfg.delta ? (
                    <div className="mt-0.5 inline-flex items-center gap-0.5 text-caption font-semibold" style={{ color: 'var(--status-error)' }}>
                      <TrendingDown size={10} /> {cfg.delta}
                    </div>
                  ) : null}
                </div>
              ) : undefined}
            />
          </div>
          <ul className={cfg.legendBelow ? 'flex flex-wrap items-center justify-center gap-x-5 gap-y-2' : 'flex w-full min-w-0 flex-col gap-2.5 sm:max-w-[340px]'}>
            {data.map((d) => (
              <li key={d.name} className="flex items-center gap-2 text-caption">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                <span className={cfg.legendBelow ? 'text-foreground' : 'min-w-0 flex-1 truncate text-foreground'}>{d.name}</span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">{d.display}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case 'alert-feed':
      return <CriticalEventsList events={cfg.alerts ?? []} emptyState={cfg.emptyLabel} className="flex-1 overflow-y-auto" />;
    default:
      return null;
  }
}

function ChartRowView({ row }: { row: FmcChartRow }) {
  if (row.layout === 'full') {
    const c = row.chart;
    return (
      <ChartCard title={c.title} subtitle={c.subtitle} icon={c.icon ? <c.icon size={16} /> : undefined} iconColor="var(--primary)">
        <ChartBody cfg={c} />
      </ChartCard>
    );
  }
  return (
    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
      {row.charts.map((c) => (
        <ChartCard key={c.id} title={c.title} subtitle={c.subtitle} icon={c.icon ? <c.icon size={16} /> : undefined} iconColor="var(--primary)" className="flex flex-col">
          <ChartBody cfg={c} />
        </ChartCard>
      ))}
    </div>
  );
}

/* ── Operational register (DataTable + search) ──────────────────────────── */
function OperationalRegister({ register, visibleRows }: { register: FmcRegisterConfig; visibleRows: any[] }) {
  const [q, setQ] = React.useState('');
  const rows = q
    ? visibleRows.filter((r) => Object.values(r).some((v) => (typeof v === 'string' || typeof v === 'number') && String(v).toLowerCase().includes(q.toLowerCase())))
    : visibleRows;
  const Icon = register.icon ?? LayoutGrid;
  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <IconBadge icon={<Icon size={16} />} color="var(--primary)" size={32} />
        <h3 className="text-body-sm font-semibold text-foreground">{register.title}</h3>
        {/* C6: Y = the active facet-filtered population (visibleRows), never the raw unfiltered seed total. */}
        <span className="text-caption text-muted-foreground">{rows.length} of {visibleRows.length}</span>
      </header>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder={register.searchPlaceholder ?? 'Search anything here'}
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-body-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
      <div className="max-h-[560px] overflow-auto">
        {rows.length ? (
          <DataTable columns={register.columns} data={rows} getRowId={(r, i) => String(r?.id ?? i)} stickyHeader manageColumns />
        ) : (
          <div className="p-10 text-center text-body-sm text-muted-foreground">No records match the current filters.</div>
        )}
      </div>
    </section>
  );
}

/* ── the console ─────────────────────────────────────────────────────────── */
export function FleetManagerConsole({
  insight, dateRangePresets, filterRows, onExport, primaryKpis, exceptionKpis,
  availability, map, fulfilment, chartRows, statBands, secondaryChartRows, register, className,
}: FleetManagerConsoleProps) {
  const [filters, setFilters] = React.useState<Record<string, string[]>>({});
  const [dateLabel, setDateLabel] = React.useState<string | null>(null);
  const [rawData, setRawData] = React.useState<FmcRawDataConfig | null>(null);

  const facets = React.useMemo(() => filterRows.flat(), [filterRows]);
  const visibleRegisterRows = React.useMemo(
    () => register.rows.filter((r) => facets.every((f) => {
      const sel = filters[f.id];
      if (!sel?.length || !f.matchRow) return true;
      return sel.includes(f.matchRow(r));
    })),
    [register.rows, filters, facets],
  );

  return (
    <div className={cn('flex flex-col gap-4 p-6 pb-16', className)}>
      {insight ? <InsightBanner {...insight} /> : null}

      <Toolbar
        filterRows={filterRows} filters={filters} onFiltersChange={setFilters}
        dateRangePresets={dateRangePresets} dateLabel={dateLabel} onDateChange={setDateLabel} onExport={onExport}
      />
      <ActiveChips
        filterRows={filterRows} filters={filters} onFiltersChange={setFilters}
        dateLabel={dateLabel} onClearDate={() => setDateLabel(null)} onClearAll={() => { setFilters({}); setDateLabel(null); }}
      />

      <KpiBand items={primaryKpis} onOpenRaw={setRawData} />
      <KpiBand items={exceptionKpis} onOpenRaw={setRawData} />

      <StatusBreakdownCard {...toAvailabilityProps(availability)} />

      <GisMapSection map={map} />

      <FulfilmentSection {...fulfilment} />

      {chartRows.map((row, i) => <ChartRowView key={i} row={row} />)}

      {statBands?.map((band, i) => <StatBand key={`stat-${i}`} items={band} onOpenRaw={setRawData} />)}

      {secondaryChartRows?.map((row, i) => <ChartRowView key={`sec-${i}`} row={row} />)}

      <OperationalRegister register={register} visibleRows={visibleRegisterRows} />

      <RawDataSheet
        open={!!rawData}
        onOpenChange={(o) => { if (!o) setRawData(null); }}
        title={rawData?.title ?? ''}
        subtitle={rawData?.subtitle}
        rows={rawData?.rows ?? []}
        columns={rawData?.columns ?? []}
        fileName={rawData?.fileName}
      />
    </div>
  );
}
