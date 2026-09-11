import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { CalendarEventChip } from './CalendarEventChip'
import type { CalendarDay, CalendarEvent } from './calendar-model'
import { dayCellLabel, dayLabel, weekdayColumnLabel } from './calendar-format'
import { useGridNavigation } from './use-grid-navigation'

export interface CalendarWeekGridProps {
  days: CalendarDay[]
  onOpenRecord?: (event: CalendarEvent) => void
  onCreateAtDate?: (dayKey: string) => void
  /** PageUp/PageDown from inside the grid — steps the caller's period. */
  onStepPeriod?: (delta: -1 | 1) => void
  /**
   * Rendered INSTEAD of the seven columns when the whole week is empty (UX
   * J.60: one message for an empty week, and none at all for an empty column).
   */
  emptyState?: ReactNode
}

/**
 * CalendarWeekGrid — the seven full-height day columns (SPEC §1.5, Dev Note
 * 32276). [tier-2 internal]
 *
 * Scroll architecture (UX D.22, which overrides SPEC §2 row 34's "columns
 * scroll internally"): there is exactly ONE scroller — the grid body spanning
 * all seven columns — with the weekday header row sticky at its top. Seven
 * per-column scrollers would give seven scrollbars at 1280, break row
 * alignment and make a wheel gesture ambiguous; the effect the designer asked
 * for (overflow does not grow the page) is preserved either way. The columns'
 * BACKGROUNDS fill the scroller height while their CONTENT does not, so a
 * 25-chip Tuesday never leaves the other six columns with a dead tail (UX D.24).
 *
 * Weekly has no chip cap and therefore no `N More` (SPEC §1.5). Today is marked
 * with a small brand dot under the column label, per that frame — the monthly
 * frame's filled circle is a different render of the same rule (Dev Note 32277's
 * "must be marked").
 */
export function CalendarWeekGrid({
  days,
  onOpenRecord,
  onCreateAtDate,
  onStepPeriod,
  emptyState,
}: CalendarWeekGridProps) {
  const empty = days.every((day) => day.events.length === 0)
  // Same keyboard model as the month grid, one row wide (see
  // `use-grid-navigation.ts`).
  const nav = useGridNavigation({
    keys: days.map((day) => day.key),
    columns: 7,
    onActivate: onCreateAtDate,
    onStepPeriod,
  })
  return (
    <div
      data-slot="calendar-week-body"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain"
    >
      <div
        role="grid"
        aria-label="Week grid"
        data-slot="calendar-week-grid"
        className="grid min-h-full grid-cols-7 grid-rows-[auto_1fr] border-s border-t border-border"
      >
        <div role="row" className="col-span-7 grid grid-cols-7 sticky top-0 z-10 bg-muted">
          {days.map((day) => (
            <div
              key={day.key}
              role="columnheader"
              className="flex h-12 flex-col items-center justify-center border-e border-b border-border"
            >
              <span className="text-body-xs font-medium text-muted-foreground">
                {weekdayColumnLabel(day.key)}
              </span>
              {day.isToday ? (
                <span
                  data-today="true"
                  aria-hidden="true"
                  className="mt-0.5 size-1.5 rounded-full bg-primary"
                />
              ) : null}
            </div>
          ))}
        </div>
        {empty && emptyState ? (
          <div role="row" className="col-span-7">
            <div role="gridcell" className="border-e border-b border-border">
              {emptyState}
            </div>
          </div>
        ) : (
          <div role="row" className="col-span-7 grid grid-cols-7">
            {days.map((day) => (
              <div
                role="gridcell"
                key={day.key}
                data-slot="calendar-week-column"
                data-grid-cell-key={day.key}
                tabIndex={nav.tabIndexFor(day.key)}
                onKeyDown={(event) => nav.onKeyDown(event, day.key)}
                onFocus={() => nav.onFocus(day.key)}
                aria-label={
                  onCreateAtDate
                    ? `${dayCellLabel(day.key, day.events.length)}. Press Enter to create.`
                    : dayCellLabel(day.key, day.events.length)
                }
                // `overflow-y: visible` is load-bearing, not incidental: the
                // gate asserts no column owns a scroller of its own (UX D.22).
                className={cn(
                  'relative flex min-w-0 flex-col gap-2 overflow-y-visible border-e border-b border-border bg-card p-2',
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                )}
              >
                {onCreateAtDate ? (
                  // Pointer affordance only — the column itself owns the
                  // keyboard path (see the month grid's note).
                  <button
                    type="button"
                    tabIndex={-1}
                    data-slot="calendar-day-create"
                    aria-label={`Create on ${dayLabel(day.key)}`}
                    onClick={() => onCreateAtDate(day.key)}
                    className="absolute inset-0 z-0 outline-none"
                  />
                ) : null}
                <div className="relative z-10 flex min-w-0 flex-col gap-2">
                  {day.events.map((event) => (
                    <CalendarEventChip key={event.id} event={event} density="week" onOpen={onOpenRecord} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

CalendarWeekGrid.displayName = 'CalendarWeekGrid'
