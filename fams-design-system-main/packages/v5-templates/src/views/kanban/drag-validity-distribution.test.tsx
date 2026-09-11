import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

/**
 * Wave A4c — how the ONE shared `canCardEnterStage` predicate (unchanged, and
 * still the only place the status-workflow rule lives) is now DISTRIBUTED,
 * adopted from `ifm-workforce`'s `kanban-board.tsx` (reference-mining §2.4):
 *
 * 1. it is resolved ONCE per drag, by the board, from
 *    `KanbanBoardProps.getAllowedColumnIds` — not re-invoked per lane per
 *    dragover (the painting side of that is asserted in `ui-kit`'s
 *    `Kanban.dragpaint.test.tsx`, which owns the board),
 * 2. the dragged card's OWN stage is unioned into that set by the board, so a
 *    drop back home is legal and paints valid, and
 * 3. the terminal commit path RE-CHECKS validity at dragEnd, because a drop can
 *    resolve through a card sitting inside a lane the paint marked invalid.
 *
 * `@fams/ui-kit`'s published bundle inlines `pragmatic-drag-and-drop`, so a
 * pointer drag cannot be driven from this package by mocking the element
 * adapter. Instead `KanbanBoard` itself is stubbed to a passthrough that
 * captures the props `KanbanView` hands it — which is exactly the seam under
 * test here: what this view publishes for painting, and what it does with the
 * dragEnd the board reports back.
 */

type BoardProps = {
  getAllowedColumnIds?: (cardId: string) => readonly string[] | null | undefined
  onCardMove?: (cardId: string, fromColumnId: string, toColumnId: string, toIndex: number) => void
  /** How the real board derives what it announces for the move it just reported. */
  formatMoveAnnouncement?: (move: { defaultMessage: string }) => string | null
  children?: ReactNode
}

let boardProps: BoardProps = {}

vi.mock('@atlaskit/pragmatic-drag-and-drop-live-region', () => ({ announce: vi.fn() }))
vi.mock('@fams/ui-kit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@fams/ui-kit')>()
  return {
    ...actual,
    KanbanBoard: (props: BoardProps) => {
      boardProps = props
      return <div data-slot="kanban-board">{props.children}</div>
    },
  }
})

import { announce } from '@atlaskit/pragmatic-drag-and-drop-live-region'
import { KanbanView } from '../KanbanView'
import { dealsConfig, dealRecords } from '../fixtures'
import { canCardEnterStage, makeAllowedStageIds, makeCanDropCard } from './move-rules'

/** D-104 lives in the `proposal` stage. */
const CARD = 'D-104'
const FROM = 'proposal'

beforeEach(() => {
  boardProps = {}
  vi.mocked(announce).mockClear()
})

describe('A4c.1 — the predicate is resolved ONCE per drag, by the board', () => {
  it('publishes a board-level allowed-set resolver instead of leaving each lane to re-evaluate', () => {
    render(<KanbanView config={dealsConfig} records={dealRecords} canMove={() => true} onMove={vi.fn()} />)
    expect(boardProps.getAllowedColumnIds).toBeTypeOf('function')
  })

  it('answers the whole board in ONE pass — one evaluation per stage, none per dragover', () => {
    const canMove = vi.fn(() => true)
    render(<KanbanView config={dealsConfig} records={dealRecords} canMove={canMove} onMove={vi.fn()} />)

    // Cards evaluate the predicate while rendering their "Move to…" menu set,
    // so the interesting number is the DELTA across one drag-start resolve.
    const before = canMove.mock.calls.length
    const allowed = boardProps.getAllowedColumnIds!(CARD)
    const evaluations = canMove.mock.calls.length - before

    // Five stages, minus the card's own (`proposal`), which
    // `canCardEnterStage` answers without asking the rules at all.
    expect(evaluations).toBe(4)
    expect([...allowed!].sort()).toEqual(['lead', 'lost', 'qualified', 'won'])

    // The board holds this answer for the whole drag: every lane paints from
    // it by a set lookup, so no further evaluation happens while dragging.
    // (`ui-kit`'s `Kanban.dragpaint.test.tsx` asserts that call count over a
    // real dragover sequence.)
  })

  it('is built from the SAME bound predicates the "Move to…" menu reads — one predicate, no drift', () => {
    const canMove = (_id: string, _from: string, to: string) => to === 'won'
    const knownStageIds = new Set(['lead', 'qualified', 'proposal', 'won', 'lost'])
    const byStage = new Map(
      [...knownStageIds].map((stageId) => [
        stageId,
        makeCanDropCard(stageId, () => FROM, knownStageIds, canMove),
      ]),
    )
    // The allowed-set resolver is a pure lift of the per-lane predicates —
    // the same functions `KanbanColumn.canDropCard` (and therefore each card's
    // keyboard menu, via the board registry) is given.
    expect(makeAllowedStageIds(byStage)(CARD)).toEqual(['won'])
    expect(canCardEnterStage(CARD, FROM, 'won', knownStageIds, canMove)).toBe(true)
    expect(canCardEnterStage(CARD, FROM, 'lost', knownStageIds, canMove)).toBe(false)

    // And the live view publishes exactly that set for the painting side. The
    // menu side of the same predicate is asserted against the real board in
    // `kanban-parity.test.tsx` ("the move menu offers exactly the predicate's
    // allowed set") — the board here is stubbed, so no registry exists to read.
    render(<KanbanView config={dealsConfig} records={dealRecords} canMove={canMove} onMove={vi.fn()} />)
    expect([...boardProps.getAllowedColumnIds!(CARD)!]).toEqual(['won'])
  })
})

