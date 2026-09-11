import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { ModuleView } from '../ModuleView'
import { ROW_ACTION_PERSISTENT, ROW_ACTION_REVEAL } from './row-affordance'

/**
 * Fixture: a module whose blueprint turns the SHARED chrome on. Nothing here is
 * pipeline-specific — the stage names, service types and the Group By option
 * set are DATA, which is the whole point (the same code path serves the shipped
 * Tickets list). Deliberately keeps the designer's own `Staus` typo as the
 * authored label to prove the label comes from config, not from the column.
 */
const statusList = [
  { key: 'new', label: 'Created New', color: '#2563eb' },
  { key: 'assigned', label: 'Assigned', color: '#16a34a' },
  { key: 'resolved', label: 'Resolved', color: '#7c3aed' },
]

function makeConfig(overrides: Partial<EntityConfig['uiConfig']> = {}): EntityConfig {
  return {
    code: 'work-orders',
    name: 'Tasks',
    systemcolumns: [
      { col: 'uniqueidentifier', name: 'ID', type: 'SmallText' },
      { col: 'title', name: 'Title', type: 'SmallText' },
      { col: 'status', name: 'Status', type: 'SingleSelect', listValues: ['new', 'assigned', 'resolved'] },
      { col: 'systemcol1', name: 'Service Type', type: 'SingleSelect', listValues: ['Cleaning', 'Repair'] },
    ],
    uiConfig: {
      statusList,
      listSelectable: true,
      rowActions: { delete: true, archive: true },
      filters: [{ col: 'systemcol1' }],
      groupByOptions: [{ col: 'status', label: 'Staus' }, { col: 'systemcol1' }],
      ...overrides,
    },
    listcolumns: [{ col: 'uniqueidentifier' }, { col: 'title' }, { col: 'status' }, { col: 'systemcol1' }],
  }
}

const records: EntityRecord[] = [
  { id: 'r1', uniqueidentifier: 'IMS-1', title: 'Alpha', status: 'new', systemcol1: 'Cleaning' },
  { id: 'r2', uniqueidentifier: 'IMS-2', title: 'Beta', status: 'new', systemcol1: 'Repair' },
  { id: 'r3', uniqueidentifier: 'IMS-3', title: 'Gamma', status: 'assigned', systemcol1: 'Cleaning' },
  { id: 'r4', uniqueidentifier: 'IMS-4', title: 'Delta', status: 'resolved', systemcol1: 'Repair' },
]

const ctx = { userId: 'u1', moduleId: 'work-orders' }

function renderList(props: Partial<React.ComponentProps<typeof ModuleView>> = {}) {
  return render(
    <ModuleView config={makeConfig()} records={records} views={['list', 'kanban']} context={ctx} {...props} />,
  )
}

/**
 * Radix `DropdownMenuTrigger` opens on pointerdown, not on the synthetic click
 * alone — the same `keyDown Enter` workaround every other DropdownMenu-driven
 * test in this package uses (see `ModuleViewFilters.test.tsx`).
 */
function openMenuOf(trigger: HTMLElement) {
  fireEvent.keyDown(trigger, { key: 'Enter' })
  return screen.getByRole('menu')
}

function clickTab(el: HTMLElement) {
  fireEvent.mouseDown(el, { button: 0 })
  fireEvent.click(el)
}

/* ───────────────────────── A5.1 — hover/focus reveal ───────────────────────── */

