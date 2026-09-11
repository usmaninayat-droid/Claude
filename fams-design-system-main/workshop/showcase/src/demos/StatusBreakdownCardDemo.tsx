import { Truck, Users } from '@fams/ui-kit/icons'
import {
  StatusBreakdownCard,
  type StatusBreakdownRow,
} from '../../../../packages/ui-kit/src/composites/StatusBreakdownCard'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const FLEET_ROWS: StatusBreakdownRow[] = [
  { id: 'available', label: 'Available', count: 128, tone: 'success' },
  { id: 'in-service', label: 'In Service', count: 34, tone: 'warning' },
  { id: 'down', label: 'Down', count: 38, tone: 'danger' },
]

const WORKFORCE_ROWS: StatusBreakdownRow[] = [
  { id: 'on-shift', label: 'On Shift', count: 82, tone: 'success' },
  { id: 'standby', label: 'Standby', count: 11, tone: 'info' },
  { id: 'no-show', label: 'No-Show', count: 2, tone: 'danger' },
  { id: 'off', label: 'Off Duty', count: 25 },
]

type StatusBreakdownControls = {
  dataset: 'Fleet' | 'Workforce'
  showStats: boolean
  showIcon: boolean
}

export default function StatusBreakdownCardDemo() {
  return (
    <DocPage
      title="StatusBreakdownCard"
      badge="stable"
      summary="A card of proportion rows: each row pairs a label + count with a horizontal bar sized to that row's share of the whole, filled with a semantic status token. Distinct from SegmentedBar (one stacked bar of categorical chart hues) — this is the fleet-availability / workforce-readiness breakdown-panel shape."
    >
      <DocSection id="playground" title="Playground">
        <Playground<StatusBreakdownControls>
          controls={[
            { name: 'dataset', type: 'select', default: 'Fleet', options: ['Fleet', 'Workforce'] },
            { name: 'showStats', type: 'boolean', default: true },
            { name: 'showIcon', type: 'boolean', default: true },
          ]}
        >
          {(v) => {
            const fleet = v.dataset === 'Fleet'
            const rows = fleet ? FLEET_ROWS : WORKFORCE_ROWS
            return (
              <div className="w-full max-w-md">
                <StatusBreakdownCard
                  title={fleet ? 'Fleet Availability' : 'Workforce Readiness'}
                  icon={v.showIcon ? (fleet ? Truck : Users) : undefined}
                  stats={
                    v.showStats
                      ? [{ label: fleet ? 'Total Vehicles' : 'Total People', value: String(rows.reduce((a, r) => a + r.count, 0)) }]
                      : undefined
                  }
                  rows={rows}
                />
              </div>
            )
          }}
        </Playground>
      </DocSection>

      <DocSection id="states" title="States">
        <Gallery
          minColRem={20}
          maxCols={2}
          items={[
            {
              label: 'With stats + action slot',
              node: (
                <StatusBreakdownCard
                  title="Fleet Availability"
                  icon={Truck}
                  action={<button type="button" className="rounded-sm border border-border bg-card px-2 py-1 text-body-xs text-muted-foreground">All Vehicles</button>}
                  stats={[
                    { label: 'Total', value: '200' },
                    { label: 'Utilization', value: '81%' },
                  ]}
                  rows={FLEET_ROWS}
                  className="w-full"
                />
              ),
            },
            {
              label: 'Tiny share stays visible',
              caption: '1-of-110 keeps a ≥4px fill',
              node: (
                <StatusBreakdownCard
                  title="Workforce Readiness"
                  icon={Users}
                  rows={[
                    { label: 'On Shift', count: 109, tone: 'success' },
                    { label: 'No-Show', count: 1, tone: 'danger' },
                  ]}
                  className="w-full"
                />
              ),
            },
            {
              label: 'Explicit total',
              caption: 'rows are a subset of a larger whole',
              node: (
                <StatusBreakdownCard
                  title="Open Issues by Severity"
                  total={400}
                  rows={[
                    { label: 'Critical', count: 12, tone: 'danger' },
                    { label: 'Major', count: 40, tone: 'warning' },
                    { label: 'Minor', count: 100, tone: 'info' },
                  ]}
                  className="w-full"
                />
              ),
            },
            {
              label: 'Zero data',
              caption: 'muted track + "No data", never an empty gap',
              node: (
                <StatusBreakdownCard
                  title="Fleet Availability"
                  icon={Truck}
                  rows={[{ label: 'Available', count: 0 }]}
                  className="w-full"
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'title', type: 'ReactNode', required: true, description: 'Card title.' },
            { prop: 'icon', type: 'LucideIcon', description: 'Leading icon beside the title.' },
            { prop: 'action', type: 'ReactNode', description: 'Trailing header slot — e.g. a filter chip / dropdown trigger.' },
            { prop: 'stats', type: '{ id?, label, value }[]', description: 'Optional headline stat columns above the rows; values pre-formatted.' },
            { prop: 'rows', type: '{ id?, label, count, tone? }[]', required: true, description: "Proportion rows. tone: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' (default 'neutral')." },
            { prop: 'total', type: 'number', default: 'sum(rows.count)', description: 'Proportion denominator, when the rows are a subset of a larger whole.' },
            { prop: 'emptyLabel', type: 'ReactNode', default: "'No data'", description: 'Text shown when every row is zero.' },
            { prop: '…props', type: 'HTMLAttributes<HTMLDivElement>', description: 'className and any native div attribute pass through.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Prose>
          Use <Code>SegmentedBar</Code> for one categorical whole in a single stacked bar; use this
          card when each status needs its own labelled row and semantic status color.
        </Prose>
        <Guidelines
          dos={[
            'Map statuses to semantic tones in the caller (moving→success, idling→warning, down→danger).',
            'Keep a zero-count status listed as a 0 row — omitted statuses read as missing data.',
            'Put the filter affordance in the action slot; re-render with the filtered rows.',
          ]}
          donts={[
            'Do not pass raw colors — tones are the closed, token-backed set.',
            'Do not use it as a chart replacement for continuous data; rows are categorical counts.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Counts render as text beside every bar — colour/length is never the sole carrier.',
            'Bars are aria-hidden decoration; the accessible reading is the label + count row.',
            'Zero data renders a muted track with a visible "No data" reading, not an empty gap.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
