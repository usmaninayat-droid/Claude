// ── Chart token helpers ───────────────────────────────────────────
export {
  CHART_SERIES_VAR,
  CHART_SERIES_DEFAULT,
  CHART_SERIES_SEQUENTIAL,
  CHART_ACCENTS,
  CHART_HEAT_WARM,
  CHART_HEAT_COOL,
  CHART_AXIS_PROPS,
  CHART_GRID_PROPS,
  HEATMAP_WARM_BUCKETS,
  resolveChartColor,
  bucketColor,
} from './chart-tokens';
export type { ChartAccentName, HeatmapBucket } from './chart-tokens';

// ── Universal chart chrome ────────────────────────────────────────
export { ChartCard } from './chart-card';
export type { ChartCardProps } from './chart-card';
export { WidgetCard } from './widget-card';
export type { WidgetCardProps, WidgetVariant } from './widget-card';
export { WidgetMenu } from './widget-menu';
export type { WidgetMenuProps, WidgetMenuItem } from './widget-menu';
export { BulletChart } from './bullet-chart';
export type { BulletChartProps, BulletItem } from './bullet-chart';
export { FunnelChart } from './funnel-chart';
export type { FunnelChartProps, FunnelStage } from './funnel-chart';
export { WaterfallChart } from './waterfall-chart';
export type { WaterfallChartProps, WaterfallItem } from './waterfall-chart';
export { WaffleChart } from './waffle-chart';
export type { WaffleChartProps, WaffleDatum } from './waffle-chart';
export { CalendarHeatmap } from './calendar-heatmap';
export type { CalendarHeatmapProps, CalendarDay } from './calendar-heatmap';
export { TreemapChart } from './treemap-chart';
export type { TreemapChartProps, TreemapDatum } from './treemap-chart';
export { SankeyChart } from './sankey-chart';
export type { SankeyChartProps, SankeyLink } from './sankey-chart';
export { ScatterChart } from './scatter-chart';
export type { ScatterChartProps, ScatterSeries, ScatterPoint } from './scatter-chart';
export { ComboChart } from './combo-chart';
export type { ComboChartProps, ComboSeries } from './combo-chart';
export { BoxPlot } from './box-plot';
export type { BoxPlotProps, BoxDatum } from './box-plot';
export { IconBadge } from './icon-badge';
export type { IconBadgeProps, IconBadgeTone } from './icon-badge';
export { ChartLegend } from './chart-legend';
export type { ChartLegendItem, ChartLegendProps } from './chart-legend';
export { ChartTooltip } from './chart-tooltip';
export type { ChartTooltipProps, ChartTooltipPayloadItem } from './chart-tooltip';

// ── KPI stat tile ──────────────────────────────────────────────────
export { KpiTile } from './kpi-tile';
export type { KpiTileProps, KpiTrend } from './kpi-tile';
/** @deprecated Use KpiTile (new shape) for production-exact KPIs. */
export { KpiCard } from './kpi-card';
export type { KpiCardProps } from './kpi-card';

// ── Chart kinds ────────────────────────────────────────────────────
export { BarChart } from './bar-chart';
export type { BarChartProps } from './bar-chart';

export { LineChart } from './line-chart';
export type { LineChartProps } from './line-chart';

export { AreaChart } from './area-chart';
export type { AreaChartProps } from './area-chart';

export { DonutChart } from './donut-chart';
export type { DonutChartProps, DonutDatum } from './donut-chart';

export { GaugeChart } from './gauge-chart';
export type { GaugeChartProps, GaugeSector } from './gauge-chart';

export { HeatmapChart } from './heatmap-chart';
export type { HeatmapChartProps, HeatmapCell } from './heatmap-chart';

export { RadarChart } from './radar-chart';
export type { RadarChartProps, RadarSeries } from './radar-chart';

export { ActivityBar } from './activity-bar';
export type { ActivityBarProps, ActivityBarSegment } from './activity-bar';

export { MiniDonutCell } from './mini-donut-cell';
export type { MiniDonutCellProps } from './mini-donut-cell';

// ── Legacy chart components (still exported for back-compat) ─────
export { Sparkline } from './sparkline';
export type { SparklineProps } from './sparkline';
export { ComplianceGauge } from './compliance-gauge';
export type { ComplianceGaugeProps } from './compliance-gauge';
export { CompareBars } from './compare-bars';
export type { CompareBarsProps, CompareBar } from './compare-bars';
