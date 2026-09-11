import { useState } from 'react'
import { PeoplePicker, type PersonOption } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const TEAM: PersonOption[] = [
  { id: 'kashish', name: 'Kashish Bindrani', email: 'kashish@fams.com' },
  { id: 'emmad', name: 'Emmad Ahmad', email: 'emmad@fams.com' },
  { id: 'saed', name: 'Saed Salah', email: 'saed@fams.com' },
  { id: 'sahan', name: 'Sahan Bandara', email: 'sahan@fams.com' },
  { id: 'bushra', name: 'Bushra Munawar', email: 'bushra@fams.com' },
]

const TRIGGER_VARIANTS = ['field', 'assignee-chip'] as const

type PeoplePickerControls = {
  multiple: boolean
  triggerVariant: (typeof TRIGGER_VARIANTS)[number]
  disabled: boolean
}

function PlaygroundExample({
  multiple,
  triggerVariant,
  disabled,
}: {
  multiple: boolean
  triggerVariant: (typeof TRIGGER_VARIANTS)[number]
  disabled: boolean
}) {
  const [value, setValue] = useState<string | string[] | null>(multiple ? ['kashish'] : 'emmad')
  return (
    <div className="w-72">
      <PeoplePicker
        key={multiple ? 'multi' : 'single'}
        people={TEAM}
        value={value}
        onChange={setValue}
        multiple={multiple}
        triggerVariant={triggerVariant}
        disabled={disabled}
        sectionLabel={multiple ? 'Assignees' : 'Owner'}
        currentPersonId="kashish"
      />
    </div>
  )
}

