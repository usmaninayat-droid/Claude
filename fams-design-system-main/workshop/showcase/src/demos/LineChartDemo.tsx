import { LineChart, type LineChartSeries } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SINGLE_SERIES: LineChartSeries[] = [{ label: 'Series A', data: [24, 30, 27, 41, 38, 52, 46] }]

const MULTI_SERIES: LineChartSeries[] = [
  { label: 'Series A', data: [24, 30, 27, 41, 38, 52, 46] },
  { label: 'Series B', data: [18, 22, 25, 20, 30, 28, 34] },
]

const DUAL_AXIS_SERIES: LineChartSeries[] = [
  { label: 'Fuel', data: [120, 140, 118, 152, 138, 165, 149], unit: 'L' },
  { label: 'Distance', data: [820, 910, 780, 1040, 950, 1120, 1010], unit: 'km', axis: 'trailing' },
]

const TARGET_SERIES: LineChartSeries[] = [
  { label: 'Actual', data: [24, 30, 27, 41, 38, 52, 46] },
  { label: 'Target', data: [35, 35, 35, 35, 35, 35, 35], dashed: true },
]

/**
 * LineChartDemo — time-series line chart, single or multi-series, with
 * optional markers and dashed target/forecast overlays.
 */
export default function LineChartDemo() {
  return (
    <DocPage
      title="LineChart"
      badge="stable"
      summary="Time-series line chart on ECharts — single or multi-series, unfilled. Use over AreaChart when the values themselves (not cumulative volume) are the story."
    >
      <DocSection id="usage" title="Usage">
        <Prose>
          Same category-axis time-series shape as <Code>AreaChart</Code>, without the fill.
        </Prose>
        <Demo
          title="Multi-series"
          code={`import { LineChart } from '@fams/ui-kit'

<LineChart
  categories={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
  series={[
    { label: 'Series A', data: [24, 30, 27, 41, 38, 52, 46] },
    { label: 'Series B', data: [18, 22, 25, 20, 30, 28, 34] },
  ]}
  aria-label="Series A and B trend across the week"
/>`}
        >
          <LineChart categories={DAYS} series={MULTI_SERIES} aria-label="Series A and B trend across the week" />
        </Demo>
      </DocSection>

      <DocSection id="variants" title="Markers & dashed overlays">
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'With markers',
              caption: 'markers={true}',
              node: (
                <div className="w-full">
                  <LineChart
                    categories={DAYS}
                    series={SINGLE_SERIES}
                    markers
                    height={220}
                    aria-label="Series A trend with point markers"
                  />
                </div>
              ),
            },
            {
              label: 'Dashed target overlay',
              caption: 'dashed: true',
              node: (
                <div className="w-full">
                  <LineChart
                    categories={DAYS}
                    series={TARGET_SERIES}
                    height={220}
                    aria-label="Actual trend against a dashed target line"
                  />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="dual-axis" title="Axis titles & the dual-axis exception">
        <Prose>
          A second value scale invents a correlation the data does not contain — the crossing point
          is an artefact of two arbitrary scales. Reach for two charts, or one chart with both
          series indexed to a common base, first. When a design mandates it, set{' '}
          <Code>axis: &apos;trailing&apos;</Code> on the series: the legend is then forced above the
          plot naming each series <em>and</em> its axis, and each series&apos; <Code>unit</Code>
          {' '}appears in the tooltip. The axes are named leading/trailing, never left/right — which
          physical side each lands on flips under <Code>dir=&quot;rtl&quot;</Code>.
        </Prose>
        <Demo
          title="Dual value axis"
          code={`<LineChart
  categories={days}
  series={[
    { label: 'Fuel', data: [...], unit: 'L' },
    { label: 'Distance', data: [...], unit: 'km', axis: 'trailing' },
  ]}
  yAxisTitle="Fuel (L)"
  yAxisTitleTrailing="Distance (km)"
  xAxisTitle="Day"
  aria-label="Fuel consumed over distance — dual-axis line chart, fuel in litres on the leading axis and distance in kilometres on the trailing axis"
/>`}
        >
          <LineChart
            categories={DAYS}
            series={DUAL_AXIS_SERIES}
            xAxisTitle="Day"
            yAxisTitle="Fuel (L)"
            yAxisTitleTrailing="Distance (km)"
            aria-label="Fuel consumed over distance — dual-axis line chart, fuel in litres on the leading axis and distance in kilometres on the trailing axis, over seven days"
          />
        </Demo>
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'Axis titles only',
              caption: 'xAxisTitle / yAxisTitle',
              node: (
                <div className="w-full">
                  <LineChart
                    categories={DAYS}
                    series={SINGLE_SERIES}
                    xAxisTitle="Day"
                    yAxisTitle="Score"
                    height={240}
                    aria-label="Score per day — line chart with titled axes"
                  />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="color-axis-legend" title="Token-bound color & pinned axis ranges">
        <Prose>
          <Code>series[].color</Code> binds a series to a token the categorical palette cannot
          express (the brand measure, a semantic status). On a dual-axis chart,{' '}
          <Code>yAxisMin</Code>/<Code>yAxisMax</Code> and{' '}
          <Code>yAxisTrailingMin</Code>/<Code>yAxisTrailingMax</Code> zero-base BOTH scales — two
          independently fitted axes pin unrelated traces on top of each other and invent a
          correlation the data does not contain.
        </Prose>
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'Token-bound series',
              caption: "series[].color = 'var(--color-primary)'",
              node: (
                <div className="w-full">
                  <LineChart
                    categories={DAYS}
                    series={[{ label: 'Trips', data: [24, 30, 27, 41, 38, 52, 46], color: 'var(--color-primary)' }]}
                    height={220}
                    aria-label="Daily trips, painted in the primary brand color"
                  />
                </div>
              ),
            },
            {
              label: 'Both scales zero-based',
              caption: 'yAxisMin/Max + yAxisTrailingMin/Max',
              node: (
                <div className="w-full">
                  <LineChart
                    categories={DAYS}
                    series={DUAL_AXIS_SERIES}
                    yAxisMin={0}
                    yAxisMax={200}
                    yAxisTrailingMin={0}
                    yAxisTrailingMax={1500}
                    yAxisTitle="Litres"
                    yAxisTitleTrailing="km"
                    height={220}
                    aria-label="Fuel and distance on two zero-based scales"
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
              type: 'LineChartSeries[]',
              required: true,
              description:
                "One or more series: { id?, label, data, colorIndex?, color?, dashed?, axis?: 'leading' | 'trailing', unit? }. `color` is the non-categorical escape hatch — a token reference such as \"var(--color-primary)\" that wins over `colorIndex` for the stroke, the legend swatch and the tooltip dot.",
            },
            { prop: 'smooth', type: 'boolean', default: 'true', description: 'Smooths the line curve.' },
            { prop: 'markers', type: 'boolean', default: 'false', description: 'Shows a symbol at every data point.' },
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
                'Where the legend row sits relative to the plot. A dual-axis chart always forces "top" — the legend is the reader’s only key to which axis a line belongs to.',
            },
            {
              prop: 'yAxisMin / yAxisMax',
              type: 'number',
              description:
                'Pinned bounds of the LEADING value axis. Omit to let the chart fit the data.',
            },
            {
              prop: 'yAxisTrailingMin / yAxisTrailingMax',
              type: 'number',
              description:
                'Pinned bounds of the TRAILING value axis. Zero-base both scales rather than letting two independent fits pin unrelated traces together and invent a correlation.',
            },
            {
              prop: 'xAxisTitle',
              type: 'string',
              description: 'X-axis title, rendered as the ECharts axis name in muted ink.',
            },
            {
              prop: 'yAxisTitle',
              type: 'string',
              description: 'Leading (primary) value-axis title, rotated 90° so it reads correctly in both directions.',
            },
            {
              prop: 'yAxisTitleTrailing',
              type: 'string',
              description: "Trailing (secondary) value-axis title. Only rendered when a series sets axis: 'trailing'.",
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
                'Rendered in place of the plot when every series is hidden or there is nothing to draw — otherwise a fully de-selected chart leaves a bare axis frame.',
            },
            { prop: 'height', type: 'number | string', default: '320', description: 'Number is px, string is any CSS length.' },
            { prop: 'loading', type: 'boolean', default: 'false', description: 'Shows a loading overlay via ChartContainer.' },
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
            'Use dashed for forecast/target overlays so they read as distinct from measured series.',
            'Enable markers for sparse series where individual readings matter.',
          ]}
          donts={[
            "Don't enable markers on dense, long time-series — it adds visual noise without adding information.",
            "Don't use LineChart when cumulative volume matters — use AreaChart instead.",
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
