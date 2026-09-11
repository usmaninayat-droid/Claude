import * as React from 'react';
import * as Icons from '@ds/icons';
import { InteractivePlanning, PlanMonitoring, PlanMonitoringDetail, PlanOverview, FloodPlanWizard, FloodPlanList, FloodPlanHybrid, FloodPlanGrid, FloodPlanDetailSheet, FloodRosterSheet, recordFromDraft, FLOOD_STATUS_LABEL, findRosterConflicts, conflictMessage, shiftEnded, shiftUnderway, todayIso } from '@ds/components/planning';
import type { FloodPlanCatalog, FloodPlanDraft, FloodSiteOption, FloodPlanRecord, FloodPlanStatus, FloodRosterEntry, FloodVehicleUnit, FloodCrewMember, PlanRow, PlanZone, PlanBin, PlanMonitorRow, PlanMonitorKpi, PlanOverviewData, OverviewDay, DayStatus, StatusStyle, PlanMonitoringDetailData, PlanLogEvent, CollectionPoint } from '@ds/components/planning';
import { Toaster, toast } from '@ds/components/primitives';
/* Coastline guard + zone footprints + the stop-chain derivation — a PURE
 * module shared with scripts/build-routes.mjs (the OSRM route baker), so the
 * runtime and the pre-baked road geometry agree on where a run's stops are. */
import {
  M_DEG, ZONE_DEFS, PM_ROW_SEEDS, onLand, zoneBox, metresBetween,
  makeAt, makeRnd, deriveStops, gpsify, nearestOnPath, nearestBakedZone,
} from './data/stop-plan';
import type { Pt, BakedRoute, BakedRoutes } from './data/stop-plan';
/* Pre-baked, road-snapped driving geometry for every static run + every zone
 * (see scripts/build-routes.mjs). Committed so the demo needs no router at
 * runtime; a missing key falls back to the synthetic `buildTrack` below. */
import BAKED_ROUTES_JSON from './data/routes.json';

const BAKED_ROUTES = BAKED_ROUTES_JSON as unknown as BakedRoutes;

/**
 * Pristine verbatim port of Smart Planning + Plan Monitoring, taken as-is
 * from /Users/apple/Desktop/fms-main 2/src/ds/{interactive-planning-demo,
 * plan-monitoring-demo}.tsx — byte-for-byte unmodified component trees +
 * mock data (only re-homed into one hash-routed App so both screens share a
 * dev server, and each file's own `createRoot(...).render(...)` bootstrap is
 * replaced by this shared router/mount — the only plumbing change). Same
 * isolation route as tenants/uccp/overrides/screens/operations-center — see
 * vite.config.ts.
 *
 * `#/smart-planning` and `#/plan-monitoring` select the screen; `?embed=1`
 * is read by the host iframe wrapper (app/src/demo/planning-v2-module.tsx).
 *
 * ARCHITECTURE (superseding the 2026-08-31 in-iframe skin from e7bcf8e,
 * rejected — a skinned strip inside the iframe can never be byte-identical
 * to the shell's real module chrome, and its theme scoping didn't actually
 * apply the maroon active state): the view tabs now live OUTSIDE this app
 * entirely, in the UCCP shell's own `ModuleViewShell` (see
 * app/src/demo/planning-v2-module.tsx) — the same chrome component every
 * other module (Live Monitoring, Requests & Complaints) uses, maroon via
 * the qatar-mme tenant theme automatically. This app is embedded as the
 * view BODY only.
 *
 * In embed mode (`?embed=1`) this app renders NO title row and NO tab strip
 * of its own — content only. The shell drives which screen/view is shown via
 * a `view` query param (`hybrid` | `calendar`, read below by
 * `SmartPlanningScreen`) plus the existing `#/smart-planning` /
 * `#/plan-monitoring` hash for which screen. Content and behavior of both
 * screens stay byte-for-byte verbatim — only the header row is now omitted
 * in embed mode instead of re-skinned.
 */

function isEmbedMode(): boolean {
  return new URLSearchParams(window.location.search).get('embed') === '1';
}

/** Reads the shell-driven `view` query param (embed mode only). */
function embedViewParam(): string | null {
  return new URLSearchParams(window.location.search).get('view');
}

/* ---------------------------------------------------------------------- */
/* Smart Planning — UCCP flood-response data (Doha, Qatar)                 */
/* ---------------------------------------------------------------------- */

/*
 * 2026-08-31 UCCP data adaptation (FM-6353 — not fetchable in this session;
 * adapted from the user's use-case definition + the demo world). Reference's
 * Abu Dhabi bin-collection mock data ported to Flood & Rain Water Mgmt:
 *   RESOURCE = tanker (LMV-QA01..18, same fleet as Live Monitoring's seed) +
 *   driver, allocated to a ZONE/MUNICIPALITY for a SHIFT + JOB (flood job
 *   vocabulary, shared with the incidents world) over a longer (weekly/
 *   recurring) window. `wasteType`/`serviceType` fields keep their DS
 *   STRUCTURE (PlanRow/PlanMonitorRow anatomy is unchanged) — only their
 *   VALUES + column LABELS move to job-type vocabulary via the components'
 *   `labels`/`wasteStyles`/`serviceIcon` props.
 *
 * Per user clarification: there is no "bins" concept in flood response.
 * Planning allocates work over ZONES (Qatar municipality/area polygons), not
 * bin points — so the hybrid map's primary planning surface is zone
 * COVERAGE ("Covered Zones" / "Uncovered Zones"), not a planned/unplanned
 * bin-dot legend. `PlanZone.covered` drives zone fill + the same legend
 * toggle; the sparse point layer (`bins` prop — DS type name kept, see
 * `interactive-planning.tsx`) now represents real flood-response point
 * granularity — Critical Flood Points / Pump Deployment Sites — not one dot
 * per generic unit.
 */

const TANKERS = ['LMV-QA01', 'LMV-QA02', 'LMV-QA03', 'LMV-QA04', 'LMV-QA05', 'LMV-QA06', 'LMV-QA07', 'LMV-QA08', 'LMV-QA09', 'LMV-QA10', 'LMV-QA11', 'LMV-QA12', 'LMV-QA13', 'LMV-QA14', 'LMV-QA15', 'LMV-QA16', 'LMV-QA17', 'LMV-QA18'];
// Same driver seed as Live Monitoring (monitoringData.ts) — one workforce, not a second cast.
const DRIVERS = ['Mohammed Al-Kuwari', 'Abdullah Al-Marri', 'Fahad Al-Sulaiti', 'Rashid Al-Naimi', 'Imran Khan', 'Muhammad Iqbal', 'Ashraf Hossain', 'Rafiqul Islam', 'Suresh Kumar', 'Ravi Sharma', 'Anil Nair', 'Nimal Perera', 'Sunil Fernando', 'Yousuf Al-Hajri', 'Khalid Al-Emadi', 'Bilal Ahmed', 'Naeem Chowdhury', 'Ganesh Reddy'];
const JOB_TYPES = ['Drainage Clearing', 'Pump Deployment', 'Road Closure Support', 'Water Extraction', 'Inspection', 'Emergency Repair', 'Tunnel Pre-Position', 'Storm Drain Patrol'];
const JOB_STYLES: Record<string, { icon: React.ReactNode; color: string }> = {
  'Drainage Clearing': { icon: <Icons.Tool02 size={14} />, color: 'var(--status-warning)' },
  'Pump Deployment': { icon: <Icons.Droplets02 size={14} />, color: 'var(--status-info)' },
  'Road Closure Support': { icon: <Icons.Shield02 size={14} />, color: 'var(--muted-foreground)' },
  'Water Extraction': { icon: <Icons.Droplets03 size={14} />, color: 'var(--status-success)' },
  'Inspection': { icon: <Icons.SearchMd size={14} />, color: 'var(--chart-accent-purple)' },
  'Emergency Repair': { icon: <Icons.AlertTriangle size={14} />, color: 'var(--status-error)' },
  'Tunnel Pre-Position': { icon: <Icons.Tool01 size={14} />, color: 'var(--status-warning)' },
  'Storm Drain Patrol': { icon: <Icons.Eye size={14} />, color: 'var(--status-info)' },
};
const PLANNING_LABELS = { wasteType: 'Job Type' };
const SERVICE_ICON = <Icons.Droplets02 size={14} />;

/** Doha-area municipality/zone footprints (real approximate centers), each
 *  flagged `covered` (has an active plan/run this period) or not — the
 *  hybrid maps' primary "Covered Zones / Uncovered Zones" surface. Shared
 *  by Smart Planning's Hybrid View AND Plan Monitoring's Hybrid View (same
 *  zone set — cross-view interlink identity). */
/* ── Coastline guard (2026-09-04 feedback: "the track runs over the sea") ──
 * Every coordinate in this file is synthesized as an offset from a zone
 * center — zone footprints, depots, discharge stations, response sites, GPS
 * tracks. For a coastal zone (West Bay, Msheireb/Corniche, Al Wakrah
 * Corniche, Lusail) those offsets happily land in Doha Bay, so the trail,
 * the incident pins and the blue zone polygon all crossed open water.
 *
 * The Qatar east coast around Doha runs broadly N–S, so a *longitude* clamp
 * is enough: `shoreLng(lat)` interpolates the waterline longitude from the
 * reference latitudes below (N→S — Al Khor down past Al Wakrah), and
 * `onLand` pushes any point west of it by a ~1 km inland safety strip.
 * Latitude is never touched, so the geometry keeps its shape and only slides
 * inland where it would otherwise be wet.
 *
 * The clamp itself, the zone footprints and the stop-chain derivation now
 * live in ./data/stop-plan.ts — a PURE module shared with
 * scripts/build-routes.mjs, the one-off OSRM baker that pre-computes the
 * road-snapped geometry in ./data/routes.json. Imported at the top of this
 * file; nothing about their values changed in the move.
 */
const ZONES: PlanZone[] = ZONE_DEFS.map((z) => ({ id: z.id, name: z.name, points: zoneBox(z.center), covered: z.covered }));
const DOHA_CENTER: [number, number] = [25.32, 51.49];

/* Sparse, meaningful point markers — Critical Flood Points / Pump Deployment
 * Sites, 2–3 per zone (not one dot per generic unit), inheriting the zone's
 * coverage state so the point layer agrees with the zone layer it sits in. */
const BINS: PlanBin[] = ZONE_DEFS.flatMap((z, zi) =>
  Array.from({ length: 2 + (zi % 2) }, (_, i) => ({
    id: `site-${z.id}-${i}`,
    position: onLand([z.center[0] + ((i - 1) * 0.007), z.center[1] + ((i % 2 === 0 ? 1 : -1) * 0.009)]),
    planned: z.covered,
  })),
);

const PLANS: PlanRow[] = TANKERS.map((plate, i) => ({
  id: `plan-${i}`,
  serviceType: 'Flood Response',
  wasteType: JOB_TYPES[i % JOB_TYPES.length],
  vehicle: plate,
  status: i < 12 ? 'DRAFTED' : 'APPROVED',
  visible: i < 4,
}));

/* ---------------------------------------------------------------------- */
/* FM-6364 — MM Flood "Create New Plan" catalogue (Zones-catalogue records) */
/* ---------------------------------------------------------------------- */

