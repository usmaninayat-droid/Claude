import type { Duty, Training, VehicleCategory } from './types'

/**
 * Masters — transcribed VERBATIM from the reference blueprint
 * (IWMP_Manpower_Rostering_Blueprint.html, `DB.trainings` /
 * `DB.vehicleCats` / `DB.duties` / `DB.extraTypes`). The scope names the
 * blueprint as the behavioural authority (§1), so these are not a design
 * choice here: they are the requirement. Scope §4 lists them as IWMP masters
 * maintained by HSE / Operations; in production they arrive from those
 * masters, and this module is the seam that would read them.
 */

/** TRN-03 — training master with HSE-configurable validity (6 / 12 / 24 months). */
export const TRAININGS: readonly Training[] = [
  { id: 'T-SL', name: 'Side Loader Operation', validity: 12, cat: 'Driver' },
  { id: 'T-RL', name: 'Rear End Loader Operation', validity: 12, cat: 'Driver' },
  { id: 'T-HL', name: 'Hook Loader (HLC) Operation', validity: 12, cat: 'Driver' },
  { id: 'T-HLG', name: 'Hook Loader with Grabber', validity: 12, cat: 'Driver' },
  { id: 'T-SK', name: 'Skip / Double Skip Loader (DSL)', validity: 12, cat: 'Driver' },
  { id: 'T-DT', name: 'Dump Truck / Tipper (TC15, TT48)', validity: 12, cat: 'Driver' },
  { id: 'T-3T', name: '3-Ton Pickup Operation', validity: 12, cat: 'Driver' },
  { id: 'T-CCV', name: 'Compactor Container Vehicle (CCV)', validity: 12, cat: 'Driver' },
  { id: 'T-BW', name: 'Bin Washer Vehicle (BWC)', validity: 6, cat: 'Driver' },
  { id: 'T-LB', name: 'Low Bed Trailer', validity: 12, cat: 'Driver' },
  { id: 'T-TW', name: 'Truck Wash Bay Operation', validity: 6, cat: 'Driver' },
  { id: 'T-DD', name: 'Defensive Driving', validity: 24, cat: 'Driver' },
  { id: 'T-HS', name: 'Waste Collection Safety (Helper)', validity: 6, cat: 'Helper' },
  { id: 'T-BH', name: 'Manual Bin Handling', validity: 6, cat: 'Helper' },
  { id: 'T-FM', name: 'Flag Man / Traffic Marshal', validity: 6, cat: 'Helper' },
  { id: 'T-TBT', name: 'HSE Induction', validity: 12, cat: 'All' },
]

/** TRN-08 — vehicle category ↔ training matrix, keyed by route prefix. */
export const VEHICLE_CATS: readonly VehicleCategory[] = [
  { code: 'SL', name: 'Side Loader', lic: 'HDD', req: ['T-SL', 'T-DD'], helperReq: ['T-HS'] },
  { code: 'RL', name: 'Rear End Loader', lic: 'HDD', req: ['T-RL', 'T-DD'], helperReq: ['T-HS', 'T-BH'] },
  { code: 'HLC', name: 'Hook Loader Compactor', lic: 'HDD', req: ['T-HL', 'T-DD'], helperReq: ['T-HS'] },
  { code: 'HLG', name: 'Hook Loader + Grabber', lic: 'HDD', req: ['T-HL', 'T-HLG', 'T-DD'], helperReq: ['T-HS'] },
  { code: 'DSL', name: 'Double Skip Loader', lic: 'HDD', req: ['T-SK', 'T-DD'], helperReq: ['T-HS'] },
  { code: 'TC15', name: 'Dump Truck 15m³', lic: 'HDD', req: ['T-DT', 'T-DD'], helperReq: ['T-HS', 'T-BH'] },
  { code: 'TT48', name: 'Tipper Trailer 48m³', lic: 'HDD', req: ['T-DT', 'T-DD'], helperReq: ['T-HS'] },
  { code: '3TPU', name: '3-Ton Pickup', lic: 'LDD', req: ['T-3T', 'T-DD'], helperReq: ['T-HS', 'T-BH'] },
  { code: 'CCV', name: 'Compactor Container Vehicle', lic: 'HDD', req: ['T-CCV', 'T-DD'], helperReq: ['T-HS'] },
  { code: 'BWC', name: 'Bin Washer', lic: 'HDD', req: ['T-BW', 'T-DD'], helperReq: ['T-HS'] },
  { code: 'TW', name: 'Truck Wash Bay', lic: 'ANY', req: ['T-TW'], helperReq: ['T-HS'] },
  { code: 'LB', name: 'Low Bed', lic: 'HDD', req: ['T-LB', 'T-DD'], helperReq: [] },
]

