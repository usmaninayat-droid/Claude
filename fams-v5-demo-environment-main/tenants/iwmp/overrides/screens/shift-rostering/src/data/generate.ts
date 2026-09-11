import { DISTRICTS, EXTRA_TYPES, SMART_PLAN_VERSION, TRAININGS, VEHICLE_CATS, helperCountFor, trainingById } from './masters'
import { evaluateEligibility } from './eligibility'
import type {
  AttendanceGrid,
  Designation,
  Employee,
  Lot,
  Project,
  Route,
  RouteCrew,
  RouteFrequency,
  RosterDataset,
  RosterGrid,
  RosterWeek,
  Shift,
  TrainingRecord,
} from './types'

/**
 * Synthetic LOT 4 dataset — a faithful TypeScript port of the reference
 * blueprint's `DB` IIFE, including its seeded LCG (seed 20260901) and the
 * exact order of every random draw, so the roster this screen renders is the
 * SAME roster the scope document's Appendix B figures were captured from:
 * 232 drivers, ~470 helpers, 223 smart-plan routes, 28 days from Mon 24 Aug
 * to Sun 20 Sep 2026, TODAY = 01 Sep 2026.
 *
 * Scope §13: closure is by verification "on migrated LOT 4 data"; until that
 * data is loaded, matching the blueprint's numbers is the closest honest
 * stand-in. In production this module is replaced by the WFMC employee
 * master, Smart Planning and the attendance machine (§4, §10).
 *
 * Deterministic on purpose: the board, its tests and its screenshots never
 * drift between runs.
 */

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const FN = ['RAM', 'SHYAM', 'BINOD', 'DIPAK', 'NAKUL', 'SANJIB', 'AMAN', 'SHER', 'SALMAN', 'JAFFAR', 'NOMAN', 'IBRAR', 'ZUHAIB', 'RAJ', 'DHARMJIT', 'ASIM', 'SUKHVIR', 'VINU', 'NAUSAD', 'TUFAIL', 'ASHARAF', 'LAKHAN', 'MANGLA', 'TITU', 'RAKESH', 'AMIT', 'PRASHANTH', 'SAFIKUL', 'TULARAM', 'DEVENDHAR', 'ASRAR', 'HALIM', 'ARIF', 'ASHIK', 'ASHISH', 'NADEEM', 'DINESH', 'SAHID', 'KASIM', 'DEEPAK', 'ATIKUL', 'FIROZ', 'AJAY', 'PEMBA', 'RESAM', 'PADAM', 'LAXMAN', 'ANIL', 'PRAVEEN', 'AJIT', 'AMIR', 'MAHESH', 'SUMAN', 'SHAHID', 'KESHMAN', 'YUB RAJ', 'SANJAYA', 'HANUMAN', 'ASGAR', 'MITHUN', 'RAVI', 'ABDUL', 'SHIV', 'KRISHNA', 'GYAN', 'MIN', 'TAHIR', 'KHAISTA', 'KAPIL', 'SONIHAL', 'TOSEEF', 'AJMER', 'SHAHZAD']
const LN = ['BAHADUR', 'SINGH', 'KUMAR', 'TAMANG', 'LAMA', 'RUMBA', 'BHANDARI', 'MUKTAN', 'KHAN', 'ULLAH', 'ALAM', 'SK', 'SEKH', 'GUJAR', 'ADHIKARI', 'BUKYA', 'MAGAR', 'THAPA', 'YADAV', 'DAS', 'ANSARI', 'SARDAR', 'RAHAMAN', 'ISLAM', 'HUSSAIN', 'MOHAMMAD', 'GHARTI', 'BASYAL', 'SUNAR', 'CHAUDHARY', 'KOONA', 'MACHA', 'ODDITTI', 'RAGALLA', 'NEMBANG', 'SIRPALI', 'BISHOWKARMA', 'BASHIR', 'JAN', 'HARI']

const iso = (d: Date): string => d.toISOString().slice(0, 10)
const addDays = (d: Date, n: number): Date => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
/** Weekday label for an ISO day, Monday-first (matches the workbook). */
export const weekdayOf = (day: string): string => DOW[(new Date(day).getDay() + 6) % 7] ?? 'Mon'

