import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { Clock } from '../icons'
import { cn } from '../lib/cn'

/**
 * TimeRemainingChip — countdown/overdue indicator. [L3 composite]
 *
 * figma-spec-kanban.md §3: a clock icon + text (e.g. "2d 5h left") — a plain
 * colored-text treatment, deliberately NOT a filled pill (unlike
 * `PriorityChip`/`StatusPill`): "Normal state: neutral gray text… Overdue
 * state ("+45m", "+3h 24m"): text/icon `Accent/Flame/Normal` `#ff6a1a` — no
 * chip background pill." `overdue` swaps both the text/icon color AND is
 * the caller's cue to format the string with the spec's leading `+` (e.g.
 * `"+4h"` vs `"2d 5h left"`) — this component only renders whatever string
 * it's given, formatting stays the caller's concern (Rule 8).
 *
 * @usage-index time-remaining-chip
 */
export interface TimeRemainingChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Past-due state — swaps to the `Accent/Flame/Normal` tint. Defaults to `false` (neutral gray). */
  overdue?: boolean
  /** Leading icon override. Defaults to a `clock` glyph. Pass `null` to omit (e.g. a terminal-state "–" dash with no icon). */
  icon?: ReactNode | null
}

export const TimeRemainingChip = forwardRef<HTMLSpanElement, TimeRemainingChipProps>(
  ({ overdue = false, icon, className, children, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="time-remaining-chip"
      data-state={overdue ? 'overdue' : 'normal'}
      className={cn(
        'inline-flex items-center gap-1 text-body-xs [&>svg]:size-3.5 [&>svg]:shrink-0',
        overdue ? 'text-accent-family-flame-normal' : 'text-muted-foreground',
        className,
      )}
      {...props}
    >
      {icon === null ? null : (icon ?? <Clock aria-hidden="true" />)}
      {children}
    </span>
  ),
)

TimeRemainingChip.displayName = 'TimeRemainingChip'
