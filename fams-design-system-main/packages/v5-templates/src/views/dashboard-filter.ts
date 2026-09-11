import type {
  DashboardDimensionValues,
  DashboardFilterPill,
  DashboardWidget,
  DashboardWidgetDataSource,
} from '@fams/v5-composer'

/**
 * dashboard-filter — the engine that makes a header filter pill actually
 * filter.
 *
 * THE MODEL, in one sentence: a pill declares the DIMENSION it drives, every
 * filterable datum declares the dimension values it BELONGS TO, and this module
 * keeps the data whose values intersect the active selection.
 *
 * Three properties make it safe to switch on across a dashboard that was
 * authored before it existed:
 *  - **Omission means "not scoped"**, never "excluded". A datum with no entry
 *    for a dimension survives every selection of that dimension, so one pill
 *    narrows the widgets it is about and leaves the rest whole, and an
 *    un-annotated blueprint renders byte-identically to before.
 *  - **Identity is preserved when nothing is dropped.** The same `dataSource`
 *    object comes back out, so React's memoization and every downstream
 *    `useMemo` see no change.
 *  - **Categories filter positionally.** A category axis is the one filterable
 *    collection whose members are bare strings, so `categoryDimensions` carries
 *    their dimensions by index and dropping an index drops it from
 *    `categories`, `axis.x.tickLabels` and every series' `data[]` in step.
 *
 * NOT A DATA LAYER (rule 8): nothing here fetches, aggregates or derives. It is
 * a pure projection of the authored `dataSource` under the current pill values,
 * which is exactly the part a presenter is allowed to own.
 */

/** Active selection, keyed by DIMENSION (not by pill id). Empty array = unset. */
export type DashboardDimensionSelection = Record<string, string[]>

/** Current value of every filter pill, keyed by pill id. */
export type DashboardFilterValues = Record<string, string | string[] | undefined>

/**
 * The reserved value of the UNSCOPED option every collection pill carries.
 *
 * A pill whose only options are real ids is a one-way door: once a vehicle is
 * chosen there is no way back to the whole fleet. The renderer injects this
 * option at the head of every collection pill and treats it as "no constraint",
 * which is the same contract `WidgetScopeSelect` uses — one rule for both
 * scoping controls rather than two conventions on one page.
 */
export const PILL_ALL_VALUE = '__all'

/**
 * Sensible presets for a `time-range` pill with no authored options — presets
 * as rows, never a calendar-first grid (Phase 3, Telematics § Time Frame pill).
 *
 * Lives HERE, beside the matcher, because the presets are also the option
 * LABELS the filter summary reads: keeping them in the view meant a pill with
 * no authored options summarised as its raw value (`last-7-days`) in the very
 * `aria-label` that is supposed to read as a sentence.
 */
export const TIME_RANGE_PRESETS: { value: string; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'last-7-days', label: 'Last 7 days' },
  { value: 'last-30-days', label: 'Last 30 days' },
]

/** The options a pill offers — authored, else the time-range presets. */
export function pillOptions(pill: DashboardFilterPill): { value: string; label: string }[] {
  return pill.options ?? (pill.type === 'time-range' ? TIME_RANGE_PRESETS : [])
}

/** The dimension a pill drives — its own `dimension`, else its `id`. */
export function pillDimension(pill: DashboardFilterPill): string {
  return pill.dimension ?? pill.id
}

/** Pill-id-keyed values → dimension-keyed selection, dropping unset pills. */
export function toDimensionSelection(
  pills: readonly DashboardFilterPill[],
  values: DashboardFilterValues,
): DashboardDimensionSelection {
  const selection: DashboardDimensionSelection = {}
  for (const pill of pills) {
    const raw = values[pill.id]
    const list = (raw === undefined ? [] : Array.isArray(raw) ? raw : [raw]).filter(
      (value) => value !== PILL_ALL_VALUE,
    )
    if (list.length === 0) continue
    const dimension = pillDimension(pill)
    selection[dimension] = [...(selection[dimension] ?? []), ...list]
  }
  return selection
}

/** Dimension values as a list, whatever shape the author wrote. */
function valuesOf(dimensions: DashboardDimensionValues | undefined, dimension: string): string[] | undefined {
  const own = dimensions?.[dimension]
  if (own === undefined) return undefined
  return Array.isArray(own) ? own : [own]
}

