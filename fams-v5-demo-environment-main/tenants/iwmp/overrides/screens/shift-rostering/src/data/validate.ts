import { MANAGEMENT_DESIGNATIONS } from './masters'
import { evaluateEligibility, isDriver } from './eligibility'
import { OFF_CODES, type Employee, type Finding, type Route, type RosterGrid } from './types'

/**
 * Week validation (BLD-08) — pure. Ported from the blueprint's
 * `Views.validate`, with the same severities:
 *   High   = blocks approval
 *   Medium = supervisor acknowledgement required
 *   Low    = advisory
 */

export const isOperational = (e: Employee): boolean => !MANAGEMENT_DESIGNATIONS.has(e.desig)

export interface ValidateInput {
  employees: Employee[]
  routes: Route[]
  roster: RosterGrid
  /** The seven day keys of the week being validated. */
  days: string[]
  today: string
}

export function validateWeek({ employees, routes, roster, days, today }: ValidateInput): Finding[] {
  const findings: Finding[] = []
  const routeById = new Map(routes.map((r) => [r.id, r]))

  for (const e of employees) {
    if (e.status === 'Inactive') continue
    const cells = days.map((d) => roster[e.id]?.[d] ?? null)
    const wo = cells.filter((c) => c?.code === 'WO').length
    const working = cells.filter((c) => c && !OFF_CODES.includes(c.code)).length

    // BR-07 — one weekly off per 7-day period.
    if (working === 7) findings.push({ employeeId: e.id, text: 'No weekly off in week', severity: 'High' })
    if (wo > 1) findings.push({ employeeId: e.id, text: `${wo} weekly offs in week`, severity: 'Low' })

    // ELG-01 — re-evaluate every route cell.
    days.forEach((d, i) => {
      const c = cells[i]
      if (c?.code !== 'RT' || !c.ref) return
      const el = evaluateEligibility({ employee: e, route: routeById.get(c.ref), today, day: d, roster })
      if (!el.ok) findings.push({ employeeId: e.id, day: d, text: `${c.ref}: ${el.reasons[0] ?? 'blocked'}`, severity: 'High' })
      else if (el.warns.length) findings.push({ employeeId: e.id, day: d, text: `${c.ref}: ${el.warns[0]}`, severity: 'Medium' })
    })

    // KPI "Pending rostering" — active operational, no duty other than WO.
    if (e.status === 'Active' && isOperational(e) && !cells.some((c) => c && c.code !== 'WO')) {
      findings.push({ employeeId: e.id, text: 'Pending rostering — no duty in week', severity: 'Medium' })
    }
  }

  // BR-06 — one driver per route per day.
  for (const d of days) {
    const seen = new Map<string, string>()
    for (const e of employees) {
      const c = roster[e.id]?.[d]
      if (c?.code !== 'RT' || !c.ref || !isDriver(e)) continue
      const prior = seen.get(c.ref)
      if (prior) findings.push({ employeeId: e.id, day: d, text: `${c.ref} has two drivers (${prior})`, severity: 'High' })
      else seen.set(c.ref, e.name)
    }
  }

  return findings
}

export function countBySeverity(findings: readonly Finding[]): Record<Finding['severity'], number> {
  const out = { High: 0, Medium: 0, Low: 0 }
  for (const f of findings) out[f.severity] += 1
  return out
}

/**
 * Would placing a `WO` on `day` give the employee a second weekly off this
 * week? (BR-07 warning surfaced at assignment time, per the blueprint's
 * `setDuty`.)
 */
export function hasOtherWeeklyOff(roster: RosterGrid, employeeId: string, weekDays: string[], day: string): boolean {
  return weekDays.some((d) => d !== day && roster[employeeId]?.[d]?.code === 'WO')
}

/** Is another driver already on this route on this day? (BR-06 at assignment time.) */
export function routeTakenBy(
  roster: RosterGrid,
  employees: Employee[],
  routeId: string,
  day: string,
  exceptEmployeeId: string,
): Employee | undefined {
  return employees.find(
    (e) => e.id !== exceptEmployeeId && isDriver(e) && roster[e.id]?.[day]?.code === 'RT' && roster[e.id]?.[day]?.ref === routeId,
  )
}
