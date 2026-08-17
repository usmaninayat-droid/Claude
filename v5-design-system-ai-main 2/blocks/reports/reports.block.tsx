import type { ModuleConfig, ReportBuilderConfig } from '@ds/components/app-shell';
import { Dashboard, ReportTable, ReportPersonCell } from '@ds/components/app-shell';
import { BarChart, LineChart } from '@ds/components/data-viz';
import { LeafletMap } from '@ds/components/map';
import type { MapMarker } from '@ds/components/map';
import { Speedometer03 as Gauge, AlertTriangle, Clock, MarkerPin01 } from '@ds/icons';

/**
 * Reports BLOCK — a reusable tabbed report surface. A `reports` module is config:
 * a `ModuleConfig` with `type:'reports'` + `tabKind:'instance'` + a `tabs[]`, each
 * rendering a report from the DS primitives (`Dashboard` + charts, `ReportTable`
 * with RAG bands / KPI rows / group-by, or a hybrid table-beside-map). A
 * `data.newReport` (`ReportBuilderConfig`) drives the config-only custom-report
 * builder. No bespoke screen — the shell renders ReportsHome.
 *
 * Three representative tabs are wired so you can copy the shape:
 *   • PERF  — Dashboard (KPIs + line + bar) — a trend report.
 *   • RAG   — ReportTable with green/amber/red row bands — a status report.
 *   • FIELD — table beside a live map — a hybrid report.
 *
 * ADAPT: rename the tabs/categories, point each report at the app's records
 * (derive KPIs/series/rows from real arrays), set the builder filters, and keep
 * vocabulary domain-neutral. Data here is generic placeholder. See reports.block.md.
 * (Fuller, data-bound example: D:\Claude Projects\Code\facilities-ops\src\recipe\reports.tsx.)
 */

/* ── Generic placeholder data (swap for the app's records) ───────────────── */
const TREND = [
  { period: 'W1', value: 88, issues: 4 },
  { period: 'W2', value: 90, issues: 3 },
  { period: 'W3', value: 91, issues: 3 },
  { period: 'W4', value: 93, issues: 2 },
  { period: 'W5', value: 95, issues: 1 },
];

const RECORDS = [
  { id: 'R-01', name: 'Record A1', group: 'Group North', owner: 'Alex Stone', status: 'Healthy' },
  { id: 'R-02', name: 'Record A2', group: 'Group North', owner: 'Priya Raman', status: 'At Risk' },
  { id: 'R-03', name: 'Record B1', group: 'Group South', owner: 'Sam Okoro', status: 'Healthy' },
  { id: 'R-04', name: 'Record B2', group: 'Group South', owner: 'Lena Fischer', status: 'Critical' },
  { id: 'R-05', name: 'Record C1', group: 'Group East', owner: 'Diego Marin', status: 'At Risk' },
];

const FIELD = [
  { id: 'F-01', name: 'Alex Stone', area: 'Group North', activity: 'On site', statusLabel: 'Active', position: [25.225, 55.262] as [number, number] },
  { id: 'F-02', name: 'Priya Raman', area: 'Group North', activity: 'En route', statusLabel: 'Active', position: [25.198, 55.281] as [number, number] },
  { id: 'F-03', name: 'Sam Okoro', area: 'Group South', activity: 'Idle', statusLabel: 'Idle', position: [25.246, 55.296] as [number, number] },
];

/* ── PERF: a trend report (Dashboard) ───────────────────────────────────── */
function PerformanceReport() {
  return (
    <Dashboard
      dateLabel="Last 5 weeks"
      kpis={[
        { id: 'attain', label: 'Attainment', value: '95%', trend: 'up', trendValue: '+7pts', description: 'vs W1', icon: <Gauge size={18} /> },
        { id: 'open', label: 'Open Issues', value: '1', icon: <AlertTriangle size={18} />, iconColor: 'var(--status-error)' },
        { id: 'resolve', label: 'Avg Resolution', value: '2.4', unit: 'd', trend: 'down', trendValue: '-0.5d', icon: <Clock size={18} /> },
      ]}
      sections={[
        {
          id: 'trend', title: 'Attainment Trend', subtitle: 'Weekly % within target', span: 7,
          children: <LineChart data={TREND} xKey="period" series={[{ dataKey: 'value', name: 'Attainment %', color: 'var(--primary)' }]} height={280} />,
        },
        {
          id: 'issues', title: 'Issues by Week', span: 5,
          children: <BarChart data={TREND} xKey="period" series={[{ dataKey: 'issues', name: 'Issues', color: 'var(--chart-accent-red)' }]} height={280} />,
        },
      ]}
    />
  );
}

