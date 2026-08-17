import * as React from 'react';
import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../utils/cn';

export interface CriticalEvent {
  id: string;
  severity?: 'info' | 'warning' | 'error';
  title: React.ReactNode;
  description?: React.ReactNode;
  timestamp?: React.ReactNode;
  onClick?: () => void;
}

export interface CriticalEventsListProps extends React.HTMLAttributes<HTMLDivElement> {
  events: CriticalEvent[];
  emptyState?: React.ReactNode;
}

export function CriticalEventsList({ events, emptyState, className, ...props }: CriticalEventsListProps) {
  if (events.length === 0) {
    return (
      <div className={cn('rounded-lg border border-border bg-card p-6 text-center text-body-sm text-muted-foreground', className)} {...props}>
        {emptyState ?? 'No critical events.'}
      </div>
    );
  }
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-card', className)} {...props}>
      {events.map((e) => {
        const Icon = e.severity === 'error' ? AlertOctagon : e.severity === 'warning' ? AlertTriangle : Info;
        const color = e.severity === 'error' ? 'var(--status-error)' : e.severity === 'warning' ? 'var(--status-warning)' : 'var(--status-info)';
        return (
          <button
            key={e.id}
            type="button"
            onClick={e.onClick}
            className="flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/40 last:border-0"
          >
            <Icon className="mt-0.5 size-4 shrink-0" style={{ color }} />
            <div className="min-w-0 flex-1">
              <div className="text-body-sm font-medium text-foreground">{e.title}</div>
              {e.description ? <div className="mt-0.5 text-caption text-muted-foreground">{e.description}</div> : null}
            </div>
            {e.timestamp ? <span className="shrink-0 text-caption tabular-nums text-muted-foreground">{e.timestamp}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
