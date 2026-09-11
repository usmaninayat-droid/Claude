// Icons from the REAL V5 set (src/icons/v5).
import {
  Zap,
  Lightning01,
  BatteryCharging01,
  Speedometer03,
  Signal01,
  AlertTriangle,
  Settings01,
  Clipboard as ClipboardIcon,
  BarChart03,
  Clock,
  MarkerPin01,
} from '../../icons';
import type {
  AppConfig,
  EntityModuleData,
  MonitoringModuleData,
  SettingsModuleData,
  FormsModuleData,
} from '../../components/app-shell';
import {
  InboxView, Dashboard,
  EntityDetail, EntityDetailRow, EntityMetricCard, EntityChartCard, EntityListItem,
} from '../../components/app-shell';
import { Badge } from '../../components/primitives';
import { StatePill } from '../../components/data-display';
import { TelematicsStatusCard, CriticalEventsList, EntityProfileCard } from '../../components/widgets';
import { KpiTile, BarChart, GaugeChart } from '../../components/data-viz';
import type { MapMarker, LatLng } from '../../components/map';

/**
 * Generator Monitoring — real-time genset fleet health, composed from the
 * kit. Reference: the Generator Monitoring Demo concept (Figma frame from the
 * 2026-05-10 session). Exercises the telematics widgets (TelematicsStatusCard,
 * CriticalEventsList, GaugeChart) plus the NEW settings + forms module types.
 */

interface Generator {
  id: string;
  name: string;
  site: string;
  kva: number;
  fuelPct: number;
  loadPct: number;
  hours: number;
  status: 'Running' | 'Standby' | 'Fault';
  telematics: 'reporting' | 'not-reporting' | 'pending';
}

const GENERATORS: Generator[] = [
  { id: 'GEN-01', name: 'Genset Alpha 500', site: 'Mussafah Yard', kva: 500, fuelPct: 76, loadPct: 64, hours: 11240, status: 'Running', telematics: 'reporting' },
  { id: 'GEN-02', name: 'Genset Bravo 250', site: 'ICAD Substation', kva: 250, fuelPct: 18, loadPct: 0, hours: 8430, status: 'Standby', telematics: 'reporting' },
  { id: 'GEN-03', name: 'Genset Charlie 800', site: 'Khalifa Port', kva: 800, fuelPct: 54, loadPct: 91, hours: 15120, status: 'Running', telematics: 'pending' },
  { id: 'GEN-04', name: 'Genset Delta 500', site: 'Saadiyat Site Office', kva: 500, fuelPct: 41, loadPct: 0, hours: 6210, status: 'Fault', telematics: 'not-reporting' },
];

const genStatusPill = (s: Generator['status']) =>
  s === 'Running' ? '#12b76a' : s === 'Standby' ? '#667085' : '#f04438';
const genStatusBadge = (s: Generator['status']) =>
  s === 'Running' ? 'success' : s === 'Standby' ? 'muted' : 'destructive';

const GEN_MARKERS: MapMarker[] = [
  { id: 'GEN-01', position: [24.355, 54.49], status: 'reporting', tooltip: 'Alpha 500 · Running · 64% load' },
  { id: 'GEN-02', position: [24.32, 54.53], status: 'default', tooltip: 'Bravo 250 · Standby · fuel 18%' },
  { id: 'GEN-03', position: [24.81, 54.65], status: 'warning', tooltip: 'Charlie 800 · 91% load' },
  { id: 'GEN-04', position: [24.54, 54.43], status: 'critical', tooltip: 'Delta 500 · FAULT · not reporting' },
];

/* ── generators (entity module with gauge-rich detail) ───────────────── */

