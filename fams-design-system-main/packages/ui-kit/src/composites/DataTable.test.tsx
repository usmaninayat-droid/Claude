import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as Gauge.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { DataTable, type DataTableColumn, type DataTableGroupBy } from './DataTable'

expect.extend({ toHaveNoViolations })

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Assertion<T> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

const axe = configureAxe({
  rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
})

interface Row {
  id: string
  name: string
  speed: number
  imei: string
  fleet?: string
}

const DATA: Row[] = [
  { id: 'a', name: 'TAJ-1', speed: 10, imei: '111' },
  { id: 'b', name: 'TAJ-2', speed: 20, imei: '222' },
]

const GROUPED_DATA: Row[] = [
  { id: 'a', name: 'TAJ-1', speed: 10, imei: '111', fleet: 'Lot 1' },
  { id: 'b', name: 'TAJ-2', speed: 20, imei: '222', fleet: 'Lot 2' },
  { id: 'c', name: 'TAJ-3', speed: 30, imei: '333', fleet: 'Lot 1' },
]

const COLUMNS: DataTableColumn<Row>[] = [
  { key: 'name', label: 'Vehicle', isHideable: false, group: 'Shown' },
  { key: 'speed', label: 'Speed', group: 'Shown' },
  { key: 'imei', label: 'IMEI', group: 'Asset – Basic Info' },
]

function openColumns() {
  fireEvent.click(screen.getByRole('button', { name: /columns/i }))
}

/** Ordered-visible-keys (new) mode harness. */
function VisibleKeysHarness() {
  const [order, setOrder] = useState<string[]>(['name', 'speed'])
  return (
    <DataTable<Row>
      columns={COLUMNS}
      data={DATA}
      getRowId={(r) => r.id}
      columnOrder={order}
      onColumnOrderChange={setOrder}
      ariaLabel="rows"
    />
  )
}

function colHeaders(): string[] {
  return screen
    .getAllByRole('columnheader')
    .map((th) => th.textContent?.trim() ?? '')
    // Excludes the trailing, unlabeled `isCustomizable` pencil column
    // (default true, on in this harness) — these assertions are about the
    // DATA columns' order/visibility, not the columns-menu trigger itself.
    .filter(Boolean)
}

describe('DataTable + ColumnCustomizer integration', () => {
  it('renders only visible columns from columnOrder (visible-keys mode)', () => {
    render(<VisibleKeysHarness />)
    const headers = colHeaders()
    expect(headers).toContain('Vehicle')
    expect(headers).toContain('Speed')
    expect(headers).not.toContain('IMEI')
  })

  it('toggling a hidden column ON shows it in the table', () => {
    render(<VisibleKeysHarness />)
    openColumns()
    fireEvent.click(screen.getByRole('switch', { name: 'Toggle IMEI' }))
    expect(colHeaders()).toContain('IMEI')
  })

  it('toggling a visible column OFF hides it from the table', () => {
    render(<VisibleKeysHarness />)
    openColumns()
    fireEvent.click(screen.getByRole('switch', { name: 'Toggle Speed' }))
    expect(colHeaders()).not.toContain('Speed')
  })

  it('required column cannot be hidden', () => {
    render(<VisibleKeysHarness />)
    openColumns()
    const toggle = screen.getByRole('switch', { name: 'Toggle Vehicle' })
    expect(toggle).toBeDisabled()
    fireEvent.click(toggle)
    expect(colHeaders()).toContain('Vehicle')
  })

  it('keyboard reorder changes the rendered column order', () => {
    render(<VisibleKeysHarness />)
    openColumns()
    const handle = screen.getByRole('button', { name: 'Reorder Vehicle' })
    handle.focus()
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    // Vehicle moves after Speed.
    expect(colHeaders()).toEqual(['Speed', 'Vehicle'])
  })

  it('search filters the customizer rows', () => {
    render(<VisibleKeysHarness />)
    openColumns()
    // Scope to the popover panel (the header text lives there).
    const panel = screen
      .getByText('Columns', { selector: 'span' })
      .closest('[data-slot="column-customizer"]') as HTMLElement
    fireEvent.change(
      within(panel).getByRole('textbox', { name: 'Search Columns' }),
      { target: { value: 'imei' } },
    )
    expect(within(panel).getByText('IMEI')).toBeInTheDocument()
    expect(within(panel).queryByText('Speed')).not.toBeInTheDocument()
  })

  it('backward compatible: legacy hiddenColumnKeys still hides a column', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        hiddenColumnKeys={['imei']}
        ariaLabel="rows"
      />,
    )
    expect(colHeaders()).not.toContain('IMEI')
  })

  it('backward compatible: uncontrolled toggle via onColumnConfigChange path', () => {
    const seen: { order: string[]; hidden: string[] }[] = []
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        onColumnConfigChange={(c) => seen.push(c)}
        ariaLabel="rows"
      />,
    )
    // All visible initially (no columnOrder / no hidden).
    expect(colHeaders()).toContain('IMEI')
    openColumns()
    fireEvent.click(screen.getByRole('switch', { name: 'Toggle IMEI' }))
    expect(colHeaders()).not.toContain('IMEI')
    expect(seen.at(-1)?.hidden).toContain('imei')
  })

  it('renders under RTL without error', () => {
    render(
      <div dir="rtl">
        <VisibleKeysHarness />
      </div>,
    )
    openColumns()
    expect(
      screen.getByText('Columns', { selector: 'span' }),
    ).toBeInTheDocument()
  })

  /*
   * Product truth (VALUES-CROSSCHECK.md row 25 — figma.png for F1 launchpad
   * hybrid list, F2 launchpad list view, F4 portal table): every real FAMS
   * table/list screen shows a small PENCIL pinned at the header row's
   * trailing end as its column-edit affordance, never a bordered "Columns"
   * button with a gear icon. `isCustomizable`'s default trigger must match
   * that, not the legacy labelled button (designer report 2026-09-07: "this
   * is not how columns are edited").
   */
  it('default trigger (columnsMenuVariant="icon") is an icon-only pencil, not the bordered labelled button', () => {
    render(<VisibleKeysHarness />)
    const trigger = screen.getByRole('button', { name: 'Edit columns' })
    // No visible "Columns" text on the trigger itself (the popover's own
    // internal header, opened below, is a separate element).
    expect(trigger).not.toHaveTextContent('Columns')
    expect(trigger.className).not.toContain('border')
    fireEvent.click(trigger)
    expect(screen.getByText('Columns', { selector: 'span' })).toBeInTheDocument()
  })

  it('columnsMenuVariant="labelled" opts into the legacy bordered "Columns" button', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        columnsMenuVariant="labelled"
        ariaLabel="rows"
      />,
    )
    const trigger = screen.getByRole('button', { name: /columns/i })
    expect(trigger).toHaveTextContent('Columns')
    expect(trigger.className).toContain('border')
    fireEvent.click(trigger)
    expect(screen.getByRole('switch', { name: 'Toggle IMEI' })).toBeInTheDocument()
  })
})

describe('DataTable loading state', () => {
  it('shows the loading state when `loading` is true', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        loading
        ariaLabel="rows"
      />,
    )
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('TAJ-1')).not.toBeInTheDocument()
  })

  it('renders a custom loadingState node when `loading` is true', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        loading
        loadingState="Fetching rows…"
        ariaLabel="rows"
      />,
    )
    expect(screen.getByText('Fetching rows…')).toBeInTheDocument()
  })

  it('@deprecated: the legacy `isLoading` prop still triggers the loading state', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        isLoading
        ariaLabel="rows"
      />,
    )
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('TAJ-1')).not.toBeInTheDocument()
  })
})

