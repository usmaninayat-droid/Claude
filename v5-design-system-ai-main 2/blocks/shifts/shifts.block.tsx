import * as React from 'react';
import type { ModuleConfig } from '@ds/components/app-shell';
import { ShiftPlanner, WorkforceCompliance } from '@ds/components/scheduling';
import type { PlannedShift, ShiftWorker, ShiftArea, DeleteScope } from '@ds/components/scheduling';
import { CalendarCheck01, ShieldTick } from '@ds/icons';

/**
 * Shifts BLOCK — a reusable **workforce shift planner** (weekly/daily planning
 * grid, conflict + utilization flags, a 3-tab Create/Edit sheet with recurrence,
 * and a recurring-delete dialog). A `shifts` module is config: a `ModuleConfig`
 * (`type:'dashboard'`, `tabKind:'instance'`) whose tab renders the DS
 * `ShiftPlanner`. No bespoke screen.
 *
 * DYNAMIC — adapt to ANY workforce by config, never a rewrite:
 *   • inspectors → { workerSingular:'Inspector', areaSingular:'Lot', subAreaSingular:'Sector' }
 *   • drivers    → { workerSingular:'Driver',    areaSingular:'Route', subAreaSingular:'Stop'  }
 *   • technicians→ { workerSingular:'Technician',areaSingular:'Site',  subAreaSingular:'Zone'  }
 *   • guards     → { workerSingular:'Guard',     areaSingular:'Post',  subAreaSingular:'Wing'  }
 * Swap `WORKERS`/`AREAS`/`SUB_AREAS`/`TASKS` and the labels; the grid, sheet,
 * recurrence and conflict logic are all generic.
 *
 * `ShiftPlanner` is CONTROLLED — `shifts` come in as a prop and create/update/
 * delete are reported through callbacks, so the product owns persistence. This
 * block wires them to a shared store (a live demo); a real app wires them to its
 * sim engine / store / API. Optional `renderAreaMap` / `renderPlansTab` slots add
 * a map card + a "Scheduled Plans" reference tab (kept out of the DS core so it
 * carries no map/table dependency). See shifts.block.md.
 *
 * The module has TWO views (tabs): **Planning** (ShiftPlanner) and **Compliance
 * Monitoring** (WorkforceCompliance — per-worker-per-day coverage derived from the
 * SAME shifts). Both read one shared store so they stay in sync.
 */

const WORKERS: ShiftWorker[] = [
  { id: 'w1', name: 'Alex Stone', color: 'var(--primary)' },
  { id: 'w2', name: 'Priya Raman', color: 'var(--chart-2)' },
  { id: 'w3', name: 'Sam Okoro', color: 'var(--chart-3)' },
  { id: 'w4', name: 'Lena Fischer', color: 'var(--chart-4)' },
  { id: 'w5', name: 'Diego Marin', color: 'var(--chart-5)' }, // deliberately left with NO shifts → "NOT UTILIZED"
];

const AREAS: ShiftArea[] = [
  { id: 'a1', label: 'Area 1', sub: 'North' },
  { id: 'a2', label: 'Area 2', sub: 'South' },
  { id: 'a3', label: 'Area 3', sub: 'East' },
];
const SUB_AREAS = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];
const TASKS = ['General Inspection', 'Inspection', 'Audit', 'Route Check'];

/** ISO date for `offset` days after this week's Monday (so the seed lands in the visible week). */
function weekISO(offset: number): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

/** Seed: most workers 1–2 shifts Mon–Fri, one worker with none, an overlapping
 *  pair (→ red conflict), and an unassigned shift (→ amber "missing"). */
function seed(): PlannedShift[] {
  const s = (id: string, workerId: string, day: number, start: string, end: string, areaId: string, subArea: string, task: string, recurring = false): PlannedShift =>
    ({ id, seriesId: id, workerId, dateISO: weekISO(day), start, end, areaId, subArea, task, recurring });
  return [
    s('s1', 'w1', 0, '08:00', '10:00', 'a1', 'Zone A', 'General Inspection'),
    s('s2', 'w1', 2, '11:00', '13:00', 'a2', 'Zone B', 'Audit'),
    s('s3', 'w2', 0, '09:00', '11:00', 'a1', 'Zone C', 'Inspection'),
    s('s4', 'w2', 1, '13:00', '15:00', 'a3', 'Zone D', 'Route Check'),
    s('s5', 'w3', 3, '08:30', '10:30', 'a2', 'Zone A', 'Inspection'),
    // overlapping pair for w4 on the same day → conflict (red)
    s('s6', 'w4', 1, '08:00', '10:30', 'a1', 'Zone B', 'General Inspection'),
    s('s7', 'w4', 1, '10:00', '12:00', 'a1', 'Zone B', 'Audit'),
    // unassigned → missing (amber), routed under the "Unassigned" row
    s('s8', '', 2, '09:00', '11:00', 'a3', 'Zone C', 'Inspection'),
  ];
}

const LABELS = { workerSingular: 'Inspector', workerPlural: 'Inspectors', areaSingular: 'Lot', subAreaSingular: 'Sector' };

/**
 * Shared demo store — the AppShell mounts only the active tab's render, so
 * per-render state would reset on tab switch. A tiny external store keeps
 * Planning + Compliance in sync (a real app uses its sim engine / store / API).
 */
let _shifts: PlannedShift[] = seed();
const _listeners = new Set<() => void>();
const _emit = () => _listeners.forEach((l) => l());
const mutate = (fn: (cur: PlannedShift[]) => PlannedShift[]) => { _shifts = fn(_shifts); _emit(); };
function useShifts() {
  return React.useSyncExternalStore(
    (cb) => { _listeners.add(cb); return () => { _listeners.delete(cb); }; },
    () => _shifts,
  );
}

const onCreate = (built: PlannedShift[]) => mutate((cur) => [...cur, ...built]);
const onUpdate = (id: string, patch: Partial<PlannedShift>) => mutate((cur) => cur.map((x) => (x.id === id ? { ...x, ...patch } : x)));
const onDelete = (id: string, scope: DeleteScope, shift: PlannedShift) => mutate((cur) => {
  if (scope === 'one') return cur.filter((x) => x.id !== id);
  if (scope === 'all') return cur.filter((x) => x.seriesId !== shift.seriesId);
  return cur.filter((x) => !(x.seriesId === shift.seriesId && x.dateISO >= shift.dateISO)); // 'following'
});

function PlanningView() {
  const shifts = useShifts();
  return (
    <ShiftPlanner
      workers={WORKERS} areas={AREAS} subAreas={SUB_AREAS} tasks={TASKS} shifts={shifts}
      labels={LABELS} onCreate={onCreate} onUpdate={onUpdate} onDelete={onDelete}
    />
  );
}

function ComplianceView() {
  const shifts = useShifts();
  return <WorkforceCompliance workers={WORKERS} areas={AREAS} subAreas={SUB_AREAS} shifts={shifts} labels={LABELS} />;
}

export const shiftsBlock: ModuleConfig = {
  id: 'shifts',
  type: 'dashboard',
  label: 'Shifts',
  icon: CalendarCheck01,
  tabKind: 'instance',
  defaultTabId: 'planning',
  tabs: [
    { id: 'planning', label: 'Planning', icon: CalendarCheck01, render: () => <PlanningView /> },
    { id: 'compliance', label: 'Compliance Monitoring', icon: ShieldTick, render: () => <ComplianceView /> },
  ],
};
