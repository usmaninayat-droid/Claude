import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { ShiftPlanner, WorkforceCompliance } from './components/scheduling';
import type { PlannedShift, ShiftWorker, ShiftArea, DeleteScope } from './components/scheduling';
import { Toaster } from './components/primitives';
import './styles.css';

/**
 * Standalone ShiftPlanner demo (served at `/shifts.html`) — the reusable
 * workforce scheduler wired to local state, mirroring the `blocks/shifts` base.
 * Verifies the DS component renders + all interactions work.
 */

const WORKERS: ShiftWorker[] = [
  { id: 'w1', name: 'Alex Stone', color: 'var(--primary)' },
  { id: 'w2', name: 'Priya Raman', color: 'var(--chart-2)' },
  { id: 'w3', name: 'Sam Okoro', color: 'var(--chart-3)' },
  { id: 'w4', name: 'Lena Fischer', color: 'var(--chart-4)' },
  { id: 'w5', name: 'Diego Marin', color: 'var(--chart-5)' },
];
const AREAS: ShiftArea[] = [
  { id: 'a1', label: 'Lot 1', sub: 'Deira' },
  { id: 'a2', label: 'Lot 2', sub: 'Bur Dubai' },
  { id: 'a3', label: 'Lot 3', sub: 'Jumeirah' },
];
const SUB_AREAS = ['Sector A', 'Sector B', 'Sector C', 'Sector D'];
const TASKS = ['General Inspection', 'Inspection', 'Bin Audit', 'Route Check'];

function weekISO(offset: number): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}
const mk = (id: string, workerId: string, day: number, start: string, end: string, areaId: string, subArea: string, task: string): PlannedShift =>
  ({ id, seriesId: id, workerId, dateISO: weekISO(day), start, end, areaId, subArea, task, recurring: false });
const SEED: PlannedShift[] = [
  mk('s1', 'w1', 0, '08:00', '10:00', 'a1', 'Sector A', 'General Inspection'),
  mk('s2', 'w1', 2, '11:00', '13:00', 'a2', 'Sector B', 'Bin Audit'),
  mk('s3', 'w2', 0, '09:00', '11:00', 'a1', 'Sector C', 'Inspection'),
  mk('s4', 'w2', 1, '13:00', '15:00', 'a3', 'Sector D', 'Route Check'),
  mk('s5', 'w3', 3, '08:30', '10:30', 'a2', 'Sector A', 'Inspection'),
  mk('s6', 'w4', 1, '08:00', '10:30', 'a1', 'Sector B', 'General Inspection'),
  mk('s7', 'w4', 1, '10:00', '12:00', 'a1', 'Sector B', 'Bin Audit'), // conflict with s6
  mk('s8', '', 2, '09:00', '11:00', 'a3', 'Sector C', 'Inspection'),  // unassigned
];

const LABELS = { workerSingular: 'Inspector', workerPlural: 'Inspectors', areaSingular: 'Lot', subAreaSingular: 'Sector' };

function Demo() {
  const [shifts, setShifts] = React.useState<PlannedShift[]>(SEED);
  const [view, setView] = React.useState<'planning' | 'compliance'>('planning');
  return (
    <div style={{ height: '100vh' }} className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        {(['planning', 'compliance'] as const).map((v) => (
          <button key={v} type="button" onClick={() => setView(v)}
            className={`rounded-md px-3 py-1.5 text-body-sm font-semibold capitalize transition-colors ${view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {v === 'planning' ? 'Planning' : 'Compliance Monitoring'}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {view === 'planning' ? (
          <ShiftPlanner
            workers={WORKERS} areas={AREAS} subAreas={SUB_AREAS} tasks={TASKS} shifts={shifts} labels={LABELS}
            onCreate={(built) => setShifts((cur) => [...cur, ...built])}
            onUpdate={(id, patch) => setShifts((cur) => cur.map((x) => (x.id === id ? { ...x, ...patch } : x)))}
            onDelete={(id, scope: DeleteScope, shift) => setShifts((cur) => {
              if (scope === 'one') return cur.filter((x) => x.id !== id);
              if (scope === 'all') return cur.filter((x) => x.seriesId !== shift.seriesId);
              return cur.filter((x) => !(x.seriesId === shift.seriesId && x.dateISO >= shift.dateISO));
            })}
          />
        ) : (
          <WorkforceCompliance workers={WORKERS} areas={AREAS} subAreas={SUB_AREAS} shifts={shifts} labels={LABELS} />
        )}
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');
createRoot(container).render(<><Demo /><Toaster position="bottom-right" richColors /></>);