const generatorData: EntityModuleData<Generator> = {
  columns: [
    { id: 'name', header: 'Generator', accessor: (r) => r.name, sortable: true },
    { id: 'site', header: 'Site', accessor: (r) => r.site },
    { id: 'kva', header: 'Rating', align: 'right', accessor: (r) => `${r.kva} kVA` },
    { id: 'fuel', header: 'Fuel', align: 'right', cell: (r) => <span className={r.fuelPct < 25 ? 'font-semibold text-destructive' : undefined}>{r.fuelPct}%</span> },
    { id: 'load', header: 'Load', align: 'right', accessor: (r) => `${r.loadPct}%` },
    { id: 'status', header: 'Status', cell: (r) => <Badge variant={genStatusBadge(r.status)} size="sm">{r.status}</Badge> },
  ],
  rows: GENERATORS,
  getRowId: (r) => r.id,
  filterField: { label: 'Status', get: (r) => r.status },
  searchText: (r) => `${r.name} ${r.id} ${r.site} ${r.status}`,
  map: { center: [24.5, 54.5], markers: GEN_MARKERS },
  toListItem: (r) => ({ id: r.id, title: r.name, subtitle: `${r.site} · ${r.kva} kVA`, trailing: <Badge variant={genStatusBadge(r.status)} size="sm">{r.status}</Badge> }),
  // STANDARD entity detail (EntityDetail — same layout as Workshop assets).
  toDetail: (row) => ({
    id: row.id,
    category: 'Generator',
    label: row.name,
    render: () => {
      const live = generatorData.rows.find((g) => g.id === row.id) ?? row;
      const genAlarms = ALARMS.filter((a) => a.generator === live.id);
      const statusBadge = (
        <span className="inline-flex items-center rounded-[2px] px-1.5 py-1 text-caption font-semibold uppercase tracking-[0.5px] text-white" style={{ background: genStatusPill(live.status) }}>
          {live.status}
        </span>
      );
      return (
        <EntityDetail
          avatarFallback={live.id.replace('GEN-', 'G')}
          avatarColor={live.status === 'Fault' ? '#f04438' : '#6938EF'}
          statusOverlay={statusBadge}
          name={live.name}
          entityId={live.id}
          categoryBadge={
            <span className="inline-flex items-center rounded-[4px] bg-secondary px-2 py-[3px] text-caption font-bold uppercase tracking-[0.3px] text-primary">
              {live.kva} kVA
            </span>
          }
          infoTitle="Generator Details"
          info={[
            { label: 'Rating', value: `${live.kva} kVA` },
            { label: 'Site', value: live.site },
            { label: 'Run Hours', value: `${live.hours.toLocaleString()} hrs` },
            { label: 'Fuel', value: `${live.fuelPct}%` },
            { label: 'Load', value: `${live.loadPct}%` },
            { label: 'Telematics', value: live.telematics },
            { label: 'Open Alarms', value: String(genAlarms.filter((a) => !a.acknowledged).length) },
          ]}
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              render: () => (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-3 gap-3">
                    <EntityMetricCard label="Load" value={`${live.loadPct}%`} sub="of rated output" />
                    <EntityMetricCard label="Fuel" value={`${live.fuelPct}%`} sub={live.fuelPct < 25 ? 'LOW — schedule refuel' : 'tank level'} />
                    <EntityMetricCard label="Run Hours" value={live.hours.toLocaleString()} sub="hrs total" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <EntityChartCard title="Live Gauges" subtitle="Fuel level and load, updating in real time">
                      <div className="flex flex-wrap items-end justify-around gap-4">
                        <GaugeChart value={live.fuelPct} label="Fuel level" size={170} />
                        <GaugeChart value={live.loadPct} label="Load" size={170} />
                      </div>
                    </EntityChartCard>
                    <EntityChartCard title="Telematics" subtitle="Gateway reporting status">
                      <TelematicsStatusCard
                        status={live.telematics}
                        timestamp={live.telematics === 'reporting' ? '12s ago' : live.telematics === 'pending' ? '4 min ago' : '38 min ago'}
                        subtitle={`Device GW-${live.id.replace('GEN-', '')}`}
                      />
                    </EntityChartCard>
                  </div>
                </div>
              ),
            },
            {
              id: 'alarms',
              label: 'Alarms',
              render: () => (
                <div className="flex flex-col">
                  {genAlarms.map((a, i, arr) => (
                    <EntityListItem
                      key={a.id}
                      leading={
                        <Badge variant={a.severity === 'error' ? 'destructive' : a.severity === 'warning' ? 'warning' : 'info'} size="sm">
                          {a.severity}
                        </Badge>
                      }
                      title={a.title}
                      trailing={
                        <>
                          <span className="text-caption font-medium text-muted-foreground">{a.time}</span>
                          <Badge variant={a.acknowledged ? 'success' : 'muted'} size="sm">{a.acknowledged ? 'Acked' : 'Open'}</Badge>
                        </>
                      }
                      borderBottom={i < arr.length - 1}
                    />
                  ))}
                  {!genAlarms.length ? <p className="py-6 text-center text-[12px] text-muted-foreground">No alarms for this unit.</p> : null}
                </div>
              ),
            },
            {
              id: 'details',
              label: 'Details',
              render: () => (
                <div className="grid grid-cols-2 gap-x-8">
                  <div>
                    <EntityDetailRow label="Rating" value={`${live.kva} kVA`} />
                    <EntityDetailRow label="Site" value={live.site} />
                    <EntityDetailRow label="Status" value={live.status} borderBottom={false} />
                  </div>
                  <div>
                    <EntityDetailRow label="Run Hours" value={`${live.hours.toLocaleString()} hrs`} />
                    <EntityDetailRow label="Telematics" value={live.telematics} />
                    <EntityDetailRow label="Unit ID" value={live.id} borderBottom={false} />
                  </div>
                </div>
              ),
            },
          ]}
        />
      );
    },
  }),
};

