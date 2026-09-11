import { HeatmapChart, type HeatmapChartCell } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

const X_CATEGORIES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const Y_CATEGORIES = ['Morning', 'Afternoon', 'Evening', 'Night']

function buildCells(seed: number): HeatmapChartCell[] {
  const cells: HeatmapChartCell[] = []
  Y_CATEGORIES.forEach((y, yi) => {
    X_CATEGORIES.forEach((x, xi) => {
      // Deterministic pseudo-random-looking intensity, no business meaning.
      const value = Math.round(((Math.sin(seed + xi * 1.7 + yi * 2.3) + 1) / 2) * 90 + 5)
      cells.push({ x, y, value })
    })
  })
  return cells
}

const CELLS = buildCells(1)

const SCORE_BINS = [
  { to: 0, color: '#f2f4f7', label: 'No Data', noData: true },
  { to: 40, color: '#fef0c7', label: '0–40' },
  { to: 60, color: '#fec84b', label: '41–60' },
  { to: 75, color: '#f79009', label: '61–75' },
  { to: 90, color: '#f97066', label: '76–90' },
  { to: 100, color: '#f04438', label: '91–100' },
]

/** Four months of four weekly columns each — the two-tier axis case. */
const MONTH_GROUPS = [
  { label: 'Jan', span: 4 },
  { label: 'Feb', span: 4 },
  { label: 'Mar', span: 4 },
  { label: 'Apr', span: 4 },
]
const VEHICLES = ['Truck 1', 'Truck 2', 'Truck 3']
// Column ids stay unique (the axis matches cells by string), while the LABEL a
// reader sees is the week within its month.
const WEEK_CATEGORIES = MONTH_GROUPS.flatMap((month) => [1, 2, 3, 4].map((week) => `${month.label}-W${week}`))
// The ids above stay unique (cells match them by string); the TICKS repeat,
// which is the whole point of a two-tier axis.
const WEEK_TICKS = MONTH_GROUPS.flatMap(() => ['W1', 'W2', 'W3', 'W4'])
const WEEK_CELLS: HeatmapChartCell[] = VEHICLES.flatMap((vehicle, vi) =>
  WEEK_CATEGORIES.map((x, xi) => ({
    x,
    y: vehicle,
    value: Math.round(((Math.sin(xi * 1.3 + vi * 2.1) + 1) / 2) * 90 + 5),
  })),
)

// Sparse — a few (x, y) pairs are intentionally missing to show unpainted gaps.
const SPARSE_CELLS = buildCells(2).filter((_, i) => i % 5 !== 0)

/**
 * HeatmapChartDemo — matrix-style intensity grid, on ECharts.
 */
