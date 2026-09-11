import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import {
  ageMinutes,
  byAgeDescending,
  classificationCol,
  consoleKpis,
  consoleStages,
  formatAge,
  identityCol,
  listColumnKeys,
} from './console-model'
import { fleetKpis } from './fleet-model'

/**
 * console-model.test.ts — the shared blueprint→console derivation the three
 * operations-console lenses read (`console-model.ts` + `fleet-model.ts`).
 * Same house style as `cockpit/cockpit-model.test.ts`. `ageMinutes`/
 * `formatAge`/`byAgeDescending` read off `Date.now()`, so the clock is pinned
 * to a fixed instant and every record timestamp is a fixed OFFSET from it.
 */

const NOW = new Date('2026-01-01T12:00:00.000Z')
const isoMinutesAgo = (mins: number) => new Date(NOW.getTime() - mins * 60_000).toISOString()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

/**
 * A bare pipeline blueprint — `statusList` with 3 stages, an identity
 * (SmallText), a classification axis (SingleSelect, not `status`, plus a
 * SECOND one — `systemcol4` — for the `classificationCol` exclude test), and
 * a DateTime age column, per the task brief.
 */
const pipelineConfig: EntityConfig = {
  code: 'ops/triage',
  name: 'Triage Queue',
  uidPrefix: 'TRQ',
  systemcolumns: [
    { col: 'title', name: 'Title', type: 'SmallText', required: true },
    { col: 'status', name: 'Status', type: 'SingleSelect', listValues: ['New', 'In Progress', 'Resolved'] },
    { col: 'systemcol1', name: 'Priority', type: 'SingleSelect', listValues: ['Critical', 'High', 'Medium', 'Low'] },
    { col: 'systemcol2', name: 'Reported', type: 'DateTime' },
    { col: 'systemcol3', name: 'Location', type: 'SmallText' },
    { col: 'systemcol4', name: 'Shift', type: 'SingleSelect', listValues: ['Morning', 'Evening'] },
  ],
  listcolumns: [
    { col: 'title' },
    { col: 'status' },
    { col: 'systemcol1' },
    { col: 'systemcol2' },
    { col: 'systemcol3' },
  ],
  uiConfig: {
    statusList: [
      { key: 'new', label: 'New', color: 'var(--color-info)' },
      { key: 'in_progress', label: 'In Progress', color: 'var(--color-warning)' },
      { key: 'resolved', label: 'Resolved', color: 'var(--color-success)' },
    ],
  },
}

const pipelineRecords: EntityRecord[] = [
  { id: 'rec-1', uniqueidentifier: 'TRQ-1001', title: 'Leaking valve', status: 'new', systemcol1: 'Critical', systemcol2: isoMinutesAgo(5), systemcol3: 'Zone A' },
  { id: 'rec-2', uniqueidentifier: 'TRQ-1002', title: 'Broken pump', status: 'new', systemcol1: 'High', systemcol2: isoMinutesAgo(180), systemcol3: 'Zone B' },
  { id: 'rec-3', uniqueidentifier: 'TRQ-1003', title: 'Valve inspection', status: 'in_progress', systemcol1: 'Medium', systemcol2: isoMinutesAgo(1440), systemcol3: 'Zone C' },
  { id: 'rec-4', uniqueidentifier: 'TRQ-1004', title: 'Filter replaced', status: 'resolved', systemcol1: 'Low', systemcol2: isoMinutesAgo(2880), systemcol3: 'Zone A' },
  { id: 'rec-5', uniqueidentifier: 'TRQ-1005', title: 'Generator check', status: 'in_progress', systemcol1: 'High', systemcol2: isoMinutesAgo(30), systemcol3: 'Zone D' },
]

describe('consoleStages', () => {
  it('returns one stage per statusList entry, in blueprint order, with its own population + colour', () => {
    const stages = consoleStages(pipelineConfig, pipelineRecords)
    expect(stages.map((s) => s.key)).toEqual(['new', 'in_progress', 'resolved'])
    expect(stages.map((s) => s.records.length)).toEqual([2, 2, 1])
    expect(stages.find((s) => s.key === 'new')?.records.map((r) => r.id).sort()).toEqual(['rec-1', 'rec-2'])
    expect(stages.find((s) => s.key === 'new')?.color).toBe('var(--color-info)')
  })

  it('degrades to [] for a module with no statusList, rather than inventing lanes', () => {
    const noStages: EntityConfig = { ...pipelineConfig, uiConfig: { statusList: [] } }
    expect(consoleStages(noStages, pipelineRecords)).toEqual([])
  })
})

describe('consoleKpis', () => {
  it('derives one KPI tile per stage — id `stage-<key>`, value = population size', () => {
    const kpis = consoleKpis(pipelineConfig, pipelineRecords)
    expect(kpis.map((k) => k.id)).toEqual(['stage-new', 'stage-in_progress', 'stage-resolved'])
    expect(kpis.map((k) => k.value)).toEqual([2, 2, 1])
    expect(kpis.find((k) => k.id === 'stage-resolved')?.records.map((r) => r.id)).toEqual(['rec-4'])
  })
})

