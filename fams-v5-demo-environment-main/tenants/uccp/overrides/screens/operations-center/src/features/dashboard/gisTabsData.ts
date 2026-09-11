// Data layer for the Live GIS Map panel's four tabs (Plans / Complaints /
// Inspectors / Vehicles). Each tab's rows carry a lat/lng so the map's
// marker set can be swapped alongside the panel content on tab change.

/* ── Plans ────────────────────────────────────────────────────────────────
 * MIRRORED DATA: these rows are a direct snapshot of the Plan Monitoring
 * seed (source: tenants/uccp/seeds/plan-monitoring.seed.json — the same
 * file `tenants/uccp/modules/plan-monitoring` reads), re-shaped into the
 * PM run-card fields (title, tanker, driver, shift, zones, planned window,
 * status, progress) so numbers/names shown here MATCH what Plan Monitoring
 * shows for the same plan id. Card anatomy is copied from
 * `tenants/uccp/overrides/screens/planning-v2/vendor/fms-main-ds/components/
 * planning/plan-monitoring-detail.tsx`'s `ServiceLocationCard` (rounded-xl
 * card, header row with title + status pill, info-cell grid, progress bar)
 * — the closest per-run CARD anatomy in that vendored app (`plan-monitoring
 * .tsx` itself renders a DataTable, not cards).
 */
export type PlanStatus = 'Scheduled' | 'Executing' | 'Completed'

export interface PlanCardRow {
  id: string
  title: string
  tanker: string
  driver: string
  helper: string
  shift: 'Morning' | 'Afternoon' | 'Night'
  zone: string
  windowStart: string
  windowEnd: string
  status: PlanStatus
  progressDone: number
  progressTotal: number
  position: [number, number]
}

// Snapshot of plan-monitoring.seed.json rows FPL-3001..FPL-3008 (the daily
// flood-response runs) — id/title/tanker/driver/shift/window/status/progress
// copied verbatim from that seed's systemcol1..13 fields. Re-snapshotted
// 2026-09-01 after the cross-module data audit reassigned tankers/drivers so
// the tanker↔driver pair on every plan matches live-monitoring.seed.json and
// the executing plans use exactly the 9 on-route tankers (DATA-LINKAGE.md).
// `helper` carries the plan's Inspector column — one of the 6 inspectors in
// LM's own workforce roster.
export const planCards: PlanCardRow[] = [
  { id: 'FPL-3001', title: 'Al Wakrah Tunnel 3 — Daily Run', tanker: 'Tanker 06', driver: 'Muhammad Iqbal', helper: 'Layla Hassan', shift: 'Morning', zone: 'Al Wakrah', windowStart: '06:00', windowEnd: '14:00', status: 'Executing', progressDone: 7, progressTotal: 12, position: [25.2634, 51.6512] },
  { id: 'FPL-3002', title: 'Hamad Hospital Access Route — Daily Run (Rain Response)', tanker: 'Tanker 02', driver: 'Abdullah Al-Marri', helper: 'Rashid Al-Kubaisi', shift: 'Morning', zone: 'Doha', windowStart: '06:00', windowEnd: '14:00', status: 'Executing', progressDone: 5, progressTotal: 10, position: [25.339, 51.523] },
  { id: 'FPL-3003', title: 'Al Wakrah Underpass 1 — Daily Run', tanker: 'Tanker 01', driver: 'Mohammed Al-Kuwari', helper: 'Nasser Al-Hajri', shift: 'Night', zone: 'Al Wakrah', windowStart: '22:00', windowEnd: '06:00', status: 'Scheduled', progressDone: 0, progressTotal: 9, position: [25.2554, 51.647] },
  { id: 'FPL-3004', title: 'Al Rayyan West Tunnel — Daily Run', tanker: 'Tanker 07', driver: 'Ashraf Hossain', helper: 'Mariam Al-Kuwari', shift: 'Morning', zone: 'Al Rayyan', windowStart: '06:00', windowEnd: '14:00', status: 'Completed', progressDone: 11, progressTotal: 11, position: [25.205, 51.415] },
  { id: 'FPL-3005', title: 'Umm Salal Hospital Access Route — Daily Run', tanker: 'Tanker 08', driver: 'Rafiqul Islam', helper: 'Fatima Rahman', shift: 'Morning', zone: 'Umm Salal', windowStart: '06:00', windowEnd: '14:00', status: 'Completed', progressDone: 10, progressTotal: 10, position: [25.356, 51.6] },
  { id: 'FPL-3006', title: 'Umm Salal Underpass 4 — Daily Run', tanker: 'Tanker 13', driver: 'Sunil Fernando', helper: 'Aisha Al-Naimi', shift: 'Afternoon', zone: 'Umm Salal', windowStart: '14:00', windowEnd: '22:00', status: 'Scheduled', progressDone: 0, progressTotal: 8, position: [25.363, 51.611] },
  { id: 'FPL-3007', title: 'Al Daayen Tunnel 2 — Daily Run', tanker: 'Tanker 18', driver: 'Ganesh Reddy', helper: 'Layla Hassan', shift: 'Night', zone: 'Al Daayen', windowStart: '22:00', windowEnd: '06:00', status: 'Scheduled', progressDone: 0, progressTotal: 7, position: [25.498, 51.52] },
  { id: 'FPL-3008', title: 'Hamad Hospital Access Route — Daily Run (Pre-Position)', tanker: 'Tanker 12', driver: 'Nimal Perera', helper: 'Rashid Al-Kubaisi', shift: 'Morning', zone: 'Doha', windowStart: '06:00', windowEnd: '14:00', status: 'Executing', progressDone: 4, progressTotal: 9, position: [25.339, 51.523] },
]

