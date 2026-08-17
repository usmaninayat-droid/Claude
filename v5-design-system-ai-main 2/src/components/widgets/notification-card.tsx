import * as React from 'react';
import { cn } from '../utils/cn';
import { Avatar } from '../primitives/avatar';
import { Badge, type BadgeProps } from '../primitives/badge';
import { IconBadge, type IconBadgeTone } from '../data-viz/icon-badge';

export interface NotificationCardChip {
  icon?: React.ReactNode;
  label: React.ReactNode;
  variant?: BadgeProps['variant'];
}

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
  /**
   * Leading icon — rendered as a tinted 28px `IconBadge` instead of the
   * severity dot / `Avatar`. Tone derives from `severity` when unread; read
   * rows always recede to a neutral tone regardless of severity.
   */
  icon?: React.ReactNode;
  /** Small labeled chips (module/category/criticality tags) below the message. */
  chips?: NotificationCardChip[];
  /** Alias of `chips` — kept for callers that prefer "badges" naming. */
  badges?: NotificationCardChip[];
  /** Hide `actions` until the row is hovered — unread rows only, reduces default visual noise. */
  revealActionsOnHover?: boolean;
  /** Adds a severity-tinted `border-l-4` accent (error/warning only) — a priority/digest affordance. */
  accentBorder?: boolean;
}

export const NotificationCard = React.forwardRef<HTMLDivElement, NotificationCardProps>(
  (
    {
      className,
      title,
      description,
      timestamp,
      source,
      unread,
      severity,
      avatarSrc,
      avatarFallback,
      actions,
      icon,
      chips,
      badges,
      revealActionsOnHover,
      accentBorder,
      style,
      ...props
    },
    ref
  ) => {
    const severityColor =
      severity === 'success' ? 'var(--status-success)' :
      severity === 'warning' ? 'var(--status-warning)' :
      severity === 'error' ? 'var(--status-error)' :
      severity === 'info' ? 'var(--status-info)' : undefined;

    // Read rows always recede to a neutral tone (visibly de-emphasized);
    // unread rows map the severity (defaulting to 'info' with no severity set).
    const iconTone: IconBadgeTone = !unread
      ? 'neutral'
      : severity === 'error' ? 'danger'
      : severity === 'warning' ? 'warning'
      : severity === 'success' ? 'success'
      : 'info';

    const accentColor = severity === 'error' ? 'var(--status-error)' : severity === 'warning' ? 'var(--status-warning)' : undefined;
    const chipList = chips ?? badges;

    return (
      <div
        ref={ref}
        className={cn(
          'group flex gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-muted/40',
          unread ? 'bg-secondary/40' : 'bg-surface-minimal',
          accentBorder && accentColor && 'border-l-4',
          className
        )}
        style={accentBorder && accentColor ? { ...style, borderLeftColor: accentColor } : style}
        {...props}
      >
        {icon ? (
          <IconBadge icon={icon} tone={iconTone} size={28} />
        ) : (
          <>
            {severityColor ? (
              <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: severityColor }} />
            ) : null}
            {avatarSrc || avatarFallback ? (
              <Avatar size="sm" src={avatarSrc} fallback={avatarFallback} />
            ) : null}
          </>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={cn('truncate text-body-sm', unread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground')}>{title}</span>
            {source ? <Badge variant="muted" size="xs">{source}</Badge> : null}
            {timestamp ? <span className="ml-auto shrink-0 text-caption tabular-nums text-muted-foreground">{timestamp}</span> : null}
          </div>
          {description ? (
            <div className={cn('mt-0.5 text-caption', unread ? 'text-foreground' : 'text-muted-foreground')}>{description}</div>
          ) : null}
          {chipList && chipList.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {chipList.map((chip, i) => (
                <Badge key={i} variant={chip.variant ?? 'muted'} size="xs">
                  {chip.icon}
                  {chip.label}
                </Badge>
              ))}
            </div>
          ) : null}
          {actions ? (
            <div className={cn('mt-2 flex gap-1.5', revealActionsOnHover && unread && 'hidden group-hover:flex')}>{actions}</div>
          ) : null}
        </div>
      </div>
    );
  }
);
NotificationCard.displayName = 'NotificationCard';
