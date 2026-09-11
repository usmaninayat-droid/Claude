import { useState } from 'react'
import { ChartLegend, type ChartLegendItem } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * ChartLegendDemo — reference implementation of the standard component-page
 * template for a chart-scaffold composite. ChartLegend is a presenter over
 * caller-supplied items (no chart engine involved), so variants are shown as
 * Galleries per dimension rather than a generic Playground.
 */

const LOT_SERIES: ChartLegendItem[] = [
  { id: 'lot1', label: 'Lot 1 — Lavajet', colorIndex: 1, value: 128 },
  { id: 'lot2', label: 'Lot 2 — Lavajet', colorIndex: 2, value: 96 },
  { id: 'lot7', label: 'Lot 7 — Alphamed', colorIndex: 3, value: 54 },
  { id: 'lot8', label: 'Lot 8 — Alphamed', colorIndex: 4, value: 31 },
]

/** `trailing` pins free content to the end of a row — here, which value axis
 *  each series is measured against (leading/trailing, never left/right). */
const AXIS_SERIES: ChartLegendItem[] = [
  { id: 'fuel', label: 'Fuel', colorIndex: 1, value: 149, trailing: 'leading axis' },
  { id: 'distance', label: 'Distance', colorIndex: 2, value: 1010, trailing: 'trailing axis' },
]

const HEAT_BUCKETS: ChartLegendItem[] = [
  { id: 'low', label: 'Low', colorIndex: 9 },
  { id: 'medium', label: 'Medium', colorIndex: 6 },
  { id: 'high', label: 'High', colorIndex: 3 },
  { id: 'critical', label: 'Critical', colorIndex: 1 },
]

export default function ChartLegendDemo() {
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [hiddenIdsVertical, setHiddenIdsVertical] = useState<string[]>(['lot2'])

  const toggle = (setter: (fn: (prev: string[]) => string[]) => void) => (id: string) =>
    setter((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))

  return (
    <DocPage
      title="ChartLegend"
      badge="stable"
      summary="Labeled color-swatch list for chart series. Consolidates the reference's hover/toggle legend, its background+counter variant, and its static HeatLegend bucket strip into one presenter — colors are colorIndex-only, never raw hex."
    >
      <DocSection id="display" title="Display options">
        <Prose>
          A legend rendered with no <Code>onToggle</Code> covers the static case for free — the
          same component serves a fixed legend key (e.g. a heat-bucket strip) with zero extra API.
        </Prose>
        <Gallery
          minColRem={14}
          items={[
            { label: 'Static', caption: 'no onToggle', node: <ChartLegend items={LOT_SERIES} /> },
            {
              label: 'With counts',
              caption: 'showCounts',
              node: <ChartLegend items={LOT_SERIES} showCounts />,
            },
            {
              label: 'Tinted background',
              caption: 'tinted',
              node: <ChartLegend items={LOT_SERIES} showCounts tinted />,
            },
            {
              label: 'Vertical',
              caption: 'orientation="vertical"',
              node: <ChartLegend items={LOT_SERIES} orientation="vertical" />,
            },
            {
              label: 'Static heat-bucket key',
              caption: 'HeatLegend equivalent',
              node: <ChartLegend items={HEAT_BUCKETS} />,
            },
            {
              label: 'Trailing slot',
              caption: 'item.trailing',
              node: <ChartLegend items={AXIS_SERIES} orientation="vertical" showCounts />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="interactive" title="Interactive toggling">
        <Prose>
          Presence of <Code>onToggle</Code> makes the legend interactive: items become buttons and{' '}
          <Code>hiddenIds</Code> is fully controlled by the caller, kept in lockstep with the
          chart's own series-visibility state.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'Click to toggle a series',
              node: (
                <ChartLegend
                  items={LOT_SERIES}
                  showCounts
                  hiddenIds={hiddenIds}
                  onToggle={toggle(setHiddenIds)}
                />
              ),
            },
            {
              label: 'Vertical, one series pre-hidden',
              node: (
                <ChartLegend
                  items={LOT_SERIES}
                  orientation="vertical"
                  hiddenIds={hiddenIdsVertical}
                  onToggle={toggle(setHiddenIdsVertical)}
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'items',
              type: 'ChartLegendItem[]',
              required: true,
              description:
                'One entry per series: { id?, label, colorIndex, color?, value?, trailing? }. `color` overrides the categorical swatch for a series bound to a NON-categorical token — the caller resolves the token, this component never writes a hex.',
            },
            {
              prop: 'orientation',
              type: "'horizontal' | 'vertical'",
              default: "'horizontal'",
              description: 'Row (default) or stacked column — vertical suits tall sidebars/panels.',
            },
            {
              prop: 'tinted',
              type: 'boolean',
              default: 'false',
              description: 'Wraps the legend in a tinted bg-muted surface strip.',
            },
            {
              prop: 'showCounts',
              type: 'boolean',
              default: 'false',
              description: "Renders each item's value as a trailing Badge count chip.",
            },
            {
              prop: 'hiddenIds',
              type: 'string[]',
              default: '[]',
              description: 'Ids currently hidden (dimmed + struck through). Controlled — the caller owns this state.',
            },
            {
              prop: 'onToggle',
              type: '(id: string) => void',
              description: 'Presence makes the legend interactive: items become toggle buttons. Omit for a static display.',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLUListElement>, 'onToggle' | 'children'>",
              description: 'className and any ul attribute pass through.',
            },
          ]}
        />
        <Prose>
          Each <Code>ChartLegendItem</Code> is <Code>{'{ id?, label, colorIndex, value? }'}</Code> —{' '}
          <Code>colorIndex</Code> maps onto the <Code>--color-chart-1..5</Code> categorical
          palette, cycling every five; there is deliberately no raw color field.
        </Prose>
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Give every item a stable id whenever the series can reorder or repeat labels.',
            'Pair the legend with a matching ChartTooltip/chart using the same colorIndex per series.',
            'Use tinted for a legend that needs to read as its own surface, e.g. above a dense chart.',
            'Keep onToggle wired to the chart engine’s own series-visibility state, not a separate copy.',
          ]}
          donts={[
            "Don't pass a raw color/hex — colorIndex is the only supported channel.",
            "Don't add onToggle unless the caller actually reacts to it; presence alone changes the semantics to interactive.",
            "Don't mix showCounts on and off within the same view for equivalent legends.",
            "Don't use ChartLegend as a filter control outside chart context — pair with a real chart, not standalone.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders as a <ul> with aria-label="Chart legend"; each entry is a list item.',
            'Interactive items are real <button>s with aria-pressed reflecting visibility, not divs with click handlers.',
            'Hidden items are both dimmed and struck through — state is never conveyed by colour alone.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
