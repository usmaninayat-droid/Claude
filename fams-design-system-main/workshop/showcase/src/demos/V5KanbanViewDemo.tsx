import { useState } from 'react'
import { KanbanView, type EntityRecord } from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'
import { dealsConfig, dealRecords, dealTransitions } from './v5-views-blueprint'

/**
 * V5KanbanViewDemo — the blueprint-driven pipeline board on
 * `@atlaskit/pragmatic-drag-and-drop` (NEW v5-tier code; ui-kit's legacy Kanban
 * is untouched). Moves are guarded by `canMove` (the rule evaluator hook-up) and
 * there is a keyboard "Move to stage" menu on every card.
 */
export default function V5KanbanViewDemo() {
  const [records, setRecords] = useState<EntityRecord[]>(dealRecords)

  // Rule hook-up: a move is allowed only if the pipeline transitions permit it.
  const canMove = (_id: string, from: string, to: string) => (dealTransitions[from] ?? []).includes(to)

  const move = (id: string, _from: string, to: string) =>
    setRecords((cur) => cur.map((r) => (r.id === id ? { ...r, status: to } : r)))

  return (
    <DocPage
      title="KanbanView"
      badge="wip"
      summary="The blueprint-driven pipeline board — stages from statusList, cards from deriveCard, drag-and-drop on pragmatic-drag-and-drop, moves guarded by an injected canMove, plus a keyboard Move-to-stage menu on every card. Presentational — commits via onMove."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Drag a card between lanes, or use its <Code>⋮</Code> menu (keyboard path) to move it. Every move is
          checked against <Code>canMove</Code> — wired here to the golden pipeline transitions, so e.g. a{' '}
          <Code>Won</Code> card offers no onward move.
        </Prose>
        <div className="h-[460px] overflow-hidden rounded-md border border-border p-2">
          <KanbanView config={dealsConfig} records={records} canMove={canMove} onMove={move} />
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'config / records', type: 'EntityConfig / EntityRecord[]', description: 'Pipeline blueprint + the records to lay out.' },
            { prop: 'canMove', type: '(id, from, to) => boolean', description: 'Guards every move (drag OR keyboard). Wire to allowedTransitions.' },
            { prop: 'onMove', type: '(id, from, to) => void', description: 'Fires once a legal move resolves.' },
            { prop: 'onCardClick', type: '(id) => void', description: 'Opens the record (detail / hybrid).' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Wire canMove to the rule evaluator (allowedTransitions) so denied lanes reject the drop AND drop from the keyboard menu.',
            'Commit the move to your own data on onMove and re-render — the board holds no state (Rule 8).',
          ]}
          donts={[
            'Don’t reach for ui-kit’s legacy @hello-pangea Kanban for v5 modules — this is the v5-tier board.',
            'Don’t hardcode stage colors — they come from the blueprint statusList (runtime data).',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'pragmatic-dnd ships no keyboard DnD, so each card carries a documented, tested "Move to stage" menu as the keyboard-equivalent path.',
            'The move menu lists exactly the allowed targets — the same guard the drop path uses.',
            'RTL-safe: logical properties; lanes flow with the document direction.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
