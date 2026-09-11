import { CountChip } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * CountChipDemo — small numeric pill for column/group headers. Shared by
 * the kanban column header counter and the list view's grouped-header count.
 */
export default function CountChipDemo() {
  return (
    <DocPage
      title="CountChip"
      badge="stable"
      summary="Small numeric pill for column/group headers. One neutral gray treatment always — never tinted by a status/stage color (fix7, P1-1 gate blocker)."
    >
      <DocSection id="examples" title="Examples">
        <Prose>
          Every count reads the same neutral gray regardless of context — the kanban column
          header counter and the list view's grouped-header count are the same visual. A count is
          not a status: it used to tint from a caller-supplied <Code>accentColor</Code> (a kanban
          column's per-stage color), which put status hues into a text-on-tint pairing that failed
          WCAG AA (4.11–4.32:1, UX round 6 P1-1) — removed rather than re-tuned, so the count never
          competes with the lane label for attention.
        </Prose>
        <Gallery
          minColRem={8}
          items={[
            { label: 'default', caption: 'kanban column count', node: <CountChip>12</CountChip> },
            { label: 'default', caption: 'grouped-list count', node: <CountChip>3</CountChip> },
            { label: 'default', caption: 'zero', node: <CountChip>0</CountChip> },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'children', type: 'ReactNode', description: 'The count value.' },
            { prop: '…props', type: 'HTMLAttributes<HTMLSpanElement>', description: 'className, and any span attribute pass through.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use CountChip for a small count only — a large number belongs in a KpiTile instead.',
            "Let the lane/column's own accent live on its top border and body tint (KanbanColumn's accentColor) — never on the count.",
          ]}
          donts={[
            "Don't recolor the count per status/stage — a count is not a status, and status hues fail contrast as text-on-tint at this size.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a non-interactive <span> — the number itself is the accessible content.',
            'The one neutral treatment (#344054 on #f2f4f7) clears WCAG 2.2 AA text contrast (9.49:1) in both themes.',
            'Layout uses logical properties, so it mirrors correctly under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
