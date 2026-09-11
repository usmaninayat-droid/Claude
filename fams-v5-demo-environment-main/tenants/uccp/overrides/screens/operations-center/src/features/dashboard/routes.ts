import type { RouteData } from '../../components/RouteCard'

/**
 * The seven route cards in the cockpit's "Response Routes" rail.
 *
 * DATA LINKAGE (2026-09-01 cross-module audit — Build Delegate/
 * DATA-LINKAGE.md). These were a single prototype row repeated seven times:
 * the same route id (R#9876543), the same tanker (LMV-QA03), the same driver
 * ("Mohammed A.") and 20 JAN timestamps left over from the ported dispatcher
 * app. Each card now mirrors one real row of
 * `tenants/uccp/seeds/plan-monitoring.seed.json`:
 *   - `id` is that plan's id and `plan` its title;
 *   - `vehicle` is its tanker and `driver` that tanker's driver in
 *     `live-monitoring.seed.json` (LMV-QAxx <-> "Tanker xx" <-> plate);
 *   - `bins`/`progress` are its Stops Completed / Total Stops, `pct` its
 *     Compliance %;
 *   - the Delayed / Action Required cards are the 3 delayed plans (Executing,
 *     Compliance % under 70) the KPI funnel counts: FPL-4004/4005/4006;
 *   - timestamps sit inside the demo window (31 AUG 2026, the event day).
 */
const d = (name: string, initial: string) => ({ name, initial })

export const routes: RouteData[] = [
  {
    // FPL-4004 — Ras Laffan, Al Daayen. Delayed (57% compliance), two tankers.
    id: 'FPL-4004',
    status: 'Delayed',
    vehicle: 'LMV-QA10',
    driver: d('Ravi Sharma', 'R'),
    bins: '5/8 Stations',
    progress: 62.5,
    pct: '57%',
    plan: 'Ras Laffan — Tanker Response',
    planStatus: { label: 'At Response Base', tone: 'depot' },
    sectors: ['Sector A', 'Sector B'],
    plannedStartTime: '31 AUG | 06:00',
    actualStartTime: '31 AUG | 06:30',
    delayText: '(30m delay)',
    plannedEndTime: '31 AUG | 14:00',
    estEndTime: '31 AUG | 14:30',
  },
  {
    // FPL-3001 — Al Wakrah Tunnel 3 daily run. On track (90% compliance).
    id: 'FPL-3001',
    status: 'Ongoing',
    vehicle: 'LMV-QA06',
    driver: d('Muhammad Iqbal', 'M'),
    bins: '7/12 Stations',
    progress: 58.3,
    pct: '90%',
    plan: 'Al Wakrah Tunnel 3 — Daily Run',
    planStatus: { label: 'At Response Base', tone: 'depot' },
    banner: { tone: 'warn', text: 'Response might be affected due to SLA risk' },
    sectors: ['Sector C'],
    plannedStartTime: '31 AUG | 06:00',
    actualStartTime: '31 AUG | 06:05',
    plannedEndTime: '31 AUG | 14:00',
    estEndTime: '31 AUG | 13:55',
  },
  {
    // FPL-4006 — Al Khaleej, Doha. Worst compliance of the three delayed runs.
    id: 'FPL-4006',
    status: 'Action Required',
    vehicle: 'LMV-QA15',
    driver: d('Khalid Al-Emadi', 'K'),
    bins: '4/8 Stations',
    progress: 50,
    pct: '55%',
    plan: 'Al Khaleej — Tanker Response',
    planStatus: { label: 'At Incident Site', tone: 'site' },
    alert: true,
    banner: { tone: 'error', text: 'Response at risk — LMV-QA04 broke down, crew reassigned', actionable: true },
    sectors: ['Sector D', 'Sector E'],
    plannedStartTime: '31 AUG | 06:00',
    actualStartTime: '31 AUG | 06:15',
    delayText: '(15m delay)',
    plannedEndTime: '31 AUG | 14:00',
    estEndTime: '31 AUG | 15:30',
  },
  {
    // FPL-3008 — Hamad Hospital access route, pre-position run.
    id: 'FPL-3008',
    status: 'Ongoing',
    vehicle: 'LMV-QA12',
    driver: d('Nimal Perera', 'N'),
    bins: '4/9 Stations',
    progress: 44.4,
    pct: '82%',
    plan: 'Hamad Hospital Access Route — Daily Run (Pre-Position)',
    planStatus: { label: 'At Incident Site', tone: 'site' },
    dim: true,
    sectors: ['Sector F'],
    plannedStartTime: '31 AUG | 06:00',
    actualStartTime: '31 AUG | 06:00',
    plannedEndTime: '31 AUG | 14:00',
    estEndTime: '31 AUG | 14:00',
  },
  {
    // FPL-4005 — Al Wukair, Al Wakrah. Delayed (59% compliance).
    id: 'FPL-4005',
    status: 'Action Required',
    vehicle: 'LMV-QA09',
    driver: d('Suresh Kumar', 'S'),
    bins: '6/8 Stations',
    progress: 75,
    pct: '59%',
    plan: 'Al Wukair — Tanker Response',
    alert: true,
    dim: true,
    sectors: ['Sector A'],
    plannedStartTime: '31 AUG | 06:00',
    actualStartTime: '31 AUG | 06:40',
    delayText: '(40m delay)',
    plannedEndTime: '31 AUG | 14:00',
    estEndTime: '31 AUG | 14:40',
  },
  {
    // FPL-3004 — Al Rayyan West Tunnel. Finished clean (94% compliance).
    id: 'FPL-3004',
    status: 'Completed',
    vehicle: 'LMV-QA07',
    driver: d('Ashraf Hossain', 'A'),
    bins: '11/11 Stations',
    progress: 100,
    pct: '94%',
    plan: 'Al Rayyan West Tunnel — Daily Run',
    dim: true,
    sectors: ['Sector B', 'Sector C'],
    plannedStartTime: '31 AUG | 06:00',
    actualStartTime: '31 AUG | 06:00',
    plannedEndTime: '31 AUG | 14:00',
    estEndTime: '31 AUG | 14:00',
  },
  {
    // FPL-3005 — Umm Salal hospital access route. Best compliance of the day.
    id: 'FPL-3005',
    status: 'Completed',
    vehicle: 'LMV-QA08',
    driver: d('Rafiqul Islam', 'R'),
    bins: '10/10 Stations',
    progress: 100,
    pct: '97%',
    plan: 'Umm Salal Hospital Access Route — Daily Run',
    dim: true,
    sectors: ['Sector G'],
    plannedStartTime: '31 AUG | 06:00',
    actualStartTime: '31 AUG | 06:02',
    plannedEndTime: '31 AUG | 14:00',
    estEndTime: '31 AUG | 14:02',
  },
]
