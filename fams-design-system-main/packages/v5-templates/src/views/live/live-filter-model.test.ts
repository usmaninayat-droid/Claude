import { describe, expect, it } from 'vitest'
import { deriveFilters } from '@fams/v5-composer'
import { liveMonitoringConfig, liveVehicleRecords } from '../live-fixtures'
import {
  applyLiveFilters,
  buildLiveFilterGroups,
  conditionCount,
  countActiveLiveFilters,
  deriveTagGroups,
  emptyLiveFilterValue,
  matchSegments,
  orderLiveFilterGroups,
  toggleLiveFilter,
} from './live-filter-model'
import { defaultLiveListColumns, defaultLiveShownColumns, liveListColumnCatalog, stepWidthState } from './live-list-model'

const facets = deriveFilters(liveMonitoringConfig)

describe('live-filter-model', () => {
  it('builds checkbox groups with per-option counts', () => {
    const groups = buildLiveFilterGroups(facets, liveVehicleRecords)
    const status = groups.find((g) => g.col === 'status')!
    expect(status.label).toBe('Mobility Status')
    expect(status.options.find((o) => o.value === 'Moving')?.count).toBe(1)
    expect(status.options.find((o) => o.value === 'Stopped')?.count).toBe(1)
    const fuel = groups.find((g) => g.col === 'systemcol11')!
    expect(fuel.options.map((o) => o.value)).toEqual(['Petrol', 'Diesel', 'Hybrid'])
  })

  it('reorders groups with selections to the top, stable otherwise', () => {
    const groups = buildLiveFilterGroups(facets, liveVehicleRecords)
    const value = toggleLiveFilter(emptyLiveFilterValue(), 'systemcol11', 'Petrol', true)
    const ordered = orderLiveFilterGroups(groups, value)
    expect(ordered[0].col).toBe('systemcol11')
    expect(orderLiveFilterGroups(groups, emptyLiveFilterValue()).map((g) => g.col)).toEqual(groups.map((g) => g.col))
  })

  it('applies filters (AND across groups, OR within) and tags', () => {
    let value = toggleLiveFilter(emptyLiveFilterValue(), 'status', 'Moving', true)
    value = toggleLiveFilter(value, 'status', 'Idling', true)
    expect(applyLiveFilters(liveVehicleRecords, value).map((r) => r.id)).toEqual(['V-101', 'V-102'])
    const tagged = { ...emptyLiveFilterValue(), tags: ['Street'] }
    expect(applyLiveFilters(liveVehicleRecords, tagged, 'systemcol10').map((r) => r.id)).toEqual(['V-101', 'V-103'])
  })

  it('counts active conditions and unchecks cleanly', () => {
    let value = toggleLiveFilter(emptyLiveFilterValue(), 'status', 'Moving', true)
    value = { ...value, tags: ['Street'] }
    expect(countActiveLiveFilters(value)).toBe(2)
    expect(conditionCount(value)).toBe(2)
    value = toggleLiveFilter(value, 'status', 'Moving', false)
    expect(value.filters.status).toBeUndefined()
  })

  it('derives tag groups from the bound tagsCol', () => {
    const groups = deriveTagGroups(liveMonitoringConfig, liveVehicleRecords)
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Shift Type')
    expect(groups[0].options).toEqual(['Night Shift', 'Street'])
    expect(groups[0].tone).toBe('warning')
  })

  it('adds a second, muted tag group from privateTagsCol (SPEC §2.5 "My Private Tags"), and tags filter across BOTH columns', () => {
    const config = {
      ...liveMonitoringConfig,
      systemcolumns: [
        ...liveMonitoringConfig.systemcolumns,
        { id: 'fld_ptags', col: 'systemcol12', name: 'My Private Tags', type: 'SmallText' as const },
      ],
      uiConfig: {
        ...liveMonitoringConfig.uiConfig,
        map: { ...liveMonitoringConfig.uiConfig.map, privateTagsCol: 'systemcol12' },
      },
    }
    const records = liveVehicleRecords.map((r, i) => (i === 3 ? { ...r, systemcol12: 'Watchlist' } : r))
    const groups = deriveTagGroups(config, records)
    expect(groups.map((g) => g.label)).toEqual(['Shift Type', 'My Private Tags'])
    expect(groups[1].tone).toBe('muted')
    expect(groups[1].options).toEqual(['Watchlist'])
    // A private tag selects the record carrying it in the SECOND column.
    const tagged = { ...emptyLiveFilterValue(), tags: ['Watchlist'] }
    expect(applyLiveFilters(records, tagged, 'systemcol10', 'systemcol12').map((r) => r.id)).toEqual(['V-104'])
    // Mixed selection still ORs across both vocabularies.
    const mixed = { ...emptyLiveFilterValue(), tags: ['Watchlist', 'Street'] }
    expect(applyLiveFilters(records, mixed, 'systemcol10', 'systemcol12').map((r) => r.id)).toEqual([
      'V-101',
      'V-103',
      'V-104',
    ])
  })

  it('splits matched substrings for highlighting (case-insensitive)', () => {
    expect(matchSegments('Mitsubishi X6734', 'x67')).toEqual([
      { text: 'Mitsubishi ', match: false },
      { text: 'X67', match: true },
      { text: '34', match: false },
    ])
    expect(matchSegments('abc', '')).toEqual([{ text: 'abc', match: false }])
  })
})

