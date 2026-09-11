import { cn } from '../../lib/cn'
import { CalendarEventChip } from './CalendarEventChip'
import { DayOverflowPopover } from './DayOverflowPopover'
import type { CalendarDay, CalendarEvent } from './calendar-model'
import { dayCellLabel, dayLabel, weekdayNames, type CalendarDensity } from './calendar-format'
import { useGridNavigation } from './use-grid-navigation'

export interface CalendarMonthGridProps {
  weeks: CalendarDay[][]
  /** Chips a cell shows before the rest collapse behind `N More` (UX C.16). */
  chipCap: number
  density: CalendarDensity
  weekStartsOn?: 0 | 1
  onOpenRecord?: (event: CalendarEvent) => void
  /**
   * Enables create-on-empty-cell (pointer AND keyboard); omit to render no
   * create affordance at all. Called with the day's `YYYY-MM-DD` key.
   */
  onCreateAtDate?: (dayKey: string) => void
  /** PageUp/PageDown from inside the grid — steps the caller's period. */
  onStepPeriod?: (delta: -1 | 1) => void
}

/**
 * CalendarMonthGrid — the 7×6 month grid (SPEC §1.4). [tier-2 internal]
 *
 * Scroll architecture (UX A.3 / C.18): the WHOLE grid is one vertical scroller
 * with the weekday header row sticky at its top; individual day cells never
 * scroll — that is what `N More` exists for. Six rows always render, even for an
 * empty month, because the grid IS the content (UX J.59).
 *
 * Structure is a real `role="grid"` with the weekday row as column headers, so a
 * screen reader can say "Friday 18, 5 records" (UX K.69) — each cell's name is
 * `dayCellLabel`. Card/chip titles stay buttons, never headings (UX K.68).
 *
 * Cell height comes from the density the view resolved (comfortable at 1440,
 * compact at 1280) via the spacing-scale `min-h-*` utilities — the Figma cell is
 * a 1920-space proportion, not a literal value (UX B.6).
 */
export function CalendarMonthGrid({
  weeks,
  chipCap,
  density,
  weekStartsOn = 1,
  onOpenRecord,
  onCreateAtDate,
  onStepPeriod,
}: CalendarMonthGridProps) {
  const names = weekdayNames(weekStartsOn)
  const cellHeight = density === 'compact' ? 'min-h-28' : 'min-h-33'
  // The grid's keyboard model (see `use-grid-navigation.ts` for the ruling on
  // why `role="grid"` is kept and earned rather than dropped).
  const dayKeys = weeks.flatMap((week) => week.map((day) => day.key))
  const nav = useGridNavigation({ keys: dayKeys, columns: 7, onActivate: onCreateAtDate, onStepPeriod })
  return (
    <div
      data-slot="calendar-month-body"
      className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
    >
      <div
        role="grid"
        aria-label="Month grid"
        data-slot="calendar-month-grid"
        className="grid grid-cols-7 border-s border-t border-border"
      >
        <div role="row" className="col-span-7 grid grid-cols-7 sticky top-0 z-10 bg-muted">
          {names.map((name) => (
            <div
              key={name}
              role="columnheader"
              className="flex h-12 items-center justify-center border-e border-b border-border text-body-xs font-medium text-muted-foreground"
            >
              {name}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div role="row" key={week[0].key} className="col-span-7 grid grid-cols-7">
            {week.map((day) => {
              const shown = day.events.slice(0, chipCap)
              const hidden = day.events.length - shown.length
              return (
                <div
                  role="gridcell"
                  key={day.key}
                  data-slot="calendar-day-cell"
                  data-grid-cell-key={day.key}
                  data-outside={day.inPeriod ? undefined : 'true'}
                  // The cell IS the grid's focusable unit — exactly one carries
                  // the tab stop, arrows move it, Enter/Space creates on that
                  // day. Without this the `role="grid"` had no way in at all.
                  tabIndex={nav.tabIndexFor(day.key)}
                  onKeyDown={(event) => nav.onKeyDown(event, day.key)}
                  onFocus={() => nav.onFocus(day.key)}
                  aria-label={
                    onCreateAtDate
                      ? `${dayCellLabel(day.key, day.events.length)}. Press Enter to create.`
                      : dayCellLabel(day.key, day.events.length)
                  }
                  className={cn(
                    'relative flex flex-col gap-1 border-e border-b border-border p-1.5 outline-none',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    cellHeight,
                    day.inPeriod ? 'bg-card' : 'bg-muted/40',
                  )}
                >
                  {/* Create-on-empty-cell (SPEC row 33) sits UNDER the chips as
                      a full-bleed button, so a chip or the `N More` link can
                      never fall through to it (UX C.21) without either side
                      needing to know about the other. */}
                  {onCreateAtDate ? (
                    // POINTER affordance only: `tabIndex={-1}` so it never
                    // becomes a second tab stop competing with the gridcell
                    // that now owns the keyboard path (a grid cell with two
                    // tab stops is worse than one with none).
                    <button
                      type="button"
                      tabIndex={-1}
                      data-slot="calendar-day-create"
                      aria-label={`Create on ${dayLabel(day.key)}`}
                      onClick={() => onCreateAtDate(day.key)}
                      className="absolute inset-0 z-0 outline-none"
                    />
                  ) : null}
                  <span
                    className={cn(
                      'pointer-events-none relative z-10 mx-auto flex size-6 items-center justify-center rounded-full text-body-xs',
                      day.isToday && 'bg-primary font-semibold text-primary-foreground',
                      !day.isToday && (day.inPeriod ? 'text-foreground' : 'text-muted-foreground/60'),
                    )}
                    data-today={day.isToday ? 'true' : undefined}
                  >
                    {`${day.dayOfMonth}`.padStart(2, '0')}
                  </span>
                  <div className="relative z-10 flex min-w-0 flex-col gap-1">
                    {shown.map((event) => (
                      <CalendarEventChip key={event.id} event={event} onOpen={onOpenRecord} />
                    ))}
                    {hidden > 0 ? (
                      <DayOverflowPopover
                        dayKey={day.key}
                        dayOfMonth={day.dayOfMonth}
                        events={day.events}
                        hiddenCount={hidden}
                        onOpen={onOpenRecord}
                      />
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

CalendarMonthGrid.displayName = 'CalendarMonthGrid'
