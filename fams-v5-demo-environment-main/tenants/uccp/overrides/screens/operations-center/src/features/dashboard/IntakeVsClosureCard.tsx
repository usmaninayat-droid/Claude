import { LineChart } from '@fams/design-system'
import { MessageSquareWarning } from 'lucide-react'
import { SectionCard } from '../../components/SectionCard'
import { StatCell, SeriesLegend, InsightNote } from './analyticsBits'
import { intakeVsClosure, intakeSeries, intakeSummary } from './floodAnalytics'

/**
 * Complaint Intake vs Closure — this shift.
 *
 * New. The cockpit counted complaints on the map but never showed whether the
 * team was keeping up with them. Two lines on one count axis answer the
 * question directly: where intake crosses back under closure the backlog has
 * turned, and the gap between the curves is the backlog itself.
 */
export function IntakeVsClosureCard() {
  const s = intakeSummary
  return (
    <SectionCard
      title="Complaint Intake vs Closure"
      icon={<MessageSquareWarning size={16} />}
      iconTone="warning"
      actions={
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
          This shift
        </span>
      }
    >
      <div className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-3 gap-2.5">
          <StatCell value={String(s.intake)} label="Complaints Received" accent="warning" />
          <StatCell value={String(s.closed)} label="Resolved &amp; Closed" accent="success" />
          <StatCell value={String(s.backlog)} label="Open Backlog" accent="error" />
        </div>

        <SeriesLegend items={intakeSeries.map((i) => ({ name: i.name, color: i.color }))} />

        <LineChart
          data={intakeVsClosure as unknown as Record<string, unknown>[]}
          xKey="time"
          height={200}
          series={intakeSeries.map((i) => ({ dataKey: i.dataKey, name: i.name, color: i.color }))}
        />

        <InsightNote tone="success">
          Closure overtook intake at <b className="font-semibold">22:00</b> — {s.closureRate}% of this shift&rsquo;s
          complaints are closed and the backlog is now shrinking.
        </InsightNote>
      </div>
    </SectionCard>
  )
}
