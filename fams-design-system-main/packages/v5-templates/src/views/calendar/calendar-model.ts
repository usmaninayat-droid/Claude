import type { EntityConfig, EntityRecord, StatusDef } from '@fams/v5-composer'

/**
 * Pure, React-free calendar helpers — shared by `CalendarView` and its grids,
 * chips, legend and tests, so the date math, the chip-cap derivation and the
 * status/date-field resolution have ONE implementation and can be unit-tested
 * without rendering anything (same split as `kanban/kanban-model.ts`).
 *
 * Everything here is module-AGNOSTIC: which column supplies the date, which
 * supplies the title and which supplies the status colour all come from the
 * module `config`, never from a hardcoded column name or domain word.
 */

/** Which grid shape the calendar is in. */
export type CalendarMode = 'monthly' | 'weekly'

/** A `View By` option — one date-typed column the grid can lay records out by. */
export interface CalendarDateField {
  /** Storage slot key (`systemcol7`, `createdAt`, …). */
  col: string
  /** Human label from the field's own `name` (never invented here). */
  label: string
}

/** One record placed on a day, with its resolved status facet. */
export interface CalendarEvent {
  id: string
  /** `YYYY-MM-DD` in local time. */
  day: string
  title: string
  /** Raw stored status value, or `''` when the record has none. */
  statusKey: string
  /** Status label for the chip's accessible name (falls back to the key). */
  statusLabel: string
  /**
   * Raw runtime colour from `statusList[].color` — DATA, like `ReadColor` and
   * `KanbanColumnView`'s `accentColor`, so it is applied as an inline style,
   * never as a hardcoded design value (root rule 2). `undefined` when the
   * config binds no colour; consumers then fall back to a border token.
   */
  color?: string
  record: EntityRecord
}

/** A single day cell of a rendered period. */
export interface CalendarDay {
  /** `YYYY-MM-DD` in local time. */
  key: string
  /** Day-of-month, 1-based. */
  dayOfMonth: number
  /** `false` for the leading/trailing days of a neighbouring month (monthly only). */
  inPeriod: boolean
  isToday: boolean
  events: CalendarEvent[]
}

/* ── Day keys (timezone-safe) ───────────────────────────────────────────────── */

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})/

/** Local-time `YYYY-MM-DD` for a `Date`. */
export function dayKeyOf(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

/** Parse a `YYYY-MM-DD` key back to a local-midnight `Date`. */
export function dateFromKey(key: string): Date {
  const m = ISO_DAY.exec(key)
  if (!m) return new Date(NaN)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/**
 * A stored field value → its local day key, or `null` when it holds no usable
 * date. An ISO-ish string is sliced rather than `Date`-parsed on purpose: `new
 * Date('2026-01-08')` is parsed as UTC midnight, which lands on Jan 7 for every
 * negative-offset timezone — i.e. the record would render in the wrong cell for
 * half the world.
 */
export function dayKeyFromValue(value: unknown): string | null {
  if (value == null || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : dayKeyOf(value)
  if (typeof value === 'string') {
    const iso = ISO_DAY.exec(value)
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  }
  const parsed = new Date(value as string | number)
  return Number.isNaN(parsed.getTime()) ? null : dayKeyOf(parsed)
}

/* ── Config-driven resolution ───────────────────────────────────────────────── */

/**
 * The `View By` options for a module: every `Date`/`DateTime` systemcolumn in
 * blueprint order, plus the two built-in `EntityRecord` audit stamps when any
 * record actually carries them. Config-driven and module-agnostic — a module
 * with no date field at all yields `[]` and the view says so rather than
 * inventing a column.
 */
export function dateFieldsFromConfig(
  config: EntityConfig,
  records: readonly EntityRecord[] = [],
): CalendarDateField[] {
  const fields: CalendarDateField[] = config.systemcolumns
    .filter((c) => c.type === 'Date' || c.type === 'DateTime')
    .map((c) => ({ col: c.col, label: c.name }))
  const seen = new Set(fields.map((f) => f.col))
  for (const [col, label] of [
    ['createdAt', 'Created Date'],
    ['updatedAt', 'Updated Date'],
  ] as const) {
    if (seen.has(col)) continue
    if (records.some((r) => r[col] != null && r[col] !== '')) fields.push({ col, label })
  }
  return fields
}

/** `statusList` as a key → def lookup (an unconfigured status resolves to `undefined`). */
export function statusIndex(config: EntityConfig): Map<string, StatusDef> {
  return new Map(config.uiConfig.statusList.map((s) => [s.key, s]))
}

/**
 * Records → events on the active date field. Records whose date value is
 * unusable are dropped from the grid (they are not "on" any day) — the view's
 * count row is what tells the user how many are shown.
 */
export function toCalendarEvents(
  config: EntityConfig,
  records: readonly EntityRecord[],
  dateCol: string,
): CalendarEvent[] {
  const statuses = statusIndex(config)
  const events: CalendarEvent[] = []
  for (const record of records) {
    const day = dayKeyFromValue(record[dateCol])
    if (!day) continue
    const statusKey = typeof record.status === 'string' ? record.status : ''
    const def = statuses.get(statusKey)
    events.push({
      id: record.id,
      day,
      title: typeof record.title === 'string' && record.title ? record.title : record.id,
      statusKey,
      statusLabel: def?.label ?? statusKey,
      color: def?.color,
      record,
    })
  }
  // Deterministic order within a day (UX D.26): by day, then id.
  return events.sort((a, b) => (a.day === b.day ? a.id.localeCompare(b.id) : a.day.localeCompare(b.day)))
}

/**
 * Per-status TOTALS for the legend — Dev Note 32273: the parenthesised count is
 * the total per status and must NOT change when another status is unchecked, so
 * this is deliberately computed from the events BEFORE legend filtering (search
 * / filters / the visible period do change the population, and therefore these).
 */
export function statusTotals(events: readonly CalendarEvent[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const event of events) totals.set(event.statusKey, (totals.get(event.statusKey) ?? 0) + 1)
  return totals
}

/** Keep only events whose status is currently checked in the legend. */
export function filterByStatus(
  events: readonly CalendarEvent[],
  visible: readonly string[] | null,
): CalendarEvent[] {
  if (visible == null) return [...events]
  const allowed = new Set(visible)
  return events.filter((e) => allowed.has(e.statusKey))
}

/* ── Period grids ───────────────────────────────────────────────────────────── */

/** First day of the week containing `date`, per `weekStartsOn` (0 = Sun, 1 = Mon). */
export function startOfWeek(date: Date, weekStartsOn = 1): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const delta = (start.getDay() - weekStartsOn + 7) % 7
  start.setDate(start.getDate() - delta)
  return start
}

/** Step a period boundary by whole months (monthly) or whole weeks (weekly). */
export function stepPeriod(anchor: Date, mode: CalendarMode, delta: number): Date {
  if (mode === 'weekly') {
    const next = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())
    next.setDate(next.getDate() + delta * 7)
    return next
  }
  // Day 1 keeps the step month-exact: stepping from Jan 31 must land on Feb,
  // never skip it, and stepping past December must roll the year.
  return new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1)
}

