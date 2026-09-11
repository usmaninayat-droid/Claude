import * as React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartTooltip } from './chart-tooltip';
import { CHART_SERIES_DEFAULT, CHART_AXIS_PROPS, CHART_GRID_PROPS } from './chart-tokens';

/**
 * ComboChart — bars + lines on a shared X, with an optional secondary (right) Y
 * axis. The enterprise "volume + rate" pattern (e.g. collections as bars, SLA %
 * as a line on the right axis). Token-only; recharts ComposedChart engine.
 */

export interface ComboSeries {
  dataKey: string;
  name?: string;
  type: 'bar' | 'line';
  color?: string;
  /** Which Y axis to bind to. Default 'left'. */
  axis?: 'left' | 'right';
}

export interface ComboChartProps {
  data: Record<string, any>[];
  xKey: string;
  series: ComboSeries[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  /** Right-axis tick suffix (e.g. "%"). */
  rightUnit?: string;
}

export function ComboChart({ data, xKey, series, height = 260, showGrid = true, showLegend = true, rightUnit }: ComboChartProps) {
  const hasRight = series.some((s) => s.axis === 'right');
  const color = (s: ComboSeries, i: number) => s.color ?? CHART_SERIES_DEFAULT[i % CHART_SERIES_DEFAULT.length];
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: hasRight ? 8 : 12, bottom: 4, left: 0 }}>
          {showGrid ? <CartesianGrid {...CHART_GRID_PROPS} /> : null}
          <XAxis dataKey={xKey} {...CHART_AXIS_PROPS} />
          <YAxis yAxisId="left" {...CHART_AXIS_PROPS} />
          {hasRight ? (
            <YAxis yAxisId="right" orientation="right" {...CHART_AXIS_PROPS} tickFormatter={rightUnit ? (v: number) => `${v}${rightUnit}` : undefined} />
          ) : null}
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'color-mix(in srgb, var(--muted-foreground) 8%, transparent)' }} />
          {showLegend ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
          {series.map((s, i) => (
            s.type === 'bar' ? (
              <Bar
                key={s.dataKey}
                yAxisId={s.axis ?? 'left'}
                dataKey={s.dataKey}
                name={s.name ?? s.dataKey}
                fill={color(s, i)}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            ) : (
              <Line
                key={s.dataKey}
                yAxisId={s.axis ?? 'left'}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name ?? s.dataKey}
                stroke={color(s, i)}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            )
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
