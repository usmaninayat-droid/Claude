import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react'
import { AlertTriangle, Disc } from '../../icons'
import { cn } from '../../lib/cn'

/**
 * VehicleEventsList — the vehicle popup's "Critical Events" tab body
 * (live-monitoring Figma 495:5977): event name (+ subtype), a labeled
 * Location column, a labeled Event Time column, and a severity badge.
 *
 * Round-1 visual parity (findings #17 / #18 / #42):
 * - every row is its own **bordered radius-6 box** with a gap between rows —
 *   not hairline-separated list items;
 * - a **vertical rule** separates the event-name block from Location;
 * - the badge is a **radius-4 rectangle, 90×22.5** — not a fully-rounded
 *   84×20 pill — filled `error-600` (`#D92D20`), not `error-500`.
 *
 * Geometry note (the `ClusterBadge` carve-out): the Figma's 90×22.5 badge and
 * its 4px/6px radii have no spacing-token equivalent and cannot be written as
 * `[Npx]` utility classes (banned by `lint:tokens`) — they live here as
 * component-scoped constants fed to inline styles. Colors are 100% tokens.
 */

export type VehicleEventSeverity = 'critical' | 'warning' | 'info'

export interface VehicleEventItem {
  id: string
  /** Event name, e.g. "Black Spot". */
  name: string
  /** Dimmed second line under the name (event subtype). */
  subtype?: string
  location: string
  /** Pre-formatted, e.g. "07 Oct, 24 | 02:49 PM". */
  time: string
  severity?: VehicleEventSeverity
  /** Badge text override; defaults to the severity word, uppercased. */
  severityLabel?: string
}

export interface VehicleEventsListProps extends HTMLAttributes<HTMLDivElement> {
  events: VehicleEventItem[]
  /** Shown when `events` is empty. */
  emptyLabel?: string
}

/**
 * Figma 495:5977: row box radius 6; badge 90×22.5 on radius 4.
 *
 * Row HEIGHT is load-bearing (round-3 visual #15): the frame runs 52.5px rows
 * on a 63.75px pitch and fits all FOUR inside the card body, while the app's
 * content-sized 58px rows on a 66px pitch overflowed a `max-h-56` (224px)
 * scroller and clipped row 4 mid-row. 52 + the 8px `gap-2` = a 60px pitch,
 * and four rows = 232px, so the scroller's ceiling rises to 240.
 */
const ROW_BOX: CSSProperties = { borderRadius: 6, height: 52 }
/** Four 52px rows + three 8px gaps = 232px; 240 leaves the gap-free slack. */
const LIST_BOX: CSSProperties = { maxHeight: 240 }
const BADGE_BOX: CSSProperties = { width: 90, height: 22.5, borderRadius: 4 }

/** `critical` reads error-**600** (#D92D20), not error-500 (finding #42). */
const SEVERITY_BADGE: Record<VehicleEventSeverity, string> = {
  critical: 'bg-error-600 text-white',
  warning: 'bg-warning-scale-600 text-white',
  info: 'bg-primary text-white',
}

export const VehicleEventsList = forwardRef<HTMLDivElement, VehicleEventsListProps>(
  ({ events, emptyLabel = 'No events recorded', className, ...props }, ref) => {
    if (events.length === 0) {
      return (
        <div ref={ref} className={cn('py-6 text-center text-sm text-gray-400', className)} {...props}>
          {emptyLabel}
        </div>
      )
    }
    return (
      <div
        ref={ref}
        data-slot="vehicle-events-list"
        style={LIST_BOX}
        className={cn('flex flex-col overflow-y-auto', className)}
        {...props}
      >
        <ul className="flex flex-col gap-2">
          {events.map((event) => {
            const severity = event.severity ?? 'critical'
            return (
              <li
                key={event.id}
                data-slot="vehicle-event-row"
                style={ROW_BOX}
                className="flex items-center gap-3 overflow-hidden border border-border px-3 py-2"
              >
                <span className="grid size-4 shrink-0 place-items-center text-foreground">
                  <Disc className="size-4" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-caption font-semibold text-foreground">{event.name}</span>
                  {event.subtype ? (
                    <span className="truncate text-caption text-gray-400">{event.subtype}</span>
                  ) : null}
                </span>
                {/* Vertical rule after the event-name block (finding #17). */}
                <span aria-hidden="true" className="w-px self-stretch bg-border" />
                <span className="flex w-24 shrink-0 flex-col ps-1">
                  <span className="text-caption text-gray-400">Location</span>
                  <span className="truncate text-caption font-semibold text-foreground">{event.location}</span>
                </span>
                <span className="flex w-36 shrink-0 flex-col">
                  <span className="text-caption text-gray-400">Event Time</span>
                  <span className="truncate text-caption font-semibold text-foreground">{event.time}</span>
                </span>
                <span
                  data-slot="vehicle-event-severity"
                  style={BADGE_BOX}
                  className={cn(
                    'inline-flex shrink-0 items-center justify-center gap-1 text-caption font-bold uppercase',
                    SEVERITY_BADGE[severity],
                  )}
                >
                  <AlertTriangle className="size-3" aria-hidden="true" />
                  {event.severityLabel ?? severity}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    )
  },
)

VehicleEventsList.displayName = 'VehicleEventsList'
