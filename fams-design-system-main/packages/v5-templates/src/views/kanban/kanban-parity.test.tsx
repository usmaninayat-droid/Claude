import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { KanbanView, MAX_PINNED_COLUMNS, PIN_LIMIT_REASON } from '../KanbanView'
import { DENIED_DROP_MESSAGE } from './KanbanColumnView'
import { canCardEnterStage, orderStagesByPinned, togglePinned } from './move-rules'
import { KANBAN_DISPLAY_MODE_LABEL, toDisplayMode } from './kanban-display'
import { dealsConfig, dealRecords } from '../fixtures'

vi.mock('@atlaskit/pragmatic-drag-and-drop-live-region', () => ({ announce: vi.fn() }))

/**
 * Wave A4 — the three kanban behaviours the design specifies: the "Data-only
 * view" display toggle, real column pinning, and the pre-emptive drag-validity
 * painting fed by ONE status-workflow predicate.
 *
 * Everything here is asserted against the crm golden blueprint AND against a
 * second, differently-named module config, because Figma frame `33534:32278`
 * renders this same view family as `Incident Reporting` with six different
 * stage names and counts. Any stage name, colour or count that leaked into
 * code rather than staying data fails the parity test at the bottom.
 */

const HOOLI = 'Hooli — Enterprise rollout' // D-104, stage "proposal"

/** Stage ids/labels from frame `33534:32278` — a DIFFERENT module, same engine. */
const INCIDENT_STAGES = [
  { key: 'awaiting_rectification', label: 'Awaiting Rectification', color: '#94a3b8' },
  { key: 'rectification_submitted', label: 'Rectification Submitted', color: '#0072d6' },
  { key: 'escalated', label: 'Escalated', color: '#f04438' },
  { key: 'awaiting_re_rectification', label: 'Awaiting Re-Rectification', color: '#f79009' },
  { key: 're_rectification_submitted', label: 'Re-Rectification Submitted', color: '#7c3aed' },
  { key: 'resolved', label: 'Resolved < 3', color: '#16a34a' },
]

/**
 * The golden blueprint re-configured as a different module: six new stage
 * ids/labels/colours and every record re-homed onto them. Only DATA changes —
 * not one line of the view is aware of either vocabulary.
 */
function incidentConfig(): { config: EntityConfig; records: EntityRecord[] } {
  const config = {
    ...dealsConfig,
    name: 'Incident Reporting',
    uiConfig: {
      ...dealsConfig.uiConfig,
      statusList: INCIDENT_STAGES.map((stage, index) => ({
        id: `sts_${index}`,
        key: stage.key,
        label: stage.label,
        color: stage.color,
      })),
    },
  } as EntityConfig
  const records = dealRecords.map((record, index) => ({
    ...record,
    status: INCIDENT_STAGES[index % INCIDENT_STAGES.length].key,
  })) as EntityRecord[]
  return { config, records }
}

function columns(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-slot="kanban-column"]'))
}

function columnTitles(): (string | null)[] {
  // The stage name is an `h3` (UX K.68) — the lane's first `span` is now the
  // count chip, so query the heading explicitly.
  return columns().map((column) => column.querySelector('h3')?.textContent ?? null)
}

// ---------------------------------------------------------------------------
// A4.1 — the "Data-only view" display toggle
// ---------------------------------------------------------------------------

/** What a screen reader would read: the live-region node(s) ui-kit writes into. */
function liveRegionText(): string {
  return Array.from(document.querySelectorAll('[role="status"]'))
    .map((node) => node.textContent ?? '')
    .join(' | ')
}