const ZONE_META: Record<string, { code: string; municipality: string; tags: string[]; color: string }> = {
  z1: { code: 'Z-1201', municipality: 'Al Wakrah', tags: ['Coastal', 'Underpass', 'Low-lying'], color: 'var(--status-error)' },
  z2: { code: 'Z-1202', municipality: 'Al Daayen', tags: ['Marina', 'Low-lying'], color: 'var(--status-warning)' },
  z3: { code: 'Z-1203', municipality: 'Al Rayyan', tags: ['Underpass', 'Tunnel', 'Arterial road'], color: 'var(--status-error)' },
  z4: { code: 'Z-1204', municipality: 'Umm Salal', tags: ['Residential', 'Storm drain'], color: 'var(--status-success)' },
  z5: { code: 'Z-1205', municipality: 'Doha', tags: ['Commercial', 'Underpass'], color: 'var(--status-warning)' },
  z6: { code: 'Z-1206', municipality: 'Doha', tags: ['Industrial', 'Low-lying', 'Storm drain'], color: 'var(--status-error)' },
  z7: { code: 'Z-1207', municipality: 'Doha', tags: ['Heritage', 'Tunnel'], color: 'var(--status-success)' },
  z8: { code: 'Z-1208', municipality: 'Doha', tags: ['Coastal', 'Towers', 'Tunnel'], color: 'var(--status-warning)' },
  z9: { code: 'Z-1209', municipality: 'Al Khor', tags: ['Coastal', 'Wadi'], color: 'var(--status-success)' },
};
const FLOOD_EXISTING_PLANS: FloodPlanCatalog['existingPlans'] = [
  { id: 'FRP-2001', name: 'Al Wakra Tunnel 3 Pre-position', zoneIds: ['z1'], status: 'APPROVED' },
  { id: 'FRP-2002', name: 'Hamad Hospital Access Route Response', zoneIds: ['z5', 'z7'], status: 'APPROVED' },
  { id: 'FRP-2003', name: 'Al Rayyan Underpass 2 Response', zoneIds: ['z3'], status: 'APPROVED' },
  { id: 'FRP-2004', name: 'Doha Corniche Underpass Pre-position', zoneIds: ['z8'], status: 'DRAFTED' },
  { id: 'FRP-2005', name: 'Lusail Marina Rain Response', zoneIds: ['z2'], status: 'DRAFTED' },
];
const FLOOD_SITES: FloodSiteOption[] = ZONE_DEFS.flatMap((z): FloodSiteOption[] => {
  const [lat, lng] = z.center;
  return [
    { id: `${z.id}-depot`, kind: 'depot', name: `${z.name} Depot`, zoneId: z.id, position: onLand([lat + 0.014, lng - 0.016]) },
    { id: `${z.id}-assembly`, kind: 'assembly', name: `${z.name} Assembly Point`, zoneId: z.id, position: onLand([lat - 0.004, lng + 0.006]) },
    { id: `${z.id}-discharge`, kind: 'discharge', name: `${z.name} Discharge Station`, zoneId: z.id, position: onLand([lat - 0.015, lng + 0.017]) },
  ];
});
// Same weather-station seed as the UCCP Weather Stations module (rain-sensors.seed.json).
const FLOOD_WEATHER_STATIONS: FloodPlanCatalog['weatherStations'] = [
  { id: 'RSN-01', name: 'Qatar University', position: [25.382, 51.479], rainMm: [0.4, 6.2, 12.5, 2.1, 0, 0, 1.3] },
  { id: 'RSN-02', name: 'Hamad International Airport', position: [25.2731, 51.6086], rainMm: [1.1, 9.8, 18.4, 4.6, 0.2, 0, 0] },
  { id: 'RSN-06', name: 'Al Wakrah', position: [25.1659, 51.6039], rainMm: [2.3, 11.6, 22.0, 6.8, 0.6, 0, 0] },
  { id: 'RSN-07', name: 'Lusail', position: [25.4283, 51.4909], rainMm: [0, 4.1, 9.7, 1.9, 0, 0, 0.8] },
  { id: 'RSN-09', name: 'Al Rayyan', position: [25.292, 51.44], rainMm: [0.8, 7.4, 15.2, 3.3, 0.1, 0, 0] },
  { id: 'RSN-10', name: 'Doha Corniche', position: [25.31, 51.53], rainMm: [0.9, 8.1, 16.6, 3.9, 0.3, 0, 0.2] },
  { id: 'RSN-03', name: 'Al Khor', position: [25.6804, 51.4964], rainMm: [0, 1.2, 3.4, 0.4, 0, 0, 0] },
];
const FLOOD_CATALOG: FloodPlanCatalog = {
  service: 'MM Flood Response',
  center: DOHA_CENTER,
  zoom: 10,
  zones: ZONE_DEFS.map((z) => ({
    id: z.id, name: z.name, points: zoneBox(z.center), ...ZONE_META[z.id],
    coveredBy: FLOOD_EXISTING_PLANS.find((p) => p.zoneIds.includes(z.id))?.name,
  })),
  sites: FLOOD_SITES,
  vehicleTypes: [
    { id: 'vt-suction-25', name: 'Suction Tanker 25 CBM', capacity: '25 CBM', category: 'Suction tanker', available: 8 },
    { id: 'vt-suction-15', name: 'Suction Tanker 15 CBM', capacity: '15 CBM', category: 'Suction tanker', available: 5 },
    { id: 'vt-vacuum-30', name: 'Vacuum Tanker 30 CBM', capacity: '30 CBM', category: 'Vacuum tanker', available: 3 },
    { id: 'vt-pump', name: 'Mobile Pump Truck', capacity: '400 m³/h', category: 'Pump unit', available: 4 },
    { id: 'vt-jetting', name: 'High-pressure Jetting Unit', capacity: '8 CBM', category: 'Jetting unit', available: 2 },
    { id: 'vt-pickup', name: 'Rapid Response Pickup', capacity: '1 CBM', category: 'Light vehicle', available: 0 },
  ],
  workforceTypes: [
    { id: 'wf-tanker-crew', name: 'Tanker Crew', certification: 'HGV licence · confined space', crewSize: 'Driver + 2 helpers', available: 9 },
    { id: 'wf-pump-operator', name: 'Pump Operator', certification: 'Pump operations L2', crewSize: 'Operator + 1 helper', available: 6 },
    { id: 'wf-drainage', name: 'Drainage Technician', certification: 'Jetting & CCTV', crewSize: 'Technician + 1 helper', available: 3 },
    { id: 'wf-traffic', name: 'Traffic Marshal', certification: 'Road closure certified', crewSize: '2 marshals', available: 4 },
    { id: 'wf-electrical', name: 'Electrical Standby', certification: 'HV authorised person', crewSize: '1 electrician', available: 0 },
  ],
  inspectors: [
    { id: 'insp-1', name: 'Layla Hassan', badge: 'MME-INS-0412', phone: '+974 5512 3344', available: true },
    { id: 'insp-2', name: 'Rashid Al-Kubaisi', badge: 'MME-INS-0387', phone: '+974 5598 7710', available: true },
    { id: 'insp-3', name: 'Nasser Al-Hajri', badge: 'MME-INS-0455', phone: '+974 5533 2091', available: true },
    { id: 'insp-4', name: 'Mariam Al-Kuwari', badge: 'MME-INS-0398', phone: '+974 5576 6402', available: false },
  ],
  weatherStations: FLOOD_WEATHER_STATIONS,
  existingPlans: FLOOD_EXISTING_PLANS,
};
/** A saved flood plan lands in the hybrid/list tables as a DRAFTED row — its
 *  job type follows the vehicle type (rostering fills tanker/driver later). */
const JOB_BY_VEHICLE_TYPE: Record<string, string> = {
  'vt-suction-25': 'Water Extraction', 'vt-suction-15': 'Water Extraction', 'vt-vacuum-30': 'Water Extraction',
  'vt-pump': 'Pump Deployment', 'vt-jetting': 'Drainage Clearing', 'vt-pickup': 'Storm Drain Patrol',
};
function floodDraftToPlanRow(d: FloodPlanDraft, n: number): PlanRow & { name: string; zoneNames: string[] } {
  return {
    id: `flood-plan-${n}`,
    serviceType: 'Flood Response',
    wasteType: JOB_BY_VEHICLE_TYPE[d.vehicleTypeId ?? ''] ?? 'Pump Deployment',
    vehicle: FLOOD_CATALOG.vehicleTypes.find((v) => v.id === d.vehicleTypeId)?.name ?? 'Unassigned',
    status: 'DRAFTED',
    visible: true,
    name: d.name,
    zoneNames: d.zoneIds.map((z) => ZONE_DEFS.find((x) => x.id === z)?.name ?? z),
  };
}

/* FM-6365 — seeded flood plan RECORDS (the list / detail sheet's source of
 * truth). Statuses cover every lifecycle state incl. one Superseded v1 that
 * must never be listed or counted, and a Rejected plan that must be. */
