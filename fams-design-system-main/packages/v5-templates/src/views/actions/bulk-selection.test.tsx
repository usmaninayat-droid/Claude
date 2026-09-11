import { describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { useBulkSelection, selectionSummary } from './bulk-selection'
import { recordNounFor, selectionResetKey } from './module-actions-config'
import type { EntityConfig } from '@fams/v5-composer'

/** A probe that exposes the hook's state as text + imperative handles. */
let api: ReturnType<typeof useBulkSelection>
function Probe({ ids, resetKey }: { ids: string[]; resetKey: string }) {
  api = useBulkSelection(ids, resetKey)
  return (
    <div>
      <span data-testid="count">{api.count}</span>
      <span data-testid="all">{String(api.allVisibleSelected)}</span>
      <span data-testid="some">{String(api.someVisibleSelected)}</span>
    </div>
  )
}

const count = () => screen.getByTestId('count').textContent

describe('useBulkSelection — the flat, filtered-set selection model', () => {
  it('select-all selects exactly the ids handed in (the filtered set), never more', () => {
    // UX note G.44's gate, in miniature: 3 of a larger module are visible.
    render(<Probe ids={['a', 'b', 'c']} resetKey="k1" />)
    act(() => api.selectAll())
    expect(count()).toBe('3')
    expect(screen.getByTestId('all').textContent).toBe('true')
  })

  it('reports an indeterminate (some-but-not-all) state for a partial selection', () => {
    render(<Probe ids={['a', 'b', 'c']} resetKey="k1" />)
    act(() => api.toggle('b', true))
    expect(screen.getByTestId('some').textContent).toBe('true')
    expect(screen.getByTestId('all').textContent).toBe('false')
  })

  it('toggling is idempotent and removes on false', () => {
    render(<Probe ids={['a', 'b']} resetKey="k1" />)
    act(() => api.toggle('a', true))
    act(() => api.toggle('a', true))
    expect(count()).toBe('1')
    act(() => api.toggle('a', false))
    expect(count()).toBe('0')
  })

  it('CLEARS the selection when the reset key changes (a filter change)', () => {
    // G.45/G.47: a hidden selected record is how users delete things they
    // cannot see, so a filter change clears rather than prunes.
    const { rerender } = render(<Probe ids={['a', 'b', 'c']} resetKey="k1" />)
    act(() => api.selectAll())
    expect(count()).toBe('3')
    rerender(<Probe ids={['a']} resetKey="k2" />)
    expect(count()).toBe('0')
  })

  it('keeps the selection when the visible ids change identity but the reset key does not', () => {
    // A record edit or a re-sort must not throw a selection away.
    const { rerender } = render(<Probe ids={['a', 'b']} resetKey="k1" />)
    act(() => api.toggle('a', true))
    rerender(<Probe ids={['b', 'a']} resetKey="k1" />)
    expect(count()).toBe('1')
  })

  it('drops a selected id that has left the visible set entirely', () => {
    const { rerender } = render(<Probe ids={['a', 'b']} resetKey="k1" />)
    act(() => api.toggle('b', true))
    rerender(<Probe ids={['a']} resetKey="k1" />)
    expect(count()).toBe('0')
  })

  it('clear() empties the set', () => {
    render(<Probe ids={['a', 'b']} resetKey="k1" />)
    act(() => api.selectAll())
    act(() => api.clear())
    expect(count()).toBe('0')
  })
})

describe('selectionSummary — G.44 says the scope out loud', () => {
  it('adds "(all matching filters)" only when the whole FILTERED set is selected', () => {
    expect(selectionSummary(12, true, true)).toBe('12 selected (all matching filters)')
    expect(selectionSummary(12, false, true)).toBe('12 selected')
    // Nothing is filtered — "all matching filters" would be a lie about scope.
    expect(selectionSummary(12, true, false)).toBe('12 selected')
  })
})

describe('selectionResetKey — what counts as "a filter change"', () => {
  it('changes when the search text, a filter value, or the lens changes', () => {
    const base = selectionResetKey('v1', '', { assignee: [] })
    expect(selectionResetKey('v1', 'abc', { assignee: [] })).not.toBe(base)
    expect(selectionResetKey('v1', '', { assignee: ['u1'] })).not.toBe(base)
    expect(selectionResetKey('v2', '', { assignee: [] })).not.toBe(base)
  })

  it('is stable across filter-key ORDER and across empty-vs-absent filter values', () => {
    expect(selectionResetKey('v1', 's', { a: ['1'], b: ['2'] })).toBe(
      selectionResetKey('v1', 's', { b: ['2'], a: ['1'] }),
    )
    expect(selectionResetKey('v1', 's', { a: [] })).toBe(selectionResetKey('v1', 's', {}))
  })
})

describe('recordNounFor — module-derived, never a hardcoded domain noun', () => {
  const make = (name: string): EntityConfig => ({
    code: 'x',
    name,
    systemcolumns: [],
    uiConfig: { statusList: [] },
    listcolumns: [],
  })
  it('singularizes the module label for the confirm copy', () => {
    expect(recordNounFor(make('Tasks'))).toEqual({ one: 'task', many: 'tasks' })
    expect(recordNounFor(make('Deliveries'))).toEqual({ one: 'delivery', many: 'deliveries' })
    expect(recordNounFor(make('Progress'))).toEqual({ one: 'progress', many: 'progress' })
  })
  // Finding A7b-4: a module named for a discipline, not for a plural of its
  // records, states its own noun rather than being lowercased into the slot.
  it('prefers an authored uiConfig.recordNoun over the derived one', () => {
    const config: EntityConfig = {
      ...make('Pipeline Management'),
      uiConfig: { statusList: [], recordNoun: { one: 'Task', many: 'Tasks' } },
    }
    expect(recordNounFor(config)).toEqual({ one: 'task', many: 'tasks' })
    // Without it, the derived noun is the (wrong-for-this-module) module name.
    expect(recordNounFor(make('Pipeline Management'))).toEqual({
      one: 'pipeline management',
      many: 'pipeline management',
    })
  })
  it('falls back to the derived noun when recordNoun is partial or blank', () => {
    const partial: EntityConfig = {
      ...make('Tasks'),
      uiConfig: { statusList: [], recordNoun: { one: ' ', many: 'jobs' } },
    }
    expect(recordNounFor(partial)).toEqual({ one: 'task', many: 'tasks' })
  })
})
