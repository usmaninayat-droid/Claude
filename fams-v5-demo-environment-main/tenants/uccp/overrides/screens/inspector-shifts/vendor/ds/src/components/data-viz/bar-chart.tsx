import * as React from 'react';
import { BarChart as RBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartTooltip } from './chart-tooltip';

export interface BarChartProps {
  data: Record<string, any>[];
  xKey: string;
  series: { dataKey: string; color?: string; name?: string }[];
  height?: number;
  stacked?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
}

export function BarChart({ data, xKey, series, height = 240, stacked, showGrid = true, showLegend = false }: BarChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RBar data={data}>
          {showGrid ? <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /> : null}
          <XAxis dataKey={xKey} stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
          <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'color-mix(in srgb, var(--muted-foreground) 8%, transparent)' }} />
          {showLegend ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
          {series.map((s, i) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name ?? s.dataKey}
              fill={s.color ?? `var(--chart-${(i % 5) + 1})`}
              stackId={stacked ? 'stack' : undefined}
              radius={[4, 4, 0, 0]}
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
