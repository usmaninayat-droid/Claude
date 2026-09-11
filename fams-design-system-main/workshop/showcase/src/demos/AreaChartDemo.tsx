import { AreaChart, type AreaChartSeries } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SINGLE_SERIES: AreaChartSeries[] = [{ label: 'Series A', data: [24, 30, 27, 41, 38, 52, 46] }]

const STACKED_SERIES: AreaChartSeries[] = [
  { label: 'Category A', data: [12, 16, 14, 20, 18, 24, 22], stackId: 'total' },
  { label: 'Category B', data: [8, 10, 12, 9, 14, 16, 13], stackId: 'total' },
]

/**
 * AreaChartDemo — time-series area chart, single or stacked, gradient-filled.
 */
export default function AreaChartDemo() {
  return (
    <DocPage
      title="AreaChart"
      badge="stable"
      summary="Time-series area chart on ECharts — single or stacked, with a gradient fill from each series' resolved color to transparent."
    >
      <DocSection id="usage" title="Usage">
        <Prose>
          <Code>categories</Code> is the x-axis (typically dates or labels); each{' '}
          <Code>series</Code> entry aligns 1:1 with it.
        </Prose>
        <Demo
          title="Single series"
          code={`import { AreaChart } from '@fams/ui-kit'

<AreaChart
  categories={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
  series={[{ label: 'Series A', data: [24, 30, 27, 41, 38, 52, 46] }]}
  aria-label="Series A trend across the week"
/>`}
        >
          <AreaChart categories={DAYS} series={SINGLE_SERIES} aria-label="Series A trend across the week" />
        </Demo>
      </DocSection>

      <DocSection id="variants" title="Stacked & unsmoothed">
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'Stacked, smoothed',
              caption: 'default smooth={true}',
              node: (
                <div className="w-full">
                  <AreaChart
                    categories={DAYS}
                    series={STACKED_SERIES}
                    stacked
                    height={220}
                    aria-label="Stacked area chart of Category A and B"
                  />
                </div>
              ),
            },
            {
              label: 'Unsmoothed',
              caption: 'smooth={false}',
              node: (
                <div className="w-full">
                  <AreaChart
                    categories={DAYS}
                    series={SINGLE_SERIES}
                    smooth={false}
                    height={220}
                    aria-label="Series A trend, straight segments"
                  />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="axis-titles" title="Axis titles">
        <Prose>
          <Code>xAxisTitle</Code>/<Code>yAxisTitle</Code> render as the ECharts axis name in muted
          ink; the plot inset grows to reserve their band, so a titled axis never clips against the
          card edge. The value-axis title is rotated explicitly, so it still reads correctly once
          the axis mirrors under <Code>dir=&quot;rtl&quot;</Code>.
        </Prose>
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'Titled axes',
              caption: 'xAxisTitle / yAxisTitle',
              node: (
                <div className="w-full">
                  <AreaChart
                    categories={DAYS}
                    series={SINGLE_SERIES}
                    xAxisTitle="Day"
                    yAxisTitle="Hours"
                    height={240}
                    aria-label="Hours per day — area chart with titled axes"
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
              description: 'X-axis category values — one per data point.',
            },
            {
              prop: 'series',
              type: 'AreaChartSeries[]',
              required: true,
              description:
                'One or more series: { id?, label, data, colorIndex?, color?, stackId? }. `color` is the non-categorical escape hatch — a token reference such as "var(--color-primary)" that wins over `colorIndex` for the fill, the legend swatch and the tooltip dot.',
            },
            {
              prop: 'stacked',
              type: 'boolean',
              default: 'false',
              description: 'Stacks every series lacking its own stackId under one shared group.',
            },
            {
              prop: 'smooth',
              type: 'boolean',
              default: 'true',
              description: 'Smooths the line/area curve.',
            },
            {
              prop: 'legend',
              type: 'boolean',
              default: 'series.length > 1',
              description: 'Shows a toggleable legend row below the chart.',
            },
            {
              prop: 'valueAxisMin / valueAxisMax',
              type: 'number',
              description:
                'Pinned bounds of the value (y) axis. Omit to let the chart fit the data; pin them to zero-base the scale or to hold one range across a refilter.',
            },
            {
              prop: 'xAxisTitle',
              type: 'string',
              description: 'X-axis title, rendered as the ECharts axis name in muted ink.',
            },
            {
              prop: 'yAxisTitle',
              type: 'string',
              description: 'Y-axis title, rotated 90° so it reads correctly in both directions.',
            },
            {
              prop: 'valueFormatter',
              type: '(value: number) => string',
              default: 'value.toLocaleString()',
              description: 'Formats numeric values for the y-axis and tooltip.',
            },
            {
              prop: 'emptyText',
              type: 'ReactNode',
              description:
                'Rendered in place of the plot when every series is hidden or there is nothing to draw. Without it, hiding the last series paints placeholder geometry (a solid disc, a bare axis frame) rather than an empty state.',
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
            'Use AreaChart when cumulative volume (not just the point values) is part of the story.',
            'Use stacked areas when the series sum to a meaningful total.',
          ]}
          donts={[
            "Don't stack more than 3-4 series — overlapping gradients become hard to read.",
            "Don't use AreaChart for values that can go negative without checking the fill reads sensibly.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Required aria-label describes the chart for assistive tech.',
            'Legend toggle buttons are keyboard-focusable and round-trip through the live ECharts instance.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
