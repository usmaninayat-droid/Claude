import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { attachClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'

/**
 * `@atlaskit/pragmatic-drag-and-drop` attaches native drag listeners to real
 * DOM nodes via `draggable()`/`dropTargetForElements()` and reports every
 * completed drag through one `monitorForElements({ onDrop })` subscription —
 * simulating a real pointer/keyboard drag gesture isn't practical in jsdom
 * (same porting-playbook rationale this suite followed under the previous
 * `@hello-pangea/dnd` mock: "test rendering + that onCardMove is wired, not
 * actual drag gesture"). This suite:
 *   1. Renders a real board and asserts structure/labels.
 *   2. Captures the `monitorForElements` `onDrop` callback `KanbanBoard`
 *      wires up, and calls it directly with synthetic `source`/`location`
 *      payloads (built with the REAL `attachClosestEdge`, so the fixtures
 *      match exactly what a real card's drop target would attach) to verify
 *      the cardId/fromColumnId/toColumnId/toIndex translation and its
 *      guards — this is "wiring", not a simulated drag gesture.
 *   3. Exercises the keyboard-accessible "Move to…" menu (a real Radix
 *      `DropdownMenu`) via `fireEvent.keyDown(trigger, { key: 'Enter' })` —
 *      Radix menus open on pointerdown (unavailable in jsdom) or keyboard,
 *      same workaround as `UserMenu.test.tsx` / `ViewTabs.test.tsx`.
 */
let capturedOnDrop:
  | ((args: { source: { data: Record<string, unknown> }; location: unknown }) => void)
  | undefined

vi.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
  draggable: () => () => {},
  dropTargetForElements: () => () => {},
  monitorForElements: (config: {
    onDrop: (args: { source: { data: Record<string, unknown> }; location: unknown }) => void
  }) => {
    capturedOnDrop = config.onDrop
    return () => {}
  },
}))

vi.mock('@atlaskit/pragmatic-drag-and-drop-live-region', () => ({ announce: vi.fn() }))

import { announce } from '@atlaskit/pragmatic-drag-and-drop-live-region'
import { KanbanBoard, KanbanColumn, KanbanCard, type KanbanMoveAnnouncement } from './Kanban'

beforeEach(() => {
  vi.mocked(announce).mockClear()
})

function renderBoard(onCardMove = vi.fn()) {
  render(
    <KanbanBoard columns={[{ id: 'todo' }, { id: 'done' }]} onCardMove={onCardMove} data-testid="board">
      <KanbanColumn id="todo" title="To do" count={2}>
        <KanbanCard id="card-1" index={0} title="Fix GPS drift" tone="warning" />
        <KanbanCard
          id="card-2"
          index={1}
          title="Ship dispatcher dashboard"
          metadataFields={<span>Due Jun 5</span>}
          avatars={[{ name: 'Kashish Bindrani' }, { name: 'Emmad Ahmad' }]}
        />
      </KanbanColumn>
      <KanbanColumn id="done" title="Done" count={0} canDrop={false} />
    </KanbanBoard>,
  )
  return onCardMove
}

/** A fake drop-target element with a real rect, so `attachClosestEdge` (the
 * real implementation, unmocked) resolves a deterministic edge instead of
 * jsdom's default all-zero `getBoundingClientRect`. */
function fakeCardElement(top: number, bottom: number): HTMLElement {
  const el = document.createElement('div')
  el.getBoundingClientRect = () =>
    ({ top, bottom, left: 0, right: 200, width: 200, height: bottom - top }) as DOMRect
  return el
}

