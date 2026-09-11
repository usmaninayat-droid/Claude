import { useEffect, useState } from 'react'

export interface WallClockOptions {
  /** IANA zone the wall is physically in, e.g. `'Asia/Qatar'`. Defaults to the
   *  viewer's own zone — wall displays are usually in a named operations room,
   *  so callers normally pass one explicitly. */
  timeZone?: string
  /** BCP-47 locale for the formatted string. Defaults to `'en-GB'` (24-hour,
   *  day-before-month), the format these operations screens are read in. */
  locale?: string
}

/**
 * A once-per-second wall clock, pre-formatted for a wall display:
 * `"Tue, 02 Sep, 14:07:33"`.
 *
 * The interval is the whole point — an operations screen that shows a frozen
 * timestamp is worse than one showing none, because it reads as live.
 */
export function useWallClock({ timeZone, locale = 'en-GB' }: WallClockOptions = {}): string {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now)
}
