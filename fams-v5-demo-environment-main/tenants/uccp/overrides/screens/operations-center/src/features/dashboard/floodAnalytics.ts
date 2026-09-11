/**
 * Flood-response analytics — the data behind the cockpit widgets that sit
 * BELOW the Live GIS Map (2026-09-01 rework).
 *
 * DATA LINKAGE (2026-09-01 cross-module audit — see Build Delegate/
 * DATA-LINKAGE.md): every series below is now derived from a shared seed
 * rather than invented locally.
 *   - the zone axis is the MUNICIPALITY axis (the 5 values the incidents and
 *     plan-monitoring blueprints both enumerate: Doha, Al Wakrah, Umm Salal,
 *     Al Daayen, Al Rayyan) — NOT the 16 catchment zones in the Zones module,
 *     which nest inside these municipalities.
 *   - `incidentsByZone` is the exact municipality x severity cross-tab of
 *     `tenants/uccp/seeds/incidents.seed.json` (36 requests, 18 of them open).
 *   - `clearanceByZone.tankers` sums to 9 — the on-route bucket in
 *     `statusBreakdowns.ts`, distributed by the municipality of the 8
 *     Executing rows in `tenants/uccp/seeds/plan-monitoring.seed.json`.
 *
 * These replace the waste-collection leftovers the dispatcher app was ported
 * from ("Hourly Collection Trend", "Client Locations"). Every series here is
 * grounded in a domain the cockpit already models elsewhere on the page:
 *   - 40 monitored rain/water-level stations   → rainfall intensity
 *   - Qatar zones (Al Wakrah, Umm Salal, …)    → incidents by zone
 *   - incidents/complaints with 4 severities   → severity split, SLA
 *   - 24 response routes / 18 tankers / 66 crew → clearance + delay reasons
 *
 * The active rain event modelled here peaks at ~19:00–22:00 over the southern
 * corridor (Al Wakrah / Industrial Area), which is why those zones carry the
 * incident load, the SLA breaches and the open clearance work.
 */

/* ────────────────────────────────────────────────────────────────────────
 * 1. Rainfall intensity — last 24h, mm/h, worst three zones
 * ──────────────────────────────────────────────────────────────────────── */

export interface RainfallPoint {
  time: string
  /** mm/h, peak gauge in the municipality. */
  wakra: number
  doha: number
  rayyan: number
}

/** Two-hourly readings across the event window (04:00 → 02:00 next day). */
export const rainfallTrend: RainfallPoint[] = [
  { time: '04:00', wakra: 0, doha: 0, rayyan: 0 },
  { time: '06:00', wakra: 1.2, doha: 0.4, rayyan: 0.8 },
  { time: '08:00', wakra: 3.6, doha: 1.1, rayyan: 2.4 },
  { time: '10:00', wakra: 6.8, doha: 2.6, rayyan: 5.2 },
  { time: '12:00', wakra: 9.4, doha: 4.2, rayyan: 7.1 },
  { time: '14:00', wakra: 12.1, doha: 5.0, rayyan: 8.6 },
  { time: '16:00', wakra: 18.7, doha: 6.8, rayyan: 12.4 },
  { time: '18:00', wakra: 26.3, doha: 9.4, rayyan: 19.8 },
  { time: '20:00', wakra: 31.5, doha: 11.2, rayyan: 24.1 },
  { time: '22:00', wakra: 22.8, doha: 8.7, rayyan: 20.6 },
  { time: '00:00', wakra: 14.2, doha: 5.3, rayyan: 13.9 },
  { time: '02:00', wakra: 7.5, doha: 2.9, rayyan: 8.2 },
]

/** Series definition — one entry per zone plotted, in legend order. */
export const rainfallSeries = [
  { dataKey: 'wakra', name: 'Al Wakrah', color: 'var(--status-error)' },
  { dataKey: 'doha', name: 'Doha', color: 'var(--status-warning)' },
  { dataKey: 'rayyan', name: 'Al Rayyan', color: 'var(--status-info)' },
] as const

/** Headline read-outs shown above the plot. */
export const rainfallSummary = {
  peak: '31.5',
  peakZone: 'Al Wakrah',
  peakAt: '20:00',
  /** IMD-style intensity band for the peak reading. */
  band: 'Very Heavy',
  total24h: '164',
  /** Stations currently reporting above the 15 mm/h alert threshold. */
  overThreshold: 7,
  stations: 40,
}

/* ────────────────────────────────────────────────────────────────────────
 * 2. Incidents by zone × severity
 * ──────────────────────────────────────────────────────────────────────── */

export interface ZoneIncidentRow {
  zone: string
  critical: number
  high: number
  medium: number
  low: number
}

/**
 * Exact municipality x severity cross-tab of `incidents.seed.json` — the SAME
 * 36 requests the Requests & Complaints module lists and the Command Center
 * plots. Regenerate with:
 *   node -e "const i=require('./tenants/uccp/seeds/incidents.seed.json'); ..."
 * (`municipality` x `systemcol2`). Do not hand-edit one without the other.
 */
export const incidentsByZone: ZoneIncidentRow[] = [
  { zone: 'Doha', critical: 1, high: 4, medium: 4, low: 1 },
  { zone: 'Al Wakrah', critical: 3, high: 2, medium: 1, low: 1 },
  { zone: 'Umm Salal', critical: 0, high: 2, medium: 3, low: 2 },
  { zone: 'Al Daayen', critical: 3, high: 1, medium: 1, low: 1 },
  { zone: 'Al Rayyan', critical: 0, high: 2, medium: 3, low: 1 },
]

/**
 * Requests still in an OPEN stage (intake / triage / acknowledged / assessed /
 * reopened) per municipality — the same rule the Command Center's "Open
 * Requests" KPI applies to the same seed. 18 of the 36.
 */
