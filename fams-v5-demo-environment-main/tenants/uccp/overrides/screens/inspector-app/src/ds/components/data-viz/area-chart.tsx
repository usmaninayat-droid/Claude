import * as React from 'react';
import { AreaChart as RArea, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from './chart-tooltip';

export interface AreaChartProps {
  data: Record<string, any>[];
  xKey: string;
  series: { dataKey: string; color?: string; name?: string }[];
  height?: number;
}

export function AreaChart({ data, xKey, series, height = 240 }: AreaChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RArea data={data}>
          <defs>
            {series.map((s, i) => {
              const color = s.color ?? `var(--chart-${(i % 5) + 1})`;
              return (
                <linearGradient key={s.dataKey} id={`area-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey={xKey} stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
          <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
          {series.map((s, i) => {
            const color = s.color ?? `var(--chart-${(i % 5) + 1})`;
            return (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name ?? s.dataKey}
                stroke={color}
                fill={`url(#area-${s.dataKey})`}
                strokeWidth={2}
              />
            );
          })}
        </RArea>
      </ResponsiveContainer>
    </div>
  );
}
