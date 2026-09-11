import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface PageHeaderProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Primary page title. */
  title: ReactNode
  /** Optional supporting line below the title. */
  subtitle?: ReactNode
  /** Action content (buttons), pinned to the `end` edge on `sm+`. */
  actions?: ReactNode
}

/**
 * PageHeader — title + subtitle on the `start`, actions on the `end`.
 *
 * Stacks vertically below `sm` and goes side-by-side from `sm` up. RTL-safe via
 * logical `ms-auto` / `sm:text-start` (no physical-direction utilities).
 */
export const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, subtitle, actions, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
          className,
        )}
        {...props}
      >
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2 sm:ms-auto">
            {actions}
          </div>
        ) : null}
      </div>
    )
  },
)

PageHeader.displayName = 'PageHeader'
