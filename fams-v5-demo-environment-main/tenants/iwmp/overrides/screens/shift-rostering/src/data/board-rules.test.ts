import { describe, expect, it } from 'vitest'
import { canMove, canPlace, type PlaceContext } from './board-rules'
import type { Employee, Route, RosterGrid } from './types'

const TODAY = '2026-09-01'
const WEEK = ['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06']

function employee(over: Partial<Employee> = {}): Employee {
  return {
    id: 'E1',
    sap: 1001,
    name: 'RAM BAHADUR',
    desig: 'HEAVY DUTY DRIVER',
    lot: 'LOT 4',
    licence: 'HDD',
    contractor: 'BEEAH',
    shift: 'DAY',
    serviceLine: 'MSW',
    project: 'MSW',
    status: 'Active',
    weeklyOff: 'Fri',
    color: 0,
    trainings: [
      { id: 'T-HL', date: '2026-06-01', expiry: '2027-06-01' },
      { id: 'T-DD', date: '2026-01-01', expiry: '2028-01-01' },
      { id: 'T-TBT', date: '2026-01-01', expiry: '2027-01-01' },
    ],
    family: 'ROSTERED',
    extraType: null,
    route: null,
    vehicle: 'HLC',
    ...over,
  }
}

function route(id: string, cat: string): Route {
  return { id, cat, serviceLine: 'MSW', project: 'MSW', shift: 'DAY', freq: 'DAILY', district: 'Baniyas', target: 40, status: 'Approved', plan: 'SP-2026-09' }
}

const HLC = route('HLC_04_MSW_001', 'HLC')
const SL = route('SL_04_MSW_001', 'SL')

function ctx(e: Employee, day: string, roster: RosterGrid = {}, others: Employee[] = []): PlaceContext {
  return {
    employee: e,
    day,
    roster,
    routeById: new Map([HLC, SL].map((r) => [r.id, r])),
    employees: [e, ...others],
    weekDays: WEEK,
    today: TODAY,
    isLocked: false,
  }
}

describe('canPlace — acceptance scenarios (scope §12)', () => {
  it('AT-01: driver trained only on HLC is blocked on an SL route, allowed on HLC', () => {
    const e = employee()
    const sl = canPlace({ code: 'RT', ref: SL.id }, ctx(e, '2026-09-02'))
    expect(sl.ok).toBe(false)
    expect(sl.reasons[0]).toContain('Training not completed: Side Loader Operation')
    expect(canPlace({ code: 'RT', ref: HLC.id }, ctx(e, '2026-09-02')).ok).toBe(true)
  })

  it('AT-02/AT-03: expired-within-grace warns, expired beyond grace blocks', () => {
    const grace = employee({ trainings: [{ id: 'T-HL', date: '2025-07-01', expiry: '2026-07-18' }, { id: 'T-DD', date: '2026-01-01', expiry: '2028-01-01' }] })
    const v = canPlace({ code: 'RT', ref: HLC.id }, ctx(grace, '2026-09-02'))
    expect(v.ok).toBe(true)
    expect(v.warns[0]).toMatch(/expired 45 days ago/)

    const blocked = employee({ trainings: [{ id: 'T-HL', date: '2025-04-01', expiry: '2026-05-04' }, { id: 'T-DD', date: '2026-01-01', expiry: '2028-01-01' }] })
    const b = canPlace({ code: 'RT', ref: HLC.id }, ctx(blocked, '2026-09-02'))
    expect(b.ok).toBe(false)
    expect(b.reasons[0]).toMatch(/expired 120 days ago/)
  })

  it('AT-04: inactive / on-leave employee gets no work duty, only WO / AV / EL', () => {
    const e = employee({ status: 'On Leave' })
    expect(canPlace({ code: 'RL' }, ctx(e, '2026-09-02')).ok).toBe(false)
    expect(canPlace({ code: 'RT', ref: HLC.id }, ctx(e, '2026-09-02')).ok).toBe(false)
    expect(canPlace({ code: 'WO' }, ctx(e, '2026-09-02')).ok).toBe(true)
  })

  it('AT-05: an approved AV cell cannot be overwritten or cleared', () => {
    const e = employee()
    const roster: RosterGrid = { E1: { '2026-09-02': { code: 'AV' } } }
    expect(canPlace({ code: 'RT', ref: HLC.id }, ctx(e, '2026-09-02', roster)).ok).toBe(false)
    expect(canPlace(null, ctx(e, '2026-09-02', roster)).ok).toBe(false)
  })

  it('AT-06: a second driver on the same route, same day is blocked', () => {
    const a = employee()
    const b = employee({ id: 'E2', sap: 1002, name: 'SHYAM SINGH' })
    const roster: RosterGrid = { E2: { '2026-09-02': { code: 'RT', ref: HLC.id } } }
    const v = canPlace({ code: 'RT', ref: HLC.id }, ctx(a, '2026-09-02', roster, [b]))
    expect(v.ok).toBe(false)
    expect(v.reasons[0]).toContain('SHYAM SINGH')
  })

  it('BR-07: a second weekly off is allowed but flagged', () => {
    const e = employee()
    const roster: RosterGrid = { E1: { '2026-09-03': { code: 'WO' } } }
    const v = canPlace({ code: 'WO' }, ctx(e, '2026-09-05', roster))
    expect(v.ok).toBe(true)
    expect(v.warns[0]).toMatch(/Second weekly off/)
  })

  it('BR-10 / past days: published week and past dates are read only', () => {
    const e = employee()
    expect(canPlace({ code: 'OC' }, { ...ctx(e, '2026-09-02'), isLocked: true }).ok).toBe(false)
    expect(canPlace({ code: 'OC' }, ctx(e, '2026-08-31')).ok).toBe(false)
  })
})

describe('canMove', () => {
  it('moves a route only where the target employee is eligible', () => {
    const a = employee()
    const b = employee({ id: 'E2', sap: 1002, name: 'SHYAM SINGH', trainings: [{ id: 'T-DD', date: '2026-01-01', expiry: '2028-01-01' }] })
    const roster: RosterGrid = { E1: { '2026-09-02': { code: 'RT', ref: HLC.id } } }
    const cell = { code: 'RT' as const, ref: HLC.id }
    expect(canMove(cell, ctx(a, '2026-09-02', roster, [b]), ctx(b, '2026-09-02', roster, [a])).ok).toBe(false)
    expect(canMove(cell, ctx(a, '2026-09-02', roster), ctx(a, '2026-09-03', roster)).ok).toBe(true)
  })

  it('never moves leave', () => {
    const e = employee()
    expect(canMove({ code: 'EL' }, ctx(e, '2026-09-02'), ctx(e, '2026-09-03')).ok).toBe(false)
  })
})
