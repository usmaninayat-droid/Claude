import {
  ChartTooltip,
  type ChartTooltipItem,
} from '../../../../packages/ui-kit/src/composites/ChartTooltip'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * ChartTooltipDemo — reference implementation of the standard component-page
 * template for a chart-scaffold composite. ChartTooltip is a pure presenter
 * over caller-supplied items (no chart engine binding), so its variance is
 * shown as a single Gallery rather than a generic Playground.
 */

const SINGLE_SERIES: ChartTooltipItem[] = [{ label: 'Trips', value: 128 }]

const MULTI_SERIES: ChartTooltipItem[] = [
  { label: 'Lot 1 — Lavajet', value: 384, colorIndex: 1 },
  { label: 'Lot 2 — Lavajet', value: 281, colorIndex: 2 },
  { label: 'Lot 7 — Alphamed', value: 96, colorIndex: 3 },
]

export default function ChartTooltipDemo() {
  return (
    <DocPage
      title="ChartTooltip"
      badge="stable"
      summary="Presentational tooltip content shell for chart hover states — not bound to Recharts or any chart engine. A chart adapter maps its own hover event to items; colors are colorIndex-only, never raw hex."
    >
      <DocSection id="examples" title="Examples">
        <Prose>
          <Code>title</Code> is optional — omit it for a single-series tooltip with no heading
          row. <Code>colorIndex</Code> on an item is optional too; omit it to skip that item's dot.
        </Prose>
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'Single series',
              caption: 'no title, no dot',
              node: <ChartTooltip items={SINGLE_SERIES} />,
            },
            {
              label: 'Multi-series with title',
              caption: 'title = hovered x-axis label',
              node: <ChartTooltip title="2026-06-08" items={MULTI_SERIES} />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'items',
              type: 'ChartTooltipItem[]',
              required: true,
              description:
                'One row per series/category, in display order: { label, value, colorIndex?, color? }. `color` overrides the categorical dot for a series bound to a NON-categorical token.',
            },
            {
              prop: 'title',
              type: 'ReactNode',
              description: 'Optional heading row — typically the hovered x-axis label or timestamp.',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLDivElement>, 'title'>",
              description: 'className and any div attribute pass through.',
            },
          ]}
        />
        <Prose>
          Each <Code>ChartTooltipItem</Code> is{' '}
          <Code>{'{ label, value, colorIndex?, color? }'}</Code> —{' '}
          <Code>colorIndex</Code> maps onto the same <Code>--color-chart-1..5</Code> palette as{' '}
          <Code>ChartLegend</Code> and <Code>Badge</Code>, so a series stays the same colour across
          legend, dot, and tooltip.
        </Prose>
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use the same colorIndex per series across the tooltip, legend, and chart marks.',
            'Pass a pre-formatted title (date/time string) — the component does no formatting itself.',
            'Reuse this shell for any chart engine\'s custom-tooltip callback instead of hand-building dark chrome.',
            'Keep items short — one row per series/category, not a full data dump.',
          ]}
          donts={[
            "Don't pass a raw color/hex — colorIndex is the only supported channel.",
            "Don't bind this component to a specific chart engine's payload shape — map to items in the adapter.",
            "Don't use bg-popover for a custom dark tooltip — this component already owns the correct inverse surface.",
            "Don't add interactive controls inside the tooltip; it is a passive hover presenter.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders with role="tooltip" so assistive tech announces it as transient, non-modal content.',
            'Meets WCAG 2.2 AA contrast on its dark surface (bg-foreground / text-background pairing).',
            'The colour dot is decorative; the label text always carries the series identity.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
