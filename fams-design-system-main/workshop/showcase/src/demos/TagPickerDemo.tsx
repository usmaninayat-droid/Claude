import { useState } from 'react'
import { TagPicker, type TagOption } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const OPTIONS: TagOption[] = [
  { value: 'high', label: 'High', color: '#f04438', group: 'Priority' },
  { value: 'medium', label: 'Medium', color: '#f79009', group: 'Priority' },
  { value: 'low', label: 'Low', color: '#12b76a', group: 'Priority' },
  { value: 'lot-1', label: 'Lot 1', group: 'Lot' },
  { value: 'lot-2', label: 'Lot 2', group: 'Lot' },
  { value: 'lavajet', label: 'Lavajet' },
]

type TagPickerControls = {
  size: 'sm' | 'md' | 'lg'
  exclusivePriority: boolean
  loading: boolean
  disabled: boolean
}

/**
 * TagPickerDemo — assign/filter by tag, grouped with optional per-group
 * exclusivity. exclusiveGroups implements the v5 "single_select category"
 * rule — picking one tag in that group replaces any other selected tag
 * already in it; groups not listed stay independent multi-select. Retires
 * the v5 codebase's TagsCard/TagFilter/TagsInput lineage (~4 near-duplicate,
 * Pinia-coupled popups) — this presenter takes options and never reads a
 * tag store.
 */
export default function TagPickerDemo() {
  const [value, setValue] = useState<string[]>(['medium', 'lot-1'])

  return (
    <DocPage
      title="TagPicker"
      badge="stable"
      summary="Assign/filter by tag, grouped with optional per-group exclusivity. exclusiveGroups implements the v5 'single_select category' rule — picking one tag in that group replaces any other selected tag already in it; groups not listed stay independent multi-select."
    >
      <DocSection id="playground" title="Playground">
        <Playground<TagPickerControls>
          controls={[
            { name: 'size', type: 'select', default: 'md', options: ['sm', 'md', 'lg'] },
            { name: 'exclusivePriority', type: 'boolean', default: true },
            { name: 'loading', type: 'boolean', default: false },
            { name: 'disabled', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <div className="w-80">
              <TagPicker
                options={OPTIONS}
                value={value}
                onChange={setValue}
                exclusiveGroups={v.exclusivePriority ? ['Priority'] : []}
                size={v.size}
                loading={v.loading}
                disabled={v.disabled}
              />
            </div>
          )}
        </Playground>
        <Prose>
          Toggling <Code>exclusivePriority</Code> off lets more than one Priority tag be selected at
          once — try selecting High then Medium with it on vs off.
        </Prose>
      </DocSection>

      <DocSection id="states" title="Empty, loading, disabled">
        <Prose>
          <Code>emptyText</Code> customizes the no-options message; <Code>loading</Code> swaps the
          chevron for a spinner.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'empty',
              node: (
                <div className="w-64">
                  <TagPicker options={[]} value={[]} onChange={() => {}} emptyText="No tags configured for this entity" />
                </div>
              ),
            },
            {
              label: 'loading',
              node: (
                <div className="w-64">
                  <TagPicker options={OPTIONS} value={[]} onChange={() => {}} loading />
                </div>
              ),
            },
            {
              label: 'disabled',
              node: (
                <div className="w-64">
                  <TagPicker options={OPTIONS} value={['low']} onChange={() => {}} disabled />
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
              prop: 'options',
              type: 'TagOption[]',
              required: true,
              description: 'Static list, or resolved by an app-layer hook (e.g. useTagOptions). Never fetched internally.',
            },
            { prop: 'value', type: 'string[]', required: true, description: 'Selected tag values.' },
            { prop: 'onChange', type: '(value: string[]) => void', required: true, description: 'Fires with the next selection on every toggle.' },
            {
              prop: 'exclusiveGroups',
              type: 'string[]',
              default: '[]',
              description: 'Group keys where selecting a tag deselects any other selected tag already in that group (the v5 "single_select category" rule). Groups not listed are independent multi-select.',
            },
            { prop: 'loading', type: 'boolean', default: 'false', description: 'Shows a spinner in place of the chevron.' },
            { prop: 'emptyText', type: 'ReactNode', default: "'No tags'", description: 'Message shown when options is empty.' },
            { prop: 'placeholder', type: 'string', default: "'Select tags…'", description: 'Trigger text when no tags are selected.' },
            { prop: 'disabled', type: 'boolean', default: 'false', description: 'Trigger is inert, popover cannot open.' },
            {
              prop: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Trigger height and text scale together.',
            },
            { prop: 'className', type: 'string', description: 'Applied to the trigger button.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Group tags that share a category so exclusiveGroups can enforce single-select where needed.',
            'Provide emptyText specific to the entity ("No tags configured for this contract").',
            'Resolve options via an app-layer hook (useTagOptions) — TagPicker never fetches.',
            'Use loading while the options list is still resolving, not after the popover is open.',
          ]}
          donts={[
            "Don't list a group in exclusiveGroups unless the business rule is genuinely single-select.",
            "Don't pass an uncontrolled value — TagPicker is fully controlled via value/onChange.",
            "Don't reach for TagPicker for read-only display — use TagChipList instead.",
            "Don't hardcode tag colors as tokens — color is caller data, same as TagChipList.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Trigger exposes aria-haspopup="listbox" and aria-controls pointing at the popover content.',
            'Popover content carries role="listbox" and aria-multiselectable="true"; each tag is role="option" with aria-selected.',
            'disabled sets the native disabled attribute — trigger is unreachable by keyboard and unannounced as interactive.',
            'Trigger icon, chip gap, and popover alignment mirror automatically under RTL via logical properties.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
