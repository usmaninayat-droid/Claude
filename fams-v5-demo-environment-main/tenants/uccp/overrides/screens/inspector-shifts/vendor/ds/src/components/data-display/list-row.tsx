import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * ListRow — compact horizontal row for list views (Pattern #16 alt-row pattern,
 * inbox lists, search results). Slot-based.
 */
export interface ListRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  leading?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  selected?: boolean;
  unread?: boolean;
}

export const ListRow = React.forwardRef<HTMLDivElement, ListRowProps>(
  ({ className, leading, title, subtitle, trailing, selected, unread, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="list-row"
      className={cn(
        'group flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-muted/40',
        selected && 'bg-[color:var(--secondary)]/40',
        className
      )}
      {...props}
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className={cn('truncate text-sm', unread ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>
          {title}
        </div>
        {subtitle ? (
          <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  )
);
ListRow.displayName = 'ListRow';
