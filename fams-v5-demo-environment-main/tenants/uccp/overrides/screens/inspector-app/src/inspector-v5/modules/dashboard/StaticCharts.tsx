import * as React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import { AreaChart as RArea, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartTooltip } from '@ds/components/data-viz';
import type { DonutDatum } from '@ds/components/data-viz';

/**
 * StaticDonutChart / StaticAreaChart — dashboard-only, non-animated stand-ins
 * for `@ds/components/data-viz`'s DonutChart/AreaChart.
 *
 * Root cause (T-QMME dashboard QA pass): recharts' Pie/Area enter animations
 * run entirely on requestAnimationFrame via react-smooth. In a backgrounded /
 * hidden webview (document.hidden === true — exactly the environment this
 * dashboard is QA'd and often embedded in), Chromium throttles rAF to a halt,
 * so the animation never advances past its first frame — Pie's `Sector`
 * bails out with `startAngle === endAngle` (nothing painted), and Area's
 * enter-transition is stuck the same way. BarChart already works around this
 * exact recharts issue with `isAnimationActive={false}` (see bar-chart.tsx);
 * GaugeChart is unaffected because it isn't rAF-animated recharts.
 * DonutChart/AreaChart in src/ds don't expose an animation toggle, so this
 * file reuses the same recharts primitives/visual spec with animation
 * disabled, kept local to the dashboard mapping layer.
 */

const DEFAULT_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export interface StaticDonutChartProps {
  data: DonutDatum[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}

export function StaticDonutChart({ data, height = 200, innerRadius = 50, outerRadius = 80 }: StaticDonutChartProps) {
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
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
              ))}
            </Pie>
            <RTooltip content={<ChartTooltip hideLabel />} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export interface StaticAreaChartProps {
  data: Record<string, any>[];
  xKey: string;
  series: { dataKey: string; color?: string; name?: string }[];
  height?: number;
}

export function StaticAreaChart({ data, xKey, series, height = 240 }: StaticAreaChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RArea data={data}>
          <defs>
            {series.map((s, i) => {
              const color = s.color ?? `var(--chart-${(i % 5) + 1})`;
              return (
                <linearGradient key={s.dataKey} id={`static-area-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
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
                fill={`url(#static-area-${s.dataKey})`}
                strokeWidth={2}
                isAnimationActive={false}
              />
            );
          })}
        </RArea>
      </ResponsiveContainer>
    </div>
  );
}
