import type { ReactNode } from 'react'
import { Inbox } from '@fams/ui-kit/icons'
import { cn } from '../lib/cn'

export interface ViewEmptyStateProps {
  /** Headline. */
  title?: ReactNode
  /** Supporting line under the title. */
  description?: ReactNode
  /** Leading glyph; defaults to an inbox icon. Pass `null` to hide. */
  icon?: ReactNode
  /** Call-to-action(s) — e.g. a "New" button. */
  action?: ReactNode
  className?: string
}

/**
 * ViewEmptyState — the shared token-styled empty surface for the view
 * templates (ListView / KanbanView / HybridView). [tier-2 pattern]
 *
 * Centered icon + title + description + optional action, tokens only and
 * RTL-safe (no physical-direction utilities). Presentational — the caller
 * owns the copy and any action.
 */
export function ViewEmptyState({
  title = 'Nothing here yet',
  description,
  icon,
  action,
  className,
}: ViewEmptyStateProps) {
  return (
    <div
      data-slot="view-empty-state"
      className={cn(
        'flex h-full min-h-40 w-full flex-col items-center justify-center gap-3 p-8 text-center',
        className,
      )}
    >
      {icon === null ? null : (
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground"
        >
          {icon ?? <Inbox className="size-6" />}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-body font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-body-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}

ViewEmptyState.displayName = 'ViewEmptyState'
