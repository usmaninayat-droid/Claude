import * as React from 'react';
import { cn } from '../utils/cn';
import { ChartCard, DonutChart, ComplianceGauge, BarChart, CompareBars } from '../data-viz';
import type { CompareBarsProps } from '../data-viz';
import { EventsHeatmap, ServiceLocationsMap } from '../map';
import type { EventsHeatmapProps, ServiceLocationsMapProps } from '../map';
import { Popover, PopoverTrigger, PopoverContent, Avatar } from '../primitives';

export type RagLevel = 'green' | 'amber' | 'red';
const RAG_CELL: Record<RagLevel, string> = {
  green: 'color-mix(in srgb, var(--status-success) 70%, white)',
  amber: 'color-mix(in srgb, var(--status-warning) 72%, white)',
  red: 'color-mix(in srgb, var(--status-error) 65%, white)',
};

/**
 * Declarative dashboard widgets — the config→component bridge that lets a
 * dashboard module render charts/maps from JSON (not hand-coded `render()`).
 * Each widget names a `kind`; the renderer maps it to a DS component. Chart
 * kinds are wrapped in a ChartCard; widgets that carry their own card chrome
 * (compareBars / maps) render directly. `span` is a 12-col grid span.
 */
export type DashboardWidget =
  | {
      kind: 'donut';
      title: React.ReactNode;
      span?: number;
      data: { name: string; value: number; color?: string }[];
      centerValue?: React.ReactNode;
      centerLabel?: React.ReactNode;
    }
  | { kind: 'gauge'; title: React.ReactNode; span?: number; value: number }
  | {
      kind: 'bar';
      title: React.ReactNode;
      span?: number;
      data: Record<string, unknown>[];
      xKey: string;
      series: { dataKey: string; color?: string; name?: string }[];
      /** Stack the series into one bar (e.g. a status trend). */
      stacked?: boolean;
      showLegend?: boolean;
    }
  | {
      kind: 'leaderboard';
      title: React.ReactNode;
      span?: number;
      entries: { label: React.ReactNode; sublabel?: React.ReactNode; value: React.ReactNode; avatarFallback?: string; progress?: number }[];
    }
  | ({ kind: 'compareBars'; span?: number } & CompareBarsProps)
  | ({ kind: 'eventsHeatmap'; span?: number } & EventsHeatmapProps)
  | ({ kind: 'serviceLocations'; span?: number } & ServiceLocationsMapProps)
  | {
      kind: 'statusBreakdown';
      title: React.ReactNode;
      span?: number;
      segments: { label: React.ReactNode; value: number; color: string }[];
    }
  | {
      kind: 'ragHeatmap';
      title: React.ReactNode;
      span?: number;
      columns: React.ReactNode[];
      rows: { label: React.ReactNode; cells: { value?: React.ReactNode; rag: RagLevel }[] }[];
    };

function renderWidget(w: DashboardWidget): React.ReactNode {
  switch (w.kind) {
    case 'donut':
      return (
        <ChartCard title={w.title}>
          <DonutChart
            data={w.data}
            centerLabel={
              w.centerLabel ??
              (w.centerValue != null ? (
                <div className="text-center">
                  <div className="text-h4 font-bold text-foreground">{w.centerValue}</div>
                </div>
              ) : undefined)
            }
          />
        </ChartCard>
      );
    case 'gauge':
      return (
        <ChartCard title={w.title}>
          <div className="flex justify-center py-2">
            <ComplianceGauge value={w.value} size={180} />
          </div>
        </ChartCard>
      );
    case 'bar':
      return (
        <ChartCard title={w.title}>
          <BarChart data={w.data} xKey={w.xKey} series={w.series} stacked={w.stacked} showLegend={w.showLegend} />
        </ChartCard>
      );
    case 'leaderboard':
      return (
        <ChartCard title={w.title}>
          <LeaderboardWidget entries={w.entries} />
        </ChartCard>
      );
    case 'compareBars': {
      const { kind, span, ...props } = w;
      return <CompareBars {...props} />;
    }
    case 'eventsHeatmap': {
      const { kind, span, ...props } = w;
      return <EventsHeatmap {...props} />;
    }
    case 'serviceLocations': {
      const { kind, span, ...props } = w;
      return <ServiceLocationsMap {...props} />;
    }
    case 'statusBreakdown':
      return (
        <ChartCard title={w.title}>
          <StatusBreakdownBar segments={w.segments} />
        </ChartCard>
      );
    case 'ragHeatmap':
      return (
        <ChartCard title={w.title}>
          <RagHeatmapGrid columns={w.columns} rows={w.rows} />
        </ChartCard>
      );
  }
}

