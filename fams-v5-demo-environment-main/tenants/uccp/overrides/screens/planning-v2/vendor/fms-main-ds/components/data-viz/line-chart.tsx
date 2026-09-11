import * as React from 'react';
import { LineChart as RLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { ChartTooltip } from './chart-tooltip';

export interface LineChartProps {
  data: Record<string, any>[];
  xKey: string;
  series: { dataKey: string; color?: string; name?: string; strokeDasharray?: string }[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  /** Vertical annotation lines at specific x values (e.g. "Discharge" events
   *  breaking a rising trend) — optional, backward-compatible. */
  markers?: { t: string; label: string; color?: string }[];
}

export function LineChart({ data, xKey, series, height = 240, showGrid = true, showLegend = false, markers }: LineChartProps) {
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
              strokeDasharray={s.strokeDasharray}
              dot={false}
            />
          ))}
          {markers?.map((m) => (
            <ReferenceLine
              key={`${m.t}-${m.label}`}
              x={m.t}
              stroke={m.color ?? 'var(--status-error, #D92D20)'}
              strokeDasharray="4 4"
              label={{ value: m.label, position: 'top', fill: m.color ?? 'var(--status-error, #D92D20)', fontSize: 11, fontWeight: 600 }}
            />
          ))}
        </RLine>
      </ResponsiveContainer>
    </div>
  );
}
