import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Badge, Button, Input, Sheet, SheetContent, SheetHeader, SheetTitle } from '../primitives';
import { LeafletMap } from '../map';
import type { LatLng } from '../map';
// DS "Map POI Icons" (fams-design-system/assets/icons/POI Icons) — committed
// SVG pin art copied verbatim from the design system (the Figma asset URLs
// expire): depot = "POI Depot" teardrop pin, assembly = "POI - Icon Assembly
// Point" badge pin, discharge = "POI - Water Discharge Station" badge pin.
// site = the job/incident-site marker, following the DS's generic teardrop
// pin-frame + glyph pattern (no dedicated "job site" POI exists in the DS yet).
import depotPinUrl from '../map/poi-pins/depot.svg';
import assemblyPinUrl from '../map/poi-pins/assembly.svg';
import dischargePinUrl from '../map/poi-pins/discharge.svg';
import sitePinUrl from '../map/poi-pins/site.svg';
import { ComplianceGauge, BarChart, AreaChart, LineChart } from '../data-viz';
import { ChangeResourceSheet } from './change-resource-sheet';
import type { ResourceOption } from './change-resource-sheet';

/**
 * PlanMonitoringDetail — the Plan Monitoring FULL-SCREEN detail.
 *
 * 2026-08-31 rebuild (FM plan-detail rebuild task) — re-matched section-by-
 * section to Figma "Tadweer — November Release" (fTNUZHTxIZxNlBKq3aw2hk),
 * container 3092:1494, top-to-bottom sequence:
 *   3092:1517 top bar · 3092:1537 KPI band · 3092:1982 Plan Log + replay map ·
 *   3092:2370 analytics container, children in reading order —
 *     6049:7424 (Compliance Breakdown + Event Type Breakdown row),
 *     3092:2691 (Weight Collection Trend), 3092:2437 (Outside-Plan donut),
 *     3092:2769 (Gross Weight Collected vs Received), 3092:2481 (Bin
 *     Breakdown bar), 3092:2822 (Bin Collection Trend, full-width).
 * The frame has NO per-service-location card grid between the map and the
 * analytics container — dropped here to match the frame's exact order
 * (previously sat between them; superseded, not deleted — see git history).
 * Frame's 2-column masonry (narrow left: breakdown/donut/bar; wide right:
 * event chart/weight trend/gross weight; full-width bottom: collection
 * trend) is reproduced by the `lg:grid-cols-3` + `lg:col-span-2` split below.
 *
 * Waste-specific reference widgets replaced with flood-equivalents per
 * Design-Lead judgment (rule: "plus minus" adaptation after the map/log
 * widget) — "Outside Plan Bins Collected" → "Off-Plan Response Sites",
 * "Bin Breakdown" (litres bar) → "Water Extraction Volume", "Bin Collection
 * Trend" → "Water Extraction Trend". Structure/anatomy kept 1:1.
 *
 * NOT a side sheet — full-screen, config-driven via a `data` prop
 * (frame-matching defaults). Brand law: Qatar MME maroon → FAMS `--primary`
 * on ACTIONS only; green/amber/red/info reserved for genuine status/semantic
 * meaning (see `INFO` role-separation note below).
 */

/* ── data model (all optional — frame-matching defaults below) ───────────── */
export interface PlanLogEvent {
  time: string; kind: 'start' | 'alert' | 'service' | 'collected' | 'done'; title: string; sub?: string; sub2?: string;
  /** Zone/geofence reference line (Figma 2007:96728's "Z-1234" row). */
  zone?: string;
  /** Planned-ETA line (Figma 2007:96728's clock row). */
  eta?: string;
  /** Optional evidence reference — when set (and the consumer passes
   *  `onEvidence`), the log row renders a "View Evidence →" link (Figma
   *  Plan Log anatomy). Additive; omit for the existing behaviour. */
  evidenceId?: string;
  /** Tab bucket for the Plan Log filter tabs (matched against a tab id
   *  other than 'all'). Uncategorized events only appear under 'All'. */
  category?: string;
}
/** One row of the "Collection Points" table (2026-09-04) — a flood response
 *  site this vehicle serviced during the plan/shift. See
 *  `PlanMonitoringDetailData.collectionPoints`. */
export interface CollectionPoint {
  site: string;
  address: string;
  incidentId: string;
  zone: string;
  arrived: string;
  departed: string;
  timeOnSite: string;
  waterExtractedL: number;
  pumpCycles: number;
  status: 'Completed' | 'Partial' | 'Skipped';
}
export interface ServiceLocationDetail {
  name: string; code: string; status: string; compliancePct: number;
  window: string; distance: string; revenue: string; bins: number; waste: string; ptoLifts: number;
  cbmDone: number; cbmTotal: number;
  contact: string; email: string; phone: string; signed: boolean; emiratesId: boolean; description: string;
}
export interface PlanMonitoringDetailData {
  id: string; title: string; contractor: string; locations: string[]; status: string;
  compliancePct: number;
  compactor: string; driver: string; helpers: string[]; depot: string; discharge: string;
  serviceType: string; distance: string; wasteCollected: string; shift: string;
  ptoLifts: number; fuelCost: string; avgTime: string; idleTime: string;
  collectionStats: { label: string; value: number; color: string }[];
  planLog: PlanLogEvent[];
  route: LatLng[]; plannedRoute?: LatLng[]; depotPos: LatLng; dischargePos: LatLng; center: LatLng;
  serviceLocations: ServiceLocationDetail[];
  /* ── Figma 694-5357 additions (all optional — legacy fallbacks kept) ──── */
  /** Plan Log filter tabs (defaults to All / Critical Events / Reported Issues). */
  logTabs?: { id: string; label: string }[];
  /** Date group header shown above the log events (e.g. '25 AUG, 26'). */
  logDate?: string;
  /** Second header row of the KPI band; replaces the built-in bin-collection row. */
  statsRow?: { icon: React.ReactNode; label: string; value: React.ReactNode; iconColor?: string }[];
  /** Compliance Break Down rows (label + colored value + bar), Figma anatomy. */
  breakdown?: { label: string; valueText: string; pct: number; color: string }[];
  /** Stacked event-type breakdown chart. */
  eventChart?: { title: string; data: Record<string, any>[]; xKey: string; series: { dataKey: string; name: string; color: string }[] };
  /** Full-width collection trend line vs a dashed allowed-limit line.
   *  `markers` annotate events that break the trend (e.g. a mid-shift
   *  discharge stop — the load drops, then climbs again) — rendered as
   *  vertical reference lines on the chart, aligned to the Plan Log's own
   *  event time so the chart and the log agree. */
  weightTrend?: { title: string; seriesName: string; data: { t: string; v: number }[]; limit?: number; limitLabel?: string; color?: string; markers?: { t: string; label: string }[] };
  /** Gross weight reconciliation strip + two bars. */
  grossWeight?: { title: string; timestamp: string; discrepancyPct: string; weightDiff: string; withinTolerance: boolean; collected: { label: string; value: string; pct: number }; received: { label: string; value: string; pct: number } };
  /** Bottom multi-series collection trend. */
  collectionTrend?: { title: string; data: Record<string, any>[]; xKey: string; series: { dataKey: string; name: string; color: string }[] };
  /** Figma 3092:2437 "Outside Plan Bins Collected" flood-equivalent — donut
   *  breakdown of response sites worked outside the planned schedule.
   *  2026-09-04 feedback ("remove off plan response sites, add a collection
   *  points table") — superseded by `collectionPoints` below and no longer
   *  rendered in this screen; kept optional so existing data/snapshots that
   *  still set it don't break the type. */
  offPlanBreakdown?: { title: string; total: number; totalLabel: string; slices: { name: string; value: number; color: string }[] };
  /** 2026-09-04 replacement for `offPlanBreakdown` — every flood collection
   *  point (response site) this vehicle served during the plan/shift, table
   *  form (Figma "Collection Points" card, same slot the donut used to sit
   *  in). Derived deterministically in `synthesizePlanDetail` from the same
   *  site-stop/incident/pump-run chain the map and Plan Log already use, so
   *  times line up with the log and totals line up with the "Water
   *  Extracted" KPI. Optional — falls back to the donut when absent (neither
   *  card renders once both are gone from a caller's data). */
  collectionPoints?: CollectionPoint[];
  /** Figma 3092:2481 "Bin Breakdown" flood-equivalent — single labeled
   *  volume bar (e.g. total water extracted vs a target). */
  volumeBreakdown?: { title: string; icon: React.ReactNode; label: string; doneText: string; pct: number };
  /** Header org/municipality badge (Figma 3092:1517 "BEEAH" chip). */
  municipality?: string;
  /** Header lot/zone badge (Figma 3092:1517 "Lot 1" chip). */
  zoneTeam?: string;
  /** 2026-08-31 coordinator directive — the daily plan's originating
   *  Requests & Complaints ticket (`source_request` on the FPL entity
   *  record). Rendered as a link chip in the top bar; `onOpen` navigates
   *  the HOST shell to that ticket (posted up via the embed bridge). */
  sourceRequest?: { id: string; onOpen?: () => void };
  /* ── 2026-09-02 Figma-parity rebuild (FM-6354) ─────────────────────────── */
  /** Shift card with actual-vs-planned start/end coloring (Figma 3092:1537's
   *  "Morning Shift 04:30 AM / 04:30 AM – 01:30 AM / 12:30 AM"). When set it
   *  replaces the plain `shift` cell. */
  shiftDetail?: { label: string; actualStart: string; plannedStart: string; actualEnd: string; plannedEnd: string; startLate?: boolean; endLate?: boolean };
  /** Toggleable event-pin layers over the replay map (Figma 3092:1982's
   *  checkbox legend, flood-adapted: Pump Runs / Discharges / Alerts). Each
   *  layer's markers show/hide from its legend checkbox. */
  mapLayers?: { id: string; label: string; color: string; markers: { id: string; position: LatLng; label?: string }[] }[];
  /** Geofence rings for depot / assembly point / discharge point (FM-6354:
   *  "depot, assembly point and discharge point markers with their geozones"). */
  geozones?: { id: string; center: LatLng; radius: number; color: string; label: string }[];
  /** Zone overlay polygon(s) with a legend toggle (FM-6354's "zone overlay with toggle"). */
  zoneOverlay?: { id: string; points: LatLng[]; color?: string; label?: string }[];
  /** Assembly-point position (FM-6354) — rendered as the DS flag POI pin. */
  assemblyPos?: LatLng;
  /** Assembly-point display name (2026-09-04, e.g. "West Bay Assembly
   *  Point") — zone-derived, same pattern as `depot`/`discharge`. Powers the
   *  KPI band's "Assembly Point" StatCard; the card's sub-line reads the
   *  "Reached Assembly Point" Plan Log event's own time so the two agree. */
  assemblyPoint?: string;
  /** Live vehicle marker (FM-6354's "live GPS position") — plate label + position. */
  vehicle?: { position: LatLng; label: string };
  /** Flood / standing-water reports inside the assigned zone — the incidents
   *  the run responds to. Rendered as an extra toggleable pin layer next to
   *  `mapLayers` (legend label "Incidents", on by default), each pin
   *  tooltipped with its id, title and report time. */
  incidents?: { id: string; position: LatLng; title: string; time: string }[];
  /** Per-event evidence payloads keyed by `PlanLogEvent.evidenceId` — opens
   *  the built-in Evidence side sheet (Tadweer March 2007:98735 overlay).
   *  Events whose id is missing here fall back to the `onEvidence` prop. */
  evidence?: Record<string, EvidenceDetail>;
}

