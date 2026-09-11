import { useCallback, useEffect, useMemo, useState, useRef, type MouseEvent } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Button, StatusView } from '@fams/ui-kit'
import { isPlanned } from '../data/board-rules'
import { routeTakenBy } from '../data/validate'
import type { BoardFilters, Employee, Finding } from '../data/types'
import { useGridKeyboard, type CellRef } from '../hooks/useGridKeyboard'
import { usePointerDrag } from '../hooks/usePointerDrag'
import { fmtDayLong } from '../lib/format'
import { useRosterStore } from '../state/store'
import { useBoardActions, type CellTarget, type DragPayload } from '../state/useBoardActions'
import { useBoardModel } from '../state/useBoardModel'
import { AssignDutyDialog } from './AssignDutyDialog'
import { BoardToolbar } from './BoardToolbar'
import { BulkBar } from './BulkBar'
import { CellPopover } from './CellPopover'
import { DayHeader } from './DayHeader'
import { DragGhost } from './DragGhost'
import { EmployeeCard } from './EmployeeCard'
import { EmployeeCell, type RowStats } from './EmployeeCell'
import { FindingsPanel } from './FindingsPanel'
import { KpiRow, type BoardKpis } from './KpiRow'
import { RosterCell } from './RosterCell'

const ROW_HEIGHT = 132

export interface RosterBoardProps {
  filters: BoardFilters
  onFiltersChange: (next: BoardFilters) => void
}

/**
 * BLD-01 — the roster board: employees as rows, the week's days as columns,
 * one duty per cell. Virtualised (up to ~470 helpers in one category), an
 * ARIA grid with roving focus, multi-select, pointer drag-to-move, and a
 * docked findings panel. Everything it renders comes from `useBoardModel`;
 * everything it changes goes through `useBoardActions`.
 */
