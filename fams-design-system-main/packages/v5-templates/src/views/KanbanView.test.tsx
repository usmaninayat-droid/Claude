import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { announce } from '@atlaskit/pragmatic-drag-and-drop-live-region'
import { KanbanView } from './KanbanView'
import { dealsConfig, dealRecords, dealsPipelineRules, managerUser, repUser, makeCanMove } from './fixtures'

vi.mock('@atlaskit/pragmatic-drag-and-drop-live-region', () => ({ announce: vi.fn() }))

const HOOLI = 'Hooli — Enterprise rollout' // D-104, stage "proposal"

beforeEach(() => {
  vi.mocked(announce).mockClear()
})

/** What a screen reader would read: ui-kit's live-region node(s), joined. */
function liveRegionText(): string {
  return Array.from(document.querySelectorAll('[role="status"]'))
    .map((node) => node.textContent ?? '')
    .join(' | ')
}

/**
 * A pipeline stage's LANE HEADER, addressed as the heading it is (`h3`, via
 * `KanbanColumnView`'s `headingLevel={3}`) rather than by bare text.
 *
 * fix8 (2026-09-06): these assertions used to be plain `getByText(stage)` and
 * passed only because of a DEFECT. Until fix7 gave `ReadEnum` the blueprint's
 * own `uiConfig.statusList` label map, a card's status chip printed the raw
 * storage key (`lead`, `proposal`) while the lane header printed the authored
 * label (`Lead`, `Proposal`) — so the label was accidentally unique in the
 * DOM. Now that the leak is fixed both read the same words and the text query
 * is legitimately ambiguous. Verified in the DOM before touching a single
 * assertion (the fix4/wave-7 rule): the second match is a real card chip, not
 * a duplicated lane.
 */
