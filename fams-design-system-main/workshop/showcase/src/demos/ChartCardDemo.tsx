import { Activity, Download, Fuel, TrendingUp } from '@fams/ui-kit/icons'
import { Button } from '@fams/ui-kit'
import { ChartCard } from '../../../../packages/ui-kit/src/composites/ChartCard'
import { ChartLegend, type ChartLegendItem } from '../../../../packages/ui-kit/src/composites/ChartLegend'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/** A dependency-free bar-chart placeholder — ChartCard is chart-engine-agnostic, so demos never import a chart lib. */
function BarsPlaceholder({ heights }: { heights: string[] }) {
  return (
    <div className="flex h-40 w-full items-end gap-2">
      {heights.map((h, i) => (
        <div key={i} className={`flex-1 rounded-xs bg-primary/70 ${h}`} />
      ))}
    </div>
  )
}

const FUEL_LEGEND: ChartLegendItem[] = [
  { id: 'consumed', label: 'Consumed', colorIndex: 1, value: 842 },
  { id: 'theft', label: 'Flagged theft', colorIndex: 4, value: 12 },
]

/**
 * ChartCardDemo — reference implementation of the standard component-page
 * template for a chart-scaffold composite. ChartCard is chart-engine-agnostic
 * chrome only, so there is no Playground here — the meaningful surface area
 * is the header/legend/body composition, shown as Galleries per dimension.
 */
export default function ChartCardDemo() {
  return (
    <DocPage
      title="ChartCard"
      badge="stable"
      summary="Chart-agnostic chrome — icon + title/subtitle, actions, expand, an optional legend row, and a padded body slot. No chart engine lives here; children is whatever the caller renders. Consolidates the reference's chart-card and WidgetCard into one."
    >
      <DocSection id="header" title="Header & legend">
        <Prose>
          The header always renders title (and optional subtitle); everything else — icon,
          actions, expand — is opt-in. A <Code>legend</Code> row, if supplied, sits between the
          header and the body behind its own border.
        </Prose>
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'Minimal',
              caption: 'title only',
              node: (
                <div className="w-72">
                  <ChartCard title="Trips this week">
                    <BarsPlaceholder heights={['h-8', 'h-12', 'h-6', 'h-16', 'h-10', 'h-12', 'h-4']} />
                  </ChartCard>
                </div>
              ),
            },
            {
              label: 'Icon + subtitle + actions + expand',
              node: (
                <div className="w-72">
                  <ChartCard
                    title="Fleet utilization"
                    subtitle="Last 30 days · all lots"
                    icon={Activity}
                    iconTone="info"
                    actions={
                      <Button variant="ghost" size="icon" aria-label="Download report">
                        <Download />
                      </Button>
                    }
                    onExpand={() => {}}
                  >
                    <BarsPlaceholder heights={['h-10', 'h-16', 'h-8', 'h-12', 'h-16', 'h-6', 'h-10', 'h-4']} />
                  </ChartCard>
                </div>
              ),
            },
            {
              label: 'With a legend row',
              node: (
                <div className="w-72">
                  <ChartCard
                    title="Fuel theft events"
                    icon={Fuel}
                    iconTone="warning"
                    legend={<ChartLegend items={FUEL_LEGEND} showCounts />}
                  >
                    <BarsPlaceholder heights={['h-6', 'h-10', 'h-16', 'h-8', 'h-12']} />
                  </ChartCard>
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="body" title="Body sizing">
        <Prose>
          <Code>bodyPadding</Code> controls the gap around the body slot only — header/legend
          padding is fixed. <Code>bodyHeight</Code> pins the body to an exact size, useful when a
          chart engine needs a definite height to measure against.
        </Prose>
        <Gallery
          minColRem={22}
          maxCols={2}
          items={[
            ...(['none', 'sm', 'md', 'lg'] as const).map((padding) => ({
              label: `bodyPadding="${padding}"`,
              node: (
                <div className="w-56">
                  <ChartCard title={padding} bodyPadding={padding} icon={TrendingUp}>
                    <div className="h-16 rounded-xs bg-primary/70" />
                  </ChartCard>
                </div>
              ),
            })),
            {
              label: 'bodyHeight={200}',
              caption: 'fixed body height',
              node: (
                <div className="w-72">
                  <ChartCard title="Live tracking density" bodyHeight={200}>
                    <div className="flex size-full items-center justify-center rounded-xs bg-muted text-body-sm text-muted-foreground">
                      200px fixed body
                    </div>
                  </ChartCard>
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
              prop: 'title',
              type: 'ReactNode',
              required: true,
              description: 'Chart/widget title, rendered as the header heading.',
            },
            {
              prop: 'subtitle',
              type: 'ReactNode',
              description: 'Optional supporting line rendered below the title.',
            },
            {
              prop: 'icon',
              type: 'LucideIcon',
              description: 'Leading icon, rendered inside an IconBadge. Omit for a card with no icon.',
            },
            {
              prop: 'iconTone',
              type: "'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'",
              default: "'primary'",
              description: 'Tint passed straight through to the IconBadge. Ignored if icon is omitted.',
            },
            {
              prop: 'actions',
              type: 'ReactNode',
              description: 'Buttons/menu rendered top-right of the header, before the expand button.',
            },
            {
              prop: 'onExpand',
              type: '() => void',
              description: 'Shows a top-right expand affordance; invoked on click. Omit to hide it.',
            },
            {
              prop: 'expandLabel',
              type: 'string',
              default: "'Expand chart'",
              description: 'Accessible label for the expand button.',
            },
            {
              prop: 'legend',
              type: 'ReactNode',
              description: 'Legend row rendered between the header and the body (e.g. a ChartLegend).',
            },
            {
              prop: 'bodyPadding',
              type: "'none' | 'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Padding around the body content.',
            },
            {
              prop: 'bodyHeight',
              type: 'number | string',
              description: 'Fixed body height — number is px, string is any CSS length. Omit for auto/intrinsic height.',
            },
            {
              prop: 'children',
              type: 'ReactNode',
              required: true,
              description: 'The chart/graphic body. Chart-agnostic — any node.',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLDivElement>, 'title'>",
              description: 'className and any div attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use ChartCard as the outer chrome for any chart/graphic widget — keep the chart engine entirely inside children.',
            'Pass a ChartLegend into legend to keep the series key visually separated from the header and body.',
            'Use bodyHeight when the chart engine needs a definite height to measure against (e.g. a responsive container).',
            'Reach for onExpand only when there is a real expanded view to open — a modal or a larger grid span.',
          ]}
          donts={[
            "Don't import a chart engine into the card itself — it stays chart-agnostic by design.",
            "Don't stack more than one primary action in actions; keep it to icon buttons or a single menu trigger.",
            "Don't hand-roll the icon chip — reuse icon/iconTone instead of a custom avatar.",
            "Don't rely on bodyPadding for spacing above the legend — the legend row already owns its own border and padding.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Title renders as an <h3>, keeping heading order correct relative to the surrounding page.',
            'The expand button is icon-only and always carries an explicit aria-label via expandLabel.',
            'Header, legend, and body follow DOM order, so assistive tech reaches the title before the chart body.',
            'Layout uses logical flex, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
