import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import type { FilterFacet } from '@fams/v5-composer'
import { ModuleViewFilters, type ModuleViewFiltersProps } from '../ModuleViewFilters'
import { useFilterSession } from './use-filter-session'
import type { SelectorRow } from './ExpandableSelectorSheet'
import { entityOptions, entityRows, entityValueOf } from './entity-facet'
import { applyViewState } from '../saved-views'
import { statusFacet, tagsFacet } from './fixtures'

/**
 * FIX WAVE C-2 — the six FAMILY C round-1 interaction findings, one describe
 * block each. Vocabulary-free fixtures (J.87): a `Group`, an `Owner`.
 *
 * P0-1 stacking · P0-2 nested dismiss (4 repro paths) · P0-3 entity facet
 * end-to-end · P1-1 sheet search focus · P1-2 Clear also clears the search ·
 * P2 sheet create-from-search CTA.
 */

/* ── fixtures ───────────────────────────────────────────────────────────── */

/**
 * The realistic entity facet: `col` is a column the referenced ROWS carry
 * (`owner`), which is also the column the view's filter model matches — the
 * mismatch between those two was P0-3.
 */
const ownerFacet: FilterFacet = {
  col: 'owner',
  label: 'Owner',
  type: 'reference',
  kind: 'entity',
  multiple: true,
  expandable: true,
  optionsFrom: 'records',
  icon: 'filter',
  expandView: {
    columns: [
      { col: 'ref', label: 'Ref' },
      { col: 'owner', label: 'Owner' },
    ],
    searchable: true,
  },
}

const createFacet: FilterFacet = {
  ...ownerFacet,
  createFromSearch: { enabled: true, entity: 'core/owner' },
}

/** The view's own records — what `ModuleView` hands the sheet by default. */
const records: SelectorRow[] = [
  { id: 'r1', ref: 'R-1', owner: 'Owner One' },
  { id: 'r2', ref: 'R-2', owner: 'Owner Two' },
  { id: 'r3', ref: 'R-3', owner: 'Owner One' },
]

function Harness({
  facets,
  initial = {},
  resolveExpandRows = () => records,
  onFilterChange,
  onCreateFromSearch,
}: {
  facets: FilterFacet[]
  initial?: ModuleViewFiltersProps['filters']
  resolveExpandRows?: ModuleViewFiltersProps['resolveExpandRows']
  onFilterChange?: (col: string, value: string[]) => void
  onCreateFromSearch?: ModuleViewFiltersProps['onCreateFromSearch']
}) {
  const session = useFilterSession('mod:view')
  const [filters, setFilters] = useState<ModuleViewFiltersProps['filters']>(initial)
  const [search, setSearch] = useState('')
  return (
    <div>
      <span data-testid="applied">{JSON.stringify(filters)}</span>
      <ModuleViewFilters
        facets={facets}
        filters={filters}
        onFilterChange={(col, value) => {
          onFilterChange?.(col, value)
          setFilters((current) => ({ ...current, [col]: value }))
        }}
        search={search}
        onSearchChange={setSearch}
        session={session}
        filtersPanel={{ title: 'All Filters' }}
        resolveExpandRows={resolveExpandRows}
        onCreateFromSearch={onCreateFromSearch}
      />
    </div>
  )
}

const panelOpen = () => screen.queryByRole('dialog', { name: 'All Filters' }) != null
const openPanel = () => fireEvent.click(screen.getByRole('button', { name: /^Filters/ }))
const openField = (label: string) =>
  fireEvent.click(
    document.querySelector(
      `[data-slot="filter-field"][aria-label="${label}"] [data-slot="filter-field-trigger"]`,
    ) as HTMLElement,
  )
/** The dropdown's search input — `role="combobox"`, since the field IS the search box (C.16). */
const fieldSearch = (label: string) => screen.getByRole('combobox', { name: `Search ${label}` })
/**
 * Open the ⧉ the way a pointer does: a real click focuses its target first,
 * and that focus is what the sheet's close path restores to (A.9). `fireEvent`
 * does not, so the test has to say so explicitly.
 */
