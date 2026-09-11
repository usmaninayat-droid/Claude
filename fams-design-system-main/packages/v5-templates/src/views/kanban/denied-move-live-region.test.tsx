import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { KanbanView } from '../KanbanView'
import { useKanbanMoves } from './use-kanban-moves'
import {
  dealsConfig,
  dealRecords,
  dealsPipelineRules,
  managerUser,
  makeCanMove,
} from '../fixtures'

/**
 * The end-to-end, REAL live-region proof for the denied-move announce — the
 * one thing every other suite around this behavior cannot show.
 *
 * Deliberately NO `vi.mock('@atlaskit/pragmatic-drag-and-drop-live-region')`
 * and NO fake timers here (`KanbanView.test.tsx` and
 * `announce-denied.test.ts` both mock the module, so they can only observe
 * that `announce()` was CALLED — never what a screen reader would end up
 * reading). This suite drives the real library instead: real `announce()`,
 * its real `role="status"` node(s) appended to `document.body`, and its real
 * flat 1000ms `announceDelay` under real timers. What it asserts is the
 * user-visible guarantee: a denied keyboard move ends up with the DENIAL in
 * the live region and NO "Moved…" success anywhere.
 *
 * Why "anywhere" and not "in the live region": `@fams/ui-kit`'s dist bundles
 * its own copy of the live-region module (`tsup.config.ts` marks
 * `@atlaskit/pragmatic-drag-and-drop*` `noExternal`), so ui-kit's announces
 * and this package's announces drive two SEPARATE module instances with two
 * SEPARATE `role="status"` nodes — and a screen reader reads both. That is
 * precisely why the old "defer one macrotask so our announce cancels theirs"
 * workaround could not actually work in a built app, and why the fix had to
 * be suppression at the source (`KanbanBoardProps.formatMoveAnnouncement`).
 * So these tests read the union of EVERY live region on the page.
 *
 * BLIND SPOT CLOSED (fix wave 1). Every case here used to enter through the
 * card's KEYBOARD "Move to…" menu. The pointer-DROP path enters the same
 * terminal funnel by a different door — `ui-kit`'s `KanbanBoard` monitor
 * resolves the drop and calls `onCardMove`, which IS `useKanbanMoves`'
 * `handleCardMove` — and nothing here exercised that door, so a regression on
 * it would have gone unnoticed. The last `describe` drives that funnel
 * directly, which covers BOTH entry paths at the one place they meet.
 *
 * The round-1 gate reported this behaviour as absent live for two reasons that
 * are worth recording, because both are harness bugs a future gate can repeat:
 * it read `[aria-live]` (the library's node carries ONLY `role="status"` — see
 * its `createNode()`), and it waited 700ms for a message the library writes
 * after a flat 1000ms `announceDelay`. `qa/fw1-verify.mjs` fixes both.
 */

const HOOLI = 'Hooli — Enterprise rollout' // D-104, stage "proposal"

/** The library writes the message into a visually-hidden `role="status"` node; there is one per live-region module instance (see file docblock). */
function liveRegionText(): string {
  return Array.from(document.querySelectorAll('[role="status"]'))
    .map((node) => node.textContent ?? '')
    .join(' | ')
}

function clearLiveRegions(): void {
  for (const node of document.querySelectorAll('[role="status"]')) node.textContent = ''
}

beforeEach(clearLiveRegions)

afterEach(async () => {
  // The live-region nodes and their pending 1000ms timers outlive a single
  // test (module-level state in the library). Flush anything still queued,
  // then blank the nodes, so no message can leak into the next test's
  // assertions.
  await new Promise((resolve) => setTimeout(resolve, 1100))
  clearLiveRegions()
})

