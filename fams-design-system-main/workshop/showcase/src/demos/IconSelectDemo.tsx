import { useState } from 'react'
import { Flag, Wrench } from '@fams/ui-kit/icons'
import { IconSelect, type IconSelectOption } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const PRIORITY_OPTIONS: IconSelectOption[] = [
  { value: 'critical', label: 'Critical', icon: <Flag className="text-error-500" aria-hidden="true" /> },
  { value: 'high', label: 'High', icon: <Flag className="text-error-500" aria-hidden="true" /> },
  { value: 'medium', label: 'Medium', icon: <Flag className="text-warning-scale-500" aria-hidden="true" /> },
  { value: 'minor', label: 'Minor', icon: <Flag className="text-success-scale-500" aria-hidden="true" /> },
]

const SERVICE_OPTIONS: IconSelectOption[] = [
  { value: 'cleaning', label: 'Waste Container Cleaning' },
  { value: 'repair', label: 'Repair & Maintenance' },
  { value: 'inspection', label: 'Inspection', disabled: true },
]

type IconSelectControls = {
  disabled: boolean
  hasError: boolean
}

/**
 * IconSelectDemo — a non-searchable single-select popover whose trigger and
 * option rows can each carry a leading icon. Sibling to Combobox (which
 * always has a search box) for a short, static option list.
 */
export default function IconSelectDemo() {
  const [playgroundValue, setPlaygroundValue] = useState<string | null>('medium')
  const [serviceValue, setServiceValue] = useState<string | null>('cleaning')
  const [bareValue, setBareValue] = useState<string | null>(null)

  return (
    <DocPage
      title="IconSelect"
      badge="stable"
      summary="Non-searchable single-select popover — a short option list rendered as a card (gray section-title row + hairline-divided rows), with an optional icon in the trigger and/or per row. Fully controlled via value/onChange."
    >
      <DocSection id="playground" title="Playground">
        <Playground<IconSelectControls>
          controls={[
            { name: 'disabled', type: 'boolean', default: false },
            { name: 'hasError', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <IconSelect
              value={playgroundValue}
              onChange={setPlaygroundValue}
              options={PRIORITY_OPTIONS}
              sectionLabel="Priority Level"
              placeholder="Select priority"
              ariaLabel="Priority"
              disabled={v.disabled}
              hasError={v.hasError}
            />
          )}
        </Playground>
      </DocSection>

      <DocSection id="examples" title="Examples">
        <Prose>
          A static leading <Code>leadingIcon</Code> in the trigger falls back to the selected
          option's own <Code>icon</Code> when omitted. Option rows can be individually{' '}
          <Code>disabled</Code>.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'Static trigger icon',
              caption: 'field glyph regardless of selection',
              node: (
                <IconSelect
                  value={serviceValue}
                  onChange={setServiceValue}
                  options={SERVICE_OPTIONS}
                  leadingIcon={<Wrench aria-hidden="true" />}
                  sectionLabel="Service Type"
                  placeholder="Select service type"
                  ariaLabel="Service type"
                />
              ),
            },
            {
              label: 'bare',
              caption: 'nested inside InsetField — no own border/height',
              node: (
                <IconSelect
                  value={bareValue}
                  onChange={setBareValue}
                  options={PRIORITY_OPTIONS}
                  placeholder="Select priority"
                  ariaLabel="Priority"
                  bare
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'value', type: 'string | null', required: true, description: 'Selected option value.' },
            { prop: 'onChange', type: '(value: string) => void', required: true, description: 'Fires when an option row is clicked.' },
            { prop: 'options', type: 'IconSelectOption[]', required: true, description: 'value, label, optional icon, optional disabled per row.' },
            { prop: 'leadingIcon', type: 'ReactNode', description: 'Static trigger glyph regardless of selection. Falls back to the selected option’s own icon.' },
            { prop: 'sectionLabel', type: 'ReactNode', description: 'Small gray caption at the top of the popover list. Defaults to ariaLabel.' },
            { prop: 'placeholder', type: 'string', default: "'Select…'", description: 'Trigger text when nothing is selected.' },
            { prop: 'disabled', type: 'boolean', default: 'false', description: 'Disables the trigger and prevents opening.' },
            { prop: 'hasError', type: 'boolean', default: 'false', description: 'Destructive border on the (non-bare) trigger.' },
            { prop: 'ariaLabel', type: 'string', description: 'Accessible name for the trigger and popover listbox.' },
            { prop: 'bare', type: 'boolean', default: 'false', description: 'Strips the trigger’s own border/background/height for nesting inside a shell (e.g. InsetField).' },
            { prop: 'className', type: 'string', description: 'Applied to the trigger.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use IconSelect for a short, static list where a search box would be overkill — reach for Combobox once the list grows or needs search.',
            'Always pass ariaLabel when the trigger carries no visible text label of its own.',
            'Pair bare with InsetField (or another field shell) rather than leaving it borderless in open layout.',
          ]}
          donts={[
            "Don't use IconSelect for a large or searchable list — that's Combobox's job.",
            "Don't rely on the leading icon alone to convey meaning — pair it with the option's text label.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Trigger is a real button with aria-haspopup="listbox", aria-expanded, and aria-controls wired to the list.',
            'Popover content exposes role="listbox" with role="option" rows and aria-selected on the active match.',
            'Disabled options set aria-disabled via the native disabled attribute and are unreachable by pointer/keyboard.',
            'Popover positioning and row layout use logical properties, so it mirrors correctly under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
