import { Waves, Truck } from 'lucide-react'
import { SectionCard } from '../../components/SectionCard'
import { StatCell, InsightNote } from './analyticsBits'
import { clearanceByZone, clearanceTone, clearanceSummary } from './floodAnalytics'

/**
 * Water-Level Clearance by Zone.
 *
 * New. Ranked progress list — flooded points pumped clear over points logged,
 * per zone, with the tankers currently working it and the deepest standing
 * water still recorded. Each bar's colour follows how much is LEFT (red under
 * 45% clear, amber under 75%, green above), so the eye lands on the zone that
 * still needs tankers rather than the one that has done the most work.
 *
 * Rendered as CSS bars rather than a chart component: the row needs a label,
 * a count, a tanker chip and a depth read-out on one line, which no chart
 * kind in the DS carries.
 */
export function ClearanceProgressCard() {
  const s = clearanceSummary
  const pct = Math.round((s.cleared / s.total) * 100)
  return (
    <SectionCard
      title="Water-Level Clearance by Zone"
      icon={<Waves size={16} />}
      iconTone="info"
      actions={
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
          {pct}% clear
        </span>
      }
    >
      <div className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-3 gap-2.5">
          <StatCell value={String(s.cleared)} total={String(s.total)} label="Points Cleared" accent="success" />
          <StatCell value={String(s.total - s.cleared)} label="Still Flooded" accent="error" />
          <StatCell value={String(s.tankers)} label="Tankers Engaged" accent="info" />
        </div>

        <div className="flex flex-1 flex-col gap-3.5 rounded-md border border-border p-4">
          {clearanceByZone.map((z) => {
            const zonePct = Math.round((z.cleared / z.total) * 100)
            return (
              <div key={z.zone}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-foreground">
                    <span className="truncate">{z.zone}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-[4px] border border-border px-1.5 py-px text-[11px] font-normal text-muted-foreground">
                      <Truck className="size-3" />
                      {z.tankers}
                    </span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-muted-foreground">
                    <b className="font-semibold tabular-nums text-foreground">
                      {z.cleared}/{z.total}
                    </b>{' '}
                    · {z.depth} cm deep
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[color:var(--gray-200)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${zonePct}%`, background: clearanceTone(z) }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <InsightNote tone="error">
          <b className="font-semibold">Al Wakrah</b> is only 37% clear with 62&nbsp;cm still standing — the
          largest remaining clearance job on the network.
        </InsightNote>
      </div>
    </SectionCard>
  )
}