describe('KanbanView — blueprint-driven render (crm golden: deals)', () => {
  it('renders a lane per statusList stage and a card per record', () => {
    render(<KanbanView config={dealsConfig} records={dealRecords} />)
    for (const label of ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost']) {
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByText(HOOLI)).toBeInTheDocument()
    expect(screen.getByText('Globex — Platform pilot')).toBeInTheDocument()
    // Card BODY cells are derived from the blueprint kanbanCard config + rendered
    // through the FieldRegistry read renderers (kanban-card spec: metadata chips),
    // not just the title — the company field shows on the card.
    expect(screen.getByText('Globex Corp')).toBeInTheDocument()
  })

  it('renders the ticket-id (uniqueidentifier) cell as a hash-icon chip, not bare text', () => {
    // Locks in the root-cause fix: `uniqueidentifier` is placed on the
    // blueprint's kanbanCard.header (deals.module.json) but was never typed
    // `Auto` in systemcolumns, so it fell back to the generic SmallText/
    // ReadText renderer — literally bare text — even though `ReadAuto`'s
    // gray hash-icon chip (Figma 5729:39935, now `@fams/ui-kit`'s `IdChip`)
    // was already implemented and registered for FieldType 'Auto'. It just
    // never got invoked for this card's id cell.
    render(<KanbanView config={dealsConfig} records={dealRecords} />)
    const idText = screen.getByText('D-104')
    const chip = idText.closest('[data-slot="id-chip"]')
    expect(chip).not.toBeNull()
    expect(chip?.querySelector('svg')).toBeInTheDocument()
  })

  it('moves a card via the keyboard "Move to stage" menu (a11y fallback)', () => {
    const onMove = vi.fn()
    const canMove = makeCanMove(dealsPipelineRules, managerUser, dealRecords)
    render(<KanbanView config={dealsConfig} records={dealRecords} canMove={canMove} onMove={onMove} />)

    // Manager may move proposal → won.
    fireEvent.keyDown(screen.getByRole('button', { name: `Move to stage: ${HOOLI}` }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Won' }))
    expect(onMove).toHaveBeenCalledWith('D-104', 'proposal', 'won')
    // Allowed moves are unaffected by the denied-move feedback path.
    expect(announce).not.toHaveBeenCalled()
  })

  it('EXCLUDES rule-denied stages from the keyboard "Move to stage" menu', () => {
    // The move menu's offered set is now computed from the SAME
    // status-workflow predicate that paints the pointer-drag targets
    // (`kanban/move-rules.ts`, threaded to `ui-kit` as `KanbanColumn.
    // canDropCard`). A SalesRep cannot move a deal out of "proposal" (every
    // proposal→* transition requires SalesManager), so this card's menu offers
    // NOTHING — where it previously offered every lane and only refused on
    // commit.
    const canMove = makeCanMove(dealsPipelineRules, repUser, dealRecords)
    render(<KanbanView config={dealsConfig} records={dealRecords} canMove={canMove} onMove={vi.fn()} />)
    expect(screen.queryByRole('button', { name: `Move to stage: ${HOOLI}` })).not.toBeInTheDocument()
  })

  it('still offers exactly the stages the predicate allows — the menu and the rules cannot disagree', () => {
    // Positive control for the test above: a manager MAY move proposal → won
    // and proposal → lost, and those are the only two entries offered.
    const canMove = makeCanMove(dealsPipelineRules, managerUser, dealRecords)
    render(<KanbanView config={dealsConfig} records={dealRecords} canMove={canMove} onMove={vi.fn()} />)
    fireEvent.keyDown(screen.getByRole('button', { name: `Move to stage: ${HOOLI}` }), { key: 'Enter' })
    const offered = screen.getAllByRole('menuitem').map((item) => item.textContent)
    expect(offered).toEqual(['Won', 'Lost'])
  })

  it('without an onMoveDenied callback, a denied move announces via the live-region default — synchronously', async () => {
    // The terminal-denial path. The menu no longer offers a lane the rules
    // deny, so what is exercised here is the case that remains: a rule whose
    // answer CHANGES between the paint and the commit (a live rule engine, or
    // an app-level guarded write) — `KanbanView` must still refuse it and
    // announce once, rather than trusting the painted set.
    let denyEverything = false
    const canMove = () => !denyEverything
    render(<KanbanView config={dealsConfig} records={dealRecords} canMove={canMove} onMove={vi.fn()} />)
    fireEvent.keyDown(screen.getByRole('button', { name: `Move to stage: ${HOOLI}` }), { key: 'Enter' })
    denyEverything = true
    fireEvent.click(screen.getByRole('menuitem', { name: 'Won' }))
    // ONE voice, and it is the BOARD's: `KanbanView` hands the refusal back
    // through `formatMoveAnnouncement` and stays silent itself, so the denial
    // lands in the same single live region a success would have used. This is
    // asserted on the announced TEXT — the thing a screen reader actually
    // reads — because the round-2 defect was invisible to an assertion that
    // only checked a denial function had been called.
    await waitFor(
      () => expect(liveRegionText()).toContain('Move not allowed'),
      { timeout: 2500 },
    )
    // The regression: an optimistic success for a move that was refused.
    // `\bMoved\b` deliberately does not match "Move not allowed".
    expect(liveRegionText()).not.toMatch(/\bMoved\b/)
    expect(liveRegionText()).not.toMatch(/\bDropped\b/)
    // …and this package added no second, competing region of its own.
    expect(announce).not.toHaveBeenCalled()
  })

  it('a denied move fires onMoveDenied with (recordId, fromStage, toStage) instead of announcing', async () => {
    const onMove = vi.fn()
    const onMoveDenied = vi.fn()
    let denyEverything = false
    const canMove = () => !denyEverything
    render(
      <KanbanView
        config={dealsConfig}
        records={dealRecords}
        canMove={canMove}
        onMove={onMove}
        onMoveDenied={onMoveDenied}
      />,
    )
    fireEvent.keyDown(screen.getByRole('button', { name: `Move to stage: ${HOOLI}` }), { key: 'Enter' })
    denyEverything = true
    fireEvent.click(screen.getByRole('menuitem', { name: 'Won' }))
    expect(onMoveDenied).toHaveBeenCalledWith('D-104', 'proposal', 'won')
    expect(onMove).not.toHaveBeenCalled()
    // The app owns feedback once it provides the callback — the default
    // announce path is never entered at all, synchronously or after a tick.
    expect(announce).not.toHaveBeenCalled()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(announce).not.toHaveBeenCalled()
  })

  // UX J.57's three causes (`RecordViewStates.tsx`). Round 1 shipped ONE copy
  // for all three, so a search that matched nothing told the user the module
  // was empty; these three cases are what stop that regressing.
  it('renders the "no data at all" state with no records and no filter', () => {
    render(<KanbanView config={dealsConfig} records={[]} recordNoun={{ one: 'deal', many: 'deals' }} />)
    expect(screen.getByText('No deals yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
  })

  it('keeps every stage column standing when filtered to zero, with a Clear filters hint', () => {
    const onClearFilters = vi.fn()
    render(
      <KanbanView
        config={dealsConfig}
        records={[]}
        isFiltered
        onClearFilters={onClearFilters}
        recordNoun={{ one: 'deal', many: 'deals' }}
      />,
    )
    // J.58: the lanes are the content — an empty column must never disappear,
    // "or cards can never be moved into it".
    const columns = document.querySelectorAll('[data-slot="kanban-column"]')
    expect(columns.length).toBeGreaterThan(0)
    expect(document.querySelectorAll('[data-slot="kanban-column-empty"]').length).toBe(columns.length)
    expect(screen.queryByText('No deals yet')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onClearFilters).toHaveBeenCalled()
  })

  it('renders the error cause with Retry, never a silent empty board', () => {
    const onRetry = vi.fn()
    render(
      <KanbanView
        config={dealsConfig}
        records={[]}
        error="Request failed (503)."
        onRetry={onRetry}
        recordNoun={{ one: 'deal', many: 'deals' }}
      />,
    )
    expect(screen.getByText("Couldn't load deals")).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('fires onCardClick with the record id', () => {
    const onCardClick = vi.fn()
    render(<KanbanView config={dealsConfig} records={dealRecords} onCardClick={onCardClick} />)
    fireEvent.click(screen.getByText(HOOLI))
    expect(onCardClick).toHaveBeenCalledWith('D-104')
  })
})

describe('KanbanView — Group By (SPEC Addendum AC-6.1..6.4, generalized to Kanban lanes)', () => {
  const groupByOptions = [
    { key: 'status', label: 'Stage' },
    { key: 'systemcol2', label: 'Priority' },
  ]

  it('omitting groupByOptions renders no Group By control at all — every existing caller unchanged', () => {
    render(<KanbanView config={dealsConfig} records={dealRecords} />)
    expect(screen.queryByRole('button', { name: 'Group by' })).not.toBeInTheDocument()
  })

  it('opens on the real pipeline-stage lanes by default (the sentinel key)', () => {
    render(<KanbanView config={dealsConfig} records={dealRecords} groupByOptions={groupByOptions} />)
    for (const label of ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost']) {
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument()
    }
  })

  it('selecting a non-status option regroups lanes LIVE by that column\'s values, replacing the stage lanes', () => {
    render(<KanbanView config={dealsConfig} records={dealRecords} groupByOptions={groupByOptions} />)
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Priority' }))

    // Priority LANES (deals.seed.json: High x2, Medium x3, Low x1), not stages
    // — lane names are `<h3>` headings, distinct from a card's OWN
    // `PriorityFlag` badge text (which also reads "High"/"Medium"/"Low").
    expect(screen.getByRole('heading', { name: 'High' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Medium' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Low' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Lead' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Qualified' })).not.toBeInTheDocument()
    // Cards are unaffected — every record still renders exactly once.
    expect(screen.getByText(HOOLI)).toBeInTheDocument()
  })

  it('a non-status grouping disables drag between its display-only lanes — no "Move to…" menu offered', () => {
    render(
      <KanbanView
        config={dealsConfig}
        records={dealRecords}
        groupByOptions={groupByOptions}
        onMove={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Priority' }))
    // Same "menu offers nothing when nothing is allowed" contract the
    // rule-denied-stages test above asserts — here every lane is display-only.
    expect(screen.queryByRole('button', { name: `Move to stage: ${HOOLI}` })).not.toBeInTheDocument()
  })

  it('Reset restores the Status lanes (the default), not "no grouping" (AC-6.2)', () => {
    render(<KanbanView config={dealsConfig} records={dealRecords} groupByOptions={groupByOptions} />)
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Priority' }))
    expect(screen.queryByRole('heading', { name: 'Lead' })).not.toBeInTheDocument()

    // The popover stays open after a live-apply selection (AC-6.1) — Reset is
    // already visible, no need to re-open the trigger.
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    for (const label of ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost']) {
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument()
    }
    expect(screen.queryByRole('heading', { name: 'High' })).not.toBeInTheDocument()
  })

  it('supports a controlled groupBy — the caller can drive the same regroup from outside', () => {
    const onGroupByChange = vi.fn()
    const { rerender } = render(
      <KanbanView
        config={dealsConfig}
        records={dealRecords}
        groupByOptions={groupByOptions}
        groupBy="status"
        onGroupByChange={onGroupByChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Priority' }))
    expect(onGroupByChange).toHaveBeenCalledWith('systemcol2')
    // Controlled: nothing regroups until the caller feeds the new value back.
    expect(screen.getByRole('heading', { name: 'Lead' })).toBeInTheDocument()
    rerender(
      <KanbanView
        config={dealsConfig}
        records={dealRecords}
        groupByOptions={groupByOptions}
        groupBy="systemcol2"
        onGroupByChange={onGroupByChange}
      />,
    )
    expect(screen.getByRole('heading', { name: 'High' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Lead' })).not.toBeInTheDocument()
  })
})
