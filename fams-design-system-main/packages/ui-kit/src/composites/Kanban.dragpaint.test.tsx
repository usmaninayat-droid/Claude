import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/**
 * Pre-emptive drag-validity painting + the drag ghost/placeholder.
 *
 * A real pointer drag is not reproducible in jsdom, so — exactly as
 * `Kanban.test.tsx` already does for the drop translation — the
 * `pragmatic-drag-and-drop` element adapter is mocked and the callbacks the
 * components register are captured and invoked directly. That is "wiring",
 * and wiring is what this behaviour is: the board publishes the card in
 * flight, every column resolves its own validity from the caller's predicate,
 * and the card renders its ghost and leaves a placeholder behind.
 */

type MonitorConfig = {
  onDragStart?: (args: { source: { data: Record<string, unknown> } }) => void
  onDrop?: (args: { source: { data: Record<string, unknown> }; location: unknown }) => void
}
type DraggableConfig = {
  element: HTMLElement
  onDragStart?: () => void
  onDrop?: () => void
  onGenerateDragPreview?: (args: { nativeSetDragImage: unknown }) => void
}

let monitor: MonitorConfig = {}
let draggables: DraggableConfig[] = []

vi.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
  draggable: (config: DraggableConfig) => {
    draggables.push(config)
    return () => {}
  },
  dropTargetForElements: () => () => {},
  monitorForElements: (config: MonitorConfig) => {
    monitor = config
    return () => {}
  },
}))
vi.mock('@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview', () => ({
  disableNativeDragPreview: vi.fn(),
}))
vi.mock('@atlaskit/pragmatic-drag-and-drop-live-region', () => ({ announce: vi.fn() }))

import { announce } from '@atlaskit/pragmatic-drag-and-drop-live-region'
import { KanbanBoard, KanbanColumn, KanbanCard } from './Kanban'

const DENIED = "This item can't move here."

/** Only `card-1` (which lives in `todo`) may enter `doing`. */
const canEnterDoing = (cardId: string) => cardId === 'card-1'
const canEnterDone = () => false

function renderBoard() {
  render(
    <KanbanBoard columns={[{ id: 'todo' }, { id: 'doing' }, { id: 'done' }]} onCardMove={vi.fn()}>
      <KanbanColumn id="todo" title="To do" count={2} accentColor="#0072d6">
        <KanbanCard id="card-1" index={0} title="Fix GPS drift" dragGhost={<span>condensed ghost</span>} />
        <KanbanCard id="card-2" index={1} title="Ship dashboard" />
      </KanbanColumn>
      <KanbanColumn
        id="doing"
        title="Doing"
        count={0}
        accentColor="#16a34a"
        canDropCard={canEnterDoing}
        validDropLabel="Doing"
        invalidDropMessage={DENIED}
      />
      <KanbanColumn
        id="done"
        title="Done"
        count={0}
        accentColor="#f04438"
        canDropCard={canEnterDone}
        validDropLabel="Done"
        invalidDropMessage={DENIED}
      />
    </KanbanBoard>,
  )
}

function startDrag(cardId: string, fromColumnId: string) {
  act(() => {
    monitor.onDragStart?.({ source: { data: { type: 'card', cardId, fromColumnId } } })
  })
}

