import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

/**
 * The PRODUCING half of the fix7 change (UX F.35 / L.74): a refusing
 * `KanbanColumn` reports `blocked: true` in the drop-target data it hands to
 * `dropTargetForElements`, so a refusal can be narrated by name instead of
 * looking like a drop into empty space. Every other kanban suite
 * (`Kanban.test.tsx`, `Kanban.dragpaint.test.tsx`) mocks
 * `dropTargetForElements` away entirely and hand-writes `{ blocked: true }`
 * into a synthetic drop payload to prove the CONSUMING half (the board
 * turning `blocked` into a refusal announcement) — none of them ever call the
 * real `getData` `KanbanColumn` wires up, so a refactor that quietly dropped
 * `blockedRef` from `getData` would pass every one of them green.
 *
 * This file captures that real `getData` and drives it purely through the
 * component's own props (`canDrop`, and `canDropCard` via a simulated
 * `activeDrag` on the board context) — never by hand-writing the flag.
 */
type CapturedTarget = { element: HTMLElement; getData: () => Record<string, unknown> }
let captured: CapturedTarget[] = []

vi.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
  dropTargetForElements: (config: CapturedTarget) => {
    captured.push(config)
    return () => {}
  },
}))

import { KanbanColumn } from './KanbanColumn'
import { KanbanBoardContext, type KanbanBoardContextValue } from './kanban-context'

beforeEach(() => {
  captured = []
})

/** The real `getData()` result for the column whose `columnId` matches. */
function getDataFor(columnId: string): Record<string, unknown> {
  const match = captured.find((target) => target.getData().columnId === columnId)
  if (!match) throw new Error(`no drop target captured for column "${columnId}"`)
  return match.getData()
}

function boardContext(activeDrag: KanbanBoardContextValue['activeDrag']): KanbanBoardContextValue {
  return {
    registry: new Map(),
    registerColumn: () => {},
    unregisterColumn: () => {},
    activeDrag,
  }
}

describe('KanbanColumn — getData blocked flag (producing half of UX F.35 / L.74)', () => {
  it('reports blocked: true for a lane whose canDrop={false} refuses the whole column', () => {
    render(<KanbanColumn id="done" title="Done" canDrop={false} />)
    expect(getDataFor('done')).toMatchObject({ type: 'column', columnId: 'done', blocked: true })
  })

  it('reports blocked absent/false for a lane that accepts — canDrop default true, no drag in flight', () => {
    render(<KanbanColumn id="todo" title="To do" />)
    expect(getDataFor('todo').blocked).toBeFalsy()
  })

  it('reports blocked: true for a lane whose canDropCard refuses the specific card in flight', () => {
    render(
      <KanbanBoardContext.Provider
        value={boardContext({ cardId: 'card-1', fromColumnId: 'todo', allowedColumnIds: null })}
      >
        <KanbanColumn id="done" title="Done" canDropCard={(cardId) => cardId !== 'card-1'} />
      </KanbanBoardContext.Provider>,
    )
    expect(getDataFor('done')).toMatchObject({ type: 'column', columnId: 'done', blocked: true })
  })

  it('reports blocked absent/false for a lane whose canDropCard accepts the card in flight', () => {
    render(
      <KanbanBoardContext.Provider
        value={boardContext({ cardId: 'card-1', fromColumnId: 'todo', allowedColumnIds: null })}
      >
        <KanbanColumn id="doing" title="Doing" canDropCard={(cardId) => cardId === 'card-1'} />
      </KanbanBoardContext.Provider>,
    )
    expect(getDataFor('doing').blocked).toBeFalsy()
  })
})
