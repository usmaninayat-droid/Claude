import { useCallback, useState } from 'react'
import { toast } from '@fams/ui-kit'
import { cellLabel } from '../lib/duty-presentation'
import { canMove, canPlace, type PlaceContext } from '../data/board-rules'
import { dutyOf } from '../data/masters'
import type { Employee, RosterCell } from '../data/types'
import { buildWorkbookRows, downloadCsv, toCsv } from '../lib/export'
import { fmtDay } from '../lib/format'
import { useRosterStore } from './store'
import type { BoardModel } from './useBoardModel'

export interface CellTarget {
  employeeId: string
  day: string
}

export interface DragPayload extends CellTarget {
  cell: RosterCell
}

/**
 * Every board mutation, with the placement rules applied first and the
 * outcome reported the same way regardless of gesture (click, key, drag,
 * paste, bulk): a toast for the eye, `announce` for the screen reader.
 */
export function useBoardActions(model: BoardModel, announce?: (message: string) => void) {
  const store = useRosterStore()
  const [clipboard, setClipboard] = useState<RosterCell | null>(null)
  const { roster, employees: allEmployees, routes } = store.data

  const ctxFor = useCallback(
    (employee: Employee, day: string): PlaceContext => ({
      employee,
      day,
      roster,
      routeById: model.routeById,
      employees: allEmployees,
      weekDays: model.weekDays,
      today: model.today,
      isLocked: model.isLocked,
    }),
    [roster, allEmployees, model.routeById, model.weekDays, model.today, model.isLocked],
  )

  const employee = useCallback((id: string) => model.employeeById.get(id), [model.employeeById])
  const say = useCallback((m: string) => announce?.(m), [announce])

  const describe = (cell: RosterCell | null): string =>
    !cell ? 'cleared' : cell.code === 'RT' ? (cell.ref ?? 'route') : dutyOf(cell.code)?.name ?? cell.code

  const setDuty = useCallback(
    (target: CellTarget, next: RosterCell | null): boolean => {
      const e = employee(target.employeeId)
      if (!e) return false
      const v = canPlace(next, ctxFor(e, target.day))
      if (!v.ok) {
        toast.error(next ? 'Assignment blocked' : 'Cannot clear cell', { description: v.reasons[0] })
        say(`Blocked: ${v.reasons[0]}`)
        return false
      }
      store.setCell(target.employeeId, target.day, next)
      const what = describe(next)
      if (v.warns.length) toast.warning('Assigned with warning', { description: `${e.name} · ${fmtDay(target.day)} → ${what}. ${v.warns[0]}` })
      else toast.success('Roster updated', { description: `${e.name} · ${fmtDay(target.day)} → ${what}. Logged to the audit trail.` })
      say(`${e.name}, ${fmtDay(target.day)}: ${what}${v.warns.length ? `. Warning: ${v.warns[0]}` : ''}`)
      return true
    },
    [employee, ctxFor, store, say],
  )

  const applyMany = useCallback(
    (targets: CellTarget[], next: RosterCell | null, verb: string): number => {
      const changes: { employeeId: string; day: string; to: RosterCell | null }[] = []
      const skipped: string[] = []
      let warned = 0
      for (const t of targets) {
        const e = employee(t.employeeId)
        if (!e) continue
        const v = canPlace(next, ctxFor(e, t.day))
        if (!v.ok) {
          skipped.push(v.reasons[0] ?? 'blocked')
          continue
        }
        if (v.warns.length) warned += 1
        changes.push({ employeeId: t.employeeId, day: t.day, to: next })
      }
      if (changes.length) store.setCells(changes)
      const summary =
        `${verb} ${changes.length} cell${changes.length === 1 ? '' : 's'}` +
        (skipped.length ? ` · ${skipped.length} skipped` : '') +
        (warned ? ` · ${warned} with warnings` : '')
      if (!changes.length) toast.error('Nothing changed', { description: skipped[0] })
      else if (skipped.length || warned) toast.warning(summary, { description: skipped[0] })
      else toast.success(summary)
      say(summary)
      return changes.length
    },
    [employee, ctxFor, store, say],
  )

  const clearCells = useCallback((targets: CellTarget[]) => applyMany(targets, null, 'Cleared'), [applyMany])
  const bulkSet = useCallback((targets: CellTarget[], cell: RosterCell) => applyMany(targets, cell, 'Set'), [applyMany])

  const copy = useCallback((cell: RosterCell | null) => {
    setClipboard(cell)
    if (cell) toast.info('Copied', { description: `${cellLabel(cell)} — select cells and press ⌘/Ctrl+V to paste.` })
  }, [])

  const paste = useCallback(
    (targets: CellTarget[]): number => {
      if (!clipboard) {
        toast.info('Nothing to paste', { description: 'Copy a duty first (⌘/Ctrl+C on a cell).' })
        return 0
      }
      return applyMany(targets, clipboard, 'Pasted')
    },
    [clipboard, applyMany],
  )

  const parseKey = (key: string): CellTarget | null => {
    const [employeeId, day] = key.split('|')
    return employeeId && day ? { employeeId, day } : null
  }

  const canDrop = useCallback(
    (p: DragPayload, targetKey: string): boolean => {
      const t = parseKey(targetKey)
      if (!t || (t.employeeId === p.employeeId && t.day === p.day)) return false
      const from = employee(p.employeeId)
      const to = employee(t.employeeId)
      if (!from || !to) return false
      return canMove(p.cell, ctxFor(from, p.day), ctxFor(to, t.day)).ok
    },
    [employee, ctxFor],
  )

  const moveCell = useCallback(
    (p: DragPayload, targetKey: string): void => {
      const t = parseKey(targetKey)
      const from = employee(p.employeeId)
      const to = t ? employee(t.employeeId) : undefined
      if (!t || !from || !to) return
      const v = canMove(p.cell, ctxFor(from, p.day), ctxFor(to, t.day))
      if (!v.ok) {
        toast.error('Move blocked', { description: v.reasons[0] })
        say(`Move blocked: ${v.reasons[0]}`)
        return
      }
      store.setCells([
        { employeeId: p.employeeId, day: p.day, to: null },
        { employeeId: to.id, day: t.day, to: p.cell },
      ])
      const label = cellLabel(p.cell)
      if (v.warns.length) toast.warning('Moved with warning', { description: `${label} → ${to.name} · ${fmtDay(t.day)}. ${v.warns[0]}` })
      else toast.success('Duty moved', { description: `${label} → ${to.name} · ${fmtDay(t.day)}` })
      say(`Moved ${label} to ${to.name}, ${fmtDay(t.day)}`)
    },
    [employee, ctxFor, store, say],
  )

  const highCount = model.findings.filter((f) => f.severity === 'High').length
  const weekNo = model.week.w + 1

  const approve = useCallback(() => {
    if (highCount) {
      toast.error('Approval blocked', { description: `${highCount} High finding${highCount === 1 ? '' : 's'} must be resolved first — run Validate week (BLD-08).` })
      return
    }
    store.setWeekStatus(model.week.w, 'Approved', true)
    toast.success(`Week ${weekNo} approved`, { description: 'Approved by Operations Manager — a new roster version was created. Publish to release it to dispatch and driver tablets.' })
    say(`Week ${weekNo} approved`)
  }, [highCount, store, model.week.w, weekNo, say])

  const publish = useCallback(() => {
    store.setWeekStatus(model.week.w, 'Published')
    toast.success(`Week ${weekNo} published`, { description: 'Pushed to the dispatcher console, LOT supervisors and driver tablets. The week is now locked — changes go through roster change requests.' })
    say(`Week ${weekNo} published and locked`)
  }, [store, model.week.w, weekNo, say])

  const changeRequest = useCallback(
    (target: CellTarget) => {
      const e = employee(target.employeeId)
      toast.success('Change request raised', { description: `${e?.name ?? target.employeeId} · ${fmtDay(target.day)} — sent to the Operations Manager for approval (BR-10).` })
    },
    [employee],
  )

  const exportWeek = useCallback(() => {
    const rows = buildWorkbookRows(model.employees, routes, roster, model.weekDays)
    downloadCsv(`LOT4_Roster_W${weekNo}_${model.week.version}.csv`, toCsv(rows))
    toast.success('Export ready', { description: `${rows.length} rows in the current workbook column layout (BLD-12).` })
  }, [model.employees, routes, roster, model.weekDays, weekNo, model.week.version])

  return {
    clipboard,
    setDuty,
    clearCells,
    bulkSet,
    copy,
    paste,
    canDrop,
    moveCell,
    approve,
    publish,
    changeRequest,
    exportWeek,
    undo: store.undoLast,
    canUndo: store.canUndo,
    reset: store.reset,
    highCount,
  }
}

export type BoardActions = ReturnType<typeof useBoardActions>