function column(id: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-slot="kanban-column"][data-drag-state], [data-slot="kanban-column"]`)
  if (!el) throw new Error('no columns rendered')
  return Array.from(document.querySelectorAll<HTMLElement>('[data-slot="kanban-column"]')).find((node) =>
    node.textContent?.includes(id),
  )!
}

beforeEach(() => {
  monitor = {}
  draggables = []
  vi.mocked(announce).mockClear()
})

describe('Kanban — pre-emptive drag-validity painting', () => {
  it('paints nothing at rest', () => {
    renderBoard()
    for (const node of document.querySelectorAll('[data-slot="kanban-column"]')) {
      expect(node).not.toHaveAttribute('data-drag-state')
    }
    expect(screen.queryByText(DENIED)).not.toBeInTheDocument()
  })

  it('marks a lane the predicate allows valid, and one it denies invalid — during the drag', () => {
    renderBoard()
    startDrag('card-1', 'todo')
    expect(column('Doing')).toHaveAttribute('data-drag-state', 'valid')
    expect(column('Done')).toHaveAttribute('data-drag-state', 'invalid')
  })

  it("leaves the card's own source lane neutral — a drop back home is a no-op, not a transition", () => {
    renderBoard()
    startDrag('card-1', 'todo')
    expect(column('To do')).not.toHaveAttribute('data-drag-state')
  })

  it('flips with the CARD, not the column — the same predicate, a different card', () => {
    renderBoard()
    startDrag('card-2', 'todo')
    expect(column('Doing')).toHaveAttribute('data-drag-state', 'invalid')
    expect(column('Done')).toHaveAttribute('data-drag-state', 'invalid')
  })

  it('paints a valid lane with a stage-coloured tint + 2px stroke and a pill naming the transition', () => {
    renderBoard()
    startDrag('card-1', 'todo')
    const body = column('Doing').querySelector<HTMLElement>('[data-slot="kanban-column-body"]')!
    expect(body.className).toContain('border-2')
    // Runtime stage colour, mixed at 8% — never a literal in component source.
    expect(body.getAttribute('style')).toContain('8%')
    expect(body.getAttribute('style')).toContain('rgb(22, 163, 74)')
    expect(screen.getByText('Doing', { selector: '[data-slot="kanban-drag-valid-pill"]' })).toBeInTheDocument()
  })

  it('paints an invalid lane near-white with an info glyph over the literal refusal copy', () => {
    renderBoard()
    startDrag('card-1', 'todo')
    const doneBody = column('Done').querySelector<HTMLElement>('[data-slot="kanban-column-body"]')!
    expect(doneBody.className).toContain('bg-card')
    expect(doneBody.className).not.toContain('border-2')
    const message = document.querySelector('[data-slot="kanban-drag-invalid-message"]')!
    expect(message.textContent).toBe(DENIED)
    expect(message.querySelector('svg')).toBeInTheDocument()
  })

  it('is decoration only: the message is aria-hidden, non-blocking, and announces nothing', () => {
    renderBoard()
    startDrag('card-1', 'todo')
    // Not a toast, not a modal, not focus-stealing — an in-column hint.
    expect(document.querySelector('[data-slot="kanban-drag-message"]')).toHaveAttribute('aria-hidden', 'true')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.querySelector('[role="alert"]')).toBeNull()
    // The whole point of F.35: painting must never speak. Only the caller's
    // terminal denial does.
    expect(announce).not.toHaveBeenCalled()
  })

  it('clears every lane once the drag ends', () => {
    renderBoard()
    startDrag('card-1', 'todo')
    act(() => {
      monitor.onDrop?.({ source: { data: { type: 'card' } }, location: { current: { dropTargets: [] } } })
    })
    for (const node of document.querySelectorAll('[data-slot="kanban-column"]')) {
      expect(node).not.toHaveAttribute('data-drag-state')
    }
  })

  it('excludes a predicate-denied lane from the card\'s keyboard "Move to…" menu — one predicate, two consumers', () => {
    renderBoard()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Move to column: Fix GPS drift' }), { key: 'Enter' })
    // `card-1` may enter `doing` only; `done` denies everything.
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Doing'])
  })
})

/**
 * The board-level predicate: resolved ONCE at drag start and pushed down the
 * context, instead of each lane re-invoking a `canDropCard` prop on every
 * dragover. Adopted from `ifm-workforce`'s `kanban-board.tsx` `KanbanBoardCtx`
 * (reference-mining §2.4) — keeping our single shared predicate, changing only
 * how it is distributed.
 */
describe('Kanban — board-level allowed-set, resolved once per drag', () => {
  /** Only `doing` is reachable — `done` is denied and `todo` is never named. */
  const allowedFor = (cardId: string) => (cardId === 'card-1' ? ['doing'] : [])

  function renderWithBoardPredicate(getAllowedColumnIds: (cardId: string) => string[]) {
    render(
      <KanbanBoard
        columns={[{ id: 'todo' }, { id: 'doing' }, { id: 'done' }]}
        onCardMove={vi.fn()}
        getAllowedColumnIds={getAllowedColumnIds}
      >
        <KanbanColumn id="todo" title="To do" count={2} accentColor="#0072d6" validDropLabel="To do" invalidDropMessage={DENIED}>
          <KanbanCard id="card-1" index={0} title="Fix GPS drift" />
          <KanbanCard id="card-2" index={1} title="Ship dashboard" />
        </KanbanColumn>
        <KanbanColumn id="doing" title="Doing" count={0} accentColor="#16a34a" validDropLabel="Doing" invalidDropMessage={DENIED} />
        <KanbanColumn id="done" title="Done" count={0} accentColor="#f04438" validDropLabel="Done" invalidDropMessage={DENIED} />
      </KanbanBoard>,
    )
  }

  it('asks the predicate exactly ONCE per drag, and not again per dragover', () => {
    const getAllowedColumnIds = vi.fn(allowedFor)
    renderWithBoardPredicate(getAllowedColumnIds)
    expect(getAllowedColumnIds).not.toHaveBeenCalled()

    startDrag('card-1', 'todo')
    expect(getAllowedColumnIds).toHaveBeenCalledTimes(1)
    expect(getAllowedColumnIds).toHaveBeenCalledWith('card-1')

    // Every lane is already painted from that ONE answer — pointer movement
    // over the board re-paints nothing and re-asks nothing.
    for (let i = 0; i < 5; i += 1) {
      fireEvent(document, new MouseEvent('dragover', { clientX: 100 + i * 40, clientY: 200, bubbles: true }))
    }
    expect(getAllowedColumnIds).toHaveBeenCalledTimes(1)
    expect(column('Doing')).toHaveAttribute('data-drag-state', 'valid')
    expect(column('Done')).toHaveAttribute('data-drag-state', 'invalid')
  })

  it("unions the card's OWN lane into the allowed set — dropping back home is legal and paints valid", () => {
    // `todo` is NOT in what the rules return for `card-1`; the board adds it.
    renderWithBoardPredicate(allowedFor)
    startDrag('card-1', 'todo')
    expect(column('To do')).toHaveAttribute('data-drag-state', 'valid')
    expect(screen.getByText('To do', { selector: '[data-slot="kanban-drag-valid-pill"]' })).toBeInTheDocument()
  })

  it("paints the own lane valid even when the rules allow NOTHING at all", () => {
    renderWithBoardPredicate(() => [])
    startDrag('card-2', 'todo')
    expect(column('To do')).toHaveAttribute('data-drag-state', 'valid')
    expect(column('Doing')).toHaveAttribute('data-drag-state', 'invalid')
    expect(column('Done')).toHaveAttribute('data-drag-state', 'invalid')
  })

  it('still announces nothing while painting (F.35) and adds no live region', () => {
    renderWithBoardPredicate(allowedFor)
    startDrag('card-1', 'todo')
    expect(announce).not.toHaveBeenCalled()
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(0)
    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0)
  })

  it('does NOT consult the paint snapshot on drop — a drop through a card in a blocked lane still reaches onCardMove', () => {
    const onCardMove = vi.fn()
    render(
      <KanbanBoard
        columns={[{ id: 'todo' }, { id: 'done' }]}
        onCardMove={onCardMove}
        // `done` is painted invalid for every card.
        getAllowedColumnIds={() => []}
      >
        <KanbanColumn id="todo" title="To do" count={1}>
          <KanbanCard id="card-1" index={0} title="Fix GPS drift" />
        </KanbanColumn>
        <KanbanColumn id="done" title="Done" count={1} invalidDropMessage={DENIED}>
          <KanbanCard id="card-9" index={0} title="Old work" />
        </KanbanColumn>
      </KanbanBoard>,
    )
    startDrag('card-1', 'todo')
    expect(column('Done')).toHaveAttribute('data-drag-state', 'invalid')
    act(() => {
      monitor.onDrop?.({
        source: { data: { type: 'card', cardId: 'card-1', fromColumnId: 'todo', index: 0 } },
        location: {
          current: {
            // The drop resolved through the CARD inside the blocked lane.
            dropTargets: [{ data: { type: 'card', cardId: 'card-9', fromColumnId: 'done', index: 0 } }],
          },
        },
      })
    })
    // The board refuses nothing silently: the destination is handed on so the
    // caller's terminal re-check can deny it AND announce that denial once.
    expect(onCardMove).toHaveBeenCalledWith('card-1', 'todo', 'done', 0)
  })
})

describe('Kanban — drag ghost and origin placeholder', () => {
  function liftFirstCard() {
    renderBoard()
    const config = draggables[0]
    config.element.getBoundingClientRect = () => ({ width: 320, height: 180 }) as DOMRect
    act(() => config.onDragStart?.())
    return config
  }

  it('suppresses the platform drag image so the React ghost is the only visual', () => {
    renderBoard()
    expect(draggables[0].onGenerateDragPreview).toBeTypeOf('function')
  })

  it('renders the caller-supplied CONDENSED ghost, elevated, following the cursor', () => {
    liftFirstCard()
    const ghost = document.querySelector<HTMLElement>('[data-slot="kanban-card-ghost"]')!
    expect(ghost.textContent).toBe('condensed ghost')
    // A static drop shadow (an affordance) and NO transition — so
    // `prefers-reduced-motion` needs no special case at all.
    expect(ghost.className).toContain('shadow-lg')
    expect(ghost.className).toContain('transition-none')
    // Matches the lane it left rather than guessing a size.
    expect(ghost.style.width).toBe('320px')
    // Hidden until a real cursor position arrives, then it follows.
    expect(ghost.style.visibility).toBe('hidden')
    // jsdom's `DragEvent` ctor drops `clientX`/`clientY`; a `MouseEvent` named
    // `dragover` carries them and is what the listener actually reads.
    fireEvent(document, new MouseEvent('dragover', { clientX: 400, clientY: 250, bubbles: true }))
    const moved = document.querySelector<HTMLElement>('[data-slot="kanban-card-ghost"]')!
    expect(moved.style.transform).toBe('translate(412px, 262px)')
    expect(moved.style.visibility).toBe('')
  })

  it('leaves the origin slot as a tinted placeholder that keeps the card in the layout', () => {
    liftFirstCard()
    const card = document.querySelector<HTMLElement>('[data-slot="kanban-card"][data-dragging]')!
    const placeholder = card.querySelector('[data-slot="kanban-card-placeholder"]')!
    expect(placeholder).toBeInTheDocument()
    expect(placeholder).toHaveAttribute('aria-hidden', 'true')
    // The real card is hidden with `visibility`, NOT unmounted — so the column
    // cannot reflow mid-drag however condensed the ghost is.
    expect(card.className).toContain('invisible')
    expect(card.textContent).toContain('Fix GPS drift')
  })

  it('tears both down on drop', () => {
    const config = liftFirstCard()
    act(() => config.onDrop?.())
    expect(document.querySelector('[data-slot="kanban-card-ghost"]')).toBeNull()
    expect(document.querySelector('[data-slot="kanban-card-placeholder"]')).toBeNull()
  })
})
