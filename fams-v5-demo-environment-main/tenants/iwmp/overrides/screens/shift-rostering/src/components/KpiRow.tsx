import { KpiTile } from '@fams/ui-kit'
import { getIcon } from '@fams/ui-kit/icons'

export interface BoardKpis {
  utilization: number
  scheduled: number
  unfilled: number
  /** Route cells failing eligibility — untrained-for-vehicle, licence, status, double assignment. */
  conflicts: number
}

/**
 * The week's headline counts, above the board — utilization, scheduled duties,
 * unfilled slots and blocked cells (the same shape the reference planning view
 * shows). Every number is derived from the visible rows, so it is verifiable
 * from what is on screen. `KpiTile`'s `stat` layout gives the icon-chip anatomy
 * for free; tone drives both the chip and the value ink.
 */
export function KpiRow({ kpis, onShowConflicts }: { kpis: BoardKpis; onShowConflicts?: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-3 md:grid-cols-4">
      <KpiTile
        layout="stat"
        icon={getIcon('pie-chart-01')}
        tone={kpis.utilization >= 80 ? 'success' : kpis.utilization >= 40 ? 'warning' : 'danger'}
        label="Overall utilization"
        value={`${kpis.utilization}%`}
      />
      <KpiTile layout="stat" icon={getIcon('calendar-check-01')} tone="info" label="Scheduled duties" value={kpis.scheduled.toLocaleString('en-GB')} />
      <KpiTile layout="stat" icon={getIcon('x-circle')} tone={kpis.unfilled > 0 ? 'warning' : 'neutral'} label="Unfilled slots" value={kpis.unfilled.toLocaleString('en-GB')} />
      <KpiTile
        layout="stat"
        icon={getIcon('alert-circle')}
        tone={kpis.conflicts > 0 ? 'danger' : 'success'}
        label="Conflicts"
        value={kpis.conflicts.toLocaleString('en-GB')}
        clickable={Boolean(onShowConflicts)}
        {...(onShowConflicts ? { onClick: onShowConflicts } : {})}
      />
    </div>
  )
}
