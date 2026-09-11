import { ChevronLeft, ChevronRight } from '../icons'
import {
  DayPicker,
  getDefaultClassNames,
  type DayPickerProps,
} from 'react-day-picker'
import { cn } from '../lib/cn'

export type CalendarProps = DayPickerProps

/**
 * Calendar — the date-picking grid (`react-day-picker`, themed). Composed
 * into a full date input via `Popover` + `Input` in feature code; this
 * component only owns the grid itself, per Rule 8 (no fetch/store/route —
 * `selected`/`onSelect` are fully controlled by the caller).
 */
export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        root: cn(defaultClassNames.root, 'text-foreground'),
        months: cn(defaultClassNames.months, 'flex flex-col gap-field sm:flex-row'),
        month: cn(defaultClassNames.month, 'flex flex-col gap-field'),
        nav: cn(defaultClassNames.nav, 'flex items-center justify-between'),
        button_previous: cn(
          defaultClassNames.button_previous,
          'grid size-8 place-items-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        ),
        button_next: cn(
          defaultClassNames.button_next,
          'grid size-8 place-items-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        ),
        month_caption: cn(defaultClassNames.month_caption, 'flex h-8 items-center justify-center'),
        caption_label: cn(defaultClassNames.caption_label, 'text-sm font-semibold text-foreground'),
        weekdays: cn(defaultClassNames.weekdays, 'flex'),
        weekday: cn(defaultClassNames.weekday, 'w-9 text-xs font-medium text-muted-foreground'),
        week: cn(defaultClassNames.week, 'mt-2 flex w-full'),
        day: cn(defaultClassNames.day, 'relative size-9 p-0 text-center text-sm'),
        day_button: cn(
          defaultClassNames.day_button,
          'grid size-9 place-items-center rounded-sm text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
        ),
        today: cn(defaultClassNames.today, '[&>button]:border [&>button]:border-primary'),
        selected: cn(
          defaultClassNames.selected,
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary/90',
        ),
        outside: cn(defaultClassNames.outside, 'text-muted-foreground opacity-50'),
        disabled: cn(defaultClassNames.disabled, 'text-muted-foreground opacity-30'),
        range_start: cn(defaultClassNames.range_start, '[&>button]:rounded-e-none'),
        range_middle: cn(
          defaultClassNames.range_middle,
          'bg-muted [&>button]:bg-transparent [&>button]:text-foreground',
        ),
        range_end: cn(defaultClassNames.range_end, '[&>button]:rounded-s-none'),
        hidden: cn(defaultClassNames.hidden, 'invisible'),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) =>
          orientation === 'left' ? (
            <ChevronLeft className={cn('size-4 rtl:-scale-x-100', chevronClassName)} {...chevronProps} />
          ) : (
            <ChevronRight className={cn('size-4 rtl:-scale-x-100', chevronClassName)} {...chevronProps} />
          ),
      }}
      {...props}
    />
  )
}