export function RosterBoard({ filters, onFiltersChange }: RosterBoardProps) {
  const store = useRosterStore()
  const model = useBoardModel(filters)
  const [liveMessage, setLiveMessage] = useState('')
  const actions = useBoardActions(model, setLiveMessage)
  const { weekDays } = model
  const baseEmployees = model.employees
  const cols = weekDays.length

  // "Highlight conflicts" — the reference's toggle. A conflict is a HARD
  // eligibility break (High finding): the central "trained for this vehicle,
  // otherwise blocked" rule (BR-02), plus licence / status / double assignment
  // / no-weekly-off. Turning it on FLOATS the conflicted workers to the top and
  // marks their row, so a planner sees exactly who must be fixed before
  // approval without losing the rest of the board.
  const [highlightConflicts, setHighlightConflicts] = useState(false)
  // One eligibility pass drives BOTH the "Conflicts" KPI (bad CELLS) and the
  // highlight toggle (flagged WORKERS): a route cell whose worker is not
  // trained/eligible for that vehicle (BR-02), or licence/status/double-booked.
  const conflict = useMemo(() => {
    const workerIds = new Set<string>()
    let cellCount = 0
    for (const e of baseEmployees) {
      for (const d of weekDays) {
        const c = store.data.roster[e.id]?.[d]
        if (c?.code !== 'RT' || model.eligibility(e, c.ref, d).ok) continue
        cellCount += 1
        workerIds.add(e.id)
      }
    }
    return { workerIds, cellCount }
  }, [baseEmployees, weekDays, store.data.roster, model])
  const conflictIds = conflict.workerIds
  const employees = useMemo(() => {
    if (!highlightConflicts) return baseEmployees
    // Stable partition: conflicts keep their relative order, then the rest.
    const flagged: Employee[] = []
    const rest: Employee[] = []
    for (const e of baseEmployees) (conflictIds.has(e.id) ? flagged : rest).push(e)
    return [...flagged, ...rest]
  }, [highlightConflicts, baseEmployees, conflictIds])
  const rows = employees.length

  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  })

  const [popover, setPopover] = useState<(CellTarget & { anchor: HTMLElement }) | null>(null)
  const [assign, setAssign] = useState<CellTarget | null>(null)
  const [card, setCard] = useState<Employee | null>(null)
  const [findingsOpen, setFindingsOpen] = useState(false)

  const targetOf = useCallback(
    (ref: CellRef): CellTarget | null => {
      const e = employees[ref.row]
      const d = weekDays[ref.col]
      return e && d ? { employeeId: e.id, day: d } : null
    },
    [employees, weekDays],
  )
  const targetsOf = useCallback((refs: CellRef[]): CellTarget[] => refs.map(targetOf).filter((t): t is CellTarget => t !== null), [targetOf])

  const keyboard = useGridKeyboard(rows, cols, {
    onActivate: (ref) => {
      const t = targetOf(ref)
      if (t) {
        setPopover(null)
        setAssign(t)
      }
    },
    onClear: (refs) => actions.clearCells(targetsOf(refs)),
    onCopy: (ref) => {
      const t = targetOf(ref)
      if (t) actions.copy(store.data.roster[t.employeeId]?.[t.day] ?? null)
    },
    onPaste: (refs) => actions.paste(targetsOf(refs)),
    onUndo: actions.undo,
    onActiveChange: (ref) => virtualizer.scrollToIndex(ref.row, { align: 'auto' }),
  })

  // Roving tabindex: after the active cell changes (arrow keys), move DOM focus to it once it is rendered.
  useEffect(() => {
    if (!keyboard.active) return
    const t = targetOf(keyboard.active)
    if (!t) return
    const frame = requestAnimationFrame(() => {
      const el = scrollRef.current?.querySelector<HTMLElement>(`[data-cell="${t.employeeId}|${t.day}"]`)
      if (el && document.activeElement !== el) el.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [keyboard.active, targetOf])

  // Esc clears a multi-selection from anywhere on the page — after a bulk-bar
  // button click the focus is on that button, not on a gridcell.
  const { selectionCount, clearSelection } = keyboard
  useEffect(() => {
    if (selectionCount === 0) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') clearSelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectionCount, clearSelection])

  // `moveCell` re-runs the rules and toasts the block reason, so a refused drop explains itself.
  const drag = usePointerDrag<DragPayload>({ canDrop: actions.canDrop, onDrop: actions.moveCell, onReject: actions.moveCell })

  const coverage = useMemo(
    () =>
      weekDays.map((d) => {
        let planned = 0
        let pending = 0
        for (const e of baseEmployees) {
          const c = store.data.roster[e.id]?.[d]
          if (!c) pending += 1
          else if (isPlanned(c)) planned += 1
        }
        return { planned, pending }
      }),
    [weekDays, baseEmployees, store.data.roster],
  )

  // Per-employee week read-out for the frozen column, plus the board KPIs —
  // computed over the whole category (not the conflict-filtered subset) so the
  // headline numbers stay week-level and verifiable.
  const { rowStats, kpis } = useMemo(() => {
    const rowStats = new Map<string, RowStats>()
    let planned = 0
    let off = 0
    for (const e of baseEmployees) {
      let rp = 0
      let ro = 0
      for (const d of weekDays) {
        const c = store.data.roster[e.id]?.[d]
        if (!c) continue
        if (isPlanned(c)) rp += 1
        else ro += 1
      }
      rowStats.set(e.id, { planned: rp, days: weekDays.length, off: ro })
      planned += rp
      off += ro
    }
    const slots = baseEmployees.length * weekDays.length
    const kpis: BoardKpis = {
      utilization: slots > 0 ? Math.round((planned / slots) * 100) : 0,
      scheduled: planned,
      unfilled: Math.max(0, slots - planned - off),
      conflicts: conflict.cellCount,
    }
    return { rowStats, kpis }
  }, [baseEmployees, weekDays, store.data.roster, conflict.cellCount])

  const findingCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const f of model.findings) m.set(f.employeeId, (m.get(f.employeeId) ?? 0) + 1)
    return m
  }, [model.findings])

  const serviceLines = useMemo(() => [...new Set(store.data.employees.map((e) => e.serviceLine))].sort(), [store.data.employees])

  const onCellClick = (row: number, col: number) => (ev: MouseEvent) => {
    if (drag.isDragging()) return
    keyboard.onCellClick({ row, col }, ev)
    if (ev.shiftKey || ev.metaKey || ev.ctrlKey) {
      setPopover(null)
      return
    }
    const t = targetOf({ row, col })
    if (t) setPopover({ ...t, anchor: ev.currentTarget as HTMLElement })
  }

  const jumpTo = (finding: Finding) => {
    const row = employees.findIndex((e) => e.id === finding.employeeId)
    const e = model.employeeById.get(finding.employeeId)
    if (row >= 0) {
      const col = finding.day ? Math.max(0, weekDays.indexOf(finding.day)) : 0
      keyboard.setActive({ row, col })
    } else if (e) {
      // Filtered out of the current category — open the competency card instead of silently doing nothing.
      setCard(e)
    }
  }

  const popoverEmployee = popover ? model.employeeById.get(popover.employeeId) : undefined
  const popoverCell = popover ? store.data.roster[popover.employeeId]?.[popover.day] ?? null : null
  const assignEmployee = assign ? model.employeeById.get(assign.employeeId) : undefined

  const clearFilters = () => onFiltersChange({ ...filters, lot: 'All', shift: 'All', serviceLine: 'All', search: '' })

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <BoardToolbar
        filters={filters}
        onFiltersChange={onFiltersChange}
        weeks={store.data.weeks}
        week={model.week}
        serviceLines={serviceLines}
        employeesShown={rows}
        findingsTotal={model.findings.length}
        highCount={actions.highCount}
        findingsOpen={findingsOpen}
        onToggleFindings={() => setFindingsOpen((o) => !o)}
        conflictCount={conflictIds.size}
        highlightConflicts={highlightConflicts}
        onToggleHighlightConflicts={() => setHighlightConflicts((o) => !o)}
        canUndo={actions.canUndo}
        onUndo={actions.undo}
        onExport={actions.exportWeek}
        onApprove={actions.approve}
        onPublish={actions.publish}
        onReset={actions.reset}
      />

      {keyboard.selectionCount > 1 && (
        <BulkBar
          count={keyboard.selectionCount}
          canPaste={actions.clipboard !== null}
          onSet={(cell) => actions.bulkSet(targetsOf(keyboard.selectedRefs()), cell)}
          onPaste={() => actions.paste(targetsOf(keyboard.selectedRefs()))}
          onClear={() => actions.clearCells(targetsOf(keyboard.selectedRefs()))}
          onDeselect={keyboard.clearSelection}
        />
      )}

      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {rows > 0 && <KpiRow kpis={kpis} onShowConflicts={() => setHighlightConflicts(true)} />}
          {rows === 0 ? (
            <StatusView
              kind="empty"
              title="No employees match these filters"
              description="Try another category, LOT, shift or service line — or clear the search."
              action={
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
              className="flex-1"
            />
          ) : (
            <div
              ref={scrollRef}
              role="grid"
              aria-label={`Roster board, week ${model.week.w + 1}, ${filters.category}`}
              aria-rowcount={rows + 1}
              aria-colcount={cols + 1}
              aria-multiselectable
              aria-readonly={model.isLocked || undefined}
              className="rg-scroll relative min-h-0 flex-1 bg-card"
              onScroll={() => popover && setPopover(null)}
              onKeyDown={keyboard.onKeyDown}
            >
              <div role="row" aria-rowindex={1} className="rg-cols rg-head grid border-b border-border bg-muted">
                <div role="columnheader" className="rg-frozen flex items-center gap-2 border-e border-border bg-muted px-3 text-caption font-bold uppercase tracking-wide text-muted-foreground">
                  Employee
                  <span className="ms-auto font-normal normal-case tabular-nums">{rows}</span>
                </div>
                {weekDays.map((d, i) => (
                  <DayHeader
                    key={d}
                    day={d}
                    isToday={d === model.today}
                    isPast={d < model.today}
                    planned={coverage[i]?.planned ?? 0}
                    pending={coverage[i]?.pending ?? 0}
                    total={rows}
                  />
                ))}
              </div>

              <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                {virtualizer.getVirtualItems().map((item) => {
                  const e = employees[item.index]
                  if (!e) return null
                  const isConflict = conflictIds.has(e.id)
                  return (
                    <div
                      key={e.id}
                      role="row"
                      aria-rowindex={item.index + 2}
                      className={`rg-cols grid ${highlightConflicts && isConflict ? 'rg-conflict' : ''} ${highlightConflicts && !isConflict ? 'rg-dimmed' : ''}`}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: item.size, transform: `translateY(${item.start}px)` }}
                    >
                      <div className="rg-frozen">
                        <EmployeeCell employee={e} onOpen={setCard} findingCount={findingCount.get(e.id) ?? 0} conflict={isConflict} {...(rowStats.get(e.id) ? { stats: rowStats.get(e.id) } : {})} />
                      </div>
                      {weekDays.map((d, col) => {
                        const cell = store.data.roster[e.id]?.[d] ?? null
                        const key = `${e.id}|${d}`
                        const isActive = keyboard.active?.row === item.index && keyboard.active?.col === col
                        const isFirst = !keyboard.active && item.index === 0 && col === 0
                        const route = cell?.code === 'RT' && cell.ref ? model.routeById.get(cell.ref) : undefined
                        const eligibility = cell?.code === 'RT' ? model.eligibility(e, cell.ref, d) : undefined
                        return (
                          <RosterCell
                            key={d}
                            employeeId={e.id}
                            day={d}
                            cell={cell}
                            {...(route ? { route } : {})}
                            {...(eligibility ? { eligibility } : {})}
                            isPast={d < model.today}
                            isToday={d === model.today}
                            isLocked={model.isLocked}
                            isActive={isActive}
                            isSelected={keyboard.isSelected(item.index, col)}
                            isSaving={store.isSaving(e.id, d)}
                            dropState={drag.drag?.overKey === key ? (drag.drag.overOk ? 'ok' : 'bad') : null}
                            isDragSource={drag.drag?.payload.employeeId === e.id && drag.drag?.payload.day === d}
                            tabIndex={isActive || isFirst ? 0 : -1}
                            onClick={onCellClick(item.index, col)}
                            onKeyDown={() => {}}
                            onPointerDown={cell ? drag.onPointerDown({ employeeId: e.id, day: d, cell }) : () => {}}
                            onFocus={() => {
                              if (!keyboard.active) keyboard.setActive({ row: item.index, col })
                            }}
                            slotLabel={`${e.name}, ${fmtDayLong(d)}`}
                          />
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <FindingsPanel
          open={findingsOpen}
          onClose={() => setFindingsOpen(false)}
          weekNo={model.week.w + 1}
          findings={model.findings}
          employeeById={model.employeeById}
          onJump={jumpTo}
        />
      </div>

      {drag.drag && <DragGhost x={drag.drag.x} y={drag.drag.y} cell={drag.drag.payload.cell} overOk={drag.drag.overOk} />}

      {popover && popoverEmployee && (
        <CellPopover
          open
          onOpenChange={(o) => !o && setPopover(null)}
          anchor={popover.anchor}
          employee={popoverEmployee}
          day={popover.day}
          cell={popoverCell}
          {...(popoverCell?.code === 'RT' && popoverCell.ref ? { route: model.routeById.get(popoverCell.ref) } : {})}
          {...(popoverCell?.code === 'RT' ? { eligibility: model.eligibility(popoverEmployee, popoverCell.ref, popover.day) } : {})}
          isLocked={model.isLocked}
          isPast={popover.day < model.today}
          onChange={() => {
            setAssign({ employeeId: popover.employeeId, day: popover.day })
            setPopover(null)
          }}
          onClear={() => {
            actions.setDuty(popover, null)
            setPopover(null)
          }}
          onCopy={() => {
            actions.copy(popoverCell)
            setPopover(null)
          }}
          onChangeRequest={() => {
            actions.changeRequest(popover)
            setPopover(null)
          }}
        />
      )}

      {assign && assignEmployee && (
        <AssignDutyDialog
          open
          onOpenChange={(o) => !o && setAssign(null)}
          employee={assignEmployee}
          day={assign.day}
          current={store.data.roster[assign.employeeId]?.[assign.day] ?? null}
          routes={store.data.routes}
          eligibility={(e, routeId, day) => model.eligibility(e, routeId, day)}
          routeTaken={(routeId) => routeTakenBy(store.data.roster, store.data.employees, routeId, assign.day, assign.employeeId)}
          onAssign={(cell) => {
            if (actions.setDuty(assign, cell)) setAssign(null)
          }}
        />
      )}

      <EmployeeCard employee={card} onOpenChange={(o) => !o && setCard(null)} today={model.today} routeById={model.routeById} eligibility={(e, routeId) => model.eligibility(e, routeId)} />

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
    </div>
  )
}
