import { useCallback, useMemo } from 'react'
import { evaluateEligibility, isDriver, isHelper } from '../data/eligibility'
import { validateWeek } from '../data/validate'
import type { BoardCategory, BoardFilters, Eligibility, Employee, Finding, Route, RosterWeek } from '../data/types'
import { useRosterStore } from './store'

/**
 * Derived, memoised read model over the store for one board view. Every
 * selector re-derives only when the store `rev` or the filters change, so a
 * single cell edit never re-filters 788 employees more than once.
 */

const CATEGORY_FILTER: Record<BoardCategory, (e: Employee) => boolean> = {
  Drivers: (e) => isDriver(e) && e.family !== 'RELIEVER' && e.family !== 'EXTRA ASSIGNMENT' && e.family !== 'WCP',
  Helpers: (e) => isHelper(e) && e.family !== 'EXTRA ASSIGNMENT' && e.family !== 'WCP',
  Relievers: (e) => e.family === 'RELIEVER',
  'Extra assignments': (e) => e.family === 'EXTRA ASSIGNMENT' || e.family === 'WCP',
  'Supervisors & support': (e) => !isDriver(e) && !isHelper(e),
}

export const BOARD_CATEGORIES: readonly BoardCategory[] = [
  'Drivers',
  'Helpers',
  'Relievers',
  'Extra assignments',
  'Supervisors & support',
]

export interface BoardModel {
  week: RosterWeek
  weekDays: string[]
  isLocked: boolean
  employees: Employee[]
  routeById: Map<string, Route>
  employeeById: Map<string, Employee>
  eligibility: (employee: Employee, routeId: string | undefined, day?: string) => Eligibility
  findings: Finding[]
  today: string
}

export function useBoardModel(filters: BoardFilters): BoardModel {
  const store = useRosterStore()
  const { data, rev } = store

  const week = data.weeks[filters.week] ?? (data.weeks[0] as RosterWeek)
  const weekDays = useMemo(() => data.days.slice(week.w * 7, week.w * 7 + 7), [data.days, week.w])

  const routeById = useMemo(() => new Map(data.routes.map((r) => [r.id, r])), [data.routes])
  const employeeById = useMemo(() => new Map(data.employees.map((e) => [e.id, e])), [data.employees])

  const employees = useMemo(() => {
    const cat = CATEGORY_FILTER[filters.category]
    const q = filters.search.trim().toLowerCase()
    return data.employees.filter(
      (e) =>
        e.status !== 'Inactive' &&
        cat(e) &&
        (filters.lot === 'All' || e.lot === filters.lot) &&
        (filters.shift === 'All' || e.shift === filters.shift) &&
        (filters.serviceLine === 'All' || e.serviceLine === filters.serviceLine) &&
        (!q || e.name.toLowerCase().includes(q) || String(e.sap).includes(q) || (e.route ?? '').toLowerCase().includes(q)),
    )
  }, [data.employees, filters.category, filters.lot, filters.shift, filters.serviceLine, filters.search])

  // Eligibility is cheap but called per visible route cell; memoise per (rev, emp, route, day).
  const eligibility = useCallback(
    (employee: Employee, routeId: string | undefined, day?: string): Eligibility =>
      evaluateEligibility({
        employee,
        route: routeId ? routeById.get(routeId) : undefined,
        today: data.today,
        ...(day !== undefined ? { day } : {}),
        roster: data.roster,
      }),
    // `rev` is the store's commit counter — the roster object identity changes on
    // every commit, so listing it here is what re-derives leave conflicts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routeById, data.today, data.roster, rev],
  )

  const findings = useMemo(
    () => validateWeek({ employees: data.employees, routes: data.routes, roster: data.roster, days: weekDays, today: data.today }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.employees, data.routes, data.roster, weekDays, data.today, rev],
  )

  return {
    week,
    weekDays,
    isLocked: week.status === 'Published',
    employees,
    routeById,
    employeeById,
    eligibility,
    findings,
    today: data.today,
  }
}
