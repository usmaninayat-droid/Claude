import type { LatLng } from '../map';

/**
 * Shared data model for the MM Flood "Create New Plan" flow (FM-6364 —
 * "Smart Planning: Flood response plan creation flow"). Figma reference:
 * Tadweer — March Release · qLpsvk0JRDQ7CBoV96s0eU · section 2007-86414
 * ("Interactive Planning"), adapted to the flood-response service rules:
 *
 *   · Step 1 captures name, description, service, zones, depot, assembly
 *     point and discharge point (depot/assembly/discharge are *selected*
 *     from the Zones catalogue, filtered to the chosen zones — never
 *     created here).
 *   · Step 2 captures a vehicle TYPE and a workforce TYPE (never a named
 *     tanker, driver or crew member — that is rostering), an optional
 *     inspector, and renders the map with plan zones, existing plans,
 *     weather stations and a forecast for a date picked on the map.
 *   · No recurrence / frequency / plan dates / shift anywhere; no route,
 *     estimated distance or duration is ever produced or drawn.
 *   · Saving holds the plan as Draft; a duplicate plan name is blocked; a
 *     plan may span several zones and is held as ONE plan.
 */

export interface FloodZoneOption {
  id: string;
  /** Short code shown in the zones table (e.g. "Z-1204"). */
  code: string;
  name: string;
  municipality: string;
  /** Flood-risk tags (e.g. Underpass · Tunnel · Low-lying). */
  tags: string[];
  points: LatLng[];
  /** Legend swatch colour (risk band) — a status token or hex. */
  color: string;
  /** An existing plan already covers this zone (map "existing plans" layer). */
  coveredBy?: string;
}

export type FloodSiteKind = 'depot' | 'assembly' | 'discharge';

/** Depot / assembly point / discharge point — Zones-catalogue records. */
export interface FloodSiteOption {
  id: string;
  kind: FloodSiteKind;
  name: string;
  zoneId: string;
  position: LatLng;
}

export interface FloodVehicleType {
  id: string;
  name: string;
  /** e.g. "25 CBM" */
  capacity: string;
  /** e.g. "Suction tanker" */
  category: string;
  /** Units of this type currently available for rostering. */
  available: number;
}

export interface FloodWorkforceType {
  id: string;
  /** Crew designation, e.g. "Pump Operator". */
  name: string;
  /** Certification / competency label. */
  certification: string;
  /** Crew size the designation implies (e.g. "1 + 2 helpers"). */
  crewSize: string;
  available: number;
}

export interface FloodInspector {
  id: string;
  name: string;
  badge: string;
  phone: string;
  available: boolean;
}

export interface FloodWeatherStation {
  id: string;
  name: string;
  position: LatLng;
  /** Forecast rain (mm) per day offset 0..6 for the date strip. */
  rainMm: number[];
}

export interface FloodExistingPlan {
  id: string;
  name: string;
  zoneIds: string[];
  status: 'DRAFTED' | 'APPROVED';
}

export interface FloodPlanDraft {
  name: string;
  description: string;
  service: string;
  zoneIds: string[];
  depotId?: string;
  assemblyId?: string;
  dischargeId?: string;
  vehicleTypeId?: string;
  workforceTypeId?: string;
  inspectorId?: string;
  /** ISO date (YYYY-MM-DD) picked on the planning map's forecast strip. */
  forecastDate?: string;
  clonePlanId?: string;
}

/** Everything the wizard + planning mode need to render — all config. */
export interface FloodPlanCatalog {
  service: string;
  zones: FloodZoneOption[];
  sites: FloodSiteOption[];
  vehicleTypes: FloodVehicleType[];
  workforceTypes: FloodWorkforceType[];
  inspectors: FloodInspector[];
  weatherStations: FloodWeatherStation[];
  existingPlans: FloodExistingPlan[];
  center: LatLng;
  zoom?: number;
}

export const EMPTY_FLOOD_DRAFT: FloodPlanDraft = {
  name: '',
  description: '',
  service: 'MM Flood Response',
  zoneIds: [],
};