/** Evidence side-sheet payload (FM-6354: before/after photos, fill delta, duration).
 *  2026-09-04 feedback ("only shows 2 pictures — add incident details and
 *  before/after + assessment") — extended with optional incident, richer
 *  photo captions, an assessment block and a verification footer. All new
 *  fields are optional so existing callers/entries keep working unchanged. */
export interface EvidenceDetail {
  title: string;
  time: string;
  location?: string;
  eta?: string;
  beforeUrl: string;
  afterUrl: string;
  fillDelta?: string;
  duration?: string;
  /** Linked flood/standing-water incident this evidence responds to. */
  incident?: {
    id: string;
    title: string;
    reportedBy: string;
    reportedByRole: 'Resident' | 'Inspector' | 'Sensor';
    reportedAt: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    zone: string;
    address: string;
    waterDepth: string;
    affectedArea: string;
  };
  /** Photo captions/geotags shown under the Before/After grid. */
  beforeCaption?: string;
  afterCaption?: string;
  beforeGeo?: { lat: number; lng: number };
  afterGeo?: { lat: number; lng: number };
  /** Post-response assessment. */
  assessment?: {
    outcome: 'Resolved' | 'Partially Resolved' | 'Follow-up Required';
    waterExtracted: string;
    pumpCycles: number;
    timeOnSite: string;
    inspector: string;
    note: string;
    checklist: { label: string; done: boolean }[];
  };
  /** Compact verification footer. */
  verification?: { verifiedBy: string; verifiedAt: string; photoCount: number };
  /* ── Figma "Closure Evidence" (321-37678) additions ────────────────────
   *  The 2026-09-04 restyle turned the 420px sheet into a wide, page-like
   *  "Closure Evidence" surface: id/record-type pill group + status chip,
   *  a 2-column meta grid, a static location map, and a collapsible
   *  Evidence section (notes + photo strip + assessment). All optional —
   *  every field falls back to the pre-existing data below. */
  /** Record-type chip beside the id pill. Default 'COLLECTION POINT'. */
  recordType?: string;
  /** Status chip, header top-right (e.g. 'COMPLETED'). */
  statusLabel?: string;
  /** Meta grid — response site / collection point name. */
  collectionPoint?: string;
  /** Meta grid — incident report time + date ('08:12 AM · 25 AUG, 26'). */
  reportedOn?: string;
  /** Meta grid — the plan's shift window. */
  shiftTime?: string;
  /** Meta grid — tanker plate. */
  vehicleId?: string;
  /** Static location map — incident position (map centre + pin). */
  position?: LatLng;
  /** Static location map — assigned-zone polygon ring, drawn in warning. */
  zonePoints?: LatLng[];
  /** Floating map card value ('Msheireb, Doha'). */
  locationLabel?: string;
  /** Evidence notes — one paragraph per entry (assessment note first). */
  notes?: string[];
}

const P = 'var(--primary)';
const OK = 'var(--status-success)';
const WARN = 'var(--status-warning)';
const ERR = 'var(--status-error)';
const PURPLE = 'var(--chart-accent-purple)';
/*
 * 2026-08-31 role-separation fix (user-directed, round-3 corrective) —
 * `INFO` is the tenant-STABLE "active/info" status role (`--status-info`,
 * declared once in `tokens/theme.css`, never overridden by a tenant theme
 * file). `ONGOING`/"On Duty" resource statuses and the driver/contact
 * avatars below used to read `P` (`--primary`, brand chrome) directly — see
 * the identical fix + rationale in `plan-monitoring.tsx` above
 * `DEFAULT_STATUS`. `P` itself is UNCHANGED and stays correct for this
 * file's genuine brand/action uses (tab underline, active link, edit-pencil
 * hover — none of which this fix touches).
 */
const INFO = 'var(--status-info)';

const DEFAULT: PlanMonitoringDetailData = {
  id: 'PID-231454', title: 'Flood Response Plan Sector A Al Wakrah Lot 3', contractor: 'UCCP Operations Directorate',
  municipality: 'MME', zoneTeam: 'Lot 1',
  locations: ['Al Wakrah Corniche', 'Lusail Marina'], status: 'COMPLETED', compliancePct: 81,
  compactor: 'LMV-QA01', driver: 'Mohammed Al-Kuwari', helpers: ['I. K.', 'M. I.'], depot: 'Al Wakrah Depot, Qatar', discharge: 'Al Wakrah Discharge Point, Qatar', assemblyPoint: 'Al Wakrah Assembly Point, Qatar',
  serviceType: 'Flood Response', distance: '44 km', wasteCollected: '3,780 L', shift: '04:30 AM – 01:30 AM',
  ptoLifts: 18, fuelCost: 'QAR 19.44', avgTime: '1h 32m', idleTime: '18 mins',
  collectionStats: [
    { label: 'Total Planned Stops', value: 50, color: 'var(--foreground)' },
    { label: 'On-Plan Stops', value: 10, color: OK },
    { label: 'Off-Plan Stops', value: 10, color: WARN },
    { label: 'Unknown Stops', value: 16, color: PURPLE },
    { label: 'Unlogged Stops', value: 16, color: P },
    { label: 'Pending Stops', value: 30, color: ERR },
  ],
  planLog: [
    { time: '12:43 PM', kind: 'start', title: 'Started Plan', sub: 'DEPOT A, AL WAKRAH, QATAR' },
    { time: '12:43 PM', kind: 'alert', title: 'Over Speeding at 140 km/h', sub: 'SECTOR 12, AL WAKRAH, QATAR' },
    { time: '12:43 PM', kind: 'service', title: 'Service Started', sub: 'AL WAKRAH CORNICHE' },
    { time: '12:43 PM', kind: 'collected', title: 'Pump Run Logged', sub: '60 m³ · Site 12356/A7' },
    { time: '12:43 PM', kind: 'done', title: 'Service Completed', sub: 'AL WAKRAH CORNICHE', sub2: 'TIME SPENT: 14 MINS' },
    { time: '12:43 PM', kind: 'alert', title: 'Over Speeding at 140 km/h', sub: 'SECTOR 12, AL WAKRAH, QATAR' },
    { time: '12:43 PM', kind: 'collected', title: 'Pump Run Logged', sub: 'PLANNED ETA: 24 AUG, 26  12:43 PM' },
  ],
  route: [[25.19, 51.61], [25.17, 51.59], [25.15, 51.58], [25.16, 51.55], [25.18, 51.53]],
  plannedRoute: [[25.19, 51.61], [25.18, 51.58], [25.15, 51.56], [25.18, 51.53]],
  depotPos: [25.19, 51.61], dischargePos: [25.18, 51.53], center: [25.17, 51.57],
  serviceLocations: [
    { name: 'Lusail Marina', code: 'SL-2143A', status: 'COMPLETED', compliancePct: 81, window: '04:30 AM – 01:30 AM', distance: '22 km', revenue: 'QAR 3,200', bins: 23, waste: '1,780 L', ptoLifts: 9, cbmDone: 11, cbmTotal: 100, contact: 'Ali Hassan', email: 'ali.hassan1@gmail.com', phone: '+974 50 123 4567', signed: true, emiratesId: true, description: 'Lorem ipsum dolor sit amet consectetur. Bibendum cursus faucibus tincidunt turpis faucibus a nullam aliquam nisi.' },
    { name: 'Al Wakrah Corniche', code: 'SL-2143A', status: 'COMPLETED', compliancePct: 81, window: '04:30 AM – 01:30 AM', distance: '22 km', revenue: 'QAR 3,200', bins: 23, waste: '1,780 L', ptoLifts: 9, cbmDone: 11, cbmTotal: 100, contact: 'Ali Hassan', email: 'ali.hassan2@gmail.com', phone: '+974 50 123 4567', signed: true, emiratesId: true, description: 'Lorem ipsum dolor sit amet consectetur. Bibendum cursus faucibus tincidunt turpis faucibus a nullam aliquam nisi.' },
  ],
  offPlanBreakdown: {
    title: 'Off-Plan Response Sites', total: 16, totalLabel: 'Total Sites',
    slices: [
      { name: 'Registered Sites', value: 7, color: 'var(--chart-2)' },
      { name: 'Unregistered Sites', value: 5, color: 'var(--chart-3)' },
      { name: 'Unlogged Response', value: 4, color: 'var(--chart-5)' },
    ],
  },
  volumeBreakdown: { title: 'Water Extraction Volume', icon: <Icons.Droplets02 size={16} />, label: '3,780 L', doneText: '3,478 L', pct: 92 },
  collectionPoints: [
    { site: 'Al Wakrah Corniche — Site A5', address: 'Al Wakrah Corniche, Site A5, Qatar', incidentId: 'IC-2101', zone: 'Z-1200', arrived: '12:43 PM', departed: '12:57 PM', timeOnSite: '14 mins', waterExtractedL: 1680, pumpCycles: 4, status: 'Completed' },
    { site: 'Lusail Marina — Site B6', address: 'Lusail Marina, Site B6, Qatar', incidentId: 'IC-2114', zone: 'Z-1200', arrived: '01:20 PM', departed: '01:41 PM', timeOnSite: '21 mins', waterExtractedL: 1310, pumpCycles: 3, status: 'Completed' },
    { site: 'Al Wakrah Corniche — Site C7', address: 'Al Wakrah Corniche, Site C7, Qatar', incidentId: 'IC-2128', zone: 'Z-1200', arrived: '02:05 PM', departed: '02:19 PM', timeOnSite: '14 mins', waterExtractedL: 790, pumpCycles: 2, status: 'Partial' },
  ],
};

