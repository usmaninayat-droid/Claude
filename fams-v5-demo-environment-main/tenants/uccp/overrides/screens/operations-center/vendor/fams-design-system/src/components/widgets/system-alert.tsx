import * as React from 'react';
import { cn } from '../utils/cn';
import { CheckCircle, AlertTriangle, XCircle, InfoCircle, XClose } from '../../icons';

/**
 * SystemAlert — a system toast/alert card (Figma FAMS Web Portal system alerts).
 * Four severities, each a card with a left colored accent bar, a tinted icon, a
 * bold title and a muted description. Domain-agnostic: title/description/severity
 * are props. Fire it as a toast with `toast.custom(() => <SystemAlert … />)`, or
 * render inline.
 */
export type SystemAlertSeverity = 'success' | 'warning' | 'error' | 'info';

export interface SystemAlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  severity?: SystemAlertSeverity;
  title: React.ReactNode;
  description?: React.ReactNode;
  onClose?: () => void;
}

const SEVERITY: Record<SystemAlertSeverity, { color: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  success: { color: 'var(--status-success)', Icon: CheckCircle },
  warning: { color: 'var(--status-warning)', Icon: AlertTriangle },
  error: { color: 'var(--status-error)', Icon: XCircle },
  info: { color: 'var(--status-info)', Icon: InfoCircle },
};

export const SystemAlert = React.forwardRef<HTMLDivElement, SystemAlertProps>(
  ({ severity = 'info', title, description, onClose, className, ...props }, ref) => {
    const { color, Icon } = SEVERITY[severity];
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative flex w-[360px] max-w-[92vw] items-start gap-3 overflow-hidden rounded-lg border border-border bg-card py-3 pl-5 pr-4 shadow-md',
          className,
        )}
        {...props}
      >
        {/* Left accent bar */}
        <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} />
        <span
          aria-hidden
          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md"
          style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
        >
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-body-sm font-semibold text-foreground">{title}</div>
          {description ? <div className="mt-0.5 text-caption text-muted-foreground">{description}</div> : null}
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="Dismiss" className="-mr-1 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <XClose size={14} />
          </button>
        ) : null}
      </div>
    );
  },
);
SystemAlert.displayName = 'SystemAlert';
