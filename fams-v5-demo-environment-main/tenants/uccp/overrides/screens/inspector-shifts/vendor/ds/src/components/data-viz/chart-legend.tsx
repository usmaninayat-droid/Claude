import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * ChartLegend — horizontal row of colored-dot series labels.
 *
 * Spec: `chart-legend.spec.md`. Used in the top-right of `<ChartCard>` or
 * passed as a custom `<Legend content={…}>` to Recharts.
 *
 * Hover an item to highlight its series (parent listens to onSeriesHover).
 * Click to toggle visibility (parent listens to onToggle).
 */

export interface ChartLegendItem {
  /** Stable id (matches a series key). */
  id: string;
  /** Label text. */
  label: React.ReactNode;
  /** Dot color (CSS var or hex). */
  color: string;
  /** When true, render strikethrough + dimmed (series hidden). */
  hidden?: boolean;
}

export interface ChartLegendProps {
  items: ChartLegendItem[];
  onToggle?: (id: string) => void;
  onHover?: (id: string | null) => void;
  className?: string;
  /** Layout — horizontal (default) or vertical for tall sidebars. */
  orientation?: 'horizontal' | 'vertical';
  /** Dot size in px. Default 8. */
  dotSize?: number;
}

export function ChartLegend({
  items, onToggle, onHover, className,
  orientation = 'horizontal',
  dotSize = 8,
}: ChartLegendProps) {
  return (
    <ul
      className={cn(
        'flex items-center text-[11px]',
        orientation === 'horizontal' ? 'gap-3' : 'flex-col items-start gap-1.5',
        className,
      )}
      aria-label="Chart legend"
    >
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onToggle?.(item.id)}
            onMouseEnter={() => onHover?.(item.id)}
            onMouseLeave={() => onHover?.(null)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-sm px-1 transition-opacity',
              item.hidden && 'opacity-50',
            )}
          >
            <span
              className="inline-block rounded-full"
              style={{
                width: dotSize,
                height: dotSize,
                background: item.color,
              }}
              aria-hidden
            />
            <span
              className={cn(
                'font-medium text-muted-foreground',
                item.hidden && 'line-through',
              )}
            >
              {item.label}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
