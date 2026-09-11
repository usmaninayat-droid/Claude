import * as React from 'react';
import { cn } from '../utils/cn';
import { Avatar } from '../primitives/avatar';
import { Badge } from '../primitives/badge';

export interface NotificationCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  timestamp?: React.ReactNode;
  source?: string;
  unread?: boolean;
  severity?: 'info' | 'success' | 'warning' | 'error';
  avatarSrc?: string;
  avatarFallback?: string;
  actions?: React.ReactNode;
}

export const NotificationCard = React.forwardRef<HTMLDivElement, NotificationCardProps>(
  ({ className, title, description, timestamp, source, unread, severity, avatarSrc, avatarFallback, actions, ...props }, ref) => {
    const severityColor =
      severity === 'success' ? 'var(--status-success)' :
      severity === 'warning' ? 'var(--status-warning)' :
      severity === 'error' ? 'var(--status-error)' :
      severity === 'info' ? 'var(--status-info)' : undefined;
    return (
      <div
        ref={ref}
        className={cn(
          'flex gap-3 border-b border-border bg-card px-4 py-3 transition-colors hover:bg-muted/40',
          unread && 'bg-secondary/40',
          className
        )}
        {...props}
      >
        {severityColor ? (
          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: severityColor }} />
        ) : null}
        {avatarSrc || avatarFallback ? (
          <Avatar size="sm" src={avatarSrc} fallback={avatarFallback} />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={cn('truncate text-sm', unread ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>{title}</span>
            {source ? <Badge variant="muted" size="xs">{source}</Badge> : null}
            {timestamp ? <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">{timestamp}</span> : null}
          </div>
          {description ? <div className="mt-0.5 text-xs text-muted-foreground">{description}</div> : null}
          {actions ? <div className="mt-2 flex gap-1.5">{actions}</div> : null}
        </div>
      </div>
    );
  }
);
NotificationCard.displayName = 'NotificationCard';
