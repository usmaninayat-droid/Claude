import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import type { FilterFacet } from '@fams/v5-composer'
import { ModuleViewFilters, type ModuleViewFiltersProps } from '../ModuleViewFilters'
import { useFilterSession } from './use-filter-session'
import type { SelectorRow } from './ExpandableSelectorSheet'
import { entityOptions, entityRows, entityValuesOf, isReferenceFacet, withEntityOptions } from './entity-facet'
import { applyViewState } from '../saved-views'
import { statusFacet, tagsFacet } from './fixtures'

/**
 * FIX WAVE C-3 / P0 — an entity facet on a column that REFERENCES ANOTHER
 * ENTITY resolves to the referenced entity's own values, not to the view's
 * rows. Vocabulary-free fixtures (J.87): a task list whose `owner` column
 * stores a LIST of person ids, resolved to names by the host's resolver.
 */

/** The pipelines-like facet: a reference column, multi-valued, ids stored. */
const refFacet: FilterFacet = {
  col: 'owner',
  label: 'Owner',
  type: 'Assignee',
  kind: 'entity',
  multiple: true,
  expandable: true,
  optionsFrom: 'records',
  icon: 'filter',
  expandView: {
    columns: [
      { col: 'title', label: 'Owner' },
      { col: 'count', label: 'Assigned' },
    ],
    searchable: true,
  },
}

/** The workforce-like facet: the view's OWN display column (same entity). */
const sameEntityFacet: FilterFacet = {
  ...refFacet,
  col: 'title',
  label: 'Person',
  type: 'SmallText',
  expandView: { columns: [{ col: 'title', label: 'Full Name' }], searchable: true },
}

/** The referencing records: 4 tasks, one of them owned by TWO people. */
const tasks: SelectorRow[] = [
  { id: 'T-1', title: 'Task one', owner: ['p1'] },
  { id: 'T-2', title: 'Task two', owner: ['p2'] },
  { id: 'T-3', title: 'Task three', owner: ['p1', 'p2'] },
  { id: 'T-4', title: 'Task four', owner: [] },
]
const people: Record<string, string> = { p1: 'Ada Owner', p2: 'Ben Owner' }
const resolveEntityLabel = (id: string) => people[id]

describe('P0 — reference-column entity facet (the pure adapter)', () => {
  it('classifies by the referencing COLUMN TYPE, not by module', () => {
    expect(isReferenceFacet(refFacet)).toBe(true)
    expect(isReferenceFacet({ ...refFacet, type: 'SingleReference' })).toBe(true)
    expect(isReferenceFacet({ ...refFacet, type: 'MultiReference' })).toBe(true)
    expect(isReferenceFacet(sameEntityFacet)).toBe(false)
    expect(isReferenceFacet(tagsFacet)).toBe(false)
  })

  it('reads EVERY id a multi-valued reference cell stores', () => {
    expect(entityValuesOf(refFacet, tasks[2])).toEqual(['p1', 'p2'])
    expect(entityValuesOf(refFacet, tasks[3])).toEqual([])
    // A same-entity facet still yields exactly its one cell value.
    expect(entityValuesOf(sameEntityFacet, tasks[0])).toEqual(['Task one'])
  })

  it('options are the REFERENCED rows: value = stored id, label = its name', () => {
    const options = entityOptions(refFacet, tasks, resolveEntityLabel)
    // FIX WAVE C-5 — options now also carry `meta` (the resolved row's scalar
    // cells) so the compact dropdown can draw R-38's rich row; value/label are
    // unchanged, which is what this test is about.
    expect(options.map(({ value, label }) => ({ value, label }))).toEqual([
      { value: 'p1', label: 'Ada Owner' },
      { value: 'p2', label: 'Ben Owner' },
    ])
    expect(options[0].meta).toEqual({ id: 'p1', owner: 'p1', title: 'Ada Owner', count: '2' })
    // No option is ever one of the view's own rows.
    expect(options.map((o) => o.value)).not.toContain('T-1')
  })

  it('counts (showCounts) count SOURCE records per referenced value', () => {
    expect(
      entityOptions({ ...refFacet, showCounts: true }, tasks, resolveEntityLabel).map(
        ({ value, label, count }) => ({ value, label, count }),
      ),
    ).toEqual([
      { value: 'p1', label: 'Ada Owner', count: 2 },
      { value: 'p2', label: 'Ben Owner', count: 2 },
    ])
  })

  it('sheet rows are one row PER REFERENCED ENTITY, id-addressable and named', () => {
    expect(entityRows(refFacet, tasks, resolveEntityLabel)).toEqual([
      { id: 'p1', owner: 'p1', title: 'Ada Owner', count: 2 },
      { id: 'p2', owner: 'p2', title: 'Ben Owner', count: 2 },
    ])
  })

  it('falls back to the raw id when the host resolves no name', () => {
    expect(entityOptions(refFacet, tasks).map((o) => o.label)).toEqual(['p1', 'p2'])
  })

  it('a picked option filters the view to the MATCHING records (0 < n < total)', () => {
    const value = entityOptions(refFacet, tasks, resolveEntityLabel)[0].value
    const out = applyViewState(tasks as Record<string, unknown>[], { filters: { owner: [value] } }, ['title'])
    expect(out.map((r) => r.id)).toEqual(['T-1', 'T-3'])
    expect(out.length).toBeGreaterThan(0)
    expect(out.length).toBeLessThan(tasks.length)
    // T-3 carries TWO owners — membership, not the comma-joined string.
    expect(applyViewState(tasks as Record<string, unknown>[], { filters: { owner: ['p2'] } }, ['title']).map((r) => r.id))
      .toEqual(['T-2', 'T-3'])
  })
})

