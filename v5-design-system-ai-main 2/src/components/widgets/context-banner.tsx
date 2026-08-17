import * as React from 'react';
import { Info, AlertTriangle, CheckCircle, AlertOctagon, X } from 'lucide-react';
import { cn } from '../utils/cn';

export interface ContextBannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  severity?: 'info' | 'success' | 'warning' | 'error';
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  onDismiss?: () => void;
}

const SEVERITY: Record<NonNullable<ContextBannerProps['severity']>, { Icon: React.ComponentType<any>; color: string }> = {
  info:    { Icon: Info,           color: 'var(--status-info)' },
  success: { Icon: CheckCircle,    color: 'var(--status-success)' },
  warning: { Icon: AlertTriangle,  color: 'var(--status-warning)' },
  error:   { Icon: AlertOctagon,   color: 'var(--status-error)' },
};

/**
 * ContextBanner — Pattern #20 banner widget at the top of an entity overview.
 * Carries severity + concise title + optional description + actions.
 */
export const ContextBanner = React.forwardRef<HTMLDivElement, ContextBannerProps>(
  ({ className, severity = 'info', title, description, actions, onDismiss, ...props }, ref) => {
    const { Icon, color } = SEVERITY[severity];
    return (
      <div
        ref={ref}
        role="status"
        className={cn('flex items-start gap-3 rounded-lg border p-3', className)}
        style={{ background: `color-mix(in srgb, ${color} 8%, transparent)`, borderColor: `color-mix(in srgb, ${color} 30%, transparent)` }}
        {...props}
      >
        <Icon className="mt-0.5 size-4 shrink-0" style={{ color }} />
        <div className="min-w-0 flex-1">
          {title ? <div className="text-body-sm font-medium text-foreground">{title}</div> : null}
          {description ? <div className="mt-0.5 text-caption text-muted-foreground">{description}</div> : null}
          {actions ? <div className="mt-2 flex gap-1.5">{actions}</div> : null}
        </div>
        {onDismiss ? (
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    );
  }
);
ContextBanner.displayName = 'ContextBanner';
