import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * GaugeChart — half-arc speedometer with color sectors.
 *
 * Spec: `gauge-chart.spec.md`.
 *
 * Production usage:
 *   - Fuel Usage Compliance (81% Current Fuel Level)
 *   - Fuel Efficiency Score (81%)
 *   - DS V2 generic gauges
 *
 * Pure SVG (no Recharts) — gives us full control over the arc geometry +
 * needle + sector coloring. Lightweight and responsive.
 */

export interface GaugeSector {
  /** Inclusive lower bound (0-100). */
  from: number;
  /** Inclusive upper bound (0-100). */
  to: number;
  /** Sector color (CSS var or hex). */
  color: string;
  /** Optional label rendered above the sector arc. */
  label?: string;
}

export interface GaugeChartProps {
  /** Value 0-100. */
  value: number;
  /** Optional unit suffix in the center label (e.g. "%"). */
  unit?: string;
  /** Sectors (color bands). Default: 4 red→orange→yellow→green ranges. */
  sectors?: GaugeSector[];
  /** Sub-label below the value. */
  label?: React.ReactNode;
  /** Show needle pointer. Default true. */
  showNeedle?: boolean;
  /** Chart size in px (width). Height is half. Default 200. */
  size?: number;
  className?: string;
}

const DEFAULT_SECTORS: GaugeSector[] = [
  { from: 0,  to: 30,  color: 'var(--chart-accent-red)' },
  { from: 30, to: 60,  color: 'var(--chart-accent-orange)' },
  { from: 60, to: 80,  color: 'var(--chart-accent-yellow)' },
  { from: 80, to: 100, color: 'var(--chart-accent-green)' },
];

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg - 180) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number, thickness: number) {
  const innerR = r - thickness;
  const p1 = polar(cx, cy, r, startDeg);
  const p2 = polar(cx, cy, r, endDeg);
  const p3 = polar(cx, cy, innerR, endDeg);
  const p4 = polar(cx, cy, innerR, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}

export function GaugeChart({
  value,
  unit = '%',
  sectors = DEFAULT_SECTORS,
  label,
  showNeedle = true,
  size = 200,
  className,
}: GaugeChartProps) {
  const v = Math.max(0, Math.min(100, value));
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const thickness = 14;
  // Map 0-100 → 0-180 degrees (half-arc, left to right)
  const needleAngle = (v / 100) * 180;
  const needleTip = polar(cx, cy, r - thickness - 6, needleAngle);
  const needleBase1 = polar(cx, cy, 6, needleAngle - 90);
  const needleBase2 = polar(cx, cy, 6, needleAngle + 90);

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`} role="img">
        {sectors.map((s, i) => {
          const start = (s.from / 100) * 180;
          const end = (s.to / 100) * 180;
          return (
            <path
              key={i}
              d={arcPath(cx, cy, r, start, end, thickness)}
              fill={s.color}
              opacity={0.9}
            />
          );
        })}
        {showNeedle ? (
          <>
            <polygon
              points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
              fill="var(--foreground)"
            />
            <circle cx={cx} cy={cy} r={4} fill="var(--foreground)" />
          </>
        ) : null}
      </svg>
      <div className="absolute" style={{ top: size / 2 - 30, textAlign: 'center' }}>
        <div className="text-3xl font-bold tabular-nums leading-none text-foreground">
          {v}<span className="text-xl">{unit}</span>
        </div>
        {label ? (
          <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        ) : null}
      </div>
    </div>
  );
}
