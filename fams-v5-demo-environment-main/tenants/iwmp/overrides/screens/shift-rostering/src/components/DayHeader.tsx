import { Badge } from '@fams/ui-kit'
import { weekdayOf } from '../data/generate'
import { fmtDay } from '../lib/format'

export interface DayHeaderProps {
  day: string
  isToday: boolean
  isPast: boolean
  /** Visible employees holding a planned duty (RT / RL / OC / EX) on this day. */
  planned: number
  /** Visible employees with no duty at all on this day. */
  pending: number
  total: number
}

/** Sticky day column header with the day's coverage — the numbers a planner scans a week by. */
export function DayHeader({ day, isToday, isPast, planned, pending, total }: DayHeaderProps) {
  return (
    <div
      role="columnheader"
      aria-current={isToday ? 'date' : undefined}
      className={['flex flex-col justify-center gap-0.5 border-e border-border px-2 py-1.5', isToday ? 'bg-primary/5' : '', isPast ? 'text-muted-foreground' : ''].join(' ')}
    >
      <span className="flex items-center gap-1.5 text-caption font-bold uppercase tracking-wide text-muted-foreground">
        {weekdayOf(day)}
        <span className={isPast ? '' : 'text-foreground'}>{fmtDay(day)}</span>
        {isToday && (
          <Badge variant="info" size="xs">
            Today
          </Badge>
        )}
      </span>
      <span className="text-caption tabular-nums text-muted-foreground" aria-label={`${planned} of ${total} planned, ${pending} pending`}>
        {planned}/{total} planned
        {pending > 0 && <span className={isPast ? '' : 'text-warning-scale-700'}> · {pending} pending</span>}
      </span>
    </div>
  )
}
