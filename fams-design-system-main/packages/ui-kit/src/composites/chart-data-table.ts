/**
 * chart-data-table — builders for the visually-hidden `<table>` twin every
 * chart composite hands to `ChartContainer`. Internal helper module: NOT
 * exported from `src/index.ts` (the *type* is, through `ChartContainer`).
 *
 * Why it exists: an ECharts canvas encodes its values in position and colour
 * only. Any fill below 3:1 on the card surface, and any colour-coded category,
 * therefore needs a second, non-visual channel carrying exactly the values the
 * tooltip shows. One `<table class="sr-only" tabindex="0">` per chart is that
 * channel — and because these builders derive it from the same
 * `categories`/`series`/`cells` the chart already renders, callers get it for
 * free rather than having to keep a parallel structure in sync.
 */

export interface ChartDataTableSpec {
  /** Table caption — normally the chart's own `aria-label` sentence. */
  caption: string
  /** Column headers. The first names the row-header column. */
  columns: string[]
  /** One array per row, aligned 1:1 with `columns`. Cell 0 becomes the row header. */
  rows: Array<Array<string | number>>
}

export interface DataTableSeries {
  label: string
  data: number[]
  /** Unit suffix appended to every value in this series' column (e.g. `'L'`). */
  unit?: string
}

function withUnit(value: string, unit: string | undefined): string {
  return unit ? `${value} ${unit}` : value
}

/**
 * Category × series grid — the shape `BarChart`/`LineChart`/`AreaChart` all
 * produce. One row per category, one column per series.
 */
export function buildSeriesDataTable(
  caption: string,
  categories: Array<string | number>,
  series: DataTableSeries[],
  format: (value: number) => string,
  categoryHeader = 'Category',
): ChartDataTableSpec {
  return {
    caption,
    columns: [categoryHeader, ...series.map((s) => (s.unit ? `${s.label} (${s.unit})` : s.label))],
    rows: categories.map((category, index) => [
      String(category),
      ...series.map((s) => {
        const value = s.data[index]
        return value === undefined ? '—' : withUnit(format(value), s.unit)
      }),
    ]),
  }
}

/** Share-of-total shape — one row per segment, with its percentage of the sum. */
export function buildShareDataTable(
  caption: string,
  data: Array<{ label: string; value: number }>,
  format: (value: number) => string,
): ChartDataTableSpec {
  const total = data.reduce((sum, datum) => sum + datum.value, 0)
  return {
    caption,
    columns: ['Segment', 'Value', 'Share'],
    rows: data.map((datum) => [
      datum.label,
      format(datum.value),
      total === 0 ? '—' : `${Math.round((datum.value / total) * 100)}%`,
    ]),
  }
}

/**
 * Single-reading shape — a gauge/meter. One row for the reading itself, then
 * one row per band, so the arc's colour ramp is readable as text. Without it a
 * gauge is the one chart form whose whole content is canvas-only.
 */
export function buildReadingDataTable(
  caption: string,
  reading: { label: string; value: string },
  range: { min: string; max: string },
  bands: Array<{ label: string; value: string }> = [],
): ChartDataTableSpec {
  return {
    caption,
    columns: ['Measure', 'Value'],
    rows: [
      [reading.label, reading.value],
      ['Minimum', range.min],
      ['Maximum', range.max],
      ...bands.map((band): Array<string | number> => [band.label, band.value]),
    ],
  }
}

/**
 * Matrix shape — one row per y category, one column per x category. Sparse
 * coordinates render `emptyLabel` (never a fabricated zero), which is what
 * makes "no data" readable without relying on the cell's fill colour.
 */
export function buildMatrixDataTable(
  caption: string,
  xCategories: Array<string | number>,
  yCategories: Array<string | number>,
  cells: Array<{ x: string | number; y: string | number; value: number }>,
  format: (value: number) => string,
  emptyLabel = 'No data',
  rowHeader = 'Row',
): ChartDataTableSpec {
  const byCoordinate = new Map(cells.map((cell) => [`${String(cell.y)}\u001f${String(cell.x)}`, cell.value]))
  return {
    caption,
    columns: [rowHeader, ...xCategories.map(String)],
    rows: yCategories.map((y) => [
      String(y),
      ...xCategories.map((x) => {
        const value = byCoordinate.get(`${String(y)}\u001f${String(x)}`)
        return value === undefined ? emptyLabel : format(value)
      }),
    ]),
  }
}