/* ── live monitoring ─────────────────────────────────────────────────── */

const GEN_GEO: Record<string, { pos: LatLng; status: 'reporting' | 'idle' | 'warning' | 'stopped'; label: string }> = {
  'GEN-01': { pos: [24.355, 54.49], status: 'reporting', label: 'Running' },
  'GEN-02': { pos: [24.32, 54.53], status: 'idle', label: 'Standby' },
  'GEN-03': { pos: [24.81, 54.65], status: 'warning', label: 'High load' },
  'GEN-04': { pos: [24.54, 54.43], status: 'stopped', label: 'Fault' },
};

const genMonitoring: MonitoringModuleData = {
  center: [24.5, 54.5],
  zoom: 11,
  listTitle: 'Generators',
  liveBadge: { label: '2 reporting · 1 fault' },
  legend: [
    { label: 'Running', color: '#12B76A' },
    { label: 'Standby', color: '#98A2B3' },
    { label: 'High load', color: '#F79009' },
    { label: 'Fault', color: '#D92D20' },
  ],
  entities: GENERATORS.map((g) => {
    const geo = GEN_GEO[g.id];
    return {
      id: g.id,
      position: geo.pos,
      status: geo.status,
      statusLabel: geo.label,
      kind: 'dot' as const,
      live: g.status === 'Running',
      mapLabel: g.id,
      title: g.name,
      subtitle: `${g.site} · ${g.kva} kVA`,
      metric: `${g.loadPct}%`,
      metricSub: 'load',
      avatarFallback: g.id.replace('GEN-', 'G'),
      tooltip: `${g.name} · ${geo.label}`,
      telemetry: [
        { label: 'Load', value: `${g.loadPct}%` },
        { label: 'Fuel', value: `${g.fuelPct}%` },
        { label: 'Run hrs', value: g.hours.toLocaleString() },
        { label: 'Rating', value: `${g.kva} kVA` },
        { label: 'Site', value: g.site },
        { label: 'Telematics', value: g.telematics },
      ],
      events:
        g.status === 'Fault'
          ? [{ id: 'e1', title: 'Engine over-temperature shutdown', severity: 'error' as const }]
          : g.fuelPct < 25
            ? [{ id: 'e1', title: 'Fuel below 20%', severity: 'warning' as const }]
            : undefined,
      toDetail: () => generatorData.toDetail!(g),
    };
  }),
};

/* ── alarms (entity module over critical events) ─────────────────────── */

interface GenAlarm {
  id: string;
  generator: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  time: string;
  acknowledged: boolean;
}