describe('Kanban', () => {
  it('renders a board with columns, titles, and counts', () => {
    renderBoard()
    expect(screen.getByText('To do')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('renders every card title inside its column', () => {
    renderBoard()
    expect(screen.getByText('Fix GPS drift')).toBeInTheDocument()
    expect(screen.getByText('Ship dispatcher dashboard')).toBeInTheDocument()
  })

  it('renders the metadataFields render slot content only when provided', () => {
    renderBoard()
    expect(screen.getByText('Due Jun 5')).toBeInTheDocument()
  })

  it('renders an overlapping avatar stack derived from name initials', () => {
    renderBoard()
    expect(screen.getByText('K')).toBeInTheDocument()
    expect(screen.getByText('E')).toBeInTheDocument()
  })

  it('applies accentColor as a raw inline top-border style — runtime tenant data, not a token-lint violation', () => {
    // Unlike a card's `tone` (a closed enum resolved to a status-token class,
    // asserted elsewhere never to emit a raw color), a column's `accentColor`
    // is genuine per-tenant RUNTIME data (a pipeline stage's configured
    // color) threaded through at render time — a raw inline style here is
    // correct, not a lint violation (docs/history/PORT-LEDGER.md § policy 1).
    render(
      <KanbanBoard columns={[{ id: 'todo' }]}>
        <KanbanColumn id="todo" title="To do" accentColor="#0072d6" />
      </KanbanBoard>,
    )
    const column = screen.getByText('To do').closest('[data-slot="kanban-column"]')
    expect(column).toHaveStyle({ borderTop: '3px solid #0072d6' })
  })

  it('renders no accent border when accentColor is omitted', () => {
    render(
      <KanbanBoard columns={[{ id: 'todo' }]}>
        <KanbanColumn id="todo" title="To do" />
      </KanbanBoard>,
    )
    const column = screen.getByText('To do').closest('[data-slot="kanban-column"]') as HTMLElement
    expect(column.style.borderTop).toBe('')
  })

  it('dims and marks a canDrop={false} column as aria-disabled', () => {
    renderBoard()
    const doneColumn = screen.getByText('Done').closest('[data-slot="kanban-column"]')
    expect(doneColumn).toHaveAttribute('aria-disabled', 'true')
    expect(doneColumn?.className).toMatch(/opacity-40/)
  })

  it('never sets a raw color on a toned card — tokens only', () => {
    renderBoard()
    const card = screen.getByText('Fix GPS drift').closest('[data-slot="kanban-card"]')
    expect(card?.className).toMatch(/border-t-warning/)
    expect(card?.className).not.toMatch(/#|rgb\(|hsl\(/)
  })

  it('wires onCardMove and translates a legal drop into (cardId, fromColumnId, toColumnId, toIndex)', () => {
    const onCardMove = renderBoard()
    expect(capturedOnDrop).toBeInstanceOf(Function)

    // Dropped directly into the "done" column's empty space (no card under
    // the pointer) — the column's own drop target reports its current card
    // count (0), i.e. "append to the end".
    capturedOnDrop?.({
      source: { data: { type: 'card', cardId: 'card-1', fromColumnId: 'todo', index: 0 } },
      location: {
        current: {
          dropTargets: [{ data: { type: 'column', columnId: 'done', count: 0 } }],
        },
      },
    })

    expect(onCardMove).toHaveBeenCalledWith('card-1', 'todo', 'done', 0)
  })

  it('translates a reorder drop (hovering another card) into a precise toIndex via the closest edge', () => {
    const onCardMove = renderBoard()

    // Dragging card-1 (todo, index 0) and hovering the TOP half of a card at
    // index 2 in "done" — closest edge "top" means "insert before index 2".
    const cardTargetData = attachClosestEdge(
      { type: 'card', cardId: 'card-9', fromColumnId: 'done', index: 2 },
      { element: fakeCardElement(0, 40), input: { clientX: 0, clientY: 2 } as never, allowedEdges: ['top', 'bottom'] },
    )

    capturedOnDrop?.({
      source: { data: { type: 'card', cardId: 'card-1', fromColumnId: 'todo', index: 0 } },
      location: {
        current: {
          dropTargets: [
            { data: cardTargetData },
            { data: { type: 'column', columnId: 'done', count: 3 } },
          ],
        },
      },
    })

    expect(onCardMove).toHaveBeenCalledWith('card-1', 'todo', 'done', 2)
  })

  // ── F.35 / L.74 — the drop announcement must state the OUTCOME ──────────
  //
  // These are the tests the round-2 defect slipped past. The old suite proved
  // `onCardMove` fired with the right arguments and that the denial FUNCTION
  // was called — never what a screen reader actually ended up reading. The
  // card announced a flat `Dropped <card>.` from its own draggable, before
  // the board had asked `onCardMove` anything, so a REFUSED move was narrated
  // as a completed one. Every assertion below is on the announced STRING.

  it('announces the denial, and never a success, for a drop the board owner refuses', () => {
    const onCardMove = vi.fn()
    render(
      <KanbanBoard
        columns={[{ id: 'todo' }, { id: 'done' }]}
        onCardMove={onCardMove}
        // A board owner whose rules refused this move hands back the refusal.
        formatMoveAnnouncement={() => "Move not allowed: this card can't move to Done."}
      >
        <KanbanColumn id="todo" title="To do" count={1}>
          <KanbanCard id="card-1" index={0} title="Fix GPS drift" />
        </KanbanColumn>
        <KanbanColumn id="done" title="Done" count={0} />
      </KanbanBoard>,
    )

    capturedOnDrop?.({
      source: { data: { type: 'card', cardId: 'card-1', fromColumnId: 'todo', index: 0, cardLabel: 'Fix GPS drift' } },
      location: { current: { dropTargets: [{ data: { type: 'column', columnId: 'done', count: 0 } }] } },
    })

    const said = vi.mocked(announce).mock.calls.map((c) => String(c[0]))
    expect(said).toEqual(["Move not allowed: this card can't move to Done."])
    // The exact regression: an optimistic end-of-drag success for a card that
    // never moved. `\bMoved\b` deliberately does not match "Move not allowed".
    expect(said.join(' | ')).not.toMatch(/\bDropped\b/)
    expect(said.join(' | ')).not.toMatch(/\bMoved\b/)
  })

  it('announces the success for a drop the board owner commits — the suppression is per-move', () => {
    render(
      <KanbanBoard columns={[{ id: 'todo' }, { id: 'done' }]} onCardMove={vi.fn()}>
        <KanbanColumn id="todo" title="To do" count={1}>
          <KanbanCard id="card-1" index={0} title="Fix GPS drift" />
        </KanbanColumn>
        <KanbanColumn id="done" title="Done" count={0} />
      </KanbanBoard>,
    )

    capturedOnDrop?.({
      source: { data: { type: 'card', cardId: 'card-1', fromColumnId: 'todo', index: 0, cardLabel: 'Fix GPS drift' } },
      location: { current: { dropTargets: [{ data: { type: 'column', columnId: 'done', count: 0 } }] } },
    })

    // Positive control: without this, the test above would also pass if the
    // board had simply stopped announcing drops altogether.
    expect(vi.mocked(announce).mock.calls.map((c) => String(c[0]))).toEqual(['Moved Fix GPS drift to Done.'])
  })

  it('announces exactly once per drop — never a card announce AND a board announce', () => {
    renderBoard()
    capturedOnDrop?.({
      source: { data: { type: 'card', cardId: 'card-1', fromColumnId: 'todo', index: 0, cardLabel: 'Fix GPS drift' } },
      location: { current: { dropTargets: [{ data: { type: 'column', columnId: 'done', count: 0 } }] } },
    })
    expect(vi.mocked(announce)).toHaveBeenCalledTimes(1)
  })

  it('never claims a drop landed when nothing resolved — no move, and nothing refused', () => {
    renderBoard()
    capturedOnDrop?.({
      source: { data: { type: 'card', cardId: 'card-1', fromColumnId: 'todo', index: 0, cardLabel: 'Fix GPS drift' } },
      location: { current: { dropTargets: [] } },
    })
    const said = vi.mocked(announce).mock.calls.map((c) => String(c[0]))
    expect(said).toEqual(['Fix GPS drift was not moved.'])
    // `Dropped <card>.` is the regression itself: released outside every lane,
    // nothing landed anywhere, and the old wording read as a completed drop.
    expect(said.join(' | ')).not.toMatch(/\bDropped\b/)
  })

  // ── F.35 / L.74, the path every earlier test missed ─────────────────────
  //
  // The tests above cover a drop that RESOLVES to a move which the owner then
  // refuses. The live defect was the other refusal: dropping straight onto a
  // lane the drag painting had already marked `invalid`. That lane used to opt
  // out of being a drop target, so the drop resolved to NOTHING, took the
  // `!move` exit, and announced the success-flavoured `Dropped <card>.` with
  // no denial anywhere — while the card correctly did not move. The lane is
  // now a real drop target that reports `blocked: true`.

  it('announces a lane-naming denial for a drop onto a lane painted invalid, and never "Dropped"', () => {
    const onCardMove = vi.fn()
    render(
      <KanbanBoard columns={[{ id: 'todo' }, { id: 'done' }]} onCardMove={onCardMove}>
        <KanbanColumn id="todo" title="To do" count={1}>
          <KanbanCard id="card-1" index={0} title="Fix GPS drift" />
        </KanbanColumn>
        <KanbanColumn id="done" title="Done" count={0} />
      </KanbanBoard>,
    )

    capturedOnDrop?.({
      source: { data: { type: 'card', cardId: 'card-1', fromColumnId: 'todo', index: 0, cardLabel: 'Fix GPS drift' } },
      location: {
        current: { dropTargets: [{ data: { type: 'column', columnId: 'done', count: 0, blocked: true } }] },
      },
    })

    const said = vi.mocked(announce).mock.calls.map((c) => String(c[0]))
    expect(said).toEqual(["Move not allowed: this card can't move to Done."])
    expect(said.join(' | ')).not.toMatch(/\bDropped\b/)
    expect(said.join(' | ')).not.toMatch(/\bMoved\b/)
    // Nothing may be committed for a refused lane.
    expect(onCardMove).not.toHaveBeenCalled()
  })

  it('lets the board owner voice (or suppress) the invalid-lane denial itself', () => {
    const formatBlockedDropAnnouncement = vi.fn(() => 'Stage change rejected by the workflow.')
    render(
      <KanbanBoard
        columns={[{ id: 'todo' }, { id: 'done' }]}
        onCardMove={vi.fn()}
        formatBlockedDropAnnouncement={formatBlockedDropAnnouncement}
      >
        <KanbanColumn id="todo" title="To do" count={1}>
          <KanbanCard id="card-1" index={0} title="Fix GPS drift" />
        </KanbanColumn>
        <KanbanColumn id="done" title="Done" count={0} />
      </KanbanBoard>,
    )

    capturedOnDrop?.({
      source: { data: { type: 'card', cardId: 'card-1', fromColumnId: 'todo', index: 0, cardLabel: 'Fix GPS drift' } },
      location: {
        current: { dropTargets: [{ data: { type: 'column', columnId: 'done', count: 0, blocked: true } }] },
      },
    })

    expect(formatBlockedDropAnnouncement).toHaveBeenCalledWith({
      cardId: 'card-1',
      fromColumnId: 'todo',
      toColumnId: 'done',
      cardLabel: 'Fix GPS drift',
      toColumnLabel: 'Done',
      defaultMessage: "Move not allowed: this card can't move to Done.",
    })
    expect(vi.mocked(announce).mock.calls.map((c) => String(c[0]))).toEqual([
      'Stage change rejected by the workflow.',
    ])
  })

  it('treats a blocked drop back onto the card\'s OWN lane as a no-op, never a refusal', () => {
    renderBoard()
    capturedOnDrop?.({
      source: { data: { type: 'card', cardId: 'card-1', fromColumnId: 'todo', index: 0, cardLabel: 'Fix GPS drift' } },
      location: {
        current: { dropTargets: [{ data: { type: 'column', columnId: 'todo', count: 1, blocked: true } }] },
      },
    })
    const said = vi.mocked(announce).mock.calls.map((c) => String(c[0]))
    expect(said.join(' | ')).not.toMatch(/Move not allowed/)
    expect(said.join(' | ')).not.toMatch(/\bDropped\b/)
  })

  it('does not fire onCardMove when dropped outside any droppable', () => {
    const onCardMove = renderBoard()
    capturedOnDrop?.({
      source: { data: { type: 'card', cardId: 'card-1', fromColumnId: 'todo', index: 0 } },
      location: { current: { dropTargets: [] } },
    })
    expect(onCardMove).not.toHaveBeenCalled()
  })

  it('does not fire onCardMove for a no-op drop back onto its own slot', () => {
    const onCardMove = renderBoard()

    // Dragging card-1 (todo, index 0) and hovering the TOP edge of card-2
    // (todo, index 1) resolves to "insert at index 1", adjusted to index 0
    // once the source card is removed from index 0 — i.e. right back where
    // it started.
    const cardTargetData = attachClosestEdge(
      { type: 'card', cardId: 'card-2', fromColumnId: 'todo', index: 1 },
      { element: fakeCardElement(0, 40), input: { clientX: 0, clientY: 2 } as never, allowedEdges: ['top', 'bottom'] },
    )

    capturedOnDrop?.({
      source: { data: { type: 'card', cardId: 'card-1', fromColumnId: 'todo', index: 0 } },
      location: {
        current: {
          dropTargets: [
            { data: cardTargetData },
            { data: { type: 'column', columnId: 'todo', count: 2 } },
          ],
        },
      },
    })
    expect(onCardMove).not.toHaveBeenCalled()
  })

  it('does not fire onCardMove for a drop onto a column unknown to the board', () => {
    const onCardMove = renderBoard()
    capturedOnDrop?.({
      source: { data: { type: 'card', cardId: 'card-1', fromColumnId: 'todo', index: 0 } },
      location: {
        current: {
          dropTargets: [{ data: { type: 'column', columnId: 'not-a-real-column', count: 0 } }],
        },
      },
    })
    expect(onCardMove).not.toHaveBeenCalled()
  })

  it('renders the badges render slot only when provided', () => {
    render(
      <KanbanBoard columns={[{ id: 'todo' }]}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard id="card-1" index={0} title="Card" badges={<span>WO-1042</span>} />
        </KanbanColumn>
      </KanbanBoard>,
    )
    expect(screen.getByText('WO-1042')).toBeInTheDocument()
  })

  it('renders a cover image with its alt text when provided', () => {
    render(
      <KanbanBoard columns={[{ id: 'todo' }]}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard
            id="card-1"
            index={0}
            title="Card"
            coverImage="/truck.jpg"
            coverImageAlt="Truck AUH-4471"
          />
        </KanbanColumn>
      </KanbanBoard>,
    )
    const img = screen.getByAltText('Truck AUH-4471')
    expect(img).toHaveAttribute('src', '/truck.jpg')
  })

  // Finding A7b-2: the thumbnail used to render after the metadata rows.
  it('renders the cover image as the FIRST content row, above the badges/title/metadata', () => {
    render(
      <KanbanBoard columns={[{ id: 'todo' }]}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard
            id="card-1"
            index={0}
            title="Solid waste collection"
            badges={<span>CRITICAL</span>}
            metadataFields={<span>Lot 1</span>}
            coverImage="/truck.jpg"
            coverImageAlt="Truck AUH-4471"
          />
        </KanbanColumn>
      </KanbanBoard>,
    )
    const card = document.querySelector('[data-slot="kanban-card"]')!
    const order = [...card.children].map((el) => el.getAttribute('data-slot'))
    expect(order[0]).toBe('kanban-card-cover')
    expect(order.indexOf('kanban-card-cover')).toBeLessThan(order.indexOf('kanban-card-badges'))
    expect(order.indexOf('kanban-card-badges')).toBeLessThan(order.indexOf('kanban-card-metadata'))
  })

  it('renders the extra render slot only when provided', () => {
    render(
      <KanbanBoard columns={[{ id: 'todo' }]}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard id="card-1" index={0} title="Card" extra={<span>Extra content</span>} />
        </KanbanColumn>
      </KanbanBoard>,
    )
    expect(screen.getByText('Extra content')).toBeInTheDocument()
  })

  it('renders footerEnd alongside avatars in the footer row', () => {
    render(
      <KanbanBoard columns={[{ id: 'todo' }]}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard
            id="card-1"
            index={0}
            title="Card"
            avatars={[{ name: 'Kashish Bindrani' }]}
            footerEnd={<span>Due Jun 5</span>}
          />
        </KanbanColumn>
      </KanbanBoard>,
    )
    expect(screen.getByText('K')).toBeInTheDocument()
    expect(screen.getByText('Due Jun 5')).toBeInTheDocument()
  })

  it('does not render a footer row when neither avatars nor footerEnd is present', () => {
    render(
      <KanbanBoard columns={[{ id: 'todo' }]}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard id="card-1" index={0} title="Card" />
        </KanbanColumn>
      </KanbanBoard>,
    )
    const card = screen.getByText('Card').closest('[data-slot="kanban-card"]')
    expect(card?.querySelector('.border-t')).not.toBeInTheDocument()
  })

  it('collapses avatars past maxAvatars into a "+N" overflow chip', () => {
    render(
      <KanbanBoard columns={[{ id: 'todo' }]}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard
            id="card-1"
            index={0}
            title="Card"
            maxAvatars={3}
            avatars={[
              { name: 'Kashish Bindrani' },
              { name: 'Emmad Ahmad' },
              { name: 'Vikram Singh' },
              { name: 'Ahmad Ali' },
            ]}
          />
        </KanbanColumn>
      </KanbanBoard>,
    )
    // 4 avatars, cap 3 → 2 real avatars + one "+2" overflow chip (3 slots total).
    expect(screen.getByText('K')).toBeInTheDocument()
    expect(screen.getByText('E')).toBeInTheDocument()
    expect(screen.queryByText('V')).not.toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('renders every avatar when the count is at or under maxAvatars', () => {
    render(
      <KanbanBoard columns={[{ id: 'todo' }]}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard
            id="card-1"
            index={0}
            title="Card"
            maxAvatars={3}
            avatars={[{ name: 'Kashish Bindrani' }, { name: 'Emmad Ahmad' }]}
          />
        </KanbanColumn>
      </KanbanBoard>,
    )
    expect(screen.getByText('K')).toBeInTheDocument()
    expect(screen.getByText('E')).toBeInTheDocument()
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
  })

  it('applies highlightColor as a raw inline border-color style — runtime record data, not a token-lint violation', () => {
    render(
      <KanbanBoard columns={[{ id: 'todo' }]}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard id="card-1" index={0} title="Card" highlightColor="#f79009" />
        </KanbanColumn>
      </KanbanBoard>,
    )
    const card = screen.getByText('Card').closest('[data-slot="kanban-card"]')
    expect(card).toHaveStyle({ borderColor: '#f79009' })
    expect(card?.className).toMatch(/border-2/)
  })

  it('keeps the plain 1px border when highlightColor is omitted', () => {
    render(
      <KanbanBoard columns={[{ id: 'todo' }]}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard id="card-1" index={0} title="Card" />
        </KanbanColumn>
      </KanbanBoard>,
    )
    const card = screen.getByText('Card').closest('[data-slot="kanban-card"]') as HTMLElement
    expect(card.style.borderColor).toBe('')
    expect(card.className).not.toMatch(/border-2/)
  })

  it('applies a selected ring without affecting the tone accent', () => {
    render(
      <KanbanBoard columns={[{ id: 'todo' }]}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard id="card-1" index={0} title="Card" tone="info" selected />
        </KanbanColumn>
      </KanbanBoard>,
    )
    const card = screen.getByText('Card').closest('[data-slot="kanban-card"]')
    expect(card?.className).toMatch(/ring-2 ring-primary/)
    expect(card?.className).toMatch(/border-t-info/)
  })

  it('applies size-based padding without ever emitting a raw color', () => {
    render(
      <KanbanBoard columns={[{ id: 'todo' }]}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard id="card-1" index={0} title="Compact" size="compact" />
          <KanbanCard id="card-2" index={1} title="Wide" size="wide" />
        </KanbanColumn>
      </KanbanBoard>,
    )
    const compact = screen.getByText('Compact').closest('[data-slot="kanban-card"]')
    const wide = screen.getByText('Wide').closest('[data-slot="kanban-card"]')
    expect(compact?.className).toMatch(/\bp-3\b/)
    expect(wide?.className).toMatch(/\bp-5\b/)
    expect(compact?.className).not.toMatch(/#|rgb\(|hsl\(/)
  })

  it('forwards refs on all three components', () => {
    const boardRef = createRef<HTMLDivElement>()
    const columnRef = createRef<HTMLDivElement>()
    const cardRef = createRef<HTMLDivElement>()
    render(
      <KanbanBoard columns={[{ id: 'todo' }]} ref={boardRef}>
        <KanbanColumn id="todo" title="To do" ref={columnRef}>
          <KanbanCard id="card-1" index={0} title="Card" ref={cardRef} />
        </KanbanColumn>
      </KanbanBoard>,
    )
    expect(boardRef.current).toHaveAttribute('data-slot', 'kanban-board')
    expect(columnRef.current).toHaveAttribute('data-slot', 'kanban-column')
    expect(cardRef.current).toHaveAttribute('data-slot', 'kanban-card')
  })

  // ── "Move to…" keyboard-accessible menu (the a11y fallback for pointer-drag
  // reordering — pragmatic-drag-and-drop ships no built-in keyboard DnD) ──

  it('renders a "Move to…" menu with one item per other reachable column and calls onCardMove with the right args', () => {
    const onCardMove = vi.fn()
    render(
      <KanbanBoard columns={[{ id: 'todo' }, { id: 'doing' }, { id: 'done' }]} onCardMove={onCardMove}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard id="card-1" index={0} title="Fix GPS drift" />
        </KanbanColumn>
        <KanbanColumn id="doing" title="Doing" canDrop={false} />
        <KanbanColumn id="done" title="Done" />
      </KanbanBoard>,
    )

    const trigger = screen.getByRole('button', { name: 'Move to column: Fix GPS drift' })
    fireEvent.keyDown(trigger, { key: 'Enter' })

    const menu = screen.getByRole('menu')
    expect(within(menu).queryByRole('menuitem', { name: 'Doing' })).not.toBeInTheDocument()
    const doneItem = within(menu).getByRole('menuitem', { name: 'Done' })

    fireEvent.click(doneItem)
    expect(onCardMove).toHaveBeenCalledWith('card-1', 'todo', 'done', 0)
  })

  it('renders no "Move to…" menu when the card has no other reachable column', () => {
    render(
      <KanbanBoard columns={[{ id: 'todo' }]}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard id="card-1" index={0} title="Only card" />
        </KanbanColumn>
      </KanbanBoard>,
    )
    expect(screen.queryByRole('button', { name: /Move to column/ })).not.toBeInTheDocument()
  })

  it('excludes a canDrop={false} column from the "Move to…" registry', () => {
    render(
      <KanbanBoard columns={[{ id: 'todo' }, { id: 'blocked' }]}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard id="card-1" index={0} title="Card" />
        </KanbanColumn>
        <KanbanColumn id="blocked" title="Blocked" canDrop={false} />
      </KanbanBoard>,
    )
    // The only other column is canDrop={false}, so no valid targets remain.
    expect(screen.queryByRole('button', { name: /Move to column/ })).not.toBeInTheDocument()
  })

  // ── `formatMoveAnnouncement` — the hook that lets a board suppress the
  // optimistic "Moved…" success announce for a move its `onCardMove` rejected
  // (see the prop's JSDoc; `@fams/v5-templates`' `KanbanView` is the caller
  // this exists for) ──

  function renderMoveMenuBoard(props: {
    onCardMove?: (cardId: string, from: string, to: string, toIndex: number) => void
    formatMoveAnnouncement?: (move: KanbanMoveAnnouncement) => string | null
  }) {
    render(
      <KanbanBoard columns={[{ id: 'todo' }, { id: 'done' }]} {...props}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard id="card-1" index={0} title="Fix GPS drift" />
        </KanbanColumn>
        <KanbanColumn id="done" title="Done">
          <KanbanCard id="card-9" index={0} title="Already done" />
        </KanbanColumn>
      </KanbanBoard>,
    )
    fireEvent.keyDown(screen.getByRole('button', { name: 'Move to column: Fix GPS drift' }), {
      key: 'Enter',
    })
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Done' }))
  }

  it('announces the optimistic default message when no formatMoveAnnouncement is given (unchanged default)', () => {
    renderMoveMenuBoard({ onCardMove: vi.fn() })
    expect(announce).toHaveBeenCalledTimes(1)
    expect(announce).toHaveBeenCalledWith('Moved Fix GPS drift to Done.')
  })

  it('announces NOTHING when formatMoveAnnouncement returns null — the denied-move suppression hook', () => {
    renderMoveMenuBoard({ onCardMove: vi.fn(), formatMoveAnnouncement: () => null })
    expect(announce).not.toHaveBeenCalled()
  })

  it('announces a caller-supplied message when formatMoveAnnouncement returns one', () => {
    renderMoveMenuBoard({
      onCardMove: vi.fn(),
      formatMoveAnnouncement: ({ cardLabel, toColumnLabel }) =>
        `${cardLabel} is now in ${toColumnLabel}.`,
    })
    expect(announce).toHaveBeenCalledWith('Fix GPS drift is now in Done.')
  })

  it('calls formatMoveAnnouncement with the full move descriptor, AFTER onCardMove — so the caller already knows the outcome', () => {
    const calls: string[] = []
    let received: KanbanMoveAnnouncement | undefined
    renderMoveMenuBoard({
      onCardMove: () => calls.push('onCardMove'),
      formatMoveAnnouncement: (move) => {
        calls.push('formatMoveAnnouncement')
        received = move
        return move.defaultMessage
      },
    })
    expect(calls).toEqual(['onCardMove', 'formatMoveAnnouncement'])
    expect(received).toEqual({
      cardId: 'card-1',
      fromColumnId: 'todo',
      toColumnId: 'done',
      // The destination column's current card count — the same `toIndex`
      // `onCardMove` was handed.
      toIndex: 1,
      cardLabel: 'Fix GPS drift',
      toColumnLabel: 'Done',
      defaultMessage: 'Moved Fix GPS drift to Done.',
    })
  })

  it('re-themes the pragmatic-dnd drop indicator onto FAMS tokens, never the library default blue', () => {
    // `DropIndicator` (only rendered mid-drag, unreachable in jsdom) has no
    // color prop — it reads `--ds-border-selected` from its ancestors. The
    // card declares that property, pointed at a FAMS token, which is the only
    // observable half of the theming in a DOM test; `pnpm lint:tokens` covers
    // the other half (no raw hex anywhere in this source).
    render(
      <KanbanBoard columns={[{ id: 'todo' }]}>
        <KanbanColumn id="todo" title="To do">
          <KanbanCard id="card-1" index={0} title="Fix GPS drift" />
        </KanbanColumn>
      </KanbanBoard>,
    )
    const card = document.querySelector('[data-slot="kanban-card"]')!
    expect(card.className).toContain('[--ds-border-selected:var(--color-primary)]')
    expect(card.className).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})

/**
 * The board's SCROLL CONTRACT (UX notes A.3 / B.9 / B.10). jsdom has no layout,
 * so this asserts the class recipe that produces it rather than measured rects
 * — `qa/fw1-verify.mjs` measures the live geometry. Both halves matter, and the
 * round-1 defect was that neither was asserted anywhere:
 *
 *  - the board scrolls on ONE axis. `overflow-y-hidden` must be EXPLICIT:
 *    CSS computes `overflow-y: visible` to `auto` whenever the other axis is
 *    not `visible`, so a bare `overflow-x-auto` silently gave the board a
 *    second, vertical scroller (measured: clientHeight 740, scrollHeight
 *    50157).
 *  - the lanes are BOUNDED. `items-stretch` on the board plus `min-h-0` on the
 *    lane and its body is what makes each column body the per-column vertical
 *    scroller. With `items-start` (the old value) every lane sized to its
 *    content — a 120-card lane was 50,112px tall and nothing scrolled inside
 *    it, so the stage headers scrolled off the top of the page instead.
 */
describe('Kanban board scroll contract', () => {
  const boardClass = () => document.querySelector('[data-slot="kanban-board"]')!.className
  const columnClass = () => document.querySelector('[data-slot="kanban-column"]')!.className
  const bodyClass = () => document.querySelector('[data-slot="kanban-column-body"]')!.className

  beforeEach(() => {
    render(
      <KanbanBoard columns={[{ id: 'a' }]}>
        <KanbanColumn id="a" title="A" count={1}>
          <KanbanCard id="c1" index={0} title="Card" />
        </KanbanColumn>
      </KanbanBoard>,
    )
  })

  it('scrolls horizontally and NEVER vertically', () => {
    expect(boardClass()).toContain('overflow-x-auto')
    expect(boardClass()).toContain('overflow-y-hidden')
  })

  it('stretches its lanes instead of letting them size to their content', () => {
    expect(boardClass()).toContain('items-stretch')
    expect(boardClass()).not.toContain('items-start')
  })

  it('lets the lane and its card body shrink below their content, so the body scrolls', () => {
    expect(columnClass()).toContain('min-h-0')
    expect(bodyClass()).toContain('min-h-0')
    expect(bodyClass()).toContain('overflow-y-auto')
    expect(bodyClass()).toContain('flex-1')
  })
})

/** UX note J.58 — an empty lane keeps its header, its `0` chip and its drop target. */
describe('KanbanColumn empty lane', () => {
  it('renders emptyMessage inside the body without counting it as a card', () => {
    const onCardMove = vi.fn()
    render(
      <KanbanBoard columns={[{ id: 'a' }]} onCardMove={onCardMove}>
        <KanbanColumn id="a" title="Assigned" count={0} emptyMessage="No tasks" />
      </KanbanBoard>,
    )
    expect(screen.getByText('Assigned')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    const empty = document.querySelector('[data-slot="kanban-column-empty"]')
    expect(empty).toHaveTextContent('No tasks')
    // Inside the body, so the lane is still a drop target over that area.
    expect(document.querySelector('[data-slot="kanban-column-body"]')!.contains(empty)).toBe(true)
  })

  it('hides emptyMessage as soon as the lane holds a card', () => {
    render(
      <KanbanBoard columns={[{ id: 'a' }]}>
        <KanbanColumn id="a" title="Assigned" count={1} emptyMessage="No tasks">
          <KanbanCard id="c1" index={0} title="Card" />
        </KanbanColumn>
      </KanbanBoard>,
    )
    expect(document.querySelector('[data-slot="kanban-column-empty"]')).toBeNull()
  })
})
