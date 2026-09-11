import { useState } from 'react'
import {
  AreaChart,
  BarChart,
  ChartLegend,
  ComplianceGauge,
  DonutChart,
  Gauge,
  HeatmapChart,
  LineChart,
  Sparkline,
  type ChartLegendItem,
  type HeatmapChartBin,
  type HeatmapChartCell,
} from '@fams/ui-kit'
import type { DashboardBin, DashboardSeries, DashboardWidgetDataSource } from '@fams/v5-composer'
import { cn } from '../lib/cn'
import {
  CenterStack,
  WidgetCard,
  sourceOf,
  widgetAriaLabel,
  widgetHeight,
  type DashboardWidgetRenderProps,
} from './dashboard-widget-shell'

/**
 * dashboard-chart-widgets — the chart half of the metadata `type` → component
 * map: `bar`, `stacked-bar`, `line`, `area`, `donut`, `compliance-gauge`,
 * `heatmap-calendar`, `sparkline-table`.
 *
 * Every one composes an existing `@fams/ui-kit` chart composite unchanged (a
 * tier-2 file never forks a core component) and adds only the metadata→props
 * translation plus the widget-local UI state a presenter cannot own — legend
 * toggles, and the heatmap's inner scroll region.
 *
 * The visually-hidden `<table>` twin every chart needs (verdict V2) comes free:
 * the ui-kit composites auto-build their own `dataTable`.
 */

/**
 * `@fams/ui-kit` chart series shape, from the blueprint's own series list.
 *
 * `colorToken` becomes the chart's `color` override: the categorical
 * `colorIndex` palette cannot express "this series IS the brand measure" or
 * "this category IS an error", so an author binds the token directly and the
 * chart resolves it through `resolveCssColor` at paint time.
 */
function toSeries(series: DashboardSeries[] | undefined, stacked: boolean) {
  return (series ?? []).map((s, index) => ({
    id: s.id ?? String(index),
    label: s.label,
    data: s.data,
    colorIndex: s.colorIndex,
    color: s.colorToken,
    stackId: stacked ? (s.stackId ?? 'stack') : s.stackId,
  }))
}

/** Pinned value-axis bounds, from `axis.y` / `axis.yRight`. */
function axisBounds(source: DashboardWidgetDataSource) {
  return {
    valueAxisMin: source.axis?.y?.min,
    valueAxisMax: source.axis?.y?.max,
    trailingMin: source.axis?.yRight?.min,
    trailingMax: source.axis?.yRight?.max,
  }
}

/** Legend row placement for a bar/line widget. Default `'bottom'`. */
function legendPlacementOf(source: DashboardWidgetDataSource): 'top' | 'bottom' {
  return source.legendPlacement === 'top' ? 'top' : 'bottom'
}

/**
 * Blueprint bins → `HeatmapChart`'s bins. The chart's contract is stricter than
 * the authoring one: `to` and `color` are required there (the piecewise
 * visualMap needs a real upper bound and a real paint value), so an open-ended
 * final bin resolves to the scale ceiling and the "no data" bin — whose `to` the
 * chart ignores — gets a muted token fill.
 */
function toBins(bins: DashboardBin[] | undefined, max: number | undefined): HeatmapChartBin[] | undefined {
  if (!bins?.length) return undefined
  return bins.map((bin) => ({
    to: bin.noData ? 0 : (bin.to ?? max ?? 100),
    color: bin.color ?? (bin.noData ? 'var(--color-muted)' : 'var(--color-primary)'),
    label: bin.label,
    noData: bin.noData,
  }))
}

function axisTitles(source: DashboardWidgetDataSource) {
  return {
    xAxisTitle: source.axis?.x?.title,
    yAxisTitle: source.axis?.y?.title,
    yAxisTitleTrailing: source.axis?.yRight?.title,
  }
}

