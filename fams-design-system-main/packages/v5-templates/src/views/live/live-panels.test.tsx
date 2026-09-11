import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { liveMonitoringConfig, liveVehicleRecords } from '../live-fixtures'
import { deriveLivePois, deriveLiveZones } from '../live-data'
import { LiveListPanel } from './LiveListPanel'
import { LivePanelDivider, LivePanelReopenButton } from './LivePanelDivider'
import { PoiDrawer, ZonesDrawer } from './ZonesDrawer'
import { CustomizeViewDrawer, defaultCustomizeViewState, type CustomizeViewState } from './CustomizeViewDrawer'
import { UnsavedChangesToast } from './UnsavedChangesToast'
import { defaultLiveListColumns, liveListColumnCatalog } from './live-list-model'

const catalog = liveListColumnCatalog(liveMonitoringConfig)
const columns = defaultLiveListColumns(liveMonitoringConfig, 'collapsed')

describe('LiveListPanel', () => {
  function Panel({ search = '', records = liveVehicleRecords, loading = false }) {
    const [q, setQ] = useState(search)
    const [cols, setCols] = useState(columns)
    const needle = q.toLowerCase()
    return (
      <LiveListPanel
        config={liveMonitoringConfig}
        records={records.filter((r) =>
          // A22: search also matches the bound plate column (`systemcol1`) —
          // the identity the VEHICLE cell actually renders — not just title/
          // uniqueidentifier.
          [r.title, r.uniqueidentifier, r.systemcol1].some((v) =>
            String(v ?? '').toLowerCase().includes(needle),
          ),
        )}
        totalCount={records.length}
        search={q}
        onSearchChange={setQ}
        columns={cols}
        onColumnsChange={setCols}
        catalog={catalog}
        widthState="collapsed"
        loading={loading}
      />
    )
  }

  const countLine = () => document.querySelector('[data-slot="live-list-count"]')

  /**
   * Round-5 UX gate N3 (carried from round-4 N6): with no ✕ in the search field
   * and no recovery action on the empty state, the only way back from a
   * no-results search was to select the text and delete it.
   */
  describe('search recovery', () => {
    it('offers an in-field clear once the search has content, and none while it is empty', () => {
      const { unmount } = render(<Panel />)
      expect(document.querySelector('[data-slot="live-search-clear"]')).toBeNull()
      unmount()

      render(<Panel search="zzzqqq" />)
      const clear = document.querySelector<HTMLElement>('[data-slot="live-search-clear"]')!
      expect(clear).toBeInTheDocument()
      expect(clear).toHaveAttribute('aria-label', 'Clear search')
      // UX-NOTES C18's floor is on the BUTTON here — there is no enclosing row.
      expect(clear).toHaveClass('size-6')
      fireEvent.click(clear)
      expect(screen.getByRole('textbox', { name: 'Search vehicles' })).toHaveValue('')
    })

    it('puts a recovery action on the no-results state and clears the search with it', () => {
      render(<Panel search="zzzqqq" />)
      expect(screen.getByText('No results found!')).toBeInTheDocument()
      const recover = document.querySelector<HTMLElement>('[data-slot="live-list-empty-clear"]')!
      expect(recover).toHaveTextContent('Clear search')
      fireEvent.click(recover)
      expect(screen.getByRole('textbox', { name: 'Search vehicles' })).toHaveValue('')
      expect(screen.queryByText('No results found!')).toBeNull()
    })
  })


  it('shows the plain count line, then the filtered "out of" line (primary numbers) in polite live region', () => {
    render(<Panel />)
    // Unfiltered, the count itself is brand-coloured (Figma 11:10008
    // "Showing **1000 items**"), so the line is split across two nodes.
    expect(countLine()).toHaveTextContent('Showing 4 items')
    fireEvent.change(screen.getByLabelText('Search vehicles'), { target: { value: 'toyota' } })
    const count = countLine()
    expect(count).toHaveTextContent('Showing 1 items out of 4')
    expect(count).toHaveAttribute('aria-live', 'polite')
    // SPEC §2.2: the filtered numbers render primary.
    expect(count?.querySelector('.text-primary')).toHaveTextContent('1 items')
  })

  it('highlights the matched substring in vehicle plates — yellow wash behind unchanged text (UX A9)', () => {
    render(<Panel />)
    // A22: the VEHICLE cell now renders the plate ("Y 31022" for V-101), not
    // the internal uniqueidentifier — the highlight must land on the
    // substring that is actually on screen.
    fireEvent.change(screen.getByLabelText('Search vehicles'), { target: { value: '31022' } })
    const mark = screen.getAllByText('31022', { selector: 'mark' })[0]
    // Visual #38: the full warning-500 amber, not a 40% wash of it.
    expect(mark).toHaveClass('bg-warning')
    expect(mark).toHaveClass('text-foreground')
  })

  it('renders the no-results empty state with the search hint', () => {
    render(<Panel />)
    fireEvent.change(screen.getByLabelText('Search vehicles'), { target: { value: 'zzz-nope' } })
    expect(screen.getByText('No results found!')).toBeInTheDocument()
    expect(screen.getByText(/Try using search for vehicle id/)).toBeInTheDocument()
  })

  /* round-3 UX #3 — the block stranded ~200px above the centre of ~900px of
     white because `DataTable` renders it in a content-height `<td>`. */
  it('centres the empty state in the real body height by stretching the table while empty', () => {
    const { container } = render(<Panel />)
    fireEvent.change(screen.getByLabelText('Search vehicles'), { target: { value: 'zzz-nope' } })
    const empty = container.querySelector('[data-slot="live-list-empty"]') as HTMLElement
    // The block centres in whatever height it is GIVEN…
    expect(empty.className).toContain('h-full')
    expect(empty.className).toContain('justify-center')
    // …and the table is stretched to the scroll viewport so that height is
    // the real one.
    const stretched = () =>
      Array.from(container.querySelectorAll<HTMLElement>('*')).some((el) =>
        String(el.className).includes('[&_table]:h-full'),
      )
    expect(stretched()).toBe(true)
    // The illustration carries the status circles + scatter dots 551:22013
    // draws (round-3 visual #11), not a bare card stack.
    const art = container.querySelector('[data-slot="live-list-empty-art"]')!
    expect(art.querySelectorAll('circle').length).toBeGreaterThanOrEqual(7)
    // Scoped to the EMPTY body only — a populated table must not be stretched.
    fireEvent.change(screen.getByLabelText('Search vehicles'), { target: { value: '' } })
    expect(stretched()).toBe(false)
  })

  it('renders the 3D vehicle icon + the record plate in the VEHICLE cell (A22: plate, not the internal uniqueidentifier; P0-1.1 — no photos, no Make-Model title)', () => {
    render(<Panel />)
    // The plate ("Y 31022" for V-101), not the title, and never an <img> photo.
    expect(screen.getByText('Y 31022')).toBeInTheDocument()
    expect(screen.queryByText('Mitsubishi X6734')).not.toBeInTheDocument()
    expect(document.querySelector('table img')).not.toBeInTheDocument()
    // Status-dot tone follows the record's live status (V-101 = Moving).
    const cell = screen.getByText('Y 31022').closest('td')
    expect(cell?.querySelector('.bg-success-scale-500')).toBeInTheDocument()
  })

  it('renders the one-line dwell/speed summary in the SPEED cell (SPEC §2.2 patterns)', () => {
    render(<Panel />)
    // SPEC §2.2 / visual #14: the binding supplies BARE values and the cell
    // formats them — moving gets the unit, idling reads "for <dwell>",
    // stopped/non-reporting "since <dwell>", missing data "-".
    expect(screen.getByText('100 km/h')).toBeInTheDocument()
    expect(screen.getByText('for 12 mins')).toBeInTheDocument()
    expect(screen.getByText('since 37 mins')).toBeInTheDocument()
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })

  it('shows the skeleton rows (495:25945) while loading', () => {
    render(<Panel loading />)
    expect(document.querySelector('[data-slot="live-list-skeleton"]')).toBeInTheDocument()
  })

  it('shows the floating "Search" label while the search field is focused or filled (551:12319)', () => {
    render(<Panel />)
    expect(document.querySelector('[data-slot="live-search-float-label"]')).not.toBeInTheDocument()
    fireEvent.focus(screen.getByLabelText('Search vehicles'))
    expect(document.querySelector('[data-slot="live-search-float-label"]')).toHaveTextContent('Search')
  })

  it('pins the Columns pencil at the header row’s far end, OUTSIDE the scrolling column set (UX finding 1)', () => {
    render(<Panel />)
    const pencil = screen.getByRole('button', { name: 'Customize columns' })
    // Regression guard for round-1 finding #12: as a header CELL the pencil
    // was auto-grown past the card border by the SPEED column and clipped
    // away whenever rows rendered, leaving the popover with no trigger.
    expect(pencil.closest('thead')).toBeNull()
    expect(pencil.closest('[data-slot="live-list-panel"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="live-list-count"]')?.contains(pencil)).toBe(false)
  })

  it('opens the Columns popover and toggling a field updates the table live', () => {
    render(<Panel />)
    fireEvent.click(screen.getByRole('button', { name: 'Customize columns' }))
    expect(screen.getByRole('dialog', { name: 'Columns' })).toBeInTheDocument()
    expect(screen.getByText('Shown')).toBeInTheDocument()
    // Toggle Driver on.
    fireEvent.click(screen.getByRole('switch', { name: /Driver/ }))
    expect(screen.getByRole('columnheader', { name: 'Driver' })).toBeInTheDocument()
  })

  it('closes the Columns popover on Escape and on an outside pointer-down (§3.29)', () => {
    render(<Panel />)
    fireEvent.click(screen.getByRole('button', { name: 'Customize columns' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Columns' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Customize columns' }))
    expect(screen.getByRole('dialog', { name: 'Columns' })).toBeInTheDocument()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('dialog', { name: 'Columns' })).not.toBeInTheDocument()
  })

  it('tints the selected row with the Figma blue, not the table default wash (SPEC §2.2)', () => {
    render(
      <LiveListPanel
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        totalCount={liveVehicleRecords.length}
        search=""
        onSearchChange={() => {}}
        columns={columns}
        onColumnsChange={() => {}}
        catalog={catalog}
        widthState="collapsed"
        selectedId={liveVehicleRecords[0]!.id}
        onSelect={() => {}}
      />,
    )
    // The selected row is marked…
    expect(document.querySelector('tbody tr[data-selected]')).toBeInTheDocument()
    // …and the table carries the Figma blue-tint variant for it.
    const shell = document.querySelector('table')!.closest('[class*="bg-primary/10"]')
    expect(shell).not.toBeNull()
    expect(shell!.className).toContain('[&_tbody_tr[data-selected]]:bg-primary/10')
  })

  /**
   * "Sync With Map" (SPEC §3.22): while the toggle is on and the map has
   * reported a viewport, an empty result — with no active search — reads as
   * an empty MAP AREA, not an empty search. The COUNT line does not change
   * wording: the plain `Showing {M} items` until something narrows the list,
   * then `Showing {N} items out of {M}` — never the redundant
   * "out of" form at full count (designer, round 5)
   * (reference-video rule 2).
   */
  describe('viewportSynced (Sync list with Map)', () => {
    it('uses the narrowed "out of" form for a synced viewport, not a bespoke "in view" variant', () => {
      render(
        <LiveListPanel
          config={liveMonitoringConfig}
          records={liveVehicleRecords.slice(0, 1)}
          totalCount={liveVehicleRecords.length}
          viewportSynced
          search=""
          onSearchChange={() => {}}
          columns={columns}
          onColumnsChange={() => {}}
          catalog={catalog}
          widthState="collapsed"
        />,
      )
      expect(countLine()).toHaveTextContent(`Showing 1 items out of ${liveVehicleRecords.length}`)
      expect(countLine()?.textContent ?? '').not.toContain('in view')
    })

    it('shows the map-area empty state instead of the search empty state', () => {
      render(
        <LiveListPanel
          config={liveMonitoringConfig}
          records={[]}
          totalCount={liveVehicleRecords.length}
          viewportSynced
          search=""
          onSearchChange={() => {}}
          columns={columns}
          onColumnsChange={() => {}}
          catalog={catalog}
          widthState="collapsed"
        />,
      )
      expect(screen.getByText('No vehicles in the current map area')).toBeInTheDocument()
      expect(screen.queryByText('No results found!')).not.toBeInTheDocument()
    })

    it('still shows the search empty state while a search is active, even synced', () => {
      render(
        <LiveListPanel
          config={liveMonitoringConfig}
          records={[]}
          totalCount={liveVehicleRecords.length}
          viewportSynced
          search="zzzqqq"
          onSearchChange={() => {}}
          columns={columns}
          onColumnsChange={() => {}}
          catalog={catalog}
          widthState="collapsed"
        />,
      )
      expect(screen.getByText('No results found!')).toBeInTheDocument()
    })
  })
})