describe('A4.1 — kanban display mode (card media)', () => {
  it("carries the designer's own tooltip copy verbatim for the data-only state", () => {
    expect(KANBAN_DISPLAY_MODE_LABEL.data).toBe('Data-only view')
    expect(KANBAN_DISPLAY_MODE_LABEL.image).toBe('Image view')
  })

  it('drops the cover thumbnail in data mode and keeps every other card part', () => {
    const { config, records } = incidentConfig()
    const withImage = {
      ...config,
      uiConfig: { ...config.uiConfig, kanbanCard: { ...config.uiConfig.kanbanCard, image: { col: 'systemcol3' } } },
    } as EntityConfig

    const image = render(<KanbanView config={withImage} records={records} displayMode="image" />)
    const imageCount = document.querySelectorAll('[data-slot="kanban-card"] img').length
    const titlesWithImage = screen.getAllByText(/—/).length
    image.unmount()

    render(<KanbanView config={withImage} records={records} displayMode="data" />)
    // Media gone…
    expect(document.querySelectorAll('[data-slot="kanban-card"] img')).toHaveLength(0)
    // …and the board shape is untouched: same lanes, same cards, same titles.
    expect(columns()).toHaveLength(INCIDENT_STAGES.length)
    expect(screen.getAllByText(/—/).length).toBe(titlesWithImage)
    expect(imageCount).toBeGreaterThanOrEqual(0)
  })

  // Finding A7b-2: the thumbnail used to render after the metadata rows.
  it('puts the cover thumbnail at the TOP of the card, above the badge row', () => {
    const { config, records } = incidentConfig()
    const withImage = {
      ...config,
      uiConfig: { ...config.uiConfig, kanbanCard: { ...config.uiConfig.kanbanCard, image: { col: 'systemcol3' } } },
    } as EntityConfig
    render(<KanbanView config={withImage} records={records} displayMode="image" />)
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="kanban-card"]'))
    const withCover = cards.filter((c) => c.querySelector('[data-slot="kanban-card-cover"]'))
    expect(withCover.length).toBeGreaterThan(0)
    for (const card of withCover) {
      const slots = [...card.children].map((el) => el.getAttribute('data-slot'))
      expect(slots[0]).toBe('kanban-card-cover')
      const badges = slots.indexOf('kanban-card-badges')
      if (badges >= 0) expect(badges).toBeGreaterThan(0)
    }
  })

  it('narrows any persisted value back to a mode, so a stale saved view cannot break the lens', () => {
    expect(toDisplayMode('data')).toBe('data')
    expect(toDisplayMode('image')).toBe('image')
    expect(toDisplayMode('rows')).toBe('image')
    expect(toDisplayMode(undefined)).toBe('image')
  })
})

// ---------------------------------------------------------------------------
// A4.2 — real column pinning
// ---------------------------------------------------------------------------

