import { describe, expect, it } from 'vitest'
import { InMemorySavedViewsAdapter, applyViewState, type SavedView } from './saved-views'

const ctx = { userId: 'u1', moduleId: 'deals' }

describe('InMemorySavedViewsAdapter — round-trip', () => {
  it('lists empty, saves, gets, and deletes per user+module', () => {
    const adapter = new InMemorySavedViewsAdapter()
    expect(adapter.list(ctx)).toEqual([])

    const view: SavedView = { id: 'v1', label: 'My deals', kind: 'list', state: { search: 'globex' } }
    adapter.save(ctx, view)
    expect(adapter.list(ctx)).toHaveLength(1)
    expect(adapter.get(ctx, 'v1')).toEqual(view)

    // updates in place
    adapter.save(ctx, { ...view, label: 'Renamed' })
    expect(adapter.list(ctx)).toHaveLength(1)
    expect(adapter.get(ctx, 'v1')?.label).toBe('Renamed')

    adapter.delete(ctx, 'v1')
    expect(adapter.list(ctx)).toEqual([])
  })

  it('scopes views to the user+module key', () => {
    const adapter = new InMemorySavedViewsAdapter()
    adapter.save(ctx, { id: 'v1', label: 'A', kind: 'list' })
    expect(adapter.list({ userId: 'u2', moduleId: 'deals' })).toEqual([])
    expect(adapter.list({ userId: 'u1', moduleId: 'companies' })).toEqual([])
  })

  it('seeds from a constructor map', () => {
    const adapter = new InMemorySavedViewsAdapter({
      'u1::deals': [{ id: 'seed', label: 'Seed', kind: 'kanban' }],
    })
    expect(adapter.list(ctx).map((v) => v.id)).toEqual(['seed'])
  })
})

describe('applyViewState — filters / search / sort (serializable)', () => {
  const rows = [
    { id: '1', title: 'Globex', status: 'lead', priority: 'High' },
    { id: '2', title: 'Soylent', status: 'won', priority: 'Low' },
    { id: '3', title: 'Initech', status: 'lead', priority: 'High' },
  ]
  const cols = ['title', 'status']

  it('returns everything with no state', () => {
    expect(applyViewState(rows, undefined, cols)).toHaveLength(3)
  })

  it('filters by a multi-select facet (array value)', () => {
    const out = applyViewState(rows, { filters: { status: ['lead'] } }, cols)
    expect(out.map((r) => r.id)).toEqual(['1', '3'])
  })

  it('applies free-text search over the search columns', () => {
    const out = applyViewState(rows, { search: 'soy' }, cols)
    expect(out.map((r) => r.id)).toEqual(['2'])
  })

  it('sorts ascending / descending and round-trips through JSON', () => {
    const state = JSON.parse(JSON.stringify({ sort: { key: 'title', direction: 'asc' as const } }))
    expect(applyViewState(rows, state, cols).map((r) => r.title)).toEqual(['Globex', 'Initech', 'Soylent'])
    const desc = applyViewState(rows, { sort: { key: 'title', direction: 'desc' } }, cols)
    expect(desc.map((r) => r.title)).toEqual(['Soylent', 'Initech', 'Globex'])
  })

  it('combines filter + search', () => {
    const out = applyViewState(rows, { filters: { priority: ['High'] }, search: 'init' }, cols.concat('priority'))
    expect(out.map((r) => r.id)).toEqual(['3'])
  })
})
