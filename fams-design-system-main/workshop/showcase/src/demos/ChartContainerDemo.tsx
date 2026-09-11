import { useState } from 'react'
import { ChartContainer, type ChartContainerProps } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

/** A minimal, hand-authored EChartsOption — the kind of escape-hatch config a
 *  caller reaches for when none of the higher-level chart composites fit.
 *  Typed via ChartContainerProps['option'] — the app has no direct `echarts`
 *  dependency of its own, only through the workspace-linked @fams/ui-kit. */
const CUSTOM_OPTION: ChartContainerProps['option'] = {
  xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  yAxis: { type: 'value' },
  grid: { top: 16, right: 16, bottom: 16, left: 16, containLabel: true },
  series: [
    { type: 'line', data: [12, 18, 9, 22, 30, 24, 16], smooth: true, symbol: 'none' },
    { type: 'bar', data: [8, 6, 14, 10, 12, 18, 9] },
  ],
}

/**
 * ChartContainerDemo — reference implementation for the sole ECharts-owning
 * primitive. Every other chart composite (BarChart, LineChart, Gauge, …)
 * renders through this; the demo therefore shows it exactly the way an
 * escape-hatch caller would — a raw `EChartsOption`, not a domain shape.
 */
export default function ChartContainerDemo() {
  const [loading, setLoading] = useState(false)

  return (
    <DocPage
      title="ChartContainer"
      badge="stable"
      summary="The one place in the design system that imports ECharts. Owns init/dispose, resize, the compiled token theme, reduced-motion, and RTL — option is forwarded verbatim. Every bar/line/pie/heatmap composite renders through this; reach for it directly only when none of them fit."
    >
      <DocSection id="usage" title="Usage">
        <Prose>
          Pass a full <Code>EChartsOption</Code> — <Code>ChartContainer</Code> never reads into
          series/axis semantics, so any valid ECharts configuration works, including combinations
          none of the higher-level composites expose (here, a line and a bar series sharing one axis).
        </Prose>
        <Demo
          title="Custom option"
          hint="line + bar combo"
          code={`import { ChartContainer } from '@fams/ui-kit'

const option = {
  xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  yAxis: { type: 'value' },
  series: [
    { type: 'line', data: [12, 18, 9, 22, 30, 24, 16], smooth: true, symbol: 'none' },
    { type: 'bar', data: [8, 6, 14, 10, 12, 18, 9] },
  ],
}

<ChartContainer option={option} aria-label="Sample line and bar combination" />`}
        >
          <ChartContainer option={CUSTOM_OPTION} aria-label="Sample line and bar combination" />
        </Demo>
      </DocSection>

      <DocSection id="variants" title="Height & loading">
        <Gallery
          minColRem={18}
          items={[
            {
              label: 'Default height',
              caption: '320px',
              node: (
                <div className="w-72">
                  <ChartContainer option={CUSTOM_OPTION} aria-label="Sample chart, default height" />
                </div>
              ),
            },
            {
              label: 'Fixed height={160}',
              node: (
                <div className="w-72">
                  <ChartContainer option={CUSTOM_OPTION} height={160} aria-label="Sample chart, 160px" />
                </div>
              ),
            },
            {
              label: 'loading',
              node: (
                <div className="w-72">
                  <ChartContainer
                    option={CUSTOM_OPTION}
                    height={160}
                    loading={loading}
                    aria-label="Sample chart, loading state"
                  />
                </div>
              ),
              caption: (
                <button
                  type="button"
                  onClick={() => setLoading((v) => !v)}
                  className="mt-1 text-caption font-medium text-primary hover:underline"
                >
                  Toggle
                </button>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="data-table" title="The data-table twin">
        <Prose>
          A canvas encodes everything in position and colour, neither of which reaches a
          screen-reader user. <Code>dataTable</Code> renders a visually-hidden but keyboard-reachable{' '}
          <Code>&lt;table&gt;</Code> of the same values, linked from the plot via{' '}
          <Code>aria-describedby</Code>. It is a sibling of the <Code>role=&quot;img&quot;</Code>{' '}
          element, not a child — ARIA treats an image&apos;s subtree as presentational. Tab into the
          chart below and the table is announced; nothing changes visually. The chart composites
          (<Code>BarChart</Code>, <Code>LineChart</Code>, <Code>AreaChart</Code>,{' '}
          <Code>DonutChart</Code>, <Code>HeatmapChart</Code>) build this from their own data, so
          callers of those never pass it.
        </Prose>
        <Demo
          title="Visually-hidden twin"
          code={`<ChartContainer
  option={option}
  aria-label="Trips per day — column chart, daily totals Mon to Wed"
  dataTable={{
    caption: 'Trips per day — column chart, daily totals Mon to Wed',
    columns: ['Day', 'Trips'],
    rows: [['Mon', 10], ['Tue', 20], ['Wed', 15]],
  }}
/>`}
        >
          <ChartContainer
            option={CUSTOM_OPTION}
            aria-label="Sample line and bar combination"
            dataTable={{
              caption: 'Sample line and bar combination',
              columns: ['Category', 'Bars', 'Line'],
              rows: [
                ['A', 12, 30],
                ['B', 24, 26],
                ['C', 18, 34],
              ],
            }}
          />
        </Demo>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'option',
              type: 'EChartsOption',
              required: true,
              description: 'Full ECharts option object, forwarded verbatim.',
            },
            {
              prop: 'loading',
              type: 'boolean',
              default: 'false',
              description: 'Shows a token-styled Skeleton over the (still-mounted) canvas.',
            },
            {
              prop: 'height',
              type: 'number | string',
              default: '320',
              description: 'Number is px, string is any CSS length.',
            },
            {
              prop: 'isEmpty',
              type: 'boolean',
              default: 'false',
              description:
                'Puts the container in its EMPTY state: the option is replaced with a blank one, so no placeholder geometry (a grey disc, a bare axis frame) is painted, and emptyText takes the plot box instead.',
            },
            {
              prop: 'emptyText',
              type: 'ReactNode',
              default: "'No data'",
              description: 'Message shown when isEmpty.',
            },
            {
              prop: 'dataTable',
              type: '{ caption: string; columns: string[]; rows: (string | number)[][] }',
              description:
                'Visually-hidden, keyboard-reachable <table> twin of the chart values, linked from the plot via aria-describedby. The chart composites build this from their own data.',
            },
            {
              prop: 'aria-label',
              type: 'string',
              required: true,
              description: 'Accessible description applied to the role="img" wrapper.',
            },
            {
              prop: 'renderer',
              type: "'canvas' | 'svg'",
              default: "'canvas'",
              description: "'svg' is crisper at low density and exportable; also required under jsdom/automated tests.",
            },
            {
              prop: 'onChartReady',
              type: '(chart: ECharts) => void',
              description: 'Escape hatch invoked once after echarts.init, before the first setOption — wire chart.on(...) handlers here.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Reach for one of the higher-level chart composites (BarChart, LineChart, Gauge, …) first — they cover the common shapes.',
            'Use ChartContainer directly only for a genuinely custom ECharts configuration the composites don’t expose.',
            'Always provide a real aria-label — the canvas/SVG ECharts renders carries no text semantics of its own.',
          ]}
          donts={[
            "Don't import echarts anywhere else in a feature — this is the one sanctioned integration point.",
            "Don't mutate option in place between renders; pass a new object so React and ECharts' notMerge semantics agree.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Wrapper renders role="img" with the supplied aria-label — required, not optional.',
            'aria-busy reflects the loading prop while the overlay is shown.',
            'animation is force-disabled when the OS prefers-reduced-motion setting is active.',
            'Direction is read from the nearest ancestor [dir] (or <html dir>) so RTL pages get a correctly mirrored wrapper.',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          Registers the compiled <Code>@fams/tokens/theme.echarts.json</Code> palette as the{' '}
          <Code>'fams'</Code> ECharts theme once, at module load. Every chart composite built on
          top (<Code>BarChart</Code>, <Code>AreaChart</Code>, <Code>DonutChart</Code>,{' '}
          <Code>Gauge</Code>, <Code>LineChart</Code>, <Code>HeatmapChart</Code>,{' '}
          <Code>Sparkline</Code>, <Code>CompareBars</Code>, <Code>ComplianceGauge</Code>) shares
          this same instance-lifecycle and theme — none of them touch <Code>echarts</Code> directly.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