/* ── RAG: a status report (row-banded green/amber/red) ──────────────────── */
function StatusRagReport() {
  const rag = (s: string): 'green' | 'amber' | 'red' => (s === 'Healthy' ? 'green' : s === 'At Risk' ? 'amber' : 'red');
  const ordered = [...RECORDS].sort((a, b) => ['green', 'amber', 'red'].indexOf(rag(a.status)) - ['green', 'amber', 'red'].indexOf(rag(b.status)));
  return (
    <ReportTable
      reportName="Status Report"
      rag={(r) => r._rag as 'green' | 'amber' | 'red'}
      searchKeys={['name', 'group', 'owner', 'status']}
      columns={[
        { key: 'name', label: 'Record' },
        { key: 'group', label: 'Group', groupable: true },
        { key: 'status', label: 'Status', groupable: true },
        { key: 'owner', label: 'Owner', render: (r) => <ReportPersonCell name={r.owner as string} /> },
      ]}
      rows={ordered.map((r) => ({ ...r, _rag: rag(r.status) }))}
    />
  );
}

/* ── FIELD: a hybrid report (table beside a live map) ───────────────────── */
function FieldActivityHybrid() {
  const markers: MapMarker[] = FIELD.map((f) => ({ id: f.id, position: f.position, kind: 'vehicle', label: f.name.split(' ')[0], statusLabel: f.statusLabel }));
  return (
    <div className="flex h-full min-h-0">
      <div className="flex w-[46%] min-w-[360px] flex-col border-r border-border">
        <ReportTable
          searchKeys={['name', 'area', 'activity']}
          columns={[
            { key: 'name', label: 'Member', groupable: true, render: (r) => <ReportPersonCell name={r.name as string} /> },
            { key: 'area', label: 'Area', groupable: true },
            { key: 'activity', label: 'Activity' },
            { key: 'statusLabel', label: 'Status' },
          ]}
          rows={FIELD.map((f) => ({ name: f.name, area: f.area, activity: f.activity, statusLabel: f.statusLabel }))}
        />
      </div>
      <div className="min-h-0 flex-1">
        <LeafletMap center={[25.2048, 55.2708]} zoom={11} markers={markers} fitToContent />
      </div>
    </div>
  );
}

/* ── Custom-report builder (config-only; the DS renders the declared filters) ─ */
const newReportConfig: ReportBuilderConfig = {
  filters: [
    { kind: 'multiSelect', key: 'events', label: 'Select Event Type', options: [
      { value: 'opened', label: 'Opened', severity: 'normal' },
      { value: 'breach', label: 'Threshold Breach', severity: 'warning' },
      { value: 'critical', label: 'Critical', severity: 'critical' },
    ] },
    { kind: 'date', key: 'date', label: 'Select Date', mode: 'range' },
    { kind: 'entitySelect', key: 'records', label: 'Entity Filter', entityLabel: 'Records',
      items: RECORDS.map((r) => ({ id: r.id, label: r.name, meta: r.group, tags: [r.status] })) },
  ],
  generate: (v) => {
    const ids = (v.records as string[]) ?? [];
    const pool = ids.length ? RECORDS.filter((r) => ids.includes(r.id)) : RECORDS;
    return {
      columns: [
        { key: 'name', label: 'Record' },
        { key: 'group', label: 'Group' },
        { key: 'status', label: 'Status' },
        { key: 'when', label: 'Logged' },
      ],
      rows: pool.map((r, i) => ({ name: r.name, group: r.group, status: r.status, when: `12 Jun, ${String(8 + (i % 10)).padStart(2, '0')}:30` })),
    };
  },
};

export const reportsBlock: ModuleConfig = {
  id: 'reports',
  type: 'reports',
  label: 'Reports',
  icon: Gauge,
  tabKind: 'instance',
  data: { newReport: newReportConfig },
  tabs: [
    {
      id: 'performance', label: 'Performance', icon: Gauge, category: 'Operations', system: true,
      description: 'Attainment trend and open issues against target.',
      render: () => <PerformanceReport />,
    },
    {
      id: 'status', label: 'Status (RAG)', icon: AlertTriangle, category: 'Operations', system: true,
      description: 'Every record, row-banded green / amber / red by status.',
      render: () => <StatusRagReport />,
    },
    {
      id: 'field', label: 'Field Activity', icon: MarkerPin01, category: 'Field', system: true,
      description: 'Field members on a live map beside an activity table (hybrid).',
      render: () => <FieldActivityHybrid />,
    },
  ],
};
