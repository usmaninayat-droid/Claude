import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { DisplayNameProvider, LinkedRecordProvider } from '@fams/v5-composer'
import { liveMonitoringConfig, liveVehicleRecords } from '../live-fixtures'
import { LiveListOnlyView } from './LiveListOnlyView'

/**
 * LiveListOnlyView — SPEC v2 §2.10 / P0-3 #25–#26/#28–#30: the in-card
 * search/funnel/sort toolbar, count line, SORT BY menu + header sort
 * affordances, skeleton, and the sticky/virtualized table plumbing.
 */
describe('LiveListOnlyView', () => {
  const setup = (props: Partial<React.ComponentProps<typeof LiveListOnlyView>> = {}) =>
    render(<LiveListOnlyView config={liveMonitoringConfig} records={liveVehicleRecords} {...props} />)

  it('carries its own in-card search + funnel + count line (page toolbar is suppressed for live modules)', () => {
    setup()
    expect(screen.getByLabelText('Search vehicles')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All filters' })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="live-list-count"]')).toHaveTextContent('Showing 4 items')
    // Search still matches the record's internal uniqueidentifier (the
    // "LV-102"-style ids) even though A22 stopped rendering it — the search
    // index and the displayed cell are independent contracts.
    fireEvent.change(screen.getByLabelText('Search vehicles'), { target: { value: 'LV-102' } })
    expect(document.querySelector('[data-slot="live-list-count"]')).toHaveTextContent('Showing 1 items out of 4')
    // A22: the VEHICLE cell renders the record's PLATE (`plateCol`), never
    // the internal uniqueidentifier — the surviving row is identified by its
    // plate, "D 88451" (record V-102's `systemcol1`).
    expect(screen.getByText('D 88451')).toBeInTheDocument()
    expect(screen.queryByText('A 10930')).not.toBeInTheDocument()
  })

  it('sort button opens the SORT BY single-select menu; picking a column sets ascending + the primary ↑ in that header (P0-3#30)', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    const menu = screen.getByRole('listbox', { name: 'Sort by' })
    // None (default) + one entry per visible column.
    expect(within(menu).getByRole('option', { name: /None/ })).toHaveAttribute('aria-selected', 'true')
    expect(within(menu).getByRole('option', { name: 'Vehicle' })).toBeInTheDocument()
    fireEvent.click(within(menu).getByRole('option', { name: 'Vehicle' }))
    const header = screen.getByRole('columnheader', { name: /Vehicle/ })
    expect(header).toHaveAttribute('aria-sort', 'ascending')
    // Re-opening shows the active selection; None clears it.
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    const reopened = screen.getByRole('listbox', { name: 'Sort by' })
    expect(within(reopened).getByRole('option', { name: 'Vehicle' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(within(reopened).getByRole('option', { name: /None/ }))
    expect(screen.getByRole('columnheader', { name: /Vehicle/ })).toHaveAttribute('aria-sort', 'none')
  })

  it('column-header click sorts ascending (hover tooltip announces it) and click again toggles descending', () => {
    setup()
    // Named, not the bare role: the header now also carries the §7
    // expand-column toggle button (DataTableHeaderCell, commit 52ead56),
    // so an unnamed `getByRole('button')` would match two buttons — the
    // sort control (accessible name "Vehicle") and "Expand Vehicle column".
    const headerButton = within(screen.getByRole('columnheader', { name: /Vehicle/ })).getByRole('button', {
      name: 'Vehicle',
    })
    expect(headerButton).toHaveAttribute('title', 'Click to sort ascending')
    fireEvent.click(headerButton)
    expect(screen.getByRole('columnheader', { name: /Vehicle/ })).toHaveAttribute('aria-sort', 'ascending')
    expect(headerButton).toHaveAttribute('title', 'Click to sort descending')
    fireEvent.click(headerButton)
    expect(screen.getByRole('columnheader', { name: /Vehicle/ })).toHaveAttribute('aria-sort', 'descending')
  })

  it('round-trips a controlled sort through onSortChange (ModuleView ViewState wiring)', () => {
    const onSortChange = vi.fn()
    setup({ sort: null, onSortChange })
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    fireEvent.click(screen.getByRole('option', { name: 'Vehicle' }))
    expect(onSortChange).toHaveBeenCalledWith({ key: 'title', direction: 'asc' })
  })

  it('renders the 3D vehicle art + status dot + the plate in the VEHICLE cell (A22: plate, not the internal uniqueidentifier; P0-1.1, no photos)', () => {
    setup()
    const cell = screen.getByText('Y 31022').closest('td')!
    // The 3D art, not a photograph, and the status dot in the record's tone.
    expect(cell.querySelector('svg')).not.toBeNull()
    expect(cell.querySelector('.bg-success-scale-500')).not.toBeNull()
    expect(document.querySelector('table img')).toBeNull()
    // The SHORT id, never the Make-Model title (that stays the popup headline).
    expect(within(cell).queryByText('Mitsubishi X6734')).not.toBeInTheDocument()
  })

  it('renders the 555:39222 skeleton table while loading', () => {
    setup({ loading: true })
    expect(document.querySelector('[data-slot="live-list-skeleton"]')).toBeInTheDocument()
  })

  it('renders the no-results empty state for a nonsense query', () => {
    setup()
    fireEvent.change(screen.getByLabelText('Search vehicles'), { target: { value: 'zzz-nope' } })
    expect(screen.getByText('No results found!')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="live-list-count"]')).toHaveTextContent('Showing 0 items out of 4')
  })

  it('carries its OWN Customize View drawer with the map/widget toggles omitted (§3.27, 540:69908)', () => {
    const onOpenChange = vi.fn()
    setup({ customizeOpen: true, onCustomizeOpenChange: onOpenChange })
    const drawer = screen.getByRole('dialog', { name: 'Customize View' })
    // The list variant: no map section, no widget section, no List View State.
    expect(within(drawer).queryByLabelText('List View State')).not.toBeInTheDocument()
    expect(within(drawer).queryByRole('switch', { name: 'Sync list with Map' })).not.toBeInTheDocument()
    expect(within(drawer).queryByRole('switch', { name: 'Pin Zone Filter on Map' })).not.toBeInTheDocument()
    // …but the view-level rows are all there and edits raise the toast.
    expect(within(drawer).getByRole('switch', { name: 'Autosave for Me' })).toBeInTheDocument()
    fireEvent.click(within(drawer).getByRole('switch', { name: 'Private View' }))
    expect(screen.getByRole('status')).toHaveTextContent('You have unsaved changes')
    fireEvent.click(screen.getByRole('button', { name: 'Close Customize View' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('keeps the columns pencil + popover behavior (toggle applies live + raises the unsaved toast)', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Customize columns' }))
    const popover = screen.getByRole('dialog', { name: 'Columns' })
    const headersBefore = screen.getAllByRole('columnheader').length
    fireEvent.click(within(popover).getByRole('switch', { name: /Driver/ }))
    expect(screen.getAllByRole('columnheader').length).toBe(headersBefore + 1)
    expect(screen.getByRole('status')).toHaveTextContent('You have unsaved changes')
  })
  /*
   * SPEC §2.10 / 540:69908: a full-width white CARD inset from the shell on a
   * grey-50 page, bordered and rounded on all four sides. Round 2 shipped it
   * full-bleed — white from x119 to x1919 with no border, radius or gutter
   * (visual #4). The live module body is `bodyInset="flush"` so the HYBRID map
   * can reach the viewport, which is why the inset lives here.
   */
  describe('the inset table card (visual #4)', () => {
    it('sits a bordered, rounded white card on a grey-50 page with a gutter', () => {
      setup()
      const root = document.querySelector<HTMLElement>('[data-slot="list-view"]')!
      expect(root).toHaveClass('rounded-lg')
      expect(root).toHaveClass('border')
      expect(root).toHaveClass('border-border')
      expect(root).toHaveClass('bg-card')
      const page = root.closest('.bg-background')
      expect(page).not.toBeNull()
      // The gutter is on an INNER wrapper, so the drawer and the columns
      // popover keep docking against the body's real edges.
      expect(root.closest('.p-7')).not.toBeNull()
      expect(page?.classList.contains('p-7')).toBe(false)
    })
  })
})

describe('LiveListOnlyView — FILL LEVEL parity with the hybrid list', () => {
  /* The list-only view used to print the bound number as bare text while the
     hybrid list drew the threshold bar — two surfaces of ONE module
     disagreeing about what a fill level looks like. Both now render the same
     `FillLevelCell`. */
  const config = {
    ...liveMonitoringConfig,
    systemcolumns: [
      ...liveMonitoringConfig.systemcolumns,
      { id: 'fld_fill', col: 'fillLevel', name: 'Fill Level', group: 'Other Fields', type: 'Numeric' },
    ],
    listcolumns: [...liveMonitoringConfig.listcolumns, { id: 'fld_fill', col: 'fillLevel' }],
    uiConfig: {
      ...liveMonitoringConfig.uiConfig,
      map: { ...liveMonitoringConfig.uiConfig.map, fillLevelCol: 'fillLevel' },
    },
  } as typeof liveMonitoringConfig
  const records = liveVehicleRecords.map((record, i) => ({ ...record, fillLevel: [8, 55, 97, 100][i] }))

  it('draws the bar cell for every row — never a bare number, never an em-dash', () => {
    render(<LiveListOnlyView config={config} records={records} />)
    const bars = screen.getAllByRole('progressbar')
    expect(bars).toHaveLength(records.length)
    expect(bars.map((bar) => bar.getAttribute('aria-valuenow'))).toEqual(['8', '55', '97', '100'])
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })
})

describe('LiveListOnlyView — PersonView/StatusList/LinkView placements dispatch through the shared field registry (2026-08-31 platform fix)', () => {
  /*
   * Root cause: `hasLiveMap` (`ModuleViewBody.tsx`) routes ANY coordinate-
   * bound module through THIS view — not just true fleet-telemetry
   * "live monitoring" modules but any entity module with map pins
   * (Plan Monitoring, incidents, Smart Planning). Before this fix, the
   * `cellOverrides` loop above stamped EVERY non-vehicle/speed/fillLevel
   * column as inert text regardless of its own listcolumns placement, so a
   * `LinkView` "Source Plan", `PersonView` "Driver" and `StatusList`
   * "Status" column all lost their real renderer the moment their module
   * got routed through this list-only body.
   */
  const dispatchConfig = {
    ...liveMonitoringConfig,
    systemcolumns: [
      ...liveMonitoringConfig.systemcolumns,
      {
        id: 'fld_source',
        col: 'systemcol12',
        name: 'Source Plan',
        type: 'SingleReference',
        refModule: 'Entity',
        entityType: 'smart-planning/plan',
      },
    ],
    listcolumns: [
      { id: 'fld_title', col: 'title' },
      // The SAME literal name Plan Monitoring/fleet/vehicles blueprints
      // author on their own `status` column.
      { id: 'fld_status', col: 'status', component: { name: 'StatusList' } },
      { id: 'fld_speed', col: 'systemcol2' },
      { id: 'fld_driver', col: 'systemcol5', component: { name: 'PersonView' } },
      { id: 'fld_source', col: 'systemcol12', component: { name: 'LinkView' } },
    ],
  } as typeof liveMonitoringConfig
  const records = liveVehicleRecords.map((record, i) => ({
    ...record,
    systemcol12: i === 0 ? 'plan-9001' : undefined,
  }))

  it('StatusList — the status column keeps its colored StatusPill (uiConfig.statusList), not plain text', () => {
    render(<LiveListOnlyView config={dispatchConfig} records={records} />)
    const pill = screen.getByText('Moving')
    expect(pill).toHaveAttribute('data-slot', 'status-pill')
    expect(pill).toHaveStyle({ backgroundColor: 'var(--color-success)' })
  })

  it('PersonView — the Driver column renders an avatar chip, not a bare name string', () => {
    render(<LiveListOnlyView config={dispatchConfig} records={records} />)
    const cell = screen.getByText('Jhon Doe').closest('td')!
    expect(cell.querySelector('[data-slot="avatar"]')).not.toBeNull()
  })

  it('LinkView — the Source Plan column renders an activatable link and reports the click to the host', () => {
    const onOpenLinkedRecord = vi.fn()
    render(
      <DisplayNameProvider resolve={(id) => (id === 'plan-9001' ? 'FRP-9001' : id)}>
        <LinkedRecordProvider onOpenLinkedRecord={onOpenLinkedRecord}>
          <LiveListOnlyView config={dispatchConfig} records={records} />
        </LinkedRecordProvider>
      </DisplayNameProvider>,
    )
    const link = screen.getByText('FRP-9001').closest('[data-slot="link-view"]')!
    expect(link.tagName).toBe('BUTTON')
    fireEvent.click(link)
    expect(onOpenLinkedRecord).toHaveBeenCalledWith({
      entityType: 'smart-planning/plan',
      recordId: 'plan-9001',
      col: 'systemcol12',
    })
  })

  it('LinkView — with no LinkedRecordProvider it degrades to plain text, exactly like every other unwired reference (no regression)', () => {
    render(<LiveListOnlyView config={dispatchConfig} records={records} />)
    expect(screen.queryByRole('button', { name: /plan-9001/ })).not.toBeInTheDocument()
    expect(document.querySelector('[data-slot="link-view"]')).not.toBeInTheDocument()
  })

  it("a column naming an UNREGISTERED component (this module's own `TextView` placements) keeps the plain-text override — byte-identical, no regression", () => {
    const textViewConfig = {
      ...dispatchConfig,
      listcolumns: [
        ...dispatchConfig.listcolumns,
        // `systemcol10` ("Shift Type") carries no special-cased branch of its
        // own (unlike title/speed/fillLevel) — the ONLY thing standing
        // between it and a real renderer is this component-name check, so an
        // unregistered name must still fall through to the plain-text
        // override exactly as before this fix.
        { id: 'fld_tags', col: 'systemcol10', component: { name: 'TextView' } },
      ],
    } as typeof dispatchConfig
    render(<LiveListOnlyView config={textViewConfig} records={records} />)
    // Two of the four fixture rows share the value "Street" — assert on
    // every matching cell, not just the first.
    const cells = screen.getAllByText('Street').map((el) => el.closest('td')!)
    expect(cells.length).toBeGreaterThan(0)
    for (const cell of cells) {
      expect(cell.querySelector('[data-slot="avatar"]')).toBeNull()
      expect(cell.querySelector('[data-slot="status-pill"]')).toBeNull()
      expect(cell.querySelector('[data-slot="link-view"]')).toBeNull()
    }
  })
})
