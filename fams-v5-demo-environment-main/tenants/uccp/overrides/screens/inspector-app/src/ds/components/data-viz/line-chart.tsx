import * as React from 'react';
import { LineChart as RLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartTooltip } from './chart-tooltip';

export interface LineChartProps {
  data: Record<string, any>[];
  xKey: string;
  series: { dataKey: string; color?: string; name?: string }[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

export function LineChart({ data, xKey, series, height = 240, showGrid = true, showLegend = false }: LineChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RLine data={data}>
          {showGrid ? <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /> : null}
          <XAxis dataKey={xKey} stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
          <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
          {showLegend ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
          {series.map((s, i) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name ?? s.dataKey}
              stroke={s.color ?? `var(--chart-${(i % 5) + 1})`}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </RLine>
      </ResponsiveContainer>
    </div>
  );
}