describe('A4.2 — column pinning', () => {
  it('renders no pin control at all when the owner cannot persist the choice', () => {
    render(<KanbanView config={dealsConfig} records={dealRecords} />)
    expect(screen.queryByRole('button', { name: /^Pin column/ })).not.toBeInTheDocument()
  })

  it('is a real toggle: aria-pressed, and an accessible name that flips between Pin and Unpin', () => {
    const onPinnedStagesChange = vi.fn()
    const { rerender } = render(
      <KanbanView
        config={dealsConfig}
        records={dealRecords}
        pinnedStages={[]}
        onPinnedStagesChange={onPinnedStagesChange}
      />,
    )
    const pin = screen.getByRole('button', { name: 'Pin column Proposal' })
    expect(pin).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(pin)
    expect(onPinnedStagesChange).toHaveBeenCalledWith(['proposal'])

    rerender(
      <KanbanView
        config={dealsConfig}
        records={dealRecords}
        pinnedStages={['proposal']}
        onPinnedStagesChange={onPinnedStagesChange}
      />,
    )
    const unpin = screen.getByRole('button', { name: 'Unpin column Proposal' })
    expect(unpin).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(unpin)
    expect(onPinnedStagesChange).toHaveBeenCalledWith([])
  })

  it('hoists a pinned lane to the FIRST position, regardless of its configured order', () => {
    // Figma "Pin Column" Dev Note `33534:45589`, verbatim: "Clicking the pin
    // icon will pin that column to the first position, regardless of its
    // current location."
    render(
      <KanbanView
        config={dealsConfig}
        records={dealRecords}
        pinnedStages={['won']}
        onPinnedStagesChange={vi.fn()}
      />,
    )
    expect(columnTitles()[0]).toBe('Won')
    expect(columnTitles()).toEqual(['Won', 'Lead', 'Qualified', 'Proposal', 'Lost'])
  })

  it('does NOT freeze in place — one scroller for the whole board', () => {
    // Dev Note `33534:44658` is explicit: "Horizontal scrolling will be applied
    // to all columns together. There will be no separate behavior where pinned
    // columns remain fixed while the remaining columns scroll. All columns will
    // scroll at once. This is to prevent multiple scrollbars in smaller
    // viewports." So pinning REORDERS only; an earlier `sticky start-0` here
    // implemented exactly the behaviour the designer ruled out.
    render(
      <KanbanView
        config={dealsConfig}
        records={dealRecords}
        pinnedStages={['lost']}
        onPinnedStagesChange={vi.fn()}
      />,
    )
    const board = screen.getByRole('group', { name: `${dealsConfig.name} board` })
    const pinned = columns()[0]
    // The state marker a Playwright rect check keys off survives...
    expect(pinned).toHaveAttribute('data-pinned', 'true')
    // ...but the lane is an ordinary in-flow column.
    expect(pinned.className).not.toContain('sticky')

    board.scrollLeft = 800
    fireEvent.scroll(board)
    // Order is stable across a scroll; the lane simply scrolls with its siblings.
    expect(columns()[0]).toBe(pinned)
    expect(pinned).toHaveAttribute('data-pinned', 'true')
    expect(pinned.className).not.toContain('sticky')
  })

  it('draws the separator on the LAST pinned lane only', () => {
    // Dev Note `33534:45590`: "A vertical line will act as a separator between
    // pinned and unpinned columns."
    render(
      <KanbanView
        config={dealsConfig}
        records={dealRecords}
        pinnedStages={['won', 'lost']}
        onPinnedStagesChange={vi.fn()}
      />,
    )
    const [first, second, third] = columns()
    expect(first.className).not.toContain('border-e')
    expect(second.className).toContain('border-e')
    expect(third.className).not.toContain('border-e')
  })

  it('refuses a pin past the cap with an explanation, never a silent no-op', () => {
    const onPinnedStagesChange = vi.fn()
    render(
      <KanbanView
        config={dealsConfig}
        records={dealRecords}
        pinnedStages={['won', 'lost']}
        onPinnedStagesChange={onPinnedStagesChange}
      />,
    )
    expect(MAX_PINNED_COLUMNS).toBe(2)
    const refused = screen.getByRole('button', { name: 'Pin column Lead' })
    // `aria-disabled`, not `disabled`: the control stays focusable so its
    // explanation is reachable.
    expect(refused).toHaveAttribute('aria-disabled', 'true')
    expect(PIN_LIMIT_REASON).toContain('Unpin a column first')
    fireEvent.click(refused)
    expect(onPinnedStagesChange).not.toHaveBeenCalled()
    // An already-pinned lane can still be UNpinned while the cap is reached.
    expect(screen.getByRole('button', { name: 'Unpin column Won' })).not.toHaveAttribute('aria-disabled')
  })

  it('ignores pinned ids that no longer exist in the config (a saved view outliving a blueprint edit)', () => {
    const stages = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ]
    expect(orderStagesByPinned(stages, ['nope']).map((e) => e.stage.id)).toEqual(['a', 'b'])
    expect(orderStagesByPinned(stages, ['b']).map((e) => e.stage.id)).toEqual(['b', 'a'])
    expect(togglePinned(['a'], 'b')).toEqual(['a', 'b'])
    expect(togglePinned(['a', 'b'], 'a')).toEqual(['b'])
  })
})