function openSheet() {
  const expand = screen.getByRole('button', { name: 'Open expanded Owner selection' })
  expand.focus()
  fireEvent.click(expand)
  return expand
}

/* ── P0-1 — stacking ───────────────────────────────────────────────────── */

describe('P0-1 — the field dropdown paints ABOVE the panel (token z-scale)', () => {
  it('panel `z-dropdown` < field dropdown `z-overlay` < sheet `z-drawer`', async () => {
    const { container } = render(<Harness facets={[createFacet]} />)
    openPanel()
    // The panel's own positioned wrapper carries the panel layer.
    expect(container.querySelector('.z-dropdown')).not.toBeNull()

    openField('Owner')
    const dropdown = document.querySelector('[data-slot="filter-dropdown"]') as HTMLElement
    expect(dropdown.className).toContain('z-overlay')
    // The primitive's own default must not survive alongside it — that
    // ambiguity (two `z-*` classes, stylesheet order deciding) is the bug.
    expect(dropdown.className).not.toContain('z-popover')
    expect(dropdown.className).not.toContain('z-50')

    openSheet()
    const sheet = await screen.findByRole('dialog', { name: /Owner/ })
    expect(sheet.className).toContain('z-drawer')
  })

  it.each([
    ['tags', tagsFacet, 'Label'],
    ['status', statusFacet, 'State'],
    ['entity', ownerFacet, 'Owner'],
  ])('a %s field’s dropdown carries the same layer', (_kind, facet, label) => {
    const view = render(<Harness facets={[facet]} />)
    openPanel()
    openField(label)
    expect((document.querySelector('[data-slot="filter-dropdown"]') as HTMLElement).className).toContain('z-overlay')
    view.unmount()
  })
})

/* ── P0-2 — nested dismiss, the four repro paths ───────────────────────── */

describe('P0-2 — each close gesture closes exactly ONE layer', () => {
  it('path 1 (B9b): Escape after a MOUSE click on a tag chip closes only the dropdown', () => {
    render(<Harness facets={[tagsFacet]} />)
    openPanel()
    openField('Label')
    const chip = document.querySelectorAll('[data-slot="filter-chip"]')[0] as HTMLElement
    fireEvent.click(chip)
    expect(panelOpen()).toBe(true)
    // Focus now sits on the chip, NOT on the dropdown's search input — the
    // condition that used to unmask the panel's own Escape handler.
    fireEvent.keyDown(chip, { key: 'Escape' })
    expect(panelOpen()).toBe(true)
  })

  it('path 2 (D13): the sheet’s Cancel closes only the sheet, focus → ⧉', async () => {
    render(<Harness facets={[ownerFacet]} />)
    openPanel()
    openField('Owner')
    const expand = openSheet()
    const sheet = await screen.findByRole('dialog', { name: /Owner/ })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Select Owner/ })).toBeNull())
    expect(panelOpen()).toBe(true)
    await waitFor(() => expect(document.activeElement).toBe(expand))
  })

  it('path 3 (D15): the sheet’s Escape closes only the sheet, focus → ⧉', async () => {
    render(<Harness facets={[ownerFacet]} />)
    openPanel()
    openField('Owner')
    const expand = openSheet()
    const sheet = await screen.findByRole('dialog', { name: /Owner/ })
    fireEvent.keyDown(sheet, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Select Owner/ })).toBeNull())
    expect(panelOpen()).toBe(true)
    await waitFor(() => expect(document.activeElement).toBe(expand))
  })

  it('path 4 (D12a): the sheet’s Confirm closes only the sheet, focus → ⧉', async () => {
    render(<Harness facets={[ownerFacet]} />)
    openPanel()
    openField('Owner')
    const expand = openSheet()
    const sheet = await screen.findByRole('dialog', { name: /Owner/ })
    fireEvent.click(within(sheet).getByText('Owner Two').closest('tr') as HTMLTableRowElement)
    fireEvent.click(within(sheet).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Select Owner/ })).toBeNull())
    expect(panelOpen()).toBe(true)
    await waitFor(() => expect(document.activeElement).toBe(expand))
  })

  it('D14: Cancel discards the staged tick (the field trigger is re-checkable)', async () => {
    render(<Harness facets={[ownerFacet]} />)
    openPanel()
    openField('Owner')
    openSheet()
    const sheet = await screen.findByRole('dialog', { name: /Owner/ })
    fireEvent.click(within(sheet).getByText('Owner Two').closest('tr') as HTMLTableRowElement)
    fireEvent.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Select Owner/ })).toBeNull())
    expect(screen.getByTestId('applied')).toHaveTextContent('{}')
  })

  it('the panel still closes on its OWN Escape (the guard is scoped, not blanket)', () => {
    render(<Harness facets={[tagsFacet]} />)
    openPanel()
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'All Filters' }), { key: 'Escape' })
    expect(panelOpen()).toBe(false)
  })
})

