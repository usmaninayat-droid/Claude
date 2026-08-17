import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { PlanMonitoring, PlanMonitoringDetail, PlanOverview } from './components/planning';
import type { PlanMonitorRow, PlanOverviewData, OverviewDay, DayStatus } from './components/planning';
import { Toaster } from './components/primitives';
import './styles.css';

/** Standalone Plan Monitoring demo (served at `/plan-monitoring.html`). */

const WASTE = ['General', 'Mix', 'General', 'Mix', 'General', 'Recyclable', 'Recyclable', 'Mix', 'Recyclable', 'General', 'Recyclable', 'General', 'Recyclable', 'General'];
const SHIFTS = ['Morning Shift', 'Morning Shift', 'Night Shift', 'Morning Shift', 'Morning Shift', 'Night Shift', 'Afternoon Shift', 'Night Shift', 'Afternoon Shift', 'Night Shift', 'Morning Shift', 'Afternoon Shift', 'Afternoon Shift', 'Night Shift'];
const DRIVERS = ['Arjun Patel', 'Omar Khan', 'Ravi Singh', 'Kamal Raj', 'Ayaan Malik', 'Zain Ali', 'Naveen', 'Sanjay', 'Vikram Das', 'Rahul Nair', 'Arif Hussain', 'Sameer', 'Dev Anand', 'Rohan'];
const PLATES = ['H 9876', 'H 9876', 'R 4321', 'T 2109', 'Y 6543', 'H 9876', 'V 5438', 'S 7654', 'L 8765', 'H 9876', 'M 2345', 'A 0987', 'H 9876', 'K 5432'];
const TITLES = ['CENTRAL AREA_A_B1', 'CENTRAL AREA_C_D2', 'CENTRAL AREA_E_F3', 'MANHAL AREA_G_H4', 'MANHAL AREA_I_J5', 'AL KARAMA_K_L6', 'AL KARAMA_M_N7', 'AL MUSHRIF_O_P8', 'AL MUSHRIF_Q_R9', 'AL MUSHRIF_S_T0', 'AL MUSHRIF_U_V1', 'AL MUSHRIF_W_X2', 'AL MUSHRIF_Y_Z3', 'AL MUSHRIF_A_C6'];
const STATUS = ['SCHEDULED', 'SCHEDULED', 'SCHEDULED', 'SCHEDULED', 'ONGOING', 'ONGOING', 'ONGOING', 'ONGOING', 'ONGOING', 'ONGOING', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED'];
const TOTS = [132, 145, 118, 129, 148, 131, 142, 115, 149, 124, 138, 119, 147, 108];
const DONE = [0, 0, 0, 0, 88, 72, 95, 55, 110, 67, 138, 119, 147, 108];
const COMP = [undefined, undefined, undefined, undefined, 95, 89, 82, 91, 85, 97, 93, 84, 89, 90];
const DATES = ['22 Sep, 2025', '23 Sep, 2025', '24 Sep, 2025', '25 Sep, 2025', 'Today', 'Today', 'Today', 'Today', 'Today', 'Yesterday', 'Yesterday', 'Yesterday', 'Yesterday', '17 Sep, 2025'];

const ROWS: PlanMonitorRow[] = TITLES.map((title, i) => ({
  id: 'PID#123456',
  serviceType: 'Bin Collection',
  wasteType: WASTE[i],
  title,
  vehicle: PLATES[i],
  driver: DRIVERS[i],
  shift: SHIFTS[i],
  locations: i % 3 === 1 ? ['Al Reef Village', 'Capital Mall'] : i % 3 === 2 ? ['Prestige Tower 16 & 17'] : ['Al Reef Village'],
  startAt: `${DATES[i]} ${['11:30 AM', '09:15 AM', '10:00 AM', '03:00 AM', '10:15 AM', '11:00 AM', '09:00 AM', '11:00 AM', '09:00 AM', '11:15 AM', '09:45 AM', '11:00 AM', '09:30 AM', '10:00 AM'][i]}`,
  endAt: `${DATES[i]} ${['02:00 PM', '04:45 PM', '01:30 PM', '06:30 AM', '03:45 PM', '04:30 PM', '01:30 PM', '04:30 PM', '01:30 PM', '03:15 PM', '01:45 PM', '03:30 PM', '01:00 PM', '01:30 PM'][i]}`,
  status: STATUS[i],
  progressDone: DONE[i],
  progressTotal: TOTS[i],
  compliancePct: COMP[i],
}));

const OVERVIEW: PlanOverviewData = {
  id: 'PID-231454', name: 'Bin Collection Plan Sector A MUSAFFAH Lot 3', contractor: 'BEIYING CORPORATION',
  period: '1 Oct – 31 Oct, 2025', recurrence: 'Daily', status: 'ONGOING',
  avgCompliance: 87, totalDays: 31, completed: 18, ongoing: 1, scheduled: 12, missedCollections: 42, onTimePct: 91,
  trend: Array.from({ length: 18 }, (_, i) => ({ t: `Oct ${i + 1}`, compliance: Math.round(78 + Math.sin(i / 2) * 8 + (i % 4 === 0 ? -10 : 4)) })),
  days: Array.from({ length: 31 }, (_, i): OverviewDay => {
    const day = i + 1;
    const status: DayStatus = day <= 18 ? 'completed' : day === 19 ? 'ongoing' : 'scheduled';
    const pct = status === 'scheduled' ? undefined : Math.round(72 + Math.sin(i) * 12 + (i % 5 === 0 ? -14 : 6));
    const missed = status === 'completed' && (pct ?? 100) < 62;
    return { dateISO: `2025-10-${String(day).padStart(2, '0')}`, day, status: missed ? 'missed' : status, compliancePct: pct };
  }),
  points: [
    { name: 'Al Reef Village', serviced: 128, total: 132, compliancePct: 92 },
    { name: 'Capital Mall', serviced: 138, total: 145, compliancePct: 88 },
    { name: 'Prestige Tower 16 & 17', serviced: 96, total: 118, compliancePct: 71 },
  ],
};

function Demo() {
  const [screen, setScreen] = React.useState<'list' | 'overview' | 'detail'>('list');
  if (screen === 'overview') return <PlanOverview data={OVERVIEW} onBack={() => setScreen('list')} onOpenDay={() => setScreen('detail')} />;
  if (screen === 'detail') return <PlanMonitoringDetail onBack={() => setScreen('overview')} />;
  return (
    <div style={{ height: '100vh' }} className="flex flex-col">
      <div className="flex items-center gap-1 border-b border-border px-4">
        <span className="px-4 py-3 text-body font-semibold text-foreground">Plan Monitoring</span>
        <button type="button" className="relative px-3 py-3 text-body-sm font-semibold text-primary">List View<span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" /></button>
        <button type="button" aria-label="Add view" className="ml-1 grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted">+</button>
      </div>
      <div className="min-h-0 flex-1">
        <PlanMonitoring rows={ROWS} onOpen={() => setScreen('overview')} />
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');
createRoot(container).render(<><Demo /><Toaster position="bottom-right" richColors /></>);