// ---------------------------------------------------------------------------
// A4.3 — pre-emptive drag-validity painting, one predicate
// ---------------------------------------------------------------------------

describe('A4.3 — drag validity is one predicate, two consumers', () => {
  it('exposes the status-workflow predicate the painting and the move menu share', () => {
    const known = new Set(['lead', 'qualified', 'proposal'])
    const canMove = (_id: string, _from: string, to: string) => to === 'qualified'
    expect(canCardEnterStage('D-1', 'lead', 'qualified', known, canMove)).toBe(true)
    expect(canCardEnterStage('D-1', 'lead', 'proposal', known, canMove)).toBe(false)
    // Not denials — a same-stage drop and an unknown lane are ignores.
    expect(canCardEnterStage('D-1', 'lead', 'lead', known, canMove)).toBe(false)
    expect(canCardEnterStage('D-1', 'lead', 'ghost', known, canMove)).toBe(false)
    // No rules at all → every real transition is allowed.
    expect(canCardEnterStage('D-1', 'lead', 'proposal', known)).toBe(true)
  })

  it("the move menu offers exactly the predicate's allowed set — the drag can never disagree", () => {
    // The menu reads `canDropCard` off the board's column registry; each lane
    // paints from the very same bound function. One rule, two consumers.
    const canMove = (_id: string, _from: string, to: string) => to === 'won'
    render(<KanbanView config={dealsConfig} records={dealRecords} canMove={canMove} onMove={vi.fn()} />)
    fireEvent.keyDown(screen.getByRole('button', { name: `Move to stage: ${HOOLI}` }), { key: 'Enter' })
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Won'])
  })

  it('carries the literal refusal copy from Dev Note 33534:32268', () => {
    expect(DENIED_DROP_MESSAGE).toBe("This item can't move here.")
  })

  it('announces NOTHING while painting — exactly one announcement, on the terminal denial', async () => {
    const { announce } = await import('@atlaskit/pragmatic-drag-and-drop-live-region')
    vi.mocked(announce).mockClear()
    let denyEverything = false
    render(
      <KanbanView
        config={dealsConfig}
        records={dealRecords}
        canMove={() => !denyEverything}
        onMove={vi.fn()}
      />,
    )
    // Painting is visual-only: rendering the board, and every lane's paint
    // decision, must not touch the live region at all.
    expect(announce).not.toHaveBeenCalled()

    fireEvent.keyDown(screen.getByRole('button', { name: `Move to stage: ${HOOLI}` }), { key: 'Enter' })
    denyEverything = true
    fireEvent.click(screen.getByRole('menuitem', { name: 'Won' }))

    // The denial is announced by the BOARD, in its own single live region —
    // the one place a move's outcome is ever voiced. Asserted on the text a
    // screen reader would read, not on which function fired: the round-2
    // defect passed every call-count assertion while a refused move was
    // narrated as `Dropped <card>.`
    await waitFor(() => expect(liveRegionText()).toContain('Move not allowed'), { timeout: 2500 })
    expect(liveRegionText()).not.toMatch(/\bMoved\b/)
    expect(liveRegionText()).not.toMatch(/\bDropped\b/)

    // And this package mounted no SECOND, competing region beside it: the
    // in-column refusal message is `aria-hidden` decoration, not a voice.
    expect(announce).not.toHaveBeenCalled()
    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Parity — the same view family under a different module config
// ---------------------------------------------------------------------------

describe('module-config parity — nothing is hardcoded to one config’s stages', () => {
  it('renders six differently-named stages, their own colours and their own counts', () => {
    const { config, records } = incidentConfig()
    render(
      <KanbanView
        config={config}
        records={records}
        displayMode="data"
        pinnedStages={['escalated']}
        onPinnedStagesChange={vi.fn()}
      />,
    )
    // Every incident stage label renders…
    // `getAllByText`, not `getByText`: a stage label legitimately appears twice
    // — once as the lane's own <h3> header, and once as the status badge of a
    // card sitting in that lane. That second occurrence only started matching
    // when `humanizeEnumValue` landed (round 5): the badge used to print the
    // raw stored key (`awaiting_rectification`). Asserting presence, not
    // uniqueness, is what this test was always about.
    for (const stage of INCIDENT_STAGES) expect(screen.getAllByText(stage.label).length).toBeGreaterThan(0)
    // …and not one label from the golden blueprint survives.
    for (const label of ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
    // Pinning, the pin control's accessible name and the board's own name are
    // all derived from this config's data.
    expect(columnTitles()[0]).toBe('Escalated')
    expect(screen.getByRole('button', { name: 'Unpin column Escalated' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Incident Reporting board' })).toBeInTheDocument()
    // Stage colour reaches the lane as runtime data, never a literal.
    expect(columns()[0].getAttribute('style')).toContain('rgb(240, 68, 56)')
  })

  it('paints, pins and toggles identically for both configs — the code path is shared', () => {
    const { config, records } = incidentConfig()
    const canMove = (_id: string, _from: string, to: string) => to === 'resolved'
    render(<KanbanView config={config} records={records} canMove={canMove} onMove={vi.fn()} />)
    const trigger = screen.getAllByRole('button', { name: /^Move to stage:/ })[0]
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Resolved < 3'])
  })
})

/**
 * Wave A5 — the shared row/card chrome, proved config-driven on the SECOND
 * module too. Selection ids, the card's accessible names, the row menu's
 * subject and the export's column headers must all come from data; a stage
 * name, a column key or a record label baked into code fails here.
 */
describe('A5 parity — shared row/card chrome is config-driven, not module-specific', () => {
  it('renders one flat selection across every lane of a differently-configured module', () => {
    const { config, records } = incidentConfig()
    const onSelectedIdsChange = vi.fn()
    render(
      <KanbanView
        config={config}
        records={records}
        selectedIds={[records[0].id, records[3].id]}
        onSelectedIdsChange={onSelectedIdsChange}
      />,
    )
    // A checkbox per card, each named after that record's own title — no
    // stage vocabulary, no per-column selection store.
    const boxes = screen.getAllByRole('checkbox', { name: /^Select / })
    expect(boxes.length).toBe(records.length)
    // Toggling reports back into the ONE flat array the caller owns, spanning
    // cards that live in different lanes.
    fireEvent.click(screen.getByRole('checkbox', { name: `Select ${records[1].title}` }))
    expect(onSelectedIdsChange).toHaveBeenCalledWith([records[0].id, records[3].id, records[1].id])
  })

  it('renders no checkbox at all when the caller owns no selection set', () => {
    const { config, records } = incidentConfig()
    render(<KanbanView config={config} records={records} />)
    expect(screen.queryByRole('checkbox', { name: /^Select / })).toBeNull()
  })

  it('names the card options control after the record, on either config', () => {
    const { config, records } = incidentConfig()
    render(
      <KanbanView
        config={config}
        records={records}
        renderCardActions={(_id, label) => <button type="button">{`Options for ${label}`}</button>}
      />,
    )
    // The label handed to the factory is the record's own id/title — resolved
    // from `CardModel`, never a hardcoded column.
    expect(screen.getAllByRole('button', { name: /^Options for / }).length).toBe(records.length)
  })

  it('exports the second module’s OWN column headers', async () => {
    const { config, records } = incidentConfig()
    const { exportColumnsFor, toCsv } = await import('../actions/export-records')
    const header = toCsv(exportColumnsFor(config), records).split('\r\n')[0]
    // Headers come from `deriveColumns(config)`; nothing about the golden
    // blueprint's own vocabulary is assumed by the serializer.
    expect(header).toBe(toCsv(exportColumnsFor(dealsConfig), dealRecords).split('\r\n')[0])
    expect(header.length).toBeGreaterThan(0)
  })
})
