import { PriorityChip, type PriorityChipVariant } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const VARIANTS: PriorityChipVariant[] = ['critical', 'high', 'medium', 'minor']

type PriorityChipControls = {
  variant: PriorityChipVariant
}

/**
 * PriorityChipDemo — the light-bg/normal-tone-icon severity chip for a
 * record's priority. Shared visual across kanban cards and list rows.
 */
export default function PriorityChipDemo() {
  return (
    <DocPage
      title="PriorityChip"
      badge="stable"
      summary="Light-fill severity chip with a leading flag icon and caps label. critical/high share one color pair (same pixel color, different copy); medium and minor each get their own tint."
    >
      <DocSection id="playground" title="Playground">
        <Playground<PriorityChipControls>
          controls={[{ name: 'variant', type: 'select', default: 'high', options: VARIANTS }]}
        >
          {(v) => <PriorityChip variant={v.variant} />}
        </Playground>
      </DocSection>

      <DocSection id="variants" title="Variants">
        <Prose>
          <Code>critical</Code> and <Code>high</Code> sample the same pixel color (Error/Lightest ↔
          Normal) — the label copy differs, the color doesn't. <Code>medium</Code> maps to Warning,{' '}
          <Code>minor</Code> to Success.
        </Prose>
        <Gallery
          items={VARIANTS.map((variant) => ({
            label: variant,
            node: <PriorityChip variant={variant} />,
          }))}
        />
      </DocSection>

      <DocSection id="custom-label-icon" title="Custom label & icon">
        <Prose>
          <Code>children</Code> overrides the default variant-name label (e.g. the "Low" synonym for{' '}
          <Code>minor</Code>); <Code>icon</Code> overrides the default flag glyph, or pass{' '}
          <Code>null</Code> to omit it.
        </Prose>
        <Gallery
          minColRem={9}
          items={[
            { label: 'custom label', caption: '"Low" for minor', node: <PriorityChip variant="minor">Low</PriorityChip> },
            { label: 'custom label', caption: '"Urgent" for critical', node: <PriorityChip variant="critical">Urgent</PriorityChip> },
            { label: 'icon={null}', caption: 'no leading icon', node: <PriorityChip variant="medium" icon={null} /> },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'variant',
              type: "'critical' | 'high' | 'medium' | 'minor'",
              required: true,
              default: "'medium'",
              description: 'Severity tier — each pre-wired to its token color pair.',
            },
            {
              prop: 'icon',
              type: 'ReactNode | null',
              default: '<Flag />',
              description: 'Leading icon override. Pass null to omit.',
            },
            { prop: 'children', type: 'ReactNode', default: 'variant', description: 'Label text; defaults to the variant name.' },
            { prop: '…props', type: 'HTMLAttributes<HTMLSpanElement>', description: 'className, and any span attribute pass through.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use PriorityChip specifically for severity/priority — not general status (StatusPill) or record identity (IdChip).',
            'Let variant drive the color; only override children for a synonymous label the data already uses.',
          ]}
          donts={[
            "Don't mix PriorityChip and StatusPill in the same column for the same semantic meaning.",
            "Don't pick icon={null} without a compensating text label — color alone isn't an accessible signal.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a non-interactive <span> — severity is conveyed via its text label, not color alone.',
            'The default flag icon is decorative (aria-hidden); the text label carries meaning for assistive tech.',
            'Layout uses logical properties, so it mirrors correctly under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
