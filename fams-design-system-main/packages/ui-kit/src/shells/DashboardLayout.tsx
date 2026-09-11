import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface DashboardLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Header region — title, date-range control, filter fields, export action.
   * Fully composed by the caller (e.g. a heading plus a `DateRangePicker` and
   * an export `Button`); the shell only owns the surrounding spacing. Omit to
   * render no header row.
   */
  header?: ReactNode
  /**
   * KPI tile row — caller-supplied tiles (e.g. `KpiTile`), laid out in a
   * grid that wraps responsively as the container narrows. Omit to hide the
   * row.
   */
  kpis?: ReactNode
  /**
   * Chart grid content. Rendered in a responsive grid — a single column
   * below `lg`, twelve columns from `lg` up. Each child controls its own
   * width via a `col-span-*` / `lg:col-span-*` utility on its own wrapper
   * element; the shell has no opinion on how many columns any one chart
   * takes, and no knowledge of which charts exist.
   */
  children: ReactNode
  /** Extra content rendered below the chart grid (tables, activity feeds, …). */
  footer?: ReactNode
}

/**
 * DashboardLayout — the standard dashboard-page skeleton. [L4 shell]
 *
 *   ┌ header (optional — title / date-range / filters / export) ┐
 *   ├ KPI tile row (optional — wraps responsively)                ┤
 *   ├ chart grid — responsive 12-col on lg+, children own span   ┤
 *   └ footer slot (optional — tables, feeds, …)                  ┘
 *
 * Pure chrome: it owns the spacing between regions and the two grid
 * mechanics (the KPI row's column count per breakpoint, the 12-col chart
 * grid). It has no opinion on which charts or KPIs are rendered, imports no
 * chart engine, and does not bake in `DateRangePicker`/`KpiTile`/`ChartCard`
 * — those are the caller's children (demonstrated together in the showcase
 * demo only). RTL inherited from the document; no physical-direction
 * utilities here.
 *
 * @usage-v5
 *   No generic dashboard scaffold exists in v5 — each dashboard-shaped view
 *   hand-rolls its own header/KPI-row/grid markup from scratch:
 *   - shared/components/tabs/panels/asset/vehicle/FuelMonitoring.vue —
 *     `q-popup-proxy`+`q-date` range header, `row q-col-gutter-md` gauge +
 *     4-tile KPI grid, stacked chart widgets below (cleanest full match)
 *   - shared/components/profile/DriverSafetyOverview.vue — same `q-date`
 *     header idiom, KPI tiles + a `row q-gutter-md` grid of chart cards
 *   - iwmp/components/tabs/panels/asset/vehicle/WorkforceActivity.vue —
 *     partial match: stat-tile header + `q-date` popup, weaker chart grid
 *   Forms needed: optional header/kpis/footer slots, a KPI row that wraps
 *   responsively, a 12-col responsive chart grid with caller-owned spans.
 * @usage-index dashboard-layout
 */
export const DashboardLayout = forwardRef<HTMLDivElement, DashboardLayoutProps>(
  ({ header, kpis, children, footer, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="dashboard-layout"
        className={cn('flex flex-col gap-6 p-6', className)}
        {...props}
      >
        {header ? (
          <div
            data-testid="dashboard-header"
            className="flex flex-wrap items-center gap-3"
          >
            {header}
          </div>
        ) : null}

        {kpis ? (
          <div
            data-testid="dashboard-kpi-row"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {kpis}
          </div>
        ) : null}

        <div
          data-testid="dashboard-chart-grid"
          className="grid grid-cols-1 gap-4 lg:grid-cols-12"
        >
          {children}
        </div>

        {footer ? <div data-testid="dashboard-footer">{footer}</div> : null}
      </div>
    )
  },
)

DashboardLayout.displayName = 'DashboardLayout'