/* ── Complaints ───────────────────────────────────────────────────────────
 * Complaints REPORTED BY DRIVERS during a flood run. No named copy-source in
 * the app (per spec) — modeled visually on the panel's other cards, and on
 * `currentShiftIssues.ts`'s ShiftIssue shape (route/plan/reason fields) for
 * the record shape, since that's the cockpit's existing "driver-reported
 * problem on a run" data model.
 *
 * DATA LINKAGE (2026-09-01 cross-module audit): `driver` is now the tanker's
 * own driver in `live-monitoring.seed.json` — the rows previously paired an
 * LMV-QAxx plate with a name from the WORKFORCE roster, so LM and this tab
 * disagreed on who was driving. `zone` uses the 5-value municipality
 * vocabulary shared with the incidents and plan-monitoring seeds. The 3 Open
 * access-blocked complaints (CMP-101/104/105) are the 3 road closures the
 * Critical Response SLA card's delay reasons count.
 */
export type ComplaintSeverity = 'Critical' | 'High' | 'Medium'
export type ComplaintStatus = 'Open' | 'Acknowledged' | 'Resolved'

export interface ComplaintRow {
  id: string
  driver: string
  tanker: string
  text: string
  zone: string
  time: string
  severity: ComplaintSeverity
  status: ComplaintStatus
  position: [number, number]
}

export const complaints: ComplaintRow[] = [
  { id: 'CMP-101', driver: 'Mohammed Al-Kuwari', tanker: 'LMV-QA01', text: 'Access road blocked by fallen signage near tunnel entrance — cannot reach discharge point.', zone: 'Al Wakrah', time: '07:12', severity: 'Critical', status: 'Open', position: [25.2634, 51.6512] },
  { id: 'CMP-102', driver: 'Abdullah Al-Marri', tanker: 'LMV-QA02', text: 'Pump equipment fault — suction hose coupling leaking under pressure.', zone: 'Doha', time: '08:05', severity: 'High', status: 'Acknowledged', position: [25.339, 51.523] },
  { id: 'CMP-103', driver: 'Ashraf Hossain', tanker: 'LMV-QA07', text: 'Road hazard: standing water has undermined the shoulder, tanker cannot safely park at the collection point.', zone: 'Al Rayyan', time: '09:40', severity: 'High', status: 'Open', position: [25.205, 51.415] },
  { id: 'CMP-104', driver: 'Suresh Kumar', tanker: 'LMV-QA09', text: 'Unsafe site — exposed live cable near the underpass collection point, requesting civil defense escort.', zone: 'Umm Salal', time: '10:18', severity: 'Critical', status: 'Acknowledged', position: [25.363, 51.611] },
  { id: 'CMP-105', driver: 'Ravi Sharma', tanker: 'LMV-QA10', text: 'Discharge point gate locked, no site contact reachable — run delayed.', zone: 'Al Daayen', time: '11:02', severity: 'Medium', status: 'Open', position: [25.498, 51.52] },
  { id: 'CMP-106', driver: 'Imran Khan', tanker: 'LMV-QA05', text: 'Tanker warning light for low hydraulic pressure — requesting inspection before continuing route.', zone: 'Umm Salal', time: '12:26', severity: 'Medium', status: 'Resolved', position: [25.6619, 51.4739] },
]