export default function PeoplePickerDemo() {
  const [owner, setOwner] = useState<string | null>('emmad')
  const [assignees, setAssignees] = useState<string[]>(['kashish'])
  const [chipAssignee, setChipAssignee] = useState<string | null>(null)
  const [clearableAssignee, setClearableAssignee] = useState<string | null>('bushra')
  const [emptySearch, setEmptySearch] = useState<string | null>(null)

  return (
    <DocPage
      title="PeoplePicker"
      badge="stable"
      summary="The one searchable person selector — single (radio-style, pick-and-close) or multi (checkbox, toggle-and-stay) sharing the same popover body. Retires the v5 codebase's AssigneeSelector/SelectUserList/ReporterList lineage."
    >
      <DocSection id="playground" title="Playground">
        <Playground<PeoplePickerControls>
          controls={[
            { name: 'multiple', type: 'boolean', default: false },
            { name: 'triggerVariant', type: 'select', default: 'field', options: TRIGGER_VARIANTS },
            { name: 'disabled', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <PlaygroundExample multiple={v.multiple} triggerVariant={v.triggerVariant} disabled={v.disabled} />
          )}
        </Playground>
      </DocSection>

      <DocSection id="modes" title="Single vs. multi">
        <Prose>
          <Code>multiple</Code> swaps the row glyph between a decorative radio dot (pick-and-close)
          and a real checkbox (toggle-and-stay), sharing the same popover — search, an optional
          pinned "you" row, select-all, and empty state.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'Single — Owner',
              node: (
                <div className="w-64">
                  <PeoplePicker
                    people={TEAM}
                    value={owner}
                    onChange={(v) => setOwner(v as string | null)}
                    sectionLabel="Owner"
                    currentPersonId="emmad"
                  />
                </div>
              ),
            },
            {
              label: 'Multi — Assignees',
              caption: 'pinned you + select-all',
              node: (
                <div className="w-72">
                  <PeoplePicker
                    people={TEAM}
                    value={assignees}
                    onChange={(v) => setAssignees((v as string[]) ?? [])}
                    multiple
                    sectionLabel="Assignees"
                    currentPersonId="kashish"
                  />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="assignee-chip" title="Assignee-chip trigger">
        <Prose>
          <Code>triggerVariant="assignee-chip"</Code> renders a dashed "+ Assign" pill when empty, an
          avatar + name chip once assigned, and — with <Code>onClear</Code> — a hover-revealed "×"
          that clears the selection without opening the popover.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'Unassigned',
              node: (
                <PeoplePicker
                  people={TEAM}
                  value={chipAssignee}
                  onChange={(v) => setChipAssignee(v as string | null)}
                  triggerVariant="assignee-chip"
                />
              ),
            },
            {
              label: 'Assigned',
              node: (
                <PeoplePicker
                  people={TEAM}
                  value="saed"
                  onChange={() => {}}
                  triggerVariant="assignee-chip"
                />
              ),
            },
            {
              label: 'Clearable',
              caption: 'hover for ×',
              node: (
                <PeoplePicker
                  people={TEAM}
                  value={clearableAssignee}
                  onChange={(v) => setClearableAssignee(v as string | null)}
                  onClear={() => setClearableAssignee(null)}
                  triggerVariant="assignee-chip"
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="states" title="Other states">
        <Gallery
          layout="rows"
          items={[
            {
              label: 'Empty search',
              caption: 'no matches',
              node: (
                <div className="w-64">
                  <PeoplePicker
                    people={TEAM}
                    value={emptySearch}
                    onChange={(v) => setEmptySearch(v as string | null)}
                    placeholder="Search for “zzz”…"
                    emptyText="No people found"
                  />
                </div>
              ),
            },
            {
              label: 'Disabled',
              node: (
                <div className="w-64">
                  <PeoplePicker people={TEAM} value="saed" onChange={() => {}} disabled />
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
              prop: 'people',
              type: 'PersonOption[]',
              required: true,
              description: 'Always caller-supplied — state-agnostic, no fetching inside.',
            },
            {
              prop: 'value',
              type: 'string | string[] | null',
              required: true,
              description: 'Controlled selection: a single id (single mode) or an array of ids (multi mode).',
            },
            {
              prop: 'onChange',
              type: '(value: string | string[] | null) => void',
              required: true,
              description: 'Fires with the new selection.',
            },
            {
              prop: 'multiple',
              type: 'boolean',
              default: 'false',
              description: 'Checkbox multi-select (toggle-and-stay) vs single radio-style pick-and-close.',
            },
            {
              prop: 'currentPersonId',
              type: 'string',
              description: 'Pins this person to the top of the list, labelled "You".',
            },
            {
              prop: 'sectionLabel',
              type: 'string',
              default: "'People'",
              description: 'Section label above the list (e.g. "Assignee", "Owner").',
            },
            {
              prop: 'placeholder',
              type: 'string',
              description:
                'Trigger placeholder text when nothing is selected. Defaults to "Unassigned" (field) or "Assign" (assignee-chip).',
            },
            {
              prop: 'emptyText',
              type: 'ReactNode',
              default: "'No people found'",
              description: 'Shown instead of the list when a search has no matches.',
            },
            {
              prop: 'disabled',
              type: 'boolean',
              default: 'false',
              description: 'Trigger is inert, popover cannot open.',
            },
            {
              prop: 'triggerVariant',
              type: "'field' | 'assignee-chip'",
              default: "'field'",
              description:
                'field is the bordered control matching Input/Select. assignee-chip is borderless with a dashed "+ Assign" empty state.',
            },
            {
              prop: 'onClear',
              type: '() => void',
              description:
                'One-click clear on the assignee-chip trigger — a hover-revealed "×". Only rendered when there is a selection and this is provided.',
            },
            {
              prop: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Trigger height/padding and the trigger avatar size.',
            },
            {
              prop: 'align',
              type: "'start' | 'end'",
              default: "'start'",
              description: 'Popover alignment relative to the trigger.',
            },
            { prop: 'className', type: 'string', description: 'Passed to the trigger.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use single mode for Owner/Created-By and multi mode for Assignees.',
            'Pass currentPersonId so the signed-in user is pinned to the top as "You".',
            'Use triggerVariant="assignee-chip" inside dense rows (a table cell, a card header).',
            'Wire onClear whenever the surrounding UI benefits from a one-click unassign.',
          ]}
          donts={[
            'Don’t fetch the roster inside the component — people is always caller-supplied.',
            'Don’t toggle multiple on a live selection without resetting the value shape (string vs string[]).',
            'Don’t use assignee-chip for a required field with no empty state — it visually implies optional.',
            'Don’t bypass it with a bespoke select for another "pick a person" case — this retires five forked v5 pickers.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Trigger exposes aria-haspopup="listbox", aria-expanded, and aria-controls pointing at the list.',
            'Multi mode uses a real Checkbox per row (labelled via <label htmlFor>); single mode uses role="option" with aria-selected.',
            'The assignee-chip "×" clear affordance is reachable and operable by keyboard (Enter/Space), not hover-only.',
            'Search input auto-filters the list; empty results are announced via visible emptyText text, not colour alone.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
