import * as React from 'react';
import { cn } from '../utils/cn';
import type { MarkerStatus } from './types';
import { MARKER_STATUS_COLORS } from './types';

/**
 * MapLegend — a swatch + label key for the map's marker statuses, driven by the
 * single-source `MARKER_STATUS_COLORS`. Consumers that need a legend no longer
 * re-hardcode the marker hex (the ifm events module mirrored `STATUS_COLORS`
 * by hand). The swatch colours are marker DATA (they must match the map pins
 * exactly); all chrome is token-only.
 */

const DEFAULT_LABELS: Record<MarkerStatus, string> = {
  default: 'Default',
  reporting: 'Reporting',
  stopped: 'Stopped',
  critical: 'Critical',
  warning: 'Warning',
  idle: 'Idle',
};

const DEFAULT_ORDER: MarkerStatus[] = ['reporting', 'warning', 'idle', 'stopped', 'critical'];

export interface MapLegendProps {
  /** Which statuses to show, in order. Defaults to the common 5 (excludes `default`). */
  statuses?: MarkerStatus[];
  /** Override the human label for any status. */
  labels?: Partial<Record<MarkerStatus, string>>;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function MapLegend({ statuses = DEFAULT_ORDER, labels, orientation = 'horizontal', className }: MapLegendProps) {
  return (
    <ul
      className={cn(
        'flex gap-x-4 gap-y-1.5',
        orientation === 'vertical' ? 'flex-col' : 'flex-wrap items-center',
        className,
      )}
    >
      {statuses.map((s) => (
        <li key={s} className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: MARKER_STATUS_COLORS[s] }}
          />
          {labels?.[s] ?? DEFAULT_LABELS[s]}
        </li>
      ))}
    </ul>
  );
}