describe("A4c.2 — the card's own stage is always legal", () => {
  it('leaves the own-stage union to the board, and never reports it as a rule-allowed destination', () => {
    // The view answers the RULES question only ("where may this card go?"); the
    // board unions the source lane in, because a drop back home is a no-op
    // rather than a transition. `ui-kit`'s `Kanban.dragpaint.test.tsx` asserts
    // the union itself, including that the source lane paints valid when the
    // rules allow nothing at all.
    render(<KanbanView config={dealsConfig} records={dealRecords} canMove={() => false} onMove={vi.fn()} />)
    expect([...boardProps.getAllowedColumnIds!(CARD)!]).toEqual([])
  })

  it('treats a drop back onto the source lane as a silent no-op, never a denial', () => {
    const onMove = vi.fn()
    render(<KanbanView config={dealsConfig} records={dealRecords} canMove={() => false} onMove={onMove} />)
    boardProps.onCardMove!(CARD, FROM, FROM, 0)
    expect(onMove).not.toHaveBeenCalled()
    expect(announce).not.toHaveBeenCalled()
  })
})

describe('A4c.3 — the dragEnd re-check', () => {
  it('refuses a drop that resolved through a card INSIDE a blocked lane, with exactly one announcement', () => {
    const onMove = vi.fn()
    // Every destination is rule-denied, so `won` is painted invalid — yet a
    // CARD inside `won` is still a legitimate `over` target, and that is the
    // destination the drop resolves to. The terminal path must catch it.
    render(<KanbanView config={dealsConfig} records={dealRecords} canMove={() => false} onMove={onMove} />)
    expect([...boardProps.getAllowedColumnIds!(CARD)!]).not.toContain('won')

    boardProps.onCardMove!(CARD, FROM, 'won', 0)

    expect(onMove).not.toHaveBeenCalled()
    // ONE voice: the board asks for the outcome in the same synchronous stack
    // and announces it in its own live region. Asserting the STRING the board
    // is handed — not that some denial function was called — is the point.
    // The old assertion passed all through round 2 while a refused drop was
    // being read out as `Dropped <card>.` (F.35 / L.74).
    const announced = boardProps.formatMoveAnnouncement!({ defaultMessage: 'Moved D-104 to Won.' })
    expect(announced).toContain('Move not allowed')
    expect(announced).not.toMatch(/\bMoved\b/)
    expect(announced).not.toMatch(/\bDropped\b/)
    // …and this package announced nothing of its own alongside it, so there is
    // no second live region saying something different.
    expect(announce).not.toHaveBeenCalled()
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(0)
    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0)
  })

  it('re-evaluates rather than trusting the set captured at drag start', () => {
    const onMove = vi.fn()
    let denied = false
    render(
      <KanbanView config={dealsConfig} records={dealRecords} canMove={() => !denied} onMove={onMove} />,
    )
    // Painted valid at drag start…
    expect([...boardProps.getAllowedColumnIds!(CARD)!]).toContain('won')
    denied = true
    boardProps.onCardMove!(CARD, FROM, 'won', 0)
    // …and still refused on commit, because the terminal path asks again —
    // and the refusal is what the board is given to announce.
    expect(onMove).not.toHaveBeenCalled()
    expect(boardProps.formatMoveAnnouncement!({ defaultMessage: 'Moved D-104 to Won.' })).toContain(
      'Move not allowed',
    )
    expect(announce).not.toHaveBeenCalled()
  })

  it('commits a drop the rules still allow at dragEnd', () => {
    const onMove = vi.fn()
    render(
      <KanbanView
        config={dealsConfig}
        records={dealRecords}
        canMove={(_id, _from, to) => to === 'won'}
        onMove={onMove}
      />,
    )
    boardProps.onCardMove!(CARD, FROM, 'won', 0)
    expect(onMove).toHaveBeenCalledWith(CARD, FROM, 'won')
    expect(announce).not.toHaveBeenCalled()
  })

  it('ignores an unknown destination without announcing anything', () => {
    const onMove = vi.fn()
    render(<KanbanView config={dealsConfig} records={dealRecords} canMove={() => true} onMove={onMove} />)
    boardProps.onCardMove!(CARD, FROM, 'ghost-stage', 0)
    expect(onMove).not.toHaveBeenCalled()
    expect(announce).not.toHaveBeenCalled()
  })
})
