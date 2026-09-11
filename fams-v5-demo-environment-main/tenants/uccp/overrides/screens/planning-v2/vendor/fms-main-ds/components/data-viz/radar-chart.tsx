import * as React from 'react';
import {
  ResponsiveContainer,
  RadarChart as RRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
} from 'recharts';
import { resolveChartColor } from './chart-tokens';
import { ChartTooltip } from './chart-tooltip';

/**
 * RadarChart — polar / spider chart with 3+ axes.
 *
 * Spec: `radar-chart.spec.md`.
 *
 * Production usage:
 *   - G-Force (DS V2)
 *
 * Pass data rows where each row has the axis labels as keys + a value per
 * series. Or use the simpler { axis, value } shape with a single series.
 */

export interface RadarSeries {
  dataKey: string;
  label?: string;
  color?: string;
  fillOpacity?: number;
}

export interface RadarChartProps {
  /** Data rows, one per axis. */
  data: Array<Record<string, any>>;
  /** Field name used as the axis label (categorical). */
  axisKey: string;
  series: RadarSeries[];
  height?: number | string;
  /** Maximum value for the radius axis. Auto-scaled if omitted. */
  maxRadius?: number;
  hideTooltip?: boolean;
}

export function RadarChart({
  data, axisKey, series,
  height = 240, maxRadius, hideTooltip,
}: RadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RRadarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
        <PolarGrid stroke="var(--border)" strokeDasharray="3 3" />
        <PolarAngleAxis
          dataKey={axisKey}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          stroke="var(--border)"
        />
        <PolarRadiusAxis
          domain={maxRadius ? [0, maxRadius] : undefined}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          stroke="var(--border)"
          angle={90}
        />
        {!hideTooltip ? <Tooltip content={<ChartTooltip />} /> : null}
        {series.map((s, i) => {
          const color = resolveChartColor(s.color, i);
          return (
            <Radar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.label ?? s.dataKey}
              stroke={color}
              strokeWidth={2}
              fill={color}
              fillOpacity={s.fillOpacity ?? 0.15}
            />
          );
        })}
      </RRadarChart>
    </ResponsiveContainer>
  );
}
