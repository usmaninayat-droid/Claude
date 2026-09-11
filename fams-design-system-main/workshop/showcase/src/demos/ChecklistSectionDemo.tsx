import { useState } from 'react'
import { AlertTriangle, Check, Minus, X } from '@fams/ui-kit/icons'
import {
  ChecklistSection,
  type ChecklistItemData,
  type ChecklistItemState,
} from '../../../../packages/ui-kit/src/composites/ChecklistSection'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

const PRE_TRIP_ITEMS: ChecklistItemData[] = [
  { id: 'seatbelt', label: 'Seatbelt fastened' },
  { id: 'mirrors', label: 'Mirrors adjusted' },
  { id: 'fuel', label: 'Fuel level checked', description: 'Minimum quarter tank' },
  { id: 'lights', label: 'Lights and indicators working' },
]

const INSPECTION_STATES: ChecklistItemState[] = [
  { id: 'pending', label: 'Pending', icon: Minus, tone: 'neutral' },
  { id: 'pass', label: 'Pass', icon: Check, tone: 'success' },
  { id: 'fail', label: 'Fail', icon: X, tone: 'danger' },
  { id: 'na', label: 'N/A', icon: AlertTriangle, tone: 'neutral' },
]

const INSPECTION_ITEMS: ChecklistItemData[] = [
  { id: 'brakes', label: 'Brakes', description: 'Front and rear' },
  { id: 'tires', label: 'Tires', description: 'Tread depth + pressure' },
  { id: 'hydraulics', label: 'Hydraulic lift' },
  { id: 'body', label: 'Body condition' },
]

export default function ChecklistSectionDemo() {
  const [binaryValue, setBinaryValue] = useState<Record<string, string>>({ seatbelt: 'checked' })
  const [inspectionValue, setInspectionValue] = useState<Record<string, string>>({
    brakes: 'pass',
    tires: 'fail',
  })

  return (
    <DocPage
      title="ChecklistSection"
      badge="stable"
      summary="A list of items each carrying one state from a caller-supplied `states` set, with an aggregate completion header. Generalizes the reference's binary checklist and 4-state inspection list into one state-agnostic component — no business vocabulary baked in."
    >
      <DocSection id="modes" title="Modes">
        <Prose>
          No <Code>states</Code> prop renders the default binary unchecked/checked pair (whole row is
          the toggle). A <Code>states</Code> array of 3+ entries renders a per-item state toggle row
          instead — same component, longer state set.
        </Prose>
        <Gallery
          minColRem={26}
          maxCols={2}
          items={[
            {
              label: 'Binary mode',
              caption: 'default states, whole row is the toggle',
              node: (
                <ChecklistSection
                  title="Pre-trip checklist"
                  items={PRE_TRIP_ITEMS}
                  value={binaryValue}
                  onToggle={(id, stateId) => setBinaryValue((v) => ({ ...v, [id]: stateId }))}
                  className="w-full"
                />
              ),
            },
            {
              label: 'Multi-state mode',
              caption: '4 states + renderItemExtra',
              node: (
                <ChecklistSection
                  title="Equipment inspection"
                  items={INSPECTION_ITEMS}
                  states={INSPECTION_STATES}
                  value={inspectionValue}
                  onToggle={(id, stateId) => setInspectionValue((v) => ({ ...v, [id]: stateId }))}
                  renderItemExtra={(_item, stateId) =>
                    stateId === 'fail' ? (
                      <p className="text-body-xs text-destructive">Flagged — needs follow-up note</p>
                    ) : null
                  }
                  className="w-full"
                />
              ),
            },
            {
              label: 'Read-only',
              caption: 'readOnly — presentational only',
              node: (
                <ChecklistSection
                  title="Submitted checklist"
                  items={PRE_TRIP_ITEMS}
                  value={{ seatbelt: 'checked', mirrors: 'checked', fuel: 'checked' }}
                  readOnly
                  className="w-full"
                />
              ),
            },
            {
              label: 'Empty state',
              caption: 'items=[] — custom emptyText',
              node: (
                <ChecklistSection
                  items={[]}
                  value={{}}
                  emptyText="No checklist assigned"
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
              prop: 'title',
              type: 'ReactNode',
              description: 'Heading shown above the completion bar. Omit for a bare list.',
            },
            {
              prop: 'items',
              type: 'ChecklistItemData[]',
              required: true,
              description: 'List items — each is { id, label, description?, disabled?, meta? }.',
            },
            {
              prop: 'states',
              type: 'ChecklistItemState[]',
              default: 'binary unchecked/checked pair',
              description:
                'Closed set of possible states; states[0] is the default/neutral state. Pass 2 for a binary toggle, or more for a multi-state row (e.g. pending/pass/fail/n-a).',
            },
            {
              prop: 'value',
              type: 'Record<string, string>',
              required: true,
              description: 'Controlled: item id → current state id. Items absent from value default to states[0].',
            },
            {
              prop: 'onToggle',
              type: '(itemId: string, stateId: string) => void',
              description: 'Fired with the item id and the state id it should move to.',
            },
            {
              prop: 'readOnly',
              type: 'boolean',
              default: 'false',
              description: 'Presentational only — no state can be changed.',
            },
            {
              prop: 'emptyIcon',
              type: 'ReactNode',
              description: 'Icon shown in the empty state. Defaults to an inbox icon.',
            },
            {
              prop: 'emptyText',
              type: 'ReactNode',
              default: "'No checklist items'",
              description: 'Message shown when items is empty.',
            },
            {
              prop: 'renderItemExtra',
              type: '(item: ChecklistItemData, stateId: string) => ReactNode',
              description:
                'Extension point for app-owned per-item content (a note field, a photo thumbnail…) — the component has no upload or note-editing logic of its own.',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLDivElement>, 'onToggle' | 'title'>",
              description: 'className and any other div attribute pass through to the root element.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Pass a longer states array for multi-state inspections instead of building a bespoke status map.',
            'Put the "resolved means good" state at states[1] or later — anything but states[0] counts toward completion.',
            'Use renderItemExtra for app-owned content (notes, photos) rather than forking the component.',
            'Use readOnly for submitted/historical checklists instead of disabling every item individually.',
          ]}
          donts={[
            "Don't bake business vocabulary into item labels expecting the component to interpret them — it only knows state ids.",
            "Don't mutate items/value outside the controlled onToggle flow; the component holds no state of its own.",
            "Don't use more than a handful of states — beyond 4-5 the per-item toggle row stops being scannable.",
            "Don't rely on icon/tone alone for the state meaning — label carries it for assistive tech.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Binary mode renders each item as a role="checkbox" button with aria-checked reflecting its resolved state.',
            'Multi-state mode wraps each item\'s toggle row in role="group" with an aria-label from the item\'s label, and each state button carries aria-pressed.',
            'Disabled items (readOnly or item.disabled) are both visually dimmed and non-interactive (disabled attribute), not just styled.',
            'The completion header (Progress + count) is a visual summary — the count text itself is readable by assistive tech.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