export default function HeatmapChartDemo() {
  return (
    <DocPage
      title="HeatmapChart"
      badge="stable"
      summary="Matrix/calendar-style intensity grid on ECharts. Color scale is a continuous visualMap gradient, not a discrete legend — cells with no matching data render unpainted rather than a forced zero."
    >
      <DocSection id="usage" title="Usage">
        <Prose>
          <Code>cells</Code> is a sparse list of <Code>{'{ x, y, value }'}</Code> triples matched
          against <Code>xCategories</Code>/<Code>yCategories</Code> by string equality.
        </Prose>
        <Demo
          title="Sequential scale"
          code={`import { HeatmapChart } from '@fams/ui-kit'

<HeatmapChart
  xCategories={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
  yCategories={['Morning', 'Afternoon', 'Evening', 'Night']}
  cells={cells}
  aria-label="Activity intensity by day and time of day"
/>`}
        >
          <HeatmapChart
            xCategories={X_CATEGORIES}
            yCategories={Y_CATEGORIES}
            cells={CELLS}
            aria-label="Activity intensity by day and time of day"
          />
        </Demo>
      </DocSection>

      <DocSection id="variants" title="Color scale, values & sparse data">
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'Cool scale',
              caption: "colorScale='cool'",
              node: (
                <div className="w-full">
                  <HeatmapChart
                    xCategories={X_CATEGORIES}
                    yCategories={Y_CATEGORIES}
                    cells={CELLS}
                    colorScale="cool"
                    height={220}
                    aria-label="Activity intensity, cool color scale"
                  />
                </div>
              ),
            },
            {
              label: 'Show values',
              caption: 'showValues={true}',
              node: (
                <div className="w-full">
                  <HeatmapChart
                    xCategories={X_CATEGORIES}
                    yCategories={Y_CATEGORIES}
                    cells={CELLS}
                    showValues
                    height={220}
                    aria-label="Activity intensity with on-cell values"
                  />
                </div>
              ),
            },
            {
              label: 'Sparse data',
              caption: 'some cells missing',
              node: (
                <div className="w-full">
                  <HeatmapChart
                    xCategories={X_CATEGORIES}
                    yCategories={Y_CATEGORIES}
                    cells={SPARSE_CELLS}
                    height={220}
                    aria-label="Activity intensity with gaps for missing data"
                  />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="bins" title="Discrete bins & axis titles">
        <Prose>
          <Code>bins</Code> swaps the continuous ramp for a discrete, piecewise scale whose every
          class states its numeric range in text. Keep the list short — past about seven bins
          adjacent classes blur and a table reads better. One entry may set{' '}
          <Code>noData: true</Code>: unmeasured coordinates are then painted with it{' '}
          <em>and</em> glyphed, so &ldquo;unmeasured&rdquo; is never distinguishable by colour
          alone.
        </Prose>
        <Demo
          title="Six-bin scale with a No Data class"
          code={`<HeatmapChart
  xCategories={days}
  yCategories={shifts}
  cells={sparseCells}
  bins={[
    { to: 0, color: '#f2f4f7', label: 'No Data', noData: true },
    { to: 40, color: '#fef0c7', label: '0–40' },
    { to: 60, color: '#fec84b', label: '41–60' },
    { to: 75, color: '#f79009', label: '61–75' },
    { to: 90, color: '#f97066', label: '76–90' },
    { to: 100, color: '#f04438', label: '91–100' },
  ]}
  xAxisTitle="Day"
  yAxisTitle="Shift"
  aria-label="Safety score by shift and day — heat map, six score bands over seven days"
/>`}
        >
          <HeatmapChart
            xCategories={X_CATEGORIES}
            yCategories={Y_CATEGORIES}
            cells={SPARSE_CELLS}
            bins={SCORE_BINS}
            xAxisTitle="Day"
            yAxisTitle="Shift"
            aria-label="Safety score by shift and day — heat map, six score bands over seven days"
          />
        </Demo>
      </DocSection>

      <DocSection id="grouped-axis" title="Grouped x-axis">
        <Prose>
          When the columns are a fine period that reads as a coarser one — sixteen weeks that are
          really four months — <Code>xGroups</Code> draws the coarse tier under the fine one, each
          label centred on its own run of columns. Sixteen{' '}
          <Code>Jan W1 … Apr W4</Code> ticks are unreadable at any card width; four month labels
          over <Code>W1 W2 W3 W4</Code> are not. Runs are consumed in order and need not be equal.
        </Prose>
        <Demo
          title="Sixteen weekly columns under four month labels"
          code={`<HeatmapChart
  xCategories={['W1','W2','W3','W4','W1','W2','W3','W4', /* … */]}
  yCategories={['Truck 1', 'Truck 2', 'Truck 3']}
  cells={cells}
  xTickLabels={['W1','W2','W3','W4','W1','W2','W3','W4', /* … */]}
  xGroups={[
    { label: 'Jan', span: 4 },
    { label: 'Feb', span: 4 },
    { label: 'Mar', span: 4 },
    { label: 'Apr', span: 4 },
  ]}
  yAxisTitle="Vehicles"
  aria-label="Weekly safety score by vehicle, grouped by month"
/>`}
        >
          <HeatmapChart
            xCategories={WEEK_CATEGORIES}
            yCategories={VEHICLES}
            cells={WEEK_CELLS}
            xGroups={MONTH_GROUPS}
            xTickLabels={WEEK_TICKS}
            yAxisTitle="Vehicles"
            height={260}
            aria-label="Weekly safety score by vehicle, grouped by month"
          />
        </Demo>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'xCategories', type: 'Array<string | number>', required: true, description: 'Column categories, left to right.' },
            { prop: 'yCategories', type: 'Array<string | number>', required: true, description: 'Row categories, top to bottom.' },
            {
              prop: 'cells',
              type: 'HeatmapChartCell[]',
              required: true,
              description: 'Sparse cell list: { x, y, value }. An unmatched (x, y) pair renders unpainted.',
            },
            { prop: 'min', type: 'number', default: '0', description: 'Lower bound of the color scale.' },
            { prop: 'max', type: 'number', description: 'Upper bound of the color scale. Defaults to the highest value in cells.' },
            {
              prop: 'colorScale',
              type: "'sequential' | 'cool'",
              default: "'sequential'",
              description: 'Token-sourced color ramp. Ignored when bins is given.',
            },
            {
              prop: 'bins',
              type: 'HeatmapChartBin[]',
              description:
                'Discrete piecewise scale: { to, color, label, noData? }. One noData entry gives unmeasured coordinates a named, glyphed treatment.',
            },
            {
              prop: 'xGroups',
              type: 'HeatmapChartGroup[]',
              description:
                'Outer tier of the x-axis: { label, span } runs drawn UNDER the column labels, each centred on its own run of `span` columns. Use it when the columns are a fine period (weeks) that reads as a coarser one (months) — sixteen "Jan W1 … Apr W4" ticks are unreadable, "W1 W2 W3 W4" under "Jan" is not.',
            },
            {
              prop: 'xTickLabels',
              type: 'Array<string | number>',
              description:
                'Display labels for the column axis, parallel to xCategories. xCategories are IDENTIFIERS (cells[].x matches them by string) so they must stay unique — this is the seam that lets the ticks repeat while the ids do not.',
            },
            { prop: 'xAxisTitle', type: 'string', description: 'X-axis title, rendered as the ECharts axis name.' },
            {
              prop: 'yAxisTitle',
              type: 'string',
              description: 'Y-axis title, rotated 90° so it reads correctly in both directions. Also names the data-table twin\'s row column.',
            },
            { prop: 'showValues', type: 'boolean', default: 'false', description: "Renders each cell's formatted value as an on-cell label." },
            { prop: 'legend', type: 'boolean', default: 'true', description: 'Shows the continuous color-scale bar below the grid.' },
            {
              prop: 'emptyText',
              type: 'ReactNode',
              description: 'Rendered in place of the grid when there are no cells to draw.',
            },
            { prop: 'height', type: 'number | string', default: '320', description: 'Number is px, string is any CSS length.' },
            {
              prop: 'aria-label',
              type: 'string',
              required: true,
              description: 'Required accessible description of what the chart shows.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Leave a coordinate out of cells rather than forcing it to 0 when there is genuinely no data.',
            'Use showValues only when the grid is small enough for labels to stay legible.',
          ]}
          donts={[
            "Don't use HeatmapChart for fewer than ~6 cells — a BarChart or CompareBars usually reads better at that scale.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Required aria-label describes the chart for assistive tech.',
            'Missing data stays visually distinct from a measured zero — never silently coerced.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
