import { useState } from 'react'
import {
  FiltersSheet,
  type FiltersSheetSection,
  type FiltersSheetValue,
} from '../../../../packages/ui-kit/src/composites/FiltersSheet'
import { Button } from '../../../../packages/ui-kit/src/primitives/Button'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

const SECTIONS: FiltersSheetSection[] = [
  {
    key: 'schedule',
    label: 'Schedule',
    fields: [
      {
        key: 'shift',
        label: 'Select Shift',
        type: 'select',
        options: [
          { value: 'morning', label: 'Morning' },
          { value: 'afternoon', label: 'Afternoon' },
          { value: 'evening', label: 'Evening' },
        ],
      },
      { key: 'date', label: 'Select Date', type: 'date' },
    ],
  },
  {
    key: 'tags',
    label: 'Tags',
    fields: [
      {
        key: 'tag',
        label: 'Select Tag',
        type: 'combobox',
        multiple: true,
        options: [
          { value: 'stringer', label: 'Stringer' },
          { value: 'inspections', label: 'Inspections' },
          { value: 'rectification-due', label: 'Rectification Due' },
        ],
      },
    ],
  },
  {
    key: 'waste-types',
    label: 'Waste Types',
    fields: [
      {
        key: 'wasteTypes',
        label: 'Waste Types',
        type: 'checkbox-group',
        options: [
          { value: 'recyclables', label: 'Recyclables', count: 102 },
          { value: 'general', label: 'General', count: 102 },
          { value: 'under-bin-washing', label: 'Under Bin Washing', count: 102 },
          { value: 'deep-washing', label: 'Deep Washing', count: 102 },
        ],
      },
    ],
  },
]

function activeFieldCount(value: FiltersSheetValue): number {
  return Object.values(value).filter((v) => {
    if (Array.isArray(v)) return v.length > 0
    if (v && typeof v === 'object') return Boolean((v as { from?: unknown }).from)
    return Boolean(v)
  }).length
}

/**
 * FiltersSheetDemo — the "All Filters" extended right side sheet: an
 * arbitrary set of filter fields (text/select/combobox/date/checkbox-group)
 * grouped into collapsible Accordion sections. Reference: Tadweer July Figma
 * node 4217:27408 ("Plan Monitoring Filters" / "All Filters").
 */
export default function FiltersSheetDemo() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<FiltersSheetValue>({ wasteTypes: ['recyclables'] })
  const [applied, setApplied] = useState<FiltersSheetValue>(value)

  return (
    <DocPage
      title="FiltersSheet"
      badge="stable"
      summary="The standard FAMS V5 'All Filters' extended side sheet — a full-height right-anchored Sheet grouping data-driven filter fields (text/select/combobox/date/checkbox-group) into collapsible Accordion sections, with Clear all + Apply chrome."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Sections and fields are entirely data-driven via <Code>sections</Code> — no bespoke section
          components. Expand a section, pick options, then Apply.
        </Prose>
        <Button onClick={() => setOpen(true)}>Open All Filters ({activeFieldCount(applied)})</Button>
        <FiltersSheet
          open={open}
          onOpenChange={setOpen}
          sections={SECTIONS}
          value={value}
          onChange={setValue}
          activeCount={activeFieldCount(value)}
          onApply={(next) => {
            setApplied(next)
            setOpen(false)
          }}
          onClear={() => setApplied({})}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'open', type: 'boolean', required: true, description: 'Controlled open state.' },
            {
              prop: 'onOpenChange',
              type: '(open: boolean) => void',
              required: true,
              description: 'Fires when the sheet opens or closes.',
            },
            { prop: 'title', type: 'ReactNode', default: "'All Filters'", description: 'Sheet header title.' },
            {
              prop: 'sections',
              type: 'FiltersSheetSection[]',
              required: true,
              description: 'Accordion sections, each a label + a list of FiltersSheetField definitions.',
            },
            {
              prop: 'value',
              type: 'FiltersSheetValue',
              required: true,
              description: 'Controlled field values, keyed by field key.',
            },
            {
              prop: 'onChange',
              type: '(value: FiltersSheetValue) => void',
              required: true,
              description: 'Fires on every field mutation.',
            },
            {
              prop: 'onApply',
              type: '(value: FiltersSheetValue) => void',
              description: 'Shows the Apply footer button when provided.',
            },
            {
              prop: 'onClear',
              type: '() => void',
              description: 'Shows the header Clear all action; also empties value via onChange.',
            },
            { prop: 'activeCount', type: 'number', description: 'Badge shown next to the title.' },
            {
              prop: 'defaultOpenSections',
              type: 'string[]',
              description: 'Section keys open by default. Defaults to every section open.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="field-types" title="Field types">
        <Prose>
          Each <Code>FiltersSheetField.type</Code> maps to an existing DS primitive/composite —{' '}
          <Code>text</Code> → Input, <Code>select</Code> → Select, <Code>combobox</Code> → Combobox
          (self-searchable, supports <Code>multiple</Code>), <Code>date</Code> → DateRangePicker in{' '}
          <Code>single</Code> mode, <Code>checkbox-group</Code> → a Checkbox grid. No new field
          components were introduced.
        </Prose>
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use FiltersSheet for the "advanced filtering beyond the standard dropdown" case — several field types, grouped, in one place.',
            'Keep FilterPopup for a single anchored, lighter-weight filter set.',
            'Drive sections/fields as data — never hand-roll a per-screen filter section component.',
            'Pass activeCount so the trigger reflects how many filters are already applied.',
          ]}
          donts={[
            'Don’t nest FiltersSheet inside FilterPopup — they are alternative chrome for the same job.',
            'Don’t bypass onChange to mutate value directly — the sheet is fully controlled.',
            'Don’t add business-specific field types — compose the five generic types instead.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Built on the DS Sheet (Radix Dialog) — focus trap, Esc-to-close, and RTL-correct slide direction.',
            'Sections use the DS Accordion (Radix Accordion) — full keyboard support (arrow keys, Home/End).',
            'Every field renders its own accessible label (Select/Combobox/DateRangePicker triggers, or an aria-label on checkboxes).',
            'The active-count Badge is aria-hidden — supplementary, not the only signal of filter state.',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          Composes <Code>Sheet</Code> + <Code>Accordion</Code> + <Code>CustomScrollbar</Code> +
          existing field primitives/composites (<Code>Input</Code>, <Code>Select</Code>,{' '}
          <Code>Combobox</Code>, <Code>DateRangePicker</Code>, <Code>Checkbox</Code>) — no new visual
          primitive. Sibling of <Code>FilterPopup</Code>; both wrap arbitrary/data-driven filter
          content in DS chrome rather than owning filter logic themselves.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
