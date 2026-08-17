import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { InteractivePlanning, SmartPlanningCalendar } from './components/planning';
import type { PlanRow, PlanZone, PlanBin, SmartPlanRow, PlanShift } from './components/planning';
import { Toaster, toast } from './components/primitives';
import './styles.css';

/**
 * Standalone Interactive Planning demo (served at `/interactive-planning.html`)
 * — the home Hybrid View wired to sample Abu Dhabi waste-planning data.
 */

const PLATES = ['V 9876', 'R 5432', 'B 8765', 'N 2345', 'C 6543', 'X 7890', 'M 3456', 'L 0987', 'P 4321', 'Q 1010', 'W 2020', 'S 3030', 'D 4040', 'F 5050', 'G 6060'];
const WASTE = ['General', 'Recyclable', 'General', 'Recyclable', 'General', 'Recyclable', 'Recyclable', 'General', 'Recyclable', 'General', 'Recyclable', 'General', 'Recyclable', 'Recyclable', 'Non Recyclable'];
const PLANS: PlanRow[] = PLATES.map((plate, i) => ({
  id: `plan-${i}`,
  serviceType: 'Bin Collection',
  wasteType: WASTE[i],
  vehicle: plate,
  status: i < 10 ? 'DRAFTED' : 'APPROVED',
  visible: i < 4,
}));

const ZONES: PlanZone[] = [
  { id: 'z1', name: 'Khalifa City', points: [[24.44, 54.57], [24.44, 54.63], [24.40, 54.63], [24.40, 54.57]] },
  { id: 'z2', name: 'Musaffah', points: [[24.36, 54.48], [24.36, 54.53], [24.32, 54.53], [24.32, 54.48]] },
  { id: 'z3', name: 'Mohamed Bin Zayed City', points: [[24.42, 54.55], [24.43, 54.60], [24.38, 54.61], [24.38, 54.55]] },
];

// scatter planned + unplanned bins across the zones
const BINS: PlanBin[] = Array.from({ length: 60 }, (_, i) => ({
  id: `bin-${i}`,
  position: [24.32 + (i % 8) * 0.018, 54.48 + Math.floor(i / 8) * 0.021] as [number, number],
  planned: i % 3 !== 0,
}));

/* Calendar View sample — recurring plans × 7 days. */
const WEEKDAYS = [{ abbr: 'SUN', date: 6 }, { abbr: 'MON', date: 7 }, { abbr: 'TUE', date: 8 }, { abbr: 'WED', date: 9 }, { abbr: 'THU', date: 10 }, { abbr: 'FRI', date: 11 }, { abbr: 'SAT', date: 12 }];
const CAL_PLANS: SmartPlanRow[] = Array.from({ length: 9 }, (_, r) => {
  const shift: PlanShift = r % 3 === 0 ? 'morning' : r % 3 === 1 ? 'night' : 'afternoon';
  const time = shift === 'morning' ? '00:00 – 08:00' : shift === 'night' ? '13:00 – 21:00' : '11:00 – 21:30';
  return {
    id: `p${r}`,
    name: 'Plan #123 - Al Ain, Yas Island, Corniche Rd',
    status: 'APPROVED',
    lot: 'Beeah Lot 1',
    days: Array.from({ length: 7 }, (_, d) => {
      if ((r === 3 || r === 9) && (d === 1 || d === 5)) return null; // some empty cells
      const missing = shift === 'night' || (r === 8 && d < 3);
      const conflict = r === 2 && d < 4;
      return { time, vehicle: 'Z 1234', assignee: missing ? '' : 'Arjun Patel', shift, conflict };
    }),
  };
});

function Demo() {
  const [plans, setPlans] = React.useState<PlanRow[]>(PLANS);
  const [view, setView] = React.useState<'hybrid' | 'calendar'>('hybrid');
  const tabs: { id: 'hybrid' | 'calendar'; label: string }[] = [{ id: 'hybrid', label: 'Hybrid View' }, { id: 'calendar', label: 'Calendar View' }];
  return (
    <div style={{ height: '100vh' }} className="flex flex-col">
      <div className="flex items-center gap-1 border-b border-border px-4">
        <span className="px-3 py-3 text-body font-semibold text-foreground">Smart Planning</span>
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setView(t.id)} className={`relative px-3 py-3 text-body-sm font-semibold transition-colors ${view === t.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
            {view === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
        <button type="button" aria-label="Add view" className="ml-1 grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">+</button>
      </div>
      <div className="min-h-0 flex-1">
        {view === 'hybrid' ? (
          <InteractivePlanning
            plans={plans}
            zones={ZONES}
            bins={BINS}
            center={[24.42, 54.55]}
            zoom={11}
            onCreatePlan={() => toast.success('Create New Plan', { description: 'Opens the Basic Setup wizard (step 1 of 3).' })}
            onToggleVisible={(id, v) => setPlans((cur) => cur.map((p) => (p.id === id ? { ...p, visible: v } : p)))}
          />
        ) : (
          <SmartPlanningCalendar
            plans={CAL_PLANS}
            weekDays={WEEKDAYS}
            weekLabel="6 Jan, 2026 – 12 Jan, 2026 (2nd Week)"
            onConfigureNewPlan={() => toast.success('Configure New Plan')}
          />
        )}
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');
createRoot(container).render(<><Demo /><Toaster position="bottom-right" richColors /></>);
