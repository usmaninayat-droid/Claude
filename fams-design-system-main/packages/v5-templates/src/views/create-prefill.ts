import type { EntityConfig } from '@fams/v5-composer'

/**
 * dayPrefill — a calendar day → a create-form prefill for one date column.
 *
 * SPEC row 33 ("clicking an empty area of a day starts a create pre-filled with
 * that date") needs two things the day key alone cannot give:
 *
 *  1. **The column has to be writable.** The calendar's `View By` menu also
 *     offers the `createdAt`/`updatedAt` STAMPS, which are not `systemcolumns`
 *     and have no input in the create form. Prefilling one would be silently
 *     discarded, and guessing a DIFFERENT date field would drop the date
 *     somewhere the user never pointed at — so this returns `undefined` and the
 *     sheet opens blank instead of lying about what it captured.
 *  2. **The value has to match the control.** A `DateTime` column renders an
 *     `<input type="datetime-local">`, which REJECTS a bare `YYYY-MM-DD` — the
 *     field silently stays empty. Midnight is appended for those; a plain
 *     `Date` column takes the day key as-is.
 *
 * Pure and config-driven, so no lens has to know either rule.
 */
export function dayPrefill(
  config: EntityConfig,
  dateCol: string,
  dayKey: string,
): Record<string, unknown> | undefined {
  const column = config.systemcolumns.find((c) => c.col === dateCol)
  if (!column) return undefined
  return { [dateCol]: column.type === 'DateTime' ? `${dayKey}T00:00` : dayKey }
}
