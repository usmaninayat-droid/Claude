import { SectionCard } from '../../components/SectionCard'
import { RadioTower } from 'lucide-react'
import { SeriesLegend, InsightNote } from './analyticsBits'
import { plannedVsActual, REPORTING_TARGET, reportingTone } from './dashboardCharts'

/**
 * Station Reporting by Type.
 *
 * Reworked from the ported "Planned vs Actual Station Reporting". The shape is
 * kept — a thin actual bar capped by the light-grey planned remainder — but
 * two things change so it reads as an operational health signal rather than
 * decoration:
 *   1. Bars are coloured semantically by how far below target they sit
 *      (green ≥ 90%, amber ≥ 75%, red below) instead of a flat brand purple.
 *      A reporting rate IS a status, so it follows the status palette.
 *   2. A dashed target line at 90% gives the bars something to be measured
 *      against, and the class furthest below it is named underneath.
 *
 * Still a hand-rolled CSS chart: the DS BarChart exposes no bar width or
 * category gap, and this card's thin evenly-spaced columns come from Figma.
 */
const Y_TICKS = [100, 75, 50, 25, 0]

const LEGEND = [
  { name: `On target (≥ ${REPORTING_TARGET}%)`, color: 'var(--status-success)' },
  { name: 'Degraded (≥ 75%)', color: 'var(--status-warning)' },
  { name: 'Critical (< 75%)', color: 'var(--status-error)' },
  { name: 'Planned coverage', color: 'var(--gray-200)' },
  { name: `${REPORTING_TARGET}% target line`, color: 'var(--status-success)' },
]

export function StationReportingCard() {
  const worst = plannedVsActual.reduce((a, b) => (b.actual < a.actual ? b : a))
  return (
    <SectionCard
      title="Station Reporting by Type"
      icon={<RadioTower size={16} />}
      iconTone="info"
      actions={
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
          Target {REPORTING_TARGET}%
        </span>
      }
    >
      <div className="flex flex-1 flex-col gap-3">
        <SeriesLegend items={LEGEND} />

        <div className="flex flex-1 gap-2 pt-1">
          {/* Y-axis title */}
          <div className="flex items-center justify-center">
            <span className="rotate-180 text-[11px] text-muted-foreground [writing-mode:vertical-rl]">
              Reporting Percentage
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Plot — grows to fill the card height (matches the taller sibling card) */}
            <div className="relative ml-8 min-h-[280px] flex-1">
              {/* Grid lines + Y labels */}
              {Y_TICKS.map((t) => (
                <div key={t} className="absolute inset-x-0 flex items-center" style={{ top: `${100 - t}%` }}>
                  <span className="absolute -left-8 w-6 -translate-y-1/2 text-right text-[11px] text-muted-foreground">
                    {t}
                  </span>
                  <span className="w-full border-t border-dashed border-border" />
                </div>
              ))}

              {/* Target line */}
              <div
                className="pointer-events-none absolute inset-x-0 flex items-center"
                style={{ top: `${100 - REPORTING_TARGET}%` }}
              >
                <span
                  className="w-full border-t border-dashed"
                  style={{ borderColor: 'var(--status-success)' }}
                />
              </div>

              {/* Bars */}
              <div className="absolute inset-0 flex items-end">
                {plannedVsActual.map((d) => {
                  const planned = Math.min(100, d.actual + d.gap)
                  return (
                    <div key={d.type} className="flex h-full flex-1 items-end justify-center">
                      <div className="relative h-full w-12">
                        {/* planned cap (grey) */}
                        <div
                          className="absolute bottom-0 w-full rounded-t-[3px] bg-[color:var(--gray-200)]"
                          style={{ height: `${planned}%` }}
                        />
                        {/* actual — coloured by distance from target */}
                        <div
                          className="absolute bottom-0 w-full"
                          style={{ height: `${d.actual}%`, background: reportingTone(d.actual) }}
                        />
                        <span className="absolute inset-x-0 text-center text-[11px] font-semibold tabular-nums text-foreground"
                          style={{ bottom: `calc(${planned}% + 4px)` }}
                        >
                          {Math.round(d.actual)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* X labels */}
            <div className="ml-8 flex pt-2">
              {plannedVsActual.map((d) => (
                <span key={d.type} className="flex-1 text-center text-[11px] text-muted-foreground">
                  {d.type}
                </span>
              ))}
            </div>
            <div className="ml-8 pt-1 text-center text-[11px] text-muted-foreground">Station Types</div>
          </div>
        </div>

        <InsightNote tone="warning">
          <b className="font-semibold">{worst.type}s</b> are the weakest class at {Math.round(worst.actual)}%
          reporting — send a field check before the next band arrives.
        </InsightNote>
      </div>
    </SectionCard>
  )
}
