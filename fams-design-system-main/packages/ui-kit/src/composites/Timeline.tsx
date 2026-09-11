import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { IconBadge, type IconBadgeTone } from '../primitives/IconBadge'

/**
 * Timeline — vertical activity/audit feed: a connector line threading
 * through a sequence of tinted-icon nodes, each with a title/subtitle and
 * an optional timestamp. [L3 composite]
 *
 * The connector + nodes render on the inline-start side and flip correctly
 * under `dir="rtl"` for free — the layout is plain flex-row (no absolute
 * positioning, no `left`/`right`), so there is nothing to mirror manually.
 * Each node reuses the `IconBadge` primitive for its tinted disc, so
 * `tone` resolves through the exact same token map (`bg-{tone}/10` +
 * `text-{tone}`) as every other status accent in the system — never a raw
 * hex per item (see `docs/history/PORT-LEDGER.md` § System-wide policy 1).
 *
 * State-agnostic (Rule 8): renders the `items` it was given; ordering,
 * pagination, and "load more" belong to the caller.
 *
 * @usage-v5
 *   Consolidates the vertical audit/activity feed pattern, currently forked
 *   across two mechanisms:
 *   - `shared/components/timeline/AuditTrailTimeline.vue` (`q-timeline`, 9 uses) —
 *     re-used by 8 wrapper components (asset/contract/contact/company/
 *     service_location/materials/workforce-driver audit trails); icon +
 *     color keyed off insert/update/soft_delete action type.
 *   - `shared/components/timeline/PipelineTimeline.vue` (`q-timeline`, 11 uses) —
 *     task comment/activity feed, icon per `module_action` + avatar for comments.
 *   - `iwmp/.../ActivityLogCard.vue` — hand-rolled (no `q-timeline`), literal
 *     hex `border-left-color: #a5d6b8` per entry — exactly what `tone` replaces.
 *   Forms needed: tone {neutral|info|success|warning|danger} per entry (add=success,
 *   update=info, remove=danger), optional icon, optional timestamp column.
 * @usage-index timeline
 */
export type TimelineTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface TimelineItem {
  id: string
  title: ReactNode
  subtitle?: ReactNode
  timestamp?: ReactNode
  /** Icon element rendered inside the node's tinted disc (e.g. a lucide-react icon). Omit for a plain tinted dot. */
  icon?: ReactNode
  /** Closed semantic tone, resolved to tokens via `IconBadge` — never a raw color. Defaults to `neutral`. */
  tone?: TimelineTone
}

export interface TimelineProps extends HTMLAttributes<HTMLOListElement> {
  items: TimelineItem[]
}

const NODE_TONE: Record<TimelineTone, IconBadgeTone> = {
  neutral: 'neutral',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
}

export const Timeline = forwardRef<HTMLOListElement, TimelineProps>(
  ({ className, items, ...props }, ref) => (
    <ol ref={ref} data-slot="timeline" className={cn('flex flex-col', className)} {...props}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <li key={item.id} data-slot="timeline-item" className="flex gap-3">
            <div className="flex w-8 shrink-0 flex-col items-center">
              <IconBadge tone={NODE_TONE[item.tone ?? 'neutral']} shape="circle" size="sm" className="shrink-0">
                {item.icon}
              </IconBadge>
              {!isLast ? (
                <span aria-hidden="true" data-slot="timeline-connector" className="mt-1 w-px flex-1 bg-border" />
              ) : null}
            </div>
            <div className={cn('min-w-0 flex-1', !isLast && 'pb-6')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  {item.subtitle ? (
                    <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                  ) : null}
                </div>
                {item.timestamp ? (
                  <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                    {item.timestamp}
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  ),
)

Timeline.displayName = 'Timeline'
