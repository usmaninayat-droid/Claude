import type { DashboardWidgetType } from '@fams/v5-composer'
import {
  AreaWidget,
  BarWidget,
  ComplianceGaugeWidget,
  DonutWidget,
  HeatmapWidget,
  LineWidget,
  SparklineTableWidget,
} from './dashboard-chart-widgets'
import {
  KpiCardWidget,
  LeaderboardWidget,
  ListWidget,
} from './dashboard-data-widgets'
import { applyWidgetFilters, type DashboardDimensionSelection } from './dashboard-filter'
import { GeospatialWidget } from './dashboard-map-widget'
import { StackWidget } from './dashboard-stack-widget'
import type { DashboardWidgetRenderer, DashboardWidgetRenderProps } from './dashboard-widget-shell'

/**
 * dashboard-widgets — the metadata `type` → component map for the
 * `DashboardGrid` template. One entry per value of
 * `DashboardModuleConfig.schema.json`'s 13-value widget enum; the `Record<
 * DashboardWidgetType, …>` key type makes an unhandled enum value a COMPILE
 * error, so the schema and the renderer cannot drift.
 *
 * Same shape as the existing prior art, `entity-profile/OverviewWidgets.tsx`
 * (a metadata widget union + a lookup + `ChartCard`-framed bodies), split
 * across three files here because thirteen widget forms do not fit one file's
 * ~300-line budget (hard rule 12). The implementations live in
 * `dashboard-chart-widgets.tsx` / `dashboard-data-widgets.tsx` /
 * `dashboard-map-widget.tsx`; everything they share lives in
 * `dashboard-widget-shell.tsx`.
 */
export const DASHBOARD_WIDGET_RENDERERS: Record<DashboardWidgetType, DashboardWidgetRenderer> = {
  donut: DonutWidget,
  bar: BarWidget,
  line: LineWidget,
  'stacked-bar': BarWidget,
  area: AreaWidget,
  'compliance-gauge': ComplianceGaugeWidget,
  'heatmap-calendar': HeatmapWidget,
  'geospatial-heatmap': GeospatialWidget,
  leaderboard: LeaderboardWidget,
  list: ListWidget,
  'kpi-card': KpiCardWidget,
  'stat-with-target': KpiCardWidget,
  'sparkline-table': SparklineTableWidget,
  stack: StackWidget,
}

/**
 * Render one widget. An unrecognized `type` (only reachable from unvalidated
 * JSON — `validateDashboardModuleConfig` rejects it) renders nothing rather
 * than throwing, so one bad widget never takes the dashboard down.
 */
export function DashboardWidgetView(props: DashboardWidgetRenderProps & { selection?: DashboardDimensionSelection }) {
  const { selection, ...rest } = props
  const render = DASHBOARD_WIDGET_RENDERERS[props.widget.type]
  if (!render) return null
  // The ONE place a filter selection meets a widget: the widget is handed a
  // `dataSource` already projected through the active pill values, so every
  // renderer below — and therefore every `aria-label`, every legend and every
  // auto-built sr-only data table — is built from the filtered data without
  // any of them knowing filtering exists.
  const widget = selection ? applyWidgetFilters(props.widget, selection) : props.widget
  return <>{render({ ...rest, widget })}</>
}

DashboardWidgetView.displayName = 'DashboardWidgetView'

export type { DashboardWidgetRenderer, DashboardWidgetRenderProps, DashboardFilterValues } from './dashboard-widget-shell'
export * from './dashboard-filter'
