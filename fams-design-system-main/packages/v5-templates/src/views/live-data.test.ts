import { describe, expect, it } from 'vitest'
import { deriveLiveVehicles, hasLiveMap, parseLiveStatus, resolveLiveStatus } from './live-data'
import { liveMonitoringConfig, liveVehicleRecords } from './live-fixtures'
import { dealsConfig } from './fixtures'

describe('hasLiveMap', () => {
  it('is true only when the blueprint binds both latCol and lngCol', () => {
    expect(hasLiveMap(liveMonitoringConfig)).toBe(true)
    expect(hasLiveMap(dealsConfig)).toBe(false)
    expect(
      hasLiveMap({
        ...liveMonitoringConfig,
        uiConfig: { ...liveMonitoringConfig.uiConfig, map: { latCol: 'systemcol3' } },
      }),
    ).toBe(false)
  })
})

describe('parseLiveStatus', () => {
  it('normalizes known statuses case-insensitively', () => {
    expect(parseLiveStatus('Moving')).toBe('moving')
    expect(parseLiveStatus('IDLING')).toBe('idling')
    expect(parseLiveStatus(' stopped ')).toBe('stopped')
  })
  it('reads anything unknown as non-reporting', () => {
    expect(parseLiveStatus('Offline')).toBe('non-reporting')
    expect(parseLiveStatus(undefined)).toBe('non-reporting')
    expect(parseLiveStatus('')).toBe('non-reporting')
  })
})

describe('deriveLiveVehicles', () => {
  it('maps records onto live vehicles per the uiConfig.map bindings, in [lng, lat] order', () => {
    const vehicles = deriveLiveVehicles(liveMonitoringConfig, liveVehicleRecords)
    expect(vehicles).toHaveLength(4)
    const moving = vehicles[0]
    expect(moving).toMatchObject({
      id: 'V-101',
      position: [51.531, 25.324],
      status: 'moving',
      name: 'Mitsubishi X6734',
      plate: 'Y 31022',
      speedKmh: 100,
      heading: 45,
      driver: 'Jhon Doe',
      location: 'West Bay – Doha',
      statusSince: 'since 2 minutes',
    })
    expect(moving.record).toBe(liveVehicleRecords[0])
    expect(vehicles[1].dwell).toBe('12 mins')
    expect(vehicles[3].status).toBe('non-reporting')
  })

  it('drops records without a finite coordinate pair', () => {
    const vehicles = deriveLiveVehicles(liveMonitoringConfig, [
      ...liveVehicleRecords,
      { id: 'V-broken', uniqueidentifier: 'LV-X', title: 'No position', status: 'Moving' },
      { id: 'V-nan', uniqueidentifier: 'LV-Y', title: 'NaN', status: 'Moving', systemcol3: 'x', systemcol4: 'y' },
    ])
    expect(vehicles.map((v) => v.id)).not.toContain('V-broken')
    expect(vehicles.map((v) => v.id)).not.toContain('V-nan')
    expect(vehicles).toHaveLength(4)
  })

  it('returns nothing for an unbound module', () => {
    expect(deriveLiveVehicles(dealsConfig, liveVehicleRecords)).toEqual([])
  })
})

describe('resolveLiveStatus — telemetry fallback', () => {
  it('keeps an explicit, recognized status', () => {
    expect(resolveLiveStatus('idling', 0)).toBe('idling')
    expect(resolveLiveStatus('Moving', 0)).toBe('moving')
  })

  it('derives the reading from speed when the bound column holds a foreign vocabulary', () => {
    // Round-1 visual P2: the cockpit binds a LIFECYCLE status ("delayed"),
    // which the mobility vocabulary doesn't know — the popup then read
    // "Non-Reporting" beside "38 km/h" and every pin rendered neutral grey.
    expect(resolveLiveStatus('delayed', 38)).toBe('moving')
    expect(resolveLiveStatus('action-required', 0)).toBe('stopped')
  })

  it('stays non-reporting only when there is no telemetry at all', () => {
    expect(resolveLiveStatus('delayed', undefined)).toBe('non-reporting')
    expect(resolveLiveStatus(undefined, undefined)).toBe('non-reporting')
  })
})
