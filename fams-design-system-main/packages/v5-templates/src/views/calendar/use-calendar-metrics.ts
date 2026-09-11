import { useEffect, useMemo, useState } from 'react'
import {
  CELL_HEIGHT,
  LEGEND_COUNTS_MAX_WIDTH,
  LEGEND_POPOVER_MAX_WIDTH,
  SHORT_LABEL_MAX_WIDTH,
  densityForWidth,
  resolveChipCap,
  type CalendarDensity,
} from './calendar-format'

/** Assumed width before the first measurement (SSR + the 1440 design target). */
export const DEFAULT_VIEWPORT_WIDTH = 1440

export interface CalendarMetrics {
  width: number
  density: CalendarDensity
  /** Chips a month cell shows before `N More` — derived, never a constant. */
  chipCap: number
  /** Drop the legend's `(14)` counts into the accessible name (UX I.54.2). */
  hideLegendCounts: boolean
  /** Collapse the legend into a `Status · N` popover (UX I.54.4). */
  collapseLegend: boolean
  /** Use the weekly label's short form before it would ellipsise (UX I.54.5). */
  shortPeriodLabel: boolean
}

/**
 * Viewport-derived calendar density + toolbar collapse flags.
 *
 * Every number here comes from `calendar-format`'s named breakpoints, which are
 * the UX notes' own — the Figma frame is a 1920-wide render and its px values
 * are proportions, not literals (UX B.6), so nothing in this hook reads a Figma
 * measurement directly. The chip cap in particular is DERIVED from the resolved
 * cell height (UX C.16) and lands on the note's required 3 at 1440 / 2 at 1280.
 *
 * Resize is listened to rather than observed with `ResizeObserver` because every
 * threshold in play is a VIEWPORT threshold — the notes state them as 1440/1280
 * viewport widths — and `resize` is the event that moves them.
 */
export function useCalendarMetrics(): CalendarMetrics {
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? DEFAULT_VIEWPORT_WIDTH : window.innerWidth,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setWidth(window.innerWidth)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return useMemo(() => {
    const density = densityForWidth(width)
    return {
      width,
      density,
      chipCap: resolveChipCap(CELL_HEIGHT[density]),
      hideLegendCounts: width <= LEGEND_COUNTS_MAX_WIDTH,
      collapseLegend: width <= LEGEND_POPOVER_MAX_WIDTH,
      shortPeriodLabel: width <= SHORT_LABEL_MAX_WIDTH,
    }
  }, [width])
}