const ALARMS: GenAlarm[] = [
  { id: 'AL-01', generator: 'GEN-04', severity: 'error', title: 'Engine over-temperature shutdown', time: '17 Feb, 09:42', acknowledged: false },
  { id: 'AL-02', generator: 'GEN-02', severity: 'warning', title: 'Fuel level below 20%', time: '17 Feb, 08:15', acknowledged: false },
  { id: 'AL-03', generator: 'GEN-03', severity: 'warning', title: 'Sustained load above 90%', time: '17 Feb, 07:58', acknowledged: true },
  { id: 'AL-04', generator: 'GEN-01', severity: 'info', title: 'Scheduled exercise run completed', time: '16 Feb, 22:00', acknowledged: true },
];

const alarmData: EntityModuleData<GenAlarm> = {
  columns: [
    { id: 'sev', header: 'Severity', cell: (r) => <Badge variant={r.severity === 'error' ? 'destructive' : r.severity === 'warning' ? 'warning' : 'info'} size="sm">{r.severity}</Badge> },
    { id: 'title', header: 'Alarm', accessor: (r) => r.title, sortable: true },
    { id: 'gen', header: 'Generator', accessor: (r) => r.generator },
    { id: 'time', header: 'Time', accessor: (r) => r.time },
    { id: 'ack', header: 'Ack', cell: (r) => (r.acknowledged ? <Badge variant="success" size="sm">Acked</Badge> : <Badge variant="muted" size="sm">Open</Badge>) },
  ],
  rows: ALARMS,
  getRowId: (r) => r.id,
  filterField: { label: 'Severity', get: (r) => r.severity },
  searchText: (r) => `${r.title} ${r.generator} ${r.severity}`,
};

/* ── dashboard ───────────────────────────────────────────────────────── */

function FleetHealthDashboard() {
  const running = GENERATORS.filter((g) => g.status === 'Running').length;
  const loadData = GENERATORS.map((g) => ({ gen: g.id, load: g.loadPct, fuel: g.fuelPct }));
  return (
    <Dashboard
      dateLabel="Live · 17 Feb, 2026"
      kpis={[
        { label: 'Fleet', value: GENERATORS.length, icon: <Zap size={18} /> },
        { label: 'Running', value: running, icon: <Lightning01 size={18} /> },
        { label: 'Faults', value: GENERATORS.filter((g) => g.status === 'Fault').length, icon: <AlertTriangle size={18} />, iconBg: 'rgba(240,68,56,0.1)', iconColor: 'var(--destructive)' },
        { label: 'Open Alarms', value: ALARMS.filter((a) => !a.acknowledged).length, icon: <ClipboardIcon size={18} /> },
        { label: 'Avg Load', value: `${Math.round(GENERATORS.reduce((s, g) => s + g.loadPct, 0) / GENERATORS.length)}%`, icon: <Speedometer03 size={18} /> },
      ]}
      sections={[
        { id: 'load', title: 'Load vs Fuel by Generator', icon: <BarChart03 size={16} />, span: 7, children: <BarChart data={loadData} xKey="gen" series={[{ dataKey: 'load', name: 'Load %' }, { dataKey: 'fuel', name: 'Fuel %', color: 'var(--chart-3)' }]} height={280} showLegend /> },
        {
          id: 'events',
          title: 'Critical Events',
          icon: <AlertTriangle size={16} />,
          span: 5,
          children: (
            <CriticalEventsList
              events={ALARMS.filter((a) => !a.acknowledged).map((a) => ({
                id: a.id,
                severity: a.severity,
                title: a.title,
                description: `${a.generator} · ${GENERATORS.find((g) => g.id === a.generator)?.site ?? ''}`,
                timestamp: a.time,
              }))}
            />
          ),
        },
      ]}
    />
  );
}

/* ── settings module (NEW settings module type) ──────────────────────── */