export const openByZone: Record<string, number> = {
  Doha: 6, 'Al Wakrah': 2, 'Umm Salal': 3, 'Al Daayen': 3, 'Al Rayyan': 4,
}

/** Severity series — solid status colours, worst → mildest. */
export const severitySeries = [
  { dataKey: 'critical', name: 'Critical', color: 'var(--status-error)' },
  { dataKey: 'high', name: 'High', color: 'var(--status-warning)' },
  { dataKey: 'medium', name: 'Medium', color: 'var(--chart-accent-yellow)' },
  { dataKey: 'low', name: 'Low', color: 'var(--status-success)' },
] as const

export const incidentTotals = {
  /** All logged requests in the event window (36). */
  total: incidentsByZone.reduce((n, z) => n + z.critical + z.high + z.medium + z.low, 0),
  /** Requests still in an open stage (18). */
  open: Object.values(openByZone).reduce((n, v) => n + v, 0),
  critical: incidentsByZone.reduce((n, z) => n + z.critical, 0),
  /** Most critical load — Al Wakrah and Al Daayen tie on 3; Al Wakrah carries
   *  the higher total (7) and the rainfall peak, so it takes the callout. */
  worstZone: 'Al Wakrah',
}

/* ────────────────────────────────────────────────────────────────────────
 * 3. Critical-incident response SLA
 * ──────────────────────────────────────────────────────────────────────── */

export interface SlaStat {
  value: string
  total?: string
  label: string
  accent?: 'success' | 'warning' | 'error'
}

/** % of critical (P1) incidents reached inside the 45-minute target. */
export const slaCompliance = 71.4 // 5 of 7 P1 requests reached inside 45 min

export const slaTarget = '45 min'

/**
 * Denominators come from the incidents seed: 36 requests total, 7 of them
 * Critical (P1). 5 of the 7 were reached inside the 45-minute target, 2
 * breached; 2 P1s are still in an open stage.
 */
export const slaStats: SlaStat[] = [
  { value: '32m', label: 'Avg. Time to Site', accent: 'success' },
  { value: '5', total: '7', label: 'Within SLA', accent: 'success' },
  { value: '2', label: 'SLA Breached', accent: 'error' },
  { value: '2', label: 'P1 Still Open', accent: 'warning' },
]

/* ────────────────────────────────────────────────────────────────────────
 * 4. Complaint intake vs closure — this shift
 * ──────────────────────────────────────────────────────────────────────── */

export interface IntakePoint {
  time: string
  intake: number
  closed: number
}

export const intakeVsClosure: IntakePoint[] = [
  { time: '12:00', intake: 6, closed: 5 },
  { time: '14:00', intake: 11, closed: 8 },
  { time: '16:00', intake: 19, closed: 12 },
  { time: '18:00', intake: 27, closed: 15 },
  { time: '20:00', intake: 34, closed: 19 },
  { time: '22:00', intake: 22, closed: 24 },
  { time: '00:00', intake: 13, closed: 21 },
  { time: '02:00', intake: 8, closed: 16 },
]

export const intakeSeries = [
  { dataKey: 'intake', name: 'New Complaints', color: 'var(--status-warning)' },
  { dataKey: 'closed', name: 'Closed', color: 'var(--status-info)' },
] as const

const totalIntake = intakeVsClosure.reduce((n, p) => n + p.intake, 0)
const totalClosed = intakeVsClosure.reduce((n, p) => n + p.closed, 0)

export const intakeSummary = {
  intake: totalIntake,
  closed: totalClosed,
  backlog: totalIntake - totalClosed,
  /** Closure rate as a whole percent. */
  closureRate: Math.round((totalClosed / totalIntake) * 100),
}

/* ────────────────────────────────────────────────────────────────────────
 * 5. Water-level clearance progress by zone
 * ──────────────────────────────────────────────────────────────────────── */

export interface ClearanceRow {
  zone: string
  /** Flooded points pumped clear. */
  cleared: number
  /** Total flooded points logged in the zone. */
  total: number
  /** Tankers currently working the zone. */
  tankers: number
  /** Deepest standing water still logged, in cm. */
  depth: number
}

/**
 * `tankers` = the on-route bucket (9) split by the municipality of the 8
 * Executing rows in plan-monitoring.seed.json: Al Wakrah 3 (FPL-3001/4005/
 * 4016), Doha 3 (FPL-3002/3008/4006), Al Daayen 2 (FPL-4004 runs two),
 * Umm Salal 1 (FPL-4017), Al Rayyan 0 — that municipality's work is done.
 */
export const clearanceByZone: ClearanceRow[] = [
  { zone: 'Al Wakrah', cleared: 7, total: 19, tankers: 3, depth: 62 },
  { zone: 'Doha', cleared: 9, total: 17, tankers: 3, depth: 48 },
  { zone: 'Al Daayen', cleared: 8, total: 13, tankers: 2, depth: 31 },
  { zone: 'Umm Salal', cleared: 9, total: 12, tankers: 1, depth: 22 },
  { zone: 'Al Rayyan', cleared: 8, total: 9, tankers: 0, depth: 9 },
]

/** A zone's bar colour follows how much is LEFT, not how much is done. */
export function clearanceTone(row: ClearanceRow): string {
  const pct = (row.cleared / row.total) * 100
  if (pct < 45) return 'var(--status-error)'
  if (pct < 75) return 'var(--status-warning)'
  return 'var(--status-success)'
}

export const clearanceSummary = {
  cleared: clearanceByZone.reduce((n, z) => n + z.cleared, 0),
  total: clearanceByZone.reduce((n, z) => n + z.total, 0),
  tankers: clearanceByZone.reduce((n, z) => n + z.tankers, 0),
}