/** Bars — vertical or horizontal, grouped or stacked, with an optional track. */
export function BarWidget(props: DashboardWidgetRenderProps) {
  const { widget, renderer } = props
  const source = sourceOf(widget)
  const stacked = source.stacked ?? widget.type === 'stacked-bar'
  const series = toSeries(source.series, stacked)
  const { xAxisTitle, yAxisTitle } = axisTitles(source)
  const bounds = axisBounds(source)
  return (
    <WidgetCard {...props} count={series.length}>
      <BarChart
        categories={source.categories ?? []}
        series={series}
        orientation={source.orientation}
        stacked={stacked}
        showTrack={source.showTrack}
        showValues={source.showValues}
        legendPlacement={legendPlacementOf(source)}
        valueAxisMin={bounds.valueAxisMin}
        valueAxisMax={bounds.valueAxisMax}
        xAxisTitle={xAxisTitle}
        yAxisTitle={yAxisTitle}
        emptyText={source.emptyText}
        height={widgetHeight(widget, 320)}
        loading={props.loading}
        renderer={renderer}
        aria-label={widgetAriaLabel(widget, props.filterSummary)}
      />
    </WidgetCard>
  )
}

/** Lines — including the contained dual-axis exception (verdict V4, `series[].axis`). */
export function LineWidget(props: DashboardWidgetRenderProps) {
  const { widget, renderer } = props
  const source = sourceOf(widget)
  const series = (source.series ?? []).map((s, index) => ({
    id: s.id ?? String(index),
    label: s.label,
    data: s.data,
    colorIndex: s.colorIndex,
    color: s.colorToken,
    dashed: s.dashed,
    axis: s.axis,
    unit: s.unit,
  }))
  const { xAxisTitle, yAxisTitle, yAxisTitleTrailing } = axisTitles(source)
  const bounds = axisBounds(source)
  return (
    <WidgetCard {...props} count={series.length}>
      <LineChart
        categories={source.categories ?? []}
        series={series}
        smooth={source.smooth}
        legendPlacement={legendPlacementOf(source)}
        yAxisMin={bounds.valueAxisMin}
        yAxisMax={bounds.valueAxisMax}
        yAxisTrailingMin={bounds.trailingMin}
        yAxisTrailingMax={bounds.trailingMax}
        xAxisTitle={xAxisTitle}
        yAxisTitle={yAxisTitle}
        yAxisTitleTrailing={yAxisTitleTrailing}
        emptyText={source.emptyText}
        height={widgetHeight(widget, 320)}
        loading={props.loading}
        renderer={renderer}
        aria-label={widgetAriaLabel(widget, props.filterSummary)}
      />
    </WidgetCard>
  )
}

/** Filled areas, stackable. */
export function AreaWidget(props: DashboardWidgetRenderProps) {
  const { widget, renderer } = props
  const source = sourceOf(widget)
  const stacked = source.stacked ?? false
  const { xAxisTitle, yAxisTitle } = axisTitles(source)
  return (
    <WidgetCard {...props} count={(source.series ?? []).length}>
      <AreaChart
        categories={source.categories ?? []}
        series={toSeries(source.series, stacked)}
        stacked={stacked}
        smooth={source.smooth}
        valueAxisMin={source.axis?.y?.min}
        valueAxisMax={source.axis?.y?.max}
        xAxisTitle={xAxisTitle}
        yAxisTitle={yAxisTitle}
        emptyText={source.emptyText}
        height={widgetHeight(widget, 320)}
        loading={props.loading}
        renderer={renderer}
        aria-label={widgetAriaLabel(widget, props.filterSummary)}
      />
    </WidgetCard>
  )
}

/**
 * Donut + a toggleable legend beside it. Legend visibility is widget-local UI
 * state — a presenter cannot own it (rule 8), and it must never re-assign
 * colours to the survivors (colour follows the entity).
 */
