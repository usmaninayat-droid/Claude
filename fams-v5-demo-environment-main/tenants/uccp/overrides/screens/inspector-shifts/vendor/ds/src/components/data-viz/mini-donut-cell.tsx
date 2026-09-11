import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * MiniDonutCell — small inline progress donut for table cells.
 *
 * Spec: `mini-donut-cell.spec.md`.
 *
 * Production usage:
 *   - "Coverage %" column in Under-Inspected Areas table (Tadweer Jan release)
 *
 * Pure SVG, ~32-40px. Renders a circular progress arc with the percentage
 * label in the center. Color thresholds:
 *   <40%  → red
 *   40-80% → orange
 *   ≥80%  → green
 */

export interface MiniDonutCellProps {
  /** 0-100. */
  value: number;
  /** Cell size in px (square). Default 32. */
  size?: number;
  /** Stroke width in px. Default 3. */
  strokeWidth?: number;
  /** Custom color thresholds. Default: red/orange/green at 40/80. */
  thresholds?: Array<{ min: number; color: string }>;
  /** Hide the percentage label. */
  hideLabel?: boolean;
  className?: string;
}

const DEFAULT_THRESHOLDS = [
  { min: 0,   color: 'var(--chart-accent-red)' },
  { min: 40,  color: 'var(--chart-accent-orange)' },
  { min: 80,  color: 'var(--chart-accent-green)' },
];

export function MiniDonutCell({
  value,
  size = 32,
  strokeWidth = 3,
  thresholds = DEFAULT_THRESHOLDS,
  hideLabel,
  className,
}: MiniDonutCellProps) {
  const v = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (v / 100) * circumference;

  // Pick color by threshold (highest applicable wins)
  const color = [...thresholds].reverse().find((t) => v >= t.min)?.color ?? thresholds[0].color;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${v}% coverage`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      {!hideLabel ? (
        <span
          className="absolute text-[10px] font-semibold tabular-nums text-foreground"
        >
          {Math.round(v)}%
        </span>
      ) : null}
    </div>
  );
}
