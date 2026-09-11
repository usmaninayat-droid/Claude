import { BarChart, type BarChartSeries } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

const CATEGORIES = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E']

const GROUPED_SERIES: BarChartSeries[] = [
  { label: 'Series A', data: [42, 58, 35, 67, 49] },
  { label: 'Series B', data: [30, 44, 52, 28, 40] },
]

const STACKED_SERIES: BarChartSeries[] = [
  { label: 'Planned', data: [20, 32, 24, 40, 28], stackId: 'total' },
  { label: 'Unplanned', data: [12, 8, 18, 10, 14], stackId: 'total' },
]

const SINGLE_SERIES: BarChartSeries[] = [{ label: 'Series A', data: [42, 58, 35, 67, 49] }]

/**
 * BarChartDemo — categorical comparison chart: grouped (default) vs stacked,
 * vertical vs horizontal orientation.
 */
export default function BarChartDemo() {
  return (
    <DocPage
      title="BarChart"
      badge="stable"
      summary="Categorical comparison chart on ECharts — vertical or horizontal, stacked or grouped. Series sharing a stackId stack; series without one render grouped, side-by-side."
    >
      <DocSection id="usage" title="Usage">
        <Prose>
          <Code>categories</Code> supplies the axis labels; each <Code>series</Code> entry aligns
          1:1 with them. A legend shows automatically once more than one series is given.
        </Prose>
        <Demo
          title="Basic grouped bars"
          code={`import { BarChart } from '@fams/ui-kit'

<BarChart
  categories={['Group A', 'Group B', 'Group C', 'Group D', 'Group E']}
  series={[
    { label: 'Series A', data: [42, 58, 35, 67, 49] },
    { label: 'Series B', data: [30, 44, 52, 28, 40] },
  ]}
  aria-label="Comparison of Series A and Series B across five groups"
/>`}
        >
          <BarChart
            categories={CATEGORIES}
            series={GROUPED_SERIES}
            aria-label="Comparison of Series A and Series B across five groups"
          />
        </Demo>
      </DocSection>

      <DocSection id="variants" title="Grouped, stacked & orientation">
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'Grouped',
              caption: 'default — no stackId',
              node: (
                <div className="w-full">
                  <BarChart
                    categories={CATEGORIES}
                    series={GROUPED_SERIES}
                    height={220}
                    aria-label="Grouped bar chart"
                  />
                </div>
              ),
            },
            {
              label: 'Stacked',
              caption: 'stacked={true}',
              node: (
                <div className="w-full">
                  <BarChart
                    categories={CATEGORIES}
                    series={STACKED_SERIES}
                    stacked
                    height={220}
                    aria-label="Stacked bar chart of planned vs unplanned totals"
                  />
                </div>
              ),
            },
            {
              label: 'Horizontal',
              caption: "orientation='horizontal'",
              node: (
                <div className="w-full">
                  <BarChart
                    categories={CATEGORIES}
                    series={GROUPED_SERIES}
                    orientation="horizontal"
                    height={220}
                    aria-label="Horizontal grouped bar chart"
                  />
                </div>
              ),
            },
            {
              label: 'Single series',
              caption: 'no legend',
              node: (
                <div className="w-full">
                  <BarChart
                    categories={CATEGORIES}
                    series={SINGLE_SERIES}
                    height={220}
                    aria-label="Single series bar chart"
                  />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="axis-titles" title="Axis titles & background track">
        <Prose>
          <Code>xAxisTitle</Code>/<Code>yAxisTitle</Code> name what each axis measures — a chart
          whose numbers have a unit is unreadable without them. <Code>showTrack</Code> paints a
          muted full-length track behind every bar; it carries no meaning of its own, it just makes
          &ldquo;how far along the scale&rdquo; legible on a ranked list.
        </Prose>
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'Axis titles',
              caption: "xAxisTitle / yAxisTitle",
              node: (
                <div className="w-full">
                  <BarChart
                    categories={CATEGORIES}
                    series={SINGLE_SERIES}
                    xAxisTitle="Group"
                    yAxisTitle="Events"
                    height={240}
                    aria-label="Events per group — column chart with titled axes"
                  />
                </div>
              ),
            },
            {
              label: 'Background track',
              caption: 'showTrack + horizontal',
              node: (
                <div className="w-full">
                  <BarChart
                    categories={CATEGORIES}
                    series={SINGLE_SERIES}
                    orientation="horizontal"
                    showTrack
                    xAxisTitle="Events"
                    height={240}
                    aria-label="Events per group — ranked horizontal bars over a muted track"
                  />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="color-axis-legend" title="Token-bound color, pinned axis range & legend placement">
        <Prose>
          A series is normally one of the five categorical swatches. When a series IS the brand
          measure, or IS a status, <Code>series[].color</Code> binds it to that token directly —
          the fill, the legend swatch and the tooltip dot all follow. <Code>valueAxisMin</Code>/
          <Code>valueAxisMax</Code> pin the scale so the tallest bar is not flush with the top
          gridline (and so a refilter cannot silently rescale it), and{' '}
          <Code>legendPlacement=&quot;top&quot;</Code> matches a card whose donut or line siblings
          key above the plot.
        </Prose>
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'Token-bound series',
              caption: "series[].color = 'var(--color-primary)'",
              node: (
                <div className="w-full">
                  <BarChart
                    categories={CATEGORIES}
                    series={[{ label: 'Overspeeding events', data: [42, 58, 35, 67, 49], color: 'var(--color-primary)' }]}
                    height={220}
                    aria-label="Overspeeding events per group, painted in the primary brand color"
                  />
                </div>
              ),
            },
            {
              label: 'Pinned range + legend on top',
              caption: 'valueAxisMax={100} · legendPlacement="top"',
              node: (
                <div className="w-full">
                  <BarChart
                    categories={CATEGORIES}
                    series={GROUPED_SERIES}
                    valueAxisMin={0}
                    valueAxisMax={100}
                    legendPlacement="top"
                    height={220}
                    aria-label="Two series on a pinned 0–100 scale with the legend above the plot"
                  />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'categories',
              type: 'Array<string | number>',
              required: true,
              description: 'Category values, one per bar/group.',
            },
            {
              prop: 'series',
              type: 'BarChartSeries[]',
              required: true,
              description:
                'One or more series: { id?, label, data, colorIndex?, color?, stackId? }. `color` is the non-categorical escape hatch — a token reference such as "var(--color-primary)" that wins over `colorIndex` for the fill, the legend swatch and the tooltip dot.',
            },
            {
              prop: 'orientation',
              type: "'vertical' | 'horizontal'",
              default: "'vertical'",
              description: "'vertical' puts categories on the x-axis (columns); 'horizontal' swaps the axes (bars).",
            },
            {
              prop: 'stacked',
              type: 'boolean',
              default: 'false',
              description: 'Stacks every series lacking its own stackId under one shared group.',
            },
            {
              prop: 'legend',
              type: 'boolean',
              default: 'series.length > 1',
              description: 'Shows a toggleable legend row below the chart.',
            },
            {
              prop: 'legendPlacement',
              type: "'top' | 'bottom'",
              default: "'bottom'",
              description:
                'Where the legend row sits relative to the plot. Use "top" when a sibling card on the same page keys above its plot — two cards keying on opposite sides read as two different cards.',
            },
            {
              prop: 'valueAxisMin',
              type: 'number',
              description:
                'Lower bound of the VALUE axis (y when vertical, x when horizontal). Omit to let the chart fit the data; pin it to zero-base the scale.',
            },
            {
              prop: 'valueAxisMax',
              type: 'number',
              description:
                'Upper bound of the VALUE axis. Widen it so the tallest bar is not flush with the top gridline.',
            },
            {
              prop: 'xAxisTitle',
              type: 'string',
              description: 'Title for the rendered x-axis (the value axis when orientation="horizontal").',
            },
            {
              prop: 'yAxisTitle',
              type: 'string',
              description: 'Title for the rendered y-axis, rotated 90° so it reads correctly in both directions.',
            },
            {
              prop: 'showTrack',
              type: 'boolean',
              default: 'false',
              description: 'Draws a muted, token-derived full-length track behind every bar.',
            },
            {
              prop: 'showValues',
              type: 'boolean',
              default: 'false',
              description:
                'Renders each bar’s formatted value at the bar end. Use whenever the track is meaning-free, so the label — not the fill length against an unlabelled track — carries the reading.',
            },
            {
              prop: 'maxBarWidth',
              type: 'number',
              default: '40',
              description: 'Caps a bar’s thickness in px, so a sparse series does not paint slabs that dominate the page.',
            },
            {
              prop: 'emptyText',
              type: 'ReactNode',
              description:
                'Rendered in place of the plot when every series is hidden or there is nothing to draw. Without it, hiding the last series leaves a bare axis frame.',
            },
            {
              prop: 'valueFormatter',
              type: '(value: number) => string',
              default: 'value.toLocaleString()',
              description: 'Formats numeric values for the value axis and tooltip.',
            },
            {
              prop: 'height',
              type: 'number | string',
              default: '320',
              description: 'Number is px, string is any CSS length.',
            },
            {
              prop: 'loading',
              type: 'boolean',
              default: 'false',
              description: 'Shows a loading overlay via ChartContainer.',
            },
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
            'Use grouped bars to compare independent series side by side.',
            'Use stacked bars when the series sum to a meaningful total.',
            'Switch to horizontal when category labels are long or the list is tall.',
          ]}
          donts={[
            "Don't mix stacked and grouped series in one chart — pick one shape per chart.",
            "Don't omit aria-label — the canvas has no text semantics of its own.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Required aria-label describes the chart for assistive tech.',
            'Legend toggle buttons are keyboard-focusable and round-trip through the live ECharts instance.',
            'Colors are drawn from the categorical --color-chart-1..5 palette, tuned for contrast across tenants.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
