import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * BoxPlot — statistical distribution per category (min · Q1 · median · Q3 · max +
 * outliers), WCAG AA. Five-number summary is drawn as box + whiskers with the
 * median line; outliers as dots. Token-only, responsive SVG viewBox (renders
 * without recharts).
 */

export interface BoxDatum {
  label: string;
  min: number; q1: number; median: number; q3: number; max: number;
  outliers?: number[];
}

export interface BoxPlotProps {
  data: BoxDatum[];
  height?: number;
  unit?: string;
  className?: string;
}

export function BoxPlot({ data, height = 260, unit, className }: BoxPlotProps) {
  if (!data.length) return <div className="grid h-full min-h-24 place-items-center text-body-sm text-muted-foreground">No data</div>;

  const padL = 40, padR = 12, padT = 12, padB = 34;
  const W = Math.max(320, data.length * 84 + padL + padR);
  const all = data.flatMap((d) => [d.min, d.max, ...(d.outliers ?? [])]);
  const lo = Math.min(...all), hi = Math.max(...all);
  const span = hi - lo || 1;
  const y = (v: number) => padT + (1 - (v - lo) / span) * (height - padT - padB);
  const step = (W - padL - padR) / data.length;
  const bw = Math.min(40, step * 0.5);

  const ticks = 4;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img" aria-label="Distribution box plot" className="block">
      {/* y grid + labels */}
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = lo + (span * i) / ticks;
        const yy = y(v);
        return (
          <g key={i}>
            <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3 3" />
            <text x={padL - 6} y={yy + 3} textAnchor="end" fontSize={10} fill="var(--muted-foreground)">{Math.round(v)}{unit}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = padL + step * i + step / 2;
        const bx = cx - bw / 2;
        return (
          <g key={d.label}>
            {/* whiskers */}
            <line x1={cx} y1={y(d.max)} x2={cx} y2={y(d.q3)} stroke="var(--muted-foreground)" strokeWidth={1} />
            <line x1={cx} y1={y(d.q1)} x2={cx} y2={y(d.min)} stroke="var(--muted-foreground)" strokeWidth={1} />
            <line x1={cx - 8} y1={y(d.max)} x2={cx + 8} y2={y(d.max)} stroke="var(--muted-foreground)" strokeWidth={1} />
            <line x1={cx - 8} y1={y(d.min)} x2={cx + 8} y2={y(d.min)} stroke="var(--muted-foreground)" strokeWidth={1} />
            {/* box (Q1–Q3) */}
            <rect
              x={bx} y={y(d.q3)} width={bw} height={Math.max(1, y(d.q1) - y(d.q3))} rx={2}
              fill="color-mix(in srgb, var(--primary) 14%, transparent)" stroke="var(--primary)" strokeWidth={1.25}
            >
              <title>{d.label} — min {d.min}{unit}, Q1 {d.q1}{unit}, median {d.median}{unit}, Q3 {d.q3}{unit}, max {d.max}{unit}</title>
            </rect>
            {/* median */}
            <line x1={bx} y1={y(d.median)} x2={bx + bw} y2={y(d.median)} stroke="var(--primary)" strokeWidth={2} />
            {/* outliers */}
            {(d.outliers ?? []).map((o, k) => (
              <circle key={k} cx={cx} cy={y(o)} r={2.5} fill="var(--status-error)" />
            ))}
            {/* x label */}
            <text x={cx} y={height - 12} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
              {d.label.length > 10 ? d.label.slice(0, 10) + '…' : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
