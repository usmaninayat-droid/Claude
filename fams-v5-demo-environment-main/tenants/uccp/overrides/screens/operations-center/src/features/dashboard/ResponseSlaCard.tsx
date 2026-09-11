import { DonutChart } from '@fams/design-system'
import { Timer, Truck, Users, Ban } from 'lucide-react'
import { SectionCard } from '../../components/SectionCard'
import { StatCell, InsightNote } from './analyticsBits'
import { slaCompliance, slaTarget, slaStats } from './floodAnalytics'
import { delayReasons, type Tone } from './routeFulfillment'

/**
 * Critical Response SLA.
 *
 * Reworked from the ported "Route Fulfillment" card. The gauge and the Delay
 * Reasons block are kept — both earn their place — but the four route-count
 * cells (Completed / Delayed / Ongoing / Scheduled Routes) were a verbatim
 * repeat of the routes funnel in the KPI strip directly above, so they are
 * replaced by the numbers nobody else on the page carries: how fast critical
 * incidents are actually being reached against the 45-minute target.
 */
const TONE_COLOR: Record<Tone, string> = {
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  info: 'var(--status-info)',
}

const REASON_ICON = { truck: Truck, users: Users, ban: Ban }

export function ResponseSlaCard() {
  return (
    <SectionCard
      title="Critical Response SLA"
      icon={<Timer size={16} />}
      iconTone="primary"
      actions={
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
          Target {slaTarget}
        </span>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Gauge + SLA stat cells */}
        <div className="flex items-center gap-4">
          <div className="w-[172px] shrink-0">
            <DonutChart
              data={[
                { name: 'Within SLA', value: slaCompliance, color: 'var(--status-success)' },
                { name: 'Breached', value: 100 - slaCompliance, color: 'var(--status-error)' },
              ]}
              height={172}
              innerRadius={58}
              outerRadius={80}
              centerLabel={
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{slaCompliance}%</div>
                  <div className="text-xs text-muted-foreground">Within SLA</div>
                </div>
              }
            />
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2.5">
            {slaStats.map((s) => (
              <StatCell key={s.label} value={s.value} total={s.total} label={s.label} accent={s.accent} />
            ))}
          </div>
        </div>

        <InsightNote tone="warning">
          <b className="font-semibold">11 critical incidents</b> missed the {slaTarget} target this event — every
          one of them in a zone where a tanker was already committed elsewhere.
        </InsightNote>

        {/* Delay Reasons — why the misses happened */}
        <div className="rounded-md border border-border p-4">
          <div className="text-sm font-semibold text-foreground">Delay Reasons</div>
          <div className="mt-3 flex flex-col gap-3.5">
            {delayReasons.map((r) => {
              const Icon = REASON_ICON[r.icon]
              return (
                <div key={r.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      {r.label}
                      <Icon className="size-3.5 text-muted-foreground" />
                    </span>
                    <span className="text-muted-foreground">
                      <b className="font-semibold text-foreground">{r.num}</b> {r.unit}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[color:var(--gray-200)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${r.pct}%`, background: TONE_COLOR[r.tone] }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </SectionCard>
  )
}