/**
 * Does one datum survive the current selection?
 *
 * A dimension the datum does not carry is not a constraint on it (see the
 * module docblock) — that asymmetry is deliberate and is what keeps a pill from
 * blanking every widget that is not about it.
 */
export function datumMatches(
  dimensions: DashboardDimensionValues | undefined,
  selection: DashboardDimensionSelection,
): boolean {
  for (const [dimension, chosen] of Object.entries(selection)) {
    if (chosen.length === 0) continue
    const own = valuesOf(dimensions, dimension)
    if (own === undefined) continue
    if (!own.some((value) => chosen.includes(value))) return false
  }
  return true
}

/** A variant matches only when EVERY dimension it names is actively selected. */
function variantMatches(when: DashboardDimensionValues, selection: DashboardDimensionSelection): boolean {
  const entries = Object.entries(when)
  if (entries.length === 0) return false
  return entries.every(([dimension, want]) => {
    const chosen = selection[dimension]
    if (!chosen?.length) return false
    const wanted = Array.isArray(want) ? want : [want]
    return wanted.some((value) => chosen.includes(value))
  })
}

/** Every dimension name any datum in this source is annotated with. */
function sourceDimensions(source: DashboardWidgetDataSource, into: Set<string>): void {
  const collect = (dimensions: DashboardDimensionValues | undefined) => {
    if (dimensions) for (const key of Object.keys(dimensions)) into.add(key)
  }
  for (const key of ['series', 'slices', 'items', 'rows', 'cells'] as const) {
    const list = source[key]
    if (Array.isArray(list)) for (const entry of list) collect((entry as { dimensions?: DashboardDimensionValues })?.dimensions)
  }
  if (Array.isArray(source.categoryDimensions)) for (const entry of source.categoryDimensions) collect(entry)
  if (Array.isArray(source.variants)) for (const variant of source.variants) collect(variant.when)
}

/** Every dimension the widget subtree (stacks included) can be filtered by. */
export function widgetDimensions(widgets: readonly DashboardWidget[], into = new Set<string>()): Set<string> {
  for (const widget of widgets) {
    if (widget.dataSource) sourceDimensions(widget.dataSource, into)
    if (widget.children?.length) widgetDimensions(widget.children, into)
  }
  return into
}

/**
 * The pills that can actually change something on this page.
 *
 * V11 in its sharpest form: a pill whose dimension no datum carries opens,
 * searches and commits a label while changing nothing, which is worse than no
 * pill at all. It is dropped from the DOM rather than rendered inert.
 */
export function livePills<T extends DashboardWidget>(
  pills: readonly DashboardFilterPill[],
  widgets: readonly T[],
  kpiSources: readonly (DashboardWidgetDataSource | undefined)[] = [],
): DashboardFilterPill[] {
  const available = widgetDimensions(widgets)
  for (const source of kpiSources) if (source) sourceDimensions(source, available)
  return pills.filter((pill) => available.has(pillDimension(pill)))
}

/**
 * The active filter clause for ONE widget — the pills it actually responds to,
 * stated in words, or `undefined` when it responds to none of them.
 */
export function widgetFilterSummary(
  widget: DashboardWidget,
  pills: readonly DashboardFilterPill[],
  values: DashboardFilterValues,
  selection: DashboardDimensionSelection,
): string | undefined {
  const available = widgetDimensions([widget])
  const active = Object.entries(selection)
    .filter(([dimension, chosen]) => chosen.length > 0 && available.has(dimension))
    .map(([dimension]) => dimension)
  if (active.length === 0) return undefined
  return filterSummary(pills, values, new Set(active)) || undefined
}

/** Drop `undefined`-`dimensions` bookkeeping from a filtered list, preserving identity when nothing went. */
function filterList<T extends { dimensions?: DashboardDimensionValues }>(
  list: T[] | undefined,
  selection: DashboardDimensionSelection,
): { list: T[] | undefined; changed: boolean } {
  if (!Array.isArray(list)) return { list, changed: false }
  const kept = list.filter((entry) => datumMatches(entry?.dimensions, selection))
  return { list: kept.length === list.length ? list : kept, changed: kept.length !== list.length }
}

