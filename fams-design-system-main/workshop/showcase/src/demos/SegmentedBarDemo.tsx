import {
  SegmentedBar,
  type SegmentedBarSegment,
} from '../../../../packages/ui-kit/src/composites/SegmentedBar'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * SegmentedBarDemo — a whole broken into categorical shares as one
 * proportional stacked bar. Retires DashboardTable.vue's status-breakdown
 * column and BreakdownTable.vue's fixed wash-status bar, both hand-rolled
 * with raw hex fills.
 */

/** Reference case 1 — BreakdownTable.vue's fixed 3-state wash bar. */
const WASH_STATUS: SegmentedBarSegment[] = [
  { id: 'washed', label: 'Washed', value: 128, colorIndex: 1 },
  { id: 'not-washed', label: 'Not Washed', value: 34, colorIndex: 5 },
  { id: 'untouched', label: 'Untouched', value: 12, colorIndex: 9 },
]

/** Reference case 2 — DashboardTable.vue's per-row status breakdown column. */
const TICKET_STATUS: SegmentedBarSegment[] = [
  { id: 'resolved', label: 'Resolved', value: 62, colorIndex: 1 },
  { id: 'in-progress', label: 'In Progress', value: 21, colorIndex: 6 },
  { id: 'open', label: 'Open', value: 17, colorIndex: 4 },
]

const LOT_SHARE: SegmentedBarSegment[] = [
  { id: 'lot1', label: 'Lot 1', value: 40, colorIndex: 2 },
  { id: 'lot2', label: 'Lot 2', value: 30, colorIndex: 3 },
  { id: 'lot7', label: 'Lot 7', value: 20, colorIndex: 6 },
  { id: 'lot8', label: 'Lot 8', value: 10, colorIndex: 8 },
]

const DATASETS = {
  'Bin wash status': WASH_STATUS,
  'Ticket status': TICKET_STATUS,
  'Lot share': LOT_SHARE,
} as const

const DATASET_NAMES = Object.keys(DATASETS) as (keyof typeof DATASETS)[]
const SIZES = ['sm', 'md', 'lg'] as const

type SegmentedBarControls = {
  dataset: (typeof DATASET_NAMES)[number]
  size: (typeof SIZES)[number]
  showLabels: boolean
}

export default function SegmentedBarDemo() {
  return (
    <DocPage
      title="SegmentedBar"
      badge="stable"
      summary="A whole broken into categorical shares as one proportional stacked bar — not a chart-engine widget. Retires DashboardTable.vue's status-breakdown column and BreakdownTable.vue's fixed wash-status bar, both hand-rolled with raw hex fills. Fill is colorIndex-only; every segment carries a keyboard-reachable Tooltip."
    >
      <DocSection id="playground" title="Playground">
        <Playground<SegmentedBarControls>
          controls={[
            { name: 'dataset', type: 'select', default: 'Bin wash status', options: DATASET_NAMES },
            { name: 'size', type: 'select', default: 'md', options: SIZES },
            { name: 'showLabels', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <div className="w-full max-w-md">
              <SegmentedBar
                aria-label={v.dataset}
                segments={DATASETS[v.dataset]}
                size={v.size}
                showLabels={v.showLabels}
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="sizes" title="Sizes">
        <Prose>
          <Code>size</Code> controls track height only — the segment layout and proportions never
          change.
        </Prose>
        <Gallery
          minColRem={14}
          items={SIZES.map((size) => ({
            label: size,
            node: <SegmentedBar aria-label={`Lot share, ${size}`} segments={LOT_SHARE} size={size} className="w-full" />,
          }))}
        />
      </DocSection>

      <DocSection id="states" title="States">
        <Gallery
          minColRem={28}
          maxCols={2}
          items={[
            {
              label: 'Default',
              caption: 'hover or focus a segment for detail',
              node: <SegmentedBar aria-label="Bin wash status" segments={WASH_STATUS} className="w-full" />,
            },
            {
              label: 'Inline labels',
              caption: 'showLabels, size lg',
              node: (
                <SegmentedBar aria-label="Ticket status" segments={TICKET_STATUS} showLabels size="lg" className="w-full" />
              ),
            },
            {
              label: 'Empty',
              caption: 'zero total → muted track',
              node: (
                <SegmentedBar
                  aria-label="Ticket status"
                  segments={[]}
                  emptyLabel="No tickets this week"
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
            {
              prop: 'segments',
              type: 'SegmentedBarSegment[]',
              required: true,
              description:
                'Ordered list of { id?, label, value, colorIndex }. Each width is value / total(segments) — a data-driven percentage.',
            },
            {
              prop: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Track height only; the layout never changes.',
            },
            {
              prop: 'showLabels',
              type: 'boolean',
              default: 'false',
              description: "Render each segment's own label in a chip once its share is ≥12% wide.",
            },
            {
              prop: 'aria-label',
              type: 'string',
              default: "'Breakdown'",
              description: 'Accessible name for the bar as a whole (role="group").',
            },
            {
              prop: 'emptyLabel',
              type: 'string',
              default: "'No data'",
              description: 'Accessible name used when every value is 0 (or segments is []).',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'className and any native div attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use it for a categorical breakdown of one whole — wash status, ticket status, lot share.',
            'Always set colorIndex per segment — never a raw hex.',
            'Give every bar an aria-label describing what it breaks down.',
            'Keep segments to a handful of categories; more than ~6 makes the proportional read pointless.',
          ]}
          donts={[
            "Don't use it as a generic single-value progress bar — that's a different component.",
            "Don't force showLabels on a track too narrow to hold text — under-12% segments drop the label automatically.",
            "Don't pass a reorderable segments array without stable ids — the tooltip and key both depend on it.",
            "Don't invent a colorIndex → hex mapping; the categorical palette already cycles every 5.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'role="group" with aria-label names the bar as a whole; each segment is a real, tabbable button with its own aria-label.',
            'Tooltip content shows on both hover and focus (Radix), so per-segment detail never requires a mouse.',
            'The empty/zero-total state renders role="img" with an accessible emptyLabel instead of zero-width buttons.',
            'Layout uses logical properties (border-e for the segment divider), so it mirrors correctly under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