/**
 * The 6×7 month grid (always six rows, so the grid never changes height between
 * months — UX J.59 renders the FULL grid even for an empty month).
 */
export function monthGrid(
  anchor: Date,
  events: readonly CalendarEvent[],
  today: Date,
  weekStartsOn = 1,
): CalendarDay[][] {
  const byDay = groupByDay(events)
  const todayKey = dayKeyOf(today)
  const month = anchor.getMonth()
  const cursor = startOfWeek(new Date(anchor.getFullYear(), month, 1), weekStartsOn)
  const weeks: CalendarDay[][] = []
  for (let w = 0; w < 6; w += 1) {
    const week: CalendarDay[] = []
    for (let d = 0; d < 7; d += 1) {
      const key = dayKeyOf(cursor)
      week.push({
        key,
        dayOfMonth: cursor.getDate(),
        inPeriod: cursor.getMonth() === month,
        isToday: key === todayKey,
        events: byDay.get(key) ?? [],
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

/** The seven day columns of the week containing `anchor`. */
export function weekGrid(
  anchor: Date,
  events: readonly CalendarEvent[],
  today: Date,
  weekStartsOn = 1,
): CalendarDay[] {
  const byDay = groupByDay(events)
  const todayKey = dayKeyOf(today)
  const cursor = startOfWeek(anchor, weekStartsOn)
  const days: CalendarDay[] = []
  for (let d = 0; d < 7; d += 1) {
    const key = dayKeyOf(cursor)
    days.push({
      key,
      dayOfMonth: cursor.getDate(),
      inPeriod: true,
      isToday: key === todayKey,
      events: byDay.get(key) ?? [],
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

function groupByDay(events: readonly CalendarEvent[]): Map<string, CalendarEvent[]> {
  const byDay = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const bucket = byDay.get(event.day)
    if (bucket) bucket.push(event)
    else byDay.set(event.day, [event])
  }
  return byDay
}

/** Events that fall inside the currently rendered period (the count row's population). */
export function eventsInPeriod(
  events: readonly CalendarEvent[],
  anchor: Date,
  mode: CalendarMode,
  weekStartsOn = 1,
): CalendarEvent[] {
  if (mode === 'weekly') {
    const start = startOfWeek(anchor, weekStartsOn)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const from = dayKeyOf(start)
    const to = dayKeyOf(end)
    return events.filter((e) => e.day >= from && e.day <= to)
  }
  const prefix = dayKeyOf(new Date(anchor.getFullYear(), anchor.getMonth(), 1)).slice(0, 7)
  return events.filter((e) => e.day.slice(0, 7) === prefix)
}
