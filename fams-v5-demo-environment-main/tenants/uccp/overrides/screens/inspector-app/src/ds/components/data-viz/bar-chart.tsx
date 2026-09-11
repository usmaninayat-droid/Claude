import * as React from 'react';
import { BarChart as RBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartTooltip } from './chart-tooltip';

export interface BarChartProps {
  data: Record<string, any>[];
  xKey: string;
  series: { dataKey: string; color?: string; name?: string }[];
  height?: number;
  stacked?: boolean;
  /** 100% stacked — normalise each row's series to sum 100% (implies stacked).
   *  The DS part-to-whole-over-time form (and the pie>6 fallback). */
  percent?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  /** Render as a horizontal bar chart (category axis vertical, value axis
   *  horizontal) — the "top N" / "by zone" ranked-list form (Fleet Manager
   *  Console pass, T-FMC-1). Additive — default false renders the original
   *  vertical layout unchanged. */
  horizontal?: boolean;
  /** Category-axis width in px when `horizontal` (room for long labels). Default 88. */
  categoryWidth?: number;
}

export function BarChart({ data, xKey, series, height = 240, stacked, percent, showGrid = true, showLegend = false, horizontal, categoryWidth = 88 }: BarChartProps) {
  const isStacked = stacked || percent;
  const rows = React.useMemo(() => {
    if (!percent) return data;
    return data.map((row) => {
      const total = series.reduce((s, sr) => s + (Number(row[sr.dataKey]) || 0), 0) || 1;
      const out: Record<string, any> = { ...row };
      series.forEach((sr) => { out[sr.dataKey] = ((Number(row[sr.dataKey]) || 0) / total) * 100; });
      return out;
    });
  }, [data, series, percent]);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RBar data={rows} layout={horizontal ? 'vertical' : 'horizontal'}>
          {showGrid ? <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={!horizontal} vertical={!!horizontal} /> : null}
          {horizontal ? (
            <>
              <XAxis type="number" stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey={xKey} width={categoryWidth} stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
              <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} domain={percent ? [0, 100] : undefined} tickFormatter={percent ? (v: number) => `${Math.round(v)}%` : undefined} />
            </>
          )}
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'color-mix(in srgb, var(--muted-foreground) 8%, transparent)' }} />
          {showLegend ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
          {series.map((s, i) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name ?? s.dataKey}
              fill={s.color ?? `var(--chart-${(i % 5) + 1})`}
              stackId={isStacked ? 'stack' : undefined}
              radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              // recharts 2.x animation bug: equal-valued bars collide on the
              // internal rectangle key during the first animation frame,
              // spamming React duplicate-key warnings. Static render avoids it.
              isAnimationActive={false}
            />
          ))}
        </RBar>
      </ResponsiveContainer>
    </div>
  );
}