/** BLD-04 — helper count per route by vehicle category (a parameter, BR-12). */
export function helperCountFor(cat: string): number {
  if (['RL', 'TC15', '3TPU', 'TT48'].includes(cat)) return 2
  if (['TW', 'LB', 'BWC'].includes(cat)) return 0
  return 1
}

/** BLD-02 — the eight duty codes, in legend order. */
export const DUTIES: readonly Duty[] = [
  { code: 'RT', name: 'Route (Smart Plan)', desc: 'Assigned to an approved smart-plan route; cell shows the route ID' },
  { code: 'RL', name: 'Reliever', desc: 'Covers weekly-offs / absences on the reliever pool; route decided day-of by dispatcher' },
  { code: 'WO', name: 'Weekly Off', desc: 'Contracted rest day — one per 7 days, staggered' },
  { code: 'AV', name: 'Annual Vacation', desc: 'Approved annual leave block' },
  { code: 'EL', name: 'Emergency Leave', desc: 'Approved emergency leave' },
  { code: 'OC', name: 'On Call', desc: 'Standby at depot for the shift; deployable within 30 min' },
  { code: 'SB', name: 'Standby / OJT', desc: 'On-the-job training or standby — not counted as deployed' },
  { code: 'EX', name: 'Extra Assignment', desc: 'Supervisor support · security · flag man · JCB support · bin deployment · truck wash · WCP · dispatch' },
]

/** BLD-06 — extra-assignment types. */
export const EXTRA_TYPES: readonly string[] = [
  'Supervisor support',
  'Helper as security',
  'Flag man',
  'JCB support',
  'Bin deployment',
  'Truck wash',
  'WCP',
  'Dispatch support',
  'Workshop support',
  'Camp support',
]

export const DISTRICTS: readonly string[] = [
  'Mohammed Bin Zayed City',
  'Shawamekh',
  'Baniyas',
  'Al Wathba',
  'Musaffah Commercial',
  'Al Falah',
  'Madinat Al Riyad',
  'Shamkha',
  'Al Shawamekh Commercial',
  'Mafraq Industrial',
]

/** Designations excluded from "Operational staff" (KPI §7) — a configurable set. */
export const MANAGEMENT_DESIGNATIONS: ReadonlySet<string> = new Set(['AREA MANAGER', 'OPERATIONS MANAGER'])

/** BR-12 parameters. Configuration, not code. */
export const RULE_PARAMS = {
  /** Days after expiry during which assignment is allowed with warning (BR-04). */
  graceDays: 90,
  /** Days before expiry that a record reads as Expiring (TRN-04). */
  expiringWindowDays: 30,
  /** Reminder schedule (TRN-05). */
  reminderDays: [30, 15, 7] as const,
} as const

export const SMART_PLAN_VERSION = 'SP-2026-09'

export function trainingById(id: string): Training | undefined {
  return TRAININGS.find((t) => t.id === id)
}
export function categoryOf(code: string): VehicleCategory | undefined {
  return VEHICLE_CATS.find((c) => c.code === code)
}
export function dutyOf(code: string): Duty | undefined {
  return DUTIES.find((d) => d.code === code)
}