describe('DataTable groupBy', () => {
  it('is off by default — flat rows, no group headers', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={GROUPED_DATA}
        getRowId={(r) => r.id}
        ariaLabel="rows"
      />,
    )
    expect(screen.queryByRole('button', { name: /Lot 1/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(1 + GROUPED_DATA.length) // header + rows
  })

  it('partitions rows into labeled sections with a per-group count', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={GROUPED_DATA}
        getRowId={(r) => r.id}
        groupBy={{ getGroupKey: (r) => r.fleet! }}
        ariaLabel="rows"
      />,
    )
    const lot1 = screen.getByRole('button', { name: /Lot 1/ })
    const lot2 = screen.getByRole('button', { name: /Lot 2/ })
    expect(lot1).toHaveTextContent('2') // TAJ-1, TAJ-3
    expect(lot2).toHaveTextContent('1') // TAJ-2
    expect(screen.getByText('TAJ-1')).toBeInTheDocument()
    expect(screen.getByText('TAJ-2')).toBeInTheDocument()
    expect(screen.getByText('TAJ-3')).toBeInTheDocument()
  })

  it('uses getGroupLabel to render a custom header when provided', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={GROUPED_DATA}
        getRowId={(r) => r.id}
        groupBy={{
          getGroupKey: (r) => r.fleet!,
          getGroupLabel: (key) => `Fleet: ${key}`,
        }}
        ariaLabel="rows"
      />,
    )
    expect(
      screen.getByRole('button', { name: /Fleet: Lot 1/ }),
    ).toBeInTheDocument()
  })

  it('collapsing a group hides its rows and expanding restores them', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={GROUPED_DATA}
        getRowId={(r) => r.id}
        groupBy={{ getGroupKey: (r) => r.fleet! }}
        ariaLabel="rows"
      />,
    )
    const lot1Header = screen.getByRole('button', { name: /Lot 1/ })
    expect(lot1Header).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('TAJ-1')).toBeInTheDocument()

    fireEvent.click(lot1Header)
    expect(lot1Header).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('TAJ-1')).not.toBeInTheDocument()
    expect(screen.queryByText('TAJ-3')).not.toBeInTheDocument()
    // Lot 2 is untouched.
    expect(screen.getByText('TAJ-2')).toBeInTheDocument()

    fireEvent.click(lot1Header)
    expect(lot1Header).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('TAJ-1')).toBeInTheDocument()
  })

  it('group header is keyboard-operable (Enter toggles collapse)', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={GROUPED_DATA}
        getRowId={(r) => r.id}
        groupBy={{ getGroupKey: (r) => r.fleet! }}
        ariaLabel="rows"
      />,
    )
    const lot1Header = screen.getByRole('button', { name: /Lot 1/ })
    lot1Header.focus()
    expect(lot1Header).toHaveFocus()
    fireEvent.click(lot1Header) // native <button> activates on Enter/Space; click asserts the handler wiring
    expect(lot1Header).toHaveAttribute('aria-expanded', 'false')
  })

  it('honors defaultCollapsedGroupKeys on initial render', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={GROUPED_DATA}
        getRowId={(r) => r.id}
        groupBy={{ getGroupKey: (r) => r.fleet! }}
        defaultCollapsedGroupKeys={['Lot 1']}
        ariaLabel="rows"
      />,
    )
    expect(
      screen.getByRole('button', { name: /Lot 1/ }),
    ).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('TAJ-1')).not.toBeInTheDocument()
    expect(screen.getByText('TAJ-2')).toBeInTheDocument()
  })

  it('renders grouped rows under RTL with mirrored disclosure icon', () => {
    render(
      <div dir="rtl">
        <DataTable<Row>
          columns={COLUMNS}
          data={GROUPED_DATA}
          getRowId={(r) => r.id}
          groupBy={{ getGroupKey: (r) => r.fleet! }}
          ariaLabel="rows"
        />
      </div>,
    )
    expect(screen.getByRole('button', { name: /Lot 1/ })).toBeInTheDocument()
    expect(screen.getByText('TAJ-1')).toBeInTheDocument()
  })
})

/* ------------------------------------------------------------------ */
/* selectionMode="radio" (figma 5332:21416 "Link an Existing Workforce  */
/* Profile" single-choice picker table)                                 */
/* ------------------------------------------------------------------ */

