import { CompareBars, type CompareBarsSeries } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

const CATEGORIES = ['Region A', 'Region B', 'Region C', 'Region D']

const TARGET_VS_ACTUAL: CompareBarsSeries[] = [
  { label: 'Target', data: [80, 80, 80, 80] },
  { label: 'Actual', data: [92, 68, 74, 88] },
]

const THREE_WAY: CompareBarsSeries[] = [
  { label: 'Last period', data: [64, 58, 71, 60] },
  { label: 'This period', data: [72, 66, 69, 75] },
  { label: 'Target', data: [80, 80, 80, 80] },
]

const SINGLE_SERIES: CompareBarsSeries[] = [{ label: 'Score', data: [92, 68, 74, 88] }]

/**
 * CompareBarsDemo — always-horizontal, always-grouped per-category
 * comparison chart (e.g. target vs. actual).
 */
export default function CompareBarsDemo() {
  return (
    <DocPage
      title="CompareBars"
      badge="stable"
      summary="Horizontal per-category comparison chart on ECharts — always grouped, never stacked. Each bar renders its formatted value past its tip for at-a-glance reading."
    >
      <DocSection id="usage" title="Usage">
        <Prose>
          Unlike <Code>BarChart</Code>, orientation and stacking are not configurable — the whole
          point of <Code>CompareBars</Code> is side-by-side bars per category.
        </Prose>
        <Demo
          title="Target vs. actual"
          code={`import { CompareBars } from '@fams/ui-kit'

<CompareBars
  categories={['Region A', 'Region B', 'Region C', 'Region D']}
  series={[
    { label: 'Target', data: [80, 80, 80, 80] },
    { label: 'Actual', data: [92, 68, 74, 88] },
  ]}
  aria-label="Target vs actual by region"
/>`}
        >
          <CompareBars categories={CATEGORIES} series={TARGET_VS_ACTUAL} aria-label="Target vs actual by region" />
        </Demo>
      </DocSection>

      <DocSection id="variants" title="Three-way comparison & single series">
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'Three series',
              node: (
                <div className="w-full">
                  <CompareBars
                    categories={CATEGORIES}
                    series={THREE_WAY}
                    height={220}
                    aria-label="Last period, this period, and target by region"
                  />
                </div>
              ),
            },
            {
              label: 'Single series',
              caption: 'no legend',
              node: (
                <div className="w-full">
                  <CompareBars
                    categories={CATEGORIES}
                    series={SINGLE_SERIES}
                    height={220}
                    aria-label="Score by region"
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
            { prop: 'categories', type: 'Array<string | number>', required: true, description: 'Category values, one per row.' },
            {
              prop: 'series',
              type: 'CompareBarsSeries[]',
              required: true,
              description: 'Two or more series rendered as grouped bars: { id?, label, data, colorIndex? }.',
            },
            { prop: 'legend', type: 'boolean', default: 'series.length > 1', description: 'Shows a toggleable legend row below the chart.' },
            {
              prop: 'valueFormatter',
              type: '(value: number) => string',
              default: 'value.toLocaleString()',
              description: 'Formats numeric values for the value axis, end-of-bar labels, and tooltip.',
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
            'Use CompareBars specifically for target-vs-actual or period-over-period comparisons.',
            'Keep category labels short — they sit on the fixed-width category axis.',
          ]}
          donts={[
            "Don't reach for CompareBars when a single series is enough — a plain BarChart is simpler.",
            "Don't use CompareBars for a time series — it has no notion of a continuous axis.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Required aria-label describes the chart for assistive tech.',
            'End-of-bar value labels make the exact reading available without hovering for the tooltip.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
