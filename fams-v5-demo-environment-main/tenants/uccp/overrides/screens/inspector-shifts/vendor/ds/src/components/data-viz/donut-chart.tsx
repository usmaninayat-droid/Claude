import * as React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartTooltip } from './chart-tooltip';

export interface DonutDatum {
  name: string;
  value: number;
  color?: string;
}

export interface DonutChartProps {
  data: DonutDatum[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  centerLabel?: React.ReactNode;
}

const DEFAULT_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export function DonutChart({ data, height = 200, innerRadius = 50, outerRadius = 80, centerLabel }: DonutChartProps) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={2}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip hideLabel />} />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold text-foreground">
          {centerLabel}
        </div>
      ) : null}
    </div>
  );
}
