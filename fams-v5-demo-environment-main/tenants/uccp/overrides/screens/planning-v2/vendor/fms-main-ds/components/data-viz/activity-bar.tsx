import * as React from 'react';
import { cn } from '../utils/cn';
import { resolveChartColor } from './chart-tokens';

/**
 * ActivityBar — multi-color horizontal bar with proportional sections.
 *
 * Spec: `activity-bar.spec.md`.
 *
 * Production usage:
 *   - Leaderboard "Activity" column (Tadweer Inspector Performance dashboard)
 *   - Time-allocation bars
 *
 * Each segment is sized proportionally to its `value` relative to the total.
 * Useful for "X spent N hours on each activity" or "vehicle status breakdown."
 */

export interface ActivityBarSegment {
  id: string;
  label: string;
  value: number;
  /** Color spec (hex / var / accent name / series-N). */
  color?: string;
}

export interface ActivityBarProps {
  segments: ActivityBarSegment[];
  /** Bar height in px. Default 12. */
  height?: number;
  /** Total override (for partial-bar display). Defaults to sum of segments. */
  total?: number;
  /** Show value labels inside each segment when wide enough. Default false. */
  showLabels?: boolean;
  /** Tooltip formatter on hover. */
  tooltipFormatter?: (segment: ActivityBarSegment) => React.ReactNode;
  className?: string;
}

export function ActivityBar({
  segments,
  height = 12,
  total,
  showLabels,
  tooltipFormatter,
  className,
}: ActivityBarProps) {
  const [hover, setHover] = React.useState<ActivityBarSegment | null>(null);
  const sum = total ?? segments.reduce((acc, s) => acc + s.value, 0);
  if (sum <= 0) {
    return (
      <div
        className={cn('w-full rounded-full bg-muted', className)}
        style={{ height }}
        aria-label="No activity"
      />
    );
  }
  return (
    <div className="relative">
      <div
        className={cn('flex w-full overflow-hidden rounded-full bg-muted', className)}
        style={{ height }}
        role="img"
        aria-label="Activity breakdown"
      >
        {segments.map((s, i) => {
          const pct = (s.value / sum) * 100;
          const color = resolveChartColor(s.color, i);
          return (
            <div
              key={s.id}
              className="relative cursor-pointer transition-opacity hover:opacity-90"
              style={{
                width: `${pct}%`,
                background: color,
                borderRight: i < segments.length - 1 ? '1px solid var(--card)' : undefined,
              }}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(null)}
              aria-label={`${s.label}: ${s.value}`}
            >
              {showLabels && pct > 12 ? (
                <span
                  className="absolute inset-0 flex items-center justify-center text-caption font-semibold text-white"
                  style={{ lineHeight: `${height}px` }}
                >
                  {s.label}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {hover ? (
        <div className="pointer-events-none absolute -top-9 left-0 rounded-md bg-popover px-2 py-1 text-caption text-popover-foreground shadow-lg">
          {tooltipFormatter ? tooltipFormatter(hover) : (
            <span>{hover.label}: <strong>{hover.value}</strong></span>
          )}
        </div>
      ) : null}
    </div>
  );
}
