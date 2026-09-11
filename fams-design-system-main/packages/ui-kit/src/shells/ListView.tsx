import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { PageHeader } from './PageHeader'

export interface ListViewProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Page title (forwarded to the embedded PageHeader). */
  title: ReactNode
  /** Optional supporting line below the title. */
  subtitle?: ReactNode
  /** Header actions (e.g. "New" button). */
  actions?: ReactNode
  /** Filter-bar region — search, facet dropdowns, etc. Hidden when omitted. */
  filterBar?: ReactNode
  /** Main content region — typically a table. */
  children: ReactNode
}

/**
 * ListView — the standard list-page skeleton.
 *
 *   ┌ PageHeader (title · subtitle · actions) ┐
 *   ├ filter bar (optional)                   ┤
 *   └ content region (table)                  ┘
 *
 * Pure layout: it owns spacing + the filter-bar chrome, the caller supplies the
 * table. RTL inherited from the document — no physical-direction utilities here.
 */
export const ListView = forwardRef<HTMLDivElement, ListViewProps>(
  (
    { title, subtitle, actions, filterBar, children, className, ...props },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn('flex h-full min-h-0 flex-col gap-4 p-6', className)}
        {...props}
      >
        <PageHeader title={title} subtitle={subtitle} actions={actions} />

        {filterBar ? (
          <div
            data-testid="list-filter-bar"
            className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-card p-3"
          >
            {filterBar}
          </div>
        ) : null}

        <div
          data-testid="list-content"
          className="fams-scroll-region min-h-0 flex-1 overflow-auto rounded-sm border border-border bg-card"
        >
          {children}
        </div>
      </div>
    )
  },
)

ListView.displayName = 'ListView'
