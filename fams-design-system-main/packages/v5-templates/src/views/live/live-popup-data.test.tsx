import { describe, expect, it } from 'vitest'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { liveMonitoringConfig, liveVehicleRecords } from '../live-fixtures'
import { deriveLivePopupData, deriveTripDateChips, hasLivePopup } from './live-popup-data'

/** A config whose blueprint authors the popup contract (spec §1.5). */
function withPopup(config: EntityConfig): EntityConfig {
  return {
    ...config,
    uiConfig: {
      ...config.uiConfig,
      map: {
        ...config.uiConfig.map,
        popup: {
          fields: [
            { col: 'driver', label: 'Driver', icon: 'user' },
            { col: 'speed', label: 'Vehicle Speed', icon: 'gauge', suffix: ' km/h' },
            { label: 'Coordinates', kind: 'coordinates' },
            { col: 'missing', label: 'Odometer' },
          ],
          eventsCol: 'events',
          tripsCol: 'trips',
          tripDatesCol: 'tripDates',
          tripSummaryCol: 'tripSummary',
          devicesCol: 'devices',
        },
      },
    },
  }
}

describe('live-popup-data — blueprint→vehicle-popup derivation (spec §1.5)', () => {
  const base = liveVehicleRecords[0]
  const record: EntityRecord = {
    ...base,
    driver: 'Jhon Doe',
    speed: 88,
    events: [{ id: 'e1', name: 'Black Spot', location: 'JLT', time: '07 Oct', severity: 'critical' }],
    trips: [{ id: 't1', startTime: '15:30', endTime: '11:21', origin: 'JLT', events: 2, distance: '30 KM', duration: '2h' }],
    tripDates: [{ id: 'd1', label: 'Today', today: true }],
    tripSummary: { distance: '43 km', trips: 30, duration: '2h43m' },
    devices: [{ id: 'dv1', name: 'GPS', imei: '35', dataRec: '12:32', value: 'All Secure' }],
  }

  it('hasLivePopup follows uiConfig.map.popup presence', () => {
    expect(hasLivePopup(liveMonitoringConfig)).toBe(false)
    expect(hasLivePopup(withPopup(liveMonitoringConfig))).toBe(true)
  })

  it('returns undefined without an authored popup section (default grid keeps rendering)', () => {
    expect(deriveLivePopupData(liveMonitoringConfig, record)).toBeUndefined()
  })

  it('maps authored fields (suffix, coordinates kind, missing → em dash) and tab columns', () => {
    const data = deriveLivePopupData(withPopup(liveMonitoringConfig), record)!
    expect(data.fields).toHaveLength(4)
    expect(data.fields![0].label).toBe('Driver')
    expect(String(data.fields![1].value)).toMatch(/ km\/h$/)
    // Coordinates kind renders the latCol/lngCol pair — SPEC P0-2 format:
    // 3 decimals with a SPACED comma ("30.037 , 72.324") — with a copy
    // affordance that copies exactly the displayed string.
    expect(String(data.fields![2].value)).toMatch(/^-?\d+\.\d{3} , -?\d+\.\d{3}$/)
    expect(data.fields![2].onCopy).toBeTypeOf('function')
    expect(data.fields![3].value).toBe('—')
    expect(data.events).toHaveLength(1)
    expect(data.trips).toHaveLength(1)
    expect(data.tripDates).toHaveLength(1)
    expect(data.tripSummary).toEqual({ distance: '43 km', trips: 30, duration: '2h43m' })
    expect(data.devices).toHaveLength(1)
  })

  it('resolves the untitled-ui icon vocabulary (SPEC P0-2) AND the deprecated lucide aliases', () => {
    const icons = [
      'user-03',
      'phone',
      'speedometer-04',
      'marker-pin-02',
      'signal-01',
      'speedometer-02',
      'alert-square',
      'thermometer-03',
      'image-05',
      'colors',
    ]
    const config: EntityConfig = {
      ...liveMonitoringConfig,
      uiConfig: {
        ...liveMonitoringConfig.uiConfig,
        map: {
          ...liveMonitoringConfig.uiConfig.map,
          popup: {
            fields: [
              ...icons.map((icon, i) => ({ col: 'driver', label: `F${i}`, icon })),
              // Deprecated aliases keep resolving (blueprints in the wild).
              { col: 'driver', label: 'Legacy user', icon: 'user' },
              { col: 'driver', label: 'Legacy gauge', icon: 'gauge' },
              // Unknown names degrade to no icon, never a crash.
              { col: 'driver', label: 'Unknown', icon: 'not-a-real-icon' },
            ],
          },
        },
      },
    }
    const data = deriveLivePopupData(config, record)!
    for (let i = 0; i < icons.length; i++) {
      expect(data.fields![i].icon, `icon "${icons[i]}" should resolve`).toBeTruthy()
    }
    expect(data.fields![icons.length].icon).toBeTruthy()
    expect(data.fields![icons.length + 1].icon).toBeTruthy()
    expect(data.fields![icons.length + 2].icon).toBeUndefined()
  })

  it('derives per-day trips + the picked-date chip through the blueprint path (16a/#15)', () => {
    const data = deriveLivePopupData(withPopup(liveMonitoringConfig), {
      ...record,
      tripDates: [
        { id: 'd1', label: '10 Oct' },
        { id: 'd2', label: 'Today', today: true },
        { id: 'd3', label: '15 Oct 2024' },
      ],
    })!
    expect(data.tripDates!.map((c) => c.calendar)).toEqual([false, false, true])
    expect(data.tripDates![0].trips).toHaveLength(1)
    expect(data.tripDates![0].summary).toBeDefined()
  })

  it('an unbound / non-array tab column simply omits that tab body', () => {
    const data = deriveLivePopupData(withPopup(liveMonitoringConfig), { ...record, events: 'nope', devices: [] })!
    expect(data.events).toBeUndefined()
    expect(data.devices).toBeUndefined()
  })
})

