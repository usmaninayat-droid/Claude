import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../../../../packages/ui-kit/src/primitives/Accordion'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

type AccordionMode = 'single' | 'multiple'

const MODES: { mode: AccordionMode; caption: string }[] = [
  { mode: 'single', caption: 'collapsible — opening a section closes the previous one' },
  { mode: 'multiple', caption: 'independent — any number of sections open at once' },
]

function ContractSections() {
  return (
    <>
      <AccordionItem value="requirements">
        <AccordionTrigger>Service Requirements</AccordionTrigger>
        <AccordionContent>
          Collection frequency, bin count, and route coverage for this contract.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="contacts">
        <AccordionTrigger>Contact Persons</AccordionTrigger>
        <AccordionContent>Primary and escalation contacts for this lot.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="history">
        <AccordionTrigger>History</AccordionTrigger>
        <AccordionContent>Prior amendments and renewal dates.</AccordionContent>
      </AccordionItem>
    </>
  )
}

/**
 * AccordionDemo — reference implementation of the standard component-page
 * template (DocPage → Gallery per dimension → PropsTable → Guidelines →
 * Accessibility). RTL is proven by the global header switcher, not a
 * per-page block. See docs/COMPONENT-GUIDE.md.
 */
export default function AccordionDemo() {
  return (
    <DocPage
      title="Accordion"
      badge="stable"
      summary="Vertically stacked, collapsible content sections — replaces q-expansion-item. Composition (which sections, default-open state, single vs. multiple open) is Radix's own type/value/defaultValue props; content is a render slot."
    >
      <DocSection id="composition" title="Composition">
        <Prose>
          <Code>type</Code> picks the interaction model: <Code>single</Code> (optionally{' '}
          <Code>collapsible</Code>) closes the previous section on open; <Code>multiple</Code> lets
          any number of sections stay open independently.
        </Prose>
        <Gallery
          minColRem={20}
          items={MODES.map(({ mode, caption }) => ({
            label: mode,
            caption,
            node: (
              <div className="w-full max-w-sm">
                {mode === 'single' ? (
                  <Accordion type="single" collapsible defaultValue="requirements">
                    <ContractSections />
                  </Accordion>
                ) : (
                  <Accordion type="multiple" defaultValue={['requirements', 'contacts']}>
                    <ContractSections />
                  </Accordion>
                )}
              </div>
            ),
          }))}
        />
      </DocSection>

      <DocSection id="states" title="States">
        <Prose>
          Native <Code>disabled</Code> on a single <Code>AccordionItem</Code> — its trigger is inert
          and skipped by keyboard navigation while sibling items stay interactive.
        </Prose>
        <Gallery
          minColRem={20}
          items={[
            {
              label: 'disabled item',
              node: (
                <div className="w-full max-w-sm">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="locked" disabled>
                      <AccordionTrigger>Financial Settlement (locked)</AccordionTrigger>
                      <AccordionContent>
                        Not available until Oracle GRN integration lands.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="open">
                      <AccordionTrigger>Compliance Notes</AccordionTrigger>
                      <AccordionContent>Standard notes visible to all lots.</AccordionContent>
                    </AccordionItem>
                  </Accordion>
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
              prop: 'type',
              type: "'single' | 'multiple'",
              required: true,
              description: 'Whether one section or several may be open at a time.',
            },
            {
              prop: 'value / defaultValue',
              type: 'string | string[]',
              description:
                'Controlled or uncontrolled open value(s) — string for single, string[] for multiple.',
            },
            {
              prop: 'onValueChange',
              type: '(value: string | string[]) => void',
              description: 'Fires when the open section(s) change.',
            },
            {
              prop: 'collapsible',
              type: 'boolean',
              default: 'false',
              description: 'type="single" only — allows closing the currently open section.',
            },
            {
              prop: 'disabled',
              type: 'boolean',
              default: 'false',
              description: 'Disables every item in the accordion at once.',
            },
            {
              prop: 'AccordionItem value',
              type: 'string',
              required: true,
              description: 'Unique identifier the root uses to track open state for this item.',
            },
            {
              prop: 'AccordionItem disabled',
              type: 'boolean',
              default: 'false',
              description: 'Disables this single item; its trigger is inert and skipped by keyboard nav.',
            },
            {
              prop: '…props',
              type: 'ComponentPropsWithoutRef<typeof Accordion.Root | .Item | .Trigger | .Content>',
              description:
                'AccordionTrigger renders a native button, AccordionContent a div — remaining native attributes pass through on every part.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use single + collapsible for FAQ-style or drill-down detail panels.',
            'Use multiple when sections are independent and comparing two at once is useful.',
            'Keep trigger labels short — they are headings, not full sentences.',
            'Disable an item (not the whole accordion) when only one section is locked, e.g. pending an integration.',
          ]}
          donts={[
            "Don't nest an accordion inside another accordion — flatten the hierarchy instead.",
            "Don't use it for primary page navigation — that's a Tabs or sidebar concern.",
            "Don't put the only piece of critical content behind a collapsed section by default.",
            "Don't hand-roll a details/summary or custom toggle — this is the one canonical disclosure pattern.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Trigger is a native <button> inside an <h3>-equivalent header — full keyboard support (Enter/Space to toggle, Tab to move between triggers).',
            'Content region uses aria-hidden and height animation driven by data-state, so assistive tech only announces the open panel.',
            'Disabled items are removed from the keyboard tab order automatically.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
