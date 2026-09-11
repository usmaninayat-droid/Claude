import { categoryOf } from '../data/masters'
import { isDriver, isHelper } from '../data/eligibility'
import type { Employee, Route, RosterGrid } from '../data/types'

/**
 * BLD-12 — export the week in the CURRENT WORKBOOK LAYOUT so downstream users
 * are not disrupted during transition: SL, SAPID, NAME, LICENCE, ROUTE NUMBER,
 * VEHICLE, SERVICE LINE, VEHICLE TYPE, ACTIVE/INACTIVE, SHIFT, then one column
 * per day carrying the route code, `DAY OFF`, the extra type, or the duty code.
 */
export function buildWorkbookRows(
  employees: Employee[],
  routes: Route[],
  roster: RosterGrid,
  days: string[],
): Record<string, string | number>[] {
  const routeById = new Map(routes.map((r) => [r.id, r]))
  return employees
    .filter((e) => e.status !== 'Inactive' && (isDriver(e) || isHelper(e)))
    .map((e, i) => {
      const rt = e.route ? routeById.get(e.route) : undefined
      const row: Record<string, string | number> = {
        SL: i + 1,
        SAPID: e.sap,
        NAME: e.name,
        LICENCE: e.licence,
        'ROUTE NUMBER': e.route ?? '',
        VEHICLE: e.vehicle,
        'SERVICE LINE': e.serviceLine,
        'VEHICLE TYPE': rt ? categoryOf(rt.cat)?.name ?? '' : '',
        'ACTIVE/INACTIVE': e.status.toUpperCase(),
        SHIFT: e.shift,
      }
      for (const d of days) {
        const c = roster[e.id]?.[d]
        row[d] = !c ? '' : c.code === 'RT' ? c.ref ?? '' : c.code === 'WO' ? 'DAY OFF' : c.code === 'EX' ? c.ref ?? 'EX' : c.code
      }
      return row
    })
}

export function toCsv(rows: Record<string, string | number>[]): string {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0] as object)
  const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c] ?? '')).join(','))].join('\n')
}

/** Trigger a browser download. Inert inside a sandboxed preview; real in the app. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