describe('denied Kanban move — real live region, real timers (no mocks)', () => {
  it('announces the denial and NEVER a "Moved…" success', async () => {
    // The "Move to…" menu now excludes every lane the status-workflow
    // predicate denies, so the terminal-denial path left to prove is a rule
    // whose answer CHANGES between the paint and the commit: the menu is built
    // while the move is allowed, and the rule flips before it is taken.
    let denyEverything = false
    const canMove = () => !denyEverything
    render(<KanbanView config={dealsConfig} records={dealRecords} canMove={canMove} onMove={vi.fn()} />)

    fireEvent.keyDown(screen.getByRole('button', { name: `Move to stage: ${HOOLI}` }), { key: 'Enter' })
    denyEverything = true
    fireEvent.click(screen.getByRole('menuitem', { name: 'Won' }))

    // Nothing is readable yet — the library only writes `textContent` after
    // its 1000ms delay.
    expect(liveRegionText()).not.toContain('Move not allowed')

    await waitFor(() => expect(liveRegionText()).toContain('Move not allowed'), { timeout: 2500 })
    // The regression this suite exists to prevent: an optimistic success
    // announced despite the move being refused. `\bMoved\b` deliberately does
    // not match the denial's own "Move not allowed" wording.
    expect(liveRegionText()).not.toMatch(/\bMoved\b/)
  })

  it('still announces the success for a move that IS allowed — the suppression is per-move, not blanket', async () => {
    // Positive control: without this, the test above would also pass if
    // ui-kit had simply stopped announcing moves altogether.
    const canMove = makeCanMove(dealsPipelineRules, managerUser, dealRecords)
    render(<KanbanView config={dealsConfig} records={dealRecords} canMove={canMove} onMove={vi.fn()} />)

    fireEvent.keyDown(screen.getByRole('button', { name: `Move to stage: ${HOOLI}` }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Won' }))

    await waitFor(() => expect(liveRegionText()).toMatch(/\bMoved\b/), { timeout: 2500 })
    expect(liveRegionText()).toContain(`Moved ${HOOLI} to Won.`)
    expect(liveRegionText()).not.toContain('Move not allowed')
  })
})

describe('the terminal denial funnel — the seam the pointer drop and the keyboard menu share', () => {
  const stages = [
    { id: 'proposal', label: 'Proposal' },
    { id: 'won', label: 'Won' },
  ] as never[]

  function moves(canMove: (id: string, from: string, to: string) => boolean, onMoveDenied?: () => void) {
    return renderHook(() =>
      useKanbanMoves({
        stages,
        stageOfCard: () => 'proposal',
        knownStageIds: new Set(['proposal', 'won']),
        canMove,
        onMove: vi.fn(),
        onMoveDenied,
      }),
    ).result
  }

  it('hands the denial to the board as the move OUTCOME, and announces nothing itself', async () => {
    const result = moves(() => false)
    result.current.handleCardMove('D-104', 'proposal', 'won')
    // The hook is deliberately SILENT. The board asks for the outcome
    // synchronously right after `handleCardMove` returns and announces it in
    // its own single live region — announcing here too would put the denial
    // in a SECOND region beside whatever the board said, which is exactly how
    // a refused move used to end up narrated as `Dropped <card>.`
    await new Promise((resolve) => setTimeout(resolve, 1200))
    expect(liveRegionText()).not.toContain('Move not allowed')
    // What the board is handed is the denial itself — never the success, and
    // never `null`, which would have left the refusal unsaid altogether.
    const announced = result.current.formatMoveAnnouncement({
      defaultMessage: 'Moved D-104 to Won.',
    } as never)
    expect(announced).toContain('Move not allowed')
    expect(announced).not.toMatch(/\bMoved\b/)
    expect(announced).not.toMatch(/\bDropped\b/)
  })

  it('stays silent for an ALLOWED drop, and lets the success announce through', async () => {
    const result = moves(() => true)
    result.current.handleCardMove('D-104', 'proposal', 'won')
    await new Promise((resolve) => setTimeout(resolve, 1200))
    expect(liveRegionText()).not.toContain('Move not allowed')
    expect(result.current.formatMoveAnnouncement({ defaultMessage: 'Moved D-104 to Won.' } as never)).toBe(
      'Moved D-104 to Won.',
    )
  })

  it('stays silent for a same-stage no-op and an unknown destination (ignores, not denials)', async () => {
    const result = moves(() => false)
    result.current.handleCardMove('D-104', 'proposal', 'proposal')
    result.current.handleCardMove('D-104', 'proposal', 'not-a-stage')
    await new Promise((resolve) => setTimeout(resolve, 1200))
    expect(liveRegionText()).not.toContain('Move not allowed')
  })

  it('hands the denial to the caller instead of announcing when onMoveDenied is wired', async () => {
    const onMoveDenied = vi.fn()
    const result = moves(() => false, onMoveDenied)
    result.current.handleCardMove('D-104', 'proposal', 'won')
    await new Promise((resolve) => setTimeout(resolve, 1200))
    expect(onMoveDenied).toHaveBeenCalledTimes(1)
    expect(liveRegionText()).not.toContain('Move not allowed')
  })

  // ── UX F.35 / L.74: the OTHER refusal — a drop straight onto a lane the
  // painting already marked invalid. It resolves no move at all, so
  // `handleCardMove` is never called and `formatMoveAnnouncement` can never
  // speak for it; ui-kit asks `formatBlockedDropAnnouncement` instead. Both
  // halves must produce the SAME sentence.
  const blockedDrop = { cardId: 'D-104', fromColumnId: 'proposal', toColumnId: 'won' } as never

  it('voices an invalid-lane drop with the same sentence as a refused resolvable move', () => {
    const result = moves(() => false)
    // The refused-resolvable half, for comparison.
    result.current.handleCardMove('D-104', 'proposal', 'won')
    const refused = result.current.formatMoveAnnouncement({ defaultMessage: 'Moved D-104 to Won.' } as never)

    const blocked = result.current.formatBlockedDropAnnouncement(blockedDrop)
    expect(blocked).toBe("Move not allowed: this card can't move to Won.")
    expect(blocked).toBe(refused)
    expect(blocked).not.toMatch(/\bDropped\b/)
    expect(blocked).not.toMatch(/\bMoved\b/)
  })

  it('hands an invalid-lane drop to onMoveDenied, and says nothing itself, when that is wired', () => {
    const onMoveDenied = vi.fn()
    const result = moves(() => false, onMoveDenied)
    expect(result.current.formatBlockedDropAnnouncement(blockedDrop)).toBeNull()
    expect(onMoveDenied).toHaveBeenCalledWith('D-104', 'proposal', 'won')
  })
})
