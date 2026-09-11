import type { KpiMetricCardProps } from '../../components/KpiMetricCard'

/**
 * 12 KPIs — Qatar MME UCCP flood-response cockpit.
 *
 * Clustered around the four questions a dispatcher actually asks, in the
 * order they ask them (2026-09-01 IA pass):
 *   1. Is today's response plan executing?  → the routes funnel
 *   2. Is my sensing network healthy?       → stations
 *   3. Do I have capacity to respond?       → tankers + crew
 *   4. What needs me right now?             → the single red alert card
 *
 * Because each group carries its own header, the card labels drop the
 * repeated "Response Routes"/"Stations" suffix — the funnel now scans as
 * Scheduled → Dispatched → Ongoing → Delayed → Completed → Pending instead
 * of six near-identical strings. `detailLabel` keeps the full, unambiguous
 * wording for the raw-data side sheet.
 *
 * See KpiMetricCard for the single semantic-colour rule these states obey.
 *
 * DATA LINKAGE (2026-09-01 cross-module audit — Build Delegate/
 * DATA-LINKAGE.md). Every number here is now a count over a shared seed:
 *   - the routes funnel counts `tenants/uccp/seeds/plan-monitoring.seed.json`
 *     (29 rows): Scheduled = all rows; Dispatched = Executing + Completed
 *     (8 + 10 = 18); Ongoing = Executing (8); Completed = Completed (10);
 *     Pending = Scheduled-status rows not yet dispatched (11); Delayed = the
 *     3 Executing rows whose Compliance % is under 70 (FPL-4004/4005/4006).
 *     Dispatched + Pending = 18 + 11 = 29; Ongoing + Completed = Dispatched.
 *   - stations count `tenants/uccp/seeds/rain-sensors.seed.json` (40 rows,
 *     38 with sensorsState "reporting") → 38/40 = 95.0%.
 *   - the tanker fleet counts the 18 `kind: "tanker"` rows in
 *     live-monitoring.seed.json; 16/18 available = 18 minus the 1 breakdown
 *     and 1 inactive tanker in `statusBreakdowns.ts`.
 *   - crew: 42 of the 66 in `statusBreakdowns.ts` are on duty → 64%.
 */
export type KpiItem = KpiMetricCardProps & {
  /** Full wording used as the side-sheet title (card label is group-relative). */
  detailLabel: string
}

export type KpiGroup = {
  id: string
  title: string
  /** Columns this group occupies in the 6-column strip = its number of cards. */
  cols: 1 | 2 | 3 | 6
  items: KpiItem[]
}

export const kpiGroups: KpiGroup[] = [
  {
    id: 'response-plan',
    title: 'Response Routes — Today',
    cols: 6,
    items: [
      {
        label: 'Scheduled',
        detailLabel: 'Scheduled Response Routes',
        value: '29',
        state: 'neutral',
        // More routes planned than yesterday is workload, not health → neutral.
        delta: { text: '3 vs Yest.', direction: 'up', polarity: 'neutral' },
      },
      { label: 'Dispatched', detailLabel: 'Dispatched Response Routes', value: '18/29', state: 'neutral' },
      { label: 'Ongoing', detailLabel: 'Ongoing Response Routes', value: '8', state: 'neutral' },
      {
        label: 'Delayed',
        detailLabel: 'Delayed Response Routes',
        value: '3',
        state: 'critical',
        // Up is BAD here — colour follows consequence, not direction.
        delta: { text: '1 vs Yest.', direction: 'up', polarity: 'bad' },
      },
      { label: 'Completed', detailLabel: 'Completed Response Routes', value: '10', state: 'healthy' },
      { label: 'Pending', detailLabel: 'Pending Response Routes', value: '11', state: 'warning' },
    ],
  },
  {
    id: 'sensing-network',
    title: 'Sensing Network',
    cols: 3,
    items: [
      {
        label: 'Reporting Rate',
        detailLabel: 'Station Reporting Rate',
        value: '95.0%',
        state: 'healthy',
        delta: { text: '2% vs Yest.', direction: 'up', polarity: 'good' },
      },
      { label: 'Monitored Stations', detailLabel: 'Monitored Stations', value: '40', state: 'neutral' },
      { label: 'Reporting Stations', detailLabel: 'Reporting Stations', value: '38', state: 'neutral' },
    ],
  },
  {
    id: 'capacity',
    title: 'Capacity',
    cols: 2,
    items: [
      {
        label: 'Tanker Fleet Available',
        detailLabel: 'Available Tanker Fleet',
        value: '16/18',
        state: 'healthy',
        share: '89%',
      },
      {
        label: 'Response Crew Available',
        detailLabel: 'Available Response Crew',
        value: '42',
        state: 'warning',
        share: '64%',
      },
    ],
  },
  {
    id: 'needs-attention',
    title: 'Needs Attention',
    cols: 1,
    items: [
      {
        label: 'Action Required',
        detailLabel: 'Action Required',
        value: '3',
        state: 'critical',
        action: 'View Details',
      },
    ],
  },
]