/* ── option catalogs for the edit side sheets ───────────────────────────── */
const VEHICLE_OPTS: ResourceOption[] = [
  { id: 'LMV-QA01', label: 'LMV-QA01', meta: 'Tanker · 12,000 L', status: 'On Duty', statusTone: INFO, icon: <Icons.Truck01 size={16} /> },
  { id: 'LMV-QA07', label: 'LMV-QA07', meta: 'Tanker · 14,000 L', status: 'Available', icon: <Icons.Truck01 size={16} /> },
  { id: 'LMV-QA12', label: 'LMV-QA12', meta: 'Pump Unit · 8,000 L', status: 'Available', icon: <Icons.Truck01 size={16} /> },
  { id: 'LMV-QA16', label: 'LMV-QA16', meta: 'Tanker · 16,000 L', status: 'Maintenance', statusTone: WARN, disabled: true, icon: <Icons.Truck01 size={16} /> },
];
const DRIVER_OPTS: ResourceOption[] = [
  { id: 'Mohammed Al-Kuwari', label: 'Mohammed Al-Kuwari', meta: 'ID-1231 · +974 5512 4567', avatar: 'MA', status: 'On Duty', statusTone: INFO },
  { id: 'Abdullah Al-Marri', label: 'Abdullah Al-Marri', meta: 'ID-1242 · +974 5512 4512', avatar: 'AM', status: 'Available' },
  { id: 'Fahad Al-Sulaiti', label: 'Fahad Al-Sulaiti', meta: 'ID-1256 · +974 5512 4598', avatar: 'FS', status: 'Available' },
  { id: 'Rashid Al-Naimi', label: 'Rashid Al-Naimi', meta: 'ID-1268 · +974 5512 4570', avatar: 'RN', status: 'On Leave', statusTone: ERR, disabled: true },
];
const HELPER_OPTS: ResourceOption[] = [
  { id: 'Imran Khan', label: 'Imran Khan', meta: 'Crew · ID-3401', avatar: 'IK', status: 'Available' },
  { id: 'Muhammad Iqbal', label: 'Muhammad Iqbal', meta: 'Crew · ID-3412', avatar: 'MI', status: 'Available' },
  { id: 'Ashraf Hossain', label: 'Ashraf Hossain', meta: 'Crew · ID-3423', avatar: 'AH', status: 'Available' },
  { id: 'Rafiqul Islam', label: 'Rafiqul Islam', meta: 'Crew · ID-3434', avatar: 'RI', status: 'On Duty', statusTone: INFO },
];
const DISCHARGE_OPTS: ResourceOption[] = [
  { id: 'Al Wakrah Discharge Point', label: 'Al Wakrah Discharge Point', meta: 'Al Wakrah, Qatar · 12 km', status: 'Open', icon: <Icons.MarkerPin01 size={16} /> },
  { id: 'Industrial Area Discharge Point', label: 'Industrial Area Discharge Point', meta: 'Industrial Area, Doha · 18 km', status: 'Open', icon: <Icons.MarkerPin01 size={16} /> },
  { id: 'Al Khor Discharge Point', label: 'Al Khor Discharge Point', meta: 'Al Khor, Qatar · 9 km', status: 'Open', icon: <Icons.MarkerPin01 size={16} /> },
];

