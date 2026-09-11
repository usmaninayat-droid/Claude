/**
 * overflow.ts — the one `+N` overflow calculation in the design system.
 *
 * FAMILY C uses it for the filter trigger's value line ("Lot 1, Lot 2, +4")
 * and, later, for the calendar chip cap (J.93). It is deliberately PURE and
 * DOM-free: width measurement, when it is wanted at all, arrives as an
 * injectable `measure` callback, so the same function serves a layout-effect
 * measuring real text nodes and a unit test measuring `label.length`.
 *
 * Two independent budgets, either or both:
 *   - `maxVisible` — a plain item cap.
 *   - `maxWidth` + `measure` — a greedy width budget.
 * With neither, everything is visible and `hiddenCount` is 0.
 */

export interface OverflowResult<T> {
  /** The items that fit, in input order. */
  visible: T[]
  /** `items.length - visible.length` — the `N` in the `+N` affordance. */
  hiddenCount: number
}

export interface OverflowOptions<T> {
  /** Hard cap on the number of visible items. */
  maxVisible?: number
  /** Width budget, in whatever unit `measure` returns. Requires `measure`. */
  maxWidth?: number
  /** Measured width of one item. Required for the `maxWidth` budget. */
  measure?: (item: T, index: number) => number
  /** Separator width charged BETWEEN items (e.g. the ", " join). Default 0. */
  gap?: number
  /**
   * Width the `+N` affordance itself needs. Charged against `maxWidth` only
   * when there is genuine overflow — a list that fits exactly renders no `+N`
   * and must not be trimmed to make room for one that never appears.
   */
  reserve?: number
  /**
   * Never hide everything: at least this many items stay visible even when
   * the first one already blows the budget. Default 1. Use 0 to allow a
   * fully-collapsed "+N" with no labels at all.
   */
  minVisible?: number
}

/** Greedy fit of `items` into a width budget. */
function fitWidth<T>(
  items: readonly T[],
  budget: number,
  measure: (item: T, index: number) => number,
  gap: number,
  minVisible: number,
): number {
  let used = 0
  let fitted = 0
  for (let i = 0; i < items.length; i += 1) {
    const next = used + (i === 0 ? 0 : gap) + measure(items[i], i)
    if (next > budget) break
    used = next
    fitted += 1
  }
  return Math.max(Math.min(minVisible, items.length), fitted)
}

/**
 * Split `items` into what is shown and how many are hidden behind `+N`.
 *
 * @example
 * computeOverflow(['a', 'b', 'c'], { maxVisible: 2 })
 * // → { visible: ['a', 'b'], hiddenCount: 1 }
 */
export function computeOverflow<T>(items: readonly T[], options: OverflowOptions<T> = {}): OverflowResult<T> {
  const { maxVisible, maxWidth, measure, gap = 0, reserve = 0, minVisible = 1 } = options
  const total = items.length

  let count = total
  if (typeof maxVisible === 'number') count = Math.min(count, Math.max(0, Math.floor(maxVisible)))
  if (typeof maxWidth === 'number' && measure) {
    let fitted = fitWidth(items, maxWidth, measure, gap, minVisible)
    // Only pay for the `+N` badge once we know it will actually be drawn.
    if (fitted < total && reserve > 0) fitted = fitWidth(items, maxWidth - reserve, measure, gap, minVisible)
    count = Math.min(count, fitted)
  }
  count = Math.max(0, Math.min(count, total))

  return { visible: items.slice(0, count) as T[], hiddenCount: total - count }
}
