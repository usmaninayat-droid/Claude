import { KpiMetricCard, Skeleton } from '@fams/ui-kit'
import type { CockpitKpiModel } from './cockpit-model'

/**
 * CockpitKpiStrip — the cockpit's metric strip: 2-up, 3-up from `@3xl`, and
 * 6-up only from an 80rem-wide PANE (container query — 6-up is a ≥1440
 * viewport treatment, UX D.14). Extracted from `CockpitView` (rule 12).
 *
 * Loading pins each placeholder to the LOADED card height (94px = 5.875rem) so
 * the swap to real cards shifts nothing — the CLS half of UX D.17.
 */

/** Skeleton count before any config has resolved — the spec's 6-up strip. */
const KPI_SKELETON_COUNT = 6

export interface CockpitKpiStripProps {
  kpis: CockpitKpiModel[]
  loading?: boolean
  /** Whether a KPI declaring `opens: 'issues'` has a flow sheet to open. */
  issuesFlowAvailable?: boolean
  onOpenIssues: () => void
  /** A KPI with its own `detailColumns` was activated — show its population. */
  onOpenDetail: (kpi: CockpitKpiModel) => void
  /** Fires for every activation, passive cards included. */
  onKpiOpen?: (kpi: { id: string; label: string }) => void
}

export function CockpitKpiStrip({
  kpis,
  loading = false,
  issuesFlowAvailable = false,
  onOpenIssues,
  onOpenDetail,
  onKpiOpen,
}: CockpitKpiStripProps) {
  if (!loading && kpis.length === 0) return null
  return (
    <div
      data-slot="cockpit-kpis"
      className="grid flex-none grid-cols-2 gap-4 @3xl/cockpit:grid-cols-3 @[80rem]/cockpit:grid-cols-6"
    >
      {loading
        ? Array.from({ length: kpis.length || KPI_SKELETON_COUNT }, (_, i) => (
            <Skeleton
              key={i}
              variant="custom"
              data-slot="cockpit-kpi-skeleton"
              className="h-[5.875rem] rounded-md border border-border"
            />
          ))
        : kpis.map((kpi) => {
            const opensIssues = kpi.opens === 'issues' && issuesFlowAvailable
            const clickable = Boolean(opensIssues || kpi.detailColumns?.length || onKpiOpen)
            return (
              <KpiMetricCard
                key={kpi.id}
                data-kpi-id={kpi.id}
                value={kpi.value}
                label={kpi.label}
                // An error-toned zero is a false alarm (D.18) — drop the accent.
                accent={kpi.accent === 'danger' && kpi.value === '0' ? undefined : kpi.accent}
                badge={kpi.badge}
                clickable={clickable}
                onClick={
                  clickable
                    ? () => {
                        if (opensIssues) onOpenIssues()
                        else if (kpi.detailColumns?.length) onOpenDetail(kpi)
                        onKpiOpen?.({ id: kpi.id, label: kpi.label })
                      }
                    : undefined
                }
              />
            )
          })}
    </div>
  )
}

CockpitKpiStrip.displayName = 'CockpitKpiStrip'