export function generateDataset(): RosterDataset {
  // ── Seeded LCG — identical constants and draw order to the blueprint ──
  let seed = 20260901
  const rnd = (): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const ri = (a: number, b: number): number => a + Math.floor(rnd() * (b - a + 1))
  const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)] as T

  const TODAY = new Date('2026-09-01')
  const today = iso(TODAY)

  // ── Smart plan routes (approved) ──
  const routes: Route[] = []
  const mk = (
    pfx: string,
    sl: string,
    n: number,
    shiftMix: readonly Shift[],
    freq: RouteFrequency | ((i: number) => RouteFrequency),
    proj: Project,
  ) => {
    for (let i = 1; i <= n; i++) {
      routes.push({
        id: `${pfx}_04_${sl}_${String(100 + i).padStart(3, '0')}`,
        cat: pfx,
        serviceLine: sl === 'MSW' ? 'MSW' : sl === 'BKW' ? 'BULKY' : sl,
        project: proj,
        shift: pick(shiftMix),
        freq: typeof freq === 'function' ? freq(i) : freq,
        district: pick(DISTRICTS),
        target: ri(120, 190),
        status: 'Approved',
        plan: SMART_PLAN_VERSION,
      })
    }
  }
  mk('SL', 'MSW', 36, ['DAY', 'NIGHT'], (i) => (i % 2 ? 'ALT ODD' : 'ALT EVEN'), 'MSW')
  mk('RL', 'MSW', 52, ['DAY', 'NIGHT', 'NIGHT'], 'DAILY', 'MSW')
  mk('HLC', 'MSW', 28, ['DAY', 'NIGHT'], 'DAILY', 'MSW')
  mk('HLG', 'BKW', 6, ['DAY'], 'DAILY', 'MSW')
  mk('TC15', 'BKW', 22, ['DAY', 'NIGHT'], 'DAILY', 'MSW')
  mk('TT48', 'BKW', 14, ['DAY', 'NIGHT'], 'DAILY', 'MSW')
  mk('3TPU', 'BKW', 20, ['DAY'], (i) => (i % 3 ? 'DAILY' : 'EVERY 6 DAYS'), 'MSW')
  mk('DSL', 'BKW', 6, ['DAY', 'MID'], 'DAILY', 'MSW')
  mk('CCV', 'MSW', 7, ['DAY', 'AFN'], 'DAILY', 'Commercial')
  mk('BWC', 'MSW', 4, ['DAY'], 'DAILY', 'MSW')
  mk('TW', 'TW', 10, ['DAY', 'AFN', 'NIGHT'], 'DAILY', 'MSW')
  mk('RL', 'COM', 12, ['NIGHT', 'AFN'], 'DAILY', 'Commercial')
  mk('SL', 'COM', 6, ['NIGHT'], 'DAILY', 'Commercial')

  // ── Employees ──
  const employees: Employee[] = []
  let sap = 40200
  const mkEmp = (desig: Designation, lot: Lot, n: number, opts: { shifts?: readonly Shift[] }) => {
    for (let i = 0; i < n; i++) {
      sap += ri(1, 7)
      const isD = desig.includes('DRIVER')
      const isH = desig === 'HELPER'
      const shift = pick(opts.shifts ?? (['DAY', 'DAY', 'NIGHT', 'NIGHT', 'AFN', 'EVENING', 'MID'] as const))
      const r = rnd()
      const status = r < 0.9 ? 'Active' : r < 0.94 ? 'On Leave' : r < 0.97 ? 'Training' : 'Inactive'
      const serviceLine = isD
        ? pick(['MSW', 'MSW', 'MSW', 'BULKY', 'BULKY', 'RELIEVER', 'WCP', 'TRUCK WASHING'])
        : isH
          ? pick(['MSW', 'MSW', 'MSW', 'BULKY', 'BULKY', 'WCP'])
          : 'OPERATIONS'
      const project: Project = serviceLine === 'WCP' ? 'Commercial' : rnd() < 0.12 ? 'Commercial' : 'MSW'

      const tr: TrainingRecord[] = []
      const give = (id: string, ageDays: number) => {
        const t = trainingById(id)
        if (!t) return
        const on = addDays(TODAY, -ageDays)
        tr.push({ id, date: iso(on), expiry: iso(addDays(on, Math.round(t.validity * 30.4))) })
      }
      if (isD) {
        const lic = desig === 'LIGHT DUTY DRIVER' ? 'LDD' : 'HDD'
        const pool = lic === 'LDD'
          ? ['T-3T', 'T-3T', 'T-TW']
          : ['T-RL', 'T-RL', 'T-RL', 'T-SL', 'T-SL', 'T-HL', 'T-HL', 'T-DT', 'T-DT', 'T-SK', 'T-CCV', 'T-BW', 'T-HLG', 'T-LB']
        const k = ri(1, lic === 'LDD' ? 2 : 3)
        const chosen = [...new Set(Array.from({ length: k }, () => pick(pool)))]
        chosen.forEach((id) => give(id, ri(10, 400)))
        if (rnd() < 0.96) give('T-DD', ri(30, 700))
        if (rnd() < 0.95) give('T-TBT', ri(10, 380))
      } else if (isH) {
        if (rnd() < 0.96) give('T-HS', ri(5, 200))
        if (rnd() < 0.85) give('T-BH', ri(5, 200))
        if (rnd() < 0.12) give('T-FM', ri(5, 180))
        if (rnd() < 0.95) give('T-TBT', ri(10, 380))
      } else {
        give('T-TBT', ri(10, 300))
      }

      const family = status !== 'Active'
        ? status === 'On Leave' ? 'ON LEAVE' : status === 'Training' ? 'TRAINING' : 'INACTIVE'
        : serviceLine === 'RELIEVER' ? 'RELIEVER' : serviceLine === 'WCP' ? 'WCP' : rnd() < 0.08 ? 'EXTRA ASSIGNMENT' : 'ROSTERED'

      employees.push({
        id: `E${sap}`,
        sap,
        name: `${pick(FN)} ${pick(LN)}`,
        desig,
        lot,
        licence: isD ? (desig === 'LIGHT DUTY DRIVER' ? 'LDD' : 'HDD') : '',
        contractor: isH ? 'BEEAH-SIDRA' : pick(['BEEAH', 'BEEAH', 'SIDRA CAMP', 'REACH']),
        shift,
        serviceLine,
        project,
        status,
        weeklyOff: pick(DOW),
        color: ri(0, 7),
        trainings: tr,
        family,
        extraType: null,
        route: null,
        vehicle: isD ? String(ri(10000, 99999)) : '',
      })
    }
  }
  mkEmp('HEAVY DUTY DRIVER', 'LOT 4', 203, {})
  mkEmp('LIGHT DUTY DRIVER', 'LOT 4', 29, { shifts: ['DAY', 'DAY', 'AFN'] })
  mkEmp('HELPER', 'LOT 4', 380, {})
  mkEmp('SUPERVISOR', 'LOT 4', 14, { shifts: ['DAY', 'NIGHT', 'AFN'] })
  mkEmp('FLEET CONTROLLER', 'LOT 4', 4, { shifts: ['DAY', 'NIGHT'] })
  mkEmp('DISPATCHER', 'LOT 4', 3, { shifts: ['DAY', 'NIGHT'] })
  mkEmp('AREA MANAGER', 'LOT 4', 2, { shifts: ['DAY'] })
  mkEmp('OPERATIONS MANAGER', 'LOT 4', 1, { shifts: ['DAY'] })
  mkEmp('HEAVY DUTY DRIVER', 'LOT 3', 40, {})
  mkEmp('HELPER', 'LOT 3', 60, {})
  mkEmp('HEAVY DUTY DRIVER', 'LOT 5', 22, {})
  mkEmp('HELPER', 'LOT 5', 30, {})
  employees.forEach((e) => {
    if (e.family === 'EXTRA ASSIGNMENT') e.extraType = pick(EXTRA_TYPES)
  })

  // ── Roster period: 4 weeks, Mon 24 Aug – Sun 20 Sep 2026 ──
  const days: string[] = []
  for (let i = 0; i < 28; i++) days.push(iso(addDays(new Date('2026-08-24'), i)))
  const roster: RosterGrid = {}
  const routeCrew: Record<string, RouteCrew> = {}

  const drvOK = (e: Employee, r: Route): boolean => evaluateEligibility({ employee: e, route: r, today }).ok

  // Primary routes → eligible ROSTERED drivers (shift-matched first).
  const unassigned = [...routes]
  for (const e of employees) {
    if (!e.desig.includes('DRIVER') || e.family !== 'ROSTERED') continue
    let idx = unassigned.findIndex((r) => r.shift === e.shift && drvOK(e, r))
    if (idx < 0) idx = unassigned.findIndex((r) => drvOK(e, r))
    if (idx >= 0) {
      const r = unassigned.splice(idx, 1)[0] as Route
      e.route = r.id
      e.shift = r.shift
      routeCrew[r.id] = { driver: e.id, helpers: [] }
    }
  }
  // Helpers per route by category (BLD-04).
  const hpool = employees.filter((e) => e.desig === 'HELPER' && e.family === 'ROSTERED')
  let hi = 0
  for (const r of routes) {
    const crew = routeCrew[r.id]
    if (!crew) continue
    const n = helperCountFor(r.cat)
    for (let k = 0; k < n && hi < hpool.length; k++) {
      const h = hpool[hi++] as Employee
      h.route = r.id
      h.shift = r.shift
      crew.helpers.push(h.id)
    }
  }
  // Leave blocks.
  const leaveOf: Record<string, { code: 'AV' | 'EL'; from: number; to: number }> = {}
  for (const e of employees) {
    const r = rnd()
    if (r < 0.06) {
      const s = ri(0, 20)
      leaveOf[e.id] = { code: 'AV', from: s, to: s + ri(5, 14) }
    } else if (r < 0.09) {
      const s = ri(0, 24)
      leaveOf[e.id] = { code: 'EL', from: s, to: s + ri(1, 4) }
    }
  }
  const routeById = new Map(routes.map((r) => [r.id, r]))
  const bumpRoute = (id: string, delta: number): string =>
    id.replace(/_(\d{3})$/, (_m, n: string) => `_${String(Number(n) + delta).padStart(3, '0')}`)

  for (const e of employees) {
    const row: Record<string, import('./types').RosterCell | null> = {}
    days.forEach((d, i) => {
      const dow = weekdayOf(d)
      const lv = leaveOf[e.id]
      if (lv && i >= lv.from && i <= lv.to) { row[d] = { code: lv.code }; return }
      if (e.status === 'Inactive') { row[d] = null; return }
      if (e.status === 'On Leave') { row[d] = { code: 'AV' }; return }
      if (dow === e.weeklyOff) { row[d] = { code: 'WO' }; return }
      if (e.status === 'Training') { row[d] = { code: 'SB', ref: 'OJT' }; return }
      if (e.family === 'RELIEVER') { row[d] = { code: 'RL' }; return }
      if (e.family === 'EXTRA ASSIGNMENT') { row[d] = { code: 'EX', ref: e.extraType ?? 'Extra' }; return }
      if (e.family === 'WCP') { row[d] = { code: 'EX', ref: 'WCP' }; return }
      if (e.route) {
        const rt = routeById.get(e.route)
        if (rt) {
          const dom = new Date(d).getDate()
          // BLD-03 — frequency drives the pattern: alternate odd/even pairs, every-N with on-call between.
          if (rt.freq === 'ALT ODD' && dom % 2 === 0) { row[d] = { code: 'RT', ref: bumpRoute(rt.id, 1) }; return }
          if (rt.freq === 'ALT EVEN' && dom % 2 === 1) { row[d] = { code: 'RT', ref: bumpRoute(rt.id, -1) }; return }
          if (rt.freq === 'EVERY 6 DAYS' && i % 6 !== 0) { row[d] = { code: 'OC' }; return }
          row[d] = { code: 'RT', ref: rt.id }
          return
        }
      }
      if (!e.desig.includes('DRIVER') && e.desig !== 'HELPER') { row[d] = { code: 'EX', ref: 'Operations' }; return }
      row[d] = null // pending rostering
    })
    roster[e.id] = row
  }

  const weeks: RosterWeek[] = [0, 1, 2, 3].map((w) => ({
    w,
    from: days[w * 7] as string,
    to: days[w * 7 + 6] as string,
    status: w <= 1 ? 'Published' : w === 2 ? 'Approved' : 'Draft',
    version: w === 3 ? 'v3' : 'v5',
  }))

  // ── Attendance (biometric) for days ≤ today ──
  const attendance: AttendanceGrid = {}
  for (const e of employees) {
    const row: Record<string, import('./types').PunchRecord | null> = {}
    for (const d of days) {
      if (d > today) continue
      const c = roster[e.id]?.[d]
      if (!c || c.code === 'WO' || c.code === 'AV' || c.code === 'EL') continue
      const r = rnd()
      if (r < 0.935) {
        row[d] = {
          in: `0${ri(3, 5)}:${String(ri(40, 59)).padStart(2, '0')}`,
          out: `1${ri(2, 4)}:${String(ri(0, 30)).padStart(2, '0')}`,
          status: r < 0.9 ? 'Present' : 'Late',
        }
      } else {
        row[d] = null // absent
      }
    }
    attendance[e.id] = row
  }

  return { today, days, weeks, employees, routes, roster, routeCrew, attendance }
}

export { TRAININGS, VEHICLE_CATS }
