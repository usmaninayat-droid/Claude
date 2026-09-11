import { describe, expect, it } from 'vitest'
import {
  dateFieldsFromConfig,
  dayKeyFromValue,
  dayKeyOf,
  eventsInPeriod,
  filterByStatus,
  monthGrid,
  startOfWeek,
  statusTotals,
  stepPeriod,
  toCalendarEvents,
  weekGrid,
} from './calendar-model'
import {
  CELL_HEIGHT,
  RANGE_DASH,
  dayCellLabel,
  densityForWidth,
  periodLabel,
  periodLabelShort,
  resolveChipCap,
  weekdayColumnLabel,
  weekdayNames,
} from './calendar-format'
import { altCalendarConfig, calendarConfig, calendarRecords, CALENDAR_TODAY } from './fixtures'

describe('calendar-model — config-driven resolution', () => {
  it('derives the View By options from the config, in blueprint order', () => {
    expect(dateFieldsFromConfig(calendarConfig, calendarRecords)).toEqual([
      { col: 'systemcol1', label: 'Created Date' },
      { col: 'systemcol2', label: 'Due Date' },
      { col: 'systemcol3', label: 'Updated Date' },
    ])
    // A different module yields ITS date fields — nothing is hardcoded.
    expect(dateFieldsFromConfig(altCalendarConfig)).toEqual([
      { col: 'systemcol9', label: 'Scheduled For' },
    ])
  })

  it('adds the built-in createdAt/updatedAt stamps only when records carry them', () => {
    expect(dateFieldsFromConfig(altCalendarConfig, [{ id: 'x' }])).toHaveLength(1)
    const withStamp = dateFieldsFromConfig(altCalendarConfig, [{ id: 'x', createdAt: '2026-01-01' }])
    expect(withStamp.map((f) => f.col)).toEqual(['systemcol9', 'createdAt'])
  })

  it('places records on the ACTIVE date column and carries the status facet', () => {
    const created = toCalendarEvents(calendarConfig, calendarRecords, 'systemcol1')
    const due = toCalendarEvents(calendarConfig, calendarRecords, 'systemcol2')
    expect(created.filter((e) => e.day === '2026-01-08')).toHaveLength(8)
    // Every Due Date is a day later, so switching the field re-lays the grid.
    expect(due.filter((e) => e.day === '2026-01-08')).toHaveLength(0)
    expect(due.filter((e) => e.day === '2026-01-09')).toHaveLength(8)
    // Sorted by day then id (UX D.26's deterministic order).
    expect(created[0].id).toBe('W-14')
    const escalated = created.find((e) => e.id === 'W-01')
    expect(escalated?.statusLabel).toBe('Escalated')
    expect(escalated?.color).toBe('var(--color-destructive)')
  })

  it('drops records with no usable date rather than guessing a day', () => {
    const events = toCalendarEvents(calendarConfig, [{ id: 'x', title: 'No date' }], 'systemcol1')
    expect(events).toEqual([])
  })

  it('reads a bare YYYY-MM-DD as a LOCAL day (never a UTC-shifted one)', () => {
    expect(dayKeyFromValue('2026-01-08')).toBe('2026-01-08')
    expect(dayKeyFromValue('2026-01-08T23:45:00')).toBe('2026-01-08')
    expect(dayKeyFromValue(new Date(2026, 0, 8))).toBe('2026-01-08')
    expect(dayKeyFromValue('')).toBeNull()
    expect(dayKeyFromValue(null)).toBeNull()
    expect(dayKeyFromValue('not a date')).toBeNull()
  })
})

describe('calendar-model — legend semantics', () => {
  const events = toCalendarEvents(calendarConfig, calendarRecords, 'systemcol1')
  const january = eventsInPeriod(events, new Date(2026, 0, 15), 'monthly')

  it('counts per status as TOTALS of the period population (Dev Note 32273)', () => {
    const totals = statusTotals(january)
    expect(totals.get('escalated')).toBe(3)
    expect(totals.get('completed')).toBe(3)
    // Unchecking a sibling filters the grid but NOT the totals: the totals are
    // computed before any legend filtering, which is what this proves.
    const filteredEvents = filterByStatus(january, ['escalated'])
    expect(filteredEvents).toHaveLength(3)
    expect(statusTotals(january).get('completed')).toBe(3)
  })

  it('allows unchecking everything (no invented floor — UX E.28)', () => {
    expect(filterByStatus(january, [])).toEqual([])
    expect(filterByStatus(january, null)).toHaveLength(january.length)
  })
})