/**
 * Project one `dataSource` through the active selection.
 *
 * ORDER MATTERS: variants first (they may supply an entirely different data
 * set for this combination), then category positions, then per-datum tags.
 */
export function applyDashboardFilters(
  source: DashboardWidgetDataSource | undefined,
  selection: DashboardDimensionSelection,
): DashboardWidgetDataSource | undefined {
  if (!source) return source
  const hasSelection = Object.values(selection).some((chosen) => chosen.length > 0)
  if (!hasSelection) return source

  let next: DashboardWidgetDataSource = source
  let changed = false

  const variant = source.variants?.find((entry) => variantMatches(entry.when, selection))
  if (variant) {
    const overrides = { ...variant } as Partial<DashboardWidgetDataSource> & { when?: unknown }
    delete overrides.when
    next = { ...next, ...overrides }
    changed = true
  }

  // Category positions — the whole reason a time-range pill can narrow a trend.
  const categoryDimensions = next.categoryDimensions
  if (Array.isArray(categoryDimensions) && categoryDimensions.length > 0) {
    const kept: number[] = []
    categoryDimensions.forEach((dimensions, index) => {
      if (datumMatches(dimensions, selection)) kept.push(index)
    })
    if (kept.length !== categoryDimensions.length) {
      changed = true
      const pick = <T,>(list: readonly T[] | undefined): T[] | undefined =>
        Array.isArray(list) ? kept.filter((index) => index < list.length).map((index) => list[index] as T) : undefined
      next = {
        ...next,
        categories: pick(next.categories) ?? next.categories,
        categoryDimensions: kept.map((index) => categoryDimensions[index] as DashboardDimensionValues),
        series: next.series?.map((entry) => ({ ...entry, data: pick(entry.data) ?? entry.data })),
        axis: next.axis?.x?.tickLabels
          ? { ...next.axis, x: { ...next.axis.x, tickLabels: pick(next.axis.x.tickLabels) } }
          : next.axis,
      }
    }
  }

  const series = filterList(next.series, selection)
  const slices = filterList(next.slices, selection)
  const items = filterList(next.items, selection)
  const rows = filterList(next.rows, selection)
  const cells = filterList(next.cells, selection)
  if (series.changed || slices.changed || items.changed || rows.changed || cells.changed) {
    changed = true
    next = {
      ...next,
      series: series.list,
      slices: slices.list,
      items: items.list,
      rows: rows.list,
      cells: cells.list,
    }
  }

  return changed ? next : source
}

/** The widget with its `dataSource` (and any stacked children's) projected. */
export function applyWidgetFilters(
  widget: DashboardWidget,
  selection: DashboardDimensionSelection,
): DashboardWidget {
  const dataSource = applyDashboardFilters(widget.dataSource, selection)
  const children = widget.children?.map((child) => applyWidgetFilters(child, selection))
  const sameChildren =
    !widget.children || (children?.every((child, index) => child === widget.children?.[index]) ?? true)
  if (dataSource === widget.dataSource && sameChildren) return widget
  return { ...widget, dataSource, ...(children ? { children } : {}) }
}

/**
 * The active selection stated in words, for the sentence a chart's
 * `aria-label` ends with. Only pills that are actually set appear.
 *
 * Pass `only` to restrict it to the dimensions ONE widget carries: a chart that
 * ignores the Driver pill must not announce itself as "filtered to … Driver:
 * Omar Darwish". The page's state is not the widget's state.
 */
export function filterSummary(
  pills: readonly DashboardFilterPill[],
  values: DashboardFilterValues,
  only?: ReadonlySet<string>,
): string {
  const parts: string[] = []
  for (const pill of pills) {
    if (only && !only.has(pillDimension(pill))) continue
    const raw = values[pill.id]
    const list = (raw === undefined ? [] : Array.isArray(raw) ? raw : [raw]).filter(
      (value) => value !== PILL_ALL_VALUE,
    )
    if (list.length === 0) continue
    const options = pillOptions(pill)
    const labels = list.map((value) => options.find((option) => option.value === value)?.label ?? value)
    parts.push(`${pill.label}: ${labels.join(', ')}`)
  }
  return parts.join('; ')
}