describe('A5.1 — the hover-revealed row/card options button', () => {
  it('is present in the DOM and the tab order at rest, revealed by hover AND focus-visible', () => {
    renderList({ onDeleteRecords: () => {} })
    const button = screen.getByRole('button', { name: 'More actions for IMS-1' })
    // Never `display:none`/unmounted — H.49's "in the DOM and in the tab order
    // at all times". A disabled or hidden button would fail both of these.
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
    // Resting look is the frame's: transparent, not clickable.
    expect(button.className).toContain('opacity-0')
    // …revealed by hover on the row, by focus INSIDE the row, and by the
    // button's own focus-visible — the three paths H.49 requires.
    expect(button.className).toContain('group-hover/row-affordance:opacity-100')
    expect(button.className).toContain('group-focus-within/row-affordance:opacity-100')
    expect(button.className).toContain('focus-visible:opacity-100')
  })

  it('stays visible while its own menu is open, and on coarse pointers', () => {
    renderList({ onDeleteRecords: () => {} })
    const button = screen.getByRole('button', { name: 'More actions for IMS-1' })
    // The clause the mined `shift-planner` recipe has and our older reveals
    // lack: the control must not vanish out from under its open menu.
    expect(button.className).toContain('data-[state=open]:opacity-100')
    // H.50 — there is no hover on touch, so the control is permanently shown.
    expect(button.className).toContain('[@media(pointer:coarse)]:opacity-100')
  })

  it('really does open its menu on click (the reveal is not decorative)', () => {
    renderList({ onDeleteRecords: () => {} })
    expect(openMenuOf(screen.getByRole('button', { name: 'More actions for IMS-1' }))).toBeInTheDocument()
  })

  it('restyles the row background AND border on hover/focus, without any layout change', () => {
    renderList({ onDeleteRecords: () => {} })
    const row = screen.getByText('Alpha').closest('tr')!
    // Dev Notes 32266/32263: "Card Background & Border color changed".
    expect(row.className).toContain('hover:bg-muted/40')
    expect(row.className).toContain('hover:border-primary/30')
    // H.52 — colour only. No border-WIDTH and no padding class in the hover
    // state, so the row's rect cannot move.
    expect(row.className).not.toMatch(/hover:(border-\d|p-|px-|py-)/)
    // H.49 keyboard parity + the menu-open hold.
    expect(row.className).toContain('focus-within:bg-muted/40')
    expect(row.className).toContain('has-[[data-state=open]]:bg-muted/40')
  })

  it('uses ONE shared reveal recipe for every lens, not three copies', () => {
    // H.53 / the designer's single rule: the list row's button and the kanban
    // card's button carry the same class string, from `row-affordance.ts`.
    const { unmount } = renderList({ onDeleteRecords: () => {} })
    const listButton = screen.getByRole('button', { name: 'More actions for IMS-1' })
    for (const cls of ROW_ACTION_REVEAL.split(' ')) expect(listButton.className).toContain(cls)
    unmount()

    renderList({ onDeleteRecords: () => {} })
    clickTab(screen.getByRole('tab', { name: 'Kanban View' }))
    const cardButton = screen.getAllByRole('button', { name: /More actions for/ })[0]
    for (const cls of ROW_ACTION_REVEAL.split(' ')) expect(cardButton.className).toContain(cls)
  })

  /*
   * BLIND SPOT CLOSED (fix wave 1). Everything above asserts the class STRING
   * is present. That is exactly what let H.49 ship broken: the recipe carried
   * `data-[state=open]:opacity-100`, the assertion passed, and the control was
   * still `opacity: 0` under its own open menu — because `RecordActionsMenu`
   * nested `Tooltip > DropdownMenuTrigger > Button` with `asChild` on both, so
   * the button's `data-state` reported the TOOLTIP's state and read `closed`
   * while the menu was open. A class-presence assertion can never see that.
   * These assert the STATE the recipe keys off instead.
   */
  it('keys the menu-open reveal off aria-expanded as well as data-state', () => {
    // `aria-expanded` is set by the menu trigger alone, so it survives any
    // trigger composition a consumer chooses.
    expect(ROW_ACTION_REVEAL).toContain('aria-expanded:opacity-100')
    expect(ROW_ACTION_REVEAL).toContain('data-[state=open]:opacity-100')
    // And a plain `:focus` path, because `:focus-visible` does not match a
    // programmatic `.focus()` — which is how focus-restore-after-close moves it.
    expect(ROW_ACTION_REVEAL).toContain('focus:opacity-100')
  })

  it('reports the MENU state on the trigger, not the tooltip state', () => {
    renderList({ onDeleteRecords: () => {} })
    const trigger = screen.getByRole('button', { name: 'More actions for IMS-1' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    openMenuOf(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    // The clause the reveal recipe reads. Before the nesting fix this was
    // `closed` (the tooltip's) while the menu was open.
    expect(trigger).toHaveAttribute('data-state', 'open')
  })

  it('returns focus to the trigger when its menu is dismissed with Escape', async () => {
    // H.51. Round 1 measured focus landing on `body`, because the tooltip's
    // dismissable layer — the OUTER trigger — handled the Escape. Radix restores
    // focus asynchronously, so this waits rather than asserting synchronously.
    renderList({ onDeleteRecords: () => {} })
    const trigger = screen.getByRole('button', { name: 'More actions for IMS-1' })
    openMenuOf(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})

/* ─────────────────────────── A5.2 — the row menu ─────────────────────────── */

describe('A5.2 — the row overflow menu is exactly Delete + Archive', () => {
  const openMenu = () => openMenuOf(screen.getByRole('button', { name: 'More actions for IMS-1' }))

  it('offers exactly two items — no invented open/edit (SPEC row 21 is corrected)', () => {
    renderList({ onDeleteRecords: () => {} })
    const items = within(openMenu()).getAllByRole('menuitem')
    expect(items.map((i) => i.textContent)).toEqual(['Delete', 'Archive'])
  })

  it('renders Delete in the destructive/error tone', () => {
    renderList({ onDeleteRecords: () => {} })
    expect(within(openMenu()).getByRole('menuitem', { name: 'Delete' }).className).toContain('text-destructive')
  })

  it('renders Archive DISABLED with a tooltip explaining why, and it never acts', () => {
    renderList({ onDeleteRecords: () => {} })
    const archive = within(openMenu()).getByRole('menuitem', { name: 'Archive' })
    // `aria-disabled`, not `disabled`: the item must stay focusable so its
    // explanation is reachable (Dev Note 32265 — "just placeholder").
    expect(archive).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(archive)
    // Still open, nothing happened — no fake action was wired.
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('Delete always confirms first, and only then reports the record id', () => {
    const onDeleteRecords = vi.fn()
    renderList({ onDeleteRecords })
    fireEvent.click(within(openMenu()).getByRole('menuitem', { name: 'Delete' }))
    expect(onDeleteRecords).not.toHaveBeenCalled()
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('Delete IMS-1?')
    expect(dialog).toHaveTextContent(/can’t be undone/)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(onDeleteRecords).toHaveBeenCalledWith(['r1'])
  })

  it('cancelling the confirmation deletes nothing', () => {
    const onDeleteRecords = vi.fn()
    renderList({ onDeleteRecords })
    fireEvent.click(within(openMenu()).getByRole('menuitem', { name: 'Delete' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))
    expect(onDeleteRecords).not.toHaveBeenCalled()
  })

  it('renders no Delete item at all when the app wired no delete seam', () => {
    renderList()
    const menu = openMenuOf(screen.getByRole('button', { name: 'More actions for IMS-1' }))
    expect(within(menu).queryByRole('menuitem', { name: 'Delete' })).toBeNull()
  })

  it('renders no menu at all when the blueprint declares no rowActions block', () => {
    render(
      <ModuleView
        config={makeConfig({ rowActions: undefined })}
        records={records}
        views={['list']}
        context={ctx}
        onDeleteRecords={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: /More actions for/ })).toBeNull()
  })

  it('is gated by the privilege the blueprint names', () => {
    const config = makeConfig({ rowActions: { delete: true, archive: true, requiredPrivilege: 'work-orders.delete' } })
    const { unmount } = render(
      <ModuleView config={config} records={records} views={['list']} context={ctx} onDeleteRecords={() => {}} />,
    )
    expect(screen.queryByRole('button', { name: /More actions for/ })).toBeNull()
    unmount()
    render(
      <ModuleView
        config={config}
        records={records}
        views={['list']}
        context={ctx}
        userContext={{ id: 'u1', roles: [], privileges: ['work-orders.delete'] }}
        onDeleteRecords={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'More actions for IMS-1' })).toBeInTheDocument()
  })
})

/* ──────────────────── A5.3 — selection + the bulk bar ──────────────────── */

describe('A5.3 — row multi-select and the bulk action bar', () => {
  const bar = () => screen.queryByTestId?.('x') ?? document.querySelector('[data-slot="bulk-action-bar"]')

  it('shows no bar (and reserves no space) until something is selected', () => {
    renderList()
    expect(bar()).toBeNull()
  })

  it('appears on the first selection and reads the count from a polite live region', () => {
    renderList()
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Select row' })[0])
    const region = screen.getByRole('status')
    expect(region).toHaveTextContent('1 selected')
    expect(region).toHaveAttribute('aria-live', 'polite')
  })

  it('is sticky at the TOP of the lens body — not fixed, not bottom-docked', () => {
    // G.41's placement, asserted structurally: jsdom computes no layout, so
    // the gate is the position contract plus the DOM position (first child of
    // the lens-body wrapper, i.e. above the table, inside the scroller).
    renderList()
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Select row' })[0])
    const el = bar()!
    expect(el.className).toContain('sticky')
    expect(el.className).toContain('top-0')
    expect(el.className).not.toContain('fixed')
    expect(el.className).not.toMatch(/\bbottom-/)
    const body = el.closest('[data-slot="module-view-body"]')!
    expect(body.firstElementChild).toBe(el)
    // …and the table really is after it in the same body.
    expect(el.compareDocumentPosition(screen.getByRole('table')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('select-all means the FILTERED set, and the bar says so', () => {
    // G.44's gate: narrow to a subset, select all, assert the count is the
    // filtered count and the wording states the scope.
    renderList()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'Alpha' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows' }))
    expect(screen.getByRole('status')).toHaveTextContent('1 selected (all matching filters)')
  })

  it('offers an explicit "Select all N matching" step rather than implying reach', () => {
    renderList()
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Select row' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Select all 4 matching' }))
    expect(screen.getByRole('status')).toHaveTextContent('4 selected')
  })

  it('clears the selection when a FILTER changes', () => {
    // G.45/G.47 — a hidden selected record is how users delete things they
    // cannot see. Driven through the real toolbar facet, not a prop.
    renderList()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows' }))
    expect(screen.getByRole('status')).toHaveTextContent('4 selected')
    openMenuOf(screen.getByRole('button', { name: 'Filter' }))
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Cleaning' }))
    expect(document.querySelector('[data-slot="bulk-action-bar"]')).toBeNull()
  })

  /*
   * BLIND SPOT CLOSED (fix wave 1). The suite above drove the Filter facet
   * only, so it could not have caught a regression in the OTHER things that
   * narrow the visible set — and the round-1 gate reported G.47 failing after
   * "a sort/filter change". These three pin down every narrowing input, and the
   * fourth pins down the deliberate NON-clear, so the ruling cannot be quietly
   * inverted in either direction.
   */
  it('clears the selection when the SEARCH changes', () => {
    renderList()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows' }))
    expect(screen.getByRole('status')).toHaveTextContent('4 selected')
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'IMS-1' } })
    expect(document.querySelector('[data-slot="bulk-action-bar"]')).toBeNull()
  })

  it('clears the selection on a LENS switch', () => {
    renderList()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows' }))
    clickTab(screen.getByRole('tab', { name: 'Kanban View' }))
    expect(document.querySelector('[data-slot="bulk-action-bar"]')).toBeNull()
  })

  it('KEEPS the selection across a re-SORT — sorting hides nothing', () => {
    // Deliberate, and the inverse of the rule above: `selectionResetKey`
    // excludes sort because a re-order changes what the user is looking at in
    // no way that could make a selected record invisible. Asserted so the
    // "clear on everything" over-correction is caught too.
    renderList()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows' }))
    // The Sort control is a Popover (its rows carry a nested direction arrow),
    // so it opens on click and its rows are `option`s, not `menuitem`s.
    fireEvent.click(screen.getByRole('button', { name: /^Sort(, 1 applied)?$/ }))
    const sortRows = screen.getAllByRole('option')
    fireEvent.click(sortRows[sortRows.length - 1])
    expect(screen.getByRole('status')).toHaveTextContent('4 selected')
  })

  it('clears on the bar’s own ✕ Clear selection', () => {
    renderList()
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Select row' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect(bar()).toBeNull()
  })

  it('carries only Delete and Export — Archive is never promoted into the bar', () => {
    renderList({ onDeleteRecords: () => {} })
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Select row' })[0])
    const el = bar()!
    expect(within(el as HTMLElement).getByRole('button', { name: /Delete/ })).toBeInTheDocument()
    expect(within(el as HTMLElement).getByRole('button', { name: /Export/ })).toBeInTheDocument()
    expect(within(el as HTMLElement).queryByRole('button', { name: /Archive/ })).toBeNull()
  })

  it('bulk Delete confirms with the count and the irreversibility, then clears', () => {
    const onDeleteRecords = vi.fn()
    renderList({ onDeleteRecords })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows' }))
    fireEvent.click(within(bar() as HTMLElement).getByRole('button', { name: /Delete/ }))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('Delete 4 tasks?')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(onDeleteRecords).toHaveBeenCalledWith(['r1', 'r2', 'r3', 'r4'])
    expect(document.querySelector('[data-slot="bulk-action-bar"]')).toBeNull()
  })

  it('is one FLAT selection set across kanban columns', () => {
    // G.45's gate: two cards in one lane and one in another read as "3
    // selected" from a single set.
    renderList()
    clickTab(screen.getByRole('tab', { name: 'Kanban View' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Alpha' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Beta' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Delta' }))
    expect(screen.getByRole('status')).toHaveTextContent('3 selected')
  })

  it('keeps the selection when switching lenses within the same view', () => {
    // The set is owned by the shared composition, so the count is the same
    // number on every lens rather than a per-lens store.
    renderList()
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Select row' })[0])
    expect(screen.getByRole('status')).toHaveTextContent('1 selected')
  })

  it('renders no bar when the blueprint asks for a selection column but no actions', () => {
    render(
      <ModuleView
        config={makeConfig({ bulkActions: {} })}
        records={records}
        views={['list']}
        context={ctx}
      />,
    )
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Select row' })[0])
    expect(document.querySelector('[data-slot="bulk-action-bar"]')).toBeNull()
  })

  it('renders no selection chrome at all when the blueprint sets no selection column', () => {
    render(
      <ModuleView
        config={makeConfig({ listSelectable: false })}
        records={records}
        views={['list']}
        context={ctx}
      />,
    )
    expect(screen.queryByRole('checkbox', { name: 'Select all rows' })).toBeNull()
  })
})

/* ─────────────────── A5.4 — Export menu + Group By config ─────────────────── */

describe('A5.4 — Export is a menu, and both options produce a file', () => {
  const created: string[] = []
  let clicks = 0

  beforeEach(() => {
    created.length = 0
    clicks = 0
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => {
        created.push('blob:x')
        return 'blob:x'
      }),
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      clicks += 1
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('opens a two-option menu rather than downloading immediately', () => {
    renderList()
    const items = within(openMenuOf(screen.getByRole('button', { name: 'Export' }))).getAllByRole('menuitem')
    expect(items.map((i) => i.textContent)).toEqual(['Export CSV', 'Export Excel'])
    expect(clicks).toBe(0)
  })

  it('produces a file for BOTH options — a silent no-op would be a P0', () => {
    renderList()
    for (const label of ['Export CSV', 'Export Excel']) {
      fireEvent.click(within(openMenuOf(screen.getByRole('button', { name: 'Export' }))).getByRole('menuitem', { name: label }))
    }
    expect(clicks).toBe(2)
    expect(created).toHaveLength(2)
  })

  it('exports the FILTERED set, not every record', () => {
    const onExportSpy = vi.fn()
    // Read the produced content through the serializer seam rather than the
    // Blob: `ExportMenu`'s own `onExport` is the app override, so the toolbar
    // path is asserted by row count in the unit test; here the gate is that
    // the toolbar's records shrink with the filter.
    renderList()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'Alpha' } })
    expect(screen.getAllByRole('row')).toHaveLength(2) // header + 1
    fireEvent.click(within(openMenuOf(screen.getByRole('button', { name: 'Export' }))).getByRole('menuitem', { name: 'Export CSV' }))
    expect(clicks).toBe(1)
    expect(onExportSpy).not.toHaveBeenCalled()
  })

  it('carries an accessible name and a tooltip on the icon-only trigger', () => {
    renderList()
    const trigger = screen.getByRole('button', { name: 'Export' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
  })
})

describe('A5.4 — Group By is CONFIG on the existing chain, not a new control', () => {
  // 2026-08-31 pipeline-actions spec: the Group By popup is a radio POPOVER
  // (click-to-open, single-select radios, live-applied), not a DropdownMenu.
  const openGroupBy = (trigger: HTMLElement) => {
    fireEvent.click(trigger)
    return screen.getByRole('radiogroup', { name: 'Group by' })
  }

  it('offers the blueprint’s curated option set plus None', () => {
    renderList()
    const items = within(openGroupBy(screen.getByRole('button', { name: 'Group by' }))).getAllByRole('radio')
    // `Staus` is the designer's own typo, authored in config — proof the label
    // comes from the blueprint and not from the column name.
    expect(items.map((i) => i.getAttribute('aria-label'))).toEqual(['None', 'Staus', 'Service Type'])
  })

  it('groups by the chosen column and clears grouping on None', () => {
    renderList()
    const trigger = screen.getByRole('button', { name: 'Group by' })
    // LIVE-APPLY: the popover stays open across selections, so one open
    // serves both the group and the ungroup step.
    const popup = openGroupBy(trigger)
    fireEvent.click(within(popup).getByRole('radio', { name: 'Staus' }))
    // Icon-only trigger (2026-08-31 toolbar-unification pass) — the button
    // itself never swaps to a labelled form; the authored label ("Staus")
    // still shows as the active option's chosen state in the open popup.
    expect(screen.getByRole('button', { name: 'Group by' })).toBeInTheDocument()
    expect(screen.getByText('Created New')).toBeInTheDocument()
    fireEvent.click(within(popup).getByRole('radio', { name: 'None' }))
    expect(screen.getByRole('button', { name: 'Group by' })).toBeInTheDocument()
  })

  it('falls back to every groupable column when the blueprint curates none', () => {
    render(
      <ModuleView
        config={makeConfig({ groupByOptions: undefined })}
        records={records}
        views={['list']}
        context={ctx}
      />,
    )
    expect(
      within(openGroupBy(screen.getByRole('button', { name: 'Group by' })))
        .getAllByRole('radio')
        .map((i) => i.getAttribute('aria-label')),
    ).toEqual([
      'None',
      'Status',
      'Service Type',
    ])
  })

  it('drops an authored option whose column is not groupable, rather than offering a dead row', () => {
    render(
      <ModuleView
        config={makeConfig({ groupByOptions: [{ col: 'status' }, { col: 'nope' }] })}
        records={records}
        views={['list']}
        context={ctx}
      />,
    )
    expect(within(openGroupBy(screen.getByRole('button', { name: 'Group by' }))).getAllByRole('radio')).toHaveLength(2)
  })
})

/* ──────────────── I.54 — the deferred toolbar collapse items ──────────────── */

describe('I.54 — deferred collapse-order items 1 and 3', () => {
  it('item 1: the search field yields width down to a 200px floor and no further', () => {
    renderList()
    const field = screen.getByRole('textbox', { name: 'Search' }).parentElement!
    expect(field.className).toContain('flex-1') // it is the yielding control
    expect(field.className).toContain('min-w-[12.5rem]') // 200px floor
    expect(field.className).toContain('max-w-[25rem]') // the spec's 400px ceiling
  })

  it('item 3: Create New keeps its label at 1280px and above — UX ruling A3 (run 2026-09-05, W9/P0-2) supersedes this item\'s original 1300px collapse threshold', () => {
    renderList({ onCreateRecord: () => {} })
    const cta = screen.getByRole('button', { name: 'Create New' })
    // The label survives at 1280px and above (measured baseline: it used to
    // collapse to a bare `+` at exactly 1280 — C2, P0). The collapse
    // mechanism itself stays in place, retuned to 79.9375rem (1279px, the
    // largest width still BELOW 1280) for any narrower width this platform
    // does not yet support/test; the button, its accessible name and its
    // tooltip are unaffected either way.
    expect(cta.querySelector('.max-\\[81\\.25rem\\]\\:sr-only')).toBeNull()
    expect(cta.querySelector('.max-\\[79\\.9375rem\\]\\:sr-only')).not.toBeNull()
    expect(cta).toHaveAttribute('aria-label', 'Create New')
  })
})

/* ─────────────────────── K.67 — icon-only tooltips ─────────────────────── */

describe('K.67 — every icon-only toolbar control has a name and a tooltip', () => {
  it('names Filter, Sort, Group by and Export, each with a tooltip trigger', () => {
    renderList()
    for (const name of ['Filter', 'Sort', 'Group by', 'Export']) {
      const button = screen.getByRole('button', { name })
      expect(button).toBeInTheDocument()
      // Radix marks a tooltip trigger describable — and opens it on FOCUS as
      // well as hover, which is the half a `title` attribute cannot do.
      expect(button).toHaveAttribute('data-state')
    }
  })
})

/**
 * `uiConfig.rowActions.alwaysVisible` (fix D-4/F3) — the opt-IN resting-visible
 * `…`, for a module whose own reference frame draws the control persistently.
 * The hover default is authored (Dev Notes `33534:32266`/`33534:32263`) and
 * shared by List/Hybrid/Kanban, so the flag is opt-in and every module that
 * does not set it is asserted unchanged below.
 */
describe('rowActions.alwaysVisible — opt-in persistent row overflow', () => {
  function renderWith(rowActions: Record<string, unknown>) {
    return render(
      <ModuleView
        config={makeConfig({ rowActions })}
        records={records}
        views={['list', 'kanban']}
        context={ctx}
        onDeleteRecords={() => {}}
      />,
    )
  }

  it('paints the control at rest, on rows AND cards, when the flag is set', () => {
    const { unmount } = renderWith({ delete: true, archive: true, alwaysVisible: true })
    const listButton = screen.getByRole('button', { name: 'More actions for IMS-1' })
    for (const cls of ROW_ACTION_PERSISTENT.split(' ')) expect(listButton.className).toContain(cls)
    expect(listButton.className).not.toContain('opacity-0')
    unmount()

    renderWith({ delete: true, archive: true, alwaysVisible: true })
    clickTab(screen.getByRole('tab', { name: 'Kanban View' }))
    const cardButton = screen.getAllByRole('button', { name: /More actions for/ })[0]
    for (const cls of ROW_ACTION_PERSISTENT.split(' ')) expect(cardButton.className).toContain(cls)
  })

  /* REGRESSION PIN — the shared seam. Every module that does NOT set the flag
     must keep the byte-identical hover recipe it had before this key existed. */
  it('a module WITHOUT the flag keeps the hover reveal, unchanged', () => {
    for (const rowActions of [
      { delete: true, archive: true },
      { delete: true, archive: true, alwaysVisible: false },
    ]) {
      const { unmount } = renderWith(rowActions)
      const button = screen.getByRole('button', { name: 'More actions for IMS-1' })
      for (const cls of ROW_ACTION_REVEAL.split(' ')) expect(button.className).toContain(cls)
      expect(button.className).toContain('opacity-0')
      unmount()
    }
  })

  it('the flag changes the RESTING LOOK only — the control is in the DOM, named and focusable either way', () => {
    for (const alwaysVisible of [true, false]) {
      const { unmount } = renderWith({ delete: true, archive: true, alwaysVisible })
      const button = screen.getByRole('button', { name: 'More actions for IMS-1' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(openMenuOf(button)).toBeInTheDocument()
      unmount()
    }
  })
})

/**
 * fix7 (run-2026-09-05, job-orders UX P0-1) — a kanban card whose caller
 * supplies its own `actions` overflow (this `RecordActionsMenu`, wired through
 * `useModuleViewActions`) must still expose a keyboard "Move to…" path: the
 * card renders exactly ONE overflow trigger (this one, since `actions` is
 * supplied — see `KanbanCard`'s docblock on the double-overflow-menu bug that
 * guard exists for), so this menu is the only place left that can offer a
 * move. It gets there via the exported `useKanbanCardMoveTargets` hook —
 * `RecordActionsMenu` is the shipped consumer named in that hook's docblock.
 */
describe('fix7 — RecordActionsMenu exposes a keyboard move path on kanban cards', () => {
  it('prepends a "Move to" group naming the OTHER reachable stages, above Delete/Archive', () => {
    renderList({ onDeleteRecords: () => {} })
    clickTab(screen.getByRole('tab', { name: 'Kanban View' }))
    const trigger = screen.getAllByRole('button', { name: /More actions for/ })[0]
    const menu = openMenuOf(trigger)
    const items = within(menu).getAllByRole('menuitem').map((item) => item.textContent)
    // Alpha (IMS-1) sits in "new" — the other two stages are reachable.
    expect(items).toEqual(['Assigned', 'Resolved', 'Delete', 'Archive'])
  })

  it('committing a "Move to" item calls the SAME onMove path a drag or the built-in trigger would', () => {
    const onMove = vi.fn()
    render(
      <ModuleView
        config={makeConfig()}
        records={records}
        views={['list', 'kanban']}
        context={ctx}
        onDeleteRecords={() => {}}
        onMove={onMove}
      />,
    )
    clickTab(screen.getByRole('tab', { name: 'Kanban View' }))
    const trigger = screen.getAllByRole('button', { name: /More actions for/ })[0]
    fireEvent.click(within(openMenuOf(trigger)).getByRole('menuitem', { name: 'Assigned' }))
    expect(onMove).toHaveBeenCalledWith('r1', 'new', 'assigned')
  })

  it('offers no "Move to" group at all for a card with no other reachable stage', () => {
    // A single-status board: every card's own stage is its only stage.
    renderList({
      onDeleteRecords: () => {},
      config: makeConfig({ statusList: [statusList[0]] }),
      records: [records[0]],
    })
    clickTab(screen.getByRole('tab', { name: 'Kanban View' }))
    const trigger = screen.getByRole('button', { name: /More actions for/ })
    const items = within(openMenuOf(trigger)).getAllByRole('menuitem').map((item) => item.textContent)
    expect(items).toEqual(['Delete', 'Archive'])
  })

  it('leaves the List/Hybrid row menu unaffected — no kanban board, no move group', () => {
    renderList({ onDeleteRecords: () => {} })
    const items = within(openMenuOf(screen.getByRole('button', { name: 'More actions for IMS-1' })))
      .getAllByRole('menuitem')
      .map((item) => item.textContent)
    expect(items).toEqual(['Delete', 'Archive'])
  })
})