describe('calendar-model — period grids and stepping', () => {
  it('builds a 6×7 month grid marking out-of-month days and today', () => {
    const events = toCalendarEvents(calendarConfig, calendarRecords, 'systemcol1')
    const weeks = monthGrid(new Date(2026, 0, 1), events, CALENDAR_TODAY)
    expect(weeks).toHaveLength(6)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    const flat = weeks.flat()
    // January 2026 starts on a Thursday, so the grid opens with 3 December days.
    expect(flat.slice(0, 3).every((d) => !d.inPeriod)).toBe(true)
    expect(flat.filter((d) => d.isToday).map((d) => d.key)).toEqual(['2026-01-08'])
    expect(flat.find((d) => d.key === '2026-01-08')?.events).toHaveLength(8)
  })

  it('builds a MON→SUN week and honours weekStartsOn', () => {
    const days = weekGrid(new Date(2026, 0, 8), [], CALENDAR_TODAY)
    expect(days.map((d) => d.key)[0]).toBe('2026-01-05')
    expect(days).toHaveLength(7)
    expect(dayKeyOf(startOfWeek(new Date(2026, 0, 8), 0))).toBe('2026-01-04')
  })

  it('steps a whole month, including across a year boundary', () => {
    expect(dayKeyOf(stepPeriod(new Date(2026, 0, 31), 'monthly', 1))).toBe('2026-02-01')
    expect(dayKeyOf(stepPeriod(new Date(2026, 0, 15), 'monthly', -1))).toBe('2025-12-01')
    expect(dayKeyOf(stepPeriod(new Date(2026, 11, 5), 'monthly', 1))).toBe('2027-01-01')
  })

  it('steps a whole week, including across a year boundary', () => {
    expect(dayKeyOf(stepPeriod(new Date(2026, 0, 8), 'weekly', 1))).toBe('2026-01-15')
    expect(dayKeyOf(stepPeriod(new Date(2026, 0, 2), 'weekly', -1))).toBe('2025-12-26')
  })

  it('scopes the period population to the visible month or week', () => {
    const events = toCalendarEvents(calendarConfig, calendarRecords, 'systemcol1')
    expect(eventsInPeriod(events, new Date(2026, 0, 15), 'monthly')).toHaveLength(12)
    expect(eventsInPeriod(events, new Date(2026, 1, 15), 'monthly')).toHaveLength(1)
    expect(eventsInPeriod(events, new Date(2025, 11, 15), 'monthly')).toHaveLength(1)
    expect(eventsInPeriod(events, new Date(2026, 0, 8), 'weekly')).toHaveLength(8)
  })
})

describe('calendar-format — density, cap and labels', () => {
  it('derives the chip cap from the cell height, resolving to 3 at 1440 and 2 at 1280', () => {
    expect(densityForWidth(1440)).toBe('comfortable')
    expect(densityForWidth(1280)).toBe('compact')
    expect(resolveChipCap(CELL_HEIGHT.comfortable)).toBe(3)
    expect(resolveChipCap(CELL_HEIGHT.compact)).toBe(2)
    // Floors hold at both extremes rather than shrinking a chip (UX C.17).
    expect(resolveChipCap(40)).toBe(2)
    expect(resolveChipCap(1000)).toBe(4)
  })

  it('formats the monthly and weekly period labels', () => {
    expect(periodLabel(new Date(2026, 0, 15), 'monthly')).toBe('Jan, 2026')
    expect(periodLabel(new Date(2026, 0, 8), 'weekly')).toBe(
      `5 Jan, 2026 ${RANGE_DASH} 11 Jan, 2026`,
    )
  })

  it('has a short weekly form that never drops the year', () => {
    expect(periodLabelShort(new Date(2026, 0, 8), 'weekly')).toBe(`5${RANGE_DASH}11 Jan 2026`)
    const crossMonth = periodLabelShort(new Date(2025, 11, 31), 'weekly')
    expect(crossMonth).toBe(`29 Dec ${RANGE_DASH} 4 Jan 2026`)
    expect(crossMonth).toContain('2026')
  })

  it('names weekdays, columns and day cells for screen readers', () => {
    expect(weekdayNames()[0]).toBe('MON')
    expect(weekdayNames(0)[0]).toBe('SUN')
    expect(weekdayColumnLabel('2026-01-08')).toBe('THU 8')
    expect(dayCellLabel('2026-01-08', 8)).toBe('Thursday 8 January 2026, 8 records')
    expect(dayCellLabel('2026-01-09', 1)).toBe('Friday 9 January 2026, 1 record')
    expect(dayCellLabel('2026-01-10', 0)).toBe('Saturday 10 January 2026, no records')
  })
})
