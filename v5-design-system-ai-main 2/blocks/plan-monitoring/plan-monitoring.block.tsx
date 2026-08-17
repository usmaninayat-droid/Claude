import type { ModuleConfig } from '@ds/components/app-shell';
import { PlanMonitoring } from '@ds/components/planning';
import type { PlanMonitorRow } from '@ds/components/planning';
import { BarChartSquare02 } from '@ds/icons';

/**
 * Plan Monitoring BLOCK — the module where plans configured in Interactive
 * Planning land, scheduled daily for the selected period (Tadweer, Figma
 * AKU5PLaqjO1QBakY9pUAH1 · node 49-33236). Home = a monitoring list: a KPI strip
 * (Total / Completed / On Going / Scheduled) + a dense table (ID · Service Type ·
 * Waste Type · Title · Vehicle · Driver · Shift · Service Locations · Planned
 * Time · Status · Progress · Compliance). Row click → the full-screen detail.
 *
 * DYNAMIC: `rows` / `kpis` / `statusStyles` / `wasteStyles` / `shiftStyles` are
 * props, so any scheduled-service monitor adapts by config. Brand = FAMS blue;
 * SCHEDULED (amber) / ONGOING (blue) / COMPLETED (green) + compliance ring are
 * genuine status. Full-screen detail + edit side sheets (add helper / change
 * vehicle / driver / discharge) are follow-ons — see plan-monitoring.block.md.
 */

const WASTE = ['General', 'Mix', 'General', 'Mix', 'General', 'Recyclable', 'Recyclable', 'Mix', 'Recyclable', 'General', 'Recyclable', 'General'];
const SHIFTS = ['Morning Shift', 'Morning Shift', 'Night Shift', 'Morning Shift', 'Morning Shift', 'Night Shift', 'Afternoon Shift', 'Night Shift', 'Afternoon Shift', 'Night Shift', 'Morning Shift', 'Afternoon Shift'];
const DRIVERS = ['Arjun Patel', 'Omar Khan', 'Ravi Singh', 'Kamal Raj', 'Ayaan Malik', 'Zain Ali', 'Naveen', 'Sanjay', 'Vikram Das', 'Rahul Nair', 'Arif Hussain', 'Sameer'];
const PLATES = ['H 9876', 'H 9876', 'R 4321', 'T 2109', 'Y 6543', 'H 9876', 'V 5438', 'S 7654', 'L 8765', 'H 9876', 'M 2345', 'A 0987'];
const TITLES = ['CENTRAL AREA_A_B1', 'CENTRAL AREA_C_D2', 'CENTRAL AREA_E_F3', 'MANHAL AREA_G_H4', 'MANHAL AREA_I_J5', 'AL KARAMA_K_L6', 'AL KARAMA_M_N7', 'AL MUSHRIF_O_P8', 'AL MUSHRIF_Q_R9', 'AL MUSHRIF_S_T0', 'AL MUSHRIF_U_V1', 'AL MUSHRIF_W_X2'];
const STATUS = ['SCHEDULED', 'SCHEDULED', 'SCHEDULED', 'SCHEDULED', 'ONGOING', 'ONGOING', 'ONGOING', 'ONGOING', 'ONGOING', 'ONGOING', 'COMPLETED', 'COMPLETED'];
const TOT = [132, 145, 118, 129, 148, 131, 142, 115, 149, 124, 138, 119];
const DONE = [0, 0, 0, 0, 88, 72, 95, 55, 110, 67, 138, 119];
const COMP = [undefined, undefined, undefined, undefined, 95, 89, 82, 91, 85, 97, 93, 84];

const ROWS: PlanMonitorRow[] = TITLES.map((title, i) => ({
  id: 'PID#123456', serviceType: 'Bin Collection', wasteType: WASTE[i], title, vehicle: PLATES[i],
  driver: DRIVERS[i], shift: SHIFTS[i],
  locations: i % 3 === 1 ? ['Al Reef Village', 'Capital Mall'] : i % 3 === 2 ? ['Prestige Tower 16 & 17'] : ['Al Reef Village'],
  startAt: '22 Sep, 2025 11:30 AM', endAt: '22 Sep, 2025 02:00 PM',
  status: STATUS[i], progressDone: DONE[i], progressTotal: TOT[i], compliancePct: COMP[i],
}));

export const planMonitoringBlock: ModuleConfig = {
  id: 'plan-monitoring',
  type: 'dashboard',
  label: 'Plan Monitoring',
  icon: BarChartSquare02,
  tabKind: 'instance',
  defaultTabId: 'list',
  tabs: [
    { id: 'list', label: 'List View', icon: BarChartSquare02, render: () => <PlanMonitoring rows={ROWS} /> },
  ],
};