describe('identityCol', () => {
  it('picks the first non-Auto, non-status list column', () => {
    expect(identityCol(pipelineConfig)).toBe('title')
  })

  it('falls back to the first list key when every list column is Auto-typed', () => {
    const autoOnly: EntityConfig = {
      code: 'auto-only',
      name: 'Auto Only',
      systemcolumns: [{ col: 'uid', name: 'ID', type: 'Auto' }],
      listcolumns: [{ col: 'uid' }],
      uiConfig: { statusList: [] },
    }
    expect(identityCol(autoOnly)).toBe('uid')
  })

  it('falls back to the literal "uniqueidentifier" when there are no list columns at all', () => {
    const empty: EntityConfig = {
      code: 'empty',
      name: 'Empty',
      systemcolumns: [],
      listcolumns: [],
      uiConfig: { statusList: [] },
    }
    expect(identityCol(empty)).toBe('uniqueidentifier')
  })
})

describe('classificationCol', () => {
  it('finds the first SingleSelect column that is not `status` and has values', () => {
    expect(classificationCol(pipelineConfig)).toBe('systemcol1')
  })

  it('skips excluded columns to find the next classification axis', () => {
    expect(classificationCol(pipelineConfig, ['systemcol1'])).toBe('systemcol4')
  })

  it('returns undefined when the module declares no non-status SingleSelect column', () => {
    const noClassification: EntityConfig = {
      ...pipelineConfig,
      systemcolumns: pipelineConfig.systemcolumns.filter((c) => c.col === 'title' || c.col === 'status'),
    }
    expect(classificationCol(noClassification)).toBeUndefined()
  })
})

describe('listColumnKeys', () => {
  it('returns the listcolumns placement order', () => {
    expect(listColumnKeys(pipelineConfig)).toEqual(['title', 'status', 'systemcol1', 'systemcol2', 'systemcol3'])
  })

  it('falls back to systemcolumns order when no listcolumns are declared', () => {
    const noListcolumns: EntityConfig = { ...pipelineConfig, listcolumns: [] }
    expect(listColumnKeys(noListcolumns)).toEqual(['title', 'status', 'systemcol1', 'systemcol2', 'systemcol3', 'systemcol4'])
  })
})

describe('ageMinutes / formatAge', () => {
  it('reads exact elapsed minutes off the pinned clock', () => {
    expect(ageMinutes(pipelineRecords[0], 'systemcol2')).toBe(5)
    expect(ageMinutes(pipelineRecords[1], 'systemcol2')).toBe(180)
    expect(ageMinutes(pipelineRecords[2], 'systemcol2')).toBe(1440)
  })

  it('is undefined with no column, or an unparsable value', () => {
    expect(ageMinutes(pipelineRecords[0], undefined)).toBeUndefined()
    expect(ageMinutes({ id: 'x', systemcol2: 'not-a-date' }, 'systemcol2')).toBeUndefined()
  })

  it('formats a compact reading: minutes / hours+minutes / days+hours', () => {
    expect(formatAge(42)).toBe('42m')
    expect(formatAge(190)).toBe('3h 10m')
    expect(formatAge(3120)).toBe('2d 4h')
  })
})

describe('byAgeDescending', () => {
  it('sorts oldest-first by the age column', () => {
    const sorted = byAgeDescending(pipelineRecords, 'systemcol2')
    expect(sorted.map((r) => r.id)).toEqual(['rec-4', 'rec-3', 'rec-2', 'rec-5', 'rec-1'])
  })

  it('is a stable no-op (same reference) with no age column', () => {
    expect(byAgeDescending(pipelineRecords, undefined)).toBe(pipelineRecords)
  })
})

describe('fleetKpis', () => {
  it('unitStateCol path: one tile per declared state value, in declared order, plus a trailing total tile', () => {
    const fleetConfig: EntityConfig = {
      ...pipelineConfig,
      uiConfig: { ...pipelineConfig.uiConfig, map: { statusCol: 'systemcol1' } },
    }
    const kpis = fleetKpis(fleetConfig, pipelineRecords)
    expect(kpis.map((k) => k.id)).toEqual(['unit-Critical', 'unit-High', 'unit-Medium', 'unit-Low', 'unit-total'])
    expect(kpis.map((k) => k.value)).toEqual([1, 2, 1, 1, 5])
    expect(kpis.find((k) => k.id === 'unit-total')?.label).toBe('Total priority')
    expect(kpis.find((k) => k.id === 'unit-total')?.records).toHaveLength(5)
  })

  it('falls back to the shared stage-count tiles (no unit-total) when no unitStateCol is bound', () => {
    const kpis = fleetKpis(pipelineConfig, pipelineRecords)
    expect(kpis).toEqual(consoleKpis(pipelineConfig, pipelineRecords))
    expect(kpis.some((k) => k.id === 'unit-total')).toBe(false)
  })
})
