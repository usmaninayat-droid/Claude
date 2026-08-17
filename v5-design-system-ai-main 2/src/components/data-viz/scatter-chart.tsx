import * as React from 'react';
import { ScatterChart as RScatter, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { ChartTooltip } from './chart-tooltip';
import { CHART_SERIES_DEFAULT, CHART_AXIS_PROPS, CHART_GRID_PROPS } from './chart-tokens';

/**
 * ScatterChart — correlation / distribution (with optional bubble sizing via
 * `z`). Multi-series, optional quadrant reference lines for segmentation
 * (e.g. value vs risk). Token-only series colours; recharts engine (matches the
 * DS axis-chart idiom).
 */

export interface ScatterPoint { x: number; y: number; z?: number; label?: string }
export interface ScatterSeries { name: string; points: ScatterPoint[]; color?: string }

export interface ScatterChartProps {
  series: ScatterSeries[];
  height?: number;
  xLabel?: string;
  yLabel?: string;
  /** Bubble sizing from `z` (min/max px area). Omit for fixed dots. */
  bubbleRange?: [number, number];
  /** Draw a vertical / horizontal reference line (quadrant split). */
  xReference?: number;
  yReference?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

export function ScatterChart({
  series, height = 260, xLabel, yLabel, bubbleRange, xReference, yReference, showGrid = true, showLegend = true,
}: ScatterChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RScatter margin={{ top: 8, right: 12, bottom: xLabel ? 20 : 8, left: yLabel ? 8 : 0 }}>
          {showGrid ? <CartesianGrid {...CHART_GRID_PROPS} /> : null}
          <XAxis
            type="number" dataKey="x" name={xLabel} {...CHART_AXIS_PROPS}
            label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -8, fontSize: 11, fill: 'var(--muted-foreground)' } : undefined}
          />
          <YAxis
            type="number" dataKey="y" name={yLabel} {...CHART_AXIS_PROPS}
            label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--muted-foreground)' } : undefined}
          />
          {bubbleRange ? <ZAxis type="number" dataKey="z" range={bubbleRange} /> : null}
          {typeof xReference === 'number' ? <ReferenceLine x={xReference} stroke="var(--border)" strokeDasharray="4 4" /> : null}
          {typeof yReference === 'number' ? <ReferenceLine y={yReference} stroke="var(--border)" strokeDasharray="4 4" /> : null}
          <Tooltip content={<ChartTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'var(--muted-foreground)' }} />
          {showLegend ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
          {series.map((s, i) => (
            <Scatter
              key={s.name}
              name={s.name}
              data={s.points}
              fill={s.color ?? CHART_SERIES_DEFAULT[i % CHART_SERIES_DEFAULT.length]}
              fillOpacity={0.7}
              isAnimationActive={false}
            />
          ))}
        </RScatter>
      </ResponsiveContainer>
    </div>
  );
}
