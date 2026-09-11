import { DonutChart, type DonutChartDatum } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

const DATA: DonutChartDatum[] = [
  { label: 'Category A', value: 42 },
  { label: 'Category B', value: 28 },
  { label: 'Category C', value: 18 },
  { label: 'Category D', value: 12 },
]

/**
 * DonutChartDemo — proportional-share donut, always rendered with rounded
 * segment corners (a fixed itemStyle.borderRadius, not a caller-facing prop).
 */
export default function DonutChartDemo() {
  return (
    <DocPage
      title="DonutChart"
      badge="stable"
      summary="Proportional-share donut/pie on ECharts, with rounded segment corners by default. Composes ChartLegend for the series key and ChartTooltip for hover content."
    >
      <DocSection id="usage" title="Usage">
        <Prose>
          <Code>data</Code> is a flat list of labeled magnitudes — percentages are computed by
          ECharts, not supplied. Segment corners are always rounded, carving a visible gap to
          whatever sits behind the chart.
        </Prose>
        <Demo
          title="Rounded segments, bottom legend"
          code={`import { DonutChart } from '@fams/ui-kit'

<DonutChart
  data={[
    { label: 'Category A', value: 42 },
    { label: 'Category B', value: 28 },
    { label: 'Category C', value: 18 },
    { label: 'Category D', value: 12 },
  ]}
  aria-label="Distribution across four categories"
/>`}
        >
          <DonutChart data={DATA} aria-label="Distribution across four categories" />
        </Demo>
      </DocSection>

      <DocSection id="variants" title="Center label, legend placement & counts">
        <Gallery
          minColRem={18}
          items={[
            {
              label: 'Center label',
              caption: 'centerLabel',
              node: (
                <div className="w-56">
                  <DonutChart
                    data={DATA}
                    height={220}
                    centerLabel={
                      <div>
                        <div className="text-h4 font-bold text-foreground">100</div>
                        <div className="text-caption text-muted-foreground">Total</div>
                      </div>
                    }
                    aria-label="Distribution across four categories, with total in the center"
                  />
                </div>
              ),
            },
            {
              label: "legend='end'",
              caption: 'side-by-side',
              node: (
                <div className="w-72">
                  <DonutChart data={DATA} height={180} legend="end" aria-label="Distribution with side legend" />
                </div>
              ),
            },
            {
              label: 'showCounts',
              node: (
                <div className="w-56">
                  <DonutChart
                    data={DATA}
                    height={220}
                    showCounts
                    aria-label="Distribution with value counts in legend"
                  />
                </div>
              ),
            },
            {
              label: "legend='none'",
              node: (
                <div className="w-56">
                  <DonutChart data={DATA} height={180} legend="none" aria-label="Distribution, no legend" />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="values" title="Where the segment values go">
        <Prose>
          Values are never drawn inside an arc: white numerals on a categorical fill measure
          2.3–2.6:1, below even the large-text floor. The legend&apos;s count chips carry the
          numbers by default (<Code>showCounts</Code>); <Code>valueLabels=&quot;outside&quot;</Code>
          {' '}puts them on a leader line in primary ink instead. <Code>centerLabel</Code> takes any
          React content and is clamped to the hole, so a value + caption stack composes without
          spilling over the arc.
        </Prose>
        <Gallery
          minColRem={20}
          items={[
            {
              label: 'Values outside the arc',
              caption: "valueLabels='outside'",
              node: (
                <div className="w-full">
                  <DonutChart
                    data={DATA}
                    valueLabels="outside"
                    height={240}
                    aria-label="Distribution across four categories, with values on leader lines"
                  />
                </div>
              ),
            },
            {
              label: 'Composed centre stack',
              caption: 'centerLabel: value + caption',
              node: (
                <div className="w-full">
                  <DonutChart
                    data={DATA}
                    innerRadius={62}
                    height={240}
                    centerLabel={
                      <>
                        <span className="text-heading-md font-semibold text-foreground">100</span>
                        <span className="text-caption text-muted-foreground">events</span>
                      </>
                    }
                    aria-label="Distribution across four categories, 100 events in total"
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
              prop: 'data',
              type: 'DonutChartDatum[]',
              required: true,
              description:
                'Segments to render: { id?, label, value, colorIndex?, color? }. `color` is the non-categorical escape hatch — a token reference such as "var(--color-error-500)" for a slice that IS a status, winning over `colorIndex` for the arc, the legend swatch and the tooltip dot.',
            },
            {
              prop: 'centerLabel',
              type: 'ReactNode',
              description: 'Content rendered centered over the donut hole (e.g. a total/KPI value).',
            },
            {
              prop: 'legend',
              type: "'bottom' | 'end' | 'none'",
              default: "'bottom'",
              description: 'Legend placement, or omit it entirely.',
            },
            {
              prop: 'showCounts',
              type: 'boolean',
              default: 'true',
              description:
                "Renders each legend item's value as a trailing count chip — the legend is where segment values live, because in-arc numerals fail contrast.",
            },
            {
              prop: 'valueLabels',
              type: "'none' | 'outside'",
              default: "'none'",
              description:
                "'outside' draws segment values beyond the arc on a leader line in primary ink. There is deliberately no in-arc option.",
            },
            {
              prop: 'hiddenIds',
              type: 'string[]',
              default: '[]',
              description: 'Ids currently hidden from the donut and dimmed in the legend. Controlled.',
            },
            {
              prop: 'onToggle',
              type: '(id: string) => void',
              description: 'Presence makes the legend interactive.',
            },
            {
              prop: 'innerRadius',
              type: 'number',
              default: '60',
              description: "Donut hole radius, percent of the chart's bounding box.",
            },
            {
              prop: 'outerRadius',
              type: 'number',
              default: '90',
              description: 'Outer segment radius, percent of the bounding box.',
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
            'Use a centerLabel to surface the total when segments represent parts of a whole.',
            "Keep the segment count to 5-6 or fewer — beyond that, prefer a BarChart.",
          ]}
          donts={[
            "Don't rely on color alone to distinguish segments — the legend labels are required reading.",
            "Don't pass pre-computed percentages as value — supply raw magnitudes and let ECharts compute the share.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Required aria-label describes the chart for assistive tech.',
            'onToggle presence is what makes legend buttons interactive/keyboard-focusable — omit it for a static legend.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
