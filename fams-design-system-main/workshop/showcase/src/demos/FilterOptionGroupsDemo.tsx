import { useState } from 'react'
import { FilterOptionGroups, type FilterOptionGroupOption } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

// Deliberately module-agnostic naming (J.87 — no tag vocabulary, no fixed
// category → colour mapping): these categories share no names with the
// Figma spec's "My Private Tags / General Tags / Contract / Geozones", and
// still render with a consistent, index-assigned palette.
const OPTIONS: FilterOptionGroupOption[] = [
  { value: 'north-yard', label: 'North Yard', category: 'Sites' },
  { value: 'south-depot', label: 'South Depot', category: 'Sites' },
  { value: 'weekday', label: 'Weekday', category: 'Schedules' },
  { value: 'weekend', label: 'Weekend', category: 'Schedules' },
  { value: 'contract-a', label: 'Contract A', category: 'Contracts' },
  { value: 'contract-b', label: 'Contract B', category: 'Contracts' },
  { value: 'contract-c', label: 'Contract C', category: 'Contracts' },
  { value: 'zone-1', label: 'Zone 1', category: 'Zones' },
  { value: 'zone-2', label: 'Zone 2', category: 'Zones' },
]

const FLAT_OPTIONS: FilterOptionGroupOption[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'archived', label: 'Archived' },
]

type FilterOptionGroupsControls = {
  sections: 'flat' | 'selected-available'
}

/**
 * FilterOptionGroupsDemo — categorised, toggleable chip groups for
 * `kind:'tags'` filters (FAMILY C). Chip geometry is byte-identical to
 * TagChipList's md chip (J.90) — this is the SAME chip system, arranged by
 * category instead of a flat run.
 */
export default function FilterOptionGroupsDemo() {
  const [value, setValue] = useState<string[]>(['north-yard', 'contract-a', 'contract-b'])
  const [flatValue, setFlatValue] = useState<string[]>(['urgent'])

  return (
    <DocPage
      title="FilterOptionGroups"
      badge="stable"
      summary="Categorised, toggleable chip groups for kind:'tags' filters. Groups options by category (each a labelled role=group, I.78) with an index-assigned colour palette (J.87), and supports the same open-time Selected/Available snapshot Combobox uses (F.47–F.54). Chip geometry is byte-identical to TagChipList's md chip."
    >
      <DocSection id="playground" title="Playground">
        <Playground<FilterOptionGroupsControls>
          controls={[{ name: 'sections', type: 'select', default: 'flat', options: ['flat', 'selected-available'] }]}
        >
          {(v) => (
            <div className="w-96">
              <FilterOptionGroups
                options={OPTIONS}
                value={value}
                onChange={setValue}
                sections={v.sections}
                selectedIds={v.sections === 'selected-available' ? value : undefined}
                frozenOrder={OPTIONS.map((o) => o.value)}
              />
            </div>
          )}
        </Playground>
        <Prose>
          Switch to <Code>selected-available</Code> to see the two-section split: membership is a
          SNAPSHOT taken when the control switched to this mode (mirroring the real session hook's
          open-time snapshot), so unticking a chip below leaves it in place, in{' '}
          <Code>Selected</Code>, unticked, rather than moving it to <Code>Available</Code>.
        </Prose>
      </DocSection>

      <DocSection id="flat-uncategorised" title="Flat, uncategorised">
        <Prose>
          When no option carries a <Code>category</Code>, the component renders one flat chip row —
          no captions, no <Code>role=&quot;group&quot;</Code> — the same rule that keeps colour from
          ever standing in for a category that was never declared.
        </Prose>
        <Gallery
          minColRem={20}
          items={[
            {
              label: 'flat',
              node: <FilterOptionGroups options={FLAT_OPTIONS} value={flatValue} onChange={setFlatValue} />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'options',
              type: 'FilterOptionGroupOption[]',
              required: true,
              description: '{ value, label, category?, color?, count? }. color/count exist only for shape parity with ComboOption — this component never reads either.',
            },
            { prop: 'value', type: 'string[]', required: true, description: 'Selected values.' },
            { prop: 'onChange', type: '(value: string[]) => void', required: true, description: 'Fires with the next selection on every toggle.' },
            {
              prop: 'sections',
              type: "'flat' | 'selected-available'",
              default: "'flat'",
              description: "'selected-available' splits into a Selected/Available pair using the same open-time snapshot contract as Combobox.",
            },
            { prop: 'selectedIds', type: 'string[]', description: 'Open-time snapshot deciding section membership only, never the tick state.' },
            { prop: 'frozenOrder', type: 'string[]', description: 'Open-time snapshot of option order — nothing reorders on toggle.' },
            { prop: 'palette', type: 'string[]', description: 'Ordered accent-family hue names; categories are coloured by index of first appearance, never by name. Default: the full accent-family hue set.' },
            { prop: 'selectedCaption', type: 'string', default: "'Selected'", description: 'Sticky caption of the Selected section. The live count is appended.' },
            { prop: 'availableCaption', type: 'string', default: "'Available'", description: 'Sticky caption of the Available section. The count is appended.' },
            { prop: 'allSelectedText', type: 'string', default: "'All options selected'", description: 'Body shown when every option is selected (Available is empty).' },
            { prop: 'className', type: 'string', description: 'Applied to the outer container.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Pass the same category values consistently — colour is assigned once per category, by first appearance.',
            'Take a fresh selectedIds/frozenOrder snapshot each time the surface opens, exactly like Combobox.',
            'Leave category undefined on every option for a plain, uncategorised chip row.',
          ]}
          donts={[
            "Don't hardcode a category → colour mapping — the palette is index-assigned so it stays generic across modules.",
            "Don't derive selectedIds from the live value on every render — that breaks the F.47 'chip does not move' guarantee.",
            "Don't fork this component's chip markup — it is deliberately geometry-identical to TagChipList.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Each category is a role="group" with aria-labelledby pointing at its visible caption (I.78).',
            'Every chip is a real <button aria-pressed> — selection state is never colour-only; a trailing check mark is mandatory on selected chips (I.79).',
            'One roving tabindex across every chip: Tab enters/leaves the whole set in a single stop; ArrowLeft/Right/Up/Down move and wrap; Home/End jump to the first/last chip; Space/Enter toggle.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
