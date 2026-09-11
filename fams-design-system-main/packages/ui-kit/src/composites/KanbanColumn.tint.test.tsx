import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { KanbanBoard } from './Kanban'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'

/**
 * The RESTING lane tint (fix7, run-2026-09-05, P1-C). Two regressions, one
 * fix: figma-spec-kanban.md's lane body tint is `rgba(<lane hex>, 0.03)` — a
 * barely-there wash — but this used to mix at 12% (four times spec strength,
 * `CountChip.tintFromAccent`, covered by its own test) AND paint the WHOLE
 * per-column scroller, which stretches to the lane's full height regardless
 * of how many cards it holds — so a short lane rendered a large, strongly
 * saturated coloured slab below its last card.
 *
 * The fix confines the resting tint to a content wrapper
 * (`kanban-column-body-content`) that sizes to its own children, nested
 * inside the scroller (`kanban-column-body`) but never stretching to fill
 * it. `Kanban.dragpaint.test.tsx` already covers that the IN-FLIGHT
 * drag-validity painting stays on the full-height scroller — a different,
 * unaffected visual job.
 */
describe('KanbanColumn — resting tint confinement (fix7, P1-C)', () => {
  it('paints the resting accent tint on the content wrapper, never on the full-height scroller', () => {
    render(
      <KanbanBoard columns={[{ id: 'a' }]}>
        <KanbanColumn id="a" title="Scheduled" count={1} accentColor="#e93d82">
          <KanbanCard id="c1" index={0} title="Card" />
        </KanbanColumn>
      </KanbanBoard>,
    )
    const scroller = document.querySelector('[data-slot="kanban-column-body"]')!
    const content = document.querySelector('[data-slot="kanban-column-body-content"]')!
    expect(content.getAttribute('style')).toContain('color-mix(in srgb, #e93d82 3%')
    expect(scroller.getAttribute('style')).toBeNull()
  })

  it('the content wrapper sizes to its own content — never `flex-1`, so it cannot stretch to fill a short lane', () => {
    render(
      <KanbanBoard columns={[{ id: 'a' }]}>
        <KanbanColumn id="a" title="Scheduled" count={1} accentColor="#e93d82">
          <KanbanCard id="c1" index={0} title="Card" />
        </KanbanColumn>
      </KanbanBoard>,
    )
    const content = document.querySelector('[data-slot="kanban-column-body-content"]')!
    expect(content.className).not.toContain('flex-1')
    // The scroller keeps the sizing contract asserted by `Kanban.test.tsx`'s
    // scroll-contract suite (`min-h-0`/`flex-1`/`overflow-y-auto`) — unchanged.
    const scroller = document.querySelector('[data-slot="kanban-column-body"]')!
    expect(scroller.className).toContain('flex-1')
  })

  it('the neutral (no accentColor) tint also lands on the content wrapper, not the scroller', () => {
    render(
      <KanbanBoard columns={[{ id: 'a' }]}>
        <KanbanColumn id="a" title="Backlog" count={1}>
          <KanbanCard id="c1" index={0} title="Card" />
        </KanbanColumn>
      </KanbanBoard>,
    )
    const scroller = document.querySelector('[data-slot="kanban-column-body"]')!
    const content = document.querySelector('[data-slot="kanban-column-body-content"]')!
    expect(content.className).toContain('bg-muted/40')
    expect(scroller.className).not.toContain('bg-muted/40')
  })

  it('tintBody={false} suppresses the tint on the content wrapper entirely', () => {
    render(
      <KanbanBoard columns={[{ id: 'a' }]}>
        <KanbanColumn id="a" title="Backlog" count={1} accentColor="#e93d82" tintBody={false}>
          <KanbanCard id="c1" index={0} title="Card" />
        </KanbanColumn>
      </KanbanBoard>,
    )
    const content = document.querySelector('[data-slot="kanban-column-body-content"]')!
    expect(content.getAttribute('style')).toBeNull()
    expect(content.className).not.toContain('bg-muted/40')
  })

  it('an empty lane\'s tint hugs just its empty-message line, not the whole lane height', () => {
    render(
      <KanbanBoard columns={[{ id: 'a' }]}>
        <KanbanColumn id="a" title="Completed" count={0} accentColor="#12b76a" emptyMessage="No cards" />
      </KanbanBoard>,
    )
    const content = document.querySelector('[data-slot="kanban-column-body-content"]')!
    const empty = document.querySelector('[data-slot="kanban-column-empty"]')!
    expect(content.contains(empty)).toBe(true)
    expect(content.className).not.toContain('flex-1')
  })
})
