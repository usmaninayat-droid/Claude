import { RULE_PARAMS, TRAININGS, categoryOf, trainingById } from './masters'
import type { Eligibility, Employee, Route, RosterGrid, TrainingRecord, TrainingStatus } from './types'

/**
 * Eligibility engine (RST-ELG) — pure functions, no React, no DOM.
 *
 * Ported line-for-line from the reference blueprint's `DB.eligibility` and
 * `DB.trStatus`, because the scope says the blueprint's behaviour IS the
 * requirement (§1). Every reason string below is the blueprint's own wording,
 * so what the user reads on a blocked cell matches what Tajmee'e signed off.
 *
 * Kept pure so the rule set is unit-testable without a DOM, and so the same
 * function serves the board cell, the assign dialog's route picker (ELG-05),
 * the week validation (BLD-08) and the crew view (BLD-04).
 */

const MS_PER_DAY = 86_400_000

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / MS_PER_DAY)
}

/** Days until a record's expiry as of `today` (negative = already expired). */
export function daysToExpiry(rec: TrainingRecord, today: string): number {
  return daysBetween(today, rec.expiry)
}

/** TRN-04 — Valid (> 30 d) · Expiring (≤ 30 d) · Expired (≤ 90 d past) · Blocked (> 90 d past). */
export function trainingStatus(rec: TrainingRecord, today: string): TrainingStatus {
  const d = daysToExpiry(rec, today)
  if (d > RULE_PARAMS.expiringWindowDays) return 'Valid'
  if (d >= 0) return 'Expiring'
  if (d >= -RULE_PARAMS.graceDays) return 'Expired'
  return 'Blocked'
}

export const isDriver = (e: Employee): boolean => e.desig.includes('DRIVER')
export const isHelper = (e: Employee): boolean => e.desig === 'HELPER'

export interface EligibilityInput {
  employee: Employee
  route: Route | undefined
  today: string
  /** When given, the employee's existing cell that day is checked for leave (BR-08). */
  day?: string
  roster?: RosterGrid
}

/**
 * ELG-01/02/03 — the verdict for putting `employee` on `route` (optionally on `day`).
 *
 * Hard blocks (→ `reasons`): status not Active; licence mismatch; a required
 * training missing or Blocked; on AV / EL that day.
 * Warnings (→ `warns`): a required training Expiring or Expired-within-grace;
 * route shift differs from the employee's default shift.
 *
 * Double-assignment (one duty per employee per day, one driver per route per
 * shift per day — BR-06) is a ROSTER-level check and lives in `validate.ts`,
 * because it needs the whole grid, not one employee.
 */
export function evaluateEligibility({ employee: e, route: rt, today, day, roster }: EligibilityInput): Eligibility {
  const reasons: string[] = []
  const warns: string[] = []

  if (e.status !== 'Active') {
    reasons.push(`Employee status is ${e.status} — only Active employees can be rostered`)
  }

  if (rt) {
    const cat = categoryOf(rt.cat)
    if (cat) {
      const driver = isDriver(e)
      const helper = isHelper(e)
      if (driver && cat.lic !== 'ANY' && cat.lic !== e.licence) {
        reasons.push(`${cat.name} requires ${cat.lic} licence — employee holds ${e.licence || 'no licence'}`)
      }
      const need = helper ? cat.helperReq : cat.req
      for (const tid of need) {
        const t = trainingById(tid)
        if (!t) continue
        const rec = e.trainings.find((x) => x.id === tid)
        if (!rec) {
          reasons.push(`Training not completed: ${t.name}`)
          continue
        }
        const s = trainingStatus(rec, today)
        const ago = -daysToExpiry(rec, today)
        if (s === 'Blocked') reasons.push(`${t.name} expired ${ago} days ago (> ${RULE_PARAMS.graceDays}-day grace) — re-training required`)
        else if (s === 'Expired') warns.push(`${t.name} expired ${ago} days ago — within ${RULE_PARAMS.graceDays}-day grace, re-training overdue`)
        else if (s === 'Expiring') warns.push(`${t.name} expires in ${daysToExpiry(rec, today)} days`)
      }
      if (rt.shift !== e.shift) warns.push(`Route shift ${rt.shift} differs from employee shift ${e.shift}`)
    }
  }

  if (day && roster) {
    const c = roster[e.id]?.[day]
    if (c && (c.code === 'AV' || c.code === 'EL')) {
      reasons.push(`Employee is on ${c.code === 'AV' ? 'annual vacation' : 'emergency leave'} on this date`)
    }
  }

  return { ok: reasons.length === 0, reasons, warns }
}

/** The worst training status an employee holds — drives the competency register's "Overall". */
export function worstTrainingStatus(e: Employee, today: string): TrainingStatus | 'None' {
  const order: TrainingStatus[] = ['Blocked', 'Expired', 'Expiring', 'Valid']
  const statuses = e.trainings.map((t) => trainingStatus(t, today))
  for (const s of order) if (statuses.includes(s)) return s
  return 'None'
}

/**
 * TRN-02 — expiry = attendance date + validity months. The blueprint uses
 * `validity * 30.4` days; reproduced so dates match its figures exactly.
 */
export function computeExpiry(attendanceIso: string, trainingId: string): string {
  const t = trainingById(trainingId)
  const months = t?.validity ?? 12
  const d = new Date(attendanceIso)
  d.setDate(d.getDate() + Math.round(months * 30.4))
  return d.toISOString().slice(0, 10)
}

/** Every training the employee should hold for their designation (feeds "Training pending"). */
export function baselineTrainingIds(e: Employee): string[] {
  if (isDriver(e)) return ['T-DD', 'T-TBT']
  if (isHelper(e)) return ['T-HS', 'T-TBT']
  return ['T-TBT']
}

/** True when a driver holds no equipment training at all (only DD/induction). */
export function lacksEquipmentTraining(e: Employee): boolean {
  if (!isDriver(e)) return false
  return !e.trainings.some((x) => {
    const t = TRAININGS.find((tt) => tt.id === x.id)
    return t?.cat === 'Driver' && x.id !== 'T-DD'
  })
}
