import * as React from 'react';
import { cn } from '../utils/cn';
import { CHART_SERIES_DEFAULT } from './chart-tokens';

/**
 * WaffleChart — proportional 10×10 grid (100 cells = 100%), one of the most
 * legible part-to-whole forms (WCAG AA). Each category fills whole cells rounded
 * to the nearest %, with a text legend (label + %). Token-only.
 */

export interface WaffleDatum { label: string; value: number; color?: string }
export interface WaffleChartProps {
  data: WaffleDatum[];
  /** Grid side (cells = size²). Default 10. */
  size?: number;
  colors?: string[];
  className?: string;
}

export function WaffleChart({ data, size = 10, colors = CHART_SERIES_DEFAULT, className }: WaffleChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cells = size * size;
  // Largest-remainder rounding so filled cells sum to exactly `cells`.
  const raw = data.map((d) => (d.value / total) * cells);
  const floor = raw.map(Math.floor);
  let left = cells - floor.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => ({ i, frac: v - floor[i] })).sort((a, b) => b.frac - a.frac);
  const counts = [...floor];
  for (const { i } of order) { if (left <= 0) break; counts[i]++; left--; }

  const cellColor: string[] = [];
  data.forEach((_, di) => { for (let k = 0; k < counts[di]; k++) cellColor.push(colors[di % colors.length]); });

  return (
    <div className={cn('flex flex-wrap items-center gap-5', className)}>
      <div
        className="grid shrink-0 gap-1"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: size * 16 }}
        role="img"
        aria-label={data.map((d) => `${d.label} ${Math.round((d.value / total) * 100)}%`).join(', ')}
      >
        {Array.from({ length: cells }, (_, i) => (
          <span key={i} className="aspect-square rounded-[3px]" style={{ background: cellColor[i] ?? 'var(--muted)' }} />
        ))}
      </div>
      <ul className="flex flex-col gap-1.5">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-body-sm">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: colors[i % colors.length] }} />
            <span className="text-foreground">{d.label}</span>
            <span className="ml-auto pl-3 font-semibold tabular-nums text-muted-foreground">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