describe('LivePanelDivider', () => {
  it('is ONE 16x57 pill on the panel edge holding Figma\'s THREE targets (SPEC §2.2 look, QA A15)', () => {
    render(<LivePanelDivider state="collapsed" onStateChange={vi.fn()} onHide={vi.fn()} />)
    const pill = document.querySelector('[data-slot="live-panel-grabber"]')
    expect(pill).toBeInTheDocument()
    expect(pill?.className).toContain('h-[3.5625rem]')
    expect(pill?.className).toContain('w-4')
    expect(pill?.className).toContain('rounded-full')
    // Figma stacks three glyphs in the 57px pill and the design review asked
    // for all three (QA A15, superseding round-4 finding S2's two).
    //
    // Three targets in 57px is a ~19px pitch, under WCAG 2.5.8's 24px floor by
    // both the size test and the spacing exception. It rides the standard's
    // EQUIVALENT-CONTROL exception instead, which genuinely applies: Hidden,
    // Collapsed/Expanded and Fully Expanded are all reachable from Customize
    // View -> List View State, a full-size control set. That exception already
    // justified the ✕ before this change.
    expect(pill?.querySelectorAll('button')).toHaveLength(3)
    // ...and the three carry three DISTINCT accessible names, so nothing that
    // drives by name (voice control, a screen reader's element list) is left
    // choosing between duplicates.
    const names = [...pill!.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))
    expect(new Set(names).size).toBe(3)
    for (const button of pill!.querySelectorAll('button')) {
      // The hit extension is inline-only; a block extension would overlap the
      // neighbour and let the later sibling steal its target.
      expect(button.className).toContain('before:-inset-x-3')
      expect(button.className).not.toContain('before:-inset-y')
    }
  })

  it('✕ hides, the chevron STEPS, and the double-chevron JUMPS to full width and back (QA A15)', () => {
    const onStateChange = vi.fn()
    const onHide = vi.fn()
    const { rerender } = render(
      <LivePanelDivider state="collapsed" onStateChange={onStateChange} onHide={onHide} />,
    )
    // Figma's three glyphs, three DISTINCT accessible names: two buttons in
    // one 57px pill sharing a name is unresolvable for anyone driving by name.
    fireEvent.click(screen.getByRole('button', { name: 'Widen vehicle list' }))
    expect(onStateChange).toHaveBeenLastCalledWith('expanded')
    // The double-chevron goes STRAIGHT to the end of the range from anywhere.
    fireEvent.click(screen.getByRole('button', { name: 'Expand vehicle list to full width' }))
    expect(onStateChange).toHaveBeenLastCalledWith('fully-expanded')

    rerender(<LivePanelDivider state="expanded" onStateChange={onStateChange} onHide={onHide} />)
    fireEvent.click(screen.getByRole('button', { name: 'Widen vehicle list' }))
    expect(onStateChange).toHaveBeenLastCalledWith('fully-expanded')

    rerender(<LivePanelDivider state="fully-expanded" onStateChange={onStateChange} onHide={onHide} />)
    // At the end of the range both the step and the jump point BACK, and they
    // still say different things.
    fireEvent.click(screen.getByRole('button', { name: 'Narrow vehicle list' }))
    expect(onStateChange).toHaveBeenLastCalledWith('collapsed')
    fireEvent.click(screen.getByRole('button', { name: 'Collapse vehicle list' }))
    expect(onStateChange).toHaveBeenLastCalledWith('collapsed')

    fireEvent.click(screen.getByRole('button', { name: 'Hide vehicle list' }))
    expect(onHide).toHaveBeenCalled()
  })

  it('offers the way BACK instead of a no-op widen once the viewport clamp binds (N5)', () => {
    const onStateChange = vi.fn()
    render(
      <LivePanelDivider state="expanded" atMaxWidth onStateChange={onStateChange} onHide={vi.fn()} />,
    )
    // At 1280 Expanded and Fully Expanded render pixel-identically, so the
    // second widen click used to change state with zero visible feedback.
    expect(screen.queryByRole('button', { name: 'Expand vehicle list to full width' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Widen vehicle list' })).toBeNull()
    const back = screen.getByRole('button', { name: 'Narrow vehicle list' })
    expect(back).toHaveAttribute('title', 'Vehicle list is at its maximum width')
    fireEvent.click(back)
    expect(onStateChange).toHaveBeenLastCalledWith('collapsed')
  })

  it('the reopen affordance restores a hidden panel', () => {
    const onShow = vi.fn()
    render(<LivePanelReopenButton onShow={onShow} onShowFullyExpanded={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show vehicle list' }))
    expect(onShow).toHaveBeenCalled()
  })

  /**
   * Figma `live-monitoring-4-19-27942` §1.3 + UX-NOTES AC-2.3: the hidden
   * state must show the SAME 16x57 pill (x / chevron / double-chevron), not
   * a different single-glyph reopen button, so the collapse control stays
   * recognisable at every collapse level.
   */
  describe('LivePanelReopenButton (collapsed rail, Figma 19:28215/19:30264)', () => {
    it('renders a persistent 13px rail holding the SAME pill shell as the visible divider', () => {
      render(<LivePanelReopenButton onShow={vi.fn()} onShowFullyExpanded={vi.fn()} />)
      const rail = document.querySelector('[data-slot="live-panel-reopen"]')!
      expect(rail).toBeInTheDocument()
      expect(rail.className).toContain('w-[0.8125rem]')
      expect(rail.className).toContain('border-e')
      expect(rail.className).toContain('bg-card')
      const pill = rail.querySelector('[data-slot="live-panel-grabber"]')!
      expect(pill).toBeInTheDocument()
      expect(pill.className).toContain('h-[3.5625rem]')
      expect(pill.className).toContain('w-4')
      expect(pill.className).toContain('rounded-full')
      // Three targets, same as the visible pill.
      expect(pill.querySelectorAll('button')).toHaveLength(3)
    })

    it('✕ is present but disabled (nothing further to hide) while › and » both expand', () => {
      const onShow = vi.fn()
      const onShowFullyExpanded = vi.fn()
      render(<LivePanelReopenButton onShow={onShow} onShowFullyExpanded={onShowFullyExpanded} />)
      const hide = screen.getByRole('button', { name: 'Hide vehicle list' })
      expect(hide).toBeDisabled()
      fireEvent.click(screen.getByRole('button', { name: 'Show vehicle list' }))
      expect(onShow).toHaveBeenCalledTimes(1)
      fireEvent.click(screen.getByRole('button', { name: 'Expand vehicle list to full width' }))
      expect(onShowFullyExpanded).toHaveBeenCalledTimes(1)
    })
  })
})

describe('Zones / POI drawers', () => {
  const zones = deriveLiveZones(liveMonitoringConfig)
  const pois = deriveLivePois(liveMonitoringConfig)

  it('zones drawer: COLOR/NAME/PARENT table, search filter, check → ids out, Escape closes', () => {
    const onClose = vi.fn()
    const onChange = vi.fn()
    render(<ZonesDrawer open zones={zones} checkedIds={[]} onCheckedIdsChange={onChange} onClose={onClose} />)
    expect(screen.getByRole('columnheader', { name: 'Parent' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show Z-1234 on map' }))
    expect(onChange).toHaveBeenCalledWith(['Z-1234'])
    fireEvent.change(screen.getByLabelText('Search Zones'), { target: { value: 'Lot B' } })
    expect(screen.queryByText('Z-1234')).not.toBeInTheDocument()
    expect(screen.getByText('Z-2200')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('poi drawer: NAME/COORDINATES rows and uncheck removes the id', () => {
    const onChange = vi.fn()
    render(
      <PoiDrawer open pois={pois} checkedIds={['poi-1', 'poi-2']} onCheckedIdsChange={onChange} onClose={() => {}} />,
    )
    expect(screen.getByRole('columnheader', { name: 'Coordinates' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Central Depot/ }))
    expect(onChange).toHaveBeenCalledWith(['poi-1'])
  })
})

describe('CustomizeViewDrawer', () => {
  function Drawer({
    variant = 'hybrid',
    onDelete = vi.fn(),
    onEditFilters = vi.fn(),
  }: {
    variant?: 'hybrid' | 'list'
    onDelete?: () => void
    onEditFilters?: () => void
  }) {
    const [state, setState] = useState<CustomizeViewState>(() => defaultCustomizeViewState('Hybrid View'))
    const [cols, setCols] = useState(columns)
    return (
      <CustomizeViewDrawer
        open
        onClose={() => {}}
        variant={variant}
        state={state}
        onStateChange={setState}
        columns={cols}
        onColumnsChange={setCols}
        catalog={catalog}
        filterCount={0}
        onEditFilters={onEditFilters}
        onCopyLink={() => {}}
        onDelete={onDelete}
      />
    )
  }

  it('renders the hybrid rows: name, Fields count, dropdowns, hybrid-only toggles, footer', () => {
    render(<Drawer />)
    expect(screen.getByLabelText('View name')).toHaveValue('Hybrid View')
    expect(screen.getByText(`${columns.length} Shown`)).toBeInTheDocument()
    expect(screen.getByLabelText('List View State')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Sync list with Map' })).toBeInTheDocument()
    expect(screen.getByText('Copy Link to View')).toBeInTheDocument()
  })

  it('list variant omits the map/widget toggles and List View State', () => {
    render(<Drawer variant="list" />)
    expect(screen.queryByLabelText('List View State')).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Pin Zone Filter on Map' })).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Autosave for Me' })).toBeInTheDocument()
  })

  it('Fields row drills into the Columns sub-panel; back arrow returns', () => {
    render(<Drawer />)
    fireEvent.click(screen.getByRole('button', { name: /Fields/ }))
    expect(screen.getByText('Shown')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to Customize View' }))
    expect(screen.getByLabelText('View name')).toBeInTheDocument()
  })

  it('Copy Link swaps its label to "Copied!"; Delete and Filter rows dispatch', () => {
    const onDelete = vi.fn()
    const onEditFilters = vi.fn()
    render(<Drawer onDelete={onDelete} onEditFilters={onEditFilters} />)
    fireEvent.click(screen.getByRole('button', { name: /Copy Link to View/ }))
    expect(screen.getByText('Copied!')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Delete View/ }))
    expect(onDelete).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Filter/ }))
    expect(onEditFilters).toHaveBeenCalled()
  })

  it('toggles persist through state', () => {
    render(<Drawer />)
    const autosave = screen.getByRole('switch', { name: 'Autosave for Me' })
    fireEvent.click(autosave)
    expect(autosave).toHaveAttribute('aria-checked', 'true')
  })

  /* round-3 visual #1 — the three value rows rendered as 140x29 bordered
     select boxes where 495:26635 draws bare right-aligned text + a caret. */
  it('renders the three value rows as BARE text + caret, not bordered select boxes', () => {
    render(<Drawer />)
    for (const label of ['List View State', 'Pin View', 'Set as Default View']) {
      const trigger = screen.getByLabelText(label)
      expect(trigger.dataset.slot).toBe('customize-view-select')
      expect(trigger.className).toContain('border-0')
      expect(trigger.className).toContain('bg-transparent')
      // No fixed 140px box, no 32px control height.
      expect(trigger.className).not.toContain('w-36')
      expect(trigger.className).not.toContain('h-8')
      // The caret is still there — `SelectTrigger` appends it.
      expect(trigger.querySelector('svg')).not.toBeNull()
    }
  })

  /* round-3 visual #4 — the footer group was pinned to the drawer's bottom
     edge, leaving a 169px blank band; 495:26635 lets it follow the widget
     group after a separator. */
  it('keeps the footer group IN FLOW right after the widget group', () => {
    const { container } = render(<Drawer />)
    const scroller = container.querySelector('.overflow-y-auto')!
    const footer = container.querySelector('[data-slot="customize-view-footer"]')!
    expect(scroller.contains(footer)).toBe(true)
    expect(footer.textContent).toContain('Copy Link to View')
    expect(footer.textContent).toContain('Delete View')
    // It is the LAST thing in the scrolling column, so the blank space falls
    // below it rather than above it.
    expect(scroller.lastElementChild).toBe(footer)
  })
})

describe('UnsavedChangesToast', () => {
  it('dispatches Revert / Save / Enable Autosave', () => {
    const onRevert = vi.fn()
    const onSave = vi.fn()
    const onEnableAutosave = vi.fn()
    render(<UnsavedChangesToast onRevert={onRevert} onSave={onSave} onEnableAutosave={onEnableAutosave} />)
    expect(screen.getByRole('status')).toHaveTextContent('You have unsaved changes')
    fireEvent.click(screen.getByRole('button', { name: 'Revert' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enable Autosave' }))
    expect(onRevert).toHaveBeenCalled()
    expect(onSave).toHaveBeenCalled()
    expect(onEnableAutosave).toHaveBeenCalled()
  })

  it('lifts above and dodges start-ward past an open Customize View drawer (round-2 QA customize-toast-occlusion)', () => {
    render(<UnsavedChangesToast onRevert={vi.fn()} onSave={vi.fn()} onEnableAutosave={vi.fn()} />)
    const toast = screen.getByRole('status')
    // Sibling-selector variants: when the Customize View drawer (`z-30`,
    // `w-sm`, an earlier sibling in the same view region) is open, the toast
    // renders ABOVE it and shifts past its width (24rem + the end-3 gap),
    // so Revert/Save/Enable Autosave stay clickable AND the drawer's header
    // actions stay uncovered (UX-NOTES §6).
    expect(toast.className).toContain('[[data-slot=customize-view-drawer]~&]:z-40')
    expect(toast.className).toContain('[[data-slot=customize-view-drawer]~&]:end-[24.75rem]')
  })
})