/* ── Inspectors ───────────────────────────────────────────────────────────
 * PROVENANCE (2026-09-01, parity fix): the roster below is a direct mirror
 * of Live Monitoring's own workforce seed (`tenants/uccp/seeds/
 * live-monitoring.seed.json`, the 15 `kind: "workforce"` rows WF-QA01..15) —
 * same employeeId/name/designation/status/position values, so this tab and
 * Live Monitoring agree on every field for the same person. Row/marker
 * anatomy also now matches LM exactly: the list cell uses the SAME vendored
 * worker-art glyph (`AssetGlyph name="workforce"`, `assets/vectors/
 * workforce/Default Workforce.svg`) LM's map marker uses, with a status dot
 * (see `gisTabCards.tsx`'s `InspectorRowCell`) — replacing the prior
 * generic `lucide-react` `User` icon. `status` now uses LM's own 3-value
 * vocabulary (`In Transit` / `Clocked In` / `Not Clocked In`) instead of a
 * locally-invented `On Duty`/`On Break`/`Off Duty` set, so the two modules'
 * status words match too.
 */
export type DutyStatus = 'In Transit' | 'Clocked In' | 'Not Clocked In'

export interface InspectorRow {
  id: string
  /** Mirrors LM's `employeeId` (EMP-QA-1xx) — the list's ID column. */
  employeeId: string
  name: string
  /** Mirrors LM's `designation` (e.g. "Field Inspector") — the list's Type column. */
  designation: string
  zone: string
  status: DutyStatus
  position: [number, number]
}

// Verbatim snapshot of live-monitoring.seed.json's WF-QA01..15 rows
// (employeeId/name/designation/status/position — see PROVENANCE above).
export const inspectors: InspectorRow[] = [
  { id: 'WF-QA01', employeeId: 'EMP-QA-101', name: 'Ahmed Khalil', designation: 'Tanker Driver', status: 'In Transit', zone: 'Msheireb Downtown, Doha, Qatar', position: [25.2867, 51.5222] },
  { id: 'WF-QA02', employeeId: 'EMP-QA-102', name: 'Sara Ibrahim', designation: 'Tanker Driver', status: 'Clocked In', zone: 'Al Rayyan Depot', position: [25.2919, 51.4241] },
  { id: 'WF-QA03', employeeId: 'EMP-QA-103', name: 'Layla Hassan', designation: 'Field Inspector', status: 'Not Clocked In', zone: 'Al Wakrah — South Zone', position: [25.1715, 51.6032] },
  { id: 'WF-QA04', employeeId: 'EMP-QA-104', name: 'Karim Aziz', designation: 'Drainage Crew Lead', status: 'Clocked In', zone: 'Souq Waqif, Doha, Qatar', position: [25.2872, 51.531] },
  { id: 'WF-QA05', employeeId: 'EMP-QA-105', name: 'Noura Salem', designation: 'Tanker Driver', status: 'In Transit', zone: 'Lusail Fuel Point', position: [25.4283, 51.4919] },
  { id: 'WF-QA06', employeeId: 'EMP-QA-106', name: 'Rashid Al-Kubaisi', designation: 'Senior Field Inspector', status: 'Not Clocked In', zone: 'Al Rayyan — West Zone', position: [25.2919, 51.4241] },
  { id: 'WF-QA07', employeeId: 'EMP-QA-107', name: 'Nasser Al-Hajri', designation: 'Field Inspector', status: 'Clocked In', zone: 'Umm Salal — North Zone', position: [25.4108, 51.4058] },
  { id: 'WF-QA08', employeeId: 'EMP-QA-108', name: 'Mariam Al-Kuwari', designation: 'Senior Field Inspector', status: 'Clocked In', zone: 'Doha Corniche Checkpoint', position: [25.29, 51.531] },
  { id: 'WF-QA09', employeeId: 'EMP-QA-109', name: 'Khalid Al-Mansoori', designation: 'Field Crew', status: 'Not Clocked In', zone: 'Education City, Doha, Qatar', position: [25.3125, 51.4386] },
  { id: 'WF-QA10', employeeId: 'EMP-QA-110', name: 'Fatima Rahman', designation: 'Field Inspector', status: 'In Transit', zone: 'Al Khor — North Zone', position: [25.6802, 51.4967] },
  { id: 'WF-QA11', employeeId: 'EMP-QA-111', name: 'Youssef Nasser', designation: 'Drainage Crew Lead', status: 'Clocked In', zone: 'Al Wakrah Fuel Station', position: [25.1715, 51.6032] },
  { id: 'WF-QA12', employeeId: 'EMP-QA-112', name: 'Omar Saeed', designation: 'Field Crew', status: 'Clocked In', zone: 'The Pearl, Doha, Qatar', position: [25.371, 51.551] },
  { id: 'WF-QA13', employeeId: 'EMP-QA-113', name: 'Ibrahim Al-Sulaiti', designation: 'Tanker Driver', status: 'In Transit', zone: 'West Bay Depot', position: [25.325, 51.533] },
  { id: 'WF-QA14', employeeId: 'EMP-QA-114', name: 'Aisha Al-Naimi', designation: 'Senior Field Inspector', status: 'Not Clocked In', zone: 'Doha Corniche — Central Zone', position: [25.29, 51.531] },
  { id: 'WF-QA15', employeeId: 'EMP-QA-115', name: 'Hassan Al-Emadi', designation: 'Field Crew', status: 'Clocked In', zone: 'Lusail Marina, Qatar', position: [25.4207, 51.49] },
]

