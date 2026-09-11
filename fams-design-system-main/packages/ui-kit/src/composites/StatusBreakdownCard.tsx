import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import type { LucideIcon } from '../icons'
import { cn } from '../lib/cn'

/**
 * StatusBreakdownCard — a card of proportion rows: each row pairs a label +
 * count with a horizontal bar sized to that row's share of the whole, filled
 * with a semantic status token. [L3 composite]
 *
 * Module-agnostic: rows are `{label, count, tone}` — no domain vocabulary.
 * Distinct from `SegmentedBar` (one stacked bar of categorical chart hues):
 * this card renders one bar PER row using the semantic status tokens
 * (`success`/`warning`/`destructive`/`info`), the shape breakdown panels
 * (fleet availability, workforce readiness, ticket ageing, …) draw.
 *
 * Rules honoured: counts render as text beside every bar, so colour/length
 * is never the sole carrier; a non-zero row keeps a ≥4px visible fill even
 * for tiny shares (UX MUST 44); all-zero rows render a muted track with a
 * "No data" reading instead of an empty gap (MUST 45).
 *
 * @usage-index status-breakdown-card
 */
export type StatusBreakdownTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/** Row fill per tone. Static lookup so Tailwind sees every class. */
const FILL_CLASSES: Record<StatusBreakdownTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
  neutral: 'bg-muted-foreground',
}

export interface StatusBreakdownRow {
  /** Stable id for the React key. Falls back to index. */
  id?: string
  label: ReactNode
  count: number
  /** Semantic fill token. Default `'neutral'`. */
  tone?: StatusBreakdownTone
}

export interface StatusBreakdownStat {
  id?: string
  label: ReactNode
  /** Pre-formatted by the caller. */
  value: ReactNode
}

export interface StatusBreakdownCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  title: ReactNode
  /** Leading icon beside the title. */
  icon?: LucideIcon
  /** Trailing header slot — e.g. a filter chip / dropdown trigger. */
  action?: ReactNode
  /** Optional headline stat columns above the rows. */
  stats?: StatusBreakdownStat[]
  rows: StatusBreakdownRow[]
  /**
   * Proportion denominator. Defaults to the sum of `rows[].count` — pass it
   * when the rows are a subset of a larger whole.
   */
  total?: number
  /** Text shown when every row is zero. Default `"No data"`. */
  emptyLabel?: ReactNode
}

export const StatusBreakdownCard = forwardRef<HTMLDivElement, StatusBreakdownCardProps>(
  ({ className, title, icon: Icon, action, stats, rows, total, emptyLabel = 'No data', ...props }, ref) => {
    const sum = rows.reduce((acc, row) => acc + Math.max(0, row.count), 0)
    const denominator = total !== undefined && total > 0 ? total : sum

    return (
      <div
        ref={ref}
        data-slot="status-breakdown-card"
        className={cn('flex min-w-0 flex-col gap-4 rounded-md border border-border bg-card p-4', className)}
        {...props}
      >
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" /> : null}
          <span
            data-slot="status-breakdown-card-title"
            className="min-w-0 flex-1 truncate text-body-sm font-semibold text-foreground"
          >
            {title}
          </span>
          {action ? (
            <span data-slot="status-breakdown-card-action" className="shrink-0">
              {action}
            </span>
          ) : null}
        </div>

        {stats && stats.length > 0 ? (
          <div data-slot="status-breakdown-card-stats" className="flex flex-wrap gap-x-6 gap-y-2">
            {stats.map((stat, index) => (
              <div key={stat.id ?? index} className="flex min-w-0 flex-col">
                <span className="text-h5 font-bold leading-tight text-foreground">{stat.value}</span>
                <span className="truncate text-body-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        ) : null}

        {denominator === 0 ? (
          <div data-slot="status-breakdown-card-empty" className="flex flex-col gap-1.5">
            <div aria-hidden className="h-2.5 w-full rounded-full bg-muted" />
            <span className="text-body-xs text-muted-foreground">{emptyLabel}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {/* ONE stacked proportion bar, segments colored by status. The
                legend below is the accessible text reading; each segment also
                carries a hover `title` with label + count (UX MUST 44). */}
            <div
              data-slot="status-breakdown-card-bar"
              aria-hidden
              className="flex h-2.5 w-full gap-px overflow-hidden rounded-full bg-muted"
            >
              {rows
                .filter((row) => row.count > 0)
                .map((row, index) => {
                  const count = Math.max(0, row.count)
                  const pct = Math.min(100, (count / denominator) * 100)
                  return (
                    <div
                      key={row.id ?? index}
                      data-slot="status-breakdown-card-row-fill"
                      data-tone={row.tone ?? 'neutral'}
                      title={`${typeof row.label === 'string' ? row.label : ''} ${count}`.trim()}
                      className={cn('h-full first:rounded-s-full last:rounded-e-full', FILL_CLASSES[row.tone ?? 'neutral'])}
                      // Data-driven width (legit style under hard rule 2);
                      // ≥4px floor keeps a 1-of-200 share visible (MUST 44).
                      style={{ width: `${pct}%`, minWidth: '4px' }}
                    />
                  )
                })}
            </div>
            <ul data-slot="status-breakdown-card-rows" className="flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
              {rows.map((row, index) => (
                <li key={row.id ?? index} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    data-tone={row.tone ?? 'neutral'}
                    className={cn('size-2 shrink-0 rounded-full', FILL_CLASSES[row.tone ?? 'neutral'])}
                  />
                  <span data-slot="status-breakdown-card-row-label" className="text-body-xs text-muted-foreground">
                    {row.label}
                  </span>
                  <span
                    data-slot="status-breakdown-card-row-count"
                    className="text-body-xs font-semibold tabular-nums text-foreground"
                  >
                    {Math.max(0, row.count)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  },
)

StatusBreakdownCard.displayName = 'StatusBreakdownCard'