const PLANNER = 'Kashish Bindrani';
const REVIEWER = 'Layla Hassan';
const T0 = new Date('2026-08-24T08:00:00+03:00').getTime();
const at = (h: number) => new Date(T0 + h * 3600_000).toISOString();
/** ISO date n days from today — roster seeds stay inside the grid's window. */
const DAY = (n: number) => {
  const t = new Date();
  const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
function seedRecord(i: number, spec: { id: string; name: string; zoneIds: string[]; status: FloodPlanStatus; version?: number; supersedes?: string; vt: string; wt: string; insp?: string; roster?: FloodRosterEntry[]; description: string }): FloodPlanRecord {
  const z0 = spec.zoneIds[0];
  const zLast = spec.zoneIds[spec.zoneIds.length - 1];
  const created = at(i * 7);
  const history: FloodPlanRecord['history'] = [{ id: `${spec.id}-h1`, at: created, by: PLANNER, action: spec.version && spec.version > 1 ? `Created v${spec.version} from ${spec.supersedes}` : 'Created plan', detail: 'Saved as Draft', status: 'DRAFT', version: spec.version ?? 1 }];
  let cursor = i * 7 + 3;
  if (spec.status !== 'DRAFT') history.push({ id: `${spec.id}-h2`, at: at(cursor), by: PLANNER, action: 'Submitted for review', status: 'IN_REVIEW', version: spec.version ?? 1 });
  if (spec.status === 'APPROVED' || spec.status === 'SUPERSEDED') history.push({ id: `${spec.id}-h3`, at: at(cursor += 5), by: REVIEWER, action: 'Approved', detail: 'Resources and zones confirmed', status: 'APPROVED', version: spec.version ?? 1 });
  if (spec.status === 'REJECTED') history.push({ id: `${spec.id}-h3`, at: at(cursor += 5), by: REVIEWER, action: 'Rejected', detail: 'Discharge point is outside the plan zones — pick one inside Al Rayyan', status: 'REJECTED', version: spec.version ?? 1 });
  if (spec.status === 'SUPERSEDED') history.push({ id: `${spec.id}-h4`, at: at(cursor += 30), by: PLANNER, action: 'Superseded by v2', detail: 'Edited after approval — a new Draft version was created', status: 'SUPERSEDED', version: spec.version ?? 1 });
  for (const r of spec.roster ?? []) history.push({ id: `${spec.id}-h-${r.id}`, at: at(cursor += 2), by: 'Rashid Al-Kubaisi', action: `Rostered ${r.date} · ${r.shift}`, detail: `${r.vehicles.join(', ')} · ${r.crew.join(', ')}` });
  const last = history[history.length - 1];
  return {
    id: spec.id, name: spec.name, description: spec.description, service: 'MM Flood Response',
    zoneIds: spec.zoneIds, depotId: `${z0}-depot`, assemblyId: `${zLast}-assembly`, dischargeId: `${z0}-discharge`,
    vehicleTypeId: spec.vt, workforceTypeId: spec.wt, inspectorId: spec.insp, forecastDate: '2026-09-03',
    status: spec.status, version: spec.version ?? 1, supersedes: spec.supersedes, roster: spec.roster ?? [], history,
    createdAt: created, createdBy: PLANNER, updatedAt: last.at, updatedBy: last.by,
  };
}
const FLOOD_RECORDS: FloodPlanRecord[] = [
  seedRecord(0, { id: 'FRP-2001', name: 'Al Wakra Tunnel 3 Pre-position', zoneIds: ['z1'], status: 'APPROVED', vt: 'vt-suction-25', wt: 'wf-tanker-crew', insp: 'insp-1', description: 'Pre-position two suction tankers at the tunnel portals before forecast rain; hold at the corniche assembly point.', roster: [
    { id: 'FRP-2001-r1', date: DAY(0), shift: 'Morning', vehicles: ['LMV-QA01', 'LMV-QA02'], crew: ['Mohammed Al-Kuwari', 'Abdullah Al-Marri'], inspector: 'Layla Hassan', assignedBy: 'Rashid Al-Kubaisi', planVersion: 1, scheduleId: 'SCH-9001' },
    { id: 'FRP-2001-r2', date: DAY(1), shift: 'Night', vehicles: ['LMV-QA03'], crew: ['Fahad Al-Sulaiti'], inspector: 'Layla Hassan', assignedBy: 'Rashid Al-Kubaisi', planVersion: 1, scheduleId: 'SCH-9002' },
  ] }),
  seedRecord(1, { id: 'FRP-2002', name: 'Hamad Hospital Access Route Response', zoneIds: ['z5', 'z7'], status: 'APPROVED', vt: 'vt-pump', wt: 'wf-pump-operator', insp: 'insp-2', description: 'Keep the hospital access route open — mobile pumps at the two underpasses, traffic support on standby.', roster: [
    { id: 'FRP-2002-r1', date: DAY(0), shift: 'Afternoon', vehicles: ['LMV-QA17'], crew: ['Imran Khan', 'Muhammad Iqbal'], inspector: 'Rashid Al-Kubaisi', assignedBy: 'Kashish Bindrani', planVersion: 1, scheduleId: 'SCH-9003' },
  ] }),
  // Deliberately double-books LMV-QA02 and Abdullah Al-Marri against
  // FRP-2001-r1 (same date, overlapping shift window) so the grid's conflict
  // chips, KPI card and blocked-save path all have real data to show.
  seedRecord(9, { id: 'FRP-2009', name: 'Industrial Area Outfall Standby', zoneIds: ['z6'], status: 'APPROVED', vt: 'vt-suction-25', wt: 'wf-tanker-crew', description: 'Suction tanker standby at the industrial outfall during morning peak rain.', roster: [
    { id: 'FRP-2009-r1', date: DAY(0), shift: 'Morning', vehicles: ['LMV-QA02'], crew: ['Abdullah Al-Marri', 'Suresh Kumar'], assignedBy: 'Layla Hassan', planVersion: 1, scheduleId: 'SCH-9004' },
  ] }),
  seedRecord(2, { id: 'FRP-2003', name: 'Al Rayyan Underpass 2 Response', zoneIds: ['z3'], status: 'REJECTED', vt: 'vt-vacuum-30', wt: 'wf-tanker-crew', description: 'Vacuum tanker response for the underpass sump; discharge to the Al Rayyan station.' }),
  seedRecord(3, { id: 'FRP-2004', name: 'Doha Corniche Underpass Pre-position', zoneIds: ['z8'], status: 'IN_REVIEW', vt: 'vt-suction-15', wt: 'wf-tanker-crew', insp: 'insp-3', description: 'West Bay tunnel and corniche underpass pre-position for the coming low-pressure system.' }),
  seedRecord(4, { id: 'FRP-2005', name: 'Lusail Marina Rain Response', zoneIds: ['z2'], status: 'DRAFT', vt: 'vt-jetting', wt: 'wf-drainage', description: 'Jetting unit on standby for the marina storm drains; assembly at the Lusail depot yard.' }),
  seedRecord(5, { id: 'FRP-2006', name: 'Industrial Area Low-lying Sweep', zoneIds: ['z6', 'z1'], status: 'SUPERSEDED', vt: 'vt-suction-25', wt: 'wf-tanker-crew', description: 'v1 — superseded after the approved plan was edited.' }),
  seedRecord(6, { id: 'FRP-2006-v2', name: 'Industrial Area Low-lying Sweep', zoneIds: ['z6', 'z1'], status: 'DRAFT', version: 2, supersedes: 'FRP-2006', vt: 'vt-suction-25', wt: 'wf-tanker-crew', insp: 'insp-1', description: 'Extended to include the corniche outfall; two extra tankers requested.' }),
  seedRecord(7, { id: 'FRP-2007', name: 'Umm Salal Storm Drain Patrol', zoneIds: ['z4'], status: 'APPROVED', vt: 'vt-pickup', wt: 'wf-drainage', description: 'Light-vehicle patrol of the residential storm drains after each rain event.' }),
  seedRecord(8, { id: 'FRP-2008', name: 'Al Khor Wadi Crossing Watch', zoneIds: ['z9'], status: 'IN_REVIEW', vt: 'vt-pump', wt: 'wf-pump-operator', description: 'Pump deployment at the wadi crossing; traffic marshals close the road above 20 mm/h.' }),
];
/* FM-6368 — the NAMED resource pools resolved at rostering time. Every unit
 * carries its type (the roster sheet filters to the plan's type) and an
 * active flag (inactive units/employees are never selectable). */
const FLOOD_VEHICLE_UNITS: FloodVehicleUnit[] = [
  ...TANKERS.slice(0, 8).map((id, i) => ({ id, typeId: 'vt-suction-25', active: i !== 7 })),        // LMV-QA08 in workshop
  ...TANKERS.slice(8, 13).map((id) => ({ id, typeId: 'vt-suction-15', active: true })),
  ...TANKERS.slice(13, 16).map((id) => ({ id, typeId: 'vt-vacuum-30', active: true })),
  ...TANKERS.slice(16, 18).map((id) => ({ id, typeId: 'vt-pump', active: true })),
  { id: 'PMP-QA03', typeId: 'vt-pump', active: true },
  { id: 'PMP-QA04', typeId: 'vt-pump', active: true },
  { id: 'JET-QA01', typeId: 'vt-jetting', active: true },
  { id: 'JET-QA02', typeId: 'vt-jetting', active: true },
  { id: 'PKP-QA01', typeId: 'vt-pickup', active: false }, // the pickup fleet is grounded (available: 0)
];
const CREW_SPEC: Record<number, { t: string; d?: boolean; off?: boolean }> = {
  0: { t: 'wf-tanker-crew', d: true }, 1: { t: 'wf-tanker-crew', d: true }, 2: { t: 'wf-tanker-crew', d: true }, 3: { t: 'wf-tanker-crew', d: true },
  4: { t: 'wf-pump-operator', d: true }, 5: { t: 'wf-pump-operator' }, 6: { t: 'wf-pump-operator' }, 7: { t: 'wf-pump-operator' },
  8: { t: 'wf-tanker-crew', d: true }, 9: { t: 'wf-tanker-crew', d: true }, 10: { t: 'wf-tanker-crew' }, 11: { t: 'wf-tanker-crew', off: true }, 12: { t: 'wf-tanker-crew' },
  13: { t: 'wf-drainage', d: true }, 14: { t: 'wf-drainage' }, 15: { t: 'wf-traffic' }, 16: { t: 'wf-traffic' }, 17: { t: 'wf-drainage' },
};
const FLOOD_CREW_MEMBERS: FloodCrewMember[] = DRIVERS.map((name, i) => ({
  id: name, typeId: CREW_SPEC[i]?.t ?? 'wf-tanker-crew', driver: CREW_SPEC[i]?.d, active: !CREW_SPEC[i]?.off,
}));
/** Hybrid-view row derived from a record — `PlanRow` anatomy is unchanged. */
function recordToPlanRow(r: FloodPlanRecord, visible: boolean): PlanRow {
  return {
    id: r.id, serviceType: 'Flood Response',
    wasteType: JOB_BY_VEHICLE_TYPE[r.vehicleTypeId ?? ''] ?? 'Pump Deployment',
    vehicle: FLOOD_CATALOG.vehicleTypes.find((v) => v.id === r.vehicleTypeId)?.name ?? 'Unassigned',
    status: FLOOD_STATUS_LABEL[r.status].toUpperCase(), visible,
  };
}
const FLOOD_ROW_STATUS_STYLES: Record<string, StatusStyle> = {
  DRAFT: { tone: 'var(--muted-foreground)' },
  'IN REVIEW': { tone: 'var(--status-info)' },
  APPROVED: { tone: 'var(--status-success)', filled: true },
  REJECTED: { tone: 'var(--status-error)', filled: true },
};

/* The former mock Calendar View (static CAL_PLANS × fixed week) is replaced by
 * the real FM-6369 Grid view (`FloodPlanGrid`), fed from the live records. */

/*
 * 2026-08-31 scope addition — Smart Planning gains a third tab, "List View",
 * built by reusing Plan Monitoring's OWN `PlanMonitoring` table component
 * (same table anatomy/columns/row-click pattern as PM's List View — see
 * that component's own doc: "DYNAMIC / config-driven ... any scheduled-
 * service monitor adapts by config"), fed PLAN data instead of RUN data.
 * `PLANS` (draft/approved, not-yet-scheduled) has no driver/shift/locations/
 * progress yet, so those columns render honest placeholders ("Unassigned" /
 * "TBD" / 0-of-0 progress) rather than fabricated activity — a plan really
 * has zero progress before Interactive Planning schedules it.
 */
const SP_STATUS_STYLES: Record<string, StatusStyle> = {
  DRAFTED: { tone: 'var(--muted-foreground)' },
  APPROVED: { tone: 'var(--status-success)', filled: true },
};
// Plan-lifecycle KPIs (Draft/Approved), not PM's run-lifecycle ones
// (Completed/Ongoing/Scheduled don't apply to not-yet-scheduled plans).
const spListKpis = (plans: PlanRow[]): PlanMonitorKpi[] => [
  { label: 'Total Number of Plans', value: plans.length, icon: <Icons.LayoutAlt01 size={20} />, tone: 'var(--chart-accent-purple)' },
  { label: 'Draft Plans', value: plans.filter((p) => p.status === 'DRAFTED').length, icon: <Icons.Edit01 size={20} />, tone: 'var(--muted-foreground)' },
  { label: 'Approved Plans', value: plans.filter((p) => p.status === 'APPROVED').length, icon: <Icons.CheckCircle size={20} />, tone: 'var(--status-success)' },
];
const spListRows = (plans: (PlanRow & { name?: string; zoneNames?: string[] })[]): PlanMonitorRow[] => plans.map((p, i) => ({
  id: p.id,
  serviceType: p.serviceType,
  wasteType: p.wasteType,
  title: p.name ?? `Plan · ${p.vehicle}`,
  vehicle: p.vehicle,
  driver: 'Unassigned',
  shift: 'TBD',
  locations: p.zoneNames ?? [ZONE_DEFS[i % ZONE_DEFS.length]?.name ?? 'Unzoned'],
  startAt: 'TBD',
  endAt: 'TBD',
  status: p.status,
  progressDone: 0,
  progressTotal: 0,
}));

/** Deterministic-but-varied placeholder trend/day data — same generation
 *  shape as `PM_OVERVIEW` below, keyed off the clicked plan so each plan's
 *  detail overview looks distinct rather than identical boilerplate. */
function synthesizePlanOverview(plan: PlanMonitorRow): PlanOverviewData {
  let seed = 0;
  for (let i = 0; i < plan.id.length; i++) seed = (seed * 31 + plan.id.charCodeAt(i)) | 0;
  const rnd = (n: number) => Math.abs(seed = (seed * 1103515245 + 12345) | 0) % n;
  const totalDays = 14 + rnd(10);
  const completed = plan.status === 'APPROVED' ? Math.floor(totalDays * 0.4) : 0;
  return {
    id: plan.id, name: plan.title, contractor: 'UCCP Operations Directorate',
    period: '1 Aug – 31 Aug, 2026', recurrence: 'Daily', status: plan.status === 'APPROVED' ? 'ONGOING' : 'SCHEDULED',
    avgCompliance: 70 + rnd(25), totalDays, completed, ongoing: plan.status === 'APPROVED' ? 1 : 0,
    scheduled: totalDays - completed - (plan.status === 'APPROVED' ? 1 : 0), missedCollections: rnd(20), onTimePct: 75 + rnd(20),
    trend: Array.from({ length: Math.min(completed, 18) }, (_, i) => ({ t: `Aug ${i + 1}`, compliance: Math.round(70 + Math.sin(i / 2) * 10 + rnd(10)) })),
    days: Array.from({ length: totalDays }, (_, i): OverviewDay => {
      const day = i + 1;
      const status: DayStatus = day <= completed ? 'completed' : day === completed + 1 && plan.status === 'APPROVED' ? 'ongoing' : 'scheduled';
      const pct = status === 'scheduled' ? undefined : Math.round(65 + rnd(30));
      return { dateISO: `2026-08-${String(day).padStart(2, '0')}`, day, status, compliancePct: pct };
    }),
    points: plan.locations.map((name) => ({ name, serviced: 80 + rnd(40), total: 132, compliancePct: 70 + rnd(25) })),
  };
}

function SmartPlanningScreen() {
  const embed = isEmbedMode();
  const [records, setRecords] = React.useState<FloodPlanRecord[]>(FLOOD_RECORDS);
  const [hiddenOnMap, setHiddenOnMap] = React.useState<Set<string>>(() => new Set(FLOOD_RECORDS.slice(4).map((r) => r.id)));
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [detailStep, setDetailStep] = React.useState<0 | 1 | 2>(0);
  const [roster, setRoster] = React.useState<{ planId: string; entry?: FloodRosterEntry; date?: string } | null>(null);
  const [view, setView] = React.useState<'hybrid' | 'calendar' | 'list'>(() => {
    const v = embedViewParam();
    return v === 'calendar' || v === 'list' ? v : 'hybrid';
  });
  const tabs: { id: 'hybrid' | 'calendar' | 'list'; label: string }[] = [
    { id: 'hybrid', label: 'Hybrid View' },
    { id: 'calendar', label: 'Grid View' }, // FM-6369 rostering matrix (id kept for the host shell's `view` param)
    { id: 'list', label: 'List View' },
  ];

  // Superseded versions never reach the hybrid table/map either.
  const live = React.useMemo(() => records.filter((r) => r.status !== 'SUPERSEDED'), [records]);
  const hybridRows = React.useMemo(() => live.map((r) => recordToPlanRow(r, !hiddenOnMap.has(r.id))), [live, hiddenOnMap]);
  const existingNames = React.useMemo(() => live.map((r) => r.name), [live]);
  const detail = records.find((r) => r.id === detailId) ?? null;
  const rosterPlan = records.find((r) => r.id === roster?.planId) ?? null;
  const now = () => new Date().toISOString();
  const ME = 'Product Team';

  const update = (id: string, fn: (r: FloodPlanRecord) => FloodPlanRecord) => setRecords((cur) => cur.map((r) => (r.id === id ? fn(r) : r)));
  const transition = (plan: FloodPlanRecord, to: FloodPlanStatus, note?: string) => {
    const action = to === 'IN_REVIEW' ? 'Submitted for review' : to === 'APPROVED' ? 'Approved' : to === 'REJECTED' ? 'Rejected' : `Moved to ${FLOOD_STATUS_LABEL[to]}`;
    update(plan.id, (r) => ({ ...r, status: to, updatedAt: now(), updatedBy: ME, history: [...r.history, { id: `${r.id}-h${r.history.length + 1}`, at: now(), by: ME, action, detail: note, status: to, version: r.version }] }));
    toast.success(`${plan.name} — ${FLOOD_STATUS_LABEL[to]}`);
  };
  const save = (updated: FloodPlanRecord, mode: 'in-place' | 'new-version') => {
    if (mode === 'in-place') {
      update(updated.id, (r) => ({ ...updated, updatedAt: now(), updatedBy: ME, history: [...r.history, { id: `${r.id}-h${r.history.length + 1}`, at: now(), by: ME, action: 'Edited plan', detail: r.status === 'REJECTED' ? 'Changes after rejection' : undefined, version: r.version }] }));
      toast.success('Changes saved');
      return;
    }
    // Approved plan edited → this version is superseded, a new Draft version is created.
    const base = updated.id.replace(/-v\d+$/, '');
    const nextVersion = updated.version + 1;
    const newId = `${base}-v${nextVersion}`;
    const t = now();
    setRecords((cur) => [
      { ...updated, id: newId, status: 'DRAFT', version: nextVersion, supersedes: updated.id, roster: [], createdAt: t, createdBy: ME, updatedAt: t, updatedBy: ME,
        history: [{ id: `${newId}-h1`, at: t, by: ME, action: `Created v${nextVersion} from ${updated.id}`, detail: 'Edited after approval — saved as a new Draft version', status: 'DRAFT', version: nextVersion }] },
      ...cur.map((r) => (r.id === updated.id ? { ...r, status: 'SUPERSEDED' as FloodPlanStatus, updatedAt: t, updatedBy: ME, history: [...r.history, { id: `${r.id}-h${r.history.length + 1}`, at: t, by: ME, action: `Superseded by v${nextVersion}`, status: 'SUPERSEDED' as FloodPlanStatus, version: r.version }] } : r)),
    ]);
    setDetailId(newId);
    toast.success(`Saved as v${nextVersion} (Draft)`, { description: `v${updated.version} is now superseded and no longer listed.` });
  };
  /* FM-6368/FM-6370 — save re-runs the FULL validation (the demo's stand-in
   * for server-side enforcement) and generates ONE schedule per assignment,
   * linked to the plan version it came from. */
  const saveRoster = (plan: FloodPlanRecord, entries: FloodRosterEntry[]) => {
    if (plan.status !== 'APPROVED') { toast.error('Only approved plans can be rostered'); return; }
    if (!entries.length) { toast.error('Rostering blocked', { description: 'No dates to roster.' }); return; }
    /* Re-run the FULL validation per generated date (the demo's stand-in for
     * server-side enforcement) — a conflicting date is skipped, not fatal. */
    const accepted: FloodRosterEntry[] = [];
    let firstError: string | undefined;
    let skipped = 0;
    const claimed: FloodRosterEntry[] = [];
    for (const entry of entries) {
      const fail = (msg: string) => { skipped++; if (!firstError) firstError = msg; };
      if (shiftEnded(entry.date, entry.shift)) { fail('This shift has already ended on that date.'); continue; }
      if (!entry.vehicles.length || !entry.crew.length) { fail('Pick at least one vehicle and one crew member.'); continue; }
      const conflicts = findRosterConflicts({
        plans: records.map((r) => (r.id === plan.id ? { ...r, roster: [...r.roster, ...claimed] } : r)),
        date: entry.date, shift: entry.shift, vehicles: entry.vehicles, crew: entry.crew, excludeEntryId: entry.id,
      });
      if (conflicts.length) { fail(conflictMessage(conflicts[0])); continue; }
      const stamped: FloodRosterEntry = {
        ...entry, assignedBy: ME, assignedAt: now(), planVersion: plan.version,
        scheduleId: entry.scheduleId ?? `SCH-${Date.now().toString().slice(-6)}-${accepted.length}`,
      };
      accepted.push(stamped);
      claimed.push(stamped);
    }
    if (!accepted.length) { toast.error('Assignment blocked', { description: firstError }); return; }
    const startsNow = accepted.some((e) => e.date === todayIso() && shiftUnderway(e.date, e.shift));
    update(plan.id, (r) => {
      let roster = r.roster;
      for (const e of accepted) {
        roster = roster.some((x) => x.id === e.id) ? roster.map((x) => (x.id === e.id ? e : x)) : [...roster, e];
      }
      const first = accepted[0];
      const action = accepted.length > 1
        ? `Rostered ${accepted.length} dates · ${first.shift}`
        : `${r.roster.some((x) => x.id === first.id) ? 'Updated roster' : 'Rostered'} ${first.date} · ${first.shift}`;
      return { ...r, roster, updatedAt: now(), updatedBy: ME,
        history: [...r.history, { id: `${r.id}-h${r.history.length + 1}`, at: now(), by: ME, action,
          detail: `${first.vehicles.join(', ')} · ${first.crew.join(', ')} · ${accepted.length} schedule${accepted.length === 1 ? '' : 's'} generated (plan v${r.version})${startsNow ? ' — one starts immediately' : ''}` }] };
    });
    setRoster(null);
    toast.success(accepted.length > 1 ? `Roster saved — ${accepted.length} schedules generated` : startsNow ? 'Roster saved — schedule started' : 'Roster saved — schedule generated', {
      description: `${plan.name} · ${accepted[0].date}${accepted.length > 1 ? ` → ${accepted[accepted.length - 1].date}` : ''} · ${accepted[0].shift}${skipped ? ` · ${skipped} date${skipped === 1 ? '' : 's'} skipped (${firstError})` : ''}`,
    });
  };
  const removeRoster = (plan: FloodPlanRecord, entryId: string) => {
    const gone = plan.roster.find((x) => x.id === entryId);
    update(plan.id, (r) => ({ ...r, roster: r.roster.filter((x) => x.id !== entryId), updatedAt: now(), updatedBy: ME, history: [...r.history, { id: `${r.id}-h${r.history.length + 1}`, at: now(), by: ME, action: 'Removed a rostered date', detail: gone?.scheduleId ? `Schedule ${gone.scheduleId} cancelled — the plan can be rostered again.` : undefined }] }));
    setRoster(null);
    toast.success('Assignment removed', { description: gone?.scheduleId ? `Schedule ${gone.scheduleId} cancelled.` : undefined });
  };
  const openRoster = (plan: FloodPlanRecord, entry?: FloodRosterEntry, date?: string) => {
    if (plan.status !== 'APPROVED') { toast.error('Only approved plans can be rostered'); return; }
    setRoster({ planId: plan.id, entry, date });
  };
  /** A plan row opens the detail sheet — straight on step 3 (Shift Rostering)
   *  when the approved plan still has no roster, otherwise on Basic Setup. */
  const needsRoster = (p?: FloodPlanRecord) => !!p && p.status === 'APPROVED' && p.roster.length === 0;
  const openPlan = (id: string) => { setDetailStep(needsRoster(records.find((r) => r.id === id)) ? 2 : 0); setDetailId(id); };
  /** The list's Roster action opens the detail sheet on step 3. */
  const rosterFromList = (plan: FloodPlanRecord) => {
    if (plan.status !== 'APPROVED') { toast.error('Only approved plans can be rostered'); return; }
    setDetailStep(2); setDetailId(plan.id);
  };

  return (
    <div style={{ height: '100vh' }} className="flex flex-col">
      {!embed && (
        <div className="flex h-12 items-stretch border-b border-border bg-muted/40">
          <span className="flex items-center px-4 text-body font-semibold text-foreground">Smart Planning</span>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setView(t.id)}
              className={`h-full shrink-0 items-center border-s border-border p-3 text-body-xs font-semibold text-card-foreground last:border-e hover:bg-card/60 ${view === t.id ? 'bg-card shadow-[inset_0_-2px_0_0_var(--color-primary)]' : ''}`}
            >
              {t.label}
            </button>
          ))}
          <button type="button" aria-label="Add view" className="h-full w-12 shrink-0 rounded-sm text-gray-600 hover:bg-card/60">+</button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        {view === 'hybrid' ? (
          // FM-6366 — flood hybrid: plan list beside the zones / coverage /
          // plan-overlay / weather-station / weather-layer map.
          <FloodPlanHybrid
            plans={records}
            catalog={FLOOD_CATALOG}
            hiddenOnMap={hiddenOnMap}
            onToggleVisible={(id, v) => setHiddenOnMap((cur) => { const n = new Set(cur); if (v) n.delete(id); else n.add(id); return n; })}
            onOpenPlan={openPlan}
            onRoster={rosterFromList}
            renderCreateWizard={({ open, onOpenChange }) => (
              <FloodPlanWizard
                catalog={FLOOD_CATALOG}
                existingNames={existingNames}
                open={open}
                onOpenChange={onOpenChange}
                onCreate={(d) => {
                  onOpenChange(false);
                  const id = `FRP-${2100 + records.length}`;
                  setRecords((cur) => [recordFromDraft(d, id, ME), ...cur]);
                  toast.success('Plan saved as Draft', { description: `"${d.name}" covers ${d.zoneIds.length} zone${d.zoneIds.length === 1 ? '' : 's'} and is ready for review.` });
                }}
              />
            )}
          />
        ) : view === 'calendar' ? (
          // FM-6369 — the rostering matrix: live records, real conflicts, and
          // grid cells that open the SAME roster sheet as the list/hybrid views.
          <FloodPlanGrid
            plans={records}
            catalog={FLOOD_CATALOG}
            vehicleUnits={FLOOD_VEHICLE_UNITS}
            crewMembers={FLOOD_CREW_MEMBERS}
            onOpenPlan={openPlan}
            onRoster={openRoster}
          />
        ) : (
          <FloodPlanList plans={records} catalog={FLOOD_CATALOG} onOpen={(p) => openPlan(p.id)} onRoster={rosterFromList} />
        )}
      </div>

      <FloodPlanDetailSheet
        plan={detail}
        catalog={FLOOD_CATALOG}
        existingNames={existingNames}
        open={!!detail && !roster}
        initialStep={detailStep}
        onOpenChange={(o) => { if (!o) setDetailId(null); }}
        onSave={save}
        onTransition={transition}
        onRoster={openRoster}
        onComment={(plan, text) => update(plan.id, (r) => ({ ...r, history: [...r.history, { id: `${r.id}-c${r.history.length + 1}`, at: now(), by: ME, action: 'Comment', detail: text }] }))}
      />
      <FloodRosterSheet
        plan={rosterPlan}
        entry={roster?.entry ?? null}
        catalog={FLOOD_CATALOG}
        vehicleUnits={FLOOD_VEHICLE_UNITS}
        crewMembers={FLOOD_CREW_MEMBERS}
        allPlans={records}
        currentUser={ME}
        initialDate={roster?.date}
        open={!!roster && !!rosterPlan}
        onOpenChange={(o) => { if (!o) setRoster(null); }}
        onSave={saveRoster}
        onRemove={removeRoster}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Plan Monitoring — UCCP daily execution runs (Doha, Qatar)               */
/* ---------------------------------------------------------------------- */

const PM_JOB = JOB_TYPES.length ? Array.from({ length: 14 }, (_, i) => JOB_TYPES[i % JOB_TYPES.length]) : [];
const PM_SHIFTS = ['Morning Shift', 'Morning Shift', 'Night Shift', 'Morning Shift', 'Morning Shift', 'Night Shift', 'Afternoon Shift', 'Night Shift', 'Afternoon Shift', 'Night Shift', 'Morning Shift', 'Afternoon Shift', 'Afternoon Shift', 'Night Shift'];
const PM_DRIVERS = Array.from({ length: 14 }, (_, i) => DRIVERS[i % DRIVERS.length]);
const PM_PLATES = Array.from({ length: 14 }, (_, i) => TANKERS[i % TANKERS.length]);
/* Row id, zone, progress and compliance now come from PM_ROW_SEEDS in
 * ./data/stop-plan.ts — the SAME table scripts/build-routes.mjs replays to
 * bake each run's road geometry, so a run and its baked route cannot drift
 * apart. Values are byte-identical to the literals they replace. */
const PM_ZONE_SEQ = PM_ROW_SEEDS.map((s) => ZONE_DEFS[s.zoneIdx]);
const PM_TITLES = PM_ZONE_SEQ.map((z, i) => `${z.name.toUpperCase().replace(/ /g, '_')}_${String.fromCharCode(65 + (i % 26))}${i}`);
const PM_STATUS = ['SCHEDULED', 'SCHEDULED', 'SCHEDULED', 'SCHEDULED', 'ONGOING', 'ONGOING', 'ONGOING', 'ONGOING', 'ONGOING', 'ONGOING', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED'];
const PM_TOTS = PM_ROW_SEEDS.map((s) => s.total);
const PM_DONE = PM_ROW_SEEDS.map((s) => s.done);
const PM_COMP = PM_ROW_SEEDS.map((s) => s.comp);
const PM_DATES = ['22 Aug, 2026', '23 Aug, 2026', '24 Aug, 2026', '25 Aug, 2026', 'Today', 'Today', 'Today', 'Today', 'Today', 'Yesterday', 'Yesterday', 'Yesterday', 'Yesterday', '17 Aug, 2026'];

const PM_ROWS: PlanMonitorRow[] = PM_TITLES.map((title, i) => ({
  id: PM_ROW_SEEDS[i].id,
  serviceType: 'Flood Response',
  wasteType: PM_JOB[i],
  title,
  vehicle: PM_PLATES[i],
  driver: PM_DRIVERS[i],
  shift: PM_SHIFTS[i],
  locations: i % 3 === 1
    ? [PM_ZONE_SEQ[i].name, (ZONE_DEFS[(i + 3) % ZONE_DEFS.length].name !== PM_ZONE_SEQ[i].name
        ? ZONE_DEFS[(i + 3) % ZONE_DEFS.length].name
        : ZONE_DEFS[(i + 4) % ZONE_DEFS.length].name)]
    : [PM_ZONE_SEQ[i].name],
  startAt: `${PM_DATES[i]} ${['11:30 AM', '09:15 AM', '10:00 AM', '03:00 AM', '10:15 AM', '11:00 AM', '09:00 AM', '11:00 AM', '09:00 AM', '11:15 AM', '09:45 AM', '11:00 AM', '09:30 AM', '10:00 AM'][i]}`,
  endAt: `${PM_DATES[i]} ${['02:00 PM', '04:45 PM', '01:30 PM', '06:30 AM', '03:45 PM', '04:30 PM', '01:30 PM', '04:30 PM', '01:30 PM', '03:15 PM', '01:45 PM', '03:30 PM', '01:00 PM', '01:30 PM'][i]}`,
  status: PM_STATUS[i],
  progressDone: PM_DONE[i],
  progressTotal: PM_TOTS[i],
  compliancePct: PM_COMP[i],
}));

const PM_OVERVIEW: PlanOverviewData = {
  id: 'PID-231454', name: 'Flood Response Plan Sector A Al Wakrah Lot 3', contractor: 'UCCP Operations Directorate',
  period: '1 Aug – 31 Aug, 2026', recurrence: 'Daily', status: 'ONGOING',
  avgCompliance: 87, totalDays: 31, completed: 18, ongoing: 1, scheduled: 12, missedCollections: 42, onTimePct: 91,
  trend: Array.from({ length: 18 }, (_, i) => ({ t: `Aug ${i + 1}`, compliance: Math.round(78 + Math.sin(i / 2) * 8 + (i % 4 === 0 ? -10 : 4)) })),
  days: Array.from({ length: 31 }, (_, i): OverviewDay => {
    const day = i + 1;
    const status: DayStatus = day <= 18 ? 'completed' : day === 19 ? 'ongoing' : 'scheduled';
    const pct = status === 'scheduled' ? undefined : Math.round(72 + Math.sin(i) * 12 + (i % 5 === 0 ? -14 : 6));
    const missed = status === 'completed' && (pct ?? 100) < 62;
    return { dateISO: `2026-08-${String(day).padStart(2, '0')}`, day, status: missed ? 'missed' : status, compliancePct: pct };
  }),
  points: [
    { name: 'Al Wakrah Corniche', serviced: 128, total: 132, compliancePct: 92 },
    { name: 'Lusail Marina', serviced: 138, total: 145, compliancePct: 88 },
    { name: 'Al Rayyan Underpass', serviced: 96, total: 118, compliancePct: 71 },
  ],
};

/*
 * 2026-08-31 plan-detail rebuild — realistic PlanMonitoringDetailData for
 * EVERY run in PM_ROWS (not just the PM_OVERVIEW placeholder plan), so
 * opening any row from List View or Hybrid View shows a detail that's
 * internally consistent with that row's own list numbers (vehicle, driver,
 * shift, zone, progress/compliance). Deterministic PRNG keyed off the row id
 * + index — same technique as `synthesizePlanOverview` above.
 */
/*
 * 2026-09-02 (FM-6354 + Figma Tadweer-March 2007:96728): the full shift
 * sequence — schedule-track activity AND the driver-owned job-order events
 * in ONE "All" feed. `category: 'jobs'` marks the assigned-request events
 * (the Plan Log's "Assigned Jobs" tab); 'critical'/'issues' feed their tabs.
 * `zone`/`eta` render the Figma's geofence + Planned-ETA meta lines;
 * `evidence: true` events carry before/after photos (side sheet).
 */
const FLOOD_LOG_TEMPLATES: {
  kind: PlanLogEvent['kind'];
  title: (zone: string) => string;
  sub: (zone: string) => string;
  category?: string;
  zone?: boolean;
  eta?: boolean;
  evidence?: boolean;
}[] = [
  { kind: 'start', title: () => 'Started Plan', sub: (z) => `${z.toUpperCase()} DEPOT, QATAR` },
  { kind: 'service', title: () => 'Reached Assembly Point', sub: (z) => `${z.toUpperCase()} ASSEMBLY POINT, QATAR`, zone: true },
  { kind: 'service', title: (z) => `Job Order Assigned — ${z}`, sub: (z) => z.toUpperCase(), category: 'jobs', eta: true },
  { kind: 'alert', title: () => 'Over Speeding at 132 km/h', sub: (z) => `${z.toUpperCase()}, QATAR`, category: 'critical' },
  { kind: 'service', title: () => 'On Site — Job Ongoing', sub: (z) => `${z.toUpperCase()} · Site A7`, category: 'jobs', zone: true },
  { kind: 'collected', title: () => 'Collecting Started — Pump Run', sub: (z) => `${z.toUpperCase()} · Site A7`, category: 'jobs', evidence: true },
  { kind: 'done', title: () => 'Job Completed', sub: (z) => `${z.toUpperCase()} · Site A7`, category: 'jobs', evidence: true },
  { kind: 'alert', title: () => 'Standing Water Reported by Resident', sub: (z) => `${z.toUpperCase()}, QATAR`, category: 'issues' },
  { kind: 'service', title: () => 'Heading to Discharge Point', sub: (z) => `${z.toUpperCase()} DISCHARGE POINT` },
  { kind: 'collected', title: () => 'Discharge Verified — Fill Level Falling', sub: (z) => `${z.toUpperCase()} DISCHARGE POINT`, zone: true, evidence: true },
  { kind: 'done', title: () => 'Returned to Depot', sub: (z) => `${z.toUpperCase()} DEPOT, QATAR` },
];
/** Flood before/after photo pool for evidence sheets (demo-grade hosted images). */
const EVIDENCE_PHOTOS: [string, string][] = [
  // Flooded street / submerged car -> same street, cleared and wet-but-drained.
  ['https://images.unsplash.com/photo-1657069345471-c54f2432b79c?w=640&h=640&fit=crop', 'https://images.unsplash.com/photo-1552570173-43e2d76c37f4?w=640&h=640&fit=crop'],
  // Flooded road behind hazard barrier -> empty wet road, drained.
  ['https://images.unsplash.com/photo-1657069342866-2d11c2509b02?w=640&h=640&fit=crop', 'https://images.unsplash.com/photo-1599194323651-f1491c2d76ed?w=640&h=640&fit=crop'],
  // Flooded village/town street -> wet cobblestone street, cleared.
  ['https://images.unsplash.com/photo-1545276070-ec815f01c6ec?w=640&h=640&fit=crop', 'https://images.unsplash.com/photo-1610582268234-996037a1534e?w=640&h=640&fit=crop'],
  // Flooded street with rescue/response vehicle -> wet urban street, cleared.
  ['https://images.unsplash.com/photo-1761252987176-c450c43f5cbb?w=640&h=640&fit=crop', 'https://images.unsplash.com/photo-1616867404146-b05b5bc3f331?w=640&h=640&fit=crop'],
];
// Same semantic-tone roles PlanMonitoringDetail itself uses internally (not
// exported from that module — this file has no shared boundary to import
// them from, so a local copy of the same var(...) names, on purpose).
const P = 'var(--primary)';
const OK = 'var(--status-success)';
const WARN = 'var(--status-warning)';
const ERR = 'var(--status-error)';
const PURPLE = 'var(--chart-accent-purple)';

/* ── GPS-track synthesis (2026-09-04 feedback: "GPS lines should look real —
 *    this is GPS jumps") ──────────────────────────────────────────────────────
 * A 5-point trail between stops renders as a handful of long diagonals, i.e.
 * exactly what a dropped-signal GPS jump looks like. A tanker actually drives
 * a street grid: it runs along one axis, turns at a junction, runs along the
 * other, and reports every few seconds. So each leg below is broken into 2–3
 * blocks, each block an L-shaped (Manhattan) run with a rounded corner,
 * sampled ~110 m apart, lightly smoothed, then dusted with 5–15 m of receiver
 * noise. Deterministic throughout — the caller's seeded `rnd` is the only
 * entropy, so a row always replays the same track.
 */
/* M_DEG, Pt and metresBetween now come from ./data/stop-plan.ts (shared with
 * the OSRM route baker) — same definitions, one home. */

/** Straight run `from` → `to`, sampled every ~`stepM` metres (excludes `from`). */
function runTo(from: Pt, to: Pt, stepM: number): Pt[] {
  const distM = Math.hypot(to[0] - from[0], (to[1] - from[1]) * 0.9) / M_DEG;
  const n = Math.max(1, Math.round(distM / stepM));
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / n;
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t] as Pt;
  });
}