/** Ray-cast point-in-polygon on [lat,lng] rings. */
export function pointInRing(p: LatLng, ring: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i];
    const [yj, xj] = ring[j];
    const intersect = yi > p[0] !== yj > p[0] && p[1] < ((xj - xi) * (p[0] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function ringCentroid(ring: LatLng[]): LatLng {
  const n = ring.length || 1;
  return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n];
}

/** Next `count` days from `from` as ISO dates + short labels for the strip. */
export function forecastDays(from = new Date(), count = 7): { iso: string; dow: string; day: number; mon: string }[] {
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { iso, dow: DOW[d.getDay()], day: d.getDate(), mon: MON[d.getMonth()] };
  });
}

export function fmtForecastDate(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${MON[m - 1]}, ${y}`;
}

/* ── FM-6365 — the saved plan record, its roster and its history ─────────── */

export type FloodPlanStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';
export type FloodShift = 'Morning' | 'Afternoon' | 'Night';

export const FLOOD_STATUS_LABEL: Record<FloodPlanStatus, string> = {
  DRAFT: 'Draft', IN_REVIEW: 'In Review', APPROVED: 'Approved', REJECTED: 'Rejected', SUPERSEDED: 'Superseded',
};
/** Genuine status colours (brand primary is never used for status). */
export const FLOOD_STATUS_TONE: Record<FloodPlanStatus, string> = {
  DRAFT: 'var(--muted-foreground)', IN_REVIEW: 'var(--status-info)', APPROVED: 'var(--status-success)',
  REJECTED: 'var(--status-error)', SUPERSEDED: 'var(--muted-foreground)',
};

/* ── Shift configuration (FM-6353: system configuration, not client-managed;
 *    start/end come WITH the shift — the operator never types times). Overlap
 *    is always evaluated on these actual windows, never on shift labels. ── */
export const FLOOD_SHIFT_CONFIG: Record<FloodShift, { start: string; end: string }> = {
  Morning: { start: '05:00', end: '13:00' },
  Afternoon: { start: '13:00', end: '21:00' },
  Night: { start: '21:00', end: '05:00' }, // crosses midnight
};
export const FLOOD_SHIFTS: FloodShift[] = ['Morning', 'Afternoon', 'Night'];

function hm(t: string): number { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
/** Absolute [start,end) window in ms for a shift on an ISO date (night ends next day). */
export function shiftWindow(dateIso: string, shift: FloodShift): { startMs: number; endMs: number } {
  const [y, m, d] = dateIso.split('-').map(Number);
  const cfg = FLOOD_SHIFT_CONFIG[shift];
  const base = new Date(y, m - 1, d).getTime();
  const start = base + hm(cfg.start) * 60_000;
  let end = base + hm(cfg.end) * 60_000;
  if (end <= start) end += 24 * 3600_000;
  return { startMs: start, endMs: end };
}
/** True when two date+shift assignments overlap in real time (strict). */
export function shiftsOverlap(aDate: string, aShift: FloodShift, bDate: string, bShift: FloodShift): boolean {
  const a = shiftWindow(aDate, aShift);
  const b = shiftWindow(bDate, bShift);
  return a.startMs < b.endMs && b.startMs < a.endMs;
}
export function shiftUnderway(dateIso: string, shift: FloodShift, now = new Date()): boolean {
  const w = shiftWindow(dateIso, shift);
  return now.getTime() >= w.startMs && now.getTime() < w.endMs;
}
/** The shift on this date has fully ended (rostering into it is blocked). */
export function shiftEnded(dateIso: string, shift: FloodShift, now = new Date()): boolean {
  return now.getTime() >= shiftWindow(dateIso, shift).endMs;
}
export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/* ── Named resource pools resolved at rostering time (FM-6368) ───────────── */

/** A specific tanker/unit. Inactive units are never selectable. */
export interface FloodVehicleUnit {
  /** plate, e.g. "LMV-QA01" — the value stored on a roster entry. */
  id: string;
  typeId: string;
  active: boolean;
}
/** A specific crew member. Inactive employees are never selectable. */
export interface FloodCrewMember {
  /** full name — the value stored on a roster entry. */
  id: string;
  typeId: string;
  /** licensed to drive the unit (the roster needs at least one). */
  driver?: boolean;
  active: boolean;
}

/** One rostered date of an approved plan (FM-6365 "Roster" section). */
export interface FloodRosterEntry {
  id: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  shift: FloodShift;
  /** Named tankers (plates) rostered for the plan's vehicle type. */
  vehicles: string[];
  /** Named crew rostered for the plan's workforce type (driver included). */
  crew: string[];
  /** FM-6368 rework — the licensed drivers of `crew` (subset of `crew`). */
  drivers?: string[];
  /** FM-6368 rework — the non-driver members of `crew` (subset of `crew`). */
  workforce?: string[];
  inspector?: string;
  /** shift timing overrides (HH:mm) — distinct from the shift's configured window. */
  startTime?: string;
  endTime?: string;
  notes?: string;
  /** who saved the assignment (named in conflict messages). */
  assignedBy?: string;
  assignedAt?: string;
  /** plan version the generated schedule carries (FM-6370). */
  planVersion?: number;
  /** the one schedule this assignment generated. */
  scheduleId?: string;
}

/* ── Conflict engine (FM-6368 — blocked, not warned) ─────────────────────── */

export interface RosterConflict {
  resource: string;
  resourceKind: 'vehicle' | 'crew';
  planId: string;
  planName: string;
  date: string;
  shift: FloodShift;
  assignedBy: string;
}

/**
 * Every vehicle/crew double-booking a proposed (date, shift, vehicles, crew)
 * would create against ANY live plan's roster, evaluated on actual shift
 * windows. Used both to filter/disable the sheet's options and re-run at save
 * (the demo's stand-in for server-side enforcement).
 */
export function findRosterConflicts(opts: {
  plans: FloodPlanRecord[];
  date: string;
  shift: FloodShift;
  vehicles: string[];
  crew: string[];
  excludeEntryId?: string;
}): RosterConflict[] {
  const out: RosterConflict[] = [];
  const vset = new Set(opts.vehicles);
  const cset = new Set(opts.crew);
  for (const p of opts.plans) {
    if (p.status === 'SUPERSEDED') continue;
    for (const r of p.roster) {
      if (r.id === opts.excludeEntryId) continue;
      if (!shiftsOverlap(r.date, r.shift, opts.date, opts.shift)) continue;
      for (const v of r.vehicles) if (vset.has(v)) out.push({ resource: v, resourceKind: 'vehicle', planId: p.id, planName: p.name, date: r.date, shift: r.shift, assignedBy: r.assignedBy ?? p.updatedBy });
      for (const c of r.crew) if (cset.has(c)) out.push({ resource: c, resourceKind: 'crew', planId: p.id, planName: p.name, date: r.date, shift: r.shift, assignedBy: r.assignedBy ?? p.updatedBy });
    }
  }
  return out;
}

/** "LMV-QA01 is already assigned to 'X' on 3 Sep, 2026 · Morning (05:00–13:00), assigned by N." */
export function conflictMessage(c: RosterConflict): string {
  const cfg = FLOOD_SHIFT_CONFIG[c.shift];
  return `${c.resource} is already assigned to "${c.planName}" on ${fmtForecastDate(c.date)} · ${c.shift} (${cfg.start}–${cfg.end}), assigned by ${c.assignedBy}.`;
}

/* ── Recurrence engine (FM-6368 rework — the roster side sheet) ──────────────
 *  Deterministic, pure, calendar-only: the same rule always yields the same
 *  ISO date list, so the sheet's Preview table and the entries it saves can
 *  never disagree. No timezone maths — everything is local-midnight dates. */

export type RosterFrequency = 'Daily' | 'Weekly' | 'Monthly';

export interface RosterRecurrence {
  frequency: RosterFrequency;
  /** "Repeat every N days / weeks / months" — clamped to >= 1. */
  interval: number;
  /** Weekly only — 0 = Sun … 6 = Sat. Empty → the start date's weekday. */
  weekdays?: number[];
  /** Monthly only — 1 … 31. Empty → the start date's day-of-month. */
  monthDays?: number[];
  /** "Ends on <date>" or "Ends after <N> occurrences". */
  ends: { mode: 'on'; date: string } | { mode: 'after'; count: number };
}

/** Max preview/roster rows a single save may generate. */
export const ROSTER_PREVIEW_CAP = 50;

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dateOf(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
const DAY_MS = 86_400_000;
const DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function dayNameOf(iso: string): string { return DAY_NAME[dateOf(iso).getDay()]; }

/**
 * Every ISO date a roster rule covers, ascending, de-duplicated and capped.
 *  · `recurrence` omitted → every calendar day from `startDate` to `endDate`
 *    (inclusive; `endDate` defaults to `startDate`).
 *  · `recurrence` set → the rule's dates from `startDate`, terminated by its
 *    own `ends` clause (an "ends on" date is also bounded by `endDate` when
 *    one is given).
 */
export function generateRosterDates(opts: {
  startDate: string;
  endDate?: string;
  recurrence?: RosterRecurrence | null;
  cap?: number;
}): string[] {
  const cap = Math.max(1, opts.cap ?? ROSTER_PREVIEW_CAP);
  if (!opts.startDate) return [];
  const start = dateOf(opts.startDate);
  if (Number.isNaN(start.getTime())) return [];
  const r = opts.recurrence;

  const out: string[] = [];
  const push = (iso: string) => { if (!out.includes(iso)) out.push(iso); };

  if (!r) {
    const endIso = opts.endDate && opts.endDate >= opts.startDate ? opts.endDate : opts.startDate;
    for (let t = start.getTime(); out.length < cap; t += DAY_MS) {
      const iso = isoOf(new Date(t));
      if (iso > endIso) break;
      push(iso);
    }
    return out;
  }

  const interval = Math.max(1, Math.floor(r.interval || 1));
  const limitIso = r.ends.mode === 'on'
    ? (opts.endDate && opts.endDate < r.ends.date ? opts.endDate : r.ends.date)
    : opts.endDate;
  const want = Math.min(cap, r.ends.mode === 'after' ? Math.max(1, Math.floor(r.ends.count || 1)) : cap);
  const beyond = (iso: string) => !!limitIso && iso > limitIso;

  if (r.frequency === 'Daily') {
    for (let i = 0; out.length < want && i < 4000; i++) {
      const iso = isoOf(new Date(start.getTime() + i * interval * DAY_MS));
      if (beyond(iso)) break;
      push(iso);
    }
    return out;
  }

  if (r.frequency === 'Weekly') {
    const days = r.weekdays?.length ? [...new Set(r.weekdays)].sort((a, b) => a - b) : [start.getDay()];
    // Week 0 is the Sunday-anchored week that contains the start date.
    const anchor = start.getTime() - start.getDay() * DAY_MS;
    for (let i = 0; out.length < want && i < 4000; i++) {
      const d = new Date(start.getTime() + i * DAY_MS);
      const iso = isoOf(d);
      if (beyond(iso)) break;
      const week = Math.floor((d.getTime() - anchor) / (7 * DAY_MS));
      if (week % interval === 0 && days.includes(d.getDay())) push(iso);
    }
    return out;
  }

  // Monthly
  const doms = r.monthDays?.length ? [...new Set(r.monthDays)].sort((a, b) => a - b) : [start.getDate()];
  for (let k = 0; out.length < want && k < 240; k++) {
    const anchor = new Date(start.getFullYear(), start.getMonth() + k * interval, 1);
    const inMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    let pastLimit = false;
    for (const dom of doms) {
      if (out.length >= want) break;
      if (dom > inMonth) continue; // e.g. the 31st of a 30-day month — skipped
      const iso = isoOf(new Date(anchor.getFullYear(), anchor.getMonth(), dom));
      if (iso < opts.startDate) continue;
      if (beyond(iso)) { pastLimit = true; break; }
      push(iso);
    }
    if (pastLimit) break;
  }
  return out;
}

/** N days after an ISO date, as an ISO date. */
export function isoPlusDays(iso: string, days: number): string {
  return isoOf(new Date(dateOf(iso).getTime() + days * DAY_MS));
}

export interface FloodPlanHistoryEvent {
  id: string;
  /** ISO datetime */
  at: string;
  by: string;
  action: string;
  detail?: string;
  /** status after the event, when the event changed it */
  status?: FloodPlanStatus;
  version?: number;
}

export interface FloodPlanRecord extends FloodPlanDraft {
  id: string;
  status: FloodPlanStatus;
  version: number;
  /** id of the version this one replaced (set on v2+). */
  supersedes?: string;
  roster: FloodRosterEntry[];
  history: FloodPlanHistoryEvent[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export function recordFromDraft(d: FloodPlanDraft, id: string, by: string, at = new Date().toISOString()): FloodPlanRecord {
  return {
    ...d, id, status: 'DRAFT', version: 1, roster: [],
    history: [{ id: `${id}-h1`, at, by, action: 'Created plan', detail: 'Saved as Draft', status: 'DRAFT', version: 1 }],
    createdAt: at, createdBy: by, updatedAt: at, updatedBy: by,
  };
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MON[d.getMonth()]}, ${d.getFullYear()} · ${hh}:${mm}`;
}
