// Delay Reasons data for the Critical Response SLA card.
// Ported from the static prototype (app.js) + Figma node 2227:76367.
//
// The `fulfillmentRate` donut and the four route stat cells that used to live
// here were removed in the 2026-09-01 analytics rework: the cells repeated the
// routes funnel in the KPI strip verbatim, and the donut now shows critical
// SLA compliance instead (see floodAnalytics.ts).

export type Tone = 'success' | 'warning' | 'info'

export interface DelayReason {
  label: string
  num: string
  unit: string
  /** Fill percentage of the bar track. */
  pct: number
  tone: Tone
  icon: 'truck' | 'users' | 'ban'
}

/**
 * Counts reconciled 2026-09-01 with the fleet/crew buckets in
 * `statusBreakdowns.ts`: 1 tanker in the breakdown bucket (LMV-QA04) and 3
 * crew members flagged Late. Road closures are the only figure with no
 * fleet counterpart — they come from the 3 open access-blocked complaints
 * in `gisTabsData.ts` (CMP-101/104/105).
 */
export const delayReasons: DelayReason[] = [
  { label: 'Tanker Breakdown', num: '1', unit: 'Tanker', pct: 42, tone: 'warning', icon: 'truck' },
  { label: 'Crew Shortage', num: '3', unit: 'Members', pct: 78, tone: 'warning', icon: 'users' },
  { label: 'Road Closure', num: '3', unit: 'Locations', pct: 92, tone: 'info', icon: 'ban' },
]
