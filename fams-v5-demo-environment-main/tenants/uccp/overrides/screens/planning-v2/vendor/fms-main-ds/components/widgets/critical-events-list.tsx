import * as React from 'react';
import { AlertOctagon, AlertTriangle, Info, type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

export type CriticalEventIcon = LucideIcon | React.ComponentType<{ size?: number; className?: string }>;

export interface CriticalEventMeta {
  icon?: CriticalEventIcon;
  label: string;
}

export interface CriticalEvent {
  id: string;
  severity?: 'info' | 'warning' | 'error';
  title: React.ReactNode;
  description?: React.ReactNode;
  timestamp?: React.ReactNode;
  onClick?: () => void;
  /** Explicit accent color (a DS token, e.g. `--status-*`/`--chart-*`) — overrides
   *  the closed `severity` enum's default color when a row needs an arbitrary tone. */
  tone?: string;
  /** Icon override — otherwise derived from `severity` (default `Info`). */
  icon?: CriticalEventIcon;
  /** Small muted meta chips under the title (e.g. asset · owner · zone). */
  meta?: CriticalEventMeta[];
  /** Visually recedes the row (already-actioned/read) without removing it. */
  dismissed?: boolean;
}

export interface CriticalEventsListProps extends React.HTMLAttributes<HTMLDivElement> {
  events: CriticalEvent[];
  emptyState?: React.ReactNode;
}

function MetaChip({ icon: Icon, label }: CriticalEventMeta) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-caption text-muted-foreground">
      {Icon ? <Icon size={11} /> : null}{label}
    </span>
  );
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
        const Icon = e.icon ?? (e.severity === 'error' ? AlertOctagon : e.severity === 'warning' ? AlertTriangle : Info);
        const color = e.tone ?? (e.severity === 'error' ? 'var(--status-error)' : e.severity === 'warning' ? 'var(--status-warning)' : 'var(--status-info)');
        return (
          <button
            key={e.id}
            type="button"
            onClick={e.onClick}
            className={cn(
              'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/40 last:border-0',
              e.dismissed && 'opacity-50',
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" style={{ color }} />
            <div className="min-w-0 flex-1">
              <div className="text-body-sm font-medium text-foreground">{e.title}</div>
              {e.description ? <div className="mt-0.5 text-caption text-muted-foreground">{e.description}</div> : null}
              {e.meta?.length ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {e.meta.map((m, i) => <MetaChip key={i} {...m} />)}
                </div>
              ) : null}
            </div>
            {e.timestamp ? <span className="shrink-0 text-caption tabular-nums text-muted-foreground">{e.timestamp}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
