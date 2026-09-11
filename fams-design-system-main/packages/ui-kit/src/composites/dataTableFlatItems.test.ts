import { describe, it, expect } from 'vitest'
import { buildFlatRenderItems } from './dataTableFlatItems'

describe('buildFlatRenderItems', () => {
  it('returns a flat "row" list when groups is null', () => {
    const items = buildFlatRenderItems<string>({
      groups: null,
      flatRows: ['a', 'b', 'c'],
      collapsedGroupKeys: new Set(),
    })
    expect(items).toEqual([
      { kind: 'row', row: 'a', index: 0 },
      { kind: 'row', row: 'b', index: 1 },
      { kind: 'row', row: 'c', index: 2 },
    ])
  })

  it('interleaves group headers with each group\'s rows, in group order', () => {
    const items = buildFlatRenderItems<string>({
      groups: [
        { key: 'Lot 1', rows: [{ row: 'a', index: 0 }] },
        { key: 'Lot 2', rows: [{ row: 'b', index: 1 }] },
      ],
      flatRows: [],
      collapsedGroupKeys: new Set(),
    })
    expect(items).toEqual([
      { kind: 'group-header', groupKey: 'Lot 1', rowCount: 1 },
      { kind: 'row', row: 'a', index: 0 },
      { kind: 'group-header', groupKey: 'Lot 2', rowCount: 1 },
      { kind: 'row', row: 'b', index: 1 },
    ])
  })

  it('omits a collapsed group\'s rows but keeps its header', () => {
    const items = buildFlatRenderItems<string>({
      groups: [
        { key: 'Lot 1', rows: [{ row: 'a', index: 0 }] },
        { key: 'Lot 2', rows: [{ row: 'b', index: 1 }] },
      ],
      flatRows: [],
      collapsedGroupKeys: new Set(['Lot 1']),
    })
    expect(items).toEqual([
      { kind: 'group-header', groupKey: 'Lot 1', rowCount: 1 },
      { kind: 'group-header', groupKey: 'Lot 2', rowCount: 1 },
      { kind: 'row', row: 'b', index: 1 },
    ])
  })

  it('appends a group-summary item after an expanded group\'s rows', () => {
    const items = buildFlatRenderItems<number>({
      groups: [{ key: 'Lot 1', rows: [{ row: 10, index: 0 }, { row: 30, index: 1 }] }],
      flatRows: [],
      collapsedGroupKeys: new Set(),
      getGroupSummary: (_key, rows) => ({ speed: String(rows.reduce((a, b) => a + b, 0)) }),
    })
    expect(items).toEqual([
      { kind: 'group-header', groupKey: 'Lot 1', rowCount: 2 },
      { kind: 'row', row: 10, index: 0 },
      { kind: 'row', row: 30, index: 1 },
      { kind: 'group-summary', groupKey: 'Lot 1', cells: { speed: '40' } },
    ])
  })

  it('omits the group-summary item when a group is collapsed', () => {
    const items = buildFlatRenderItems<number>({
      groups: [{ key: 'Lot 1', rows: [{ row: 10, index: 0 }] }],
      flatRows: [],
      collapsedGroupKeys: new Set(['Lot 1']),
      getGroupSummary: (_key, rows) => ({ speed: String(rows.length) }),
    })
    expect(items).toEqual([{ kind: 'group-header', groupKey: 'Lot 1', rowCount: 1 }])
  })

  it('omits the group-summary item when the builder returns undefined', () => {
    const items = buildFlatRenderItems<number>({
      groups: [{ key: 'Lot 1', rows: [{ row: 10, index: 0 }] }],
      flatRows: [],
      collapsedGroupKeys: new Set(),
      getGroupSummary: () => undefined,
    })
    expect(items).toEqual([
      { kind: 'group-header', groupKey: 'Lot 1', rowCount: 1 },
      { kind: 'row', row: 10, index: 0 },
    ])
  })
})