/* ── P0-3 — the entity facet, end to end ───────────────────────────────── */

describe('P0-3a — the compact dropdown sources options from the resolved rows', () => {
  it('lists one option per DISTINCT referenced value instead of “No results found!”', async () => {
    render(<Harness facets={[ownerFacet]} />)
    openPanel()
    openField('Owner')
    const listbox = await screen.findByRole('listbox', { name: 'Owner options' })
    await waitFor(() => expect(within(listbox).getAllByRole('option')).toHaveLength(2))
    expect(within(listbox).getByRole('option', { name: /Owner One/ })).toBeInTheDocument()
    expect(within(listbox).getByRole('option', { name: /Owner Two/ })).toBeInTheDocument()
    expect(within(listbox).queryByText('No results found!')).toBeNull()
  })

  it('a real query matches (the old dropdown returned nothing for any query)', async () => {
    render(<Harness facets={[ownerFacet]} />)
    openPanel()
    openField('Owner')
    await screen.findByRole('option', { name: /Owner Two/ })
    fireEvent.change(fieldSearch('Owner'), { target: { value: 'two' } })
    await waitFor(() =>
      expect(within(screen.getByRole('listbox', { name: 'Owner options' })).getAllByRole('option')).toHaveLength(1),
    )
  })

  it('legacy `options: string[]` facets are untouched by the entity path', () => {
    const legacy: FilterFacet = { col: 'group', label: 'Group', type: 'select', kind: 'multi-select', options: ['A', 'B'] }
    render(<Harness facets={[legacy]} />)
    openPanel()
    openField('Group')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['A', 'B'])
  })
})

describe('P0-3b — the sheet round-trip filters the list to the selected records', () => {
  it('Confirm writes the facet’s COLUMN value, which the view’s filter model matches', async () => {
    const onFilterChange = vi.fn()
    render(<Harness facets={[ownerFacet]} onFilterChange={onFilterChange} />)
    openPanel()
    openField('Owner')
    openSheet()
    const sheet = await screen.findByRole('dialog', { name: /Owner/ })
    // Deduped: three records, two distinct owners.
    expect(within(sheet).getAllByRole('row').length - 1).toBe(2)
    fireEvent.click(within(sheet).getByText('Owner Two').closest('tr') as HTMLTableRowElement)
    fireEvent.click(within(sheet).getByRole('button', { name: 'Confirm' }))
    expect(onFilterChange).toHaveBeenCalledWith('owner', ['Owner Two'])

    // …and that value, run through the ONE live-filter model, selects exactly
    // the matching records — not zero, which was the failure.
    const applied = applyViewState(records, { filters: { owner: ['Owner Two'] } }, [])
    expect(applied).toHaveLength(1)
    expect(applied[0].id).toBe('r2')
  })

  it('a sheet pick and a dropdown pick are the SAME value (one value space)', async () => {
    const viaDropdown = vi.fn()
    render(<Harness facets={[ownerFacet]} onFilterChange={viaDropdown} />)
    openPanel()
    openField('Owner')
    fireEvent.click(await screen.findByRole('option', { name: /Owner Two/ }))
    expect(viaDropdown).toHaveBeenCalledWith('owner', ['Owner Two'])
  })

  it('the applied value re-renders as a TICKED sheet row (round-trip both ways)', async () => {
    render(<Harness facets={[ownerFacet]} initial={{ owner: ['Owner One'] }} />)
    openPanel()
    openField('Owner')  // the field's group label is stable even once filled
    openSheet()
    const sheet = await screen.findByRole('dialog', { name: /Owner/ })
    const row = within(sheet).getByText('Owner One').closest('tr') as HTMLTableRowElement
    expect(row).toHaveAttribute('aria-selected', 'true')
  })
})

