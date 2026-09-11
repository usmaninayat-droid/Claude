import { Wrench, ChevronDown } from '@fams/ui-kit/icons'
import { InsetField, Input } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * InsetFieldDemo — the "outlined box with an inline label" field shell.
 * The label sits inside the shared outline (above the value), as opposed
 * to Input's floating-label mode where the label starts centered and
 * floats up to the top edge.
 */
export default function InsetFieldDemo() {
  return (
    <DocPage
      title="InsetField"
      badge="stable"
      summary="Outlined box containing a small caption above the value — a generic field shell whose value slot accepts plain text or a bare-mode Input/Select/Combobox trigger stripped of its own border. Consumed by v5-composer's edit widgets via chrome=&quot;inset-label&quot;."
    >
      <DocSection id="basic" title="Basic usage">
        <Prose>
          <Code>children</Code> accepts plain text/read-only content, or a <Code>bare</Code>-mode
          Input/Select/Combobox trigger so InsetField supplies the single outline.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'Editable (bare Input)',
              node: (
                <InsetField label="Title" htmlFor="demo-inset-title">
                  <Input id="demo-inset-title" bare defaultValue="TAMM Issue reported by client" />
                </InsetField>
              ),
            },
            {
              label: 'Read-only text',
              node: (
                <InsetField label="Service Type">Waste Container Cleaning</InsetField>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="icons-states" title="Icons & states">
        <Gallery
          layout="rows"
          items={[
            {
              label: 'Leading icon',
              caption: 'vertically centered across the whole box',
              node: (
                <InsetField label="Service Type" leadingIcon={<Wrench aria-hidden="true" />}>
                  Waste Container Cleaning
                </InsetField>
              ),
            },
            {
              label: 'Leading + trailing icon',
              caption: 'e.g. a select-style chevron',
              node: (
                <InsetField
                  label="Priority"
                  leadingIcon={<Wrench aria-hidden="true" />}
                  trailingIcon={<ChevronDown aria-hidden="true" />}
                >
                  Medium
                </InsetField>
              ),
            },
            {
              label: 'filled',
              caption: 'computed/readonly presentation — muted fill, no border',
              node: <InsetField label="Compliance Time" filled>4d 12h</InsetField>,
            },
            {
              label: 'hasError',
              node: (
                <InsetField label="Title" hasError htmlFor="demo-inset-error">
                  <Input id="demo-inset-error" bare hasError defaultValue="" />
                </InsetField>
              ),
            },
            {
              label: 'disabled',
              node: (
                <InsetField label="Title" disabled htmlFor="demo-inset-disabled">
                  <Input id="demo-inset-disabled" bare disabled defaultValue="Locked value" />
                </InsetField>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'label', type: 'ReactNode', required: true, description: 'Small muted caption rendered inside the box, above the value.' },
            { prop: 'children', type: 'ReactNode', required: true, description: 'The value/control — plain text, or a bare Input/Select/Combobox trigger.' },
            { prop: 'leadingIcon', type: 'ReactNode', description: 'Icon at the box’s logical start, centered across the whole box.' },
            { prop: 'trailingIcon', type: 'ReactNode', description: 'Icon/control at the box’s logical end (e.g. a chevron-down).' },
            { prop: 'filled', type: 'boolean', default: 'false', description: 'Computed/readonly presentation — muted fill, no border.' },
            { prop: 'hasError', type: 'boolean', default: 'false', description: 'Destructive border + label tint.' },
            { prop: 'disabled', type: 'boolean', default: 'false', description: 'Reduces opacity to signal a disabled field.' },
            { prop: 'htmlFor', type: 'string', description: 'Binds the visible label to the inner control’s id.' },
            { prop: '…props', type: 'HTMLAttributes<HTMLDivElement>', description: 'className, and any div attribute pass through.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Pass the same id to htmlFor and to the nested control so the label is programmatically bound.',
            'Strip the nested Input/Select/Combobox to bare mode — InsetField already supplies the outline.',
            'Use filled for computed/readonly values (e.g. a compliance countdown) rather than a plain outlined box.',
          ]}
          donts={[
            "Don't nest a control that keeps its own border/background — it will double up visually.",
            "Don't use InsetField for a floating-label field — that's Input's own floating-label mode.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The label renders as a real <label>; pass htmlFor (matching the nested control’s id) to bind it programmatically.',
            'hasError tints the label to signal invalid state visually; pair with aria-invalid on the nested control.',
            'Leading/trailing icon slots are decorative (aria-hidden) — meaning lives in the label and value text.',
            'Layout uses logical properties, so it mirrors correctly under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
