import { useState } from 'react'
import { FilterPopup } from '../../../../packages/ui-kit/src/composites/FilterPopup'
import { Checkbox } from '../../../../packages/ui-kit/src/primitives/Checkbox'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

const STATUS_OPTIONS = [
  { value: 'moving', label: 'Moving' },
  { value: 'idling', label: 'Idling' },
  { value: 'stopped', label: 'Stopped' },
]

/** Small controlled checkbox-group used as sample filter content across the demos below. */
function SampleFilterControls({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-body-sm font-semibold text-muted-foreground">Mobility Status</div>
      <div className="flex flex-col gap-2">
        {STATUS_OPTIONS.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={selected.includes(option.value)}
              onCheckedChange={() => onToggle(option.value)}
              aria-label={option.label}
            />
            <span className="text-body-sm text-foreground">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

/**
 * FilterPopupDemo — popover CHROME for a "Filters" entry point: trigger
 * button + active-count badge, a popover body that is entirely
 * caller-supplied content, and an optional Clear all / Apply footer.
 */
export default function FilterPopupDemo() {
  const [basic, setBasic] = useState<string[]>([])
  const [withFooter, setWithFooter] = useState<string[]>(['moving'])

  const toggle = (setter: typeof setBasic) => (value: string) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))

  return (
    <DocPage
      title="FilterPopup"
      badge="stable"
      summary="Popover chrome for a Filters entry point — trigger button + active-count badge, a popover body that is entirely caller-supplied content, and an optional Clear all / Apply footer. Retires the outline-button + floating q-badge + q-popup-proxy pattern copy-pasted in v5's ZonesFilterPanel.vue and EspPlansPanel.vue."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          <Code>activeCount</Code> drives the trigger badge; footer buttons appear per-callback. Click
          the trigger to open the popover.
        </Prose>
        <FilterPopup
          activeCount={withFooter.length}
          onClearAll={() => setWithFooter([])}
          onApply={() => {
            // eslint-disable-next-line no-console -- showcase-only demo affordance.
            console.log('Apply filters', withFooter)
          }}
        >
          <SampleFilterControls selected={withFooter} onToggle={toggle(setWithFooter)} />
        </FilterPopup>
      </DocSection>

      <DocSection id="options" title="Options">
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'No footer',
              caption: 'omitting onClearAll/onApply hides the footer entirely',
              node: (
                <FilterPopup>
                  <SampleFilterControls selected={basic} onToggle={toggle(setBasic)} />
                </FilterPopup>
              ),
            },
            {
              label: 'Disabled',
              caption: 'native disabled on the trigger button',
              node: (
                <FilterPopup disabled activeCount={2}>
                  <SampleFilterControls selected={basic} onToggle={toggle(setBasic)} />
                </FilterPopup>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="sizes" title="Sizes & variants">
        <Prose>
          <Code>size</Code> and <Code>variant</Code> forward straight to the underlying trigger Button.
        </Prose>
        <Gallery
          minColRem={10}
          items={[
            {
              label: 'sm / ghost',
              node: (
                <FilterPopup size="sm" variant="ghost" activeCount={1}>
                  <SampleFilterControls selected={basic} onToggle={toggle(setBasic)} />
                </FilterPopup>
              ),
            },
            {
              label: 'md / tertiary',
              caption: 'default',
              node: (
                <FilterPopup size="md" variant="tertiary">
                  <SampleFilterControls selected={basic} onToggle={toggle(setBasic)} />
                </FilterPopup>
              ),
            },
            {
              label: 'lg / secondary',
              node: (
                <FilterPopup size="lg" variant="secondary" activeCount={2}>
                  <SampleFilterControls selected={basic} onToggle={toggle(setBasic)} />
                </FilterPopup>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'activeCount',
              type: 'number',
              description: 'Shown as a badge on the trigger; 0 or undefined hides it.',
            },
            {
              prop: 'triggerLabel',
              type: 'string',
              default: "'Filters'",
              description: 'Trigger button label.',
            },
            {
              prop: 'open',
              type: 'boolean',
              description: 'Controlled open state.',
            },
            {
              prop: 'defaultOpen',
              type: 'boolean',
              description: 'Uncontrolled initial open state.',
            },
            {
              prop: 'onOpenChange',
              type: '(open: boolean) => void',
              description: 'Fires when the popover opens or closes.',
            },
            {
              prop: 'children',
              type: 'ReactNode',
              required: true,
              description: 'Popover body — arbitrary filter content (checkboxes, a form, or a nested FilterPanel).',
            },
            {
              prop: 'onClearAll',
              type: '() => void',
              description: 'Shows a Clear all footer action when provided.',
            },
            {
              prop: 'clearAllLabel',
              type: 'string',
              default: "'Clear all'",
              description: 'Clear all button label.',
            },
            {
              prop: 'onApply',
              type: '() => void',
              description: 'Shows an Apply footer action when provided. Omit for live-filtering UIs.',
            },
            {
              prop: 'applyLabel',
              type: 'string',
              default: "'Apply'",
              description: 'Apply button label.',
            },
            {
              prop: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Trigger button size.',
            },
            {
              prop: 'variant',
              type: "ButtonProps['variant']",
              default: "'tertiary'",
              description: 'Trigger button variant, forwarded to Button.',
            },
            {
              prop: 'disabled',
              type: 'boolean',
              description: 'Disables the trigger.',
            },
            {
              prop: 'align',
              type: "'start' | 'center' | 'end'",
              default: "'start'",
              description: 'Popover content alignment relative to the trigger.',
            },
            {
              prop: 'className',
              type: 'string',
              description: 'Class applied to the popover content shell.',
            },
            {
              prop: 'triggerClassName',
              type: 'string',
              description: 'Class applied to the trigger button.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Pass activeCount so users see how many filters are already applied before opening.',
            'Nest FilterPanel as children for the full faceted "All Filters" case — but drop onClearAll/onApply here since FilterPanel ships its own header chrome.',
            'Omit onApply for live-filtering UIs where each toggle applies immediately.',
            'Keep the body content focused — FilterPopup caps it at a fixed height with its own scroll.',
          ]}
          donts={[
            'Don’t render FilterPanel inside FilterPopup while also passing onClearAll/onApply — the two Clear-all actions duplicate.',
            'Don’t use FilterPopup for a single boolean toggle — a Checkbox or Switch is enough.',
            'Don’t put anything but filter controls in the body; it’s not a general-purpose popover.',
            'Don’t disable the trigger without explaining why nearby (e.g. "no data loaded yet").',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The trigger is a native Button — full keyboard support and a visible focus ring.',
            'Built on Radix Popover — Escape closes it and returns focus to the trigger; an outside click dismisses.',
            'The active-count Badge is aria-hidden — the count is supplementary, not the only signal of filter state.',
            'Footer buttons (Clear all / Apply) are ordinary buttons, reachable by Tab in document order.',
            'Layout uses logical gap/align utilities, so the trigger and popover content mirror correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          Thin composition over <Code>Popover</Code> + <Code>Button</Code> + <Code>Badge</Code> — no
          new visual surface. The body is always caller content; FilterPopup never renders filter
          controls itself.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
