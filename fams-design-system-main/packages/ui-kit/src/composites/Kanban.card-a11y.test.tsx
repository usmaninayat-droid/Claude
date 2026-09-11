import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * fix7 (run-2026-09-05, job-orders UX P0-1) — "terminal-lane cards are
 * drag-only": a card with zero onward transitions (`moveTargets.length === 0`)
 * was still `draggable="true"` for a mouse while carrying no keyboard move
 * path at all, and the card root was not focusable/activatable even when the
 * caller wired an `onClick`. This suite runs the REAL
 * `@atlaskit/pragmatic-drag-and-drop` adapter (unlike `Kanban.test.tsx`, which
 * mocks it to unit-test drop translation) specifically to assert the real
 * `draggable` DOM attribute — the one thing a mock can't prove.
 */
import { KanbanBoard, KanbanColumn, KanbanCard } from './Kanban'
import { useKanbanCardMoveTargets } from './use-kanban-card-move-targets'

describe('KanbanCard — draggable only when it has somewhere to go', () => {
  it('is NOT draggable in a terminal lane with no other column', () => {
    render(
      <KanbanBoard columns={[{ id: 'completed' }]}>
        <KanbanColumn id="completed" title="Completed">
          <KanbanCard id="jo-1009" index={0} title="JO-1009" />
        </KanbanColumn>
      </KanbanBoard>,
    )
    const card = screen.getByText('JO-1009').closest('[data-slot="kanban-card"]')!
    expect(card).not.toHaveAttribute('draggable', 'true')
  })

  it('is NOT draggable when every other column refuses it (canDropCard)', () => {
    render(
      <KanbanBoard columns={[{ id: 'invalid' }, { id: 'completed' }]}>
        <KanbanColumn id="invalid" title="Invalid">
          <KanbanCard id="jo-1010" index={0} title="JO-1010" />
        </KanbanColumn>
        <KanbanColumn id="completed" title="Completed" canDropCard={() => false} />
      </KanbanBoard>,
    )
    const card = screen.getByText('JO-1010').closest('[data-slot="kanban-card"]')!
    expect(card).not.toHaveAttribute('draggable', 'true')
  })

  it('IS draggable — and keyboard-movable — once a reachable column exists', () => {
    render(
      <KanbanBoard columns={[{ id: 'reported' }, { id: 'completed' }]}>
        <KanbanColumn id="reported" title="Reported Issues">
          <KanbanCard id="jo-2001" index={0} title="JO-2001" />
        </KanbanColumn>
        <KanbanColumn id="completed" title="Completed" />
      </KanbanBoard>,
    )
    const card = screen.getByText('JO-2001').closest('[data-slot="kanban-card"]')!
    expect(card).toHaveAttribute('draggable', 'true')
    expect(screen.getByRole('button', { name: 'Move to column: JO-2001' })).toBeInTheDocument()
  })
})

describe('KanbanCard — the whole-card open control (keyboard focus + activation)', () => {
  it('renders no open control at all when the caller wires no onClick', () => {
    render(
      <KanbanBoard columns={[{ id: 'a' }]}>
        <KanbanColumn id="a" title="A">
          <KanbanCard id="c1" index={0} title="No handler" />
        </KanbanColumn>
      </KanbanBoard>,
    )
    expect(document.querySelector('[data-slot="kanban-card-open"]')).toBeNull()
  })

  it('is keyboard-focusable and Enter/Space activate it, same as a mouse click', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <KanbanBoard columns={[{ id: 'a' }]}>
        <KanbanColumn id="a" title="A">
          <KanbanCard id="c1" index={0} title="Fix GPS drift" onClick={onClick} />
        </KanbanColumn>
      </KanbanBoard>,
    )
    const opener = screen.getByRole('button', { name: 'Fix GPS drift' })
    await user.tab()
    expect(opener).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
    await user.click(opener)
    expect(onClick).toHaveBeenCalledTimes(3)
  })

  it('never nests the open control inside the move trigger or the caller actions — siblings only', () => {
    render(
      <KanbanBoard columns={[{ id: 'a' }, { id: 'b' }]}>
        <KanbanColumn id="a" title="A">
          <KanbanCard
            id="c1"
            index={0}
            title="Card"
            onClick={() => {}}
            actions={<button type="button" aria-label="Card options">…</button>}
          />
        </KanbanColumn>
        <KanbanColumn id="b" title="B" />
      </KanbanBoard>,
    )
    const opener = screen.getByRole('button', { name: 'Card' })
    const optionsButton = screen.getByRole('button', { name: 'Card options' })
    // Real interactive controls must be SIBLINGS, never ancestor/descendant —
    // nesting them is exactly what axe-core's `nested-interactive` rule flags
    // (see `KanbanCard`'s docblock on this control).
    expect(opener.contains(optionsButton)).toBe(false)
    expect(optionsButton.contains(opener)).toBe(false)
  })
})

describe('KanbanCard — exactly one overflow trigger, and a caller-supplied `actions` menu can still expose a move path', () => {
  /** Stands in for a real caller menu (e.g. `@fams/v5-templates`' `RecordActionsMenu`) that
   * appends the shared move-target list to its OWN menu instead of a second trigger. */
  function FakeActionsMenu({ cardId, cardLabel }: { cardId: string; cardLabel: string }) {
    const targets = useKanbanCardMoveTargets(cardId, cardLabel)
    return (
      <div role="menu" aria-label={`Options for ${cardLabel}`}>
        {targets.map((target) => (
          <button key={target.id} type="button" role="menuitem" onClick={target.onSelect}>
            {target.title}
          </button>
        ))}
      </div>
    )
  }

  it('suppresses the built-in "Move to…" trigger whenever `actions` is supplied', () => {
    render(
      <KanbanBoard columns={[{ id: 'todo' }, { id: 'done' }]}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard id="c1" index={0} title="Ticket" actions={<FakeActionsMenu cardId="c1" cardLabel="Ticket" />} />
        </KanbanColumn>
        <KanbanColumn id="done" title="Done" />
      </KanbanBoard>,
    )
    // Exactly one overflow surface — never the built-in trigger AND the caller's.
    expect(screen.queryByRole('button', { name: /Move to column/ })).not.toBeInTheDocument()
    expect(screen.getByRole('menu', { name: 'Options for Ticket' })).toBeInTheDocument()
  })

  it('still lets that external menu commit the SAME move `onCardMove` would receive from the built-in trigger', () => {
    const onCardMove = vi.fn()
    render(
      <KanbanBoard columns={[{ id: 'todo' }, { id: 'done' }]} onCardMove={onCardMove}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard id="c1" index={0} title="Ticket" actions={<FakeActionsMenu cardId="c1" cardLabel="Ticket" />} />
        </KanbanColumn>
        <KanbanColumn id="done" title="Done" />
      </KanbanBoard>,
    )
    fireEvent.click(screen.getByRole('menuitem', { name: 'Done' }))
    expect(onCardMove).toHaveBeenCalledWith('c1', 'todo', 'done', 0)
  })

  it('a card whose caller supplies `actions` but has NO reachable column offers no move items at all', () => {
    render(
      <KanbanBoard columns={[{ id: 'completed' }]}>
        <KanbanColumn id="completed" title="Completed">
          <KanbanCard
            id="c1"
            index={0}
            title="Done ticket"
            actions={<FakeActionsMenu cardId="c1" cardLabel="Done ticket" />}
          />
        </KanbanColumn>
      </KanbanBoard>,
    )
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0)
  })
})
