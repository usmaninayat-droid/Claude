import { Info } from '@fams/ui-kit/icons'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { DisplayNameProvider, type EntityConfig, type EntityRecord } from '@fams/v5-composer'
import { ListView } from './ListView'
import { companiesConfig, companyRecords, dealsConfig, dealRecords } from './fixtures'

describe('ListView — blueprint-driven render (crm golden: companies)', () => {
  it('derives columns from the blueprint and renders cell values via FieldRegistry', () => {
    render(<ListView config={companiesConfig} records={companyRecords} />)
    // Column headers derived from listcolumns / systemcolumns names.
    expect(screen.getByRole('columnheader', { name: /Company/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Industry/i })).toBeInTheDocument()
    // A read-rendered cell value.
    expect(screen.getByText('Northwind Traders')).toBeInTheDocument()
    expect(screen.getByText('Logistics')).toBeInTheDocument()
  })

  it('commits an inline edit through onRecordChange on double-click + Enter', () => {
    const onRecordChange = vi.fn()
    render(
      <ListView
        config={companiesConfig}
        records={[companyRecords[0]]}
        editableCols={['systemcol1']}
        onRecordChange={onRecordChange}
      />,
    )
    fireEvent.doubleClick(screen.getByText('Logistics'))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Retail' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onRecordChange).toHaveBeenCalledWith('systemcol1', 'Retail', companyRecords[0])
  })

  it('cancels an inline edit on Escape without committing', () => {
    const onRecordChange = vi.fn()
    render(
      <ListView
        config={companiesConfig}
        records={[companyRecords[0]]}
        editableCols={['systemcol1']}
        onRecordChange={onRecordChange}
      />,
    )
    fireEvent.doubleClick(screen.getByText('Logistics'))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Retail' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    // The editor closes back to the read presentation…
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('Logistics')).toBeInTheDocument()
    // …and the edit was never committed.
    expect(onRecordChange).not.toHaveBeenCalled()
  })

  it('does not enter edit mode for a non-editable column', () => {
    render(<ListView config={companiesConfig} records={[companyRecords[0]]} onRecordChange={() => {}} />)
    fireEvent.doubleClick(screen.getByText('Logistics'))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('shows skeleton rows while loading', () => {
    const { container } = render(<ListView config={companiesConfig} records={[]} loading />)
    expect(container.querySelector('[data-slot="list-view-skeleton"]')).toBeInTheDocument()
  })

  it('renders the empty state when there are no records', () => {
    render(<ListView config={companiesConfig} records={[]} />)
    expect(screen.getByText('No records yet')).toBeInTheDocument()
  })

  // UX J.57: the list used to show ONE copy with no action for all three
  // causes, so a mistyped search claimed the module was empty.
  it('distinguishes filtered-to-zero from no-data and offers Clear filters', () => {
    const onClearFilters = vi.fn()
    render(<ListView config={companiesConfig} records={[]} isFiltered onClearFilters={onClearFilters} />)
    expect(screen.getByText('No records match your filters')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onClearFilters).toHaveBeenCalled()
  })

  it('renders the error cause with Retry', () => {
    render(<ListView config={companiesConfig} records={[]} error="Request failed (503)." onRetry={() => {}} />)
    expect(screen.getByText("Couldn't load records")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('shows a load-more affordance and reports intent', () => {
    const onLoadMore = vi.fn()
    render(<ListView config={companiesConfig} records={companyRecords} hasMore onLoadMore={onLoadMore} />)
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('restricts + orders the rendered columns via `visibleCols`', () => {
    render(<ListView config={companiesConfig} records={companyRecords} visibleCols={['status', 'title']} />)
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual(['Status', 'Company'])
  })

  it('renders every derived column when `visibleCols` is omitted', () => {
    render(<ListView config={companiesConfig} records={companyRecords} />)
    expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(2)
  })

  it('fires onRowClick with the record', () => {
    const onRowClick = vi.fn()
    render(<ListView config={companiesConfig} records={[companyRecords[0]]} onRowClick={onRowClick} />)
    fireEvent.click(screen.getByText('Northwind Traders'))
    expect(onRowClick).toHaveBeenCalledWith(companyRecords[0])
  })
})

describe('ListView — figma-spec-list.md parity (crm golden: deals)', () => {
  it('renders the status column as a solid StatusPill colored from uiConfig.statusList', () => {
    render(<ListView config={dealsConfig} records={dealRecords.filter((r) => r.id === 'D-104')} />)
    const pill = screen.getByText('Proposal')
    expect(pill).toHaveAttribute('data-slot', 'status-pill')
    expect(pill).toHaveStyle({ backgroundColor: '#f79009' })
  })

  it('the row-level STATUS pill renders ALL-CAPS via CSS transform, with the DOM text left sentence case (UX ruling A7, W9/C9 — supersedes round-2 design QA\'s normal-case override)', () => {
    render(<ListView config={dealsConfig} records={dealRecords.filter((r) => r.id === 'D-104')} />)
    const pill = screen.getByText('Proposal')
    // The DOM text/accessible name stays exactly as authored…
    expect(pill).toHaveTextContent('Proposal')
    // …while the visual transform is CSS-only (StatusPill's own base class),
    // never a `normal-case` override defeating it.
    expect(pill).toHaveClass('uppercase')
    expect(pill).not.toHaveClass('normal-case')
  })

  it('falls back to the field registry (no StatusPill) when the status column is itself editable', () => {
    const { container } = render(
      <ListView
        config={dealsConfig}
        records={dealRecords.filter((r) => r.id === 'D-104')}
        editableCols={['status']}
      />,
    )
    expect(container.querySelector('[data-slot="status-pill"]')).not.toBeInTheDocument()
  })

  it('renders a stat-card row above the table from summaryTiles', () => {
    render(
      <ListView
        config={dealsConfig}
        records={dealRecords}
        summaryTiles={[{ id: 'active', label: 'Active Deals', value: '18', icon: Info, tone: 'info' }]}
      />,
    )
    const summary = document.querySelector('[data-slot="list-view-summary"]')
    expect(summary).toBeInTheDocument()
    expect(within(summary as HTMLElement).getByText('18')).toBeInTheDocument()
    expect(within(summary as HTMLElement).getByText('Active Deals')).toBeInTheDocument()
  })

  it('renders no stat-card row when summaryTiles is omitted', () => {
    render(<ListView config={dealsConfig} records={dealRecords} />)
    expect(document.querySelector('[data-slot="list-view-summary"]')).not.toBeInTheDocument()
  })

  it('groups by a column, drops it from row cells, and shows a colored group header + count', () => {
    render(<ListView config={dealsConfig} records={dealRecords} groupByCol="status" />)
    // The status column itself is gone from the header row…
    expect(screen.queryByRole('columnheader', { name: /^Stage$/i })).not.toBeInTheDocument()
    // …but each stage renders once as a group header, carrying its blueprint color + row count.
    const header = screen.getByRole('button', { name: /Proposal/ })
    expect(within(header).getByText('Proposal')).toHaveAttribute('data-slot', 'status-pill')
    expect(within(header).getByText('2')).toBeInTheDocument() // D-104, D-105
  })

  /*
   * D-3 / group-header label resolution + glyph. The seam is SHARED, so every
   * test below pins the UNCHANGED half as hard as the new half: the filters
   * family shipped a HIGH-severity bug of exactly this shape (a config-driven
   * change that silently altered another module's default).
   */
  describe('group headers — reference labels + curated glyph (shared seam)', () => {
    /** `systemcol3` is the golden blueprint's SingleReference ("Company"). */
    const withGroupByIcon = (entries: { col: string; label?: string; icon?: string }[]): EntityConfig => ({
      ...dealsConfig,
      uiConfig: { ...dealsConfig.uiConfig, groupByOptions: entries },
    })

    it('REGRESSION: an ungrouped list renders no group-header rows at all', () => {
      // `/pipelines` and `/workforce` open ungrouped; the round-1 gate measured
      // zero group-header nodes on both. Nothing in this seam may change that.
      const { container, rerender } = render(<ListView config={dealsConfig} records={dealRecords} />)
      expect(container.querySelectorAll('[data-slot="data-table-group-header-row"]')).toHaveLength(0)
      // …and still none when the blueprint DOES curate a group-by with a glyph,
      // as long as no grouping is active.
      rerender(
        <ListView
          config={withGroupByIcon([{ col: 'systemcol3', label: 'Company', icon: 'car' }])}
          records={dealRecords}
        />,
      )
      expect(container.querySelectorAll('[data-slot="data-table-group-header-row"]')).toHaveLength(0)
    })

    it('REGRESSION: a non-reference grouping (status) renders exactly as before', () => {
      // Curating a glyph on the VEHICLE-shaped entry must not leak onto the
      // status headers, and status keeps its pill, not a resolved label.
      render(
        <ListView
          config={withGroupByIcon([{ col: 'systemcol3', icon: 'car' }, { col: 'status', label: 'Stage' }])}
          records={dealRecords}
          groupByCol="status"
        />,
      )
      const header = screen.getByRole('button', { name: /Proposal/ })
      expect(within(header).getByText('Proposal')).toHaveAttribute('data-slot', 'status-pill')
      expect(header.querySelectorAll('svg')).toHaveLength(1) // the chevron only
    })

    it('REGRESSION: a reference grouping with no directory injected keeps the raw key', () => {
      render(<ListView config={dealsConfig} records={dealRecords} groupByCol="systemcol3" />)
      expect(screen.getByRole('button', { name: /Globex Corp/ })).toBeInTheDocument()
    })

    it('resolves a reference grouping key through the app display-name directory', () => {
      render(
        <DisplayNameProvider resolve={(id) => (id === 'Globex Corp' ? 'Globex Corporation' : undefined)}>
          <ListView config={dealsConfig} records={dealRecords} groupByCol="systemcol3" />
        </DisplayNameProvider>,
      )
      expect(screen.getByRole('button', { name: /Globex Corporation/ })).toBeInTheDocument()
      // An id the directory cannot resolve degrades to the raw key, never blank.
      expect(screen.getByRole('button', { name: /Initech/ })).toBeInTheDocument()
    })

    it('draws the curated glyph on the ACTIVE grouping only, and none when unauthored', () => {
      const { rerender } = render(
        <ListView
          config={withGroupByIcon([{ col: 'systemcol3', label: 'Company', icon: 'car' }])}
          records={dealRecords}
          groupByCol="systemcol3"
        />,
      )
      // chevron + the authored glyph
      expect(screen.getByRole('button', { name: /Globex Corp/ }).querySelectorAll('svg')).toHaveLength(2)
      rerender(
        <ListView
          config={withGroupByIcon([{ col: 'systemcol3', label: 'Company' }])}
          records={dealRecords}
          groupByCol="systemcol3"
        />,
      )
      expect(screen.getByRole('button', { name: /Globex Corp/ }).querySelectorAll('svg')).toHaveLength(1)
    })
  })

  it('reorders columns only while grouped, via groupedColumnOrder', () => {
    const { rerender } = render(<ListView config={dealsConfig} records={dealRecords} />)
    const flatHeaders = screen.getAllByRole('columnheader').map((h) => h.textContent)
    rerender(
      <ListView
        config={dealsConfig}
        records={dealRecords}
        groupByCol="status"
        groupedColumnOrder={['systemcol3']}
      />,
    )
    const groupedHeaders = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(groupedHeaders[0]).toBe('Company')
    expect(groupedHeaders).not.toEqual(flatHeaders)
  })

  it('shows a checkbox selection column when selectable, uncontrolled by default', () => {
    render(<ListView config={dealsConfig} records={dealRecords} selectable />)
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(1)
  })

  it('renders no checkbox column by default', () => {
    render(<ListView config={dealsConfig} records={dealRecords} />)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('lets a host replace one column\'s READ cell via cellOverrides, leaving the rest derived', () => {
    render(
      <ListView
        config={companiesConfig}
        records={companyRecords}
        cellOverrides={{ title: (row) => <span data-testid="custom-cell">★ {String(row.title)}</span> }}
      />,
    )
    expect(screen.getAllByTestId('custom-cell')[0]).toHaveTextContent('★ Northwind Traders')
    // Non-overridden columns keep the derived renderer.
    expect(screen.getByText('Logistics')).toBeInTheDocument()
  })

  it('cellOverrides never shadow an EDITABLE column (the edit affordance wins)', () => {
    render(
      <ListView
        config={companiesConfig}
        records={companyRecords}
        editableCols={['title']}
        cellOverrides={{ title: () => <span data-testid="custom-cell">nope</span> }}
      />,
    )
    expect(screen.queryByTestId('custom-cell')).not.toBeInTheDocument()
    expect(screen.getByText('Northwind Traders')).toBeInTheDocument()
  })

  it('renders the trailing header-only pencil affordance when headerAction is given', () => {
    const onClick = vi.fn()
    render(<ListView config={dealsConfig} records={dealRecords} headerAction={{ onClick }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit columns' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

/**
 * `disableColumnAutoHide` — UX ruling A6 (run 2026-09-05, W9/P0-1b): the
 * standard module list body must never silently drop a column as its
 * container narrows. Width-parameterized per this run's DoD (column COUNT
 * asserted directly, not inferred from "no overflow" — identical-looking to
 * "content silently removed"). Same local-fake-`ResizeObserver` technique
 * `useDataTableResponsiveColumns.test.ts`/`DataTable.test.tsx` already use.
 */
describe('ListView — disableColumnAutoHide (A6 / P0-1b)', () => {
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

  it('default (unset): a narrow container hides columns (unchanged pre-existing behavior)', () => {
    const fake = installFakeResizeObserver()
    try {
      render(<ListView config={companiesConfig} records={companyRecords} />)
      const before = screen.getAllByRole('columnheader').length
      act(() => fake.fire(120))
      expect(screen.getAllByRole('columnheader').length).toBeLessThan(before)
    } finally {
      fake.restore()
    }
  })

  it('disableColumnAutoHide: column count stays IDENTICAL at 1440 and at a narrowed (1280-class) width', () => {
    const fake = installFakeResizeObserver()
    try {
      render(<ListView config={companiesConfig} records={companyRecords} disableColumnAutoHide />)
      act(() => fake.fire(1440))
      const wide = screen.getAllByRole('columnheader').length
      act(() => fake.fire(120))
      expect(screen.getAllByRole('columnheader').length).toBe(wide)
    } finally {
      fake.restore()
    }
  })
})

/**
 * `totalCount`'s summary line — UX ruling A4 (run 2026-09-05, W9): render
 * only when narrowed, with a working "Clear filters", height reserved either
 * way. Fixes C5's "Showing 24 of 24 rules" tautology (also cited on the
 * pipelines/asset lists — all three share this ONE implementation).
 */
describe('ListView — totalCount summary line (A4 / C5)', () => {
  it('renders EMPTY at rest (shown === total) — matches Figma, no tautology', () => {
    const { container } = render(
      <ListView config={companiesConfig} records={companyRecords} totalCount={companyRecords.length} />,
    )
    const row = container.querySelector('[data-slot="list-count-row"]')!
    expect(row).toBeInTheDocument()
    expect(row).toHaveTextContent('')
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
  })

  it('renders "Showing N of M" + a working Clear filters once narrowed (shown < total)', () => {
    const onClearFilters = vi.fn()
    const { container } = render(
      <ListView
        config={companiesConfig}
        records={[companyRecords[0]]}
        totalCount={companyRecords.length}
        onClearFilters={onClearFilters}
      />,
    )
    const row = container.querySelector('[data-slot="list-count-row"]')!
    expect(row).toHaveTextContent(`Showing 1 of ${companyRecords.length}`)
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onClearFilters).toHaveBeenCalledTimes(1)
  })

  it('collapses to zero height at rest and expands when narrowed', () => {
    // Prior contract reserved 20px permanently via `min-h-5`; the current
    // shell no longer does — an empty count row would otherwise plant a
    // permanent dead band between the filters row and the first content
    // (the user complaint that drove this change). The `<p>` still mounts
    // (aria-live needs a stable host for narrowing announcements) but its
    // height comes from its own text, and it hides via `empty:hidden` when
    // the ternary renders `null`.
    const { container: atRest } = render(
      <ListView config={companiesConfig} records={companyRecords} totalCount={companyRecords.length} />,
    )
    const { container: narrowed } = render(
      <ListView config={companiesConfig} records={[companyRecords[0]]} totalCount={companyRecords.length} />,
    )
    const restRow = atRest.querySelector('[data-slot="list-count-row"]')!
    const narrowedRow = narrowed.querySelector('[data-slot="list-count-row"]')!
    expect(restRow.className).toContain('empty:hidden')
    expect(narrowedRow.textContent).toContain('Showing')
  })

  it('omits the row entirely when totalCount is not provided (unchanged default)', () => {
    const { container } = render(<ListView config={companiesConfig} records={companyRecords} />)
    expect(container.querySelector('[data-slot="list-count-row"]')).not.toBeInTheDocument()
  })
})

/**
 * fix7 (run-2026-09-05, P1-a) regression pairing — this exact pairing broke
 * TWICE this run (fix1 dropped the board's own countdown renderer, fix5 then
 * dropped the LIST's `TimeRemainingView` override for EVERY row rather than
 * only the terminal ones, so a genuinely-late, non-terminal job order lost
 * its lateness cue on the list surface while the board still flagged it red).
 *
 * The fix is a `listcolumns` placement pointing Due Date at the SAME
 * `FlagToneDateView` mechanism the kanban card's footer due-date already
 * uses (both read the one `systemcol32` "Overdue" flag column — never a
 * second lateness calculation derived from the date itself, which is what
 * let a COMPLETED record read as overdue in the first place, UX-NOTES A8).
 * This fixture mirrors that exact blueprint shape so a future edit that
 * silently drops the list placement (as fix5 did) fails a test, not just a
 * manual QA pass.
 *
 * **What this test actually pins (corrected 2026-09-06, fix8 review F2):**
 * `FlagToneDateView`/`ReadFlagToneDate` reads ONLY `flagCol` (`systemcol32`)
 * — never `status` — so the two fixtures below differ only in `systemcol32`
 * and `status` is inert to the assertions here. This is a RENDERER-CONTRACT
 * test: "flag column set → destructive cue; flag column unset → default
 * foreground," on the list's `FlagToneDateView` placement specifically. It
 * does NOT pin — and previously wrongly claimed to pin — the actual product
 * invariant that broke twice this cycle: "no record that is in a terminal
 * status is ever ALSO flagged Overdue in `systemcol32`." That invariant is a
 * property of demo metadata (which rows get `systemcol32: 'Overdue'`), not
 * of this renderer, and nothing in this package can enforce it — a blueprint
 * or a seed can set both `status: 'completed'` and `systemcol32: 'Overdue'`
 * on the same row and this test would stay green. The real enforcement is a
 * `demo check` rule in `fams-v5-demo-environment` —
 * `tools/lib/overdue-terminal.mjs`, step 5b — asserting that invariant
 * directly over the seed data. It derives "terminal" from the absence of
 * an outgoing `statusChangeRule` entry and the flag pair from the
 * blueprint's own `FlagToneDateView` placements, so it carries no
 * job-order vocabulary.
 */
describe('ListView — FlagToneDateView renderer contract: cue tracks flagCol only, not status (fix7, P1-a)', () => {
  const overdueListConfig = {
    code: 'jo-overdue-fixture',
    name: 'Job Orders (fixture)',
    systemcolumns: [
      { id: 'fld_uid', col: 'uniqueidentifier', name: 'Job Order ID', type: 'Auto' },
      { id: 'fld_due', col: 'systemcol3', name: 'Due Date', type: 'Date' },
      { id: 'fld_overdue', col: 'systemcol32', name: 'Overdue', type: 'SingleSelect', listValues: ['Overdue'] },
      { id: 'fld_status', col: 'status', name: 'Status', type: 'SingleSelect', listValues: ['scheduled', 'completed'] },
    ],
    uiConfig: { statusList: [] },
    listcolumns: [
      { id: 'fld_uid', col: 'uniqueidentifier' },
      {
        id: 'fld_due',
        col: 'systemcol3',
        name: 'Due Date',
        component: {
          name: 'FlagToneDateView',
          props: { flagCol: 'systemcol32', flagValue: 'Overdue', tone: 'danger' },
        },
      },
    ],
  } as unknown as EntityConfig

  const lateRecord = {
    id: 'r-jo-1003',
    uniqueidentifier: 'JO-1003',
    systemcol3: '2026-08-28',
    systemcol32: 'Overdue',
    status: 'scheduled',
  } as unknown as EntityRecord

  const completedRecord = {
    id: 'r-jo-1009',
    uniqueidentifier: 'JO-1009',
    systemcol3: '2026-08-15',
    systemcol32: '',
    status: 'completed',
  } as unknown as EntityRecord

  /**
   * The element that carries the TONE, which since fix10 (round-11 P1-11a) is
   * no longer the same element that carries the text. `ReadFlagToneDate` now
   * nests the date in its own `truncate` span so an ellipsis can paint when a
   * narrow card clips it, and the tone class stays on the icon+text container
   * — where it belongs, since the calendar glyph is toned too, and CSS `color`
   * inherits down to the text either way. `getByText` returns the innermost
   * match, so it must be walked up to the toned box; asserting on the text
   * node's own class would now check the wrong element and pass or fail for
   * reasons unrelated to the tone.
   */
  const toneBoxFor = (text: string): HTMLElement => {
    const leaf = screen.getByText(text)
    return (leaf.closest('span[class*="text-"]:not(.truncate)') as HTMLElement | null) ?? leaf
  }

  it('renders the destructive lateness cue on the list when systemcol32 is flagged Overdue', () => {
    render(<ListView config={overdueListConfig} records={[lateRecord, completedRecord]} />)
    const dueCell = toneBoxFor('28 Aug, 2026')
    expect(dueCell.className).toContain('text-destructive-emphasis')
  })

  // The fixture's `status: 'completed'` is deliberately inert here — this
  // renderer never reads it, so this case proves nothing about
  // terminal-vs-overdue. That invariant is enforced in the demo repo by
  // `tools/lib/overdue-terminal.mjs`, wired into `pnpm demo check` (step 5b).
  it('renders the default (non-destructive) foreground on the list when systemcol32 is unset', () => {
    render(<ListView config={overdueListConfig} records={[lateRecord, completedRecord]} />)
    const dueCell = toneBoxFor('15 Aug, 2026')
    expect(dueCell.className).not.toContain('text-destructive-emphasis')
    expect(dueCell.className).not.toContain('text-destructive')
    expect(dueCell.className).toContain('text-foreground')
  })
})
