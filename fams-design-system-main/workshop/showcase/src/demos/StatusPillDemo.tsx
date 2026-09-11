import { StatusPill, type StatusPillVariant } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const VARIANTS: { variant: StatusPillVariant; label: string }[] = [
  { variant: 'newRequest', label: 'New request' },
  { variant: 'scheduled', label: 'Scheduled' },
  { variant: 'inProgress', label: 'In progress' },
  { variant: 'resolved', label: 'Resolved' },
  { variant: 'overdue', label: 'Overdue' },
  { variant: 'closed', label: 'Closed' },
  { variant: 'rejected', label: 'Rejected' },
]

type StatusPillControls = {
  variant: StatusPillVariant
  label: string
}

/**
 * StatusPillDemo — the ticketing-stage solid-fill status chip. Shared by the
 * list view's STATUS column pill and the grouped-list group-header pill —
 * same component, same 7-color mapping.
 */
export default function StatusPillDemo() {
  return (
    <DocPage
      title="StatusPill"
      badge="stable"
      summary="Solid-fill, white-text status chip for the 7 named ticketing stages, each pre-wired to its token color. A color escape hatch supports a tenant-added stage this fixed enum doesn't name."
    >
      <DocSection id="playground" title="Playground">
        <Playground<StatusPillControls>
          controls={[
            {
              name: 'variant',
              type: 'select',
              default: 'inProgress',
              options: VARIANTS.map((v) => v.variant),
            },
            { name: 'label', type: 'text', default: 'In Progress' },
          ]}
        >
          {(v) => <StatusPill variant={v.variant}>{v.label}</StatusPill>}
        </Playground>
      </DocSection>

      <DocSection id="variants" title="Variants">
        <Prose>
          The 7 ticketing stages, each mapped to a pixel-verified token color (see the component's
          module doc for the exact hex↔token table). <Code>resolved</Code> falls back to{' '}
          <Code>info-scale-500</Code> pending a dedicated token.
        </Prose>
        <Gallery
          items={VARIANTS.map(({ variant, label }) => ({
            label: variant,
            node: <StatusPill variant={variant}>{label}</StatusPill>,
          }))}
        />
      </DocSection>

      <DocSection id="color-override" title="Color override">
        <Prose>
          <Code>color</Code> is the blueprint-driven escape hatch for a tenant-added stage this fixed
          enum doesn't name — pass a runtime hex from the blueprint's own <Code>statusList[].color</Code>,
          never a literal in component source. Takes precedence over <Code>variant</Code>.
        </Prose>
        <Gallery
          minColRem={9}
          items={[
            {
              label: 'color="#7a5af8"',
              caption: 'tenant-added stage',
              node: <StatusPill color="#7a5af8">On hold</StatusPill>,
            },
            {
              label: 'with icon',
              caption: 'e.g. Reopened',
              node: (
                <StatusPill variant="newRequest" icon={<span aria-hidden>↻</span>}>
                  Reopened
                </StatusPill>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'variant',
              type: "'newRequest' | 'scheduled' | 'inProgress' | 'resolved' | 'overdue' | 'closed' | 'rejected'",
              description: 'One of the 7 named ticketing stages, each pre-wired to its token color.',
            },
            {
              prop: 'color',
              type: 'string',
              description: 'Raw color override — the blueprint-driven escape hatch. Takes precedence over variant.',
            },
            { prop: 'icon', type: 'ReactNode', description: 'Leading icon slot (e.g. a "Reopened" refresh glyph).' },
            { prop: '…props', type: 'HTMLAttributes<HTMLSpanElement>', description: 'className, children, and any span attribute pass through.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use the named variant whenever the stage is one of the 7 standard ticketing stages.',
            'Reserve color for a genuinely tenant-added stage sourced from the blueprint, not a hardcoded hex.',
            'Keep the label short — one or two words, matching the stage name.',
          ]}
          donts={[
            "Don't invent a new variant for a color already covered by the enum.",
            "Don't hardcode a hex literal in application code — thread it from the blueprint's own stage color.",
            "Don't use StatusPill for a non-status label — that's Badge's job.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a non-interactive <span> — status is conveyed via its text label, not color alone.',
            'Every named variant meets WCAG 2.2 AA contrast for white text on its fill color.',
            'Layout uses logical properties, so it mirrors correctly under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