/* ── Vehicles ─────────────────────────────────────────────────────────────
 * PROVENANCE (2026-09-01, parity fix): direct mirror of Live Monitoring's
 * own vehicle seed (`tenants/uccp/seeds/live-monitoring.seed.json`, the 18
 * `LMV-QA01..18` rows) — same plate/make+model/status/driver/fillLevel/
 * activity (critical events, trips today, current speed)/position values,
 * so this tab and Live Monitoring agree on every field for the same
 * tanker. `activity` keeps the cockpit's existing lowercase state union
 * (used by `TruckMarker`'s `AssetMarkerState`); `status` carries LM's own
 * capitalised word (Moving/Idling/Stopped/Non-Reporting) for the row's
 * status pill/aria text so it reads exactly as LM does.
 */
export type VehicleActivity = 'moving' | 'idle' | 'stopped' | 'non-reporting'

export interface VehicleRowData {
  plate: string
  model: string
  fillPct: number
  activity: VehicleActivity
  /** LM's own status word (Moving / Idling / Stopped / Non-Reporting). */
  status: string
  driver: string
  /** LM `activity[0].count` — Activity Overview's "Critical events" glyph. */
  criticalEvents: number | string
  /** LM `activity[1].count` — Activity Overview's "Trips today" glyph. */
  trips: number
  /** LM `activity[2].count` — Activity Overview's "Current speed" glyph. */
  speedLabel: string
  position: [number, number]
}

const STATUS_TO_ACTIVITY: Record<string, VehicleActivity> = {
  Moving: 'moving',
  Idling: 'idle',
  Stopped: 'stopped',
  'Non-Reporting': 'non-reporting',
}