const genSettings: SettingsModuleData = {
  sections: [
    {
      id: 'thresholds',
      title: 'Alert thresholds',
      description: 'When alarms fire across the fleet.',
      items: [
        { kind: 'field', label: 'Low fuel alarm', value: '< 20%' },
        { kind: 'field', label: 'High load warning', value: '> 90% for 10 min' },
        { kind: 'toggle', label: 'Over-temperature auto-shutdown', description: 'Stop the engine when coolant exceeds limits.', defaultOn: true },
        { kind: 'toggle', label: 'Weekly exercise run', description: 'Auto-run each standby unit every Sunday 22:00.', defaultOn: true },
      ],
    },
    {
      id: 'notifications',
      title: 'Notifications',
      items: [
        { kind: 'toggle', label: 'SMS on fault', defaultOn: true },
        { kind: 'toggle', label: 'Daily fleet summary email', defaultOn: false },
      ],
    },
    {
      id: 'danger',
      title: 'Danger zone',
      items: [
        { kind: 'action', label: 'Reset telematics gateways', description: 'Re-provisions every GW device. Units go dark for ~2 min.', actionLabel: 'Reset all', destructive: true },
      ],
    },
  ],
};

/* ── log reading (NEW forms module type) ─────────────────────────────── */

const logReadingForm: FormsModuleData = {
  title: 'Log manual reading',
  description: 'Field technicians record readings when a unit is offline.',
  schema: {
    title: 'Manual Reading',
    submitLabel: 'Save reading',
    fields: [
      { key: 'generator', label: 'Generator', type: 'select', required: true, options: GENERATORS.map((g) => ({ label: g.name, value: g.id })) },
      { key: 'hours', label: 'Run hours', type: 'number', required: true },
      { key: 'fuel', label: 'Fuel level (%)', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Condition, leaks, noises…', span: 2 },
    ],
  },
  onSubmit: (v, actions) => {
    generatorData.rows = generatorData.rows.map((g) =>
      g.id === v.generator
        ? { ...g, hours: Number(v.hours) || g.hours, fuelPct: v.fuel ? Math.min(100, Number(v.fuel)) : g.fuelPct }
        : g
    );
    actions.refresh();
  },
  successTitle: 'Reading saved',
  successHint: 'The generator record has been updated with your reading.',
};

/* ── app config ──────────────────────────────────────────────────────── */

export const generatorApp: AppConfig = {
  id: 'generators',
  brand: {
    name: 'Generator Monitoring',
    icon: Zap,
    theme: {
      '--primary': '#6938EF',
      '--primary-foreground': '#FFFFFF',
      '--secondary': '#EBE9FE',
      '--secondary-foreground': '#6938EF',
      '--accent': '#6938EF',
      '--ring': '#EBE9FE',
      '--sidebar': '#42307D',
    },
  },
  user: { name: 'Tariq Mansour', email: 'tariq@fams.ae', role: 'Fleet Engineer', avatarFallback: 'TM' },
  collectiveInbox: {
    notificationDot: true,
    render: () => (
      <InboxView
        data={{
          notifications: [
            { id: 'g1', title: 'GEN-04 fault shutdown', description: 'Engine over-temperature at Saadiyat Site Office.', source: 'Alarms', severity: 'error', timestamp: '20m ago', unread: true },
            { id: 'g2', title: 'GEN-02 fuel low', description: 'Bravo 250 at 18% — schedule a refuel.', source: 'Alarms', severity: 'warning', timestamp: '2h ago', unread: true },
          ],
        }}
      />
    ),
  },
  modules: [
    {
      id: 'dashboard',
      type: 'dashboard',
      label: 'Dashboard',
      tabKind: 'instance',
      tabs: [{ id: 'health', label: 'Fleet Health', render: () => <FleetHealthDashboard /> }],
    },
    {
      id: 'generators',
      type: 'entity',
      label: 'Generators',
      icon: BatteryCharging01,
      data: generatorData,
      tabs: [
        { id: 'list', kind: 'list', label: 'List View' },
        { id: 'hybrid', kind: 'hybrid', label: 'Hybrid View' },
      ],
    },
    { id: 'monitoring', type: 'live-monitoring', label: 'Live Monitoring', icon: Signal01, data: genMonitoring },
    { id: 'alarms', type: 'entity', label: 'Alarms', icon: AlertTriangle, data: alarmData },
    { id: 'log-reading', type: 'forms', label: 'Log Reading', icon: ClipboardIcon, data: logReadingForm },
    { id: 'settings', type: 'settings', label: 'Settings', icon: Settings01, data: genSettings },
  ],
};