/* ── small pieces ────────────────────────────────────────────────────────── */
function InfoCell({ icon, label, value, iconColor = 'var(--muted-foreground)', onEdit }: { icon: React.ReactNode; label: string; value: React.ReactNode; iconColor?: string; onEdit?: () => void }) {
  return (
    <div className="group flex items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${iconColor} 12%, transparent)`, color: iconColor }}>{icon}</span>
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
          {onEdit && <button type="button" onClick={onEdit} aria-label={`Change ${label}`} className="text-muted-foreground opacity-0 transition-opacity hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"><Icons.Edit01 size={11} /></button>}
        </span>
        <span className="truncate text-body-sm font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}

/** One bordered white chip-card of the KPI band (Figma 3092:1537 — every
 *  resource/stat sits in its OWN card, not a shared band card). */
function ChipCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex items-center rounded-xl border border-border bg-card px-4 py-2.5', className)}>{children}</div>;
}

/**
 * StatCard — one KPI-band card per the Tadweer-March frame (3715:2180 /
 * 2007:96274): rounded-6px card with the LIGHT `#eaecf0` border, a 48px
 * tinted circle icon, 14px muted SemiBold label over a 20px black value.
 *
 * 2026-09-04 KPI-band rebuild (user feedback: "rows 1–2 must have the same
 * number of cards, all KPI cards must have the same height/font/style") —
 * every card in the band now shares ONE fixed `h-[88px]` height (set here as
 * the default; the gauge card is the only opt-out, via `h-auto` in its own
 * `className` so it can stretch across both rows instead). An optional `sub`
 * line lives in a height-reserved slot (`h-4`, non-breaking space when
 * empty) so cards with/without a sub-line never differ in height. `title`
 * sets a native tooltip with the untruncated value; the value line itself is
 * `min-w-0 truncate`.
 */
function StatCard({ icon, leftSlot, label, value, sub, iconColor = 'var(--muted-foreground)', onEdit, className, children, title }: {
  icon?: React.ReactNode;
  /** Custom left visual (e.g. `TintAvatar`) replacing the default tinted icon circle. */
  leftSlot?: React.ReactNode;
  label?: string;
  value?: React.ReactNode;
  /** Optional second line under the value — space is always reserved so cards with/without it stay the same height. */
  sub?: React.ReactNode;
  iconColor?: string;
  onEdit?: () => void;
  className?: string;
  /** Fully-custom body (e.g. the combined Helpers card) — replaces icon/label/value. */
  children?: React.ReactNode;
  /** Native tooltip for the card (defaults to the value/label so truncated text is still readable). */
  title?: string;
}) {
  return (
    <div
      className={cn('group flex h-[88px] items-center gap-3 rounded-md bg-card px-3.5 py-3', className)}
      style={{ border: '1px solid var(--gray-200, #eaecf0)' }}
      title={title}
    >
      {children ?? (
        <>
          {leftSlot ?? (
            <span className="grid size-12 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${iconColor} 10%, transparent)`, color: iconColor }}>{icon}</span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-1 text-body-sm font-semibold text-muted-foreground">
              {label}
              {onEdit && <button type="button" onClick={onEdit} aria-label={`Change ${label}`} className="text-muted-foreground opacity-0 transition-opacity hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"><Icons.Edit01 size={12} /></button>}
            </span>
            <span className="min-w-0 truncate text-body-xl font-semibold leading-tight text-foreground">{value}</span>
            <span className="h-4 min-w-0 truncate text-body-xs font-medium leading-tight text-muted-foreground">{sub ?? ' '}</span>
          </div>
        </>
      )}
    </div>
  );
}

/** The 48px tinted-circle initial avatar the frame's Driver/Helper cards use. */
function TintAvatar({ name, color }: { name: string; color?: string }) {
  const c = color ?? hashAvatarColor(name);
  return (
    <span className="grid size-12 shrink-0 place-items-center rounded-full text-[19px] font-semibold" style={{ background: `color-mix(in srgb, ${c} 10%, transparent)`, color: c }}>
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = status === 'COMPLETED' ? OK : status === 'ONGOING' ? INFO : WARN;
  return <span className="inline-flex items-center rounded-md px-2.5 py-1 text-caption font-bold uppercase tracking-wide text-white" style={{ background: tone }}>{status}</span>;
}

// Same deterministic multi-hue palette as `plan-monitoring.tsx`'s
// `hashAvatarColor` (kept a separate tiny copy rather than a shared import —
// this file has no module boundary to share one across; both are the same
// values on purpose).
const AVATAR_PALETTE = [
  'var(--chart-accent-cyan)',
  'var(--chart-accent-purple)',
  'var(--chart-accent-teal)',
  'var(--chart-accent-pink)',
  'var(--status-info)',
  'var(--chart-accent-yellow)',
];
function hashAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function Avatar({ name, color, size = 28 }: { name: string; color?: string; size?: number }) {
  const ini = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const resolvedColor = color ?? hashAvatarColor(name);
  return <span className="grid shrink-0 place-items-center rounded-full font-semibold text-white" style={{ width: size, height: size, background: resolvedColor, fontSize: Math.max(12, size * 0.38) }}>{ini}</span>;
}

const LOG_ICON: Record<PlanLogEvent['kind'], { icon: React.ReactNode; color: string }> = {
  start: { icon: <Icons.PlayCircle size={15} />, color: OK },
  alert: { icon: <Icons.AlertTriangle size={15} />, color: WARN },
  service: { icon: <Icons.Flag01 size={15} />, color: P },
  collected: { icon: <Icons.Trash01 size={15} />, color: 'var(--muted-foreground)' },
  done: { icon: <Icons.CheckCircle size={15} />, color: OK },
};

/** Time-chip tint per event kind (Figma: collected = success-tinted chip, alerts = warning). */
const LOG_TIME_TONE: Partial<Record<PlanLogEvent['kind'], string>> = { collected: OK, alert: WARN, done: OK };

/*
 * 2026-09-02 (Figma Tadweer-March 2007:96728, flood-adapted): "All" carries
 * EVERY schedule + assigned-request event; "Assigned Jobs" filters to the
 * job-order events (dispatch → job ongoing → job completed, FM-6354's
 * driver-owned track) — still plan-log rows, just the jobs subset.
 */
const DEFAULT_LOG_TABS = [
  { id: 'all', label: 'All' },
  { id: 'jobs', label: 'Assigned Jobs' },
  { id: 'critical', label: 'Critical Events' },
  { id: 'issues', label: 'Reported Issues' },
];

function PlanLog({ events, tabs = DEFAULT_LOG_TABS, date, onEvidence, summary }: {
  events: PlanLogEvent[];
  tabs?: { id: string; label: string }[];
  date?: string;
  onEvidence?: (id: string) => void;
  summary?: React.ReactNode;
}) {
  const [tab, setTab] = React.useState(tabs[0]?.id ?? 'all');
  const [q, setQ] = React.useState('');
  const query = q.trim().toLowerCase();
  const visible = events.filter((e) => {
    if (tab !== 'all' && e.category !== tab) return false;
    if (query && ![e.title, e.sub, e.sub2].some((s) => s?.toLowerCase().includes(query))) return false;
    return true;
  });
  return (
    <div className="flex h-full min-h-0 w-[320px] shrink-0 flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-body font-semibold text-foreground">Plan Log</span>
        <Icons.LayoutRight size={16} className="text-muted-foreground" />
      </div>
      <div className="flex items-center gap-3 border-b border-border px-4">
        {tabs.map(({ id, label }) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={cn('relative py-2.5 text-body-xs font-semibold transition-colors', tab === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
            {label}{tab === id && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {/* Figma 2007:96738: search field + a bordered 40px reported-issues
            quick-filter button on one row. */}
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Icons.SearchSm size={14} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search Event" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 pl-8 text-body-sm" />
          </div>
          <button
            type="button"
            aria-label="Reported issues"
            aria-pressed={tab === 'issues'}
            onClick={() => setTab(tab === 'issues' ? (tabs[0]?.id ?? 'all') : 'issues')}
            className={cn('grid size-10 shrink-0 place-items-center rounded-md border transition-colors', tab === 'issues' ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground')}
          >
            <Icons.Announcement02 size={18} />
          </button>
        </div>
        <div className="rounded-lg bg-[color-mix(in_srgb,var(--status-success)_8%,transparent)] p-2.5 text-body-xs text-foreground">
          {summary ?? 'Plan completed with 92% route coverage and 85% time efficiency. 30 stops missed — 2 overflow cases reported in Area C.'}
        </div>
        {date && <div className="mt-3 text-caption font-semibold uppercase tracking-wide text-muted-foreground">{date}</div>}
        <ul className="relative mt-3 flex flex-col">
          {/* the continuous timeline rail behind the pill chips (Figma 2007:96750) */}
          {visible.length > 1 && <span aria-hidden className="absolute bottom-6 start-[44px] top-3 w-px bg-border" />}
          {visible.length === 0 && <li className="py-6 text-center text-body-xs text-muted-foreground">No events match this filter.</li>}
          {visible.map((e, i) => {
            const g = LOG_ICON[e.kind];
            const tone = LOG_TIME_TONE[e.kind];
            const chipIcon = e.kind === 'start' || e.kind === 'done'
              ? <span style={{ color: g.color }}>{g.icon}</span>
              : <span className="size-2 rounded-full" style={{ background: tone ?? g.color }} />;
            return (
              <li key={i} className={cn('relative flex gap-3 py-2', i < visible.length - 1 && 'border-b border-border/70')}>
                {/* pill time chip (Figma 2007:96754): white rounded-full, soft
                    shadow, tone-colored time + trailing dot/kind glyph. */}
                <span className="z-[1] flex h-8 shrink-0 items-center gap-1.5 self-start rounded-full border border-border/60 bg-card px-3 shadow-[0px_3px_11px_-1px_rgba(0,0,0,0.1)]">
                  <span className="text-caption font-medium" style={{ color: tone ?? 'var(--foreground)' }}>{e.time}</span>
                  {chipIcon}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
                  <span className="text-body-sm font-semibold capitalize text-foreground">{e.title}</span>
                  {e.sub && (
                    <span className="flex items-center gap-1 text-caption uppercase text-muted-foreground">
                      <Icons.MarkerPin02 size={12} className="shrink-0" />{e.sub}
                    </span>
                  )}
                  {e.zone && (
                    <span className="flex items-center gap-1 text-caption uppercase text-muted-foreground">
                      <Icons.Map01 size={12} className="shrink-0" />{e.zone}
                    </span>
                  )}
                  {e.eta && (
                    <span className="flex items-center gap-1 text-caption uppercase text-muted-foreground">
                      <Icons.Clock size={12} className="shrink-0" />{e.eta}
                    </span>
                  )}
                  {e.sub2 && <span className="text-caption uppercase text-muted-foreground">{e.sub2}</span>}
                  {e.evidenceId && onEvidence && (
                    <button
                      type="button"
                      onClick={() => onEvidence(e.evidenceId!)}
                      className="flex items-center gap-1 self-start text-caption font-semibold text-primary underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      View Evidence <Icons.ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/**
 * EvidenceSheet — the Plan Log's "View Evidence" right side sheet (Tadweer
 * March 2007:98735: 60% black scrim + right panel; content per FM-6354's
 * job-order evidence contract — before/after photos, fill delta, duration).
 */
const SEVERITY_VARIANT: Record<NonNullable<EvidenceDetail['incident']>['severity'], 'muted' | 'warning' | 'destructive'> = {
  Low: 'muted', Medium: 'warning', High: 'destructive', Critical: 'destructive',
};
const OUTCOME_VARIANT: Record<NonNullable<EvidenceDetail['assessment']>['outcome'], 'success' | 'warning' | 'info'> = {
  Resolved: 'success', 'Partially Resolved': 'warning', 'Follow-up Required': 'info',
};

/** Evidence sheet subsection heading — small uppercase label, consistent
 *  across Incident Details / Assessment / Verification. */
function SheetSectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{children}</span>;
}

/** Closure-Evidence section label (Figma 321-37678: "Location", "Notes",
 *  "Photos") — 14px muted, sits directly above its own block. */
function EvidenceBlockLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-body-sm text-muted-foreground">{children}</span>;
}

/** One meta-grid pair — muted 14px label column + 16px foreground value.
 *  Two of these per row make the Figma frame's 2-column meta grid. */
function EvidenceMetaCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-start gap-4">
      <span className="text-body-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-body-md text-foreground">{children}</div>
    </div>
  );
}

/** Assessment key/value pair — same label/value rhythm as the meta grid,
 *  one step tighter so the block reads as supporting detail. */
function EvidenceKV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-start gap-4">
      <span className="text-body-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-body-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

/**
 * EvidenceSheet — restyled 2026-09-04 to the FAMS Figma "Closure Evidence"
 * frame (321-37678, MME | UCCP – Demo): a wide (≈68vw, min 880px), page-like
 * white surface instead of the old 420px panel. Top-to-bottom —
 *   header pill group (`# <id>` + record-type chip) + status chip ·
 *   "Closure Evidence" h3 title · 2-column meta grid ·
 *   "Location" + static zone map with a floating address card ·
 *   collapsible "Evidence" section (Notes · Photos · Assessment) ·
 *   verification line.
 * Every flood datum the old sheet showed is still rendered — the incident
 * details moved into the meta grid, the before/after photos into the photo
 * strip (captions + geotags kept), and the assessment/checklist into a
 * compact key/value block. The footer "Close" button is gone; the sheet's
 * own X (SheetContent's built-in) closes it.
 */
function EvidenceSheet({ detail, onClose }: { detail: EvidenceDetail | null; onClose: () => void }) {
  const [evidenceOpen, setEvidenceOpen] = React.useState(true);
  const photos = detail
    ? ([
        ['Before', detail.beforeUrl, detail.beforeCaption, detail.beforeGeo],
        ['After', detail.afterUrl, detail.afterCaption, detail.afterGeo],
      ] as const)
    : [];
  return (
    <Sheet open={!!detail} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        className="flex w-[68vw] min-w-[880px] max-w-full flex-col gap-0 bg-card p-0 sm:max-w-[68vw]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Closure Evidence</SheetTitle>
        </SheetHeader>
        {detail && (
          <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-8 py-7">
            {/* ── header: id/record-type pill group + status chip + title ── */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="flex items-center overflow-hidden rounded-lg border border-border">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-body-sm font-semibold text-foreground">
                    <Icons.Hash02 size={14} className="text-muted-foreground" />
                    {detail.incident?.id ?? detail.title}
                  </span>
                  <span className="flex items-center gap-1.5 border-l border-border px-3 py-1.5 text-body-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Icons.Grid01 size={14} />
                    {detail.recordType ?? 'Collection Point'}
                  </span>
                </div>
                {detail.statusLabel && (
                  <Badge variant="success" size="md" className="uppercase tracking-wide">{detail.statusLabel}</Badge>
                )}
              </div>
              <h2 className="text-h3 font-semibold leading-h3 text-foreground">Closure Evidence</h2>
            </div>

            {/* ── meta grid: 2 columns, row-major (left col / right col) ── */}
            <div className="grid grid-cols-2 gap-x-10 gap-y-4">
              <EvidenceMetaCell label="Collection Point">{detail.collectionPoint ?? detail.incident?.address ?? detail.location ?? '—'}</EvidenceMetaCell>
              <EvidenceMetaCell label="Shift Time">{detail.shiftTime ?? '—'}</EvidenceMetaCell>
              <EvidenceMetaCell label="Reported On">{detail.reportedOn ?? detail.incident?.reportedAt ?? detail.time}</EvidenceMetaCell>
              <EvidenceMetaCell label="Vehicle ID">{detail.vehicleId ?? '—'}</EvidenceMetaCell>
              <EvidenceMetaCell label="Reported By">
                {detail.incident ? (
                  <span className="flex items-center gap-2">
                    <Avatar name={detail.incident.reportedBy} size={24} />
                    <span className="font-semibold uppercase tracking-wide text-foreground">{detail.incident.reportedBy}</span>
                  </span>
                ) : '—'}
              </EvidenceMetaCell>
              <EvidenceMetaCell label="Incident Type">{detail.incident?.title ?? detail.title}</EvidenceMetaCell>
              {detail.incident && (
                <>
                  <EvidenceMetaCell label="Water Depth">{detail.incident.waterDepth}</EvidenceMetaCell>
                  <EvidenceMetaCell label="Affected Area">{detail.incident.affectedArea}</EvidenceMetaCell>
                </>
              )}
            </div>

            {/* ── location: static zone map + floating address card ─────── */}
            {detail.position && (
              <div className="flex flex-col gap-2">
                <EvidenceBlockLabel>Location</EvidenceBlockLabel>
                <div className="relative h-[380px] w-full overflow-hidden rounded-xl border border-border">
                  <LeafletMap
                    center={detail.position}
                    zoom={12}
                    controls
                    controlsPosition="top-right"
                    showLocate
                    showReset={false}
                    zones={detail.zonePoints ? [{ id: 'ev-zone', points: detail.zonePoints, color: WARN, fillOpacity: 0.1 }] : []}
                    pois={[{ id: 'ev-site', position: detail.position, iconUrl: sitePinUrl, iconSize: [30, 36] as [number, number] }]}
                    className="h-full w-full"
                  />
                  <div className="pointer-events-none absolute bottom-4 right-4 z-[400] flex flex-col gap-0.5 rounded-lg border border-border bg-card px-3 py-2 shadow-md">
                    <span className="text-caption text-muted-foreground">Incident Location</span>
                    <span className="text-body-sm font-semibold text-foreground">{detail.locationLabel ?? detail.location ?? '—'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── collapsible Evidence section ──────────────────────────── */}
            <div className="flex flex-col gap-6 border-t border-border pt-6">
              <button
                type="button"
                onClick={() => setEvidenceOpen((o) => !o)}
                aria-expanded={evidenceOpen}
                className="flex w-fit items-center gap-2 text-body-md font-semibold text-foreground"
              >
                {evidenceOpen ? <Icons.ChevronDown size={18} className="text-muted-foreground" /> : <Icons.ChevronRight size={18} className="text-muted-foreground" />}
                Evidence
              </button>

              {evidenceOpen && (
                <div className="flex flex-col gap-6">
                  {/* Notes — assessment note + pump-run summary paragraph. */}
                  {!!(detail.notes?.length || detail.assessment?.note) && (
                    <div className="flex flex-col gap-2">
                      <EvidenceBlockLabel>Notes</EvidenceBlockLabel>
                      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
                        {(detail.notes?.length ? detail.notes : [detail.assessment!.note]).map((p, i) => (
                          <p key={i} className="text-body-sm leading-body-sm text-foreground">{p}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photos — before/after square thumbnails + file badge. */}
                  <div className="flex flex-col gap-2">
                    <EvidenceBlockLabel>Photos</EvidenceBlockLabel>
                    <div className="flex flex-wrap gap-4">
                      {photos.map(([label, url, caption, geo]) => (
                        <figure key={label} className="flex w-[240px] flex-col gap-2">
                          <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border">
                            <img src={url} alt={`${label} — ${detail.title}`} width={240} height={240} className="size-full object-cover" />
                            <span className="absolute bottom-2 right-2 rounded-full bg-[color:var(--foreground)]/80 px-2 py-0.5 text-caption font-semibold uppercase tracking-wide text-[color:var(--card)]">JPG</span>
                          </div>
                          <figcaption className="flex flex-col gap-0.5">
                            <span className="text-body-sm font-medium text-foreground">{caption ?? label}</span>
                            {geo && (
                              <span className="flex items-center gap-1 text-caption text-muted-foreground">
                                <Icons.MarkerPin02 size={11} />{geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
                              </span>
                            )}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>

                  {/* Assessment — outcome chip + compact key/value block. */}
                  {detail.assessment && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <EvidenceBlockLabel>Assessment</EvidenceBlockLabel>
                        <Badge variant={OUTCOME_VARIANT[detail.assessment.outcome]} size="sm">{detail.assessment.outcome}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-10 gap-y-3">
                        <EvidenceKV label="Water Extracted">{detail.assessment.waterExtracted}</EvidenceKV>
                        <EvidenceKV label="Time on Site">{detail.assessment.timeOnSite}</EvidenceKV>
                        <EvidenceKV label="Pump Cycles">{detail.assessment.pumpCycles}</EvidenceKV>
                        <EvidenceKV label="Inspector">
                          <span className="flex items-center gap-2">
                            <Avatar name={detail.assessment.inspector} size={20} />
                            {detail.assessment.inspector}
                          </span>
                        </EvidenceKV>
                        {detail.fillDelta && <EvidenceKV label="Fill Delta"><span style={{ color: INFO }}>{detail.fillDelta}</span></EvidenceKV>}
                        {detail.duration && <EvidenceKV label="Duration">{detail.duration}</EvidenceKV>}
                        <EvidenceKV label="Checklist">
                          <ul className="flex flex-col gap-1.5">
                            {detail.assessment.checklist.map((c) => (
                              <li key={c.label} className="flex items-center gap-1.5 text-body-sm font-normal">
                                {c.done
                                  ? <Icons.Check size={14} className="shrink-0" style={{ color: OK }} />
                                  : <Icons.XClose size={14} className="shrink-0" style={{ color: ERR }} />}
                                <span className={c.done ? 'text-foreground' : 'text-muted-foreground'}>{c.label}</span>
                              </li>
                            ))}
                          </ul>
                        </EvidenceKV>
                        {detail.incident && <EvidenceKV label="Severity"><Badge variant={SEVERITY_VARIANT[detail.incident.severity]} size="sm">{detail.incident.severity}</Badge></EvidenceKV>}
                      </div>
                    </div>
                  )}

                  {/* Verification — muted 14px line, very bottom. */}
                  {detail.verification && (
                    <div className="flex items-center gap-2 border-t border-border pt-4 text-body-sm text-muted-foreground">
                      <Icons.ShieldTick size={16} style={{ color: OK }} />
                      <span>Verified by <span className="font-medium text-foreground">{detail.verification.verifiedBy}</span> · {detail.verification.verifiedAt}</span>
                      <span className="flex items-center gap-1"><Icons.Image01 size={14} />{detail.verification.photoCount}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ServiceLocationCard({ loc }: { loc: ServiceLocationDetail }) {
  const cbmPct = Math.round((loc.cbmDone / loc.cbmTotal) * 100);
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-body font-semibold text-foreground"><Icons.MarkerPin01 size={16} className="text-muted-foreground" />{loc.name} - Service Location <span className="text-body-xs font-normal text-muted-foreground">{loc.code}</span></span>
        <StatusPill status={loc.status} />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="flex flex-col items-center"><ComplianceGauge value={loc.compliancePct} size={104} /><span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Compliance</span></div>
        <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <InfoCell icon={<Icons.Clock size={16} />} label="Collection Window" value={loc.window} />
          <InfoCell icon={<Icons.Route size={16} />} label="Distance Covered" value={loc.distance} />
          <InfoCell icon={<Icons.CurrencyDollar size={16} />} label="Revenue" value={loc.revenue} iconColor={OK} />
          <InfoCell icon={<Icons.Trash01 size={16} />} label="Stops Completed" value={loc.bins} iconColor={P} />
          <InfoCell icon={<Icons.Package size={16} />} label="Water Extracted" value={loc.waste} iconColor={WARN} />
          <InfoCell icon={<Icons.RefreshCcw01 size={16} />} label="Pump Cycles" value={loc.ptoLifts} />
        </div>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-body-xs"><span className="text-muted-foreground">11 CBM</span><span className="font-medium text-foreground">{cbmPct}/100</span></div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${cbmPct}%`, background: `linear-gradient(90deg, ${OK}, ${WARN}, ${ERR})` }} /></div>
      </div>
      <div className="border-t border-border pt-3">
        <span className="text-body-sm font-semibold text-foreground">Contact Person</span>
        <div className="mt-2 grid grid-cols-1 gap-y-2 text-body-sm sm:grid-cols-2">
          <ContactRow label="Service Delivery Confirmation by" value={<span className="flex items-center gap-1.5"><Avatar name={loc.contact} size={20} />{loc.contact}</span>} />
          <ContactRow label="Email Address" value={loc.email} />
          <ContactRow label="Phone" value={loc.phone} />
          <ContactRow label="Signature" value={loc.signed ? <span className="text-primary">✎ Signed</span> : '—'} />
          <ContactRow label="Emirates ID" value={loc.emiratesId ? <span className="text-primary">◍ Attachment</span> : '—'} />
        </div>
        <p className="mt-2 text-body-xs text-muted-foreground"><span className="mb-0.5 block font-medium text-muted-foreground">Description</span>{loc.description}</p>
      </div>
    </div>
  );
}
function ContactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex flex-col"><span className="text-caption text-muted-foreground">{label}</span><span className="text-body-sm font-medium text-foreground">{value}</span></div>;
}

function Card({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col gap-3 rounded-xl border border-border bg-card p-5', className)}>
      <span className="flex items-center gap-2 text-body-sm font-semibold text-foreground">{icon}{title}</span>
      {children}
    </section>
  );
}

/** Status chip for a Collection Points table row — same tone mapping as the
 *  Evidence sheet's Assessment outcome badge (`OUTCOME_VARIANT`). */
const CP_STATUS_VARIANT: Record<CollectionPoint['status'], 'success' | 'warning' | 'muted'> = {
  Completed: 'success', Partial: 'warning', Skipped: 'muted',
};

/** "Collection Points" table (2026-09-04) — replaces the Off-Plan Response
 *  Sites donut in the same card slot: every flood collection point (response
 *  site) this vehicle served during the plan/shift, plain semantic `<table>`
 *  styled to match `ReportTable`'s data-table anatomy (no dedicated Table
 *  primitive exists in this DS — see `report-table.tsx`). */
function CollectionPointsTable({ points }: { points: CollectionPoint[] }) {
  const totalWater = points.reduce((s, p) => s + p.waterExtractedL, 0);
  const totalCycles = points.reduce((s, p) => s + p.pumpCycles, 0);
  return (
    <div className="max-h-80 overflow-x-auto overflow-y-auto rounded-lg border border-border">
      <table className="w-full min-w-[900px] text-left text-body-xs">
        <thead className="sticky top-0 z-[1] bg-muted/50 text-caption uppercase tracking-wide text-muted-foreground">
          <tr>
            {['#', 'Site / Address', 'Incident', 'Zone', 'Arrived', 'Departed', 'Time on Site', 'Water Extracted (L)', 'Pump Cycles', 'Status'].map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {points.map((p, i) => (
            <tr key={p.incidentId} className="hover:bg-muted/30">
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{p.site}</span>
                  <span className="text-caption text-muted-foreground">{p.address}</span>
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2"><Badge variant="outline" size="xs" className="font-mono">{p.incidentId}</Badge></td>
              <td className="whitespace-nowrap px-3 py-2 text-foreground">{p.zone}</td>
              <td className="whitespace-nowrap px-3 py-2 text-foreground">{p.arrived}</td>
              <td className="whitespace-nowrap px-3 py-2 text-foreground">{p.departed}</td>
              <td className="whitespace-nowrap px-3 py-2 text-foreground">{p.timeOnSite}</td>
              <td className="whitespace-nowrap px-3 py-2 text-end tabular-nums text-foreground">{p.waterExtractedL.toLocaleString()}</td>
              <td className="whitespace-nowrap px-3 py-2 text-end tabular-nums text-foreground">{p.pumpCycles}</td>
              <td className="whitespace-nowrap px-3 py-2"><Badge variant={CP_STATUS_VARIANT[p.status]} size="xs">{p.status}</Badge></td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-border bg-muted/30 font-semibold text-foreground">
          <tr>
            <td className="px-3 py-2" colSpan={7}>Total ({points.length} Points)</td>
            <td className="whitespace-nowrap px-3 py-2 text-end tabular-nums">{totalWater.toLocaleString()}</td>
            <td className="whitespace-nowrap px-3 py-2 text-end tabular-nums">{totalCycles}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function LabeledBar({ label, done, total, pct, color = P }: { label: string; done?: string; total?: string; pct: number; color?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-body-xs"><span className="text-muted-foreground">{label}</span><span className="font-medium text-foreground">{done ?? `${pct}%`}{total ? ` / ${total}` : ''}</span></div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}

/* ── the full-screen detail ──────────────────────────────────────────────── */
interface EditTarget { key: string; title: string; options: ResourceOption[]; currentId: string; label: string }

export function PlanMonitoringDetail({ data = DEFAULT, onBack, onEvidence, logSummary, extraSections, className }: {
  data?: PlanMonitoringDetailData;
  onBack?: () => void;
  /** Fired by a Plan Log row's "View Evidence →" link (see `PlanLogEvent.evidenceId`). */
  onEvidence?: (id: string) => void;
  /** Overrides the Plan Log's summary banner text. */
  logSummary?: React.ReactNode;
  /** Product-owned sections appended below the built-in charts (e.g. a
   *  collection-evidence gallery). Additive; omit for the existing layout. */
  extraSections?: React.ReactNode;
  className?: string;
}) {
  // editable resource fields + a live Plan Log so re-assignments are reflected + logged
  const [live, setLive] = React.useState({ compactor: data.compactor, driver: data.driver, helpers: [...data.helpers], discharge: data.discharge });
  const [log, setLog] = React.useState<PlanLogEvent[]>(data.planLog);
  const [edit, setEdit] = React.useState<EditTarget | null>(null);
  const [playing, setPlaying] = React.useState(false);
  // Map layer toggles (FM-6354): absent key = on; the legend checkboxes flip them.
  const [layersOn, setLayersOn] = React.useState<Record<string, boolean>>({});
  const [zonesOn, setZonesOn] = React.useState(true);
  // Route toggles — Scheduled (planned) vs Actual GPS trail (FM-6354).
  const [routesOn, setRoutesOn] = React.useState({ planned: true, actual: true });
  // Reported incidents ride the same layer machinery as the event pins, so
  // they get a legend checkbox (on by default) for free.
  const mapLayers = React.useMemo(() => [
    ...(data.mapLayers ?? []),
    ...(data.incidents?.length
      ? [{
          id: 'incidents',
          label: 'Incidents',
          color: ERR,
          markers: data.incidents.map((inc) => ({ id: inc.id, position: inc.position, label: `${inc.id} · ${inc.title} · ${inc.time}` })),
        }]
      : []),
  ], [data.mapLayers, data.incidents]);
  // Built-in Evidence side sheet (Tadweer March 2007:98735); events without a
  // payload in `data.evidence` fall back to the host's `onEvidence`.
  const [evidenceId, setEvidenceId] = React.useState<string | null>(null);
  const handleEvidence = React.useCallback((id: string) => {
    if (data.evidence?.[id]) setEvidenceId(id);
    else onEvidence?.(id);
  }, [data.evidence, onEvidence]);

  const openEdit = (t: EditTarget) => setEdit(t);
  const confirmEdit = (id: string) => {
    if (!edit) return;
    const prev = edit.currentId;
    const newLabel = edit.options.find((o) => o.id === id)?.label ?? id;
    setLive((cur) => {
      if (edit.key === 'compactor') return { ...cur, compactor: newLabel };
      if (edit.key === 'driver') return { ...cur, driver: newLabel };
      if (edit.key === 'discharge') return { ...cur, discharge: newLabel };
      if (edit.key.startsWith('helper')) { const i = Number(edit.key.slice(6)); const h = [...cur.helpers]; h[i] = newLabel; return { ...cur, helpers: h }; }
      return cur;
    });
    setLog((cur) => [{ time: 'Just now', kind: 'alert', title: `${edit.label} Changed`, sub: `NEW: ${newLabel}`, sub2: prev ? `PREVIOUS: ${prev}` : undefined }, ...cur]);
    setEdit(null);
  };

  const eventData = ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00'].map((h, i) => ({
    h, over: 3 + (i % 4), idle: 2 + (i % 3), zin: 4 + (i % 5), zout: 3 + (i % 4), stay: 2 + (i % 3),
  }));
  const eventSeries = [
    { dataKey: 'over', name: 'Overspeeding', color: PURPLE },
    { dataKey: 'idle', name: 'Idling', color: P },
    { dataKey: 'zin', name: 'Zone in', color: OK },
    { dataKey: 'zout', name: 'Zone out', color: WARN },
    { dataKey: 'stay', name: 'Zone Stay', color: ERR },
  ];
  const weightData = Array.from({ length: 12 }, (_, i) => ({ t: `${i * 2}:00`, kg: Math.round(200 + i * 260 + (i % 3) * 80) }));
  const binTrend = Array.from({ length: 12 }, (_, i) => ({ t: `${i * 2}:00`, bins: Math.round(10 + i * i * 0.9) }));

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-auto bg-muted/30', className)}>
      {/* top bar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-card px-6 py-3">
        <button type="button" onClick={onBack} aria-label="Back" className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.ChevronLeft size={16} /></button>
        <span className="flex items-center rounded-md border border-border">
          <span className="flex items-center gap-2 border-e border-border px-2 py-1.5 text-body-sm font-semibold text-muted-foreground"><Icons.Hash02 size={16} className="text-muted-foreground" />{data.id}</span>
          <span className="px-2 py-1.5 text-body-sm font-semibold text-muted-foreground">{data.title}</span>
        </span>
        {data.municipality && (
          <span className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5" style={{ background: 'color-mix(in srgb, var(--status-info) 13%, transparent)' }}>
            <span className="grid size-5 place-items-center rounded-full text-caption font-semibold text-white" style={{ background: 'var(--status-info)' }}>{data.municipality[0]}</span>
            <span className="text-body-xs font-semibold text-foreground">{data.municipality}</span>
          </span>
        )}
        {data.zoneTeam && (
          <span className="flex h-8 items-center gap-1.5 rounded-md px-2.5 py-1.5" style={{ background: 'color-mix(in srgb, var(--status-warning) 13%, transparent)' }}>
            <Icons.Flag01 size={16} style={{ color: 'var(--status-warning)' }} />
            <span className="text-body-xs font-semibold text-foreground">{data.zoneTeam}</span>
          </span>
        )}
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-caption font-semibold text-muted-foreground">{data.contractor}</span>
        {data.locations.map((l) => <span key={l} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-caption font-medium text-foreground"><Icons.MarkerPin01 size={11} className="text-muted-foreground" />{l}</span>)}
        {data.sourceRequest && (
          <button
            type="button"
            onClick={data.sourceRequest.onOpen}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-caption font-semibold text-primary transition-colors hover:bg-muted"
            aria-label={`Open source request ${data.sourceRequest.id}`}
          >
            <Icons.Link03 size={12} />
            Source Request · {data.sourceRequest.id}
          </button>
        )}
        <span className="ml-auto"><StatusPill status={data.status} /></span>
      </div>

      <div className="flex flex-col gap-4 p-6">
        {/* KPI band — 2026-09-04 rebuild (user feedback: "make sure the first
            2 rows have the same number of cards ... all KPI cards must have
            the same height, font, style"). The gauge card spans rows 1–2 on
            the start side (via `h-auto` + the parent's `xl:items-stretch`);
            to its right, row 1 and row 2 each hold exactly FOUR equal cards
            (`xl:grid-cols-4`), and every card shares the ONE `StatCard`
            component/height (`h-[88px]`, enforced in `StatCard` itself) so
            font/style/height are identical everywhere. Row 3 (the remaining
            stats) sits full-width below the gauge+grid, `xl:grid-cols-6`. */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch">
          <StatCard className="h-auto shrink-0 justify-center xl:w-[248px]">
            <div className="flex flex-col items-center gap-2">
              <ComplianceGauge value={data.compliancePct} size={150} variant="gradient" />
              <span className="text-body-sm font-semibold text-muted-foreground">Overall Compliance</span>
            </div>
          </StatCard>
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {/* Row 1 — Tanker, Driver, Helper(s), Start Depot. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={<Icons.Truck01 size={20} />}
                label="Tanker"
                value={live.compactor}
                iconColor={P}
                title={live.compactor}
                onEdit={() => openEdit({ key: 'compactor', label: 'Vehicle', title: 'Change Vehicle', options: VEHICLE_OPTS, currentId: live.compactor })}
              />
              <StatCard
                leftSlot={<TintAvatar name={live.driver} />}
                label="Driver"
                value={live.driver}
                title={live.driver}
                onEdit={() => openEdit({ key: 'driver', label: 'Driver', title: 'Change Driver', options: DRIVER_OPTS, currentId: live.driver })}
              />
              {/* Helpers share ONE card (frame 2007:96610) — two avatars
                  inline, sub-line carries the per-helper edit actions so the
                  card keeps the shared height/label/value anatomy. */}
              <StatCard
                leftSlot={
                  <div className="flex -space-x-2 shrink-0">
                    <TintAvatar name={live.helpers[0] ?? '—'} color="var(--chart-accent-purple)" />
                    <TintAvatar name={live.helpers[1] ?? '—'} color="var(--chart-accent-teal)" />
                  </div>
                }
                label="Helper(s)"
                value={live.helpers.filter(Boolean).join(', ') || '—'}
                title={live.helpers.filter(Boolean).join(', ') || undefined}
                sub={
                  <span className="flex items-center gap-2">
                    <button type="button" onClick={() => openEdit({ key: 'helper0', label: 'Helper 1', title: 'Add / Change Helper', options: HELPER_OPTS, currentId: live.helpers[0] ?? '' })} className="underline decoration-dotted underline-offset-2 hover:text-primary">Change Helper 1</button>
                    <button type="button" onClick={() => openEdit({ key: 'helper1', label: 'Helper 2', title: 'Add / Change Helper', options: HELPER_OPTS, currentId: live.helpers[1] ?? '' })} className="underline decoration-dotted underline-offset-2 hover:text-primary">Change Helper 2</button>
                  </span>
                }
              />
              <StatCard icon={<Icons.MarkerPin01 size={20} />} label="Start Depot" value={data.depot} iconColor={OK} title={data.depot} />
            </div>
            {/* Row 2 — Service Type, Distance, Water Extracted, Shift. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={<Icons.Droplets02 size={20} />} label="Service Type" value={data.serviceType} iconColor={PURPLE} title={data.serviceType} />
              <StatCard icon={<Icons.Route size={20} />} label="Distance" value={data.distance} title={data.distance} />
              <StatCard icon={<Icons.Package size={20} />} label="Water Extracted" value={data.wasteCollected} iconColor={WARN} title={data.wasteCollected} />
              <StatCard
                icon={<Icons.Sun size={20} />}
                label={data.shiftDetail?.label ?? 'Shift'}
                iconColor={WARN}
                value={
                  data.shiftDetail ? (
                    // Frame 2007:96710: actual time colored by punctuality,
                    // muted planned time after it — kept on one row
                    // (tabular-nums, smaller than the other cards' 20px
                    // value so the full "actual / planned – actual / planned"
                    // string fits a single 4-col-wide card without wrapping).
                    <span className="flex flex-nowrap items-baseline gap-x-1.5 whitespace-nowrap tabular-nums">
                      <span className="text-[13px] font-semibold" style={{ color: data.shiftDetail.startLate ? ERR : 'var(--success-700, #027A48)' }}>{data.shiftDetail.actualStart}</span>
                      <span className="text-[11px] font-medium text-muted-foreground">/ {data.shiftDetail.plannedStart}</span>
                      <span className="text-[13px] font-semibold text-foreground">–</span>
                      <span className="text-[13px] font-semibold" style={{ color: data.shiftDetail.endLate ? ERR : 'var(--success-700, #027A48)' }}>{data.shiftDetail.actualEnd}</span>
                      <span className="text-[11px] font-medium text-muted-foreground">/ {data.shiftDetail.plannedEnd}</span>
                    </span>
                  ) : (
                    data.shift
                  )
                }
                title={data.shiftDetail ? `${data.shiftDetail.actualStart} / ${data.shiftDetail.plannedStart} – ${data.shiftDetail.actualEnd} / ${data.shiftDetail.plannedEnd}` : data.shift}
              />
            </div>
          </div>
        </div>
        {/* Row 3 — remaining stats, full width under the gauge + 4/4 grid. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.statsRow ? (
            data.statsRow.map((s) => <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} iconColor={s.iconColor} />)
          ) : (
            <>
              {/* Assembly Point (2026-09-04) — sub-line reads the "Reached
                  Assembly Point" Plan Log event's own time so the two agree;
                  the reserved `sub` slot keeps this card's height identical
                  to every other row-3 card whether or not that event fired yet. */}
              <StatCard
                icon={<Icons.Flag01 size={20} />}
                label="Assembly Point"
                iconColor={INFO}
                value={data.assemblyPoint ?? '—'}
                title={data.assemblyPoint}
                sub={(() => {
                  const reached = log.find((e) => e.title === 'Reached Assembly Point')?.time;
                  return reached ? `Reached ${reached}` : undefined;
                })()}
              />
              <StatCard
                icon={<Icons.MarkerPin01 size={20} />}
                label="Discharge Station"
                value={live.discharge}
                iconColor={WARN}
                title={live.discharge}
                onEdit={() => openEdit({ key: 'discharge', label: 'Discharge Station', title: 'Change Discharge Station', options: DISCHARGE_OPTS, currentId: live.discharge })}
              />
              <StatCard icon={<Icons.RefreshCcw01 size={20} />} label="Total Pump Cycles" value={data.ptoLifts} title={String(data.ptoLifts)} />
              <StatCard icon={<Icons.Clock size={20} />} label="Avg Time / Service Location" value={data.avgTime} title={data.avgTime} />
            </>
          )}
        </div>

        {/* Plan Log + Map — 2026-09-04: fixed 812px row (was min-h-[460px])
            so the Plan Log's own list scrolls internally instead of growing
            the row, and the map fills the full height so its ResizeObserver
            re-fit still fires correctly on mount/resize. */}
        <div className="flex h-[812px] gap-4">
          <PlanLog events={log} tabs={data.logTabs} date={data.logDate} onEvidence={onEvidence || data.evidence ? handleEvidence : undefined} summary={logSummary} />
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border">
            {/* event-layer legend toggles (Figma 3092:1982's checkbox chips;
                FM-6354's "zone overlay with toggle") — each checkbox
                shows/hides its pin layer live. */}
            {(mapLayers.length || data.zoneOverlay?.length) ? (
              <div className="absolute left-3 top-3 z-[400] flex flex-wrap items-center gap-2">
                {/* Route toggles — Scheduled vs Actual trail (FM-6354). */}
                {([['planned', 'Scheduled Route', OK], ['actual', 'Actual Route', PURPLE]] as const).map(([key, label, color]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-body-xs font-semibold text-foreground shadow-sm">
                    <input
                      type="checkbox"
                      checked={routesOn[key]}
                      onChange={() => setRoutesOn((cur) => ({ ...cur, [key]: !cur[key] }))}
                      className="size-3.5 accent-[var(--primary)]"
                    />
                    {label}
                    <span className="size-2 rounded-full" style={{ background: color }} />
                  </label>
                ))}
                {mapLayers.map((layer) => {
                  const on = layersOn[layer.id] !== false;
                  return (
                    <label key={layer.id} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-body-xs font-semibold text-foreground shadow-sm">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setLayersOn((cur) => ({ ...cur, [layer.id]: !on }))}
                        className="size-3.5 accent-[var(--primary)]"
                      />
                      {layer.label}
                      <span className="size-2 rounded-full" style={{ background: layer.color }} />
                    </label>
                  );
                })}
                {data.zoneOverlay?.length ? (
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-body-xs font-semibold text-foreground shadow-sm">
                    <input type="checkbox" checked={zonesOn} onChange={() => setZonesOn((z) => !z)} className="size-3.5 accent-[var(--primary)]" />
                    Zone Overlay
                    <span className="size-2 rounded-full" style={{ background: INFO }} />
                  </label>
                ) : null}
              </div>
            ) : null}
            <LeafletMap
              // The run's own geometry frames the map (2026-09-04: part of the
              // trail ran off the top edge at the fixed zoom 12) — routes +
              // every pin, re-fitted whenever the record changes. `center`
              // stays as the pre-fit view and the single-point fallback.
              // Extra top padding: the floating layer-toggle toolbar sits over
              // the map and wraps to two or three rows in a narrow column, so
              // a flat 40 px would tuck part of the trail underneath it.
              center={data.center} zoom={12} zoomControl fitToContent
              fitPadding={{ top: 104, bottom: 48, left: 32, right: 32 }}
              routes={[
                ...(routesOn.planned && data.plannedRoute ? [{ id: 'planned', points: data.plannedRoute, color: OK, dashed: true }] : []),
                ...(routesOn.actual ? [{ id: 'actual', points: data.route, color: PURPLE, animateMarkerId: playing ? 'replay' : undefined }] : []),
              ]}
              markers={[
                // Live vehicle marker with plate pill (FM-6354's "live GPS position").
                ...(data.vehicle ? [{ id: 'veh', position: data.vehicle.position, kind: 'vehicle' as const, status: 'reporting' as const, label: data.vehicle.label, live: true }] : []),
                ...(playing ? [{ id: 'replay', position: data.route[0], kind: 'vehicle' as const, status: 'reporting' as const }] : []),
              ]}
              zones={zonesOn ? (data.zoneOverlay ?? []).map((z) => ({ id: z.id, points: z.points, color: z.color ?? INFO, label: z.label, fillOpacity: 0.12 })) : []}
              circles={(data.geozones ?? []).map((g) => ({ id: g.id, center: g.center, radius: g.radius, color: g.color, label: g.label }))}
              pois={[
                // DS Map POI pins (fams-design-system/assets/icons/POI Icons):
                // depot = Location/teardrop pin, assembly = Assembly Point
                // badge pin, discharge = Water Discharge Station badge pin.
                { id: 'depot', position: data.depotPos, label: 'Depot', iconUrl: depotPinUrl, iconSize: [34, 40] as [number, number] },
                ...(data.assemblyPos ? [{ id: 'assembly', position: data.assemblyPos, label: 'Assembly Point', iconUrl: assemblyPinUrl, iconSize: [34, 40] as [number, number] }] : []),
                { id: 'discharge', position: data.dischargePos, label: 'Discharge Station', iconUrl: dischargePinUrl, iconSize: [34, 40] as [number, number] },
                ...mapLayers
                  .filter((layer) => layersOn[layer.id] !== false)
                  .flatMap((layer) =>
                    layer.markers.map((m) => ({
                      id: m.id,
                      position: m.position,
                      label: m.label ?? layer.label,
                      // The job/incident-site layer gets the dedicated
                      // DS-pattern pin (`site.svg`) so it reads as a distinct
                      // stop type next to depot/assembly/discharge, instead of
                      // the plain color dot the other event-pin layers (Pump
                      // Runs/Alerts/…) use.
                      ...(layer.id === 'incidents'
                        ? { iconUrl: sitePinUrl, iconSize: [30, 36] as [number, number] }
                        : { color: layer.color }),
                    })),
                  ),
              ]}
              className="h-full w-full"
            />
            <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause route replay' : 'Play route replay'} className="absolute bottom-4 left-4 z-[400] grid size-11 place-items-center rounded-full bg-card text-primary shadow-md transition-colors hover:bg-muted">
              {playing ? <Icons.PauseCircle size={22} /> : <Icons.PlayCircle size={22} />}
            </button>
          </div>
        </div>

        {/*
         * Per-service-location cards (ServiceLocationCard, below) intentionally
         * NOT rendered here — the fTNUZHTxIZxNlBKq3aw2hk frame's exact 10-node
         * top-to-bottom sequence has no such section between the Plan Log/map
         * (3092:1982) and the analytics container (3092:2370). Component kept
         * (and still exported) for reuse elsewhere; `extraSections` below is
         * the supported way for a consumer to reinstate it if a future frame
         * needs it.
         */}

        {/* Collection Points — 2026-09-04: pulled OUT of the analytics
            grid's narrow left column into its own full-width row. The table
            has too many columns (#, Site/Address, Incident, Zone, Arrived,
            Departed, Time on Site, Water Extracted, Pump Cycles, Status) to
            read in a ~1/3-width card — Departed onward were clipped and the
            Site cell wrapped 3 lines. Full width + horizontal scroll fixes
            both without touching the analytics grid's balance below. */}
        {data.collectionPoints && data.collectionPoints.length > 0 && (
          <Card title="Collection Points" icon={<Icons.Droplets02 size={15} className="text-[color:var(--status-info)]" />}>
            <CollectionPointsTable points={data.collectionPoints} />
          </Card>
        )}

        {/*
         * analytics container — Figma 3092:2370, 2-col masonry reproduced via
         * lg:grid-cols-3 (narrow left col span-1: breakdown/volume bar/gross
         * weight — 6049:7424 left half, 3092:2437, 3092:2481; wide right
         * col span-2: event chart/weight trend — 6049:7424 right half,
         * 3092:2691, 3092:2769), then 3092:2822 full-width at the bottom.
         * 2026-09-04: Gross Weight moved from the right column into the left
         * one to rebalance the grid after Collection Points moved out above
         * (left column would otherwise read visibly emptier than the right).
         */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4">
            <Card title="Compliance Break Down" icon={<Icons.CheckCircle size={15} className="text-[color:var(--status-success)]" />}>
              {(data.breakdown ?? [
                { label: 'Shift Compliance', valueText: 'Collected within shift hours', pct: 100, color: OK },
                { label: 'Start Time', valueText: 'Today 15:38 / Today 15:15', pct: 72, color: ERR },
                { label: 'End Time', valueText: 'Today 16:07 / Today 16:00', pct: 64, color: WARN },
                { label: 'Distance Travelled', valueText: '96km / 100km', pct: 96, color: WARN },
              ]).map((b) => (
                <div key={b.label}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-body-xs">
                    <span className="font-medium text-foreground">{b.label}</span>
                    <span className="truncate text-end" style={{ color: b.color }}>{b.valueText}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color }} /></div>
                </div>
              ))}
            </Card>
            {data.volumeBreakdown && (
              <Card title={data.volumeBreakdown.title} icon={<Icons.Package size={15} className="text-[color:var(--status-success)]" />}>
                <LabeledBar label={data.volumeBreakdown.label} done={data.volumeBreakdown.doneText} pct={data.volumeBreakdown.pct} color={OK} />
              </Card>
            )}
            <Card title={data.grossWeight?.title ?? 'Gross Weight — Collected vs Received'} icon={<Icons.Package size={15} className="text-muted-foreground" />}>
              {(() => {
                const gw = data.grossWeight ?? {
                  title: '', timestamp: '20 Oct, 2025 03:04 pm', discrepancyPct: '5.9%', weightDiff: '−200 kg', withinTolerance: true,
                  collected: { label: 'Collected Weight', value: '3,200 kg', pct: 94 }, received: { label: 'Received Gross Weight', value: '3,400 kg', pct: 100 },
                };
                const tone = gw.withinTolerance ? OK : ERR;
                return (
                  <>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-muted/60 px-3 py-2 text-body-xs">
                      <span><span className="text-muted-foreground">Timestamp: </span><span className="font-semibold text-foreground">{gw.timestamp}</span></span>
                      <span className="h-4 w-px bg-border" />
                      <span><span className="text-muted-foreground">Discrepancy Percentage: </span><span className="font-semibold text-foreground">{gw.discrepancyPct}</span></span>
                      <span className="h-4 w-px bg-border" />
                      <span><span className="text-muted-foreground">Weight Difference: </span><span className="font-semibold text-foreground">{gw.weightDiff}</span></span>
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 font-bold uppercase tracking-wide" style={{ background: `color-mix(in srgb, ${tone} 15%, transparent)`, color: tone }}>
                        {gw.withinTolerance ? 'Within Tolerance' : 'Out of Tolerance'}
                      </span>
                    </div>
                    <LabeledBar label={gw.collected.label} done={gw.collected.value} pct={gw.collected.pct} color={OK} />
                    <LabeledBar label={gw.received.label} done={gw.received.value} pct={gw.received.pct} color={P} />
                  </>
                );
              })()}
            </Card>
          </div>
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card title={data.eventChart?.title ?? 'Event Type Breakdown'} icon={<Icons.BarChartSquare02 size={15} className="text-muted-foreground" />}>
              <BarChart
                data={data.eventChart?.data ?? eventData}
                xKey={data.eventChart?.xKey ?? 'h'}
                series={data.eventChart?.series ?? eventSeries}
                stacked height={220} showLegend
              />
            </Card>
            <Card title={data.weightTrend?.title ?? 'Weight Collection Trend'} icon={<Icons.TrendUp01 size={15} className="text-muted-foreground" />}>
              {data.weightTrend ? (
                <LineChart
                  data={data.weightTrend.data.map((d) => ({ ...d, limit: data.weightTrend!.limit }))}
                  xKey="t"
                  height={240}
                  showLegend
                  series={[
                    ...(data.weightTrend.limit != null ? [{ dataKey: 'limit', name: data.weightTrend.limitLabel ?? 'Allowed Vehicle Limit', color: WARN, strokeDasharray: '7 6' }] : []),
                    { dataKey: 'v', name: data.weightTrend.seriesName, color: data.weightTrend.color ?? P },
                  ]}
                  markers={data.weightTrend.markers}
                />
              ) : (
                <AreaChart data={weightData} xKey="t" series={[{ dataKey: 'kg', name: 'Water Extracted (L)', color: ERR }]} height={220} />
              )}
            </Card>
          </div>
        </div>
        <Card title={data.collectionTrend?.title ?? 'Water Extraction Trend'} icon={<Icons.TrendUp01 size={15} className="text-muted-foreground" />}>
          <LineChart
            data={data.collectionTrend?.data ?? binTrend}
            xKey={data.collectionTrend?.xKey ?? 't'}
            series={data.collectionTrend?.series ?? [{ dataKey: 'bins', name: 'Response Sites Completed', color: OK }]}
            height={240}
            showLegend={!!data.collectionTrend}
          />
        </Card>
        {extraSections}
      </div>

      <EvidenceSheet detail={evidenceId ? data.evidence?.[evidenceId] ?? null : null} onClose={() => setEvidenceId(null)} />

      <ChangeResourceSheet
        open={!!edit}
        title={edit?.title ?? ''}
        options={edit?.options ?? []}
        currentId={edit?.currentId || undefined}
        searchPlaceholder="Search…"
        confirmLabel="Confirm"
        onConfirm={confirmEdit}
        onOpenChange={(o) => { if (!o) setEdit(null); }}
      />
    </div>
  );
}
