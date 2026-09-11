import { cn } from '../../lib/cn'
import type { CalendarEvent } from './calendar-model'

export interface CalendarEventChipProps {
  event: CalendarEvent
  /**
   * `month` is the cell chip, `week` the day-column bar. ONE component with a
   * density prop, never two (UX D.25) — the treatment (24px min box, one-line
   * ellipsis, status colour on the leading border) is identical, only the
   * vertical rhythm differs.
   */
  density?: 'month' | 'week'
  onOpen?: (event: CalendarEvent) => void
}

/**
 * CalendarEventChip — one record on a day. [tier-2 internal]
 *
 * SPEC §1.4: a full-width white row, radius 6, `border-subtle`, with the STATUS
 * COLOUR ON THE LEADING BORDER (Dev Note 32276, which pins that to the left
 * border specifically) and a single-line ellipsised title.
 *
 * The status colour is runtime DATA off `statusList[].color`, so it is applied
 * as an inline `borderInlineStartColor` — the same "raw runtime colour, never a
 * hardcoded design value" treatment `KanbanColumnView`'s `accentColor` and
 * `ReadColor` already use (root rule 2). A status the blueprint gives no colour
 * falls through to the `border-border` token rather than inventing a hue, and
 * `borderInlineStart` (not `border-left`) keeps it RTL-correct (rule 4).
 *
 * Colour is never the sole carrier of status (UX K.72): the status LABEL is part
 * of the chip's accessible name, and the full title is exposed via `title=` for
 * the ellipsised case (UX C.17).
 */
export function CalendarEventChip({ event, density = 'month', onOpen }: CalendarEventChipProps) {
  const statusName = event.statusLabel ? `, ${event.statusLabel}` : ''
  return (
    <button
      type="button"
      data-slot="calendar-event-chip"
      data-status={event.statusKey || undefined}
      // The status edge is a border, not a pseudo-element, so the resting box
      // never changes width between statuses (no layout shift, UX H.52).
      // SPEC §1.4 draws it 3px; `border-s-4` is the nearest border-width scale
      // step (the DS has no 3px step and rule 2 bans an arbitrary `[3px]`).
      className={cn(
        'flex min-h-6 w-full min-w-0 items-center rounded-sm border border-s-4 border-border bg-card px-2 text-start',
        'text-body-xs text-foreground outline-none transition-colors',
        'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
        density === 'week' ? 'py-1.5' : 'py-0.5',
      )}
      style={event.color ? { borderInlineStartColor: event.color } : undefined}
      title={event.title}
      aria-label={`${event.title}${statusName}`}
      onClick={(e) => {
        // A chip lives inside a day cell that may itself start a create on
        // click (UX C.21) — opening a record must never also open a create.
        e.stopPropagation()
        onOpen?.(event)
      }}
    >
      <span className="min-w-0 flex-1 truncate">{event.title}</span>
    </button>
  )
}

CalendarEventChip.displayName = 'CalendarEventChip'
