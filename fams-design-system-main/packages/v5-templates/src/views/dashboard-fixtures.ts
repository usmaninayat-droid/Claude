import type { DashboardModuleConfigBlueprint, DashboardWidget, DashboardWidgetType } from '@fams/v5-composer'

/**
 * dashboard-fixtures — one valid widget per `DashboardWidget.type`, plus a
 * complete dashboard config built from them. Shared by `DashboardView.test`,
 * `dashboard-widgets.test` and the package axe sweep so the three cannot drift.
 */

export const dashboardWidgetFixtures: Record<DashboardWidgetType, DashboardWidget> = {
  bar: {
    id: 'w-bar',
    title: 'Number of Trips',
    type: 'bar',
    span: 6,
    dataSource: {
      categories: ['22 Oct', '23 Oct', '24 Oct'],
      // Each category states which time frames include it, so a `timeframe`
      // pill narrows the plot positionally (see `dashboard-filter.ts`).
      categoryDimensions: [
        { timeframe: ['last-30-days'] },
        { timeframe: ['last-7-days', 'last-30-days'] },
        { timeframe: ['today', 'last-7-days', 'last-30-days'] },
      ],
      series: [{ id: 'trips', label: 'Trips', data: [710, 870, 640], colorIndex: 1 }],
      axis: { x: { title: 'Date' }, y: { title: 'Number of trips' } },
      ariaLabel: 'Number of trips — column chart, daily totals',
    },
  },
  'stacked-bar': {
    id: 'w-stacked',
    title: 'Operational Progress Overview',
    type: 'stacked-bar',
    span: 6,
    dataSource: {
      categories: ['1', '2'],
      series: [
        { id: 'braking', label: 'Harsh Braking', data: [12, 9], colorIndex: 1, stackId: 'events' },
        { id: 'cornering', label: 'Harsh Cornering', data: [4, 6], colorIndex: 2, stackId: 'events' },
      ],
      axis: { y: { title: 'Event Count' } },
    },
  },
  line: {
    id: 'w-line',
    title: 'Safety Score Trend',
    type: 'line',
    span: 8,
    dataSource: {
      categories: ['1', '2', '3'],
      series: [{ id: 'score', label: 'Safety score', data: [90, 84, 77], colorIndex: 3, unit: 'pts' }],
      axis: { x: { title: 'Day' }, y: { title: 'Safety Score' } },
    },
  },
  area: {
    id: 'w-area',
    title: 'Total Trip Duration',
    type: 'area',
    span: 6,
    dataSource: {
      categories: ['22 Oct', '23 Oct'],
      series: [{ id: 'hours', label: 'Hours', data: [18, 21], colorIndex: 2 }],
    },
  },
  donut: {
    id: 'w-donut',
    title: 'Critical Event Distribution',
    type: 'donut',
    span: 4,
    dataSource: {
      slices: [
        { id: 'braking', label: 'Harsh Braking', value: 43, colorIndex: 1, dimensions: { vehicle: 'veh-1' } },
        { id: 'cornering', label: 'Harsh Cornering', value: 37, colorIndex: 2, dimensions: { vehicle: 'veh-2' } },
      ],
      centerLabel: { value: '80', caption: 'Total Critical Events' },
    },
  },
  'breakdown-strip': {
    id: 'w-fleet-availability',
    title: 'Fleet Availability',
    type: 'breakdown-strip',
    span: 6,
    dataSource: {
      icon: 'truck',
      scopeFilter: {
        id: 'vehicle-type',
        label: 'Vehicles',
        options: [
          { value: 'compactor', label: 'Compactors' },
          { value: 'skip', label: 'Skip Loaders' },
        ],
      },
      slices: [
        { id: 'on-route', label: 'On Route', value: 271, tone: 'success', dimensions: { vehicle: 'veh-1' } },
        { id: 'idle', label: 'Idle', value: 19, tone: 'lavender' },
        { id: 'standby', label: 'Standby', value: 24, tone: 'info' },
        { id: 'maintenance', label: 'Maintenance', value: 10, tone: 'yellow' },
        { id: 'breakdown', label: 'Breakdown', value: 3, tone: 'danger', display: '03' },
        { id: 'inactive', label: 'Inactive', value: 1, tone: 'neutral', display: '01' },
      ],
      ariaLabel: 'Fleet availability — 328 vehicles by operating state.',
    },
  },
  'stat-tile-group': {
    id: 'w-headcount-breakdown',
    title: 'Headcount breakdown — Monday 31 August',
    type: 'stat-tile-group',
    span: 12,
    dataSource: {
      subtitle: 'reported HC from attendance machine',
      note: 'Available = Total − Reported − Weekly off − Vacation',
      tiles: [
        { id: 'total', label: 'Total Head Count', value: 764, caption: 'Active + on leave + training', tone: 'dark' },
        { id: 'planned', label: 'Planned Head Count', value: 470, caption: 'Rostered to route / reliever', tone: 'info' },
        { id: 'reported', label: 'Reported Head Count', value: 459, caption: 'Punched in (attendance machine)', tone: 'success' },
        { id: 'absent', label: 'Absenteeism', value: 35, caption: '7% of planned', tone: 'danger' },
        { id: 'weekly-off', label: 'Weekly Off', value: 105, caption: 'Contracted rest day', tone: 'neutral' },
        { id: 'vacation', label: 'Vacation', value: 42, caption: 'Annual + emergency leave', tone: 'yellow' },
        { id: 'available', label: 'Available Head Count', value: 158, caption: 'Not deployed, not off', tone: 'lavender' },
      ],
      ariaLabel: 'Headcount breakdown for Monday 31 August, reported from the attendance machine.',
    },
  },
  'compliance-gauge': {
    id: 'w-gauge',
    title: 'Fuel Efficiency Score',
    type: 'compliance-gauge',
    span: 4,
    dataSource: { value: 81, min: 0, max: 100, centerLabel: { value: '81', caption: 'Fleet Score' } },
  },
  'heatmap-calendar': {
    id: 'w-heatmap',
    title: 'Safety Score Heatmap by Vehicle',
    type: 'heatmap-calendar',
    span: 12,
    dataSource: {
      categories: ['Jan W1', 'Jan W2'],
      cells: [
        { x: 'Jan W1', y: 'DXB-B-1007', value: 87 },
        { x: 'Jan W2', y: 'DXB-B-1007', value: null },
      ],
      bins: [
        { label: 'No Data', noData: true },
        { to: 40, label: '0–40' },
        { to: 100, label: '41–100' },
      ],
    },
  },
  'geospatial-heatmap': {
    id: 'w-map',
    title: 'Safety Events',
    type: 'geospatial-heatmap',
    span: 12,
    dataSource: {
      render: 'markers',
      legend: [
        { id: 'braking', label: 'Harsh Braking', colorIndex: 1 },
        { id: 'overspeeding', label: 'Overspeeding', colorIndex: 2 },
      ],
      items: [
        { id: 'ev-1', title: 'Harsh Braking', position: [54.37, 24.45], category: 'braking', weight: 0.8 },
      ],
    },
  },
  leaderboard: {
    id: 'w-leaderboard',
    title: 'Vehicle Leaderboard',
    type: 'leaderboard',
    span: 12,
    dataSource: {
      variant: 'table',
      searchable: true,
      columns: [
        { key: 'score', label: 'Score' },
        { key: 'efficiency', label: 'Efficiency', render: 'bar', unit: '%' },
      ],
      rows: [
        { id: 'v-1', rank: 1, rankDelta: 1, primary: 'Toyota Hilux', secondary: 'SHJ-33445', cells: { score: 98, efficiency: 71 } },
        { id: 'v-2', rank: 2, primary: 'Hino NPR', secondary: 'DXB-B-1007', cells: { score: 91, efficiency: 64 } },
      ],
    },
  },
  list: {
    id: 'w-list',
    title: 'Critical Events',
    type: 'list',
    span: 4,
    dataSource: {
      items: [
        {
          id: 'ev-1',
          title: 'Black Spot',
          severity: 'critical',
          timestamp: '09:41',
          meta: [{ label: 'Vehicle', value: 'TME-298' }],
        },
      ],
    },
  },
  'kpi-card': {
    id: 'w-kpi',
    title: 'Number of Critical Events',
    type: 'kpi-card',
    span: 4,
    dataSource: { value: 28, icon: 'alert-triangle', tone: 'danger' },
  },
  'stat-with-target': {
    id: 'w-target',
    title: 'Fleet Fuel Reserve',
    type: 'stat-with-target',
    span: 4,
    dataSource: { value: 3500, unit: 'L', target: 5000, targetLabel: 'of' },
  },
  'sparkline-table': {
    id: 'w-sparkline',
    title: 'Fuel Use by Vehicle',
    type: 'sparkline-table',
    span: 6,
    dataSource: {
      columns: [
        { key: 'trend', label: 'Last 7 days', render: 'sparkline' },
        { key: 'total', label: 'Total (L)', align: 'end' },
      ],
      rows: [{ id: 'v-1', primary: 'Hino NPR', secondary: 'DXB-B-1007', sparkline: [3, 5, 4, 6], cells: { total: 412 } }],
    },
  },
  // A LAYOUT node: two cards sharing one 4-column cell, each keeping its own
  // authored height — the Figma masonry column `span` alone cannot express.
  stack: {
    id: 'w-stack',
    type: 'stack',
    span: 4,
    children: [
      {
        id: 'w-stack-gauge',
        title: 'Fuel Efficiency',
        type: 'compliance-gauge',
        dataSource: { value: 81, min: 0, max: 100, unit: 'pts', height: 308 },
      },
      {
        id: 'w-stack-kpi',
        title: 'Total Distance',
        type: 'kpi-card',
        dataSource: { value: 1240, unit: 'km', icon: 'route', tone: 'primary' },
      },
    ],
  },
}

