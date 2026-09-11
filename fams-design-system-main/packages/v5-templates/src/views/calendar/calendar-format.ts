import { dateFromKey, startOfWeek, type CalendarMode } from './calendar-model'

/**
 * Calendar label + density arithmetic. Pure and React-free so the period-label
 * formats (SPEC §1.4/§1.5), the responsive chip cap (UX C.16) and the
 * accessible day names are unit-testable without a DOM.
 *
 * `Intl.DateTimeFormat` does the month/weekday words — no date library is added
 * (no new dependencies) and the strings localise for free.
 */

/* ── Chip cap (UX C.16) ─────────────────────────────────────────────────────── */

/**
 * Cell budget the chips share: the day-number row (24px) plus the `N More`
 * row (20px). Subtracted from the cell height before the chips are counted.
 */
export const CELL_CHROME_HEIGHT = 44
/** One chip's pitch: a 24px minimum chip box plus its 4px gap (UX C.17/K.66). */
export const CHIP_PITCH = 28
/** Hard floors on the derived cap, so a squeezed grid still shows something. */
export const CHIP_CAP_MIN = 2
export const CHIP_CAP_MAX = 4

/**
 * Day-cell heights the month grid uses, in px, keyed by density. These are the
 * 1920-space Figma proportion (~163px) re-based on the real product widths per
 * UX B.6 — NOT literal Figma values — and they are what makes the cap resolve
 * to the UX note's required 3 at 1440 and 2 at 1280. Rendered through the
 * spacing-scale utilities `min-h-33` / `min-h-28`, never an inline px value.
 */
export const CELL_HEIGHT: Record<CalendarDensity, number> = {
  comfortable: 132,
  compact: 112,
}

export type CalendarDensity = 'comfortable' | 'compact'

/**
 * Viewport width at which the month grid drops to the compact cell (and so to a
 * 2-chip cap): 1440 is comfortable, 1280 is compact (UX C.16, conflict note).
 */
export const COMPACT_MAX_WIDTH = 1360

/** Below this width the legend collapses into a `Status` popover (UX I.54.4). */
export const LEGEND_POPOVER_MAX_WIDTH = 1200
/** At or below this width the legend's per-status counts move into the accessible name (UX I.54.2). */
export const LEGEND_COUNTS_MAX_WIDTH = 1360
/** At or below this width the weekly period label uses its short form (UX I.54.5). */
export const SHORT_LABEL_MAX_WIDTH = 1300

export function densityForWidth(width: number): CalendarDensity {
  return width <= COMPACT_MAX_WIDTH ? 'compact' : 'comfortable'
}

/**
 * Chips a month cell shows before it collapses the rest behind `N More`.
 * DERIVED from the cell height, never a constant 3 (UX C.16): a chip may not
 * shrink below its 24px box to buy an extra row, so the cap drops instead.
 */
export function resolveChipCap(cellHeight: number): number {
  const fits = Math.floor((cellHeight - CELL_CHROME_HEIGHT) / CHIP_PITCH)
  return Math.min(CHIP_CAP_MAX, Math.max(CHIP_CAP_MIN, fits))
}

/* ── Labels ─────────────────────────────────────────────────────────────────── */

const monthShort = new Intl.DateTimeFormat(undefined, { month: 'short' })
const monthLong = new Intl.DateTimeFormat(undefined, { month: 'long' })
const weekdayShort = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const weekdayLong = new Intl.DateTimeFormat(undefined, { weekday: 'long' })

/** En dash — the designer's own separator for the weekly range (Dev Note 32275). */
export const RANGE_DASH = '–'

/** `MON` … `SUN` for the weekday header row, starting at `weekStartsOn`. */
export function weekdayNames(weekStartsOn = 1): string[] {
  // 2024-01-01 was a Monday, so it is a safe reference week for the labels.
  const base = new Date(2024, 0, 1)
  const names: string[] = []
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(base)
    day.setDate(base.getDate() + ((weekStartsOn + 6) % 7) + i)
    names.push(weekdayShort.format(day).toUpperCase())
  }
  return names
}

/** `Jan, 2026` (monthly) or `7 Jan, 2026 – 13 Jan, 2026` (weekly). */
export function periodLabel(anchor: Date, mode: CalendarMode, weekStartsOn = 1): string {
  if (mode === 'monthly') return `${monthShort.format(anchor)}, ${anchor.getFullYear()}`
  const start = startOfWeek(anchor, weekStartsOn)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return `${dayMonthYear(start)} ${RANGE_DASH} ${dayMonthYear(end)}`
}

/**
 * The short weekly form the label switches to before it would ellipsise (UX
 * I.54.5) — `7–13 Jan 2026`, or `28 Dec – 3 Jan 2026` across a month boundary.
 * The year is never dropped.
 */
export function periodLabelShort(anchor: Date, mode: CalendarMode, weekStartsOn = 1): string {
  if (mode === 'monthly') return periodLabel(anchor, mode, weekStartsOn)
  const start = startOfWeek(anchor, weekStartsOn)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  if (sameMonth) {
    return `${start.getDate()}${RANGE_DASH}${end.getDate()} ${monthShort.format(end)} ${end.getFullYear()}`
  }
  const from = `${start.getDate()} ${monthShort.format(start)}`
  return `${from} ${RANGE_DASH} ${end.getDate()} ${monthShort.format(end)} ${end.getFullYear()}`
}

function dayMonthYear(date: Date): string {
  return `${date.getDate()} ${monthShort.format(date)}, ${date.getFullYear()}`
}

/** `Friday 18 January 2026` — the spoken form for day cells and the popover. */
export function dayLabel(dayKey: string): string {
  const date = dateFromKey(dayKey)
  return `${weekdayLong.format(date)} ${date.getDate()} ${monthLong.format(date)} ${date.getFullYear()}`
}

/** `MON 7` — the weekly header's own per-column label. */
export function weekdayColumnLabel(dayKey: string): string {
  const date = dateFromKey(dayKey)
  return `${weekdayShort.format(date).toUpperCase()} ${date.getDate()}`
}

/** `FRI` — the day-overflow popover's weekday overline. */
export function weekdayAbbrev(dayKey: string): string {
  return weekdayShort.format(dateFromKey(dayKey)).toUpperCase()
}

/** Accessible name for a day cell: the date plus how many records sit on it. */
export function dayCellLabel(dayKey: string, count: number): string {
  const date = dayLabel(dayKey)
  if (count === 0) return `${date}, no records`
  return `${date}, ${count} ${count === 1 ? 'record' : 'records'}`
}
