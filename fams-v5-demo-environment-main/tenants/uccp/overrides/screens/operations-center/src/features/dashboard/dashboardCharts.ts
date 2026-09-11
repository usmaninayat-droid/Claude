// Chart data for the "Station Reporting by Type" card.
// Ported from the static prototype (app.js) + Figma node 2227:76367.
//
// The "Hourly Collection Trend" series that used to live here was removed in
// the 2026-09-01 analytics rework — it was a waste-collection leftover whose
// x-axis ran to an impossible 26:00. Its slot is now
// `RainfallTrendCard` (see floodAnalytics.ts).

/**
 * Planned vs Actual Station Reporting — `actual` plus `gap` (the remainder up
 * to 100% coverage for that station class).
 *
 * DATA LINKAGE (2026-09-01 cross-module audit — Build Delegate/
 * DATA-LINKAGE.md): the classes and counts are the `stationClass` split of
 * `tenants/uccp/seeds/rain-sensors.seed.json` (40 stations), and `actual` is
 * that class's reporting share. The seed's only two non-reporting stations
 * are RSN-18 Al Ruwais (a water-level sensor) and RSN-34 West Bay (a wadi
 * monitor), so those are the only two classes below 100%:
 *
 *   Rain Gauge          14/14 = 100.0   (the "14 rain stations" figure)
 *   Water-Level Sensor   8/9  =  88.9   (RSN-18 offline)
 *   Drainage Sensor      8/8  = 100.0
 *   Wadi Monitor         4/5  =  80.0   (RSN-34 offline)
 *   Pump Station         4/4  = 100.0
 *                       38/40 =  95.0   → the KPI strip's reporting rate
 */
export const plannedVsActual = [
  { type: 'Rain Gauge', actual: 100, gap: 0 },
  { type: 'Water-Level Sensor', actual: 88.9, gap: 11.1 },
  { type: 'Drainage Sensor', actual: 100, gap: 0 },
  { type: 'Wadi Monitor', actual: 80, gap: 20 },
  { type: 'Pump Station', actual: 100, gap: 0 },
]

/** Station counts per class — 40 monitored, 38 reporting. */
export const stationClassCounts = [
  { type: 'Rain Gauge', total: 14, reporting: 14 },
  { type: 'Water-Level Sensor', total: 9, reporting: 8 },
  { type: 'Drainage Sensor', total: 8, reporting: 8 },
  { type: 'Wadi Monitor', total: 5, reporting: 4 },
  { type: 'Pump Station', total: 4, reporting: 4 },
]

/** Reporting rate the sensing network is held to, in percent. */
export const REPORTING_TARGET = 90

/** A reporting rate is a health status, so it takes the status palette. */
export function reportingTone(actual: number): string {
  if (actual >= REPORTING_TARGET) return 'var(--status-success)'
  if (actual >= 75) return 'var(--status-warning)'
  return 'var(--status-error)'
}
