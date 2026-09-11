import { forwardRef, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { AlertOctagon, AlertTriangle, Info, type LucideIcon } from '../icons'
import { cn } from '../lib/cn'
import { Badge, type BadgeVariant } from '../primitives/Badge'
import { IconBadge, type IconBadgeTone } from '../primitives/IconBadge'
import { ListRow, type ListRowMetaItem } from './ListRow'
import { StatusView } from './StatusView'

/**
 * CriticalEventsList — a bordered card listing critical/warning/info events
 * (GPS loss, overspeeding, SLA breach…) as a scannable row list. [L3 composite]
 *
 * A thin composition, not a new visual surface: each row is a `ListRow`
 * (leading `IconBadge` for severity, title/description, trailing timestamp);
 * the zero-events case delegates entirely to `StatusView`. Severity resolves
 * through the same closed tone enum as `Timeline`/`Badge` via `IconBadge` —
 * never a raw hex per event (`docs/history/PORT-LEDGER.md` § System-wide policy 1).
 *
 * State-agnostic (Rule 8): renders the `items` it was given; a single
 * `onItemClick(id)` callback — not a closure embedded per item — keeps prop
 * identities stable across re-renders. Fetching, polling, and dismissal are
 * the caller's.
 *
 * @usage-v5
 *   Consolidates `shared/components/cards/CriticalEvents.vue` — a
 *   `q-virtual-scroll` list of event rows (icon + label, address, time,
 *   trailing `q-chip color="negative"` severity marker) reused across 8
 *   asset-vehicle profile tabs (Overview/Trips/BinCollection × iwmp/fams/ead
 *   + shared `DriverSafetyOverview`). Icon + severity color were resolved
 *   ad-hoc per event rule; here `severity` closes that to `info|warning|error`.
 *   Forms needed: id, title, description (was: address), severity, timestamp.
 * @usage-index critical-events-list
 */
export type CriticalEventSeverity = 'info' | 'warning' | 'error'

export interface CriticalEventsListItem {
  id: string
  /** Primary line — the event label. */
  title: ReactNode
  /** Secondary line — e.g. location/context. */
  description?: ReactNode
  /** Resolves to the leading IconBadge's icon + tone. */
  severity: CriticalEventSeverity
  /**
   * Label-over-value metadata columns for this row (widget-board #13's
   * "Event Log" layout) — rendered between the title block and the
   * timestamp. Generic: the caller names the columns. Omit for the original
   * title/description/timestamp row.
   */
  meta?: ListRowMetaItem[]
  /**
   * Overrides the WORD shown in this row's severity chip (default
   * `"Info"` / `"Warning"` / `"Critical"`) — e.g. a localised string, or a
   * sharper label for the rule that fired. The chip itself is never optional:
   * see `SEVERITY_LABEL`.
   */
  severityLabel?: ReactNode
  /** Pre-formatted by the caller (e.g. `"09:41"`, `"2h ago"`). */
  timestamp?: ReactNode
}

export interface CriticalEventsListProps extends HTMLAttributes<HTMLDivElement> {
  items: CriticalEventsListItem[]
  /** Called with the clicked item's `id`. Omit to render a non-interactive list. */
  onItemClick?: (id: string) => void
  /** Rendered instead of the list when `items` is empty. Defaults to a `StatusView`. */
  emptyState?: ReactNode
}

const SEVERITY_ICON: Record<CriticalEventSeverity, LucideIcon> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertOctagon,
}

const SEVERITY_TONE: Record<CriticalEventSeverity, IconBadgeTone> = {
  info: 'info',
  warning: 'warning',
  error: 'danger',
}

/**
 * Severity is stated in WORDS on every row, not just in the leading icon's
 * tint. Round-2 visual QA #10: severity was carried by red-vs-amber alone,
 * which is colour as the only encoding (verdict V12) and invisible to a
 * non-visual reader. The chip reuses the `Badge` primitive (icon + word) so
 * the tint stays the same closed token vocabulary as the icon badge.
 */
const SEVERITY_LABEL: Record<CriticalEventSeverity, string> = {
  info: 'Info',
  warning: 'Warning',
  error: 'Critical',
}

const SEVERITY_BADGE_VARIANT: Record<CriticalEventSeverity, BadgeVariant> = {
  info: 'info',
  warning: 'warning',
  error: 'destructive',
}

export const CriticalEventsList = forwardRef<HTMLDivElement, CriticalEventsListProps>(
  ({ className, items, onItemClick, emptyState, ...props }, ref) => {
    if (items.length === 0) {
      return (
        <div
          ref={ref}
          data-slot="critical-events-list"
          className={cn('rounded-md border border-border bg-card p-6', className)}
          {...props}
        >
          {emptyState ?? (
            <StatusView
              kind="empty"
              title="No critical events"
              description="Nothing needs your attention right now."
            />
          )}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        data-slot="critical-events-list"
        className={cn('overflow-hidden rounded-md border border-border bg-card', className)}
        {...props}
      >
        {items.map((item) => {
          const Icon = SEVERITY_ICON[item.severity]
          const clickable = Boolean(onItemClick)

          const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
            if (!onItemClick) return
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onItemClick(item.id)
            }
          }

          return (
            <ListRow
              key={item.id}
              leading={<IconBadge icon={Icon} tone={SEVERITY_TONE[item.severity]} shape="circle" size="sm" />}
              title={item.title}
              titleBadge={
                <Badge
                  data-severity={item.severity}
                  variant={SEVERITY_BADGE_VARIANT[item.severity]}
                  uppercase
                >
                  <Icon aria-hidden="true" />
                  {item.severityLabel ?? SEVERITY_LABEL[item.severity]}
                </Badge>
              }
              subtitle={item.description}
              meta={item.meta}
              trailing={item.timestamp}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => onItemClick?.(item.id) : undefined}
              onKeyDown={clickable ? handleKeyDown : undefined}
            />
          )
        })}
      </div>
    )
  },
)

CriticalEventsList.displayName = 'CriticalEventsList'
