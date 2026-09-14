import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react'
import {
  ModuleViewFilters,
  isFilterPanelV2Active,
  panelOwnedFilterCols,
  type ModuleViewFiltersProps,
} from './ModuleViewFilters'
import { RecordViewEmptyState } from './RecordViewStates'
import { useFilterSession } from './filters/use-filter-session'
import type { SelectorRow } from './filters/ExpandableSelectorSheet'
import { multiFacet, statusFacet } from './filters/fixtures'
import type { FilterFacet } from '@fams/v5-composer'

const facets: FilterFacet[] = [
  { col: 'priority', label: 'Priority', type: 'select', options: ['Low', 'High'] },
  { col: 'category', label: 'Category', type: 'select', options: ['Mechanical', 'Electrical'] },
]

// Radix DropdownMenuTrigger opens on pointerdown, not the synthetic click
// alone — same `keyDown Enter` workaround used throughout this package's
// other DropdownMenu-driven tests (see ModuleViewShell.test.tsx).
function open(trigger: HTMLElement) {
  fireEvent.keyDown(trigger, { key: 'Enter' })
}

// The Sort control is a Radix *Popover* (its active row needs a nested arrow
// button, which a menu item would swallow). Popover opens on click, not the
// menu's pointerdown, hence its own opener.
function openPopover(trigger: HTMLElement) {
  fireEvent.click(trigger)
}