export const dashboardConfigFixture: DashboardModuleConfigBlueprint = {
  id: 'telematics-dashboard',
  kind: 'dashboard',
  displayName: { singular: 'Telematics Dashboard' },
  icon: 'layout-grid',
  kpiStrip: [
    { id: 'kpi-assets', label: 'Total Assets', type: 'stat', icon: 'truck', dataSource: { value: 156 } },
    {
      id: 'kpi-moving',
      label: 'Moving Assets',
      type: 'stat',
      icon: 'navigation',
      badge: 'Real Time',
      dataSource: { value: 52 },
    },
  ],
  filterPills: [
    { id: 'pill-time', label: 'Time Frame', type: 'time-range', dimension: 'timeframe', defaultValue: 'last-7-days' },
    {
      id: 'pill-vehicle',
      label: 'Vehicle',
      type: 'single-select',
      dimension: 'vehicle',
      entityId: 'asset',
      options: [
        { value: 'veh-1', label: 'DXB-B-1007' },
        { value: 'veh-2', label: 'DXB-H-1049' },
      ],
    },
  ],
  widgetGrid: [
    dashboardWidgetFixtures.bar,
    dashboardWidgetFixtures.donut,
    dashboardWidgetFixtures.list,
    dashboardWidgetFixtures['kpi-card'],
  ],
}
