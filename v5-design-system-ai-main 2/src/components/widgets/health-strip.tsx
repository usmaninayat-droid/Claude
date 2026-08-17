import * as React from 'react';
import { cn } from '../utils/cn';

export interface HealthStripCell {
  label: string;
  value?: React.ReactNode;
  status?: 'success' | 'warning' | 'error' | 'info' | 'muted';
}

export interface HealthStripProps extends React.HTMLAttributes<HTMLDivElement> {
  cells: HealthStripCell[];
}

const STATUS_COLOR: Record<NonNullable<HealthStripCell['status']>, string> = {
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  error:   'var(--status-error)',
  info:    'var(--status-info)',
  muted:   'var(--gray-400)',
};

/**
 * HealthStrip — Pattern #22.
 * Horizontal strip of vitals/status pills used in the entity overview.
 */
export const HealthStrip = React.forwardRef<HTMLDivElement, HealthStripProps>(
  ({ className, cells, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4', className)}
      {...props}
    >
      {cells.map((c, i) => {
        const color = STATUS_COLOR[c.status ?? 'muted'];
        return (
          <div key={i} className="flex flex-col gap-1 bg-card p-3">
            <div className="flex items-center gap-1.5 text-caption uppercase tracking-wide text-muted-foreground">
              <span aria-hidden className="size-1.5 rounded-full" style={{ background: color }} />
              {c.label}
            </div>
            <div className="text-body-sm font-semibold text-foreground tabular-nums">{c.value ?? '—'}</div>
          </div>
        );
      })}
    </div>
  )
);
HealthStrip.displayName = 'HealthStrip';
