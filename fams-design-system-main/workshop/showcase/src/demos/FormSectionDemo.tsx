import { FormSection, FormGrid, Stack, Input, Label } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

/** Bordered placeholder box — deliberately plain so the section's own internal gap="field" stack reads clearly. */
const Box = ({ label }: { label: string }) => (
  <div className="rounded-sm border border-border bg-background px-4 py-3 text-body-sm text-foreground">
    {label}
  </div>
)

function Field({ label }: { label: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input placeholder={label} className="mt-1" />
    </div>
  )
}

/**
 * FormSectionDemo — a titled group of fields. Internally stacks children with
 * gap="field"; sections themselves are meant to be composed inside a
 * Stack gap="section" so the section-to-section gap is also a preset.
 */
export default function FormSectionDemo() {
  return (
    <DocPage
      title="FormSection"
      badge="stable"
      summary='A titled group of fields. Internally stacks children with gap="field"; sections themselves are meant to be composed inside a Stack gap="section" so the section-to-section gap is also a preset, never a hand-written margin.'
    >
      <DocSection id="options" title="Title & description">
        <Gallery
          minColRem={18}
          items={[
            {
              label: 'Title only',
              node: (
                <FormSection title="Vehicle details" className="w-full max-w-xs">
                  <Box label="Plate number" />
                  <Box label="Vehicle type" />
                </FormSection>
              ),
            },
            {
              label: 'Title + description',
              node: (
                <FormSection
                  title="Contact details"
                  description="Used for dispatch notifications."
                  className="w-full max-w-xs"
                >
                  <Box label="Phone" />
                </FormSection>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="composition" title="Composition">
        <Prose>
          Sections stack with <Code>gap="section"</Code>; fields inside each section stack with{' '}
          <Code>gap="field"</Code> (or a nested <Code>FormGrid</Code>).
        </Prose>
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'Multiple sections in a Stack',
              node: (
                <Stack gap="section" className="w-full max-w-sm">
                  <FormSection title="Vehicle details">
                    <FormGrid columns={2}>
                      <Field label="Plate number" />
                      <Field label="Vehicle type" />
                    </FormGrid>
                  </FormSection>
                  <FormSection
                    title="Contact details"
                    description="Used for dispatch notifications."
                  >
                    <Field label="Phone" />
                  </FormSection>
                </Stack>
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
              required: true,
              description: 'Section heading.',
            },
            {
              prop: 'description',
              type: 'ReactNode',
              description: 'Optional supporting line below the title.',
            },
            {
              prop: 'children',
              type: 'ReactNode',
              description: 'Field content, stacked internally with gap="field".',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLElement>, 'title'>",
              description: 'className and any element attribute pass through (native title is omitted).',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use one FormSection per logical group of related fields (vehicle details, contact details).',
            'Add description only when the heading alone leaves the fields ambiguous.',
            'Compose multiple sections inside a Stack gap="section" for consistent section-to-section spacing.',
            'Nest a FormGrid inside a section when the group has more than one field per row.',
          ]}
          donts={[
            "Don't hand-write a margin-top between sections — that's the wrapping Stack's job.",
            "Don't use FormSection for a single field; a Label + Input pair is enough on its own.",
            "Don't put unrelated fields in one section just to avoid a second heading.",
            "Don't repeat the section title inside the description — keep it a supporting line.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a semantic <section> with a heading (<h3>), giving the group a landmark and a name.',
            'The description is a plain paragraph, read by assistive tech immediately after the heading.',
            'Purely structural; does not manage focus or add interaction.',
            'Heading, description, and field stack all follow logical text alignment — no direction-specific overrides under RTL.',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          The native <Code>title</Code> attribute is intentionally omitted from the passthrough
          props — the component's own <Code>title</Code> prop is the section heading, not a
          browser tooltip. Related: <Code>FormGrid</Code> for multi-column field layout inside a
          section.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