describe('live-list-model', () => {
  it('steps width states and clamps at the ends', () => {
    expect(stepWidthState('collapsed', 'wider')).toBe('expanded')
    expect(stepWidthState('expanded', 'wider')).toBe('fully-expanded')
    expect(stepWidthState('fully-expanded', 'wider')).toBe('fully-expanded')
    expect(stepWidthState('collapsed', 'narrower')).toBe('collapsed')
  })

  it('reveals expandedColumns from the Expanded state up, ordered identity → expanded → remaining (SPEC §2.2)', () => {
    expect(defaultLiveListColumns(liveMonitoringConfig, 'collapsed')).toEqual(['title', 'status', 'systemcol2'])
    // Expanded order: identity col first, then the blueprint's expandedColumns
    // (Speed, Timestamp), then the remaining collapsed columns — VEHICLE ·
    // SPEED · TIMESTAMP · … , not collapsed-then-extras-appended.
    expect(defaultLiveListColumns(liveMonitoringConfig, 'expanded')).toEqual([
      'title',
      'systemcol2',
      'systemcol9',
      'status',
    ])
  })

  it('catalogs every systemcolumn with the title column required', () => {
    const catalog = liveListColumnCatalog(liveMonitoringConfig)
    expect(catalog.find((c) => c.key === 'title')?.required).toBe(true)
    expect(catalog.find((c) => c.key === 'systemcol5')?.group).toBe('Other Fields')
  })

  it('decouples the Columns-popover Shown defaults from the collapsed table columns (SPEC §2.6 vs §2.2)', () => {
    // Unbound → the popover seeds from the collapsed columns (back-compat).
    expect(defaultLiveShownColumns(liveMonitoringConfig)).toEqual(['title', 'status', 'systemcol2'])
    // Bound uiConfig.map.columnsShown (ids or col keys) wins, mapped to cols.
    const bound = {
      ...liveMonitoringConfig,
      uiConfig: {
        ...liveMonitoringConfig.uiConfig,
        map: { ...liveMonitoringConfig.uiConfig.map, columnsShown: ['fld_title', 'fld_speed', 'fld_driver', 'fld_since'] },
      },
    }
    expect(defaultLiveShownColumns(bound)).toEqual(['title', 'systemcol2', 'systemcol5', 'systemcol9'])
    // The rendered collapsed columns stay the §2.2 set, untouched.
    expect(defaultLiveListColumns(bound, 'collapsed')).toEqual(['title', 'status', 'systemcol2'])
    // The catalog is unaffected by columnsShown — its sections come from the
    // blueprint's own SystemColumn.group (SPEC §2.6's category headers).
    const catalog = liveListColumnCatalog(bound)
    expect(catalog.find((c) => c.key === 'systemcol5')?.group).toBe('Other Fields')
  })

  it('sections the catalog by the blueprint SystemColumn.group (SPEC §2.6 category headers)', () => {
    const grouped = {
      ...liveMonitoringConfig,
      systemcolumns: liveMonitoringConfig.systemcolumns.map((c) =>
        c.col === 'systemcol5' ? { ...c, group: 'Workforce – Personal Info' } : c.col === 'title' ? { ...c, group: 'Asset – Basic Info' } : c,
      ),
    }
    const catalog = liveListColumnCatalog(grouped)
    expect(catalog.find((c) => c.key === 'systemcol5')?.group).toBe('Workforce – Personal Info')
    expect(catalog.find((c) => c.key === 'title')?.group).toBe('Asset – Basic Info')
    // Once a blueprint CURATES its catalog, the internal binding columns it
    // leaves ungrouped stop being surfaced: Figma's chooser (495:19004) has
    // no trailing catch-all group (visual #5).
    expect(catalog.find((c) => c.key === 'status')).toBeUndefined()
    // …but a blueprint that groups NOTHING still gets its whole field set.
    expect(liveListColumnCatalog(liveMonitoringConfig).find((c) => c.key === 'status')?.group).toBe('Other Fields')
    // Visual #6: every row carries a 16px lead glyph.
    expect(catalog.every((c) => c.icon)).toBe(true)
  })
})
