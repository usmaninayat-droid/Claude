/**
 * Domain types for IWMP Manpower Rostering (IWMP-SCOPE-ROSTER-V01 §8 Data
 * model), shaped 1:1 on the reference blueprint's `DB` so every number the
 * board shows can be checked against the blueprint the scope names as the
 * behavioural authority.
 */

export type DutyCode = 'RT' | 'RL' | 'WO' | 'AV' | 'EL' | 'OC' | 'SB' | 'EX'

/** The duty codes that count as PLANNED head count (KPI §7): not SB, not off/leave. */
export const PLANNED_CODES: readonly DutyCode[] = ['RT', 'RL', 'OC', 'EX']
/** Codes that are leave/off — never overwritten by a work duty (BR-08). */
export const OFF_CODES: readonly DutyCode[] = ['WO', 'AV', 'EL']
/** Work duties an Inactive / On Leave / Training employee cannot hold (BR-01). */
export const WORK_CODES: readonly DutyCode[] = ['RT', 'RL', 'OC', 'SB', 'EX']

export type Designation =
  | 'HEAVY DUTY DRIVER'
  | 'LIGHT DUTY DRIVER'
  | 'HELPER'
  | 'SUPERVISOR'
  | 'FLEET CONTROLLER'
  | 'DISPATCHER'
  | 'AREA MANAGER'
  | 'OPERATIONS MANAGER'

export type Licence = 'HDD' | 'LDD' | ''
export type Shift = 'DAY' | 'NIGHT' | 'AFN' | 'EVENING' | 'MID'
export type EmployeeStatus = 'Active' | 'On Leave' | 'Training' | 'Inactive'
export type AssignmentFamily =
  | 'ROSTERED'
  | 'RELIEVER'
  | 'WCP'
  | 'EXTRA ASSIGNMENT'
  | 'ON LEAVE'
  | 'TRAINING'
  | 'INACTIVE'
export type Lot = 'LOT 3' | 'LOT 4' | 'LOT 5'
export type Project = 'MSW' | 'Commercial'
export type RouteFrequency = 'DAILY' | 'ALT ODD' | 'ALT EVEN' | 'EVERY 6 DAYS'
export type WeekStatus = 'Draft' | 'Approved' | 'Published'
export type TrainingStatus = 'Valid' | 'Expiring' | 'Expired' | 'Blocked'
export type Severity = 'High' | 'Medium' | 'Low'

export interface Training {
  id: string
  name: string
  /** Validity in months — HSE-configurable (TRN-03). */
  validity: number
  cat: 'Driver' | 'Helper' | 'All'
}

export interface VehicleCategory {
  /** Route prefix, e.g. `RL`, `SL`, `HLC`. */
  code: string
  name: string
  /** Licence class required; `ANY` = no licence gate (truck wash bay). */
  lic: 'HDD' | 'LDD' | 'ANY'
  /** Trainings the DRIVER must hold (TRN-08). */
  req: string[]
  /** Trainings each HELPER riding on the vehicle must hold. */
  helperReq: string[]
}

export interface Duty {
  code: DutyCode
  name: string
  desc: string
}

export interface TrainingRecord {
  id: string
  /** Attendance date, ISO `YYYY-MM-DD`. */
  date: string
  /** Derived: attendance + validity (TRN-02). Stored so re-validation is cheap. */
  expiry: string
}

export interface Employee {
  id: string
  sap: number
  name: string
  desig: Designation
  lot: Lot
  licence: Licence
  contractor: string
  shift: Shift
  serviceLine: string
  project: Project
  status: EmployeeStatus
  /** Contracted weekly-off weekday, `Mon`..`Sun`. */
  weeklyOff: string
  /** Avatar accent index into the categorical palette (stable per person). */
  color: number
  trainings: TrainingRecord[]
  family: AssignmentFamily
  extraType: string | null
  /** Primary route id, when rostered to one. */
  route: string | null
  vehicle: string
}

export interface Route {
  id: string
  cat: string
  serviceLine: string
  project: Project
  shift: Shift
  freq: RouteFrequency
  district: string
  target: number
  status: 'Approved'
  plan: string
}

/** One roster cell: a duty code plus its reference (route id / extra type / OJT). */
export interface RosterCell {
  code: DutyCode
  ref?: string
}

/** `empId -> dayKey -> cell | null (pending rostering)`. */
export type RosterGrid = Record<string, Record<string, RosterCell | null>>

export interface RouteCrew {
  driver: string
  helpers: string[]
}

export interface RosterWeek {
  /** 0-based index into the 28-day period. */
  w: number
  from: string
  to: string
  status: WeekStatus
  version: string
}

export interface PunchRecord {
  in: string
  out: string
  status: 'Present' | 'Late'
}

export type AttendanceGrid = Record<string, Record<string, PunchRecord | null>>

export interface Eligibility {
  ok: boolean
  /** Hard-block reasons (ELG-02). Non-empty ⇒ `ok === false`. */
  reasons: string[]
  /** Warnings (ELG-03) — assignment allowed, flagged. */
  warns: string[]
}

export interface Finding {
  employeeId: string
  text: string
  severity: Severity
  /** Day key when the finding is cell-specific. */
  day?: string
}

export interface AuditEntry {
  at: string
  employeeId: string
  day: string
  from: RosterCell | null
  to: RosterCell | null
  by: string
  /** Entries committed together (a move, a bulk set) — undone together. */
  batch?: string
}

export type BoardCategory =
  | 'Drivers'
  | 'Helpers'
  | 'Relievers'
  | 'Extra assignments'
  | 'Supervisors & support'

export interface BoardFilters {
  week: number
  category: BoardCategory
  lot: Lot | 'All'
  shift: Shift | 'All'
  serviceLine: string
  search: string
}

export interface RosterDataset {
  today: string
  days: string[]
  weeks: RosterWeek[]
  employees: Employee[]
  routes: Route[]
  roster: RosterGrid
  routeCrew: Record<string, RouteCrew>
  attendance: AttendanceGrid
}