describe('P0 — same-entity and legacy facets are untouched', () => {
  it('a same-entity facet still resolves to the view’s own rows', () => {
    expect(entityOptions(sameEntityFacet, tasks).map((o) => o.value)).toEqual([
      'Task four',
      'Task one',
      'Task three',
      'Task two',
    ])
    expect(entityRows(sameEntityFacet, tasks)).toEqual(tasks)
    const out = applyViewState(tasks as Record<string, unknown>[], { filters: { title: ['Task two'] } }, ['title'])
    expect(out.map((r) => r.id)).toEqual(['T-2'])
  })

  it('withEntityOptions is identity for every non-entity facet', () => {
    expect(withEntityOptions(statusFacet, tasks, resolveEntityLabel)).toBe(statusFacet)
    expect(withEntityOptions(tagsFacet, tasks, resolveEntityLabel)).toBe(tagsFacet)
  })

  it('a scalar (non-array) column matches exactly as before', () => {
    const rows = [{ id: 'a', state: 'open' }, { id: 'b', state: 'done' }]
    expect(applyViewState(rows, { filters: { state: ['open'] } }, []).map((r) => r.id)).toEqual(['a'])
    expect(applyViewState(rows, { filters: { state: 'done' } }, []).map((r) => r.id)).toEqual(['b'])
  })
})

/* ── the panel, end to end ─────────────────────────────────────────────── */

function Harness({ facet }: { facet: FilterFacet }) {
  const session = useFilterSession('mod:view')
  const [filters, setFilters] = useState<ModuleViewFiltersProps['filters']>({})
  return (
    <div>
      <span data-testid="applied">{JSON.stringify(filters)}</span>
      <ModuleViewFilters
        facets={[facet]}
        filters={filters}
        onFilterChange={(col, value) => setFilters((current) => ({ ...current, [col]: value }))}
        search=""
        onSearchChange={() => {}}
        session={session}
        resolveExpandRows={() => tasks}
        resolveEntityLabel={resolveEntityLabel}
      />
    </div>
  )
}
const openPanel = () => fireEvent.click(screen.getByRole('button', { name: /^Filters/ }))
const openField = (label: string) =>
  fireEvent.click(
    document.querySelector(
      `[data-slot="filter-field"][aria-label="${label}"] [data-slot="filter-field-trigger"]`,
    ) as HTMLElement,
  )

describe('P0 — the panel shows NAMES and applies IDS', () => {
  it('the compact dropdown lists the referenced people, and a pick applies its id', async () => {
    render(<Harness facet={refFacet} />)
    openPanel()
    openField('Owner')
    const dropdown = document.querySelector('[data-slot="filter-dropdown"]') as HTMLElement
    await waitFor(() => expect(within(dropdown).queryByText('Ada Owner')).not.toBeNull())
    expect(within(dropdown).queryByText('Ben Owner')).not.toBeNull()
    expect(within(dropdown).queryByText('Task one')).toBeNull()
    fireEvent.click(within(dropdown).getByText('Ada Owner'))
    expect(JSON.parse(screen.getByTestId('applied').textContent ?? '{}')).toEqual({ owner: ['p1'] })
  })

  it('the sheet lists the referenced people and confirms their ids', async () => {
    render(<Harness facet={refFacet} />)
    openPanel()
    openField('Owner')
    const expand = screen.getByRole('button', { name: 'Open expanded Owner selection' })
    expand.focus()
    fireEvent.click(expand)
    const sheet = await screen.findByRole('dialog', { name: /Owner/ })
    await waitFor(() => expect(within(sheet).queryByText('Ben Owner')).not.toBeNull())
    expect(within(sheet).queryByText('Task two')).toBeNull()
    fireEvent.click(within(sheet).getByText('Ben Owner').closest('tr') as HTMLTableRowElement)
    fireEvent.click(within(sheet).getByRole('button', { name: 'Confirm' }))
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('applied').textContent ?? '{}')).toEqual({ owner: ['p2'] }),
    )
  })

  it('a same-entity facet’s dropdown still lists the view’s own rows', async () => {
    render(<Harness facet={sameEntityFacet} />)
    openPanel()
    openField('Person')
    const dropdown = document.querySelector('[data-slot="filter-dropdown"]') as HTMLElement
    await waitFor(() => expect(within(dropdown).queryByText('Task one')).not.toBeNull())
    fireEvent.click(within(dropdown).getByText('Task one'))
    expect(JSON.parse(screen.getByTestId('applied').textContent ?? '{}')).toEqual({ title: ['Task one'] })
  })
})