export function DonutWidget(props: DashboardWidgetRenderProps) {
  const { widget, renderer } = props
  const source = sourceOf(widget)
  const slices = (source.slices ?? []).map((slice, index) => ({
    id: slice.id ?? String(index),
    label: slice.label,
    value: slice.value,
    colorIndex: slice.colorIndex,
    color: slice.colorToken,
  }))
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const toggle = (id: string) =>
    setHiddenIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))

  const legendItems: ChartLegendItem[] = slices.map((slice, index) => ({
    id: slice.id,
    label: slice.label,
    colorIndex: slice.colorIndex ?? (((index % 5) + 1) as 1 | 2 | 3 | 4 | 5),
    color: slice.color,
    value: slice.value,
  }))

  /**
   * The centre summarises the VISIBLE arcs, not the authored total. Leaving it
   * at the authored value made the summary contradict the plot the moment a
   * legend row was toggled off ("100" over 57 units of arc). The authored
   * string is still what renders while nothing is hidden, so a formatted total
   * ("1.2k", "AED 4,300") survives untouched in the normal case.
   */
  const centerLabel = (() => {
    const authored = source.centerLabel
    if (!authored || hiddenIds.length === 0) return authored
    const visibleTotal = slices
      .filter((slice) => !hiddenIds.includes(slice.id))
      .reduce((sum, slice) => sum + slice.value, 0)
    return { ...authored, value: visibleTotal.toLocaleString() }
  })()

  // Both dashboard donuts in Figma stand the legend BESIDE the chart rather
  // than in the card's legend row — `legendOrientation` is the metadata knob
  // for that, so neither placement is hardcoded here.
  const vertical = source.legendOrientation === 'vertical'
  const legendNode =
    legendItems.length > 0 ? (
      <ChartLegend
        items={legendItems}
        orientation={vertical ? 'vertical' : 'horizontal'}
        showCounts
        hiddenIds={hiddenIds}
        onToggle={toggle}
      />
    ) : undefined

  const chart = (
    <DonutChart
      data={slices}
      legend="none"
      centerLabel={<CenterStack centerLabel={centerLabel} />}
      emptyText={source.emptyText}
      hiddenIds={hiddenIds}
      onToggle={toggle}
      height={widgetHeight(widget, 280)}
      loading={props.loading}
      renderer={renderer}
      aria-label={widgetAriaLabel(widget, props.filterSummary)}
      className={vertical ? 'min-w-0 flex-1' : undefined}
    />
  )

  return (
    <WidgetCard {...props} count={slices.length} legend={vertical ? undefined : legendNode}>
      {vertical ? (
        <div className="flex h-full flex-col items-center gap-4 sm:flex-row">
          {chart}
          {legendNode ? <div className="w-full shrink-0 sm:w-auto sm:max-w-[45%]">{legendNode}</div> : null}
        </div>
      ) : (
        chart
      )}
    </WidgetCard>
  )
}

/**
 * Compliance gauge. Explicit `sectors` opt into `Gauge`'s discrete bands (four
 * thresholds); without them `ComplianceGauge`'s three threshold-derived
 * sectors apply. `caption` states the bands in text so the band is never
 * encoded by colour alone (verdict V12).
 */
export function ComplianceGaugeWidget(props: DashboardWidgetRenderProps) {
  const { widget, renderer } = props
  const source = sourceOf(widget)
  const value = typeof source.value === 'number' ? source.value : Number(source.value ?? 0)
  const shared = {
    value,
    min: source.min,
    max: source.max,
    unit: source.unit,
    height: widgetHeight(widget, 240),
    loading: props.loading,
    renderer,
    centerContent: source.centerLabel ? <CenterStack centerLabel={source.centerLabel} /> : undefined,
    caption: source.emptyText === undefined ? source.axis?.y?.title : undefined,
    'aria-label': widgetAriaLabel(widget, props.filterSummary),
  }
  return (
    <WidgetCard {...props} count={source.value === undefined ? 0 : 1} bare={!widget.title}>
      {source.sectors ? <Gauge {...shared} sectors={source.sectors} /> : <ComplianceGauge {...shared} />}
    </WidgetCard>
  )
}

/**
 * Binned x/y heat grid with an INNER horizontal scroll region (verdicts V5/V6):
 * the grid never crushes its columns and never makes the page scroll
 * horizontally — cells stay ≥3rem wide and the region scrolls inside the card,
 * keyboard-reachable and labelled.
 *
 * KNOWN GAP: the vehicle-label column is NOT `position: sticky`. The labels are
 * painted inside the ECharts canvas, which cannot pin one axis band while the
 * rest scrolls; a sticky rail needs a DOM grid rewrite of `HeatmapChart`, which
 * is a core-tier change out of this work package's scope. The relief channel is
 * intact meanwhile — `HeatmapChart` auto-builds the visually-hidden `<table>`
 * twin of all cells (verdict V2 / criterion 32).
 */
