import type { ModuleConfig } from '@ds/components/app-shell';
import { Dashboard, DashboardWidgetGrid } from '@ds/components/app-shell';
import { BarChart, DonutChart } from '@ds/components/data-viz';
import { Activity, BarChart01, AlertTriangle, CheckCircle } from '@ds/icons';

/**
 * Dashboard BLOCK — a reusable monitoring surface: filter-fields bar + KPI strip +
 * chart grid + declarative widget grid. A `dashboard` module is config: a
 * `ModuleConfig` with `tabKind:'instance'` whose tab composes the DS `Dashboard`
 * layout. No bespoke screen. (Genericised from facilities-ops `dashboard.tsx`.)
 *
 * ADAPT: derive every number from the SAME record arrays the app's other modules
 * use (so the figures always agree); rename KPIs/charts/filters to the use case;
 * swap the placeholder series below. Keep the layout. See dashboard.block.md.
 */

// Placeholder series — replace with values computed from the app's real data arrays.
const byStage = [
  { stage: 'Reported', count: 4 },
  { stage: 'In Progress', count: 6 },
  { stage: 'Review', count: 3 },
  { stage: 'Done', count: 9 },
];
const byCategory = ['Type A', 'Type B', 'Type C'].map((name, i) => ({
  name,
  value: [8, 6, 4][i],
  color: `var(--chart-${(i % 6) + 1})`,
}));

export const dashboardBlock: ModuleConfig = {
  id: 'dashboard',
  type: 'dashboard',
  label: 'Dashboard',
  icon: Activity,
  tabKind: 'instance',
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      render: () => (
        <Dashboard
          dateLabel="01 Jun – 15 Jun, 2026"
          ranges={['Last 7 Days', 'Last 30 Days', 'This Month', 'All Time']}
          filters={[
            { id: 'category', label: 'Category', options: byCategory.map((c) => ({ value: c.name, label: c.name, color: c.color, count: c.value })) },
          ]}
          onExport={() => {}}
          kpis={[
            { id: 'total', label: 'Total', value: '22', icon: <BarChart01 size={20} />, trend: 'neutral', trendValue: 'All records' },
            { id: 'open', label: 'Open', value: '13', icon: <Activity size={20} />, iconColor: 'var(--status-warning)', trend: 'up', trendValue: '+3 vs last week' },
            { id: 'attention', label: 'Needs Attention', value: '3', icon: <AlertTriangle size={20} />, iconColor: 'var(--status-error)', trend: 'down', trendValue: '-1 vs last week' },
            { id: 'done', label: 'Completed', value: '9', icon: <CheckCircle size={20} />, iconColor: 'var(--status-success)', trend: 'up', trendValue: '+4 vs last week' },
            { id: 'rate', label: 'Completion Rate', value: '72', unit: '%', trend: 'up', trendValue: '+5% vs last month' },
          ]}
          sections={[
            {
              id: 'by-stage', title: 'By Stage', subtitle: 'Pipeline distribution', icon: <BarChart01 size={16} />, span: 7,
              children: <BarChart data={byStage} xKey="stage" series={[{ dataKey: 'count', name: 'Count', color: 'var(--primary)' }]} height={260} />,
            },
            {
              id: 'by-category', title: 'By Category', subtitle: 'Composition', icon: <Activity size={16} />, span: 5,
              children: <DonutChart data={byCategory} height={260} centerLabel={<span className="text-h6 font-semibold">18</span>} />,
            },
          ]}
        >
          <DashboardWidgetGrid
            widgets={[
              { kind: 'gauge', title: 'On-time %', span: 4, value: 88 },
              {
                kind: 'compareBars', span: 8, title: 'Planned vs Actual', badge: { label: 'On target', tone: 'success' },
                bars: [
                  { label: 'Planned', value: 1200, valueLabel: '1200', color: 'primary' },
                  { label: 'Actual', value: 1085, valueLabel: '1085', color: 'success' },
                ],
              },
              {
                kind: 'bar', span: 12, title: 'By Stage & Priority', xKey: 'stage', stacked: true, showLegend: true, data: byStage.map((s) => ({ ...s, High: Math.round(s.count * 0.5), Medium: Math.round(s.count * 0.3), Low: Math.round(s.count * 0.2) })),
                series: [
                  { dataKey: 'High', name: 'High', color: 'var(--status-error)' },
                  { dataKey: 'Medium', name: 'Medium', color: 'var(--status-warning)' },
                  { dataKey: 'Low', name: 'Low', color: 'var(--status-success)' },
                ],
              },
            ]}
          />
        </Dashboard>
      ),
    },
  ],
};