/** One grid block: run along one axis to the junction, then the other, with
 *  the corner cut by a short diagonal so the turn reads as a junction rather
 *  than a hard 90° spike. */
function gridBlock(from: Pt, to: Pt, lngFirst: boolean, stepM: number): Pt[] {
  const corner: Pt = lngFirst ? [from[0], to[1]] : [to[0], from[1]];
  const easeIn: Pt = [corner[0] + (from[0] - corner[0]) * 0.12, corner[1] + (from[1] - corner[1]) * 0.12];
  const easeOut: Pt = [corner[0] + (to[0] - corner[0]) * 0.12, corner[1] + (to[1] - corner[1]) * 0.12];
  return [...runTo(from, easeIn, stepM), corner, ...runTo(easeOut, to, stepM)];
}

/** Builds a dense street-like track through `stops`. `dwell` > 0 parks the
 *  vehicle at every intermediate stop as a tight report cluster. */
function buildTrack(
  stops: Pt[],
  rnd: (n: number) => number,
  opts: { stepM?: number; jitter?: number; noiseM?: number; dwell?: number; blockM?: number; maxPoints?: number } = {},
): Pt[] {
  const { stepM = 110, jitter = 0.0022, noiseM = 12, dwell = 0, blockM = 300, maxPoints = 300 } = opts;
  // Point budget (2026-09-04 realism pass): the leg subdivision below is
  // driven by leg LENGTH, so a long run would otherwise blow past a few
  // hundred fixes. Measure the stop chain up front (×1.35 for the L-shaped
  // block detours) and widen the sample step until the whole track fits.
  let chainM = 0;
  for (let s = 0; s < stops.length - 1; s++) chainM += metresBetween(stops[s], stops[s + 1]);
  const dwellPts = dwell > 0 ? dwell * Math.max(0, stops.length - 2) : 0;
  const budget = Math.max(24, maxPoints - dwellPts - stops.length * 6);
  const step = Math.max(stepM, (chainM * 1.35) / budget);
  const out: Pt[] = [stops[0]];
  for (let s = 0; s < stops.length - 1; s++) {
    const a = stops[s];
    const b = stops[s + 1];
    // 2–5 blocks per leg, each ~`blockM` long, so a short hop stays one or
    // two turns and a long haul reads as a run of city blocks rather than one
    // perfectly straight synthetic diagonal.
    const legM = metresBetween(a, b);
    const blocks = Math.min(5, Math.max(2, Math.round(legM / blockM) + (rnd(4) === 0 ? 1 : 0)));
    // Sideways nudges are taken PERPENDICULAR to the leg, so consecutive
    // blocks step off the a→b line the way a street grid detours around it.
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const perp: Pt = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
    let cursor = a;
    for (let k = 1; k <= blocks; k++) {
      const t = k / blocks;
      const off = ((rnd(21) - 10) / 10) * jitter;
      const node: Pt = k === blocks ? b : [
        a[0] + (b[0] - a[0]) * t + perp[0] * off,
        a[1] + (b[1] - a[1]) * t + perp[1] * off + ((rnd(11) - 5) / 10) * jitter * 0.4,
      ];
      out.push(...gridBlock(cursor, node, (k + s) % 2 === 0, step));
      cursor = node;
    }
    // Stop cluster — a few near-identical fixes while the crew works the site.
    if (dwell > 0 && s < stops.length - 2) {
      for (let d = 0; d < dwell; d++) {
        out.push([b[0] + (rnd(17) - 8) * M_DEG, b[1] + (rnd(17) - 8) * M_DEG]);
      }
    }
  }
  // One light smoothing pass (endpoints pinned) + receiver noise, then the
  // coastline guard as a backstop — the stops are already inland, so this only
  // catches a block detour or a noise sample that wandered towards the water.
  return out.map((p, i, arr) => {
    if (i === 0 || i === arr.length - 1) return onLand(p);
    const lat = (arr[i - 1][0] + p[0] * 2 + arr[i + 1][0]) / 4;
    const lng = (arr[i - 1][1] + p[1] * 2 + arr[i + 1][1]) / 4;
    if (noiseM <= 0) return onLand([lat, lng]);
    return onLand([lat + (rnd(2 * noiseM + 1) - noiseM) * M_DEG, lng + (rnd(2 * noiseM + 1) - noiseM) * M_DEG]);
  });
}

