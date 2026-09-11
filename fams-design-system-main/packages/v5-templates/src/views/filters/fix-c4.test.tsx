import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { deriveFilters, type EntityConfig, type FilterFacet } from '@fams/v5-composer'
import { isTagsFacet, tagOptions, tagValuesOf, withTagOptions } from './tags-facet'
import { applyViewState } from '../saved-views'
import { ModuleViewFilters } from '../ModuleViewFilters'
import { statusFacet } from './fixtures'
import type { SelectorRow } from './ExpandableSelectorSheet'
import { useFilterSession } from './use-filter-session'

/**
 * FIX WAVE C-4 / P0-1 — a `kind: 'tags'` facet's chips are the tag values the
 * RECORDS actually carry, with the blueprint's authored `label`/`category`
 * merged over them. Vocabulary-free fixtures (J.87): opaque tag ids in two
 * opaque categories, one authored value seeded on NO record at all.
 */
const facet: FilterFacet = {
  col: 'labels',
  label: 'Labels',
  type: 'tags',
  kind: 'tags',
  multiple: true,
  optionsFrom: 'records',
  icon: 'filter',
  optionDefs: [
    { value: 'a1', label: 'Alpha One', category: 'Cat A' },
    { value: 'a2', label: 'Alpha Two', category: 'Cat A' },
    { value: 'b1', label: 'Beta One', category: 'Cat B' },
    { value: 'phantom', label: 'Never Seeded', category: 'Cat B' },
  ],
}

/** Records: multi-tag cells, an untagged one, and one unauthored value. */
const rows: SelectorRow[] = [
  { id: 'R-1', title: 'One', labels: ['a1', 'b1'] },
  { id: 'R-2', title: 'Two', labels: ['a2'] },
  { id: 'R-3', title: 'Three', labels: ['b1', 'loose'] },
  { id: 'R-4', title: 'Four', labels: [] },
]

describe('P0-1 — the tags facet adapter derives its options from records', () => {
  it('reads every tag a multi-valued cell stores', () => {
    expect(tagValuesOf(facet, rows[0])).toEqual(['a1', 'b1'])
    expect(tagValuesOf(facet, rows[3])).toEqual([])
    // A scalar cell is accepted as a one-tag record.
    expect(tagValuesOf(facet, { id: 'x', labels: 'a1' })).toEqual(['a1'])
  })

  it('offers ONLY values present in the data, with authored label/category', () => {
    expect(tagOptions(facet, rows)).toEqual([
      { value: 'a1', label: 'Alpha One', category: 'Cat A' },
      { value: 'a2', label: 'Alpha Two', category: 'Cat A' },
      { value: 'b1', label: 'Beta One', category: 'Cat B' },
      { value: 'loose', label: 'loose' },
    ])
  })

  it('counts (showCounts) count the records carrying the tag', () => {
    expect(tagOptions({ ...facet, showCounts: true }, rows).map((o) => [o.value, o.count])).toEqual([
      ['a1', 1],
      ['a2', 1],
      ['b1', 2],
      ['loose', 1],
    ])
  })

  it('is identity for every non-tags facet, and a no-op with no rows', () => {
    expect(isTagsFacet(statusFacet)).toBe(false)
    expect(withTagOptions(statusFacet, rows)).toBe(statusFacet)
    expect(withTagOptions(facet, undefined)).toBe(facet)
  })

  it('a picked tag matches records by ARRAY MEMBERSHIP (0 < n < total)', () => {
    const value = tagOptions(facet, rows)[2].value // 'b1', on a two-tag record
    const out = applyViewState(rows as Record<string, unknown>[], { filters: { labels: [value] } }, ['title'])
    expect(out.map((r) => r.id)).toEqual(['R-1', 'R-3'])
    expect(out.length).toBeGreaterThan(0)
    expect(out.length).toBeLessThan(rows.length)
  })

  it('two tags in different categories are an OR within the one facet', () => {
    const out = applyViewState(rows as Record<string, unknown>[], { filters: { labels: ['a2', 'b1'] } }, ['title'])
    expect(out.map((r) => r.id)).toEqual(['R-1', 'R-2', 'R-3'])
  })
})

/* ── blueprint-shaped round trip ───────────────────────────────────────── */

/** A blueprint shaped exactly like the pipelines one: a `tags` column, a
 *  `kind:'tags'` facet whose options are records-sourced metadata. */
const config = {
  code: 'demo/task',
  name: 'Tasks',
  systemcolumns: [
    { id: 'f_title', col: 'title', name: 'Title', type: 'SmallText' },
    { id: 'f_labels', col: 'labels', name: 'Labels', type: 'tags' },
  ],
  listcolumns: [{ id: 'f_title', col: 'title' }],
  uiConfig: {
    statusList: [],
    filtersPanel: { title: 'Filters', clearAll: true },
    filters: [
      {
        id: 'flt_labels',
        col: 'labels',
        name: 'Labels',
        kind: 'tags',
        optionsFrom: 'records',
        options: facet.optionDefs,
      },
    ],
  },
} as unknown as EntityConfig

/** The panel, wired the way `ModuleView` wires it. */
function Harness({ facet: only }: { facet: FilterFacet }) {
  const session = useFilterSession('mod:view')
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  return (
    <div>
      <span data-testid="applied">{JSON.stringify({ filters })}</span>
      <ModuleViewFilters
        facets={[only]}
        filters={filters}
        onFilterChange={(col, value) => setFilters((cur) => ({ ...cur, [col]: value as string[] }))}
        search=""
        onSearchChange={() => {}}
        session={session}
        filtersPanel={{ title: 'Filters', clearAll: true }}
        resolveExpandRows={() => rows}
      />
    </div>
  )
}

describe('P0-1 — blueprint → facet → filtered records', () => {
  it('deriveFilters keeps authored options as METADATA for a records-sourced tags facet', () => {
    const [derived] = deriveFilters(config)
    expect(derived.kind).toBe('tags')
    expect(derived.optionsFrom).toBe('records')
    expect(derived.optionDefs).toEqual(facet.optionDefs)
    expect(derived.categoryCol).toBeUndefined()
  })

  it('the phantom authored value never reaches the panel, and picking a real chip filters', async () => {
    const derived = deriveFilters(config)[0]
    render(<Harness facet={derived} />)
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }))
    fireEvent.click(
      await waitFor(() => {
        const trigger = document.querySelector(
          '[data-slot="filter-field"][aria-label="Labels"] [data-slot="filter-field-trigger"]',
        )
        if (!trigger) throw new Error('no field trigger')
        return trigger as HTMLElement
      }),
    )
    // The panel derives the chips from the rows it resolved — the authored
    // value no record carries is never offered.
    const chip = await waitFor(() => screen.getByRole('button', { name: /Beta One/ }))
    expect(screen.queryByRole('button', { name: /Never Seeded/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^loose/ })).not.toBeNull()
    fireEvent.click(chip)
    const applied = JSON.parse(screen.getByTestId('applied').textContent ?? '{}') as {
      filters: Record<string, string[]>
    }
    expect(applied.filters).toEqual({ labels: ['b1'] })

    const out = applyViewState(rows as Record<string, unknown>[], applied, ['title'])
    expect(out.map((r) => r.id)).toEqual(['R-1', 'R-3'])
  })
})
