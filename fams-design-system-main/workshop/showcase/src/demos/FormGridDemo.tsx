import { FormGrid, Stack, Input, Label, type LayoutGap } from '@fams/ui-kit'
import {
  DocPage,
  DocSection,
  Prose,
  Gallery,
  Playground,
  PropsTable,
  Guidelines,
  A11yList,
  DevNote,
  Code,
} from '../docs'

/** Bordered placeholder box — deliberately plain so the grid's own gap/columns read clearly. */
const Box = ({ label }: { label: string }) => (
  <div className="rounded-sm border border-border bg-background px-4 py-3 text-center text-body-sm text-foreground">
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

const GAPS: LayoutGap[] = ['inline', 'field', 'section']
const COLUMNS = ['1', '2', '3', '4'] as const

type FormGridControls = {
  columns: (typeof COLUMNS)[number]
  gap: LayoutGap
}

/**
 * FormGridDemo — the answer to "how do we lay out N input fields": pick a
 * column count, the grid owns every gap.
 */
export default function FormGridDemo() {
  return (
    <DocPage
      title="FormGrid"
      badge="stable"
      summary="The answer to 'how do we lay out N input fields' — pick a column count, the grid owns every gap. Collapses to a single column below the sm breakpoint. A field that needs the full row spans with className='sm:col-span-full' on the child."
    >
      <DocSection id="playground" title="Playground">
        <Playground<FormGridControls>
          controls={[
            { name: 'columns', type: 'select', default: '2', options: COLUMNS },
            { name: 'gap', type: 'select', default: 'field', options: GAPS },
          ]}
        >
          {(v) => (
            <FormGrid
              columns={Number(v.columns) as 1 | 2 | 3 | 4}
              gap={v.gap}
              className="w-full max-w-lg"
            >
              <Field label="Plate number" />
              <Field label="Vehicle type" />
              <Field label="Phone" />
              <Field label="Email" />
            </FormGrid>
          )}
        </Playground>
      </DocSection>

      <DocSection id="columns" title="Columns">
        <Prose>
          Column count applies at the widest breakpoint; the grid always collapses to a single
          column below <Code>sm</Code>.
        </Prose>
        <Gallery
          minColRem={14}
          items={COLUMNS.map((columns) => ({
            label: `columns={${columns}}`,
            node: (
              <FormGrid columns={Number(columns) as 1 | 2 | 3 | 4} className="w-full max-w-xs">
                {Array.from({ length: Number(columns) * 2 }, (_, i) => (
                  <Box key={i} label={`${i + 1}`} />
                ))}
              </FormGrid>
            ),
          }))}
        />
      </DocSection>

      <DocSection id="gap" title="Gap presets">
        <Prose>
          <Code>inline</Code> (8px), <Code>field</Code> (16px, default), and <Code>section</Code>{' '}
          (24px) — applied to both row and column gap together.
        </Prose>
        <Gallery
          minColRem={14}
          items={GAPS.map((gap) => ({
            label: `gap="${gap}"`,
            node: (
              <FormGrid columns={2} gap={gap} className="w-full max-w-xs">
                <Box label="A" />
                <Box label="B" />
                <Box label="C" />
                <Box label="D" />
              </FormGrid>
            ),
          }))}
        />
      </DocSection>

      <DocSection id="composition" title="Composition">
        <Prose>
          A child spans the row with <Code>className="sm:col-span-full"</Code> — the grid still
          owns the surrounding gaps. Wrap multiple grids in a <Code>Stack gap="section"</Code> so
          the grid-to-grid gap is also a preset.
        </Prose>
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'Full-row span',
              node: (
                <FormGrid columns={2} className="w-full max-w-sm">
                  <Field label="First name" />
                  <Field label="Last name" />
                  <div className="sm:col-span-full">
                    <Field label="Notes" />
                  </div>
                </FormGrid>
              ),
            },
            {
              label: 'Inside a Stack',
              caption: 'gap="section" between grids',
              node: (
                <Stack gap="section" className="w-full max-w-sm">
                  <FormGrid columns={2}>
                    <Field label="Plate number" />
                    <Field label="Vehicle type" />
                  </FormGrid>
                  <FormGrid columns={2}>
                    <Field label="Phone" />
                    <Field label="Email" />
                  </FormGrid>
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
              prop: 'columns',
              type: '1 | 2 | 3 | 4',
              default: '2',
              description: 'Column count at the widest breakpoint; collapses to 1 below sm.',
            },
            {
              prop: 'gap',
              type: "'inline' | 'field' | 'section'",
              default: "'field'",
              description: 'Semantic gap preset — applies to row and column gap together.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'className, children, and any div attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Pick the column count that matches the number of related fields, not the widest screen.',
            "Span a field to the full row with className='sm:col-span-full' for long inputs (notes, address).",
            'Wrap multiple FormGrids in a Stack gap="section" for section-to-section spacing.',
            'Pair every field with a Label — the grid only owns spacing, not field semantics.',
          ]}
          donts={[
            "Don't hardcode grid-cols-* on a wrapper div — let columns own the breakpoint logic.",
            "Don't nest a FormGrid inside another FormGrid; use FormSection to group instead.",
            "Don't override gap with an inline style; add a token if 3 presets are not enough.",
            "Don't use FormGrid for non-form content — that's a plain grid, not this primitive.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a plain <div> — no implicit role; accessibility comes from the fields inside it.',
            'Visual column order follows DOM order, so tab order matches what is read on screen.',
            'Purely presentational spacing; never traps or reorders focus.',
            'grid-cols mirrors automatically via logical flow under RTL — column order flips, no direction-specific overrides.',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          Built on <Code>Stack</Code>'s gap tokens, not a bespoke spacing scale. Below the{' '}
          <Code>sm</Code> breakpoint every column count collapses to one — design for the
          single-column case first, then check wider layouts.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
