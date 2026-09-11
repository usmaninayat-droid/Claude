import { AreaChart } from '@fams/design-system'
import { CloudRain } from 'lucide-react'
import { SectionCard } from '../../components/SectionCard'
import { SeriesLegend, InsightNote } from './analyticsBits'
import { rainfallTrend, rainfallSeries, rainfallSummary } from './floodAnalytics'

/**
 * Rainfall Intensity — Last 24h.
 *
 * Replaces the ported "Hourly Collection Trend" (a single unlabelled
 * waste-collection series whose x-axis ran to an impossible 26:00). A flood
 * dispatcher's first question during a rain event is "is it still coming
 * down, and where" — so this plots mm/h from the monitored gauge network for
 * the three zones carrying the event, with the peak reading called out.
 */
export function RainfallTrendCard() {
  const s = rainfallSummary
  return (
    <SectionCard
      title="Rainfall Intensity — Last 24h"
      icon={<CloudRain size={16} />}
      iconTone="info"
      actions={
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
          {s.stations} stations
        </span>
      }
    >
      <div className="flex flex-1 flex-col gap-3">
        {/* Peak read-out */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-2xl font-bold tabular-nums text-foreground">{s.peak}</span>
          <span className="text-sm text-muted-foreground">mm/h peak</span>
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
            style={{ background: 'var(--status-error)' }}
          >
            {s.band}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {s.peakZone} · {s.peakAt} · {s.total24h} mm in 24h
          </span>
        </div>

        <SeriesLegend items={rainfallSeries.map((r) => ({ name: r.name, color: r.color }))} />

        <AreaChart
          data={rainfallTrend as unknown as Record<string, unknown>[]}
          xKey="time"
          height={236}
          series={rainfallSeries.map((r) => ({ dataKey: r.dataKey, name: r.name, color: r.color }))}
        />

        <InsightNote tone="error">
          <b className="font-semibold">{s.overThreshold} stations</b> are still reporting above the 15&nbsp;mm/h
          alert threshold — intensity is falling but the southern corridor stays at risk.
        </InsightNote>
      </div>
    </SectionCard>
  )
}