describe('ModuleViewFilters', () => {
  it('renders the search box and reports changes', () => {
    const onSearchChange = vi.fn()
    render(
      <ModuleViewFilters
        facets={[]}
        filters={{}}
        onFilterChange={() => {}}
        search=""
        onSearchChange={onSearchChange}
      />,
    )
    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'brake' } })
    expect(onSearchChange).toHaveBeenCalledWith('brake')
  })

  it('renders each blueprint facet as its own inline dropdown', () => {
    const onFilterChange = vi.fn()
    render(
      <ModuleViewFilters
        facets={facets}
        filters={{}}
        onFilterChange={onFilterChange}
        search=""
        onSearchChange={() => {}}
      />,
    )
    // Each facet is its own trigger, not folded behind one "Filter" button.
    const priority = screen.getByRole('button', { name: 'Priority' })
    expect(screen.getByRole('button', { name: 'Category' })).toBeInTheDocument()
    open(priority)
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'High' }))
    expect(onFilterChange).toHaveBeenCalledWith('priority', ['High'])
  })

  it('omits the inline filters when no facet has options', () => {
    render(
      <ModuleViewFilters facets={[]} filters={{}} onFilterChange={() => {}} search="" onSearchChange={() => {}} />,
    )
    expect(screen.queryByRole('button', { name: 'Filter' })).not.toBeInTheDocument()
    expect(document.querySelector('[data-slot="inline-filter-trigger"]')).toBeNull()
  })

  // Figma "Sorting" `33534:45591` Dev Notes `33534:45592`/`33534:45620`: the
  // ROW is a two-state affordance — set ascending, then clear. Direction is the
  // arrow's job (next test), so refining direction can never drop the sort.
  it('a sort ROW sets ascending, and clicking the same row again clears the sort', () => {
    const onSortChange = vi.fn()
    const { rerender } = render(
      <ModuleViewFilters
        facets={[]}
        filters={{}}
        onFilterChange={() => {}}
        search=""
        onSearchChange={() => {}}
        sortOptions={[{ col: 'title', label: 'Title' }]}
        sort={null}
        onSortChange={onSortChange}
      />,
    )
    openPopover(screen.getByRole('button', { name: /^Sort(, 1 applied)?$/ }))
    fireEvent.click(screen.getByRole('option', { name: 'Title' }))
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'title', direction: 'asc' })

    rerender(
      <ModuleViewFilters
        facets={[]}
        filters={{}}
        onFilterChange={() => {}}
        search=""
        onSearchChange={() => {}}
        sortOptions={[{ col: 'title', label: 'Title' }]}
        sort={{ key: 'title', direction: 'asc' }}
        onSortChange={onSortChange}
      />,
    )
    openPopover(screen.getByRole('button', { name: /^Sort(, 1 applied)?$/ }))
    fireEvent.click(screen.getByRole('option', { name: 'Title' }))
    expect(onSortChange).toHaveBeenLastCalledWith(null)
  })

  // Dev Note `33534:45647`: "Clicking the arrow will change the sorting order
  // from ascending to descending, and from descending back to ascending." It is
  // its own hit target and NEVER clears.
  it('the active row’s arrow is a separate control that flips direction both ways', () => {
    const onSortChange = vi.fn()
    const { rerender } = render(
      <ModuleViewFilters
        facets={[]}
        filters={{}}
        onFilterChange={() => {}}
        search=""
        onSearchChange={() => {}}
        sortOptions={[{ col: 'title', label: 'Title' }]}
        sort={{ key: 'title', direction: 'asc' }}
        onSortChange={onSortChange}
      />,
    )
    openPopover(screen.getByRole('button', { name: /^Sort(, 1 applied)?$/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Sort Title descending' }))
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'title', direction: 'desc' })

    rerender(
      <ModuleViewFilters
        facets={[]}
        filters={{}}
        onFilterChange={() => {}}
        search=""
        onSearchChange={() => {}}
        sortOptions={[{ col: 'title', label: 'Title' }]}
        sort={{ key: 'title', direction: 'desc' }}
        onSortChange={onSortChange}
      />,
    )
    // The arrow does NOT close the popover (you are refining, not choosing), so
    // it is still open across the rerender — reopening here would toggle it shut.
    fireEvent.click(screen.getByRole('button', { name: 'Sort Title ascending' }))
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'title', direction: 'asc' })
  })

  it('offers None (default) and a header Reset, both clearing the sort', () => {
    const onSortChange = vi.fn()
    const { rerender } = render(
      <ModuleViewFilters
        facets={[]}
        filters={{}}
        onFilterChange={() => {}}
        search=""
        onSearchChange={() => {}}
        sortOptions={[{ col: 'title', label: 'Title' }]}
        sort={{ key: 'title', direction: 'asc' }}
        onSortChange={onSortChange}
      />,
    )
    openPopover(screen.getByRole('button', { name: /^Sort(, 1 applied)?$/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onSortChange).toHaveBeenLastCalledWith(null)
    fireEvent.click(screen.getByRole('option', { name: /None/ }))
    expect(onSortChange).toHaveBeenLastCalledWith(null)

    // Nothing to reset -> no dead control.
    rerender(
      <ModuleViewFilters
        facets={[]}
        filters={{}}
        onFilterChange={() => {}}
        search=""
        onSearchChange={() => {}}
        sortOptions={[{ col: 'title', label: 'Title' }]}
        sort={null}
        onSortChange={onSortChange}
      />,
    )
    openPopover(screen.getByRole('button', { name: /^Sort(, 1 applied)?$/ }))
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
  })

  it('renders the Assignee split-dropdown only when an assigneeFacet is provided, and toggles its values', () => {
    const onFilterChange = vi.fn()
    const { rerender } = render(
      <ModuleViewFilters facets={[]} filters={{}} onFilterChange={onFilterChange} search="" onSearchChange={() => {}} />,
    )
    expect(screen.queryByText('Assignee')).not.toBeInTheDocument()

    rerender(
      <ModuleViewFilters
        facets={[]}
        filters={{}}
        onFilterChange={onFilterChange}
        search=""
        onSearchChange={() => {}}
        assigneeFacet={{ col: 'assignee', label: 'Assignee', options: ['Uma Admin', 'Umar Dispatcher'] }}
      />,
    )
    // The panel is a Popover now (its rows carry avatars + a secondary line),
    // so it opens on click and its rows are checkbox labels.
    openPopover(screen.getByRole('button', { name: /Assignee/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Uma Admin' }))
    expect(onFilterChange).toHaveBeenCalledWith('assignee', ['Uma Admin'])
  })

  // ── Figma "Filter By You" `33534:26092` ───────────────────────────────────
  const peopleFacet = {
    col: 'assignee',
    label: 'Assignee',
    options: ['u_me', 'u_jane', 'u_albert'],
    optionLabel: (id: string) =>
      ({ u_me: 'Nadia Owner', u_jane: 'Jane Cooper', u_albert: 'Albert Flores' })[id] ?? id,
    optionDetail: (id: string) => `${id}@email.com`,
    currentUserId: 'u_me',
  }

  const renderPeople = (
    filters: Record<string, string | string[] | boolean | null>,
    onFilterChange = vi.fn(),
  ) => {
    render(
      <ModuleViewFilters
        facets={[]}
        filters={filters}
        onFilterChange={onFilterChange}
        search=""
        onSearchChange={() => {}}
        assigneeFacet={peopleFacet}
      />,
    )
    return onFilterChange
  }

  it('the avatar quick-toggle filters to the current user, and clears on a second press', () => {
    // Dev Note `33534:27070`: click the avatar to see your own tasks; the cross
    // clears it.
    let onFilterChange = renderPeople({})
    const me = screen.getByRole('button', { name: 'Filter for your Tasks' })
    expect(me).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(me)
    expect(onFilterChange).toHaveBeenCalledWith('assignee', ['u_me'])

    cleanup()
    onFilterChange = renderPeople({ assignee: ['u_me'] })
    const pressed = screen.getByRole('button', { name: 'Filter for your Tasks' })
    expect(pressed).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(pressed)
    expect(onFilterChange).toHaveBeenCalledWith('assignee', [])
  })

  it('reads pressed ONLY when the filter is exactly the current user', () => {
    renderPeople({ assignee: ['u_me', 'u_jane'] })
    expect(screen.getByRole('button', { name: 'Filter for your Tasks' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('shows a count badge of the number of assignees selected', () => {
    // Dev Note `33534:27616`.
    renderPeople({ assignee: ['u_me', 'u_jane'] })
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('pins a You row above the group and never repeats it inside', () => {
    renderPeople({})
    openPopover(screen.getByRole('button', { name: /Assignee/ }))
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.queryByText('Nadia Owner')).not.toBeInTheDocument()
    expect(screen.getByText('Jane Cooper')).toBeInTheDocument()
    expect(screen.getByText('u_me@email.com')).toBeInTheDocument()
  })

  it('Select All selects every listed person and flips to Clear All', () => {
    // Dev Note `33534:27612`.
    const onFilterChange = renderPeople({})
    openPopover(screen.getByRole('button', { name: /Assignee/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Select All' }))
    expect(onFilterChange).toHaveBeenCalledWith('assignee', ['u_jane', 'u_albert'])

    cleanup()
    const onFilterChange2 = renderPeople({ assignee: ['u_jane', 'u_albert'] })
    openPopover(screen.getByRole('button', { name: /Assignee/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear All' }))
    expect(onFilterChange2).toHaveBeenCalledWith('assignee', [])
  })

  it('searches rows on name OR email, and says so when nothing matches', () => {
    renderPeople({})
    openPopover(screen.getByRole('button', { name: /Assignee/ }))
    const box = screen.getByRole('textbox', { name: 'Search Assignee' })
    fireEvent.change(box, { target: { value: 'albert' } })
    expect(screen.getByText('Albert Flores')).toBeInTheDocument()
    expect(screen.queryByText('Jane Cooper')).not.toBeInTheDocument()

    // Email match.
    fireEvent.change(box, { target: { value: 'u_jane@' } })
    expect(screen.getByText('Jane Cooper')).toBeInTheDocument()

    fireEvent.change(box, { target: { value: 'zzz' } })
    expect(screen.getByText(/No people match/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Select All/ })).not.toBeInTheDocument()
  })

  it('omits the quick-toggle and the You row when no identity is supplied', () => {
    render(
      <ModuleViewFilters
        facets={[]}
        filters={{}}
        onFilterChange={vi.fn()}
        search=""
        onSearchChange={() => {}}
        assigneeFacet={{ ...peopleFacet, currentUserId: undefined }}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Filter for your Tasks' })).not.toBeInTheDocument()
    openPopover(screen.getByRole('button', { name: /Assignee/ }))
    expect(screen.queryByText('You')).not.toBeInTheDocument()
    expect(screen.getByText('Nadia Owner')).toBeInTheDocument()
  })

  it('renders the display-mode toggle with the image state active by default and toggles to the data-only state', () => {
    // The two icon buttons ARE the two Figma frames `33534:32740` (image) and
    // `33534:32278` (data-only); the accessible name on the left one is the
    // designer's own tooltip copy, verbatim.
    render(
      <ModuleViewFilters facets={[]} filters={{}} onFilterChange={() => {}} search="" onSearchChange={() => {}} />,
    )
    const dataOnly = screen.getByRole('radio', { name: 'Data-only view' })
    const image = screen.getByRole('radio', { name: 'Image view' })
    expect(image).toHaveAttribute('aria-checked', 'true')
    expect(dataOnly).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(dataOnly)
    expect(dataOnly).toHaveAttribute('aria-checked', 'true')
    expect(image).toHaveAttribute('aria-checked', 'false')
  })

  it('surfaces the tooltip copy itself, not just the accessible name', () => {
    // The design shows the copy as a visible TOOLTIP (frame `33534:32278`), so
    // the string has to reach a sighted pointer/keyboard user too — Radix
    // tooltips open on focus, which is the path a keyboard user takes.
    render(
      <ModuleViewFilters facets={[]} filters={{}} onFilterChange={() => {}} search="" onSearchChange={() => {}} />,
    )
    fireEvent.focus(screen.getByRole('radio', { name: 'Data-only view' }))
    expect(screen.getAllByText('Data-only view').length).toBeGreaterThan(0)
  })

  it('is CONTROLLED when displayMode is supplied — the seam that makes the mode sticky per view', () => {
    const onDisplayModeChange = vi.fn()
    render(
      <ModuleViewFilters
        facets={[]}
        filters={{}}
        onFilterChange={() => {}}
        search=""
        onSearchChange={() => {}}
        displayMode="data"
        onDisplayModeChange={onDisplayModeChange}
      />,
    )
    expect(screen.getByRole('radio', { name: 'Data-only view' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('radio', { name: 'Image view' }))
    expect(onDisplayModeChange).toHaveBeenCalledWith('image')
    // No local state won: the control still shows what the OWNER says.
    expect(screen.getByRole('radio', { name: 'Data-only view' })).toHaveAttribute('aria-checked', 'true')
  })

  it('hides the display-density toggle when densityToggle={false} (figma-spec-list.md §1: no such control in the flat list toolbar)', () => {
    render(
      <ModuleViewFilters
        facets={[]}
        filters={{}}
        onFilterChange={() => {}}
        search=""
        onSearchChange={() => {}}
        densityToggle={false}
      />,
    )
    expect(screen.queryByRole('radio', { name: 'Data-only view' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Image view' })).not.toBeInTheDocument()
  })

  it('omits the group-by control by default and renders it, reporting changes, when groupByFacet is provided', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <ModuleViewFilters facets={[]} filters={{}} onFilterChange={() => {}} search="" onSearchChange={() => {}} />,
    )
    expect(screen.queryByRole('button', { name: /Group by/ })).not.toBeInTheDocument()

    rerender(
      <ModuleViewFilters
        facets={[]}
        filters={{}}
        onFilterChange={() => {}}
        search=""
        onSearchChange={() => {}}
        groupByFacet={{
          value: null,
          options: [
            { value: 'status', label: 'Status' },
            { value: 'priority', label: 'Priority' },
          ],
          onChange,
        }}
      />,
    )
    // figma-spec-list.md §1 / round-1 QA #9: while nothing is grouped, the
    // control is a COMPACT icon-button — same footprint as Filter/Sort — not
    // the wide labeled dropdown (that only appears once a grouping is
    // active, see the next test).
    const trigger = screen.getByRole('button', { name: 'Group by' })
    expect(trigger).toHaveClass('size-10')
    // Stable selector for QA automation regardless of grouped/ungrouped
    // state (tooling item #14) — see the next test for the grouped variant.
    expect(trigger).toHaveAttribute('data-slot', 'group-by-trigger')
    // 2026-08-31 pipeline-actions spec: the popup is a radio POPOVER, not a
    // DropdownMenu — options are radios, live-applied.
    openPopover(trigger)
    fireEvent.click(screen.getByRole('radio', { name: 'Status' }))
    expect(onChange).toHaveBeenCalledWith('status')
  })

  it('is an icon-only trigger (Layers icon, no visible label) tooltipped "Group by", regardless of the active option', () => {
    render(
      <ModuleViewFilters
        facets={[]}
        filters={{}}
        onFilterChange={() => {}}
        search=""
        onSearchChange={() => {}}
        groupByFacet={{
          value: 'status',
          options: [{ value: 'status', label: 'Status' }],
          onChange: () => {},
        }}
      />,
    )
    const trigger = screen.getByRole('button', { name: 'Group by' })
    expect(trigger).toHaveAttribute('data-slot', 'group-by-trigger')
    // Icon-only — the active option's label ("Status") is never rendered as
    // visible trigger text, matching the Filter/Sort buttons' own footprint.
    expect(trigger).not.toHaveTextContent('Status')
  })

  it('renders the trailing createAction content', () => {
    render(
      <ModuleViewFilters
        facets={[]}
        filters={{}}
        onFilterChange={() => {}}
        search=""
        onSearchChange={() => {}}
        createAction={<button type="button">Create New</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Create New' })).toBeInTheDocument()
  })
})

/* ────────────────────────────────────────────────────────────────────────
 * FAMILY C / WAVE C6 — host wiring for the "All Filters" panel (v2)
 * ──────────────────────────────────────────────────────────────────────── */

const v2Facets: FilterFacet[] = [multiFacet, statusFacet]

const entityFacetV2: FilterFacet = {
  col: 'owner',
  label: 'Owner',
  type: 'reference',
  kind: 'entity',
  multiple: true,
  expandable: true,
  icon: 'filter',
  expandView: { columns: [{ col: 'name', label: 'Name' }] },
  optionDefs: [{ value: 'o-1', label: 'Owner One' }],
}

const ownerRows: SelectorRow[] = [
  { id: 'o-1', name: 'Owner One' },
  { id: 'o-2', name: 'Owner Two' },
]

/**
 * Host harness — filters are the HOST's state, exactly as `ModuleView` holds
 * them, so "toggling applies live" is observable the way a real host sees it.
 */
function V2Harness({
  facets: harnessFacets = v2Facets,
  initial = {},
  assigneeFacet,
  onClearAllFilters,
  noSharedClearAll = false,
  onFilterChange,
  resolveExpandRows,
}: {
  facets?: FilterFacet[]
  initial?: ModuleViewFiltersProps['filters']
  assigneeFacet?: ModuleViewFiltersProps['assigneeFacet']
  onClearAllFilters?: () => void
  noSharedClearAll?: boolean
  onFilterChange?: (col: string, value: string[]) => void
  resolveExpandRows?: ModuleViewFiltersProps['resolveExpandRows']
}) {
  const session = useFilterSession('mod:view')
  const [filters, setFilters] = useState<ModuleViewFiltersProps['filters']>(initial)
  const [search, setSearch] = useState('')
  return (
    <div>
      <span data-testid="applied-value">{JSON.stringify(filters)}</span>
      <ModuleViewFilters
        facets={harnessFacets}
        filters={filters}
        onFilterChange={(col, value) => {
          onFilterChange?.(col, value)
          setFilters((current) => ({ ...current, [col]: value }))
        }}
        search={search}
        onSearchChange={setSearch}
        assigneeFacet={assigneeFacet}
        session={session}
        filtersPanel={{ title: 'All Filters' }}
        onClearAllFilters={
          noSharedClearAll
            ? undefined
            : (onClearAllFilters ??
              (() => {
                setFilters({})
              }))
        }
        resolveExpandRows={resolveExpandRows}
      />
    </div>
  )
}

describe('isFilterPanelV2Active / panelOwnedFilterCols — the C6 gate', () => {
  it('stays OFF for facets carrying no v2 field', () => {
    expect(isFilterPanelV2Active(facets)).toBe(false)
    expect(panelOwnedFilterCols(facets).size).toBe(0)
  })

  it('stays OFF for facets carrying a `kind` when no filtersPanel is authored (inline is the default)', () => {
    expect(isFilterPanelV2Active(v2Facets)).toBe(false)
    expect(panelOwnedFilterCols(v2Facets).size).toBe(0)
  })

  it('turns ON only from an explicit `uiConfig.filtersPanel`', () => {
    expect(isFilterPanelV2Active(facets, { title: 'All Filters' })).toBe(true)
    expect(panelOwnedFilterCols(facets, { title: 'All Filters' }).size).toBe(2)
    expect(isFilterPanelV2Active(v2Facets, { title: 'All Filters' })).toBe(true)
  })
})

describe('ModuleViewFilters — legacy modules are untouched (C6 backward compat)', () => {
  it('renders the identical DOM with and without a session, while no facet carries a v2 field', () => {
    function Legacy({ withSession }: { withSession: boolean }) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const session = withSession ? useFilterSession('mod:view') : undefined
      return (
        <ModuleViewFilters
          facets={facets}
          filters={{ priority: ['High'] }}
          onFilterChange={() => {}}
          search=""
          onSearchChange={() => {}}
          assigneeFacet={{ col: 'assignee', label: 'Assignee', options: ['Uma Admin'] }}
          sortOptions={[{ col: 'title', label: 'Title' }]}
          sort={null}
          onSortChange={() => {}}
          session={session}
        />
      )
    }
    // React/Radix mint a fresh auto-id per mount, so those (and only those)
    // are normalised away — everything else must match character for
    // character.
    const stable = (html: string) => html.replace(/_r_[0-9a-z]+_/g, '_r_')
    const before = render(<Legacy withSession={false} />)
    const beforeHtml = stable(before.container.innerHTML)
    before.unmount()
    const after = render(<Legacy withSession />)
    expect(stable(after.container.innerHTML)).toBe(beforeHtml)
    // …and it is the inline per-facet control, not the v2 panel trigger.
    expect(screen.getByRole('button', { name: 'Priority (1 active)' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Filters/ })).toBeNull()
  })
})

describe('ModuleViewFilters — the v2 panel trigger (I.74)', () => {
  it('names the trigger `Filters` when nothing is applied and `Filters, N applied` once it is', () => {
    const clean = render(<V2Harness />)
    const trigger = screen.getByRole('button', { name: 'Filters' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    clean.unmount()
    render(<V2Harness initial={{ group: ['g1'], state: ['s1'] }} />)
    expect(screen.getByRole('button', { name: 'Filters, 2 applied' })).toBeInTheDocument()
  })

  it('opens the panel — not the flat facet menu — and reports it on aria-expanded', () => {
    render(<V2Harness />)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    const panel = screen.getByRole('dialog')
    expect(panel).toHaveAccessibleName('All Filters')
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByRole('menuitemcheckbox')).toBeNull()
  })

  it('toggling an option inside the panel applies LIVE, through the host (G.63)', () => {
    const onFilterChange = vi.fn()
    render(<V2Harness onFilterChange={onFilterChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('combobox')[0])
    fireEvent.click(screen.getByRole('option', { name: /Group One/ }))
    expect(onFilterChange).toHaveBeenCalledWith('group', ['g1'])
    expect(screen.getByTestId('applied-value')).toHaveTextContent('{"group":["g1"]}')
    // The trigger's name is the live count (I.74).
    expect(screen.getByRole('button', { name: 'Filters, 1 applied' })).toBeInTheDocument()
  })

  it('Clear all clears every panel-owned facet and announces it (I.75)', async () => {
    render(<V2Harness initial={{ group: ['g1'], state: ['s1'] }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Filters, 2 applied' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(screen.getByTestId('applied-value')).toHaveTextContent('{}')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Filters cleared'), {
      timeout: 2000,
    })
  })

  it('falls back to emptying each facet when the host wired no shared Clear all', () => {
    const onFilterChange = vi.fn()
    render(
      <V2Harness
        initial={{ group: ['g1'] }}
        onFilterChange={onFilterChange}
        noSharedClearAll
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Filters, 1 applied' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(onFilterChange).toHaveBeenCalledWith('group', [])
    expect(onFilterChange).toHaveBeenCalledWith('state', [])
  })
})

/*
 * FIX WAVE C-6 — A.4 / J.92: every panel close route returns focus to the
 * toolbar trigger that opened it, and focus is STILL there after the layer has
 * finished going away (the report measured `<body>` on all three routes).
 */
describe('ModuleViewFilters — A.4/J.92 panel focus restore', () => {
  const openPanel = () => {
    const trigger = screen.getByRole('button', { name: 'Filters' })
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    return trigger
  }

  const expectRestored = async (trigger: HTMLElement) => {
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    // A.4 also asserts it is still there ~400ms later.
    await new Promise((resolve) => setTimeout(resolve, 450))
    expect(document.activeElement).toBe(trigger)
  }

  it('restores focus on Escape', async () => {
    render(<V2Harness />)
    const trigger = openPanel()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await expectRestored(trigger)
  })

  it('restores focus on the ✕ close button', async () => {
    render(<V2Harness />)
    const trigger = openPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Close filters' }))
    await expectRestored(trigger)
  })

  it('restores focus on an outside click', async () => {
    render(<V2Harness />)
    const trigger = openPanel()
    fireEvent.pointerDown(document.body)
    await expectRestored(trigger)
  })
})

describe('ModuleViewFilters — J.95: no second surface for a panel-owned facet', () => {
  it('suppresses the toolbar Assignee dropdown when the panel owns that column', () => {
    const owned: FilterFacet[] = [
      ...v2Facets,
      { col: 'assignee', label: 'Assignee', type: 'select', kind: 'multi-select', optionDefs: [] },
    ]
    render(
      <V2Harness
        facets={owned}
        assigneeFacet={{ col: 'assignee', label: 'Assignee', options: ['Uma Admin'] }}
      />,
    )
    expect(screen.queryByRole('button', { name: /Assignee/ })).toBeNull()
    // …but the search term is NEVER panel-owned, so its control is untouched.
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument()
  })

  it('keeps a NON-panel facet’s own control (only owned columns are suppressed)', () => {
    render(
      <V2Harness assigneeFacet={{ col: 'assignee', label: 'Assignee', options: ['Uma Admin'] }} />,
    )
    expect(screen.getByRole('button', { name: /Assignee/ })).toBeInTheDocument()
  })

  it('renders no page-level chip row of its own while the panel is active', () => {
    const { container } = render(<V2Harness initial={{ group: ['g1'] }} />)
    expect(container.querySelector('[data-slot="live-filter-chips"]')).toBeNull()
    expect(container.querySelector('[data-slot="filter-chip-row"]')).toBeNull()
  })
})

describe('ModuleViewFilters — G.62: the view’s zero-results action shares Clear all', () => {
  it('the panel’s Clear all and the empty state’s Clear filters dispatch the SAME handler', () => {
    const clearAll = vi.fn()
    render(
      <>
        <V2Harness initial={{ group: ['g1'] }} onClearAllFilters={clearAll} />
        <RecordViewEmptyState cause="filtered" noun={{ one: 'task', many: 'tasks' }} onClearFilters={clearAll} />
      </>,
    )
    expect(screen.getByText('No tasks match your filters')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(clearAll).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Filters, 1 applied' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(clearAll).toHaveBeenCalledTimes(2)
  })
})

describe('ModuleViewFilters — the expandable-entity sheet (C5 wiring)', () => {
  it('⧉ opens the sheet over the resolved rows, and Confirm writes through onFilterChange', async () => {
    const onFilterChange = vi.fn()
    const resolveExpandRows = vi.fn(() => ownerRows)
    render(
      <V2Harness
        facets={[entityFacetV2]}
        onFilterChange={onFilterChange}
        resolveExpandRows={resolveExpandRows}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('combobox')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Open expanded Owner selection' }))
    const sheet = await screen.findByRole('dialog', { name: /Owner/ })
    expect(resolveExpandRows).toHaveBeenCalledWith(entityFacetV2)
    fireEvent.click(within(sheet).getByText('Owner Two').closest('tr') as HTMLTableRowElement)
    fireEvent.click(within(sheet).getByRole('button', { name: 'Confirm' }))
    expect(onFilterChange).toHaveBeenCalledWith('owner', ['o-2'])
    expect(screen.getByTestId('applied-value')).toHaveTextContent('{"owner":["o-2"]}')
  })

  it('accepts an async resolver (a host that fetches the referenced entity)', async () => {
    render(
      <V2Harness
        facets={[entityFacetV2]}
        resolveExpandRows={() => Promise.resolve(ownerRows)}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('combobox')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Open expanded Owner selection' }))
    const sheet = await screen.findByRole('dialog', { name: /Owner/ })
    expect(await within(sheet).findByText('Owner One')).toBeInTheDocument()
  })
})