export function HeatmapWidget(props: DashboardWidgetRenderProps) {
  const { widget, renderer } = props
  const source = sourceOf(widget)
  const cells: HeatmapChartCell[] = (source.cells ?? [])
    .filter((cell) => cell.value !== null)
    .map((cell) => ({ x: cell.x, y: cell.y, value: cell.value as number }))
  const xCategories = source.categories ?? [...new Set((source.cells ?? []).map((c) => c.x))]
  const yCategories = [...new Set((source.cells ?? []).map((c) => c.y))]
  const { xAxisTitle, yAxisTitle } = axisTitles(source)
  const minWidth = `${Math.max(xCategories.length * 3, 20)}rem`

  return (
    <WidgetCard {...props} count={(source.cells ?? []).length}>
      <div
        role="region"
        // Deliberate (WCAG 2.1.1 / UX verdict V5): a scroll container that a
        // mouse can pan MUST be reachable and pannable by keyboard. The rule
        // models "non-interactive elements shouldn't be focusable" and cannot
        // express that exception — same carve-out `ChartContainer`'s sr-only
        // data table documents.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        aria-label={`${widget.title ?? 'Heatmap'} — scrollable grid`}
        className="w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div style={{ minInlineSize: minWidth }}>
          <HeatmapChart
            xCategories={xCategories}
            yCategories={yCategories}
            cells={cells}
            bins={toBins(source.bins, source.max)}
            xGroups={source.axis?.x?.groups}
            xTickLabels={source.axis?.x?.tickLabels}
            xAxisTitle={xAxisTitle}
            yAxisTitle={yAxisTitle}
            emptyText={source.emptyText}
            height={widgetHeight(widget, 400)}
            loading={props.loading}
            renderer={renderer}
            aria-label={widgetAriaLabel(widget, props.filterSummary)}
          />
        </div>
      </div>
    </WidgetCard>
  )
}

/**
 * Sparkline table — a ranked row list whose metric column is a micro-trend.
 * A real `<table>` (not a div grid) so the rows are readable without sight.
 */
export function SparklineTableWidget(props: DashboardWidgetRenderProps) {
  const { widget, renderer } = props
  const source = sourceOf(widget)
  const rows = source.rows ?? []
  const columns = source.columns ?? []
  return (
    <WidgetCard {...props} count={rows.length}>
      <div
        role="region"
        // Deliberate (WCAG 2.1.1 / UX verdict V5): a scroll container that a
        // mouse can pan MUST be reachable and pannable by keyboard. The rule
        // models "non-interactive elements shouldn't be focusable" and cannot
        // express that exception — same carve-out `ChartContainer`'s sr-only
        // data table documents.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        aria-label={widget.title ?? 'Table'}
        className="max-h-96 w-full overflow-auto focus-visible:outline-2 focus-visible:outline-ring"
      >
        <table className="w-full border-collapse text-body">
          <caption className="sr-only">{widgetAriaLabel(widget, props.filterSummary)}</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="p-2 text-start text-caption font-medium text-muted-foreground">
                {source.axis?.y?.title ?? 'Name'}
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'p-2 text-caption font-medium text-muted-foreground',
                    column.align === 'end' ? 'text-end' : column.align === 'center' ? 'text-center' : 'text-start',
                  )}
                  style={column.minWidth ? { minInlineSize: column.minWidth } : undefined}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <th scope="row" className="p-2 text-start font-normal text-foreground">
                  {row.primary}
                  {row.secondary ? <span className="ms-2 text-caption text-muted-foreground">{row.secondary}</span> : null}
                </th>
                {columns.map((column) => (
                  <td key={column.key} className="p-2 align-middle">
                    {column.render === 'sparkline' ? (
                      <Sparkline
                        data={(row.sparkline ?? (row.cells?.[column.key] as number[] | undefined) ?? []) as number[]}
                        variant="area"
                        renderer={renderer}
                        aria-label={`${row.primary} — ${column.label} trend`}
                      />
                    ) : (
                      <span>{String(row.cells?.[column.key] ?? '')}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetCard>
  )
}
