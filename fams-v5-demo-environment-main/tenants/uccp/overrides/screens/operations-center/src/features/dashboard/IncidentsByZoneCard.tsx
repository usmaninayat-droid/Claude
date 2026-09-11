import { BarChart } from '@fams/design-system'
import { AlertTriangle } from 'lucide-react'
import { SectionCard } from '../../components/SectionCard'
import { SeriesLegend, InsightNote } from './analyticsBits'
import { incidentsByZone, severitySeries, incidentTotals } from './floodAnalytics'

/**
 * Incidents by Zone & Severity.
 *
 * Replaces the ported "Client Locations" table (a static facility roster with
 * no decision attached to it). This is the "where is it worst" widget: one
 * stacked column per Qatar zone, split by the four incident severities in
 * solid status colours, so the dispatcher can rank zones by critical load at
 * a glance rather than by total volume.
 */
export function IncidentsByZoneCard() {
  return (
    <SectionCard
      title="Incidents by Zone & Severity"
      icon={<AlertTriangle size={16} />}
      iconTone="warning"
      actions={
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
          {incidentTotals.total} requests · {incidentTotals.open} open
        </span>
      }
    >
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-2xl font-bold tabular-nums text-foreground">{incidentTotals.critical}</span>
          <span className="text-sm text-muted-foreground">critical open</span>
          <span className="ml-auto text-xs text-muted-foreground">
            Worst zone: <b className="font-semibold text-foreground">{incidentTotals.worstZone}</b>
          </span>
        </div>

        <SeriesLegend items={severitySeries.map((s) => ({ name: s.name, color: s.color }))} />

        <BarChart
          data={incidentsByZone as unknown as Record<string, unknown>[]}
          xKey="zone"
          height={236}
          stacked
          series={severitySeries.map((s) => ({ dataKey: s.dataKey, name: s.name, color: s.color }))}
        />

        <InsightNote tone="error">
          <b className="font-semibold">{incidentTotals.worstZone}</b> holds 3 of the {incidentTotals.critical}{}
          critical requests — the same municipality taking the heaviest rainfall. Weight the next dispatch south.
        </InsightNote>
      </div>
    </SectionCard>
  )
}
