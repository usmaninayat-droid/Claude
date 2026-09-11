import * as React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../utils/cn';

export interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; direction: 'up' | 'down' | 'flat' };
  icon?: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * KpiCard — single-value KPI tile. Pattern #20 kpi-bar widget.
 */
export const KpiCard = React.forwardRef<HTMLDivElement, KpiCardProps>(
  ({ className, label, value, delta, icon, footer, ...props }, ref) => {
    const deltaColor =
      delta?.direction === 'up' ? 'text-[color:var(--status-success)]'
      : delta?.direction === 'down' ? 'text-[color:var(--status-error)]'
      : 'text-muted-foreground';
    return (
      <div
        ref={ref}
        className={cn('rounded-lg border border-border bg-card p-4 shadow-elevation', className)}
        {...props}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-foreground tabular-nums">{value}</span>
          {delta ? (
            <span className={cn('inline-flex items-center gap-0.5 text-xs', deltaColor)}>
              {delta.direction === 'up' ? <TrendingUp className="size-3" /> :
               delta.direction === 'down' ? <TrendingDown className="size-3" /> : null}
              {delta.value}
            </span>
          ) : null}
        </div>
        {footer ? <div className="mt-2 text-xs text-muted-foreground">{footer}</div> : null}
      </div>
    );
  }
);
KpiCard.displayName = 'KpiCard';
