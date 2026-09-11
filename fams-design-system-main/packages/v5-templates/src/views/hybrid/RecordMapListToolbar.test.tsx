import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { RecordMapListToolbar } from './RecordMapListToolbar'

const FACETS = [{ col: 'stage', label: 'Stage', type: 'select', options: ['Intake', 'Triage'] }]
const SORT_OPTIONS = [
  { key: 'title', label: 'Title' },
  { key: 'reportedAt', label: 'Reported At' },
]
const GROUP_BY_OPTIONS = [
  { key: 'status', label: 'Status' },
  { key: 'severity', label: 'Severity' },
]
const ASSIGNEE_FACET = { col: 'assignee', label: 'Assignee', options: ['Nadia', 'Omar'] }

// Radix DropdownMenuTrigger opens on pointerdown, not the synthetic click
// alone — same workaround `ModuleViewFilters.test.tsx` uses for its own
// DropdownMenu-driven controls (the Filter button and the Assignee pill's
// dropdown are both `DropdownMenu`, same primitive).
function open(trigger: HTMLElement) {
  fireEvent.keyDown(trigger, { key: 'Enter' })
}

describe('RecordMapListToolbar — every control is independently optional (SPEC §1.1)', () => {
  it('renders nothing at all when every control is omitted', () => {
    const { container } = render(<RecordMapListToolbar />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders ONLY the controls whose config/prop was supplied', () => {
    render(<RecordMapListToolbar search="" onSearchChange={vi.fn()} />)
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Filter/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Group by' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sort' })).not.toBeInTheDocument()
    expect(screen.queryByText('Assignee')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument()
  })

  it('renders every row-1 AND row-2 control when every config is supplied', () => {
    render(
      <RecordMapListToolbar
        search=""
        onSearchChange={vi.fn()}
        filterFacets={FACETS}
        onFilterChange={vi.fn()}
        onCreateRecord={vi.fn()}
        groupByOptions={GROUP_BY_OPTIONS}
        groupByDefaultKey="status"
        onGroupByChange={vi.fn()}
        sortOptions={SORT_OPTIONS}
        onSortChange={vi.fn()}
        assigneeFacet={ASSIGNEE_FACET}
        onDownload={vi.fn()}
      />,
    )
    expect(document.querySelector('[data-slot="record-map-list-toolbar-row1"]')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="record-map-list-toolbar-row2"]')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Group by' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sort' })).toBeInTheDocument()
    expect(screen.getByText('Assignee')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument()
  })

  it('omits Group By when `groupByDefaultKey` is missing, even with options supplied (a default is mandatory)', () => {
    render(<RecordMapListToolbar groupByOptions={GROUP_BY_OPTIONS} onGroupByChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Group by' })).not.toBeInTheDocument()
  })
})

describe('RecordMapListToolbar — search', () => {
  it('reports every keystroke through onSearchChange (controlled)', () => {
    const onSearchChange = vi.fn()
    render(<RecordMapListToolbar search="" onSearchChange={onSearchChange} searchPlaceholder="Search here" />)
    fireEvent.change(screen.getByPlaceholderText('Search here'), { target: { value: 'wakrah' } })
    expect(onSearchChange).toHaveBeenCalledWith('wakrah')
  })
})

describe('RecordMapListToolbar — filter facets', () => {
  it('shows the active-count badge and opens the shared "All Filters" panel (FilterPanelV2 — same component List/Kanban use)', () => {
    const onFilterChange = vi.fn()
    render(
      <RecordMapListToolbar
        filterFacets={FACETS}
        filters={{ stage: ['Intake'] }}
        onFilterChange={onFilterChange}
      />,
    )
    const trigger = screen.getByRole('button', { name: 'Filter (1 active)' })
    fireEvent.click(trigger)
    const panel = screen.getByRole('dialog', { name: 'All Filters' })
    fireEvent.click(within(panel).getByRole('combobox', { name: /Stage/ }))
    fireEvent.click(screen.getByRole('option', { name: 'Triage' }))
    expect(onFilterChange).toHaveBeenCalledWith('stage', ['Intake', 'Triage'])
  })

  it('omits a facet with no options, same gate as the page-level toolbar', () => {
    render(<RecordMapListToolbar filterFacets={[{ col: 'x', label: 'X', type: 'select', options: [] }]} />)
    expect(screen.queryByRole('button', { name: /Filter/ })).not.toBeInTheDocument()
  })
})

describe('RecordMapListToolbar — sort (SortMenuButton variant="toggle", SPEC Addendum "Sort popup")', () => {
  it('tapping a row\'s tri-state toggle while off sorts it ascending', () => {
    const onSortChange = vi.fn()
    render(<RecordMapListToolbar sortOptions={SORT_OPTIONS} sort={null} onSortChange={onSortChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sort Title' }))
    expect(onSortChange).toHaveBeenCalledWith({ key: 'title', direction: 'asc' })
  })

  it('tapping the active row\'s toggle again flips it to descending, then clears (tri-state cycle)', () => {
    const onSortChange = vi.fn()
    const { rerender } = render(
      <RecordMapListToolbar sortOptions={SORT_OPTIONS} sort={{ key: 'title', direction: 'asc' }} onSortChange={onSortChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    fireEvent.click(screen.getByRole('button', { name: /Title/ }))
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'title', direction: 'desc' })

    rerender(
      <RecordMapListToolbar sortOptions={SORT_OPTIONS} sort={{ key: 'title', direction: 'desc' }} onSortChange={onSortChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Title/ }))
    expect(onSortChange).toHaveBeenLastCalledWith(null)
  })

  it('activating a different field clears the previously active one — single active sort only (AC-7.2)', () => {
    const onSortChange = vi.fn()
    render(
      <RecordMapListToolbar sortOptions={SORT_OPTIONS} sort={{ key: 'title', direction: 'asc' }} onSortChange={onSortChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sort Reported At' }))
    expect(onSortChange).toHaveBeenCalledWith({ key: 'reportedAt', direction: 'asc' })
  })

  it('Reset clears the active sort to None', () => {
    const onSortChange = vi.fn()
    render(
      <RecordMapListToolbar sortOptions={SORT_OPTIONS} sort={{ key: 'title', direction: 'asc' }} onSortChange={onSortChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onSortChange).toHaveBeenCalledWith(null)
  })
})

describe('RecordMapListToolbar — group by (GroupByMenuButton, SPEC Addendum "Group By popup")', () => {
  it('seeds the radio selection from groupByDefaultKey when `groupBy` is omitted, and commits a pick live', () => {
    const onGroupByChange = vi.fn()
    render(
      <RecordMapListToolbar
        groupByOptions={GROUP_BY_OPTIONS}
        groupByDefaultKey="status"
        onGroupByChange={onGroupByChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    expect(screen.getByRole('radio', { name: 'Status' })).toHaveAttribute('data-state', 'checked')
    fireEvent.click(screen.getByRole('radio', { name: 'Severity' }))
    expect(onGroupByChange).toHaveBeenCalledWith('severity')
  })

  it('Reset restores the configured default (not "no grouping")', () => {
    const onGroupByChange = vi.fn()
    render(
      <RecordMapListToolbar
        groupByOptions={GROUP_BY_OPTIONS}
        groupByDefaultKey="status"
        groupBy="severity"
        onGroupByChange={onGroupByChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onGroupByChange).toHaveBeenCalledWith('status')
  })
})

describe('RecordMapListToolbar — assignee split-pill', () => {
  it("reads its value from filters[assigneeFacet.col] and writes through the SAME onFilterChange", () => {
    const onFilterChange = vi.fn()
    render(
      <RecordMapListToolbar
        assigneeFacet={ASSIGNEE_FACET}
        filters={{ assignee: ['Nadia'] }}
        onFilterChange={onFilterChange}
      />,
    )
    expect(screen.getByText('Nadia')).toBeInTheDocument()
    open(screen.getByRole('button', { name: 'Nadia' }))
    const menu = screen.getByRole('menu')
    fireEvent.click(within(menu).getByRole('menuitemcheckbox', { name: 'Omar' }))
    expect(onFilterChange).toHaveBeenCalledWith('assignee', ['Nadia', 'Omar'])
  })
})

describe('RecordMapListToolbar — create + download', () => {
  it('the "+" button fires onCreateRecord with no args', () => {
    const onCreateRecord = vi.fn()
    render(<RecordMapListToolbar onCreateRecord={onCreateRecord} />)
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(onCreateRecord).toHaveBeenCalledWith()
  })

  it('the download button fires onDownload with no args (the caller supplies the record set)', () => {
    const onDownload = vi.fn()
    render(<RecordMapListToolbar onDownload={onDownload} />)
    fireEvent.click(screen.getByRole('button', { name: 'Download' }))
    expect(onDownload).toHaveBeenCalledWith()
  })
})