/* ── StatusBreakdownBar — one segmented bar + a hover legend popover ──────── */
function StatusBreakdownBar({ segments }: { segments: { label: React.ReactNode; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="flex h-3.5 w-full overflow-hidden rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Status breakdown">
          {segments.map((s, i) => (
            <span key={i} title={`${typeof s.label === 'string' ? s.label : ''}: ${s.value}`} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} className="h-full first:rounded-l-full last:rounded-r-full" />
          ))}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 border-0 bg-[#0f172a] p-2 text-white shadow-xl">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5">
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="truncate text-body-sm">{s.label}</span>
            </span>
            <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-caption font-semibold tabular-nums">{s.value}</span>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/* ── RagHeatmapGrid — rows × columns, cells tinted green/amber/red ────────── */
function RagHeatmapGrid({ columns, rows }: { columns: React.ReactNode[]; rows: { label: React.ReactNode; cells: { value?: React.ReactNode; rag: RagLevel }[] }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: 4 }}>
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" />
            {columns.map((c, i) => (
              <th key={i} className="px-1 py-1 text-center text-[11px] font-medium text-muted-foreground">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              <td className="whitespace-nowrap py-1 pr-2 text-body-sm font-medium text-foreground">{r.label}</td>
              {r.cells.map((cell, ci) => (
                <td key={ci} className="p-0">
                  <div
                    className={cn('flex h-8 min-w-[40px] items-center justify-center rounded-md text-[11px] font-semibold text-foreground/80')}
                    style={{ background: RAG_CELL[cell.rag] }}
                    title={typeof cell.value === 'string' || typeof cell.value === 'number' ? String(cell.value) : undefined}
                  >
                    {cell.value}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardWidgetGrid({ widgets }: { widgets: DashboardWidget[] }) {
  if (!widgets.length) return null;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {widgets.map((w, i) => (
        <div
          key={i}
          className="min-w-0"
          style={{ gridColumn: `span ${w.span ?? 6} / span ${w.span ?? 6}` }}
        >
          {renderWidget(w)}
        </div>
      ))}
    </div>
  );
}

/* ── LeaderboardWidget — ranked rows (rank · avatar · name · value · bar) ──── */
function LeaderboardWidget({ entries }: { entries: { label: React.ReactNode; sublabel?: React.ReactNode; value: React.ReactNode; avatarFallback?: string; progress?: number }[] }) {
  return (
    <div className="flex flex-col gap-1">
      {entries.map((e, i) => {
        const rank = i + 1;
        const top = rank <= 3;
        return (
          <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40">
            <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', top ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{rank}</span>
            <Avatar size="sm" fallback={e.avatarFallback ?? (typeof e.label === 'string' ? e.label.slice(0, 2).toUpperCase() : 'U')} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-body-sm font-medium text-foreground">{e.label}</div>
              {e.sublabel ? <div className="truncate text-caption text-muted-foreground">{e.sublabel}</div> : null}
              {typeof e.progress === 'number' ? (
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, e.progress))}%` }} />
                </div>
              ) : null}
            </div>
            <span className="shrink-0 text-body-sm font-semibold tabular-nums text-foreground">{e.value}</span>
          </div>
        );
      })}
    </div>
  );
}