// Verbatim snapshot of live-monitoring.seed.json's LMV-QA01..18 rows
// (plate/make+model/status/driver/fillLevel/activity/position — see
// PROVENANCE above).
const LM_VEHICLE_SNAPSHOT: Omit<VehicleRowData, 'activity'>[] = [
  { plate: 'LMV-QA01', model: 'Mercedes-Benz Actros 3340', fillPct: 8, status: 'Stopped', driver: 'Mohammed Al-Kuwari', criticalEvents: 1, trips: 4, speedLabel: '0 km/h', position: [25.2828, 51.604] },
  { plate: 'LMV-QA02', model: 'MAN TGS 33.400', fillPct: 34, status: 'Moving', driver: 'Abdullah Al-Marri', criticalEvents: 4, trips: 1, speedLabel: '74 km/h', position: [25.1782, 51.6051] },
  { plate: 'LMV-QA03', model: 'Volvo FMX 460', fillPct: 92, status: 'Idling', driver: 'Fahad Al-Sulaiti', criticalEvents: 2, trips: 6, speedLabel: '0 km/h', position: [25.3021, 51.4123] },
  { plate: 'LMV-QA04', model: 'Scania P410', fillPct: 15, status: 'Stopped', driver: 'Rashid Al-Naimi', criticalEvents: '–', trips: 3, speedLabel: '0 km/h', position: [25.4278, 51.4858] },
  { plate: 'LMV-QA05', model: 'Isuzu FVZ 260', fillPct: 57, status: 'Idling', driver: 'Imran Khan', criticalEvents: 3, trips: 8, speedLabel: '0 km/h', position: [25.416, 51.401] },
  { plate: 'LMV-QA06', model: 'Mercedes-Benz Actros 3340', fillPct: 88, status: 'Moving', driver: 'Muhammad Iqbal', criticalEvents: 1, trips: 5, speedLabel: '74 km/h', position: [25.6838, 51.4993] },
  { plate: 'LMV-QA07', model: 'MAN TGS 33.400', fillPct: 5, status: 'Moving', driver: 'Ashraf Hossain', criticalEvents: 4, trips: 2, speedLabel: '79 km/h', position: [25.2124, 51.4528] },
  { plate: 'LMV-QA08', model: 'Volvo FMX 460', fillPct: 46, status: 'Moving', driver: 'Rafiqul Islam', criticalEvents: 2, trips: 7, speedLabel: '74 km/h', position: [25.2796, 51.5409] },
  { plate: 'LMV-QA09', model: 'Scania P410', fillPct: 71, status: 'Moving', driver: 'Suresh Kumar', criticalEvents: '–', trips: 4, speedLabel: '52 km/h', position: [25.3138, 51.5222] },
  { plate: 'LMV-QA10', model: 'Isuzu FVZ 260', fillPct: 97, status: 'Moving', driver: 'Ravi Sharma', criticalEvents: 3, trips: 1, speedLabel: '41 km/h', position: [25.0319, 51.5391] },
  { plate: 'LMV-QA11', model: 'Mercedes-Benz Actros 3340', fillPct: 12, status: 'Moving', driver: 'Anil Nair', criticalEvents: 1, trips: 6, speedLabel: '47 km/h', position: [26.1196, 51.2131] },
  { plate: 'LMV-QA12', model: 'MAN TGS 33.400', fillPct: 63, status: 'Moving', driver: 'Nimal Perera', criticalEvents: 4, trips: 3, speedLabel: '28 km/h', position: [25.3256, 51.4455] },
  { plate: 'LMV-QA13', model: 'Volvo FMX 460', fillPct: 84, status: 'Stopped', driver: 'Sunil Fernando', criticalEvents: 2, trips: 8, speedLabel: '0 km/h', position: [25.2826, 51.5166] },
  { plate: 'LMV-QA14', model: 'Scania P410', fillPct: 27, status: 'Moving', driver: 'Yousuf Al-Hajri', criticalEvents: '–', trips: 5, speedLabel: '79 km/h', position: [25.2828, 51.5028] },
  { plate: 'LMV-QA15', model: 'Isuzu FVZ 260', fillPct: 100, status: 'Moving', driver: 'Khalid Al-Emadi', criticalEvents: 3, trips: 2, speedLabel: '58 km/h', position: [25.291, 51.5516] },
  { plate: 'LMV-QA16', model: 'Mercedes-Benz Actros 3340', fillPct: 18, status: 'Non-Reporting', driver: 'Bilal Ahmed', criticalEvents: '–', trips: 7, speedLabel: '0 km/h', position: [25.2784, 51.6097] },
  { plate: 'LMV-QA17', model: 'MAN TGS 33.400', fillPct: 52, status: 'Moving', driver: 'Naeem Chowdhury', criticalEvents: 4, trips: 4, speedLabel: '58 km/h', position: [25.1783, 51.5972] },
  { plate: 'LMV-QA18', model: 'Volvo FMX 460', fillPct: 80, status: 'Stopped', driver: 'Ganesh Reddy', criticalEvents: 2, trips: 1, speedLabel: '0 km/h', position: [25.2872, 51.4323] },
]

export const vehicles: VehicleRowData[] = LM_VEHICLE_SNAPSHOT.map((v) => ({
  ...v,
  activity: STATUS_TO_ACTIVITY[v.status] ?? 'non-reporting',
}))
