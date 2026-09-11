import { evaluateEligibility } from './eligibility'
import { hasOtherWeeklyOff, routeTakenBy } from './validate'
import { OFF_CODES, WORK_CODES, type Employee, type Route, type RosterCell, type RosterGrid } from './types'

/**
 * Placement rules — the single gate every board mutation (click-assign, drag,
 * paste, bulk set, clear) passes through, so the eligibility engine and the
 * business rules are enforced identically no matter how a cell is touched.
 * Pure; the board turns the verdict into toasts / rings / blocked drops.
 */

export interface PlaceContext {
  employee: Employee
  day: string
  roster: RosterGrid
  routeById: Map<string, Route>
  employees: Employee[]
  weekDays: string[]
  today: string
  isLocked: boolean
}

export interface PlaceVerdict {
  ok: boolean
  reasons: string[]
  warns: string[]
}

const isLeave = (c: RosterCell | null | undefined): boolean => Boolean(c && (c.code === 'AV' || c.code === 'EL'))

/** May `next` be written into `employee`'s cell on `day`? `null` = clear. */
export function canPlace(next: RosterCell | null, ctx: PlaceContext): PlaceVerdict {
  const reasons: string[] = []
  const warns: string[] = []
  const { employee: e, day } = ctx
  const current = ctx.roster[e.id]?.[day] ?? null

  if (ctx.isLocked) reasons.push('Week is published and locked — raise a roster change request')
  if (day < ctx.today) reasons.push('This day has passed — the roster is read only for past dates')
  // BR-08 — approved leave is owned by Leave Management; it cannot be overwritten or cleared here.
  if (isLeave(current)) reasons.push(`Approved ${current!.code === 'AV' ? 'annual vacation' : 'emergency leave'} cannot be overwritten — leave changes flow from Leave Management`)

  if (next) {
    // BR-01 — only Active employees hold work duties.
    if (e.status !== 'Active' && WORK_CODES.includes(next.code)) {
      reasons.push(`Employee status is ${e.status} — only Active employees can be rostered`)
    }
    if (next.code === 'RT') {
      if (!next.ref) reasons.push('A route assignment needs a Smart Plan route')
      const route = next.ref ? ctx.routeById.get(next.ref) : undefined
      if (next.ref && !route) reasons.push(`${next.ref} is not on the approved Smart Plan`) // BR-09
      if (route) {
        const el = evaluateEligibility({ employee: e, route, today: ctx.today, day, roster: ctx.roster })
        reasons.push(...el.reasons.filter((r) => !r.includes('vacation') && !r.includes('leave')))
        warns.push(...el.warns)
        const taken = routeTakenBy(ctx.roster, ctx.employees, route.id, day, e.id)
        if (taken) reasons.push(`Route already has a driver on this day (${taken.name})`) // BR-06
      }
    }
    if (next.code === 'WO' && hasOtherWeeklyOff(ctx.roster, e.id, ctx.weekDays, day)) {
      warns.push('Second weekly off in this week — flagged for supervisor review') // BR-07
    }
  }

  return { ok: reasons.length === 0, reasons: dedupe(reasons), warns: dedupe(warns) }
}

/** May the duty in `from` be moved onto `to`? Leave codes never move (BR-08). */
export function canMove(cell: RosterCell, from: PlaceContext, to: PlaceContext): PlaceVerdict {
  if (isLeave(cell)) return { ok: false, reasons: ['Leave codes cannot be moved — they are written by Leave Management'], warns: [] }
  const source = canPlace(null, from)
  if (!source.ok) return source
  return canPlace(cell, to)
}

/** Whether a cell is a work duty that counts toward planned head count (KPI §7). */
export const isPlanned = (c: RosterCell | null | undefined): boolean => Boolean(c && !OFF_CODES.includes(c.code) && c.code !== 'SB')

function dedupe(xs: string[]): string[] {
  return [...new Set(xs)]
}