describe('DataTable selectionMode="radio"', () => {
  it('defaults to "checkbox" — unchanged multi-select behavior', () => {
    render(<DataTable<Row> columns={COLUMNS} data={DATA} getRowId={(r) => r.id} isSelectable ariaLabel="rows" />)
    expect(screen.getAllByRole('checkbox', { name: 'Select row' })).toHaveLength(DATA.length)
    expect(screen.getByRole('checkbox', { name: 'Select all rows' })).toBeInTheDocument()
  })

  it('renders a radio control per row and no select-all header control', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        isSelectable
        selectionMode="radio"
        selectedIds={[]}
        ariaLabel="rows"
      />,
    )
    expect(screen.getAllByRole('radio')).toHaveLength(DATA.length)
    expect(screen.queryByRole('checkbox', { name: 'Select all rows' })).not.toBeInTheDocument()
  })

  it('selecting a row reports exactly that one id, replacing any prior selection', () => {
    const onSelectionChange = vi.fn()
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        isSelectable
        selectionMode="radio"
        selectedIds={['a']}
        onSelectionChange={onSelectionChange}
        ariaLabel="rows"
      />,
    )
    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
    expect(radios[1]).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(radios[1]!)
    expect(onSelectionChange).toHaveBeenCalledWith(['b'])
  })

  it('has no axe violations in radio mode', async () => {
    const { container } = render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        isSelectable
        selectionMode="radio"
        selectedIds={[]}
        ariaLabel="rows"
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

/* ------------------------------------------------------------------ */
/* Virtualization                                                       */
/* ------------------------------------------------------------------ */

const SORTABLE_COLUMNS: DataTableColumn<Row>[] = [
  { key: 'name', label: 'Vehicle', isHideable: false, isSortable: true },
  { key: 'speed', label: 'Speed', isSortable: true },
]

describe('DataTable virtualization', () => {
  it('is off by default — renders a plain <tbody>, identical row content', () => {
    const { container } = render(
      <DataTable<Row> columns={COLUMNS} data={GROUPED_DATA} getRowId={(r) => r.id} ariaLabel="rows" />,
    )
    expect(container.querySelector('[data-slot="data-table-virtual-body"]')).not.toBeInTheDocument()
    expect(screen.getByText('TAJ-1')).toBeInTheDocument()
    expect(screen.getByText('TAJ-3')).toBeInTheDocument()
  })

  it('renders every row when virtualized (degrades gracefully under jsdom)', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={GROUPED_DATA}
        getRowId={(r) => r.id}
        virtualized
        estimateRowHeight={32}
        ariaLabel="rows"
      />,
    )
    expect(screen.getByText('TAJ-1')).toBeInTheDocument()
    expect(screen.getByText('TAJ-2')).toBeInTheDocument()
    expect(screen.getByText('TAJ-3')).toBeInTheDocument()
  })

  it('coexists with sorting', () => {
    render(
      <DataTable<Row>
        columns={SORTABLE_COLUMNS}
        data={GROUPED_DATA}
        getRowId={(r) => r.id}
        virtualized
        ariaLabel="rows"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Speed' })) // exact — the sort button's own name; the new expand-toggle button is named 'Expand Speed column', which /Speed/ would also (ambiguously) match
    const rows = screen.getAllByRole('row').slice(1) // drop header row
    expect(within(rows[0]).getByText('TAJ-1')).toBeInTheDocument() // asc: 10, 20, 30
    expect(within(rows[2]).getByText('TAJ-3')).toBeInTheDocument()
  })

  it('coexists with row selection', () => {
    const onSelectionChange = vi.fn()
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        virtualized
        isSelectable
        selectedIds={[]}
        onSelectionChange={onSelectionChange}
        ariaLabel="rows"
      />,
    )
    // Every row-select checkbox shares the aria-label "Select row"; click the
    // first (row 'a').
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Select row' })[0]!)
    expect(onSelectionChange).toHaveBeenCalledWith(['a'])
  })

  it('coexists with grouping — headers render and collapse toggles rows', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={GROUPED_DATA}
        getRowId={(r) => r.id}
        groupBy={{ getGroupKey: (r) => r.fleet! }}
        virtualized
        ariaLabel="rows"
      />,
    )
    const lot1Header = screen.getByRole('button', { name: /Lot 1/ })
    expect(lot1Header).toBeInTheDocument()
    expect(screen.getByText('TAJ-1')).toBeInTheDocument()
    fireEvent.click(lot1Header)
    expect(screen.queryByText('TAJ-1')).not.toBeInTheDocument()
    expect(screen.getByText('TAJ-2')).toBeInTheDocument()
  })

  it('has no axe violations while virtualized', async () => {
    const { container } = render(
      <DataTable<Row> columns={COLUMNS} data={GROUPED_DATA} getRowId={(r) => r.id} virtualized ariaLabel="rows" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

/* ------------------------------------------------------------------ */
/* Pagination (presentational only — no fetching)                      */
/* ------------------------------------------------------------------ */

const PAGE_DATA: Row[] = Array.from({ length: 25 }, (_, i) => ({
  id: `r${i}`,
  name: `Row ${i}`,
  speed: i,
  imei: String(i),
}))

describe('DataTable pagination', () => {
  it('is off by default — no pager, no slicing', () => {
    render(<DataTable<Row> columns={COLUMNS} data={PAGE_DATA} getRowId={(r) => r.id} ariaLabel="rows" />)
    expect(screen.queryByText(/^Page \d+ of \d+$/)).not.toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(1 + PAGE_DATA.length) // header + all rows
  })

  it('client-convenience mode: slices data itself when only pageSize is given', () => {
    render(
      <DataTable<Row> columns={COLUMNS} data={PAGE_DATA} getRowId={(r) => r.id} pageSize={10} ariaLabel="rows" />,
    )
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    expect(screen.getByText('Row 0')).toBeInTheDocument()
    expect(screen.getByText('Row 9')).toBeInTheDocument()
    expect(screen.queryByText('Row 10')).not.toBeInTheDocument()
  })

  it('client-convenience mode: Next advances the uncontrolled internal page', () => {
    render(
      <DataTable<Row> columns={COLUMNS} data={PAGE_DATA} getRowId={(r) => r.id} pageSize={10} ariaLabel="rows" />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
    expect(screen.getByText('Row 10')).toBeInTheDocument()
    expect(screen.queryByText('Row 0')).not.toBeInTheDocument()
  })

  it('controlled mode: page prop drives what renders, onPaginationChange reports the request', () => {
    const onPaginationChange = vi.fn()
    function ControlledHarness() {
      const [page, setPage] = useState(1)
      return (
        <DataTable<Row>
          columns={COLUMNS}
          data={PAGE_DATA}
          getRowId={(r) => r.id}
          pageSize={10}
          page={page}
          onPaginationChange={(state) => {
            onPaginationChange(state)
            setPage(state.page)
          }}
          ariaLabel="rows"
        />
      )
    }
    render(<ControlledHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPaginationChange).toHaveBeenCalledWith({ page: 2, pageSize: 10 })
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
    expect(screen.getByText('Row 10')).toBeInTheDocument()
  })

  it('server mode: rowCount given — DataTable renders `data` as-is, never re-slices it', () => {
    const serverPage = PAGE_DATA.slice(10, 15) // caller already sliced page 3 (pageSize 5, 1-indexed)
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={serverPage}
        getRowId={(r) => r.id}
        pageSize={5}
        page={3}
        rowCount={PAGE_DATA.length}
        onPaginationChange={() => {}}
        ariaLabel="rows"
      />,
    )
    expect(screen.getByText('11–15 of 25')).toBeInTheDocument()
    expect(screen.getByText('Page 3 of 5')).toBeInTheDocument()
    expect(screen.getByText('Row 10')).toBeInTheDocument()
    expect(screen.getByText('Row 14')).toBeInTheDocument()
    expect(screen.queryByText('Row 0')).not.toBeInTheDocument()
  })

  it('renders a single, fully-disabled page when data already fits within pageSize', () => {
    render(<DataTable<Row> columns={COLUMNS} data={DATA} getRowId={(r) => r.id} pageSize={10} ariaLabel="rows" />)
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('clamps to the last valid page when the dataset shrinks out from under it (uncontrolled)', () => {
    const { rerender } = render(
      <DataTable<Row> columns={COLUMNS} data={PAGE_DATA} getRowId={(r) => r.id} pageSize={10} ariaLabel="rows" />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument()

    // 25 rows -> 15 rows while parked on page 3: page 3 no longer exists.
    rerender(
      <DataTable<Row>
        columns={COLUMNS}
        data={PAGE_DATA.slice(0, 15)}
        getRowId={(r) => r.id}
        pageSize={10}
        ariaLabel="rows"
      />,
    )
    expect(screen.queryByText(/Page 3 of/)).not.toBeInTheDocument()
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('Row 10')).toBeInTheDocument()
    expect(screen.getByText('Row 14')).toBeInTheDocument()
    expect(screen.queryByText('Row 0')).not.toBeInTheDocument()
  })

  it('clamps to the last valid page when the dataset shrinks under controlled paging, without calling onPaginationChange', () => {
    const onPaginationChange = vi.fn()
    const { rerender } = render(
      <DataTable<Row>
        columns={COLUMNS}
        data={PAGE_DATA}
        getRowId={(r) => r.id}
        pageSize={10}
        page={3}
        onPaginationChange={onPaginationChange}
        ariaLabel="rows"
      />,
    )
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument()

    rerender(
      <DataTable<Row>
        columns={COLUMNS}
        data={PAGE_DATA.slice(0, 15)}
        getRowId={(r) => r.id}
        pageSize={10}
        page={3}
        onPaginationChange={onPaginationChange}
        ariaLabel="rows"
      />,
    )
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('Row 10')).toBeInTheDocument()
    expect(screen.queryByText('Row 0')).not.toBeInTheDocument()
    expect(onPaginationChange).not.toHaveBeenCalled()
  })

  it('has no axe violations on the pager', async () => {
    const { container } = render(
      <DataTable<Row> columns={COLUMNS} data={PAGE_DATA} getRowId={(r) => r.id} pageSize={10} ariaLabel="rows" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

/* ------------------------------------------------------------------ */
/* Controlled group-collapse                                           */
/* ------------------------------------------------------------------ */

function ControlledGroupHarness() {
  const [collapsed, setCollapsed] = useState<string[]>(['Lot 1'])
  return (
    <DataTable<Row>
      columns={COLUMNS}
      data={GROUPED_DATA}
      getRowId={(r) => r.id}
      groupBy={{ getGroupKey: (r) => r.fleet! }}
      collapsedGroupKeys={collapsed}
      onGroupToggle={(key) =>
        setCollapsed((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
      }
      ariaLabel="rows"
    />
  )
}

describe('DataTable controlled group-collapse', () => {
  it('honors the collapsedGroupKeys prop on initial render', () => {
    render(<ControlledGroupHarness />)
    expect(screen.getByRole('button', { name: /Lot 1/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('TAJ-1')).not.toBeInTheDocument()
    expect(screen.getByText('TAJ-2')).toBeInTheDocument()
  })

  it('clicking a header calls onGroupToggle and the caller-driven prop update expands it', () => {
    render(<ControlledGroupHarness />)
    fireEvent.click(screen.getByRole('button', { name: /Lot 1/ }))
    expect(screen.getByRole('button', { name: /Lot 1/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('TAJ-1')).toBeInTheDocument()
  })

  it('does not mutate internal state when collapsedGroupKeys is controlled but onGroupToggle is not wired', () => {
    const onGroupToggle = vi.fn()
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={GROUPED_DATA}
        getRowId={(r) => r.id}
        groupBy={{ getGroupKey: (r) => r.fleet! }}
        collapsedGroupKeys={[]}
        onGroupToggle={onGroupToggle}
        ariaLabel="rows"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Lot 1/ }))
    expect(onGroupToggle).toHaveBeenCalledWith('Lot 1')
    // Prop never changed by the parent, so the group stays expanded.
    expect(screen.getByRole('button', { name: /Lot 1/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('TAJ-1')).toBeInTheDocument()
  })
})

/* ------------------------------------------------------------------ */
/* Summary / KPI rows                                                   */
/* ------------------------------------------------------------------ */

describe('DataTable summary rows', () => {
  it('is off by default — no tfoot', () => {
    const { container } = render(
      <DataTable<Row> columns={COLUMNS} data={DATA} getRowId={(r) => r.id} ariaLabel="rows" />,
    )
    expect(container.querySelector('[data-slot="data-table-summary-row"]')).not.toBeInTheDocument()
  })

  it('renders a footer summary row from `summaryRow`, blank for omitted keys', () => {
    const { container } = render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        summaryRow={{ speed: 'Total: 30' }}
        ariaLabel="rows"
      />,
    )
    const tfoot = container.querySelector('tfoot')
    expect(tfoot).toBeInTheDocument()
    expect(within(tfoot as HTMLElement).getByText('Total: 30')).toBeInTheDocument()
  })

  it('renders a per-group summary row via groupBy.getGroupSummary, hidden while collapsed', () => {
    const groupBy: DataTableGroupBy<Row> = {
      getGroupKey: (r) => r.fleet!,
      getGroupSummary: (_key, rows) => ({
        speed: `Total: ${rows.reduce((sum, r) => sum + r.speed, 0)}`,
      }),
    }
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={GROUPED_DATA}
        getRowId={(r) => r.id}
        groupBy={groupBy}
        ariaLabel="rows"
      />,
    )
    expect(screen.getByText('Total: 40')).toBeInTheDocument() // Lot 1: 10 + 30
    expect(screen.getByText('Total: 20')).toBeInTheDocument() // Lot 2: 20

    fireEvent.click(screen.getByRole('button', { name: /Lot 1/ }))
    expect(screen.queryByText('Total: 40')).not.toBeInTheDocument()
    expect(screen.getByText('Total: 20')).toBeInTheDocument()
  })

  it('coexists with virtualization', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        virtualized
        summaryRow={{ speed: 'Total: 30' }}
        ariaLabel="rows"
      />,
    )
    expect(screen.getByText('Total: 30')).toBeInTheDocument()
  })

  it('has no axe violations with a summary row', async () => {
    const { container } = render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        summaryRow={{ speed: 'Total: 30' }}
        ariaLabel="rows"
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('DataTable rowHeight', () => {
  it('defaults to the compact "md" cell padding', () => {
    render(<DataTable<Row> columns={COLUMNS} data={DATA} getRowId={(r) => r.id} ariaLabel="rows" />)
    const cell = screen.getAllByRole('cell')[0]
    expect(cell).toHaveClass('py-2')
  })

  it('"lg" switches every body cell to the taller figma-spec-list.md row padding', () => {
    render(
      <DataTable<Row> columns={COLUMNS} data={DATA} getRowId={(r) => r.id} rowHeight="lg" ariaLabel="rows" />,
    )
    const cell = screen.getAllByRole('cell')[0]
    expect(cell).toHaveClass('py-5')
  })
})

describe('DataTable trailingAction', () => {
  it('is off by default — no trailing column', () => {
    // `isCustomizable` (default true) claims this same trailing column for
    // its own pencil trigger — disabled here so this test isolates
    // `trailingAction` itself, same convention every real product usage
    // already follows (see `DataTableColumnsMenu`'s doc comment).
    render(
      <DataTable<Row> columns={COLUMNS} data={DATA} getRowId={(r) => r.id} isCustomizable={false} ariaLabel="rows" />,
    )
    expect(screen.getAllByRole('columnheader')).toHaveLength(COLUMNS.length)
  })

  it('renders an unlabeled trailing header cell that fires onClick, with blank body cells', () => {
    const onClick = vi.fn()
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        trailingAction={{ icon: <span data-testid="pencil" />, onClick, ariaLabel: 'Edit columns' }}
        ariaLabel="rows"
      />,
    )
    const headers = screen.getAllByRole('columnheader')
    expect(headers).toHaveLength(COLUMNS.length + 1)
    expect(within(headers[headers.length - 1]!).getByTestId('pencil')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit columns' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    // Body rows gain one extra, empty trailing cell — no text content in it.
    const firstBodyRow = screen.getAllByRole('row')[1]!
    const cells = within(firstBodyRow).getAllByRole('cell')
    expect(cells).toHaveLength(COLUMNS.length + 1)
    expect(cells[cells.length - 1]).toHaveTextContent('')
  })

  it('includes the trailing column in the colSpan used by grouped/empty/loading rows', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={GROUPED_DATA}
        getRowId={(r) => r.id}
        groupBy={{ getGroupKey: (r) => r.fleet! }}
        trailingAction={{ icon: <span data-testid="pencil" /> }}
        ariaLabel="rows"
      />,
    )
    const groupCell = screen.getByRole('button', { name: /Lot 1/ }).closest('td')
    expect(groupCell).toHaveAttribute('colSpan', String(COLUMNS.length + 1))
  })

  it('applies a column minWidth as min-inline-size on its header cell', () => {
    render(
      <DataTable
        columns={[{ key: 'name', label: 'Name', minWidth: '10rem' }]}
        data={[{ id: '1', name: 'A' }]}
        getRowId={(r) => r.id}
        ariaLabel="rows"
      />,
    )
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveStyle({ minInlineSize: '10rem' })
  })

  it('makes rows keyboard-operable only when hasFocusableRows is set', () => {
    const onRowClick = vi.fn()
    const { rerender } = render(
      <DataTable
        columns={[{ key: 'name', label: 'Name' }]}
        data={[{ id: '1', name: 'A' }]}
        getRowId={(r) => r.id}
        onRowClick={onRowClick}
        ariaLabel="rows"
      />,
    )
    expect(screen.getAllByRole('row')[1]).not.toHaveAttribute('tabindex')
    rerender(
      <DataTable
        columns={[{ key: 'name', label: 'Name' }]}
        data={[{ id: '1', name: 'A' }]}
        getRowId={(r) => r.id}
        onRowClick={onRowClick}
        hasFocusableRows
        ariaLabel="rows"
      />,
    )
    const row = screen.getAllByRole('row')[1]
    expect(row).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(onRowClick).toHaveBeenCalledTimes(1)
  })

  it('exposes the body as a labelled scroll region when scrollRegionLabel is set', () => {
    render(
      <DataTable
        columns={[{ key: 'name', label: 'Name' }]}
        data={[{ id: '1', name: 'A' }]}
        getRowId={(r) => r.id}
        scrollRegionLabel="Rows"
        ariaLabel="rows"
      />,
    )
    expect(screen.getByRole('region', { name: 'Rows' })).toHaveAttribute('tabindex', '0')
  })

  it('renders a rowActions control in the shared trailing column and does not bubble its clicks to onRowClick', () => {
    const onRowClick = vi.fn()
    const onActionClick = vi.fn()
    render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        onRowClick={onRowClick}
        rowActions={(row) => (
          <button type="button" aria-label={`Options for ${row.name}`} onClick={onActionClick}>
            …
          </button>
        )}
        ariaLabel="rows"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Options for TAJ-1' }))
    expect(onActionClick).toHaveBeenCalledTimes(1)
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('hasRowHoverAffordance defaults on whenever rowActions is provided, and can be turned off', () => {
    const { container, rerender } = render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        rowActions={() => <button type="button">…</button>}
        ariaLabel="rows"
      />,
    )
    expect(container.querySelector('tbody tr')!.className).toContain('group/row-affordance')

    rerender(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        rowActions={() => <button type="button">…</button>}
        hasRowHoverAffordance={false}
        ariaLabel="rows"
      />,
    )
    expect(container.querySelector('tbody tr')!.className).not.toContain('group/row-affordance')
  })

  /* Round-1 visual finding #28 — no persistent sort glyph. */
  it('shows NO sort glyph at rest and a primary arrow only on the sorted column', () => {
    const { container } = render(
      <DataTable<Row>
        columns={SORTABLE_COLUMNS}
        data={GROUPED_DATA}
        getRowId={(r) => r.id}
        ariaLabel="rows"
      />,
    )
    // Every sortable header carries only the hover HINT, invisible at rest.
    const hints = container.querySelectorAll<SVGElement>('[data-slot="sort-hint"]')
    expect(hints.length).toBe(2)
    for (const hint of hints) expect(hint.getAttribute('class')).toContain('opacity-0')
    expect(container.querySelector('[data-slot="sort-arrow"]')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Speed' })) // exact — the sort button's own name; the new expand-toggle button is named 'Expand Speed column', which /Speed/ would also (ambiguously) match

    const arrows = container.querySelectorAll<SVGElement>('[data-slot="sort-arrow"]')
    expect(arrows).toHaveLength(1)
    expect(arrows[0].getAttribute('class')).toContain('text-primary')
    // The unsorted column keeps its invisible hint, not a second arrow.
    expect(container.querySelectorAll('[data-slot="sort-hint"]')).toHaveLength(1)
  })

  /**
   * Tailwind v4's `hover` variant — and therefore `group-hover` — is itself
   * wrapped in `@media (hover: hover)`, so on a coarse pointer the reveal can
   * NEVER fire and the sort affordance would be invisible with no way to find
   * it. `DataTable` is the table for asset, workforce, ticketing and FAMS
   * Desk, and both the demo and FAMS Desk target tablets (Phase 7 code review,
   * finding 5).
   */
  it('keeps the sort hint visible on pointer-less devices', () => {
    const { container } = render(
      <DataTable<Row>
        columns={SORTABLE_COLUMNS}
        data={GROUPED_DATA}
        getRowId={(r) => r.id}
        ariaLabel="rows"
      />,
    )
    const hint = container.querySelector<SVGElement>('[data-slot="sort-hint"]')!
    const className = hint.getAttribute('class')!
    expect(className).toContain('[@media(hover:none)]:opacity-50')
    // The two media queries are mutually exclusive, so the emitted order of
    // the rest state and the reveal cannot matter.
    expect(className).toContain('group-hover:opacity-50')
    expect(className).toContain('group-focus-visible:opacity-50')
  })
})

/**
 * A23 — the sticky first column used to hardcode `bg-card` on the pinned
 * cell regardless of row state, so a selected/hovered row read as two
 * blocks with a visible seam at the sticky boundary (the rest of the row
 * tinted, the sticky cell didn't). The sticky cell must instead read its
 * background FROM the row's own state (hover / `data-selected`) via the
 * named `group/sticky-row`, and stay opaque (never transparent, or scrolled
 * columns would show through it) in every state, including at rest.
 */
describe('DataTable stickyFirstCol (A23)', () => {
  it('is off by default — no sticky classes on the first cell', () => {
    const { container } = render(
      <DataTable<Row> columns={COLUMNS} data={DATA} getRowId={(r) => r.id} ariaLabel="rows" />,
    )
    const firstBodyCell = container.querySelector('tbody tr td')!
    expect(firstBodyCell.className).not.toContain('sticky')
  })

  it('pins the first header and body cell, reading background from the row group', () => {
    const { container } = render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        ariaLabel="rows"
        stickyFirstCol
      />,
    )
    const firstHeaderCell = container.querySelector('thead th')!
    const firstBodyCell = container.querySelector('tbody tr td')!

    // Positioned, and OPAQUE in every state: `bg-card` stays on the element
    // itself so the columns scrolling underneath a pinned cell can never show
    // through it.
    for (const cell of [firstHeaderCell, firstBodyCell]) {
      expect(cell.className).toContain('sticky')
      expect(cell.className).toContain('start-0')
      expect(cell.className).toContain('bg-card')
    }
    // The row-state tint rides an INSET OVERLAY rather than the cell's own
    // background. Painting an ALPHA tint (`bg-muted/40`) as the background
    // would REPLACE the opaque `bg-card` and leave the pinned cell 40%
    // transparent in exactly the two states that matter — see
    // `STICKY_CELL_BASE`. The `before:` prefix is the whole guarantee.
    expect(firstBodyCell.className).toContain('isolate')
    expect(firstBodyCell.className).toContain('before:-z-10')
    expect(firstBodyCell.className).toContain('group-hover/sticky-row:before:bg-muted/40')
    expect(firstBodyCell.className).toContain('group-data-[selected]/sticky-row:before:bg-secondary/40')
    // ...and never as a bare background, which is the bug this guards.
    expect(firstBodyCell.className).not.toContain('group-hover/sticky-row:bg-muted/40')

    // Every row carries the named group the sticky cell reads, so the
    // background always tracks THIS row, never a sibling's.
    const row = container.querySelector('tbody tr')!
    expect(row.className).toContain('group/sticky-row')

    // Later, non-first cells stay plain — only the pinned column is sticky.
    const secondBodyCell = container.querySelectorAll('tbody tr td')[1]!
    expect(secondBodyCell.className).not.toContain('sticky')
  })

  it('pins the checkbox column (not the first data column) when isSelectable', () => {
    const { container } = render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        ariaLabel="rows"
        stickyFirstCol
        isSelectable
      />,
    )
    const [checkboxCell, firstDataCell] = container.querySelectorAll('tbody tr td')
    expect(checkboxCell!.className).toContain('sticky')
    expect(firstDataCell!.className).not.toContain('sticky')
  })

  // Regression tripwire (2026-08-31, third occurrence of this bug CLASS —
  // see `LiveHybridView.tsx`'s header comment and
  // `hybrid-scroll-regression3` in Build Delegate). `overflow-hidden` on
  // this root ONLY clips normal-flow descendants; without `position:
  // relative` (or any non-`static` position) it does not establish a
  // containing block, so an absolutely-positioned descendant — the everyday
  // case is a `sr-only` accessible-label span, since Tailwind's `.sr-only`
  // IS `position: absolute` — escapes to whatever positioned ancestor is
  // next, bypassing this clip and inflating a real ancestor's `scrollHeight`
  // (confirmed live: a virtualized `LiveListPanel` table, whose overscanned
  // rows sit below the visible fold, grew a genuine functional scrollbar on
  // the module shell body two levels above `LiveHybridView`). A brittle
  // className assertion is deliberately the guard here — the failure mode
  // has no other cheap, deterministic unit-level signal (the leak only shows
  // up as inflated `scrollHeight` on some ancestor several DOM levels away,
  // which is exactly what made this regress silently three times).
  it('is a position: relative clipping root, so overflow-hidden actually contains absolutely-positioned descendants (e.g. sr-only spans)', () => {
    const { container } = render(
      <DataTable<Row> columns={COLUMNS} data={DATA} getRowId={(r) => r.id} ariaLabel="rows" className="min-h-0 flex-1" />,
    )
    // DataTable renders exactly one top-level element — its own clipping root.
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('overflow-hidden')
    expect(root.className).toContain('relative')
  })
})

/**
 * `stickyLeadingCols` (UX ruling A6, run 2026-09-05) — A6 asks for TWO
 * pinned columns at the inline start, the selection column and the row's
 * identity column. `stickyFirstCol` pins only whichever cell renders first,
 * so on a selectable table the identity column still scrolled away (measured
 * live: `SERVICE` at x = -213 at 1280 after `scrollLeft = 324`). These tests
 * guard the second lane, its offset, the seam, and the additivity of the new
 * prop.
 */
describe('DataTable stickyLeadingCols (A6 — two leading pins)', () => {
  it('is off by default — a table passing neither pin prop has no sticky cells', () => {
    const { container } = render(
      <DataTable<Row> columns={COLUMNS} data={DATA} getRowId={(r) => r.id} ariaLabel="rows" isSelectable />,
    )
    for (const cell of container.querySelectorAll('td, th')) {
      expect(cell.className).not.toContain('sticky')
    }
  })

  it('pins the checkbox AND the first data column, in two distinct logical lanes', () => {
    const { container } = render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        ariaLabel="rows"
        isSelectable
        stickyLeadingCols
      />,
    )
    for (const scope of ['thead tr', 'tbody tr'] as const) {
      const cells = container.querySelectorAll(`${scope} :is(th, td)`)
      const [selectionCell, identityCell, thirdCell] = [cells[0]!, cells[1]!, cells[2]!]

      // Lane 1 — the selection column, at the start edge.
      expect(selectionCell.className).toContain('sticky')
      expect(selectionCell.className).toContain('start-0')
      // Lane 2 — the identity column, inset by the selection column's own
      // width. The two lanes must not collide (the bug this guards is both
      // cells landing on `start-0` and stacking).
      expect(identityCell.className).toContain('sticky')
      expect(identityCell.className).toContain('start-10')
      expect(identityCell.className).not.toContain('start-0')
      // Both stay opaque so scrolled columns cannot ghost through them.
      expect(selectionCell.className).toContain('bg-card')
      expect(identityCell.className).toContain('bg-card')
      // Nothing else pins.
      expect(thirdCell.className).not.toContain('sticky')
    }
  })

  it('keeps the state-following overlay on BOTH pinned cells (A23), never a bare background', () => {
    const { container } = render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        ariaLabel="rows"
        isSelectable
        stickyLeadingCols
      />,
    )
    const [selectionCell, identityCell] = container.querySelectorAll('tbody tr td')
    for (const cell of [selectionCell!, identityCell!]) {
      expect(cell.className).toContain('isolate')
      expect(cell.className).toContain('before:-z-10')
      expect(cell.className).toContain('group-hover/sticky-row:before:bg-muted/40')
      expect(cell.className).toContain('group-data-[selected]/sticky-row:before:bg-secondary/40')
      expect(cell.className).not.toContain('group-hover/sticky-row:bg-muted/40')
    }
  })

  // Was 'draws the seam on the OUTERMOST pinned cell only'. The seam is GONE
  // (run 2026-09-07): every list/table Figma reference AND the DS V2 table
  // spec agree there is no vertical column divider anywhere
  // (`VALUES-CROSSCHECK.md` row 14). The pin still reads as a pin because
  // `STICKY_CELL_BASE` keeps the cell OPAQUE — asserted here so the border
  // cannot come back unnoticed.
  it('draws NO vertical seam on either pinned cell', () => {
    const { container } = render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        ariaLabel="rows"
        isSelectable
        stickyLeadingCols
      />,
    )
    const [selectionCell, identityCell] = container.querySelectorAll('tbody tr td')
    expect(identityCell!.className).not.toContain('border-e')
    expect(selectionCell!.className).not.toContain('border-e')
    // The opaque background is what hides the columns sliding underneath.
    expect(identityCell!.className).toContain('bg-card')
  })

  it('falls back to a single lane, still with no seam, with no selection column', () => {
    const { container } = render(
      <DataTable<Row> columns={COLUMNS} data={DATA} getRowId={(r) => r.id} ariaLabel="rows" stickyLeadingCols />,
    )
    const firstCell = container.querySelector('tbody tr td')!
    expect(firstCell.className).toContain('start-0')
    expect(firstCell.className).not.toContain('start-10')
    expect(firstCell.className).not.toContain('border-e')
  })

  // RTL: the lanes are LOGICAL, so `dir="rtl"` needs no second code path —
  // the same `start-*`/`border-e` utilities resolve to the opposite physical
  // edge. The guard is that no physical utility ever appears.
  it('uses only logical inset + seam utilities under dir="rtl"', () => {
    const { container } = render(
      <div dir="rtl">
        <DataTable<Row>
          columns={COLUMNS}
          data={DATA}
          getRowId={(r) => r.id}
          ariaLabel="rows"
          isSelectable
          stickyLeadingCols
        />
      </div>,
    )
    const [selectionCell, identityCell] = container.querySelectorAll('tbody tr td')
    for (const cell of [selectionCell!, identityCell!]) {
      expect(cell.className).not.toMatch(/(^|\s)-?(left|right)-/)
      expect(cell.className).not.toContain('border-r')
      expect(cell.className).not.toContain('border-l')
    }
    expect(selectionCell!.className).toContain('start-0')
    expect(identityCell!.className).toContain('start-10')
  })
})

/**
 * `stickyTrailingCol` — the inline-END mirror of `stickyFirstCol` (UX ruling
 * A6, run 2026-09-05): the table-options header cell / per-row `rowActions`
 * cell pin to the trailing edge, logically (`end-0`, RTL-safe), so a
 * per-row action is never a 400px scroll away.
 */
describe('DataTable stickyTrailingCol (A6)', () => {
  const rowActions = () => <button type="button">⋮</button>

  it('is off by default — no sticky classes on the trailing cell', () => {
    const { container } = render(
      <DataTable<Row> columns={COLUMNS} data={DATA} getRowId={(r) => r.id} ariaLabel="rows" rowActions={rowActions} />,
    )
    const cells = container.querySelectorAll('tbody tr td')
    const trailingCell = cells[cells.length - 1]!
    expect(trailingCell.className).not.toContain('sticky')
  })

  it('pins the trailing header + body cell to the LOGICAL end edge (RTL-safe)', () => {
    const { container } = render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        ariaLabel="rows"
        rowActions={rowActions}
        stickyTrailingCol
      />,
    )
    const headerCells = container.querySelectorAll('thead th')
    const trailingHeader = headerCells[headerCells.length - 1]!
    const bodyCells = container.querySelectorAll('tbody tr td')
    const trailingBody = bodyCells[bodyCells.length - 1]!

    for (const cell of [trailingHeader, trailingBody]) {
      expect(cell.className).toContain('sticky')
      // Logical, never physical — `end-0` (not `right-0`) so `dir="rtl"`
      // mirrors it to the opposite physical edge automatically.
      expect(cell.className).toContain('end-0')
      expect(cell.className).not.toContain('right-0')
      expect(cell.className).toContain('bg-card')
    }
    // Non-trailing cells stay plain.
    expect(bodyCells[0]!.className).not.toContain('sticky')
  })

  it('is a no-op with no trailing column at all', () => {
    const { container } = render(
      <DataTable<Row>
        columns={COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        // See the `trailingAction` "is off by default" test above — the
        // default `isCustomizable` pencil claims this same trailing column.
        isCustomizable={false}
        ariaLabel="rows"
        stickyTrailingCol
      />,
    )
    for (const cell of container.querySelectorAll('td, th')) {
      expect(cell.className).not.toContain('sticky')
    }
  })
})

/* ------------------------------------------------------------------ */
/* column.contentType — stakeholder-agreed identifier/text truncation   */
/* rules (fixed-id / variable-id / descriptive / fixed-content)         */
/* ------------------------------------------------------------------ */

describe('DataTable column.contentType', () => {
  it('defaults to the original plain-string cell when omitted', () => {
    render(
      <DataTable
        columns={[{ key: 'name', label: 'Name' }]}
        data={[{ id: '1', name: 'Rashid Al Mansoori' }]}
        getRowId={(r) => r.id}
        ariaLabel="rows"
      />,
    )
    expect(screen.getByText('Rashid Al Mansoori')).toBeInTheDocument()
  })

  it('"fixed-id" never wraps — a fixed-length identifier renders on one line', () => {
    render(
      <DataTable
        columns={[{ key: 'imei', label: 'IMEI', contentType: 'fixed-id' }]}
        data={[{ id: '1', imei: '860123456789012' }]}
        getRowId={(r) => r.id}
        ariaLabel="rows"
      />,
    )
    const cell = screen.getByText('860123456789012')
    expect(cell.className).toContain('whitespace-nowrap')
  })

  it('"fixed-content" renders the same never-wrap treatment as "fixed-id"', () => {
    render(
      <DataTable
        columns={[{ key: 'status', label: 'Status', contentType: 'fixed-content' }]}
        data={[{ id: '1', status: 'Moving' }]}
        getRowId={(r) => r.id}
        ariaLabel="rows"
      />,
    )
    expect(screen.getByText('Moving').className).toContain('whitespace-nowrap')
  })

  it('"variable-id" wraps up to 2 lines by default (line-clamp-2) and carries the full value as a title', () => {
    render(
      <DataTable
        columns={[{ key: 'name', label: 'Name', contentType: 'variable-id' }]}
        data={[{ id: '1', name: 'Kareem Haddad' }]}
        getRowId={(r) => r.id}
        ariaLabel="rows"
      />,
    )
    const cell = screen.getByText('Kareem Haddad')
    expect(cell.className).toContain('line-clamp-2')
    expect(cell).toHaveAttribute('title', 'Kareem Haddad')
  })

  it('"variable-id" falls back to a single middle-truncated line when the value cannot fit even 2 lines (jsdom: zero-width container)', () => {
    const longName = 'A'.repeat(400)
    render(
      <DataTable
        columns={[{ key: 'name', label: 'Name', contentType: 'variable-id' }]}
        data={[{ id: '1', name: longName }]}
        getRowId={(r) => r.id}
        ariaLabel="rows"
      />,
    )
    // jsdom never lays out real pixels, so `ResizeObserver`/`clientWidth`
    // report 0 — the component treats that as "not yet measured" and shows
    // the 2-line clamp rather than guessing. The middle-truncate branch
    // itself is unit-tested directly in dataTableCellText — this test only
    // guards that the untruncated jsdom fallback still shows the full value
    // (via `title`), never silently drops it.
    const cell = screen.getByTitle(longName)
    expect(cell).toBeInTheDocument()
  })

  it('"descriptive" end-truncates to one line and exposes the full value via a click-toggleable tooltip', () => {
    const longAddress = 'Plot 42, Al Mushrif Industrial Area, Zayed City, Abu Dhabi, United Arab Emirates'
    render(
      <DataTable
        columns={[{ key: 'address', label: 'Address', contentType: 'descriptive' }]}
        data={[{ id: '1', address: longAddress }]}
        getRowId={(r) => r.id}
        ariaLabel="rows"
      />,
    )
    const trigger = screen.getByRole('button', { name: longAddress })
    expect(trigger.className).toContain('truncate')
    fireEvent.click(trigger)
    // Radix Tooltip content only mounts once open.
    expect(screen.getAllByText(longAddress).length).toBeGreaterThan(1)
  })

  it('a custom `render` keeps full control of content — contentType only affects the td width/whitespace class', () => {
    render(
      <DataTable
        columns={[
          {
            key: 'name',
            label: 'Name',
            contentType: 'variable-id',
            render: (row: { id: string; name: string }) => <span data-testid="custom">{row.name}</span>,
          },
        ]}
        data={[{ id: '1', name: 'Custom Rendered' }]}
        getRowId={(r) => r.id}
        ariaLabel="rows"
      />,
    )
    expect(screen.getByTestId('custom')).toHaveTextContent('Custom Rendered')
    expect(screen.getByTestId('custom').closest('td')!.className).toContain('max-w-64')
  })
})

/* ------------------------------------------------------------------ */
/* layout="stacked" — narrow-panel row shape (list beside a map)        */
/* ------------------------------------------------------------------ */

describe('DataTable layout="stacked"', () => {
  const STACKED_COLUMNS: DataTableColumn<Row>[] = [
    { key: 'name', label: 'Vehicle' },
    { key: 'speed', label: 'Speed' },
    { key: 'imei', label: 'IMEI' },
  ]

  it('defaults to "table" — unchanged <table> markup', () => {
    const { container } = render(
      <DataTable<Row> columns={STACKED_COLUMNS} data={DATA} getRowId={(r) => r.id} ariaLabel="rows" />,
    )
    expect(container.querySelector('table')).toBeInTheDocument()
  })

  it('renders one stacked row per record, identifier on its own line, other fields folded below', () => {
    const { container } = render(
      <DataTable<Row>
        columns={STACKED_COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        layout="stacked"
        stackedIdentifierKey="name"
        ariaLabel="rows"
      />,
    )
    expect(container.querySelector('table')).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(DATA.length)
    expect(screen.getByText('TAJ-1')).toBeInTheDocument()
    // Non-identifier columns render as "label value" pairs on the second
    // line — "Speed"/"IMEI" repeat per row, so assert within the first row.
    const firstRow = screen.getAllByRole('listitem')[0]!
    expect(within(firstRow).getByText('Speed')).toBeInTheDocument()
    expect(within(firstRow).getByText('10')).toBeInTheDocument()
    expect(within(firstRow).getByText('IMEI')).toBeInTheDocument()
    expect(within(firstRow).getByText('111')).toBeInTheDocument()
  })

  it('defaults the identifier line to the first column when stackedIdentifierKey is omitted', () => {
    render(
      <DataTable<Row> columns={STACKED_COLUMNS} data={DATA} getRowId={(r) => r.id} layout="stacked" ariaLabel="rows" />,
    )
    // "Vehicle" (the first column's label) never appears as a "label value"
    // pair since it became the identifier line instead.
    expect(screen.queryByText('Vehicle')).not.toBeInTheDocument()
    expect(screen.getByText('TAJ-1')).toBeInTheDocument()
  })

  it('selection still works — checkbox toggles the same onSelectionChange contract', () => {
    const onSelectionChange = vi.fn()
    render(
      <DataTable<Row>
        columns={STACKED_COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        layout="stacked"
        isSelectable
        selectedIds={[]}
        onSelectionChange={onSelectionChange}
        ariaLabel="rows"
      />,
    )
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Select row' })[0]!)
    expect(onSelectionChange).toHaveBeenCalledWith(['a'])
  })

  it('selectionMode="radio" renders a radio control per stacked row', () => {
    render(
      <DataTable<Row>
        columns={STACKED_COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        layout="stacked"
        isSelectable
        selectionMode="radio"
        selectedIds={[]}
        ariaLabel="rows"
      />,
    )
    expect(screen.getAllByRole('radio')).toHaveLength(DATA.length)
  })

  it('rowActions still renders and does not bubble clicks to onRowClick', () => {
    const onRowClick = vi.fn()
    const onActionClick = vi.fn()
    render(
      <DataTable<Row>
        columns={STACKED_COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        layout="stacked"
        onRowClick={onRowClick}
        rowActions={(row) => (
          <button type="button" aria-label={`Options for ${row.name}`} onClick={onActionClick}>
            …
          </button>
        )}
        ariaLabel="rows"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Options for TAJ-1' }))
    expect(onActionClick).toHaveBeenCalledTimes(1)
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('shows the empty state when data is empty', () => {
    render(<DataTable<Row> columns={STACKED_COLUMNS} data={[]} getRowId={(r) => r.id} layout="stacked" ariaLabel="rows" />)
    expect(screen.getByText('No rows')).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <DataTable<Row>
        columns={STACKED_COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        layout="stacked"
        isSelectable
        selectedIds={[]}
        onSelectionChange={() => {}}
        ariaLabel="rows"
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

/* ------------------------------------------------------------------ */
/* Column expansion (text-truncation.md §7) — double-tap (touch) /      */
/* click-to-expand + drag/keyboard-resize (web)                        */
/* ------------------------------------------------------------------ */

function ExpansionHarness({ initial = null as string | null }: { initial?: string | null } = {}) {
  const [expandedColumnKey, setExpandedColumnKey] = useState<string | null>(initial)
  return (
    <DataTable<Row>
      columns={SORTABLE_COLUMNS}
      data={DATA}
      getRowId={(r) => r.id}
      expandedColumnKey={expandedColumnKey}
      onExpandedColumnChange={setExpandedColumnKey}
      ariaLabel="rows"
    />
  )
}

describe('DataTable column expansion (§7)', () => {
  it('is a no-op when expandedColumnKey/onExpandedColumnChange are both omitted (mirrors selectedIds)', () => {
    render(<DataTable<Row> columns={SORTABLE_COLUMNS} data={DATA} getRowId={(r) => r.id} ariaLabel="rows" />)
    // Renders (and stays interactive) without either prop — clicking the
    // expand toggle throws nothing and changes nothing observable.
    fireEvent.click(screen.getByRole('button', { name: 'Expand Vehicle column' }))
    expect(screen.getByRole('columnheader', { name: 'Vehicle' })).toBeInTheDocument()
  })

  it('the header expand-toggle button (web) reports the column key, then null to collapse', () => {
    const onExpandedColumnChange = vi.fn()
    const { rerender } = render(
      <DataTable<Row>
        columns={SORTABLE_COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        expandedColumnKey={null}
        onExpandedColumnChange={onExpandedColumnChange}
        ariaLabel="rows"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Expand Vehicle column' }))
    expect(onExpandedColumnChange).toHaveBeenCalledWith('name')

    // Re-render as the (now) expanded state — button label flips to "Collapse".
    rerender(
      <DataTable<Row>
        columns={SORTABLE_COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        expandedColumnKey="name"
        onExpandedColumnChange={onExpandedColumnChange}
        ariaLabel="rows"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Vehicle column' }))
    expect(onExpandedColumnChange).toHaveBeenCalledWith(null)
  })

  it('expanding a column compresses every sibling to a floor width, table-layout: fixed, expanded column left unstyled', () => {
    const { container } = render(<ExpansionHarness initial="name" />)
    const table = container.querySelector('table')!
    expect(table.className).toContain('table-fixed')

    const headers = screen.getAllByRole('columnheader')
    const expandedHeader = headers.find((h) => h.getAttribute('aria-label') === 'Vehicle')!
    const siblingHeader = headers.find((h) => h.getAttribute('aria-label') === 'Speed')!
    // The expanded column carries NO explicit width — under table-layout:
    // fixed it receives 100% of whatever the explicit-width siblings leave
    // over, which is what avoids the table's own horizontal scroll (see
    // `useDataTableColumnExpansion`'s doc comment).
    expect(expandedHeader.getAttribute('style')).toBeFalsy()
    expect(siblingHeader).toHaveStyle({ width: '6rem' })
  })

  it('double-tap (touch) on a column header expands it; a second double-tap collapses it', () => {
    render(<ExpansionHarness />)
    const header = screen.getByRole('columnheader', { name: 'Vehicle' })

    fireEvent.pointerUp(header, { pointerType: 'touch' })
    fireEvent.pointerUp(header, { pointerType: 'touch' })
    expect(screen.getByRole('button', { name: 'Collapse Vehicle column' })).toBeInTheDocument()

    fireEvent.pointerUp(header, { pointerType: 'touch' })
    fireEvent.pointerUp(header, { pointerType: 'touch' })
    expect(screen.getByRole('button', { name: 'Expand Vehicle column' })).toBeInTheDocument()
  })

  it('a lone tap (no second tap within the window) does not expand', () => {
    render(<ExpansionHarness />)
    const header = screen.getByRole('columnheader', { name: 'Vehicle' })
    fireEvent.pointerUp(header, { pointerType: 'touch' })
    expect(screen.getByRole('button', { name: 'Expand Vehicle column' })).toBeInTheDocument()
  })

  it('a mouse double-click on the header/cells never expands — web uses the dedicated button only', () => {
    render(<ExpansionHarness />)
    const header = screen.getByRole('columnheader', { name: 'Vehicle' })
    fireEvent.pointerUp(header, { pointerType: 'mouse' })
    fireEvent.pointerUp(header, { pointerType: 'mouse' })
    expect(screen.getByRole('button', { name: 'Expand Vehicle column' })).toBeInTheDocument()
  })

  it('double-tap also works on a column\'s body cells, not just its header', () => {
    render(<ExpansionHarness />)
    const cell = screen.getByText('TAJ-1')
    fireEvent.pointerUp(cell, { pointerType: 'touch' })
    fireEvent.pointerUp(cell, { pointerType: 'touch' })
    expect(screen.getByRole('button', { name: 'Collapse Vehicle column' })).toBeInTheDocument()
  })

  it('a single tap on a DIFFERENT column while one is expanded collapses it immediately', () => {
    render(<ExpansionHarness initial="name" />)
    expect(screen.getByRole('button', { name: 'Collapse Vehicle column' })).toBeInTheDocument()

    const speedHeader = screen.getByRole('columnheader', { name: 'Speed' })
    fireEvent.pointerUp(speedHeader, { pointerType: 'touch' })

    expect(screen.getByRole('button', { name: 'Expand Vehicle column' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expand Speed column' })).toBeInTheDocument()
  })

  it('a resolved double-tap suppresses the resulting click — onRowClick does not also fire', () => {
    const onRowClick = vi.fn()
    function Harness() {
      const [expandedColumnKey, setExpandedColumnKey] = useState<string | null>(null)
      return (
        <DataTable<Row>
          columns={SORTABLE_COLUMNS}
          data={DATA}
          getRowId={(r) => r.id}
          expandedColumnKey={expandedColumnKey}
          onExpandedColumnChange={setExpandedColumnKey}
          onRowClick={onRowClick}
          ariaLabel="rows"
        />
      )
    }
    render(<Harness />)
    const cell = screen.getByText('TAJ-1')
    fireEvent.pointerUp(cell, { pointerType: 'touch' })
    fireEvent.pointerUp(cell, { pointerType: 'touch' })
    fireEvent.click(cell)
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('a resolved double-tap on a sortable header suppresses that click\'s sort-cycle', () => {
    const onSortChange = vi.fn()
    function Harness() {
      const [expandedColumnKey, setExpandedColumnKey] = useState<string | null>(null)
      return (
        <DataTable<Row>
          columns={SORTABLE_COLUMNS}
          data={DATA}
          getRowId={(r) => r.id}
          expandedColumnKey={expandedColumnKey}
          onExpandedColumnChange={setExpandedColumnKey}
          onSortChange={onSortChange}
          ariaLabel="rows"
        />
      )
    }
    render(<Harness />)
    const sortButton = screen.getByRole('button', { name: 'Vehicle' })
    fireEvent.pointerUp(sortButton, { pointerType: 'touch' })
    fireEvent.pointerUp(sortButton, { pointerType: 'touch' })
    fireEvent.click(sortButton)
    expect(onSortChange).not.toHaveBeenCalled()
  })

  it('has no axe violations with a column expanded', async () => {
    const { container } = render(<ExpansionHarness initial="name" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

/* ------------------------------------------------------------------ */
/* Column resize (§7's "fine-grained" pointer/keyboard control)         */
/* ------------------------------------------------------------------ */

describe('DataTable column resize (§7)', () => {
  it('renders a resize handle per column, hidden while a column is expanded', () => {
    const { rerender } = render(
      <DataTable<Row> columns={SORTABLE_COLUMNS} data={DATA} getRowId={(r) => r.id} ariaLabel="rows" />,
    )
    expect(screen.getAllByRole('separator')).toHaveLength(SORTABLE_COLUMNS.length)

    rerender(
      <DataTable<Row>
        columns={SORTABLE_COLUMNS}
        data={DATA}
        getRowId={(r) => r.id}
        expandedColumnKey="name"
        onExpandedColumnChange={() => {}}
        ariaLabel="rows"
      />,
    )
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
  })

  it('ArrowRight on the resize handle widens the column; ArrowLeft narrows it back', () => {
    render(<DataTable<Row> columns={SORTABLE_COLUMNS} data={DATA} getRowId={(r) => r.id} ariaLabel="rows" />)
    const handle = screen.getByRole('separator', { name: 'Resize Vehicle column' })
    const before = Number(handle.getAttribute('aria-valuenow'))

    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    const afterGrow = Number(screen.getByRole('separator', { name: 'Resize Vehicle column' }).getAttribute('aria-valuenow'))
    expect(afterGrow).toBeGreaterThan(before)

    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    const afterShrink = Number(screen.getByRole('separator', { name: 'Resize Vehicle column' }).getAttribute('aria-valuenow'))
    expect(afterShrink).toBeLessThan(afterGrow)
  })

  it('never resizes narrower than the minimum floor', () => {
    render(<DataTable<Row> columns={SORTABLE_COLUMNS} data={DATA} getRowId={(r) => r.id} ariaLabel="rows" />)
    const handle = screen.getByRole('separator', { name: 'Resize Vehicle column' })
    for (let i = 0; i < 20; i++) fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    const value = Number(screen.getByRole('separator', { name: 'Resize Vehicle column' }).getAttribute('aria-valuemin'))
    const now = Number(screen.getByRole('separator', { name: 'Resize Vehicle column' }).getAttribute('aria-valuenow'))
    expect(now).toBeGreaterThanOrEqual(value)
  })

  it('is keyboard-focusable (tabIndex=0) and exposes aria-valuenow/aria-valuemin (APG window-splitter)', () => {
    render(<DataTable<Row> columns={SORTABLE_COLUMNS} data={DATA} getRowId={(r) => r.id} ariaLabel="rows" />)
    const handle = screen.getByRole('separator', { name: 'Resize Vehicle column' })
    expect(handle).toHaveAttribute('tabindex', '0')
    expect(handle).toHaveAttribute('aria-orientation', 'vertical')
    expect(handle).toHaveAttribute('aria-valuenow')
    expect(handle).toHaveAttribute('aria-valuemin')
  })
})

/**
 * `disableResponsiveHide` — UX ruling A6 (run 2026-09-05), P0-1b: a table
 * that must never silently drop a column as its container narrows (C1: the
 * PM/pipelines list lost its own identity column with no scroller anywhere
 * on the page to bring it back). Width-parameterized per this run's DoD —
 * column COUNT must be asserted directly at a narrow width, not inferred
 * from "no overflow" (identical-looking to "content silently removed").
 *
 * Same local-fake-`ResizeObserver` technique `useDataTableResponsiveColumns.
 * test.ts` already documents: jsdom has no layout engine, so these tests
 * install a fake that captures the hook's callback and fire a controlled
 * `contentRect.width` at it.
 */
describe('DataTable — disableResponsiveHide (A6 / P0-1b)', () => {
  interface WideRow {
    id: string
    checkboxLike: string
    service: string
    odometer: number
    creationDate: string
  }

  const WIDE_COLUMNS: DataTableColumn<WideRow>[] = [
    { key: 'service', label: 'Service' }, // no contentType — the exact C1 defect shape
    { key: 'odometer', label: 'Current Odometer', contentType: 'fixed-content' },
    { key: 'creationDate', label: 'Creation Date', contentType: 'fixed-content' },
  ]
  const WIDE_DATA: WideRow[] = [
    { id: '1', checkboxLike: '', service: 'Oil Change', odometer: 114452, creationDate: '24 Apr 2026' },
  ]

  type ROCallback = (entries: Array<{ contentRect: { width: number } }>) => void

  function installFakeResizeObserver() {
    let callback: ROCallback | null = null
    class FakeResizeObserver {
      constructor(cb: ROCallback) {
        callback = cb
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    const original = globalThis.ResizeObserver
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver
    return {
      fire: (width: number) => callback?.([{ contentRect: { width } }]),
      restore: () => {
        globalThis.ResizeObserver = original
      },
    }
  }

  /*
   * Was 'a narrow container hides the unclassified column FIRST (reproduces
   * C1)'. Inverted on 2026-09-07: the first column is the row's IDENTITY
   * (the name/thumbnail cell every row is read by) and is now never
   * auto-hidden, whatever its `contentType`. The old expectation is exactly
   * the defect the narrow (~440px) hybrid list pane shipped — rows whose
   * naming column had been dropped, leaving a list of secondary values.
   */
  it('default (unset): a narrow container never hides the FIRST (identity) column', () => {
    const fake = installFakeResizeObserver()
    try {
      render(<DataTable<WideRow> columns={WIDE_COLUMNS} data={WIDE_DATA} getRowId={(r) => r.id} ariaLabel="rows" />)
      act(() => fake.fire(200)) // narrower than the 3 columns' combined floor
      expect(screen.getByRole('columnheader', { name: 'Service' })).toBeInTheDocument()
    } finally {
      fake.restore()
    }
  })

  /* The hide order itself is unchanged for every NON-leading column — an
   * unclassified column still gives way before a `fixed-content` one, it
   * just cannot be the identity column any more. */
  it('default (unset): a narrow container still hides an unclassified NON-leading column', () => {
    const columns: DataTableColumn<WideRow>[] = [
      { key: 'service', label: 'Service', contentType: 'fixed-content' },
      { key: 'checkboxLike', label: 'Notes' }, // no contentType — hides first
      { key: 'odometer', label: 'Current Odometer', contentType: 'fixed-content' },
    ]
    const fake = installFakeResizeObserver()
    try {
      render(<DataTable<WideRow> columns={columns} data={WIDE_DATA} getRowId={(r) => r.id} ariaLabel="rows" />)
      act(() => fake.fire(200))
      expect(screen.queryByRole('columnheader', { name: 'Notes' })).not.toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Service' })).toBeInTheDocument()
    } finally {
      fake.restore()
    }
  })

  it('disableResponsiveHide: the SAME narrow width keeps every column — count stays 3 at 1440 AND at a narrowed width', () => {
    const fake = installFakeResizeObserver()
    try {
      render(
        <DataTable<WideRow>
          columns={WIDE_COLUMNS}
          data={WIDE_DATA}
          getRowId={(r) => r.id}
          ariaLabel="rows"
          // The default `isCustomizable` pencil is its own trailing
          // `columnheader` — disabled here so the count asserted below is
          // exactly `WIDE_COLUMNS.length`, isolating the responsive-hide
          // behavior under test.
          isCustomizable={false}
          disableResponsiveHide
        />,
      )
      // Wide (1440-class) measurement — nothing would have hidden anyway.
      act(() => fake.fire(1440))
      expect(screen.getAllByRole('columnheader')).toHaveLength(WIDE_COLUMNS.length)
      // Narrowed (1280-class, and even narrower) — column count is UNCHANGED.
      act(() => fake.fire(200))
      expect(screen.getAllByRole('columnheader')).toHaveLength(WIDE_COLUMNS.length)
      expect(screen.getByRole('columnheader', { name: 'Service' })).toBeInTheDocument()
    } finally {
      fake.restore()
    }
  })
})