describe('deriveTripDateChips — per-day trips + the picked-date chip (visual #15 / interaction 16a)', () => {
  const TRIPS = [
    { id: 't1', startTime: '15:30', endTime: '11:21', origin: 'Cluster A', events: 2, distance: '30 KM', duration: '2h 43m' },
    { id: 't2', startTime: '08:10', endTime: '09:00', origin: 'Cluster B', events: 0, distance: '12 KM', duration: '50m' },
  ]
  const DATES = [
    { id: 'd1', label: '10 Oct' },
    { id: 'd2', label: 'Today', today: true },
    { id: 'd3', label: '15 Oct 2024' },
  ]

  it('marks the trailing non-today chip as the SOLID calendar chip when none is declared', () => {
    const chips = deriveTripDateChips(DATES, TRIPS)!
    expect(chips.map((c) => c.calendar)).toEqual([false, false, true])
  })

  it('never overrides a blueprint that declares its own calendar chip', () => {
    const chips = deriveTripDateChips([{ id: 'a', label: 'A', calendar: true }, { id: 'b', label: 'B' }], TRIPS)!
    expect(chips[0].calendar).toBe(true)
    expect(chips[1].calendar).toBe(false)
  })

  it('gives every chip its OWN trips so a chip click changes the body', () => {
    const chips = deriveTripDateChips(DATES, TRIPS)!
    expect(chips[0].trips).toHaveLength(1)
    expect(chips[1].trips).toHaveLength(2)
    // Distinct row identities per day — never the same array for every chip.
    expect(chips[0].trips![0].id).not.toBe(chips[1].trips![0].id)
    expect(chips[0].trips).not.toEqual(chips[1].trips)
  })

  it('summarises each day from ITS OWN rows (distance/duration summed, trips counted)', () => {
    const chips = deriveTripDateChips(DATES, TRIPS)!
    // The SUMMARY line lower-cases a known distance unit (495:8937 reads
    // `Distance: 43 km`) while the trip ROWS keep the record's `30 KM`
    // (round-3 visual #19).
    expect(chips[0].summary).toEqual({ distance: '30 km', trips: 1, duration: '2h 43m' })
    expect(chips[1].summary).toEqual({ distance: '42 km', trips: 2, duration: '3h 33m' })
    expect(chips[0].trips![0].distance).toBe('30 KM')
  })

  it('passes chips through untouched when the record carries no trips', () => {
    const chips = deriveTripDateChips(DATES, undefined)!
    expect(chips.every((c) => c.trips === undefined)).toBe(true)
    expect(chips[2].calendar).toBe(true)
  })

  it('leaves an absent / empty chip list alone', () => {
    expect(deriveTripDateChips(undefined, TRIPS)).toBeUndefined()
    expect(deriveTripDateChips([], TRIPS)).toEqual([])
  })

})
