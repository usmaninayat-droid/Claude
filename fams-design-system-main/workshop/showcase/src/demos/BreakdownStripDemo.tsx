import type { ReactNode } from 'react'
import { BreakdownStrip, type BreakdownStripItem } from '../../../../packages/ui-kit/src/composites/BreakdownStrip'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const FLEET: BreakdownStripItem[] = [
  { id: 'on-route', label: 'On Route', value: 271, tone: 'success' },
  { id: 'idle', label: 'Idle', value: 19, tone: 'lavender' },
  { id: 'standby', label: 'Standby', value: 24, tone: 'info' },
  { id: 'maintenance', label: 'Maintenance', value: 10, tone: 'yellow' },
  { id: 'breakdown', label: 'Breakdown', value: 3, tone: 'danger', display: '03' },
  { id: 'inactive', label: 'Inactive', value: 1, tone: 'neutral', display: '01' },
]

const WORKFORCE: BreakdownStripItem[] = [
  { id: 'on-duty', label: 'On Duty', value: 422, tone: 'success' },
  { id: 'late', label: 'Late', value: 18, tone: 'lavender' },
  { id: 'standby', label: 'Standby', value: 24, tone: 'info' },
  { id: 'next-shift', label: 'Next Shift', value: 148, tone: 'yellow' },
  { id: 'on-leave', label: 'On Leave', value: 3, tone: 'danger', display: '03' },
]

type Controls = { dataset: 'Fleet' | 'Workforce' }

const frame = (node: ReactNode) => <div className="w-full rounded-md border border-border bg-card p-4">{node}</div>

export default function BreakdownStripDemo() {
  return (
    <DocPage
      title="BreakdownStrip"
      badge="stable"
      summary="A whole broken into status shares, read two ways at once: a row of headline counts (label over a tone-coloured value, divided by hairlines) and one proportional bar whose segments overlap with rounded ends. The body of the dashboard 'Progress Overview' card — Fleet Availability, Workforce Readiness. No card chrome: the shell owns the header."
    >
      <DocSection id="playground" title="Playground">
        <Playground<Controls> controls={[{ name: 'dataset', type: 'select', default: 'Fleet', options: ['Fleet', 'Workforce'] }]}>
          {(v) => frame(<BreakdownStrip aria-label={v.dataset === 'Fleet' ? 'Fleet availability' : 'Workforce readiness'} items={v.dataset === 'Fleet' ? FLEET : WORKFORCE} />)}
        </Playground>
      </DocSection>

      <DocSection id="states" title="States">
        <Gallery
          minColRem={24}
          maxCols={2}
          items={[
            { label: 'Six shares', caption: 'every tone in the closed set', node: frame(<BreakdownStrip items={FLEET} />) },
            { label: 'Explicit total', caption: 'remainder shows as the muted track', node: frame(<BreakdownStrip total={600} items={WORKFORCE} />) },
            { label: 'Tiny share', caption: 'a 1-of-300 share still reads as a pill', node: frame(<BreakdownStrip items={[{ label: 'Active', value: 299, tone: 'success' }, { label: 'Down', value: 1, tone: 'danger', display: '01' }]} />) },
            { label: 'Zero data', caption: 'muted track + "No data", never an empty gap', node: frame(<BreakdownStrip items={[{ label: 'On Route', value: 0 }, { label: 'Idle', value: 0 }]} />) },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'items', type: '{ id?, label, value, tone?, display? }[]', required: true, description: "Shares in order. tone: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'lavender' | 'yellow' | 'neutral' (default 'neutral'); display overrides the rendered number (e.g. \"03\")." },
            { prop: 'total', type: 'number', default: 'sum(items.value)', description: 'Proportion denominator when the items are a subset of a larger whole.' },
            { prop: 'emptyLabel', type: 'ReactNode', default: "'No data'", description: 'Shown when every item is zero.' },
            { prop: 'aria-label', type: 'string', default: "'Breakdown'", description: 'Accessible name of the strip group.' },
            { prop: '…props', type: 'HTMLAttributes<HTMLDivElement>', description: 'className and any native div attribute pass through.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Prose>
          Use <Code>StatusBreakdownCard</Code> for a compact self-framed card with a legend list; use <Code>SegmentedBar</Code> for
          categorical chart hues with tooltips. Use this strip when the design leads with the counts themselves and the bar is the
          supporting proportion — and let the card shell (<Code>ChartCard</Code>) own the title, icon and filter.
        </Prose>
        <Guidelines
          dos={['Map statuses to semantic tones in the caller; keep the order the reader expects (good → bad).', 'Keep a zero-count status listed as a 0 column — omitted statuses read as missing data.', 'Pre-format two-digit small counts with `display` when the design pads them ("03").']}
          donts={['Do not pass raw colors — tones are the closed, token-backed set.', 'Do not wrap it in a second card — it is a body, the shell is the card.']}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Every value renders as text in the stat row — colour and segment length are never the sole carrier.',
            'The bar is aria-hidden decoration; the group is named by aria-label and read through the stat row.',
            'Zero data renders a muted track with a visible "No data" reading, not an empty gap.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
