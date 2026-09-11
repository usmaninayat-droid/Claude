import { useState } from 'react'
import { X } from '@fams/ui-kit/icons'
import { Popover, PopoverTrigger, PopoverContent } from '@fams/ui-kit'
import { popupMaxHeight } from '../../map/popup-anchor'
import { cn } from '../../lib/cn'
import { CalendarEventChip } from './CalendarEventChip'
import type { CalendarEvent } from './calendar-model'
import { dayLabel, weekdayAbbrev } from './calendar-format'

export interface DayOverflowPopoverProps {
  dayKey: string
  dayOfMonth: number
  /** EVERY event on that day (Dev Note 32272 — the popup shows all of them). */
  events: CalendarEvent[]
  /** Hidden-count for the trigger's label: `N More`. */
  hiddenCount: number
  onOpen?: (event: CalendarEvent) => void
}

/**
 * The popover's own height cap, derived from the SHIPPED clamping helper rather
 * than a second implementation (UX C.19 / verdict 23 — `map/popup-anchor` only).
 * `popupUsableBand` with a 48px margin and no attribution band is exactly the
 * note's `min(420px, 100vh - 96px)`: the band is `100vh - 96`, the reserve is 0
 * and the ceiling is 420. `popup-anchor` is pure TS with no imports, so reading
 * it here pulls none of the `./map` entry's maplibre/deck.gl weight into the
 * main barrel.
 */
function maxBlockSize(): number {
  const height = typeof window === 'undefined' ? 0 : window.innerHeight
  return popupMaxHeight(
    { pane: { width: 0, height }, screen: { top: 0, bottom: height }, margin: 48, attributionBand: 0 },
    0,
    420,
  )
}

/**
 * DayOverflowPopover — the `N More` surface (SPEC §1.4, Dev Notes 32264/32272).
 * [tier-2 internal]
 *
 * Radix's `Popover` in MODAL mode supplies the whole focus contract UX C.20
 * requires without hand-rolling a trap: `role="dialog"` + `aria-modal="true"`,
 * focus moved into the panel on open, Tab trapped inside it, Escape and
 * outside-click both closing, and focus RESTORED to the `N More` trigger that
 * opened it (the trigger is the Radix trigger, so restoration is structural,
 * not wired). Collision handling — flipping above the cell near the viewport
 * bottom and shifting inline near its end edge — is Radix's own
 * `avoidCollisions` + `collisionPadding`, so there is no second clamping
 * implementation either; only the height cap needs the shipped helper.
 *
 * The trigger stops propagation so opening the popup never also fires the day
 * cell's create-on-click (UX C.21).
 */
export function DayOverflowPopover({
  dayKey,
  dayOfMonth,
  events,
  hiddenCount,
  onOpen,
}: DayOverflowPopoverProps) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="calendar-day-overflow-trigger"
          // ≥24px tall and ≥64px wide (UX K.66).
          className={cn(
            'mx-auto flex h-6 min-w-16 items-center justify-center rounded-sm px-2 text-body-xs',
            'text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground',
            'focus-visible:ring-2 focus-visible:ring-ring',
          )}
          aria-label={`Show all ${events.length} records on ${dayLabel(dayKey)}`}
          onClick={(e) => e.stopPropagation()}
        >
          {hiddenCount} More
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-slot="calendar-day-overflow"
        align="center"
        collisionPadding={12}
        aria-label={`Records on ${dayLabel(dayKey)}`}
        // Radix renders the panel as `role="dialog"` and `modal` gives it a
        // real focus trap, but — unlike `Dialog` — `Popover` does not stamp
        // `aria-modal`. UX C.20 requires it, and with the trap in place it is
        // a truthful claim, so it is set here rather than left to the primitive.
        aria-modal="true"
        className="flex w-80 max-w-80 flex-col gap-0 p-0"
        style={{ maxBlockSize: `${maxBlockSize()}px` }}
        // Clicking empty space inside the panel must not reach the day cell's
        // create handler either (UX C.21).
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2 border-b border-border p-3">
          <div className="min-w-0 flex-1 text-center">
            <p className="text-body-xs text-muted-foreground">{weekdayAbbrev(dayKey)}</p>
            <h3 className="text-body font-semibold text-foreground">
              {`${dayOfMonth}`.padStart(2, '0')}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close day details"
            onClick={() => setOpen(false)}
            className="flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        {/* Body scrolls internally; the header above stays pinned (UX C.19). */}
        <ul
          data-slot="calendar-day-overflow-body"
          className="flex min-h-0 flex-1 list-none flex-col gap-2 overflow-y-auto p-3"
        >
          {events.map((event) => (
            <li key={event.id}>
              <CalendarEventChip event={event} density="week" onOpen={onOpen} />
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

DayOverflowPopover.displayName = 'DayOverflowPopover'
