import { describe, expect, it } from 'vitest'
import {
  deriveCockpitKpis,
  deriveCockpitPanels,
  deriveCockpitPaths,
  deriveCockpitQueue,
  hasCockpit,
} from './cockpit-model'
import { cockpitConfig, cockpitRecords } from './cockpit-fixtures'
import { liveMonitoringConfig } from '../live-fixtures'

describe('hasCockpit', () => {
  it('requires BOTH a cockpit block and map coordinate bindings', () => {
    expect(hasCockpit(cockpitConfig)).toBe(true)
    expect(hasCockpit(liveMonitoringConfig)).toBe(false) // map, no cockpit
    const noMap = { ...cockpitConfig, uiConfig: { ...cockpitConfig.uiConfig, map: undefined } }
    expect(hasCockpit(noMap)).toBe(false) // cockpit, no map
  })
})

describe('deriveCockpitKpis', () => {
  it('counts records by status for countStatus KPIs and keeps static values', () => {
    const kpis = deriveCockpitKpis(cockpitConfig, cockpitRecords)
    expect(kpis.find((k) => k.id === 'kpi-ongoing')?.value).toBe('1')
    expect(kpis.find((k) => k.id === 'kpi-action')?.value).toBe('1')
    expect(kpis.find((k) => k.id === 'kpi-fulfillment')?.value).toBe('96%')
  })
})

describe('deriveCockpitQueue', () => {
  it('maps queue bindings onto card fields, statusList colors, and banners', () => {
    const items = deriveCockpitQueue(cockpitConfig, cockpitRecords)
    const delayed = items.find((i) => i.id === 'jb-2')!
    expect(delayed.subtitle).toBe('AD 55810')
    expect(delayed.progressPct).toBe(32)
    expect(delayed.status).toEqual({ label: 'Delayed', color: 'var(--color-warning)' })
    expect(delayed.banner).toEqual({ tone: 'warning', text: 'SLA at risk on 2 stops' })
    // Search haystack covers title, subtitle, and searchCols (assignee).
    expect(delayed.searchText).toContain('harbor loop')
    expect(delayed.searchText).toContain('omar haddad')
  })
})

describe('deriveCockpitPanels', () => {
  it('derives countByCol distributions with toneMap and keeps static rows', () => {
    const [fleet, workforce] = deriveCockpitPanels(cockpitConfig, cockpitRecords)
    expect(fleet.rows.find((r) => r.label === 'Delayed')).toMatchObject({ count: 1, tone: 'warning' })
    expect(workforce.rows).toHaveLength(3)
    expect(workforce.rows[0]).toMatchObject({ label: 'On Duty', count: 22, tone: 'success' })
  })
})

describe('deriveCockpitPaths', () => {
  it('returns a dashed planned + solid actual pair for the selected record', () => {
    const paths = deriveCockpitPaths(cockpitConfig, cockpitRecords[0])
    expect(paths).toHaveLength(2)
    const planned = paths.find((p) => p.dashed)!
    const actual = paths.find((p) => !p.dashed)!
    expect(planned.points).toHaveLength(3)
    expect(actual.points).toHaveLength(3)
  })

  it('returns nothing without a selection or without route columns', () => {
    expect(deriveCockpitPaths(cockpitConfig, undefined)).toEqual([])
    expect(deriveCockpitPaths(cockpitConfig, cockpitRecords[1])).toEqual([]) // record has no path cols
  })
})
