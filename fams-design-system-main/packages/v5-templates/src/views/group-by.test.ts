import { describe, expect, it } from 'vitest'
import { kindHasGroupBy, resolveGroupByOptions, resolveGroupHeaderIcon, seedGroupBy } from './group-by'

const derived = [
  { value: 'status', label: 'Stage' },
  { value: 'systemcol1', label: 'Type' },
]
const listed = [...derived, { value: 'systemcol3', label: 'Company' }]

describe('group-by — which kinds offer the control', () => {
  it('offers it for `list` (shipped) and `grouped-list` (the fixed kind)', () => {
    expect(kindHasGroupBy('list')).toBe(true)
    expect(kindHasGroupBy('grouped-list')).toBe(true)
  })

  it('still withholds it from every other kind', () => {
    for (const kind of ['kanban', 'hybrid', 'map', 'calendar', 'grid'] as const) {
      expect(kindHasGroupBy(kind)).toBe(false)
    }
    expect(kindHasGroupBy(undefined)).toBe(false)
  })
})

describe('group-by — option resolution', () => {
  it('returns the auto-derived set verbatim with no curated set (unchanged default)', () => {
    expect(resolveGroupByOptions(undefined, derived, listed)).toBe(derived)
    expect(resolveGroupByOptions([], derived, listed)).toBe(derived)
  })

  it('narrows and re-labels through a curated set, in the authored order', () => {
    expect(resolveGroupByOptions([{ col: 'systemcol1', label: 'Deal Type' }], derived, listed)).toEqual([
      { value: 'systemcol1', label: 'Deal Type' },
    ])
  })

  it('honours a curated entry on a listed column that is not auto-derived', () => {
    expect(resolveGroupByOptions([{ col: 'systemcol3', label: 'Vehicle' }], derived, listed)).toEqual([
      { value: 'systemcol3', label: 'Vehicle' },
    ])
  })

  it('drops a curated entry naming a column this module does not list', () => {
    expect(resolveGroupByOptions([{ col: 'nope' }, { col: 'status' }], derived, listed)).toEqual([
      { value: 'status', label: 'Stage' },
    ])
  })
})

describe('group-by — the opening grouping', () => {
  it('seeds nothing for `list` — the shipped kind still opens ungrouped', () => {
    expect(seedGroupBy('list', undefined, derived, [{ col: 'status', default: true }])).toBeUndefined()
  })

  it('seeds nothing for any non-list kind', () => {
    expect(seedGroupBy('kanban', undefined, derived, [{ col: 'status', default: true }])).toBeUndefined()
  })

  it('seeds the flagged curated column for `grouped-list`', () => {
    const curated = [{ col: 'status' }, { col: 'systemcol1', default: true }]
    expect(seedGroupBy('grouped-list', undefined, derived, curated)).toBe('systemcol1')
  })

  it('falls back to the first offered option when nothing is flagged', () => {
    expect(seedGroupBy('grouped-list', undefined, derived, undefined)).toBe('status')
  })

  it('ignores a flag on a column that is not actually offered', () => {
    expect(seedGroupBy('grouped-list', undefined, derived, [{ col: 'ghost', default: true }])).toBe('status')
  })

  it('leaves a `grouped-list` with no groupable column alone', () => {
    expect(seedGroupBy('grouped-list', undefined, [], undefined)).toBeUndefined()
  })

  it('never overrides a grouping the user or a saved view already set', () => {
    expect(seedGroupBy('grouped-list', 'systemcol1', derived, [{ col: 'status', default: true }])).toBe('systemcol1')
  })

  it('respects an explicit `None` (null), so clearing the grouping sticks', () => {
    expect(seedGroupBy('grouped-list', null, derived, [{ col: 'status', default: true }])).toBeNull()
  })
})

describe('resolveGroupHeaderIcon — the ACTIVE grouping\'s header glyph', () => {
  const curated = [
    { col: 'systemcol1', label: 'Vehicle', icon: 'car', default: true },
    { col: 'status', label: 'Status' },
  ]

  it('resolves the authored glyph of the column currently grouped', () => {
    expect(resolveGroupHeaderIcon(curated, 'systemcol1')).toBeDefined()
  })

  it('does not leak one entry\'s glyph onto another grouping', () => {
    expect(resolveGroupHeaderIcon(curated, 'status')).toBeUndefined()
  })

  it('is undefined while nothing is grouped, and for an uncurated module', () => {
    expect(resolveGroupHeaderIcon(curated, null)).toBeUndefined()
    expect(resolveGroupHeaderIcon(curated, undefined)).toBeUndefined()
    expect(resolveGroupHeaderIcon(undefined, 'systemcol1')).toBeUndefined()
  })

  it('renders no glyph (rather than a fallback funnel) for an unknown name', () => {
    expect(resolveGroupHeaderIcon([{ col: 'status', icon: 'not-a-glyph' }], 'status')).toBeUndefined()
  })
})
