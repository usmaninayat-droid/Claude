import * as React from 'react';
import { cn } from '../utils/cn';

export interface TimelineItem {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  timestamp?: React.ReactNode;
  icon?: React.ReactNode;
  color?: string;
}

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  items: TimelineItem[];
}

/**
 * Timeline — vertical activity feed (Pattern #20 / audit log).
 */
export const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ className, items, ...props }, ref) => (
    <div ref={ref} className={cn('relative space-y-4', className)} {...props}>
      <div className="absolute left-3 top-2 bottom-2 w-px bg-border" aria-hidden />
      {items.map((item) => (
        <div key={item.id} className="relative flex gap-3 pl-8">
          <div
            className="absolute left-0 top-0.5 flex size-6 items-center justify-center rounded-full border-2 border-card bg-secondary text-secondary-foreground"
            style={item.color ? { borderColor: item.color, color: item.color } : undefined}
          >
            {item.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-body-sm font-medium text-foreground">{item.title}</div>
            {item.subtitle ? <div className="text-caption text-muted-foreground">{item.subtitle}</div> : null}
          </div>
          {item.timestamp ? (
            <div className="shrink-0 text-caption tabular-nums text-muted-foreground">{item.timestamp}</div>
          ) : null}
        </div>
      ))}
    </div>
  )
);
Timeline.displayName = 'Timeline';
