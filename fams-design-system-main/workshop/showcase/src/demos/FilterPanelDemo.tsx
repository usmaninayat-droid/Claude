import { useState } from 'react'
import { FilterPanel, type FilterGroup, type FilterValue } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

const STATUS_GROUP: FilterGroup = {
  key: 'status',
  label: 'Status',
  options: [
    { value: 'moving', label: 'Moving', count: 12 },
    { value: 'idle', label: 'Idle', count: 6 },
    { value: 'stopped', label: 'Stopped', count: 3 },
    { value: 'offline', label: 'Offline', count: 1 },
  ],
}

const LOT_GROUP: FilterGroup = {
  key: 'lot',
  label: 'Lot',
  options: [
    { value: 'lot-1', label: 'Lot 1', count: 8 },
    { value: 'lot-2', label: 'Lot 2', count: 7 },
    { value: 'lot-7', label: 'Lot 7', count: 4 },
    { value: 'lot-8', label: 'Lot 8', count: 3 },
    { value: 'tajmee', label: "Tajmee'e", count: 5 },
  ],
}

const TAG_OPTIONS = [
  { value: 'gps-issue', label: 'GPS issue' },
  { value: 'fuel-theft', label: 'Fuel theft' },
  { value: 'overspeeding', label: 'Overspeeding' },
  { value: 'geofencing', label: 'Geofencing' },
]

/**
 * FilterPanelDemo — the standard DS fleet "All Filters" panel. Same visual
 * language as ColumnCustomizer (white bg-popover, grouped sections, DS
 * tokens). Reference design Figma node 517-11477 (FAMS V5 Launch Pad).
 */
export default function FilterPanelDemo() {
  const [empty, setEmpty] = useState<FilterValue>({ tags: [], groups: {} })
  const [active, setActive] = useState<FilterValue>({
    tags: ['gps-issue'],
    groups: { status: ['moving', 'idle'], lot: ['lot-1'] },
  })
  const [singleGroup, setSingleGroup] = useState<FilterValue>({ tags: [], groups: {} })

  return (
    <DocPage
      title="FilterPanel"
      badge="stable"
      summary="The standard fleet 'All Filters' panel — same visual language as ColumnCustomizer (white bg-popover, grouped sections, DS tokens). Reference design Figma node 517-11477 (FAMS V5 Launch Pad). Fully controlled: the caller owns value ({ tags, groups }) and applies the OR-within-group / AND-across-group semantics."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Empty value — Clear all and Save stay available, counts still show per option. The panel
          supplies its own <Code>bg-popover</Code> chrome; host it in a popover, drawer, or inline.
        </Prose>
        <FilterPanel
          groups={[STATUS_GROUP, LOT_GROUP]}
          value={empty}
          onChange={setEmpty}
          tagOptions={TAG_OPTIONS}
          onClose={() => {}}
        />
      </DocSection>

      <DocSection id="variants" title="States">
        <Gallery
          minColRem={30}
          items={[
            {
              label: 'Active filters',
              caption: 'tags + multiple checked options per group',
              node: (
                <FilterPanel
                  groups={[STATUS_GROUP, LOT_GROUP]}
                  value={active}
                  onChange={setActive}
                  tagOptions={TAG_OPTIONS}
                  onSave={() => {}}
                />
              ),
            },
            {
              label: 'Single facet group',
              caption: 'no tagOptions — the Tags input still accepts free-typed values',
              node: (
                <FilterPanel
                  groups={[STATUS_GROUP]}
                  value={singleGroup}
                  onChange={setSingleGroup}
                  onClose={() => {}}
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
              prop: 'groups',
              type: 'FilterGroup[]',
              required: true,
              description: 'Facet sections rendered in order; each group renders as its own OR-set of checkboxes.',
            },
            {
              prop: 'value',
              type: 'FilterValue',
              required: true,
              description:
                '{ tags: string[]; groups: Record<string, string[]> } — the single source of truth. Fully controlled.',
            },
            {
              prop: 'onChange',
              type: '(value: FilterValue) => void',
              required: true,
              description: 'Fires on every tag/group mutation.',
            },
            {
              prop: 'tagOptions',
              type: 'FilterOption[]',
              default: '[]',
              description:
                'Options offered as datalist suggestions in the Tags input; the input still accepts free-typed values.',
            },
            {
              prop: 'onClear',
              type: '() => void',
              description: 'Fired alongside onChange({ tags: [], groups: {} }) when Clear all is used.',
            },
            {
              prop: 'onClose',
              type: '() => void',
              description: 'Optional close affordance, wired to the popover/drawer that hosts the panel.',
            },
            {
              prop: 'onSave',
              type: '() => void',
              description: 'Optional Save view action — both split-button menu items (Save as new view / Update view) call it.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Apply the OR-within-group / AND-across-group semantics in the caller — the panel only reports the raw selection.',
            'Supply a per-option count so users see the result size before committing.',
            'Pass onClose when the panel is hosted in a popover or drawer; omit it for an always-visible panel.',
            'Keep tagOptions to values the caller actually recognizes — the input also accepts free-typed tags that won’t match a suggestion.',
          ]}
          donts={[
            'Don’t compute the filtered result set inside FilterPanel — it owns the UI state only (state-agnostic, Rule 8).',
            'Don’t nest FilterPanel inside FilterPopup and also pass onClearAll/onApply to the popup — the two Clear-all actions would duplicate.',
            'Don’t drop a group key out of value.groups yourself except by removing every option — the component does this for you on the last uncheck.',
            'Don’t assume tag order is preserved for display — labels are looked up by value against tagOptions.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Each facet section is a labelled <section aria-label>, independently discoverable by screen-reader users navigating by landmark.',
            'Every option renders through Checkbox, so checked state exposes the correct aria-checked semantics.',
            'The tag input is a combobox-shaped text field paired with a <datalist> — arrow keys and typeahead work as expected.',
            'Save/Settings/Close icon buttons carry an explicit aria-label since they are icon-only.',
            'Layout uses logical ms-/pe-/text-start utilities throughout, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
