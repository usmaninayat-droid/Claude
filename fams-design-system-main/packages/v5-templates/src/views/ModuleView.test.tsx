import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { ModuleView } from './ModuleView'
import { InMemorySavedViewsAdapter } from './saved-views'
import { dealsConfig, dealRecords, companiesConfig, companyRecords } from './fixtures'
import { calendarConfig, calendarRecords, CALENDAR_TODAY } from './calendar/fixtures'

/** A minimal config with no `SingleSelect` field at all — every crm-golden fixture module has a `status` field, so a groupable-field-free config has to be hand-built for the "no group-by control" case. */
const noGroupableFieldConfig: EntityConfig = {
  code: 'notes',
  name: 'Notes',
  systemcolumns: [{ col: 'title', name: 'Title', type: 'SmallText' }],
  uiConfig: { statusList: [] },
  listcolumns: [{ col: 'title' }],
}
const noGroupableFieldRecords: EntityRecord[] = [{ id: 'n1', title: 'A note' }]

const ctx = { userId: 'u1', moduleId: 'deals' }

// base-ui tabs activate on mouseDown, not the synthetic click alone.
function clickTab(el: HTMLElement) {
  fireEvent.mouseDown(el, { button: 0 })
  fireEvent.click(el)
}

describe('ModuleView — blueprint-driven container (crm golden)', () => {
  it('renders a tab per blueprint view kind and the active body (deals → kanban)', () => {
    render(<ModuleView config={dealsConfig} records={dealRecords} views={['kanban', 'list']} context={ctx} />)
    expect(screen.getByRole('tab', { name: 'Kanban View' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'List View' })).toBeInTheDocument()
    // Default active view is the kanban board — a stage lane is present.
    // Addressed as the lane HEADING: a card's status chip now renders the same
    // label too (see KanbanView.test.tsx's note on the fix7 enum-label fix).
    expect(screen.getByRole('heading', { name: 'Proposal' })).toBeInTheDocument()
    expect(screen.getByText('Hooli — Enterprise rollout')).toBeInTheDocument()
  })

  it('resolves the `calendar` view kind to the real calendar body (was a placeholder)', () => {
    vi.setSystemTime(CALENDAR_TODAY)
    render(
      <ModuleView
        config={calendarConfig}
        records={calendarRecords}
        views={['calendar', 'list']}
        context={{ userId: 'u1', moduleId: 'work-items' }}
      />,
    )
    expect(screen.getByRole('tab', { name: 'Calendar View' })).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: 'Month grid' })).toBeInTheDocument()
    // The status legend is present too — at jsdom's default 1024 width it is
    // the collapsed `Status · N` container (UX I.54.4), same fieldset inside.
    expect(screen.getByRole('button', { name: /Status · 4/ })).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('switches to the list body when the List tab is selected', () => {
    render(<ModuleView config={dealsConfig} records={dealRecords} views={['kanban', 'list']} context={ctx} />)
    clickTab(screen.getByRole('tab', { name: 'List View' }))
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('renders the companies module as a list', () => {
    render(
      <ModuleView
        config={companiesConfig}
        records={companyRecords}
        views={['list']}
        context={{ userId: 'u1', moduleId: 'companies' }}
      />,
    )
    expect(screen.getByRole('columnheader', { name: /Company/i })).toBeInTheDocument()
    expect(screen.getByText('Globex Corp')).toBeInTheDocument()
  })

  it('filters records by the free-text search box', () => {
    render(
      <ModuleView
        config={companiesConfig}
        records={companyRecords}
        views={['list']}
        context={{ userId: 'u1', moduleId: 'companies' }}
      />,
    )
    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'Northwind' } })
    expect(screen.getByText('Northwind Traders')).toBeInTheDocument()
    expect(screen.queryByText('Globex Corp')).not.toBeInTheDocument()
  })

  it('defaults the search placeholder to "Search {singular module label}" when the blueprint sets none', () => {
    render(
      <ModuleView
        config={companiesConfig}
        records={companyRecords}
        views={['list']}
        context={{ userId: 'u1', moduleId: 'companies' }}
      />,
    )
    // `companiesConfig.name` is "Companies" (plural) → singularizes to "Company".
    expect(screen.getByPlaceholderText('Search Company')).toBeInTheDocument()
  })

  it('singularizes a plain trailing-s module name ("Tickets" → "Ticket")', () => {
    const config: EntityConfig = {
      code: 'tickets',
      name: 'Tickets',
      systemcolumns: [{ col: 'title', name: 'Title', type: 'SmallText' }],
      uiConfig: { statusList: [] },
      listcolumns: [{ col: 'title' }],
    }
    render(<ModuleView config={config} records={[{ id: 't1', title: 'A ticket' }]} views={['list']} context={{ userId: 'u1', moduleId: 'tickets' }} />)
    expect(screen.getByPlaceholderText('Search Ticket')).toBeInTheDocument()
  })

  it('leaves a module name ending in "ss" unchanged (no false-positive plural strip)', () => {
    const config: EntityConfig = {
      code: 'access',
      name: 'Access',
      systemcolumns: [{ col: 'title', name: 'Title', type: 'SmallText' }],
      uiConfig: { statusList: [] },
      listcolumns: [{ col: 'title' }],
    }
    render(<ModuleView config={config} records={[{ id: 'a1', title: 'A record' }]} views={['list']} context={{ userId: 'u1', moduleId: 'access' }} />)
    expect(screen.getByPlaceholderText('Search Access')).toBeInTheDocument()
  })

  it('honors an explicit uiConfig.search.placeholder over the generic default', () => {
    const config: EntityConfig = {
      ...companiesConfig,
      uiConfig: { ...companiesConfig.uiConfig, search: { columns: ['title'], placeholder: 'Search Ticket' } },
    }
    render(
      <ModuleView config={config} records={companyRecords} views={['list']} context={{ userId: 'u1', moduleId: 'companies' }} />,
    )
    expect(screen.getByPlaceholderText('Search Ticket')).toBeInTheDocument()
  })

  it('creates (via the picker takeover) and deletes a saved view through the adapter (round-trip)', async () => {
    const adapter = new InMemorySavedViewsAdapter()
    render(
      <ModuleView
        config={companiesConfig}
        records={companyRecords}
        views={['list']}
        savedViews={adapter}
        context={{ userId: 'u1', moduleId: 'companies' }}
      />,
    )

    // "+" opens the Select Preferred View takeover, not an instant create.
    fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create Only' }))
    // Default name = "<Type> View", de-duplicated against the system tab.
    await screen.findByRole('tab', { name: 'List View 2' })
    // Persisted through the adapter.
    await waitFor(() =>
      expect(adapter.list({ userId: 'u1', moduleId: 'companies' })).toHaveLength(1),
    )

    // Delete the (non-system) active saved view.
    fireEvent.keyDown(screen.getByRole('button', { name: 'Delete view' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete view' }))
    await waitFor(() =>
      expect(adapter.list({ userId: 'u1', moduleId: 'companies' })).toHaveLength(0),
    )
    expect(screen.queryByRole('tab', { name: 'List View 2' })).not.toBeInTheDocument()
  })

  it('shows the "+" add-view tab even with no savedViews adapter (figma-spec-kanban.md §1 — round-1 QA #8: the affordance must not require persistence to appear)', async () => {
    render(
      <ModuleView
        config={companiesConfig}
        records={companyRecords}
        views={['list']}
        context={{ userId: 'u1', moduleId: 'companies' }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create Only' }))
    expect(await screen.findByRole('tab', { name: 'List View 2' })).toBeInTheDocument()
  })

  it('renders a blueprint filter facet and narrows the list when a value is picked (app-shell spec: toolbar facets)', () => {
    render(
      <ModuleView
        config={companiesConfig}
        records={companyRecords}
        views={['list']}
        context={{ userId: 'u1', moduleId: 'companies' }}
      />,
    )
    // Every blueprint filter facet lives behind the single toolbar Filter button
    // (figma-spec-kanban.md §4.1) — open it, then check the "status" facet's
    // option. The DropdownMenuTrigger is a Radix trigger, which opens on
    // pointerdown, not the synthetic click alone — same `keyDown Enter`
    // workaround as `ModuleViewShell.test.tsx`'s "Delete view" trigger.
    fireEvent.keyDown(screen.getByRole('button', { name: 'Filter' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Prospect' }))
    // Only Prospect companies remain (Globex, Soylent); a Customer drops out.
    expect(screen.getByText('Globex Corp')).toBeInTheDocument()
    expect(screen.queryByText('Northwind Traders')).not.toBeInTheDocument()
  })

  it('emits serializable view state on change', () => {
    const onStateChange = vi.fn()
    render(
      <ModuleView
        config={companiesConfig}
        records={companyRecords}
        views={['list']}
        context={{ userId: 'u1', moduleId: 'companies' }}
        onStateChange={onStateChange}
      />,
    )
    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'x' } })
    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ search: 'x' }))
  })

  it('emits onStateChange with the new viewId when a view tab is switched', () => {
    const onStateChange = vi.fn()
    render(
      <ModuleView
        config={dealsConfig}
        records={dealRecords}
        views={['kanban', 'list']}
        context={ctx}
        onStateChange={onStateChange}
      />,
    )
    clickTab(screen.getByRole('tab', { name: 'List View' }))
    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ viewId: 'sys-list' }))
  })

  it('the activeViewId prop controls which tab is active', () => {
    render(
      <ModuleView
        config={dealsConfig}
        records={dealRecords}
        views={['kanban', 'list']}
        context={ctx}
        activeViewId="sys-list"
      />,
    )
    expect(screen.getByRole('tab', { name: 'List View' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('restores the active view from a persisted ViewState.viewId', () => {
    const persisted = { viewId: 'sys-list', search: '' }
    render(
      <ModuleView
        config={dealsConfig}
        records={dealRecords}
        views={['kanban', 'list']}
        context={ctx}
        activeViewId={persisted.viewId}
      />,
    )
    expect(screen.getByRole('tab', { name: 'List View' })).toHaveAttribute('aria-selected', 'true')
    // The list body renders a real `<table>` — proof the kanban board
    // (which has no table semantics) isn't what's mounted. (The list's own
    // STATUS column also legitimately shows "Proposal" now, via the same
    // blueprint-driven `StatusPill` kanban's lane header uses — so that text
    // is no longer a useful "kanban vs list" discriminator on its own.)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})

describe('ModuleView — onCreateRecord (zero-boilerplate create hook, bespoke path)', () => {
  it('renders no create button when neither actions nor onCreateRecord is given', () => {
    render(<ModuleView config={companiesConfig} records={companyRecords} views={['list']} context={ctx} />)
    expect(screen.queryByRole('button', { name: 'Create New' })).not.toBeInTheDocument()
  })

  it('renders a default "Create New" button that fires onCreateRecord', () => {
    const onCreateRecord = vi.fn()
    render(
      <ModuleView
        config={companiesConfig}
        records={companyRecords}
        views={['list']}
        context={ctx}
        onCreateRecord={onCreateRecord}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create New' }))
    expect(onCreateRecord).toHaveBeenCalledTimes(1)
  })

  it('the create button label never collapses at 1280px (C2/A3 fix, W9/P0-2)', () => {
    // Layout itself is not observable in jsdom (see `dashboard-fixes5.test.
    // tsx`'s header comment for the established convention) — what this
    // locks is the MARKUP CONTRACT that makes the visual collapse possible:
    // the label's `max-[<N>rem]:sr-only` breakpoint must sit BELOW 1280px,
    // never at or above it. Baseline had it at 1300px (`81.25rem`), which
    // swallowed the label at exactly the measured 1280px viewport.
    render(
      <ModuleView
        config={companiesConfig}
        records={companyRecords}
        views={['list']}
        context={ctx}
        onCreateRecord={() => {}}
      />,
    )
    const label = screen.getByText('Create New')
    const match = /max-\[([\d.]+)rem\]:sr-only/.exec(label.className)
    expect(match).not.toBeNull()
    const thresholdPx = Number(match![1]) * 16
    expect(thresholdPx).toBeLessThan(1280)
  })

  it('honors a custom createLabel', () => {
    render(
      <ModuleView
        config={companiesConfig}
        records={companyRecords}
        views={['list']}
        context={ctx}
        onCreateRecord={() => {}}
        createLabel="Create New Ticket"
      />,
    )
    expect(screen.getByRole('button', { name: 'Create New Ticket' })).toBeInTheDocument()
  })

  it('an explicit actions slot wins over onCreateRecord', () => {
    render(
      <ModuleView
        config={companiesConfig}
        records={companyRecords}
        views={['list']}
        context={ctx}
        onCreateRecord={() => {}}
        actions={<button type="button">Custom action</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Custom action' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create New' })).not.toBeInTheDocument()
  })
})

describe('ModuleView — figma-spec-list.md group-by + summary tiles', () => {
  it('auto-derives a group-by dropdown from SingleSelect listcolumns fields, shown only for the list view', () => {
    render(<ModuleView config={dealsConfig} records={dealRecords} views={['list']} context={ctx} />)
    expect(screen.getByRole('button', { name: 'Group by' })).toBeInTheDocument()
  })

  it('omits the group-by control for a module with no groupable field', () => {
    render(
      <ModuleView
        config={noGroupableFieldConfig}
        records={noGroupableFieldRecords}
        views={['list']}
        context={ctx}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Group by' })).not.toBeInTheDocument()
  })

  it('omits the group-by control on the kanban view (list-only per spec)', () => {
    render(
      <ModuleView config={dealsConfig} records={dealRecords} views={['kanban', 'list']} context={ctx} />,
    )
    expect(screen.queryByRole('button', { name: 'Group by' })).not.toBeInTheDocument()
  })

  it('picking a group-by option groups the list table by that column', () => {
    render(<ModuleView config={dealsConfig} records={dealRecords} views={['list']} context={ctx} />)
    // 2026-08-31 pipeline-actions spec: the Group By popup is a radio
    // POPOVER (click-to-open), not a DropdownMenu.
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Stage' }))
    expect(screen.getByRole('button', { name: /Proposal/ })).toBeInTheDocument()
  })

  /*
   * FIX WAVE D-2 — the `grouped-list` ViewKind. It was registered end-to-end
   * (enum, composer registry, label, picker preview) but the group-by facet
   * was gated to `list`, so it rendered a permanently UNGROUPED list with no
   * control to group it. The pins below cover BOTH sides of the shared
   * component: the new kind's behavior, and — the contract that matters —
   * every existing `list` consumer's behavior, unchanged.
   */
  it('REGRESSION (list): a plain `list` view still opens UNGROUPED, with no seeded grouping', () => {
    render(<ModuleView config={dealsConfig} records={dealRecords} views={['list']} context={ctx} />)
    expect(screen.getByRole('button', { name: 'Group by' })).toBeInTheDocument()
    // A group header is a disclosure BUTTON; ungrouped, no such header exists.
    expect(screen.queryByRole('button', { name: /Proposal/ })).not.toBeInTheDocument()
  })

  it('REGRESSION (list): a curated `default` entry does NOT group a `list` view on load', () => {
    const config = {
      ...dealsConfig,
      uiConfig: { ...dealsConfig.uiConfig, groupByOptions: [{ col: 'status', label: 'Stage', default: true }] },
    }
    render(<ModuleView config={config} records={dealRecords} views={['list']} context={ctx} />)
    expect(screen.queryByRole('button', { name: /Proposal/ })).not.toBeInTheDocument()
  })

  it('offers the group-by control on a `grouped-list` view (was gated to `list` only)', () => {
    render(<ModuleView config={dealsConfig} records={dealRecords} views={['grouped-list']} context={ctx} />)
    // Icon-only trigger (2026-08-31 toolbar-unification pass) — the
    // accessible name is always 'Group by', regardless of the active option.
    expect(screen.getByRole('button', { name: 'Group by' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Proposal/ })).toBeInTheDocument()
  })

  it('opens a `grouped-list` view ALREADY grouped by the curated `default` column', () => {
    const config = {
      ...dealsConfig,
      uiConfig: { ...dealsConfig.uiConfig, groupByOptions: [{ col: 'status', label: 'Stage', default: true }] },
    }
    render(<ModuleView config={config} records={dealRecords} views={['grouped-list']} context={ctx} />)
    // No click needed — the group header is present on first paint.
    expect(screen.getByRole('button', { name: /Proposal/ })).toBeInTheDocument()
  })

  it('groups a `grouped-list` view by a curated REFERENCE column (not just SingleSelect)', () => {
    const config = {
      ...dealsConfig,
      uiConfig: {
        ...dealsConfig.uiConfig,
        groupByOptions: [{ col: 'systemcol3', label: 'Company', default: true }],
      },
    }
    render(<ModuleView config={config} records={dealRecords} views={['grouped-list']} context={ctx} />)
    expect(screen.getByRole('button', { name: 'Group by' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Globex Corp/ })).toBeInTheDocument()
  })

  it('lets the user regroup a `grouped-list` away from its seeded default', () => {
    const config = {
      ...dealsConfig,
      uiConfig: { ...dealsConfig.uiConfig, groupByOptions: [{ col: 'status', label: 'Stage', default: true }] },
    }
    render(<ModuleView config={config} records={dealRecords} views={['grouped-list']} context={ctx} />)
    expect(screen.getByRole('button', { name: /Proposal/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    fireEvent.click(screen.getByRole('radio', { name: 'None' }))
    // The explicit `None` sticks — the default must not re-seed over it.
    expect(screen.queryByRole('button', { name: /Proposal/ })).not.toBeInTheDocument()
  })

  it('passes summaryTiles through to the list view only', () => {
    render(
      <ModuleView
        config={dealsConfig}
        records={dealRecords}
        views={['list']}
        context={ctx}
        summaryTiles={[{ id: 'total', label: 'Total Deals', value: '6' }]}
      />,
    )
    expect(document.querySelector('[data-slot="list-view-summary"]')).toBeInTheDocument()
    expect(screen.getByText('Total Deals')).toBeInTheDocument()
  })

  it('no selection column / header pencil by default (uiConfig has neither knob set)', () => {
    render(<ModuleView config={companiesConfig} records={companyRecords} views={['list']} context={ctx} />)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Edit columns' })).not.toBeInTheDocument()
  })

  it('uiConfig.listSelectable turns on the leading checkbox column with zero app-layer code', () => {
    const config: EntityConfig = {
      ...companiesConfig,
      uiConfig: { ...companiesConfig.uiConfig, listSelectable: true },
    }
    render(<ModuleView config={config} records={companyRecords} views={['list']} context={ctx} />)
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0)
  })

  it('uiConfig.listHeaderAction turns on the trailing header pencil affordance with zero app-layer code', () => {
    const config: EntityConfig = {
      ...companiesConfig,
      uiConfig: { ...companiesConfig.uiConfig, listHeaderAction: true },
    }
    render(<ModuleView config={config} records={companyRecords} views={['list']} context={ctx} />)
    expect(screen.getByRole('button', { name: 'Edit columns' })).toBeInTheDocument()
  })

  it('an explicit headerAction prop (a real onClick) wins over uiConfig.listHeaderAction', () => {
    const onClick = vi.fn()
    const config: EntityConfig = {
      ...companiesConfig,
      uiConfig: { ...companiesConfig.uiConfig, listHeaderAction: true },
    }
    render(
      <ModuleView
        config={config}
        records={companyRecords}
        views={['list']}
        context={ctx}
        headerAction={{ onClick, ariaLabel: 'Edit view' }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Edit view' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  /*
   * The view-tab strip must be a faithful projection of the blueprint's `views`
   * array — nothing more. It used to append always-disabled "Hybrid"/"Calendar"
   * placeholders to every module.
   */
  describe('the tab strip reflects only the blueprint’s declared views', () => {
    it('fabricates no "coming soon" placeholder tabs', () => {
      render(<ModuleView config={dealsConfig} records={dealRecords} views={['list', 'kanban']} context={ctx} />)
      expect(screen.getAllByRole('tab')).toHaveLength(2)
      expect(screen.queryByRole('tab', { name: /Hybrid/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('tab', { name: /Calendar/i })).not.toBeInTheDocument()
    })

    it('renders a single tab for a module that declares only one view', () => {
      render(
        <ModuleView
          config={companiesConfig}
          records={companyRecords}
          views={['list']}
          context={{ userId: 'u1', moduleId: 'companies' }}
        />,
      )
      expect(screen.getAllByRole('tab')).toHaveLength(1)
      expect(screen.getByRole('tab', { name: 'List View' })).toBeInTheDocument()
    })

    it('renders a Hybrid tab when — and only when — the blueprint declares it', () => {
      render(
        <ModuleView config={dealsConfig} records={dealRecords} views={['list', 'hybrid']} context={ctx} />,
      )
      expect(screen.getByRole('tab', { name: /Hybrid/i })).toBeEnabled()
    })
  })

  /*
   * `+` must not be a one-way control: a view it creates has to be removable
   * without a page reload, including when no persistence adapter is wired (the
   * demo default).
   */
  describe('creating and removing a view', () => {
    it('offers no delete control while only blueprint-declared views exist', () => {
      render(<ModuleView config={dealsConfig} records={dealRecords} views={['list', 'kanban']} context={ctx} />)
      expect(screen.queryByRole('button', { name: 'Delete view' })).not.toBeInTheDocument()
    })

    it('makes a view created by "+" removable with no savedViews adapter wired', async () => {
      render(<ModuleView config={dealsConfig} records={dealRecords} views={['list', 'kanban']} context={ctx} />)
      fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
      fireEvent.click(screen.getByRole('button', { name: 'Create Only' }))

      // The new view is created AND becomes active …
      const created = await waitFor(() => screen.getByRole('tab', { name: 'List View 2' }))
      expect(created).toHaveAttribute('data-state', 'active')
      // … and, being non-system, it can actually be deleted again with no
      // adapter in sight. The trap this closes was a tab that survived
      // for the rest of the session, permanently eating 48px-bar width.
      fireEvent.keyDown(screen.getByRole('button', { name: 'Delete view' }), { key: 'Enter' })
      fireEvent.click(screen.getByRole('menuitem', { name: 'Delete view' }))
      await waitFor(() => expect(screen.queryByRole('tab', { name: 'List View 2' })).not.toBeInTheDocument())
      // Focus returns to a real, blueprint-declared view rather than nothing.
      expect(screen.getByRole('tab', { name: 'List View' })).toHaveAttribute('data-state', 'active')
    })

    it('never offers to delete a blueprint-declared (system) view', async () => {
      render(<ModuleView config={dealsConfig} records={dealRecords} views={['list', 'kanban']} context={ctx} />)
      fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
      fireEvent.click(screen.getByRole('button', { name: 'Create Only' }))
      await waitFor(() => screen.getByRole('tab', { name: 'List View 2' }))
      // Switching back to a system view withdraws the delete affordance.
      clickTab(screen.getByRole('tab', { name: 'List View' }))
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'Delete view' })).not.toBeInTheDocument(),
      )
    })
  })
})

describe('ModuleView — the "Select Preferred View" takeover (figma new-view spec, WP5)', () => {
  it('"+" opens the content-area takeover: heading + one option card per blueprint view kind; toolbar withheld; existing tabs stay', () => {
    render(<ModuleView config={dealsConfig} records={dealRecords} views={['kanban', 'list']} context={ctx} />)
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
    // The takeover replaces the body AND the toolbar row…
    expect(screen.getByRole('radiogroup', { name: 'Select Preferred View' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Search' })).not.toBeInTheDocument()
    // …but the chrome stays: both existing view tabs remain clickable.
    expect(screen.getByRole('tab', { name: 'Kanban View' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'List View' })).toBeInTheDocument()
    // Options are metadata-driven: exactly the blueprint's kinds, first pre-selected.
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(screen.getByRole('radio', { name: 'Kanban View' })).toHaveAttribute('aria-checked', 'true')
  })

  it('a different blueprint views declaration yields a different option set (metadata-driven per module)', () => {
    render(
      <ModuleView
        config={companiesConfig}
        records={companyRecords}
        views={['list', 'hybrid']}
        context={{ userId: 'u1', moduleId: 'companies' }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
    // SPEC v2 §2.1: single-pane kinds keep the PLAIN labels even beside a
    // `hybrid` sibling ("List View", not "List Only View" — see `viewLabelIn`).
    expect(screen.getByRole('radio', { name: 'List View' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Hybrid View' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Kanban View' })).not.toBeInTheDocument()
  })

  /* SPEC v2 (run 2026-08-24 live-monitoring, frames 495:2998 / 540:69908)
     retired the "… Only View" qualifier: the shipped Figma tab bar reads
     "Hybrid View · List View · Map View" even where both panes are declared.
     `viewLabelIn` now returns the plain labels unconditionally, so this case
     pins the PLAIN names for the very kind set that used to earn "Only". */
  it('names the single-pane kinds with the PLAIN labels even when hybrid AND both its panes are declared (Live Monitoring)', () => {
    render(
      <ModuleView
        config={companiesConfig}
        records={companyRecords}
        views={['list', 'map', 'hybrid']}
        context={{ userId: 'u1', moduleId: 'companies' }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
    expect(screen.getByRole('radio', { name: 'List View' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Map View' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Hybrid View' })).toBeInTheDocument()
  })

  it('creates a view of the SELECTED kind and renders its body (pick List in a kanban-first module)', async () => {
    render(<ModuleView config={dealsConfig} records={dealRecords} views={['kanban', 'list']} context={ctx} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
    fireEvent.click(screen.getByRole('radio', { name: 'List View' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create Only' }))
    // De-duplicated against the existing system "List View" tab.
    const tab = await screen.findByRole('tab', { name: 'List View 2' })
    expect(tab).toHaveAttribute('data-state', 'active')
    // The takeover is gone and the new LIST body rendered (a real <table>).
    expect(screen.queryByRole('radiogroup', { name: /Select Preferred View/i })).not.toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    // The "+" remains for further views.
    expect(screen.getByRole('button', { name: 'Add view' })).toBeInTheDocument()
  })

  it('Escape returns to the previously active view (implicit cancel)', () => {
    render(<ModuleView config={dealsConfig} records={dealRecords} views={['kanban', 'list']} context={ctx} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
    fireEvent.keyDown(screen.getByRole('radiogroup', { name: /Select Preferred View/i }), { key: 'Escape' })
    expect(screen.queryByRole('radiogroup', { name: /Select Preferred View/i })).not.toBeInTheDocument()
    // The kanban body (previously active) is back — its stage lane heading.
    expect(screen.getByRole('heading', { name: 'Proposal' })).toBeInTheDocument()
  })

  it('clicking an existing view tab abandons creation and shows that view', () => {
    render(<ModuleView config={dealsConfig} records={dealRecords} views={['kanban', 'list']} context={ctx} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
    clickTab(screen.getByRole('tab', { name: 'List View' }))
    expect(screen.queryByRole('radiogroup', { name: /Select Preferred View/i })).not.toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    // No view was created.
    expect(screen.getAllByRole('tab')).toHaveLength(2)
  })

  it('clicking the CURRENTLY-ACTIVE view tab also cancels the picker (round-1 QA `tab-click cancel` — Radix fires no onValueChange for an unchanged value)', () => {
    render(<ModuleView config={dealsConfig} records={dealRecords} views={['kanban', 'list']} context={ctx} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
    expect(screen.getByRole('radiogroup', { name: /Select Preferred View/i })).toBeInTheDocument()
    // Kanban is the active tab (first blueprint kind) — click IT, not a sibling.
    clickTab(screen.getByRole('tab', { name: 'Kanban View' }))
    expect(screen.queryByRole('radiogroup', { name: /Select Preferred View/i })).not.toBeInTheDocument()
    // The kanban body (previously active) is back and nothing was created.
    expect(screen.getByRole('heading', { name: 'Proposal' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(2)
  })

  it('Create & Customize creates the view AND fires onCustomizeView with it', async () => {
    const onCustomizeView = vi.fn()
    render(
      <ModuleView
        config={dealsConfig}
        records={dealRecords}
        views={['kanban', 'list']}
        context={ctx}
        onCustomizeView={onCustomizeView}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create & Customize' }))
    await screen.findByRole('tab', { name: 'Kanban View 2' })
    expect(onCustomizeView).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'kanban', label: 'Kanban View 2' }),
    )
  })

  it('zero views yet: the picker is the module’s initial state and Escape cannot dismiss it (no dead end)', () => {
    render(<ModuleView config={companiesConfig} records={companyRecords} views={[]} context={ctx} />)
    expect(screen.getByRole('radiogroup', { name: 'Select Preferred View' })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('radiogroup', { name: /Select Preferred View/i }), { key: 'Escape' })
    expect(screen.getByRole('radiogroup', { name: /Select Preferred View/i })).toBeInTheDocument()
  })

  it('zero views: creating the first view uses the un-suffixed default name and dismisses the initial-state picker', async () => {
    render(<ModuleView config={companiesConfig} records={companyRecords} views={[]} context={ctx} />)
    fireEvent.click(screen.getByRole('button', { name: 'Create Only' }))
    const tab = await screen.findByRole('tab', { name: 'List View' })
    expect(tab).toHaveAttribute('data-state', 'active')
    expect(screen.queryByRole('radiogroup', { name: /Select Preferred View/i })).not.toBeInTheDocument()
  })

  it('availableViewKinds widens the option set beyond the seeded tabs', () => {
    render(
      <ModuleView
        config={dealsConfig}
        records={dealRecords}
        views={['list']}
        availableViewKinds={['list', 'kanban', 'hybrid']}
        context={ctx}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('renders the blueprint’s uiConfig.viewPickerHint under the picker; hidden when absent', () => {
    const config = {
      ...dealsConfig,
      uiConfig: { ...dealsConfig.uiConfig, viewPickerHint: 'Compare data with a switch of a tab.' },
    }
    const { unmount } = render(
      <ModuleView config={config} records={dealRecords} views={['kanban', 'list']} context={ctx} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
    expect(screen.getByText('Compare data with a switch of a tab.', { exact: false })).toBeInTheDocument()
    unmount()

    render(<ModuleView config={dealsConfig} records={dealRecords} views={['kanban', 'list']} context={ctx} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
    expect(document.querySelector('[data-slot="view-type-picker-hint"]')).not.toBeInTheDocument()
  })
})

describe('ModuleView — kanban display mode + pinned columns are sticky per view', () => {
  // Both live in the active view's `ViewState`, so they round-trip through
  // `onStateChange` like filters/search/sort. That is what makes them survive
  // a lens switch and back (Figma frames `33534:32278` / `33534:32740` for the
  // display mode, target 11 "Pin Column" for the pins).
  const kanbanCtx = { userId: 'u1', moduleId: 'deals' }

  it('reports a display-mode change out through onStateChange', () => {
    const onStateChange = vi.fn()
    render(
      <ModuleView
        config={dealsConfig}
        records={dealRecords}
        views={['kanban', 'list']}
        context={kanbanCtx}
        onStateChange={onStateChange}
      />,
    )
    expect(screen.getByRole('radio', { name: 'Image view' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('radio', { name: 'Data-only view' }))
    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ displayMode: 'data' }))
  })

  it('keeps the display mode and the pinned lanes across a lens switch and back — sticky per view', () => {
    render(
      <ModuleView
        config={dealsConfig}
        records={dealRecords}
        views={['kanban', 'list']}
        context={kanbanCtx}
      />,
    )
    fireEvent.click(screen.getByRole('radio', { name: 'Data-only view' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pin column Won' }))
    expect(Array.from(document.querySelectorAll('[data-slot="kanban-column"]'))[0]?.textContent).toContain('Won')

    clickTab(screen.getByRole('tab', { name: 'List View' }))
    expect(screen.queryByRole('radio', { name: 'Data-only view' })).not.toBeInTheDocument()

    clickTab(screen.getByRole('tab', { name: 'Kanban View' }))
    expect(screen.getByRole('radio', { name: 'Data-only view' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: 'Unpin column Won' })).toHaveAttribute('aria-pressed', 'true')
    expect(Array.from(document.querySelectorAll('[data-slot="kanban-column"]'))[0]?.textContent).toContain('Won')
  })

  it('reports a pin change out through onStateChange', () => {
    const onStateChange = vi.fn()
    render(
      <ModuleView
        config={dealsConfig}
        records={dealRecords}
        views={['kanban']}
        context={kanbanCtx}
        onStateChange={onStateChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Pin column Proposal' }))
    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ pinnedColumns: ['proposal'] }))
  })

  it('offers the display toggle on the kanban lens only', () => {
    render(
      <ModuleView
        config={dealsConfig}
        records={dealRecords}
        views={['list']}
        context={{ userId: 'u1', moduleId: 'deals-list' }}
      />,
    )
    expect(screen.queryByRole('radio', { name: 'Data-only view' })).not.toBeInTheDocument()
  })
})

/**
 * FIX WAVE C-2 / P1-2 — the zero-results "Clear filters" action promises, in
 * its own copy, to clear "the search and filters". It cleared only the
 * filters, so the search text (and therefore the empty state itself) survived
 * the click. G.62 makes that action and the panel's `Clear all` the SAME
 * handler, so both now clear both.
 */
describe('ModuleView — P1-2: Clear filters also clears the search term', () => {
  const panelConfig: EntityConfig = {
    ...dealsConfig,
    uiConfig: { ...dealsConfig.uiConfig, filtersPanel: { title: 'All Filters' } },
  }

  it('resets the search box and the record set from the zero-results action', async () => {
    const onStateChange = vi.fn()
    render(
      <ModuleView
        config={panelConfig}
        records={dealRecords}
        views={['list']}
        context={ctx}
        onStateChange={onStateChange}
      />,
    )
    const search = screen.getByRole('textbox', { name: 'Search' })
    fireEvent.change(search, { target: { value: 'zzzznonexistentzzzz' } })
    const clear = await screen.findByRole('button', { name: 'Clear filters' })

    fireEvent.click(clear)
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ filters: {}, search: '' }),
    )
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue(''))
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
  })

  /*
   * The panel's `Clear all` is the SAME handler (G.62 — asserted for identity
   * in `ModuleViewFilters.test.tsx`), so it clears the search too. It stays
   * inert on a clean panel by design (G.66), which is why the shared reset is
   * exercised here through the lens action.
   */
})