/** Flood/standing-water report titles for the in-zone incident pins. */
const INCIDENT_TITLES = [
  'Standing water — underpass approach',
  'Road flooding reported by patrol',
  'Blocked storm drain, water rising',
  'Residential yard flooding — 2 villas',
  'Sabkha overflow onto service road',
];

function synthesizePlanDetail(row: PlanMonitorRow, index: number, rec?: PmEntityRecord): PlanMonitoringDetailData {
  let seed = index * 7919 + 13;
  for (let i = 0; i < row.id.length; i++) seed = (seed * 31 + row.id.charCodeAt(i)) | 0;
  const rnd = (n: number) => Math.abs(seed = (seed * 1103515245 + 12345) | 0) % n;
  const zone = row.locations[0] ?? 'Doha';
  const zoneDef = ZONE_DEFS.find((z) => z.name === zone) ?? ZONE_DEFS[index % ZONE_DEFS.length];
  const compliance = row.compliancePct ?? 60 + rnd(35);
  const extractedL = 900 + rnd(3200);
  const allowedL = extractedL + 200 + rnd(600);
  const totalSites = row.progressTotal || 40 + rnd(80);
  const doneSites = row.progressDone || Math.round(totalSites * (0.3 + rnd(60) / 100));
  const offPlanTotal = 4 + rnd(20);
  const registered = Math.round(offPlanTotal * 0.44);
  const unregistered = Math.round(offPlanTotal * 0.31);
  const unlogged = offPlanTotal - registered - unregistered;
  // Live entity record (when the host posted FPL records in): its own
  // coordinates anchor the replay map — the zone-name lookup is a fallback.
  const [lat, lng] = onLand(
    rec && typeof rec.lat === 'number' && typeof rec.lng === 'number' ? [rec.lat, rec.lng] : zoneDef.center,
  );
  /* Run geography — depot and discharge station sit outside the assigned zone
   * (as they do in reality), the response sites sit INSIDE the zone overlay
   * polygon (`zoneBox` half-width 0.022, so a ≤0.013 ring is always inside),
   * and the track visits every one of them.
   *
   * 2026-09-04 feedback ("make sure the routes and the lines on the map are
   * actually aligned with the map"): the trail is no longer synthesized. The
   * stop chain below is derived exactly as before (shared with the baker, so
   * the seeds match), but the GEOMETRY between the stops is the REAL driving
   * route OSRM computed for those stops, pre-baked into data/routes.json —
   * so the line rides the streets the basemap draws instead of cutting across
   * blocks and sabkha. The synthetic derivation still runs unconditionally:
   * it is the offline fallback AND it keeps this function's single shared
   * PRNG stream advancing exactly as it always did (every value below is
   * seeded off it). */
  const at = makeAt([lat, lng]);
  const synth = deriveStops(at, rnd);
  /* Static runs are keyed by row id. A LIVE host record (FPL-xxxx, posted in
   * by the shell) has no baked entry, so it borrows the nearest baked ZONE's
   * real roads — never a translated copy of someone else's track, which would
   * put the line back off-road. Its geography then belongs to that zone (the
   * roads exist there and nowhere else), which is what `anchor` below frames. */
  const own = BAKED_ROUTES[row.id];
  const baked: BakedRoute | undefined = own ?? nearestBakedZone(BAKED_ROUTES, [lat, lng]);
  const depotPos: Pt = baked ? baked.depotPos : synth.depotPos;
  const assemblyPos: Pt = baked ? baked.assemblyPos : synth.assemblyPos;
  const dischargePos: Pt = baked ? baked.dischargePos : synth.dischargePos;
  const sitePos: Pt[] = baked && baked.sitePos.length ? baked.sitePos : synth.sitePos;
  const stops: Pt[] = baked ? baked.stops : synth.stops;
  /* The anchor every zone-relative overlay is drawn around. With baked roads
   * that is the routed geometry's own anchor; the live record's coordinates
   * are snapped onto the borrowed geometry (`recAnchor`) so the record still
   * reads as sitting on the road, not floating beside it. */
  const recAnchor: Pt = baked && !own ? nearestOnPath(baked.actual, [lat, lng]).point : [lat, lng];
  const anchor: Pt = baked ? baked.anchor : [lat, lng];
  // Actual track: the routed geometry re-sampled to a ~50 m GPS cadence with
  // ±8 m of receiver noise and a dwell cluster at each stop, so it still reads
  // as a recorded trace while hugging the road.
  const route = baked
    ? gpsify(baked.actual, stops, rnd, { stepM: 50, noiseM: 8, dwell: 4, maxPoints: 460 })
    : buildTrack(synth.stops, rnd, { stepM: 130, blockM: 280, noiseM: 12, dwell: 4, maxPoints: 300 });
  // Scheduled route: the same chain routed cleanly (no receiver noise, no
  // dwell clusters) and WITHOUT the last site — the off-plan response the crew
  // added, so the deviation from plan is visible on the map.
  const plannedRoute = baked
    ? baked.planned
    : buildTrack(
        synth.plannedStops,
        rnd,
        { stepM: 260, blockM: 420, jitter: 0.0012, noiseM: 0, maxPoints: 130 },
      );
  /** Snaps an event pin onto the recorded track so the layers line up with the
   *  purple trail instead of floating beside it. */
  const onTrack = (frac: number): Pt => route[Math.min(route.length - 1, Math.max(0, Math.round(route.length * frac)))];
  // Municipality vocabulary is the SAME 5-value set the incidents and
  // plan-monitoring blueprints enumerate (Doha / Al Rayyan / Al Wakrah /
  // Umm Salal / Al Daayen) — 2026-09-01 cross-module data audit. Lusail and
  // Al Khor are catchment zones inside Al Daayen, not municipalities of their
  // own; "Doha Industrial" was a sixth, unshared value.
  const municipalityByZone: Record<string, string> = { z1: 'Al Wakrah', z2: 'Al Daayen', z3: 'Al Rayyan', z4: 'Umm Salal', z5: 'Doha', z6: 'Doha', z7: 'Doha', z8: 'Doha', z9: 'Al Daayen' };
  // Hoisted out of the return object (was `planLog: FLOOD_LOG_TEMPLATES.map(...)`
  // inline) so the Water Extraction Trend chart below can read the same
  // "Discharge Verified" event time the Plan Log renders — same rnd() call
  // sequence either way, nothing else consumes rnd() between here and where
  // this property used to sit.
  const planLog = FLOOD_LOG_TEMPLATES.map((t, i) => {
    const hh = 6 + Math.floor(i * 0.8);
    const time = `${(hh > 12 ? hh - 12 : hh).toString().padStart(2, '0')}:${(10 + rnd(49)).toString().padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
    return {
      time, kind: t.kind, title: t.title(zone), sub: t.sub(zone),
      category: t.category,
      zone: t.zone ? `Z-${1200 + (index % 40)}` : undefined,
      eta: t.eta ? `Planned ETA: ${(row.startAt.split(/ (?=\d)/)[0] || 'Today')} ${time}` : undefined,
      evidenceId: t.evidence ? `${row.id}-ev-${i}` : undefined,
    };
  });
  // The single mid-shift discharge stop ("Discharge Verified — Fill Level
  // Falling") — the tanker offloads at the station, so the load trend below
  // dips sharply right at this event's own logged time, then climbs again
  // as pumping resumes (chart and Plan Log agree on when it happened).
  const dischargeEvent = planLog.find((e) => e.title.startsWith('Discharge Verified'));
  const to24h = (t: string) => {
    const m = /^(\d{2}):(\d{2}) (AM|PM)$/.exec(t);
    if (!m) return t;
    const h24 = (Number(m[1]) % 12) + (m[3] === 'PM' ? 12 : 0);
    return `${h24.toString().padStart(2, '0')}:${m[2]}`;
  };
  const dischargeAt = dischargeEvent ? to24h(dischargeEvent.time) : undefined;
  // Flood / standing-water reports inside the assigned zone — the reason the
  // run exists; the actual track visits each of them. Hoisted out of the
  // return object (same reasoning as `planLog` above) so the evidence
  // payloads below can link each photo set to the incident it responds to.
  const incidents = sitePos.map((p, i) => {
    const hh = 6 + i + rnd(2);
    return {
      id: `IC-2${(100 + ((index * 7 + i * 13) % 800)).toString().padStart(3, '0')}`,
      position: p,
      title: INCIDENT_TITLES[i % INCIDENT_TITLES.length],
      time: `${(hh > 12 ? hh - 12 : hh).toString().padStart(2, '0')}:${(10 + rnd(49)).toString().padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`,
    };
  });
  // "Collection Points" table (2026-09-04, replaces the Off-Plan Response
  // Sites donut) — one row per site the tanker actually served, reusing the
  // SAME `incidents` chain (site position/id/title/report-time) so the table
  // agrees with the map pins and the Plan Log. Water extracted per point is a
  // random SHARE of `extractedL` (not independently rolled) — the "Water
  // Extracted" KPI is a plain string built from `extractedL` above, so the
  // table's own total always sums to exactly that KPI value.
  const toMinutesOfDay = (t: string) => {
    const m = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(t);
    if (!m) return 0;
    const h = (Number(m[1]) % 12) + (m[3] === 'PM' ? 12 : 0);
    return h * 60 + Number(m[2]);
  };
  const fromMinutesOfDay = (mins: number) => {
    const total = ((mins % 1440) + 1440) % 1440;
    const h24 = Math.floor(total / 60);
    const mm = total % 60;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'}`;
  };
  const cpZone = `Z-${1200 + (index % 40)}`;
  const cpStatuses: CollectionPoint['status'][] = incidents.map((_, i) => {
    const r = rnd(10);
    if (incidents.length > 2 && i === incidents.length - 1 && r > 8) return 'Skipped';
    if (r > 6) return 'Partial';
    return 'Completed';
  });
  // The last non-skipped point absorbs the rounding remainder so the column
  // always sums to exactly `extractedL` — never "close to" the KPI.
  let cpAbsorberIdx = cpStatuses.length - 1;
  for (let i = cpStatuses.length - 1; i >= 0; i--) { if (cpStatuses[i] !== 'Skipped') { cpAbsorberIdx = i; break; } }
  const cpWeights = incidents.map(() => 20 + rnd(80));
  const cpActiveWeightSum = incidents.reduce((s, _, i) => s + (i !== cpAbsorberIdx && cpStatuses[i] !== 'Skipped' ? cpWeights[i] : 0), 0) || 1;
  let cpWaterAssigned = 0;
  const collectionPoints: CollectionPoint[] = incidents.map((inc, i) => {
    const status = cpStatuses[i];
    // Clamp each share against the remaining budget (extractedL - cpWaterAssigned)
    // as it's allocated — rounding can otherwise push the running total PAST
    // extractedL, which then forces the absorber's `extractedL - cpWaterAssigned`
    // negative; Math.max(0, …) silently clamped that to 0 instead of correcting,
    // leaving the table's own sum (== cpWaterAssigned) a few liters ABOVE the KPI
    // it's supposed to match. Clamping here keeps the running total <= extractedL
    // always, so the absorber's remainder is guaranteed >= 0 and the three
    // displays (KPI, volume card, table footer) stay equal by construction.
    const rawShare = status === 'Skipped' || i === cpAbsorberIdx ? 0 : Math.max(0, Math.round((extractedL * cpWeights[i]) / cpActiveWeightSum));
    const share = Math.min(rawShare, Math.max(0, extractedL - cpWaterAssigned));
    if (status !== 'Skipped' && i !== cpAbsorberIdx) cpWaterAssigned += share;
    const onSiteMin = status === 'Skipped' ? 0 : 8 + rnd(40);
    const arrivedMin = toMinutesOfDay(inc.time);
    const siteLabel = `${zone} — Site ${String.fromCharCode(65 + (i % 6))}${5 + i}`;
    return {
      site: siteLabel,
      address: `${zone}, Site ${String.fromCharCode(65 + (i % 6))}${5 + i}, Qatar`,
      incidentId: inc.id,
      zone: cpZone,
      arrived: status === 'Skipped' ? '—' : inc.time,
      departed: status === 'Skipped' ? '—' : fromMinutesOfDay(arrivedMin + onSiteMin),
      timeOnSite: status === 'Skipped' ? '—' : `${onSiteMin} mins`,
      waterExtractedL: share, // absorber row corrected below
      pumpCycles: status === 'Skipped' ? 0 : 1 + rnd(5),
      status,
    };
  });
  collectionPoints[cpAbsorberIdx].waterExtractedL = Math.max(0, extractedL - cpWaterAssigned);

  // Fix bug 2: rows with 0L extracted must be marked as Skipped with 0 pump cycles
  // Also re-sync arrived/departed/timeOnSite to match status
  for (let i = 0; i < collectionPoints.length; i++) {
    const cp = collectionPoints[i];
    if (cp.waterExtractedL === 0 && cp.status !== 'Skipped') {
      cp.status = 'Skipped';
      cp.pumpCycles = 0;
      cp.arrived = '—';
      cp.departed = '—';
      cp.timeOnSite = '—';
    }
  }

  // Evidence assessment reference data — reporter roles/severity/checklist
  // pools and the geotag jitter used to place before/after photo pins near
  // the response site (Doha flood-response demo world).
  const REPORTER_ROLES: ('Resident' | 'Inspector' | 'Sensor')[] = ['Resident', 'Inspector', 'Sensor'];
  const SEVERITIES: ('Low' | 'Medium' | 'High' | 'Critical')[] = ['Low', 'Medium', 'High', 'Critical'];
  const OUTCOMES: ('Resolved' | 'Partially Resolved' | 'Follow-up Required')[] = ['Resolved', 'Resolved', 'Partially Resolved', 'Follow-up Required'];
  const ASSESSMENT_NOTES = [
    'Standing water fully cleared; drain flow confirmed normal before crew departed site.',
    'Bulk of pooled water extracted; a shallow residual pocket remains near the low kerb, flagged for a follow-up pass.',
    'Site pumped down to grade; cordon left in place overnight as a precaution given forecast rain.',
    'Blocked storm drain cleared and flushed; road surface passable to light traffic again.',
  ];
  /* Shift window string — hoisted out of the returned `shift` property (which
   * still reads it) so the evidence payloads' "Shift Time" meta row shows the
   * same window the KPI band does. No rnd() involved, so the PRNG sequence is
   * untouched. */
  const shiftWindow = row.shift.replace(' Shift', '') + (row.shift.includes('Night') ? ' 09:00 PM – 05:00 AM' : row.shift.includes('Afternoon') ? ' 01:00 PM – 09:00 PM' : ' 05:00 AM – 01:00 PM');
  const evDate = row.startAt.split(/ (?=\d)/)[0] || 'Today';
  const evMunicipality = municipalityByZone[zoneDef.id] ?? 'Doha';
  return {
    id: row.id, title: row.title, contractor: 'UCCP Operations Directorate',
    sourceRequest: rec && typeof rec.source_request === 'string' && rec.source_request
      ? {
          id: rec.source_request,
          // Post the navigation up to the host shell (planning-v2-module.tsx
          // listens for this and routes to the Requests & Complaints ticket).
          onOpen: () => window.parent?.postMessage({ type: 'uccp:navigate', module: 'incidents', record: rec.source_request }, '*'),
        }
      : undefined,
    municipality: (municipalityByZone[zoneDef.id] ?? 'MME').slice(0, 2).toUpperCase(), zoneTeam: `Lot ${1 + (index % 4)}`,
    locations: row.locations, status: row.status, compliancePct: compliance,
    compactor: row.vehicle, driver: row.driver, helpers: [DRIVERS[(index + 3) % DRIVERS.length].split(' ').map((w) => w[0]).join(''), DRIVERS[(index + 7) % DRIVERS.length].split(' ').map((w) => w[0]).join('')],
    depot: `${zoneDef.name} Depot, Qatar`, discharge: `${zoneDef.name} Discharge Point, Qatar`,
    serviceType: 'Flood Water Extraction', distance: `${20 + rnd(60)} km`, wasteCollected: `${extractedL.toLocaleString()} L`, shift: shiftWindow,
    ptoLifts: 6 + rnd(20), fuelCost: `QAR ${(12 + rnd(20)).toFixed(2)}`, avgTime: `${1 + rnd(2)}h ${10 + rnd(45)}m`, idleTime: `${5 + rnd(30)} mins`,
    collectionStats: [
      { label: 'Total Planned Sites', value: totalSites, color: 'var(--foreground)' },
      { label: 'On-Plan Sites', value: Math.round(doneSites * 0.7), color: OK },
      { label: 'Off-Plan Sites', value: registered, color: WARN },
      { label: 'Unknown Sites', value: unregistered, color: PURPLE },
      { label: 'Unlogged Sites', value: unlogged, color: P },
      { label: 'Pending Sites', value: Math.max(totalSites - doneSites, 0), color: ERR },
    ],
    planLog,
    // Evidence side-sheet payloads (FM-6354: before/after photos, fill delta,
    // duration; 2026-09-04 feedback — extended with incident details, photo
    // captions/geotags and a post-response assessment so "Job Completed"
    // opens a realistic flood-response record instead of just 2 photos).
    evidence: Object.fromEntries(
      FLOOD_LOG_TEMPLATES.map((t, i) => [t, i] as const)
        .filter(([t]) => t.evidence)
        .map(([t, i], k) => {
          const [before, after] = EVIDENCE_PHOTOS[k % EVIDENCE_PHOTOS.length];
          const evTitle = t.title(zone);
          const hh = 6 + Math.floor(i * 0.8);
          const evTime = `${hh.toString().padStart(2, '0')}:${(10 + rnd(49)).toString().padStart(2, '0')}`;
          const beforeTime = `${Math.max(0, hh - 2).toString().padStart(2, '0')}:${(5 + rnd(50)).toString().padStart(2, '0')}`;
          const afterTime = `${Math.min(23, hh + 2).toString().padStart(2, '0')}:${(5 + rnd(50)).toString().padStart(2, '0')}`;
          // Link this evidence entry to the incident the response site is
          // built around (same list the map's incident pins use), so the
          // sheet's incident block agrees with what's plotted on the map.
          const linked = incidents[k % incidents.length];
          const inspector = DRIVERS[(index + k + 5) % DRIVERS.length];
          const jitter = () => (rnd(41) - 20) / 100000; // ~±22 m
          const outcome = OUTCOMES[(index + k) % OUTCOMES.length];
          const checklist = [
            { label: 'Drain / storm inlet cleared', done: true },
            { label: 'Area cordoned during works', done: true },
            { label: 'Residual water fully cleared', done: outcome === 'Resolved' },
          ];
          // Assessment figures hoisted so the "Notes" block's second
          // paragraph (the pump-run summary the Figma frame's body copy slot
          // wants) quotes exactly the numbers the Assessment block shows.
          const evWaterExtracted = `${(300 + rnd(900)).toLocaleString()} L`;
          const evPumpCycles = 2 + rnd(6);
          const evTimeOnSite = `${8 + rnd(40)} mins`;
          // Note pool keyed by outcome — the Figma frame prints the note and
          // the pump-run summary as consecutive paragraphs, so a "residual
          // pocket remains" note under a "Resolved" outcome now reads as a
          // contradiction (it used to sit far from the outcome chip).
          const notePool = outcome === 'Resolved'
            ? [ASSESSMENT_NOTES[0], ASSESSMENT_NOTES[3]]
            : outcome === 'Partially Resolved'
              ? [ASSESSMENT_NOTES[1]]
              : [ASSESSMENT_NOTES[2]];
          const evNote = notePool[(index + k) % notePool.length];
          const evPumpSummary = `Pump run logged ${evWaterExtracted} extracted over ${evPumpCycles} cycle${evPumpCycles === 1 ? '' : 's'}, ${evTimeOnSite} on site. ${outcome === 'Resolved' ? 'Closing check found no residual water; all closure checklist items signed off.' : outcome === 'Partially Resolved' ? 'Closing check found residual water at the low point; the residual-water checklist item remains open.' : 'Closing check flagged a follow-up pass; the residual-water checklist item remains open.'}`;
          // The Collection Points row this evidence set belongs to — same
          // index basis as `linked`, so the sheet's "Collection Point" meta
          // row matches the table and the map pin.
          const linkedCp = collectionPoints[k % collectionPoints.length];
          return [`${row.id}-ev-${i}`, {
            title: evTitle,
            time: evTime,
            location: `${zone}, Qatar`,
            eta: `Planned ETA: ${(row.startAt.split(/ (?=\d)/)[0] || 'Today')}`,
            beforeUrl: before,
            afterUrl: after,
            fillDelta: `${t.kind === 'collected' && evTitle.includes('Discharge') ? '−' : '+'}${(300 + rnd(900)).toLocaleString()} L`,
            duration: `${8 + rnd(40)} mins`,
            incident: {
              id: linked.id,
              title: linked.title,
              reportedBy: REPORTER_ROLES[(index + k) % REPORTER_ROLES.length] === 'Sensor' ? `Storm Drain Sensor ${100 + (k % 9)}` : DRIVERS[(index * 3 + k) % DRIVERS.length],
              reportedByRole: REPORTER_ROLES[(index + k) % REPORTER_ROLES.length],
              reportedAt: linked.time,
              severity: SEVERITIES[(index + k * 2) % SEVERITIES.length],
              zone: `Z-${1200 + (index % 40)}`,
              address: `${zone}, Site ${String.fromCharCode(65 + (k % 6))}${5 + k}, Qatar`,
              waterDepth: `≈ ${10 + rnd(35)} cm`,
              affectedArea: `≈ ${80 + rnd(400)} m²`,
            },
            beforeCaption: `Before (${beforeTime})`,
            afterCaption: `After (${afterTime})`,
            beforeGeo: { lat: linked.position[0] + jitter(), lng: linked.position[1] + jitter() },
            afterGeo: { lat: linked.position[0] + jitter(), lng: linked.position[1] + jitter() },
            assessment: {
              outcome,
              waterExtracted: evWaterExtracted,
              pumpCycles: evPumpCycles,
              timeOnSite: evTimeOnSite,
              inspector,
              note: evNote,
              checklist,
            },
            verification: {
              verifiedBy: inspector,
              verifiedAt: afterTime,
              photoCount: 2 + rnd(4),
            },
            /* ── Figma "Closure Evidence" (321-37678) surface ──────────── */
            recordType: 'Collection Point',
            statusLabel: 'Completed',
            collectionPoint: linkedCp.site,
            reportedOn: `${linked.time} · ${evDate}`,
            shiftTime: shiftWindow,
            vehicleId: row.vehicle,
            position: linked.position,
            zonePoints: zoneBox(anchor),
            locationLabel: `${zoneDef.name}, ${evMunicipality}`,
            notes: [evNote, evPumpSummary],
          }];
        }),
    ),
    logDate: (row.startAt.split(/ (?=\d)/)[0] || 'Today').toUpperCase(),
    route, plannedRoute, depotPos, dischargePos, center: recAnchor,
    serviceLocations: [],
    /* ── FM-6354 map interactivity: event-pin layers, geozones, zone overlay ── */
    shiftDetail: (() => {
      const name = row.shift.replace(' Shift', '');
      const [plannedStart, plannedEnd] = name === 'Night' ? ['09:00 PM', '05:00 AM'] : name === 'Afternoon' ? ['01:00 PM', '09:00 PM'] : ['05:00 AM', '01:00 PM'];
      const startLate = rnd(10) > 6;
      const endLate = rnd(10) > 7;
      const bump = (t: string, mins: number) => {
        const m = /^(\d{2}):(\d{2}) (AM|PM)$/.exec(t);
        if (!m) return t;
        const total = ((Number(m[1]) % 12) + (m[3] === 'PM' ? 12 : 0)) * 60 + Number(m[2]) + mins;
        const hh = ((Math.floor(total / 60) % 24) + 24) % 24;
        const h12 = hh % 12 === 0 ? 12 : hh % 12;
        return `${String(h12).padStart(2, '0')}:${String(total % 60).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
      };
      return {
        label: `${name} Shift`,
        actualStart: startLate ? bump(plannedStart, 15 + rnd(45)) : plannedStart,
        plannedStart,
        actualEnd: endLate ? bump(plannedEnd, 10 + rnd(50)) : bump(plannedEnd, -rnd(20)),
        plannedEnd,
        startLate, endLate,
      };
    })(),
    // Event pins sit ON the recorded track (pump runs at the response sites the
    // tanker actually stopped at, the discharge at the station itself).
    mapLayers: [
      { id: 'pumps', label: 'Pump Runs', color: 'var(--status-info)', markers: sitePos.slice(0, 3).map((p, i) => ({ id: `pump-${i}`, position: p, label: `Pump Run · Site ${String.fromCharCode(65 + i)}${i + 5}` })) },
      { id: 'discharges', label: 'Discharges', color: OK, markers: [{ id: 'dis-0', position: dischargePos, label: 'Verified Discharge · Station Weighbridge' }] },
      { id: 'alerts', label: 'Alerts / Exceptions', color: WARN, markers: [{ id: 'al-0', position: onTrack(0.42), label: 'Over Speeding · 132 km/h' }] },
    ],
    // Flood / standing-water reports inside the assigned zone — the reason the
    // run exists; the actual track visits each of them (computed above so the
    // evidence payloads can link to the same incidents).
    incidents,
    collectionPoints,
    geozones: [
      { id: 'gz-depot', center: depotPos, radius: 350, color: OK, label: 'Depot Geozone' },
      { id: 'gz-assembly', center: assemblyPos, radius: 300, color: 'var(--status-info)', label: 'Assembly Point Geozone' },
      { id: 'gz-discharge', center: dischargePos, radius: 450, color: WARN, label: 'Discharge Point Geozone' },
    ],
    // Overlay anchored on the SAME center the sites are placed around (the
    // live record's own coordinates when it has them), so the incident pins
    // always fall inside the drawn polygon.
    zoneOverlay: [{ id: `ov-${zoneDef.id}`, points: zoneBox(anchor), color: 'var(--status-info)', label: `${zoneDef.name} — Assigned Zone` }],
    assemblyPos,
    assemblyPoint: `${zoneDef.name} Assembly Point, Qatar`,
    // Live tanker position: end of trail when done, mid-trail while ongoing.
    vehicle: { position: plannedRoute[plannedRoute.length - 1], label: row.vehicle },
    breakdown: [
      { label: 'Shift Compliance', valueText: 'Operated within shift hours', pct: 100, color: OK },
      { label: 'Start Time', valueText: 'Actual vs planned start', pct: 70 + rnd(30), color: rnd(10) > 6 ? ERR : OK },
      { label: 'End Time', valueText: 'Actual vs planned end', pct: 65 + rnd(35), color: rnd(10) > 7 ? WARN : OK },
      { label: 'Distance Travelled', valueText: `${20 + rnd(60)}km / ${60 + rnd(50)}km`, pct: 60 + rnd(40), color: WARN },
    ],
    eventChart: {
      title: 'Schedule Event Type Breakdown', xKey: 'h',
      series: [
        { dataKey: 'pumps', name: 'Pump Runs', color: 'var(--status-info)' },
        { dataKey: 'discharges', name: 'Discharges', color: OK },
        { dataKey: 'over', name: 'Overspeeding', color: PURPLE },
        { dataKey: 'idle', name: 'Idling', color: WARN },
      ],
      data: Array.from({ length: 11 }, (_, i) => ({
        h: `${String(i).padStart(2, '0')}:00`,
        pumps: 2 + rnd(8), discharges: rnd(4), over: rnd(3), idle: 1 + rnd(4),
      })),
    },
    offPlanBreakdown: {
      title: 'Off-Plan Response Sites', total: offPlanTotal, totalLabel: 'Total Sites',
      slices: [
        { name: 'Registered Sites', value: registered, color: 'var(--chart-2)' },
        { name: 'Unregistered Sites', value: unregistered, color: 'var(--chart-3)' },
        { name: 'Unlogged Response', value: Math.max(unlogged, 0), color: 'var(--chart-5)' },
      ],
    },
    volumeBreakdown: { title: 'Water Extraction Volume', icon: <Icons.Droplets02 size={16} />, label: `${extractedL.toLocaleString()} L`, doneText: `${extractedL.toLocaleString()} / ${allowedL.toLocaleString()} L`, pct: Math.min(96, Math.round((extractedL / allowedL) * 100)) },
    weightTrend: (() => {
      // Tells the real shift story: load climbs as the crew pumps at
      // response sites, drops sharply the moment they discharge at the
      // station (`dischargeIdx`, aligned to the SAME "Discharge Verified"
      // event the Plan Log shows via `dischargeAt`), then climbs again as
      // pumping resumes for the rest of the shift.
      const limitTons = Math.round(allowedL / 100) / 10;
      const peakTons = Math.round(Math.min(limitTons * 0.94, (extractedL / 1000) * 0.75) * 10) / 10;
      const dischargeHour = dischargeAt ? Number(dischargeAt.slice(0, 2)) : 13;
      const dischargeIdx = Math.min(9, Math.max(2, Math.round(dischargeHour / 2)));
      const dropTons = Math.round(peakTons * 0.15 * 10) / 10;
      const finalTons = Math.max(dropTons + 0.2, Math.round((extractedL / 1000) * 0.5 * 10) / 10);
      const data = Array.from({ length: 12 }, (_, i) => {
        const t = `${(i * 2).toString().padStart(2, '0')}:00`;
        if (i < dischargeIdx) return { t, v: Math.round(peakTons * Math.min(1, (i + 1) / dischargeIdx) * 10) / 10 };
        if (i === dischargeIdx) return { t, v: dropTons };
        const tail = (i - dischargeIdx) / Math.max(1, 11 - dischargeIdx);
        return { t, v: Math.round((dropTons + (finalTons - dropTons) * tail) * 10) / 10 };
      });
      return {
        title: 'Water Extraction Trend', seriesName: 'Water Extracted (tons)', color: 'var(--status-info)', limit: limitTons, limitLabel: 'Allowed Tanker Load',
        data,
        markers: [{ t: data[dischargeIdx].t, label: 'Discharge' }],
      };
    })(),
    grossWeight: {
      title: 'Water Volume — Extracted vs Discharged', timestamp: `${row.startAt}`, discrepancyPct: `${(2 + rnd(8)).toFixed(1)}%`, weightDiff: `−${20 + rnd(180)} L`, withinTolerance: rnd(10) > 1,
      collected: { label: 'Extracted Volume', value: `${extractedL.toLocaleString()} L`, pct: 90 + rnd(10) },
      received: { label: 'Discharged at Station', value: `${(extractedL - 40 - rnd(160)).toLocaleString()} L`, pct: 100 },
    },
    collectionTrend: {
      // Figma 3092:2822 "Bin Collection Trend" flood-equivalent — renamed so it
      // no longer duplicates the Weight-trend widget's title (3092:2691) above.
      title: 'Response Completion Trend', xKey: 't', series: [{ dataKey: 'sites', name: 'Response Sites Completed', color: OK }],
      data: Array.from({ length: 12 }, (_, i) => ({ t: `${(i * 2).toString().padStart(2, '0')}:00`, sites: Math.round(doneSites * Math.min(1, (i + 1) / 10)) })),
    },
  };
}

/*
 * 2026-08-31 scope addition — Plan Monitoring gains a second tab, "Hybrid
 * View", built by reusing Smart Planning's OWN `InteractivePlanning`
 * list+map component (its own doc: "any Smart-City planning service ...
 * adapts by config") — same list<->map/eye-toggle interplay as SP's Hybrid
 * View, fed RUN data instead of PLAN data. Its "Create New Plan" button is
 * suppressed (`showCreateButton={false}`) — this view monitors runs, it
 * doesn't create plans, matching PM's own List View having no create
 * affordance either.
 */
const PM_STATUS_STYLES: Record<string, StatusStyle> = {
  SCHEDULED: { tone: 'var(--status-warning)', filled: true },
  ONGOING: { tone: 'var(--status-info)', filled: true },
  COMPLETED: { tone: 'var(--status-success)', filled: true },
};
// Zone footprints for PM's Hybrid View — the SAME zone geometry as Smart
// Planning's `ZONES` (cross-view interlink identity), `covered` recomputed
// per-zone from whether any run against it is underway/done (matches PM's
// own "In Progress / Done" vs "Not Yet Dispatched" legend below).
const PM_ZONE_NAMES = Array.from(new Set(PM_ROWS.flatMap((r) => r.locations)));
const PM_ZONES: PlanZone[] = ZONE_DEFS
  .filter((z) => PM_ZONE_NAMES.includes(z.name))
  .map((z) => ({
    id: `pm-${z.id}`, name: z.name, points: zoneBox(z.center),
    covered: PM_ROWS.some((r) => r.locations.includes(z.name) && r.status !== 'SCHEDULED'),
  }));
const PM_ZONE_CENTER: Record<string, [number, number]> = Object.fromEntries(ZONE_DEFS.map((z) => [z.name, z.center]));
// One site marker per run, positioned inside its (first) service zone —
// "planned" (green) once a run has started (ONGOING/COMPLETED), "unplanned"
// (red, via the map's own legend) while still SCHEDULED, i.e. not yet
// dispatched. Same 2-way simplification the zone coverage layer models.
const PM_BINS: PlanBin[] = PM_ROWS.map((r, i) => {
  const [lat, lng] = PM_ZONE_CENTER[r.locations[0]] ?? DOHA_CENTER;
  return {
    id: `pmsite-${i}`,
    position: [lat + ((i % 5) - 2) * 0.004, lng + (Math.floor(i / 5) - 1) * 0.004] as [number, number],
    planned: r.status !== 'SCHEDULED',
  };
});
const PM_HYBRID_ROWS: PlanRow[] = PM_ROWS.map((r, i) => ({
  id: `pm-${i}`,
  serviceType: r.serviceType,
  wasteType: r.wasteType,
  vehicle: r.vehicle,
  status: r.status,
  visible: true,
}));

/* ------------------------------------------------------------------------ */
/* Plan Monitoring ← daily-plan ENTITY records (2026-08-31 coordinator flag)  */
/*                                                                            */
/* The host shell owns the `plan-monitoring/daily-plan` entity module (FPL    */
/* records: seeds + tasks auto-created from Requests & Complaints tanker      */
/* assignment, commits 2591606/5ba7ac6/8e50409). This embed is the LIVE list  */
/* surface on the /plan-monitoring route, so the host posts those records in  */
/* (`uccp:pm-records`, replied to our `uccp:pm-ready` handshake) and every    */
/* Plan Monitoring view renders FROM them — the static PM_ROWS survive only   */
/* as the standalone (:6370, no host) fallback. A `record=` query param       */
/* (host deep link, e.g. a ticket's "Linked Schedule/Plan" LinkView) opens    */
/* the full-screen detail for that record directly, and the detail's Source   */
/* Request chip posts `uccp:navigate` back up to open the originating ticket. */
/* ------------------------------------------------------------------------ */
interface PmEntityRecord {
  id?: string; uniqueidentifier?: string; title?: string; status?: string;
  source_request?: string; plan_date?: string; lat?: number; lng?: number;
  [key: string]: unknown;
}
const PM_ENTITY_STATUS: Record<string, string> = { Scheduled: 'SCHEDULED', Executing: 'ONGOING', Completed: 'COMPLETED' };
function pmRowFromRecord(rec: PmEntityRecord, i: number): PlanMonitorRow {
  const s = (k: string) => (typeof rec[k] === 'string' ? (rec[k] as string) : '');
  const n = (k: string) => (rec[k] == null || rec[k] === '' ? undefined : Number(rec[k]));
  const date = s('plan_date');
  return {
    id: rec.uniqueidentifier ?? rec.id ?? `FPL-${i}`,
    serviceType: 'Flood Response',
    // Request-triggered tanker dispatches are water-extraction work; seeded
    // scheduled runs keep the rotating job-type vocabulary the list had.
    wasteType: rec.source_request ? 'Water Extraction' : JOB_TYPES[i % JOB_TYPES.length],
    title: rec.title ?? '',
    vehicle: s('systemcol4'),
    driver: s('systemcol5'),
    shift: `${s('systemcol7') || 'Morning'} Shift`,
    locations: [s('systemcol2') || s('systemcol3') || 'Doha'],
    startAt: `${date} ${s('systemcol8')}`.trim(),
    endAt: `${date} ${s('systemcol9')}`.trim(),
    status: PM_ENTITY_STATUS[s('status')] ?? 'SCHEDULED',
    progressDone: n('systemcol10') ?? 0,
    progressTotal: n('systemcol11') ?? 0,
    compliancePct: n('systemcol12') || undefined,
  };
}
function usePmEntityRows(): { rows: PlanMonitorRow[]; byId: Record<string, PmEntityRecord> } | null {
  const [state, setState] = React.useState<{ rows: PlanMonitorRow[]; byId: Record<string, PmEntityRecord> } | null>(null);
  React.useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; records?: PmEntityRecord[] } | null;
      if (!d || d.type !== 'uccp:pm-records' || !Array.isArray(d.records)) return;
      const byId: Record<string, PmEntityRecord> = {};
      const rows = d.records.map((rec, i) => { const row = pmRowFromRecord(rec, i); byId[row.id] = rec; return row; });
      setState({ rows, byId });
    };
    window.addEventListener('message', onMsg);
    // Handshake — covers both mount orders (host fetch finishing before or
    // after this embed boots): the host replies to `uccp:pm-ready` AND posts
    // once on its own when its fetch lands.
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'uccp:pm-ready' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return state;
}

function PlanMonitoringScreen() {
  const embed = isEmbedMode();
  // 2026-08-31 plan-detail rebuild: opening a plan from List View or Hybrid
  // View navigates straight into the full-screen single-plan detail (Figma
  // fTNUZHTxIZxNlBKq3aw2hk) — no intermediate day-picker `overview` screen
  // in that path anymore (kept reachable only as a fallback if `detailRow`
  // is unset, so nothing else regresses).
  const [screen, setScreen] = React.useState<'list' | 'overview' | 'detail'>('list');
  const [detailRow, setDetailRow] = React.useState<{ row: PlanMonitorRow; index: number } | null>(null);
  const [view, setView] = React.useState<'list' | 'hybrid'>(() => (embedViewParam() === 'hybrid' ? 'hybrid' : 'list'));
  // Entity-record data plane (see the block comment above `usePmEntityRows`) —
  // live FPL records when the host has posted them, static fallback otherwise.
  const entity = usePmEntityRows();
  const rows = entity && entity.rows.length ? entity.rows : PM_ROWS;
  const derivedHybrid = React.useMemo<PlanRow[]>(
    () => rows.map((r, i) => ({ id: `pm-${i}`, serviceType: r.serviceType, wasteType: r.wasteType, vehicle: r.vehicle, status: r.status, visible: true })),
    [rows],
  );
  const pmZones = React.useMemo<PlanZone[]>(() => {
    if (!entity || !entity.rows.length) return PM_ZONES;
    return ZONE_DEFS.map((z) => ({
      id: `pm-${z.id}`, name: z.name, points: zoneBox(z.center),
      covered: rows.some((r) => r.locations.some((l) => l.includes(z.name) || z.name.includes(l)) && r.status !== 'SCHEDULED'),
    }));
  }, [entity, rows]);
  const pmBins = React.useMemo<PlanBin[]>(() => {
    if (!entity || !entity.rows.length) return PM_BINS;
    return rows.map((r, i) => {
      const rec = entity.byId[r.id];
      const pos: [number, number] = rec && typeof rec.lat === 'number' && typeof rec.lng === 'number' ? [rec.lat, rec.lng] : DOHA_CENTER;
      return { id: `pmsite-${i}`, position: pos, planned: r.status !== 'SCHEDULED' };
    });
  }, [entity, rows]);
  const [hybridRows, setHybridRows] = React.useState<PlanRow[]>(derivedHybrid);
  React.useEffect(() => { setHybridRows(derivedHybrid); }, [derivedHybrid]);
  const openDetail = React.useCallback((row: PlanMonitorRow) => {
    setDetailRow({ row, index: rows.findIndex((r) => r.id === row.id) });
    setScreen('detail');
  }, [rows]);
  // Host deep link (`record=FPL-…`) — e.g. a ticket's "Linked Schedule/Plan"
  // LinkView — opens the full-screen detail for that record directly.
  const deepLinkRecord = React.useMemo(() => new URLSearchParams(window.location.search).get('record'), []);
  const deepLinkDone = React.useRef(false);
  React.useEffect(() => {
    if (!deepLinkRecord || deepLinkDone.current) return;
    const row = rows.find((r) => r.id === deepLinkRecord);
    if (!row) return;
    deepLinkDone.current = true;
    openDetail(row);
  }, [deepLinkRecord, rows, openDetail]);
  if (screen === 'overview') return <PlanOverview data={PM_OVERVIEW} onBack={() => setScreen('list')} onOpenDay={() => setScreen('detail')} />;
  if (screen === 'detail') {
    const rec = detailRow ? entity?.byId[detailRow.row.id] : undefined;
    const data = detailRow ? synthesizePlanDetail(detailRow.row, Math.max(detailRow.index, 0), rec) : undefined;
    return (
      <PlanMonitoringDetail
        data={data}
        onBack={() => { setDetailRow(null); setScreen('list'); }}
        // FM-6354: each job order carries before/after photos — the demo has
        // no evidence store, so the link acknowledges instead of dead-ending.
        onEvidence={(id) => toast.success('Evidence', { description: `Before/after photos for ${id} open here (photo store lands with the driver app).` })}
      />
    );
  }
  const tabs: { id: 'list' | 'hybrid'; label: string }[] = [{ id: 'list', label: 'List View' }, { id: 'hybrid', label: 'Hybrid View' }];
  return (
    <div style={{ height: '100vh' }} className="flex flex-col">
      {!embed && (
        <div className="flex h-12 items-stretch border-b border-border bg-muted/40">
          <span className="flex items-center px-4 text-body font-semibold text-foreground">Plan Monitoring</span>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setView(t.id)}
              className={`h-full shrink-0 items-center border-s border-border p-3 text-body-xs font-semibold text-card-foreground last:border-e hover:bg-card/60 ${view === t.id ? 'bg-card shadow-[inset_0_-2px_0_0_var(--color-primary)]' : ''}`}
            >
              {t.label}
            </button>
          ))}
          <button type="button" aria-label="Add view" className="h-full w-12 shrink-0 rounded-sm text-gray-600 hover:bg-card/60">+</button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        {view === 'list' ? (
          <PlanMonitoring rows={rows} statusStyles={PM_STATUS_STYLES} wasteStyles={JOB_STYLES} labels={PLANNING_LABELS} serviceIcon={SERVICE_ICON} onOpen={openDetail} />
        ) : (
          <InteractivePlanning
            plans={hybridRows}
            zones={pmZones}
            bins={pmBins}
            center={DOHA_CENTER}
            zoom={10}
            statusStyles={PM_STATUS_STYLES}
            labels={PLANNING_LABELS}
            serviceIcon={SERVICE_ICON}
            showCreateButton={false}
            legendLabels={{ planned: 'In Progress / Done', unplanned: 'Not Yet Dispatched' }}
            onOpenPlan={(id) => { const i = hybridRows.findIndex((r) => r.id === id); if (i >= 0 && rows[i]) openDetail(rows[i]); }}
            onToggleVisible={(id, v) => setHybridRows((cur) => cur.map((p) => (p.id === id ? { ...p, visible: v } : p)))}
          />
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Hash router                                                             */
/* ---------------------------------------------------------------------- */

function useHashRoute() {
  const [hash, setHash] = React.useState(() => window.location.hash || '#/smart-planning');
  React.useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/smart-planning');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHashRoute();
  const screen = hash.includes('plan-monitoring') ? 'plan-monitoring' : 'smart-planning';
  return (
    <>
      {screen === 'plan-monitoring' ? <PlanMonitoringScreen /> : <SmartPlanningScreen />}
      <Toaster position="bottom-right" richColors />
    </>
  );
}