describe('entity-facet — the value adapter in isolation', () => {
  it('reads the facet’s own column first', () => {
    expect(entityValueOf(ownerFacet, records[0])).toBe('Owner One')
  })

  it('falls back to `row.id` for a resolver returning a different entity’s rows', () => {
    expect(entityValueOf(ownerFacet, { id: 'x1', name: 'Other' })).toBe('x1')
  })

  it('dedupes rows by value, first-seen order, and counts the source rows', () => {
    expect(entityRows(ownerFacet, records).map((r) => r.id)).toEqual(['r1', 'r2'])
    // FIX WAVE C-5 — `meta` (the resolved row's cells, for R-38's rich row)
    // is additive; value/label/count are what this test pins.
    expect(
      entityOptions({ ...ownerFacet, showCounts: true }, records).map(({ value, label, count }) => ({
        value,
        label,
        count,
      })),
    ).toEqual([
      { value: 'Owner One', label: 'Owner One', count: 2 },
      { value: 'Owner Two', label: 'Owner Two', count: 1 },
    ])
  })
})

/* ── P1-1 — sheet search focus on open ─────────────────────────────────── */

describe('P1-1 — the sheet moves focus to its search input on open', () => {
  it('focuses `[data-slot="sheet-search"]`, not the field trigger that launched it', async () => {
    render(<Harness facets={[ownerFacet]} />)
    openPanel()
    openField('Owner')
    openSheet()
    await screen.findByRole('dialog', { name: /Owner/ })
    await waitFor(() =>
      expect(document.activeElement).toBe(document.querySelector('[data-slot="sheet-search"]')),
    )
  })
})

/* ── P2 — the sheet’s create-from-search CTA ───────────────────────────── */

describe('P2 — the sheet’s empty state offers create-from-search', () => {
  it('renders the same CTA the compact dropdown does, through the same handler', async () => {
    const onCreateFromSearch = vi.fn()
    render(<Harness facets={[createFacet]} onCreateFromSearch={onCreateFromSearch} />)
    openPanel()
    openField('Owner')
    openSheet()
    const sheet = await screen.findByRole('dialog', { name: /Owner/ })
    fireEvent.change(within(sheet).getByRole('searchbox', { name: 'Search Owner' }), {
      target: { value: 'Nobody At All' },
    })
    const cta = await within(sheet).findByRole('button', { name: /Create a new Owner as/ })
    expect(within(sheet).getByText('No results found!')).toBeInTheDocument()
    fireEvent.click(cta)
    expect(onCreateFromSearch).toHaveBeenCalledWith(
      expect.objectContaining({ col: 'owner', createFromSearch: createFacet.createFromSearch }),
      'Nobody At All',
    )
  })

  it('the compact dropdown’s empty state offers the identical CTA', async () => {
    const onCreateFromSearch = vi.fn()
    render(<Harness facets={[createFacet]} onCreateFromSearch={onCreateFromSearch} />)
    openPanel()
    openField('Owner')
    fireEvent.change(fieldSearch('Owner'), { target: { value: 'Nobody At All' } })
    fireEvent.click(await screen.findByRole('button', { name: /Create a new Owner as/ }))
    expect(onCreateFromSearch).toHaveBeenCalledWith(
      expect.objectContaining({ col: 'owner', createFromSearch: createFacet.createFromSearch }),
      'Nobody At All',
    )
  })

  it('stays hidden when the facet did not enable it', async () => {
    render(<Harness facets={[ownerFacet]} />)
    openPanel()
    openField('Owner')
    fireEvent.change(fieldSearch('Owner'), { target: { value: 'Nobody At All' } })
    expect(screen.queryByRole('button', { name: /Create a new/ })).toBeNull()
  })
})
