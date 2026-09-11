import { Ticket } from '@fams/ui-kit/icons'
import { IdChip } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * IdChipDemo — the gray, `#`-prefixed record-id chip. Centralizes what used
 * to be a Badge override built inline by v5-composer's ReadAuto renderer.
 */
export default function IdChipDemo() {
  return (
    <DocPage
      title="IdChip"
      badge="stable"
      summary="Flat gray chip for a system-generated identifier — leading hash icon, #eaecf0-ish fill, neutral text. The same visual behind a blueprint's Auto-typed field and kanban/list card templates that render an id directly."
    >
      <DocSection id="examples" title="Examples">
        <Prose>
          Defaults to a leading <Code>#</Code>/hash glyph. Pass <Code>icon</Code> to swap it for a
          context-specific glyph, or <Code>icon={'{null}'}</Code> to omit it entirely.
        </Prose>
        <Gallery
          minColRem={9}
          items={[
            { label: 'default', caption: 'hash icon', node: <IdChip>TK-25874</IdChip> },
            { label: 'longer id', node: <IdChip>REQ-2026-004821</IdChip> },
            {
              label: 'custom icon',
              caption: 'e.g. a ticket glyph',
              node: (
                <IdChip icon={<Ticket aria-hidden="true" />}>TK-25874</IdChip>
              ),
            },
            { label: 'icon={null}', caption: 'no leading icon', node: <IdChip icon={null}>TK-25874</IdChip> },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'icon',
              type: 'ReactNode | null',
              default: '<Hash />',
              description: 'Leading icon override. Pass null to omit.',
            },
            { prop: 'children', type: 'ReactNode', description: 'The identifier text (e.g. "TK-25874").' },
            { prop: '…props', type: 'HTMLAttributes<HTMLSpanElement>', description: 'className, and any span attribute pass through.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use IdChip for any system-generated record identifier rendered inline in a card or table cell.',
            "Keep the id's own formatting (dashes, prefixes) as authored by the source system.",
          ]}
          donts={[
            "Don't reuse IdChip for a human-editable label — that's Badge or plain text.",
            "Don't hand-roll a gray hash chip inline; render IdChip so every host stays visually identical.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a non-interactive <span> — the identifier text itself is the accessible content.',
            'The hash icon is decorative (aria-hidden).',
            'Layout uses logical properties, so it mirrors correctly under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
