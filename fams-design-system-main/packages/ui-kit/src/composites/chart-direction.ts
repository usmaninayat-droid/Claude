import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

/**
 * chart-direction — ambient `dir` resolution for ECharts composites.
 *
 * WHY THIS EXISTS. ECharts has no native RTL layout: it paints axes, category
 * order and bar growth direction from the `option` object alone, so an RTL page
 * whose DOM chrome mirrors perfectly still renders every plot left-to-right
 * (UX verdict V12b). `ChartContainer` already resolves the ambient direction for
 * its own wrapper, but the *option* is built by the chart composite above it —
 * which therefore needs the same value. This hook is that one shared reader, so
 * `BarChart`/`LineChart`/`AreaChart`/`HeatmapChart` cannot drift on how they
 * decide they are mirrored.
 *
 * It watches the document element's `dir` so a runtime language switch
 * re-renders the plot (the showcase header switcher does exactly that), and it
 * resolves from the nearest ancestor `[dir]` first so a single RTL region on an
 * LTR page still mirrors.
 */

export type ChartDirection = 'ltr' | 'rtl'

/** Nearest ancestor `[dir]`, falling back to `<html dir>`, defaulting to `'ltr'`. */
export function resolveChartDirection(element: HTMLElement | null): ChartDirection {
  if (typeof document === 'undefined') return 'ltr'
  const value = element?.closest('[dir]')?.getAttribute('dir') ?? document.documentElement.getAttribute('dir')
  return value === 'rtl' ? 'rtl' : 'ltr'
}

/**
 * The resolved direction of the element `ref` points at, kept current as the
 * document's `dir` changes. Returns a `[ref, direction]` pair — attach the ref
 * to the composite's own wrapper.
 */
export function useChartDirection<T extends HTMLElement = HTMLDivElement>(): [RefObject<T | null>, ChartDirection] {
  const ref = useRef<T | null>(null)
  const [direction, setDirection] = useState<ChartDirection>('ltr')

  useLayoutEffect(() => {
    setDirection(resolveChartDirection(ref.current))
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return
    const observer = new MutationObserver(() => setDirection(resolveChartDirection(ref.current)))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] })
    return () => observer.disconnect()
  }, [])

  return [ref, direction]
}

/**
 * Axis/grid fragments a mirrored plot needs, derived once so every composite
 * mirrors the same way:
 *  - the VALUE axis moves to the inline-start edge (physically the right),
 *  - the CATEGORY axis reverses so the first category reads first, and
 *  - a rotated value-axis title flips so it is not upside-down on that edge.
 */
export interface MirroredAxisOptions {
  /** `'right'` when mirrored — spread onto the value axis. */
  valueAxisPosition: 'left' | 'right' | undefined
  /** `true` when mirrored — spread onto the category axis as `inverse`. */
  categoryInverse: boolean
  /** Rotation for a rotated (value-edge) axis title. */
  nameRotate: number
  rtl: boolean
}

const LTR_AXES: MirroredAxisOptions = {
  valueAxisPosition: undefined,
  categoryInverse: false,
  nameRotate: 90,
  rtl: false,
}

const RTL_AXES: MirroredAxisOptions = {
  valueAxisPosition: 'right',
  categoryInverse: true,
  nameRotate: -90,
  rtl: true,
}

/** Frozen per direction, so it is a stable `useMemo` dependency. */
export function mirroredAxisOptions(direction: ChartDirection): MirroredAxisOptions {
  return direction === 'rtl' ? RTL_AXES : LTR_AXES
}
