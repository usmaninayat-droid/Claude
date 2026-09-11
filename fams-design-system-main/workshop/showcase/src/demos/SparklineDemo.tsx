import { Sparkline } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList } from '../docs'

const TREND_UP = [12, 14, 11, 18, 22, 19, 26, 30, 28, 34]
const TREND_DOWN = [34, 30, 31, 26, 22, 24, 18, 15, 13, 10]

const ROWS = [
  { label: 'Metric A', data: TREND_UP },
  { label: 'Metric B', data: TREND_DOWN },
  { label: 'Metric C', data: [20, 21, 19, 22, 20, 23, 21, 22, 24, 22] },
]

/**
 * SparklineDemo — tiny inline trend indicator. The whole point of Sparkline
 * is embedding it in dense contexts, so the primary examples here are inline
 * in a sentence and inline in a table-like cell — not a standalone chart.
 */
export default function SparklineDemo() {
  return (
    <DocPage
      title="Sparkline"
      badge="stable"
      summary="Tiny inline trend indicator, on ECharts. No axes, grid, or tooltip — meant to embed inside dense contexts like a KpiTile or a table cell where a full LineChart/AreaChart would be visual noise."
    >
      <DocSection id="usage" title="Usage — inline in a sentence">
        <Prose>
          Sparkline sizes to its container — set an explicit width/height on the wrapper, not the
          component itself, when inlining it in running text.
        </Prose>
        <Demo
          title="Inline sparkline"
          code={`import { Sparkline } from '@fams/ui-kit'

{/* Sparkline renders a <div> (ECharts host), so embed it in a text-flow
    element that legally contains block descendants — a <div>, not a <p>. */}
<div className="text-body-md">
  Metric A trended up this period{' '}
  <span className="inline-block h-4 w-16 align-middle">
    <Sparkline data={[12, 14, 11, 18, 22, 19, 26, 30, 28, 34]} aria-label="Metric A, trending up" />
  </span>
  , closing 34% above the period start.
</div>`}
        >
          <div className="text-body-md text-foreground">
            Metric A trended up this period{' '}
            <span className="inline-block h-4 w-16 align-middle">
              <Sparkline data={TREND_UP} aria-label="Metric A, trending up" />
            </span>
            , closing 34% above the period start.
          </div>
        </Demo>
      </DocSection>

      <DocSection id="cell" title="Inline in a table cell">
        <Prose>
          The same pattern inside a row-based layout — one sparkline per row, sized to the column.
        </Prose>
        <Demo title="Table-cell usage" bare>
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full border-collapse text-start text-body-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-caption uppercase tracking-widest text-muted-foreground">
                  <th className="px-4 py-2.5 text-start font-semibold">Metric</th>
                  <th className="px-4 py-2.5 text-start font-semibold">Trend</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-foreground">{row.label}</td>
                    <td className="px-4 py-3">
                      <div className="h-8 w-24">
                        <Sparkline data={row.data} aria-label={`${row.label}, recent trend`} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Demo>
      </DocSection>

      <DocSection id="variants" title="Line vs. area">
        <Gallery
          minColRem={12}
          items={[
            {
              label: 'variant="line"',
              caption: 'default',
              node: (
                <div className="h-8 w-32">
                  <Sparkline data={TREND_UP} aria-label="Trending up" />
                </div>
              ),
            },
            {
              label: 'variant="area"',
              node: (
                <div className="h-8 w-32">
                  <Sparkline data={TREND_UP} variant="area" aria-label="Trending up, area fill" />
                </div>
              ),
            },
            {
              label: 'colorIndex={4}',
              caption: 'trending down',
              node: (
                <div className="h-8 w-32">
                  <Sparkline data={TREND_DOWN} colorIndex={4} aria-label="Trending down" />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'data', type: 'number[]', required: true, description: 'Numeric values plotted left to right, evenly spaced.' },
            { prop: 'variant', type: "'line' | 'area'", default: "'line'", description: 'Stroke only, or gradient-filled beneath the line.' },
            { prop: 'colorIndex', type: 'BadgeColorIndex', default: '1', description: 'Categorical swatch, one of --color-chart-1..5.' },
            { prop: 'smooth', type: 'boolean', default: 'true', description: 'Smooths the line curve.' },
            { prop: 'height', type: 'number | string', default: '32', description: 'Number is px, string is any CSS length.' },
            { prop: 'loading', type: 'boolean', default: 'false', description: 'Shows the ChartContainer loading overlay.' },
            {
              prop: 'aria-label',
              type: 'string',
              required: true,
              description: 'Required accessible description of the trend, e.g. "Trips, last 7 days, trending up".',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Size the wrapping element, not Sparkline itself, to control its footprint inline.',
            'Use it in KpiTile, table cells, or list rows — anywhere a full chart would be too heavy.',
          ]}
          donts={[
            "Don't add axes, grid, or a tooltip expectation — Sparkline intentionally has none.",
            "Don't use Sparkline as a standalone full-size chart — reach for LineChart/AreaChart instead.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Required aria-label should describe the trend in words (e.g. "trending up"), since the shape carries no text.',
            'Purely decorative-adjacent — always paired with a labeled metric nearby, never the sole indicator of a value.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
