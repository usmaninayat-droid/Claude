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
  // Recharts edge case (T-057): a SINGLE 100% slice with paddingAngle renders
  // a sector group with no <path> — an invisible ring. One datum → draw the
  // full ring as a plain SVG circle in that datum's colour instead.
  const single = data.length === 1 ? data[0] : null;
  return (
    <div className="relative" style={{ height }}>
      {single ? (
        <svg width="100%" height="100%" role="img" aria-label={`${single.name}: 100%`}>
          <circle
            cx="50%"
            cy="50%"
            r={(innerRadius + outerRadius) / 2}
            fill="none"
            stroke={single.color ?? DEFAULT_COLORS[0]}
            strokeWidth={outerRadius - innerRadius}
          />
        </svg>
      ) : (
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
      )}
      {centerLabel ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-body-sm font-semibold text-foreground">
          {centerLabel}
        </div>
      ) : null}
    </div>
  );
}
